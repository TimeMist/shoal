import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@google/genai";
import { MAX_TURNS, chat, negotiate, negotiatorFor, claudeNegotiator, geminiNegotiator, withClaudeFallback } from "./negotiate.ts";
import type { Decision, Model } from "./negotiate.ts";
import { withRetry } from "../gemini.ts";
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
  assert.equal(r.turns.length, MAX_TURNS);
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

test("the shop's history never reveals the supplier floor, the stored turn keeps the reason", async () => {
  const r = await negotiate(full(), script([d("propose", 170), d("walk_away", undefined)]));
  assert.match(r.turns[0].reason!, /floor/);
  const text = chat("shop", r.turns).map((m) => m.text).join("\n");
  assert.doesNotMatch(text, /floor|180/);
  assert.match(text, /below what the supplier can accept/);
  assert.equal(r.turns[0].move, "propose");
});

test("history alternates roles and starts and ends with user", () => {
  const turns = [
    { side: "shop", provider: "claude", move: "propose", price: 170, message: "a", verdict: "rejected", reason: "x" },
    { side: "supplier", provider: "claude", move: "propose", price: 170, message: "b", verdict: "rejected", reason: "x" },
    { side: "shop", provider: "claude", move: "accept", price: 185, message: "c", verdict: "rejected", reason: "y" },
  ] as const;
  const m = chat("shop", [...turns]);
  assert.equal(m[0].role, "user");
  assert.equal(m.at(-1)!.role, "user");
  assert.ok(m.every((x, i) => i === 0 || x.role !== m[i - 1].role));
});

test("withRetry retries busy errors with the given waits, then gives up", async () => {
  const waits: number[] = [];
  let calls = 0;
  const busy = new Error("503");
  const sleep = async (ms: number) => void waits.push(ms);
  await assert.rejects(withRetry(async () => { calls++; throw busy; }, (e) => e === busy, [1000, 3000], sleep), busy);
  assert.deepEqual([calls, waits], [3, [1000, 3000]]);
  calls = 0;
  assert.equal(await withRetry(async () => (++calls < 2 ? Promise.reject(busy) : "ok"), (e) => e === busy, [5], sleep), "ok");
  await assert.rejects(withRetry(async () => { throw new Error("400"); }, (e) => e === busy, [5], sleep), /400/);
});

test("an overloaded Gemini move falls back to Claude and says so; other errors still throw", async () => {
  const overloaded = new ApiError({ message: "high demand", status: 503 });
  const claude: Model = async () => ({ tool: "propose", price: 110, message: "hi", provider: "claude" });
  const d = await withClaudeFallback(async () => { throw overloaded; }, claude)("supplier", [], seedRound("receipts"));
  assert.deepEqual([d.provider, d.price, d.note], ["claude", 110, "Gemini was overloaded, so Claude made this move"]);
  await assert.rejects(withClaudeFallback(async () => { throw new ApiError({ message: "bad", status: 400 }); }, claude)("shop", [], seedRound("receipts")), /bad/);
});

test("onTurn reports every turn once, with the guard's verdict, including the last", async () => {
  const seen: [string, string][] = [];
  await negotiate(full(), script([d("propose", 170), d("propose", 186), d("accept", 186)]), MAX_TURNS, (t) => seen.push([t.move, t.verdict]));
  assert.deepEqual(seen, [["propose", "rejected"], ["propose", "ok"], ["accept", "ok"]]);
});
