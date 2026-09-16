-- ============================================================================
-- LIVE DATABASE AUDIT — read-only
-- ============================================================================
-- Purpose: compare what the code in this repo EXPECTS the database to look
-- like (supabase/migrations/0001-0004) with what the live Supabase project
-- ACTUALLY contains, before anyone changes either side.
--
-- HOW TO RUN
--   Supabase dashboard → your project → SQL Editor → paste this whole file
--   → Run. It only ever SELECTs; there is no INSERT/UPDATE/DELETE/DDL here,
--   so it cannot damage anything. Paste the results back and they can be
--   diffed against the migrations.
--
-- WHAT EACH SECTION IS FOR
--   1-3   schema shape + RLS flags      → has every migration been applied?
--   4-6   policies, functions, grants   → is the security layer intact?
--   7-10  live data health              → rollups, isolation, abuse spread
--   11-14 environment                   → webhooks, triggers, auth users
--
-- If one section errors, run the rest individually — a missing object in an
-- early section is itself a finding (that migration never ran).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Which database am I actually talking to?
-- ---------------------------------------------------------------------------
select current_database() as database,
       current_user       as running_as,
       current_setting('server_version_num') as pg_version;


-- ---------------------------------------------------------------------------
-- 1. Tables + whether Row Level Security is switched on.
--    Expected: clients, events, photos — all rls_enabled = true.
--    A false here means 0002_rls.sql never ran, and every "RLS protects this"
--    claim in the README is untrue for that table.
-- ---------------------------------------------------------------------------
select c.relname                as table_name,
       c.relrowsecurity         as rls_enabled,
       c.relforcerowsecurity    as force_rls,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;


-- ---------------------------------------------------------------------------
-- 2. Column-level drift. Compare this list against 0001_init.sql.
--    Anything present here but absent from the migrations (or vice versa)
--    means the live schema has been edited by hand in the dashboard.
-- ---------------------------------------------------------------------------
select table_name,
       ordinal_position as pos,
       column_name,
       data_type,
       is_nullable,
       column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('clients', 'events', 'photos')
order by table_name, ordinal_position;


-- ---------------------------------------------------------------------------
-- 2b. NAME THE DRIFT. Section 2 lists every column; this one lists only the
--     differences against what 0001_init.sql defines — the columns that exist
--     live but not in the repo, and the columns the app expects but that are
--     missing live. This is the query to run when the quick audit's
--     column-count row disagrees with "clients 6, events 18, photos 16".
--     Read-only; an empty result means live and migrations agree exactly.
-- ---------------------------------------------------------------------------
with expected(table_name, column_name) as (
  values
    ('clients', 'id'), ('clients', 'auth_user_id'), ('clients', 'name'),
    ('clients', 'email'), ('clients', 'phone'), ('clients', 'created_at'),
    ('events', 'id'), ('events', 'event_code'), ('events', 'event_name'),
    ('events', 'event_date'), ('events', 'client_id'), ('events', 'status'),
    ('events', 'visibility'), ('events', 'upload_limit'),
    ('events', 'max_file_size_bytes'), ('events', 'max_files_per_upload'),
    ('events', 'photo_count'), ('events', 'storage_used_bytes'),
    ('events', 'brand_logo_url'), ('events', 'brand_company_name'),
    ('events', 'brand_primary_color'), ('events', 'created_by'),
    ('events', 'created_at'), ('events', 'closed_at'),
    ('photos', 'id'), ('photos', 'event_id'), ('photos', 'original_filename'),
    ('photos', 'storage_path'), ('photos', 'gallery_path'),
    ('photos', 'thumbnail_path'), ('photos', 'file_size'), ('photos', 'mime_type'),
    ('photos', 'width'), ('photos', 'height'), ('photos', 'uploader_identifier'),
    ('photos', 'status'), ('photos', 'is_favourite'), ('photos', 'is_hidden'),
    ('photos', 'uploaded_at'), ('photos', 'processed_at')
)
select c.table_name,
       c.column_name,
       c.data_type,
       c.is_nullable,
       c.column_default,
       'EXTRA: exists live, not in 0001_init.sql' as note
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('clients', 'events', 'photos')
  and not exists (select 1 from expected e
                  where e.table_name = c.table_name
                    and e.column_name = c.column_name)
