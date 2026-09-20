-- ============================================================================
-- 0006 — Packages, payments and download entitlement (V2 Sprint 3)
-- ============================================================================
-- The commercial model: guests fill the gallery for free, the host pays to
-- unlock the originals. That requires separating two things the schema used
-- to treat as one:
--
--     gallery access        (visibility)      — who may LOOK
--     download entitlement  (payment)         — who may TAKE
--
-- Before this migration both download routes gated on visibility alone, so
-- anyone holding a shared event link could download originals. After it,
-- originals require ownership AND a paid event.
--
-- Also introduces a real package model, so "50 / 100 / 250 / 500 / 1000
-- photos" is data you can reprice instead of numbers baked into code.
--
-- PRICES ARE DELIBERATELY INCOMPLETE. Only the 50-photo tier carries the
-- R50 figure that has actually been stated; the rest are NULL, which the app
-- reads as "not for sale yet" and refuses to charge for. Fill them in before
-- going live — a NULL price is a safe default, a guessed one is not.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Packages
-- ----------------------------------------------------------------------------
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  photo_limit integer not null,
  max_file_size_bytes bigint not null,
  max_files_per_upload integer not null,
  -- NULL = not for sale yet. The app must refuse to create a checkout for a
  -- package with no price rather than treating NULL as free.
  price_cents integer,
  currency text not null default 'ZAR',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  -- Same absolute bounds as the events_assert_limits trigger in 0005, so a
  -- package can never be defined that events would then reject.
  constraint packages_photo_limit_range check (photo_limit between 1 and 5000),
  constraint packages_file_size_range check (max_file_size_bytes between 1048576 and 52428800),
  constraint packages_per_upload_range check (max_files_per_upload between 1 and 50),
  constraint packages_price_not_negative check (price_cents is null or price_cents >= 0)
);

create unique index if not exists packages_code_key on public.packages (code);

comment on table public.packages is
  'Sellable tiers. An event references one; its limits are the ceiling the client may configure within.';

alter table public.packages enable row level security;

-- Packages are marketing information, not client data: anyone may read the
-- active ones. Inactive ones stay visible to staff for editing old events.
drop policy if exists "packages_select_active" on public.packages;

create policy "packages_select_active"
  on public.packages for select
  to anon, authenticated
  using (is_active or public.is_admin());

-- No write policies: packages are managed by staff in the SQL editor (or a
-- future admin route using the service role). A client must not be able to
-- reprice their own tier.

insert into public.packages
  (code, name, photo_limit, max_file_size_bytes, max_files_per_upload, price_cents, sort_order)
values
  -- R50 for 50 photos is the only price that has actually been stated.
  ('photos_50',   '50 Photos',    50,   15728640, 10, 5000, 1),
  -- The rest are intentionally unpriced: `price_cents is null` means the app
  -- will show the tier but refuse to charge for it until you set a number.
  ('photos_100',  '100 Photos',   100,  15728640, 10, null, 2),
  ('photos_250',  '250 Photos',   250,  15728640, 10, null, 3),
  ('photos_500',  '500 Photos',   500,  15728640, 10, null, 4),
  ('photos_1000', '1000 Photos',  1000, 20971520, 10, null, 5)
on conflict (code) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Events gain a package and an entitlement timestamp
-- ----------------------------------------------------------------------------
alter table public.events
  add column if not exists package_id uuid references public.packages (id) on delete set null;

alter table public.events
  add column if not exists download_unlocked_at timestamptz;

create index if not exists events_package_id_idx on public.events (package_id);

comment on column public.events.download_unlocked_at is
  'When the host paid. NULL means originals are not downloadable, even by the owner. Set only by mark_event_paid().';


-- ----------------------------------------------------------------------------
-- 3. Payments
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'payment_status'
  ) then
    create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
  end if;
end
$$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  package_id uuid references public.packages (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'ZAR',
  -- 'paystack' | 'yoco' | 'manual' (EFT confirmed by staff) | ...
  provider text,
  provider_reference text,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}',

  constraint payments_amount_positive check (amount_cents > 0)
);

-- A gateway may deliver the same webhook twice; this is what makes
-- "mark as paid" idempotent instead of double-counting revenue.
create unique index if not exists payments_provider_reference_key
  on public.payments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists payments_event_id_idx on public.payments (event_id);
