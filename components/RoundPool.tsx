"use client";

import type { Tier } from "@/lib/round";
import { DOT_COUNT, dotsPerShop } from "@/lib/swimmy";
import { Fish } from "./Swimmy";
import LiveRegion from "./LiveRegion";

type Props = {
  units: number;
  shops: { name: string; qty: number }[];
  closed: boolean;
  /** The round's tiers; the top tier's min sets how much of the fish a shop fills. */
  tiers: Tier[];
};

// Fish placement inside the 260x210 pool, at 3.6x (as on the brand board).
const K = 3.6, TX = 15, TY = -6;

/** The signature pool: each shop fills its share of the Swimmy; the fish completes when the round closes. */
export default function RoundPool({ units, shops, closed, tiers }: Props) {
  const per = dotsPerShop(shops, units, tiers.at(-1)?.min ?? 0);
  // Each shop's dots fly in head to tail with a 25 ms stagger; at close the rest follow after 200 ms.
  const delays: (number | null)[] = per.flatMap((n) => Array.from({ length: n }, (_, j) => j * 25));
  const filled = delays.length;
  for (let k = filled; k < DOT_COUNT; k++) delays.push(closed ? 200 + (k - filled) * 25 : null);

  const last = shops.at(-1);
  const look: [number, number] = last && !closed ? [1.2, shops.length % 2 ? 0.6 : -0.6] : [0, 0];
  const message = closed
    ? `Round closed with ${units.toLocaleString("en-US")} cartons from ${shops.length} shops.`
    : last
      ? `${last.name} joined with ${last.qty} cartons. ${units.toLocaleString("en-US")} cartons committed.`
      : "";

  return (
    <div className="relative min-h-[230px] rounded-pool bg-pool max-[900px]:min-h-[300px]">
      <p className="absolute left-4 top-3 text-[13px] text-muted">
        <b className="block font-display text-[28px] leading-none font-[750] tracking-[-0.03em] text-ink tabular-nums">
          {units.toLocaleString("en-US")}
        </b>
        cartons committed
      </p>
      <svg viewBox="0 0 260 210" aria-hidden="true" className="absolute inset-0 block size-full">
        <circle className={closed ? "ripple on" : "ripple"} cx={TX + 32 * K} cy={TY + 32 * K} r={96} />
        <g transform={`translate(${TX} ${TY}) scale(${K})`}>
          <Fish delays={delays} look={look} closed={closed} />
        </g>
      </svg>
      <LiveRegion message={message} />
    </div>
  );
}
