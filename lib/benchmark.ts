import { ConfigError } from "./http.ts";
import { searchOffers, type Offer } from "./channel3.ts";
import { classifyPacks, type PackVerdict } from "./agents/packs.ts";

export type Benchmark = {
  perCarton: number;
  offers: { merchant: string; url: string; cartons: number; price: number }[];
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

// Per-carton cents from Channel3's own prices; the model only supplied relevant + cartons.
export function normalise(offers: Offer[], verdicts: PackVerdict[]): Benchmark["offers"] {
  return offers.flatMap((o, i) => {
    const v = verdicts[i];
    if (!v?.relevant || !Number.isInteger(v.cartons) || v.cartons < 1 || v.cartons > 48) return [];
    if (o.currency !== "USD" || typeof o.price !== "number" || !(o.price > 0)) return [];
    return [{ merchant: o.merchant, url: o.url, cartons: v.cartons, price: Math.round(Math.round(o.price * 100) / v.cartons) }];
  });
}

export function median(cents: number[]): number {
  const s = [...cents].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// "Barista oat milk, 1 L carton" -> "barista oat milk 1L"
const queryFor = (product: string) => product.toLowerCase().replace(/,/g, "").replace(/(\d+)\s*l\b/g, "$1L").replace(/\bcartons?\b/g, "").replace(/\s+/g, " ").trim();

type Opts = {
  refresh?: boolean;
  now?: number;
  search?: (q: string) => Promise<Offer[]>;
  classify?: (product: string, offers: Offer[]) => Promise<PackVerdict[]>;
};

// key is a plain string so the caller can later pass a per-round query instead of the product.
export async function getBenchmark(product: string, opts: Opts = {}): Promise<Result> {
  const now = opts.now ?? Date.now();
  const hit = cache.get(product);
  if (hit && now - hit.at < hit.ttl) {
    if (!opts.refresh) return hit.result;
    const b = hit.result.benchmark;
    if (b && now - Date.parse(b.fetchedAt) < REFRESH_GAP) return { benchmark: b, reason: "Refreshed less than a minute ago" };
  }
  const running = inflight.get(product);
  if (running) return running;
  const p = fetchBenchmark(product, now, opts).finally(() => inflight.delete(product));
  inflight.set(product, p);
  return p;
}

async function fetchBenchmark(product: string, now: number, opts: Opts): Promise<Result> {
  let offers: Offer[];
  try {
    offers = await (opts.search ?? searchOffers)(queryFor(product));
  } catch (e) {
    if (e instanceof ConfigError) return { benchmark: null, reason: e.message }; // never cached
    throw e;
  }
  const verdicts = await (opts.classify ?? classifyPacks)(product, offers);
  const usable = normalise(offers, verdicts);
  if (usable.length < MIN_OFFERS) {
    const result = { benchmark: null, reason: NOT_ENOUGH };
    cache.set(product, { at: now, ttl: NULL_TTL, result });
    return result;
  }
  const benchmark = { perCarton: median(usable.map((u) => u.price)), offers: usable, fetchedAt: new Date(now).toISOString() };
  const result = { benchmark };
  cache.set(product, { at: now, ttl: TTL, result });
  return result;
}
