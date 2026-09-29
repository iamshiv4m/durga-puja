// Where everything is in the Bihu valley, when things happen, and how the light changes.
//
// World units, y down: houses and trees stand on the ground plane, which runs from the horizon
// (HORIZON) towards the viewer. Left to right, as the camera travels: the tea garden and the
// namghar with the kopou tree, the pond, the homestead and its courtyard, the Bihutoli under the
// big mango trees, and the open paddy fields.
import { lerp, mix, rise, type RGB, type Shot } from "../paint";

export const HORIZON = -1.1;

export const NAMGHAR = { x: -25.5, y: -0.1 };
export const BATSORA = { x: -31.6, y: 0.5 };
export const KOPOU = { x: -17.6, y: 1.2, size: 0.62 };
export const POND = { x: -7, y: 2.1, rx: 4.6, ry: 1.1 };
export const HOUSE = { x: 8, y: 0 };
export const COURT = { x: 9.2, y: 1.9, rx: 8.4, ry: 2.2 };
export const RING = { x: 10.2, y: 2.35, rx: 2.3, ry: 0.55 };
export const TOLI = { x: 31.2, y: 1.7, rx: 9, ry: 2.2 };
export const FIELD = { x: 51, y: 0.9 };

/** Seconds per beat: the husori at a walk, the dance at a gallop. */
export const HUSORI_BEAT = 0.5;
export const NAACH_BEAT = 0.375;

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  spring: [0.08, 0.2],
  kopou: [0.1, 0.2],
  dusk: [0.185, 0.215],
  dawn: [0.228, 0.265],
  goru: [0.24, 0.34],
  manuh: [0.36, 0.48],
  bow: [0.392, 0.412],
  gamosa: [0.412, 0.428],
  second: [0.43, 0.455],
  arrive: [0.465, 0.52],
  husori: [0.5, 0.62],
  bless: [0.582, 0.62],
  naach: [0.64, 0.79],
  climax: [0.715, 0.775],
  night: [0.785, 0.83],
  finale: [0.92, 1],
} as const;

type Frame = Shot & { portrait?: Partial<Shot> };

const FRAMES: Frame[] = [
  { at: 0.0, x: -14, y: -3.0, zoom: 0.46, portrait: { x: -17.5, y: -2.4, zoom: 0.62 } },
  { at: 0.06, x: -16, y: -2.6, zoom: 0.56, portrait: { x: -18, y: -2.2, zoom: 0.72 } },
  { at: 0.115, x: -20.5, y: -1.4, zoom: 0.95, portrait: { x: -18.4, y: -1.0, zoom: 1.0 } },
  { at: 0.178, x: -19.2, y: -1.8, zoom: 1.2, portrait: { x: -18.0, y: -1.3, zoom: 1.3 } },
  { at: 0.215, x: -13, y: -1.4, zoom: 0.82, portrait: { x: -12, y: -1.0, zoom: 0.9 } },
  { at: 0.25, x: -7, y: 0.25, zoom: 1.2, portrait: { x: -6.8, y: 0.9, zoom: 1.2 } },
  { at: 0.325, x: -7, y: 0.45, zoom: 1.35, portrait: { x: -7.0, y: 1.0, zoom: 1.35 } },
  { at: 0.37, x: 6.6, y: -0.9, zoom: 1.45, portrait: { x: 6.2, y: -0.3, zoom: 1.6 } },
  { at: 0.455, x: 6.7, y: -0.8, zoom: 1.6, portrait: { x: 6.3, y: -0.2, zoom: 1.75 } },
  { at: 0.51, x: 9.6, y: -0.4, zoom: 0.95, portrait: { x: 9.8, y: 0.8, zoom: 1.0 } },
  { at: 0.6, x: 9.3, y: -0.2, zoom: 1.05, portrait: { x: 9.5, y: 0.9, zoom: 1.08 } },
  { at: 0.645, x: 31.2, y: -0.8, zoom: 0.85, portrait: { x: 31.2, y: 0.4, zoom: 0.9 } },
  { at: 0.7, x: 31.2, y: -0.35, zoom: 0.98, portrait: { x: 31.2, y: 0.8, zoom: 0.98 } },
  { at: 0.775, x: 31.2, y: -0.15, zoom: 1.12, portrait: { x: 31.2, y: 0.9, zoom: 1.08 } },
  { at: 0.815, x: 50.5, y: -1.2, zoom: 0.85, portrait: { x: 51, y: -0.4, zoom: 0.95 } },
  { at: 0.885, x: 50.8, y: -1.5, zoom: 0.92, portrait: { x: 51.2, y: -0.6, zoom: 1.0 } },
  { at: 0.94, x: 44, y: -3.1, zoom: 0.46, portrait: { x: 48, y: -2.4, zoom: 0.56 } },
  { at: 1.0, x: 42, y: -3.5, zoom: 0.41, portrait: { x: 46, y: -2.8, zoom: 0.5 } },
];

