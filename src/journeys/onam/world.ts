// The Onam world, laid out left to right along one strip of Kerala, y down:
// - the oottupura, an open dining hall, where the sadya is served (x ≈ -34..-12)
// - the nalukettu's front, with its verandah and the shadow screen hung between the pillars, and
//   the mittam in front of it where the pookalam is laid and the women dance (x ≈ -10..12)
// - the padippura gate, and a street of Thrissur with the temple's gopuram behind (x ≈ 13..54)
// - the Pamba, with the snake boats on it and palms on the far bank (x ≈ 56..)
// The ground runs toward us from y = 0. Things lying on it (the pookalam, the leaf) are drawn
// squashed by the camera's `tilt`, so the camera can look down on them in the close-ups.
import { lerp, smoothstep } from "@/lib/math";
import { mix, type RGB } from "../paint";

export const SCREEN = { x: 0, y: -3.75, w: 7.6, h: 3.7 };
export const POOKALAM = { x: 0, y: 3.7, r: 2.42 };
export const LAMP = { x: 9.6, y: 3.25 };
export const LEAF = { x: -16, y: 3.3 };
export const LEAVES = [-30, -23, -16];
export const STREET = { from: 19, to: 55, tigers: 33 };
export const RIVER = { from: 57, boats: 80 };

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  lamps: 0.03,
  reign: [0.06, 0.098],
  vamana: [0.098, 0.12],
  pour: 0.112,
  grow: [0.12, 0.146],
  step: 0.138,
  press: [0.146, 0.164],
  wish: [0.164, 0.18],
  dawn: 0.182,
  /** Atham's first thumba, and a ring every day after it. */
  days: [0.2, 0.0102],
  appan: 0.3,
  hall: 0.33,
  leaf: 0.352,
  dishes: [0.356, 0.0039],
  dusk: 0.445,
  lit: 0.463,
  dance: [0.472, 0.565],
  street: [0.575, 0.695],
  river: [0.7, 0.8],
  melam: [0.8, 0.849],
  home: 0.86,
  leaving: [0.875, 0.935],
} as const;

export const DAYS: [string, string][] = [
  ["അത്തം", "Atham"],
  ["ചിത്തിര", "Chithira"],
  ["ചോതി", "Chothi"],
  ["വിശാഖം", "Vishakam"],
  ["അനിഴം", "Anizham"],
  ["തൃക്കേട്ട", "Thrikketta"],
  ["മൂലം", "Moolam"],
  ["പൂരാടം", "Pooradam"],
  ["ഉത്രാടം", "Uthradam"],
  ["തിരുവോണം", "Thiruvonam"],
];

export const dayAt = (i: number) => MOMENTS.days[0] + i * MOMENTS.days[1];
export const dishAt = (i: number) => MOMENTS.dishes[0] + i * MOMENTS.dishes[1];

// ─── The camera ──────────────────────────────────────────────────────────────

export type Cam = { at: number; x: number; y: number; zoom: number; tilt: number };
type Frame = Cam & { portrait?: Partial<Omit<Cam, "at">> };

