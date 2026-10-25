import test from "node:test";
import assert from "node:assert/strict";
import { toMoney, formatUSD } from "./money.ts";

test("toMoney converts cents to a PayPal amount string", () => {
  assert.equal(toMoney(25920), "259.20");
  assert.equal(toMoney(5), "0.05");
});

test("toMoney rejects non-integer cents", () => {
  assert.throws(() => toMoney(1.5));
});

test("formatUSD formats with separators", () => {
  assert.equal(formatUSD(266400), "$2,664.00");
  assert.equal(formatUSD(25920), "$259.20");
});
