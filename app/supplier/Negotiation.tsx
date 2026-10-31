"use client";

import LiveRegion from "@/components/LiveRegion";
import ModelLogo from "@/components/ModelLogo";
import Swimmy, { type AgentState } from "@/components/Swimmy";
import { policyFloor } from "@/lib/guard";
import { formatUSD } from "@/lib/money";
import { tierAt, unitLabel } from "@/lib/round";
import type { NegotiationTurn, RoundState } from "@/lib/store";

const PROVIDER = { claude: "Claude", gemini: "Gemini" } as const;

/** How the transcript ended, in words. Only a deal that survived the server's re-check counts. */
export function outcome(s: RoundState): { text: string; deal: boolean } | null {
  const last = s.negotiation.at(-1);
  if (!last) return null;
  if (s.agreedPrice !== undefined) return { text: `Agreed at ${formatUSD(s.agreedPrice)} a ${s.round.unit.one}, inside ${s.round.supplier}'s rules. It applies when the round closes.`, deal: true };
  if (last.move === "accept" && last.verdict === "ok") return { text: "Deal dropped: the tier changed", deal: false };
  if (last.move === "walk_away") return { text: `${last.side === "shop" ? "The Shoal agent" : s.round.supplier} walked away. The tier price stands.`, deal: false };
  return { text: `No deal in ${s.negotiation.length} turns. The tier price stands.`, deal: false };
}

export type Live = { turns: NegotiationTurn[]; providers: Record<NegotiationTurn["side"], NegotiationTurn["provider"]>; maxTurns: number };

type Props = {
  state: RoundState;
  /** The models are working (request in flight). */
  pending: boolean;
  /** Turns streamed so far while `pending`; null until the stream starts. */
  live: Live | null;
};

const SIDE_NAME = { shop: "The Shoal agent", supplier: "The supplier's agent" } as const;