const T = 0.42;
const FRAMES: Frame[] = [
  { at: 0.0, x: 0, y: -4.6, zoom: 0.6, tilt: T, portrait: { y: -3.2, zoom: 0.62 } },
  { at: 0.035, x: 0.4, y: -4.1, zoom: 0.8, tilt: T, portrait: { x: 0, y: -3.6, zoom: 0.8 } },
  { at: 0.078, x: 1.9, y: -3.75, zoom: 1.28, tilt: T, portrait: { x: 0, y: -3.4, zoom: 1.0 } },
  { at: 0.168, x: 1.9, y: -3.75, zoom: 1.36, tilt: T, portrait: { x: 0, y: -3.45, zoom: 1.04 } },
  { at: 0.198, x: -2.5, y: 3.35, zoom: 1.45, tilt: 0.8, portrait: { x: 0, y: 4.1, zoom: 1.5 } },
  { at: 0.305, x: -2.3, y: 3.45, zoom: 1.58, tilt: 0.84, portrait: { x: 0, y: 4.2, zoom: 1.58 } },
  { at: 0.338, x: -21.5, y: 1.5, zoom: 0.92, tilt: T, portrait: { x: -18.5, y: 1.6, zoom: 1.0 } },
  { at: 0.362, x: -14.1, y: 3.3, zoom: 1.55, tilt: 1, portrait: { x: -16, y: 4.3, zoom: 1.62 } },
  { at: 0.432, x: -14.2, y: 3.32, zoom: 1.62, tilt: 1, portrait: { x: -16, y: 4.35, zoom: 1.66 } },
  { at: 0.466, x: 6.3, y: 1.55, zoom: 1.05, tilt: T, portrait: { x: 9.6, y: 2.2, zoom: 1.2 } },
  { at: 0.557, x: 6.6, y: 1.75, zoom: 1.2, tilt: T, portrait: { x: 9.6, y: 2.3, zoom: 1.34 } },
  { at: 0.598, x: 36.4, y: 0.9, zoom: 1.0, tilt: T, portrait: { x: 33, y: 1.8, zoom: 1.05 } },
  { at: 0.682, x: 36.8, y: 1.15, zoom: 1.12, tilt: T, portrait: { x: 33, y: 1.9, zoom: 1.2 } },
  { at: 0.72, x: 77.2, y: 0.6, zoom: 0.92, tilt: T, portrait: { x: 81, y: 1.6, zoom: 1.0 } },
  { at: 0.792, x: 78.4, y: 1.05, zoom: 1.2, tilt: T, portrait: { x: 81.5, y: 1.9, zoom: 1.25 } },
  { at: 0.818, x: 80.6, y: 1.5, zoom: 1.62, tilt: T, portrait: { x: 82, y: 2.2, zoom: 1.55 } },
  { at: 0.848, x: 80.5, y: 0.8, zoom: 0.72, tilt: T, portrait: { x: 81, y: 1.6, zoom: 0.8 } },
  { at: 0.872, x: 34, y: -3.2, zoom: 0.3, tilt: T, portrait: { x: 30, y: -1.5, zoom: 0.36 } },
  { at: 0.902, x: 1.8, y: -3.4, zoom: 1.08, tilt: T, portrait: { x: 0, y: -3.0, zoom: 0.95 } },
  { at: 0.935, x: 1.6, y: -3.5, zoom: 1.14, tilt: T, portrait: { x: 0, y: -3.2, zoom: 1.0 } },
  { at: 0.975, x: 0, y: -4.3, zoom: 0.64, tilt: T, portrait: { x: 0, y: -3.2, zoom: 0.64 } },
  { at: 1.0, x: 0, y: -4.5, zoom: 0.6, tilt: T, portrait: { y: -3.2, zoom: 0.62 } },
];
const LANDSCAPE: Cam[] = FRAMES.map(({ at, x, y, zoom, tilt }) => ({ at, x, y, zoom, tilt }));
const PORTRAIT: Cam[] = FRAMES.map(({ at, x, y, zoom, tilt, portrait }) => ({ at, x, y, zoom, tilt, ...portrait }));

/** Eases between the frames either side of `p`, holding still at each one. */
export function camera(p: number, portrait: boolean) {
  const shots = portrait ? PORTRAIT : LANDSCAPE;
  let i = 0;
  while (i < shots.length - 2 && p > shots[i + 1].at) i++;
  const a = shots[i];
  const b = shots[i + 1];
  const t = smoothstep(a.at, b.at, p);
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)),
    tilt: lerp(a.tilt, b.tilt, t),
  };
}

// ─── The hours ───────────────────────────────────────────────────────────────

export type Hour = { top: RGB; low: RGB; amb: number; tint: RGB; stars: number; moon: number; sun: number };

