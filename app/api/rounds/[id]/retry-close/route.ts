import { retryClose } from "@/lib/close";
import { fail } from "@/lib/http";
import { issueInvoicesOnce } from "@/lib/invoices";
import { invoiceApi } from "@/lib/invoicing";
import { captureAuthorization, voidAuthorization } from "@/lib/paypal";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";

// Retries the captures or voids that failed at close, then invoices any shop that is now captured.
export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/retry-close">) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  const r = await retryClose(s, { capture: captureAuthorization, void: voidAuthorization });
  if (!r.ok) return fail(r.error, r.status);
  if (s.round.status === "closed") await issueInvoicesOnce(s, invoiceApi).catch(() => null);
  return Response.json({ failed: r.failed, state: publicState(s) });
}
