// Round pricing: the group price only falls as more shops join. All money is integer cents.

export type Tier = { min: number; price: number };

export type Round = {
  id: string;
  supplier: string;
  product: string;
  tiers: Tier[];
  floor: number;
  minPerShop: number;
  holdbackPct: number;
  closesAt: string;
  status: "open" | "closed" | "failed";
  finalPrice?: number;
};

// Tiers are sorted ascending by min.
export function tierAt(tiers: Tier[], units: number): Tier {
  return tiers.reduce((best, t) => (units >= t.min ? t : best), tiers[0]);
}

export function reserveCents(round: Round, unitsBefore: number, qty: number): number {
  return qty * tierAt(round.tiers, unitsBefore).price;
}

export function captureCents(qty: number, finalPrice: number, reserved: number): number {
  return Math.min(qty * finalPrice, reserved);
}

export function aloneCents(round: Round, qty: number): number {
  return qty * round.tiers[0].price;
}

export function savingsCents(round: Round, qty: number, captured: number): number {
  return aloneCents(round, qty) - captured;
}

export function validateQty(round: Round, qty: number): string | null {
  if (!Number.isInteger(qty)) return "Quantity must be a whole number of cartons";
  if (qty < round.minPerShop) return `Minimum is ${round.minPerShop} cartons per delivery`;
  return null;
}
