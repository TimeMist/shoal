// Interactive sandbox check. Run: npm run smoke:paypal  (add --no-wait to stop after creating the order)
import { createInterface } from "node:readline/promises";
import {
  addTracking, authorizeOrder, captureAuthorization, createAuthorizeOrder,
  orders, refundCapture, sendPayout, voidAuthorization,
} from "../lib/paypal.ts";

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function newApprovedOrder(label: string, cents: number): Promise<string> {
  const id = await createAuthorizeOrder(cents, `Shoal smoke test ${label}`, `smoke-${label}`);
  console.log(`order ${label}: ${id}`);
  const { result } = await orders().getOrder({ id });
  const link = result.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
  console.log(`approve with a sandbox buyer: ${link}`);
  if (process.argv.includes("--no-wait")) {
    console.log("--no-wait: stopping before approval.");
    process.exit(0);
  }
  await rl.question("Press Enter once approved... ");
  return id;
}

const orderA = await newApprovedOrder("A", 1000);
const { authorizationId: authA } = await authorizeOrder(orderA);
console.log("authorization A:", authA);
const captureId = await captureAuthorization(authA, 500);
console.log("capture (5.00):", captureId);
console.log("refund (1.00):", await refundCapture(captureId, 100, "smoke test refund"));
try {
  await addTracking(orderA, captureId, "SMOKE123", "Shoal Test");
  console.log("tracking added");
} catch (e) {
  console.log("tracking skipped:", (e as Error).message);
}

const orderB = await newApprovedOrder("B", 1000);
const { authorizationId: authB } = await authorizeOrder(orderB);
await voidAuthorization(authB);
console.log("voided authorization B:", authB);

const supplier = process.env.SUPPLIER_PAYPAL_EMAIL;
if (!supplier) console.log("payout skipped: SUPPLIER_PAYPAL_EMAIL is empty");
else console.log("payout batch (1.00):", await sendPayout(supplier, 100, "smoke test", `smoke-${Date.now()}`));
rl.close();
