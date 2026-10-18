-- These columns are repeated here intentionally so applying this enforcement
-- migration after a partially failed rollout is safe and order-independent.
alter table public.packages add column if not exists download_limit integer not null default 10;
alter table public.packages add column if not exists guest_photo_limit integer not null default 10;
alter table public.packages add column if not exists retention_days integer not null default 7;
alter table public.events add column if not exists download_count integer not null default 0;

-- Enforce shutaMzala entitlements at the database boundary, including writes
-- from future routes or service clients.

create or replace function public.apply_package_entitlements()
returns trigger language plpgsql set search_path=public as $$
declare p public.packages%rowtype;
begin
  if new.package_id is null then
    -- Legacy/unassigned events get the conservative Free limits.
    new.upload_limit := least(coalesce(new.upload_limit,100),100);
    new.max_file_size_bytes := least(coalesce(new.max_file_size_bytes,15728640),15728640);
    new.guest_photo_limit := least(coalesce(new.guest_photo_limit,10),10);
    new.max_files_per_upload := least(coalesce(new.max_files_per_upload,10),10);
    new.gallery_expires_at := coalesce(new.gallery_expires_at,new.created_at + interval '7 days');
    return new;
  end if;
  select * into p from public.packages where id=new.package_id;
  if not found then raise exception 'PACKAGE_NOT_FOUND'; end if;
  if tg_op='UPDATE' and new.package_id is distinct from old.package_id then
    new.gallery_expires_at := new.created_at + make_interval(days=>p.retention_days);
    new.upload_limit := least(new.upload_limit,p.photo_limit);
    new.guest_photo_limit := least(new.guest_photo_limit,p.guest_photo_limit);
    new.max_file_size_bytes := least(new.max_file_size_bytes,p.max_file_size_bytes,15728640);
    new.max_files_per_upload := least(new.max_files_per_upload,p.max_files_per_upload);
  else
    if new.upload_limit > p.photo_limit then raise exception 'PACKAGE_PHOTO_LIMIT_EXCEEDED'; end if;
    if new.max_file_size_bytes > least(p.max_file_size_bytes,15728640) then raise exception 'PACKAGE_FILE_SIZE_EXCEEDED'; end if;
    if new.guest_photo_limit > p.guest_photo_limit then raise exception 'PACKAGE_GUEST_LIMIT_EXCEEDED'; end if;
    if new.max_files_per_upload > p.max_files_per_upload then raise exception 'PACKAGE_BATCH_LIMIT_EXCEEDED'; end if;
  end if;
  new.gallery_expires_at := coalesce(new.gallery_expires_at,new.created_at + make_interval(days=>p.retention_days));
  return new;
end $$;

drop trigger if exists events_package_entitlements on public.events;
create trigger events_package_entitlements before insert or update of package_id,upload_limit,max_file_size_bytes,guest_photo_limit,max_files_per_upload on public.events for each row execute function public.apply_package_entitlements();

-- Clamp pre-existing event overrides against their now-current package.
update public.events e set
 upload_limit=least(e.upload_limit,p.photo_limit),
 max_file_size_bytes=least(e.max_file_size_bytes,p.max_file_size_bytes,15728640),
 guest_photo_limit=least(e.guest_photo_limit,p.guest_photo_limit),
 max_files_per_upload=least(e.max_files_per_upload,p.max_files_per_upload)
from public.packages p where e.package_id=p.id;
update public.events set
 upload_limit=least(upload_limit,100),
 max_file_size_bytes=least(max_file_size_bytes,15728640),
 guest_photo_limit=least(guest_photo_limit,10),
 max_files_per_upload=least(max_files_per_upload,10),
 gallery_expires_at=created_at + interval '7 days'
where package_id is null;

-- Backfill expirations based on package retention without extending already-expired galleries.
update public.events e set gallery_expires_at=e.created_at + make_interval(days => p.retention_days)
from public.packages p where e.package_id=p.id and e.gallery_expires_at > now();

-- Atomic download quota reservation: each original file URL costs one download.
create or replace function public.claim_event_downloads(p_event_id uuid,p_count integer default 1)
returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if p_count < 1 then return false; end if;
 update public.events e set download_count=e.download_count+p_count
 from public.packages p
 where e.id=p_event_id and p.id=e.package_id
   and e.gallery_expires_at > now()
   and e.download_count+p_count <= p.download_limit
 returning e.download_count into n;
 if found then return true; end if;
 return false;
end $$;
revoke all on function public.claim_event_downloads(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_event_downloads(uuid,integer) to service_role;

-- A scheduled job can call this to identify expired galleries for permanent
-- object cleanup; R2 deletion remains in the storage cleanup worker.
create or replace function public.expired_gallery_event_ids()
returns setof uuid language sql security definer set search_path=public as $$
 select id from public.events where gallery_expires_at <= now();
$$;
revoke all on function public.expired_gallery_event_ids() from public,anon,authenticated;
grant execute on function public.expired_gallery_event_ids() to service_role;
