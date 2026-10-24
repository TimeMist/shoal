import { findProduct } from "@/lib/catalog";
import { createDealToken } from "@/lib/deal";
import { dealSecret } from "@/lib/paypal";
import { validateMove } from "@/lib/rules";

// Closes a deal at an agreed price. The seller agent's accept_offer tool will call this same path.
export async function POST(request: Request) {
  const { productId, price } = await request.json();
  const product = findProduct(String(productId));
  if (!product) return Response.json({ error: "Unknown product" }, { status: 404 });

  const verdict = validateMove(product.rules, { type: "accept", price: Number(price) });
  if (!verdict.ok) return Response.json({ error: verdict.reason }, { status: 422 });

  return Response.json({ dealToken: createDealToken(product.id, Number(price), dealSecret()) });
}
