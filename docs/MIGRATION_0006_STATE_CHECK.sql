-- ============================================================================
-- What has migration 0006 already done to THIS project?
--
-- Run QUERY 1 by itself (the SQL editor shows one result grid at a time).
-- QUERY 1 reads only the system catalog, so it cannot fail on a half-applied
-- migration — every row tells you present or MISSING.
--
-- Paste the grid back and the next step is obvious. As of this writing
-- 0006 is fully re-runnable, so the usual answer is: run it again.
-- ============================================================================


-- ============================== QUERY 1 ====================================
with checks(object, present, detail) as (
  select '01 packages table'::text,
         to_regclass('public.packages') is not null,
         (select n_live_tup::text || ' rows (approximate)'
            from pg_stat_all_tables
           where schemaname = 'public' and relname = 'packages')
  union all
  select '02 packages shape',
         (select count(*) from pg_attribute
           where attrelid = to_regclass('public.packages')
             and attnum > 0 and not attisdropped) = 11,
         (select count(*)::text || ' columns (expected 11)' from pg_attribute
           where attrelid = to_regclass('public.packages')
             and attnum > 0 and not attisdropped)
  union all
  select '03 packages_code_key unique index',
         exists (select 1 from pg_class c
                   join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public'
                    and c.relname = 'packages_code_key'
                    and c.relkind = 'i'),
         null
  union all
  select '04 packages RLS enabled',
         coalesce((select relrowsecurity from pg_class
                    where oid = to_regclass('public.packages')), false),
         null
  union all
  select '05 packages_select_active policy',
         exists (select 1 from pg_policy p
                  where p.polname = 'packages_select_active'
                    and p.polrelid = to_regclass('public.packages')),
         null
  union all
  select '06 events.package_id column',
         exists (select 1 from pg_attribute
                  where attrelid = to_regclass('public.events')
                    and attname = 'package_id' and not attisdropped),
         null
  union all
  select '07 events.download_unlocked_at column',
         exists (select 1 from pg_attribute
                  where attrelid = to_regclass('public.events')
                    and attname = 'download_unlocked_at' and not attisdropped),
         null
  union all
  select '08 payment_status enum type',
         exists (select 1 from pg_type t
                   join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'payment_status'),
         null
  union all
  select '09 payments table',
         to_regclass('public.payments') is not null,
         (select n_live_tup::text || ' rows (approximate)'
            from pg_stat_all_tables
           where schemaname = 'public' and relname = 'payments')
  union all
  select '10 payments shape',
         (select count(*) from pg_attribute
           where attrelid = to_regclass('public.payments')
             and attnum > 0 and not attisdropped) = 11,
         (select count(*)::text || ' columns (expected 11)' from pg_attribute
           where attrelid = to_regclass('public.payments')
             and attnum > 0 and not attisdropped)
  union all
  select '11 payments RLS enabled',
         coalesce((select relrowsecurity from pg_class
                    where oid = to_regclass('public.payments')), false),
         null
  union all
  select '12 payments_select_owner policy',
         exists (select 1 from pg_policy p
                  where p.polname = 'payments_select_owner'
                    and p.polrelid = to_regclass('public.payments')),
         null
  union all
  select '13 mark_event_paid() function',
         exists (select 1 from pg_proc p
                   join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'mark_event_paid'),
         (select pg_get_function_identity_arguments(p.oid)
            from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'mark_event_paid'
           limit 1)
  union all
  select '14 mark_event_paid() execute rights',
         exists (select 1 from pg_proc p
                   join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'mark_event_paid'
                    and p.proacl is not null),
         (select coalesce(p.proacl::text, 'DEFAULT GRANTS - migration not finished')
            from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'mark_event_paid'
           limit 1)
  union all
  select '15 protect_event_commercial_fields() function',
         exists (select 1 from pg_proc p
                   join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public'
                    and p.proname = 'protect_event_commercial_fields'),
         null
  union all
  select '16 events_protect_commercial_fields trigger',
         exists (select 1 from pg_trigger t
                  where t.tgname = 'events_protect_commercial_fields'
                    and t.tgrelid = to_regclass('public.events')
                    and not t.tgisinternal),
         null
)
select object,
       case when present then 'present' else 'MISSING' end as state,
       coalesce(detail, '') as detail
from checks
order by object;


-- ============================== QUERY 2 ====================================
-- Run this only once row 01 says "present". Shows the tiers as they actually
-- stand — this is where prices live, and a NULL price means the app will show
-- the tier but refuse to charge for it.
--
-- select code, name, photo_limit, price_cents,
--        case when price_cents is null then 'NOT FOR SALE YET'
--             else round(price_cents / 100.0, 2)::text || ' ' || currency
--        end as price,
--        is_active, sort_order
-- from public.packages
-- order by sort_order;
--
-- And the entitlement state of the events themselves. Both columns only exist
-- once 0006 has applied, which is exactly why these two counts are NOT in
-- QUERY 1 — a plain SELECT that names a missing column fails the whole
-- statement instead of reporting "MISSING":
--
-- select (select count(*) from public.events) as events,
--        (select count(*) from public.events where package_id is not null) as with_package,
--        (select count(*) from public.events where download_unlocked_at is not null) as unlocked,
--        (select count(*) from public.payments) as payment_rows;
