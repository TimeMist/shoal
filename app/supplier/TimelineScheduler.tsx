"use client";

import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/stockholm-light.css";
import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import { StringHelper } from "@bryntum/scheduler";
import { useMemo } from "react";
import { formatUSD } from "@/lib/money";
import type { Commitment, RoundState } from "@/lib/store";

const DAY = 24 * 60 * 60 * 1000;
const ROW = 46, HEAD = 44;

type Lane = { id: string; name: string; kind: "round" | "supplier" | "shop" };
type Bar = { id: string; resourceId: string; name: string; startDate: Date; endDate: Date; cls: string };

// The round runs on a planned week: 3 days open, then confirm, ship, deliver and settle a day apart.
function plan(s: RoundState) {
  const close = new Date(s.round.closesAt).setHours(0, 0, 0, 0); // snap to the day grid
  const at = (d: number) => new Date(close + d * DAY);
  return { start: at(-3), end: at(4), at };
}

function shopBars(c: Commitment, at: (d: number) => Date): Bar[] {
  const bar = (key: string, from: number, to: number, cls: string, name: string): Bar => ({ id: `${c.id}-${key}`, resourceId: c.id, name, startDate: at(from), endDate: at(to), cls });
  const out: Bar[] = [];
  if (c.status === "released") return [bar("res", -3, 0, "shoal-released", "Released")];
  out.push(bar("res", -3, 0, "shoal-shop", c.captured === undefined ? `Reserved ${formatUSD(c.reserved)}` : `Captured ${formatUSD(c.captured)}`));
  if (!c.tracking) return out;
  const moved = c.status !== "captured"; // delivered, or a claim or resolution follows the shipment
  out.push(bar("ship", 1, moved ? 2 : 3, "shoal-ship", moved ? "Shipped" : "Out for delivery"));
  if (c.status === "claim") out.push(bar("claim", 2, 4, "shoal-claim", "Claim open"));
  else if (c.status === "resolved") out.push(bar("done", 2, 4, "shoal-ok", "Resolved"));
  else if (c.status === "delivered") out.push(bar("done", 2, 3, "shoal-ok", "Delivered"));
  return out;
}

/** Bryntum Scheduler, read-only, in the Shoal theme: one lane for the round, one for the supplier, one per shop. */
export default function TimelineScheduler({ state }: { state: RoundState }) {
  const { round, commitments } = state;
  const { start, end } = plan(state);

  const resources = useMemo<Lane[]>(
    () => [
      { id: "round", name: "Round", kind: "round" },
      { id: "supplier", name: round.supplier, kind: "supplier" },
      ...commitments.map((c) => ({ id: c.id, name: c.shop, kind: "shop" as const })),
    ],
    [commitments, round.supplier],
  );

  const events = useMemo<Bar[]>(() => {
    const { round, commitments, payouts } = state;
    const { at } = plan(state);
    const units = commitments.reduce((n, c) => n + c.qty, 0);
    const n = commitments.length;
    const roundName =
      round.status === "open" ? `Round open · ${n} ${n === 1 ? "shop" : "shops"} joining` : round.status === "closed" ? `Closed · ${units.toLocaleString("en-US")} cartons` : "Ended · first tier not reached";
    const bars: Bar[] = [{ id: "round-open", resourceId: "round", name: roundName, startDate: at(-3), endDate: at(0), cls: "shoal-round" }];
    if (round.status === "closed" && round.finalPrice !== undefined) {
      bars.push({ id: "sup-confirm", resourceId: "supplier", name: `At ${formatUSD(round.finalPrice)}`, startDate: at(0), endDate: at(1), cls: "shoal-supplier" });
    }
    const ship = payouts.find((p) => p.kind === "ship");
    if (ship) bars.push({ id: "sup-ship", resourceId: "supplier", name: `Paid ${formatUSD(ship.cents)}`, startDate: at(1), endDate: at(3), cls: "shoal-supplier" });
    const held = payouts.find((p) => p.kind === "holdback");
    if (held) bars.push({ id: "sup-held", resourceId: "supplier", name: formatUSD(held.cents), startDate: at(3), endDate: at(4), cls: "shoal-supplier" });
    return [...bars, ...commitments.flatMap((c) => shopBars(c, at))];
  }, [state]);

  return (
    // DESIGN.md: data views scroll sideways inside their own container rather than squeezing.
    <div className="shoal-timeline overflow-x-auto" tabIndex={0} aria-label="Round timeline, scrolls sideways on small screens">
      <div className="min-w-[760px]" style={{ height: HEAD + ROW * resources.length + 2 }}>
        <BryntumScheduler
          readOnly
          forceFit
          startDate={start}
          endDate={end}
          rowHeight={ROW}
          barMargin={9}
          eventStyle="filled"
          eventColor={null}
          viewPreset={{ base: "dayAndWeek", headers: [{ unit: "day", dateFormat: "ddd D" }] }}
          columns={[
            {
              text: "Lane",
              field: "name",
              width: 180,
              htmlEncode: false,
              // Coral marks a shop, Plum the supplier, Jam the round (DESIGN.md colour roles).
              renderer: ({ record }: { record: { getData: (f: string) => string } }) =>
                `<span class="shoal-lane shoal-lane-${record.getData("kind")}"><i aria-hidden="true"></i>${StringHelper.encodeHtml(record.getData("name"))}</span>`,
            },
          ]}
          resources={resources}
          events={events}
          eventRenderer={({ eventRecord }: { eventRecord: { name: string } }) => StringHelper.encodeHtml(eventRecord.name)}
          eventDragFeature={false}
          eventDragCreateFeature={false}
          eventResizeFeature={false}
          eventEditFeature={false}
          eventMenuFeature={false}
          scheduleMenuFeature={false}
          cellMenuFeature={false}
          headerMenuFeature={false}
          cellEditFeature={false}
          sortFeature={false}
          eventTooltipFeature={false}
          scheduleTooltipFeature={false}
          zoomOnMouseWheel={false}
          zoomOnTimeAxisDoubleClick={false}
        />
      </div>
    </div>
  );
}
