import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Used at the top of every /api/admin/** route. Middleware only checks
 * "is there a session" — this checks "is this session an admin", by
 * reading the same app_metadata.role claim that is_admin() checks in
 * Postgres (0002_rls.sql). Keeping the check here in addition to RLS is
 * defense-in-depth: even if a route accidentally used the service-role
 * client (bypassing RLS) for some other reason, this still blocks
 * non-admins before any query runs.
 */
export async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (role !== "admin") return null;

  return { userId: user.id };
}
