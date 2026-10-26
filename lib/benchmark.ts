import { ConfigError } from "./http.ts";
import { searchOffers, type Offer } from "./channel3.ts";
import { classifyPacks, type PackVerdict } from "./agents/packs.ts";
import type { Round } from "./round.ts";

export type Item = Pick<Round, "product" | "unit" | "step" | "matchHint">;
export type Benchmark = {
  perUnit: number;
  offers: { merchant: string; url: string; units: number; price: number }[];
  fetchedAt: string;
};

const TTL = 24 * 60 * 60 * 1000;
const NULL_TTL = 60 * 60 * 1000;
const REFRESH_GAP = 60 * 1000;
const MIN_OFFERS = 3;
type Result = { benchmark: Benchmark | null; reason?: string };
const NOT_ENOUGH = "Not enough comparable offers";
const cache = new Map<string, { at: number; ttl: number; result: Result }>();
const inflight = new Map<string, Promise<Result>>();

// Per-unit cents from Channel3's own prices; the model only supplied relevant + units.
// Packs of 1 to four cases (48 cartons, 200 rolls) count.
export function normalise(offers: Offer[], verdicts: PackVerdict[], maxUnits: number): Benchmark["offers"] {
  return offers.flatMap((o, i) => {
    const v = verdicts[i];
    if (!v?.relevant || !Number.isInteger(v.units) || v.units < 1 || v.units > maxUnits) return [];
    if (!o.merchant?.trim() || !o.url?.startsWith("https://")) return [];
    if (o.currency !== "USD" || typeof o.price !== "number" || !(o.price > 0)) return [];
    return [{ merchant: o.merchant, url: o.url, units: v.units, price: Math.round(Math.round(o.price * 100) / v.units) }];
  });
}

export function median(cents: number[]): number {
  const s = [...cents].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

type Opts = {
  refresh?: boolean;
  /** Never start a paid lookup: answer from the cache (or a lookup already running) only. */
  cachedOnly?: boolean;
  now?: number;
  search?: (q: string) => Promise<Offer[]>;
  classify?: (item: Item, offers: Offer[]) => Promise<PackVerdict[]>;
};

// What the benchmark route calls: a round's benchmark is keyed by that round's own search query.
export function roundBenchmark(round: Item & Pick<Round, "searchQuery">, opts: Opts = {}): Promise<Result> {
  return getBenchmark(round.searchQuery, round, opts);
}

// The cache key is the query only: rounds sharing a query share a benchmark.
export async function getBenchmark(query: string, item: Item, opts: Opts = {}): Promise<Result> {
  const now = opts.now ?? Date.now();
  const hit = cache.get(query);
  if (hit && now - hit.at < hit.ttl) {
    if (!opts.refresh) return hit.result;
    if (now - hit.at < REFRESH_GAP) return { benchmark: hit.result.benchmark, reason: "Refreshed less than a minute ago" };
  }
  const running = inflight.get(query);
  if (running) return running;
  if (opts.cachedOnly) return { benchmark: null, reason: "No retail benchmark yet" };
  const p = fetchBenchmark(query, item, now, opts).finally(() => inflight.delete(query));
  inflight.set(query, p);
  return p;
}

async function fetchBenchmark(query: string, item: Item, now: number, opts: Opts): Promise<Result> {
  let offers: Offer[];
  try {
    offers = await (opts.search ?? searchOffers)(query);
  } catch (e) {
    if (e instanceof ConfigError) return { benchmark: null, reason: e.message }; // never cached
    throw e;
  }
  const verdicts = await (opts.classify ?? classifyPacks)(item, offers);
  const usable = normalise(offers, verdicts, item.step * 4);
  // Backstop for a misread pack size: keep offers within 0.5x-2x of a first median.
  const first = usable.length ? median(usable.map((u) => u.price)) : 0;
  const kept = usable.filter((u) => u.price >= first / 2 && u.price <= first * 2);
  if (kept.length < MIN_OFFERS) {
    const prior = cache.get(query)?.result.benchmark;
    if (prior) return { benchmark: prior, reason: NOT_ENOUGH }; // a short refresh never wipes a good benchmark
    const result = { benchmark: null, reason: NOT_ENOUGH };
    cache.set(query, { at: now, ttl: NULL_TTL, result });
    return result;
  }
  const benchmark = { perUnit: median(kept.map((u) => u.price)), offers: kept, fetchedAt: new Date(now).toISOString() };
  const result = { benchmark };
  cache.set(query, { at: now, ttl: TTL, result });
  return result;
}
