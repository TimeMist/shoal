import { fail } from "@/lib/http";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";

// The shop's own invoice link, kept out of the shared round state.
// shortcut: no auth in the demo; real shops would be authenticated
export async function GET(_request: Request, ctx: RouteContext<"/api/rounds/[id]/commitments/[commitmentId]/invoice">) {
  const { id, commitmentId } = await ctx.params;
  const c = getState(id, await visitor())?.commitments.find((x) => x.id === commitmentId);
  if (!c?.invoiceUrl) return fail("Invoice not found", 404);
  return Response.json({ invoiceUrl: c.invoiceUrl });
}
