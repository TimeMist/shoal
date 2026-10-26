import type Anthropic from "@anthropic-ai/sdk";
import { ask } from "../claude.ts";
import type { Offer } from "../channel3.ts";

export type PackVerdict = { relevant: boolean; cartons: number };
// Raw verdicts from the model; classifyPacks validates them.
export type Model = (product: string, offers: Offer[]) => Promise<unknown>;

const TOOL: Anthropic.Beta.BetaTool = {
  name: "judge_offers",
  description: "For each listed offer, say whether it is the same product and how many 1-carton units it contains.",
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
            relevant: { type: "boolean", description: "True only if it is the same kind of product, in the same carton size" },
            cartons: { type: "integer", description: "Cartons in the pack the price is for (1 for a single carton)" },
          },
          required: ["index", "relevant", "cartons"],
          additionalProperties: false,
        },
      },
    },
    required: ["verdicts"],
    additionalProperties: false,
  },
};

export const claudeModel: Model = async (product, offers) => {
  const list = offers.map((o, i) => `${i}: ${o.title} (${o.merchant})`).join("\n");
  const res = await ask({
    system:
      "You compare retail listings with a wholesale product. For each offer say whether it is the same product and how many cartons the listed price covers. " +
      "Do not do any price maths. Call judge_offers exactly once, with one verdict per offer.",
    messages: [{ role: "user", content: `Product: ${product}\nOffers:\n${list}` }],
    tools: [TOOL],
  });
  const use = res.stop_reason === "tool_use" ? res.content.find((b) => b.type === "tool_use") : undefined;
  if (!use || use.type !== "tool_use") throw new Error(res.stop_reason === "refusal" ? "The model declined to judge the offers" : "The model made no judgement");
  return (use.input as { verdicts?: unknown }).verdicts;
};

export async function classifyPacks(product: string, offers: Offer[], model: Model = claudeModel): Promise<PackVerdict[]> {
  if (!offers.length) return [];
  const raw = await model(product, offers);
  if (!Array.isArray(raw)) throw new Error("Pack classifier returned no verdicts");
  const out: PackVerdict[] = offers.map(() => ({ relevant: false, cartons: 1 }));
  for (const v of raw as { index?: unknown; relevant?: unknown; cartons?: unknown }[]) {
    if (!Number.isInteger(v?.index) || (v.index as number) < 0 || (v.index as number) >= offers.length) throw new Error("Pack classifier returned a bad index");
    if (typeof v.relevant !== "boolean" || !Number.isInteger(v.cartons)) throw new Error("Pack classifier returned an invalid verdict");
    out[v.index as number] = { relevant: v.relevant, cartons: v.cartons as number };
  }
  return out;
}
