# Project Handover Document

> **How to use this template.** Replace every `{{placeholder}}` and every
> *italic guidance line*. Delete sections that genuinely do not apply and say so
> rather than leaving them blank — an empty section reads as an unfinished one.
> Keep guidance lines out of the final version. Target length is 8–20 pages;
> anything longer belongs in an appendix or a linked document.

---

## Document Control

| Field | Value |
| --- | --- |
| Project name | {{name}} |
| Document version | {{e.g. 1.0}} |
| Status | {{Draft / In review / Approved / Accepted}} |
| Author | {{name, role}} |
| Reviewer(s) | {{name, role}} |
| Approver | {{name, role}} |
| Date issued | {{YYYY-MM-DD}} |
| Handover effective date | {{YYYY-MM-DD}} |
| Next review date | {{YYYY-MM-DD}} |

### Revision History

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| {{0.1}} | {{date}} | {{author}} | {{Initial draft}} |

### Distribution

| Recipient | Role | Purpose |
| --- | --- | --- |
| {{name}} | {{role}} | {{receive / review / approve}} |

---

## 1. Project Summary, Objectives, and Current Status

### 1.1 Project Summary

- **Product.** Event Photo Hub (`event-photo-hub`, v0.1.0) is a mobile-first event
  photo sharing platform. Guests scan a QR code at an event and upload their
  photos into a shared, cloud-hosted gallery — no app, no account, no password.
  It is designed for events with 15–500+ guests uploading concurrently.
- **Business model.** Guest uploads are free and guests can always view the
  gallery. The event host is the paying customer: they buy a photo package
  (50 / 100 / 250 / 500 / 1000 photos) which unlocks original-resolution
  downloads. Payment gates originals only — never gallery viewing — and no guest
  ever sees a paywall or a sign-in prompt.
- **Stack.** Next.js 15 (App Router) + TypeScript + Tailwind CSS; Supabase
  (PostgreSQL, Row Level Security, Auth); Cloudflare R2 for object storage,
  reached with server-held credentials via presigned uploads.
- **Shape of the codebase.** 15 page routes and 16 API routes; 10 database
  migrations applied in sequence `0001`–`0012`, with `0007` and `0008` absent
  (see §1.3).

### 1.2 Objectives

| # | Objective | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Guest reaches the gallery from a QR scan with no account | Complete | `/e/[code]` and `/gallery/[code]` render publicly; "No account needed" copy present |
| 2 | Gallery shows value before any upload is requested | Complete | Landing screen leads with "See the photos" / "Add my photos" |
| 3 | Uploading needs nothing but an optional nickname | **Not implemented** | `nickname` appears **0 times** in `src/`, and the live database has no nickname column. The attribution copy ("Uploaded by …" / "Guest photo") does not exist |
| 4 | Privacy consent built into the upload flow | **Partial** | The pre-upload "Before you share" gate with an "I understand" confirmation is implemented. A per-photo "Privacy notice" link is not (0 occurrences) |
| 5 | Guests can report a photo | **Not implemented** | No reporting UI or endpoint — "Report" appears 0 times in `src/` |
| 6 | Per-guest upload quota enforced server-side | Complete | Migration `0012`; 25 assertions in `scripts/verify/test_guest_sessions.mjs` |
| 7 | Host buys a package and unlocks original downloads | Complete | Migration `0006`; `/api/photos/[id]/download` gated by an explicit entitlement check |
| 8 | Clients self-serve: sign up and manage their own events | Complete | Migration `0005`; `/signup`, `/dashboard` |
| 9 | Site-host admins see all events; clients see only their own | Complete | Migrations `0005` (owner-scoped RLS) and `0010` (collaborators) |
| 10 | No paywall or sign-in shown to guests | Complete | Guests have no download controls in the gallery UI |

### 1.3 Current Status

