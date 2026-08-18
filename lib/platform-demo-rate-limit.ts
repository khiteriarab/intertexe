/**
 * Best-effort in-memory rate limit for the public demo API.
 * Demonstration traffic only — not a production quota system.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 40;

function prune(now: number) {
  if (buckets.size < 400) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function demoRateLimit(ip: string): {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  prune(now);
  const key = ip || "unknown";
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, next);
    return { ok: true, limit: MAX_HITS, remaining: MAX_HITS - 1, resetAt: next.resetAt };
  }
  existing.count += 1;
  const remaining = Math.max(0, MAX_HITS - existing.count);
  return {
    ok: existing.count <= MAX_HITS,
    limit: MAX_HITS,
    remaining,
    resetAt: existing.resetAt,
  };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
