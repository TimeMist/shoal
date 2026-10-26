import { verifyQuoteToken } from "@/lib/deal";
import { body, fail, paypalFail } from "@/lib/http";
import { authorizationMatches } from "@/lib/join";
import { publicCommitment } from "@/lib/privacy";
import { authorizeOrder, type Authorization, dealSecret, voidAuthorization } from "@/lib/paypal";
import { addCommitment, findByOrder, getState, markAuthorized } from "@/lib/store";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/orders/[orderId]/authorize">) {
  const { id, orderId } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  const { token } = await body(request);
  const q = typeof token === "string" ? verifyQuoteToken(token, dealSecret()) : null;
  if (!q || q.roundId !== id) return fail("Invalid or expired quote", 400);
  const existing = findByOrder(s, orderId);
  if (existing) return Response.json({ commitment: publicCommitment(existing) });
  if (s.round.status !== "open" || s.closing) return fail("Round is not open", 409);
  let auth: Authorization;
  try {
    auth = await authorizeOrder(orderId);
  } catch (e) {
    return paypalFail(e);
  }
  if (!authorizationMatches(auth, q)) {
    await voidAuthorization(auth.authorizationId).catch(() => {});
    return fail("Authorization does not match the quote", 400);
  }
  const again = findByOrder(s, orderId); // a double submit may have finished while PayPal was answering
  if (again) return Response.json({ commitment: publicCommitment(again) });
  try {
    addCommitment(s, { shop: q.shop, qty: q.qty, simulated: false, orderId, reserved: q.reserved, payerEmail: auth.payerEmail, address: auth.address });
  } catch (e) {
    await voidAuthorization(auth.authorizationId).catch(() => {}); // round closed mid-flight: release the hold
    return fail(e instanceof Error ? e.message : "Could not join", 409);
  }
  return Response.json({ commitment: publicCommitment(markAuthorized(s, orderId, auth.authorizationId)) });
}
