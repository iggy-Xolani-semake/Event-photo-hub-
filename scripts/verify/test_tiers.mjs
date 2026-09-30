import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(REPO + "/package.json");
const { PGlite } = require("@electric-sql/pglite");

// ---------------------------------------------------------------------------
// The shutaMzala tier rollout: Free / Party Pack / Event Pack.
//
// 0024 replaces the legacy package catalogue with three tiers, 0025 makes the
// entitlements binding at the database boundary and adds the download quota,
// 0026 fixes the expiry a *new* event is given, and 0027 raises the app-wide
// photo ceiling so the top tier can actually be delivered.
//
// The tier migrations shipped with no harness of their own, so nothing was
// attacking them. This runs the real chain on a real Postgres engine, on a
// database deliberately left in the state production was in before the rollout
// (events still pointing at legacy packages), and asserts:
//
//   * the catalogue is what the pricing page promises,
//   * legacy events are repointed onto real tiers and no event is left on a
//     package that is no longer for sale,
//   * re-running the migrations changes nothing (they are the last thing an
//     operator runs, and they get re-run),
//   * every tier can be created at its own advertised allowance,
//   * an event cannot hold a limit above its package — on any of the four
//     limit columns, or by naming a package that does not exist,
//   * a new event's gallery expiry comes from its package's retention, which
//     is the entitlement the 30-day column default used to silently overwrite,
//   * the download quota is enforced, is refused on an expired gallery, is
//     never partially spent by a refused claim, and cannot be called by anon
//     or a signed-in client at all.
// ---------------------------------------------------------------------------

const HOST = "99999999-eeee-4eee-8eee-000000000009";

const db = new PGlite();

// Supabase provides these; vanilla Postgres does not.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key, email text unique,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    created_at timestamptz default now()
  );
  create or replace function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
`);

const MIG = (f) =>
  readFileSync(`${REPO}/supabase/migrations/${f}`, "utf8").replace(
    /create extension if not exists "pgcrypto";/i,
    "-- pgcrypto not bundled in PGlite"
  );

// Migrations are multi-statement, so they go through exec(), not query().
const apply = async (f) => {
  try {
    await db.exec(MIG(f));
    console.log(`migration ${f}: OK`);
    return null;
  } catch (err) {
    return err.message.split("\n")[0];
  }
};

// Everything up to, but not including, the tier rollout.
for (const f of [
  "0001_init.sql",
  "0002_rls.sql",
  "0003_functions.sql",
  "0004_seed_demo.sql",
  "0005_client_self_service.sql",
  "0006_packages_payments.sql",
  "0009_mark_photo_failed.sql",
  "0010_collaborators.sql",
  "0011_lock_service_functions.sql",
  "0012_guest_sessions.sql",
  "0013_distributed_rate_limits.sql",
  "0017_curator_self_service_signup.sql",
  "0018_lock_client_profile_rpc.sql",
  "0019_event_retention_and_v1_limits.sql",
  "0020_repair_host_signup_trigger.sql",
  "0021_customer_expiry_reminders.sql",
  "0022_admin_email_allowlist.sql",
  "0023_client_profile_updates.sql",
]) {
  const err = await apply(f);
  if (err) {
    console.log(`migration ${f}: FAILED -> ${err}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Put the database in the state the rollout has to survive: real events
