# Event Photo Hub — Guest Quota Deployment Runbook

**Scope:** Migration `0012_guest_sessions.sql`, server-issued guest sessions, per-guest quota enforcement, and the hardened `/api/guest/session` endpoint.  
**Target branch:** `fix/landing-signup-pricing-ctas`  
**Application host:** Netlify (`eventphotohub.netlify.app`)  
**Object storage:** Cloudflare R2  
**Database/Auth:** Supabase  
**Change risk:** High. The migration changes the effective `insert_guest_photo()` contract and must be deployed with the matching application code.

> **Execution status.** This document is an execution-ready runbook, not evidence that production has already been changed. The Supabase connector was disabled during the audit, and no production migration was applied in this pass. Do not skip the live preflight.

## 1. Change Summary

The old guest flow accepted a browser-created `localStorage` identifier that was stored for attribution but did not control quota. A guest could clear storage or submit a new identifier and receive unlimited uploads.

Migration `0012_guest_sessions.sql` changes this boundary. It adds `events.guest_photo_limit`, creates an RLS-protected `guest_sessions` table, adds `photos.guest_session_id`, creates `register_guest_session()`, and replaces the effective sixth input of `insert_guest_photo()` with a server-issued event-scoped session token. The function checks and increments the per-guest count under a row lock in the same transaction as the photo insert.

The application change adds `POST /api/guest/session`, caches the issued token only for continuity, submits that token at upload confirmation, and hardens session issuance with strict token validation, an IP/event rate limit, `Cache-Control: no-store`, and `Retry-After` on throttling.

## 2. Release Preconditions

Before touching production, obtain:

| Requirement | Owner | Required state |
| --- | --- | --- |
| Git branch access | Engineering | Branch checked out and clean. |
| Supabase project access | Database owner | SQL Editor or CLI access to the correct project. |
| Cloudflare access | Infrastructure owner | R2 bucket and DNS/CORS settings access. |
| Netlify access | Deployment owner | Permission to configure environment variables and deploy the branch. |
| Backup/restore authority | Database owner | A recent database backup and a documented restore route. |
| Test event | QA/host | A non-production event with a known code and disposable uploads. |

Never place Supabase service-role keys, R2 secret keys, database passwords, or Cloudflare API tokens in this document, Git, shell history, or browser JavaScript.

## 3. Local Preflight

From a clean checkout:

```bash
git fetch --all --prune
git switch fix/landing-signup-pricing-ctas
git status --short --branch
git log -5 --oneline
```

The branch should include the CTA/theme fixes and the guest-session commits. Confirm that the migration and route exist:

```bash
test -s supabase/migrations/0012_guest_sessions.sql
test -s src/app/api/guest/session/route.ts
rg -n "register_guest_session|guestSessionToken|GUEST_UPLOAD_LIMIT_REACHED|guest_photo_limit" \
  src supabase/migrations/0012_guest_sessions.sql
```

Run the application checks:

```bash
npm ci
npm run typecheck
npm run build
git diff --check
```

The expected result is exit code 0 for all commands. Build warnings about webpack cache serialization are non-blocking; type or compilation errors are release blockers.

## 4. SQL Dry Run and Schema Review

### 4.1 What Was Verified Locally

The migration was parsed with a PostgreSQL grammar parser. It produced 17 SQL statements without a syntax parse error. Static checks confirmed the presence of the required table constraints and security controls:

- `guest_photo_limit` range check from 1 through 50.
- Unique opaque session token.
- Foreign key from `guest_sessions.event_id` to `events.id`.
- Non-negative `upload_count`.
- RLS enabled on `guest_sessions`.
- Foreign key from `photos.guest_session_id` to `guest_sessions.id`.
- Row locks in session reuse and photo insertion paths.
- `GUEST_UPLOAD_LIMIT_REACHED` server-side exception.
- Anonymous execution grant for `register_guest_session()`.

This is a syntax and structural dry run only. It is **not** a substitute for executing the migration in a clone of the actual Supabase schema. The local repository does not contain every migration present in the live project, and no live SQL execution was possible while the Supabase connector was disabled.

### 4.2 Required Live Preflight SQL

Run these read-only queries in the Supabase SQL Editor before applying the migration:

```sql
select version();

select version, name
from supabase_migrations.schema_migrations
order by version;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('events', 'photos', 'guest_sessions')
order by table_name, ordinal_position;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_event_for_upload', 'insert_guest_photo', 'register_guest_session')
order by p.proname, arguments;
```

Stop if `guest_sessions` already exists with a different meaning, if the live `insert_guest_photo()` signature is not the expected eight-argument signature, or if the live schema contains an incompatible `guest_photo_limit` constraint. Reconcile the live migration history before proceeding.

## 5. Applying the Supabase Migration

### Option A: Supabase SQL Editor

