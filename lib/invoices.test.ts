import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInvoice, invoiceNumber, issueInvoices } from "./invoices.ts";
import type { InvoiceApi, InvoiceDraft } from "./invoices.ts";
import { toMoney } from "./money.ts";
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
    create: async (d: InvoiceDraft) => (log.push(`create ${d.number}`), { id: `INV-${d.number}`, total: toMoney(d.total) }),
    total: async () => "240.00",
    send: async (id) => void log.push(`send ${id}`),
    viewUrl: async (id) => `https://pay/${id}`,
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
  assert.match(s.commitments[0].invoiceError!, /\$240\.00 does not match the capture \$239\.99/);
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
  const { api } = fake({ send: async (id) => { if (id.includes("-1-")) throw new Error("boom"); } });
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

test("buildInvoice refuses a missing capture id", () => {
  const s = setup([{ captureId: undefined }]);
  assert.match((buildInvoice(s, s.commitments[0], "N") as { error: string }).error, /capture id/);
});

test("a failure after create and send resumes without re-creating", async () => {
  const s = setup([{}]);
  let fail = true;
  const { api, log } = fake({ recordPayment: async () => { if (fail) throw new Error("pay down"); } });
  assert.deepEqual(await issueInvoices(s, api), { issued: 0, failed: 1 });
  const c = s.commitments[0];
  assert.ok(c.invoiceId && c.invoiceNumber && c.invoiceUrl);
  assert.equal(c.invoiceStatus, undefined);
  fail = false;
  assert.deepEqual(await issueInvoices(s, api), { issued: 1, failed: 0 });
  assert.equal(c.invoiceStatus, "paid");
  assert.equal(c.invoiceError, undefined);
  assert.equal(log.filter((l) => l.startsWith("create")).length, 1);
  assert.equal(log.filter((l) => l.startsWith("send")).length, 1);
});

test("a wrong PayPal total keeps the draft, sends nothing, and a retry re-checks without re-creating", async () => {
  const s = setup([{}]);
  let paypalTotal = "239.99";
  const { api, log } = fake({
    create: async (d) => (log.push(`create ${d.number}`), { id: "INV-X", total: paypalTotal }),
    total: async () => paypalTotal,
  });
  assert.deepEqual(await issueInvoices(s, api), { issued: 0, failed: 1 });
  const c = s.commitments[0];
  assert.equal(c.invoiceId, "INV-X");
  assert.match(c.invoiceError!, /does not match/);
  assert.ok(!log.some((l) => l.startsWith("send")));
  assert.deepEqual(await issueInvoices(s, api), { issued: 0, failed: 1 });
  paypalTotal = "240.00";
  assert.deepEqual(await issueInvoices(s, api), { issued: 1, failed: 0 });
  assert.equal(log.filter((l) => l.startsWith("create")).length, 1);
  assert.equal(c.invoiceStatus, "paid");
});

test("a failed view-url fetch does not re-send on retry", async () => {
  const s = setup([{}]);
  let down = true;
  const { api, log } = fake({ viewUrl: async (id) => { if (down) throw new Error("get down"); return `https://pay/${id}`; } });
  await issueInvoices(s, api);
  down = false;
  assert.deepEqual(await issueInvoices(s, api), { issued: 1, failed: 0 });
  assert.equal(log.filter((l) => l.startsWith("send")).length, 1);
});

test("a claim refunded before the invoice existed is recorded on it once, after payment", async () => {
  const s = setup([{ refunded: 2220 }]);
  const refunds: [string, number][] = [];
  const { api, log } = fake({ recordRefund: async (id, cents) => void refunds.push([id, cents]) });
  await issueInvoices(s, api);
  const c = s.commitments[0];
  assert.deepEqual(refunds, [[c.invoiceId!, 2220]]);
  assert.equal(log.at(-1), `pay ${c.invoiceId} 24000 cap0`);
  assert.deepEqual([c.invoiceStatus, c.invoiceRefunded, c.invoiceError], ["refunded", 2220, undefined]);
  await issueInvoices(s, api);
  assert.equal(refunds.length, 1);
});

test("a failed refund record is retried and the error cleared, without paying again", async () => {
  const s = setup([{ invoiceId: "INV-1", invoiceNumber: "N1", invoiceSent: true, invoiceUrl: "u", invoiceStatus: "paid", refunded: 2220, invoiceError: "Refund not recorded" }]);
  const refunds: [string, number][] = [];
  const { api, log } = fake({ recordRefund: async (id, cents) => void refunds.push([id, cents]) });
  await issueInvoices(s, api);
  const c = s.commitments[0];
  assert.deepEqual(refunds, [["INV-1", 2220]]);
  assert.deepEqual(log, []);
  assert.deepEqual([c.invoiceStatus, c.invoiceError], ["refunded", undefined]);
});
