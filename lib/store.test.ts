import { test } from "node:test";
import assert from "node:assert/strict";
import { getState, resetDemo, unitsCommitted, addCommitment, markAuthorized, findByOrder, beginClose } from "./store.ts";
import { simulateShops } from "./seed.ts";

function fresh() {
  resetDemo();
  return getState("demo")!;
}

test("after resetDemo units are 0 and the round is open", () => {
  const s = fresh();
  assert.equal(unitsCommitted(s), 0);
  assert.equal(s.round.status, "open");
  assert.equal(s.holdbackLeft, 0);
});

test("simulateShops adds the demo shops with tier-at-join reservations", () => {
  const s = fresh();
  simulateShops(s, 8);
  assert.equal(unitsCommitted(s), 1440);
  assert.equal(s.commitments[3].shop, "Corner Books Café");
  assert.equal(s.commitments[3].reserved, 25920);
  assert.ok(s.commitments.every((c) => c.simulated));
});

test("simulateShops continues from where it left off", () => {
  const s = fresh();
  simulateShops(s, 2);
  simulateShops(s, 1);
  assert.equal(s.commitments[2].shop, "Northside Deli");
});

test("addCommitment uses a given reserved amount as-is", () => {
  const s = fresh();
  const c = addCommitment(s, { shop: "Real", qty: 100, simulated: false, orderId: "o1", reserved: 12345 });
  assert.equal(c.reserved, 12345);
  assert.equal(findByOrder(s, "o1"), c);
});

test("authorize is idempotent per order id", () => {
  const s = fresh();
  addCommitment(s, { shop: "Real", qty: 100, simulated: false, orderId: "o1" });
  const a = markAuthorized(s, "o1", "auth-1");
  const b = markAuthorized(s, "o1", "auth-2");
  assert.equal(s.commitments.length, 1);
  assert.equal(b, a);
  assert.equal(b.authorizationId, "auth-1");
  assert.throws(() => markAuthorized(s, "nope", "x"));
});

test("close twice captures once", () => {
  const s = fresh();
  assert.equal(beginClose(s), true);
  assert.equal(beginClose(s), false);
});

test("addCommitment throws while a close is running", () => {
  const s = fresh();
  beginClose(s);
  assert.throws(() => addCommitment(s, { shop: "A", qty: 100, simulated: false }), /not open/);
});

test("addCommitment rejects a closed round and bad quantities", () => {
  const s = fresh();
  assert.throws(() => addCommitment(s, { shop: "A", qty: 10, simulated: false }));
  s.round.status = "closed";
  assert.throws(() => addCommitment(s, { shop: "A", qty: 100, simulated: false }));
});