1. Open the correct Supabase project and confirm its project name and reference.
2. Take or confirm a current backup according to the project’s backup policy.
3. Open SQL Editor and create a new query.
4. Paste the exact committed contents of `supabase/migrations/0012_guest_sessions.sql`.
5. Review that the query is being executed against the intended project.
6. Execute once as an owner/admin.
7. Save the execution result and timestamp in the release record.
8. Do not edit individual statements during execution; a partial hand-edited migration cannot be reproduced reliably.

### Option B: Supabase CLI

Only use this if the repository is linked to the correct project and the team’s migration policy permits CLI deployment:

```bash
supabase login
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db diff --linked
supabase db push
```

If the project has migrations applied outside Git, do not blindly run `db push`. First reconcile migration history and use the team’s approved baseline procedure. Never reset a production database.

### 5.1 Immediate Post-Migration Verification

Run:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'events'
  and column_name = 'guest_photo_limit';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'guest_sessions'
order by ordinal_position;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'photos'
  and column_name = 'guest_session_id';

select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       position('GUEST_UPLOAD_LIMIT_REACHED' in pg_get_functiondef(p.oid)) > 0 as contains_quota_check
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('insert_guest_photo', 'register_guest_session');

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'guest_sessions';
```

Expected results include the new column, table, photo foreign key, quota check in the function body, and no anonymous read/insert/update/delete policy on `guest_sessions`.

## 6. Cloudflare R2 Configuration

The migration does not create or modify an R2 bucket. Cloudflare must already be configured for the application’s existing presigned upload flow.

### 6.1 Verify Bucket and Credentials

1. Confirm the target bucket is the production bucket, not a development bucket.
2. Confirm the R2 access key is scoped to that bucket and required operations only.
3. Confirm the secret key is stored only in Netlify server environment variables.
4. Confirm the public host exposes only gallery/thumbnail variants, not originals.
5. Confirm `NEXT_PUBLIC_R2_PUBLIC_HOST` is the intended public variant host.

### 6.2 Verify CORS

The bucket CORS policy must allow the production application origin for browser PUT requests to presigned URLs. Prefer the exact origin rather than `*`.

Required checks:

- `https://eventphotohub.netlify.app` is present while that is the deployed origin.
- The final custom production domain is present before switching domains.
- `PUT` and required headers such as `Content-Type` are allowed.
- Exposed headers are limited to what the browser needs.
- No wildcard origin is used for a production bucket containing user photos.

Test with a disposable presigned URL from the application, not with a secret key in a browser. Confirm the browser Network panel shows no R2 secret or Supabase service-role key.

### 6.3 Optional Cloudflare Rate Limiting

The in-process rate limiter protects a single instance only. Before scaling, add a Cloudflare rule or shared rate-limit product in front of these paths:

```text
/api/guest/session
/api/upload/request-url
/api/upload/confirm
```

Start with a conservative rule for `/api/guest/session`, such as 20 requests per IP and event per minute at the application layer, and a stricter edge rule for obvious bursts. Tune using logs so a venue NAT with many legitimate guests is not blocked.

## 7. Application and Netlify Deployment

### 7.1 Configure Environment Variables

Verify the following in Netlify for the correct deploy context:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public build-time | Browser Supabase URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public build-time | Browser client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | API routes and server-side RPC calls. |
| `R2_ACCOUNT_ID` | Server-only | R2 account. |
| `R2_ACCESS_KEY_ID` | Server-only | Scoped R2 key. |
| `R2_SECRET_ACCESS_KEY` | Server-only | R2 secret. |
| `R2_BUCKET_NAME` | Server-only | Production bucket. |
| `NEXT_PUBLIC_R2_PUBLIC_HOST` | Public build-time | Gallery/thumbnail host. |
| `NEXT_PUBLIC_APP_URL` | Public build-time | QR and absolute link generation. |

After changing any `NEXT_PUBLIC_*` value, trigger a clean build. A cached build may retain the old value.

### 7.2 Deploy the Branch

Use the repository integration or the team’s approved Netlify deployment method:

1. Push the reviewed branch to the remote feature branch or merge through the approved pull request process.
2. Deploy the exact commit containing both `0012_guest_sessions.sql` compatibility and the application changes.
3. Do not deploy application code from one commit and migration-dependent code from another unrelated line.
4. Record the deployed commit SHA from Netlify.
5. Wait for the deploy to finish and inspect build logs.
6. Confirm the generated route list includes `/api/guest/session`.

The application host is Netlify; Cloudflare R2 is the storage integration. Do not attempt to deploy the Next.js application to R2.

## 8. End-to-End Verification

Use a disposable test event. Do not use a real customer event for destructive tests.

### 8.1 Session Issuance

```bash
curl -i -X POST "https://eventphotohub.netlify.app/api/guest/session" \
  -H 'content-type: application/json' \
  --data '{"eventCode":"TEST01","token":null}'
```

