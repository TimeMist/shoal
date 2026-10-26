import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Wordmark from "@/components/Wordmark";
import { formatUSD } from "@/lib/money";
import { tierAt, unitLabel } from "@/lib/round";
import { DEMO_ROUND, ROUND_IDS, shopsFor } from "@/lib/seed";
import { publicState } from "@/lib/privacy";
import { getState, unitsCommitted } from "@/lib/store";
import HeroRound from "./HeroRound";
import { GHOST, PRIMARY } from "./ui";

const { tiers, product, supplier, unit } = DEMO_ROUND;
const DEMO_SHOPS = shopsFor("demo");
const units = DEMO_SHOPS.reduce((u, s) => u + s.qty, 0);
const alone = formatUSD(tiers[0].price), group = formatUSD(tierAt(tiers, units).price);

const STEPS = [
  {
    title: "Reserve, don't pay",
    body: "A shop picks a quantity and reserves the price showing on PayPal. Nothing is charged, and its price can only go down from there.",
  },
  {
    title: "The group price drops",
    body: `Every order counts toward the supplier's tiers. In the demo round, ${DEMO_SHOPS.length} shops commit ${units.toLocaleString("en-US")} cartons and oat milk drops from ${alone} to ${group}. An AI agent negotiates the tier with the supplier; code holds it to the supplier's floor.`,
  },
  {
    title: "Only the group price is charged",
    body: "When the round closes, PayPal captures each shop's share at the price the group reached, never more than it reserved. If the round misses its first tier, every reservation is released.",
  },
  {
    title: "One shop's problem stays one shop's",
    body: "Each shop has its own delivery, tracking and claim. A short or damaged delivery is refunded to that shop alone, from a holdback on the supplier's payout.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-8 py-6 max-[900px]:px-4">
      <header>
        <Wordmark />
      </header>

      <div className="grid min-h-[calc(100vh-140px)] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-10 pt-6 pb-12 max-[900px]:min-h-0 max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:pt-8">
        <div>
          <h1 className="mb-[22px] font-display text-[clamp(44px,5vw,80px)] leading-[0.95] font-[750] tracking-[-0.04em] text-balance">
            Buy like a chain. <span className="text-berry">Stay independent.</span>
          </h1>
          <p className="mb-7 max-w-[44ch] text-xl text-muted">
            Shoal lets independent shops buy together. The more shops join a buying round, the lower everyone&apos;s price. Money is reserved with PayPal, never taken until the round succeeds, and only the group price is charged.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/rounds/demo" className={`${PRIMARY} no-underline hover:text-white`}>
              Open the demo round
            </Link>
            <Link href="/supplier/demo" className={`${GHOST} no-underline hover:text-ink`}>
              Supplier view
            </Link>
          </div>
          <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading open rounds…</p>}>
            <OpenRounds />
          </Suspense>
        </div>
        <HeroRound product={product} supplier={supplier} unit={unit} tiers={tiers} shops={DEMO_SHOPS} />
      </div>

      <section aria-labelledby="how" className="border-t border-rule pt-[72px] pb-14 max-[900px]:pt-12">
        <h2 id="how" className="mb-8 font-display text-[clamp(34px,4vw,52px)] leading-none font-[750] tracking-[-0.03em]">
          How a round works
        </h2>
        <dl className="grid grid-cols-4 gap-5 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
          {STEPS.map((s) => (
            <div key={s.title} className="border-t-2 border-ink pt-4">
              <dt className="mb-2 font-display text-lg font-bold tracking-[-0.01em] text-balance">{s.title}</dt>
              <dd className="max-w-[70ch] text-[15px] text-muted">{s.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-rule py-6 text-[13px] text-muted">
        Built with PayPal (Orders, Payments, Payouts), Claude and Gemini agents, AG Grid, Bryntum and Render.
      </footer>
    </main>
  );
}

const LINK = "font-semibold text-ink underline underline-offset-2 hover:text-jam";

/** Both demo rounds as they stand right now, each with its shop page and supplier console. */
async function OpenRounds() {
  await connection(); // live in-memory state: render per request
  const rounds = ROUND_IDS.map((id) => publicState(getState(id)!));
  return (
    <section aria-labelledby="open-rounds" className="mt-10 max-w-[560px]">
      <h2 id="open-rounds" className="mb-3 font-display text-lg font-bold tracking-[-0.01em]">
        Open rounds
      </h2>
      <ul className="grid gap-3">
        {rounds.map((s) => {
          const { round } = s;
          const units = unitsCommitted(s);
          const price = round.finalPrice ?? tierAt(round.tiers, units).price;
          return (
            <li key={round.id} className="grid gap-1 border-t border-rule pt-3">
              <p className="font-display text-[17px] font-bold text-balance">{round.product}</p>
              <p className="text-sm text-muted tabular-nums">
                {round.supplier} · {unitLabel(round, units)} committed · {formatUSD(price)} a {round.unit.one}
                {round.status !== "open" && ` · ${round.status === "closed" ? "closed" : "ended"}`}
              </p>
              <p className="flex flex-wrap gap-x-4 text-sm">
                <Link href={`/rounds/${round.id}`} className={LINK}>
                  Join<span className="sr-only"> the {round.product} round</span>
                </Link>
                <Link href={`/supplier/${round.id}`} className={LINK}>
                  Supplier view<span className="sr-only"> for {round.product}</span>
                </Link>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
