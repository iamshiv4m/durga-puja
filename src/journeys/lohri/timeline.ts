// When things happen, where the camera looks, and the colour of the sky and the light, all as
// scroll progress 0..1. The score listens for the same MOMENTS.
import { lerp, mix, rise, type RGB, type Shot } from "../paint";

export const MOMENTS = {
  /** The children reach the neighbour's door and start singing. */
  door: 0.098,
  /** She comes out with rewri, gur and coins. */
  rewri: 0.14,
  /** The fire is lit. */
  light: 0.19,
  parikrama: [0.2, 0.3],
  /** The baby and the bride are brought to the fire. */
  pehli: 0.315,
  gidda: [0.33, 0.41],
  dawn: [0.41, 0.445],
  season: [0.435, 0.53],
  basant: [0.458, 0.505],
  vaisakhi: 0.545,
  reap: [0.552, 0.628],
  bhangra: [0.595, 0.66],
  /** The dhol drops in and the dancers leap. */
  hoy: 0.6,
  /** Five figures rise, one after another: Anandpur Sahib, 1699. */
  khalsa: [0.668, 0.694],
  kirtan: [0.7, 0.778],
  mela: [0.785, 0.9],
  dusk: [0.855, 0.95],
  finale: 0.905,
} as const;

type Frame = Shot & { portrait?: Partial<Shot> };

// One world, west to east: the mustard and cane, the lane, the haveli's fire, the fields, the
// gurdwara, the mela. Phones get their own framing where the narrow screen needs it.
const FRAMES: Frame[] = [
  {
    at: 0.0,
    x: -23,
    y: -1.4,
    zoom: 0.62,
    portrait: { x: -20.5, y: -1.6, zoom: 0.62 },
  },
  {
    at: 0.055,
    x: -18.5,
    y: -1.0,
    zoom: 0.78,
    portrait: { x: -15.5, y: -1.2, zoom: 0.72 },
  },
  {
    at: 0.1,
    x: -11.7,
    y: -0.4,
    zoom: 1.32,
    portrait: { x: -11.3, y: -0.5, zoom: 1.0 },
  },
  {
    at: 0.155,
    x: -11.0,
    y: -0.4,
    zoom: 1.36,
    portrait: { x: -11.0, y: -0.5, zoom: 1.04 },
  },
  {
    at: 0.198,
    x: 0.6,
    y: 0.5,
    zoom: 0.98,
    portrait: { x: 0.6, y: 1.4, zoom: 0.86 },
  },
  {
    at: 0.285,
    x: 0.8,
    y: 0.8,
    zoom: 1.04,
    portrait: { x: 0.7, y: 1.6, zoom: 0.9 },
  },
  {
    at: 0.33,
    x: 2.7,
    y: 1.9,
    zoom: 1.12,
    portrait: { x: 3.0, y: 2.6, zoom: 0.84 },
  },
  {
    at: 0.4,
    x: 2.9,
    y: 1.7,
    zoom: 1.08,
    portrait: { x: 3.1, y: 2.5, zoom: 0.82 },
  },
  {
    at: 0.447,
    x: 22.5,
    y: -2.4,
    zoom: 0.6,
    portrait: { x: 21.5, y: -0.4, zoom: 0.56 },
  },
  {
    at: 0.53,
    x: 24.2,
    y: -1.8,
    zoom: 0.64,
    portrait: { x: 24, y: 0.2, zoom: 0.6 },
  },
  {
    at: 0.572,
    x: 26.4,
    y: 1.2,
    zoom: 0.8,
    portrait: { x: 25.8, y: 2.3, zoom: 0.8 },
  },
  {
    at: 0.648,
    x: 27.2,
    y: 1.4,
    zoom: 0.82,
    portrait: { x: 27.0, y: 2.6, zoom: 0.78 },
  },
  {
    at: 0.68,
    x: 44.4,
    y: -2.0,
    zoom: 0.95,
    portrait: { x: 44.4, y: -1.4, zoom: 0.9 },
  },
  {
    at: 0.692,
    x: 44.5,
    y: -2.2,
    zoom: 0.92,
    portrait: { x: 44.5, y: -1.6, zoom: 0.86 },
  },
  {
    at: 0.712,
    x: 45.6,
    y: -4.4,
    zoom: 0.57,
    portrait: { x: 45.4, y: -2.2, zoom: 0.6 },
  },
  {
    at: 0.745,
    x: 51.0,
    y: -3.2,
    zoom: 0.64,
    portrait: { x: 50.0, y: -1.5, zoom: 0.62 },
  },
  {
    at: 0.772,
    x: 52.5,
    y: -3.0,
    zoom: 0.66,
    portrait: { x: 52.8, y: -1.4, zoom: 0.64 },
  },
  {
    at: 0.815,
    x: 66.2,
    y: -0.7,
    zoom: 0.66,
    portrait: { x: 67.8, y: -0.6, zoom: 0.62 },
  },
  {
    at: 0.878,
    x: 67.0,
    y: -0.9,
    zoom: 0.68,
    portrait: { x: 68.2, y: -0.7, zoom: 0.64 },
  },
  {
    at: 0.935,
    x: 56,
    y: -4.0,
    zoom: 0.36,
    portrait: { x: 60, y: -2.6, zoom: 0.36 },
  },
  {
    at: 1.0,
    x: 54,
    y: -4.4,
    zoom: 0.33,
    portrait: { x: 58, y: -2.8, zoom: 0.33 },
  },
];

