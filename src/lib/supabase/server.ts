import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { cookies } from "next/headers";

/**
 * Server client for Server Components / Route Handlers — respects the
 * signed-in user's session (client or admin) and RLS applies normally.
 * Use this for anything done "as" the logged-in user. For guest upload
 * handling and image-processing callbacks, use adminClient() instead.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component during render — safe to ignore
            // because middleware refreshes the session cookie separately.
          }
        },
      },
    }
  );
}
