import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely — this is intentional and
 * required for:
 *   - the image-processing Edge Function callback (mark_photo_processed)
 *   - admin-only server routes that need cross-client visibility
 *
 * The `server-only` import above makes it a BUILD ERROR to import this
 * file from any Client Component, closing off the most common way a
 * service key accidentally ends up in a browser bundle.
 *
 * SUPABASE_SERVICE_ROLE_KEY must never be prefixed with NEXT_PUBLIC_ and
 * must never appear in any file under src/app/**\/page.tsx client
 * boundaries or src/components/**.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
