import { captureCents, deliveryCents, tierAt } from "./round.ts";
import { unitsCommitted } from "./store.ts";
import type { RoundState } from "./store.ts";

export type Pay = {
  capture(authorizationId: string, cents: number): Promise<string>;
  void(authorizationId: string): Promise<void>;
};

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Always leaves the round closed or failed and clears `closing`; per-commitment PayPal errors are recorded.
export async function closeRound(s: RoundState, pay: Pay): Promise<RoundState> {
  const { round } = s;
  const units = unitsCommitted(s);
  try {
    if (units < round.tiers[1].min) {
      for (const c of s.commitments) {
        try {
          if (!c.simulated && c.authorizationId) await pay.void(c.authorizationId);
          c.status = "released";
        } catch (e) {
          c.error = msg(e);
        }
      }
      round.status = "failed";
    } else {
      const tierPrice = tierAt(round.tiers, units).price;
      // A deal struck at an earlier headcount never beats the tier price now.
      const price = s.agreedPrice === undefined ? tierPrice : Math.min(s.agreedPrice, tierPrice);
      for (const c of s.commitments) {
        const cents = captureCents(c.qty, price, c.reserved, deliveryCents(round, c.qty));
        try {
          if (!c.simulated) {
            if (!c.authorizationId) throw new Error("Not authorized");
            c.captureId = await pay.capture(c.authorizationId, cents);
          }
          c.captured = cents;
          c.status = "captured";
        } catch (e) {
          c.error = msg(e);
        }
      }
      round.finalPrice = price;
      round.status = "closed";
    }
  } finally {
    s.closing = false;
  }
  return s;
}
