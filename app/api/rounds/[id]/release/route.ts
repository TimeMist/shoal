import { releaseRound } from "@/lib/fulfil";
import { ConfigError, fail, supplierEmail } from "@/lib/http";
import { sendPayout } from "@/lib/paypal";
import { getState } from "@/lib/store";
import { publicState } from "@/lib/privacy";

export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/release">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  // shortcut: one sandbox supplier account for both demo suppliers; production pays each round's own supplier.
  try {
    const r = await releaseRound(s, supplierEmail(), sendPayout);
    return r.ok ? Response.json(publicState(s)) : fail(r.error, r.status);
  } catch (e) {
    if (e instanceof ConfigError) return fail(e.message, e.status);
    throw e;
  }
}
