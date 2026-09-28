// Drawing helpers shared by the festival scenes: a 2D camera that eases between shots as the
// scroll moves, cached glow sprites for additive light, and a flickering flame.
import { lerp, smoothstep } from "@/lib/math";

export { mulberry32, smoothstep, lerp, clamp, TAU } from "@/lib/math";

export type Ctx = CanvasRenderingContext2D;

/** Where the camera looks (world units) and how close it is, at scroll progress `at`. */
export type Shot = { at: number; x: number; y: number; zoom: number };

export type View = {
  /** Screen position of the camera's focus. */
  ax: number;
  ay: number;
  /** World focus. */
  x: number;
  y: number;
  /** Pixels per world unit. */
  scale: number;
  width: number;
  height: number;
};

/** Eases between the shots either side of `p`, holding still at each one. */
export function shot(shots: Shot[], p: number) {
  let i = 0;
  while (i < shots.length - 2 && p > shots[i + 1].at) i++;
  const a = shots[i];
  const b = shots[i + 1];
  const t = smoothstep(a.at, b.at, p);
  // Zoom eases in log space, so a long pull back feels even all the way.
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)) };
}

/**
 * Sets up `ctx` so that world units draw at `scale` px around the focus. `unit` is px per world
 * unit at zoom 1; `anchorY` is where the focus sits on screen (lower on phones, whose captions
 * take the bottom).
 */
export function view(width: number, height: number, focus: { x: number; y: number; zoom: number }, unit: number, anchorY = 0.5): View {
  return { ax: width / 2, ay: height * anchorY, x: focus.x, y: focus.y, scale: unit * focus.zoom, width, height };
}

export function apply(ctx: Ctx, v: View) {
  ctx.translate(v.ax, v.ay);
  ctx.scale(v.scale, v.scale);
  ctx.translate(-v.x, -v.y);
}

export function toScreen(v: View, x: number, y: number) {
  return { x: v.ax + (x - v.x) * v.scale, y: v.ay + (y - v.y) * v.scale };
}

export function toWorld(v: View, x: number, y: number) {
  return { x: v.x + (x - v.ax) / v.scale, y: v.y + (y - v.ay) / v.scale };
}

/** True if a world circle at (x, y) with radius r is at least partly on screen. */
export function onScreen(v: View, x: number, y: number, r: number) {
  const s = toScreen(v, x, y);
  const pr = r * v.scale;
  return s.x + pr > 0 && s.x - pr < v.width && s.y + pr > 0 && s.y - pr < v.height;
}

const sprites = new Map<string, HTMLCanvasElement>();

/** A soft radial glow of `color` ("r, g, b"), drawn once and reused. */
export function glowSprite(color: string, size = 128) {
  const key = `${color}/${size}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    const g = sprite.getContext("2d")!;
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${color}, 1)`);
    gradient.addColorStop(0.18, `rgba(${color}, 0.55)`);
    gradient.addColorStop(0.5, `rgba(${color}, 0.14)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    sprites.set(key, sprite);
  }
  return sprite;
}

/** Adds light: call inside `globalCompositeOperation = "lighter"`. */
export function glow(ctx: Ctx, sprite: HTMLCanvasElement, x: number, y: number, radius: number, alpha: number) {
  if (alpha <= 0.002 || radius <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

/** How much a flame flickers at `seconds`, around 1. */
export function flicker(seconds: number, seed: number) {
  return 1 + 0.07 * Math.sin(seconds * 13 + seed * 7.1) + 0.05 * Math.sin(seconds * 29.3 + seed * 3.7) + 0.03 * Math.sin(seconds * 5 + seed);
}

/** A lamp flame standing on (x, y), `height` tall, bending a little in the air. */
export function flame(ctx: Ctx, x: number, y: number, height: number, seconds: number, seed: number) {
  const h = height * flicker(seconds, seed);
  const w = height * 0.36;
  const lean = Math.sin(seconds * 2.3 + seed * 5) * w * 0.25;
  const tip = { x: x + lean, y: y - h };
  const outer = ctx.createLinearGradient(x, y, x, tip.y);
  outer.addColorStop(0, "rgba(255, 120, 30, 0.95)");
  outer.addColorStop(0.5, "rgba(255, 170, 60, 0.95)");
  outer.addColorStop(1, "rgba(255, 210, 120, 0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.18);
  ctx.bezierCurveTo(x - w / 2, y + h * 0.05, x + w / 2, y + h * 0.05, x + w / 2, y - h * 0.18);
  ctx.bezierCurveTo(x + w / 2, y - h * 0.5, tip.x + w * 0.05, tip.y + h * 0.25, tip.x, tip.y);
  ctx.bezierCurveTo(tip.x - w * 0.05, tip.y + h * 0.25, x - w / 2, y - h * 0.5, x - w / 2, y - h * 0.18);
  ctx.fill();
  // The white-hot heart of it.
  ctx.fillStyle = "rgba(255, 248, 220, 0.95)";
  ctx.beginPath();
  ctx.ellipse(x + lean * 0.3, y - h * 0.22, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export type RGB = [number, number, number];

export function rgb([r, g, b]: RGB, alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** 0 before `from`, 1 after `to`, eased between. */
export const rise = (p: number, from: number, to: number) => smoothstep(from, to, p);
