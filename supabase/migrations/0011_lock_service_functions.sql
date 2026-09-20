-- ============================================================================
-- 0011 — Lock service-role-only functions, per role name.
--
-- WHY THIS EXISTS
-- 0006 did this:
--     revoke execute on function public.mark_event_paid(...) from public;
--     grant  execute on function public.mark_event_paid(...) to service_role;
--
-- That looks airtight and is not. On the live project the resulting ACL was
--     {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,
--      service_role=X/postgres}
-- — anon and authenticated STILL had EXECUTE, because revoking from the PUBLIC
-- pseudo-role does not remove privileges that were granted to those roles by
-- name (Supabase grants them explicitly, and default privileges re-grant them
-- to newly created functions).
--
-- The consequence was a working paywall bypass, using nothing but an ordinary
-- client account:
--     1. POST /api/events/{code}/checkout      -> creates a pending payment
--     2. select id from payments where ...     -> allowed by payments_select_owner
--     3. select mark_event_paid('<id>','free') -> flips it to paid and sets
--                                                 events.download_unlocked_at
--     4. download every original. No money moved.
--
-- migration 0009 already documented this exact gotcha for mark_photo_failed
-- and did it correctly. This applies the same treatment everywhere, and then
-- VERIFIES it — because "the revoke ran without error" is precisely the
-- signal that turned out to be worthless.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Revoke from every role that should not have these, by name.
--
-- Only plain service-role functions are listed here. The five trigger
-- functions (handle_photo_insert, handle_photo_delete,
-- handle_event_status_change, assert_event_limits_within_caps,
-- protect_event_commercial_fields) are deliberately NOT revoked: Postgres
-- requires the role that FIRES a trigger to hold EXECUTE on its function, so
-- revoking from anon/authenticated would break guest uploads and client event
-- updates. They are safe to leave — Postgres refuses a direct call with
-- "trigger functions can only be called as trigger".
-- ----------------------------------------------------------------------------
do $$
declare
  v_fn    text;
  v_role  text;
  v_funcs text[] := array[
    -- the one that was exploitable
    'public.mark_event_paid(uuid, text, text)',
    -- image-pipeline callbacks: service role only, same shape of risk
    'public.mark_photo_processed(uuid, text, text)',
    'public.mark_photo_failed(uuid, text)'
  ];
begin
  foreach v_fn in array v_funcs loop
    -- A migration may not have been applied in this project yet.
    if to_regprocedure(v_fn) is null then
      continue;
    end if;

    -- PUBLIC is a keyword, not a role name, so it cannot go through %I.
    execute format('revoke execute on function %s from public', v_fn);

    foreach v_role in array array['anon', 'authenticated'] loop
      execute format('revoke execute on function %s from %I', v_fn, v_role);
    end loop;
  end loop;
end
$$;


-- ----------------------------------------------------------------------------
-- 2. Re-grant to the only role that should hold them.
-- ----------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.mark_event_paid(uuid, text, text)',
    'public.mark_photo_processed(uuid, text, text)',
    'public.mark_photo_failed(uuid, text)'
  ] loop
    if to_regprocedure(v_fn) is null then
      continue;
    end if;
    execute format('grant execute on function %s to service_role', v_fn);
  end loop;
end
$$;


-- ----------------------------------------------------------------------------
-- 3. Verify — and fail loudly if the lock did not take.
--
-- has_function_privilege() is the only trustworthy check here. Reading proacl
-- is not: it can show no grant to a role while the role can still execute the
-- function through PUBLIC.
-- ----------------------------------------------------------------------------
do $$
declare
  v_fn   text;
  v_role text;
  v_bad  text := '';
begin
  foreach v_fn in array array[
    'public.mark_event_paid(uuid, text, text)',
    'public.mark_photo_processed(uuid, text, text)',
    'public.mark_photo_failed(uuid, text)'
  ] loop
    if to_regprocedure(v_fn) is null then
      continue;
    end if;
    foreach v_role in array array['anon', 'authenticated'] loop
      if has_function_privilege(v_role, v_fn::regprocedure, 'EXECUTE') then
        v_bad := v_bad || v_role || ' can still execute ' || v_fn || '; ';
      end if;
    end loop;
  end loop;

  if v_bad <> '' then
    raise exception 'FUNCTION_PRIVILEGES_NOT_LOCKED — %', v_bad;
  end if;
end
$$;


-- ----------------------------------------------------------------------------
-- 4. And confirm the two functions guests legitimately need were NOT caught
--    in the sweep. Removing guest access would be as bad as leaving the hole.
-- ----------------------------------------------------------------------------
do $$
begin
  -- to_regprocedure() rather than a ::regprocedure cast, which would raise
  -- on a project where the function does not exist yet.
  if to_regprocedure('public.get_event_for_upload(text)') is not null
     and not has_function_privilege('anon',
           to_regprocedure('public.get_event_for_upload(text)'), 'EXECUTE') then
    raise exception 'GUEST_ACCESS_BROKEN — anon lost get_event_for_upload';
  end if;
  if to_regprocedure('public.insert_guest_photo(text, text, text, bigint, text, text, integer, integer)') is not null
     and not has_function_privilege('anon',
           to_regprocedure('public.insert_guest_photo(text, text, text, bigint, text, text, integer, integer)'),
           'EXECUTE') then
    raise exception 'GUEST_ACCESS_BROKEN — anon lost insert_guest_photo';
  end if;
end
$$;
