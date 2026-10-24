import { createHmac, timingSafeEqual } from "node:crypto";

// A signed, expiring deal so the browser can't change the agreed price before checkout.
export type Deal = { productId: string; price: number; exp: number };

const TTL_MS = 15 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createDealToken(productId: string, price: number, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ productId, price, exp: now + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyDealToken(token: string, secret: string, now = Date.now()): Deal | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const deal = JSON.parse(Buffer.from(payload, "base64url").toString()) as Deal;
  return deal.exp > now ? deal : null;
}
