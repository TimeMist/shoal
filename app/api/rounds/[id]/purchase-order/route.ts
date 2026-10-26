import { fail } from "@/lib/http";
import { purchaseOrder } from "@/lib/privacy";
import { getState } from "@/lib/store";

// Purchase-order rows with delivery addresses, for the supplier only.
// shortcut: no auth in the demo; a real supplier would be authenticated
export async function GET(_request: Request, ctx: RouteContext<"/api/rounds/[id]/purchase-order">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  return Response.json({ rows: purchaseOrder(s) });
}
