import { createHmac, timingSafeEqual } from "node:crypto";

// A signed, expiring join quote so the browser can't change the reserved amount before PayPal checkout.
export type Quote = { roundId: string; shop: string; qty: number; reserved: number; exp: number };

const TTL_MS = 15 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createQuoteToken(
  q: { roundId: string; shop: string; qty: number; reserved: number },
  secret: string,
  now = Date.now(),
): string {
  const payload = Buffer.from(JSON.stringify({ ...q, exp: now + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyQuoteToken(token: string, secret: string, now = Date.now()): Quote | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const q = JSON.parse(Buffer.from(payload, "base64url").toString()) as Quote;
  return q.exp > now ? q : null;
}
