import { closeRound } from "@/lib/close";
import { fail } from "@/lib/http";
import { issueInvoicesOnce } from "@/lib/invoices";
import { invoiceApi } from "@/lib/invoicing";
import { captureAuthorization, voidAuthorization } from "@/lib/paypal";
import { beginClose, getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";

export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/close">) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  if (!beginClose(s)) return fail("Round is not open or is already closing", 409);
  await closeRound(s, { capture: captureAuthorization, void: voidAuthorization });
  // Invoice failures are recorded per shop and never change the close response.
  // shortcut: invoicing is awaited inside /close (slower response per real shop); move to a background job if it gets slow.
  if (s.round.status === "closed") await issueInvoicesOnce(s, invoiceApi).catch(() => null);
  return Response.json(publicState(s));
}
