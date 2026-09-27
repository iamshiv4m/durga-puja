// The layout every painting style shares: the face's outline, the hairline, the crown, where
// the eyes sit, and the relief height built from them. Keeping these fixed means the
// Chokkhu Daan brush, the sindoor and the third eye land correctly on every style.
import { TAU, clamp, mulberry32 } from "@/lib/math";

export const S = 1024;
export const RES = 2048;
export const CX = 512;

// ─── Shapes shared by the painting and the relief ─────────────────────────────

/** Half-width of the face at height y: a broad brow, full cheeks and a small rounded chin. */
export const FACE_PROFILE: [number, number][] = [
  [296, 176],
  [330, 204],
  [420, 216],
  [520, 222],
  [600, 212],
  [670, 188],
  [730, 150],
  [775, 104],
  [805, 58],
  [818, 0],
];
export const FACE_TOP = FACE_PROFILE[0][0];
export const FACE_BOTTOM = FACE_PROFILE[FACE_PROFILE.length - 1][0];

export function faceHalfWidth(y: number) {
  if (y < FACE_TOP || y > FACE_BOTTOM) return 0;
  for (let i = 0; i < FACE_PROFILE.length - 1; i++) {
    const [y0, w0] = FACE_PROFILE[i];
    const [y1, w1] = FACE_PROFILE[i + 1];
    if (y <= y1) {
      const t = (y - y0) / (y1 - y0);
      const eased = t * t * (3 - 2 * t);
      // Round off the chin rather than letting it come to a point.
      return i === FACE_PROFILE.length - 2 ? w0 * Math.sqrt(1 - t * t) : w0 + (w1 - w0) * eased;
    }
  }
  return 0;
}

/** The hairline: low at the temples, high in the middle where the parting is. */
export const hairline = (x: number) => 338 + 92 * ((x - CX) / 205) ** 2;

export const CROWN_TOP = 34;
export const CROWN_BASE = 340;
export const CROWN_HALF = 272;

export function crownHalfWidth(y: number) {
  const t = clamp((y - CROWN_TOP) / (CROWN_BASE - CROWN_TOP - 40));
  return CROWN_HALF * Math.pow(Math.sin((t * Math.PI) / 2), 0.5);
}

export const EYES = [
  { cx: 410, cy: 468, dir: -1 as const },
  { cx: 614, cy: 468, dir: 1 as const },
];

// ─── Drawing helpers ──────────────────────────────────────────────────────────

export type Ctx = CanvasRenderingContext2D;

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
}

export function dot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ellipse(ctx, x, y, r, r);
  ctx.fill();
}

export function facePath(ctx: Ctx) {
  ctx.beginPath();
  for (let y = FACE_TOP; y <= FACE_BOTTOM; y += 2) ctx.lineTo(CX + faceHalfWidth(y), y);
  for (let y = FACE_BOTTOM; y >= FACE_TOP; y -= 2) ctx.lineTo(CX - faceHalfWidth(y), y);
  ctx.closePath();
}

export function crownPath(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(CX, CROWN_TOP);
  for (let y = CROWN_TOP; y <= CROWN_BASE; y += 2) ctx.lineTo(CX + crownHalfWidth(y), y);
  ctx.quadraticCurveTo(CX, CROWN_BASE + 30, CX - crownHalfWidth(CROWN_BASE), CROWN_BASE);
  for (let y = CROWN_BASE; y >= CROWN_TOP; y -= 2) ctx.lineTo(CX - crownHalfWidth(y), y);
  ctx.closePath();
}

export function radial(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A tapered brush stroke along a quadratic curve, thick in the middle, fine at both ends. */
export function taperedStroke(ctx: Ctx, from: [number, number], ctrl: [number, number], to: [number, number], width: number, color: string) {
  const steps = 40;
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t * t * to[0];
    const y = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t * t * to[1];
    const dx = 2 * (1 - t) * (ctrl[0] - from[0]) + 2 * t * (to[0] - ctrl[0]);
    const dy = 2 * (1 - t) * (ctrl[1] - from[1]) + 2 * t * (to[1] - ctrl[1]);
    const len = Math.hypot(dx, dy) || 1;
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * clamp(t * 0.92 + 0.04)), 0.7);
    top.push([x - (dy / len) * w, y + (dx / len) * w]);
    bottom.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  bottom.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Canvas grain and faint brush texture. Draw with `source-atop` to keep it inside the paint. */