| Workstream | Status | Notes |
| --- | --- | --- |
| Guest journey (QR → landing → gallery → upload) | Complete | Objectives 1, 2, 10 |
| Client self-service | Complete | Objective 8 |
| Packages, payment, download entitlement | Complete | Objective 7 |
| Guest upload quota | Complete | Objective 6, shipped in `0012` |
| Privilege hardening | Complete | `0011` closes the `mark_event_paid()` bypass |
| Guest attribution and reporting | **Not started** | Objectives 3, 4 (partial), 5 |
| Abuse prevention beyond the quota | **Not started** | Per-IP rate limiting is still a per-process `Map()` and stops working above one instance |
| Downloads at scale | **Not started** | The ZIP path has a hard photo ceiling; 500- and 1000-photo packages will not serve through it |
| Operations (monitoring, expiry, cleanup) | **Not started** | |
| PWA / offline | **Not started** | |

**Verified quality gate.** `npm run verify:db` → **86 assertions passed, 0
failed**, across 4 harnesses (`test_privileges`, `test_guest_sessions`,
`test_idem`, `test_collab`), exit code 0. `npm run typecheck` and
`npm run build` are clean.

#### Three items requiring attention at the point of handover

1. **The application code matching the live database is not merged.**
   Migrations `0011` and `0012` have been applied to the live Supabase project.
   The matching application code sits on branch
   `arena/01a0a9df-event-photo-hub` (`06f6e68`) behind **pull request #1**, which
   is open and unmerged. `main` does not contain it. Because `0012` changed the
   signature of `insert_guest_photo()`, guest uploads fail closed until PR #1 is
   deployed.
2. **The production site was reported broken** — "none of the buttons work".
   The suspected cause is `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing from the build environment, which
   produces a bundle that throws on the first client-side Supabase call. This is
   **unconfirmed**: no browser console output was obtained. See
   `docs/DEPLOY_BREAKAGE.md`.
3. **Migrations `0007` and `0008` do not exist** in `supabase/migrations/`.
   The sequence runs `0006` → `0009`. Whether they were never written or applied
   directly to the database is unknown and must be confirmed before the
   migration folder is treated as a complete record of the live schema.

### 1.4 Items Requiring Input From the Outgoing Owner

The following could not be established from the repository and are needed to
complete this section:

- Launch date, current live events in production, and actual usage figures.
- Target market and pricing that has been agreed with customers.
- Whether the four unpriced package tiers are still unpriced on the live
  database, and what the intended prices are.
- Who is receiving this handover, and their existing familiarity with the stack.
- The commercial and support commitments already made to hosts.

---

## 2. Key Responsibilities and Daily Tasks

> **The Owner and Contact columns are intentionally empty.** Who does what cannot
> be derived from a repository, and a handover document containing invented names
> is worse than one with gaps. Everything else in this section is grounded in
> something that exists in the codebase — the evidence is in the second column.

### 2.1 Roles This System Requires

Each role is listed because something concrete breaks without it.

| Role | Why it must exist | Owner | Contact |
| --- | --- | --- | --- |
| Product / commercial owner | Sets `packages.price_cents`. An unpriced tier is refused at checkout, so a package with no price is a package that cannot be sold. | | |
| Site-host administrator | The only identity that can confirm a payment and unlock an event. Since `0011`, `mark_event_paid()` is executable by `service_role` only — not by the event owner, not by a signed-in user. | | |
| Database / migration owner | Applies the 10 migrations in filename order. The sequence has already drifted (`0007` and `0008` are absent), so this needs a named owner rather than an assumption. | | |
| Deploy owner | Deploys to Netlify (`netlify.toml`: `next build` → `.next`, Next.js Runtime plugin required). Must know that `NEXT_PUBLIC_*` values are inlined at **build** time — see `docs/DEPLOY_BREAKAGE.md`. | | |
| Storage owner (Cloudflare R2) | Holds `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Originals are never public; every download is presigned. | | |
| Host support | Hosts are the paying customers. They need help with checkout failures, unlocking, and guests who hit the 10-photo cap. | | |
| Privacy / takedown responder | Handles "remove my photo" requests. **There is no reporting feature in the product**, so every such request currently arrives out-of-band and is handled by hand. | | |
| Incident responder | No monitoring or error-reporting library is installed (verified: none in `package.json`). Incidents surface when a user reports them, not before. | | |

