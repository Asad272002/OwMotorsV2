import "server-only";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 1_000;

/**
 * Best-effort, per-process protection for public Server Actions.
 * Production deployments must add a shared edge or distributed rate limiter;
 * see docs/SUPABASE_DASHBOARD_SETUP.md.
 */
export function allowSubmission(key: string, limit = 5, windowMs = 10 * 60 * 1_000) {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
