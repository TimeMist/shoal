import { createQuoteToken } from "@/lib/deal";
import { body, fail } from "@/lib/http";
import { dealSecret } from "@/lib/paypal";
import { reserveCents, validateQty } from "@/lib/round";
import { getState, unitsCommitted } from "@/lib/store";
import { visitor } from "@/lib/visitor";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/quote">) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  if (s.round.status !== "open" || s.closing) return fail("Round is not open", 409);
  const { shop, qty } = await body(request);
  if (typeof shop !== "string" || !shop.trim()) return fail("Shop name is required", 400);
  const err = validateQty(s.round, qty as number);
  if (err) return fail(err, 400);
  const reserved = reserveCents(s.round, unitsCommitted(s), qty as number);
  const token = createQuoteToken({ roundId: id, shop: shop.trim(), qty: qty as number, reserved }, dealSecret());
  return Response.json({ token, reserved });
}
