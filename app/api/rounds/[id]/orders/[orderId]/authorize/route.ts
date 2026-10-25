import { verifyQuoteToken } from "@/lib/deal";
import { body, fail, paypalFail } from "@/lib/http";
import { authorizeOrder, dealSecret, voidAuthorization } from "@/lib/paypal";
import { addCommitment, findByOrder, getState, markAuthorized } from "@/lib/store";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/orders/[orderId]/authorize">) {
  const { id, orderId } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  const { token } = await body(request);
  const q = typeof token === "string" ? verifyQuoteToken(token, dealSecret()) : null;
  if (!q || q.roundId !== id) return fail("Invalid or expired quote", 400);
  const existing = findByOrder(s, orderId);
  if (existing) return Response.json({ commitment: existing });
  if (s.round.status !== "open") return fail("Round is not open", 409);
  let authorizationId: string;
  try {
    authorizationId = await authorizeOrder(orderId);
  } catch (e) {
    return paypalFail(e);
  }
  const again = findByOrder(s, orderId); // a double submit may have finished while PayPal was answering
  if (again) return Response.json({ commitment: again });
  try {
    addCommitment(s, { shop: q.shop, qty: q.qty, simulated: false, orderId, reserved: q.reserved });
  } catch (e) {
    await voidAuthorization(authorizationId).catch(() => {}); // round closed mid-flight: release the hold
    return fail(e instanceof Error ? e.message : "Could not join", 409);
  }
  return Response.json({ commitment: markAuthorized(s, orderId, authorizationId) });
}
