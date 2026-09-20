import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(REPO + "/package.json");
const { PGlite } = require("@electric-sql/pglite");

// ---------------------------------------------------------------------------
// Executes the repo's real migrations (0001-0005) on a genuine Postgres
// engine and then attacks the Sprint 2 ownership model as two different
// clients, an admin, and an anonymous guest. Every assertion below is about
// behaviour Postgres enforces, not about what the app code intends.
// ---------------------------------------------------------------------------

const ALICE = "11111111-aaaa-4aaa-8aaa-000000000001";
const BOB = "22222222-bbbb-4bbb-8bbb-000000000002";
const ADMIN = "33333333-cccc-4ccc-8ccc-000000000003";

const db = new PGlite();

// Supabase provides these; vanilla Postgres does not. auth.uid() and
// auth.jwt() mirror Supabase's real definitions (uid = jwt->>'sub').
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
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

for (const f of ["0001_init.sql", "0002_rls.sql", "0003_functions.sql", "0004_seed_demo.sql", "0005_client_self_service.sql"]) {
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

// What a real Supabase project grants by default. Deliberately NOT granting
// execute on every function, so the explicit revoke on mark_photo_processed
// from 0003 stays meaningful.
await db.exec(`
  -- A real Supabase project grants these by default; vanilla Postgres does
  -- not. Without usage on schema auth, auth.uid() cannot even be inlined.
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  insert into auth.users (id, email, raw_app_meta_data) values
    ('${ALICE}', 'alice@example.com', '{"role":"client"}'),
    ('${BOB}',   'bob@example.com',   '{"role":"client"}'),
    ('${ADMIN}', 'staff@example.com', '{"role":"admin"}');
`);

const asUser = async (sub, email, role) => {
  await db.exec(`reset role;`);
  await db.exec(`set role ${role === "anon" ? "anon" : "authenticated"};`);
  if (role === "anon") {
    await db.exec(`select set_config('request.jwt.claims', '', false);`);
  } else {
    const claims = JSON.stringify({ sub, email, role: "authenticated", app_metadata: { role } });
    await db.exec(`select set_config('request.jwt.claims', '${claims}', false);`);
  }
};

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
};
const scalar = async (sql) => (await db.query(sql)).rows[0];
const errorOf = async (sql) => {
  try {
    await db.query(sql);
    return null;
  } catch (err) {
    return err.message.split("\n")[0];
  }
};

console.log("\n--- self-service profile creation ---");
await asUser(ALICE, "alice@example.com", "client");
const aliceClient = (await scalar(`select public.create_own_client_profile('Alice', null) as id`)).id;
check("alice can create her own client profile", Boolean(aliceClient));
const aliceAgain = (await scalar(`select public.create_own_client_profile('Alice Again', null) as id`)).id;
check("profile creation is idempotent", aliceAgain === aliceClient, `${aliceClient} vs ${aliceAgain}`);

await asUser(BOB, "bob@example.com", "client");
const bobClient = (await scalar(`select public.create_own_client_profile('Bob', null) as id`)).id;
check("bob gets a different profile", bobClient !== aliceClient);

console.log("\n--- owner creates their own event ---");
await asUser(ALICE, "alice@example.com", "client");
const created = await errorOf(`
  insert into public.events (event_code, event_name, client_id, upload_limit)
  values ('ALICE01', 'Alice Wedding', '${aliceClient}', 250)
`);
check("owner can create their own event", created === null, created ?? "");

const forged = await errorOf(`
  insert into public.events (event_code, event_name, client_id, upload_limit)
  values ('FORGED1', 'Stolen Event', '${bobClient}', 250)
`);
check("owner CANNOT create an event under another client", forged !== null, forged ?? "insert succeeded!");

