import type { Benchmark } from "@/lib/benchmark";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** GET when `body` is omitted, otherwise POST it as JSON. Throws ApiError with the route's `{ error }` message. */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    path,
    body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export type Retail = { benchmark: Benchmark | null; reason?: string };

/** "cached": read the cache only (shop pages); "fetch": cached-or-fetched; "refresh": POST. A 502 still carries `{ benchmark: null, reason }`. */
export async function retailFor(roundId: string, mode: "cached" | "fetch" | "refresh"): Promise<Retail> {
  const path = `/api/rounds/${roundId}/benchmark${mode === "cached" ? "?cached=1" : ""}`;
  const res = await fetch(path, mode === "refresh" ? { method: "POST" } : { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { benchmark: data.benchmark ?? null, reason: data.reason ?? data.error ?? (res.ok ? undefined : `Request failed (${res.status})`) };
}

/** "(Channel3, 5 offers, fetched Oct 26, 2026)" */
export const retailSource = (b: Benchmark) =>
  `(Channel3, ${b.offers.length} ${b.offers.length === 1 ? "offer" : "offers"}, fetched ${new Date(b.fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`;
