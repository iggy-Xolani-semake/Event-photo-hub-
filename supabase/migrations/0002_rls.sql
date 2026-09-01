-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Threat model recap (spec sections 10, 21, 39):
--   * Guests have NO Supabase auth session at all — they are always the
--     anonymous `anon` role. They must be able to (a) resolve an event_code
--     to enough info to render the guest page, and (b) insert exactly one
--     photo row into an event that is currently accepting uploads.
--   * Clients have a Supabase auth session and must see ONLY events tied
--     to their own client_id.
--   * Admins (a role, not just "any authenticated user") can see everything.
--   * The browser never gets R2 or Supabase service-role credentials.
--     Guest inserts go through a SECURITY DEFINER RPC (grant_guest_upload /
--     insert handled in 0003) rather than a wide-open INSERT policy, so we
--     can validate event status + limits atomically instead of trusting
--     client-supplied event_id.
-- ============================================================================

alter table public.clients enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;

-- ----------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- Admins are marked via a custom claim in raw_app_meta_data, set manually
-- (or by an internal admin-invite flow) — never self-service.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------
create policy "clients_select_own"
  on public.clients for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "clients_admin_all"
  on public.clients for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No insert/update policy for plain authenticated users: client rows are
-- created by an admin (event setup) or by a server-side signup route using
-- the service role, never directly by the client themselves.

-- ----------------------------------------------------------------------------
-- EVENTS
-- ----------------------------------------------------------------------------

-- Guests (anon) may read only the narrow public fields needed to render the
-- guest upload page, and only for events that exist. We don't restrict by
-- status here because a closed event must still resolve (to show the
-- "no longer accepting uploads" message) — status gating happens in the
-- guest page logic + the upload RPC, not by hiding the row.
create policy "events_select_public_anon"
  on public.events for select
  to anon
  using (true);

create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (
    public.is_admin()
    or client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

create policy "events_admin_write"
  on public.events for insert
  to authenticated
  with check (public.is_admin());

create policy "events_admin_update"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_admin_delete"
  on public.events for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- PHOTOS
-- ----------------------------------------------------------------------------

-- Guests never get a direct INSERT policy — all guest uploads go through
-- the insert_guest_photo() SECURITY DEFINER function (0003_functions.sql),
-- which re-validates event status/limits server-side before writing. This
-- is the actual mechanism that stops "Event A guest uploads into Event B":
-- the function takes event_code (not event_id) as input and resolves the
-- id itself, so a forged event_id in a client request is never trusted.

-- Anyone (anon or authenticated) may read photos for events that are
-- 'shared' or 'public'. This powers the optional public gallery link
-- (spec section 22) without requiring a login.
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
    )
  );

-- Clients/admins can see all photos (including hidden ones, for moderation)
-- on events they own.
create policy "photos_select_owner"
  on public.photos for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Clients may update favourite/hidden flags on their own event's photos.
-- Guests get no update/delete access at all.
create policy "photos_update_owner"
  on public.photos for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy "photos_delete_owner"
  on public.photos for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  );
