"use client";

import { useEffect, useState } from "react";
import RoundPool from "@/components/RoundPool";
import StatusChip from "@/components/StatusChip";
import { useReducedMotion } from "@/components/Swimmy";
import TierLadder from "@/components/TierLadder";
import { formatUSD } from "@/lib/money";
import { tierAt, type Tier } from "@/lib/round";
import { GHOST_SM } from "./ui";

type Props = { product: string; supplier: string; tiers: Tier[]; shops: { shop: string; qty: number }[] };

// One shop every 650 ms, then the close beat; all client-side, nothing is written.
const START = 500, STEP = 650, CLOSE = 900;

/** The landing hero: the demo round's eight shops join, the price steps down, the fish completes. */
export default function HeroRound({ product, supplier, tiers, shops }: Props) {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [n, setN] = useState(0);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // Reduced motion: the completed fish, still.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => (setN(shops.length), setClosed(true)));
      return () => clearTimeout(t);
    }
    const ts = shops.map((_, i) => setTimeout(() => setN(i + 1), START + i * STEP));
    ts.push(setTimeout(() => setClosed(true), START + shops.length * STEP + CLOSE));
    return () => ts.forEach(clearTimeout);
  }, [run, shops]);

  function replay() {
    setN(0);
    setClosed(false);
    setRun((r) => r + 1);
  }

  const joined = shops.slice(0, n);
  const units = joined.reduce((u, s) => u + s.qty, 0);
  const price = tierAt(tiers, units).price;
  const last = joined.at(-1);
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
        {closed ? <span className="text-sm font-semibold">Round closed</span> : <StatusChip status="open" />}
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)_170px] items-stretch gap-4 max-[900px]:grid-cols-[minmax(0,1fr)]">
        <RoundPool units={units} shops={joined.map((s) => ({ name: s.shop, qty: s.qty }))} closed={closed} tiers={tiers} />
        <TierLadder tiers={tiers} units={units} closed={closed} />
      </div>
      <ul aria-label="Shops in this round" className="flex min-h-[100px] flex-wrap content-start gap-1.5 max-[900px]:min-h-[29px]">
        {joined.map((s) => (
          <li key={s.shop} className="nego-line rounded-pill bg-shop-tint px-2.5 py-[5px] text-[13px] tabular-nums">
            {s.shop} · {s.qty}
          </li>
        ))}
      </ul>
      <div className="flex min-h-[29px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted tabular-nums">{caption}</p>
        {closed && !reduce && (
          <button type="button" className={GHOST_SM} onClick={replay}>
            Replay
          </button>
        )}
      </div>
    </section>
  );
}
