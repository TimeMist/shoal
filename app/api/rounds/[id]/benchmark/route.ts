import { fail } from "@/lib/http";
import { roundBenchmark } from "@/lib/benchmark";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";

async function run(ctx: RouteContext<"/api/rounds/[id]/benchmark">, refresh: boolean, cachedOnly = false) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  try {
    return Response.json(await roundBenchmark(s.round, { refresh, cachedOnly }));
  } catch (e) {
    // Same { benchmark, reason } contract as a plain "no benchmark"; not cached.
    return Response.json({ benchmark: null, reason: e instanceof Error ? e.message : "Benchmark lookup failed" }, { status: 502 });
  }
}

// ?cached=1 (shop pages) never spends a Channel3 credit; only the supplier console's GET and POST may look up.
export const GET = (r: Request, ctx: RouteContext<"/api/rounds/[id]/benchmark">) => run(ctx, false, new URL(r.url).searchParams.get("cached") === "1");
export const POST = (_r: Request, ctx: RouteContext<"/api/rounds/[id]/benchmark">) => run(ctx, true);
