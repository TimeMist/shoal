import { releaseHoldback, splitPayout } from "./settle.ts";
import type { RoundState } from "./store.ts";

export type Payer = (receiverEmail: string, cents: number, note: string, senderBatchId: string) => Promise<string>;
export type Tracker = (orderId: string, captureId: string, trackingNumber: string, carrier: string) => Promise<void>;
export type Outcome = { ok: true } | { ok: false; status: number; error: string };

const busy = new Set<string>(); // shortcut: in-process guard, single instance only
const err = (status: number, error: string): Outcome => ({ ok: false, status, error });
export const releasing = (roundId: string) => busy.has(`${roundId}-holdback`);
const paid = (s: RoundState, kind: "ship" | "holdback") => s.payouts.some((p) => p.kind === kind);

export async function shipRound(s: RoundState, email: string, fns: { payout: Payer; track: Tracker }): Promise<Outcome> {
  // A stable sender_batch_id makes PayPal reject a duplicate retry, so a lost response needs a manual lookup.
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
  // Stable sender_batch_id: PayPal rejects a duplicate retry, so a lost response needs a manual lookup.
  const key = `${s.round.id}-holdback`;
  if (!paid(s, "ship")) return err(409, "Round has not shipped");
  // A commitment in "claim" may have triage in flight with no claim filed yet.
  const open = new Set([
    ...s.claims.filter((k) => k.status === "open").map((k) => k.commitmentId),
    ...s.commitments.filter((c) => c.status === "claim").map((c) => c.id),
  ]).size;
  if (open) return err(409, `${open} open claim${open > 1 ? "s" : ""} to resolve first`);
  const cents = releaseHoldback(s.holdbackLeft, 0); // claim refunds are already netted out of holdbackLeft
  if (cents === 0 || paid(s, "holdback") || busy.has(key)) return { ok: true };
  busy.add(key);
  s.holdbackLeft = 0; // take it off the table so a claim can't also refund from it mid-payout
  try {
    let batchId: string;
    try {
      batchId = await payout(email, cents, `Shoal ${s.round.product}: holdback release`, key);
    } catch (e) {
      s.holdbackLeft = cents;
      return err(502, e instanceof Error ? e.message : "PayPal error");
    }
    s.payouts.push({ batchId, kind: "holdback", cents });
    return { ok: true };
  } finally {
    busy.delete(key);
  }
}
