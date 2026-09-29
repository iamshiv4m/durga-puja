// One winter day across India, laid out as a single long painted world, west to the right:
// the Sangam at Prayagraj, a village in Bihar, a wada in Pune and the pols of Ahmedabad.
// World units, y down: the horizon is y = 0 everywhere, the ground and water come toward us at
// y > 0, and the sky, with the sun and every kite in it, is y < 0.
import { clamp, lerp, mix, rgb, rise, type Ctx, type RGB, type View } from "../paint";

export const SANGAM = 0;
export const VILLAGE = 44;
export const WADA = 88;
export const POL = 136;
/** The near edge of the river at the Sangam, where the sand begins. */
export const SHORE = 4.6;

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  dawn: [0, 0.17],
  sunrise: 0.1,
  village: [0.2, 0.3],
  wada: [0.325, 0.425],
  pol: [0.455, 0.56],
  pech: [0.565, 0.67],
  cuts: [0.588, 0.612, 0.636, 0.654],
  sunset: [0.68, 0.785],
  sundown: 0.765,
  night: [0.79, 0.9],
  finale: [0.9, 1],
} as const;

/** The light on things at one moment of the day. */
export type Env = { amb: number; tint: RGB; night: RGB };

/** A surface colour under `env`, lifted toward full colour by a lamp or fire nearby. */
export function tone(base: RGB, env: Env, lift = 0): RGB {
  const dark = mix(base, env.night, 0.86);
  const day = mix(base, env.tint, 0.14);
  return mix(dark, day, clamp(env.amb + lift));
}

// The same few hundred colours are painted every frame; each is worked out once per light.
let cacheEnv: Env | null = null;
const cache = new Map<number, string>();

export function paint(base: RGB, env: Env, lift = 0, alpha = 1) {
  if (env !== cacheEnv) {
    cache.clear();
    cacheEnv = env;
  }
  const key = ((base[0] * 256 + base[1]) * 256 + base[2]) * 4096 + Math.round(clamp(lift) * 63) * 64 + Math.round(clamp(alpha) * 63);
  let color = cache.get(key);
  if (color === undefined) {
    color = rgb(tone(base, env, lift), alpha);
    cache.set(key, color);
  }
  return color;
}

export type Light = {
  x: number;
  y: number;
  r: number;
  a: number;
  color: string;
};

export type Hour = {
  top: RGB;
  low: RGB;
  amb: number;
  tint: RGB;
  stars: number;
  mist: number;
};

const HOURS: (Hour & { at: number })[] = [
  {
    at: 0,
    top: [10, 16, 40],
    low: [44, 50, 92],
    amb: 0.12,
    tint: [150, 160, 220],
    stars: 1,
    mist: 0.9,
  },
  {
    at: 0.05,
    top: [22, 30, 68],
    low: [150, 104, 120],
    amb: 0.24,
    tint: [190, 170, 210],
    stars: 0.6,
    mist: 1,
  },
  {
    at: 0.095,
    top: [52, 70, 124],
    low: [252, 164, 110],
    amb: 0.48,
    tint: [255, 184, 140],
    stars: 0.1,
    mist: 0.9,
  },
  {
    at: 0.15,
    top: [86, 124, 180],
    low: [250, 206, 160],
    amb: 0.78,
    tint: [255, 214, 170],
    stars: 0,
    mist: 0.6,
  },
  {
    at: 0.2,
    top: [98, 146, 202],
    low: [236, 224, 204],
    amb: 0.95,
    tint: [255, 236, 206],
    stars: 0,
    mist: 0.25,
  },
  {
    at: 0.3,
    top: [92, 148, 210],
    low: [232, 230, 216],
    amb: 1,
    tint: [255, 244, 222],
    stars: 0,
    mist: 0.15,
  },
  {
    at: 0.42,
    top: [84, 144, 212],
    low: [240, 228, 200],
    amb: 1,
    tint: [255, 238, 210],
    stars: 0,
    mist: 0.1,
  },
  {
    at: 0.56,
    top: [82, 140, 208],
    low: [244, 224, 190],
    amb: 0.98,
    tint: [255, 232, 198],
    stars: 0,
    mist: 0.1,
  },
  {
    at: 0.65,
    top: [96, 128, 190],
    low: [255, 200, 140],
    amb: 0.86,
    tint: [255, 214, 160],
    stars: 0,
    mist: 0.2,
  },
  {
    at: 0.72,
    top: [80, 86, 150],
    low: [255, 150, 84],
    amb: 0.62,
    tint: [255, 170, 110],
    stars: 0,
    mist: 0.35,
  },
  {
    at: 0.765,
    top: [50, 46, 104],
    low: [240, 100, 62],
    amb: 0.4,
    tint: [240, 130, 100],
    stars: 0.1,
    mist: 0.4,
  },
  {
    at: 0.8,
    top: [16, 18, 52],
    low: [84, 50, 80],
    amb: 0.14,
    tint: [170, 140, 190],
    stars: 0.6,
    mist: 0.2,
  },
  {
    at: 0.84,
    top: [5, 8, 26],
    low: [22, 22, 54],
    amb: 0.06,
    tint: [140, 150, 210],
    stars: 1,
    mist: 0.1,
  },
  {
    at: 1,
    top: [4, 6, 22],
    low: [18, 18, 46],
    amb: 0.05,
    tint: [140, 150, 210],
    stars: 1,
    mist: 0.1,
  },
];