/** Two agents and the group price between them; every offer passes the supplier's rules in code. */
export default function Negotiation({ state, pending, live }: Props) {
  const { round, commitments } = state;
  const turns = pending ? (live?.turns ?? []) : state.negotiation;
  const units = commitments.reduce((n, c) => n + c.qty, 0);
  const tier = tierAt(round.tiers, units);
  const next = round.tiers.find((t) => t.min > units);
  const lastPrice = turns.findLast((t) => t.verdict === "ok" && t.price > 0)?.price;
  const end = pending ? null : outcome(state);
  const standing = round.finalPrice ?? tier.price;
  // While negotiating, follow the offers; once it ends, show the deal or the price that actually stands.
  const price = !end ? (lastPrice ?? standing) : end.deal && state.agreedPrice !== undefined ? state.agreedPrice : standing;
  const max = live?.maxTurns ?? turns.length;
  const speaking: NegotiationTurn["side"] | null = pending ? (turns.length % 2 === 0 ? "shop" : "supplier") : null;
  const mood = (side: NegotiationTurn["side"]): AgentState => (speaking === side ? "thinking" : end?.deal ? "happy" : "idle");
  const provider = (side: NegotiationTurn["side"]) => (pending ? live?.providers[side] : undefined) ?? turns.find((t) => t.side === side)?.provider;
  const numbered = turns.map((t, i) => ({ ...t, n: i + 1 }));
  const progress = speaking
    ? `Turn ${Math.min(turns.length + 1, max || 1)} of ${max || "…"} · ${SIDE_NAME[speaking]}${provider(speaking) ? ` (${PROVIDER[provider(speaking)!]})` : ""} is thinking…`
    : "";

  return (
    <div className="@container">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-stretch gap-4 @max-[760px]:grid-cols-1">
        <Party
          name="Shoal agent"
          sub={`For ${commitments.length} ${commitments.length === 1 ? "shop" : "shops"} · ${unitLabel(round, units)}`}
          provider={provider("shop")}
          tint="bg-live-tint"
          lines={numbered.filter((t) => t.side === "shop")}
          fish={<Swimmy size={52} state={mood("shop")} />}
        />
        <div className="flex flex-col justify-center gap-2.5 rounded-lg bg-blush p-[18px] text-center">
          <span className="text-[13px] text-muted">{end?.deal ? "Agreed" : speaking && lastPrice ? "Last offer" : "Group"} price per {round.unit.one}</span>
          <span className="font-display text-[44px] leading-none font-[750] tracking-[-0.035em] tabular-nums">{formatUSD(price)}</span>
          <span className="text-[13px] text-muted tabular-nums">
            Policy floor {formatUSD(policyFloor(round, units))}
            {next ? ` · next tier ${next.min.toLocaleString("en-US")}` : " · top tier reached"}
          </span>
          <span className="self-center rounded-pill bg-settled-tint px-3 py-1.5 text-xs font-semibold text-leaf-ink">Every offer checked against supplier rules</span>
          {pending && (
            <div className="grid gap-2">
              <ol aria-hidden="true" className="flex justify-center gap-1">
                {Array.from({ length: max || 8 }, (_, i) => {
                  const t = turns[i];
                  const colour = t ? (t.verdict === "ok" ? (t.side === "shop" ? "bg-jam" : "bg-plum") : "bg-claim-tint") : i === turns.length ? "nego-now bg-slot" : "bg-slot";
                  return <li key={i} className={`h-1.5 w-6 rounded-pill ${colour}`} />;
                })}
              </ol>
              <p className="text-sm text-muted tabular-nums">{live ? progress : "Starting the agents…"}</p>
            </div>
          )}
          {!pending && !turns.length && <p className="text-sm text-muted">No negotiation yet. The round closes at the tier price unless the agents agree a lower one.</p>}
          {end && <p className={`text-sm font-semibold ${end.deal ? "text-ink" : "text-jam"}`}>{end.text}</p>}
        </div>
        <Party
          name={round.supplier}
          sub={`Tiers ${round.tiers.slice(1).map((t) => t.min.toLocaleString("en-US")).join(" / ")} · Min ${round.minPerShop} per drop · Delivery ${formatUSD(round.delivery.perDrop)}/drop +\u00a0${formatUSD(round.delivery.perUnit)}/${round.unit.one}`}
          provider={provider("supplier")}
          tint="bg-[#EFE7F8]"
          lines={numbered.filter((t) => t.side === "supplier")}
          // The supplier is a one-colour Plum Swimmy, mirrored to face the Shoal agent (DESIGN.md: Swimmy).
          fish={<span className="block -scale-x-100"><Swimmy size={52} mono="#5A1E8C" state={mood("supplier")} /></span>}
        />
      </div>
      {/* Announce each new turn and the end, not every re-render. */}
      <LiveRegion message={end?.text ?? (pending ? (turns.at(-1) ? `Turn ${turns.length}: ${SIDE_NAME[turns.at(-1)!.side]} ${MOVE[turns.at(-1)!.move].toLowerCase()}${turns.at(-1)!.price ? ` ${formatUSD(turns.at(-1)!.price)}` : ""}.` : "The agents are negotiating.") : "")} />
    </div>
  );
}

const MOVE = { propose: "Offers", accept: "Accepts", walk_away: "Walks away", none: "No move" } as const;

type PartyProps = { name: string; sub: string; provider?: NegotiationTurn["provider"]; tint: string; lines: (NegotiationTurn & { n: number })[]; fish: React.ReactNode };

function Party({ name, sub, provider, tint, lines, fish }: PartyProps) {
  return (
    <section aria-label={name} className="flex flex-col gap-2.5 rounded-lg bg-blush p-[18px]">
      <header className="flex items-center gap-2.5">
        <span className="flex-none">{fish}</span>
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-x-2 font-display text-base font-bold tracking-[-0.01em]">
            {name}
            {provider && <ModelLogo provider={provider} />}
          </h3>
          <p className="text-xs text-muted tabular-nums">
            {sub.split(" · ").map((part) => (
              <span key={part} className="block">{part}</span>
            ))}
          </p>
        </div>
      </header>
      <ol className="flex flex-col gap-1.5 text-[13px]">
        {lines.map((t) => (
          <li key={t.n} className={`nego-line grid gap-1 rounded-field px-2.5 py-2 ${tint}`}>
            <span className="font-semibold tabular-nums">
              {/* Numbered by position in the whole transcript, so the two cards read in order. */}
              {t.n} · {MOVE[t.move]}
              {t.price > 0 && t.move !== "walk_away" ? ` ${formatUSD(t.price)}` : ""}
            </span>
            <span>{t.message}</span>
            {t.note && <span className="text-xs text-muted">{t.note}</span>}
            {t.verdict === "rejected" && (
              <span className="rounded-xs bg-white px-2 py-1 text-jam shadow-[inset_0_0_0_1px_var(--color-jam)]">
                Blocked by the rules: {t.reason}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
