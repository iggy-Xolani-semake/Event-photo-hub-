-- 0018 — Lock client self-service profile RPC to authenticated users.
-- The function already rejects auth.uid() = NULL, but anonymous callers
-- should not have EXECUTE privilege at all.
revoke execute on function public.create_own_client_profile(text, text) from public;
revoke execute on function public.create_own_client_profile(text, text) from anon;
grant execute on function public.create_own_client_profile(text, text) to authenticated;
