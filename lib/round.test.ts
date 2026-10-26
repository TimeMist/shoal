import { test } from "node:test";
import assert from "node:assert/strict";
import { tierAt, deliveryCents, reserveCents, captureCents, savingsCents, validateQty, unitLabel, type Round } from "./round.ts";

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
  unit: { one: "carton", many: "cartons" },
  step: 12,
  searchQuery: "barista oat milk 1L",
  matchHint: "barista oat milk in 1 L cartons",
  tiers,
  floor: 180,
  minPerShop: 96,
  holdbackPct: 10,
  delivery: { perDrop: 1200, perUnit: 5 },
  closesAt: "2026-11-01T00:00:00Z",
  status: "open",
};

test("tierAt picks the highest tier reached", () => {
  assert.equal(tierAt(tiers, 0).price, 240);
  assert.equal(tierAt(tiers, 999).price, 216);
  assert.equal(tierAt(tiers, 1440).price, 192);
  assert.equal(tierAt(tiers, 1500).price, 180);
});

test("delivery is a drop fee plus a per-carton fee", () => {
  assert.equal(deliveryCents(round, 240), 2400);
  assert.equal(deliveryCents(round, 120), 1800);
});

test("reserve uses the price showing when the shop joins", () => {
  assert.equal(reserveCents(round, 0, 240), 60000);
  assert.equal(reserveCents(round, 516, 120), 27720);
});

test("capture keeps delivery and never exceeds the reservation", () => {
  assert.equal(captureCents(120, 185, 27720, 1800), 24000);
  assert.equal(captureCents(120, 250, 27720, 1800), 27720);
});

test("savings compare against buying alone", () => {
  assert.equal(savingsCents(round, 120, 24000), 6600);
});

test("validateQty enforces whole cartons at or above the minimum", () => {
  assert.match(validateQty(round, 95) ?? "", /96/);
  assert.equal(validateQty(round, 96), null);
  assert.equal(typeof validateQty(round, 100.5), "string");
});

test("unitLabel uses the singular only for exactly one", () => {
  const rolls = { unit: { one: "roll", many: "rolls" } };
  assert.equal(unitLabel(rolls, 1), "1 roll");
  assert.equal(unitLabel(rolls, 0), "0 rolls");
  assert.equal(unitLabel(rolls, 1100), "1,100 rolls");
  assert.equal(unitLabel(round, 12), "12 cartons");
});
