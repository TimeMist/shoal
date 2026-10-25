import type Anthropic from "@anthropic-ai/sdk";
import type { Content, FunctionDeclaration } from "@google/genai";
import { ask } from "../claude.ts";
import { askGemini } from "../gemini.ts";
import { validateOffer } from "../guard.ts";
import { ConfigError } from "../http.ts";
import { tierAt } from "../round.ts";
import { unitsCommitted } from "../store.ts";
import type { NegotiationTurn, RoundState } from "../store.ts";

export type Provider = "claude" | "gemini";
type Side = NegotiationTurn["side"];
export type Decision = {
  tool: "propose" | "accept" | "walk_away" | "none";
  price?: number;
  message: string;
  provider: Provider;
};
export type Model = (side: Side, transcript: NegotiationTurn[], s: RoundState) => Promise<Decision>;

const TOOL_NAMES = { propose_price: "propose", accept_price: "accept", walk_away: "walk_away" } as const;
const priceSchema = {
  type: "object",
  properties: {
    price_cents: { type: "integer", description: "Price per carton in whole cents" },
    message: { type: "string", description: "One or two sentences to the other agent" },
  },
  required: ["price_cents", "message"],
  additionalProperties: false,
};
const TOOLS = [
  { name: "propose_price", description: "Propose a price per carton to the other agent.", schema: priceSchema },
  { name: "accept_price", description: "Accept the other agent's last valid price, which ends the negotiation.", schema: priceSchema },
  {
    name: "walk_away",
    description: "End the negotiation with no deal.",
    schema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
      additionalProperties: false,
    },
  },
];

export async function negotiate(
  s: RoundState,
  model: Model,
  maxTurns = 6,
): Promise<{ turns: NegotiationTurn[]; agreed?: number }> {
  const turns: NegotiationTurn[] = [];
  const units = unitsCommitted(s);
  for (let i = 0; i < maxTurns; i++) {
    const side: Side = i % 2 === 0 ? "shop" : "supplier";
    const d = await model(side, turns, s);
    const turn: NegotiationTurn = { side, provider: d.provider, price: d.price ?? 0, message: d.message, verdict: "ok" };
    turns.push(turn);
    if (d.tool === "none") {
      Object.assign(turn, { verdict: "rejected", reason: "no tool call" });
      continue;
    }
    if (d.tool === "walk_away") return { turns };
    const verdict = d.price === undefined ? { ok: false as const, reason: "price_cents is required" } : validateOffer(s.round, units, d.price);
    if (!verdict.ok) {
      Object.assign(turn, { verdict: "rejected", reason: verdict.reason });
      continue;
    }
    if (d.tool === "accept") {
      const offer = turns.findLast((t) => t.side !== side && t.verdict === "ok");
      if (offer?.price !== d.price) {
        Object.assign(turn, { verdict: "rejected", reason: "You can only accept the other agent's last valid price" });
        continue;
      }
      return { turns, agreed: d.price };
    }
  }
  return { turns };
}

function system(side: Side, s: RoundState): string {
  const { round } = s;
  const units = unitsCommitted(s);
  const now = tierAt(round.tiers, units);
  const next = round.tiers.find((t) => t.min > units);
  const tiers = round.tiers.map((t) => `${t.min}+ cartons: ${t.price}`).join("; ");
  const facts =
    `Product: ${round.product} from ${round.supplier}. Prices are whole cents per carton. ` +
    `${s.commitments.length} independent shops have committed ${units} cartons and prepaid-authorised them. Tier price list: ${tiers}. ` +
    `At ${units} cartons the current tier price is ${now.price}.` +
    (next ? ` The next tier is ${next.min} cartons at ${next.price}.` : "");
  const rules = `A code guard checks every price you propose or accept: it must be a whole number of cents, at least the supplier floor and at most ${now.price}. Rejected prices come back as an error and you must try again. Each turn call exactly one tool.`;
  return side === "shop"
    ? `You are the buying agent for a group of ${s.commitments.length} small shops. Get the lowest price per carton you can. ${facts} The supplier will not go below its own floor, which you do not know. Aim below the current tier price, concede in small steps and accept a good price rather than walk away. ${rules}`
    : `You are the sales agent for ${round.supplier}. Your floor is ${round.floor} cents per carton and you must never go below it. ${facts} The ${next?.min ?? 1500}-carton threshold is just ${next ? next.min - units : 0} cartons away, and ${units} prepaid cartons committed today is worth real value: guaranteed volume, no credit risk. Protect margin but close the deal rather than lose it. ${rules}`;
}