### 2.2 Recurring Tasks

| Task | Frequency | How | Owner | Last done |
| --- | --- | --- | --- | --- |
| Run the database verification suite | Before any schema change | `npm run verify:db` — 86 assertions across 4 harnesses; must exit 0 | | |
| Apply migrations to production | As needed | Supabase SQL Editor, in filename order. The scripts are re-runnable; the editor shows only one statement's result at a time | | |
| Deploy to production | Per release | Netlify. Force a fresh build (no cache) whenever any `NEXT_PUBLIC_*` value changes | | |
| Confirm a payment and unlock an event | Per sale | Admin only, via the mark-paid control on `/admin/events/[code]` | | |
| Check `process-image` edge function logs | Weekly | It calls `mark_photo_processed` / `mark_photo_failed` (migration `0009`). If it dies, photos are stuck in `processing` forever | | |
| Look for photos stuck in `processing` | Weekly | A stuck photo means the edge function never called back | | |
| Review R2 storage growth | Monthly | **No expiry or cleanup job exists** — verified: there is no cron or scheduled job anywhere in the repository. Storage only grows | | |
| Review package pricing | Quarterly | The earlier live-database audit recorded four of the five tiers as unpriced. Confirm whether that is still the case and set prices | | |
| Test a backup restore | Not yet scheduled | Backups are Supabase-managed. No restore has been evidenced anywhere in this repository | | |

### 2.3 A Normal Day

*To be written by the outgoing owner. What actually gets looked at each morning,
what gets answered, what gets ignored until it escalates. The task table above
describes what the system needs; this subsection should describe what the person
actually does.*

### 2.4 Responsibilities With No Current Owner

These need doing and no role above covers them:

- **Monitoring and alerting** — nothing is installed, so there is nothing to watch.
- **Backup restore testing** — no evidence any restore has ever been performed.
- **Expiry and cleanup** — no job exists; photos and R2 objects accumulate indefinitely.
- **Photo reporting and moderation** — the feature does not exist, so reports have nowhere to go.
- **Abuse prevention beyond the per-guest quota** — the rate limiter is a per-process `Map()` and is ineffective above a single instance.
- **Downloads for 500- and 1000-photo packages** — the ZIP path has a hard ceiling of 150 photos (`MAX_ZIP_PHOTOS`, `src/app/api/download/zip/route.ts:23`).

### 2.5 What Is Needed to Complete This Section

- Who currently fills each role in §2.1, by name, with contact details.
- Which of those roles one person holds multiple of.
- The actual daily and weekly routine as practised (§2.3).
- What support hours have been promised to hosts, and through which channel.
- Who is reachable when the site is down, and how they are reached.
- Whether any of these roles is outsourced, and to whom.

---

## 3. Access, Tools, and Documentation Links

> **No secret, key, token, or password appears in this document.** Where a
> credential is needed, this section records where it lives and which dashboard
> page it comes from. The authoritative variable list is `.env.example` in the
> repository root — it is committed, contains no real values, and documents the
> origin of each one.

### 3.1 Systems and Tools

| System | Purpose | Location | Admin holder | Request access from |
| --- | --- | --- | --- | --- |
| GitHub | Source control, review, releases | `github.com/iggy-Xolani-semake/Event-photo-hub-` | | |
| Supabase | PostgreSQL, Auth, Row Level Security, the `process-image` Edge Function | Project Settings → API | | |
| Cloudflare R2 | Object storage: originals, thumbnails, WebP gallery variants | Dashboard → R2 → bucket `event-photo-hub` (the default name in `.env.example`) | | |
| Netlify | Production hosting; runs `next build` and serves the Next.js runtime | Build defined in `netlify.toml` | | |
| Local toolchain | Node.js + npm. Six scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `verify:db` | `package.json` | n/a | n/a |

**There is no monitoring, analytics, or error-reporting system in use.** None is
installed as a dependency and none is referenced in configuration, so there is
no dashboard to be granted access to. See §2.4.

### 3.2 Credentials Required

Nine environment variables. `.env.example` is the authoritative list; this table
records only where each value comes from. Production values are set in Netlify's
environment settings, local values in `.env.local` — neither is committed.