// already pointing at legacy packages, plus one that never got a package.
// This is what production looked like, and it is the only way to exercise the
// repointing UPDATE in 0024 rather than just reading it.
// ---------------------------------------------------------------------------
await db.exec(`
  insert into public.clients (id, name, email)
  values ('${HOST}', 'Legacy Host', 'legacy@example.com');

  -- A bespoke tier that is not in the replacement catalogue and whose photo
  -- count lands between Free and Party Pack, so the repointing CASE has to
  -- pick the middle branch. (No shipped legacy tier sits in that band.)
  insert into public.packages (code, name, photo_limit, max_file_size_bytes, max_files_per_upload, price_cents, sort_order)
  values ('legacy_150', 'Legacy 150', 150, 15728640, 10, 9900, 9);

  insert into public.events
    (event_code, event_name, client_id, package_id, upload_limit, max_file_size_bytes,
     max_files_per_upload, guest_photo_limit, visibility, created_at)
  select 'LEG050', 'Legacy 50', '${HOST}', p.id, p.photo_limit, p.max_file_size_bytes,
         p.max_files_per_upload, 10, 'shared', now() - interval '20 days'
  from public.packages p where p.code = 'photos_50';

  insert into public.events
    (event_code, event_name, client_id, package_id, upload_limit, max_file_size_bytes,
     max_files_per_upload, guest_photo_limit, visibility, created_at)
  select 'LEG150', 'Legacy 150', '${HOST}', p.id, p.photo_limit, p.max_file_size_bytes,
         p.max_files_per_upload, 10, 'shared', now() - interval '20 days'
  from public.packages p where p.code = 'legacy_150';

  insert into public.events
    (event_code, event_name, client_id, package_id, upload_limit, max_file_size_bytes,
     max_files_per_upload, guest_photo_limit, visibility, created_at)
  select 'LEG500', 'Legacy 500', '${HOST}', p.id, p.photo_limit, p.max_file_size_bytes,
         p.max_files_per_upload, 10, 'shared', now() - interval '20 days'
  from public.packages p where p.code = 'photos_500';

  insert into public.events
    (event_code, event_name, client_id, upload_limit, max_file_size_bytes,
     max_files_per_upload, guest_photo_limit, visibility, created_at)
  values ('LEGNONE', 'Legacy No Package', '${HOST}', 500, 15728640, 10, 10, 'shared',
          now() - interval '20 days');
`);

// ---------------------------------------------------------------------------
// The rollout itself.
// ---------------------------------------------------------------------------
const ROLLOUT = [
  "0024_shutamzala_tiers.sql",
  "0025_tier_enforcement.sql",
  "0026_tier_retention_on_insert.sql",
  "0027_event_ceiling_matches_top_tier.sql",
];
for (const f of ROLLOUT) {
  const err = await apply(f);
  if (err) {
    console.log(`migration ${f}: FAILED -> ${err}`);
    process.exit(1);
  }
}

// What a real Supabase project grants by default.
await db.exec(`
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  -- service_role bypasses RLS, but it still needs the table privileges, and
  -- the harness reads counters back through it the way the API routes do.
  grant select, insert, update, delete on all tables in schema public to service_role;
  alter role service_role bypassrls;
`);

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
};
const note = (text) => console.log(`NOTE  ${text}`);
const scalar = async (sql) => (await db.query(sql)).rows[0];
const errorOf = async (sql) => {
  try {
    await db.query(sql);
    return null;
  } catch (err) {
    return err.message.split("\n")[0];
  }
};
const asRole = async (role) => {
  await db.exec(`reset role;`);
  await db.exec(`set role ${role};`);
};

// ---------------------------------------------------------------------------
console.log("\n--- the catalogue is what the pricing page promises ---");
const tiers = (await db.query(
  `select code, photo_limit, download_limit, guest_photo_limit, retention_days,
          price_cents, currency, sort_order
   from public.packages where is_active order by sort_order`
)).rows;

const expected = [
  { code: "free", photo_limit: 100, download_limit: 10, guest_photo_limit: 10, retention_days: 7, price_cents: 0 },
  { code: "party_pack", photo_limit: 240, download_limit: 100, guest_photo_limit: 20, retention_days: 60, price_cents: 5999 },
  { code: "event_pack", photo_limit: 1000, download_limit: 500, guest_photo_limit: 30, retention_days: 120, price_cents: 14999 },
];
check("exactly three tiers are for sale", tiers.length === 3, tiers.map((t) => t.code).join(", "));
for (const want of expected) {
  const got = tiers.find((t) => t.code === want.code);
  const same = got && Object.keys(want).every((k) => got[k] === want[k]);
  check(
    `${want.code} carries its documented entitlements`,
    Boolean(same),
    got ? JSON.stringify(got) : "missing"
  );
}
check(
  "every tier is priced in ZAR (a NULL price would block checkout by design)",
  tiers.every((t) => t.currency === "ZAR" && t.price_cents !== null),
  tiers.map((t) => `${t.code}=${t.price_cents}`).join(" ")
);

