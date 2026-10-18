-- ============================================================================
-- 0026 — the retention entitlement actually reaches a new event
-- ============================================================================
-- 0024 added the tier catalogue (retention_days per package) and 0025 made the
-- entitlements binding, but a gallery's expiry was still wrong on the one path
-- that matters most: creating an event.
--
-- 0019 made gallery_expires_at NOT NULL with a column default of
-- `now() + interval '30 days'`. Postgres applies a column default while it
-- builds the row, which happens *before* BEFORE ROW triggers run — so by the
-- time apply_package_entitlements() looked at new.gallery_expires_at it already
-- held a value, and
--
--     new.gallery_expires_at := coalesce(new.gallery_expires_at,
--                                        new.created_at + make_interval(days => p.retention_days));
--
-- always took the default. Every new event therefore expired in 30 days no
-- matter which tier it was on:
--
--   Free       sold   7 days  →  got 30
--   Party Pack sold  60 days  →  got 30
--   Event Pack sold 120 days  →  got 30
--
-- Neither POST /api/events nor POST /api/admin/events passes
-- gallery_expires_at, so nothing else was going to set it.
--
-- The bug hid because 0025's reconciliation UPDATEs corrected the rows that
-- already existed (they assign directly, without coalesce). The backfill was
-- right; only the going-forward path was wrong, so a database that was checked
-- by looking at its existing events looked healthy.
--
-- Fix: on INSERT the row is new, so the package rule is the only correct
-- answer and the column default must be overwritten rather than coalesced. On
-- UPDATE the previous behaviour is preserved exactly — an unrelated limit edit
-- must not move a gallery's expiry, but a package change still re-derives it.
-- ============================================================================

create or replace function public.apply_package_entitlements()
returns trigger language plpgsql set search_path=public as $$
declare p public.packages%rowtype;
begin
  if new.package_id is null then
    -- Legacy/unassigned events get the conservative Free limits.
    new.upload_limit := least(coalesce(new.upload_limit,100),100);
    new.max_file_size_bytes := least(coalesce(new.max_file_size_bytes,15728640),15728640);
    new.guest_photo_limit := least(coalesce(new.guest_photo_limit,10),10);
    new.max_files_per_upload := least(coalesce(new.max_files_per_upload,10),10);
    if tg_op = 'INSERT' then
      new.gallery_expires_at := new.created_at + interval '7 days';
    else
      new.gallery_expires_at := coalesce(new.gallery_expires_at,new.created_at + interval '7 days');
    end if;
    return new;
  end if;

  select * into p from public.packages where id=new.package_id;
  if not found then raise exception 'PACKAGE_NOT_FOUND'; end if;

  if tg_op='UPDATE' and new.package_id is distinct from old.package_id then
    new.upload_limit := least(new.upload_limit,p.photo_limit);
    new.guest_photo_limit := least(new.guest_photo_limit,p.guest_photo_limit);
    new.max_file_size_bytes := least(new.max_file_size_bytes,p.max_file_size_bytes,15728640);
    new.max_files_per_upload := least(new.max_files_per_upload,p.max_files_per_upload);
  else
    if new.upload_limit > p.photo_limit then raise exception 'PACKAGE_PHOTO_LIMIT_EXCEEDED'; end if;
    if new.max_file_size_bytes > least(p.max_file_size_bytes,15728640) then raise exception 'PACKAGE_FILE_SIZE_EXCEEDED'; end if;
    if new.guest_photo_limit > p.guest_photo_limit then raise exception 'PACKAGE_GUEST_LIMIT_EXCEEDED'; end if;
    if new.max_files_per_upload > p.max_files_per_upload then raise exception 'PACKAGE_BATCH_LIMIT_EXCEEDED'; end if;
  end if;

  -- The package rule — never the column default — decides a new gallery's
  -- expiry. A tier change re-derives it; anything else leaves it alone.
  if tg_op = 'INSERT' or new.package_id is distinct from old.package_id then
    new.gallery_expires_at := new.created_at + make_interval(days=>p.retention_days);
  else
    new.gallery_expires_at := coalesce(new.gallery_expires_at,new.created_at + make_interval(days=>p.retention_days));
  end if;

  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Verify — the same discipline as 0011/0012. A trigger that exists but is not
-- the function above would look identical from the outside.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'events_package_entitlements'
      and not tgisinternal
  ) then
    raise exception 'TIER_ENTITLEMENT_TRIGGER_MISSING';
  end if;

  -- The whole point of this migration: the INSERT path must not coalesce.
  if position('if tg_op = ''INSERT'' or new.package_id is distinct from old.package_id then' in
              pg_get_functiondef('public.apply_package_entitlements()'::regprocedure)) = 0 then
    raise exception 'RETENTION_INSERT_DERIVATION_MISSING';
  end if;
end $$;
