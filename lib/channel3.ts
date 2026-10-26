import { ConfigError } from "./http.ts";

export type Offer = { merchant: string; url: string; title: string; price?: number /* dollars */; currency?: string };

// POST https://api.trychannel3.com/v1/search, header x-api-key, body { query, limit } (Channel3 docs via Context7).
export async function searchOffers(query: string): Promise<Offer[]> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new ConfigError("No Channel3 key");
  const res = await fetch("https://api.trychannel3.com/v1/search", {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ query, limit: 10 }),
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 402) throw new ConfigError("Channel3 credits used up", 402);
  if (!res.ok) throw new Error(`Channel3 search failed (${res.status})`);
  const data = (await res.json()) as { products?: any[] };
  return (data.products ?? []).flatMap((p) =>
    (p.offers ?? []).map((o: any): Offer => ({
      merchant: String(o.merchant?.name ?? o.domain ?? ""),
      url: String(o.url ?? ""),
      title: String(p.title ?? ""),
      // Docs show both `price` and `value` for the amount.
      price: typeof (o.price?.price ?? o.price?.value) === "number" ? (o.price.price ?? o.price.value) : undefined,
      currency: o.price?.currency,
    })),
  );
}
