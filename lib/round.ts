// Round pricing: the group price only falls as more shops join. All money is integer cents.

export type Tier = { min: number; price: number };

export type Round = {
  id: string;
  supplier: string;
  product: string;
  unit: { one: string; many: string };
  step: number; // pack size: quantities are multiples of this
  searchQuery: string; // Channel3 query for the retail benchmark
  matchHint: string; // what counts as the same product and size, for the benchmark classifier
  tiers: Tier[];
  floor: number;
  minPerShop: number;
  holdbackPct: number;
  delivery: { perDrop: number; perUnit: number };
  closesAt: string;
  status: "open" | "closed" | "failed";
  finalPrice?: number;
};

// Tiers are sorted ascending by min.
export function tierAt(tiers: Tier[], units: number): Tier {
  return tiers.reduce((best, t) => (units >= t.min ? t : best), tiers[0]);
}

export function deliveryCents(round: Round, qty: number): number {
  return round.delivery.perDrop + round.delivery.perUnit * qty;
}

// Goods at the price showing plus delivery, fixed at join.
export function reserveCents(round: Round, unitsBefore: number, qty: number): number {
  return qty * tierAt(round.tiers, unitsBefore).price + deliveryCents(round, qty);
}

export function captureCents(qty: number, finalPrice: number, reserved: number, delivery: number): number {
  return Math.min(qty * finalPrice + delivery, reserved);
}

export function aloneCents(round: Round, qty: number): number {
  return qty * round.tiers[0].price;
}

export function goodsCents(round: Round, qty: number, captured: number): number {
  return captured - deliveryCents(round, qty);
}

// Savings compare goods only; delivery is the same alone or together.
export function savingsCents(round: Round, qty: number, captured: number): number {
  return aloneCents(round, qty) - goodsCents(round, qty, captured);
}

export function validateQty(round: Round, qty: number): string | null {
  const { many } = round.unit;
  if (!Number.isInteger(qty)) return `Quantity must be a whole number of ${many}`;
  if (qty < round.minPerShop) return `Minimum is ${round.minPerShop} ${many} per delivery`;
  if (qty % round.step) return `Quantity must be a multiple of ${round.step} ${many}`;
  return null;
}
