import { test } from "node:test";
import assert from "node:assert/strict";
import { approveClaim, rejectClaim } from "./claims.ts";
import { seedRound } from "./seed.ts";
import type { Claim, Commitment, RoundState } from "./store.ts";

function setup(over: Partial<Commitment> = {}, refund = 2220, holdback = 100000) {
  const s: RoundState = seedRound();
  const c = { id: "c1", shop: "Corner Books Café", qty: 120, reserved: 22800, delivery: 1800, captured: 22200, captureId: "cap1", refunded: 0, simulated: false, status: "claim", ...over } as Commitment;
  const claim: Claim = { id: "k1", commitmentId: "c1", kind: "damaged", cartons: 12, note: "", priorStatus: "captured", proposal: { refund, reason: "r" }, status: "open" };
  s.commitments.push(c);
  s.claims.push(claim);
  s.holdbackLeft = holdback;
  return { s, c, claim };
}
const calls = () => {
  const log: [string, number][] = [];
  return { log, fn: async (id: string, cents: number) => (log.push([id, cents]), "r1") };
};

test("approve refunds a real shop through PayPal, then updates state", async () => {
  const { s, c, claim } = setup();
  const r = calls();
  assert.deepEqual(await approveClaim(s, "k1", r.fn), { ok: true, refunded: 2220 });
  assert.deepEqual(r.log, [["cap1", 2220]]);
  assert.deepEqual([c.refunded, s.holdbackLeft, c.status, claim.status], [2220, 97780, "resolved", "approved"]);
});

test("a simulated shop never calls PayPal", async () => {
  const { s, c } = setup({ simulated: true });
  const r = calls();
  assert.equal((await approveClaim(s, "k1", r.fn)).ok, true);
  assert.equal(r.log.length, 0);
  assert.equal(c.refunded, 2220);
});

test("refund 0 resolves without calling PayPal", async () => {
  const { s, c, claim } = setup({}, 0);
  const r = calls();
  assert.deepEqual(await approveClaim(s, "k1", r.fn), { ok: true, refunded: 0 });
  assert.equal(r.log.length, 0);
  assert.deepEqual([c.status, claim.status], ["resolved", "approved"]);
});

test("PayPal failure returns 502 and changes nothing", async () => {
  const { s, c, claim } = setup();
  const out = await approveClaim(s, "k1", async () => { throw new Error("declined"); });
  assert.deepEqual(out, { ok: false, status: 502, error: "declined" });
  assert.deepEqual([c.refunded, s.holdbackLeft, c.status, claim.status], [0, 100000, "claim", "open"]);
  assert.equal((await approveClaim(s, "k1", async () => "r")).ok, true);
});

test("approve re-clamps to the current holdback", async () => {
  const { s, c } = setup({}, 2220, 500);
  const r = calls();
  assert.deepEqual(await approveClaim(s, "k1", r.fn), { ok: true, refunded: 500 });
  assert.deepEqual([r.log[0][1], c.refunded, s.holdbackLeft], [500, 500, 0]);
});

test("a second approve while the first is in flight, or after, is a 409", async () => {
  const { s } = setup();
  let release!: () => void;
  const first = approveClaim(s, "k1", () => new Promise((res) => (release = () => res("r"))));
  const dup = await approveClaim(s, "k1", async () => "r");
  assert.deepEqual(dup, { ok: false, status: 409, error: "Claim is not open" });
  release();
  assert.equal((await first).ok, true);
  assert.equal((await approveClaim(s, "k1", async () => "r")).ok, false);
  assert.equal(rejectClaim(s, "k1").ok, false);
});

test("reject restores the status the commitment had before the claim", () => {
  for (const prior of ["captured", "delivered"] as const) {
    const { s, c, claim } = setup();
    claim.priorStatus = prior;
    assert.equal(rejectClaim(s, "k1").ok, true);
    assert.deepEqual([claim.status, c.status], ["rejected", prior]);
    assert.equal(rejectClaim(s, "k1").ok, false);
  }
});

test("refunds are capped at goods, never the delivery charge", async () => {
  // 120 cartons at 185 plus 1800 delivery captured; a 120-carton claim refunds 22200.
  const { s, c, claim } = setup({ captured: 24000, reserved: 24600 }, 24000);
  claim.cartons = 120;
  s.round.finalPrice = 185;
  const r = calls();
  assert.deepEqual(await approveClaim(s, "k1", r.fn), { ok: true, refunded: 22200 });
  assert.equal(c.refunded, 22200);
});

test("approve on an invoiced shop records the refund on its invoice", async () => {
  const { s, c } = setup({ invoiceId: "INV2-1", invoiceStatus: "paid" });
  const inv = calls();
  assert.equal((await approveClaim(s, "k1", calls().fn, async (id, cents) => void inv.fn(id, cents))).ok, true);
  assert.deepEqual(inv.log, [["INV2-1", 2220]]);
  assert.deepEqual([c.invoiceStatus, c.invoiceError, c.invoiceRefunded], ["refunded", undefined, 2220]);
});

test("an invoice not yet paid is left for the invoice retry to refund", async () => {
  const { s, c } = setup({ invoiceId: "INV2-1" });
  const inv = calls();
  assert.equal((await approveClaim(s, "k1", calls().fn, async (id, cents) => void inv.fn(id, cents))).ok, true);
  assert.equal(inv.log.length, 0);
  assert.equal(c.invoiceStatus, undefined);
});

test("the goods cap uses the delivery stored at join, not today's rates", async () => {
  const { s, claim } = setup({ captured: 24000, reserved: 24600 }, 24000);
  claim.cartons = 120;
  s.round.delivery = { perDrop: 0, perUnit: 0 };
  assert.deepEqual(await approveClaim(s, "k1", calls().fn), { ok: true, refunded: 22200 });
});

test("an invoice refund failure is recorded and the claim is still approved", async () => {
  const { s, c, claim } = setup({ invoiceId: "INV2-1", invoiceStatus: "paid" });
  const out = await approveClaim(s, "k1", calls().fn, async () => { throw new Error("invoice down"); });
  assert.deepEqual(out, { ok: true, refunded: 2220 });
  assert.deepEqual([claim.status, c.refunded, c.invoiceStatus], ["approved", 2220, "paid"]);
  assert.match(c.invoiceError ?? "", /invoice down/);
});

test("a shop without an invoice never records an invoice refund", async () => {
  const { s } = setup();
  const inv = calls();
  assert.equal((await approveClaim(s, "k1", calls().fn, async (id, cents) => void inv.fn(id, cents))).ok, true);
  assert.equal(inv.log.length, 0);
});

test("a new invoice refund keeps the error of an earlier unrecorded one", async () => {
  const { s, c } = setup({ invoiceId: "INV2-1", invoiceStatus: "paid", refunded: 1000, invoiceRefunded: 0, invoiceError: "Refund not recorded" });
  assert.equal((await approveClaim(s, "k1", calls().fn, async () => {})).ok, true);
  assert.deepEqual([c.refunded, c.invoiceRefunded, c.invoiceStatus, c.invoiceError], [3220, 2220, "refunded", "Refund not recorded"]);
});
