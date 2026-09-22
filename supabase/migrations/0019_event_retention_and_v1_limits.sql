-- 0019 — explicit V1 retention semantics
-- Viewing expires after 30 days, uploads stop after 7 days, and originals are retained.

alter table public.events
  add column if not exists uploads_close_at timestamptz,
  add column if not exists gallery_expires_at timestamptz;

update public.events
set uploads_close_at = coalesce(uploads_close_at, created_at + interval '7 days'),
    gallery_expires_at = coalesce(gallery_expires_at, created_at + interval '30 days');

alter table public.events
  alter column uploads_close_at set default (now() + interval '7 days'),
  alter column gallery_expires_at set default (now() + interval '30 days'),
  alter column uploads_close_at set not null,
  alter column gallery_expires_at set not null;

update public.packages
set is_active = false
where code = 'photos_1000';

drop policy if exists "photos_select_shared_or_public" on public.photos;

create policy "photos_select_shared_or_public"
  on public.photos for select
  to anon, authenticated
  using (
    status = 'ready'
    and is_hidden = false
    and exists (
      select 1 from public.events e
      where e.id = photos.event_id
        and e.visibility in ('shared', 'public')
        and e.gallery_expires_at > now()
    )
  );

-- Keep the product caps true for every write path, including direct SQL and
-- future API routes.
create or replace function public.assert_event_limits_within_caps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 500 then
    raise exception 'UPLOAD_LIMIT_OUT_OF_RANGE';
  end if;

  if new.max_file_size_bytes is null
     or new.max_file_size_bytes < 1048576
     or new.max_file_size_bytes > 15728640 then
    raise exception 'FILE_SIZE_OUT_OF_RANGE';
  end if;

  if new.max_files_per_upload is null
     or new.max_files_per_upload < 1
     or new.max_files_per_upload > 10 then
    raise exception 'FILES_PER_UPLOAD_OUT_OF_RANGE';
  end if;

    if new.guest_photo_limit is null
      or new.guest_photo_limit < 1
      or new.guest_photo_limit > 50 then
    raise exception 'GUEST_LIMIT_OUT_OF_RANGE';
  end if;

  return new;
end;
$$;

-- The public resolver is the upload gate used by both the guest page and the
-- request-url API. Expiry is checked here so a stale browser cannot bypass it.
create or replace function public.get_event_for_upload(p_event_code text)
returns table (
  event_id uuid,
  event_name text,
  event_date date,
  status public.event_status,
  can_upload boolean,
  reason text,
  max_file_size_bytes bigint,
  max_files_per_upload integer,
  brand_logo_url text,
  brand_company_name text,
  brand_primary_color text
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events where event_code = p_event_code;

  if not found then
    return query select null::uuid, null::text, null::date, null::public.event_status,
      false, 'not_found'::text, null::bigint, null::integer, null::text, null::text, null::text;
    return;
  end if;

  if v_event.status = 'closed' then
    return query select v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'closed'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  if v_event.status = 'archived' then
    return query select v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'archived'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  if v_event.uploads_close_at <= now() then
    return query select v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'upload_expired'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  if v_event.photo_count >= v_event.upload_limit then
    return query select v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'limit_reached'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  return query select v_event.id, v_event.event_name, v_event.event_date, v_event.status,
    true, null::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
    v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
end;
$$;

grant execute on function public.get_event_for_upload(text) to anon, authenticated;

-- Re-apply the atomic guest insert gate with the same expiry check. This is
-- the final authority after the object has been uploaded to R2.
create or replace function public.insert_guest_photo(
  p_event_code text,
  p_storage_path text,
  p_original_filename text,
  p_file_size bigint,
  p_mime_type text,
  p_guest_session_token text,
  p_width integer default null,
  p_height integer default null
)
returns table (photo_id uuid)
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_session public.guest_sessions%rowtype;
  v_new_id uuid;
  v_allowed_mimes text[] := array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
begin
  select * into v_event from public.events where event_code = p_event_code for update;

  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status <> 'active' then raise exception 'EVENT_NOT_ACCEPTING_UPLOADS'; end if;
  if v_event.uploads_close_at <= now() then raise exception 'EVENT_UPLOADS_EXPIRED'; end if;
  if v_event.photo_count >= v_event.upload_limit then raise exception 'EVENT_UPLOAD_LIMIT_REACHED'; end if;

  select * into v_session from public.guest_sessions
  where session_token = p_guest_session_token and event_id = v_event.id for update;
  if not found then raise exception 'GUEST_SESSION_NOT_FOUND'; end if;
  if v_session.upload_count >= v_event.guest_photo_limit then raise exception 'GUEST_UPLOAD_LIMIT_REACHED'; end if;

  if p_file_size <= 0 or p_file_size > v_event.max_file_size_bytes then raise exception 'FILE_TOO_LARGE'; end if;
  if not (lower(p_mime_type) = any(v_allowed_mimes)) then raise exception 'UNSUPPORTED_FILE_TYPE'; end if;
  if p_storage_path !~ ('^events/' || p_event_code || '/original/') then raise exception 'INVALID_STORAGE_PATH'; end if;

  insert into public.photos (
    event_id, storage_path, original_filename, file_size, mime_type,
    guest_session_id, width, height, status
  ) values (
    v_event.id, p_storage_path, p_original_filename, p_file_size, lower(p_mime_type),
    v_session.id, p_width, p_height, 'processing'
  ) returning id into v_new_id;

  update public.guest_sessions
  set upload_count = upload_count + 1, last_seen_at = now()
  where id = v_session.id;

  return query select v_new_id;
end;
$$;

grant execute on function public.insert_guest_photo(
  text, text, text, bigint, text, text, integer, integer
) to anon, authenticated;
