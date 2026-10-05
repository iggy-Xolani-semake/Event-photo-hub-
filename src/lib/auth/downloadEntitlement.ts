import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isApprovedAdminUser } from "@/lib/auth/adminAllowlist";

export type DownloadReason = "admin" | "owner_paid" | "unpaid_owner" | "not_owner";

export interface EntitlementDecision {
  allowed: boolean;
  reason: DownloadReason;
}

export interface EntitlementInput {
  /** events.download_unlocked_at — set only by mark_event_paid(). */
  unlockedAt: string | null;
  callerIsAdmin: boolean;
  callerOwnsEvent: boolean;
}

/**
 * Gallery access and download entitlement are different questions, and this
 * is the only place that answers the second one.
 *
 *   visibility  → who may LOOK at the gallery      (guests, if shared/public)
 *   entitlement → who may TAKE the originals       (the host, once paid)
 *
 * Before Sprint 3 both download routes gated on visibility alone, which meant
 * any guest holding a shared event link could walk away with every original.
 *
 * Deliberately a pure function: the decision is the part worth testing, and
 * keeping it free of I/O means it can be checked without a database.
 */
export function decideDownloadEntitlement({
  unlockedAt,
  callerIsAdmin,
  callerOwnsEvent,
}: EntitlementInput): EntitlementDecision {
  // Staff can always retrieve originals — they have to be able to help a host
  // who has paid and lost their files.
  if (callerIsAdmin) {
    return { allowed: true, reason: "admin" };
  }

  if (!callerOwnsEvent) {
    return { allowed: false, reason: "not_owner" };
  }

  // The owner gets originals only once the event is paid for. That is the
  // paywall: the gallery is free, the originals are the product.
  if (unlockedAt) {
    return { allowed: true, reason: "owner_paid" };
  }

  return { allowed: false, reason: "unpaid_owner" };
}

/**
 * Resolves the decision for the current request: reads the event with the
 * service-role client (the caller may not be able to see it, and "cannot see"
 * must not become "cannot download" for an admin), then asks RLS whether the
 * caller owns it by re-reading the same row through their session.
 */
export async function resolveDownloadEntitlement(
  eventId: string
): Promise<EntitlementDecision> {
  const admin = createSupabaseAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("download_unlocked_at")
    .eq("id", eventId)
    .maybeSingle<{ download_unlocked_at: string | null }>();

  if (!event) {
    return { allowed: false, reason: "not_owner" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "not_owner" };
  }

  const isAdmin = isApprovedAdminUser(user);

  // Ownership is answered by RLS, not by comparing client_id in application
  // code: events_select_authenticated already encodes the rule.
  const { data: owned } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  return decideDownloadEntitlement({
    unlockedAt: event.download_unlocked_at,
    callerIsAdmin: isAdmin,
    callerOwnsEvent: Boolean(owned),
  });
}
