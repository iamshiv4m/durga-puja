// Where everything is, and when. One world, laid out left to right along the story:
// - Kamsa's prison in Mathura, around x = 0
// - the Yamuna, from the prison's bank at x ≈ 6 to Gokul's at x ≈ 22
// - Gokul, around Nand baba's house at x ≈ 31
// - above them all, a band of monsoon cloud the camera rises through to move in time and place
// - a Vrindavan temple today, around x = 58
// - a street of chawls in Maharashtra for the Dahi Handi, around x = 85
// - the Yamuna again at dawn, under a kadamba tree, around x = 110
//
// World units, y down. The ground is y = 0 at the foot of the walls; people walk on y ≈ 0.3.
import { lerp, mix, rise, type RGB, type Shot } from "../paint";

export const PATH_Y = 0.3;
export const HORIZON = -1.6;
export const FORT = { x: 0, arch: { half: 2.1, spring: -2.7, apex: -3.95 }, floor: -0.35 };
export const RIVER = { from: 5.4, to: 22.6, deep: 1.05 };
export const GOKUL = { door: 30.6, house: [28.1, 33.4] as const };
export const TEMPLE = { x: 58, pivot: -3.7, seat: -1.55 };
export const HANDI = { x: 85, pot: -8.95, tier: 1.34, base: 0.7 };
export const GHAT = { x: 110, flute: { x: 109.7, y: 0.28 }, tree: 110.9 };

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  lightning: [0.03, 0.42],
  hush: [0.186, 0.2],
  birth: 0.2,
  chains: 0.207,
  sleep: [0.208, 0.224],
  lock: 0.213,
  doors: [0.215, 0.235],
  stand: [0.235, 0.245],
  lift: [0.245, 0.252],
  river: 0.3,
  shesh: [0.305, 0.33],
  surge: [0.345, 0.372],
  touch: 0.372,
  part: [0.374, 0.39],
  bank: 0.41,
  door: 0.438,
  dawn: [0.438, 0.475],
  nandotsav: [0.465, 0.49],
  flight1: [0.535, 0.578],
  curtain: [0.592, 0.602],
  midnight: 0.595,
  flight2: [0.655, 0.69],
  pyramid: [0.695, 0.782],
  climb: [0.782, 0.792],
  smash: 0.797,
  flight3: [0.825, 0.862],
  flute: 0.87,
} as const;

/** Vasudeva, carrying the child: where he is, whether he is sitting, walking or has the basket up. */
export function vasudeva(p: number) {
  const walkOut = rise(p, MOMENTS.lift[1], 0.266);
  let x = 0.75;
  let y = FORT.floor;
  let walking = 0;
  if (p < 0.266) {
    x = lerp(0.75, 0.25, walkOut);
    y = lerp(FORT.floor, PATH_Y, walkOut);
    walking = walkOut > 0 && walkOut < 1 ? 1 : 0;
  } else if (p < MOMENTS.river) {
    x = lerp(0.25, 7, (p - 0.266) / (MOMENTS.river - 0.266));
    y = PATH_Y;
    walking = 1;
  } else if (p < 0.34) {
    x = lerp(7, 11.4, (p - MOMENTS.river) / 0.04);
    y = PATH_Y;
    walking = 1;
  } else if (p < 0.385) {
    x = lerp(11.4, 13.4, (p - 0.34) / 0.045);
    y = PATH_Y;
    walking = 0.6;
  } else if (p < MOMENTS.bank) {
    x = lerp(13.4, 21.6, (p - 0.385) / (MOMENTS.bank - 0.385));
    y = PATH_Y;
    walking = 1;
  } else {
    x = lerp(21.6, GOKUL.door, Math.min(1, (p - MOMENTS.bank) / (MOMENTS.door - MOMENTS.bank)));
    y = lerp(PATH_Y, 0.12, rise(p, MOMENTS.door - 0.006, MOMENTS.door));
    walking = p < MOMENTS.door ? 1 : 0;
  }
  return {
    x,
    y,
    sit: 1 - rise(p, MOMENTS.stand[0], MOMENTS.stand[1]),
    carry: rise(p, MOMENTS.lift[0], MOMENTS.lift[1]),
    walking,
    /** Still inside the cell, behind the gate. */
    inside: walkOut < 0.55,
    scale: lerp(0.94, 1, walkOut),
    /** Fades into Nand's doorway. */
    alpha: 1 - rise(p, MOMENTS.door - 0.004, MOMENTS.door + 0.002),
  };
}

