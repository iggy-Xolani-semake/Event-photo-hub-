-- Global admin access is an explicit identity allowlist, not a role claim alone.
-- Any other authenticated account remains tenant-scoped by the existing owner,
-- collaborator, and curator policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'xolanisemake@gmail.com',
      'xolanisemakework@gmail.com'
    )
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

comment on function public.is_admin() is
  'Global Memora admin access: only the two approved owner emails with the admin claim.';
