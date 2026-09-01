"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — uses the PUBLIC anon key only. This key is safe to ship
 * to the client because every table it touches is protected by RLS (see
 * supabase/migrations/0002_rls.sql), and guest writes go through the
 * SECURITY DEFINER RPCs in 0003_functions.sql rather than raw table
 * inserts. Never import the service-role key here or in any file under
 * a "use client" boundary.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
