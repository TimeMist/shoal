"use client";

import { PayPalOneTimePaymentButton, PayPalProvider, type OnApproveDataOneTimePayments } from "@paypal/react-paypal-js/sdk-v6";
import { useId, useRef, useState } from "react";
import { formatUSD } from "@/lib/money";
import { capitalise, deliveryCents, reserveCents, tierAt, unitLabel, type Round } from "@/lib/round";
import type { Commitment } from "@/lib/store";
import { api, ApiError, errorText } from "./api";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
// A sandbox-only buyer login, published on purpose so anyone trying the hosted demo can approve the payment.
const BUYER = { email: process.env.NEXT_PUBLIC_SANDBOX_BUYER_EMAIL, password: process.env.NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD };

type Props = { round: Round; units: number; onJoined: (c: Commitment) => void };

/** Quantity stepper, the reservation sentence, then PayPal's own button. */
export default function JoinPanel({ round, units, onJoined }: Props) {
  const { step, minPerShop, unit } = round;
  // Start at the minimum (96 cartons, 50 rolls), the quantity the demo script and README use.
  const [qty, setQty] = useState(minPerShop);
  const [shop, setShop] = useState("Your shop");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = useRef("");
  const nameId = useId();

  const now = tierAt(round.tiers, units).price;
  const alone = round.tiers[0].price;
  const next = round.tiers.find((t) => t.min > units);
  const reserve = reserveCents(round, units, qty); // goods + delivery
  const delivery = deliveryCents(round, qty);

  async function createOrder() {
    setError("");
    try {
      const q = await api<{ token: string }>(`/api/rounds/${round.id}/quote`, { shop, qty });
      token.current = q.token;
      return await api<{ orderId: string }>(`/api/rounds/${round.id}/orders`, { token: q.token });
    } catch (e) {
      setError(`${errorText(e)}. Nothing was reserved.`);
      throw e;
    }
  }

  async function onApprove({ orderId }: OnApproveDataOneTimePayments) {
    setBusy(true);
    try {
      const { commitment } = await api<{ commitment: Commitment }>(`/api/rounds/${round.id}/orders/${orderId}/authorize`, { token: token.current });
      onJoined(commitment);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 400 && /expired/i.test(e.message)
          ? "Your price quote expired after 15 minutes, so nothing was reserved. Use the PayPal button again for a fresh quote."
          : `${errorText(e)}. Nothing was reserved; try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="join-title" className="grid gap-4 rounded-lg bg-white p-6 shadow-lift max-[900px]:p-5">
      <h2 id="join-title" className="font-display text-lg font-bold tracking-[-0.01em]">Join this round</h2>
      <p className="font-display text-[34px] leading-none font-[750] tracking-[-0.03em] tabular-nums">
        {formatUSD(now)}
        <span className="font-sans text-[15px] font-normal tracking-normal text-muted"> / {unit.one} now{now < alone && ` · ${formatUSD(alone)} alone`}</span>
      </p>
      {next && (
        <p className="-mt-2 text-sm text-muted tabular-nums">
          {(next.min - units).toLocaleString("en-US")} more {next.min - units === 1 ? unit.one : unit.many} across the group drops it to {formatUSD(next.price)}.
        </p>
      )}

      <label htmlFor={nameId} className="grid gap-1.5 text-sm">
        Shop name
        <input
          id={nameId}
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          autoComplete="organization"
          className="rounded-field border border-field bg-white px-3.5 py-[11px] text-base font-medium text-ink outline-none focus:border-berry focus:shadow-[0_0_0_3px_rgba(224,20,111,0.18)]"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={capitalise(unit.many)} className="inline-flex items-center rounded-pill shadow-[inset_0_0_0_1px_var(--color-rule)]">
          <button type="button" aria-label={`Fewer ${unit.many}`} disabled={qty <= minPerShop} onClick={() => setQty((q) => Math.max(minPerShop, q - step))} className={STEPPER}>
            −
          </button>
          <output aria-live="polite" className="min-w-[110px] text-center font-display text-[17px] font-bold tabular-nums">
            {unitLabel(round, qty)}
          </output>
          <button type="button" aria-label={`More ${unit.many}`} onClick={() => setQty((q) => q + step)} className={STEPPER}>
            +
          </button>
        </div>
        <span className="text-sm text-muted">Minimum {unitLabel(round, minPerShop)} per delivery, in packs of {step}</span>
      </div>

      <p className="border-t border-rule pt-3 text-sm text-muted">
        We&apos;ll reserve <b className="text-ink tabular-nums">{formatUSD(reserve)}</b> on PayPal (goods {formatUSD(reserve - delivery)} + delivery {formatUSD(delivery)}). You&apos;ll pay the group price when the round closes, never more. If it doesn&apos;t reach its first tier, nothing is charged.
      </p>

      {error && (
        <p role="alert" className="text-[13px] text-jam">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted">
          Reserving on PayPal…
        </p>
      )}

      {CLIENT_ID ? (
        <PayPalProvider clientId={CLIENT_ID} environment="sandbox" components={["paypal-payments"]} pageType="checkout">
          <PayPalOneTimePaymentButton
            commit={false} // PayPal says "Continue", not "Complete Purchase": Shoal only reserves the money here
            createOrder={createOrder}
            onApprove={onApprove}
            onCancel={() => setError("PayPal was closed before you approved. Nothing was reserved.")}
            onError={(e) => setError(`PayPal couldn't finish: ${e.message}. Nothing was reserved; try again.`)}
            disabled={busy}
          />
        </PayPalProvider>
      ) : (
        <p className="text-[13px] text-jam">PayPal isn&apos;t configured: set NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local.</p>
      )}
      {CLIENT_ID && BUYER.email && BUYER.password && (
        <p className="text-xs text-muted">
          PayPal sandbox buyer (test money only): <code className="font-semibold text-ink">{BUYER.email}</code> / <code className="font-semibold text-ink">{BUYER.password}</code>
        </p>
      )}
    </section>
  );
}

const STEPPER = "size-[42px] rounded-full bg-transparent text-xl font-semibold text-ink hover:bg-tint disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent";
