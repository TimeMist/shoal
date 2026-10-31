// Invoices in the supplier's name, one per real captured shop, marked paid against its capture.
import { formatUSD, toMoney } from "./money.ts";
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
  create(d: InvoiceDraft): Promise<{ id: string; total: string }>;
  total(id: string): Promise<string>; // the draft's total as PayPal holds it
  send(id: string): Promise<void>;
  viewUrl(id: string): Promise<string>; // recipient view url
  recordPayment(id: string, cents: number, captureId: string): Promise<void>;
  recordRefund(id: string, cents: number): Promise<void>;
};

export const invoiceNumber = (s: RoundState, index: number) => `SH-${s.round.id}-${index + 1}-${Date.parse(s.round.closesAt).toString(36)}`;

export function buildInvoice(s: RoundState, c: Commitment, number: string): InvoiceDraft | { error: string } {
  const { supplier, product, finalPrice = 0 } = s.round;
  const total = c.qty * finalPrice + c.delivery;
  if (!c.payerEmail) return { error: "No payer email on file, so no invoice was sent" };
  if (!c.captureId) return { error: "No capture id on file, so no invoice was sent" };
  if (total !== c.captured) return { error: `Invoice total ${formatUSD(total)} does not match the capture ${formatUSD(c.captured ?? 0)}, so nothing was sent` };
  return {
    number,
    invoicer: supplier,
    note: `Issued by Shoal on behalf of ${supplier}`.replace(/\.?$/, "."), // "Brightline Paper Co." already ends the sentence
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
    if (c.simulated || !c.captured) continue;
    // Refunds approved before the invoice existed, or whose recording failed, are still owed on the invoice.
    const owed = c.refunded - (c.invoiceRefunded ?? 0);
    if (c.invoiceStatus && owed <= 0) continue;
    const alreadyInvoiced = !!c.invoiceStatus;
    try {
      if (!c.invoiceStatus) {
        // Each step runs only if its result is missing, so a retry resumes where the last run stopped.
        const number = c.invoiceNumber ?? invoiceNumber(s, i);
        const draft = buildInvoice(s, c, number);
        if ("error" in draft) throw new Error(draft.error);
        let held: string | undefined;
        if (!c.invoiceId) {
          const made = await api.create(draft);
          c.invoiceId = made.id;
          c.invoiceNumber = number;
          held = made.total;
        }
        if (!c.invoiceSent) {
          // The draft stays unsent until PayPal's total matches ours to the cent.
          held ??= await api.total(c.invoiceId);
          if (held !== toMoney(draft.total)) throw new Error(`PayPal invoice total ${held} does not match ${toMoney(draft.total)}, so it was not sent`);
          await api.send(c.invoiceId);
          c.invoiceSent = true;
        }
        c.invoiceUrl ??= await api.viewUrl(c.invoiceId);
        await api.recordPayment(c.invoiceId, c.captured, c.captureId ?? "");
        c.invoiceStatus = "paid";
      }
      if (owed > 0) {
        await api.recordRefund(c.invoiceId!, owed);
        c.invoiceRefunded = c.refunded;
        c.invoiceStatus = "refunded";
      }
      c.invoiceError = undefined;
      if (!alreadyInvoiced) issued++; // a retry that only records a refund is not a new invoice
    } catch (e) {
      c.invoiceError = e instanceof Error ? e.message : "Invoice failed";
      failed++;
    }
  }
  return { issued, failed };
}

const busy = new WeakSet<RoundState>(); // shortcut: in-process guard, single instance only

// Close and the retry route both issue; an overlapping run gets null instead of creating twice.
export async function issueInvoicesOnce(s: RoundState, api: InvoiceApi): Promise<{ issued: number; failed: number } | null> {
  if (busy.has(s)) return null;
  busy.add(s);
  try {
    return await issueInvoices(s, api);
  } finally {
    busy.delete(s);
  }
}
