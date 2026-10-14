-- 0026 — protect commercial counters and retention timestamps.
--
-- Owners may edit ordinary event presentation/settings fields, but these
-- values are entitlements and must only change through trusted server-side
-- paths. claim_event_downloads gets an explicit transaction-local bypass so
-- the quota RPC can still atomically increment the counter.

create or replace function public.protect_event_commercial_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_package public.packages%rowtype;
  v_bypass boolean;
  v_created_at timestamptz;
begin
  v_bypass := public.is_admin()
    or coalesce(current_setting('eph.allow_commercial_write', true) = 'on', false);
  v_created_at := coalesce(new.created_at, now());

  if not v_bypass and tg_op = 'INSERT' then
    if coalesce(new.download_count, 0) <> 0 then
      raise exception 'DOWNLOAD_COUNT_NOT_ALLOWED';
    end if;

    if new.package_id is null then
      new.gallery_expires_at := v_created_at + interval '7 days';
    else
      select * into v_package from public.packages where id = new.package_id;
      if not found then
        raise exception 'PACKAGE_NOT_FOUND';
      end if;
      new.gallery_expires_at := v_created_at + make_interval(days => v_package.retention_days);
    end if;
  end if;

  if tg_op = 'UPDATE' and not v_bypass then
    if new.download_unlocked_at is distinct from old.download_unlocked_at then
      raise exception 'DOWNLOAD_UNLOCK_NOT_ALLOWED';
    end if;
    if new.download_count is distinct from old.download_count then
      raise exception 'DOWNLOAD_COUNT_NOT_ALLOWED';
    end if;
    if new.gallery_expires_at is distinct from old.gallery_expires_at then
      raise exception 'GALLERY_EXPIRY_NOT_ALLOWED';
    end if;
    if new.package_id is distinct from old.package_id then
      raise exception 'PACKAGE_CHANGE_NOT_ALLOWED';
    end if;
  end if;

  -- A client may set ordinary package limits inside the purchased ceiling.
  if new.package_id is not null and not v_bypass then
    select * into v_package from public.packages where id = new.package_id;
    if found then
      if new.upload_limit > v_package.photo_limit
         or new.max_file_size_bytes > v_package.max_file_size_bytes
         or new.max_files_per_upload > v_package.max_files_per_upload
         or new.guest_photo_limit > v_package.guest_photo_limit then
        raise exception 'EXCEEDS_PACKAGE_LIMITS';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists events_protect_commercial_fields on public.events;
create trigger events_protect_commercial_fields
  before insert or update on public.events
  for each row execute function public.protect_event_commercial_fields();

create or replace function public.claim_event_downloads(
  p_event_id uuid,
  p_count integer default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if p_count < 1 then return false; end if;

  -- This RPC is the only normal path allowed to increment download_count.
  perform set_config('eph.allow_commercial_write', 'on', true);

  update public.events e
     set download_count = e.download_count + p_count
    from public.packages p
   where e.id = p_event_id
     and p.id = e.package_id
     and e.gallery_expires_at > now()
     and e.download_count + p_count <= p.download_limit
  returning e.download_count into n;

  if found then return true; end if;
  return false;
end;
$$;

revoke all on function public.claim_event_downloads(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_event_downloads(uuid, integer) to service_role;
