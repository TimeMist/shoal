import { tierAt } from "./round.ts";
import type { Round } from "./round.ts";

// The supplier's rules, enforced in code: no agent price reaches the round without passing this.
export function validateOffer(round: Round, units: number, price: number): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(price)) return { ok: false, reason: `Price must be whole cents per ${round.unit.one}` };
  if (price < round.floor) return { ok: false, reason: `Price is below the supplier's floor of ${round.floor} cents` };
  const ceiling = tierAt(round.tiers, units).price;
  if (price > ceiling) return { ok: false, reason: `Price is above the current tier price of ${ceiling} cents` };
  return { ok: true };
}
