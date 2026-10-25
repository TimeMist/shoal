"use client";

import dynamic from "next/dynamic";
import type { RoundState } from "@/lib/store";

// Bryntum renders in the browser only.
const TimelineScheduler = dynamic(() => import("./TimelineScheduler"), {
  ssr: false,
  loading: () => <p className="rounded-lg bg-white p-4 text-sm text-muted shadow-base">Loading the timeline…</p>,
});

/** The round timeline; a thin seam so the renderer can be swapped. */
export default function Timeline({ state }: { state: RoundState }) {
  return <TimelineScheduler state={state} />;
}
