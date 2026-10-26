// PayPal Invoicing v2 over REST (not in the server SDK). Sandbox only.
import type { InvoiceApi, InvoiceDraft } from "./invoices.ts";
import { toMoney } from "./money.ts";
import { accessToken, API } from "./paypal.ts";

const usd = (cents: number) => ({ currency_code: "USD", value: toMoney(cents) });

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, prefer?: boolean): Promise<T> {
  const res = await fetch(`${API}/v2/invoicing/invoices${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: "return=representation" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text) as { message?: string; details?: { issue?: string; description?: string }[] };
      msg = [j.message, ...(j.details ?? []).map((d) => d.description ?? d.issue)].filter(Boolean).join(": ");
    } catch {}
    throw new Error(`PayPal invoicing ${method} ${path || "/"} failed: HTTP ${res.status} ${msg}`.trim());
  }
  return (text ? JSON.parse(text) : {}) as T;
}

const today = () => new Date().toISOString().slice(0, 10);

export const invoiceApi: InvoiceApi = {
  async create(d: InvoiceDraft) {
    const inv = await call<{ id?: string; amount?: { value?: string } }>("POST", "", {
      detail: { invoice_number: d.number, invoice_date: today(), currency_code: "USD", note: d.note, reference: d.reference },
      invoicer: { business_name: d.invoicer },
      primary_recipients: [{ billing_info: { business_name: d.recipient.business, email_address: d.recipient.email } }],
      items: [{ name: d.item.name, quantity: String(d.item.quantity), unit_amount: usd(d.item.unitAmount) }],
      amount: { breakdown: { shipping: { amount: usd(d.shipping) } } },
    }, true);
    if (!inv.id) throw new Error("PayPal invoicing returned no invoice id");
    return { id: inv.id, total: inv.amount?.value ?? "" };
  },
  async total(id) {
    return (await call<{ amount?: { value?: string } }>("GET", `/${id}`)).amount?.value ?? "";
  },
  async send(id) {
    await call("POST", `/${id}/send`, { send_to_recipient: true });
  },
  async viewUrl(id) {
    const inv = await call<{ detail?: { metadata?: { recipient_view_url?: string } } }>("GET", `/${id}`);
    const url = inv.detail?.metadata?.recipient_view_url;
    if (!url) throw new Error("PayPal invoice has no recipient view url");
    return url;
  },
  async recordPayment(id, cents, captureId) {
    await call("POST", `/${id}/payments`, { method: "PAYPAL", payment_id: captureId, payment_date: today(), amount: usd(cents), note: "Paid through Shoal" });
  },
  async recordRefund(id, cents) {
    await call("POST", `/${id}/refunds`, { method: "PAYPAL", refund_date: today(), amount: usd(cents) });
  },
};
