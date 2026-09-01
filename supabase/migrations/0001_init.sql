-- ============================================================================
-- Event Photo Hub — Initial Schema
-- ============================================================================
-- Design notes:
--   * Guests never get a Supabase auth session. Their write access to
--     `photos` is granted narrowly through a SECURITY DEFINER RPC
--     (see 0002_functions.sql), never through a broad RLS policy on the
--     table itself. This is what prevents Event A guests from touching
--     Event B's rows even if they guess/enumerate photo IDs.
--   * `event_code` is the public, hard-to-guess identifier used in URLs
--     and QR codes. `id` (uuid) is the internal FK target. Never expose
--     sequential integer PKs in a URL.
--   * Storage quotas (`upload_limit`, `max_file_size`) live on the event
--     row so admins can tune limits per event/package tier without a
--     code change.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create unique index clients_email_key on public.clients (lower(email));
create index clients_auth_user_id_idx on public.clients (auth_user_id);

comment on table public.clients is
  'A paying customer (couple, company, photographer) who owns one or more events.';

-- ----------------------------------------------------------------------------
-- EVENTS
-- ----------------------------------------------------------------------------
create type public.event_status as enum ('active', 'closed', 'archived');
create type public.event_visibility as enum ('private', 'shared', 'public');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  event_name text not null,
  event_date date,
  client_id uuid references public.clients (id) on delete set null,
  status public.event_status not null default 'active',
  visibility public.event_visibility not null default 'private',

  -- Configurable limits (spec section 6 / 30) — never hard-coded in app logic.
  upload_limit integer not null default 500,          -- max photos for the event
  max_file_size_bytes bigint not null default 15728640, -- 15 MB
  max_files_per_upload integer not null default 10,

  -- Rollups, kept in sync by trigger — avoids COUNT(*) over large photo sets
  -- on every dashboard load.
  photo_count integer not null default 0,
  storage_used_bytes bigint not null default 0,

  -- White-label / branding (spec section 31) — nullable, optional in V1.
  brand_logo_url text,
  brand_company_name text,
  brand_primary_color text,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index events_event_code_key on public.events (event_code);
create index events_client_id_idx on public.events (client_id);
create index events_status_idx on public.events (status);

comment on table public.events is
  'One event = one isolated photo collection. event_code is the public, non-sequential identifier used in guest URLs and QR codes.';
comment on column public.events.event_code is
  'Public-facing code, e.g. SMK4827Q. Generated via nanoid, never sequential — see lib/eventCode.ts.';

-- ----------------------------------------------------------------------------
-- PHOTOS
-- ----------------------------------------------------------------------------
create type public.photo_status as enum ('processing', 'ready', 'failed', 'deleted');

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,

  original_filename text,
  storage_path text not null,      -- events/{event_code}/original/{id}.{ext}
  gallery_path text,                -- events/{event_code}/gallery/{id}.webp (populated after processing)
  thumbnail_path text,              -- events/{event_code}/thumb/{id}.webp   (populated after processing)

  file_size bigint not null,
  mime_type text not null,
  width integer,
  height integer,

  -- Loosely identifies which guest uploaded this without requiring an
  -- account — e.g. a client-generated random ID stored in localStorage
  -- on the guest's device. Never PII, never used for auth decisions.
  uploader_identifier text,

  status public.photo_status not null default 'processing',
  is_favourite boolean not null default false,
  is_hidden boolean not null default false,

  uploaded_at timestamptz not null default now(),
  processed_at timestamptz
);

create index photos_event_id_idx on public.photos (event_id);
create index photos_event_id_status_idx on public.photos (event_id, status) where status = 'ready';
create index photos_event_id_favourite_idx on public.photos (event_id) where is_favourite = true;
create index photos_event_id_hidden_idx on public.photos (event_id) where is_hidden = false;

comment on table public.photos is
  'Metadata + storage references only. Actual image bytes live in Cloudflare R2, never in Postgres.';
comment on column public.photos.uploader_identifier is
  'Anonymous per-device identifier (not PII) — lets a guest see "their" uploads in-session. Never used for access control.';

-- ----------------------------------------------------------------------------
-- Rollup triggers: keep events.photo_count / storage_used_bytes accurate
-- without expensive aggregate queries on read.
-- ----------------------------------------------------------------------------
create or replace function public.handle_photo_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set photo_count = photo_count + 1,
      storage_used_bytes = storage_used_bytes + new.file_size
  where id = new.event_id;
  return new;
end;
$$;

create trigger photos_after_insert
  after insert on public.photos
  for each row execute function public.handle_photo_insert();

create or replace function public.handle_photo_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set photo_count = greatest(photo_count - 1, 0),
      storage_used_bytes = greatest(storage_used_bytes - old.file_size, 0)
  where id = old.event_id;
  return old;
end;
$$;

create trigger photos_after_delete
  after delete on public.photos
  for each row execute function public.handle_photo_delete();

-- ----------------------------------------------------------------------------
-- updated_at-style housekeeping for events.closed_at
-- ----------------------------------------------------------------------------
create or replace function public.handle_event_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'closed' and old.status <> 'closed' then
    new.closed_at = now();
  elsif new.status <> 'closed' then
    new.closed_at = null;
  end if;
  return new;
end;
$$;

create trigger events_before_update_status
  before update on public.events
  for each row execute function public.handle_event_status_change();

-- ----------------------------------------------------------------------------
-- Trigger functions should never be callable directly via the REST API —
-- they only make sense fired BY their trigger, on the row Postgres passes
-- them. Postgres grants EXECUTE to the PUBLIC pseudo-role by default at
-- function creation, which anon/authenticated silently inherit unless
-- explicitly revoked — so we do that here, at creation time, rather than
-- relying on "we just never granted it" (that is NOT the same as denying
-- it).
-- ----------------------------------------------------------------------------
revoke execute on function public.handle_photo_insert() from public;
revoke execute on function public.handle_photo_delete() from public;
revoke execute on function public.handle_event_status_change() from public;
