-- ============================================================================
-- Demo data — spec section 42.
-- Safe to run in dev/staging only. DELETE BEFORE PRODUCTION:
--   delete from public.events where event_code = 'DEMO482';
-- (cascades to photos via FK; the demo client row is left — remove manually
-- if desired with: delete from public.clients where email = 'demo@eventphotohub.dev';)
-- ============================================================================

insert into public.clients (id, name, email, phone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Thabo Mokoena',
  'demo@eventphotohub.dev',
  '0790000000'
)
on conflict (id) do nothing;

insert into public.events (
  id, event_code, event_name, event_date, client_id,
  status, visibility, upload_limit, max_file_size_bytes, max_files_per_upload
)
values (
  '00000000-0000-0000-0000-000000000002',
  'DEMO482',
  'Thabo & Lerato',
  '2026-12-12',
  '00000000-0000-0000-0000-000000000001',
  'active',
  'private',
  500,
  15728640,
  10
)
on conflict (id) do nothing;

-- No demo photo ROWS are seeded with real storage paths, because there is
-- no matching object in R2 for a fresh environment — a photo row pointing
-- at a non-existent R2 key would render as a broken image. Upload a couple
-- of test photos through the actual guest flow against DEMO482 instead;
-- that exercises the real pipeline end-to-end, which is more useful for
-- verifying the build than fake rows would be.
