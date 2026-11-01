// Turns recordings/markers.json + public/vo/*.wav into public/plan.json for the Remotion composition:
// per beat, the shots to show (waits cut, popups spliced in), a playback rate that fits the footage
// to the voiceover, and timed subtitle chunks. Also transcodes the webm recordings to 30 fps mp4.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {numbers, voiceover} from './voice.mjs';

const FPS = 30;
const PAD = 0.8; // seconds of air after each beat's voiceover
const m = JSON.parse(fs.readFileSync('recordings/markers.json', 'utf8'));
const vo = voiceover();
const stats = numbers();
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

fs.mkdirSync('public/rec', {recursive: true});
const files = new Map();
function mp4(src) {
  if (!files.has(src)) {
    const out = `rec/${files.size}.mp4`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', `public/${out}`]);
    files.set(src, out);
  }
  return files.get(src);
}

// Sources, most specific first: a popup/invoice/PayPal clip wins over the main window while it is open.
const sources = [
  ...m.clips.filter((c) => c.file && c.end).map((c) => ({start: c.start, end: c.end, file: c.file, offset: c.offset ?? c.start})),
  {start: -Infinity, end: Infinity, file: m.main, offset: m.mainOffset ?? 0},
];

// shortcut: subtitles are timed by character count across the clip, not by forced alignment;
// good enough for short chunks of steady TTS, upgrade to whisper timestamps if they drift.
function subtitles(text, seconds) {
  const chunks = [];
  // Break after punctuation followed by a space, so "$1.13" stays whole.
  for (const sentence of text.split(/(?<=[.;:!?])\s+/).filter(Boolean)) {
    const words = sentence.split(' ');
    const n = Math.ceil(sentence.length / 70);
    const per = Math.ceil(words.length / n);
    for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(' '));
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  let t = 0;
  return chunks.map((c) => {
    const d = (c.length / total) * seconds;
    const s = {text: c, start: t, end: t + d};
    t += d;
    return s;
  });
}

const beats = vo.map((v) => {
  const voDur = dur(`public/vo/${v.id}.wav`);
  const seconds = voDur + PAD;
  // A card beat has no footage: the composition draws the stat card over the voice.
  if (v.card) return {id: v.id, vo: `vo/${v.id}.wav`, seconds, rate: 1, shots: [], card: stats, subs: subtitles(v.text, voDur)};
  const b = m.beats.find((x) => x.id === v.id);

  // Walk the beat's wall-clock range, dropping cuts and switching source at clip edges.
  const edges = new Set([b.start, b.end]);
  for (const x of [...m.cuts, ...sources]) for (const e of [x.start, x.end]) if (e > b.start && e < b.end) edges.add(e);
  const ts = [...edges].sort((a, z) => a - z);
  const shots = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const [s, e] = [ts[i], ts[i + 1]];
    if (e - s < 0.05 || m.cuts.some((c) => s >= c.start && e <= c.end)) continue;
    const src = sources.find((x) => s >= x.start && e <= x.end);
    const last = shots.at(-1);
    if (last && last.src === src.file && Math.abs(last.from + last.len - (s - src.offset)) < 0.05) last.len += e - s;
    else shots.push({src: src.file, from: s - src.offset, len: e - s});
  }
  const footage = shots.reduce((a, s) => a + s.len, 0);
  // Below 0.8× the motion looks sluggish: play at 0.8× and let the composition hold the last frame.
  const rate = Math.max(0.8, footage / seconds);
  if (rate > 2) console.warn(`${b.id}: ${footage.toFixed(1)}s footage for ${seconds.toFixed(1)}s of voice (rate ${rate.toFixed(2)})`);
  return {
    id: b.id,
    vo: `vo/${b.id}.wav`,
    seconds,
    rate,
    shots: shots.map((s) => ({file: mp4(s.src), from: Math.max(0, s.from), len: s.len, app: s.src === m.main})),
    subs: subtitles(v.text, voDur),
  };
});

fs.writeFileSync('public/plan.json', JSON.stringify({fps: FPS, beats}, null, 2));
console.log(beats.map((b) => `${b.id} ${b.seconds.toFixed(1)}s rate ${b.rate.toFixed(2)} shots ${b.shots.length}`).join('\n'));
console.log('total', beats.reduce((a, b) => a + b.seconds, 0).toFixed(1) + 's');
