-- 0025 — constrain image-processing callbacks to canonical photo paths.
--
-- The Edge Function authenticates the webhook and re-reads the photo row.
-- These checks provide a second server-side boundary if the function code or
-- deployment configuration is ever changed later.

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
declare
  v_event_code text;
  v_storage_path text;
  v_gallery_path text;
  v_thumbnail_path text;
begin
  select e.event_code, p.storage_path
    into v_event_code, v_storage_path
    from public.photos p
    join public.events e on e.id = p.event_id
   where p.id = p_photo_id;

  if not found then
    raise exception 'PHOTO_NOT_FOUND';
  end if;

  if v_storage_path !~ ('^events/' || v_event_code || '/original/[^/]+\.(jpg|jpeg|png|heic|heif)$') then
    raise exception 'INVALID_STORAGE_PATH';
  end if;

  v_gallery_path := 'events/' || v_event_code || '/gallery/' || p_photo_id || '.webp';
  v_thumbnail_path := 'events/' || v_event_code || '/thumb/' || p_photo_id || '.webp';

  if p_gallery_path <> v_gallery_path or p_thumbnail_path <> v_thumbnail_path then
    raise exception 'INVALID_PROCESSED_PATH';
  end if;

  update public.photos
     set gallery_path = v_gallery_path,
         thumbnail_path = v_thumbnail_path,
         status = 'ready',
         processed_at = now()
   where id = p_photo_id
     and storage_path = v_storage_path;
end;
$$;

revoke execute on function public.mark_photo_processed(uuid, text, text) from public;
revoke execute on function public.mark_photo_processed(uuid, text, text) from anon;
revoke execute on function public.mark_photo_processed(uuid, text, text) from authenticated;
grant execute on function public.mark_photo_processed(uuid, text, text) to service_role;

-- Fail closed if a future privilege/default-privilege change re-exposes it.
do $$
begin
  if has_function_privilege('anon', 'public.mark_photo_processed(uuid, text, text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.mark_photo_processed(uuid, text, text)', 'EXECUTE') then
    raise exception 'FUNCTION_PRIVILEGES_NOT_LOCKED — mark_photo_processed is callable by a client role';
  end if;
end
$$;
