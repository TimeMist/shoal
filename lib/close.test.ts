import { test } from "node:test";
import assert from "node:assert/strict";
import { closeRound } from "./close.ts";
import { seedRound, simulateShops } from "./seed.ts";
import { addCommitment } from "./store.ts";

function fakePay(failCapture?: string) {
  const captures: [string, number][] = [];
  const voids: string[] = [];
  return {
    captures,
    voids,
    capture: async (id: string, cents: number) => {
      if (id === failCapture) throw new Error("PayPal down");
      captures.push([id, cents]);
      return `cap-${id}`;
    },
    void: async (id: string) => {
      voids.push(id);
    },
  };
}

function real(s: ReturnType<typeof seedRound>, shop: string, qty: number) {
  const c = addCommitment(s, { shop, qty, simulated: false, orderId: `o-${shop}`, reserved: qty * 240 });
  c.authorizationId = `auth-${shop}`;
}

test("closeRound voids all when below first tier", async () => {
  const s = seedRound();
  real(s, "A", 150);
  real(s, "B", 150);
  s.closing = true;
  const pay = fakePay();
  await closeRound(s, pay);
  assert.equal(pay.voids.length, 2);
  assert.equal(pay.captures.length, 0);
  assert.equal(s.round.status, "failed");
  assert.ok(s.commitments.every((c) => c.status === "released"));
  assert.equal(s.closing, false);
});

test("closeRound captures qty x final price for real shops", async () => {
  const s = seedRound();
  real(s, "A", 100);
  real(s, "B", 200);
  simulateShops(s, 8); // 1440 + 300 = 1740 units
  s.agreedPrice = 185;
  s.closing = true;
  const pay = fakePay();
  await closeRound(s, pay);
  assert.deepEqual(pay.captures, [["auth-A", 100 * 185], ["auth-B", 200 * 185]]);
  assert.equal(s.round.status, "closed");
  assert.equal(s.round.finalPrice, 185);
  assert.ok(s.commitments.every((c) => c.status === "captured"));
  const sim = s.commitments.find((c) => c.simulated)!;
  assert.equal(sim.captured, sim.qty * 185);
  assert.equal(s.closing, false);
});

test("closeRound defaults to the tier price", async () => {
  const s = seedRound();
  simulateShops(s, 8); // 1440 units, tier 192
  await closeRound(s, fakePay());
  assert.equal(s.round.finalPrice, 192);
});

test("a failing capture does not stop the others", async () => {
  const s = seedRound();
  real(s, "A", 100);
  real(s, "B", 100);
  simulateShops(s, 8);
  s.closing = true;
  const pay = fakePay("auth-A");
  await closeRound(s, pay);
  const [a, b] = s.commitments;
  assert.equal(a.status, "reserved");
  assert.match(a.error!, /PayPal down/);
  assert.equal(b.status, "captured");
  assert.equal(s.round.status, "closed");
  assert.equal(s.closing, false);
});
