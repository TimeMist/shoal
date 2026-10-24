// The pricing guardrail. The AI agent proposes moves; this code decides if they are allowed.
// All money is integer cents.

export type Rules = {
  listPrice: number;
  floorPrice: number;
  maxDiscountPct: number;
  sweeteners: string[];
};

export type Move =
  | { type: "counter"; price: number }
  | { type: "accept"; price: number }
  | { type: "sweetener"; name: string }
  | { type: "end" };

export type Verdict = { ok: true } | { ok: false; reason: string };

// shortcut: no stock-based flexibility yet, add when the catalog has stock levels.
export function effectiveFloor(rules: Rules): number {
  return Math.max(rules.floorPrice, Math.ceil(rules.listPrice * (1 - rules.maxDiscountPct / 100)));
}

export function validateMove(rules: Rules, move: Move): Verdict {
  if (move.type === "end") return { ok: true };
  if (move.type === "sweetener") {
    return rules.sweeteners.includes(move.name)
      ? { ok: true }
      : { ok: false, reason: `Sweetener "${move.name}" is not allowed` };
  }
  if (!Number.isInteger(move.price)) return { ok: false, reason: "Price must be whole cents" };
  if (move.price > rules.listPrice) return { ok: false, reason: "Price is above the list price" };
  if (move.price < effectiveFloor(rules)) return { ok: false, reason: "Price is below the floor" };
  return { ok: true };
}
