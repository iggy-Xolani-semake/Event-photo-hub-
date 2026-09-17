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

## 2. Project Overview

### 2.1 Purpose and Business Objectives

*Why the project exists. The business problem, in the language of the people who
funded it, not in technical terms.*

### 2.2 Success Criteria

*What "done" meant and how it was measured. Include the original targets and the
actual outcome against each.*

| Objective | Target | Achieved | Notes |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 2.3 Key Decisions and Their Rationale

*The choices a newcomer would otherwise reverse by accident. For each: the
decision, the alternatives considered, why this one, and what would make it
worth revisiting.*

### 2.4 Assumptions and Constraints

*Budget, timeline, regulatory, technical, and commercial constraints that shaped
the result and that the receiving team inherits.*

---

## 3. Scope

### 3.1 In Scope

*What was built and is being handed over.*

### 3.2 Out of Scope

*What was deliberately excluded. This section prevents more disputes than any
other.*

### 3.3 Deferred / Explicitly Not Built

*Work that was identified, agreed to be out of this phase, and is now the
receiving team's responsibility.*

---

## 4. Current Status

### 4.1 Status Summary

*One line per workstream: complete, partial, or not started.*

| Workstream | Status | Confidence | Owner |
| --- | --- | --- | --- |
| {{}} | {{Complete / Partial / Not started}} | {{High / Medium / Low}} | {{}} |

### 4.2 What Works Today

*What a user can actually do with the thing, end to end. Be concrete.*

### 4.3 What Does Not Work Yet

*Be blunt. Undisclosed gaps discovered later cost far more trust than gaps
declared now.*

### 4.4 Recent Changes

*The last significant changes, what prompted them, and whether they are fully
settled.*

---

## 5. Deliverables Inventory

| # | Deliverable | Location / Link | Format | Status | Accepted by |
| --- | --- | --- | --- | --- | --- |
| {{1}} | {{}} | {{URL or path}} | {{}} | {{}} | {{}} |

---

## 6. Technical Architecture

*(Delete this section for a non-technical handover.)*

### 6.1 System Overview

*A diagram plus a paragraph. Show components, data flow, and trust boundaries —
where does untrusted input enter, where is it validated.*

### 6.2 Technology Stack

| Layer | Technology | Version | Notes / justification |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 6.3 Repository and Branching

*Repository URLs, the branch that deploys, the branch model, and any branch that
must not be deleted.*

### 6.4 Data Model

*Principal entities, their relationships, and where the authoritative schema
lives. Call out anything denormalised or cached, and what keeps it consistent.*

### 6.5 Integrations

| System | Purpose | Direction | Auth method | Owner | Documentation |
| --- | --- | --- | --- | --- | --- |
| {{}} | {{}} | {{in / out / both}} | {{}} | {{}} | {{}} |

---

## 7. Environments and Access

### 7.1 Environments

| Environment | URL | Purpose | Deploy source | Data | Owner |
| --- | --- | --- | --- | --- | --- |
| {{Production}} | {{}} | {{}} | {{branch / commit}} | {{real / synthetic}} | {{}} |

### 7.2 Credentials and Secrets

*Never write a secret into this document. Record where each one lives and who
can retrieve it.*

| Secret | Used by | Stored in | Rotation policy | Holder |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{vault / provider env}} | {{}} | {{}} |

### 7.3 Access Requests

*Exactly what the receiving team must be granted, and to whom they should ask.*

| System | Access needed | Level | Approver | Requested? |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{Yes / No}} |

### 7.4 Local Development Setup

*Steps to go from a fresh machine to a running instance, plus the environment
variables required and any step that fails silently when skipped.*

---

## 8. Operations

### 8.1 Deployment Procedure

*The exact steps, in order, including anything that must happen in the same
window as something else.*

### 8.2 Rollback Procedure

*How to undo a bad deploy, how long it takes, and what cannot be rolled back.*

### 8.3 Scheduled Jobs and Background Processes

| Job | Schedule | Purpose | Failure impact | Where to monitor |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 8.4 Monitoring and Alerting

| Signal | Tool | Threshold | Alert recipient | Runbook |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 8.5 Backup and Recovery

*What is backed up, how often, how retention works, the last time a restore was
actually tested, and the measured recovery time.*

### 8.6 Incident Response

*How a production problem is reported, who is on call, and the escalation path.*

### 8.7 Routine Maintenance Calendar

| Task | Frequency | How | Last done |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

---

## 9. Testing and Quality

### 9.1 Test Strategy and Coverage

*What is automated, what is manual, and — more usefully — what is not tested at
all.*

### 9.2 How to Run the Checks

| Check | Command | Expected result |
| --- | --- | --- |
| {{}} | {{}} | {{}} |

### 9.3 Known Untested Areas

---

## 10. Security, Privacy and Compliance

### 10.1 Security Posture

*Authentication, authorisation, data protection in transit and at rest, and any
control that is documented but not enforced.*

### 10.2 Privacy and Data Handling

*What personal data is held, on what lawful basis, retention, and how deletion
requests are handled. Distinguish clearly between controls that exist and claims
of regulatory compliance.*

### 10.3 Compliance Obligations

| Obligation | Applies? | Status | Evidence | Owner |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 10.4 Outstanding Security Work

*Ranked, with the risk of deferring each.*

---

## 11. Known Issues and Risks

### 11.1 Open Defects

| ID | Description | Severity | Workaround | Impact if unresolved |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{Critical / High / Medium / Low}} | {{}} | {{}} |

### 11.2 Risks Inherited

| Risk | Likelihood | Impact | Mitigation in place | Residual owner |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 11.3 Technical Debt

*What was consciously traded away for speed, what it will cost to repay, and
what breaks first if it is never repaid.*

---

## 12. Outstanding Work and Roadmap

### 12.1 Immediate Priorities (first 30 days)

*Ordered, with the reason each is first.*

### 12.2 Backlog

| Item | Description | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 12.3 Proposed Direction

*Recommendations that were formed but not acted on, and the reasoning behind
them.*

### 12.4 Deliberately Not Recommended

*Ideas considered and rejected, so they are not re-litigated by someone without
the context.*

---

## 13. Costs and Contracts

| Item | Provider | Cost | Billing cycle | Renewal / expiry | Owner |
| --- | --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} | {{}} |

*Include anything that will fail, expire, or start billing if nobody acts.*

---

## 14. Stakeholders and Contacts

| Name | Role | Responsibility | Contact | Availability |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 14.1 Post-Handover Support

*How long the outgoing team remains reachable, on what terms, and what is
explicitly not covered.*

---

## 15. Knowledge Transfer

### 15.1 Sessions Delivered

| Topic | Date | Attendees | Recording / notes |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 15.2 Scheduled Sessions

### 15.3 Recommended Reading Order

*The order in which someone should read the documentation, and why.*

---

## 16. Documentation Index

| Document | Location | Owner | Last updated |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

---

## 17. Handover Acceptance

*The receiving party confirms they have received, reviewed, and understood the
above, and accept ownership from the effective date. Outstanding items in
Section 12 remain the responsibility of the receiving party unless stated
otherwise.*

### 17.1 Outstanding Items Accepted

| Item | Accepted by receiving party? | Notes |
| --- | --- | --- |
| {{}} | {{Yes / No / Deferred}} | {{}} |

### 17.2 Sign-off

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

*The full record behind Section 2.3, if it is too long to include there.*
