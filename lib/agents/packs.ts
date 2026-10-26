import type Anthropic from "@anthropic-ai/sdk";
import { ask } from "../claude.ts";
import type { Offer } from "../channel3.ts";
import type { Round } from "../round.ts";

export type Item = Pick<Round, "product" | "unit" | "matchHint">;
export type PackVerdict = { relevant: boolean; units: number };
// Raw verdicts from the model; classifyPacks validates them.
export type Model = (item: Item, offers: Offer[]) => Promise<unknown>;

// The model sees the round's unit; the schema field is a plain count of units.
const tool = ({ unit, matchHint }: Item): Anthropic.Beta.BetaTool => ({
  name: "judge_offers",
  description: `For each listed offer, say whether it is the same product and how many single ${unit.many} it contains.`,
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", description: "Offer number from the list" },
            relevant: { type: "boolean", description: `True only if it is the same product type and size: ${matchHint}` },
            units: { type: "integer", description: `Number of ${unit.many} in the pack the price is for (1 for a single ${unit.one})` },
          },
          required: ["index", "relevant", "units"],
          additionalProperties: false,
        },
      },
    },
    required: ["verdicts"],
    additionalProperties: false,
  },
});

// Title and details only: the model never sees prices.
export function offerList(offers: Offer[]): string {
  return offers.map((o, i) => `${i}: ${o.title} (${o.merchant})${o.details ? `\n   Details: ${o.details}` : ""}`).join("\n");
}

export const claudeModel: Model = async (item, offers) => {
  const list = offerList(offers);
  const res = await ask({
    system:
      `You compare retail listings with a wholesale product. For each offer say whether it is the same product and how many ${item.unit.many} the listed price covers. ` +
      "Do not do any price maths. Call judge_offers exactly once, with one verdict per offer.",
    messages: [{ role: "user", content: `Product: ${item.product}\nUnit: one ${item.unit.one}\nSame product means: ${item.matchHint}\nOffers:\n${list}` }],
    tools: [tool(item)],
  }, { timeout: 20_000 });
  const use = res.stop_reason === "tool_use" ? res.content.find((b) => b.type === "tool_use") : undefined;
  if (!use || use.type !== "tool_use") throw new Error(res.stop_reason === "refusal" ? "The model declined to judge the offers" : "The model made no judgement");
  return (use.input as { verdicts?: unknown }).verdicts;
};

export async function classifyPacks(item: Item, offers: Offer[], model: Model = claudeModel): Promise<PackVerdict[]> {
  if (!offers.length) return [];
  const raw = await model(item, offers);
  if (!Array.isArray(raw)) throw new Error("Pack classifier returned no verdicts");
  const out: PackVerdict[] = offers.map(() => ({ relevant: false, units: 1 }));
  for (const v of raw as { index?: unknown; relevant?: unknown; units?: unknown }[]) {
    if (!Number.isInteger(v?.index) || (v.index as number) < 0 || (v.index as number) >= offers.length) throw new Error("Pack classifier returned a bad index");
    if (typeof v.relevant !== "boolean" || !Number.isInteger(v.units)) throw new Error("Pack classifier returned an invalid verdict");
    out[v.index as number] = { relevant: v.relevant, units: v.units as number };
  }
  return out;
}
