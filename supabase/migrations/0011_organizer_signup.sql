-- ==========================================================================
-- Organizer self-service signup
--
-- Guests remain anonymous and use the existing event-code/RPC path.
-- Verified Supabase signups become organizers, not platform admins.
-- Admins retain platform-wide access through is_admin().
-- ============================================================================

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('organizer', 'admin'),
    false
  );
$$;

-- New authenticated accounts are organizers by default. This does not affect
-- anonymous guests because they never create an auth.users row.
create or replace function public.assign_organizer_role()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'organizer')
  where id = new.id
    and coalesce(raw_app_meta_data ->> 'role', '') = '';
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_organizer on auth.users;
create trigger on_auth_user_created_assign_organizer
after insert on auth.users
for each row execute function public.assign_organizer_role();

-- Organizers can see only events they created. Clients retain access to their
-- linked events, and admins retain platform-wide access.
drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

-- A signed-up organizer may create events. The API still supplies created_by
-- from the verified session and uses the service role only after auth checks.
drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write"
  on public.events for insert
  to authenticated
  with check (public.is_organizer());

drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update"
  on public.events for update
  to authenticated
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete"
  on public.events for delete
  to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- Organizers can moderate photos belonging to events they created. Guests
-- still have no direct photo table write access.
drop policy if exists "photos_select_owner" on public.photos;
create policy "photos_select_owner"
  on public.photos for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and (c.auth_user_id = auth.uid() or e.created_by = auth.uid())
    )
  );

drop policy if exists "photos_update_owner" on public.photos;
create policy "photos_update_owner"
  on public.photos for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and (c.auth_user_id = auth.uid() or e.created_by = auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and (c.auth_user_id = auth.uid() or e.created_by = auth.uid())
    )
  );

drop policy if exists "photos_delete_owner" on public.photos;
create policy "photos_delete_owner"
  on public.photos for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = photos.event_id
        and (c.auth_user_id = auth.uid() or e.created_by = auth.uid())
    )
  );