const stale = await scalar(
  `select count(*)::int as n from public.packages
   where is_active and code not in ('free','party_pack','event_pack')`
);
check("no legacy package is still on sale", stale.n === 0, `${stale.n} left active`);

const oversized = await scalar(
  `select count(*)::int as n from public.packages where is_active and max_file_size_bytes > 15728640`
);
check("no sellable package promises more than the 15 MB ceiling", oversized.n === 0, `${oversized.n} oversized`);

// ---------------------------------------------------------------------------
console.log("\n--- legacy events are repointed onto real tiers ---");
const pkgOf = async (code) =>
  (await scalar(
    `select p.code as pkg from public.events e left join public.packages p on p.id = e.package_id
     where e.event_code = '${code}'`
  )).pkg;

const onFree = await pkgOf("LEG050");
const onParty = await pkgOf("LEG150");
const onEvent = await pkgOf("LEG500");
check("an event on the 50-photo tier lands on Free", onFree === "free", onFree);
check("an event on a 150-photo tier lands on Party Pack", onParty === "party_pack", onParty);
check("an event on the 500-photo tier lands on Event Pack", onEvent === "event_pack", onEvent);
check("the legacy package it came from is no longer for sale",
  (await scalar(`select is_active from public.packages where code='photos_500'`)).is_active === false);

const stranded = await scalar(
  `select count(*)::int as n from public.events e
   join public.packages p on p.id = e.package_id
   where not p.is_active`
);
check("no event is left sitting on a withdrawn package", stranded.n === 0, `${stranded.n} stranded`);

const nullPkg = await scalar(`select count(*)::int as n from public.events where package_id is null`);
note(`${nullPkg.n} event(s) have no package at all — clamped to Free limits, and unable to claim a download (see the quota section)`);

// ---------------------------------------------------------------------------
console.log("\n--- re-running the rollout changes nothing ---");
const pkgCountBefore = (await scalar(`select count(*)::int as n from public.packages`)).n;
for (const f of [...ROLLOUT, ...ROLLOUT]) {
  const err = await apply(f);
  if (err) check(`re-running ${f}`, false, err);
}
const pkgCountAfter = (await scalar(`select count(*)::int as n from public.packages`)).n;
check("re-running every tier migration succeeds", true);
check("and does not duplicate the catalogue", pkgCountBefore === pkgCountAfter, `${pkgCountBefore} -> ${pkgCountAfter}`);
check("and does not move an event off its tier", (await pkgOf("LEG150")) === "party_pack", await pkgOf("LEG150"));

// ---------------------------------------------------------------------------
console.log("\n--- every tier can be created at its own allowance ---");
const mkEvent = async (code, pkgCode) => {
  const sub = (col) => (pkgCode
    ? `(select ${col} from public.packages where code='${pkgCode}')`
    : null);
  try {
    await db.exec(
      `insert into public.events
         (event_code, event_name, client_id, package_id, upload_limit, max_file_size_bytes,
          max_files_per_upload, guest_photo_limit, visibility)
       values ('${code}', '${code}', '${HOST}', ${pkgCode ? sub("id") : "null"},
          ${pkgCode ? sub("photo_limit") : "100"}, ${pkgCode ? sub("max_file_size_bytes") : "15728640"},
          ${pkgCode ? sub("max_files_per_upload") : "10"}, ${pkgCode ? sub("guest_photo_limit") : "10"}, 'shared')`
    );
    return null;
  } catch (err) {
    // A tier that cannot be provisioned must show up as a failed check, not as
    // a stack trace that hides every assertion after it.
    return err.message.split("\n")[0];
  }
};

