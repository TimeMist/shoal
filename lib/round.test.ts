import { test } from "node:test";
import assert from "node:assert/strict";
import { tierAt, reserveCents, captureCents, savingsCents, validateQty, type Round } from "./round.ts";

const tiers = [
  { min: 0, price: 240 },
  { min: 500, price: 216 },
  { min: 1000, price: 192 },
  { min: 1500, price: 180 },
];
const round: Round = {
  id: "demo",
  supplier: "Meadow Oat Co.",
  product: "Barista oat milk, 1 L carton",
  tiers,
  floor: 180,
  minPerShop: 96,
  holdbackPct: 10,
  closesAt: "2026-11-01T00:00:00Z",
  status: "open",
};

test("tierAt picks the highest tier reached", () => {
  assert.equal(tierAt(tiers, 0).price, 240);
  assert.equal(tierAt(tiers, 999).price, 216);
  assert.equal(tierAt(tiers, 1440).price, 192);
  assert.equal(tierAt(tiers, 1500).price, 180);
});

test("reserve uses the price showing when the shop joins", () => {
  assert.equal(reserveCents(round, 0, 240), 57600);
  assert.equal(reserveCents(round, 516, 120), 25920);
});

test("capture never exceeds reservation", () => {
  assert.equal(captureCents(120, 185, 25920), 22200);
  assert.equal(captureCents(120, 250, 25920), 25920);
});

test("savings compare against buying alone", () => {
  assert.equal(savingsCents(round, 120, 22200), 6600);
});

test("validateQty enforces whole cartons at or above the minimum", () => {
  assert.match(validateQty(round, 95) ?? "", /96/);
  assert.equal(validateQty(round, 96), null);
  assert.equal(typeof validateQty(round, 100.5), "string");
});