export function drawGrain(ctx: Ctx, amount = 0.35) {
  const tile = document.createElement("canvas");
  tile.width = 256;
  tile.height = 256;
  const tctx = tile.getContext("2d")!;
  const image = tctx.createImageData(256, 256);
  const random = mulberry32(77);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 128 + (random() - 0.5) * 90;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = amount;
  ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();
}

// ─── Relief ───────────────────────────────────────────────────────────────────

export const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);

/** Relief height (0..1) at a painting pixel, shaped to match `drawPlaceholderAlbedo`. */
export function reliefHeight(x: number, y: number): number {
  let h = 0;

  // Hair: a rounded mass behind the head, thinner where it falls to the shoulders.
  if (y > 250) {
    const spread = y < 640 ? 338 * Math.sin(clamp((y - 250) / 390) * (Math.PI / 2)) ** 0.5 : 338 + (y - 640) * 0.14;
    const u = Math.abs(x - CX) / Math.max(spread, 1);
    if (u < 1) h = 0.14 + 0.16 * Math.sqrt(1 - u * u) * (y < 700 ? 1 : 0.5);
  }

  if (y > 884) h = Math.max(h, 0.24 - 0.06 * ((y - 884) / 140) + 0.05 * gauss(x, y, CX, 910, 240, 50));
  if (y > 736 && y < 900 && Math.abs(x - CX) < 84 + (y - 740) * 0.12) {
    h = Math.max(h, 0.33 + 0.08 * Math.sqrt(Math.max(0, 1 - ((x - CX) / 110) ** 2)));
  }

  const hw = faceHalfWidth(y);
  if (hw > 0 && Math.abs(x - CX) < hw) {
    const u = (x - CX) / hw;
    const v = (y - 560) / 270;
    let f = 0.3 + 0.42 * Math.sqrt(1 - u * u) * (1 - 0.25 * v * v);
    // The nose: a ridge that grows from the brow to a rounded tip.
    const t = clamp((y - 450) / 165);
    f += 0.15 * Math.pow(t, 1.15) * Math.exp(-(((x - CX) / (14 + 18 * t)) ** 2)) * (y < 620 ? 1 : Math.exp(-(((y - 620) / 13) ** 2)));
    f += 0.05 * Math.exp(-(((y - 424) / 20) ** 2)) * Math.exp(-(((x - CX) / 200) ** 2));
    for (const { cx } of EYES) {
      f -= 0.045 * gauss(x, y, cx, 470, 92, 40);
      f += 0.03 * gauss(x, y, cx, 462, 60, 26);
      f += 0.04 * gauss(x, y, CX + (cx - CX) * 1.2, 604, 70, 60);
    }
    f += 0.035 * gauss(x, y, CX, 690, 50, 15);
    f += 0.035 * gauss(x, y, CX, 772, 56, 34);
    f += 0.02 * gauss(x, y, CX, 392, 14, 30);
    // Where the hair covers the brow it sits a little proud of the skin.
    if (y < hairline(x)) f += 0.02;
    h = Math.max(h, f);
  }

  if (y >= CROWN_TOP && y <= CROWN_BASE + 24 && Math.abs(x - CX) <= crownHalfWidth(Math.min(y, CROWN_BASE))) {
    const r = Math.hypot(x - CX, y - CROWN_BASE);
    const tiers = 0.03 * Math.cos(((r - 64) / 50) * TAU);
    const c = 0.42 + tiers + 0.06 * gauss(x, y, CX, 220, 36, 60) - 0.07 * (1 - clamp(r / 330));
    h = Math.max(h, c);
  }

  for (const ex of [286, 738]) h = Math.max(h, 0.48 * gauss(x, y, ex, 640, 30, 48));
  if (y > 740 && Math.abs(x - CX) < 260 && h > 0.2) {
    for (const r of [150, 196, 244]) h += 0.045 * Math.exp(-(((Math.hypot(x - CX, y - 724) - r) / 13) ** 2));
    h += 0.04 * Math.exp(-(((y - 830) / 10) ** 2)) * (Math.abs(x - CX) < 86 ? 1 : 0);
  }

  return clamp(h);
}
