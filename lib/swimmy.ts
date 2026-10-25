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
// Solid silhouette for marks under 48px, with its larger eye.
export const SOLID = "M6.2 31 Q8 19 25 19 Q38 19 43.5 26 L57 16.5 Q58.6 15.6 58.2 17.4 L54.4 32 L58.2 46.6 Q58.6 48.4 57 47.5 L43.5 38 Q38 47 25 47 Q8 47 6.2 33 Z";
export const SOLID_EYE = { x: 16, y: 31, r: 6.2, pupil: 3.3, stroke: 1.6 };
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
