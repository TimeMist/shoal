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
    price_cents: { type: "integer", description: "Price per unit in whole cents" },
    message: { type: "string", description: "One or two sentences to the other agent" },
  },
  required: ["price_cents", "message"],
  additionalProperties: false,
};
const TOOLS = [
  { name: "propose_price", description: "Propose a price per unit to the other agent.", schema: priceSchema },
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

export const MAX_TURNS = 8;

export async function negotiate(
  s: RoundState,
  model: Model,
  maxTurns = MAX_TURNS,
): Promise<{ turns: NegotiationTurn[]; agreed?: number }> {
  const turns: NegotiationTurn[] = [];
  const units = unitsCommitted(s);
  for (let i = 0; i < maxTurns; i++) {
    const side: Side = i % 2 === 0 ? "shop" : "supplier";
    const d = await model(side, turns, s);
    const turn: NegotiationTurn = { side, provider: d.provider, move: d.tool, price: d.price ?? 0, message: d.message, verdict: "ok" };
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
  const { one, many } = round.unit;
  const tiers = round.tiers.map((t) => `${t.min}+ ${many}: ${t.price}`).join("; ");
  const facts =
    `Product: ${round.product} from ${round.supplier}. Prices are whole cents per ${one}. ` +
    `${s.commitments.length} independent shops have committed ${units} ${many} and prepaid-authorised them. Tier price list: ${tiers}. ` +
    `At ${units} ${many} the current tier price is ${now.price}.` +
    (next ? ` The next tier is ${next.min} ${many} at ${next.price}.` : "");
  const rules =
    `A code guard checks every price you propose or accept: a whole number of cents, within the supplier's limits and at most ${now.price}; a rejected price comes back so you can retry. ` +
    `The negotiation has ${MAX_TURNS} turns in total, shared by both sides, and each turn you call exactly one tool. ` +
    `With no deal the round closes at the current tier price of ${now.price}, so both sides are better off agreeing before the last turn.`;
  return side === "shop"
    ? `You are the buying agent for a group of ${s.commitments.length} small shops. Get a lower price per ${one} than ${now.price}. ${facts} Open with a credible offer, not a lowball; the supplier has a floor you do not know. Each counter should move toward the supplier's last price, and accept a supplier price within a few cents of your own last offer. ${rules}`
    : `You are the sales agent for ${round.supplier}. Your floor is ${round.floor} cents per ${one} and you must never go below it. ${facts} ${units} committed, prepaid ${many}${next ? ` are close to the ${next.min}-${one} tier` : ""} and are worth real value: guaranteed volume, no credit risk. Settle somewhere between your floor and ${now.price}, and close the deal rather than lose it. ${rules}`;
}

// Plain-text history from one side's point of view: its own moves as assistant text, everything else as user text.
// No tool_use/functionCall replay (thinking blocks and thought signatures can't be rebuilt); tools are offered per call.
// The other side's rejected tries never reached us, so they are skipped.
const VERB = { propose: "I proposed", accept: "I tried to accept", walk_away: "I walked away", none: "I made no valid move" };

export function chat(side: Side, transcript: NegotiationTurn[], unit = "unit"): { role: "user" | "assistant"; text: string }[] {
  const out: { role: "user" | "assistant"; text: string }[] = [
    { role: "user", text: side === "shop" ? "The negotiation is open. Make your first move." : "The negotiation is open. The shop agent moves first." },
  ];
  const add = (role: "user" | "assistant", text: string) => {
    const last = out[out.length - 1];
    if (last.role === role) last.text += `\n${text}`;
    else out.push({ role, text });
  };
  for (const t of transcript) {
    if (t.side === side) {
      add("assistant", `${VERB[t.move]}${t.price ? ` ${t.price} cents` : ""}: ${t.message}`);
      // The shop must not learn the supplier's floor from a rejection.
      const reason = side === "shop" && /floor/.test(t.reason ?? "") ? "Price is below what the supplier can accept" : t.reason;
      if (t.verdict === "rejected") add("user", `The guard rejected that move: ${reason}. Try again.`);
    } else if (t.verdict === "ok") {
      add("user", `The ${t.side} agent proposes ${t.price} cents per ${unit}: ${t.message}`);
    }
  }
  if (out[out.length - 1].role === "assistant") add("user", "Your turn.");
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
  const messages: Anthropic.Beta.BetaMessageParam[] = chat(side, transcript, s.round.unit.one).map((m) => ({ role: m.role, content: m.text }));
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
  const contents: Content[] = chat(side, transcript, s.round.unit.one).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] }));
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
