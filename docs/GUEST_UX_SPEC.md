# Event Photo Hub — Guest Experience Spec (V2, Sprint 1)

This is the working spec for the guest journey redesign. It exists so the
next change is argued against a written decision instead of a vibe.

**The frog.** One question decides whether this product works:

> Can a complete stranger scan a QR code at a wedding, understand what this
> is within five seconds, add their photos without friction, and then be
> pulled into looking at — and adding more — photos?

Everything else (dashboard, packages, payments, branding, mobile app) is
downstream of that. Sprint 1 touches the guest only. The host experience is
Sprint 2, packages/payments Sprint 3, security and abuse Sprint 4.

---

## 1. The loop

```
QR SCAN
   │
   ▼
EVENT LANDING          "Thabo & Lerato's Wedding · 16 September 2026"
   │                    34 photos shared so far  +  6-photo teaser strip
   ├── SEE THE PHOTOS ──▶ GALLERY ──▶ "＋ ADD MY PHOTOS" (sticky) ──┐
   │                                                               │
   └── ADD MY PHOTOS ──▶ BEFORE YOU SHARE ──▶ SHARE YOUR MOMENTS ◀──┘
                              (one tap)          │
                                                 ▼
                                            6 / 10 photos
                                                 │
                                            SHARE 6 PHOTOS
                                                 ▼
                                        "They're live! 🎉"
                                        [ SEE ALL 40 PHOTOS ]
                                        [ ADD MORE PHOTOS ]
```

The design rule behind the loop: **value before the ask.** A guest who has
already seen 34 other people's photos does not need to be persuaded that
uploading is worth it.

## 2. Rules that do not bend

1. **Guests never create an account.** No sign-in, no email, no phone
   number, no password, anywhere in the guest flow. The host has an
   account; the guest does not.
2. **No payment wall is ever shown to a guest.** The host is the customer.
   A guest is the content and the distribution. Anything that taxes the
   guest kills the network effect.
3. **We do not collect optional personal data by default.** A nickname is
   *offered*, never required (and is not built yet — see §6).
4. **Every limit is visible before it bites.** "6 / 10 photos", not a
   silent rejection of the 11th.
5. **No dead ends.** Every terminal state (closed event, full event,
   failed upload, empty gallery) leaves the guest at least one useful way
   forward.

## 3. Screens

### 3.1 Event landing — `/e/{code}`

The whole screen is: whose event is this, what's already here, and two
buttons. Nothing else. No product marketing, no feature list, no sign-in.

| Element | Source |
| --- | --- |
| Kicker (small caps) | `events.brand_company_name` (hidden when null) |
| Title | `events.event_name` |
| Date line | `events.event_date`, formatted `16 September 2026` |
| Teaser strip | 6 newest `ready`, non-hidden thumbnails; 6th tile shows `+N` |
| Headline count | exact count of `ready`, non-hidden photos |
| Primary CTA | **See the photos** → `/gallery/{code}` |
| Secondary CTA | **Add my photos** → consent screen |
| Footer | "No account needed · Free to share" + privacy link |

States:

| State | Behaviour |
| --- | --- |
| Photos exist | Gallery CTA is the filled/primary button. |
| Event has 0 photos | Gallery CTA is hidden entirely; **Add my photos** becomes primary; placeholder reads "No photos yet — yours could be the first." |
| `visibility = private` | No gallery CTA and **no count** (we don't claim a number we can't show). Placeholder: "Your photos go straight to the host." |
| `visibility` unknown (row read failed) | Treated as unavailable. Fail closed: never link to a gallery we haven't confirmed. |
| Event closed / limit reached | `EventClosedNotice` with the event name, the reason, and a **See the photos** button — the gallery is still viewable after the event ends. |
| Event archived | Notice only, no gallery link. |
| Unknown code | `EventNotFoundNotice`. Never a stack trace. |

Why the count comes from a `count: "exact"` query on visible photos rather
than `events.photo_count`: `photo_count` also includes photos still
processing and photos the host has hidden, so the number on the landing
screen would not match the grid the guest is about to scroll.

### 3.2 Before you share (consent) — client screen

Three sentences, shown once per page load, before the picker opens:

- Only upload photos you're comfortable sharing with everyone who has this
  event's link.
- Please don't upload private, sensitive or inappropriate images.
- You don't need an account, and we don't ask for your name, email or phone
  number.

Then **I understand** / **Back** / link to the full privacy notice.

This is a plain-language warning at the moment of decision. It is **not**
our POPIA compliance story — see `docs/LEGAL_REVIEW_NEEDED.md`.

Consent is remembered for the lifetime of the page load, so a guest adding
a second batch is not asked twice; a fresh scan asks again.

### 3.3 Share your moments (upload start) — client screen

- Title: "Share your moments"
- Body: "Add up to {max_files_per_upload} photos from your phone to {event}."
- **Choose photos** (primary, multi-select) and **Take a photo**
  (secondary, `capture="environment"`).
- Footer: "No account needed · JPG, PNG, WebP or HEIC up to {N} MB"
- Back arrow returns to the landing screen.

The file input's value is cleared after every selection, so picking the
same file twice in a row still fires.

### 3.4 Preview / progress — client screen

- Counter: `{selected} / {max_files_per_upload} photos`, with "That's the
  most at once" once the cap is reached.
- Selecting more than the cap **keeps the first N and says so** instead of
  rejecting the whole selection.
