export const TAU = Math.PI * 2;

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export type Window4 = readonly [number, number, number, number];

/** Fades in over [a, b], holds, fades out over [c, d]. A window starting at [0, 0] is visible at load. */
export function windowOpacity(value: number, [a, b, c, d]: Window4) {
  if (b <= 0 && value <= c) return 1;
  if (value <= a || value >= d) return 0;
  if (value < b) return smoothstep(a, b, value);
  if (value <= c) return 1;
  return 1 - smoothstep(c, d, value);
}

export function easeOutBack(t: number) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Deterministic PRNG so scene layout is stable between renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