export const SHOTS: Shot[] = FRAMES.map(({ at, x, y, zoom }) => ({ at, x, y, zoom }));
export const PORTRAIT_SHOTS: Shot[] = FRAMES.map(({ at, x, y, zoom, portrait }) => ({ at, x, y, zoom, ...portrait }));

// ─── Light ───────────────────────────────────────────────────────────────────

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

// Chot afternoon, the sun going down, a short night, Goru Bihu dawn, the new year's morning,
// noon, the long golden afternoon of the dance, dusk, and the night in the fields.
export const SKY_TOP: Keys<RGB> = [
  [0, [88, 146, 204]],
  [0.14, [104, 146, 198]],
  [0.19, [110, 112, 168]],
  [0.205, [44, 44, 96]],
  [0.215, [8, 12, 32]],
  [0.228, [18, 24, 58]],
  [0.245, [104, 120, 176]],
  [0.27, [112, 164, 216]],
  [0.34, [96, 160, 224]],
  [0.62, [92, 156, 222]],
  [0.7, [116, 148, 200]],
  [0.765, [108, 104, 166]],
  [0.8, [40, 40, 92]],
  [0.83, [10, 14, 38]],
  [1, [6, 10, 28]],
];
export const SKY_LOW: Keys<RGB> = [
  [0, [224, 228, 212]],
  [0.14, [250, 222, 176]],
  [0.19, [255, 164, 96]],
  [0.205, [186, 96, 90]],
  [0.215, [28, 26, 50]],
  [0.228, [60, 48, 84]],
  [0.245, [250, 168, 138]],
  [0.27, [250, 222, 190]],
  [0.34, [224, 236, 232]],
  [0.62, [230, 232, 218]],
  [0.7, [255, 214, 150]],
  [0.765, [255, 150, 84]],
  [0.8, [160, 84, 92]],
  [0.83, [32, 30, 62]],
  [1, [18, 22, 48]],
];
export const GRADE: Keys<RGB> = [
  [0, [255, 232, 196]],
  [0.14, [255, 212, 150]],
  [0.19, [255, 150, 80]],
  [0.205, [90, 56, 110]],
  [0.215, [12, 18, 48]],
  [0.228, [30, 30, 72]],
  [0.245, [255, 168, 150]],
  [0.27, [255, 214, 176]],
  [0.34, [255, 240, 220]],
  [0.62, [255, 240, 220]],
  [0.7, [255, 196, 116]],
  [0.765, [255, 140, 66]],
  [0.8, [90, 50, 104]],
  [0.83, [14, 22, 56]],
  [1, [10, 16, 44]],
];
export const GRADE_ALPHA: Keys<number> = [
  [0, 0.06],
  [0.14, 0.12],
  [0.19, 0.24],
  [0.205, 0.48],
  [0.215, 0.76],
  [0.228, 0.7],
  [0.245, 0.32],
  [0.27, 0.14],
  [0.34, 0.02],
  [0.62, 0.02],
  [0.7, 0.12],
  [0.765, 0.24],
  [0.8, 0.5],
  [0.83, 0.7],
  [1, 0.74],
];

/** The sun's height over the horizon, as a share of the screen height. */
export const SUN_UP: Keys<number> = [
  [0, 0.42],
  [0.14, 0.2],
  [0.2, -0.03],
  [0.215, -0.2],
  [0.23, -0.1],
  [0.255, 0.04],
  [0.34, 0.34],
  [0.5, 0.56],
  [0.62, 0.42],
  [0.7, 0.2],
  [0.775, 0.0],
  [0.8, -0.15],
];

/** How much it is night: 0 by day, 1 in the dark. */
export function darkness(p: number) {
  return Math.max(rise(p, 0.2, 0.214) * (1 - rise(p, 0.226, 0.25)), rise(p, 0.78, 0.83));
}
