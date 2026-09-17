-- ============================================================================
-- LIVE DATABASE AUDIT — QUICK, ONE-QUERY VERSION (read-only)
-- ============================================================================
-- Why this file exists: the Supabase SQL Editor shows the result of ONE
-- statement when you run a multi-statement script, so the full
-- LIVE_DB_AUDIT.sql (16 sections) has to be run section by section. This
-- version collapses everything decision-relevant into a SINGLE statement
-- that returns ONE grid — paste it back in one go.
--
-- Run it, then copy the whole result grid. Verdicts are a starting point,
-- not a judgement: REVIEW means "a human should look at this", not "broken".
--
-- Contains no INSERT/UPDATE/DELETE/DDL. Safe to run as often as you like.
-- For the full detail behind any row, run the matching numbered section of
-- docs/LIVE_DB_AUDIT.sql. (Database webhooks are only in the full script:
-- checking for a possibly-missing table cannot be done safely inside a
-- single SELECT.)
-- ============================================================================

with expected(object_kind, object_name) as (
  -- the objects the app in this repo requires in order to work at all
  values
    ('table', 'clients'), ('table', 'events'), ('table', 'photos'),
    ('function', 'get_event_for_upload'), ('function', 'insert_guest_photo'),
    ('function', 'mark_photo_processed'), ('function', 'is_admin')
),
missing_objects as (
  select e.object_name
  from expected e
  where (e.object_kind = 'table'
         and to_regclass('public.' || e.object_name) is null)
     or (e.object_kind = 'function'
         and not exists (select 1 from pg_proc p
                         join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = e.object_name))
),
rls_off as (
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('clients', 'events', 'photos')
    and not c.relrowsecurity
),
drifted as (
  select e.event_code, e.photo_count,
         (select count(*) from photos p
           where p.event_id = e.id and p.status <> 'deleted') as actual
  from events e
),
leaks as (
  select count(*) as n
  from photos p
  join events e on e.id = p.event_id
  where p.storage_path not like 'events/' || e.event_code || '/original/%'
),
per_device as (
  select e.event_code,
         coalesce(p.uploader_identifier, '(none sent)') as who,
         count(*) as photos
  from photos p
  join events e on e.id = p.event_id
  where p.status <> 'deleted'
  group by 1, 2
),
worst_device as (
  select event_code, who, photos
  from per_device
  order by photos desc
  limit 1
)

