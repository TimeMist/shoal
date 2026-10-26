// Invoices in the supplier's name, one per real captured shop, marked paid against its capture.
import { formatUSD } from "./money.ts";
import type { Commitment, RoundState } from "./store.ts";

export type InvoiceDraft = {
  number: string;
  invoicer: string; // supplier business name
  note: string;
  recipient: { email: string; business: string };
  item: { name: string; quantity: number; unitAmount: number };
  shipping: number;
  total: number; // expected invoice total in cents, checked by the adapter
  reference: string; // capture id
};

export type InvoiceApi = {
  create(d: InvoiceDraft): Promise<string>;
  send(id: string): Promise<string>; // recipient view url
  recordPayment(id: string, cents: number, captureId: string): Promise<void>;
  recordRefund(id: string, cents: number): Promise<void>;
};

export const invoiceNumber = (s: RoundState, index: number) => `SHOAL-${s.round.id}-${index + 1}-${Date.parse(s.round.closesAt)}`;

export function buildInvoice(s: RoundState, c: Commitment, number: string): InvoiceDraft | { error: string } {
  const { supplier, product, finalPrice = 0 } = s.round;
  const total = c.qty * finalPrice + c.delivery;
  if (!c.payerEmail) return { error: "No payer email on file, so no invoice was sent" };
  if (!c.captureId) return { error: "No capture id on file, so no invoice was sent" };
  if (total !== c.captured) return { error: `Invoice total ${formatUSD(total)} does not match the capture ${formatUSD(c.captured ?? 0)}, so nothing was sent` };
  return {
    number,
    invoicer: supplier,
    note: `Issued by Shoal on behalf of ${supplier}.`,
    recipient: { email: c.payerEmail, business: c.shop },
    item: { name: product, quantity: c.qty, unitAmount: finalPrice },
    shipping: c.delivery,
    total,
    reference: c.captureId,
  };
}

// A failure on one shop never touches the others, and never undoes the close.
export async function issueInvoices(s: RoundState, api: InvoiceApi): Promise<{ issued: number; failed: number }> {
  let issued = 0;
  let failed = 0;
  for (const [i, c] of s.commitments.entries()) {
    if (c.simulated || !c.captured || c.invoiceStatus) continue;
    try {
      // Each step runs only if its result is missing, so a retry resumes where the last run stopped.
      if (!c.invoiceId) {
        const number = c.invoiceNumber ?? invoiceNumber(s, i);
        const draft = buildInvoice(s, c, number);
        if ("error" in draft) throw new Error(draft.error);
        c.invoiceId = await api.create(draft);
        c.invoiceNumber = number;
      }
      c.invoiceUrl ??= await api.send(c.invoiceId);
      await api.recordPayment(c.invoiceId, c.captured, c.captureId ?? "");
      c.invoiceStatus = "paid";
      c.invoiceError = undefined;
      issued++;
    } catch (e) {
      c.invoiceError = e instanceof Error ? e.message : "Invoice failed";
      failed++;
    }
  }
  return { issued, failed };
}
