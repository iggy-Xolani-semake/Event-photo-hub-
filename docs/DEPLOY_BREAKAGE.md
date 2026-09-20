# Site broken: "none of the buttons work"

## The 10-second check

Open the live site, press F12, look at **Console**. If the first red error is:

```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

then this document is your answer. Anything else — paste that error instead and
ignore the rest of this file.

## What is actually happening

`src/lib/supabase/client.ts` builds the browser client from two build-time
environment variables:

```ts
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

The `!` tells TypeScript "trust me, these exist." They are not checked at build
time and not checked at runtime until the first call.

Verified locally:

```
$ node -e "require('@supabase/ssr').createBrowserClient(undefined, undefined)"
THROWS -> Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!

$ env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY npm run build
 ✓ Compiled successfully in 13.2s      <-- missing env is INVISIBLE at build time
```

So a deploy that builds without those variables produces a bundle that compiles,
serves HTML, and then throws the first time a client component asks Supabase for
anything. Every interactive component is a client component. Result: the page
*looks* fine, and no button does anything. That is the symptom being reported.

## The fix

1. Set these on the hosting provider, for the **Production** environment:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the **anon / public** key (never service_role)
2. Trigger a **fresh build**. `NEXT_PUBLIC_*` values are inlined into the JS at
   build time, so a cached or reused build will not pick them up — on Vercel use
   "Redeploy" and untick "Use existing Build Cache", or push any commit.
3. Hard-refresh the browser (Cmd/Ctrl-Shift-R). The old chunk is cached.

## What this is NOT

Not the database work. `0011` and `0012` are applied and only affect the guest
upload path — they cannot make buttons on other screens inert. The app branch
(`475b1a4`, PR #1) is a clean fast-forward over `main` with no conflicts, and it
passes `npm run typecheck`, `npm run build`, and 86 database assertions across
4 verification harnesses.

It is also not a code regression: nothing calls `createSupabaseBrowserClient()`
at module scope, and no client file touches `window`/`localStorage` at module
scope, so the bundle itself is safe to load. The only failure mode found is the
missing environment variable above.

## If the console shows something else

Paste the first error and the page URL. Two other things worth checking while
you are in there:

- **Network tab**: are `/api/...` calls returning 500? Then the *server* env is
  missing `SUPABASE_SERVICE_ROLE_KEY` or the R2 variables — a different problem
  with the same fix (set them, redeploy).
- Is the deployed build actually the new one?
  `curl -X POST https://<domain>/api/guest/session -H 'Content-Type: application/json' -d '{"eventCode":"DEMO482"}'`
  A 404 means the old build is still serving.
