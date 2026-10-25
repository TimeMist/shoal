import { shipRound } from "@/lib/fulfil";
import { ConfigError, fail, supplierEmail } from "@/lib/http";
import { addTracking, sendPayout } from "@/lib/paypal";
import { getState } from "@/lib/store";

export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/ship">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  try {
    const r = await shipRound(s, supplierEmail(), { payout: sendPayout, track: addTracking });
    return r.ok ? Response.json(s) : fail(r.error, r.status);
  } catch (e) {
    if (e instanceof ConfigError) return fail(e.message, e.status);
    throw e;
  }
}
