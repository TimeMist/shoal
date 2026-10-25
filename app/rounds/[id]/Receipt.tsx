import type { ReactNode, Ref } from "react";
import StatusChip from "@/components/StatusChip";
import { formatUSD } from "@/lib/money";
import { aloneCents, savingsCents } from "@/lib/round";
import type { Commitment, RoundState } from "@/lib/store";

/** The shop's receipt after a successful close: what was captured, what was never taken, what it saved. */
export default function Receipt({ state, mine }: { state: RoundState; mine: Commitment }) {
  const { round } = state;
  const price = round.finalPrice ?? 0;
  // Only call it a deal when the negotiated price is the one that was charged (a dropped deal leaves agreedPrice unset).
  const agreed = state.agreedPrice !== undefined && state.agreedPrice === price;

  if (mine.captured === undefined) {
    return (
      <Panel title="Your receipt" status={mine.status}>
        <p className="text-sm text-jam">
          Your payment couldn&apos;t be captured{mine.error ? `: ${mine.error}` : ""}. Nothing has been charged yet; {round.supplier} will follow up.
        </p>
      </Panel>
    );
  }

  // A claim or resolution hides whether the order had arrived; the claim remembers.
  const prior = state.claims.findLast((k) => k.commitmentId === mine.id)?.priorStatus;
  const delivered = mine.status === "delivered" || (mine.status !== "captured" && prior === "delivered");
  const delivery = delivered
    ? `Delivered${mine.tracking ? `, tracking ${mine.tracking}` : ""}.`
    : mine.tracking ? `Shipped with tracking ${mine.tracking}.` : `Waiting for ${round.supplier} to ship.`;

  return (
    <Panel title="Your receipt" status={mine.status}>
      <p className="font-display text-[40px] leading-none font-[750] tracking-[-0.035em] tabular-nums">{formatUSD(mine.captured)}</p>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
        <Def term="Reserved" value={formatUSD(mine.reserved)} />
        <Def term="Never taken" value={formatUSD(mine.reserved - mine.captured)} />
        <Def term="Alone you'd pay" value={formatUSD(aloneCents(round, mine.qty))} />
        <Def term="You saved" value={formatUSD(savingsCents(round, mine.qty, mine.captured))} leaf />
        {mine.refunded > 0 && <Def term="Refunded" value={formatUSD(mine.refunded)} leaf />}
      </dl>
      <p className="text-[13px] text-muted">
        {mine.qty} cartons at {agreed ? `the price agreed with ${round.supplier}` : "the group price"} of {formatUSD(price)}. {delivery}
      </p>
    </Panel>
  );
}

type PanelProps = { title: string; status?: Commitment["status"]; children: ReactNode; /** Focus target after an action; makes the heading focusable. */ titleRef?: Ref<HTMLHeadingElement> };

export function Panel({ title, status, children, titleRef }: PanelProps) {
  return (
    <section className="grid gap-3 rounded-lg bg-white p-6 shadow-lift max-[900px]:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <h2 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="font-display text-lg font-bold tracking-[-0.01em]">
          {title}
        </h2>
        {status && <StatusChip status={status} />}
      </div>
      {children}
    </section>
  );
}

function Def({ term, value, leaf }: { term: string; value: string; leaf?: boolean }) {
  return (
    <div className={`border-t border-ink pt-2.5 ${leaf ? "text-leaf-ink" : ""}`}>
      <dt className="font-display text-[15px] font-bold">{term}</dt>
      <dd className={`tabular-nums ${leaf ? "font-semibold" : "text-muted"}`}>{value}</dd>
    </div>
  );
}
