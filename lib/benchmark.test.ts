import { test } from "node:test";
import assert from "node:assert/strict";
import { getBenchmark, median, normalise } from "./benchmark.ts";
import { classifyPacks, offerList } from "./agents/packs.ts";
import type { Offer } from "./channel3.ts";
import { ConfigError } from "./http.ts";

const item = { product: "Barista oat milk, 1 L carton", unit: { one: "carton", many: "cartons" }, step: 12, matchHint: "barista oat milk in 1 L cartons" };

const o = (merchant: string, price: number, currency = "USD"): Offer => ({ merchant, url: `https://${merchant}`, title: merchant, price, currency });
const offers: Offer[] = [o("a", 23.94), o("b", 41.88), o("c", 4.29), o("d", 0), o("e", 9.99, "EUR"), o("f", 3.5), o("g", 99)];
const verdicts = [
  { relevant: true, units: 6 },
  { relevant: true, units: 12 },
  { relevant: true, units: 1 },
  { relevant: true, units: 1 },
  { relevant: true, units: 1 },
  { relevant: false, units: 1 },
  { relevant: true, units: 60 },
];

test("normalise drops junk and needs three offers", async () => {
  const u = normalise(offers, verdicts, 48);
  assert.deepEqual(u.map((x) => x.price), [399, 349, 429]);
  assert.equal(median(u.map((x) => x.price)), 399);
  const search = async () => offers;
  const r = await getBenchmark("p-ok", item, { search, classify: async () => verdicts });
  assert.equal(r.benchmark?.perUnit, 399);
  const short = await getBenchmark("p-short", item, { search: async () => offers.slice(0, 2), classify: async () => verdicts.slice(0, 2) });
  assert.equal(short.benchmark, null);
  assert.equal(short.reason, "Not enough comparable offers");
});

test("median of an even count rounds to whole cents", () => {
  assert.equal(median([100, 101]), 101);
  assert.equal(median([100, 200, 301, 400]), 251);
});

test("classifyPacks rejects a non-integer unit count", async () => {
  await assert.rejects(classifyPacks(item, [o("a", 1)], async () => [{ index: 0, relevant: true, units: 2.5 }]));
  const v = await classifyPacks(item, [o("a", 1), o("b", 1)], async () => [{ index: 1, relevant: true, units: 6 }]);
  assert.deepEqual(v, [{ relevant: false, units: 1 }, { relevant: true, units: 6 }]);
});

test("cache: second call within 24 h skips search, refresh does not", async () => {
  let calls = 0;
  const search = async () => (calls++, offers);
  const classify = async () => verdicts;
  await getBenchmark("p-cache", item, { now: 1000, search, classify });
  await getBenchmark("p-cache", item, { now: 2000, search, classify });
  assert.equal(calls, 1);
  await getBenchmark("p-cache", item, { now: 120_000, search, classify, refresh: true });
  assert.equal(calls, 2);
  await getBenchmark("p-cache", item, { now: 120_000 + 25 * 3600_000, search, classify });
  assert.equal(calls, 3);
});

test("a null result is cached for 1 h, then searched again; errors are not cached", async () => {
  let calls = 0;
  const search = async () => (calls++, offers.slice(0, 2));
  const classify = async () => verdicts.slice(0, 2);
  const a = await getBenchmark("p-null", item, { now: 0, search, classify });
  assert.deepEqual(a, { benchmark: null, reason: "Not enough comparable offers" });
  await getBenchmark("p-null", item, { now: 30 * 60_000, search, classify });
  assert.equal(calls, 1);
  await getBenchmark("p-null", item, { now: 61 * 60_000, search, classify });
  assert.equal(calls, 2);
  let n = 0;
  const boom = async () => { n++; throw new Error("down"); };
  await assert.rejects(getBenchmark("p-err", item, { search: boom, classify }));
  await assert.rejects(getBenchmark("p-err", item, { search: boom, classify }));
  const noKey = async () => { n++; throw new ConfigError("No Channel3 key"); };
  await getBenchmark("p-key", item, { search: noKey, classify });
  await getBenchmark("p-key", item, { search: noKey, classify });
  assert.equal(n, 4);
});

test("concurrent calls share one search", async () => {
  let calls = 0;
  const search = async () => (calls++, offers);
  const classify = async () => verdicts;
  const [a, b] = await Promise.all([getBenchmark("p-fly", item, { search, classify }), getBenchmark("p-fly", item, { search, classify })]);
  assert.equal(calls, 1);
  assert.equal(a.benchmark?.perUnit, b.benchmark?.perUnit);
});

test("refresh within a minute returns the cached benchmark with a reason", async () => {
  let calls = 0;
  const search = async () => (calls++, offers);
  const classify = async () => verdicts;
  await getBenchmark("p-ref", item, { now: 1_000_000, search, classify });
  const r = await getBenchmark("p-ref", item, { now: 1_030_000, search, classify, refresh: true });
  assert.equal(calls, 1);
  assert.equal(r.reason, "Refreshed less than a minute ago");
  assert.equal(r.benchmark?.perUnit, 399);
});

test("the two rounds' lookups use different cache keys", async () => {
  const seen: string[] = [];
  const search = async (q: string) => (seen.push(q), offers);
  const classify = async () => verdicts;
  const rolls = { product: "Thermal receipt paper", unit: { one: "roll", many: "rolls" }, step: 50, matchHint: "3⅛″ rolls" };
  await getBenchmark("k-oat", item, { search, classify });
  await getBenchmark("k-rolls", rolls, { search, classify });
  await getBenchmark("k-oat", item, { search, classify });
  assert.deepEqual(seen, ["k-oat", "k-rolls"]);
});

test("normalise caps packs at four cases of the round's step", () => {
  const v = [{ relevant: true, units: 50 }, { relevant: true, units: 200 }, { relevant: true, units: 201 }];
  assert.equal(normalise([o("a", 60), o("b", 240), o("c", 241)], v, 200).length, 2);
});

test("classifyPacks hands the model the round's hint and offer details, never prices", async () => {
  let got: { item: unknown; text: string } | undefined;
  const offer = { ...o("a", 62.72), details: "A case of 50 rolls, 3 1/8 in by 230 ft" };
  await classifyPacks(item, [offer], async (i, os) => ((got = { item: i, text: offerList(os) }), [{ index: 0, relevant: true, units: 50 }]));
  assert.equal((got?.item as typeof item).matchHint, item.matchHint);
  assert.match(got?.text ?? "", /A case of 50 rolls/);
  assert.doesNotMatch(got?.text ?? "", /62\.72/);
});
