import { releaseHoldback, splitPayout } from "./settle.ts";
import type { RoundState } from "./store.ts";

export type Payer = (receiverEmail: string, cents: number, note: string, senderBatchId: string) => Promise<string>;
export type Tracker = (orderId: string, captureId: string, trackingNumber: string, carrier: string) => Promise<void>;
export type Outcome = { ok: true } | { ok: false; status: number; error: string };

const busy = new Set<string>(); // shortcut: in-process guard, single instance only
const err = (status: number, error: string): Outcome => ({ ok: false, status, error });
const paid = (s: RoundState, kind: "ship" | "holdback") => s.payouts.some((p) => p.kind === kind);

export async function shipRound(s: RoundState, email: string, fns: { payout: Payer; track: Tracker }): Promise<Outcome> {
  const key = `${s.round.id}-ship`;
  if (s.round.status !== "closed") return err(409, "Round is not closed");
  if (paid(s, "ship") || busy.has(key)) return err(409, "Round already shipped");
  busy.add(key);
  try {
    const sold = s.commitments.filter((c) => c.captured);
    for (const [i, c] of sold.entries()) {
      c.tracking ??= `SHOAL-${s.round.id}-${i + 1}`;
      if (c.simulated || !c.orderId || !c.captureId) continue;
      // A tracking failure must not hold up the supplier's payout.
      await fns.track(c.orderId, c.captureId, c.tracking, "Demo Courier").catch((e) => {
        c.error = e instanceof Error ? e.message : "Tracking failed";
      });
    }
    const { now, held } = splitPayout(sold.reduce((n, c) => n + (c.captured ?? 0), 0), s.round.holdbackPct);
    let batchId: string;
    try {
      batchId = await fns.payout(email, now, `Shoal ${s.round.product}: shipment payout`, key);
    } catch (e) {
      return err(502, e instanceof Error ? e.message : "PayPal error");
    }
    s.payouts.push({ batchId, kind: "ship", cents: now });
    s.holdbackLeft = held;
    return { ok: true };
  } finally {
    busy.delete(key);
  }
}

export function deliver(s: RoundState, commitmentId: string): Outcome {
  const c = s.commitments.find((x) => x.id === commitmentId);
  if (!c) return err(404, "Commitment not found");
  if (c.status !== "captured") return err(409, "Commitment is not captured");
  c.status = "delivered";
  return { ok: true };
}

export async function releaseRound(s: RoundState, email: string, payout: Payer): Promise<Outcome> {
  const key = `${s.round.id}-holdback`;
  if (!paid(s, "ship")) return err(409, "Round has not shipped");
  const open = s.claims.filter((k) => k.status === "open").length;
  if (open) return err(409, `${open} open claim${open > 1 ? "s" : ""} to resolve first`);
  const cents = releaseHoldback(s.holdbackLeft, 0); // claim refunds are already netted out of holdbackLeft
  if (cents === 0 || paid(s, "holdback") || busy.has(key)) return { ok: true };
  busy.add(key);
  try {
    let batchId: string;
    try {
      batchId = await payout(email, cents, `Shoal ${s.round.product}: holdback release`, key);
    } catch (e) {
      return err(502, e instanceof Error ? e.message : "PayPal error");
    }
    s.payouts.push({ batchId, kind: "holdback", cents });
    s.holdbackLeft = 0;
    return { ok: true };
  } finally {
    busy.delete(key);
  }
}
