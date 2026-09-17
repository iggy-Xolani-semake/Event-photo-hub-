# Event Photo Hub — Executive Urgent Fixes Checklist

**Branch:** `fix/landing-signup-pricing-ctas`  
**Date:** 2026-09-17  
**Status:** Ready for review; local typecheck and production build pass.

## Top Five Urgent Fixes

### 1. Deploy the branch and verify the production build environment

- [x] Landing pricing CTAs route to Supabase signup with the selected plan.
- [x] Landing page contrast no longer relies on yellow/gold text on white or cream backgrounds.
- [x] Dead landing interactions were removed or replaced with real links.
- [ ] Deploy this branch to the intended Netlify site.
- [ ] Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, and the R2 public host are present at build time.
- [ ] Run a clean build after any public environment-variable change.
- [ ] Verify `/`, `/signup?plan=standard`, `/admin/login`, and `/e/DEMO482` in production.

**Why urgent:** A correct branch is irrelevant if Netlify is serving an older commit or a build without the public Supabase variables. That failure presents to users as “buttons do nothing.”

### 2. Keep the live Supabase schema and application code in lockstep

- [x] The live project was identified as **NSX Events Photo Hub**.
- [x] The live schema was inspected before applying the curator migration.
- [x] Curator signup and the trigger-function privilege hardening were applied to Supabase.
- [ ] Apply and verify migration `0012_guest_sessions.sql` in the connected Supabase project; the connector was unavailable during this implementation pass.
- [ ] Confirm the deployed application contains the matching curator-aware authorization code.
- [ ] Record the live migration list as the authoritative baseline before the next migration.
- [ ] Add a migration-drift check to release validation.

**Why urgent:** The live database uses curator-based ownership and later migrations than the original local migration folder. Applying stale “organizer” assumptions can break signup, event creation, or ownership controls.

### 3. Run negative authorization tests for every role

- [x] Guest quota no longer depends on `localStorage`; the branch now uses an opaque, event-scoped server session and atomic database counting.
- [x] Re-registering or clearing browser storage cannot reset an existing server-side session counter.
- [ ] Verify an anonymous guest cannot call raw photo inserts or read private event metadata.
- [ ] Verify a curator can create and manage only curator-owned events.
- [ ] Verify a curator cannot read, update, delete, or moderate another curator’s event.
- [ ] Verify a collaborator receives only collaborator-scoped access.
- [ ] Verify an admin retains platform-wide access.
- [ ] Verify original downloads require the server-side entitlement check.

**Why urgent:** Positive tests show that intended users can proceed; negative tests prove that the ownership boundary is real. This product handles private event photos, and a quota migration that is not deployed with its matching application code will break or weaken guest uploads.

### 4. Finish the payment and package entitlement path before selling access

- [ ] Confirm the payment provider and webhook ownership.
- [ ] Ensure payment state is written only from a verified server-side webhook or protected operator action.
- [ ] Make package limits, retention, currency, and price database-driven.
- [ ] Confirm that gallery viewing remains available while original downloads remain gated, if that is the chosen experiment.
- [ ] Test package sizes larger than the current ZIP ceiling with an asynchronous download strategy.

**Why urgent:** Pricing buttons now start signup, but signup is not payment. A host can be sent into an apparently paid flow without a complete, authoritative transaction and download entitlement system.

### 5. Add production abuse controls and operational visibility

- [ ] Replace the process-local rate limiter with a shared store or edge/CDN control before horizontal scaling.
- [ ] Rate-limit signup, login, password reset, event lookup, session creation, upload signing, upload confirmation, reports, likes, and downloads.
- [ ] Add error monitoring for API routes and the `process-image` Edge Function.
- [ ] Alert on photos stuck in `processing`.
- [ ] Define photo/R2 retention and deletion jobs.
- [ ] Test a database and storage restore before commercial launch.

**Why urgent:** The upload path is intentionally public and can be abused. Without shared rate limiting, monitoring, and cleanup, the first scaling or abuse event becomes an operational incident rather than a controlled failure.

## Current Local Verification

The branch currently passes:

```text
npm run typecheck
npm run build
git diff --check
```

The previous localStorage quota bypass is fixed in commits `d768272` and `5edee15`. The implementation adds `/api/guest/session`, removes the browser-made uploader identifier from the upload authority path, and changes `insert_guest_photo()` to require a server-issued session token. The production database migration remains a release prerequisite.

The landing-page dead-CTA scan found no remaining `href="#"` or inert `Get Started`, `View Photos`, `View All Events`, or theme-toggle controls in `src/app/page.tsx`.

## Release Gate

Do not call the branch production-ready until items 1–3 are verified in the deployed environment. Items 4–5 are commercial-launch gates even if the landing page and signup flow appear functional.
