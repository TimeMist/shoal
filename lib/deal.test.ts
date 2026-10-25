import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuoteToken, verifyQuoteToken } from "./deal.ts";

const secret = "test-secret";
const q = { roundId: "demo", shop: "Rye & Co", qty: 120, reserved: 28800 };

test("round-trips a valid quote", () => {
  const got = verifyQuoteToken(createQuoteToken(q, secret), secret);
  assert.deepEqual({ ...got, exp: 0 }, { ...q, exp: 0 });
});

test("rejects a tampered reserved amount", () => {
  const [, sig] = createQuoteToken(q, secret).split(".");
  const forged = Buffer.from(JSON.stringify({ ...q, reserved: 1, exp: Date.now() + 60000 })).toString("base64url");
  assert.equal(verifyQuoteToken(`${forged}.${sig}`, secret), null);
});

test("rejects an expired quote and a wrong secret", () => {
  assert.equal(verifyQuoteToken(createQuoteToken(q, secret, 0), secret), null);
  assert.equal(verifyQuoteToken(createQuoteToken(q, secret), "other"), null);
});
