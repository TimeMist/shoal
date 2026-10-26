"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import LiveRegion from "@/components/LiveRegion";
import RoundPool from "@/components/RoundPool";
import StatusChip from "@/components/StatusChip";
import TierLadder from "@/components/TierLadder";
import { formatUSD } from "@/lib/money";
import { tierAt, unitLabel } from "@/lib/round";
import type { Commitment, RoundState } from "@/lib/store";
import { RESET_EVENT } from "../../DemoBar";
import { api } from "./api";
import { GHOST } from "../../ui";
import ClaimForm, { ClaimStatus } from "./ClaimForm";
import JoinPanel from "./JoinPanel";
import Receipt, { Panel } from "./Receipt";

// shortcut: no accounts; shop identity is per browser tab (sessionStorage), add auth if shops return across devices.
const KEY = (id: string) => `shoal:round:${id}`;
const MINE_EVENT = "shoal-mine";
function readMine(id: string): string | null {
  try {
    return sessionStorage.getItem(KEY(id));
  } catch {
    return null;
  }
}
function saveMine(id: string, commitmentId: string) {
  try {
    sessionStorage.setItem(KEY(id), commitmentId);
  } catch {}
  dispatchEvent(new Event(MINE_EVENT));
}
const onMine = (cb: () => void) => {
  addEventListener(MINE_EVENT, cb);
  return () => removeEventListener(MINE_EVENT, cb);
};

// Re-renders every 15 s on the client; null during the server render so times never mismatch on hydration.
const onTick = (cb: () => void) => {
  const t = setInterval(cb, 15_000);
  return () => clearInterval(t);
};
function useMinute(): number | null {
  return useSyncExternalStore(onTick, () => Math.floor(Date.now() / 60_000), () => null);
}

function countdown(closesAt: string, minute: number): string {
  const mins = Math.floor(new Date(closesAt).getTime() / 60_000) - minute;
  if (mins <= 0) return "Closing time reached";
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  return `Closes in ${d ? `${d}d ` : ""}${d || h ? `${h}h ` : ""}${m}m`;
}

