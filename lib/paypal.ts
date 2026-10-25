import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  ShipmentCarrier,
} from "@paypal/paypal-server-sdk";
import { toMoney } from "./money.ts";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}, see .env.example`);
  return value;
}

export function dealSecret(): string {
  return required("DEAL_SECRET");
}

function client(): Client {
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: required("PAYPAL_CLIENT_ID"),
      oAuthClientSecret: required("PAYPAL_CLIENT_SECRET"),
    },
    environment: Environment.Sandbox,
  });
}

export function orders(): OrdersController {
  return new OrdersController(client());
}

function payments(): PaymentsController {
  return new PaymentsController(client());
}

const usd = (cents: number) => ({ currencyCode: "USD", value: toMoney(cents) });

export async function createAuthorizeOrder(cents: number, description: string, referenceId: string): Promise<string> {
  const { result } = await orders().createOrder({
    body: {
      intent: CheckoutPaymentIntent.Authorize,
      purchaseUnits: [{ referenceId, description, amount: usd(cents) }],
    },
  });
  if (!result.id) throw new Error("PayPal createOrder returned no id");
  return result.id;
}

export type Authorization = { authorizationId: string; amount: string; referenceId: string };

export async function authorizeOrder(orderId: string): Promise<Authorization> {
  const { result } = await orders().authorizeOrder({ id: orderId });
  const unit = result.purchaseUnits?.[0];
  const auth = unit?.payments?.authorizations?.[0];
  if (!auth?.id) throw new Error("PayPal authorizeOrder returned no authorization id");
  return { authorizationId: auth.id, amount: auth.amount?.value ?? "", referenceId: unit?.referenceId ?? "" };
}

export async function captureAuthorization(authorizationId: string, cents: number): Promise<string> {
  const { result } = await payments().captureAuthorizedPayment({
    authorizationId,
    body: { amount: usd(cents), finalCapture: true },
  });
  if (!result.id) throw new Error("PayPal capture returned no id");
  return result.id;
}

export async function voidAuthorization(authorizationId: string): Promise<void> {
  await payments().voidPayment({ authorizationId });
}

export async function refundCapture(captureId: string, cents: number, note: string): Promise<string> {
  const { result } = await payments().refundCapturedPayment({
    captureId,
    body: { amount: usd(cents), noteToPayer: note },
  });
  if (!result.id) throw new Error("PayPal refund returned no id");
  return result.id;
}

export async function addTracking(orderId: string, captureId: string, trackingNumber: string, carrier: string): Promise<void> {
  await orders().createOrderTracking({
    id: orderId,
    body: { captureId, trackingNumber, carrier: ShipmentCarrier.Other, carrierNameOther: carrier },
  });
}

const API = "https://api-m.sandbox.paypal.com";

// Payouts are not in the SDK, so call REST directly.
export async function sendPayout(receiverEmail: string, cents: number, note: string, senderBatchId: string): Promise<string> {
  const basic = Buffer.from(`${required("PAYPAL_CLIENT_ID")}:${required("PAYPAL_CLIENT_SECRET")}`).toString("base64");
  const tokenRes = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error(`PayPal token request failed: HTTP ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const res = await fetch(`${API}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: senderBatchId, email_subject: "Shoal supplier payout" },
      items: [{ recipient_type: "EMAIL", amount: { value: toMoney(cents), currency: "USD" }, receiver: receiverEmail, note }],
    }),
  });
  if (!res.ok) throw new Error(`PayPal payout failed: HTTP ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { batch_header: { payout_batch_id: string } };
  return body.batch_header.payout_batch_id;
}
