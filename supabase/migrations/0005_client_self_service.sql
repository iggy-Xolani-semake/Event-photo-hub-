-- ============================================================================
-- 0005 — Client self-service (V2 Sprint 2)
-- ============================================================================
-- Turns the product from "an admin creates events on behalf of clients" into
-- "a client signs up, owns their events, and configures them inside caps the
-- application sets". Site-host admins keep seeing everything.
--
-- What this adds:
--   1. create_own_client_profile()  — the only way a signed-in user gets a
--                                     clients row. SECURITY DEFINER, because
--                                     there is deliberately no anon/owner
--                                     INSERT policy on clients: the function
--                                     derives identity from auth.uid() and
--                                     auth.jwt()->>'email', never from input.
--   2. events_insert_owner / events_update_owner — an owner may create and
--                                     edit THEIR events. Admins keep the
--                                     existing admin_* policies.
--   3. events_assert_limits trigger — absolute ceilings on upload_limit,
--                                     max_file_size_bytes and
--                                     max_files_per_upload, enforced in
--                                     Postgres so no API route (present or
--                                     future) can write an absurd value.
--                                     The tighter, customer-facing caps live
--                                     in src/lib/limits.ts.
--   4. clients_update_own — a client may edit their own name/phone.
--   5. Drops events_select_public_anon (see the note at the bottom).
--
-- Deliberately NOT here: pricing/packages (Sprint 3) and the per-guest upload
-- quota + nickname, which need columns on photos and are a separate change.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Self-service client profile
-- ----------------------------------------------------------------------------
create or replace function public.create_own_client_profile(
  p_name text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text := nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '');
  v_existing  uuid;
  v_owner     uuid;
  v_name      text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_email is null then
    raise exception 'NO_EMAIL_ON_SESSION';
  end if;

  if v_name is null then
    v_name := split_part(v_email, '@', 1);
  end if;

  -- Idempotent: one profile per auth user. Callers (the dashboard, the
  -- signup route) can call this on every request without creating dupes.
  select id into v_existing
  from public.clients
  where auth_user_id = v_uid;

  if found then
    return v_existing;
  end if;

  -- An admin may already have created a client row for this email before the
  -- client ever signed up (that is how events were created before V2).
  -- Adopt it rather than failing on the unique lower(email) index — but only
  -- if it isn't already bound to a different auth user.
  select id, auth_user_id into v_existing, v_owner
  from public.clients
  where lower(email) = lower(v_email);

  if found then
    if v_owner = v_uid then
      return v_existing;
    end if;

    if v_owner is not null then
      raise exception 'EMAIL_ALREADY_LINKED';
    end if;

    update public.clients
    set auth_user_id = v_uid,
        phone = coalesce(public.clients.phone, nullif(btrim(coalesce(p_phone, '')), ''))
    where id = v_existing;

    return v_existing;
  end if;

  insert into public.clients (auth_user_id, name, email, phone)
  values (v_uid, v_name, v_email, nullif(btrim(coalesce(p_phone, '')), ''))
  returning id into v_existing;

  return v_existing;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function by default, so the
-- revoke is what actually restricts this to signed-in users.
revoke execute on function public.create_own_client_profile(text, text) from public;
grant execute on function public.create_own_client_profile(text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Owners may create and edit their own events
-- ----------------------------------------------------------------------------
-- Policies are OR-ed, so these sit alongside the existing admin-only
-- events_admin_write / events_admin_update rather than replacing them: an
-- admin still passes via is_admin(), an owner passes via the subquery.
--
-- The subquery is the same one events_select_authenticated uses, so "what you
-- can see" and "what you can write" can never drift apart.
create policy "events_insert_owner"
  on public.events for insert
  to authenticated
  with check (
    public.is_admin()
    or client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

-- with_check matters here as much as using: it stops an owner from
-- reassigning an event to somebody else's client_id (or to null, which would
-- orphan it out of everyone's dashboard).
create policy "events_update_owner"
  on public.events for update
  to authenticated
  using (
    public.is_admin()
    or client_id in (select id from public.clients where auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or client_id in (select id from public.clients where auth_user_id = auth.uid())
  );


-- ----------------------------------------------------------------------------
-- 3. Absolute ceilings on event limits
-- ----------------------------------------------------------------------------
-- src/lib/limits.ts holds the customer-facing caps and validates them in the
-- API routes with friendly messages. This trigger is the backstop for
-- anything that reaches the table another way (a future route, a dashboard
-- edit, a script). The numbers here are deliberately looser than the
-- application caps: the point is "no absurd values ever get stored", not
-- "duplicate the product rules in two places".
--
-- A trigger (rather than CHECK constraints) is used on purpose: CHECKs are
-- validated against existing rows when added, which would make this migration
-- fail on any live event that already sits outside the range. A trigger only
-- judges writes from now on.
create or replace function public.assert_event_limits_within_caps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 5000 then
    raise exception 'UPLOAD_LIMIT_OUT_OF_RANGE';
  end if;

  -- 1 MB .. 50 MB
  if new.max_file_size_bytes is null
     or new.max_file_size_bytes < 1048576
     or new.max_file_size_bytes > 52428800 then
    raise exception 'FILE_SIZE_OUT_OF_RANGE';
  end if;

  if new.max_files_per_upload is null
     or new.max_files_per_upload < 1
     or new.max_files_per_upload > 50 then
    raise exception 'FILES_PER_UPLOAD_OUT_OF_RANGE';
  end if;

  return new;
end;
$$;

drop trigger if exists events_assert_limits on public.events;

create trigger events_assert_limits
  before insert or update on public.events
  for each row
  execute function public.assert_event_limits_within_caps();


-- ----------------------------------------------------------------------------
-- 4. A client may edit their own contact details
-- ----------------------------------------------------------------------------
create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 5. Remove the anonymous SELECT policy on events
-- ----------------------------------------------------------------------------
-- This policy was `using (true)`, i.e. anyone holding the public anon key —
-- which ships inside the browser bundle, so that is everyone — could run
-- `select * from events` and read every client's event names, dates,
-- client_id, created_by and configured limits.
--
-- Nothing in the application used it. Guests resolve their event through
-- get_event_for_upload(), a SECURITY DEFINER function that returns only the
-- public-safe subset; every other read path uses either the service-role
-- client or a session-bound client under events_select_authenticated.
--
-- Re-create it only if you add a browser-side query against events with the
-- anon key — and then narrow it, don't restore `using (true)`.
drop policy if exists "events_select_public_anon" on public.events;
