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
  "0004_seed_demo.sql", "0005_client_self_service.sql", "0006_packages_payments.sql",
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

console.log("\n--- packages ---");
await asRole("anon");
const pkgs = await db.query(`select id, code, photo_limit, price_cents from public.packages order by sort_order`);
check("packages are seeded", pkgs.rows.length === 5, `${pkgs.rows.length} tiers`);
check("anon can read the active tiers", pkgs.rows.length > 0);
const priced = pkgs.rows.filter((r) => r.price_cents !== null);
check("only the stated price is set", priced.length === 1 && priced[0].code === "photos_50" && priced[0].price_cents === 5000,
  JSON.stringify(priced));
const pkg50 = pkgs.rows.find((r) => r.code === "photos_50");
const pkg1000 = pkgs.rows.find((r) => r.code === "photos_1000");

console.log("\n--- a client creates an event on the 50-photo package ---");
await client(ALICE, "alice@example.com");
const aliceClient = (await one(`select public.create_own_client_profile('Alice', null) as id`)).id;
const created = await errorOf(`
  insert into public.events (event_code, event_name, client_id, package_id, upload_limit)
  values ('ALICE50', 'Alice 50s', '${aliceClient}', '${pkg50.id}', 50)
`);
check("owner can create an event with a package", created === null, created ?? "");

console.log("\n--- limits are capped by the package they paid for ---");
const tooMany = await errorOf(`update public.events set upload_limit = 500 where event_code = 'ALICE50'`);
check("cannot raise photo limit above the package", /EXCEEDS_PACKAGE_LIMITS/.test(tooMany ?? ""), tooMany ?? "update succeeded!");
const lower = await errorOf(`update public.events set upload_limit = 30 where event_code = 'ALICE50'`);
check("can still lower it inside the package", lower === null, lower ?? "");
const bigFile = await errorOf(`update public.events set max_file_size_bytes = 20971520 where event_code = 'ALICE50'`);
check("cannot raise file size above the package", /EXCEEDS_PACKAGE_LIMITS/.test(bigFile ?? ""), bigFile ?? "update succeeded!");

console.log("\n--- trying to steal the entitlement ---");
const selfUnlock = await errorOf(`update public.events set download_unlocked_at = now() where event_code = 'ALICE50'`);
check("client cannot unlock their own downloads", /DOWNLOAD_UNLOCK_NOT_ALLOWED/.test(selfUnlock ?? ""), selfUnlock ?? "update succeeded!");
const newUnlocked = await errorOf(`
  insert into public.events (event_code, event_name, client_id, package_id, upload_limit, download_unlocked_at)
  values ('FREEBIE', 'Free Originals', '${aliceClient}', '${pkg50.id}', 50, now())
`);
check("client cannot create an already-unlocked event", /DOWNLOAD_UNLOCK_NOT_ALLOWED/.test(newUnlocked ?? ""), newUnlocked ?? "insert succeeded!");
const upgrade = await errorOf(`update public.events set package_id = '${pkg1000.id}', upload_limit = 500 where event_code = 'ALICE50'`);
check("client cannot swap to a bigger package", /PACKAGE_CHANGE_NOT_ALLOWED/.test(upgrade ?? ""), upgrade ?? "update succeeded!");
const fakePayment = await errorOf(`
  insert into public.payments (event_id, amount_cents, status)
  values ((select id from public.events where event_code = 'ALICE50'), 5000, 'paid')
`);
check("client cannot write their own payment record", fakePayment !== null, fakePayment ?? "insert succeeded!");
const selfMark = await errorOf(`select public.mark_event_paid(gen_random_uuid())`);
check("client cannot execute mark_event_paid()", /permission denied/.test(selfMark ?? ""), selfMark ?? "function ran!");

console.log("\n--- staff marking a real payment ---");
await asRole("service_role");
const paymentId = (await one(`
  insert into public.payments (event_id, package_id, amount_cents, provider)
  values ((select id from public.events where event_code = 'ALICE50'), '${pkg50.id}', 5000, 'manual')
  returning id
`)).id;
const unlockedEvent = (await one(`select public.mark_event_paid('${paymentId}', 'manual', 'EFT-001') as event_id`)).event_id;
check("service role can mark a payment paid", Boolean(unlockedEvent));
const unlocked = await one(`select download_unlocked_at, event_code from public.events where event_code = 'ALICE50'`);
check("the event is now downloadable", unlocked.download_unlocked_at !== null, String(unlocked.download_unlocked_at));
const again = await errorOf(`select public.mark_event_paid('${paymentId}', 'manual', 'EFT-001')`);
const paidCount = (await one(`select count(*)::int as n from public.payments where status = 'paid'`)).n;
check("a repeated webhook is idempotent", again === null && paidCount === 1, `paid rows: ${paidCount}`);

console.log("\n--- staff override + client visibility ---");
await admin();
const adminUnlock = await errorOf(`update public.events set download_unlocked_at = null where event_code = 'DEMO482'`);
check("a site admin can still override by hand", adminUnlock === null, adminUnlock ?? "");
await client(ALICE, "alice@example.com");
const seesPayment = (await one(`select count(*)::int as n from public.payments`)).n;
check("client can see the payment on their own event", seesPayment === 1, `sees ${seesPayment}`);

await db.exec(`reset role;`);
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
