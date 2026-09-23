import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isApprovedAdminUser } from "@/lib/auth/adminAllowlist";

export interface SessionUser {
  userId: string;
  email: string;
  /** Site-host admin: sees and manages every client's events. */
  isAdmin: boolean;
}

/**
 * Any signed-in user — a self-serve client OR a site-host admin.
 *
 * Sibling of requireAdmin(): that one is the gate for the internal console
 * (/api/admin/**), this one is the gate for the self-serve surface
 * (/api/events, /api/account, /dashboard). Ownership of a specific event is
 * a separate question — see lib/auth/eventAccess.ts, which lets Postgres
 * answer it through RLS rather than re-implementing the rule here.
 */
export async function requireUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    isAdmin: isApprovedAdminUser(user),
  };
}
