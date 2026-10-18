-- ============================================================================
-- 0027 — the Event Pack can hold the 1000 photos it sells
-- ============================================================================
-- The shutaMzala catalogue sells three tiers:
--
--   Free        100 photos
--   Party Pack  240 photos
--   Event Pack 1000 photos      ← the top tier, R149.99
--
-- but the app-wide ceiling on an event's photo allowance was still 500, from
-- 0019_event_retention_and_v1_limits.sql:
--
--     if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 500 then
--       raise exception 'UPLOAD_LIMIT_OUT_OF_RANGE';
--
-- Nothing raised that ceiling when the catalogue did, so the Event Pack could
-- not be delivered:
--
--   * POST /api/events fills the photo allowance from the chosen package
--     (packageDefaults.uploadLimit = selectedPackage.photo_limit = 1000) and
--     packageCeilingError() only checks the value against the package, not
--     against the app ceiling — so the request reaches the INSERT and Postgres
--     raises UPLOAD_LIMIT_OUT_OF_RANGE, which the route reports as the generic
--     "Those limits are outside what this app allows."
--   * A host who works around it by typing a number the form will accept gets
--     500, because that is what the form's max says. That is exactly what
--     production shows: the only Event Pack event in the live database has
--     upload_limit = 500 — half of what the tier advertises.
--
-- src/lib/limits.ts carries the same 500 as EVENT_LIMIT_CAPS.uploadLimit.max
-- and is changed alongside this migration; the two have to move together, or
-- the form and the database disagree about the same product rule.
--
-- The ceiling is set to the largest tier rather than to some larger round
-- number on purpose: it is a "nothing may ever store an absurd value" guard,
-- and it should be raised deliberately when a bigger tier is added.
-- ============================================================================

create or replace function public.assert_event_limits_within_caps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 1000 then
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

-- ----------------------------------------------------------------------------
-- Verify. The trigger calls this function by name, so a mismatched body is the
-- only failure mode worth checking, and it is invisible from the outside.
-- ----------------------------------------------------------------------------
do $$
begin
  if position('> 1000' in pg_get_functiondef('public.assert_event_limits_within_caps()'::regprocedure)) = 0 then
    raise exception 'EVENT_PHOTO_CEILING_NOT_RAISED';
  end if;

  -- This function is replaced wholesale, so it is easy to rewrite it and
  -- silently lose one of the other three ceilings. Each one is asserted by
  -- name, because a missing ceiling raises nothing at all.
  if position('FILES_PER_UPLOAD_OUT_OF_RANGE' in pg_get_functiondef('public.assert_event_limits_within_caps()'::regprocedure)) = 0 then
    raise exception 'FILES_PER_UPLOAD_CEILING_DROPPED';
  end if;

  if position('GUEST_LIMIT_OUT_OF_RANGE' in pg_get_functiondef('public.assert_event_limits_within_caps()'::regprocedure)) = 0 then
    raise exception 'GUEST_LIMIT_CEILING_DROPPED';
  end if;

  if position('FILE_SIZE_OUT_OF_RANGE' in pg_get_functiondef('public.assert_event_limits_within_caps()'::regprocedure)) = 0 then
    raise exception 'FILE_SIZE_CEILING_DROPPED';
  end if;

  -- The ceiling must never be lower than the biggest tier on sale, or that
  -- tier becomes unsellable the moment someone buys it.
  if exists (
    select 1 from public.packages p
    where p.is_active and p.photo_limit > 1000
  ) then
    raise exception 'CEILING_BELOW_LARGEST_TIER';
  end if;
end $$;
