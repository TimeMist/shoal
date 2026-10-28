import { captureCents, deliveryCents, tierAt } from "./round.ts";
import { unitsCommitted } from "./store.ts";
import type { Commitment, RoundState } from "./store.ts";

export type Pay = {
  capture(authorizationId: string, cents: number): Promise<string>;
  void(authorizationId: string): Promise<void>;
};

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Captures (price set) or voids (price null) one shop's authorization; a PayPal error is recorded on the shop.
async function settle(s: RoundState, c: Commitment, pay: Pay, price: number | null): Promise<void> {
  try {
    if (price === null) {
      if (!c.simulated && c.authorizationId) await pay.void(c.authorizationId);
      c.status = "released";
    } else {
      const cents = captureCents(c.qty, price, c.reserved, deliveryCents(s.round, c.qty));
      if (!c.simulated) {
        if (!c.authorizationId) throw new Error("Not authorized");
        c.captureId = await pay.capture(c.authorizationId, cents);
      }
      c.captured = cents;
      c.status = "captured";
    }
    c.error = undefined;
  } catch (e) {
    c.error = msg(e);
  }
}

// Always leaves the round closed or failed and clears `closing`; per-commitment PayPal errors are recorded.
export async function closeRound(s: RoundState, pay: Pay): Promise<RoundState> {
  const { round } = s;
  const units = unitsCommitted(s);
  try {
    if (units < round.tiers[1].min) {
      for (const c of s.commitments) await settle(s, c, pay, null);
      round.status = "failed";
    } else {
      const tierPrice = tierAt(round.tiers, units).price;
      // A deal struck at an earlier headcount never beats the tier price now.
      const price = s.agreedPrice === undefined ? tierPrice : Math.min(s.agreedPrice, tierPrice);
      for (const c of s.commitments) await settle(s, c, pay, price);
      round.finalPrice = price;
      round.status = "closed";
    }
  } finally {
    s.closing = false;
  }
  return s;
}

// Shops whose capture or void failed at close: still "reserved", with the PayPal error on them.
export const stuck = (s: RoundState) => s.commitments.filter((c) => c.status === "reserved" && c.error);

const retrying = new WeakSet<RoundState>(); // shortcut: in-process guard, single instance only

// Retries the failed captures (closed round) or voids (failed round). Before shipping only, so the payout covers them.
// A capture that went through at PayPal but whose answer was lost comes back as an error here; check PayPal before retrying again.
export async function retryClose(s: RoundState, pay: Pay): Promise<{ ok: true; failed: number } | { ok: false; status: number; error: string }> {
  if (s.round.status === "open") return { ok: false, status: 409, error: "Round is still open" };
  if (s.payouts.some((p) => p.kind === "ship")) return { ok: false, status: 409, error: "Round already shipped" };
  if (retrying.has(s)) return { ok: false, status: 409, error: "Already retrying" };
  retrying.add(s);
  try {
    const price = s.round.status === "closed" ? s.round.finalPrice! : null;
    for (const c of stuck(s)) await settle(s, c, pay, price);
    return { ok: true, failed: stuck(s).length };
  } finally {
    retrying.delete(s);
  }
}
