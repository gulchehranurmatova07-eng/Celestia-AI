// Fixed-window, in-memory rate limiter keyed by client IP. It protects a single
// server instance; on multi-instance or serverless hosting, put a shared limiter
// (e.g. Upstash Redis or the platform's firewall rules) in front as well.
const WINDOW_MS = 60_000;
const MAX_TRACKED = 10_000;

const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    if (hits.size >= MAX_TRACKED) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      if (hits.size >= MAX_TRACKED) hits.clear();
    }
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}
