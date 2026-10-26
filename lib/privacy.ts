// What leaves the server: shops' addresses and invoice links stay with the supplier and the shop itself.
import type { Commitment, RoundState } from "./store.ts";

export function maskEmail(email: string | undefined): string | undefined {
  if (!email) return email;
  const at = email.indexOf("@");
  return `${email[0]}•••${at > 0 ? email.slice(at) : ""}`;
}

export function publicCommitment(c: Commitment): Commitment {
  const out = { ...c, payerEmail: maskEmail(c.payerEmail) };
  delete out.address;
  delete out.invoiceUrl;
  delete out.authorizationId;
  return out;
}

export function publicState(s: RoundState): RoundState {
  return { ...s, commitments: s.commitments.map(publicCommitment) };
}

export type PurchaseOrderRow = {
  id: string; shop: string; address?: string; qty: number; unit: number; goods: number; delivery: number;
  captured: number; captureId?: string; invoiceNumber?: string; tracking?: string;
};

// One row per captured shop, money in cents.
export function purchaseOrder(s: RoundState): PurchaseOrderRow[] {
  return s.commitments.flatMap((c) =>
    c.captured === undefined
      ? []
      : [{
          id: c.id, shop: c.shop, address: c.address, qty: c.qty, unit: s.round.finalPrice ?? 0, goods: c.captured - c.delivery,
          delivery: c.delivery, captured: c.captured, captureId: c.captureId, invoiceNumber: c.invoiceNumber, tracking: c.tracking,
        }],
  );
}
