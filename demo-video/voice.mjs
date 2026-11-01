// voiceover.json with {paid} {retail} {pct} filled from the take's receipt (recordings/markers.json),
// so the voice and subtitles match the screen.
import fs from 'node:fs';

export const cents = (s) => Math.round(parseFloat(String(s).replace(/[$,]/g, '')) * 100);
export const usd = (c) => (c % 100 ? `$${(c / 100).toFixed(2)}` : `$${c / 100}`);

export function numbers() {
  const n = fs.existsSync('recordings/markers.json') ? JSON.parse(fs.readFileSync('recordings/markers.json', 'utf8')).numbers : null;
  if (!n) return null;
  return {
    paid: usd(cents(n.reserved) - cents(n.neverTaken)), // spoken: "$65"
    paidExact: `$${((cents(n.reserved) - cents(n.neverTaken)) / 100).toFixed(2)}`, // on the card: "$65.00"
    alone: usd(cents(n.alone)),
    retail: n.retail,
    pct: String(Math.round((cents(n.saved) / cents(n.alone)) * 100)),
  };
}

export function voiceover() {
  const fill = numbers() || {};
  return JSON.parse(fs.readFileSync('voiceover.json', 'utf8')).map((b) => ({
    ...b,
    text: b.text.replace(/\{(\w+)\}/g, (_, k) => {
      if (!fill[k]) throw new Error(`No value for {${k}} in ${b.id}: record first`);
      return fill[k];
    }),
  }));
}
