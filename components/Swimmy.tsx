"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { DOTS, EYE, R, SLOT_R, SMALL_DOTS, SMALL_EYE, SMALL_R } from "@/lib/swimmy";

const INK = "#1F0A24";
const SLOT = "#E8C3CE";
const REDUCE = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(REDUCE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(REDUCE).matches,
    () => true, // server render is still; motion starts after hydration
  );
}

// Idle blink every 4 to 6 s (scaleY .08, 140 ms); never under reduced motion.
function useBlink(on: boolean): boolean {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!on) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => { setBlink(false); loop(); }, 140);
      }, 4000 + Math.random() * 2000);
    };
    loop();
    return () => clearTimeout(t);
  }, [on]);
  return on && blink;
}

export type AgentState = "idle" | "thinking" | "happy";

type FishProps = {
  /** Per dot: null = empty slot, a number = filled, flying in after that many ms. Omit for a static full mark. */
  delays?: (number | null)[];
  tone?: "light" | "dark";
  mono?: string;
  state?: AgentState;
  /** Pupil offset, for glancing at an arrival. */
  look?: [number, number];
  /** The round closed: pulse once, eye closes into a smile (CSS choreography). */
  closed?: boolean;
};

/** The fish as an SVG group on the 64-unit grid. The eye is the agent. */
export function Fish({ delays, tone = "light", mono, state = "idle", look = [0, 0], closed = false }: FishProps) {
  const reduce = useReducedMotion();
  const blink = useBlink(!reduce && state === "idle" && !closed);
  const cls = ["sw-agent", blink && "sw-blink", state === "thinking" && "sw-thinking", state === "happy" && "sw-smiling", closed && "sw-closed"]
    .filter(Boolean)
    .join(" ");
  return (
    <g className={cls}>
      <g className="sw-body">
        {DOTS.map((d, k) => {
          const delay = delays?.[k];
          if (delays && delay == null) return <circle key={k} className="sw-dot" cx={d.x} cy={d.y} r={SLOT_R} fill={SLOT} />;
          const style = delays
            ? ({ "--fx": `${16 + (k % 5) * 4}px`, "--fy": `${((k * 7) % 11) - 5}px`, animationDelay: `${delay}ms` } as CSSProperties)
            : undefined;
          return <circle key={k} className={delays ? "sw-dot sw-fly" : "sw-dot"} style={style} cx={d.x} cy={d.y} r={R} fill={mono ?? (tone === "dark" ? d.dark : d.c)} />;
        })}
        <g className="sw-eye">
          <circle cx={EYE.x} cy={EYE.y} r={EYE.r} fill="#fff" stroke={INK} strokeWidth={EYE.stroke} />
          <circle className="sw-pupil" style={{ transform: `translate(${look[0]}px, ${look[1]}px)` }} cx={EYE.x + 0.4} cy={EYE.y} r={EYE.pupil} fill={INK} />
        </g>
        <path className="sw-happy" d={`M${EYE.x - 3} ${EYE.y + 0.6} Q${EYE.x} ${EYE.y - 2.8} ${EYE.x + 3} ${EYE.y + 0.6}`} fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
      </g>
    </g>
  );
}

type SwimmyProps = Omit<FishProps, "delays" | "closed"> & {
  /** Rendered size in px. Below 48 the small mark (30 bigger dots) replaces the 61 dots. */
  size?: number;
  /** Accessible name; omit when decorative. */
  label?: string;
  className?: string;
};

/** The Shoal mark, alive: blinks at idle, tilts while thinking, smiles when happy. */
export default function Swimmy({ size = 56, label, className, ...fish }: SwimmyProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  if (size < 48) {
    const e = SMALL_EYE;
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className} {...a11y}>
        {SMALL_DOTS.map((d, k) => (
          <circle key={k} cx={d.x} cy={d.y} r={SMALL_R} fill={fish.mono ?? (fish.tone === "dark" ? d.dark : d.c)} />
        ))}
        <circle cx={e.x} cy={e.y} r={e.r} fill="#fff" stroke={INK} strokeWidth={e.stroke} />
        <circle cx={e.x + 0.6} cy={e.y} r={e.pupil} fill={INK} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={{ overflow: "visible" }} {...a11y}>
      <Fish {...fish} />
    </svg>
  );
}