type Stop = Hour & { at: number };
const NIGHT = { top: [7, 9, 26] as RGB, low: [30, 24, 50] as RGB, amb: 0.1, tint: [150, 150, 214] as RGB, stars: 1 };
const HOURS: Stop[] = [
  { at: 0, ...NIGHT, moon: 0, sun: 0 },
  { at: 0.172, ...NIGHT, moon: 0, sun: 0 },
  { at: 0.19, top: [66, 90, 150], low: [250, 186, 136], amb: 0.66, tint: [255, 206, 166], stars: 0, moon: 0, sun: 0.4 },
  { at: 0.215, top: [94, 138, 190], low: [238, 220, 186], amb: 0.94, tint: [255, 242, 220], stars: 0, moon: 0, sun: 1 },
  { at: 0.31, top: [94, 138, 190], low: [238, 220, 186], amb: 0.94, tint: [255, 242, 220], stars: 0, moon: 0, sun: 1 },
  { at: 0.34, top: [86, 144, 206], low: [222, 232, 232], amb: 1, tint: [255, 250, 240], stars: 0, moon: 0, sun: 1 },
  { at: 0.435, top: [86, 144, 206], low: [222, 232, 232], amb: 1, tint: [255, 250, 240], stars: 0, moon: 0, sun: 1 },
  { at: 0.452, top: [70, 96, 160], low: [255, 190, 124], amb: 0.72, tint: [255, 206, 160], stars: 0, moon: 0, sun: 1 },
  { at: 0.468, top: [30, 30, 80], low: [214, 110, 86], amb: 0.3, tint: [240, 150, 130], stars: 0.2, moon: 0.4, sun: 0.4 },
  { at: 0.49, top: [8, 10, 30], low: [40, 28, 58], amb: 0.1, tint: [150, 150, 214], stars: 0.9, moon: 1, sun: 0 },
  { at: 0.565, top: [8, 10, 30], low: [40, 28, 58], amb: 0.1, tint: [150, 150, 214], stars: 0.9, moon: 1, sun: 0 },
  { at: 0.585, top: [84, 136, 198], low: [240, 226, 200], amb: 0.97, tint: [255, 246, 228], stars: 0, moon: 0, sun: 1 },
  { at: 0.69, top: [84, 136, 198], low: [240, 222, 196], amb: 0.95, tint: [255, 242, 222], stars: 0, moon: 0, sun: 1 },
  { at: 0.715, top: [80, 118, 180], low: [255, 214, 156], amb: 0.9, tint: [255, 228, 186], stars: 0, moon: 0, sun: 1 },
  { at: 0.8, top: [66, 90, 156], low: [255, 176, 108], amb: 0.76, tint: [255, 204, 150], stars: 0, moon: 0, sun: 1 },
  { at: 0.848, top: [46, 50, 112], low: [255, 124, 66], amb: 0.52, tint: [255, 160, 112], stars: 0, moon: 0.2, sun: 1 },
  { at: 0.885, top: [20, 20, 62], low: [130, 70, 90], amb: 0.2, tint: [200, 150, 180], stars: 0.5, moon: 0.8, sun: 0 },
  { at: 0.915, ...NIGHT, moon: 1, sun: 0 },
  { at: 1, ...NIGHT, moon: 1, sun: 0 },
];

export function hourAt(p: number): Hour {
  let i = 0;
  while (i < HOURS.length - 2 && p > HOURS[i + 1].at) i++;
  const a = HOURS[i];
  const b = HOURS[i + 1];
  const t = smoothstep(a.at, b.at, p);
  return {
    top: mix(a.top, b.top, t),
    low: mix(a.low, b.low, t),
    amb: lerp(a.amb, b.amb, t),
    tint: mix(a.tint, b.tint, t),
    stars: lerp(a.stars, b.stars, t),
    moon: lerp(a.moon, b.moon, t),
    sun: lerp(a.sun, b.sun, t),
  };
}
