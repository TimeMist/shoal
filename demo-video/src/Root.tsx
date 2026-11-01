import {Composition} from 'remotion';
import {Demo, INTRO, OUTRO} from './Demo';
import plan from '../public/plan.json';

export const Root = () => {
  const seconds = INTRO + OUTRO + plan.beats.reduce((a, b) => a + b.seconds, 0);
  return (
    <Composition
      id="Demo"
      component={Demo}
      durationInFrames={Math.ceil(seconds * plan.fps)}
      fps={plan.fps}
      width={1920}
      height={1080}
    />
  );
};
