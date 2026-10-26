import { ConfigError } from "./http.ts";
import { searchOffers, type Offer } from "./channel3.ts";
import { classifyPacks, type PackVerdict } from "./agents/packs.ts";

export type Benchmark = {
  perCarton: number;
  offers: { merchant: string; url: string; cartons: number; price: number }[];
  fetchedAt: string;
};

const TTL = 24 * 60 * 60 * 1000;
const MIN_OFFERS = 3;
const cache = new Map<string, { at: number; benchmark: Benchmark }>();

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

export async function getBenchmark(
  product: string,
  opts: {
    refresh?: boolean;
    now?: number;
    search?: (q: string) => Promise<Offer[]>;
    classify?: (product: string, offers: Offer[]) => Promise<PackVerdict[]>;
  } = {},
): Promise<{ benchmark: Benchmark | null; reason?: string }> {
  const now = opts.now ?? Date.now();
  const hit = cache.get(product);
  if (hit && !opts.refresh && now - hit.at < TTL) return { benchmark: hit.benchmark };
  let offers: Offer[];
  try {
    offers = await (opts.search ?? searchOffers)(queryFor(product));
  } catch (e) {
    if (e instanceof ConfigError) return { benchmark: null, reason: e.message };
    throw e;
  }
  const verdicts = await (opts.classify ?? classifyPacks)(product, offers);
  const usable = normalise(offers, verdicts);
  if (usable.length < MIN_OFFERS) return { benchmark: null, reason: "Not enough comparable offers" };
  const benchmark = { perCarton: median(usable.map((u) => u.price)), offers: usable, fetchedAt: new Date(now).toISOString() };
  cache.set(product, { at: now, benchmark });
  return { benchmark };
}
