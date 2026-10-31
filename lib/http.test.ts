import { test } from "node:test";
import assert from "node:assert/strict";
import { roundSupplierEmail } from "./http.ts";

test("each round pays its own supplier, falling back to the shared setting", () => {
  const env = { SUPPLIER_PAYPAL_EMAIL_RECEIPTS: " brightline@business.example.com ", SUPPLIER_PAYPAL_EMAIL: "shared@business.example.com" };
  assert.equal(roundSupplierEmail("receipts", env), "brightline@business.example.com");
  assert.equal(roundSupplierEmail("demo", env), "shared@business.example.com");
  assert.equal(roundSupplierEmail("demo", {}), undefined);
});
