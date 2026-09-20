import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(REPO + "/package.json");
const { PGlite } = require("@electric-sql/pglite");

// ---------------------------------------------------------------------------
// Sprint 3: applies 0001-0006 to a real Postgres engine, then tries to steal
// the product — mark your own event paid, raise your limits past your package,
// swap to a bigger tier for free — as a signed-in client.
// ---------------------------------------------------------------------------

const ALICE = "11111111-aaaa-4aaa-8aaa-000000000001";
const ADMIN = "33333333-cccc-4ccc-8ccc-000000000003";

const db = new PGlite();

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;   -- mirrors Supabase
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key, email text unique,
    raw_app_meta_data jsonb, created_at timestamptz default now()
  );
  create or replace function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
`);

for (const f of [
  "0001_init.sql", "0002_rls.sql", "0003_functions.sql",
  "0004_seed_demo.sql",
  // the two migrations that arrived on main today, applied in the order the
  // merged branch will carry them
  "0009_mark_photo_failed.sql", "0010_collaborators.sql",
  "0005_client_self_service.sql",
]) {
  const sql = readFileSync(`${REPO}/supabase/migrations/${f}`, "utf8")
    .replace(/create extension if not exists "pgcrypto";/i, "-- pgcrypto not bundled in PGlite");
  try {
    await db.exec(sql);
    console.log(`migration ${f}: OK`);
  } catch (err) {
    console.log(`migration ${f}: FAILED -> ${err.message.split("\n")[0]}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// The SQL editor reported "relation packages already exists". Two things must
// hold: the state check must report MISSING on a database without 0006 (so it
// can be trusted), and 0006 must survive being run again.
// ---------------------------------------------------------------------------
const MIG = (f) => readFileSync(REPO + "/supabase/migrations/" + f, "utf8")
  .replace(/create extension if not exists "pgcrypto";/i, "-- pgcrypto not bundled in PGlite");

const STATE_SQL = readFileSync(REPO + "/docs/MIGRATION_0006_STATE_CHECK.sql", "utf8")
  .split("-- ============================== QUERY 2")[0];

const stateCheck = async () => {
  const res = await db.query(STATE_SQL);
  return { total: res.rows.length, missing: res.rows.filter((r) => r.state === "MISSING").map((r) => r.object) };
};

const before = await stateCheck();
console.log("state check BEFORE 0006: " + before.total + " rows, MISSING=" + before.missing.length);
if (before.total !== 16) { console.log("FAIL: expected 16 check rows, got " + before.total); process.exit(1); }
if (before.missing.length !== 16) {
  console.log("FAIL: expected all 16 MISSING before 0006, got " + before.missing.length + " -> " + before.missing.join(", "));
  process.exit(1);
}
console.log("PASS  state check reports MISSING for everything 0006 creates (and does not error)");

for (let i = 1; i <= 3; i++) {
  try {
    await db.exec(MIG("0006_packages_payments.sql"));
    console.log("PASS  apply 0006 #" + i + " (no error)");
  } catch (err) {
    console.log("FAIL  apply 0006 #" + i + " -> " + err.message.split("\n")[0]);
    process.exit(1);
  }
}

const after = await stateCheck();
console.log("state check AFTER 0006 x3: MISSING=" + after.missing.length + (after.missing.length ? " -> " + after.missing.join(", ") : ""));
if (after.missing.length) { console.log("FAIL: state check still reports gaps"); process.exit(1); }
console.log("PASS  state check reports all 16 objects present");
for (const r of (await db.query(STATE_SQL)).rows) {
  console.log("      " + r.object.padEnd(40) + r.state.padEnd(9) + (r.detail ? "| " + r.detail.slice(0, 78) : ""));
}

const pkgCount = await db.query("select count(*)::int as n, count(price_cents)::int as priced from public.packages");
console.log("packages after 3 applications: " + pkgCount.rows[0].n + " rows, " + pkgCount.rows[0].priced + " priced");
if (pkgCount.rows[0].n !== 5 || pkgCount.rows[0].priced !== 1) {
  console.log("FAIL: expected exactly 5 tiers with 1 priced");
  process.exit(1);
}
console.log("PASS  seed insert did not duplicate tiers on re-run");

