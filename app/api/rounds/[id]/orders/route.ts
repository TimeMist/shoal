import { verifyQuoteToken } from "@/lib/deal";
import { body, fail, paypalFail } from "@/lib/http";
import { createAuthorizeOrder, dealSecret } from "@/lib/paypal";
import { getState } from "@/lib/store";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/orders">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  if (s.round.status !== "open" || s.closing) return fail("Round is not open", 409);
  const { token } = await body(request);
  const q = typeof token === "string" ? verifyQuoteToken(token, dealSecret()) : null;
  if (!q || q.roundId !== id) return fail("Invalid or expired quote", 400);
  try {
    const orderId = await createAuthorizeOrder(q.reserved, `${s.round.product} x ${q.qty}`, id);
    return Response.json({ orderId });
  } catch (e) {
    return paypalFail(e);
  }
}
