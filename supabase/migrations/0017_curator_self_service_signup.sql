-- ============================================================================
-- Curator self-service signup
--
-- Guests remain anonymous and use event-code/RPC access. Authenticated signups
-- become curators, not admins. Curator ownership is enforced through the
-- existing events.curator_id and curator-scoped RLS policies.
-- ============================================================================

create or replace function public.assign_curator_role_and_profile()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  display_name text;
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') = '' then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'curator')
    where id = new.id;
  end if;

  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1),
    'Event host'
  );

  insert into public.curators (auth_user_id, name, email)
  values (new.id, display_name, new.email)
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_curator on auth.users;
create trigger on_auth_user_created_assign_curator
after insert on auth.users
for each row execute function public.assign_curator_role_and_profile();

-- Keep the existing admin policy and add a narrowly scoped curator policy.
drop policy if exists "events_curator_insert" on public.events;
create policy "events_curator_insert"
  on public.events for insert
  to authenticated
  with check (
    curator_id in (
      select id from public.curators where auth_user_id = auth.uid()
    )
  );

-- The function is invoked by the auth.users trigger, not by PostgREST callers.
revoke execute on function public.assign_curator_role_and_profile() from public;
revoke execute on function public.assign_curator_role_and_profile() from anon;
revoke execute on function public.assign_curator_role_and_profile() from authenticated;