/** How deep the Yamuna is at x, on the line Vasudeva wades. */
export function depth(x: number) {
  return RIVER.deep * rise(x, RIVER.from + 1.2, RIVER.from + 3.6) * (1 - rise(x, RIVER.to - 3.6, RIVER.to - 1.2));
}

export const SHOTS: Shot[] = [
  { at: 0.0, x: 2, y: -3.3, zoom: 0.45 },
  { at: 0.05, x: 1.2, y: -2.9, zoom: 0.52 },
  { at: 0.09, x: -2.2, y: -1.9, zoom: 1.1 },
  { at: 0.15, x: -1.9, y: -1.8, zoom: 1.22 },
  { at: 0.185, x: 2.3, y: -1.75, zoom: 1.22 },
  { at: 0.235, x: 2.3, y: -1.8, zoom: 1.3 },
];

export const PORTRAIT_SHOTS: Shot[] = [
  { at: 0.0, x: 0.8, y: -3.6, zoom: 0.72 },
  { at: 0.05, x: 0.5, y: -3.2, zoom: 0.8 },
  { at: 0.09, x: 0.1, y: -1.9, zoom: 1.45 },
  { at: 0.15, x: 0.1, y: -1.8, zoom: 1.55 },
  { at: 0.185, x: 0.2, y: -1.75, zoom: 1.55 },
  { at: 0.235, x: 0.3, y: -1.8, zoom: 1.6 },
];

/** Later shots, after the camera starts following Vasudeva, keyed by place. */
export const LATER: Shot[] = [
  { at: 0.44, x: 33.2, y: -1.55, zoom: 1.0 },
  { at: 0.53, x: 33.8, y: -1.6, zoom: 1.08 },
  { at: 0.578, x: 55.5, y: -2.3, zoom: 1.0 },
  { at: 0.65, x: 55.7, y: -2.2, zoom: 1.1 },
  { at: 0.69, x: 87.6, y: -3.1, zoom: 0.62 },
  { at: 0.745, x: 87.4, y: -3.7, zoom: 0.6 },
  { at: 0.8, x: 87.2, y: -4.4, zoom: 0.58 },
  { at: 0.822, x: 87.1, y: -4.2, zoom: 0.6 },
  { at: 0.862, x: 107.6, y: -1.7, zoom: 1.0 },
  { at: 0.93, x: 107.9, y: -1.6, zoom: 1.1 },
  { at: 1.0, x: 108.6, y: -2.3, zoom: 0.78 },
];

export const PORTRAIT_LATER: Shot[] = [
  { at: 0.44, x: 30.6, y: -1.9, zoom: 1.2 },
  { at: 0.53, x: 31.2, y: -1.9, zoom: 1.25 },
  { at: 0.578, x: 58, y: -2.6, zoom: 1.35 },
  { at: 0.65, x: 58, y: -2.5, zoom: 1.45 },
  { at: 0.69, x: 85, y: -3.6, zoom: 0.78 },
  { at: 0.745, x: 85, y: -4.3, zoom: 0.76 },
  { at: 0.8, x: 85, y: -4.9, zoom: 0.74 },
  { at: 0.822, x: 85, y: -4.7, zoom: 0.76 },
  { at: 0.862, x: 110.2, y: -1.8, zoom: 1.35 },
  { at: 0.93, x: 110.3, y: -1.7, zoom: 1.45 },
  { at: 1.0, x: 110.4, y: -2.4, zoom: 1.0 },
];

// ─── The day, as keyed tracks ────────────────────────────────────────────────

type Keys<T> = [number, T][];

/** Reads a keyed track at `p`, easing between neighbours. */
export function track(keys: Keys<number>, p: number): number;
export function track(keys: Keys<RGB>, p: number): RGB;
export function track(keys: Keys<number | RGB>, p: number): number | RGB {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
  const [a, va] = keys[i];
  const [b, vb] = keys[i + 1];
  const t = rise(p, a, b);
  if (typeof va === "number") return lerp(va, vb as number, t);
  return mix(va, vb as RGB, t);
}

