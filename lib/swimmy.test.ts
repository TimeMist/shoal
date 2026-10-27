import { test } from "node:test";
import assert from "node:assert/strict";
import { DOTS, DOT_COUNT, EYE, SMALL_DOTS, SMALL_EYE, SMALL_R, dotsPerShop } from "./swimmy.ts";

test("the Swimmy is exactly 61 dots, ordered head to tail", () => {
  assert.equal(DOTS.length, 61);
  assert.equal(DOT_COUNT, 61);
  for (let i = 1; i < DOTS.length; i++) assert.ok(DOTS[i].x >= DOTS[i - 1].x);
  for (const d of DOTS) assert.ok(Math.hypot(d.x - EYE.x, d.y - EYE.y) > 4.6, "no dot under the eye");
});

test("ramps run coral to plum (light) and light coral to lilac (on dark)", () => {
  assert.equal(DOTS[0].c, "#F25752");
  assert.equal(DOTS[60].c, "#611D8A");
  assert.match(DOTS[0].dark, /^#[0-9A-F]{6}$/);
});

const demo = [240, 180, 96, 120, 300, 144, 120, 240].map((qty, i) => ({ name: `Shop ${i}`, qty }));

test("demo round: 8 shops at 1,440 units fill at most 61 dots, every shop at least 1", () => {
  const per = dotsPerShop(demo, 1440, 1500);
  assert.equal(per.length, 8);
  assert.deepEqual(per, [10, 7, 4, 5, 12, 6, 5, 10]);
  assert.ok(per.reduce((a, b) => a + b, 0) <= 61);
  assert.ok(per.every((n) => n >= 1));
});

test("past the top tier the fish scales to units and still never exceeds 61", () => {
  const big = [...demo, { name: "Big", qty: 900 }];
  const per = dotsPerShop(big, 2340, 1500);
  assert.ok(per.reduce((a, b) => a + b, 0) <= 61);
});

test("many tiny shops are capped at 61 dots in total", () => {
  const tiny = Array.from({ length: 80 }, (_, i) => ({ name: `T${i}`, qty: 1 }));
  const per = dotsPerShop(tiny, 80, 1500);
  assert.equal(per.reduce((a, b) => a + b, 0), 61);
});

test("no shops, no dots", () => {
  assert.deepEqual(dotsPerShop([], 0, 1500), []);
});

test("the small mark is 30 dots, clear of its eye, ramping coral to plum", () => {
  assert.equal(SMALL_DOTS.length, 30);
  for (const d of SMALL_DOTS) assert.ok(Math.hypot(d.x - SMALL_EYE.x, d.y - SMALL_EYE.y) > SMALL_EYE.r + SMALL_R * 0.9);
  assert.equal(SMALL_DOTS.find((d) => d.x === 6)?.c, "#F45D4F");
});
