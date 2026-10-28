import { clampRefund } from "./settle.ts";
import { releasing } from "./fulfil.ts";
import type { RoundState } from "./store.ts";

export type Refunder = (captureId: string, cents: number, note: string) => Promise<string>;
export type Outcome = { ok: true; refunded: number } | { ok: false; status: number; error: string };

const busy = new Set<string>(); // shortcut: in-process guard, single instance only

function find(s: RoundState, claimId: string) {
  const claim = s.claims.find((x) => x.id === claimId);
  const c = s.commitments.find((x) => x.id === claim?.commitmentId);
  return claim && c ? { claim, c } : null;
}

export async function approveClaim(
  s: RoundState,
  claimId: string,
  refund: Refunder,
  recordInvoiceRefund?: (invoiceId: string, cents: number) => Promise<void>,
): Promise<Outcome> {
  const f = find(s, claimId);
  if (!f) return { ok: false, status: 404, error: "Claim not found" };
  const { claim, c } = f;
  if (releasing(s)) return { ok: false, status: 409, error: "Holdback release in progress" };
  if (claim.status !== "open" || busy.has(claimId)) return { ok: false, status: 409, error: "Claim is not open" };
  // Re-clamp: the holdback or earlier refunds may have changed since the proposal. Delivery is never refunded.
  const goods = (c.captured ?? 0) - c.delivery;
  const { refund: cents } = clampRefund(claim.proposal?.refund ?? 0, goods, c.refunded, s.holdbackLeft);
  if (cents > 0 && !c.simulated) {
    busy.add(claimId);
    try {
      await refund(c.captureId!, cents, `Shoal claim ${claim.kind}: ${claim.units} ${claim.units === 1 ? s.round.unit.one : s.round.unit.many}`);
    } catch (e) {
      return { ok: false, status: 502, error: e instanceof Error ? e.message : "PayPal error" };
    } finally {
      busy.delete(claimId);
    }
  }
  c.refunded += cents;
  s.holdbackLeft -= cents;
  claim.status = "approved";
  c.status = "resolved";
  // The PayPal refund already happened, so an invoice failure is recorded, never fatal.
  // An unpaid invoice can't take a refund; the invoice retry records it after payment.
  if (cents > 0 && c.invoiceId && c.invoiceStatus && recordInvoiceRefund) {
    try {
      await recordInvoiceRefund(c.invoiceId, cents);
      c.invoiceRefunded = (c.invoiceRefunded ?? 0) + cents;
      c.invoiceStatus = "refunded";
      // An earlier refund that failed to record is still owed; keep its error for the retry.
      if (c.invoiceRefunded === c.refunded) c.invoiceError = undefined;
    } catch (e) {
      c.invoiceError = `Refund not recorded on the invoice: ${e instanceof Error ? e.message : "Invoicing error"}`;
    }
  }
  return { ok: true, refunded: cents };
}

export function rejectClaim(s: RoundState, claimId: string): Outcome {
  const f = find(s, claimId);
  if (!f) return { ok: false, status: 404, error: "Claim not found" };
  if (f.claim.status !== "open" || busy.has(claimId)) return { ok: false, status: 409, error: "Claim is not open" };
  f.claim.status = "rejected";
  f.c.status = f.claim.priorStatus ?? "delivered";
  return { ok: true, refunded: 0 };
}
