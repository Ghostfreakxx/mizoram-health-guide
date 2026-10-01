// Simple in-memory rate limiter, keyed by client IP.
// On serverless hosting (e.g. Vercel) each running instance keeps its own
// memory, so this is a best-effort guard against abuse rather than a hard
// limit. For a strict global limit, back it with a shared store like Redis.

type Window = { limit: number; ms: number };

const WINDOWS: Window[] = [
  { limit: 8, ms: 60_000 }, // 8 messages per minute
  { limit: 60, ms: 24 * 60 * 60_000 }, // 60 messages per day
];

const hits = new Map<string, number[]>();
const longest = Math.max(...WINDOWS.map((w) => w.ms));

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < longest);

  const limited = WINDOWS.some(
    (w) => recent.filter((t) => now - t < w.ms).length >= w.limit
  );

  if (!limited) recent.push(now);
  hits.set(key, recent);

  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= longest)) hits.delete(k);
    }
  }

  return limited;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
