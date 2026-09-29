import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(REPO + "/package.json");
const { PGlite } = require("@electric-sql/pglite");

// ---------------------------------------------------------------------------
// Regression test for the reported bug: a host changes "Your name" in Account
// Settings and nothing changes.
//
// Root cause was that the save went through create_own_client_profile(), which
// returns early for a caller who already has a clients row. This exercises the
// real migrations on a Postgres engine and asserts the behaviour the settings
// screen depends on, plus the guarantees that make the new function safe to
// expose to `authenticated` at all:
//
//   * an edit is actually stored (and read back by the next SELECT),
//   * NULL means "leave alone" while '' means "clear",
//   * caps and a not-blank rule hold server-side,
//   * a caller can only ever write their own row,
//   * anon cannot call it at all.
// ---------------------------------------------------------------------------

const ALICE = "11111111-aaaa-4aaa-8aaa-000000000001";
const BOB = "22222222-bbbb-4bbb-8bbb-000000000002";

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
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    created_at timestamptz default now()
  );
  create or replace function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
`);

for (const f of [
  "0001_init.sql",
  "0002_rls.sql",
  "0003_functions.sql",
  "0004_seed_demo.sql",
  "0005_client_self_service.sql",
  // the signup trigger that creates the clients row in the first place
  "0017_curator_self_service_signup.sql",
  "0020_repair_host_signup_trigger.sql",
  // the migration under test
  "0023_client_profile_updates.sql",
]) {
  const sql = readFileSync(`${REPO}/supabase/migrations/${f}`, "utf8").replace(
    /create extension if not exists "pgcrypto";/i,
    "-- pgcrypto not bundled in PGlite"
  );
  try {
    await db.exec(sql);
    console.log(`migration ${f}: OK`);
  } catch (err) {
    console.log(`migration ${f}: FAILED -> ${err.message.split("\n")[0]}`);
    process.exit(1);
  }
}

// What a real Supabase project grants by default.
await db.exec(`
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
`);

// Sign both hosts up the way the app does — auth.users insert, which fires
// assign_client_role_and_profile() (0017/0020) and creates the clients row.
await db.exec(`
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    ('${ALICE}', 'alice@example.com', '{"role":"client"}', '{"name":"Alice"}'::jsonb),
    ('${BOB}',   'bob@example.com',   '{"role":"client"}', '{"name":"Bob"}'::jsonb);
