-- ============================================================================
-- 0023 — Editing your own client profile actually saves
-- ============================================================================
-- Reported symptom: in Dashboard → Account Settings a host changes "Your
-- name", the form reports success, and nothing changes — the form still shows
-- the old name on the next visit and the header keeps the old one.
--
-- Cause: POST /api/account sent the new name into create_own_client_profile()
-- (0005_client_self_service.sql), which is an *ensure* function, not a save
-- function. When a clients row already exists for the caller it returns early:
--
--     select id into v_existing from public.clients where auth_user_id = v_uid;
--     if found then return v_existing;   -- p_name / p_phone dropped here
--     end if;
--
-- That early return is not a bug in the function — it was written for signup,
-- where the only two outcomes are "no row yet, create one" and "row already
-- exists, leave it alone" — but it means the settings screen was writing into
-- a code path that deliberately discards the write.
--
-- Fix: give the edit path its own function instead of overloading the signup
-- one, so "create if missing, never touch an existing profile" and "save these
-- new details" stop being the same call:
--
--   * update_own_client_profile() edits the caller's own row. Identity comes
--     from auth.uid() as always — there is no parameter naming the row, so it
--     cannot be pointed at another account.
--   * An omitted parameter (NULL) means "leave this field alone"; an explicit
--     empty string means "clear it". The settings form always sends both
--     fields, so clearing the phone number works, while a future caller that
--     only wants to rename someone does not accidentally wipe their phone.
--   * Blank names are refused rather than silently ignored: clients.name is
--     NOT NULL and the printable poster, gallery header and reminder emails
--     all have to call the host something.
--   * Length caps live here, next to the columns, so no API route (present or
--     future) can store a 40 KB "name".
--
-- create_own_client_profile() is left exactly as it is: it is still the only
-- way a new clients row is created, and /api/account still falls back to it
-- when a signed-in user has no row yet.
-- ============================================================================

create or replace function public.update_own_client_profile(
  p_name  text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_id        uuid;
  v_name      text;
  v_phone     text;
  v_new_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_new_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_name is not null and v_new_name is null then
    raise exception 'NAME_REQUIRED';
  end if;

  if length(v_new_name) > 120 then
    raise exception 'NAME_TOO_LONG';
  end if;

  if length(v_new_phone) > 32 then
    raise exception 'PHONE_TOO_LONG';
  end if;

  -- The caller's own row, found by session identity — never by id from the
  -- request, which is the whole point of doing this in a SECURITY DEFINER
  -- function instead of trusting an UPDATE from the browser.
  select id, name, phone
    into v_id, v_name, v_phone
  from public.clients
  where auth_user_id = v_uid;

  if not found then
    -- Someone signed in without a clients row (a database that predates the
    -- signup trigger in 0017/0020). The route answers this by falling back to
    -- create_own_client_profile(), which adopts a matching email or inserts.
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_new_name is not null then
    v_name := v_new_name;
  end if;

  if p_phone is not null then
    v_phone := v_new_phone;  -- '' clears the column, NULL means "unchanged"
  end if;

  update public.clients
     set name = v_name,
         phone = v_phone
   where id = v_id;

  -- Echo the stored values back so the client can render exactly what the
  -- database holds rather than what it hoped it sent.
  return jsonb_build_object('id', v_id, 'name', v_name, 'phone', v_phone);
end;
$$;

comment on function public.update_own_client_profile(text, text) is
  'Saves the calling client''s own name/phone. NULL = leave unchanged, '''' = clear. '
  'Raises PROFILE_NOT_FOUND when the caller has no clients row yet; callers '
  'should then use create_own_client_profile().';

-- Postgres grants EXECUTE on new functions to PUBLIC by default, so the
-- revoke from PUBLIC is what actually restricts this to signed-in users.
revoke execute on function public.update_own_client_profile(text, text) from public;
revoke execute on function public.update_own_client_profile(text, text) from anon;
grant execute on function public.update_own_client_profile(text, text) to authenticated;
