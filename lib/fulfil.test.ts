import { test } from "node:test";
import assert from "node:assert/strict";
import { deliver, releaseRound, shipRound } from "./fulfil.ts";
import { seedRound } from "./seed.ts";
import type { Commitment, RoundState } from "./store.ts";

const mk = (id: string, captured: number, o: Partial<Commitment> = {}) =>
  ({ id, shop: id, qty: 100, reserved: captured, captured, refunded: 0, simulated: false, status: "captured", orderId: `o${id}`, captureId: `cap${id}`, ...o }) as Commitment;
function setup() {
  const s: RoundState = seedRound();
  s.round.status = "closed";
  s.commitments.push(mk("a", 10000), mk("b", 20000, { simulated: true }), { ...mk("c", 0), captured: undefined, status: "released" });
  return s;
}
const stubs = () => {
  const pay: unknown[][] = [];
  const tr: unknown[][] = [];
  return { pay, tr, payout: async (...a: unknown[]) => (pay.push(a), `B${pay.length}`), track: async (...a: unknown[]) => void tr.push(a) };
};
const E = "sup@example.com";

test("ship pays 90% of all captured, tracks real shops only, holds 10%", async () => {
  const s = setup(), f = stubs();
  assert.deepEqual(await shipRound(s, E, f), { ok: true });
  assert.deepEqual(f.pay, [[E, 27000, "Shoal " + s.round.product + ": shipment payout", "demo-ship"]]);
  assert.equal(f.tr.length, 1);
  assert.deepEqual(f.tr[0], ["oa", "capa", "SHOAL-demo-1", "Demo Courier"]);
  assert.equal(s.commitments[1].tracking, "SHOAL-demo-2");
  assert.equal(s.commitments[2].tracking, undefined);
  assert.deepEqual([s.payouts, s.holdbackLeft], [[{ batchId: "B1", kind: "ship", cents: 27000 }], 3000]);
});

test("ship on a round that is not closed is 409", async () => {
  const s = setup();
  s.round.status = "open";
  assert.equal((await shipRound(s, E, stubs())).ok, false);
});

test("ship twice, or while in flight, is 409", async () => {
  const s = setup();
  let done!: () => void;
  const first = shipRound(s, E, { track: async () => {}, payout: () => new Promise((r) => (done = () => r("B"))) });
  await new Promise((r) => setTimeout(r, 0)); // let the first reach payout
  const dup = await shipRound(s, E, stubs());
  assert.deepEqual(dup, { ok: false, status: 409, error: "Round already shipped" });
  done();
  assert.equal((await first).ok, true);
  assert.equal((await shipRound(s, E, stubs())).ok, false);
  assert.equal(s.payouts.length, 1);
});

test("a tracking failure does not stop the payout", async () => {
  const s = setup(), f = stubs();
  assert.equal((await shipRound(s, E, { ...f, track: async () => { throw new Error("nope"); } })).ok, true);
  assert.equal(s.commitments[0].error, "nope");
  assert.equal(s.payouts.length, 1);
});

test("a payout failure is 502, records nothing, and can be retried", async () => {
  const s = setup();
  const out = await shipRound(s, E, { ...stubs(), payout: async () => { throw new Error("403"); } });
  assert.deepEqual(out, { ok: false, status: 502, error: "403" });
  assert.deepEqual([s.payouts.length, s.holdbackLeft], [0, 0]);
  assert.equal((await shipRound(s, E, stubs())).ok, true);
});

test("deliver only works on a captured commitment", () => {
  const s = setup();
  assert.equal(deliver(s, "a").ok, true);
  assert.equal(s.commitments[0].status, "delivered");
  assert.equal(deliver(s, "a").ok, false);
  assert.equal(deliver(s, "c").ok, false);
  assert.equal(deliver(s, "zzz").ok, false);
});

test("release pays holdbackLeft once; the second call is a no-op", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  s.holdbackLeft = 2500; // after claim refunds
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: true });
  assert.equal(f.pay[1][1], 2500);
  assert.equal(f.pay[1][3], "demo-holdback");
  assert.deepEqual(s.payouts[1], { batchId: "B2", kind: "holdback", cents: 2500 });
  assert.equal((await releaseRound(s, E, f.payout)).ok, true);
  assert.equal(f.pay.length, 2);
});

test("release with an open claim is 409 with the count; before shipping is 409", async () => {
  const s = setup(), f = stubs();
  assert.equal((await releaseRound(s, E, f.payout)).ok, false);
  await shipRound(s, E, f);
  s.claims.push({ id: "k", commitmentId: "a", kind: "missing", cartons: 1, note: "", status: "open" });
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: false, status: 409, error: "1 open claim to resolve first" });
  assert.equal(f.pay.length, 1);
});

test("release with nothing held records nothing; payout failure leaves holdback", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  s.holdbackLeft = 0;
  assert.equal((await releaseRound(s, E, f.payout)).ok, true);
  assert.equal(s.payouts.length, 1);
  s.holdbackLeft = 3000;
  const out = await releaseRound(s, E, async () => { throw new Error("x"); });
  assert.deepEqual([out.ok, s.holdbackLeft, s.payouts.length], [false, 3000, 1]);
});
