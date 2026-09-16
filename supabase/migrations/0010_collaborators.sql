-- COLLABORATORS
-- A collaborator (e.g. a hired photographer) is assigned to exactly one
-- event and can edit that event's settings — more access than a guest,
-- narrower than an admin (can't see other events, can't create new
-- ones). Kept as its own table rather than reusing `clients`, since a
-- collaborator and a client are conceptually different relationships to
-- an event even though the row shape is similar — deliberate choice,
-- not an oversight, so don't "simplify" this into one table later
-- without re-checking this decision.

create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create unique index collaborators_email_key on public.collaborators (lower(email));
create index collaborators_auth_user_id_idx on public.collaborators (auth_user_id);

comment on table public.collaborators is
  'A person (e.g. hired photographer) assigned to exactly one event with edit access to that event, short of admin.';

-- One collaborator per event for now (per product decision) — nullable
-- FK on events, mirroring client_id's shape.
alter table public.events
  add column collaborator_id uuid references public.collaborators (id) on delete set null;

create index events_collaborator_id_idx on public.events (collaborator_id);

alter table public.collaborators enable row level security;

create policy "collaborators_select_own"
  on public.collaborators for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "collaborators_admin_all"
  on public.collaborators for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_select_collaborator"
  on public.events for select
  to authenticated
  using (
    collaborator_id in (select id from public.collaborators where auth_user_id = auth.uid())
  );

create policy "events_update_collaborator"
  on public.events for update
  to authenticated
  using (
    collaborator_id in (select id from public.collaborators where auth_user_id = auth.uid())
  )
  with check (
    collaborator_id in (select id from public.collaborators where auth_user_id = auth.uid())
  );

create policy "photos_select_collaborator"
  on public.photos for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.collaborators c on c.id = e.collaborator_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy "photos_update_collaborator"
  on public.photos for update
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.collaborators c on c.id = e.collaborator_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      join public.collaborators c on c.id = e.collaborator_id
      where e.id = photos.event_id
        and c.auth_user_id = auth.uid()
    )
  );
