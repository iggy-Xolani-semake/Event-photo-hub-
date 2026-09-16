-- mark_photo_failed: called by process-image Edge Function when a photo
-- cannot be processed (corrupt file, R2 error, unsupported format after
-- decode, etc). Without this, failed uploads stay in 'processing' status
-- forever — indistinguishable in the UI from "still working on it".
-- Same access pattern as mark_photo_processed: service-role only, never
-- exposed to anon/authenticated.
--
-- NOTE on the revoke below: `revoke ... from public` was tried first and
-- did NOT actually strip anon/authenticated's execute privilege on this
-- project (has_function_privilege still returned true for both after
-- that revoke) despite the function's own ACL showing no grant to
-- either role — a genuine oddity worth remembering. Revoking explicitly
-- from each role name (not the PUBLIC pseudo-role) is what actually
-- worked. Do this for any future service-role-only function rather than
-- assuming `revoke ... from public` alone is sufficient — verify with
-- has_function_privilege() afterward, every time.

create or replace function public.mark_photo_failed(
  p_photo_id uuid,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.photos
  set status = 'failed',
      processed_at = now()
  where id = p_photo_id;
end;
$$;

revoke all privileges on function public.mark_photo_failed(uuid, text) from anon;
revoke all privileges on function public.mark_photo_failed(uuid, text) from authenticated;
