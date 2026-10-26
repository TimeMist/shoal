import { formatUSD } from "@/lib/money";
import { tierAt, type Round, type Tier } from "@/lib/round";
import type { Benchmark } from "@/lib/benchmark";
import LiveRegion from "./LiveRegion";

type Props = {
  tiers: Tier[];
  units: number;
  unit: Round["unit"];
  /** Negotiated price in cents, only when the round closed on that deal. */
  agreed?: number;
  /** The round is over: stay quiet unless announcing a deal. */
  closed?: boolean;
  /** Channel3 retail price per unit: context above the ladder, never a rung. */
  retail?: Benchmark | null;
};


const RUNG = "flex items-baseline justify-between gap-2 rounded-rung px-3 py-2.5 text-[13px] transition-[background-color,color,transform] duration-400 ease-pop max-[900px]:flex-[1_1_40%]";
const PRICE = "font-display text-xl font-[750] tracking-[-0.02em] tabular-nums";

/** Price per tier; the current tier is Jam, passed tiers struck through, and an Agreed rung appears at close. */
export default function TierLadder({ tiers, units, unit, agreed, closed = false, retail }: Props) {
  const idx = tiers.indexOf(tierAt(tiers, units));
  // Tiers only step down, so any tier past the first is a drop.
  const message = agreed != null ? `Agreed at ${formatUSD(agreed)} a ${unit.one}.` : idx > 0 && !closed ? `Price dropped to ${formatUSD(tiers[idx].price)} a ${unit.one}.` : "";
  return (
    <div className="flex flex-col gap-1.5 max-[900px]:flex-row max-[900px]:flex-wrap">
      {retail && (
        <div className="grid gap-1 px-3 pb-1 text-[13px] text-muted max-[900px]:basis-full">
          <p className="tabular-nums">
            Retail elsewhere <span className="whitespace-nowrap">≈ {formatUSD(retail.perUnit)} a {unit.one}</span>
          </p>
          <details>
            <summary className="cursor-pointer font-semibold text-ink underline-offset-2 hover:underline">Sources</summary>
            <ul className="mt-1.5 grid gap-1.5">
              {retail.offers.map((o, i) => (
                <li key={i} className="tabular-nums">
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-2 hover:text-jam">
                    {o.merchant /* Channel3 names the merchant by its domain */}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <br />
                  {o.units.toLocaleString("en-US")} {o.units === 1 ? unit.one : unit.many} · {formatUSD(o.price)} a {unit.one}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
      <ol className="contents">
        {tiers.map((t, i) => {
          const on = i === idx && agreed == null;
          const state = on ? "scale-[1.02] bg-jam text-white" : "bg-blush text-muted";
          const done = i < idx ? "line-through decoration-muted/50" : "";
          return (
            <li key={t.min} className={`${RUNG} ${state} ${done}`} aria-current={on ? "step" : undefined}>
              <span>{t.min === 0 ? "Alone" : `${t.min.toLocaleString("en-US")}+`}</span>
              <b className={PRICE}>{formatUSD(t.price)}</b>
            </li>
          );
        })}
      </ol>
      {agreed != null && (
        <div className={`${RUNG} scale-[1.02] bg-berry text-white`}>
          <span>Agreed</span>
          <b className={PRICE}>{formatUSD(agreed)}</b>
        </div>
      )}
      <LiveRegion message={message} />
    </div>
  );
}
