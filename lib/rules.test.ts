import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveFloor, validateMove, type Rules } from "./rules.ts";

const rules: Rules = { listPrice: 10000, floorPrice: 7000, maxDiscountPct: 20, sweeteners: ["free-shipping"] };

test("floor is the stricter of floorPrice and maxDiscountPct", () => {
  assert.equal(effectiveFloor(rules), 8000);
  assert.equal(effectiveFloor({ ...rules, maxDiscountPct: 50 }), 7000);
});

test("accepts prices between floor and list price", () => {
  assert.deepEqual(validateMove(rules, { type: "accept", price: 8000 }), { ok: true });
  assert.deepEqual(validateMove(rules, { type: "counter", price: 10000 }), { ok: true });
});

test("rejects prices below floor, above list, or fractional", () => {
  assert.equal(validateMove(rules, { type: "accept", price: 7999 }).ok, false);
  assert.equal(validateMove(rules, { type: "counter", price: 10001 }).ok, false);
  assert.equal(validateMove(rules, { type: "accept", price: 8000.5 }).ok, false);
});

test("only allows configured sweeteners", () => {
  assert.equal(validateMove(rules, { type: "sweetener", name: "free-shipping" }).ok, true);
  assert.equal(validateMove(rules, { type: "sweetener", name: "free-laptop" }).ok, false);
});
