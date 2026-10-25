import { formatUSD } from "@/lib/money";
import { tierAt, type Tier } from "@/lib/round";
import LiveRegion from "./LiveRegion";

type Props = { tiers: Tier[]; units: number; /** Agreed price in cents, once the round closes. */ agreed?: number };

const RUNG = "flex items-baseline justify-between gap-2 rounded-rung px-3 py-2.5 text-[13px] transition-[background-color,color,transform] duration-400 ease-pop max-[900px]:flex-[1_1_40%]";
const PRICE = "font-display text-xl font-[750] tracking-[-0.02em] tabular-nums";

/** Price per tier; the current tier is Jam, passed tiers struck through, and an Agreed rung appears at close. */
export default function TierLadder({ tiers, units, agreed }: Props) {
  const idx = tiers.indexOf(tierAt(tiers, units));
  // Tiers only step down, so any tier past the first is a drop.
  const message = agreed != null ? `Agreed at ${formatUSD(agreed)} a carton.` : idx > 0 ? `Price dropped to ${formatUSD(tiers[idx].price)} a carton.` : "";
  return (
    <div className="flex flex-col gap-1.5 max-[900px]:flex-row max-[900px]:flex-wrap">
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
