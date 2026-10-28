import { test } from "node:test";
import assert from "node:assert/strict";
import { policyFloor, validateOffer } from "./guard.ts";
import { seedRound } from "./seed.ts";

const { round } = seedRound(); // oat milk: 1,000+ at 192, 1,500+ at 180, floor 180; within 10% it gives up to 50% of the gap

test("validateOffer enforces the policy floor, tier ceiling and whole cents", () => {
  const r = validateOffer(round, 1440, 185);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.reason : "", /floor/);
  assert.equal(validateOffer(round, 1440, 193).ok, false);
  assert.equal(validateOffer(round, 1440, 186.5).ok, false);
  assert.deepEqual(validateOffer(round, 1440, 186), { ok: true });
});

test("policyFloor concedes half the gap only near the next tier", () => {
  assert.equal(policyFloor(round, 1440), 186); // 60 short of 1,500 (within 150): 192 - 12/2
  assert.equal(policyFloor(round, 1350), 186); // exactly 10% short still counts
  assert.equal(policyFloor(round, 1340), 192); // further out: the tier price stands
  assert.equal(policyFloor(round, 1500), 180); // top tier: nothing left to give
  const generous = { ...round, concession: { withinPct: 10, sharePct: 100 } };
  assert.equal(policyFloor(generous, 1440), 180);
  assert.equal(policyFloor({ ...generous, floor: 190 }, 1440), 190); // never under the absolute floor
});

test("receipts: near 1,200 rolls the policy floor is 113 less half of 11, rounded in the supplier's favour", () => {
  const { round: receipts } = seedRound("receipts");
  assert.equal(policyFloor(receipts, 1150), 108);
  assert.equal(policyFloor(receipts, 1100), 108);
  assert.equal(policyFloor(receipts, 1000), 113);
});
