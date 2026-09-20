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


console.log("\n--- collaborator: the role that arrived from main today ---");

const pkgs = await db.query(`select id, code, photo_limit from public.packages order by sort_order`);
const pkg50 = pkgs.rows.find((r) => r.code === "photos_50");
const pkg1000 = pkgs.rows.find((r) => r.code === "photos_1000");

const CAROL = "44444444-dddd-4ddd-8ddd-000000000004";
await db.exec(`insert into auth.users (id, email, raw_app_meta_data)
               values ('${CAROL}', 'carol@example.com', '{"role":"client"}')`);

// alice owns an event on the 50-photo tier
await asRole("authenticated", JSON.stringify({ sub: ALICE, email: "alice@example.com", role: "authenticated", app_metadata: { role: "client" } }));
const aliceClient = (await one(`select public.create_own_client_profile('Alice', null) as id`)).id;
const mkEvent = await errorOf(`
  insert into public.events (event_code, event_name, client_id, package_id, upload_limit)
  values ('ALICE50', 'Alice Wedding', '${aliceClient}', '${pkg50.id}', 50)
`);
check("setup: owner creates the event", mkEvent === null, mkEvent ?? "");
const mkSecond = await errorOf(`
  insert into public.events (event_code, event_name, client_id, package_id, upload_limit)
  values ('ALICE99', 'Alice Second Event', '${aliceClient}', '${pkg50.id}', 50)
`);
check("setup: owner creates a second event carol is not on", mkSecond === null, mkSecond ?? "");

// staff assign carol as the event's photographer
await asRole("service_role");
await db.exec(`
  insert into public.collaborators (auth_user_id, name, email)
  values ('${CAROL}', 'Carol Lens', 'carol@example.com');
  update public.events
     set collaborator_id = (select id from public.collaborators where auth_user_id = '${CAROL}')
   where event_code = 'ALICE50';
`);

// carol signs in as an ordinary authenticated user
await asRole("authenticated", JSON.stringify({ sub: CAROL, email: "carol@example.com", role: "authenticated", app_metadata: { role: "client" } }));

const sees = await one(`select count(*)::int as n from public.events where event_code = 'ALICE50'`);
check("collaborator can see the event they are assigned to", sees.n === 1, JSON.stringify(sees));

const unlock = await errorOf(`update public.events set download_unlocked_at = now() where event_code = 'ALICE50'`);
check("collaborator cannot unlock downloads", /DOWNLOAD_UNLOCK_NOT_ALLOWED/.test(unlock ?? ""), unlock ?? "UPDATE SUCCEEDED - PAYWALL BYPASSED");

const swap = await errorOf(`update public.events set package_id = '${pkg1000.id}', upload_limit = 999 where event_code = 'ALICE50'`);
check("collaborator cannot swap to a bigger package", /PACKAGE_CHANGE_NOT_ALLOWED/.test(swap ?? ""), swap ?? "UPDATE SUCCEEDED");

const raise = await errorOf(`update public.events set upload_limit = 999 where event_code = 'ALICE50'`);
check("collaborator cannot raise the limit past the package", /EXCEEDS_PACKAGE_LIMITS/.test(raise ?? ""), raise ?? "UPDATE SUCCEEDED");

const rename = await errorOf(`update public.events set event_name = 'Renamed by photographer' where event_code = 'ALICE50'`);
check("collaborator CAN still do their job (rename)", rename === null, rename ?? "");

const unassign = await errorOf(`update public.events set collaborator_id = null where event_code = 'ALICE50'`);
check("collaborator cannot unassign themselves", unassign !== null, unassign ?? "UPDATE SUCCEEDED");

// A 0-row UPDATE raises no error in Postgres, so "no error" proves nothing
// here — the only honest check is whether the row actually changed.
await errorOf(`update public.events set event_name = 'hijack' where event_code = 'ALICE99'`);
await asRole("service_role");
const victim = await one(`select event_name from public.events where event_code = 'ALICE99'`);
check("collaborator cannot change an event they are not on",
      victim.event_name !== "hijack", `name is now "${victim.event_name}"`);

await asRole("authenticated", JSON.stringify({ sub: CAROL, email: "carol@example.com", role: "authenticated", app_metadata: { role: "client" } }));
const otherEvent = await one(`select count(*)::int as n from public.events where event_code = 'ALICE99'`);
check("collaborator cannot even see another event", otherEvent.n === 0, JSON.stringify(otherEvent));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures ? 1 : 0);
