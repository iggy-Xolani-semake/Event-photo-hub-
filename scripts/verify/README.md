# Database verification harnesses

These run the real migrations against a real Postgres engine
([PGlite](https://pglite.dev) — Postgres compiled to WASM, no server needed)
and then attack the result. They exist because reading a migration does not
tell you whether its triggers fire: the paywall trigger in `0006` once
evaluated its bypass flag to `NULL` instead of `false`, which silently
disabled every guard inside it, and only an attack found that.

```
npm run verify:db
```

| harness | what it proves |
| --- | --- |
| `test_idem.mjs` | 0001–0006 apply, 0006 applies **three times** without error, and the paywall holds: an owner cannot unlock their own downloads, swap to a bigger tier, raise a limit past their package, insert a payment row, or call `mark_event_paid()`. |
| `test_collab.mjs` | The collaborator role from `0010` can edit the event it is assigned to and nothing else — no self-unlock, no tier swap, no limit raise, no unassigning itself, no access to other events. |
| `test_privileges.mjs` | Reproduces the exploit that let **any signed-in user unlock any event's downloads for free**, applies `0011_lock_service_functions.sql`, then proves the exploit is refused while staff and event owners keep their legitimate paths. Mirrors Supabase's own grants, because `revoke ... from public` leaves a privilege that was granted to `anon`/`authenticated` *by name* — which is exactly how the hole survived into a live project. |
| `test_guest_sessions.mjs` | The per-guest upload quota from `0012_guest_sessions.sql`: anon gets a session with no account, the 11th upload is refused, re-arriving keeps the same counter, a token cannot cross events, a forged token is refused, the browser cannot read or reset its own counter, and the legacy `uploader_identifier` argument no longer compiles. |
| `test0005.mjs` | Client self-service: owner-scoped RLS, anon sees no events, limit ranges enforced, ownership immutable. |
| `test0006.mjs` | The Sprint 3 assertions on their own, without the re-run checks. |

Notes for whoever extends these:

- **A 0-row `UPDATE` raises no error.** Asserting "no error" after an update
  that RLS filtered to nothing proves nothing — check whether the row changed.
- **Select every column you later reference.** A missing column in a test's
  `select` surfaces as a confusing downstream failure.
- PGlite ships no `pgcrypto`; the harnesses substitute that one `create
  extension` line in memory. Never edit the migration to work around it.
- The shim grants Supabase's default role privileges, including a
  `service_role` with `bypassrls`, so service-role code paths behave as they do
  in production.
