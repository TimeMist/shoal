import { test } from "node:test";
import assert from "node:assert/strict";
import { negotiate, negotiatorFor, claudeNegotiator, geminiNegotiator } from "./negotiate.ts";
import type { Decision } from "./negotiate.ts";
import { seedRound, simulateShops } from "../seed.ts";

function full() {
  const s = seedRound();
  simulateShops(s, 8);
  return s;
}
const d = (tool: Decision["tool"], price: number | undefined, message = "m"): Decision => ({
  tool,
  price,
  message,
  provider: "claude",
});
const script = (moves: Decision[]) => {
  let i = 0;
  return async () => moves[i++];
};

test("negotiation rejects below-floor offers and stops at turn limit", async () => {
  const r = await negotiate(full(), async () => d("propose", 170));
  assert.equal(r.turns.length, 6);
  assert.ok(r.turns.every((t) => t.verdict === "rejected"));
  assert.equal(r.agreed, undefined);
});

test("negotiation agrees when one side accepts the other's last valid price", async () => {
  const r = await negotiate(full(), script([d("propose", 182), d("propose", 186), d("accept", 186)]));
  assert.equal(r.agreed, 186);
  assert.equal(r.turns.length, 3);
});

test("accepting a price that was never proposed is rejected; walk_away ends without a deal", async () => {
  const r = await negotiate(full(), script([d("accept", 186), d("walk_away", undefined, "bye")]));
  assert.equal(r.turns[0].verdict, "rejected");
  assert.equal(r.turns[1].verdict, "ok");
  assert.equal(r.agreed, undefined);
});

test("a turn with no tool call is rejected", async () => {
  const r = await negotiate(full(), script([d("none", undefined), d("walk_away", undefined)]));
  assert.equal(r.turns[0].reason, "no tool call");
});

test("negotiatorFor picks the adapter and throws on unknown providers", () => {
  assert.equal(negotiatorFor("claude"), claudeNegotiator);
  assert.equal(negotiatorFor("gemini"), geminiNegotiator);
  assert.throws(() => negotiatorFor("gpt"), /gpt/);
});
