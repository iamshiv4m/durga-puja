// How the hour colours everything: a base colour pulled toward the night's blue in the dark and
// toward the sun's tint by day; `lift` is extra light from a lamp or the shadow screen nearby.
import { clamp, mix, rgb, type RGB } from "../paint";
import type { Hour } from "./world";

export type Env = { amb: number; tint: RGB; night: RGB };

/** Lamplight's tint. */
export const WARM: RGB = [255, 196, 140];

export const envOf = (hour: Hour): Env => ({
  amb: hour.amb,
  tint: hour.tint,
  night: [8, 8, 24],
});

export function tone(base: RGB, env: Env, lift = 0): RGB {
  const dark = mix(base, env.night, 0.86);
  const day = mix(base, env.tint, 0.12);
  return mix(dark, day, clamp(env.amb + lift));
}

export type Paint = (base: RGB, alpha?: number) => string;

/** A painter for one place and moment: `paint([r, g, b])` gives the lit CSS colour. */
export const painter =
  (env: Env, lift = 0): Paint =>
  (base, alpha = 1) =>
    rgb(tone(base, env, lift), alpha);

const caches = new Map<string, HTMLCanvasElement>();

/** Paints something once into an offscreen canvas and reuses it. */
export function cached(key: string, width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  let canvas = caches.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    draw(canvas.getContext("2d")!);
    caches.set(key, canvas);
  }
  return canvas;
}

/** A CSS font family from one of the page's next/font variables, for text drawn in the scene. */
export function fontOf(variable: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}
