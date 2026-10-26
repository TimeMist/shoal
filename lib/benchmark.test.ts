import { test } from "node:test";
import assert from "node:assert/strict";
import { getBenchmark, median, normalise } from "./benchmark.ts";
import { classifyPacks } from "./agents/packs.ts";
import type { Offer } from "./channel3.ts";

const o = (merchant: string, price: number, currency = "USD"): Offer => ({ merchant, url: `https://${merchant}`, title: merchant, price, currency });
const offers: Offer[] = [o("a", 23.94), o("b", 41.88), o("c", 4.29), o("d", 0), o("e", 9.99, "EUR"), o("f", 3.5), o("g", 99)];
const verdicts = [
  { relevant: true, cartons: 6 },
  { relevant: true, cartons: 12 },
  { relevant: true, cartons: 1 },
  { relevant: true, cartons: 1 },
  { relevant: true, cartons: 1 },
  { relevant: false, cartons: 1 },
  { relevant: true, cartons: 60 },
];

test("normalise drops junk and needs three offers", async () => {
  const u = normalise(offers, verdicts);
  assert.deepEqual(u.map((x) => x.price), [399, 349, 429]);
  assert.equal(median(u.map((x) => x.price)), 399);
  const search = async () => offers;
  const r = await getBenchmark("p-ok", { search, classify: async () => verdicts });
  assert.equal(r.benchmark?.perCarton, 399);
  const short = await getBenchmark("p-short", { search: async () => offers.slice(0, 2), classify: async () => verdicts.slice(0, 2) });
  assert.equal(short.benchmark, null);
  assert.equal(short.reason, "Not enough comparable offers");
});

test("median of an even count rounds to whole cents", () => {
  assert.equal(median([100, 101]), 101);
  assert.equal(median([100, 200, 301, 400]), 251);
});

test("classifyPacks rejects a non-integer cartons", async () => {
  await assert.rejects(classifyPacks("p", [o("a", 1)], async () => [{ index: 0, relevant: true, cartons: 2.5 }]));
  const v = await classifyPacks("p", [o("a", 1), o("b", 1)], async () => [{ index: 1, relevant: true, cartons: 6 }]);
  assert.deepEqual(v, [{ relevant: false, cartons: 1 }, { relevant: true, cartons: 6 }]);
});

test("cache: second call within 24 h skips search, refresh does not", async () => {
  let calls = 0;
  const search = async () => (calls++, offers);
  const classify = async () => verdicts;
  await getBenchmark("p-cache", { now: 1000, search, classify });
  await getBenchmark("p-cache", { now: 2000, search, classify });
  assert.equal(calls, 1);
  await getBenchmark("p-cache", { now: 3000, search, classify, refresh: true });
  assert.equal(calls, 2);
  await getBenchmark("p-cache", { now: 3000 + 25 * 3600_000, search, classify });
  assert.equal(calls, 3);
});
