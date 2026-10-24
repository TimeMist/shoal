"use client";

import { useState } from "react";
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
  type OnApproveDataOneTimePayments,
} from "@paypal/react-paypal-js/sdk-v6";

// shortcut: a plain offer box stands in for the seller agent chat until the agent lands (days 3–7).
export function Offer({ productId, listPrice }: { productId: string; listPrice: number }) {
  const [offer, setOffer] = useState((listPrice / 100).toFixed(2));
  const [dealToken, setDealToken] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function makeOffer() {
    setStatus("");
    const res = await fetch("/api/deals", {
      method: "POST",
      body: JSON.stringify({ productId, price: Math.round(Number(offer) * 100) }),
    });
    const data = await res.json();
    if (!res.ok) return setStatus(data.error);
    setDealToken(data.dealToken);
    setStatus(`Deal at $${offer}. Pay within 15 minutes.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Your offer (USD)
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
          inputMode="decimal"
          value={offer}
          onChange={(e) => {
            setOffer(e.target.value);
            setDealToken(null);
          }}
        />
      </label>
      <button className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={makeOffer}>
        Make offer
      </button>
      {status && <p role="status" className="text-sm">{status}</p>}
      {dealToken && (
        <PayPalProvider
          clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
          environment="sandbox"
          components={["paypal-payments"]}
          pageType="checkout"
        >
          <PayPalOneTimePaymentButton
            createOrder={async () => {
              const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify({ dealToken }) });
              const { orderId } = await res.json();
              return { orderId };
            }}
            onApprove={async ({ orderId }: OnApproveDataOneTimePayments) => {
              const res = await fetch(`/api/orders/${orderId}/capture`, { method: "POST" });
              const { status } = await res.json();
              setStatus(`Payment ${status?.toLowerCase()}.`);
              setDealToken(null);
            }}
          />
        </PayPalProvider>
      )}
    </div>
  );
}
