import { tierAt } from "./round.ts";
import type { Round } from "./round.ts";

// The lowest price the supplier's concession policy allows at this volume. Far from the next tier, the tier price stands.
export function policyFloor(round: Round, units: number): number {
  const now = tierAt(round.tiers, units).price;
  const next = round.tiers.find((t) => t.min > units);
  const { withinPct, sharePct } = round.concession;
  if (!next || (next.min - units) * 100 > next.min * withinPct) return now;
  // Round the concession down: the supplier never gives more than its share.
  return Math.max(round.floor, now - Math.floor(((now - next.price) * sharePct) / 100));
}

// "Within 10% of the next tier, Brightline Paper Co. gives up to 50% of the price gap to it"
export const policyText = (round: Pick<Round, "concession" | "supplier">) =>
  `Within ${round.concession.withinPct}% of the next tier, ${round.supplier} gives up to ${round.concession.sharePct}% of the price gap to it`;

// The supplier's rules, enforced in code: no agent price reaches the round without passing this.
export function validateOffer(round: Round, units: number, price: number): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(price)) return { ok: false, reason: `Price must be whole cents per ${round.unit.one}` };
  const lowest = policyFloor(round, units);
  if (price < lowest) return { ok: false, reason: `Price is below the supplier's policy floor of ${lowest} cents` };
  const ceiling = tierAt(round.tiers, units).price;
  if (price > ceiling) return { ok: false, reason: `Price is above the current tier price of ${ceiling} cents` };
  return { ok: true };
}