create index if not exists payments_status_idx on public.payments (status);

alter table public.payments enable row level security;

-- A client may READ the payments on their own events (to show "pending" or
-- "paid" in their dashboard). They get no insert or update policy: money
-- records are written by the server with the service role, never by a
-- client, or "I paid" becomes a request body.
drop policy if exists "payments_select_owner" on public.payments;

create policy "payments_select_owner"
  on public.payments for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      join public.clients c on c.id = e.client_id
      where e.id = payments.event_id
        and c.auth_user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 4. mark_event_paid() — the only way an event becomes downloadable
-- ----------------------------------------------------------------------------
create or replace function public.mark_event_paid(
  p_payment_id uuid,
  p_provider text default null,
  p_provider_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  -- Idempotent: a repeated webhook must not create a second paid record or
  -- move the unlock timestamp.
  if v_payment.status = 'paid' then
    return v_payment.event_id;
  end if;

  update public.payments
  set status = 'paid',
      paid_at = now(),
      provider = coalesce(p_provider, provider),
      provider_reference = coalesce(p_provider_reference, provider_reference)
  where id = p_payment_id;

  -- Opens the gate. The protect_event_commercial_fields trigger blocks this
  -- update for everyone else; this function is the one holder of the key.
  perform set_config('eph.allow_commercial_write', 'on', true);

  update public.events
  set download_unlocked_at = now()
  where id = v_payment.event_id
    and download_unlocked_at is null;

  return v_payment.event_id;
end;
$$;

-- Service role only. A client who could call this could mark their own event
-- paid and walk off with every original.
revoke execute on function public.mark_event_paid(uuid, text, text) from public;
grant execute on function public.mark_event_paid(uuid, text, text) to service_role;


-- ----------------------------------------------------------------------------
-- 5. Protect the commercial fields
-- ----------------------------------------------------------------------------
-- events_update_owner (0005) lets an owner update their event row. Without
-- this trigger, that also means an owner could PATCH their own row and set
-- download_unlocked_at, move to a bigger package, or raise their limits above
-- what they paid for — one request body away from bypassing the paywall.
--
-- So the commercial fields are writable only by:
--   * a site-host admin (staff fixing things by hand), or
--   * mark_event_paid(), which sets a transaction-local flag.
--
-- Everything else about an event remains freely editable by its owner.
create or replace function public.protect_event_commercial_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_package public.packages%rowtype;
  v_bypass boolean;
begin
  -- coalesce is load-bearing here, not decoration. current_setting() returns
  -- NULL when the flag was never set, and in SQL `false OR NULL` is NULL —
  -- so without it `not v_bypass` is NULL, every IF below is skipped, and the
  -- guard silently protects nothing. (Caught by running this migration and
  -- attacking it: all five bypass attempts went through.)
  v_bypass := public.is_admin()
    or coalesce(current_setting('eph.allow_commercial_write', true) = 'on', false);

  if tg_op = 'INSERT' then
    if not v_bypass and new.download_unlocked_at is not null then
      raise exception 'DOWNLOAD_UNLOCK_NOT_ALLOWED';
    end if;
  end if;

  if tg_op = 'UPDATE' and not v_bypass then
    if new.download_unlocked_at is distinct from old.download_unlocked_at then
      raise exception 'DOWNLOAD_UNLOCK_NOT_ALLOWED';
    end if;

    if new.package_id is distinct from old.package_id then
      raise exception 'PACKAGE_CHANGE_NOT_ALLOWED';
    end if;
  end if;

  -- A client may set their own limits inside their package (that is Sprint 2),
  -- but not above it — otherwise the package price means nothing.
  if new.package_id is not null and not v_bypass then
    select * into v_package from public.packages where id = new.package_id;

    if found then
      if new.upload_limit > v_package.photo_limit then
        raise exception 'EXCEEDS_PACKAGE_LIMITS';
      end if;
      if new.max_file_size_bytes > v_package.max_file_size_bytes then
        raise exception 'EXCEEDS_PACKAGE_LIMITS';
      end if;
      if new.max_files_per_upload > v_package.max_files_per_upload then
        raise exception 'EXCEEDS_PACKAGE_LIMITS';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists events_protect_commercial_fields on public.events;

create trigger events_protect_commercial_fields
  before insert or update on public.events
  for each row
  execute function public.protect_event_commercial_fields();
