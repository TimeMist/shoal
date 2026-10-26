import type Anthropic from "@anthropic-ai/sdk";
import { ask } from "../claude.ts";
import { formatUSD } from "../money.ts";
import { goodsCents, type Round } from "../round.ts";
import { clampRefund } from "../settle.ts";
import type { Claim, Commitment } from "../store.ts";

export type Photo = { media_type: "image/jpeg" | "image/png"; data: string };
// The model proposes cartons, never money; `cartons` is unchecked until triage() validates it.
export type Model = (claim: Claim, c: Commitment, photo?: Photo) => Promise<{ cartons: unknown; reason: string }>;

const TOOL: Anthropic.Beta.BetaTool = {
  name: "propose_refund",
  description: "Propose how many cartons to refund for this delivery claim. Code turns cartons into money.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      cartons: { type: "integer", description: "Whole cartons to refund; 0 if the claim is not supported" },
      reason: { type: "string", description: "One or two plain sentences for the person approving" },
    },
    required: ["cartons", "reason"],
    additionalProperties: false,
  },
};

export async function triage(
  claim: Claim,
  c: Commitment,
  round: Round,
  holdbackLeft: number,
  model: Model,
  photo?: Photo,
): Promise<{ refund: number; reason: string }> {
  const p = await model(claim, c, photo);
  if (typeof p.cartons !== "number" || !Number.isInteger(p.cartons) || p.cartons < 0) throw new Error("Triage returned invalid cartons");
  // The shop's note could talk the model into a bigger number: never refund more cartons than were claimed.
  const requested = Math.min(p.cartons, claim.cartons) * (round.finalPrice ?? 0);
  // Delivery is never refunded, so the shop's cap is the goods it paid for.
  const goods = goodsCents(round, c.qty, c.captured ?? 0);
  const paid = goods - c.refunded;
  const { refund, shortfall } = clampRefund(requested, goods, c.refunded, holdbackLeft);
  if (!shortfall) return { refund, reason: p.reason };
  const why =
    holdbackLeft < paid
      ? `Only ${formatUSD(holdbackLeft)} is left in the supplier's holdback.`
      : `The shop paid only ${formatUSD(paid)} for the goods in this order.`;
  return { refund, reason: `${p.reason} The ${formatUSD(requested)} request was cut to ${formatUSD(refund)}. ${why}` };
}

export const claudeTriage: Model = async (claim, c, photo) => {
  const text =
    `Shop ${c.shop} ordered ${c.qty} cartons. Claim: ${claim.kind}, ${claim.cartons} cartons. Note from the shop: ${claim.note || "(none)"}.` +
    (photo ? " A photo is attached." : " No photo was attached.");
  const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text }];
  if (photo) content.unshift({ type: "image", source: { type: "base64", media_type: photo.media_type, data: photo.data } });
  const res = await ask({
    system:
      "You triage delivery claims for a group-buy of oat milk. Decide how many cartons deserve a refund, from 0 up to the cartons claimed. " +
      "Be fair to the shop but do not refund cartons the evidence does not support. A person approves before any money moves. Call propose_refund exactly once.",
    messages: [{ role: "user", content }],
    tools: [TOOL],
  });
  const use = res.stop_reason === "tool_use" ? res.content.find((b) => b.type === "tool_use") : undefined;
  if (!use || use.type !== "tool_use") throw new Error(res.stop_reason === "refusal" ? "The model declined to triage this claim" : "The model made no proposal");
  const a = use.input as { cartons?: unknown; reason?: unknown };
  return { cartons: a.cartons, reason: typeof a.reason === "string" ? a.reason : "" };
};
