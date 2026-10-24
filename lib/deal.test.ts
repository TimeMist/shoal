import { test } from "node:test";
import assert from "node:assert/strict";
import { createDealToken, verifyDealToken } from "./deal.ts";

const secret = "test-secret";

test("round-trips a valid deal", () => {
  const deal = verifyDealToken(createDealToken("mug", 1800, secret), secret);
  assert.equal(deal?.productId, "mug");
  assert.equal(deal?.price, 1800);
});

test("rejects a tampered price", () => {
  const [, sig] = createDealToken("mug", 1800, secret).split(".");
  const forged = Buffer.from(JSON.stringify({ productId: "mug", price: 1, exp: Date.now() + 60000 })).toString("base64url");
  assert.equal(verifyDealToken(`${forged}.${sig}`, secret), null);
});

test("rejects an expired deal and a wrong secret", () => {
  const token = createDealToken("mug", 1800, secret, 0);
  assert.equal(verifyDealToken(token, secret), null);
  assert.equal(verifyDealToken(createDealToken("mug", 1800, secret), "other"), null);
});
