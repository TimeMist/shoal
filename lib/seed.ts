import type { RoundState } from "./store.ts";
import { addCommitment } from "./store.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEMO_SHOPS = [
  { shop: "Hilltop Bakery", qty: 240, address: "12 Demo Street, Springfield (demo)" },
  { shop: "Little Fern Coffee", qty: 180, address: "34 Demo Lane, Springfield (demo)" },
  { shop: "Northside Deli", qty: 96, address: "56 Demo Road, Shelbyville (demo)" },
  { shop: "Corner Books Café", qty: 120, address: "78 Demo Avenue, Springfield (demo)" },
  { shop: "Ground Control Coffee", qty: 300, address: "90 Demo Court, Capital City (demo)" },
  { shop: "Pressed Juice Bar", qty: 144, address: "21 Demo Way, Shelbyville (demo)" },
  { shop: "Rye & Co", qty: 120, address: "43 Demo Place, Springfield (demo)" },
  { shop: "The Daily Grind", qty: 240, address: "65 Demo Close, Capital City (demo)" },
];

// Shared with the landing page's hero round.
export const DEMO_ROUND = {
  supplier: "Meadow Oat Co.",
  product: "Barista oat milk, 1 L carton",
  tiers: [
    { min: 0, price: 240 },
    { min: 500, price: 216 },
    { min: 1000, price: 192 },
    { min: 1500, price: 180 },
  ],
  delivery: { perDrop: 1200, perCarton: 5 },
};

export function seedRound(): RoundState {
  return {
    round: {
      id: "demo",
      ...DEMO_ROUND,
      tiers: DEMO_ROUND.tiers.map((t) => ({ ...t })),
      delivery: { ...DEMO_ROUND.delivery },
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
