import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isApprovedAdminUser } from "@/lib/auth/adminAllowlist";

/**
 * Used at the top of every /api/admin/** route. The route namespace is
 * historical: both platform admins and self-service curators use it.
 * RLS remains the ownership boundary; this helper only rejects anonymous
 * and unrelated authenticated roles before any elevated query runs.
 */
export async function requireAdmin(): Promise<{ userId: string; role: string; curatorId: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (role !== "admin" && role !== "curator") return null;

  if (role === "admin") {
    return isApprovedAdminUser(user) ? { userId: user.id, role, curatorId: null } : null;
  }

  const { data: curator } = await supabase
    .from("curators")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!curator) return null;
  return { userId: user.id, role, curatorId: curator.id };
}
