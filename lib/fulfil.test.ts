import { test } from "node:test";
import assert from "node:assert/strict";
import { approveClaim } from "./claims.ts";
import { deliver, releaseRound, senderBatchId, shipRound } from "./fulfil.ts";
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
const deliverAll = (s: RoundState) => s.commitments.forEach((c) => c.status === "captured" && deliver(s, c.id));

test("ship pays out 90% of real shops' captures, ledgers 90% of all, tracks real shops only", async () => {
  const s = setup(), f = stubs();
  assert.deepEqual(await shipRound(s, E, f), { ok: true });
  assert.deepEqual(f.pay, [[E, 9000, "Shoal " + s.round.product + ": shipment payout", senderBatchId(s, "ship")]]);
  assert.match(senderBatchId(s, "ship"), /^demo-ship-\d+$/);
  assert.equal(f.tr.length, 1);
  assert.deepEqual(f.tr[0], ["oa", "capa", "SHOAL-demo-1", "Demo Courier"]);
  assert.equal(s.commitments[1].tracking, "SHOAL-demo-2");
  assert.equal(s.commitments[2].tracking, undefined);
  assert.deepEqual([s.payouts, s.holdbackLeft], [[{ batchId: "B1", kind: "ship", cents: 27000, paypalCents: 9000 }], 3000]);
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
  deliverAll(s);
  s.holdbackLeft = 2500; // after claim refunds
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: true });
  assert.equal(f.pay[1][1], 1000); // the real shop's 10%; the simulated shop's share never reached PayPal
  assert.equal(f.pay[1][3], senderBatchId(s, "holdback"));
  assert.deepEqual(s.payouts[1], { batchId: "B2", kind: "holdback", cents: 2500, paypalCents: 1000 });
  assert.equal((await releaseRound(s, E, f.payout)).ok, true);
  assert.equal(f.pay.length, 2);
});

test("release with an open claim is 409 with the count; before shipping is 409", async () => {
  const s = setup(), f = stubs();
  assert.equal((await releaseRound(s, E, f.payout)).ok, false);
  await shipRound(s, E, f);
  s.claims.push({ id: "k", commitmentId: "a", kind: "missing", units: 1, note: "", status: "open" });
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: false, status: 409, error: "1 open claim to resolve first" });
  assert.equal(f.pay.length, 1);
});

test("release with nothing held records nothing; payout failure leaves holdback", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  deliverAll(s);
  s.holdbackLeft = 0;
  assert.equal((await releaseRound(s, E, f.payout)).ok, true);
  assert.equal(s.payouts.length, 1);
  s.holdbackLeft = 3000;
  const out = await releaseRound(s, E, async () => { throw new Error("x"); });
  assert.deepEqual([out.ok, s.holdbackLeft, s.payouts.length], [false, 3000, 1]);
});

test("release with a commitment in status claim (no claim filed yet) is 409", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  s.commitments[0].status = "claim";
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: false, status: 409, error: "1 open claim to resolve first" });
  s.claims.push({ id: "k", commitmentId: "a", kind: "missing", units: 1, note: "", status: "open" });
  assert.equal((await releaseRound(s, E, f.payout)).ok, false); // same commitment, counted once
  assert.equal(f.pay.length, 1);
});

test("a claim approved during an in-flight release is 409 and the release pays the full holdback", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  deliverAll(s);
  let done!: () => void;
  const rel = releaseRound(s, E, (...a) => (f.pay.push(a), new Promise((r) => (done = () => r("B2")))));
  s.commitments[0].status = "claim";
  s.claims.push({ id: "k", commitmentId: "a", kind: "damaged", units: 5, note: "", priorStatus: "delivered", proposal: { refund: 500, reason: "r" }, status: "open" });
  assert.equal(s.holdbackLeft, 0);
  const a = await approveClaim(s, "k", async () => "r");
  assert.deepEqual(a, { ok: false, status: 409, error: "Holdback release in progress" });
  done();
  assert.equal((await rel).ok, true);
  assert.deepEqual(s.payouts[1], { batchId: "B2", kind: "holdback", cents: 3000, paypalCents: 1000 });
});

test("a failed release restores holdbackLeft", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  deliverAll(s);
  const out = await releaseRound(s, E, async () => { throw new Error("x"); });
  assert.deepEqual([out.ok, s.holdbackLeft], [false, 3000]);
});

test("release is 409 while a shipped order is still out for delivery; allowed once all are delivered or resolved", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  deliver(s, "a");
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: false, status: 409, error: "1 shop still out for delivery" });
  s.commitments[1].status = "resolved";
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: true });
  assert.deepEqual(s.payouts[1], { batchId: "B2", kind: "holdback", cents: 3000, paypalCents: 1000 });
});

test("senderBatchId differs between round instances (a demo reset gets a new close time)", () => {
  const a = seedRound(), b = seedRound();
  b.round.closesAt = new Date(Date.parse(a.round.closesAt) + 1000).toISOString();
  assert.notEqual(senderBatchId(a, "ship"), senderBatchId(b, "ship"));
  assert.equal(senderBatchId(a, "ship"), senderBatchId(a, "ship"));
});

test("a round of only simulated shops ships and releases without calling PayPal", async () => {
  const s: RoundState = seedRound();
  s.round.status = "closed";
  s.commitments.push(mk("b", 20000, { simulated: true }));
  const f = stubs();
  assert.deepEqual(await shipRound(s, E, f), { ok: true });
  deliverAll(s);
  assert.deepEqual(await releaseRound(s, E, f.payout), { ok: true });
  assert.equal(f.pay.length, 0);
  assert.deepEqual(s.payouts.map((p) => [p.batchId, p.cents, p.paypalCents]), [["", 18000, 0], ["", 2000, 0]]);
});

test("release pays the real share net of real refunds", async () => {
  const s = setup(), f = stubs();
  await shipRound(s, E, f);
  deliverAll(s);
  s.commitments[0].refunded = 400;
  s.holdbackLeft = 2600;
  await releaseRound(s, E, f.payout);
  assert.equal(f.pay[1][1], 600);
});
