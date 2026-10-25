import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizationMatches } from "./join.ts";

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
