// The shared frame of the Navratri journey: where things stand, when they happen, and the camera.
//
// The world is a chowk in a Gujarat pol, seen with a simple tilting camera. Ground points are
// (X, Z), X to the right and Z towards the viewer, with height H going up. The camera looks down
// at `pitch` (0 is level, π/2 straight down), so a point projects to (X, Z·sin − H·cos): the
// ground opens up as the camera rises, and standing things shorten, until the garba is seen from
// overhead. The mandvi stands at the origin, the houses at the back, the maidan off to the right.
import { lerp, mix, smoothstep, type RGB } from "../paint";

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  soil: 0.088,
  sow: 0.098,
  kalash: 0.112,
  coconut: 0.126,
  jyot: 0.14,
  aarti: [0.15, 0.205],
  dusk: [0.19, 0.28],
  procession: [0.215, 0.3],
  placed: 0.302,
  lamps: [0.352, 0.448],
  circle: [0.4, 0.585],
  overhead: [0.505, 0.56],
  dandiya: [0.6, 0.72],
  peak: 0.685,
  hush: 0.722,
  dashami: [0.725, 0.77],
  bow: 0.785,
  arrow: 0.808,
  burn: [0.81, 0.865],
  home: [0.87, 0.95],
} as const;

export const PLACES = {
  /** The mandvi's platform, centred on the origin. */
  mandvi: { half: 0.8, deck: 0.34, roof: 2.6, top: 3.55 },
  backRow: -8,
  maidan: 40,
  ravana: { x: 40, z: -1.5, h: 11 },
  ram: { x: 34.2, z: 2.4 },
  shami: { x: 30.5, z: -3.2 },
  stall: { x: 48.5, z: 1.5 },
  chabutro: { x: -7.2, z: -4.4 },
  band: { x: -7.4, z: -0.6 },
  /** The garba's rings, inner to outer; the reader's dancers join the last. */
  rings: [2.3, 3.4, 4.5, 5.5],
} as const;

/** How a camera looks: its focus on the ground and above it, zoom, and how far down it tilts. */
export type Cam = { x: number; z: number; h: number; zoom: number; pitch: number };
export type CamShot = Cam & { at: number };

export const SHOTS: CamShot[] = [
  { at: 0.0, x: 0, z: 0, h: 2.4, zoom: 0.6, pitch: 0.3 },
  { at: 0.065, x: 0, z: 0.3, h: 1.5, zoom: 0.85, pitch: 0.32 },
  { at: 0.115, x: 0.15, z: 0.62, h: 0.62, zoom: 2.9, pitch: 0.38 },
  { at: 0.19, x: 0.15, z: 0.62, h: 0.7, zoom: 2.55, pitch: 0.36 },
  { at: 0.245, x: 4, z: 1.4, h: 1.25, zoom: 1.0, pitch: 0.3 },
  { at: 0.298, x: 0.1, z: 0.1, h: 1.25, zoom: 1.75, pitch: 0.3 },
  { at: 0.33, x: 0.1, z: 0.1, h: 1.35, zoom: 1.6, pitch: 0.3 },
  { at: 0.38, x: 0, z: -1.2, h: 4.4, zoom: 0.8, pitch: 0.2 },
  { at: 0.448, x: 0.3, z: -1.2, h: 4.2, zoom: 0.84, pitch: 0.22 },
  { at: 0.5, x: 0, z: 0.4, h: 1.0, zoom: 0.66, pitch: 0.42 },
  { at: 0.56, x: 0, z: 0, h: 0.4, zoom: 0.72, pitch: 1.2 },
  { at: 0.6, x: 0, z: 0, h: 0.4, zoom: 0.74, pitch: 1.24 },
  { at: 0.645, x: -1.2, z: 2.6, h: 1.0, zoom: 1.25, pitch: 0.42 },
  { at: 0.712, x: -0.8, z: 2.4, h: 1.0, zoom: 1.15, pitch: 0.4 },
  { at: 0.748, x: 20, z: 0, h: 7, zoom: 0.34, pitch: 0.16 },
  { at: 0.778, x: 40, z: 0, h: 5.2, zoom: 0.52, pitch: 0.18 },
  { at: 0.862, x: 40.2, z: 0, h: 5.0, zoom: 0.5, pitch: 0.2 },
  { at: 0.905, x: 20, z: 0, h: 7, zoom: 0.33, pitch: 0.16 },
  { at: 0.95, x: 0.1, z: 0.6, h: 0.72, zoom: 2.2, pitch: 0.36 },
  { at: 1.0, x: 0.1, z: 0.6, h: 0.72, zoom: 2.45, pitch: 0.36 },
];