- Per-tile states: queued → compressing → uploading (progress bar) →
  success ✓ / error (tap to retry).
- Primary button: **Share N photos** → "Uploading…".
- When every tile has finished: **Continue** if any succeeded, **Try again**
  if none did, plus **Retry the N that failed** when the batch was mixed.
  A guest is never sent to a dead-end "interrupted" screen while
  recoverable photos are still on the page.

### 3.5 They're live (success) — client screen

- "They're live! 🎉"
- "Your 6 photos are now part of {event} — 40 in total."
- **See all 40 photos** (primary, → gallery), **Add more photos**
  (secondary).
- If some photos failed: an amber **Retry the N that failed** button.
- If *everything* failed: "Upload interrupted … nothing was lost" with a
  single **Try again**.
- With a private gallery, the success screen offers **Add more photos** as
  primary and does not offer a gallery link.

### 3.6 Gallery — `/gallery/{code}`

Unchanged apart from:

- Event date under the title.
- A sticky **＋ Add my photos** bar at the bottom whenever the event still
  accepts uploads (`status = active` and `photo_count < upload_limit`),
  linking to `/e/{code}?add=1` — which lands the guest on the consent
  screen, then the picker. This is the loop closing.

## 4. What Sprint 1 changed in code

| File | Change |
| --- | --- |
| `src/app/e/[code]/page.tsx` | Resolves visibility + visible photo count + 6 teasers; renders the new experience; passes a gallery link into the closed-event notice; reads `?add=1`. |
| `src/components/guest/EventLandingScreen.tsx` | New — the frog screen. |
| `src/components/guest/ShareConsentScreen.tsx` | New — "Before you share". |
| `src/components/guest/GuestEventExperience.tsx` | New — landing/consent/upload state machine, session consent, running photo count. |
| `src/components/guest/GuestUploadExperience.tsx` | Rewritten start screen; batch trimming; retry paths; feeds counts up. |
| `src/components/guest/PhotoPreviewGrid.tsx` | `N / 10` counter; continue/retry-failed endings. |
| `src/components/guest/UploadSuccessScreen.tsx` | Rewritten around the gallery CTA. |
| `src/components/guest/useGuestUploader.ts` | `uploadAll` / `retryItem` now report per-batch results so counts are real, not read from stale state. |
| `src/components/guest/EventClosedNotice.tsx` | Gallery escape hatch. |
| `src/components/gallery/GalleryView.tsx`, `GalleryToolbar.tsx` | Sticky upload CTA, event date. |
| `src/lib/format.ts` | `formatEventDate()` — local-date parsing (a bare `new Date("2026-09-16")` renders the previous day east of Greenwich). |

No database changes. No changes to the upload handshake, RLS, or the
Edge Function.

## 5. Verification performed

Run against a stubbed Supabase/R2 (not committed) with `npm run build` +
`next start`, checking the server-rendered output of the real page code:

- `/e/DEMO482` (34 visible photos) → teaser strip, "34 photos shared so
  far", `+28` on the last tile, gallery CTA rendered as the filled button.
- `/e/EMPTY482` (0 photos) → placeholder + "Be the first to share a
  photo", single primary **Add my photos**, no gallery CTA.
- `/e/CLOSED48` → "no longer accepting photographs" + **See the photos**.
- `/e/ZZZZZZZZ` → "Event not found".
- `/gallery/DEMO482` → 34 tiles, sticky **＋ Add my photos** → `/e/DEMO482?add=1`.
- `/e/DEMO482?add=1` → renders the consent screen.
- `/api/upload/request-url` → presigned URL under `events/DEMO482/original/…`;
  a 99 MB file rejected with the 15 MB message.

Not machine-verified: the in-browser click-through (file picker →
progress → success), which needs a real device or browser. Step 2 of the
upload (the direct PUT to R2) cannot be exercised without real R2
credentials.

## 6. Deliberately deferred (with the reason)

| Item | Why it is not in Sprint 1 |
| --- | --- |
| Optional nickname ("Uploaded by Iggy") | Needs an `uploader_name` column on `photos` plus a signature change to `insert_guest_photo()`. That is a migration; Sprint 1 was agreed to be UI-only so the DB stays untouched until the live-project audit. |
| Per-guest 10-photo lifetime quota | Same blocker, and it must be enforced in Postgres (count by `uploader_identifier`) — a UI counter is not a quota. Today only "10 per batch" exists; the copy says "at a time" for exactly that reason. |
| Report photo / moderation queue | Needs a `reports` table and a host-side moderation UI. Sprint 4. |
| Guest download entitlement (gallery access ≠ original download) | The gallery toolbar still offers "Download All" to anyone who can see it. Splitting view access from download entitlement is Sprint 3, together with packages and payments — removing it now would also remove the host's only download UI. |
| `brand_primary_color` | The column exists and is read, but there is no admin UI to set it, so it cannot be tested end to end. Deferred with the white-label work. |
| Large ZIP downloads (500–1 000 originals) | Needs a background job + temporary archive, not a Next.js function holding 150 images in memory. Sprint 3/4. |

## 7. How to look at it locally

```bash
npm install
cp .env.example .env.local     # real Supabase + R2 values
npm run dev
# open /e/DEMO482 on a phone on the same network
```

The seeded `DEMO482` event (`supabase/migrations/0004_seed_demo.sql`) is the
fastest way to see the landing screen with photos in it.
