import { body, fail, paypalFail } from "@/lib/http";
import { refundCapture } from "@/lib/paypal";
import { clampRefund } from "@/lib/settle";
import { getState } from "@/lib/store";

const busy = new Set<string>();

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/claims/[claimId]">) {
  const { id, claimId } = await ctx.params;
  const s = getState(id);
  const claim = s?.claims.find((x) => x.id === claimId);
  const c = s?.commitments.find((x) => x.id === claim?.commitmentId);
  if (!s || !claim || !c) return fail("Claim not found", 404);
  const { decision } = await body(request);
  if (decision !== "approve" && decision !== "reject") return fail("decision must be approve or reject", 400);
  if (claim.status !== "open" || busy.has(claimId)) return fail("Claim is not open", 409);

  if (decision === "reject") {
    claim.status = "rejected";
    c.status = "delivered";
    return Response.json(s);
  }
  // Re-clamp: the holdback or earlier refunds may have changed since the proposal.
  const { refund } = clampRefund(claim.proposal?.refund ?? 0, c.captured ?? 0, c.refunded, s.holdbackLeft);
  if (refund > 0 && !c.simulated) {
    busy.add(claimId);
    try {
      await refundCapture(c.captureId!, refund, `Shoal claim ${claim.kind}: ${claim.cartons} cartons`);
    } catch (e) {
      return paypalFail(e);
    } finally {
      busy.delete(claimId);
    }
  }
  c.refunded += refund;
  s.holdbackLeft -= refund;
  claim.status = "approved";
  c.status = "resolved";
  return Response.json(s);
}