| Variable | Visibility | Obtained from |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public, build-time | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public, build-time | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** — bypasses Row Level Security entirely; treat it as a root password | Supabase → Project Settings → API |
| `R2_ACCOUNT_ID` | Server-only | Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | Server-only | R2 → Manage R2 API Tokens, scoped to the bucket only, Object Read & Write |
| `R2_SECRET_ACCESS_KEY` | Server-only | R2 → Manage R2 API Tokens |
| `R2_BUCKET_NAME` | Server-only | `event-photo-hub` by default |
| `NEXT_PUBLIC_R2_PUBLIC_HOST` | Public, build-time | An R2.dev subdomain or a custom domain on the bucket. Serves gallery and thumbnail variants only — never originals |
| `NEXT_PUBLIC_APP_URL` | Public, build-time | The production domain; used to build QR and copy-link URLs |

Two properties of this list matter operationally:

- **Server-only variables are enforced at build time, not by convention.**
  `src/lib/supabase/admin.ts` and `src/lib/storage/r2Client.ts` both open with
  `import "server-only"`, so any client component that reaches for them fails
  the build.
- **The four `NEXT_PUBLIC_*` values are inlined at build time.** Changing one
  requires a fresh build; a cached redeploy silently keeps the old value. This
  is the failure mode documented in `docs/DEPLOY_BREAKAGE.md`.

Rotation policy and holder for each credential belong in §9.2. The Supabase
project reference is not committed anywhere in the repository — verified by
searching the source for `*.supabase.co`. It exists only in the environment,
which is correct.

### 3.3 Repository

| Item | Value |
| --- | --- |
| Remote | `https://github.com/iggy-Xolani-semake/Event-photo-hub-` |
| Default branch | `main` |
| Branch carrying the current work | `arena/01a0a9df-event-photo-hub` |
| Open pull request | **#1** — must be merged before guest uploads work against the live database |
| Verification harnesses | `scripts/verify/`, run with `npm run verify:db` |
| Migrations | `supabase/migrations/`, applied in filename order |

### 3.4 Documentation in the Repository

| Document | What it is for |
| --- | --- |
| `README.md` | Product summary and stack |
| `.env.example` | Authoritative environment variable list, with the origin of each |
| `docs/SUPABASE_SETUP.md` | Create the project, run the migrations, first admin user, the `process-image` Edge Function, regenerating types |
| `docs/R2_SETUP.md` | Bucket, scoped API token, public access for gallery variants, CORS for browser uploads, optional lifecycle rules |
| `docs/GUEST_UX_SPEC.md` | The guest experience specification |
| `docs/DEPLOY_BREAKAGE.md` | Diagnosis of the "no button works" deploy failure |
| `docs/LEGAL_REVIEW_NEEDED.md` | Records that the privacy policy covers the right POPIA topics but is **not legal advice and has not been reviewed by a lawyer** |
| `docs/LIVE_DB_AUDIT.sql` | Full read-only audit of the live database |
| `docs/LIVE_DB_AUDIT_QUICK.sql` | The same audit as one statement — the SQL Editor renders a single result grid |
| `docs/MIGRATION_0006_STATE_CHECK.sql` | State check for the payment guard |
| `scripts/verify/README.md` | What each harness proves, and the traps to avoid when extending them |
| `docs/HANDOVER.md` | This document |

Documents outside the repository — shared drives, design files, contracts — are
listed in §18.

### 3.5 Deliberately Not Recorded Here

Any secret, key, token or password; the Supabase project reference; the R2
account id; the production database connection string. These belong in the
hosting provider's environment settings and the team's secret store (§3.6).

### 3.6 Needed to Complete This Section

- The secret store or password manager in use, and the vault or folder name.
- Shared drive folders: design assets, contracts, brand, invoices.
- Team communication channels, and the ticketing system if there is one.
- The production domain and the Netlify site name.
- The Supabase project reference — record it in the secret store, not here.
- Any payment, email, or analytics provider account that is not visible in the
  code. **No payment gateway is integrated yet**; checkout refuses unpriced
  tiers, and no provider has been chosen.

