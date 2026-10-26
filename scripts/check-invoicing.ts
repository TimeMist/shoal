// One-off sandbox probe of PayPal Invoicing v2. Run: node --env-file=.env.local scripts/check-invoicing.ts
// Creates two $1.50 invoices to a made-up recipient. Prints statuses and response shapes only, never the token.
import { invoiceApi } from "../lib/invoicing.ts";
import { accessToken, API } from "../lib/paypal.ts";

const today = new Date().toISOString().slice(0, 10);
const token = await accessToken();
const amt = { currency_code: "USD", value: "1.50" };

async function raw(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}/v2/invoicing/invoices${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`  ${method} ${path || "/"} -> HTTP ${res.status} ${text.slice(0, 300)}`);
  return res.status;
}
async function state(id: string) {
  const j = await (await fetch(`${API}/v2/invoicing/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
  console.log(`  status=${j.status} recipient_view_url=${j.detail?.metadata?.recipient_view_url}`);
}
const draft = () =>
  invoiceApi.create({
    number: `SHOAL-CHECK-${Date.now()}`,
    invoicer: "Meadow Oat Co.",
    note: "Issued by Shoal on behalf of Meadow Oat Co.",
    recipient: { email: "shoal-demo-buyer@example.com", business: "Shoal check shop" },
    item: { name: "Oat milk carton", quantity: 1, unitAmount: 100 },
    shipping: 50,
    total: 150,
    reference: "CHECK-CAPTURE-ID",
  });

console.log("(a) create returns id and amount.value:");
const a = await draft();
console.log(" ", a);
console.log("(d) where the recipient view url lives (draft):");
await state(a.id);

console.log("(b) payment on a DRAFT, then send:");
await raw("POST", `/${a.id}/payments`, { method: "PAYPAL", payment_date: today, amount: amt, note: "probe" });
await raw("POST", `/${a.id}/send`, { send_to_recipient: true });
await state(a.id);

console.log("(c) payment after send: payment_id = a non-PayPal id, then the adapter's body:");
const b = await draft();
await invoiceApi.send(b.id);
await raw("POST", `/${b.id}/payments`, { method: "PAYPAL", payment_id: "CHECK-CAPTURE-ID", payment_date: today, amount: amt });
await invoiceApi.recordPayment(b.id, 150, "CHECK-CAPTURE-ID");
await state(b.id);
console.log("refund via the adapter:");
await invoiceApi.recordRefund(b.id, 50);
await state(b.id);