/** Phones hold the same story in a narrow frame above the captions: wide shots pull back. */
export const PORTRAIT_SHOTS: CamShot[] = [
  { at: 0.0, x: 0, z: 0, h: 2.6, zoom: 0.46, pitch: 0.3 },
  { at: 0.065, x: 0, z: 0.3, h: 1.6, zoom: 0.7, pitch: 0.32 },
  { at: 0.115, x: 0.1, z: 0.62, h: 0.7, zoom: 2.2, pitch: 0.38 },
  { at: 0.19, x: 0.1, z: 0.62, h: 0.78, zoom: 2.0, pitch: 0.36 },
  { at: 0.245, x: 3.2, z: 1.4, h: 1.3, zoom: 0.85, pitch: 0.3 },
  { at: 0.298, x: 0, z: 0.1, h: 1.35, zoom: 1.35, pitch: 0.3 },
  { at: 0.33, x: 0, z: 0.1, h: 1.45, zoom: 1.25, pitch: 0.3 },
  { at: 0.38, x: 0, z: -1.2, h: 4.2, zoom: 0.5, pitch: 0.2 },
  { at: 0.448, x: 0.3, z: -1.2, h: 4.1, zoom: 0.52, pitch: 0.22 },
  { at: 0.5, x: 0, z: 0.4, h: 1.4, zoom: 0.42, pitch: 0.42 },
  { at: 0.56, x: 0, z: 0, h: 0.4, zoom: 0.5, pitch: 1.2 },
  { at: 0.6, x: 0, z: 0, h: 0.4, zoom: 0.52, pitch: 1.24 },
  { at: 0.645, x: -0.6, z: 2.6, h: 1.1, zoom: 0.9, pitch: 0.42 },
  { at: 0.712, x: -0.4, z: 2.4, h: 1.1, zoom: 0.85, pitch: 0.4 },
  { at: 0.748, x: 20, z: 0, h: 7, zoom: 0.24, pitch: 0.16 },
  { at: 0.778, x: 39.2, z: 0, h: 5.6, zoom: 0.36, pitch: 0.18 },
  { at: 0.862, x: 39.4, z: 0, h: 5.4, zoom: 0.35, pitch: 0.2 },
  { at: 0.905, x: 20, z: 0, h: 7, zoom: 0.24, pitch: 0.16 },
  { at: 0.95, x: 0.05, z: 0.6, h: 0.8, zoom: 1.7, pitch: 0.36 },
  { at: 1.0, x: 0.05, z: 0.6, h: 0.8, zoom: 1.9, pitch: 0.36 },
];

/** Eases between the shots either side of `p`, holding still at each one. */
export function camera(shots: CamShot[], p: number): Cam {
  let i = 0;
  while (i < shots.length - 2 && p > shots[i + 1].at) i++;
  const a = shots[i];
  const b = shots[i + 1];
  const t = smoothstep(a.at, b.at, p);
  return {
    x: lerp(a.x, b.x, t),
    z: lerp(a.z, b.z, t),
    h: lerp(a.h, b.h, t),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)),
    pitch: lerp(a.pitch, b.pitch, t),
  };
}

/** The tilt of the camera, as the two factors every projection needs. */
export type Tilt = { s: number; c: number };

export type Keys<T> = [number, T][];

/** Reads a keyed track at `p`, easing between neighbours. */
export function track(keys: Keys<number>, p: number): number;
export function track(keys: Keys<RGB>, p: number): RGB;
export function track(keys: Keys<number | RGB>, p: number): number | RGB {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
  const [a, va] = keys[i];
  const [b, vb] = keys[i + 1];
  const t = smoothstep(a, b, p);
  if (typeof va === "number") return lerp(va, vb as number, t);
  return mix(va, vb as RGB, t);
}

/**
 * Seconds per pulse of the garba's 6/8 (twelve pulses to a cycle of three claps and a turn): an
 * easy walk for the procession, and quicker every night until the dandiya's last rounds.
 */
const PULSE: Keys<number> = [
  [0.2, 0.27],
  [0.34, 0.25],
  [0.46, 0.225],
  [0.6, 0.168],
  [0.7, 0.122],
  [0.72, 0.118],
];
export const pulse = (p: number) => track(PULSE, p);

/** Which night it is, 1 to 10 (Dashami), for the moon and the jawara. */
export function night(p: number) {
  return 1 + 8 * smoothstep(0.3, 0.72, p) + smoothstep(0.72, 0.77, p);
}

/** How much the garba circle is dancing, 0..1. */
export const dancing = (p: number) => smoothstep(0.395, 0.42, p) * (1 - smoothstep(0.72, 0.74, p));
/** From garba to dandiya: 0 is the one big circle, 1 the two facing rings of pairs. */
export const pairing = (p: number) => smoothstep(0.598, 0.63, p);
