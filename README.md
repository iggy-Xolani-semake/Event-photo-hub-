# Event Photo Hub

A mobile-first event photo sharing platform. Guests scan a QR code, take or
choose a photo, and upload it to a cloud-hosted event gallery — no app, no
account, no password. Built for events with 15–500+ guests uploading
concurrently.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security + Auth)
- **File storage:** Cloudflare R2 (S3-compatible)
- **Image processing:** Supabase Edge Function (Deno), triggered by a DB webhook
- **Hosting:** Netlify or Vercel

## Project status (V1 scope)

Built: guest upload flow (camera + gallery picker, preview, progress,
retry), signed-upload security architecture, event-scoped storage,
automatic gallery/thumbnail generation, public event gallery with
lightbox + favourites + ZIP downloads, full admin dashboard (create
event, QR code + printable poster, close/reopen, settings, per-event
stats).

### V2 Sprint 1 — guest journey redesign

The guest flow has been rebuilt around one goal: a stranger scans the QR
code, sees other people's photos first, and is pulled into uploading their
own. Scanning now lands on an **event landing screen** (event name, date,
"N photos shared so far", a 6-photo teaser strip, and two buttons — *See
the photos* / *Add my photos*) instead of dropping the guest straight into
an upload form. From there: a one-tap "Before you share" notice, a
`6 / 10 photos` picker, and a success screen that hands the guest to the
gallery, which now carries a sticky **＋ Add my photos** button to close the
loop. Guests still never create an account and never see a payment wall.
Screen-by-screen copy, states and the deferred list are in
`docs/GUEST_UX_SPEC.md`.

### V2 Sprint 2 — client self-service

Clients now sign up and run their own events; site-host admins still see
everything.

- **`/signup` and `/login`** — a client creates an account. Their `clients`
  row is created by `create_own_client_profile()` (migration `0005`), a
  `SECURITY DEFINER` function that takes identity from `auth.uid()` and
  `auth.jwt()->>'email'`, never from the request body. It is idempotent and
  also called lazily by `/dashboard`, so signup works whether or not the
  project has email confirmation turned on.
- **`/dashboard`** — the client's own events, plus a create-event form.
  `/dashboard/events/{code}` has the QR code, guest/gallery links, printable
  poster, close/reopen and settings.
- **`/api/events` and `/api/events/{code}`** — owner-scoped CRUD, separate
  from the admin-only `/api/admin/**`. Authorization is not implemented in
  the routes: they query through the session-bound client, so
  `events_select_authenticated` and `events_update_owner` decide, and
  "not found" and "not yours" both return 404.
- **Caps, in two layers.** `src/lib/limits.ts` holds the customer-facing
  ceilings (1000 photos, 25 MB, 20 per upload) and both the API and the forms
  read it, so what the form promises and what the server accepts cannot
  drift. Underneath, the `events_assert_limits` trigger rejects absurd values
  in Postgres itself, for any write path that bypasses the API. Out-of-range
  input is rejected with a message, never clamped silently.

Run `supabase/migrations/0005_client_self_service.sql` before using any of
this. It also drops the `events_select_public_anon` policy, which let anyone
holding the public anon key read every event row and which no code path used
— guests resolve events through `get_event_for_upload()`.

### V2 Sprint 3 — packages, payment, download entitlement

Two things that used to be one are now separate:

| | question | decided by |
| --- | --- | --- |
| Gallery access | who may **look** | `events.visibility` |
| Download entitlement | who may **take** the originals | `events.download_unlocked_at` |

Before this, both download routes gated on visibility alone — so any guest
holding a shared event link could download every original.

- **`packages` table** with five tiers (50/100/250/500/1000). Only the 50-photo
  tier carries the R50 that has actually been stated; the rest are
  `price_cents = null`, which the app reads as "not for sale yet" and refuses
  to charge for. Repricing is a data change, not a code change.
- **`payments` table** and `mark_event_paid()` — the only function that can set
  `download_unlocked_at`. Service role only, idempotent, so a repeated webhook
  can't double-count revenue.
- **`protect_event_commercial_fields` trigger**: an owner may edit their event
  freely *except* the commercial fields. They cannot unlock their own
  downloads, swap to a bigger package, or raise a limit above what their
  package allows. Without this, one PATCH request body would bypass the
  paywall.
