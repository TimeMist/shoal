import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInvoice, invoiceNumber, issueInvoices } from "./invoices.ts";
import type { InvoiceApi, InvoiceDraft } from "./invoices.ts";
import { seedRound } from "./seed.ts";
import type { Commitment, RoundState } from "./store.ts";

function setup(over: Partial<Commitment>[] = [{}]) {
  const s: RoundState = seedRound();
  s.round.finalPrice = 185;
  s.commitments = over.map((o, i) => ({
    id: `c${i}`, shop: `Shop ${i}`, qty: 120, reserved: 24000, delivery: 1800, captured: 24000, captureId: `cap${i}`,
    payerEmail: `shop${i}@example.com`, refunded: 0, simulated: false, status: "captured", ...o,
  }));
  return s;
}
function fake(over: Partial<InvoiceApi> = {}) {
  const log: string[] = [];
  const api: InvoiceApi = {
    create: async (d: InvoiceDraft) => (log.push(`create ${d.number}`), `INV-${d.number}`),
    send: async (id) => (log.push(`send ${id}`), `https://pay/${id}`),
    recordPayment: async (id, cents, cap) => void log.push(`pay ${id} ${cents} ${cap}`),
    recordRefund: async () => {},
    ...over,
  };
  return { api, log };
}

test("buildInvoice: item, shipping and total match the capture", () => {
  const s = setup();
  const d = buildInvoice(s, s.commitments[0], "N1");
  assert.ok(!("error" in d));
  assert.deepEqual(d.item, { name: s.round.product, quantity: 120, unitAmount: 185 });
  assert.equal(d.shipping, 1800);
  assert.equal(d.item.quantity * d.item.unitAmount + d.shipping, 24000);
  assert.equal(d.invoicer, s.round.supplier);
  assert.equal(d.note, `Issued by Shoal on behalf of ${s.round.supplier}.`);
  assert.equal(d.reference, "cap0");
  assert.equal(d.recipient.email, "shop0@example.com");
});

test("issueInvoices records a mismatch and sends nothing", async () => {
  const s = setup([{ captured: 23999 }]);
  const { api, log } = fake();
  assert.deepEqual(await issueInvoices(s, api), { issued: 0, failed: 1 });
  assert.match(s.commitments[0].invoiceError!, /does not match/);
  assert.deepEqual(log, []);
});

test("issueInvoices needs a payer email", async () => {
  const s = setup([{ payerEmail: undefined }]);
  const { api, log } = fake();
  assert.deepEqual(await issueInvoices(s, api), { issued: 0, failed: 1 });
  assert.match(s.commitments[0].invoiceError!, /email/);
  assert.deepEqual(log, []);
});

test("issueInvoices isolates a failing shop", async () => {
  const s = setup([{}, {}]);
  const { api } = fake({ send: async (id) => { if (id.includes("-1-")) throw new Error("boom"); return `https://pay/${id}`; } });
  assert.deepEqual(await issueInvoices(s, api), { issued: 1, failed: 1 });
  assert.equal(s.commitments[0].invoiceError, "boom");
  assert.equal(s.commitments[0].invoiceStatus, undefined);
  assert.equal(s.commitments[1].invoiceStatus, "paid");
  assert.equal(s.commitments[1].invoiceUrl, `https://pay/${s.commitments[1].invoiceId}`);
});

test("issueInvoices marks paid against the capture and a retry skips issued shops", async () => {
  const s = setup([{}]);
  const { api, log } = fake();
  await issueInvoices(s, api);
  const c = s.commitments[0];
  assert.equal(c.invoiceStatus, "paid");
  assert.equal(c.invoiceNumber, invoiceNumber(s, 0));
  assert.ok(log.includes(`pay ${c.invoiceId} 24000 cap0`));
  log.length = 0;
  assert.deepEqual(await issueInvoices(s, api), { issued: 0, failed: 0 });
  assert.deepEqual(log, []);
});

test("issueInvoices skips simulated and uncaptured shops, and clears a stale error on success", async () => {
  const s = setup([{ simulated: true }, { captured: undefined }, { invoiceError: "old" }]);
  const { api } = fake();
  assert.deepEqual(await issueInvoices(s, api), { issued: 1, failed: 0 });
  assert.equal(s.commitments[2].invoiceError, undefined);
});

test("invoiceNumber differs for two closesAt", () => {
  const a = setup();
  const b = setup();
  b.round.closesAt = new Date(Date.parse(a.round.closesAt) + 1000).toISOString();
  assert.notEqual(invoiceNumber(a, 0), invoiceNumber(b, 0));
  assert.match(invoiceNumber(a, 1), /^SHOAL-demo-2-\d+$/);
});
