-- 0020 — repair host signup for databases that applied the old 0017 trigger
--
-- The old migration used a removed curator model and caused Supabase Auth to
-- return "Database error saving new user" during auth.users insertion.

drop trigger if exists on_auth_user_created_assign_curator on auth.users;
drop trigger if exists on_auth_user_created_assign_client on auth.users;

drop function if exists public.assign_curator_role_and_profile();

create or replace function public.assign_client_role_and_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1),
    'Event host'
  );

  insert into public.clients (auth_user_id, name, email)
  values (new.id, display_name, new.email)
  on conflict (lower(email)) do update
    set auth_user_id = excluded.auth_user_id,
        name = excluded.name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_client on auth.users;
create trigger on_auth_user_created_assign_client
after insert on auth.users
for each row execute function public.assign_client_role_and_profile();

revoke execute on function public.assign_client_role_and_profile() from public;
revoke execute on function public.assign_client_role_and_profile() from anon;
revoke execute on function public.assign_client_role_and_profile() from authenticated;