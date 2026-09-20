import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Event } from "@/types/database";

/**
 * Resolves an event the CALLER is allowed to manage — their own event as an
 * owner, or any event as a site-host admin.
 *
 * The ownership test is not written here on purpose. This uses the
 * session-bound client, so the query runs as the signed-in user and
 * events_select_authenticated (0002_rls.sql) decides what comes back:
 *
 *     is_admin() or client_id in (select id from clients
 *                                 where auth_user_id = auth.uid())
 *
 * That is the same rule the owner write policies in 0005 use, so "can see"
 * and "can edit" cannot drift apart. Application-level filtering here would
 * be a second implementation of a security rule, and the one that a future
 * route forgets to call.
 *
 * Returns null for "no such event" and "not yours" alike — the routes map
 * that to 404, so a caller cannot probe which event codes exist.
 */
export async function findManagedEvent(eventCode: string): Promise<Event | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("event_code", eventCode.toUpperCase())
    .maybeSingle<Event>();

  return data ?? null;
}

/**
 * The caller's own client row, creating it on first use.
 *
 * Goes through create_own_client_profile() (0005_client_self_service.sql)
 * rather than inserting directly: clients have no INSERT policy, and the
 * function derives identity from auth.uid()/auth.jwt() instead of trusting
 * anything the request body says. Idempotent, so it is safe to call on every
 * request that needs a client_id.
 */
export async function ensureOwnClientProfile(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_own_client_profile", {
    p_name: null,
    p_phone: null,
  });

  if (error) {
    console.error("create_own_client_profile failed:", error.message);
    return null;
  }

  return (data as string | null) ?? null;
}
