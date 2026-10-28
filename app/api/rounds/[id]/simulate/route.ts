import { body, fail } from "@/lib/http";
import { DEMO_SHOPS, simulateShops } from "@/lib/seed";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/simulate">) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  if (s.round.status !== "open" || s.closing) return fail("Round is not open", 409);
  const { count } = await body(request);
  if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > DEMO_SHOPS.length) return fail(`count must be 1 to ${DEMO_SHOPS.length}`, 400);
  simulateShops(s, count as number);
  return Response.json(publicState(s));
}