---

## 4. Project Overview

*Expands on §1.1–1.2.*

### 4.1 Purpose and Business Objectives

*Why the project exists. The business problem, in the language of the people who
funded it, not in technical terms.*

### 4.2 Success Criteria

*What "done" meant and how it was measured. Include the original targets and the
actual outcome against each.*

| Objective | Target | Achieved | Notes |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 4.3 Key Decisions and Their Rationale

*The choices a newcomer would otherwise reverse by accident. For each: the
decision, the alternatives considered, why this one, and what would make it
worth revisiting.*

### 4.4 Assumptions and Constraints

*Budget, timeline, regulatory, technical, and commercial constraints that shaped
the result and that the receiving team inherits.*

---

## 5. Scope

### 5.1 In Scope

*What was built and is being handed over.*

### 5.2 Out of Scope

*What was deliberately excluded. This section prevents more disputes than any
other.*

### 5.3 Deferred / Explicitly Not Built

*Work that was identified, agreed to be out of this phase, and is now the
receiving team's responsibility.*

---

## 6. Current Status

*Expands on §1.3.*

### 6.1 Status Summary

*One line per workstream: complete, partial, or not started.*

| Workstream | Status | Confidence | Owner |
| --- | --- | --- | --- |
| {{}} | {{Complete / Partial / Not started}} | {{High / Medium / Low}} | {{}} |

### 6.2 What Works Today

*What a user can actually do with the thing, end to end. Be concrete.*

### 6.3 What Does Not Work Yet

*Be blunt. Undisclosed gaps discovered later cost far more trust than gaps
declared now.*

### 6.4 Recent Changes

*The last significant changes, what prompted them, and whether they are fully
settled.*

---

## 7. Deliverables Inventory

| # | Deliverable | Location / Link | Format | Status | Accepted by |
| --- | --- | --- | --- | --- | --- |
| {{1}} | {{}} | {{URL or path}} | {{}} | {{}} | {{}} |

---

## 8. Technical Architecture

*(Delete this section for a non-technical handover.)*

### 8.1 System Overview

*A diagram plus a paragraph. Show components, data flow, and trust boundaries —
where does untrusted input enter, where is it validated.*

### 8.2 Technology Stack

| Layer | Technology | Version | Notes / justification |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 8.3 Repository and Branching

*Repository URLs, the branch that deploys, the branch model, and any branch that
must not be deleted.*

### 8.4 Data Model

*Principal entities, their relationships, and where the authoritative schema
lives. Call out anything denormalised or cached, and what keeps it consistent.*

### 8.5 Integrations

| System | Purpose | Direction | Auth method | Owner | Documentation |
| --- | --- | --- | --- | --- | --- |
| {{}} | {{}} | {{in / out / both}} | {{}} | {{}} | {{}} |

---

## 9. Environments and Access

### 9.1 Environments

| Environment | URL | Purpose | Deploy source | Data | Owner |
| --- | --- | --- | --- | --- | --- |
| {{Production}} | {{}} | {{}} | {{branch / commit}} | {{real / synthetic}} | {{}} |

### 9.2 Credentials and Secrets

*Never write a secret into this document. Record where each one lives and who
can retrieve it.*

| Secret | Used by | Stored in | Rotation policy | Holder |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{vault / provider env}} | {{}} | {{}} |

### 9.3 Access Requests

*Exactly what the receiving team must be granted, and to whom they should ask.*

| System | Access needed | Level | Approver | Requested? |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{Yes / No}} |

### 9.4 Local Development Setup

*Steps to go from a fresh machine to a running instance, plus the environment
variables required and any step that fails silently when skipped.*

---

## 10. Operations

### 10.1 Deployment Procedure

*The exact steps, in order, including anything that must happen in the same
window as something else.*

### 10.2 Rollback Procedure

*How to undo a bad deploy, how long it takes, and what cannot be rolled back.*

### 10.3 Scheduled Jobs and Background Processes

| Job | Schedule | Purpose | Failure impact | Where to monitor |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 10.4 Monitoring and Alerting

