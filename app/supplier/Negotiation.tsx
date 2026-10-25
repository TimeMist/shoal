"use client";

import { useEffect, useState } from "react";
import LiveRegion from "@/components/LiveRegion";
import Swimmy, { useReducedMotion, type AgentState } from "@/components/Swimmy";
import { formatUSD } from "@/lib/money";
import { tierAt } from "@/lib/round";
import type { NegotiationTurn, RoundState } from "@/lib/store";

const PROVIDER = { claude: "Claude", gemini: "Gemini" } as const;
const STEP_MS = 1200;

/** How the transcript ended, in words. Only a deal that survived the server's re-check counts. */
export function outcome(s: RoundState): { text: string; deal: boolean } | null {
  const last = s.negotiation.at(-1);
  if (!last) return null;
  if (s.agreedPrice !== undefined) return { text: `Agreed at ${formatUSD(s.agreedPrice)} a carton, inside ${s.round.supplier}'s rules. It applies when the round closes.`, deal: true };
  if (last.move === "accept" && last.verdict === "ok") return { text: "Deal dropped: the tier changed", deal: false };
  if (last.move === "walk_away") return { text: `${last.side === "shop" ? "The Shoal agent" : s.round.supplier} walked away. The tier price stands.`, deal: false };
  return { text: `No deal in ${s.negotiation.length} turns. The tier price stands.`, deal: false };
}

type Props = {
  state: RoundState;
  /** The models are working (request in flight). */
  pending: boolean;
  /** Replay the transcript turn by turn (set for a fresh negotiation; remount via key to replay again). */
  animate: boolean;
};

/** Two agents and the group price between them; every offer passes the supplier's rules in code. */
export default function Negotiation({ state, pending, animate }: Props) {
  const { round, commitments, negotiation: turns } = state;
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(animate ? 0 : turns.length);
  const visible = reduce ? turns.length : Math.min(shown, turns.length);
  const replaying = visible < turns.length;

  useEffect(() => {
    if (!replaying) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 400 : STEP_MS);
    return () => clearTimeout(t);
  }, [replaying, shown]);

  const units = commitments.reduce((n, c) => n + c.qty, 0);
  const tier = tierAt(round.tiers, units);
  const next = round.tiers.find((t) => t.min > units);
  const seen = turns.slice(0, visible);
  const lastPrice = seen.findLast((t) => t.verdict === "ok" && t.price > 0)?.price;
  const end = replaying || pending ? null : outcome(state);
  const price = end?.deal && state.agreedPrice !== undefined ? state.agreedPrice : (lastPrice ?? round.finalPrice ?? tier.price);
  const speaking = replaying ? turns[visible].side : null;
  const mood = (side: NegotiationTurn["side"]): AgentState => (pending || speaking === side ? "thinking" : end?.deal ? "happy" : "idle");
  const provider = (side: NegotiationTurn["side"]) => turns.find((t) => t.side === side)?.provider;

  return (
    <div className="@container">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-stretch gap-4 @max-[760px]:grid-cols-1">
        <Party
          name="Shoal agent"
          sub={`For ${commitments.length} ${commitments.length === 1 ? "shop" : "shops"} · ${units.toLocaleString("en-US")} cartons`}
          provider={provider("shop")}
          tint="bg-live-tint"
          lines={seen.filter((t) => t.side === "shop")}
          fish={<Swimmy size={52} state={mood("shop")} />}
        />
        <div className="flex flex-col justify-center gap-2.5 rounded-lg bg-blush p-[18px] text-center">
          <span className="text-[13px] text-muted">{end?.deal ? "Agreed price per carton" : "Group price per carton"}</span>
          <span className="font-display text-[44px] leading-none font-[750] tracking-[-0.035em] tabular-nums">{formatUSD(price)}</span>
          <span className="text-[13px] text-muted tabular-nums">
            Supplier floor {formatUSD(round.floor)}
            {next ? ` · next tier ${next.min.toLocaleString("en-US")}` : " · top tier reached"}
          </span>
          <span className="self-center rounded-pill bg-settled-tint px-3 py-1.5 text-xs font-semibold text-leaf-ink">Every offer checked against supplier rules</span>
          {pending && <p className="text-sm text-muted">The agents are negotiating…</p>}
          {!pending && !turns.length && <p className="text-sm text-muted">No negotiation yet. The round closes at the tier price unless the agents agree a lower one.</p>}
          {end && <p className={`text-sm font-semibold ${end.deal ? "text-ink" : "text-jam"}`}>{end.text}</p>}
        </div>
        <Party
          name={round.supplier}
          sub={`Tiers ${round.tiers.slice(1).map((t) => t.min.toLocaleString("en-US")).join(" / ")} · min ${round.minPerShop} per drop`}
          provider={provider("supplier")}
          tint="bg-[#EFE7F8]"
          lines={seen.filter((t) => t.side === "supplier")}
          // The supplier is a one-colour Plum Swimmy, mirrored to face the Shoal agent (DESIGN.md: Swimmy).
          fish={<span className="block -scale-x-100"><Swimmy size={52} mono="#5A1E8C" state={mood("supplier")} /></span>}
        />
      </div>
      <LiveRegion message={end?.text ?? (pending ? "The agents are negotiating." : "")} />
    </div>
  );
}

const MOVE = { propose: "Offers", accept: "Accepts", walk_away: "Walks away", none: "No move" } as const;

type PartyProps = { name: string; sub: string; provider?: NegotiationTurn["provider"]; tint: string; lines: NegotiationTurn[]; fish: React.ReactNode };

function Party({ name, sub, provider, tint, lines, fish }: PartyProps) {
  return (
    <section aria-label={name} className="flex flex-col gap-2.5 rounded-lg bg-blush p-[18px]">
      <header className="flex items-center gap-2.5">
        <span className="flex-none">{fish}</span>
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-x-2 font-display text-base font-bold tracking-[-0.01em]">
            {name}
            {provider && <span className="rounded-pill bg-tint px-2 py-0.5 font-sans text-xs font-semibold text-muted">{PROVIDER[provider]}</span>}
          </h3>
          <p className="text-xs text-muted tabular-nums">{sub}</p>
        </div>
      </header>
      <ol className="flex flex-col gap-1.5 text-[13px]">
        {lines.map((t, i) => (
          <li key={i} className={`nego-line grid gap-1 rounded-field px-2.5 py-2 ${tint}`}>
            <span className="font-semibold tabular-nums">
              {MOVE[t.move]}
              {t.price > 0 && t.move !== "walk_away" ? ` ${formatUSD(t.price)}` : ""}
            </span>
            <span>{t.message}</span>
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
