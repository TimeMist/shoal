import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "@google/genai";
import { MAX_TURNS, modelFromEnv, negotiate, providersFromEnv } from "@/lib/agents/negotiate";
import { geminiBusy } from "@/lib/gemini";
import { ConfigError, fail } from "@/lib/http";
import { validateOffer } from "@/lib/guard";
import { getState, unitsCommitted } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";
import { clientIp, waitSeconds } from "@/lib/throttle";

const open = (s: NonNullable<ReturnType<typeof getState>>) => s.round.status === "open" && !s.closing;

function errorMessage(e: unknown): string {
  if (geminiBusy(e)) return "Gemini is overloaded right now (high demand). Try again in a minute.";
  if (e instanceof Anthropic.APIError && e.status === 529) return "Claude is overloaded right now. Try again in a minute.";
  if (e instanceof Anthropic.APIError || e instanceof ApiError) return e.message;
  console.error(e); // the stream has started, so report it in-band rather than as a 500
  return "The negotiation failed. Try again.";
}

/**
 * Streams the negotiation as NDJSON so the console can show each turn as it happens:
 * { type: "start", providers, maxTurns }, then { type: "turn", turn } per turn,
 * then { type: "state", state } or { type: "error", error }.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/negotiate">) {
  const { id } = await ctx.params;
  const s = getState(id, await visitor());
  if (!s) return fail("Round not found", 404);
  if (!open(s)) return fail("Round is not open", 409);
  let model;
  try {
    model = modelFromEnv();
  } catch (e) {
    if (e instanceof ConfigError) return fail(e.message, e.status);
    throw e;
  }
  const wait = waitSeconds(`negotiate:${clientIp(request)}`, 30_000);
  if (wait) return fail(`One negotiation every 30 seconds. Try again in ${wait} s.`, 429);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: object) => ctl.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      send({ type: "start", providers: providersFromEnv(), maxTurns: MAX_TURNS });
      try {
        const { turns, agreed } = await negotiate(s, model, MAX_TURNS, (turn) => send({ type: "turn", turn }));
        // The models took a while: close may have started since.
        if (!open(s)) {
          send({ type: "error", error: "Round started closing during the negotiation" });
          return;
        }
        s.negotiation = turns;
        // More shops may have joined meanwhile and dropped the tier: re-check against the current count.
        s.agreedPrice = agreed !== undefined && validateOffer(s.round, unitsCommitted(s), agreed).ok ? agreed : undefined;
        send({ type: "state", state: publicState(s) });
      } catch (e) {
        send({ type: "error", error: errorMessage(e) });
      } finally {
        ctl.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store, no-transform" } });
}
