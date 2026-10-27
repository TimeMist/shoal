import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizationMatches, orderAmount, payerIsSupplier } from "./join.ts";

const quote = { roundId: "demo", reserved: 25920 };

test("authorization matches amount and round", () => {
  assert.equal(authorizationMatches({ amount: "259.20", referenceId: "demo" }, quote), true);
});
test("authorization with a smaller amount is rejected", () => {
  assert.equal(authorizationMatches({ amount: "10.00", referenceId: "demo" }, quote), false);
});
test("authorization for another round is rejected", () => {
  assert.equal(authorizationMatches({ amount: "259.20", referenceId: "other" }, quote), false);
});

test("orderAmount splits goods and delivery", () => {
  assert.deepEqual(orderAmount(25920, 1800), {
    currencyCode: "USD",
    value: "277.20",
    breakdown: {
      itemTotal: { currencyCode: "USD", value: "259.20" },
      shipping: { currencyCode: "USD", value: "18.00" },
    },
  });
});

test("payerIsSupplier matches the supplier email case-insensitively, never on missing emails", () => {
  assert.equal(payerIsSupplier("SB-Sup@Business.example.com ", "sb-sup@business.example.com"), true);
  assert.equal(payerIsSupplier("sb-shop@personal.example.com", "sb-sup@business.example.com"), false);
  assert.equal(payerIsSupplier(undefined, "sb-sup@business.example.com"), false);
  assert.equal(payerIsSupplier("sb-shop@personal.example.com", undefined), false);
});