- **`decideDownloadEntitlement()`** in `src/lib/auth/downloadEntitlement.ts` is
  the single place that answers "may this caller take files": admins always,
  owners once paid, guests never. Both download routes and the gallery toolbar
  read it.
- **`/api/events/{code}/checkout`** creates a pending payment;
  **`/api/admin/events/{code}/mark-paid`** lets staff confirm an EFT. No
  gateway is wired up — provider choice and webhook signature verification are
  deliberately not guessed at, so EFT-plus-staff-confirmation is the working
  revenue path until one is.
- Guests no longer see download buttons, and the routes return 403 (or 402 for
  an unpaid host) if called directly.

This branch also carries two migrations that arrived from `main`:
`0009_mark_photo_failed.sql` (service-role-only, so a failed upload stops
looking like one that is still processing) and `0010_collaborators.sql` (a
photographer assigned to one event may edit that event's settings). Neither
touches the package or payment model, and the paywall trigger applies to a
collaborator exactly as it does to the owner — verified, see below.

Run `supabase/migrations/0006_packages_payments.sql`. It is safe to run more
than once — every statement is guarded — so if the SQL editor reported
`relation "packages" already exists`, run `docs/MIGRATION_0006_STATE_CHECK.sql`
(QUERY 1 only) to see what is actually there, then re-run 0006.

Note the behaviour change: **guests lose bulk download**, which is the point —
the gallery is the free product, the originals are the paid one.

Not yet built (see spec sections 5, 21, 26–31 for the intended shape):
live gallery mode, AI features, video support, a payment gateway
(packages and entitlement exist; provider webhooks do not), white-label
branding UI (the `brand_*` columns exist
on `events` and are read by the guest page, but there's no admin UI to
set them yet), the per-guest upload quota and optional nickname (both
need a migration adding to `photos`).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values — see docs/SUPABASE_SETUP.md and docs/R2_SETUP.md
npm run dev
```

Then:

1. Follow `docs/SUPABASE_SETUP.md` to create your project, run migrations,
   and create an admin user.
2. Follow `docs/R2_SETUP.md` to create the bucket, scoped API token, and
   CORS policy.
3. Visit `http://localhost:3000/admin/login` and sign in.
4. Visit `http://localhost:3000/e/DEMO482` on your phone (same wifi
   network, or deployed) to try the guest upload flow against the seeded
   demo event.

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build        # production build
```

## Deployment (Netlify or Vercel)

Both are straightforward since this is a standard Next.js App Router
project with no custom server:

**Vercel:**
1. Import the repo → Vercel auto-detects Next.js.
2. Add every variable from `.env.example` under Project Settings →
   Environment Variables (use real values, all environments).
3. Deploy. Vercel handles the API routes as serverless functions
   automatically.

**Netlify:**
1. Import the repo → the `@netlify/plugin-nextjs` plugin (auto-installed
   for Next.js projects) handles API routes as Netlify Functions.
2. Add every variable from `.env.example` under Site Settings →
   Environment Variables.
3. Deploy.

After deploying, update `NEXT_PUBLIC_APP_URL` to your real production
domain and redeploy — this is what QR codes and copy-link buttons use to
build absolute guest/gallery URLs.

Also update the R2 bucket's CORS `AllowedOrigins` (see
`docs/R2_SETUP.md` step 4) to include your production domain, or guest
uploads will silently fail with a CORS error visible only in the
browser's dev console.

## How the upload flow works

Guest uploads are a deliberate **three-step handshake**, not a single
form POST, because the goal is: never let the browser hold real R2
credentials, and never trust anything the browser says about which event
or how big a file is.

1. **Browser → `/api/upload/request-url`** with the event code and file
   metadata (name, size, mime type) only — no file bytes yet.
   The server resolves the event code via the `get_event_for_upload()`
   Postgres function, checks the event is active and under its photo
   limit, validates the file against *that event's* configured max size
   and allowed types, then mints a photo ID and storage key itself (the
   browser never chooses where its file lands) and returns a **presigned
   R2 PUT URL** that's valid for 120 seconds and scoped to that one key.

2. **Browser → R2 directly**, PUTting the actual file bytes to the
   presigned URL. This is the only step that touches R2, and it happens
   without any of our servers proxying the bytes — good for large mobile
   photos and for scaling to hundreds of concurrent guests, since file
   transfer load lands on R2's infrastructure, not ours.

3. **Browser → `/api/upload/confirm`** once the R2 PUT succeeds, with the
   storage path and file metadata. This calls `insert_guest_photo()`, a
   `SECURITY DEFINER` Postgres function that **re-validates everything
   server-side again** — event status, upload limit (with a row lock, so
   concurrent confirms from many phones can't race past the limit),
   file size, mime type, and that the storage path actually falls under
   that event's own prefix — before creating the `photos` row.

Only after step 3 does a database row exist. Steps 1–3 are visible to
the guest as one seamless "Upload" tap; the app hides the handshake
behind a single progress bar (see `useGuestUploader.ts`).

Image processing (gallery + thumbnail variants) happens **asynchronously
after** step 3: the INSERT fires a Database Webhook, which invokes the
`process-image` Edge Function, which downloads the original from R2,
resizes it twice, uploads both variants, and calls
`mark_photo_processed()` to flip the row's status to `ready`. The guest
never waits for this — they see their upload confirmation immediately,
and the photo appears in the gallery a few seconds later once processing
completes.

## How event isolation works

"Event A's guest must never be able to upload into Event B" is enforced
at **three independent layers**, not just one, so a bug in any single
layer doesn't break the guarantee:

1. **The guest never controls the storage key.** In step 1 above, the
   server (not the browser) builds the R2 key as
   `events/{event_code}/original/{server-generated-id}.{ext}` after
   resolving `event_code` itself. There's no request parameter a guest
   could tamper with to redirect their upload into another event's
   prefix, because the prefix isn't a parameter at all — it's derived
   from the event the server already validated.

2. **The database function re-derives the event from the code, every
   time.** `insert_guest_photo(p_event_code, ...)` takes the *code*, not
   an `id`. Even if a malicious client somehow sent a forged `event_id`
   alongside a *different* event's code, the function looks up the
   event fresh from `p_event_code` and uses that row's own `id` for the
   insert — a mismatched or forged ID is never consulted. It also
   double-checks the storage path itself starts with
   `events/{that same event_code}/original/` as a final belt-and-braces
   assertion before writing.

3. **Row Level Security backs up both of the above.** Guests
   (Supabase's `anon` role) have **no INSERT policy on `photos` at all**
   — the only way a photo row can be created by an unauthenticated
   request is through the `SECURITY DEFINER` function, which runs with
   elevated privileges *only for the duration of its own, narrow,
   validated logic*. If someone tried to bypass the app entirely and
   hit Supabase's REST API directly with the anon key, there is no
   policy that would let that raw INSERT through.

Client/gallery-owner isolation ("Client A cannot see Client B's events")
follows the same layered idea but leans more heavily on RLS directly,
since clients *do* have real auth sessions: `events_select_authenticated`
and `photos_select_owner` (both in `0002_rls.sql`) join through
`clients.auth_user_id = auth.uid()`, so a client's Supabase session
literally cannot retrieve rows belonging to another client's `client_id`
— this is enforced by Postgres itself, not by application-layer
filtering that a route could forget to apply.

## Production security checklist

Before taking this live with real events and real guest data:

- [ ] Ran all eight migrations in order (0001–0006, 0009, 0010); if one reported an object already
      existing, ran `docs/MIGRATION_0006_STATE_CHECK.sql` QUERY 1 and re-ran it
      (0006 is re-runnable, so this is not destructive) verified RLS is enabled on
      `clients`, `events`, `photos` (`\d+ tablename` in psql shows
      "Row Security: Enabled")
- [ ] Created at least one admin user with the `role: admin` app_metadata
      claim (see `docs/SUPABASE_SETUP.md` step 3) — verified a
      non-admin authenticated user (a plain client) cannot reach
      `/admin` routes or admin API routes (they should get redirected /
      403'd, not see data)
- [ ] R2 API token is scoped to the single bucket, not account-wide
- [ ] R2 CORS `AllowedOrigins` lists only real domains you control (no
      wildcard `*`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `R2_SECRET_ACCESS_KEY` are set only
      in server environment variables (Vercel/Netlify dashboard), never
      committed, never referenced with a `NEXT_PUBLIC_` prefix
- [ ] Confirmed in a browser devtools Network tab that no request from
      `/e/[code]` or `/gallery/[code]` ever contains the service role key
      or R2 secret key
- [ ] Tested: uploading to Event A's guest link does not create a row
      under Event B, even when manually editing the request body in
      devtools to swap event codes
- [ ] Tested: a signed-in client for Event A cannot load
      `/admin/events/{event-B-code}` or its API routes
- [ ] Tested: an invalid/nonexistent event code shows "Event not found",
      not a stack trace or raw database error
- [ ] Tested: closing an event immediately blocks new uploads via the
      guest link, while the gallery remains viewable
- [ ] Removed or clearly labeled the `DEMO482` demo event before
      onboarding real customers (see the comment in `0004_seed_demo.sql`)
- [ ] Confirmed `events_select_public_anon` is gone (`select * from
      pg_policies where tablename = 'events'` shows no policy with
      `roles = {anon}` and `cmd = SELECT`) — see `0005`
- [ ] Tested: client A signs in, cannot open `/dashboard/events/{client-B-code}`
      (404, not 403) and cannot PATCH it
- [ ] Tested: creating an event with `uploadLimit` above the cap in
      `src/lib/limits.ts` returns a readable 400 rather than storing it
- [ ] Tested: a guest on a shared event cannot hit `/api/download/zip` or
      `/api/photos/{id}/download` (403), and the gallery shows no download
      buttons
- [ ] Tested: an owner cannot set `download_unlocked_at` on their own event
      (`DOWNLOAD_UNLOCK_NOT_ALLOWED`) or raise a limit past their package
- [ ] Tested: a collaborator on an event cannot unlock its downloads, swap
      its package or raise its limits, but can still rename it
- [ ] Set real prices on the tiers in `packages` — a NULL price blocks
      checkout by design, it does not mean free
- [ ] Decided on a payment provider and implemented its webhook with
      signature verification, calling `mark_event_paid()` only after it passes
- [ ] Rate limiting is in place on `/api/upload/request-url` — note the
      documented limitation in `src/lib/rateLimit.ts`: it's in-memory and
      per-instance, which is fine for a single-instance deploy but should
      move to Upstash Redis or a CDN-level rule before scaling to
      multiple concurrent server instances under adversarial load
- [ ] Decided on and tested the actual `NEXT_PUBLIC_R2_PUBLIC_HOST`
      value for gallery/thumbnail images in production (not left as a
      placeholder)
- [ ] Reviewed `upload_limit` and `max_file_size_bytes` defaults against
      your actual pricing tiers before opening signups

## Project structure

```
src/
  app/
    e/[code]/              guest upload page (public)
    gallery/[code]/        event gallery (public/shared) or gated (private)
    admin/                 site-host console (admin required)
    dashboard/             client self-service area (owner-scoped)
    signup/, login/        client account pages
    api/
      upload/               guest upload handshake (request-url, confirm)
      photos/[id]/          favourite toggle, single download
      download/zip/         bulk ZIP download
      admin/events/         event CRUD (admin only)
      events/               event CRUD for the owner (or an admin)
      account/              creates the caller's own client profile
  components/
    guest/                  guest upload UI + state machine
    gallery/                masonry grid, lightbox, toolbar
    admin/                  QR code, poster, settings form, status controls
  lib/
    supabase/               browser / server / admin client factories
    storage/                R2 client, path helpers, presigned URLs
    validation/             shared file validation (client + server)
    auth/                   requireAdmin(), requireUser(), eventAccess()
    limits.ts               app-wide ceilings for client-configurable limits
    eventCode.ts            non-sequential event code generator
    rateLimit.ts            in-memory rate limiter
  types/database.ts         hand-written types matching the SQL schema
supabase/
  migrations/               0001-0006 + 0009-0010, run in order
  functions/process-image/  Edge Function for gallery/thumb generation
docs/
  GUEST_UX_SPEC.md      guest journey spec (V2 Sprint 1) + deferred list
  SUPABASE_SETUP.md
  R2_SETUP.md
  LEGAL_REVIEW_NEEDED.md
```