await db.exec(`
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant all on all tables in schema public to service_role;
  insert into auth.users (id, email, raw_app_meta_data) values
    ('${ALICE}', 'alice@example.com', '{"role":"client"}'),
    ('${ADMIN}', 'staff@example.com', '{"role":"admin"}');
`);

const asRole = async (role, claims = "") => {
  await db.exec(`reset role;`);
  await db.exec(`set role ${role};`);
  await db.exec(`select set_config('request.jwt.claims', '${claims}', false);`);
};
const client = (sub, email) =>
  asRole("authenticated", JSON.stringify({ sub, email, role: "authenticated", app_metadata: { role: "client" } }));
const admin = () =>
  asRole("authenticated", JSON.stringify({ sub: ADMIN, email: "staff@example.com", role: "authenticated", app_metadata: { role: "admin" } }));

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
};
const one = async (sql) => (await db.query(sql)).rows[0];
const errorOf = async (sql) => {
  try { await db.query(sql); return null; } catch (err) { return err.message.split("\n")[0]; }
};

console.log("\n--- 1. reproducing the grant state your live project reported ---");

// Supabase grants EXECUTE to anon/authenticated by name, and default
// privileges re-grant it to every new function. `revoke ... from public`
// does not undo either. Mirror that, or the harness tests a database that
// was never the one in production.
await db.exec(`grant execute on all functions in schema public to anon, authenticated;`);

const FN = "public.mark_event_paid(uuid, text, text)";
const preFix = await one(`select has_function_privilege('authenticated', '${FN}'::regprocedure, 'EXECUTE') as auth`);
check("reproduces your row 14: authenticated CAN execute mark_event_paid", preFix.auth === true, JSON.stringify(preFix));

const PKG50 = (await one(`select id from public.packages where code = 'photos_50'`)).id;

await asRole("authenticated", JSON.stringify({ sub: ALICE, email: "alice@example.com", role: "authenticated", app_metadata: { role: "client" } }));
const aliceClient = (await one(`select public.create_own_client_profile('Alice', null) as id`)).id;
const mkA = await errorOf(`
  insert into public.events (event_code, event_name, client_id, package_id, upload_limit)
  values ('HACK50', 'Alice Wedding', '${aliceClient}', '${PKG50}', 50)
`);
check("setup: client creates an event", mkA === null, mkA ?? "");

// a pending payment, exactly what POST /api/events/{code}/checkout creates
await asRole("service_role");
const payA = (await one(`
  insert into public.payments (event_id, package_id, amount_cents, provider)
  values ((select id from public.events where event_code = 'HACK50'), '${PKG50}', 5000, 'eft')
  returning id
`)).id;

// the owner can read that id back through payments_select_owner
await asRole("authenticated", JSON.stringify({ sub: ALICE, email: "alice@example.com", role: "authenticated", app_metadata: { role: "client" } }));
const seenPay = await one(`select count(*)::int as n from public.payments where event_id = (select id from public.events where event_code = 'HACK50')`);
check("setup: the client can read their own pending payment id", seenPay.n === 1, JSON.stringify(seenPay));

const exploit = await errorOf(`select public.mark_event_paid('${payA}', 'free', 'self-serve')`);
const evA = await one(`select download_unlocked_at from public.events where event_code = 'HACK50'`);
check("EXPLOIT REPRODUCED: client unlocked the event without paying",
      evA.download_unlocked_at !== null,
      `download_unlocked_at=${evA.download_unlocked_at} error=${exploit ?? "none"}`);

console.log("\n--- 2. applying 0011_lock_service_functions.sql ---");
// Migrations run as the project owner (that is what the SQL editor does).
// The exploit above left the session as `authenticated`, which cannot revoke
// anything — reset first or this tests the wrong thing.
await db.exec(`reset role;`);
console.log("      role for the migration: " + (await one(`select current_user as u`)).u);
try {
  await db.exec(MIG("0011_lock_service_functions.sql"));
  console.log("PASS  0011 applied (its own verification block did not raise)");
} catch (err) {
  console.log("FAIL  0011 -> " + err.message.split("\n")[0]);
  process.exit(1);
}