Expected:

- `200` for an active test event.
- A 64-character hexadecimal `sessionToken`.
- `Cache-Control: no-store`.
- No service credentials in the response.

### 8.2 Invalid and Forged Tokens

```bash
curl -i -X POST "https://eventphotohub.netlify.app/api/guest/session" \
  -H 'content-type: application/json' \
  --data '{"eventCode":"TEST01","token":"not-a-token"}'

curl -i -X POST "https://eventphotohub.netlify.app/api/guest/session" \
  -H 'content-type: application/json' \
  --data '{"eventCode":"TEST01","token":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}'
```

Expected: `400` for the malformed token and a new session or controlled error for an unknown well-shaped token. A token from Event A must never return or access Event B’s session.

### 8.3 Rate Limiting

Send 21 requests from the same source IP for the same event within one minute. Expected behavior is a `429` response with `Retry-After: 60` after the configured threshold. This test is safe only against a disposable event and should not be run as an uncontrolled loop against production.

### 8.4 Quota Enforcement

1. Obtain one valid session token.
2. Upload the permitted number of test photos.
3. Attempt one additional confirmation using the same token.
4. Clear browser localStorage and repeat session initialization.
5. Confirm the server returns the existing session count rather than resetting it.
6. Attempt a forged token and a token from another event.

The eleventh upload at a default limit of 10 must fail with the guest quota error. The application should never trust the client’s `remaining` field as an authority; it is display information only.

## 9. Rollback and Failure Handling

### 9.1 If the Application Deploy Fails

1. Stop promotion.
2. Revert Netlify to the previous known-good deploy.
3. Leave migration `0012` in place only if the previous application is confirmed compatible with the changed function signature. If it is not compatible, do not route traffic to the old app until a compatibility release is deployed.
4. Preserve logs and the failing commit SHA.

### 9.2 If the Migration Fails Before Completion

1. Record the exact SQL error.
2. Do not manually delete partial objects without reviewing dependencies.
3. Inspect which statements completed.
4. Reconcile with the live migration table and schema.
5. Prepare a forward-fix or an owner-reviewed rollback script.

### 9.3 If the Migration Succeeds but Guest Uploads Fail

Check, in order:

1. `/api/guest/session` is deployed.
2. The API’s service-role key points to the same Supabase project.
3. `register_guest_session(text,text)` exists and grants execution to `anon`.
4. `insert_guest_photo()` contains the new session-token logic.
5. The upload confirmation route sends `guestSessionToken`.
6. The R2 presigned PUT succeeds before confirmation.
7. Netlify is not serving a stale cached build.

## 10. Security Audit Result

### Token Forgery

**Result: fail-closed by design, pending live verification.** The SQL function looks up the presented token by both token value and event ID. An arbitrary 64-character token does not resolve to a session. A token from another event cannot be reused for the target event. Direct anonymous access to `guest_sessions` is blocked by RLS policies.

### Token Spraying / Unlimited Session Creation

**Finding: addressed in the branch.** The endpoint now validates token shape and applies an IP+event in-memory limit of 20 requests per minute. Responses are not cacheable. This limits accidental and basic scripted abuse, but it is not a global limit across multiple serverless instances.

### Remaining Rate-Limit Risk

**Open risk.** The shared `checkRateLimit()` implementation is process-local. Multiple Netlify function instances can each accept their own 20 requests per minute. Add Cloudflare edge rate limiting or a shared Redis-backed limiter before adversarial or high-volume production traffic.

### Audit Commands and Results

```text
npm run typecheck  PASS
npm run build      PASS
git diff --check   PASS
PostgreSQL grammar parse of 0012  PASS (17 statements)
Static migration constraint checks  PASS
```

## 11. Release Sign-Off

Do not mark the release complete until every item below is checked by the responsible owner:

- [ ] Live Supabase project and migration history confirmed.
- [ ] Backup/restore path confirmed.
- [ ] Migration `0012_guest_sessions.sql` applied once.
- [ ] Post-migration SQL verification passed.
- [ ] Matching application commit deployed.
- [ ] Netlify build variables verified.
- [ ] Cloudflare R2 bucket and CORS verified.
- [ ] Session issuance test passed.
- [ ] Malformed and forged token tests passed.
- [ ] Rate-limit test passed.
- [ ] Per-guest quota and localStorage-reset test passed.
- [ ] Event-wide quota and closed-event tests passed.
- [ ] Logs reviewed and no secrets exposed.
- [ ] Release owner recorded commit SHA, migration timestamp, and rollback decision.

**Release owner:** ____________________  
**Supabase project:** ____________________  
**Netlify deploy URL:** ____________________  
**Application commit:** ____________________  
**Migration applied at:** ____________________  
**Approved by:** ____________________  
**Date:** ____________________
