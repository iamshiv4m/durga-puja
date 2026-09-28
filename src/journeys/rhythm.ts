/**
 * Calls `play` for every step of a grid `step` seconds long that starts in [from, to), with the
 * step's index counted from the audio clock's zero, so patterns stay in time across calls.
 */
export function steps(from: number, to: number, step: number, play: (time: number, index: number) => void) {
  for (let i = Math.ceil(from / step - 1e-9); i * step < to; i++) play(i * step, i);
}

/** Reads a pattern such as "B.t.B.tt" at `index`, wrapping round. */
export function at(pattern: string, index: number) {
  return pattern[((index % pattern.length) + pattern.length) % pattern.length];
}

/** True once as the scroll passes `point` going forward. */
export function crossed(previous: number, p: number, point: number) {
  return previous < point && p >= point && p - point < 0.03;
}
