import { approveClaim, rejectClaim } from "@/lib/claims";
import { body, fail } from "@/lib/http";
import { invoiceApi } from "@/lib/invoicing";
import { refundCapture } from "@/lib/paypal";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/claims/[claimId]">) {
  const { id, claimId } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  const { decision } = await body(request);
  if (decision !== "approve" && decision !== "reject") return fail("decision must be approve or reject", 400);
  const r = decision === "approve" ? await approveClaim(s, claimId, refundCapture, invoiceApi.recordRefund) : rejectClaim(s, claimId);
  return r.ok ? Response.json({ refunded: r.refunded, state: publicState(s) }) : fail(r.error, r.status);
}
