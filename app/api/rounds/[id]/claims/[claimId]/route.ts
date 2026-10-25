import { approveClaim, rejectClaim } from "@/lib/claims";
import { body, fail } from "@/lib/http";
import { refundCapture } from "@/lib/paypal";
import { getState } from "@/lib/store";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/claims/[claimId]">) {
  const { id, claimId } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  const { decision } = await body(request);
  if (decision !== "approve" && decision !== "reject") return fail("decision must be approve or reject", 400);
  const r = decision === "approve" ? await approveClaim(s, claimId, refundCapture) : rejectClaim(s, claimId);
  return r.ok ? Response.json({ refunded: r.refunded, state: s }) : fail(r.error, r.status);
}