| Signal | Tool | Threshold | Alert recipient | Runbook |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 10.5 Backup and Recovery

*What is backed up, how often, how retention works, the last time a restore was
actually tested, and the measured recovery time.*

### 10.6 Incident Response

*How a production problem is reported, who is on call, and the escalation path.*

### 10.7 Routine Maintenance Calendar

| Task | Frequency | How | Last done |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

---

## 11. Testing and Quality

### 11.1 Test Strategy and Coverage

*What is automated, what is manual, and — more usefully — what is not tested at
all.*

### 11.2 How to Run the Checks

| Check | Command | Expected result |
| --- | --- | --- |
| {{}} | {{}} | {{}} |

### 11.3 Known Untested Areas

---

## 12. Security, Privacy and Compliance

### 12.1 Security Posture

*Authentication, authorisation, data protection in transit and at rest, and any
control that is documented but not enforced.*

### 12.2 Privacy and Data Handling

*What personal data is held, on what lawful basis, retention, and how deletion
requests are handled. Distinguish clearly between controls that exist and claims
of regulatory compliance.*

### 12.3 Compliance Obligations

| Obligation | Applies? | Status | Evidence | Owner |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 12.4 Outstanding Security Work

*Ranked, with the risk of deferring each.*

---

## 13. Known Issues and Risks

### 13.1 Open Defects

| ID | Description | Severity | Workaround | Impact if unresolved |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{Critical / High / Medium / Low}} | {{}} | {{}} |

### 13.2 Risks Inherited

| Risk | Likelihood | Impact | Mitigation in place | Residual owner |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 13.3 Technical Debt

*What was consciously traded away for speed, what it will cost to repay, and
what breaks first if it is never repaid.*

---

## 14. Outstanding Work and Roadmap

### 14.1 Immediate Priorities (first 30 days)

*Ordered, with the reason each is first.*

### 14.2 Backlog

| Item | Description | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 14.3 Proposed Direction

*Recommendations that were formed but not acted on, and the reasoning behind
them.*

### 14.4 Deliberately Not Recommended

*Ideas considered and rejected, so they are not re-litigated by someone without
the context.*

---

## 15. Costs and Contracts

| Item | Provider | Cost | Billing cycle | Renewal / expiry | Owner |
| --- | --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} | {{}} |

*Include anything that will fail, expire, or start billing if nobody acts.*

---

## 16. Stakeholders and Contacts

| Name | Role | Responsibility | Contact | Availability |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 16.1 Post-Handover Support

*How long the outgoing team remains reachable, on what terms, and what is
explicitly not covered.*

---

## 17. Knowledge Transfer

### 17.1 Sessions Delivered

| Topic | Date | Attendees | Recording / notes |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 17.2 Scheduled Sessions

### 17.3 Recommended Reading Order

*The order in which someone should read the documentation, and why.*

---

## 18. Documentation Index

| Document | Location | Owner | Last updated |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

---

## 19. Handover Acceptance

*The receiving party confirms they have received, reviewed, and understood the
above, and accept ownership from the effective date. Outstanding items in
Section 14 remain the responsibility of the receiving party unless stated
otherwise.*

### 19.1 Outstanding Items Accepted

| Item | Accepted by receiving party? | Notes |
| --- | --- | --- |
| {{}} | {{Yes / No / Deferred}} | {{}} |

### 19.2 Sign-off

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Handing over | {{}} | {{}} | {{}} |
| Receiving | {{}} | {{}} | {{}} |
| Sponsor / approver | {{}} | {{}} | {{}} |

---

## Appendices

### Appendix A — Glossary

*Terms, acronyms, and internal names that would otherwise be opaque.*

| Term | Meaning |
| --- | --- |
| {{}} | {{}} |

### Appendix B — Environment Variables and Configuration

| Variable | Required in | Purpose | Example (non-secret) |
| --- | --- | --- | --- |
| {{}} | {{build / runtime}} | {{}} | {{}} |

### Appendix C — Command Reference

### Appendix D — Architecture Diagrams

### Appendix E — Decision Log

*The full record behind Section 4.3, if it is too long to include there.*
