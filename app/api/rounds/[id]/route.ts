import { fail } from "@/lib/http";
import { getState } from "@/lib/store";

export async function GET(_request: Request, ctx: RouteContext<"/api/rounds/[id]">) {
  const { id } = await ctx.params;
  const s = getState(id);
  return s ? Response.json(s) : fail("Round not found", 404);
}
