import { fail } from "@/lib/http";
import { getBenchmark } from "@/lib/benchmark";
import { getState } from "@/lib/store";

async function run(ctx: RouteContext<"/api/rounds/[id]/benchmark">, refresh: boolean) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  try {
    return Response.json(await getBenchmark(s.round.product, { refresh }));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Benchmark failed", 502);
  }
}

export const GET = (_r: Request, ctx: RouteContext<"/api/rounds/[id]/benchmark">) => run(ctx, false);
export const POST = (_r: Request, ctx: RouteContext<"/api/rounds/[id]/benchmark">) => run(ctx, true);