export const SHOTS: Shot[] = FRAMES.map(({ at, x, y, zoom }) => ({
  at,
  x,
  y,
  zoom,
}));
export const PORTRAIT_SHOTS: Shot[] = FRAMES.map(
  ({ at, x, y, zoom, portrait }) => ({ at, x, y, zoom, ...portrait }),
);

export type Keys<T> = [number, T][];

/** Reads a keyed track at `p`, easing between neighbours. */
export function track(keys: Keys<number>, p: number): number;
export function track(keys: Keys<RGB>, p: number): RGB;
export function track(keys: Keys<number | RGB>, p: number): number | RGB {
  let i = 0;
  let guard = 0;
  while (i < keys.length - 2 && p > keys[i + 1][0] && guard++ < 100) i++;
  const [a, va] = keys[i];
  const [b, vb] = keys[i + 1];
  const t = rise(p, a, b);
  if (typeof va === "number") return lerp(va, vb as number, t);
  return mix(va, vb as RGB, t);
}

// A foggy January night; a white dawn; the winter sun climbing into spring; the hot gold of
// Vaisakh; a clear afternoon at the gurdwara; the sun going down over the mela; night.
export const SKY_TOP: Keys<RGB> = [
  [0, [10, 12, 26]],
  [0.4, [12, 14, 30]],
  [0.425, [70, 76, 104]],
  [0.447, [150, 170, 196]],
  [0.49, [104, 158, 214]],
  [0.53, [92, 148, 210]],
  [0.62, [82, 144, 214]],
  [0.72, [92, 150, 212]],
  [0.8, [100, 128, 188]],
  [0.86, [78, 80, 146]],
  [0.91, [42, 38, 88]],
  [0.96, [18, 18, 48]],
  [1, [10, 12, 32]],
];
export const SKY_LOW: Keys<RGB> = [
  [0, [44, 46, 62]],
  [0.4, [48, 48, 64]],
  [0.425, [176, 164, 166]],
  [0.447, [228, 224, 214]],
  [0.49, [214, 228, 232]],
  [0.53, [242, 228, 192]],
  [0.62, [246, 224, 178]],
  [0.72, [246, 222, 172]],
  [0.8, [255, 196, 128]],
  [0.86, [255, 146, 86]],
  [0.91, [196, 92, 80]],
  [0.96, [86, 48, 72]],
  [1, [40, 30, 56]],
];
export const GRADE: Keys<RGB> = [
  [0, [6, 9, 26]],
  [0.4, [8, 10, 28]],
  [0.425, [96, 100, 134]],
  [0.447, [224, 228, 238]],
  [0.49, [255, 244, 214]],
  [0.53, [255, 214, 150]],
  [0.6, [255, 204, 128]],
  [0.7, [255, 216, 164]],
  [0.79, [255, 160, 84]],
  [0.86, [226, 100, 72]],
  [0.92, [52, 36, 84]],
  [1, [20, 18, 52]],
];
export const GRADE_ALPHA: Keys<number> = [
  [0, 0.9],
  [0.4, 0.88],
  [0.425, 0.45],
  [0.447, 0.14],
  [0.49, 0.04],
  [0.53, 0.1],
  [0.6, 0.13],
  [0.7, 0.07],
  [0.79, 0.16],
  [0.86, 0.3],
  [0.92, 0.5],
  [1, 0.6],
];
/** How thick the fog lies. */
export const FOG: Keys<number> = [
  [0, 0.7],
  [0.16, 0.6],
  [0.2, 0.32],
  [0.4, 0.4],
  [0.425, 0.8],
  [0.45, 0.45],
  [0.475, 0],
  [1, 0],
];
/** How the sun stands: elevation 0 (horizon) to 1, and across the frame 0..1. */
export const SUN_UP: Keys<number> = [
  [0.43, -0.2],
  [0.455, 0.25],
  [0.53, 0.8],
  [0.62, 0.95],
  [0.72, 0.68],
  [0.8, 0.34],
  [0.87, -0.02],
  [0.9, -0.25],
];
export const SUN_ACROSS: Keys<number> = [
  [0.43, 0.2],
  [0.53, 0.42],
  [0.62, 0.55],
  [0.72, 0.68],
  [0.87, 0.8],
  [0.9, 0.82],
];
