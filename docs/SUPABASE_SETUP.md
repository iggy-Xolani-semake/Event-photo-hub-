# Supabase Setup

> **Status for this project:** already done. Migrations are live on
> **NSX Events Photo Hub** (ref `iijcgedztepgeggegvjx`, `eu-central-1`),
> confirmed via the Supabase security advisor with zero outstanding
> warnings. The steps below are kept for reference — e.g. if you ever
> need to stand up a second environment (staging) or recover from a
> lost project.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Note your **Project URL** and **anon public key** (Project Settings → API)
   — these go in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Note your **service_role key** from the same page — this goes in
   `SUPABASE_SERVICE_ROLE_KEY`. Treat it like a root password: it bypasses
   every Row Level Security policy in this project.

## 2. Run the migrations

Using the Supabase CLI (recommended):

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

> **Gotcha worth knowing:** Postgres grants `EXECUTE` on every new
> function to the `PUBLIC` pseudo-role by default. If you ever add a
> new trigger function or a service-role-only function of your own,
> writing `revoke execute on function ... from anon, authenticated`
> is **not enough** — both roles silently inherit access through
> `PUBLIC` unless you revoke from `PUBLIC` explicitly. The migrations
> in this repo already do this correctly (see the bottom of
> `0001_init.sql` and `0003_functions.sql`) — this note is here so the
> next person who adds a function doesn't reintroduce the gap.


This runs, in order:

- `0001_init.sql` — tables, enums, rollup triggers
- `0002_rls.sql` — Row Level Security policies (the actual event-isolation
  and client-isolation enforcement — see "How event isolation works" in
  the main README)
- `0003_functions.sql` — the `SECURITY DEFINER` RPCs guests call
  (`get_event_for_upload`, `insert_guest_photo`) and the one the image
  processor calls (`mark_photo_processed`)
- `0004_seed_demo.sql` — the `DEMO482` demo event (safe for dev; see the
  comment at the top of that file for how to remove it before production)

If you don't want to install the CLI, paste each file's contents into the
Supabase Dashboard's SQL Editor and run them in the same order (0001 →
0002 → 0003 → 0004).

## 3. Create your first admin user

Guests never get accounts, but you (the platform operator) need at least
one admin account to reach `/admin`.

1. Dashboard → Authentication → Users → Add user. Create yourself an
   account with an email/password.
2. Give that user the `admin` role via a custom claim. In the SQL Editor:

```sql
update auth.users
set raw_app_metadata = raw_app_metadata || '{"role": "admin"}'::jsonb
where email = 'you@example.com';
```

This is what `is_admin()` (defined in `0002_rls.sql`) and
`requireAdmin()` (`src/lib/auth/requireAdmin.ts`) both check. Without
this claim, a logged-in user can still authenticate but every admin
action and every RLS policy gated on `is_admin()` will reject them —
they'd only see events tied to a `clients` row with their own
`auth_user_id`, i.e. the client experience, not the admin one.

3. Sign out and back in (or wait for token refresh) after setting the
   claim — the JWT is only re-issued on the next sign-in.

## 4. Set up the image-processing Edge Function

The function at `supabase/functions/process-image/index.ts` turns each
uploaded original into `gallery` and `thumb` WebP variants.

```bash
supabase functions deploy process-image
supabase secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=...
```

Then wire up the trigger: **Dashboard → Database → Webhooks → Create a
new hook**

- Table: `photos`
- Events: `Insert`
- Type: `Supabase Edge Functions`
- Function: `process-image`

Every new photo row now triggers exactly one function invocation — this
is what lets many concurrent guest uploads scale horizontally instead of
queuing behind a single worker (see the comment block at the top of
`process-image/index.ts` for more on this design choice).

## 5. Regenerating types (optional but recommended)

`src/types/database.ts` is hand-written to match the SQL exactly. If you
add columns later, regenerate it instead of hand-editing:

```bash
supabase gen types typescript --project-id your-project-ref > src/types/database.ts
```

You'll then want to re-add the convenience type aliases
(`EventForUpload`, `GuestUploadErrorCode`) that live at the bottom of the
current file, since the generated output only covers table shapes.