`);

const asUser = async (sub, email, role) => {
  await db.exec(`reset role;`);
  await db.exec(`set role ${role === "anon" ? "anon" : "authenticated"};`);
  if (role === "anon") {
    await db.exec(`select set_config('request.jwt.claims', '', false);`);
  } else {
    const claims = JSON.stringify({ sub, email, role: "authenticated" });
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

console.log("\n--- the signup trigger already created both profiles ---");
const aliceId = (await scalar(`select id::text from public.clients where lower(email) = 'alice@example.com'`)).id;
const bobId = (await scalar(`select id::text from public.clients where lower(email) = 'bob@example.com'`)).id;
check("alice has a clients row from signup", Boolean(aliceId), aliceId ?? "none");
check("bob has a clients row from signup", Boolean(bobId), bobId ?? "none");

console.log("\n--- creating a second time does NOT overwrite (the old behaviour) ---");
await asUser(ALICE, "alice@example.com", "client");
await db.query(`select public.create_own_client_profile('Alice Again', '+27111111111')`);
const afterCreate = await scalar(`select name, phone from public.clients where id = '${aliceId}'`);
check(
  "create_own_client_profile stays an ensure-only function",
  afterCreate.name === "Alice" && afterCreate.phone === null,
  `name=${afterCreate.name} phone=${afterCreate.phone ?? "null"}`
);

console.log("\n--- the edit the settings form makes ---");
const saved = await scalar(
  `select public.update_own_client_profile('Alice Mokoena', '+27 82 000 0000') as profile`
);
check(
  "update_own_client_profile returns the stored values",
  saved.profile?.name === "Alice Mokoena" && saved.profile?.phone === "+27 82 000 0000",
  JSON.stringify(saved.profile)
);

// This SELECT is exactly what /dashboard/settings and AppHeader run.
const reread = await scalar(`select name, phone from public.clients where id = '${aliceId}'`);
check("the new name is what the dashboard reads back", reread.name === "Alice Mokoena", reread.name);
check("the new phone is stored", reread.phone === "+27 82 000 0000", reread.phone ?? "null");

console.log("\n--- NULL means leave alone, '' means clear ---");
await db.query(`select public.update_own_client_profile(null, null)`);
const kept = await scalar(`select name, phone from public.clients where id = '${aliceId}'`);
check(
  "an omitted field is not touched",
  kept.name === "Alice Mokoena" && kept.phone === "+27 82 000 0000",
  `${kept.name} / ${kept.phone ?? "null"}`
);

await db.query(`select public.update_own_client_profile(null, '')`);
const cleared = await scalar(`select name, phone from public.clients where id = '${aliceId}'`);
check("an empty phone clears the number", cleared.phone === null, cleared.phone ?? "null");
check("clearing the phone leaves the name alone", cleared.name === "Alice Mokoena", cleared.name);

const blank = await errorOf(`select public.update_own_client_profile('   ', null)`);
check("a blank name is rejected", /NAME_REQUIRED/.test(blank ?? ""), blank ?? "accepted");
const afterBlank = await scalar(`select name from public.clients where id = '${aliceId}'`);
check(
  "and a blank name never blanks the column",
  afterBlank.name === "Alice Mokoena",
  afterBlank.name
);

console.log("\n--- server-side caps ---");
const longName = "x".repeat(121);
const nameTooLong = await errorOf(`select public.update_own_client_profile('${longName}', null)`);
check("a 121-character name is rejected", /NAME_TOO_LONG/.test(nameTooLong ?? ""), nameTooLong ?? "accepted");
const phoneTooLong = await errorOf(`select public.update_own_client_profile(null, '${"1".repeat(33)}')`);
check("a 33-character phone is rejected", /PHONE_TOO_LONG/.test(phoneTooLong ?? ""), phoneTooLong ?? "accepted");
const fine = await errorOf(`select public.update_own_client_profile('Alice Mokoena', '+27820000000')`);
check("a normal edit is accepted", fine === null, fine ?? "");

console.log("\n--- one host cannot edit another ---");
await asUser(BOB, "bob@example.com", "client");
await db.query(`select public.update_own_client_profile('Bob The Builder', '+27211111111')`);
const bobRow = await scalar(`select name from public.clients where id = '${bobId}'`);
check("bob edits his own name", bobRow.name === "Bob The Builder", bobRow.name);
// There is no parameter for "whose row": the only target is auth.uid(), so a
// forged body cannot reach another profile even though the function is
// SECURITY DEFINER.
const bobSeesAlice = await scalar(`select count(*)::int as n from public.clients where id = '${aliceId}'`);
check("bob cannot even read alice's row", bobSeesAlice.n === 0, `saw ${bobSeesAlice.n}`);

// Back as alice: her row is exactly as she left it.
await asUser(ALICE, "alice@example.com", "client");
const aliceRow = await scalar(`select name, phone from public.clients where id = '${aliceId}'`);
check(
  "alice's row is untouched by bob's save",
  aliceRow.name === "Alice Mokoena" && aliceRow.phone === "+27820000000",
  `${aliceRow.name} / ${aliceRow.phone ?? "null"}`
);

console.log("\n--- anonymous and missing-profile paths ---");
await asUser(null, null, "anon");
const anonCall = await errorOf(`select public.update_own_client_profile('Anonymous', null)`);
check(
  "anon cannot execute the update function",
  /permission denied|not_authenticated/i.test(anonCall ?? ""),
  anonCall ?? "anon succeeded!"
);

// A signed-in user with no clients row (a database that predates the trigger)
// must be distinguishable, because /api/account falls back to creating one.
await db.exec(`reset role;`);
const stranded = "44444444-dddd-4ddd-8ddd-000000000004";
await db.exec(`
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  values ('${stranded}', 'stranded@example.com', '{"role":"client"}', '{}'::jsonb);
  -- Simulate the pre-trigger database: the auth user exists with no profile.
  delete from public.clients where lower(email) = 'stranded@example.com';
`);
await asUser(stranded, "stranded@example.com", "client");
const missing = await errorOf(`select public.update_own_client_profile('Stranded', null)`);
check("a missing profile raises PROFILE_NOT_FOUND", /PROFILE_NOT_FOUND/.test(missing ?? ""), missing ?? "no error");
const rescue = await errorOf(`select public.create_own_client_profile('Stranded', null)`);
check("create_own_client_profile still rescues that caller", rescue === null, rescue ?? "");

await db.exec(`reset role;`);
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