// A stand-in for a future tier that accepts smaller files than the app-wide
// ceiling. Every shipped tier shares the 15 MB ceiling, so without this the
// package-level file check can never be the thing that fires, and the branch
// that enforces it would never be executed by anything.
await db.exec(`
  insert into public.packages
    (code, name, photo_limit, max_file_size_bytes, max_files_per_upload, price_cents,
     currency, is_active, sort_order, download_limit, guest_photo_limit, retention_days)
  values ('probe_small_files', 'Probe (5 MB files, 5 per upload)', 200, 5242880, 5, null, 'ZAR', false, 99, 10, 10, 7);
`);

const created = {};
for (const [code, pkg] of [
  ["NEWFREE", "free"],
  ["NEWPARTY", "party_pack"],
  ["NEWEVENT", "event_pack"],
  ["NEWNONE", null],
  ["PROBEFILE", "probe_small_files"],
]) {
  created[code] = await mkEvent(code, pkg);
}
const failedCreates = Object.entries(created).filter(([, err]) => err);
check(
  "every tier can be created at its own advertised allowance",
  failedCreates.length === 0,
  failedCreates.map(([code, err]) => `${code}: ${err}`).join("; ") || "all created"
);

const allowance = async (code) => {
  const row = await scalar(`select upload_limit from public.events where event_code='${code}'`);
  return row ? row.upload_limit : null;
};
const eventPackAllowance = await allowance("NEWEVENT");
check(
  "an Event Pack event can hold the 1000 photos the tier sells",
  eventPackAllowance === 1000,
  `upload_limit=${eventPackAllowance}`
);
const freeAllowance = await allowance("NEWFREE");
check("a Free event is provisioned at the Free allowance", freeAllowance === 100, `upload_limit=${freeAllowance}`);
const partyAllowance = await allowance("NEWPARTY");
check("a Party Pack event is provisioned at its own allowance", partyAllowance === 240, `upload_limit=${partyAllowance}`);

// ---------------------------------------------------------------------------
console.log("\n--- an event cannot hold a limit above its package ---");
// NEWFREE is on Free: 100 photos, 15 MB, 10 guest photos, 10 per batch.
const over = await errorOf(`update public.events set upload_limit = 101 where event_code = 'NEWFREE'`);
check("raising the photo limit past the package is refused", /PACKAGE_PHOTO_LIMIT_EXCEEDED/.test(over ?? ""), over ?? "accepted");

const overGuest = await errorOf(`update public.events set guest_photo_limit = 11 where event_code = 'NEWFREE'`);
check("raising the per-guest quota past the package is refused", /PACKAGE_GUEST_LIMIT_EXCEEDED/.test(overGuest ?? ""), overGuest ?? "accepted");

// PROBEFILE is on the probe tier: 5 MB files and 5 per upload, both below the
// app-wide ceilings, so the package-level check is the one that has to fire.
const bigFile = await errorOf(`update public.events set max_file_size_bytes = 6291456 where event_code = 'PROBEFILE'`);
check("raising the file ceiling past the package is refused", /PACKAGE_FILE_SIZE_EXCEEDED/.test(bigFile ?? ""), bigFile ?? "accepted");

const overBatch = await errorOf(`update public.events set max_files_per_upload = 6 where event_code = 'PROBEFILE'`);
check("raising the per-upload batch past the package is refused", /PACKAGE_BATCH_LIMIT_EXCEEDED/.test(overBatch ?? ""), overBatch ?? "accepted");

const noSuchPackage = await errorOf(
  `update public.events set package_id = '00000000-0000-4000-8000-0000000000ff' where event_code = 'LEG500'`
);
check("pointing an event at a package that does not exist is refused", /PACKAGE_NOT_FOUND/.test(noSuchPackage ?? ""), noSuchPackage ?? "accepted");

// The app-wide ceilings sit above every shipped tier, so they only ever fire on
// a value no tier could justify — and they must still fire.
const absurd = await errorOf(`update public.events set upload_limit = 100000 where event_code = 'NEWFREE'`);
check("the app-wide ceiling still rejects an absurd photo count", /UPLOAD_LIMIT_OUT_OF_RANGE/.test(absurd ?? ""), absurd ?? "accepted");

