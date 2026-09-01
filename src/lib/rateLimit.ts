import "server-only";

/**
 * In-memory sliding-window rate limiter.
 *
 * KNOWN LIMITATION: this state lives in the Node process, so on a
 * multi-instance deployment (Vercel's default for serverless functions,
 * or Netlify with multiple concurrent function instances) each instance
 * has its own counter — the effective limit is (per-instance limit) x
 * (instance count), not a hard global cap. That's an acceptable V1
 * trade-off for "reasonable abuse protection" (spec section 24), but if
 * this becomes a real SaaS product handling adversarial traffic, replace
 * this with Upstash Redis (@upstash/ratelimit) or Cloudflare's own rate
 * limiting rules in front of the app — both are drop-in replacements for
 * the checkRateLimit() call sites below.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so this Map doesn't grow unbounded over a long-running
// process/many distinct events.
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function cleanupIfNeeded(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart > CLEANUP_INTERVAL_MS) buckets.delete(key);
  }
  lastCleanup = now;
}

export function checkRateLimit(
  key: string,
  opts: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanupIfNeeded(now);

  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > opts.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: opts.maxRequests - 1 };
  }

  if (existing.count >= opts.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.maxRequests - existing.count };
}
