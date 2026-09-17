-- ============================================================================
-- 0012 — Guest sessions, and a per-guest quota the server actually enforces.
--
-- BEFORE THIS: the 10-photo limit lived in the browser. `uploader_identifier`
-- was a localStorage string the server stored but never counted, so the limit
-- was a request away from being ignored — clear storage, or just POST.
--
-- AFTER THIS: a guest gets an opaque server-issued token on first arrival.
-- The token is the only identity, it is scoped to one event, and the quota is
-- checked and incremented inside the same transaction that inserts the photo,
-- under a row lock. Two guests uploading at once cannot both see "9 of 10".
--
-- Deliberately NOT used as identity: email, phone, or a browser fingerprint.
-- The token is bearer-style — whoever holds it owns that quota — which is
-- exactly right for an anonymous guest at a wedding and nothing more.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The per-guest ceiling becomes a real column, configurable per event
--    inside the app-wide caps (same pattern as upload_limit).
-- ----------------------------------------------------------------------------
alter table public.events
  add column if not exists guest_photo_limit integer not null default 10;

alter table public.events
  add constraint events_guest_photo_limit_range
  check (guest_photo_limit between 1 and 50);


-- ----------------------------------------------------------------------------
-- 2. The session table.
-- ----------------------------------------------------------------------------
create table if not exists public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Two UUIDs' worth of hex: 244 bits. gen_random_uuid() is core Postgres
  -- (13+), so this needs no extension.
  session_token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  event_id uuid not null references public.events (id) on delete cascade,
  upload_count integer not null default 0 check (upload_count >= 0),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists guest_sessions_event_id_idx on public.guest_sessions (event_id);
create index if not exists guest_sessions_token_idx on public.guest_sessions (session_token);

comment on table public.guest_sessions is
  'Anonymous guest identity, scoped to one event. Managed by the server with the service role; guests never read or write it directly.';

alter table public.guest_sessions enable row level security;

-- No anon or authenticated policies at all. A guest proves who they are by
-- presenting the token to our API, which reads this table with the service
-- role. Giving the browser direct access would let it reset upload_count.
create policy "guest_sessions_select_admin"
  on public.guest_sessions for select
  to authenticated
  using (public.is_admin());

alter table public.photos
  add column if not exists guest_session_id uuid references public.guest_sessions (id) on delete set null;

create index if not exists photos_guest_session_id_idx on public.photos (guest_session_id);