const absurdBatch = await errorOf(`update public.events set max_files_per_upload = 11 where event_code = 'NEWFREE'`);
check("the app-wide per-upload ceiling still holds", /FILES_PER_UPLOAD_OUT_OF_RANGE/.test(absurdBatch ?? ""), absurdBatch ?? "accepted");

const absurdGuest = await errorOf(`update public.events set guest_photo_limit = 51 where event_code = 'NEWFREE'`);
check("the app-wide per-guest ceiling still holds", /GUEST_LIMIT_OUT_OF_RANGE/.test(absurdGuest ?? ""), absurdGuest ?? "accepted");

const absurdFile = await errorOf(`update public.events set max_file_size_bytes = 16777216 where event_code = 'NEWFREE'`);
check("the app-wide file ceiling still holds", /FILE_SIZE_OUT_OF_RANGE/.test(absurdFile ?? ""), absurdFile ?? "accepted");

// None of the refused writes may have landed.
const untouched = await scalar(
  `select upload_limit, max_file_size_bytes, guest_photo_limit, max_files_per_upload
   from public.events where event_code = 'NEWFREE'`
);
check(
  "a refused limit change leaves the row exactly as it was",
  untouched.upload_limit === 100 &&
    untouched.max_file_size_bytes === 15728640 &&
    untouched.guest_photo_limit === 10 &&
    untouched.max_files_per_upload === 10,
  JSON.stringify(untouched)
);

// The legitimate edits a host actually makes must still work.
const rename = await errorOf(`update public.events set event_name = 'Legacy 500 renamed' where event_code = 'LEG500'`);
check("renaming an event still works", rename === null, rename ?? "");
const lower = await errorOf(`update public.events set upload_limit = 400 where event_code = 'LEG500'`);
check("lowering your own photo limit still works", lower === null, lower ?? "");

// ---------------------------------------------------------------------------
console.log("\n--- a new event's expiry comes from its package's retention ---");
// This is the entitlement the 30-day column default from 0019 used to swallow:
// coalesce() saw a value that was already there and kept it, so every tier
// expired in 30 days. The app passes no gallery_expires_at of its own, so the
// database has to get this right.
const expiryIs = async (code, days) => {
  const row = await scalar(
    `select (gallery_expires_at = created_at + interval '${days} days') as ok,
            (gallery_expires_at - created_at) as span
     from public.events where event_code = '${code}'`
  );
  return row ? { ok: row.ok, span: row.span } : { ok: false, span: "event was never created" };
};

const free = await expiryIs("NEWFREE", 7);
check("a new Free gallery expires 7 days after it is created", free.ok, String(free.span));
const party = await expiryIs("NEWPARTY", 60);
check("a new Party Pack gallery expires 60 days after it is created", party.ok, String(party.span));
const event = await expiryIs("NEWEVENT", 120);
check("a new Event Pack gallery expires 120 days after it is created", event.ok, String(event.span));
const none = await expiryIs("NEWNONE", 7);
check("an event created with no package gets the conservative 7 days", none.ok, String(none.span));

// A tier change has to move the expiry to the new package's retention.
await db.exec(`select set_config('eph.allow_commercial_write','on',false)`);
await db.query(`update public.events set package_id = (select id from public.packages where code='event_pack') where event_code='NEWPARTY'`);
await db.exec(`select set_config('eph.allow_commercial_write','off',false)`);
const moved = await expiryIs("NEWPARTY", 120);
check("switching a gallery to Event Pack re-derives its expiry", moved.ok, String(moved.span));

// ---------------------------------------------------------------------------
console.log("\n--- the download quota ---");
const idOf = async (code) => {
  const row = await scalar(`select id::text from public.events where event_code='${code}'`);
  return row ? `'${row.id}'` : "null";
};
const countOf = async (code) => {
  const row = await scalar(`select download_count from public.events where event_code='${code}'`);
  return row ? row.download_count : null;
};

const freeId = await idOf("NEWFREE");
const eventId = await idOf("NEWEVENT");

