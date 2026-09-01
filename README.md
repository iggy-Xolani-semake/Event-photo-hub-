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

Not yet built (see spec sections 5, 21, 26–31 for the intended shape):
client-facing login/dashboard as a *separate* experience from admin
(currently client accounts share the admin UI, gated by RLS to their own
events — functionally correct but not yet visually distinct), live
gallery mode, AI features, video support, billing/package enforcement,
white-label branding UI (the `brand_*` columns exist on `events` and are
read by the guest page, but there's no admin UI to set them yet).

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

- [ ] Ran all four migrations in order; verified RLS is enabled on
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
    admin/                 admin dashboard (auth required)
    api/
      upload/               guest upload handshake (request-url, confirm)
      photos/[id]/          favourite toggle, single download
      download/zip/         bulk ZIP download
      admin/events/         event CRUD (admin only)
  components/
    guest/                  guest upload UI + state machine
    gallery/                masonry grid, lightbox, toolbar
    admin/                  QR code, poster, settings form, status controls
  lib/
    supabase/               browser / server / admin client factories
    storage/                R2 client, path helpers, presigned URLs
    validation/             shared file validation (client + server)
    auth/                   requireAdmin() guard for admin API routes
    eventCode.ts            non-sequential event code generator
    rateLimit.ts            in-memory rate limiter
  types/database.ts         hand-written types matching the SQL schema
supabase/
  migrations/               0001-0004, run in order
  functions/process-image/  Edge Function for gallery/thumb generation
docs/
  SUPABASE_SETUP.md
  R2_SETUP.md
```
