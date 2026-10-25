import { test } from "node:test";
import assert from "node:assert/strict";
import { splitPayout, clampRefund, releaseHoldback } from "./settle.ts";

test("splitPayout holds back a percentage of the captured total", () => {
  assert.deepEqual(splitPayout(266400, 10), { now: 239760, held: 26640 });
  assert.deepEqual(splitPayout(0, 10), { now: 0, held: 0 });
});

test("refund is clamped to holdback and shop capture", () => {
  assert.deepEqual(clampRefund(2220, 22200, 0, 26640), { refund: 2220, shortfall: 0 });
  assert.deepEqual(clampRefund(30000, 22200, 0, 26640), { refund: 22200, shortfall: 7800 });
  assert.deepEqual(clampRefund(5000, 22200, 0, 3000), { refund: 3000, shortfall: 2000 });
});

test("refund accounts for earlier refunds and is never negative", () => {
  assert.deepEqual(clampRefund(5000, 22200, 20000, 26640), { refund: 2200, shortfall: 2800 });
  assert.deepEqual(clampRefund(5000, 22200, 22200, 26640), { refund: 0, shortfall: 5000 });
  assert.deepEqual(clampRefund(5000, 22200, 30000, 26640), { refund: 0, shortfall: 5000 });
});

test("releaseHoldback pays out what is left after refunds", () => {
  assert.equal(releaseHoldback(26640, 2220), 24420);
  assert.equal(releaseHoldback(1000, 5000), 0);
});
