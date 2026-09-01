-- ============================================================================
-- SECURITY DEFINER functions — the actual enforcement point for event
-- isolation and upload limits. Called from the server-side API route
-- (never directly from browser JS with the anon key exposed to arbitrary
-- inputs — the route wraps these with its own file validation first).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_event_for_upload: resolves a public event_code to the info the
-- upload API route needs, and tells the caller *why* upload isn't allowed
-- if it isn't (closed, over limit) rather than silently failing. Never
-- returns internal admin-only fields.
-- ----------------------------------------------------------------------------
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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event
  from public.events e
  where e.event_code = p_event_code;

  if not found then
    return query select
      null::uuid, null::text, null::date, null::public.event_status,
      false, 'not_found'::text, null::bigint, null::integer,
      null::text, null::text, null::text;
    return;
  end if;

  if v_event.status = 'closed' then
    return query select
      v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'closed'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  if v_event.status = 'archived' then
    return query select
      v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'archived'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  if v_event.photo_count >= v_event.upload_limit then
    return query select
      v_event.id, v_event.event_name, v_event.event_date, v_event.status,
      false, 'limit_reached'::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
      v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
    return;
  end if;

  return query select
    v_event.id, v_event.event_name, v_event.event_date, v_event.status,
    true, null::text, v_event.max_file_size_bytes, v_event.max_files_per_upload,
    v_event.brand_logo_url, v_event.brand_company_name, v_event.brand_primary_color;
end;
$$;

grant execute on function public.get_event_for_upload(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- insert_guest_photo: the ONLY way a photo row gets created by a guest.
-- Takes event_code, not event_id — this is what makes it impossible for a
-- guest (or a tampered client request) to write into an event they didn't
-- resolve through the public code. Re-checks status/limit atomically so a
-- burst of concurrent uploads can't blow past upload_limit via a race.
-- ----------------------------------------------------------------------------
create or replace function public.insert_guest_photo(
  p_event_code text,
  p_storage_path text,
  p_original_filename text,
  p_file_size bigint,
  p_mime_type text,
  p_uploader_identifier text,
  p_width integer default null,
  p_height integer default null
)
returns table (photo_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_new_id uuid;
  v_allowed_mimes text[] := array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
begin
  -- Lock the event row for the duration of this transaction so concurrent
  -- uploads against the same event serialize their limit check instead of
  -- racing past upload_limit.
  select * into v_event
  from public.events
  where event_code = p_event_code
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.status <> 'active' then
    raise exception 'EVENT_NOT_ACCEPTING_UPLOADS';
  end if;

  if v_event.photo_count >= v_event.upload_limit then
    raise exception 'EVENT_UPLOAD_LIMIT_REACHED';
  end if;

  if p_file_size <= 0 or p_file_size > v_event.max_file_size_bytes then
    raise exception 'FILE_TOO_LARGE';
  end if;

  if not (lower(p_mime_type) = any(v_allowed_mimes)) then
    raise exception 'UNSUPPORTED_FILE_TYPE';
  end if;

  -- storage_path must live under this event's own prefix — belt-and-braces
  -- against a forged path even though the API route also constructs this
  -- path itself server-side.
  if p_storage_path !~ ('^events/' || p_event_code || '/original/') then
    raise exception 'INVALID_STORAGE_PATH';
  end if;

  insert into public.photos (
    event_id, storage_path, original_filename, file_size,
    mime_type, uploader_identifier, width, height, status
  ) values (
    v_event.id, p_storage_path, p_original_filename, p_file_size,
    lower(p_mime_type), p_uploader_identifier, p_width, p_height, 'processing'
  )
  returning id into v_new_id;

  return query select v_new_id;
end;
$$;

grant execute on function public.insert_guest_photo(
  text, text, text, bigint, text, text, integer, integer
) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- mark_photo_processed: called by the image-processing Edge Function once
-- gallery/thumb variants exist in R2. Uses the service role, not anon/
-- authenticated, so it's not exposed to guests at all.
-- ----------------------------------------------------------------------------
create or replace function public.mark_photo_processed(
  p_photo_id uuid,
  p_gallery_path text,
  p_thumbnail_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.photos
  set gallery_path = p_gallery_path,
      thumbnail_path = p_thumbnail_path,
      status = 'ready',
      processed_at = now()
  where id = p_photo_id;
end;
$$;

-- IMPORTANT: Postgres grants EXECUTE to the PUBLIC pseudo-role on every
-- new function by default. Simply never writing a "grant ... to anon"
-- line does NOT deny access — anon and authenticated both inherit
-- EXECUTE through PUBLIC unless it's explicitly revoked. This function
-- is meant for the service-role-only image-processing Edge Function, so
-- we revoke from PUBLIC explicitly rather than relying on the absence
-- of a grant.
revoke execute on function public.mark_photo_processed(uuid, text, text) from public;