export const SKY_TOP: Keys<RGB> = [
  [0, [6, 8, 16]],
  [0.19, [5, 7, 15]],
  [0.205, [16, 16, 30]],
  [0.3, [8, 10, 20]],
  [0.41, [10, 12, 26]],
  [0.44, [24, 28, 60]],
  [0.475, [82, 104, 160]],
  [0.53, [110, 150, 200]],
  [0.555, [40, 48, 84]],
  [0.578, [6, 8, 22]],
  [0.655, [8, 10, 26]],
  [0.675, [80, 96, 120]],
  [0.69, [132, 150, 168]],
  [0.82, [140, 160, 180]],
  [0.845, [60, 66, 110]],
  [0.87, [70, 84, 140]],
  [1, [104, 128, 178]],
];
export const SKY_LOW: Keys<RGB> = [
  [0, [22, 26, 38]],
  [0.19, [18, 22, 34]],
  [0.205, [40, 36, 52]],
  [0.3, [22, 26, 38]],
  [0.41, [28, 30, 48]],
  [0.44, [110, 78, 96]],
  [0.475, [250, 176, 128]],
  [0.53, [242, 214, 180]],
  [0.555, [80, 60, 80]],
  [0.578, [30, 22, 44]],
  [0.655, [32, 24, 46]],
  [0.675, [170, 170, 170]],
  [0.69, [220, 218, 208]],
  [0.82, [226, 220, 204]],
  [0.845, [170, 110, 110]],
  [0.87, [248, 170, 120]],
  [1, [250, 206, 160]],
];
/** The colour of the cloud band: storm, dawn, night, a monsoon day, dawn again. */
export const CLOUD_LIGHT: Keys<RGB> = [
  [0, [58, 62, 84]],
  [0.3, [54, 58, 80]],
  [0.42, [70, 70, 96]],
  [0.475, [250, 196, 170]],
  [0.53, [240, 236, 236]],
  [0.578, [52, 50, 76]],
  [0.655, [56, 52, 80]],
  [0.69, [236, 238, 240]],
  [0.82, [236, 238, 240]],
  [0.87, [252, 200, 176]],
  [1, [250, 226, 214]],
];
export const CLOUD_SHADE: Keys<RGB> = [
  [0, [16, 18, 28]],
  [0.3, [14, 16, 26]],
  [0.42, [26, 26, 44]],
  [0.475, [150, 110, 130]],
  [0.53, [170, 176, 196]],
  [0.578, [14, 14, 30]],
  [0.655, [16, 14, 30]],
  [0.69, [150, 158, 172]],
  [0.82, [150, 158, 172]],
  [0.87, [150, 110, 130]],
  [1, [184, 160, 170]],
];
/** Night over Gokul before dawn, laid over the world. */
export const GRADE: Keys<RGB> = [
  [0, [40, 50, 90]],
  [0.405, [40, 50, 90]],
  [0.44, [50, 56, 110]],
  [0.475, [255, 200, 160]],
  [0.53, [255, 240, 220]],
  [1, [255, 240, 220]],
];
export const GRADE_ALPHA: Keys<number> = [
  [0, 0],
  [0.405, 0],
  [0.42, 0.6],
  [0.44, 0.62],
  [0.475, 0.12],
  [0.53, 0],
  [1, 0],
];

/** 0 outside [a, b], rising to 1 in the middle: the arc of a flight through the clouds. */
export function hop(p: number, [a, b]: readonly [number, number]) {
  if (p <= a || p >= b) return 0;
  return Math.sin(((p - a) / (b - a)) * Math.PI);
}

/** How hard it is raining. */
export function storm(p: number) {
  const hush = 1 - 0.9 * rise(p, MOMENTS.hush[0], MOMENTS.hush[1]) * (1 - rise(p, 0.212, 0.23));
  return (1 - rise(p, 0.405, 0.43)) * hush * (0.75 + 0.25 * rise(p, 0.3, 0.34) * (1 - rise(p, 0.38, 0.4)));
}
