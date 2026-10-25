import type { RoundState } from "./store.ts";
import { addCommitment } from "./store.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_SHOPS = [
  { shop: "Hilltop Bakery", qty: 240 },
  { shop: "Little Fern Coffee", qty: 180 },
  { shop: "Northside Deli", qty: 96 },
  { shop: "Corner Books Café", qty: 120 },
  { shop: "Ground Control Coffee", qty: 300 },
  { shop: "Pressed Juice Bar", qty: 144 },
  { shop: "Rye & Co", qty: 120 },
  { shop: "The Daily Grind", qty: 240 },
];

export function seedRound(): RoundState {
  return {
    round: {
      id: "demo",
      supplier: "Meadow Oat Co.",
      product: "Barista oat milk, 1 L carton",
      tiers: [
        { min: 0, price: 240 },
        { min: 500, price: 216 },
        { min: 1000, price: 192 },
        { min: 1500, price: 180 },
      ],
      floor: 180,
      minPerShop: 96,
      holdbackPct: 10,
      closesAt: new Date(Date.now() + 3 * DAY_MS).toISOString(),
      status: "open",
    },
    commitments: [],
    claims: [],
    negotiation: [],
    payouts: [],
    holdbackLeft: 0,
  };
}

// Adds the next `count` demo shops, continuing after those already simulated.
export function simulateShops(s: RoundState, count: number): void {
  const done = s.commitments.filter((c) => c.simulated).length;
  for (const d of DEMO_SHOPS.slice(done, done + count)) {
    addCommitment(s, { ...d, simulated: true });
  }
}
