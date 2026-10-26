import type { RoundState } from "./store.ts";
import { addCommitment } from "./store.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ROUND_IDS = ["demo", "receipts"] as const;
export type RoundId = (typeof ROUND_IDS)[number];

export const DEMO_SHOPS = [
  { shop: "Hilltop Bakery", qty: { demo: 240, receipts: 200 }, address: "12 Demo Street, Springfield (demo)" },
  { shop: "Little Fern Coffee", qty: { demo: 180, receipts: 150 }, address: "34 Demo Lane, Springfield (demo)" },
  { shop: "Northside Deli", qty: { demo: 96, receipts: 50 }, address: "56 Demo Road, Shelbyville (demo)" },
  { shop: "Corner Books Café", qty: { demo: 120, receipts: 100 }, address: "78 Demo Avenue, Springfield (demo)" },
  { shop: "Ground Control Coffee", qty: { demo: 300, receipts: 250 }, address: "90 Demo Court, Capital City (demo)" },
  { shop: "Pressed Juice Bar", qty: { demo: 144, receipts: 100 }, address: "21 Demo Way, Shelbyville (demo)" },
  { shop: "Rye & Co", qty: { demo: 120, receipts: 100 }, address: "43 Demo Place, Springfield (demo)" },
  { shop: "The Daily Grind", qty: { demo: 240, receipts: 150 }, address: "65 Demo Close, Capital City (demo)" },
];

// The demo shops with one round's quantities.
export const shopsFor = (id: RoundId) => DEMO_SHOPS.map((d) => ({ ...d, qty: d.qty[id] }));

// Shared with the landing page's hero round.
export const DEMO_ROUND = {
  supplier: "Meadow Oat Co.",
  product: "Barista oat milk, 1 L carton",
  unit: { one: "carton", many: "cartons" },
  step: 12,
  searchQuery: "barista oat milk 1L",
  matchHint: "barista oat milk in 1 L cartons",
  tiers: [
    { min: 0, price: 240 },
    { min: 500, price: 216 },
    { min: 1000, price: 192 },
    { min: 1500, price: 180 },
  ],
  delivery: { perDrop: 1200, perUnit: 5 },
  floor: 180,
  minPerShop: 96,
};

export const RECEIPT_ROUND = {
  supplier: "Brightline Paper Co.",
  product: "Thermal receipt paper, 3⅛″ × 230′ roll",
  unit: { one: "roll", many: "rolls" },
  step: 50,
  searchQuery: "3 1/8 x 230 thermal paper rolls 50 pack",
  // Accepts 200-275 ft: retail 3⅛″ rolls come in 230 and 273 ft, both comparable per roll.
  matchHint: "3⅛″ (3 1/8 in) wide thermal receipt paper rolls, 200 to 275 ft long",
  // Channel3 retail median R = 150¢/roll from 5 offers, fetched 2026-10-26: round(0.95R / 0.85R / 0.75R / 0.68R).
  tiers: [
    { min: 0, price: 143 },
    { min: 400, price: 128 },
    { min: 800, price: 113 },
    { min: 1200, price: 102 },
  ],
  delivery: { perDrop: 900, perUnit: 2 },
  floor: 102,
  minPerShop: 50,
};

const ROUNDS = { demo: DEMO_ROUND, receipts: RECEIPT_ROUND };

export function seedRound(id: RoundId = "demo"): RoundState {
  const r = ROUNDS[id];
  return {
    round: {
      id,
      ...r,
      unit: { ...r.unit },
      tiers: r.tiers.map((t) => ({ ...t })),
      delivery: { ...r.delivery },
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
  if (!ROUND_IDS.includes(s.round.id as RoundId)) throw new Error(`No demo shops for round ${s.round.id}`);
  for (const d of shopsFor(s.round.id as RoundId).slice(done, done + count)) {
    addCommitment(s, { ...d, simulated: true });
  }
}
