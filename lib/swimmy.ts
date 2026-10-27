// The Swimmy: 61 dots (shops) on a hex lattice that together make one fish; the eye is the agent.
// Ported from the brand generator (design/brand/logo) on a 64-unit grid.

type RGB = [number, number, number];
const LIGHT: RGB[] = [[244, 93, 79], [224, 20, 111], [90, 30, 140]]; // coral, berry, plum
const DARK: RGB[] = [[255, 138, 122], [255, 111, 168], [201, 160, 232]]; // on-dark coral, pink, lilac

const hex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
function ramp(t: number, stops: RGB[]): string {
  t = Math.min(1, Math.max(0, t));
  const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const [a, b] = t < 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  return hex(a.map((v, i) => v + (b[i] - v) * k));
}

export const R = 1.75; // filled dot radius
export const SLOT_R = 1.05; // empty dot radius in the pool
export const EYE = { x: 14, y: 30, r: 3.6, pupil: 1.9, stroke: 1.1 };
export const RAMP = LIGHT.map(hex);
export const RAMP_DARK = DARK.map(hex);

const inside = (x: number, y: number) => {
  const body = ((x - 25) / 19) ** 2 + ((y - 32) / (x < 25 ? 13 : 15)) ** 2 <= 1;
  const tail = x >= 40 && x <= 58 && Math.abs(y - 32) <= 3 + (x - 40) * 0.72 && Math.abs(y - 32) >= (x - 50) * 0.9;
  return body || tail;
};

export type Dot = { x: number; y: number; c: string; dark: string };
const dots: Dot[] = [];
for (let row = 0; row < 14; row++)
  for (let col = 0; col < 14; col++) {
    const x = 6 + col * 4.4 + (row % 2 ? 2.2 : 0), y = 14 + row * 3.8;
    if (inside(x, y) && Math.hypot(x - EYE.x, y - EYE.y) > 4.6)
      dots.push({ x: +x.toFixed(2), y: +y.toFixed(2), c: ramp((x - 6) / 52, LIGHT), dark: ramp((x - 6) / 52, DARK) });
  }
// The small mark (under 48px): the same fish from 30 bigger dots on a coarser lattice, so it stays a shoal at 16px.
export const SMALL_R = 2.45;
export const SMALL_EYE = { x: 14, y: 32, r: 4.6, pupil: 2.4, stroke: 1.3 };
export const SMALL_DOTS: readonly Dot[] = [];
for (let k = -4; k <= 4; k++)
  for (let col = 0; col < 10; col++) {
    const x = 6 + col * 6 + (k % 2 ? 3 : 0), y = 32 + k * 5.196;
    if (inside(x, y) && Math.hypot(x - SMALL_EYE.x, y - SMALL_EYE.y) > SMALL_EYE.r + SMALL_R * 0.9)
      (SMALL_DOTS as Dot[]).push({ x, y: +y.toFixed(2), c: ramp((x - 6) / 52, LIGHT), dark: ramp((x - 6) / 52, DARK) });
  }

/** Ordered head to tail, so the fish builds forward as shops join. */
export const DOTS: readonly Dot[] = dots.sort((a, b) => a.x - b.x || a.y - b.y);
export const DOT_COUNT = DOTS.length;

/**
 * Dots each shop fills, in join order: round(qty / max(units, topTierMin) × 61), at least 1,
 * never more than 61 in total (later shops get what is left).
 */
export function dotsPerShop(shops: { qty: number }[], units: number, topTierMin: number): number[] {
  const scale = Math.max(units, topTierMin, 1);
  let left = DOT_COUNT;
  return shops.map((s) => {
    const n = Math.min(left, Math.max(1, Math.round((s.qty / scale) * DOT_COUNT)));
    left -= n;
    return n;
  });
}