export default function RoundScreen({ id, initial }: { id: string; initial: RoundState }) {
  const [state, setState] = useState(initial);
  const [joined, setJoined] = useState<string | null>(null); // fallback when sessionStorage is blocked
  const [reporting, setReporting] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const claimRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLHeadingElement>(null);
  const gen = useRef(0); // bumped on demo reset; polls started before it are dropped
  const stored = useSyncExternalStore(onMine, () => readMine(id), () => null);
  const minute = useMinute();

  const refresh = useCallback(async () => {
    const g = gen.current;
    try {
      const s = await api<RoundState>(`/api/rounds/${id}`);
      if (g === gen.current) setState(s);
    } catch {} // a missed poll is retried on the next tick
  }, [id]);
  useEffect(() => {
    const onReset = () => (gen.current++, setJoined(null), setJoinMsg(""), setReporting(false), refresh());
    addEventListener(RESET_EVENT, onReset);
    return () => removeEventListener(RESET_EVENT, onReset);
  }, [refresh]);

  const { round, commitments } = state;
  const mineId = joined ?? stored;
  const mine = commitments.find((c) => c.id === mineId);
  // R12: after close, keep watching while this shop's order can still ship, deliver or resolve a claim.
  const settled = state.payouts.some((p) => p.kind === "holdback");
  const watching = round.status === "closed" && !!mine && ["captured", "delivered", "claim"].includes(mine.status) && !settled;
  const every = round.status === "open" ? 3000 : watching ? 5000 : 0;
  useEffect(() => {
    if (!every) return;
    // shortcut: polling; SSE if the demo needs instant updates.
    const t = setInterval(refresh, every);
    return () => clearInterval(t);
  }, [every, refresh]);

  const units = commitments.reduce((n, c) => n + c.qty, 0);
  const myClaim = mine && state.claims.findLast((c) => c.commitmentId === mine.id);
  const price = round.finalPrice ?? tierAt(round.tiers, units).price;
  // Only a deal that set the final price earns the Agreed rung (a dropped deal leaves agreedPrice unset).
  const deal = round.status === "closed" && state.agreedPrice !== undefined && state.agreedPrice === round.finalPrice ? round.finalPrice : undefined;
  const canReport = !!mine && (mine.status === "delivered" || (mine.status === "captured" && !!mine.tracking)); // R13: claims only after shipping

  const outcome =
    round.status === "failed"
      ? mine ? "Round didn't reach its first tier. Your reservation was released." : "Round didn't reach its first tier. Nothing was charged."
      : round.status === "closed"
        ? `Round closed at ${formatUSD(price)} a ${round.unit.one}.${mine?.captured !== undefined ? ` You paid ${formatUSD(mine.captured)}.` : ""}`
        : joinMsg;

  function joinedWith(c: Commitment) {
    setJoined(c.id);
    saveMine(id, c.id);
    setState((s) => (s.commitments.some((x) => x.id === c.id) ? s : { ...s, commitments: [...s.commitments, c] }));
    setJoinMsg(`You're in. ${formatUSD(c.reserved)} reserved on PayPal, not charged.`);
    requestAnimationFrame(() => inRef.current?.focus()); // the join panel (and the PayPal button) just unmounted
    refresh();
  }

  async function filed() {
    await refresh();
    setReporting(false);
    requestAnimationFrame(() => claimRef.current?.focus());
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_420px] items-start gap-6 max-[1100px]:grid-cols-[minmax(0,1fr)]">
      <section aria-labelledby="round-title" className="grid gap-5 rounded-stage bg-white p-6 shadow-lift max-[900px]:rounded-xl max-[900px]:p-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 id="round-title" className="font-display text-[28px] leading-tight font-[750] tracking-[-0.03em] text-balance">
              {round.product}
            </h1>
            <p className="text-sm text-muted">{round.supplier} · buying round</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted tabular-nums">
            {round.status === "open" ? (
              <>
                <StatusChip status="open" />
                {minute !== null && <time dateTime={round.closesAt}>{countdown(round.closesAt, minute)}</time>}
              </>
            ) : (
              <span className="font-semibold text-ink">{round.status === "closed" ? "Round closed" : "Round ended"}</span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_190px] items-stretch gap-[18px] max-[900px]:grid-cols-[minmax(0,1fr)]">
          <RoundPool units={units} shops={commitments.map((c) => ({ name: c.shop, qty: c.qty }))} closed={round.status === "closed"} tiers={round.tiers} unit={round.unit} />
          <TierLadder tiers={round.tiers} units={units} unit={round.unit} agreed={deal} closed={round.status !== "open"} />
        </div>

        <div className="grid gap-2.5">
          <h2 className="font-display text-[15px] font-bold">
            {commitments.length ? `${commitments.length} ${commitments.length === 1 ? "shop" : "shops"} in this round` : "No shops yet"}
          </h2>
          {commitments.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {commitments.map((c) => (
                <li key={c.id} className={`rounded-pill px-2.5 py-[5px] text-[13px] tabular-nums ${c.id === mine?.id ? "bg-jam text-white" : "bg-shop-tint text-ink"}`}>
                  {c.shop}
                  {c.id === mine?.id && " (you)"} · {c.qty}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Be the first shop in. Every {round.unit.one} you commit brings the price down for everyone.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4">
        {round.status === "open" && !mine && <JoinPanel round={round} units={units} onJoined={joinedWith} />}

        {round.status === "open" && mine && (
          <Panel title={`${mine.shop}, you're in`} status={mine.status} titleRef={inRef}>
            <p className="font-display text-[34px] leading-none font-[750] tracking-[-0.03em] tabular-nums">{formatUSD(mine.reserved)}</p>
            <p className="text-sm text-muted">
              Reserved on PayPal for {unitLabel(round, mine.qty)}, not charged. You&apos;ll pay the group price when the round closes, never more. If it doesn&apos;t reach its first tier, nothing is charged.
            </p>
            {mine.qty * price < mine.reserved && (
              <p className="text-sm text-leaf-ink tabular-nums">At today&apos;s price of {formatUSD(price)} you&apos;d pay {formatUSD(mine.qty * price)}.</p>
            )}
          </Panel>
        )}

        {round.status === "failed" && (
          <Panel title={mine ? "Reservation released" : "Nothing charged"} status={mine?.status}>
            <p className="text-[15px]">{outcome}</p>
          </Panel>
        )}

        {round.status === "closed" && mine && <Receipt state={state} mine={mine} />}
        {round.status === "closed" && !mine && (
          <Panel title="Round summary">
            <p className="text-[15px] tabular-nums">
              {unitLabel(round, units)} from {commitments.length} shops at {formatUSD(price)} a {round.unit.one}. You didn&apos;t join this round.
            </p>
          </Panel>
        )}

        {mine && myClaim && !reporting && (
          <div ref={claimRef} tabIndex={-1} className="rounded-lg outline-offset-4">
            <Panel title="Your report" status={mine.status}>
              <ClaimStatus claim={myClaim} mine={mine} round={round} />
            </Panel>
          </div>
        )}

        {mine && canReport &&
          (reporting ? (
            <ClaimForm round={round} mine={mine} onFiled={filed} onCancel={() => setReporting(false)} />
          ) : (
            <div>
              <button type="button" onClick={() => setReporting(true)} className={GHOST}>
                Report a problem
              </button>
            </div>
          ))}
      </div>
      <LiveRegion message={outcome} />
    </div>
  );
}
