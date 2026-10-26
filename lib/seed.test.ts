import { test } from "node:test";
import assert from "node:assert/strict";
import { seedRound, simulateShops } from "./seed.ts";
import { deliveryCents, tierAt, validateQty } from "./round.ts";
import { getState, resetDemo, unitsCommitted } from "./store.ts";

const R = 184; // Channel3 retail median, 2026-10-26

test("the receipt round: 1,100 rolls from 8 shops sit on the 800+ tier", () => {
  const s = seedRound("receipts");
  simulateShops(s, 8);
  assert.equal(s.commitments.length, 8);
  assert.equal(unitsCommitted(s), 1100);
  assert.equal(tierAt(s.round.tiers, 1100).min, 800);
  assert.equal(s.round.unit.many, "rolls");
});

test("receipt tier prices follow the formula from R; floor is the top tier", () => {
  const { round } = seedRound("receipts");
  assert.deepEqual(round.tiers.map((t) => t.min), [0, 400, 800, 1200]);
  assert.deepEqual(round.tiers.map((t) => t.price), [0.95, 0.85, 0.75, 0.68].map((f) => Math.round(f * R)));
  assert.equal(round.floor, round.tiers[3].price);
});

test("receipt quantities come in cases of 50, at least 50", () => {
  const { round } = seedRound("receipts");
  assert.match(validateQty(round, 75) ?? "", /multiple of 50 rolls/);
  assert.match(validateQty(round, 25) ?? "", /Minimum is 50 rolls/);
  assert.equal(validateQty(round, 100), null);
});

test("receipt delivery is $9 a drop plus 2¢ a roll", () => {
  assert.equal(deliveryCents(seedRound("receipts").round, 200), 1300);
});

test("the oat-milk round is unchanged and steps in cases of 12", () => {
  const s = seedRound("demo");
  simulateShops(s, 8);
  assert.equal(unitsCommitted(s), 1440);
  assert.match(validateQty(s.round, 100) ?? "", /multiple of 12 cartons/);
});

test("resetDemo seeds both rounds and getState lazily seeds either", () => {
  resetDemo();
  assert.equal(getState("receipts")?.round.supplier, "Brightline Paper Co.");
  assert.equal(getState("demo")?.round.supplier, "Meadow Oat Co.");
  assert.equal(getState("nope"), undefined);
});
