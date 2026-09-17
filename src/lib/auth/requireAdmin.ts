import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Used at the top of every /api/admin/** route. The route namespace is
 * historical: both platform admins and self-service organizers use it.
 * RLS remains the ownership boundary; this helper only rejects anonymous
 * and unrelated authenticated roles before any elevated query runs.
 */
export async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (role !== "admin" && role !== "organizer") return null;

  return { userId: user.id };
}
