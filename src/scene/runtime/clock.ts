/** Longest step one frame may advance, so a slow frame or a background tab can't blow up a simulation. */
export const MAX_STEP = 0.05;

/** Scene time in seconds. It only advances while frames run, so pausing stops it. */
export function createClock() {
  let time = 0;
  let last: number | null = null;
  return {
    get time() {
      return time;
    },
    /** Advances to `now` (milliseconds, from requestAnimationFrame) and returns the step in seconds. */
    tick(now: number): number {
      const step = last === null ? 0 : Math.min(Math.max(now - last, 0) / 1000, MAX_STEP);
      last = now;
      time += step;
      return step;
    },
    /** Forgets the last frame, so time doesn't jump over a pause. */
    hold() {
      last = null;
    },
  };
}
