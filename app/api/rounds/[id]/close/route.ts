import { closeRound } from "@/lib/close";
import { fail } from "@/lib/http";
import { captureAuthorization, voidAuthorization } from "@/lib/paypal";
import { beginClose, getState } from "@/lib/store";

export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/close">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  if (!beginClose(s)) return fail("Round is not open or is already closing", 409);
  await closeRound(s, { capture: captureAuthorization, void: voidAuthorization });
  return Response.json(s);
}
