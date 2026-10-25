import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "@google/genai";
import { modelFromEnv, negotiate } from "@/lib/agents/negotiate";
import { ConfigError, fail } from "@/lib/http";
import { validateOffer } from "@/lib/guard";
import { getState, unitsCommitted } from "@/lib/store";

const open = (s: NonNullable<ReturnType<typeof getState>>) => s.round.status === "open" && !s.closing;

export async function POST(_request: Request, ctx: RouteContext<"/api/rounds/[id]/negotiate">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  if (!open(s)) return fail("Round is not open", 409);
  try {
    const { turns, agreed } = await negotiate(s, modelFromEnv());
    // The models took a while: close may have started since.
    if (!open(s)) return fail("Round started closing during the negotiation", 409);
    s.negotiation = turns;
    // More shops may have joined meanwhile and dropped the tier: re-check against the current count.
    s.agreedPrice = agreed !== undefined && validateOffer(s.round, unitsCommitted(s), agreed).ok ? agreed : undefined;
    return Response.json(s);
  } catch (e) {
    if (e instanceof ConfigError) return fail(e.message, e.status);
    if (e instanceof Anthropic.APIError || e instanceof ApiError) return fail(e.message, 502);
    throw e;
  }
}