union all
select e.table_name,
       e.column_name,
       null, null, null,
       'MISSING: expected by the app, absent live'
from expected e
where not exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public'
                    and c.table_name = e.table_name
                    and c.column_name = e.column_name)
order by 1, 2;


-- ---------------------------------------------------------------------------
-- 3. Enum types. Expected:
--    event_status(active, closed, archived)
--    event_visibility(private, shared, public)
--    photo_status(processing, ready, failed, deleted)
-- ---------------------------------------------------------------------------
select t.typname as enum_name, e.enumlabel as value, e.enumsortorder as sort
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
order by t.typname, e.enumsortorder;


-- ---------------------------------------------------------------------------
-- 4. Every RLS policy, verbatim. This is the actual guest-isolation surface:
--    the anon SELECT policy on events, the absence of any anon INSERT policy
--    on photos, and the owner-only policies that keep client A away from
--    client B's events.
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd, roles::text as roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ---------------------------------------------------------------------------
-- 5. Functions: signature + whether they are SECURITY DEFINER.
--    Expected: get_event_for_upload(text), insert_guest_photo(8 args),
--    mark_photo_processed(uuid,text,text), is_admin(), plus the rollup
--    trigger functions. A changed signature here breaks the app silently,
--    because PostgREST resolves RPCs by name AND argument list.
-- ---------------------------------------------------------------------------
select p.proname                                   as function_name,
       pg_get_function_identity_arguments(p.oid)   as arguments,
       pg_get_function_result(p.oid)               as returns,
       p.prosecdef                                 as security_definer,
       p.provolatile                               as volatility
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public')
order by p.proname;


-- ---------------------------------------------------------------------------
-- 6. Who may EXECUTE those functions.
--    insert_guest_photo / get_event_for_upload must be granted to anon and
--    authenticated (guests have no session). mark_photo_processed must NOT be
--    executable by PUBLIC — 0003_functions.sql revokes it explicitly, because
--    Postgres grants EXECUTE to PUBLIC by default. If proacl is NULL here,
--    the default (everyone) applies, which would be a finding.
-- ---------------------------------------------------------------------------
select p.proname                                 as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.proacl::text                            as execute_grants
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_event_for_upload', 'insert_guest_photo',
                    'mark_photo_processed', 'is_admin')
order by p.proname;


-- ---------------------------------------------------------------------------
-- 7. Every event and its configured limits.
-- ---------------------------------------------------------------------------
select event_code,
       event_name,
       event_date,
       status,
       visibility,
       upload_limit,
       max_file_size_bytes,
       max_files_per_upload,
       photo_count          as recorded_photo_count,
       storage_used_bytes,
       client_id is null    as has_no_owner,
       created_at
from public.events
order by created_at desc;


-- ---------------------------------------------------------------------------
-- 8. Rollup drift. events.photo_count is maintained by trigger; if it has
--    drifted from the real row count, the guest landing count, the admin
--    stats and the "event is full" check are all wrong.
--    recorded <> actual_alive is the thing to look at.
-- ---------------------------------------------------------------------------
select e.event_code,
       e.photo_count                                              as recorded,
       count(p.id) filter (where p.status <> 'deleted')           as actual_alive,
       count(p.id) filter (where p.status = 'ready'
                             and not p.is_hidden)                 as visible_in_gallery,
       count(p.id) filter (where p.status = 'processing')         as processing,
       count(p.id) filter (where p.status = 'failed')             as failed,
       coalesce(sum(p.file_size) filter (where p.status <> 'deleted'), 0)
                                                                  as actual_bytes,
       e.storage_used_bytes                                       as recorded_bytes
from public.events e
left join public.photos p on p.event_id = e.id
group by e.id, e.event_code, e.photo_count, e.storage_used_bytes
order by e.event_code;


