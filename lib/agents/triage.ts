import type Anthropic from "@anthropic-ai/sdk";
import { ask } from "../claude.ts";
import { formatUSD } from "../money.ts";
import type { Round } from "../round.ts";
import { clampRefund } from "../settle.ts";
import type { Claim, Commitment } from "../store.ts";

export type Photo = { media_type: "image/jpeg" | "image/png"; data: string };
// The model proposes units, never money; `units` is unchecked until triage() validates it.
export type Model = (claim: Claim, c: Commitment, round: Round, photo?: Photo) => Promise<{ units: unknown; reason: string }>;

const tool = ({ unit }: Round): Anthropic.Beta.BetaTool => ({
  name: "propose_refund",
  description: `Propose how many ${unit.many} to refund for this delivery claim. Code turns ${unit.many} into money.`,
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      units: { type: "integer", description: `Whole ${unit.many} to refund; 0 if the claim is not supported` },
      reason: { type: "string", description: "One or two plain sentences for the person approving" },
    },
    required: ["units", "reason"],
    additionalProperties: false,
  },
});

export async function triage(
  claim: Claim,
  c: Commitment,
  round: Round,
  holdbackLeft: number,
  model: Model,
  photo?: Photo,
): Promise<{ refund: number; reason: string }> {
  const p = await model(claim, c, round, photo);
  if (typeof p.units !== "number" || !Number.isInteger(p.units) || p.units < 0) throw new Error(`Triage returned invalid ${round.unit.many}`);
  // The shop's note could talk the model into a bigger number: never refund more units than were claimed.
  const requested = Math.min(p.units, claim.units) * (round.finalPrice ?? 0);
  // Delivery is never refunded, so the shop's cap is the goods it paid for.
  const goods = (c.captured ?? 0) - c.delivery;
  const paid = goods - c.refunded;
  const { refund, shortfall } = clampRefund(requested, goods, c.refunded, holdbackLeft);
  if (!shortfall) return { refund, reason: p.reason };
  const why =
    holdbackLeft < paid
      ? `Only ${formatUSD(holdbackLeft)} is left in the supplier's holdback.`
      : `The shop paid only ${formatUSD(paid)} for the goods in this order.`;
  return { refund, reason: `${p.reason} The ${formatUSD(requested)} request was cut to ${formatUSD(refund)}. ${why}` };
}

export const claudeTriage: Model = async (claim, c, round, photo) => {
  const { many } = round.unit;
  const text =
    `Shop ${c.shop} ordered ${c.qty} ${many}. Claim: ${claim.kind}, ${claim.units} ${many}. Note from the shop: ${claim.note || "(none)"}.` +
    (photo ? " A photo is attached." : " No photo was attached.");
  const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text }];
  if (photo) content.unshift({ type: "image", source: { type: "base64", media_type: photo.media_type, data: photo.data } });
  const res = await ask({
    system:
      `You triage delivery claims for a group-buy of ${round.product}. Decide how many ${many} deserve a refund, from 0 up to the ${many} claimed. ` +
      `Be fair to the shop but do not refund ${many} the evidence does not support. A person approves before any money moves. Call propose_refund exactly once.`,
    messages: [{ role: "user", content }],
    tools: [tool(round)],
  });
  const use = res.stop_reason === "tool_use" ? res.content.find((b) => b.type === "tool_use") : undefined;
  if (!use || use.type !== "tool_use") throw new Error(res.stop_reason === "refusal" ? "The model declined to triage this claim" : "The model made no proposal");
  const a = use.input as { units?: unknown; reason?: unknown };
  return { units: a.units, reason: typeof a.reason === "string" ? a.reason : "" };
};
