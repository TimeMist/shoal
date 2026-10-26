import { fail } from "@/lib/http";
import { roundBenchmark } from "@/lib/benchmark";
import { getState } from "@/lib/store";

async function run(ctx: RouteContext<"/api/rounds/[id]/benchmark">, refresh: boolean) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  try {
    return Response.json(await roundBenchmark(s.round, { refresh }));
  } catch (e) {
    // Same { benchmark, reason } contract as a plain "no benchmark"; not cached.
    return Response.json({ benchmark: null, reason: e instanceof Error ? e.message : "Benchmark lookup failed" }, { status: 502 });
  }
}

export const GET = (_r: Request, ctx: RouteContext<"/api/rounds/[id]/benchmark">) => run(ctx, false);
export const POST = (_r: Request, ctx: RouteContext<"/api/rounds/[id]/benchmark">) => run(ctx, true);