-- ---------------------------------------------------------------------------
-- 9. Event-isolation invariant: every photo's storage_path must live under
--    its OWN event's prefix. Any row returned here is a cross-event leak or
--    a hand-edited row — there should be zero.
-- ---------------------------------------------------------------------------
select p.id, e.event_code, p.storage_path, p.status, p.uploaded_at
from public.photos p
join public.events e on e.id = p.event_id
where p.storage_path not like 'events/' || e.event_code || '/original/%'
limit 50;


-- ---------------------------------------------------------------------------
-- 10. Upload spread per device identifier. This is the evidence for the
--     "10 photos per guest is not actually enforced" gap: if one identifier
--     owns far more than 10 photos in an event, the per-guest limit is UI-only.
--     NULL identifier = uploaded by something that did not send one.
-- ---------------------------------------------------------------------------
select e.event_code,
       coalesce(p.uploader_identifier, '(none sent)') as uploader_identifier,
       count(*)                                       as photos,
       min(p.uploaded_at)                             as first_upload,
       max(p.uploaded_at)                             as last_upload
from public.photos p
join public.events e on e.id = p.event_id
where p.status <> 'deleted'
group by 1, 2
order by photos desc
limit 25;


-- ---------------------------------------------------------------------------
-- 11. Database webhooks (the process-image trigger). Guarded, because the
--     supabase_functions schema is not readable by every role — a NOTICE
--     instead of a result is not a failure of this script.
-- ---------------------------------------------------------------------------
do $$
declare
  v_count integer;
begin
  execute 'select count(*) from supabase_functions.hook' into v_count;
  raise notice 'db webhooks configured: %', v_count;
exception when others then
  raise notice 'could not read supabase_functions.hook: %', sqlerrm;
end
$$;


-- ---------------------------------------------------------------------------
-- 12. Triggers that keep the rollups in sync. Expected on photos:
--     an AFTER INSERT and an AFTER DELETE trigger calling the
--     handle_photo_insert / handle_photo_delete functions from 0001.
-- ---------------------------------------------------------------------------
-- NB: matched via pg_class/pg_namespace rather than tgrelid::regclass::text,
-- because regclass renders without the schema prefix whenever "public" is on
-- the search_path — a text comparison against 'public.photos' silently
-- returns nothing. (Verified: the text version returned zero rows.)
select t.tgname                        as trigger_name,
       c.relname                       as on_table,
       case t.tgtype & 2 when 2 then 'BEFORE' else 'AFTER' end as timing,
       case
         when t.tgtype & 4  <> 0 then 'INSERT'
         when t.tgtype & 8  <> 0 then 'DELETE'
         when t.tgtype & 16 <> 0 then 'UPDATE'
         else 'other'
       end                             as event,
       t.tgenabled                     as enabled
from pg_trigger t
join pg_class c     on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname in ('photos', 'events')
order by on_table, trigger_name;


-- ---------------------------------------------------------------------------
-- 13. Extensions present (0001 asks for pgcrypto).
-- ---------------------------------------------------------------------------
select extname, extversion from pg_extension order by extname;


-- ---------------------------------------------------------------------------
-- 14. Auth users and their role claim. Admins must carry
--     raw_app_meta_data->>'role' = 'admin'; is_admin() reads exactly that.
--     An empty result means nobody can sign in to /admin at all.
-- ---------------------------------------------------------------------------
select u.id,
       u.email,
       u.created_at,
       u.last_sign_in_at,
       u.raw_app_meta_data ->> 'role' as app_role,
       u.banned_until is not null     as is_banned
from auth.users u
order by u.created_at
limit 50;


-- ---------------------------------------------------------------------------
-- 15. Is the demo event still in here? 0004_seed_demo.sql says to delete
--     DEMO482 before onboarding real customers.
-- ---------------------------------------------------------------------------
select event_code, event_name, status, visibility, photo_count, created_at
from public.events
where event_code = 'DEMO482';
