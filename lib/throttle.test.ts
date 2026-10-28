import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, waitSeconds } from "./throttle.ts";

test("spaces calls per key and counts only allowed calls", () => {
  assert.equal(waitSeconds("a", 30_000, 1_000), 0);
  assert.equal(waitSeconds("a", 30_000, 11_000), 20);
  assert.equal(waitSeconds("b", 30_000, 11_000), 0); // other clients unaffected
  assert.equal(waitSeconds("a", 30_000, 31_000), 0);
  assert.equal(waitSeconds("a", 30_000, 32_000), 29); // the refused call didn't reset the clock
});

test("reads the first forwarded address", () => {
  assert.equal(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } })), "1.2.3.4");
  assert.equal(clientIp(new Request("http://x")), "local");
});
