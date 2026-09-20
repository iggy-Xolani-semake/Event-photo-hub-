import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Shared sliding-window state is stored in Supabase so all app instances agree. */

export async function checkDistributedRateLimit(
  key: string,
  opts: { windowMs: number; maxRequests: number }
): Promise<{ allowed: boolean; remaining: number; error?: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_window_seconds: Math.ceil(opts.windowMs / 1000),
    p_max_requests: opts.maxRequests,
  });

  if (error) {
    console.error("distributed rate limit failed:", error.message);
    return { allowed: false, remaining: 0, error: true };
  }

  const result = (data as { allowed: boolean; remaining: number }[] | null)?.[0];
  return result ?? { allowed: false, remaining: 0, error: true };
}