await asRole("service_role");
const whole = await scalar(`select public.claim_event_downloads(${freeId}, 10) as ok`);
check("service_role can spend a Free gallery's whole 10-download allowance", whole.ok === true, String(whole.ok));
check("and the counter records exactly what was spent", (await countOf("NEWFREE")) === 10, String(await countOf("NEWFREE")));

const eleventh = await scalar(`select public.claim_event_downloads(${freeId}, 1) as ok`);
check("the 11th download on Free is refused", eleventh.ok === false, String(eleventh.ok));
check("a refused claim spends nothing", (await countOf("NEWFREE")) === 10, String(await countOf("NEWFREE")));

const tooManyAtOnce = await scalar(`select public.claim_event_downloads(${eventId}, 501) as ok`);
check("a claim larger than the whole allowance is refused", tooManyAtOnce.ok === false, String(tooManyAtOnce.ok));
check("and it too spends nothing", (await countOf("NEWEVENT")) === 0, String(await countOf("NEWEVENT")));

const partial = await scalar(`select public.claim_event_downloads(${eventId}, 500) as ok`);
check("Event Pack can spend its 500 downloads", partial.ok === true, String(partial.ok));
check("the Event Pack counter is exact", (await countOf("NEWEVENT")) === 500, String(await countOf("NEWEVENT")));

// An expired gallery is refused even with quota left on the clock.
await db.query(`update public.events set gallery_expires_at = now() - interval '1 day' where event_code = 'NEWEVENT'`);
const expired = await scalar(`select public.claim_event_downloads(${eventId}, 1) as ok`);
check("an expired gallery refuses a download even with quota left", expired.ok === false, String(expired.ok));

// An event with no package has no package row to count against, so the join
// inside claim_event_downloads can never match and the claim is always refused.
const noneId = await idOf("NEWNONE");
const noPkg = await scalar(`select public.claim_event_downloads(${noneId}, 1) as ok`);
note(`an event with no package can never claim a download (got ${noPkg.ok}) — the quota join finds no package row, so its owner is entitled but blocked`);

// ---------------------------------------------------------------------------
console.log("\n--- the quota functions are not reachable by a browser ---");
await asRole("anon");
const anonClaim = await errorOf(`select public.claim_event_downloads(${freeId}, 1)`);
check("anon cannot claim downloads", /permission denied/i.test(anonClaim ?? ""), anonClaim ?? "anon succeeded!");

await asRole("authenticated");
await db.exec(`select set_config('request.jwt.claims', '{"sub":"${HOST}","role":"authenticated"}', false);`);
const clientClaim = await errorOf(`select public.claim_event_downloads(${freeId}, 1)`);
check("a signed-in client cannot claim downloads either", /permission denied/i.test(clientClaim ?? ""), clientClaim ?? "client succeeded!");

// ---------------------------------------------------------------------------
console.log("\n--- expired galleries are findable for cleanup ---");
await asRole("service_role");
const expiredIds = (await db.query(`select public.expired_gallery_event_ids() as id`)).rows.map((r) => r.id);
check("the expired-gallery list is not empty after the backfill", expiredIds.length > 0, `${expiredIds.length} expired`);
const expiredInDb = await scalar(`select count(*)::int as n from public.events where gallery_expires_at <= now()`);
check(
  "and it lists exactly the events that have expired — no more, no fewer",
  expiredIds.length === expiredInDb.n,
  `${expiredIds.length} returned vs ${expiredInDb.n} expired`
);

await asRole("anon");
const anonExpired = await errorOf(`select public.expired_gallery_event_ids()`);
check("anon cannot enumerate expired galleries", /permission denied/i.test(anonExpired ?? ""), anonExpired ?? "anon succeeded!");

await asRole("authenticated");
const clientExpired = await errorOf(`select public.expired_gallery_event_ids()`);
check("a signed-in client cannot enumerate them either", /permission denied/i.test(clientExpired ?? ""), clientExpired ?? "client succeeded!");

await db.exec(`reset role;`);
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