export function hourAt(p: number): Hour {
  let i = 0;
  while (i < HOURS.length - 2 && p > HOURS[i + 1].at) i++;
  const a = HOURS[i];
  const b = HOURS[i + 1];
  const t = rise(p, a.at, b.at);
  return {
    top: mix(a.top, b.top, t),
    low: mix(a.low, b.low, t),
    amb: lerp(a.amb, b.amb, t),
    tint: mix(a.tint, b.tint, t),
    stars: lerp(a.stars, b.stars, t),
    mist: lerp(a.mist, b.mist, t),
  };
}

type SunKey = { at: number; fx: number; elev: number };

/** Where the sun is: `fx` across the screen, `elev` in sky units above the horizon. */
const SUN: SunKey[] = [
  { at: 0, fx: 0.24, elev: -1.2 },
  { at: 0.06, fx: 0.25, elev: -0.5 },
  { at: 0.1, fx: 0.26, elev: 0.25 },
  { at: 0.165, fx: 0.28, elev: 1.3 },
  { at: 0.21, fx: 0.24, elev: 3.2 },
  { at: 0.3, fx: 0.3, elev: 4.2 },
  { at: 0.37, fx: 0.75, elev: 4.8 },
  { at: 0.46, fx: 0.86, elev: 4.8 },
  { at: 0.56, fx: 0.82, elev: 3.6 },
  { at: 0.67, fx: 0.8, elev: 2.2 },
  { at: 0.765, fx: 0.74, elev: -0.05 },
  { at: 0.8, fx: 0.74, elev: -0.9 },
  { at: 1, fx: 0.74, elev: -2 },
];

export function sunAt(p: number) {
  let i = 0;
  while (i < SUN.length - 2 && p > SUN[i + 1].at) i++;
  const a = SUN[i];
  const b = SUN[i + 1];
  const t = rise(p, a.at, b.at);
  const elev = lerp(a.elev, b.elev, t);
  // Big and red near the horizon, small and white high up.
  const low = 1 - clamp(elev / 2.5);
  const color = mix([255, 246, 226], p < 0.4 ? [255, 150, 80] : [255, 90, 40], low * low);
  return { fx: lerp(a.fx, b.fx, t), elev, r: lerp(0.34, 0.62, low), color };
}

/** Screen-space helpers for painting something at a world rectangle only if it shows. */
export function visibleX(v: View, from: number, to: number) {
  const half = v.width / 2 / v.scale;
  return to > v.x - half && from < v.x + half;
}

/** The x range of world on screen, padded. */
export function spanX(v: View, pad = 1) {
  const half = v.width / 2 / v.scale;
  return [v.x - half - pad, v.x + half + pad];
}

/** Everything a place needs to paint itself this frame. */
export type World = {
  ctx: Ctx;
  v: View;
  env: Env;
  hour: Hour;
  p: number;
  seconds: number;
  dt: number;
  lights: Light[];
  reduced: boolean;
  /** Which way shadows fall: -1 to the left (afternoon), 1 to the right (morning). */
  shadow: number;
};
