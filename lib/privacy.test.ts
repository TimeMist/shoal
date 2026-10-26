import { test } from "node:test";
import assert from "node:assert/strict";
import { maskEmail, publicCommitment, publicState, purchaseOrder } from "./privacy.ts";
import { seedRound } from "./seed.ts";
import type { Commitment } from "./store.ts";

const shop = (o: Partial<Commitment> = {}): Commitment => ({
  id: "c1", shop: "Corner Books Café", qty: 120, reserved: 24600, delivery: 1800, captured: 24000, captureId: "cap1",
  payerEmail: "jane@example.com", address: "1 Real St", invoiceUrl: "https://pay/x", invoiceNumber: "N1", tracking: "T1",
  refunded: 0, simulated: false, status: "captured", ...o,
});

test("maskEmail keeps the first character and the domain", () => {
  assert.equal(maskEmail("jane@example.com"), "j•••@example.com");
  assert.equal(maskEmail(undefined), undefined);
  assert.equal(maskEmail("nodomain"), "n•••");
});

test("publicState drops addresses and invoice links, masks emails, and leaves the store untouched", () => {
  const s = seedRound();
  s.commitments = [shop()];
  const p = publicState(s);
  const c = p.commitments[0];
  assert.deepEqual([c.address, c.invoiceUrl, c.payerEmail, c.invoiceNumber], [undefined, undefined, "j•••@example.com", "N1"]);
  assert.ok(!("address" in c) && !("invoiceUrl" in c));
  assert.equal(s.commitments[0].address, "1 Real St");
});

test("purchaseOrder rows carry the supplier's columns in cents", () => {
  const s = seedRound();
  s.round.finalPrice = 185;
  s.commitments = [shop(), shop({ id: "c2", captured: undefined })];
  assert.deepEqual(purchaseOrder(s), [
    { id: "c1", shop: "Corner Books Café", address: "1 Real St", qty: 120, unit: 185, goods: 22200, delivery: 1800, captured: 24000, captureId: "cap1", invoiceNumber: "N1", tracking: "T1" },
  ]);
});

test("publicCommitment strips one shop's private fields for the authorize response", () => {
  const raw = shop();
  const c = publicCommitment(raw);
  assert.ok(!("address" in c) && !("invoiceUrl" in c));
  assert.deepEqual([c.payerEmail, c.id, c.qty], ["j•••@example.com", "c1", 120]);
  assert.equal(raw.payerEmail, "jane@example.com");
});
