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
  "0011_lock_service_functions.sql", "0012_guest_sessions.sql",
  "0013_distributed_rate_limits.sql",
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

console.log("\n--- a guest arrives ---");
await asRole("anon");

const reg = await one(`select * from public.register_guest_session('DEMO482')`);
check("anon can register a session with no account", Boolean(reg.session_token), JSON.stringify(reg));
check("the token is opaque and long", (reg.session_token ?? "").length >= 48, `len=${(reg.session_token ?? "").length}`);
check("it starts at 0 of 10", reg.upload_count === 0 && reg.guest_photo_limit === 10, JSON.stringify(reg));

const shoot = async (token, n, code = "DEMO482") => {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(await errorOf(`select * from public.insert_guest_photo(
      '${code}', 'events/${code}/original/g${i}.jpg', 'g${i}.jpg',
      1200000, 'image/jpeg', '${token}', 1200, 900)`));
  }
  return out;
};

const ten = await shoot(reg.session_token, 10);
check("the guest can upload 10 photos", ten.every((e) => e === null), ten.filter(Boolean).join(" | "));

const eleventh = await errorOf(`select * from public.insert_guest_photo(
  'DEMO482', 'events/DEMO482/original/over.jpg', 'over.jpg',
  1200000, 'image/jpeg', '${reg.session_token}', 1200, 900)`);
check("the 11th is refused by the SERVER", /GUEST_UPLOAD_LIMIT_REACHED/.test(eleventh ?? ""), eleventh ?? "UPLOAD SUCCEEDED - QUOTA NOT ENFORCED");

console.log("\n--- trying to get around it ---");
const reReg = await one(`select * from public.register_guest_session('DEMO482', '${reg.session_token}')`);
check("re-registering with the same token does not reset the count", reReg.upload_count === 10, JSON.stringify(reReg));

const freshReg = await one(`select * from public.register_guest_session('DEMO482', 'not-a-real-token-at-all')`);
check("an unrecognised token gets a NEW session, not somebody else's", freshReg.session_token !== reg.session_token, JSON.stringify(freshReg));

// A real second event — the demo seed only contains DEMO482.
await asRole("service_role");
await db.exec(`insert into public.events (event_code, event_name, client_id, upload_limit, guest_photo_limit)
               values ('OTHER01', 'Other Event', null, 100, 10)`);
await asRole("anon");
const otherEvent = await errorOf(`select * from public.insert_guest_photo(
  'OTHER01', 'events/OTHER01/original/x.jpg', 'x.jpg',
  1200000, 'image/jpeg', '${reg.session_token}', 1200, 900)`);
check("a token cannot be used on a different event", /GUEST_SESSION_NOT_FOUND/.test(otherEvent ?? ""), otherEvent ?? "CROSS-EVENT UPLOAD SUCCEEDED");

const forged = await errorOf(`select * from public.insert_guest_photo(
  'DEMO482', 'events/DEMO482/original/x.jpg', 'x.jpg',
  1200000, 'image/jpeg', '${"f".repeat(64)}', 1200, 900)`);
check("a forged token is refused", /GUEST_SESSION_NOT_FOUND/.test(forged ?? ""), forged ?? "FORGED TOKEN ACCEPTED");

const noToken = await errorOf(`select * from public.insert_guest_photo(
  'DEMO482', 'events/DEMO482/original/x.jpg', 'x.jpg', 1200000, 'image/jpeg', null, 1200, 900)`);
check("uploading with no session at all is refused", noToken !== null, noToken ?? "ANONYMOUS UPLOAD WITH NO SESSION SUCCEEDED");

// A stale caller still sending a browser-made identifier must fail closed,
// not quietly skip the quota.
const legacy = await errorOf(`select * from public.insert_guest_photo(
  'DEMO482', 'events/DEMO482/original/x.jpg', 'x.jpg', 1200000, 'image/jpeg', 'legacy-localstorage-id', 1200, 900)`);
check("a legacy uploader_identifier is not accepted as a session", /GUEST_SESSION_NOT_FOUND/.test(legacy ?? ""), legacy ?? "LEGACY IDENTIFIER ACCEPTED");

console.log("\n--- the browser cannot touch the table directly ---");
const directInsert = await errorOf(`insert into public.guest_sessions (event_id, upload_count)
  values ((select id from public.events where event_code = 'DEMO482'), 0)`);
check("anon cannot insert a session row", directInsert !== null, directInsert ?? "DIRECT INSERT SUCCEEDED");

const visible = await one(`select count(*)::int as n from public.guest_sessions`);
check("anon cannot read the session table", visible.n === 0, JSON.stringify(visible));

const reset = await errorOf(`update public.guest_sessions set upload_count = 0`);
await asRole("service_role");
const afterReset = await one(`select upload_count from public.guest_sessions where session_token = '${reg.session_token}'`);
check("anon cannot reset its own counter", afterReset.upload_count === 10, `upload_count=${afterReset.upload_count} error=${reset ?? "none"}`);

console.log("\n--- attribution, other guests, and the event ceiling ---");
const attributed = await one(`select count(*)::int as n from public.photos
  where guest_session_id = (select id from public.guest_sessions where session_token = '${reg.session_token}')`);
check("every upload is attributed to its session", attributed.n === 10, JSON.stringify(attributed));

await asRole("anon");
const guestB = await one(`select * from public.register_guest_session('DEMO482')`);
const bTen = await shoot(guestB.session_token, 10);
check("a second guest gets their own 10", bTen.every((e) => e === null), bTen.filter(Boolean).join(" | "));

await asRole("service_role");
await db.exec(`insert into public.events (event_code, event_name, client_id, upload_limit, guest_photo_limit)
               values ('TINY01', 'Tiny Event', null, 3, 10)`);
await asRole("anon");
const tiny = await one(`select * from public.register_guest_session('TINY01')`);
const t = await shoot(tiny.session_token, 4, "TINY01");
check("the event-wide ceiling still fires before the guest ceiling",
      /EVENT_UPLOAD_LIMIT_REACHED/.test(t[3] ?? ""), t.map((x) => x ?? "ok").join(" | "));

console.log("\n--- the host configures the guest limit inside the caps ---");
await asRole("service_role");
const tooHigh = await errorOf(`update public.events set guest_photo_limit = 999 where event_code = 'TINY01'`);
check("guest_photo_limit is capped", /GUEST_LIMIT_OUT_OF_RANGE/.test(tooHigh ?? ""), tooHigh ?? "update succeeded");
const okLimit = await errorOf(`update public.events set guest_photo_limit = 25 where event_code = 'TINY01'`);
check("a sane guest limit is accepted", okLimit === null, okLimit ?? "");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures ? 1 : 0);
