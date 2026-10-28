// Per-client spacing for routes that spend model credits. Keyed by IP, so clearing the visitor cookie doesn't skip it.
// shortcut: in-process and per instance; enough for one Render instance, use a shared store if it scales out.
const last = new Map<string, number>();

/** Seconds to wait before `key` may run again, or 0 (and the call is counted). */
export function waitSeconds(key: string, gapMs: number, now = Date.now()): number {
  const prev = last.get(key);
  if (prev !== undefined && now - prev < gapMs) return Math.ceil((gapMs - (now - prev)) / 1000);
  last.set(key, now);
  if (last.size > 5000) last.delete(last.keys().next().value!);
  return 0;
}

// Render puts the client first in x-forwarded-for.
export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
