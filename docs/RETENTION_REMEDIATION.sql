-- ============================================================================
-- RETENTION REMEDIATION — run by hand, deliberately. NOT a migration.
-- ============================================================================
-- This file is not part of the numbered sequence in supabase/migrations/ and
-- must never be added to it. Everything in there is safe to run unattended;
-- this changes customer data and is a business decision, so it stays here and
-- is run by a person who has decided to run it.
--
-- WHY THIS EXISTS
-- 0025_tier_enforcement.sql rewrote the expiry of every gallery that had not
-- yet expired, from the flat 30 days 0019 gave it to the new per-tier
-- retention (Free = 7 days). Events were created under a 30-day promise and
-- were cut to 7, which is why galleries that were still inside their original
-- window are now closed. On the production project this expired 7 of the 8
-- events, including one holding 18 photos.
--
-- The new per-tier retention is not itself wrong — it is what the tiers now
-- sell. The question this file exists to answer is narrower:
--
--     do events created BEFORE the rollout keep the window they were
--     created under, or do they move to the new tier policy?
--
-- Both answers are defensible. Only you can pick one. Run STEP 0 first.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 0 — look, before you change anything.
-- ----------------------------------------------------------------------------
-- Every event, what it holds, and whether it is already closed.
select
  e.event_code,
  e.event_name,
  e.status,
  coalesce(p.code, '(none)')            as package,
  e.photo_count,
  e.created_at::date                    as created,
  e.gallery_expires_at::date            as expires_now,
  (e.gallery_expires_at <= now())       as closed_now,
  (e.created_at + interval '30 days')::date as would_expire_under_old_policy
from public.events e
left join public.packages p on p.id = e.package_id
order by e.created_at;


-- ----------------------------------------------------------------------------
-- STEP 1 — restore the viewing window these events were created under.
-- ----------------------------------------------------------------------------
-- greatest() means this only ever EXTENDS a gallery. Nothing is shortened and
-- no event that is open today can be closed by running it, so it is safe to
-- run more than once and safe to run on a database you are unsure about.
--
-- It restores the old flat 30 days as a FLOOR, not a ceiling: an Event Pack
-- gallery with 120 days keeps its 120.
--
-- Events genuinely older than 30 days are unaffected — their original window
-- has really passed, and this does not pretend otherwise.
--
--   update public.events
--   set gallery_expires_at = greatest(gallery_expires_at, created_at + interval '30 days')
--   where gallery_expires_at < created_at + interval '30 days';
--
-- If you would rather events move straight to the tier policy they are on,
-- run nothing here. If you want paid tiers to get the retention they were
-- sold without touching Free, use this instead:
--
--   update public.events e
--   set gallery_expires_at = greatest(e.gallery_expires_at,
--                                     e.created_at + make_interval(days => p.retention_days))
--   from public.packages p
--   where p.id = e.package_id and p.price_cents > 0;
--
-- (On the current production data that second statement is a no-op: the one
-- Event Pack gallery already has its full 120 days.)


-- ----------------------------------------------------------------------------
-- STEP 2 — give the events with no package a package. Optional.
-- ----------------------------------------------------------------------------
-- 0024 repointed events that were on a legacy package, but an event whose
-- package_id is NULL was never repointed — the join it uses needs a package to
-- match against. Such an event is clamped to Free limits by the trigger, but
-- claim_event_downloads() joins events to packages, so with no package row it
-- can never match and EVERY download is refused: the owner is entitled and
-- still blocked, and the API reports it as "reached its download limit".
--
-- Four of the eight production events are in this state. Assigning them Free
-- gives them a package to count against. It does not by itself restore access
-- to a gallery that has already expired — that is STEP 1.
--
--   update public.events
--   set package_id = (select id from public.packages where code = 'free')
--   where package_id is null;
--
-- Check what it would touch first:
--
--   select event_code, event_name, photo_count, created_at::date
--   from public.events where package_id is null order by created_at;


-- ----------------------------------------------------------------------------
-- STEP 3 — confirm what actually happened.
-- ----------------------------------------------------------------------------
-- After STEP 1, the events that are open again should be exactly the ones
-- whose original 30-day window has not passed yet.
select
  count(*)                                   as events_total,
  count(*) filter (where gallery_expires_at > now()) as open_now
from public.events;

-- And after STEP 2, nothing should be left without a package:
select count(*) as events_without_a_package
from public.events where package_id is null;
