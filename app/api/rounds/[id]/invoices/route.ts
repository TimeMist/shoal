import { fail } from "@/lib/http";
import { issueInvoicesOnce } from "@/lib/invoices";
import { invoiceApi } from "@/lib/invoicing";
import { getState } from "@/lib/store";

// Retry: skips shops already invoiced and resumes half-issued ones.
export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/invoices">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  if (s.round.status !== "closed") return fail("Round is not closed", 409);
  const r = await issueInvoicesOnce(s, invoiceApi);
  if (!r) return fail("Invoices are already being issued", 409);
  return Response.json({ ...r, state: s });
}
