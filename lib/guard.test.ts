import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOffer } from "./guard.ts";
import { seedRound } from "./seed.ts";

const { round } = seedRound();

test("validateOffer enforces floor, tier ceiling and whole cents", () => {
  const r = validateOffer(round, 1440, 179);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.reason : "", /floor/);
  assert.equal(validateOffer(round, 1440, 193).ok, false);
  assert.equal(validateOffer(round, 1440, 185.5).ok, false);
  assert.deepEqual(validateOffer(round, 1440, 185), { ok: true });
});
