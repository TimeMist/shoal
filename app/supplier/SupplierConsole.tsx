"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LiveRegion from "@/components/LiveRegion";
import StatusChip from "@/components/StatusChip";
import { formatUSD } from "@/lib/money";
import { capitalise, tierAt, unitLabel } from "@/lib/round";
import type { Claim, RoundState } from "@/lib/store";
import { RESET_EVENT } from "../DemoBar";
import { api, errorText, retailFor, retailSource, streamNegotiation, type Retail } from "../rounds/[id]/api";
import { KIND_WORD } from "../rounds/[id]/ClaimForm";
import AllocationGrid, { exportPurchaseOrder, type GridHandle } from "./AllocationGrid";
import Negotiation, { type Live } from "./Negotiation";
import Timeline from "./Timeline";
import { DEAL, GHOST, GHOST_SM, PRIMARY, SPINNER } from "./ui";

const DEMO_SHOPS = 8; // lib/seed.ts DEMO_SHOPS

type Step = { key: string; label: string; busyLabel: string; why?: string; note?: string; primary?: boolean; run?: () => Promise<void> };

export default function SupplierConsole({ id, initial }: { id: string; initial: RoundState }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [live, setLive] = useState<Live | null>(null); // turns streamed by the negotiation in flight
  const [said, setSaid] = useState("");
  const grid = useRef<GridHandle>(null);
  const [retail, setRetail] = useState<Retail>();
  const [retailBusy, setRetailBusy] = useState(true); // the first GET starts on mount
  const loadRetail = useCallback(
    (refresh: boolean) => {
      setRetailBusy(true);
      const fail = (reason?: string) => (prev?: Retail) => ({ benchmark: prev?.benchmark ?? null, reason });
      return retailFor(id, refresh ? "refresh" : "fetch")
        // A failed refresh keeps the benchmark already shown and adds why.
        .then((r) => setRetail(r.benchmark ? r : fail(r.reason)), (e) => setRetail(fail(errorText(e))))
        .finally(() => setRetailBusy(false));
    },
    [id],
  );
  useEffect(() => {
    loadRetail(false);
  }, [loadRetail]);
  const gen = useRef(0); // bumped on demo reset; results of requests started before it are dropped

  const { round, commitments, claims, payouts } = state;
  const refresh = useCallback(async () => {
    const g = gen.current;
    try {
      const s = await api<RoundState>(`/api/rounds/${id}`);
      if (g === gen.current) setState(s);
    } catch {} // a missed poll is retried on the next tick
  }, [id]);
  useEffect(() => {
    const onReset = () => (gen.current++, setLive(null), setErrors({}), setSaid(""), refresh());
    addEventListener(RESET_EVENT, onReset);
    return () => removeEventListener(RESET_EVENT, onReset);
  }, [refresh]);

  const shipped = payouts.some((p) => p.kind === "ship");
  const settled = payouts.some((p) => p.kind === "holdback");
  // Shops join and claims arrive from the shop page, so keep watching until the round is settled.
  const every = round.status === "open" ? 3000 : round.status === "closed" && !settled ? 5000 : 0;
  useEffect(() => {
    if (!every || busy) return;
    // shortcut: polling; SSE if the demo needs instant updates.
    const t = setInterval(refresh, every);
    return () => clearInterval(t);
  }, [every, busy, refresh]);

  async function act(key: string, fn: () => Promise<RoundState>, done?: (s: RoundState) => string) {
    setBusy(key);
    setErrors((x) => ({ ...x, [key]: "" }));
    const g = gen.current;
    try {
      const s = await fn();
      if (g !== gen.current) return;
      setState(s);
      if (done) setSaid(done(s));
    } catch (e) {
      if (g === gen.current) setErrors((x) => ({ ...x, [key]: errorText(e) }));
    } finally {
      setBusy(null);
    }
  }
  const post = (path: string, body: unknown = {}) => () => api<RoundState>(`/api/rounds/${id}/${path}`, body);

  const units = commitments.reduce((n, c) => n + c.qty, 0);
  const open = round.status === "open" && !state.closing;
  const tier = tierAt(round.tiers, units);
  const first = round.tiers[1]?.min ?? 0;
  const remaining = DEMO_SHOPS - commitments.filter((c) => c.simulated).length;
  const pendingClaims = new Set([...claims.filter((k) => k.status === "open").map((k) => k.commitmentId), ...commitments.filter((c) => c.status === "claim").map((c) => c.id)]).size;
  const awaiting = claims.filter((k) => k.status === "open");
  const sold = commitments.filter((c) => c.captured !== undefined);
  const deliverable = sold.filter((c) => c.status === "captured" && c.tracking).length;
  // Not yet invoiced, or an invoice whose last step (payment or refund record) failed.
  const toInvoice = sold.filter((c) => !c.simulated && (!c.invoiceStatus || c.invoiceError));
  const failedInvoices = toInvoice.filter((c) => c.invoiceError).length;
  const outForDelivery = commitments.filter((c) => c.status === "captured").length; // lib/fulfil.ts releaseRound gate
  const notOpen = round.status === "closed" ? "The round is closed" : round.status === "failed" ? "The round ended without reaching a tier" : "The round is closing";

  const steps: Step[] = [
    {
      key: "simulate",
      label: remaining > 0 ? `Simulate ${remaining} ${remaining === 1 ? "shop" : "shops"}` : "Simulate shops",
      busyLabel: "Adding shops",
      why: !open ? notOpen : remaining <= 0 ? `All ${DEMO_SHOPS} demo shops have joined` : undefined,
      run: () => act("simulate", post("simulate", { count: remaining }), (s) => `${s.commitments.length} shops in the round.`),
    },
    {
      key: "negotiate",
      label: state.negotiation.length ? "Negotiate again" : "Negotiate",
      busyLabel: "Negotiating",
      why: !open ? notOpen : !commitments.length ? "No shops have joined yet" : undefined,
      note: open && commitments.length ? `Agents negotiate below the ${formatUSD(tier.price)} tier price, never under the ${formatUSD(round.floor)} floor.` : undefined,
      run: () => {
        setLive(null);
        const g = gen.current;
        return act("negotiate", () =>
          streamNegotiation(id, (e) => {
            if (g !== gen.current) return;
            if (e.type === "start") setLive({ turns: [], providers: e.providers, maxTurns: e.maxTurns });
            if (e.type === "turn") setLive((l) => l && { ...l, turns: [...l.turns, e.turn] });
          }),
        );
      },
    },
    {
      key: "close",
      label: "Close round",
      busyLabel: "Closing round",
      primary: true,
      why: !open ? notOpen : !commitments.length ? "No shops have joined yet" : undefined,
      note: open && commitments.length && units < first ? `Below ${unitLabel(round, first)} the round fails and every reservation is released.` : undefined,
      run: () =>
        act("close", post("close"), (s) =>
          s.round.status === "closed" ? `Round closed at ${formatUSD(s.round.finalPrice ?? 0)} a ${round.unit.one}.` : "Round didn't reach its first tier. Every reservation was released.",
        ),
    },
    {
      key: "invoices",
      label: "Issue invoices",
      busyLabel: "Issuing invoices",
      why:
        round.status !== "closed"
          ? "Close the round first"
          : !toInvoice.length
            ? sold.some((c) => !c.simulated) ? "Every real shop has a PayPal invoice" : "No real shops to invoice; demo shops get none"
            : undefined,
      note: toInvoice.length
        ? failedInvoices
          ? `${failedInvoices} ${failedInvoices === 1 ? "invoice has" : "invoices have"} an error; see the Invoice column. Retrying skips finished invoices.`
          : `${toInvoice.length} ${toInvoice.length === 1 ? "shop" : "shops"} still to invoice in ${round.supplier}'s name.`
        : undefined,
      run: () => {
        let r = { issued: 0, failed: 0 };
        return act(
          "invoices",
          async () => {
            const res = await api<{ issued: number; failed: number; state: RoundState }>(`/api/rounds/${id}/invoices`, {});
            r = res;
            return res.state;
          },
          () => `${r.issued} ${r.issued === 1 ? "invoice" : "invoices"} issued${r.failed ? `, ${r.failed} failed` : ""}.`,
        );
      },
    },
    {
      key: "ship",
      label: "Mark shipped",
      busyLabel: "Sending payout",
      primary: true,
      why: round.status === "failed" ? "The round ended without reaching a tier" : round.status !== "closed" ? "Close the round first" : shipped ? "Shipped. What happened:" : !sold.length ? "Nothing was captured" : undefined,
      note: round.status === "closed" && !shipped ? `Pays ${100 - round.holdbackPct}% of what was captured now and holds ${round.holdbackPct}% for claims.` : undefined,
      run: () => act("ship", post("ship"), (s) => {
        const p = s.payouts.find((x) => x.kind === "ship");
        return p?.batchId ? `Shipped. ${formatUSD(p.paypalCents)} paid to ${round.supplier} by PayPal Payout.` : "Shipped. Only demo shops, so no PayPal Payout.";
      }),
    },
    {
      key: "deliver",
      label: "Mark all delivered",
      busyLabel: "Marking delivered",
      why: !shipped ? "Ship first" : !deliverable ? "Every order has arrived or has a claim" : undefined,
      note: shipped && deliverable ? `Or one shop at a time in the allocation grid. ${deliverable} still out for delivery.` : undefined,
      run: () =>
        act("deliver", async () => {
          let s = state;
          // One request per shop through the same route the grid uses; stops at the first error.
          for (const c of commitments.filter((x) => x.status === "captured" && x.tracking)) s = await post("deliver", { commitmentId: c.id })();
          return s;
        }, () => "Every shipped order is marked delivered."),
    },
    {
      key: "claims",
      label: "Approve or reject claims",
      busyLabel: "",
      why: !awaiting.length ? (claims.length ? "No claims waiting" : "No claims filed") : undefined,
      note: awaiting.length ? `${awaiting.length} ${awaiting.length === 1 ? "claim" : "claims"} awaiting your decision, below.` : undefined,
    },
    {
      key: "release",
      label: "Release holdback",
      busyLabel: "Releasing holdback",
      primary: true,
      why: !shipped
        ? "Ship first"
        : settled
          ? "Holdback released"
          : pendingClaims
            ? `${pendingClaims} open ${pendingClaims === 1 ? "claim" : "claims"} to resolve first`
            : outForDelivery
              ? `${outForDelivery} ${outForDelivery === 1 ? "shop" : "shops"} still out for delivery`
              : state.holdbackLeft <= 0
                ? "Nothing left to release"
                : undefined,
      note: shipped && !settled ? `${formatUSD(state.holdbackLeft)} held for claims.` : undefined,
      run: () => act("release", post("release"), (s) => `Holdback released: ${formatUSD(s.payouts.find((p) => p.kind === "holdback")?.cents ?? 0)}.`),
    },
  ];

  async function decide(claim: Claim, decision: "approve" | "reject") {
    const key = `claim-${claim.id}`;
    await act(key, async () => (await api<{ refunded: number; state: RoundState }>(`/api/rounds/${id}/claims/${claim.id}`, { decision })).state, (s) => {
      const c = s.commitments.find((x) => x.id === claim.commitmentId);
      return decision === "approve" ? `Claim approved for ${c?.shop}.` : `Claim rejected for ${c?.shop}.`;
    });
  }

  const onDeliver = useCallback(
    (c: { id: string; shop: string }) => {
      setBusy(c.id);
      setErrors((x) => ({ ...x, deliver: "" }));
      const g = gen.current;
      api<RoundState>(`/api/rounds/${id}/deliver`, { commitmentId: c.id })
        .then((s) => g === gen.current && (setState(s), setSaid(`${c.shop} marked delivered.`)))
        .catch((e) => g === gen.current && setErrors((x) => ({ ...x, deliver: `Couldn't mark ${c.shop} delivered: ${errorText(e)}` })))
        .finally(() => setBusy(null));
    },
    [id],
  );

  const price = round.finalPrice ?? tier.price;
  const status = round.status === "open" ? <StatusChip status="open" /> : <span className="text-sm font-semibold">{round.status === "closed" ? "Round closed" : "Round ended"}</span>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6 max-[1100px]:grid-cols-[minmax(0,1fr)]">
      <div className="col-start-1 row-start-1 grid min-w-0 gap-6 max-[1100px]:row-start-2">
        <section aria-labelledby="console-title" className="grid gap-5 rounded-stage bg-white p-6 shadow-lift max-[900px]:rounded-xl max-[900px]:p-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 id="console-title" className="font-display text-[28px] leading-tight font-[750] tracking-[-0.03em] text-balance">
                {round.product}
              </h1>
              <p className="text-sm text-muted">{round.supplier} · supplier console</p>
            </div>
            {status}
          </header>
          <dl className="grid grid-cols-4 gap-x-5 gap-y-3 max-[700px]:grid-cols-2">
            <Stat term={`${capitalise(round.unit.many)} committed`} value={units.toLocaleString("en-US")} />
            <Stat term="Shops" value={String(commitments.length)} />
            <Stat term={round.finalPrice !== undefined ? "Final price" : "Tier price now"} value={formatUSD(price)} />
            <Stat term="Holdback held" value={formatUSD(state.holdbackLeft)} />
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-rule pt-3 text-sm">
            <p className="min-w-0 tabular-nums" aria-live="polite">
              <b>Retail benchmark</b>{" "}
              <span className="text-muted">
                {retailBusy
                  ? "Looking up retail prices on Channel3…"
                  : retail?.benchmark
                    ? `≈ ${formatUSD(retail.benchmark.perUnit)} a ${round.unit.one} ${retailSource(retail.benchmark)}${retail.reason ? `. ${retail.reason}.` : ""}`
                    : (retail?.reason ?? "No retail benchmark")}
              </span>
            </p>
            <button type="button" className={GHOST_SM} disabled={retailBusy} aria-busy={retailBusy || undefined} onClick={() => loadRetail(true)}>
              {retailBusy && <span aria-hidden="true" className={`${SPINNER} mr-1.5`} />}
              {retailBusy ? "Checking retail" : "Refresh retail"}
            </button>
          </div>
          <div className="grid gap-3">
            <h2 className="font-display text-lg font-bold tracking-[-0.01em]">Negotiating the tier</h2>
            <Negotiation state={state} pending={busy === "negotiate"} live={live} />
          </div>
        </section>

        <section aria-labelledby="timeline-title" className="grid gap-3">
          <h2 id="timeline-title" className="font-display text-lg font-bold tracking-[-0.01em]">Round timeline</h2>
          <p className="max-w-[70ch] text-sm text-muted">The planned week: three days open, then confirm, ship, deliver and settle. A problem on one shop&apos;s lane stays on that lane.</p>
          <Timeline state={state} />
        </section>
      </div>

      <aside aria-label="Round actions" className="col-start-2 row-start-1 grid gap-4 max-[1100px]:col-start-1 max-[1100px]:row-start-1">
        <section className="grid gap-3 rounded-lg bg-white p-6 shadow-lift max-[900px]:p-5">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em]">Run the round</h2>
          <ol className="grid gap-3">
            {steps.map((s, i) => (
              <li key={s.key} className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2.5 border-t border-rule pt-3 first:border-0 first:pt-0">
                <span className="pt-2 text-[13px] font-semibold text-muted tabular-nums">{i + 1}</span>
                <div className="grid justify-items-start gap-1.5">
                  {s.run ? (
                    <button
                      type="button"
                      className={s.primary ? PRIMARY : GHOST}
                      disabled={!!s.why || !!busy}
                      aria-busy={busy === s.key || undefined}
                      aria-describedby={`why-${s.key}`}
                      onClick={s.run}
                    >
                      {busy === s.key && <span aria-hidden="true" className={SPINNER} />}
                      {busy === s.key ? s.busyLabel : s.label}
                    </button>
                  ) : (
                    <p className="pt-1 text-[15px] font-semibold">{s.label}</p>
                  )}
                  <p id={`why-${s.key}`} className="text-[13px] text-muted">
                    {s.why ?? s.note}
                  </p>
                  {errors[s.key] && <p role="alert" className="text-[13px] text-jam">{errors[s.key]}</p>}
                  {s.key === "ship" && shipped && <ShipResult state={state} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {claims.length > 0 && (
          <section className="grid gap-3 rounded-lg bg-white p-6 shadow-lift max-[900px]:p-5">
            <h2 className="font-display text-lg font-bold tracking-[-0.01em]">Claims</h2>
            {claims.toReversed().map((k) => (
              <ClaimCard key={k.id} claim={k} state={state} busy={busy} error={errors[`claim-${k.id}`]} onDecide={decide} />
            ))}
          </section>
        )}

        <section className="grid gap-3 rounded-lg bg-white p-6 shadow-base max-[900px]:p-5">
          <h2 id="payouts-title" className="scroll-mt-6 font-display text-lg font-bold tracking-[-0.01em]">Payouts to {round.supplier}</h2>
          {payouts.length ? (
            <ul className="grid gap-2.5">
              {payouts.map((p) => (
                <li key={p.kind} className="flex items-baseline justify-between gap-3 border-t border-rule pt-2.5 first:border-0 first:pt-0">
                  <span className="grid min-w-0">
                    <span className="text-[15px]">{p.kind === "ship" ? "Shipment payout" : "Holdback release"}</span>
                    <span className="text-xs text-muted">
                      {p.batchId ? (
                        <>
                          {formatUSD(p.paypalCents)} by PayPal Payout, batch <code className="break-all">{p.batchId}</code>
                        </>
                      ) : (
                        "No PayPal Payout: only demo shops"
                      )}
                      {p.batchId && p.cents > p.paypalCents && `. ${formatUSD(p.cents - p.paypalCents)} from demo shops is simulated.`}
                    </span>
                  </span>
                  <b className="font-display text-lg font-[750] text-leaf-ink tabular-nums">{formatUSD(p.cents)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No payouts yet. Shipping pays {100 - round.holdbackPct}% of what was captured; the rest is released after claims.</p>
          )}
        </section>
      </aside>

      <section aria-labelledby="alloc-title" className="col-span-2 row-start-2 grid min-w-0 gap-3 max-[1100px]:col-span-1 max-[1100px]:row-start-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="alloc-title" className="scroll-mt-6 font-display text-lg font-bold tracking-[-0.01em]">Allocation</h2>
          {round.status === "closed" && (
            <button
              type="button"
              className={GHOST}
              disabled={!!busy}
              onClick={() =>
                act("export", async () => {
                  const { rows } = await api<{ rows: { id: string; address?: string }[] }>(`/api/rounds/${id}/purchase-order`);
                  exportPurchaseOrder(grid.current, round, Object.fromEntries(rows.map((r) => [r.id, r.address])));
                  return state;
                })
              }
            >
              Export purchase order
            </button>
          )}
        </div>
        {errors.deliver && <p role="alert" className="text-sm text-jam">{errors.deliver}</p>}
        {errors.export && <p role="alert" className="text-sm text-jam">Couldn&apos;t export the purchase order: {errors.export}</p>}
        <AllocationGrid ref={grid} state={state} busyId={busy} disabled={!!busy} onDeliver={onDeliver} />
      </section>
      <LiveRegion message={said} />
    </div>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div className="border-t border-ink pt-2.5">
      <dt className="text-[13px] text-muted">{term}</dt>
      <dd className="font-display text-[22px] font-[750] tracking-[-0.02em] tabular-nums">{value}</dd>
    </div>
  );
}

type ClaimProps = { claim: Claim; state: RoundState; busy: string | null; error?: string; onDecide: (c: Claim, d: "approve" | "reject") => void };

/** One shop's problem: what it reported, the agent's check (written for the approver) and the decision. */
function ClaimCard({ claim, state, busy, error, onDecide }: ClaimProps) {
  const c = state.commitments.find((x) => x.id === claim.commitmentId);
  const p = claim.proposal;
  const key = `claim-${claim.id}`;
  const refund = p?.refund ?? 0;
  return (
    <article className="grid gap-2.5 border-t border-rule pt-3 first-of-type:border-0 first-of-type:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-bold tracking-[-0.01em]">
          {unitLabel(state.round, claim.units)} {KIND_WORD[claim.kind]}
        </h3>
        {claim.status !== "rejected" && <StatusChip status={claim.status === "open" ? "claim" : "resolved"} />}
      </div>
      <p className="inline-flex items-center gap-2 text-sm">
        <i aria-hidden="true" className="size-2.5 rounded-full bg-coral" />
        {c?.shop ?? "Unknown shop"}
        {claim.hasPhoto && <span className="text-muted">· photo attached</span>}
      </p>
      {claim.note && <p className="text-sm text-muted">&ldquo;{claim.note}&rdquo;</p>}
      {p && (
        <div className="grid gap-1.5 border-t border-rule pt-2.5 text-sm">
          <b>Agent check</b>
          <p>{p.reason}</p>
          <p className="text-muted tabular-nums">
            {refund > 0 ? `Refund ${formatUSD(refund)} to ${c?.shop}, paid from ${state.round.supplier}'s holdback; other shops unaffected.` : "No refund proposed."}
          </p>
        </div>
      )}
      {claim.status === "open" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={DEAL} disabled={!!busy} aria-busy={busy === key || undefined} onClick={() => onDecide(claim, "approve")}>
            {busy === key && <span aria-hidden="true" className={SPINNER} />}
            {refund > 0 ? `Approve ${formatUSD(refund)} refund` : "Approve, no refund"}
          </button>
          <button type="button" className={GHOST} disabled={!!busy} onClick={() => onDecide(claim, "reject")}>
            Reject
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted tabular-nums">
          {claim.status === "approved" ? (c && c.refunded > 0 ? `Approved. ${formatUSD(c.refunded)} refunded.` : "Approved, with no refund.") : "Rejected."}
        </p>
      )}
      {error && <p role="alert" className="text-[13px] text-jam">{error}</p>}
    </article>
  );
}

/** What "Mark shipped" did, in one place, with links to where each part lives on the page. */
function ShipResult({ state }: { state: RoundState }) {
  const p = state.payouts.find((x) => x.kind === "ship");
  if (!p) return null;
  const sent = state.commitments.filter((c) => c.tracking);
  const real = sent.filter((c) => !c.simulated).length;
  const held = state.commitments.reduce((n, c) => n + (c.captured ?? 0), 0) - p.cents;
  const link = "font-semibold text-jam underline underline-offset-2";
  return (
    <div className="grid w-full gap-1.5 rounded-field bg-blush px-3 py-2.5 text-[13px]">
      <p>
        <b className="tabular-nums">{sent.length}</b> {sent.length === 1 ? "order" : "orders"} out for delivery
        {real > 0 && `; tracking added to ${real === 1 ? "the real shop's" : `${real} real shops'`} PayPal ${real === 1 ? "order" : "orders"}`}.
      </p>
      <p className="tabular-nums">
        {p.batchId ? (
          <>
            <b>{formatUSD(p.paypalCents)}</b> paid to {state.round.supplier} by PayPal Payout
            {p.cents > p.paypalCents && <span className="text-muted"> (+{formatUSD(p.cents - p.paypalCents)} from demo shops, simulated)</span>}.
          </>
        ) : (
          <>
            <b>{formatUSD(p.cents)}</b> to {state.round.supplier}, simulated: only demo shops, so no PayPal Payout.
          </>
        )}
      </p>
      <p className="tabular-nums">
        <b>{formatUSD(held)}</b> held back for claims, released once every order is delivered.
      </p>
      <p className="flex flex-wrap gap-x-3">
        <a href="#payouts-title" className={link}>See payouts</a>
        <a href="#alloc-title" className={link}>See orders</a>
      </p>
    </div>
  );
}
