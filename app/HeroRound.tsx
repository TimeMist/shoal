"use client";

import { useEffect, useRef, useState } from "react";
import RoundPool from "@/components/RoundPool";
import StatusChip from "@/components/StatusChip";
import { useReducedMotion } from "@/components/Swimmy";
import TierLadder from "@/components/TierLadder";
import { formatUSD } from "@/lib/money";
import { tierAt, type Round, type Tier } from "@/lib/round";
import { GHOST_SM } from "./ui";

type Props = { product: string; supplier: string; unit: Round["unit"]; tiers: Tier[]; shops: { shop: string; qty: number }[] };

// One shop a second, slow enough to watch each price drop, then the close beat. The play runs past 5 s,
// so Skip stops it (WCAG 2.2.2). All client-side, nothing is written.
const START = 400, STEP = 1000, CLOSE = 900;

/** The landing hero: the demo round's eight shops join, the price steps down, the fish completes. */
export default function HeroRound({ product, supplier, unit, tiers, shops }: Props) {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [n, setN] = useState(0);
  const [closed, setClosed] = useState(false);
  const skipped = useRef(false);

  useEffect(() => {
    // Reduced motion: the completed fish, still.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || skipped.current) {
      skipped.current = false;
      const t = setTimeout(() => (setN(shops.length), setClosed(true)));
      return () => clearTimeout(t);
    }
    const ts = shops.map((_, i) => setTimeout(() => setN(i + 1), START + i * STEP));
    ts.push(setTimeout(() => setClosed(true), START + (shops.length - 1) * STEP + CLOSE));
    return () => ts.forEach(clearTimeout);
  }, [run, shops]);

  function skip() {
    skipped.current = true;
    setRun((r) => r + 1); // cancels the pending timers
    setN(shops.length);
    setClosed(true);
  }

  function replay() {
    setN(0);
    setClosed(false);
    setRun((r) => r + 1);
  }

  const joined = shops.slice(0, n);
  const units = joined.reduce((u, s) => u + s.qty, 0);
  const price = tierAt(tiers, units).price;
  const last = joined.at(-1);
  const total = shops.reduce((u, s) => u + s.qty, 0);
  const summary = `Demo round: ${shops.length} shops commit ${total.toLocaleString("en-US")} cartons and the price drops from ${formatUSD(tiers[0].price)} to ${formatUSD(tierAt(tiers, total).price)} a carton.`;
  const caption = closed
    ? `Round closed at ${formatUSD(price)} a carton, down from ${formatUSD(tiers[0].price)} alone. Each shop pays only that.`
    : last
      ? `${last.shop} joined with ${last.qty} cartons. ${n} ${n === 1 ? "shop" : "shops"} in, ${formatUSD(price)} a carton.`
      : "Waiting for the first shop.";

  return (
    <section aria-label="A demo buying round" className="grid gap-4 rounded-stage bg-white p-6 shadow-lift max-[900px]:rounded-xl max-[900px]:p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-[17px] font-bold">{product}</p>
          <p className="text-[13px] text-muted">Round by {supplier} · demo</p>
        </div>
        <div className="flex items-center gap-3">
          {!closed && !reduce && (
            <button type="button" className={GHOST_SM} onClick={skip}>
              Skip
            </button>
          )}
          {closed && !reduce && (
            <button type="button" className={GHOST_SM} onClick={replay}>
              Replay
            </button>
          )}
          {closed ? <span className="text-sm font-semibold">Round closed</span> : <StatusChip status="open" />}
        </div>
      </header>
      {/* The pool and ladder announce every step; on an auto-playing hero that floods screen readers, so they read the summary instead. */}
      <p className="sr-only">{summary}</p>
      <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_170px] items-stretch gap-4 max-[900px]:grid-cols-[minmax(0,1fr)]">
        <RoundPool units={units} shops={joined.map((s) => ({ name: s.shop, qty: s.qty }))} closed={closed} tiers={tiers} unit={unit} />
        <TierLadder tiers={tiers} units={units} unit={unit} closed={closed} />
      </div>
      <ul aria-label="Shops in this round" className="flex min-h-[108px] flex-wrap content-start gap-1.5 max-[900px]:min-h-[29px]">
        {joined.map((s) => (
          <li key={s.shop} className="nego-line rounded-pill bg-shop-tint px-2.5 py-[5px] text-[13px] tabular-nums">
            {s.shop} · {s.qty}
          </li>
        ))}
      </ul>
      <p aria-hidden="true" className="text-sm text-muted tabular-nums">{caption}</p>
    </section>
  );
}