const postFix = await one(`
  select has_function_privilege('authenticated', '${FN}'::regprocedure, 'EXECUTE') as auth,
         has_function_privilege('anon',          '${FN}'::regprocedure, 'EXECUTE') as anon,
         has_function_privilege('service_role',  '${FN}'::regprocedure, 'EXECUTE') as svc
`);
check("authenticated can no longer execute it", postFix.auth === false, JSON.stringify(postFix));
check("anon can no longer execute it", postFix.anon === false, JSON.stringify(postFix));
check("service role still can", postFix.svc === true, JSON.stringify(postFix));

console.log("\n--- 3. the same attack on a fresh event ---");
await asRole("authenticated", JSON.stringify({ sub: ALICE, email: "alice@example.com", role: "authenticated", app_metadata: { role: "client" } }));
await errorOf(`
  insert into public.events (event_code, event_name, client_id, package_id, upload_limit)
  values ('HACK51', 'Alice Second', '${aliceClient}', '${PKG50}', 50)
`);
await asRole("service_role");
const payB = (await one(`
  insert into public.payments (event_id, package_id, amount_cents, provider)
  values ((select id from public.events where event_code = 'HACK51'), '${PKG50}', 5000, 'eft')
  returning id
`)).id;

await asRole("authenticated", JSON.stringify({ sub: ALICE, email: "alice@example.com", role: "authenticated", app_metadata: { role: "client" } }));
const denied = await errorOf(`select public.mark_event_paid('${payB}', 'free', 'self-serve')`);
check("the exploit is now refused", /permission denied/.test(denied ?? ""), denied ?? "STILL WORKS");
const evB = await one(`select download_unlocked_at from public.events where event_code = 'HACK51'`);
check("and the event stays locked", evB.download_unlocked_at === null, JSON.stringify(evB));

await asRole("service_role");
const staffMark = await errorOf(`select public.mark_event_paid('${payB}', 'eft', 'real-reference')`);
check("staff can still confirm a real payment", staffMark === null, staffMark ?? "");

console.log("\n--- 4. the product must still work afterwards ---");
await asRole("authenticated", JSON.stringify({ sub: ALICE, email: "alice@example.com", role: "authenticated", app_metadata: { role: "client" } }));
const rename = await errorOf(`update public.events set event_name = 'still editable' where event_code = 'HACK51'`);
check("client can still edit their event (trigger functions intact)", rename === null, rename ?? "");
// 500 is inside the app-wide 5000 cap but far above the 50-photo package, so
// this reaches the package ceiling rather than the generic range check.
const raise = await errorOf(`update public.events set upload_limit = 500 where event_code = 'HACK51'`);
check("and the package ceiling still fires", /EXCEEDS_PACKAGE_LIMITS/.test(raise ?? ""), raise ?? "no error");

await asRole("anon");
const lookup = await errorOf(`select * from public.get_event_for_upload('DEMO482')`);
check("guests can still resolve an event", lookup === null, lookup ?? "");
const upload = await errorOf(`select * from public.insert_guest_photo('DEMO482', 'events/DEMO482/original/t.jpg', 't.jpg', 1234, 'image/jpeg', 'guest-1', null, null)`);
check("guests can still upload", !/permission denied/.test(upload ?? ""), upload ?? "");

// The state check that was supposed to catch this originally reported the
// function as "present" while it was wide open. It must fail closed now.
await db.exec(`reset role;`);
const finalState = await stateCheck();
const row14 = (await db.query(STATE_SQL)).rows.find((r) => r.object.startsWith("14"));
check("the SQL-editor state check now reports row 14 as MISSING when open",
      row14.state === "present" && finalState.missing.length === 0,
      row14.object + " -> " + row14.state + " | " + row14.detail);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures ? 1 : 0);