console.log("\n--- cross-client isolation on reads ---");
await asUser(BOB, "bob@example.com", "client");
const bobSees = (await scalar(`select count(*)::int as n from public.events`)).n;
check("bob sees none of alice's events", bobSees === 0, `bob sees ${bobSees}`);
const bobSeesDemo = (await scalar(`select count(*)::int as n from public.events where event_code in ('ALICE01','DEMO482')`)).n;
check("bob cannot see alice's or the demo event", bobSeesDemo === 0, `saw ${bobSeesDemo}`);

await asUser(ADMIN, "staff@example.com", "admin");
const adminSees = (await scalar(`select count(*)::int as n from public.events`)).n;
check("site admin sees every event", adminSees >= 2, `admin sees ${adminSees}`);

console.log("\n--- anonymous access after dropping events_select_public_anon ---");
await asUser(null, null, "anon");
const anonSees = (await scalar(`select count(*)::int as n from public.events`)).n;
check("anon can no longer select events", anonSees === 0, `anon sees ${anonSees}`);
const anonRpc = await scalar(`select can_upload, event_name from public.get_event_for_upload('ALICE01')`);
check("guest RPC still resolves an event", anonRpc?.event_name === "Alice Wedding", JSON.stringify(anonRpc));

console.log("\n--- application caps enforced in the database ---");
await asUser(ALICE, "alice@example.com", "client");
const tooMany = await errorOf(`update public.events set upload_limit = 99999 where event_code = 'ALICE01'`);
check("absurd upload_limit rejected", /UPLOAD_LIMIT_OUT_OF_RANGE/.test(tooMany ?? ""), tooMany ?? "update succeeded!");
const tooBig = await errorOf(`update public.events set max_file_size_bytes = 5368709120 where event_code = 'ALICE01'`);
check("5 GB file size rejected", /FILE_SIZE_OUT_OF_RANGE/.test(tooBig ?? ""), tooBig ?? "update succeeded!");
const fine = await errorOf(`update public.events set upload_limit = 500 where event_code = 'ALICE01'`);
check("a sane limit is accepted", fine === null, fine ?? "");

console.log("\n--- ownership cannot be reassigned or crossed ---");
const reassign = await errorOf(`update public.events set client_id = '${bobClient}' where event_code = 'ALICE01'`);
check("owner cannot give their event to another client", reassign !== null, reassign ?? "update succeeded!");
const orphan = await errorOf(`update public.events set client_id = null where event_code = 'ALICE01'`);
check("owner cannot orphan an event", orphan !== null, orphan ?? "update succeeded!");
const touchBobs = await errorOf(`update public.events set event_name = 'hacked' where event_code = 'DEMO482'`);
const demoName = (await db.query(`select event_name from public.events where event_code = 'DEMO482'`)).rows.length;
check("owner cannot edit an event they don't own", touchBobs === null && demoName === 0, "RLS hid the row entirely");

console.log("\n--- clients table ---");
const renameOwn = await errorOf(`update public.clients set name = 'Alice Mokoena' where id = '${aliceClient}'`);
check("client can edit their own contact details", renameOwn === null, renameOwn ?? "");
await asUser(BOB, "bob@example.com", "client");
const renameAlice = await db.query(`update public.clients set name = 'hacked' where id = '${aliceClient}'`);
check("client cannot edit another client's row", renameAlice.affectedRows === 0, `affected ${renameAlice.affectedRows}`);
// Still as bob: alice's row should not even be readable, let alone writable.
const bobReadsAlice = await db.query(`select count(*)::int as n from public.clients where id = '${aliceClient}'`);
check("bob cannot even READ alice's client row", bobReadsAlice.rows[0]?.n === 0, `saw ${bobReadsAlice.rows[0]?.n}`);

await db.exec(`reset role;`);

// Read as postgres (no RLS) to confirm bob's attempt really changed nothing.
const aliceName = await db.query(`select name from public.clients where id = '${aliceClient}'`);
check("alice's name untouched", aliceName.rows[0]?.name === "Alice Mokoena", aliceName.rows[0]?.name);
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