// Steps from one side's point of view. The other side's rejected tries never reached us, so they are skipped.
type Step =
  | { self: true; id: string; name: string; args: Record<string, unknown> }
  | { self: false; result?: { id: string; name: string; error?: string }; texts: string[] };

function steps(side: Side, transcript: NegotiationTurn[]): Step[] {
  const out: Step[] = [{ self: false, texts: [side === "shop" ? "The negotiation is open. Make your first move." : "The negotiation is open. The shop agent moves first."] }];
  const last = () => out[out.length - 1] as Extract<Step, { self: false }>;
  transcript.forEach((t, i) => {
    if (t.side === side) {
      const name = t.price ? "propose_price" : "walk_away";
      out.push({ self: true, id: `turn_${i}`, name, args: { price_cents: t.price, message: t.message } });
      out.push({ self: false, result: { id: `turn_${i}`, name, error: t.verdict === "rejected" ? t.reason : undefined }, texts: [] });
    } else if (t.verdict === "ok") {
      last().texts.push(`The ${t.side} agent proposes ${t.price} cents per carton: ${t.message}`);
    }
  });
  return out;
}

function decision(name: string | undefined, input: unknown, provider: Provider): Decision {
  const tool = TOOL_NAMES[name as keyof typeof TOOL_NAMES];
  const a = (input ?? {}) as { price_cents?: unknown; message?: unknown };
  if (!tool) return { tool: "none", message: "", provider };
  return {
    tool,
    price: typeof a.price_cents === "number" ? a.price_cents : undefined,
    message: typeof a.message === "string" ? a.message : "",
    provider,
  };
}

export const claudeNegotiator: Model = async (side, transcript, s) => {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const st of steps(side, transcript)) {
    if (st.self) {
      messages.push({ role: "assistant", content: [{ type: "tool_use", id: st.id, name: st.name, input: st.args }] });
      continue;
    }
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (st.result) {
      const { id, error } = st.result;
      content.push({ type: "tool_result", tool_use_id: id, content: error ?? "Delivered.", is_error: !!error });
    }
    st.texts.forEach((text) => content.push({ type: "text", text }));
    if (content.length) messages.push({ role: "user", content });
  }
  const res = await ask({
    system: system(side, s),
    messages,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, strict: true, input_schema: t.schema as Anthropic.Beta.BetaTool["input_schema"] })),
  });
  if (res.stop_reason === "refusal") return { tool: "walk_away", message: "The model declined to continue.", provider: "claude" };
  const use = res.stop_reason === "tool_use" ? res.content.find((b) => b.type === "tool_use") : undefined;
  return use && use.type === "tool_use" ? decision(use.name, use.input, "claude") : { tool: "none", message: "", provider: "claude" };
};

export const geminiNegotiator: Model = async (side, transcript, s) => {
  const contents: Content[] = [];
  for (const st of steps(side, transcript)) {
    if (st.self) {
      contents.push({ role: "model", parts: [{ functionCall: { name: st.name, args: st.args } }] });
      continue;
    }
    const parts: NonNullable<Content["parts"]> = [];
    if (st.result) parts.push({ functionResponse: { name: st.result.name, response: st.result.error ? { error: st.result.error } : { output: "Delivered." } } });
    st.texts.forEach((text) => parts.push({ text }));
    if (parts.length) contents.push({ role: "user", parts });
  }
  const res = await askGemini({
    system: system(side, s),
    contents,
    tools: TOOLS.map((t): FunctionDeclaration => ({ name: t.name, description: t.description, parametersJsonSchema: t.schema })),
  });
  const call = res.functionCalls?.[0];
  return decision(call?.name, call?.args, "gemini");
};

export function negotiatorFor(provider: string): Model {
  if (provider === "claude") return claudeNegotiator;
  if (provider === "gemini") return geminiNegotiator;
  throw new ConfigError(`Unknown agent provider "${provider}". Use "claude" or "gemini".`, 400);
}

const KEYS = { claude: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY" } as const;

// Reads the two provider settings and fails loudly: no silent fallback.
export function modelFromEnv(env = process.env): Model {
  const pick = (v: string | undefined) => v || "claude";
  const byside = { shop: pick(env.SHOP_AGENT_PROVIDER), supplier: pick(env.SUPPLIER_AGENT_PROVIDER) };
  const models = { shop: negotiatorFor(byside.shop), supplier: negotiatorFor(byside.supplier) };
  for (const p of new Set(Object.values(byside)) as Set<Provider>) {
    if (!env[KEYS[p]]) throw new ConfigError(`${KEYS[p]} is not set (needed for the ${p} agent)`);
  }
  return (side, transcript, s) => models[side](side, transcript, s);
}