select * from (
  values
  -- 1 -----------------------------------------------------------------------
  (1, 'All required tables + functions exist',
      case when (select count(*) from missing_objects) = 0
           then 'all present'
           else 'MISSING: ' || (select string_agg(object_name, ', ') from missing_objects)
      end,
      case when (select count(*) from missing_objects) = 0 then 'PASS' else 'FAIL' end),

  -- 2 -----------------------------------------------------------------------
  (2, 'Row Level Security enabled on clients/events/photos',
      case when (select count(*) from rls_off) = 0
           then 'enabled on all three'
           else 'RLS OFF on: ' || (select string_agg(relname, ', ') from rls_off)
      end,
      case when (select count(*) from rls_off) = 0 then 'PASS' else 'FAIL' end),

  -- 3 -----------------------------------------------------------------------
  (3, 'Anonymous SELECT policy on events (Problem 3: is it wider than needed?)',
      coalesce((select 'anon can select events where: ' || qual
                from pg_policies
                where schemaname = 'public' and tablename = 'events'
                  and 'anon' = any(roles) and cmd = 'SELECT'
                limit 1), 'no anon select policy found'),
      case when exists (select 1 from pg_policies
                        where schemaname = 'public' and tablename = 'events'
                          and 'anon' = any(roles) and cmd = 'SELECT'
                          and qual = 'true')
           then 'REVIEW' else 'PASS' end),

  -- 4 -----------------------------------------------------------------------
  (4, 'Anonymous WRITE policies on photos (guests must have none)',
      coalesce((select string_agg(policyname || ' (' || cmd || ')', ', ')
                from pg_policies
                where schemaname = 'public' and tablename = 'photos'
                  and 'anon' = any(roles) and cmd <> 'SELECT'), 'none'),
      case when exists (select 1 from pg_policies
                        where schemaname = 'public' and tablename = 'photos'
                          and 'anon' = any(roles) and cmd <> 'SELECT')
           then 'FAIL' else 'PASS' end),

  -- 5 -----------------------------------------------------------------------
  (5, 'insert_guest_photo callable by guests (anon)',
      coalesce((select case when p.proacl::text like '%anon=%' then 'granted to anon'
                            else 'NOT granted to anon: ' || p.proacl::text end
                from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname = 'insert_guest_photo'
                limit 1), 'no grants recorded (defaults apply)'),
      case when (select p.proacl::text like '%anon=%'
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'insert_guest_photo'
                 limit 1)
           then 'PASS' else 'REVIEW' end),

  -- 6 -----------------------------------------------------------------------
  (6, 'mark_photo_processed locked down (image pipeline only)',
      coalesce((select p.proacl::text
                from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname = 'mark_photo_processed'
                limit 1), 'default (PUBLIC can execute)'),
      case when (select p.proacl::text
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'mark_photo_processed'
                 limit 1) is null
           then 'REVIEW' else 'PASS' end),

  -- 7 -----------------------------------------------------------------------
  (7, 'events.photo_count rollup matches reality',
      (select case when count(*) = 0 then 'all events accurate'
                   else count(*) || ' event(s) drifted: ' ||
                        string_agg(event_code || ' (recorded ' || photo_count ||
                                   ', actual ' || actual || ')', '; ')
              end
       from (select * from drifted where photo_count <> actual) d),
      case when (select count(*) from drifted where photo_count <> actual) = 0
           then 'PASS' else 'REVIEW' end),

  -- 8 -----------------------------------------------------------------------
  (8, 'Cross-event storage leaks (photo stored under another event''s prefix)',
      (select n || ' row(s)' from leaks),
      case when (select n from leaks) = 0 then 'PASS' else 'FAIL' end),

  -- 9 -----------------------------------------------------------------------
  (9, 'Most photos uploaded by ONE device in ONE event (per-guest limit is UI-only today)',
      coalesce((select who || ' has ' || photos || ' photos in ' || event_code
                from worst_device), 'no photos yet'),
      case when coalesce((select photos from worst_device), 0) > 10
           then 'REVIEW' else 'PASS' end),

  -- 10 ----------------------------------------------------------------------
  (10, 'Events at or over their upload limit',
      (select coalesce(string_agg(event_code || ' (' || photo_count || '/' || upload_limit || ')', ', '), 'none')
       from events where photo_count >= upload_limit),
      'INFO'),

  -- 11 ----------------------------------------------------------------------
  (11, 'Photos stuck in processing for over an hour (edge function not firing?)',
      (select count(*)::text || ' stuck'
       from photos where status = 'processing' and uploaded_at < now() - interval '1 hour'),
      case when (select count(*) from photos
                 where status = 'processing' and uploaded_at < now() - interval '1 hour') = 0
           then 'PASS' else 'REVIEW' end),

  -- 12 ----------------------------------------------------------------------
  (12, 'Photos that failed processing',
      (select count(*)::text || ' failed' from photos where status = 'failed'),
      case when (select count(*) from photos where status = 'failed') = 0
           then 'PASS' else 'REVIEW' end),

  -- 13 ----------------------------------------------------------------------
  (13, 'Events with no owner (orphaned, nobody can manage them)',
      (select coalesce(string_agg(event_code, ', '), 'none')
       from events where client_id is null),
      case when (select count(*) from events where client_id is null) = 0
           then 'PASS' else 'REVIEW' end),

  -- 14 ----------------------------------------------------------------------
  (14, 'Demo event DEMO482 still present (delete before real customers)',
      (select coalesce((select 'present, status=' || status from events
                        where event_code = 'DEMO482'), 'not present')),
      case when exists (select 1 from events where event_code = 'DEMO482')
           then 'REVIEW' else 'PASS' end),

  -- 15 ----------------------------------------------------------------------
  (15, 'Sign-in users, and how many are admins',
      (select (select count(*) from auth.users)::text || ' user(s), ' ||
              coalesce((select count(*) from auth.users
                        where raw_app_meta_data ->> 'role' = 'admin'), 0)::text || ' admin(s)'),
      case when coalesce((select count(*) from auth.users
                          where raw_app_meta_data ->> 'role' = 'admin'), 0) = 0
           then 'REVIEW' else 'PASS' end),

  -- 16 ----------------------------------------------------------------------
  (16, 'Column count per table (drift vs migrations: clients 6, events 18, photos 16)',
      (select string_agg(table_name || '=' || cnt::text, ', ' order by table_name)
       from (select table_name, count(*) as cnt
             from information_schema.columns
             where table_schema = 'public'
               and table_name in ('clients', 'events', 'photos')
             group by table_name) c),
      'INFO'),

  -- 17 ----------------------------------------------------------------------
  (17, 'Nickname column present (needed for "Uploaded by Iggy")',
      case when exists (select 1 from information_schema.columns
                        where table_schema = 'public' and table_name = 'photos'
                          and column_name in ('uploader_name', 'guest_name'))
           then 'present' else 'absent' end,
      'INFO'),

  -- 18 ----------------------------------------------------------------------
  (18, 'Scale right now (photos / events / bytes stored)',
      (select (select count(*) from photos where status <> 'deleted')::text || ' photos, ' ||
              (select count(*) from events)::text || ' events, ' ||
              pg_size_pretty(coalesce((select sum(file_size) from photos
                                       where status <> 'deleted'), 0)) || ' in R2'),
      'INFO')
) as audit(no, item, finding, verdict)
order by no;