-- ----------------------------------------------------------------------------
-- 3. Issuing a session. Callable by anon — a guest has no account.
-- ----------------------------------------------------------------------------
create or replace function public.register_guest_session(
  p_event_code text,
  p_existing_token text default null
)
returns table (
  session_token text,
  upload_count integer,
  guest_photo_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_row   public.guest_sessions%rowtype;
begin
  select * into v_event
  from public.events
  where event_code = p_event_code;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- A presented token only counts if it belongs to THIS event. Without that
  -- scoping a token minted on a 10-photo event would carry its own counter
  -- into any other event the holder found.
  if p_existing_token is not null then
    -- Qualified on purpose: the OUT parameters of this function are named
    -- session_token and upload_count, so an unqualified reference here is
    -- ambiguous and Postgres refuses to guess.
    select * into v_row
    from public.guest_sessions
    where public.guest_sessions.session_token = p_existing_token
      and public.guest_sessions.event_id = v_event.id;

    if found then
      update public.guest_sessions
      set last_seen_at = now()
      where id = v_row.id;

      return query
        select v_row.session_token, v_row.upload_count, v_event.guest_photo_limit;
      return;
    end if;
  end if;

  insert into public.guest_sessions (event_id)
  values (v_event.id)
  returning * into v_row;

  return query
    select v_row.session_token, v_row.upload_count, v_event.guest_photo_limit;
end;
$$;

grant execute on function public.register_guest_session(text, text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. insert_guest_photo, now with the quota enforced inside the transaction.
--
-- The signature is unchanged; parameter 6 is now the session token instead of
-- the old `uploader_identifier`. That is deliberate: a stale caller that still
-- sends a browser-made identifier lands in the session lookup, finds nothing,
-- and fails closed with GUEST_SESSION_NOT_FOUND rather than quietly bypassing
-- the quota. Had this been added as a ninth optional parameter instead, the
-- old 8-argument overload would have stayed callable and the quota would have
-- been decoration.
--
-- The function must be dropped rather than replaced: Postgres refuses
-- CREATE OR REPLACE when an input parameter is renamed
-- ("cannot change name of input parameter"), and renaming is the whole point.
-- ----------------------------------------------------------------------------
drop function if exists public.insert_guest_photo(
  text, text, text, bigint, text, text, integer, integer
);

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event   public.events%rowtype;
  v_session public.guest_sessions%rowtype;
  v_new_id  uuid;
  v_allowed_mimes text[] := array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
begin
  -- Event row lock first: serialises the event-wide limit check.
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

  -- Session row lock second: serialises this guest's own quota check, so two
  -- parallel uploads from the same guest cannot both pass at 9 of 10.
  select * into v_session
  from public.guest_sessions
  where session_token = p_guest_session_token
    and event_id = v_event.id
  for update;

  if not found then
    raise exception 'GUEST_SESSION_NOT_FOUND';
  end if;

  if v_session.upload_count >= v_event.guest_photo_limit then
    raise exception 'GUEST_UPLOAD_LIMIT_REACHED';
  end if;

  if p_file_size <= 0 or p_file_size > v_event.max_file_size_bytes then
    raise exception 'FILE_TOO_LARGE';
  end if;

  if not (lower(p_mime_type) = any(v_allowed_mimes)) then
    raise exception 'UNSUPPORTED_FILE_TYPE';
  end if;

  if p_storage_path !~ ('^events/' || p_event_code || '/original/') then
    raise exception 'INVALID_STORAGE_PATH';
  end if;

  insert into public.photos (
    event_id, storage_path, original_filename, file_size,
    mime_type, guest_session_id, width, height, status
  ) values (
    v_event.id, p_storage_path, p_original_filename, p_file_size,
    lower(p_mime_type), v_session.id, p_width, p_height, 'processing'
  )
  returning id into v_new_id;

  update public.guest_sessions
  set upload_count = upload_count + 1,
      last_seen_at = now()
  where id = v_session.id;

  return query select v_new_id;
end;
$$;

grant execute on function public.insert_guest_photo(
  text, text, text, bigint, text, text, integer, integer
) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Keep the app-wide caps honest about the new column.
-- ----------------------------------------------------------------------------
create or replace function public.assert_event_limits_within_caps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 5000 then
    raise exception 'UPLOAD_LIMIT_OUT_OF_RANGE';
  end if;

  if new.max_file_size_bytes is null
     or new.max_file_size_bytes < 1048576
     or new.max_file_size_bytes > 52428800 then
    raise exception 'FILE_SIZE_OUT_OF_RANGE';
  end if;

  if new.guest_photo_limit is null
     or new.guest_photo_limit < 1
     or new.guest_photo_limit > 50 then
    raise exception 'GUEST_LIMIT_OUT_OF_RANGE';
  end if;

  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. Verify — the same discipline as 0011. If any of these is wrong the
--    migration fails instead of looking like it worked.
-- ----------------------------------------------------------------------------
do $$
begin
  -- Same signature as before, so the only honest check that the quota is
  -- really in there is to look at the deployed body.
  if to_regprocedure('public.insert_guest_photo(text, text, text, bigint, text, text, integer, integer)') is null then
    raise exception 'INSERT_GUEST_PHOTO_MISSING';
  end if;

  if position('GUEST_UPLOAD_LIMIT_REACHED' in pg_get_functiondef(
       'public.insert_guest_photo(text, text, text, bigint, text, text, integer, integer)'::regprocedure)) = 0 then
    raise exception 'QUOTA_CHECK_MISSING_FROM_insert_guest_photo';
  end if;

  if not has_function_privilege('anon',
        to_regprocedure('public.register_guest_session(text, text)'), 'EXECUTE') then
    raise exception 'GUEST_ACCESS_BROKEN — anon cannot register a session';
  end if;

  if not has_function_privilege('anon',
        to_regprocedure('public.insert_guest_photo(text, text, text, bigint, text, text, integer, integer)'),
        'EXECUTE') then
    raise exception 'GUEST_ACCESS_BROKEN — anon cannot upload';
  end if;
end
$$;
