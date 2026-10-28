import { fail } from "@/lib/http";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";

export async function GET(_request: Request, ctx: RouteContext<"/api/rounds/[id]">) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  return s ? Response.json(publicState(s)) : fail("Round not found", 404);
}
