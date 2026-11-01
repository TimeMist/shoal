import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {loadFont as loadDisplay} from '@remotion/google-fonts/FunnelDisplay';
import {loadFont as loadSans} from '@remotion/google-fonts/FunnelSans';
import plan from '../public/plan.json';

export const INTRO = 3;
export const OUTRO = 4;

const display = loadDisplay('normal', {weights: ['700', '800'], subsets: ['latin']}).fontFamily;
const sans = loadSans('normal', {weights: ['500', '600'], subsets: ['latin']}).fontFamily;

// Shoal's palette (app/globals.css).
const INK = '#1F0A24';
const BERRY = '#E0146F';
const BLUSH = '#FFF7F6';
const ON_JAM = '#F6D9E3';

// The 1440×900 recording, framed at 1536×960 with a subtitle band below it.
const FRAME = {left: 192, top: 20, width: 1536, height: 960};

type Beat = (typeof plan.beats)[number];

const Fade = ({children, frames}: {children: React.ReactNode; frames: number}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 12, frames - 12, frames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

const Card = ({title, lines, frames}: {title: React.ReactNode; lines: string[]; frames: number}) => (
  <Fade frames={frames}>
    <AbsoluteFill style={{background: INK, color: BLUSH, alignItems: 'center', justifyContent: 'center', gap: 28}}>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 120, lineHeight: 1.02, letterSpacing: '-0.03em', color: BERRY, textAlign: 'center'}}>{title}</div>
      {lines.map((l) => (
        <div key={l} style={{fontFamily: sans, fontWeight: 500, fontSize: 44, color: ON_JAM}}>{l}</div>
      ))}
    </AbsoluteFill>
  </Fade>
);

type Stats = {pct: string; alone: string; paidExact: string};

// The impact beat: this take's saving as a percentage, big, with the dollars underneath.
const StatCard = ({stats}: {stats: Stats}) => {
  const f = useCurrentFrame();
  const rise = interpolate(f, [0, 18], [24, 0], {extrapolateRight: 'clamp'});
  const opacity = interpolate(f, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 18, color: BLUSH, opacity, transform: `translateY(${rise}px)`}}>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 220, lineHeight: 1, letterSpacing: '-0.04em', color: BERRY}}>{stats.pct}%</div>
      <div style={{fontFamily: display, fontWeight: 700, fontSize: 64, letterSpacing: '-0.02em'}}>saved per shop</div>
      <div style={{fontFamily: sans, fontWeight: 500, fontSize: 40, color: ON_JAM, marginTop: 12}}>
        {stats.alone} alone → {stats.paidExact} together
      </div>
    </AbsoluteFill>
  );
};

const Footage = ({beat}: {beat: Beat}) => {
  const {fps} = useVideoConfig();
  let at = 0;
  return (
    <>
      {beat.shots.map((s, i) => {
        const from = Math.round((at / beat.rate) * fps);
        at += s.len;
        const len = Math.round((at / beat.rate) * fps) - from;
        if (len <= 0) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            <OffthreadVideo
              src={staticFile(s.file)}
              trimBefore={Math.round(s.from * fps)}
              playbackRate={beat.rate}
              muted
              style={{width: '100%', height: '100%', objectFit: 'contain', background: '#fff'}}
            />
            {/* Covers the Next.js dev-mode badge in the bottom-left of app shots. */}
            {s.app && <div style={{position: 'absolute', left: 0, bottom: 0, width: 90, height: 90, background: '#FEF6F4'}} />}
          </Sequence>
        );
      })}
      {(() => {
        const end = Math.round((at / beat.rate) * fps);
        const hold = Math.round(beat.seconds * fps) - end;
        const last = beat.shots.at(-1);
        if (hold <= 0 || !last) return null;
        return (
          <Sequence from={end} durationInFrames={hold}>
            <Freeze frame={0}>
              <OffthreadVideo
                src={staticFile(last.file)}
                trimBefore={Math.max(0, Math.round((last.from + last.len) * fps) - 2)}
                muted
                style={{width: '100%', height: '100%', objectFit: 'contain', background: '#fff'}}
              />
              {last.app && <div style={{position: 'absolute', left: 0, bottom: 0, width: 90, height: 90, background: '#FEF6F4'}} />}
            </Freeze>
          </Sequence>
        );
      })()}
    </>
  );
};

const Subtitles = ({beat}: {beat: Beat}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const sub = beat.subs.find((s) => t >= s.start && t < s.end);
  if (!sub) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top: FRAME.top + FRAME.height, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 120px',
        fontFamily: sans, fontWeight: 600, fontSize: 38, lineHeight: 1.15, color: BLUSH, textAlign: 'center',
      }}
    >
      {sub.text}
    </div>
  );
};

export const Demo = () => {
  const {fps} = useVideoConfig();
  let at = INTRO * fps;
  return (
    <AbsoluteFill style={{background: INK}}>
      <Sequence durationInFrames={INTRO * fps}>
        <Card title="shoal" lines={['Independent shops, buying together.']} frames={INTRO * fps} />
      </Sequence>
      {plan.beats.map((b) => {
        const from = at;
        const frames = Math.round(b.seconds * fps);
        at += frames;
        return (
          <Sequence key={b.id} from={from} durationInFrames={frames} name={b.id}>
            {'card' in b && b.card ? (
              <div style={{position: 'absolute', ...FRAME}}>
                <StatCard stats={b.card as Stats} />
              </div>
            ) : (
              <div style={{position: 'absolute', ...FRAME, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.45)'}}>
                <Footage beat={b} />
              </div>
            )}
            <Subtitles beat={b} />
            <Audio src={staticFile(b.vo)} />
          </Sequence>
        );
      })}
      <Sequence from={at} durationInFrames={OUTRO * fps}>
        <Card
          title={
            // The landing page's own headline.
            <>
              <span style={{color: BLUSH}}>Buy like a chain.</span>
              <br />
              Stay independent.
            </>
          }
          lines={[
            'AI negotiates the price. PayPal moves the money. No one pays more than they reserved.',
            'Built with PayPal Orders · Payments · Payouts · Invoicing',
          ]}
          frames={OUTRO * fps}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
