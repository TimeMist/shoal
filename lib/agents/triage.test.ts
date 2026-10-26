import { test } from "node:test";
import assert from "node:assert/strict";
import { triage } from "./triage.ts";
import type { Model } from "./triage.ts";
import type { Claim, Commitment } from "../store.ts";
import { seedRound } from "../seed.ts";

const at = (finalPrice: number) => ({ ...seedRound().round, finalPrice });

const c = { id: "c1", shop: "Corner Books Café", qty: 120, reserved: 24600, delivery: 1800, captured: 24000, refunded: 0, simulated: true, status: "claim" } as Commitment;
const claim: Claim = { id: "k1", commitmentId: "c1", kind: "damaged", cartons: 12, note: "wet boxes", status: "open" };
const says = (cartons: unknown, reason = "Looks damaged."): Model => async () => ({ cartons, reason });

test("12 damaged cartons at 185 propose 2220", async () => {
  const p = await triage(claim, c, at(185), 100000, says(12));
  assert.equal(p.refund, 2220);
});

test("500 cartons on a 120-carton claim are capped at 120: goods, not the delivery charge", async () => {
  const p = await triage({ ...claim, cartons: 120 }, c, at(185), 100000, says(500));
  assert.equal(p.refund, 22200);
});

test("a price change that exceeds the goods the shop paid for is clamped with a reason", async () => {
  const p = await triage({ ...claim, cartons: 120 }, c, at(200), 100000, says(120));
  assert.equal(p.refund, 22200);
  assert.match(p.reason, /paid only \$222\.00 for the goods/);
});

test("holdback shortfall is explained in plain words", async () => {
  const p = await triage(claim, c, at(185), 0, says(12));
  assert.equal(p.refund, 0);
  assert.match(p.reason, /Only \$0\.00 is left in the supplier's holdback/);
});

test("non-integer or negative cartons throw", async () => {
  await assert.rejects(triage(claim, c, at(185), 100000, says(2.5)));
  await assert.rejects(triage(claim, c, at(185), 100000, says(-1)));
  await assert.rejects(triage(claim, c, at(185), 100000, says("12")));
});
