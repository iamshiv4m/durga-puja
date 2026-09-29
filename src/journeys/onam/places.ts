// The places of the Onam strip, drawn in world units (see ./world.ts): the sky and the far hills,
// the ground, the tharavadu with its verandah and shadow screen, the padippura gate, the
// oottupura where the sadya is served, a street of Thrissur below the temple's gopuram, and the
// Pamba with the temple ghat of Aranmula on its far bank.
import { TAU, clamp, glow, glowSprite, lerp, mix, mulberry32, rgb, type Ctx, type RGB, type View } from "../paint";
import { type Env, type Paint, WARM, painter, tone } from "./light";
import { type Hour, RIVER, SCREEN, STREET } from "./world";

export const HALL = { from: -35, to: -11, back: 0, front: 4.3 };
export const TEMPLE = { x: RIVER.temple, w: 7 };
export const WATER = { far: 0, near: 4.6 };
const TILE: RGB = [168, 70, 46];
const TEAK: RGB = [92, 52, 28];
const LIME: RGB = [232, 224, 204];
const LATERITE: RGB = [156, 74, 48];

// ─── Sky ─────────────────────────────────────────────────────────────────────

type Star = { x: number; y: number; r: number; seed: number };
const random = mulberry32(8123);
const STARS: Star[] = Array.from({ length: 240 }, () => ({
  x: random(),
  y: random() ** 1.4,
  r: 0.5 + random() * 1.2,
  seed: random() * 10,
}));
const CLOUDS = Array.from({ length: 9 }, () => ({
  x: -30 + random() * 160,
  y: -2.5 - random() * 4,
  w: 3 + random() * 5,
  seed: random() * 10,
}));

/** The sun's place over the river in the afternoon, sinking into the far palms by the end of the race. */
function sunAt(p: number) {
  const t = clamp((p - 0.7) / 0.15);
  return {
    x: RIVER.temple + 2.5,
    y: lerp(-4.2, -0.9, t),
    a: clamp((p - 0.585) / 0.02) * (1 - clamp((p - 0.862) / 0.012)),
  };
}

export function drawSky(
  ctx: Ctx,
  width: number,
  height: number,
  v: View,
  hour: Hour,
  seconds: number,
  horizon: number,
  unit: number,
  p: number,
) {
  const h = Math.max(horizon, 1);
  const sky = ctx.createLinearGradient(0, Math.min(0, h - height * 1.2), 0, h);
  sky.addColorStop(0, rgb(hour.top));
  sky.addColorStop(0.62, rgb(mix(hour.top, hour.low, 0.45)));
  sky.addColorStop(1, rgb(hour.low));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, Math.min(height, h + 2));
  if (horizon <= 0) return;
  const skyScale = unit * Math.pow(v.scale / unit, 0.4);

  if (hour.stars > 0.01) {
    ctx.fillStyle = "#f4eedc";
    for (const star of STARS) {
      const y = star.y * h * 0.94;
      const twinkle = 0.55 + 0.45 * Math.sin(seconds * (0.7 + star.seed * 0.2) + star.seed * 6);
      ctx.globalAlpha = twinkle * hour.stars * (1 - (y / h) * 0.7) * 0.85;
      const x = (((star.x * width * 1.5 - v.x * skyScale * 0.05) % width) + width) % width;
      ctx.fillRect(x, y, star.r, star.r);
    }
    ctx.globalAlpha = 1;
  }
  if (hour.moon > 0.01) {
    // A moon nearly full, over whichever place we are.
    const mx = width * 0.78 - v.x * skyScale * 0.02;
    const my = Math.min(h * 0.3, horizon - skyScale * 3.6);
    const mr = skyScale * 0.3;
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, glowSprite("190, 200, 255"), mx, my, mr * 9, 0.22 * hour.moon);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(250, 246, 228, ${hour.moon})`;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(200, 196, 180, ${0.3 * hour.moon})`;
    ctx.beginPath();
    ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.25, 0, TAU);
    ctx.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.18, 0, TAU);
    ctx.fill();
  }
  // Monsoon's end: tall white clouds by day, lit gold toward evening.
  const day = 1 - hour.stars;
  if (day > 0.02) {
    for (const c of CLOUDS) {
      const cx = v.ax + (c.x - v.x * 0.12 + seconds * 0.03) * skyScale - v.x * skyScale * 0.0;
      const cy = horizon + c.y * skyScale;
      const w = c.w * skyScale;
      if (cx + w < 0 || cx - w > width) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w);
      const lit = mix(hour.low, [255, 250, 240], 0.55);
      g.addColorStop(0, rgb(lit, 0.5 * day));
      g.addColorStop(0.6, rgb(lit, 0.2 * day));
      g.addColorStop(1, rgb(lit, 0));
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.32 + (c.seed % 1) * 0.1);
      ctx.translate(-cx, -cy);
      ctx.fillRect(cx - w, cy - w, w * 2, w * 2);
      ctx.restore();
    }
  }
  const sun = sunAt(p);
  if (sun.a > 0.01) {
    const sx = v.ax + (sun.x - v.x) * skyScale * 0.6;
    const sy = horizon + sun.y * skyScale;
    const r = skyScale * 0.42;
    const c: RGB = mix([255, 240, 200], [255, 120, 60], clamp((p - 0.76) / 0.09));
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, glowSprite(c.map(Math.round).join(", ")), sx, sy, r * 10, 0.5 * sun.a);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgb(mix(c, [255, 255, 240], 0.5), sun.a);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
  }
}

// ─── The far hills and the palms ─────────────────────────────────────────────

let farPath: Path2D | null = null;
let farPalms: Path2D | null = null;

function ensureFar() {
  if (farPath && farPalms) return { hills: farPath, palms: farPalms };
  const random = mulberry32(4021);
  const hills = new Path2D();
  hills.moveTo(-160, 0.1);
  for (let x = -160; x <= 200; x += 1.5) hills.lineTo(x, -0.9 - Math.sin(x * 0.07) * 0.5 - Math.sin(x * 0.19 + 1) * 0.25 - random() * 0.05);
  hills.lineTo(200, 0.1);
  hills.closePath();
  const palms = new Path2D();
  palms.rect(-160, -0.35, 360, 0.5);
  for (let x = -160; x < 200; x += 0.35 + random() * 0.6) {
    const h = 0.8 + random() * 0.9;
    const lean = (random() - 0.5) * 0.3;
    const tx = x + lean;
    palms.moveTo(x - 0.02, 0);
    palms.lineTo(tx - 0.012, -h);
    palms.lineTo(tx + 0.012, -h);
    palms.lineTo(x + 0.02, 0);
    palms.closePath();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI + (random() - 0.5) * 0.3;
      const len = 0.28 + random() * 0.1;
      const ex = tx + Math.cos(a) * len;
      const ey = -h + Math.sin(a) * len * 0.5 + 0.12;
      palms.moveTo(tx, -h);
      palms.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, -h + Math.sin(a) * len * 0.6 - 0.05, ex, ey);
      palms.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, -h + Math.sin(a) * len * 0.6 - 0.02, tx, -h + 0.02);
    }
    // Bushes and banana plants below.
    if (random() < 0.5) {
      palms.moveTo(x + 0.3, -0.2);
      palms.arc(x + 0.15, -0.25, 0.15 + random() * 0.12, 0, TAU);
    }
  }
  farPath = hills;
  farPalms = palms;
  return { hills, palms };
}

export function drawFar(ctx: Ctx, v: View, hour: Hour, horizon: number, unit: number) {
  if (horizon < -unit * 4 || horizon > v.height + unit * 3) return;
  const { hills, palms } = ensureFar();
  const scale = unit * Math.pow(v.scale / unit, 0.55);
  ctx.save();
  ctx.translate(v.ax - v.x * 0.35 * scale, horizon);
  ctx.scale(scale, scale);
  ctx.fillStyle = rgb(mix(mix(hour.top, hour.low, 0.6), [60, 80, 110], 0.35 + (1 - hour.amb) * 0.3));
  ctx.fill(hills);
  ctx.fillStyle = rgb(mix(mix(hour.low, hour.top, 0.5), [18, 40, 26], 0.62 + (1 - hour.amb) * 0.3));
  ctx.fill(palms);
  ctx.restore();
  const haze = ctx.createLinearGradient(0, horizon - scale * 1.2, 0, horizon);
  haze.addColorStop(0, rgb(hour.low, 0));
  haze.addColorStop(1, rgb(hour.low, 0.35));
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - scale * 1.2, v.width, scale * 1.2);
}

// ─── A coconut palm in the world ─────────────────────────────────────────────

export function drawPalm(ctx: Ctx, x: number, y: number, h: number, lean: number, seconds: number, seed: number, paint: Paint) {
  const tx = x + lean * h;
  const ty = y - h;
  ctx.lineCap = "round";
  ctx.strokeStyle = paint([112, 92, 70]);
  ctx.lineWidth = h * 0.028;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.1, y - h * 0.5, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = paint([80, 64, 48], 0.6);
  ctx.lineWidth = h * 0.004;
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const px = lerp(x, tx, t * t * 0.4 + t * 0.6);
    const py = lerp(y, ty, t);
    ctx.beginPath();
    ctx.moveTo(px - h * 0.014, py);
    ctx.lineTo(px + h * 0.014, py - h * 0.004);
    ctx.stroke();
  }
  const sway = Math.sin(seconds * 0.8 + seed) * 0.05;
  for (let i = 0; i < 13; i++) {
    const a = -Math.PI * 1.05 + (i / 12) * Math.PI * 1.1 + Math.sin(seed * 5 + i) * 0.12 + sway;
    const len = h * (0.3 + ((i * 7 + seed * 3) % 5) * 0.02);
    const droop = 0.35 + Math.abs(Math.cos(a)) * 0.35;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.45 + len * droop;
    const cx = tx + Math.cos(a) * len * 0.55;
    const cy = ty + Math.sin(a) * len * 0.6 - len * 0.12;
    ctx.fillStyle = paint(i % 3 ? [58, 104, 44] : [74, 120, 52]);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    // Leaflets on both sides of the rib, tapering to the tip.
    const n = 9;
    const pts: [number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const bx = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex;
      const by = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey;
      pts.push([bx, by]);
    }
    for (let k = 1; k <= n; k++) {
      const [bx, by] = pts[k];
      const w = len * 0.13 * Math.sin((k / n) * Math.PI) * (k % 2 ? 1 : 0.55);
      ctx.lineTo(bx, by - w);
    }
    for (let k = n; k >= 1; k--) {
      const [bx, by] = pts[k];
      const w = len * 0.1 * Math.sin((k / n) * Math.PI) * (k % 2 ? 0.5 : 1);
      ctx.lineTo(bx, by + w);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = paint([120, 96, 40]);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(tx + (i - 2) * h * 0.018, ty + h * 0.03 + (i % 2) * h * 0.012, h * 0.018, 0, TAU);
    ctx.fill();
  }
}

/** A banana plant: a green stem and a few broad, torn leaves. */
export function drawBanana(ctx: Ctx, x: number, y: number, h: number, seed: number, seconds: number, paint: Paint) {
  ctx.strokeStyle = paint([96, 128, 56]);
  ctx.lineWidth = h * 0.07;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h * 0.55);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.45 + Math.sin(seconds * 0.9 + seed + i) * 0.04;
    const len = h * (0.5 + (i % 2) * 0.1);
    const bx = x;
    const by = y - h * (0.5 + (i % 3) * 0.06);
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len * 0.8 + len * 0.25;
    ctx.fillStyle = paint(i % 2 ? [70, 130, 50] : [90, 150, 60]);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo((bx + ex) / 2 - Math.sin(a) * len * 0.22, (by + ey) / 2 - len * 0.2, ex, ey);
    ctx.quadraticCurveTo((bx + ex) / 2 + Math.sin(a) * len * 0.08, (by + ey) / 2, bx, by + h * 0.03);
    ctx.fill();
  }
}

// ─── The ground ──────────────────────────────────────────────────────────────

export function drawGround(ctx: Ctx, left: number, right: number, env: Env) {
  const paint = painter(env);
  const band = (from: number, to: number, c: RGB, y0 = 0, y1 = 16) => {
    const a = Math.max(from, left - 1);
    const b = Math.min(to, right + 1);
    if (b <= a) return;
    ctx.fillStyle = paint(c);
    ctx.fillRect(a, y0, b - a, y1 - y0);
  };
  band(-200, HALL.from, [160, 124, 88]);
  band(HALL.from, HALL.to, [150, 118, 84]);
  // The mittam, smeared smooth with cow dung, dark enough to make the flowers sing.
  band(HALL.to, STREET.from - 2, [92, 74, 50]);
  band(STREET.from - 2, RIVER.from - 1, [104, 100, 100]);
  band(RIVER.from - 1, 300, [96, 118, 64]);
  // The hall's polished red-oxide floor, the street's pavements, and the river.
  band(HALL.from + 0.5, HALL.to - 0.5, [150, 52, 38], 0, HALL.front);
  band(STREET.from - 2, RIVER.from - 1, [150, 140, 128], 0, 1.1);
  band(STREET.from - 2, RIVER.from - 1, [150, 140, 128], 4.6, 16);
  // Where the mittam meets the street: the padippura's threshold.
  band(STREET.from - 2.2, STREET.from - 1.8, [120, 70, 50]);
  // A line of lane-paint down the middle of the road.
  const a = Math.max(STREET.from - 1, left);
  const b = Math.min(RIVER.from - 2, right);
  if (b > a) {
    ctx.fillStyle = paint([220, 214, 190], 0.22);
    for (let x = Math.floor(a); x < b; x += 2) ctx.fillRect(x, 2.85, 1, 0.05);
  }
}

// ─── The tharavadu ───────────────────────────────────────────────────────────

/**
 * The front of an old Kerala house: a laterite plinth, teak pillars, lime-washed walls, and a
 * great tiled roof with a carved gable. Its verandah holds the shadow screen (drawn by
 * ./shadow.ts; this leaves the place for it). `glow` is the screen's light on the verandah.
 */
export function drawHouse(ctx: Ctx, env: Env, glowLevel: number, lamps: number, seconds: number) {
  const warm = painter({ ...env, tint: WARM }, glowLevel * 0.14);
  const paint = painter(env);
  // The wall behind the verandah, and its doors and windows.
  ctx.fillStyle = warm(LIME);
  ctx.fillRect(-9.2, -6.3, 18.4, 5.7);
  for (const side of [-1, 1]) {
    const cx = side * 6.5;
    ctx.fillStyle = warm(TEAK);
    ctx.fillRect(cx - 0.75, -3.6, 1.5, 2.95);
    ctx.fillStyle = warm(mix(TEAK, [0, 0, 0], 0.3));
    ctx.fillRect(cx - 0.02, -3.6, 0.04, 2.95);
    ctx.fillStyle = warm([214, 170, 80]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ctx.fillRect(cx - 0.45 + c * 0.9 - 0.03, -3.3 + r * 0.7, 0.06, 0.06);
    // A lattice window above.
    ctx.fillStyle = warm(mix(TEAK, [0, 0, 0], 0.45));
    ctx.fillRect(cx - 0.8, -5.5, 1.6, 1.2);
    ctx.strokeStyle = warm(TEAK);
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      ctx.moveTo(cx - 0.8 + (i / 6) * 1.6, -5.5);
      ctx.lineTo(cx - 0.8 + (i / 6) * 1.6, -4.3);
    }
    ctx.stroke();
  }
  // The eaves' shadow, deep under the roof.
  const eaves = ctx.createLinearGradient(0, -6.3, 0, -2.5);
  eaves.addColorStop(0, "rgba(10, 6, 12, 0.55)");
  eaves.addColorStop(1, "rgba(10, 6, 12, 0)");
  ctx.fillStyle = eaves;
  ctx.fillRect(-9.2, -6.3, 18.4, 3.8);
  // The lower wooden panel under the screen.
  ctx.fillStyle = warm(mix(TEAK, [0, 0, 0], 0.2));
  const sl = SCREEN.x - SCREEN.w / 2;
  ctx.fillRect(sl, SCREEN.y + SCREEN.h / 2, SCREEN.w, -0.7 - (SCREEN.y + SCREEN.h / 2));
  ctx.strokeStyle = warm(mix(TEAK, [0, 0, 0], 0.45));
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (let i = 1; i < 12; i++) {
    ctx.moveTo(sl + (i / 12) * SCREEN.w, SCREEN.y + SCREEN.h / 2);
    ctx.lineTo(sl + (i / 12) * SCREEN.w, -0.7);
  }
  ctx.stroke();

  // The plinth: laterite blocks with a granite edge, and steps down to the mittam.
  ctx.fillStyle = paint(LATERITE);
  ctx.fillRect(-9.8, -0.75, 19.6, 0.75);
  ctx.strokeStyle = paint(mix(LATERITE, [40, 20, 10], 0.4), 0.6);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let r = 0; r < 2; r++) {
    for (let x = -9.8 + (r % 2) * 0.35; x < 9.8; x += 0.7) {
      ctx.moveTo(x, -0.75 + r * 0.37);
      ctx.lineTo(x, -0.38 + r * 0.37);
    }
    ctx.moveTo(-9.8, -0.38 + r * 0.37);
    ctx.lineTo(9.8, -0.38 + r * 0.37);
  }
  ctx.stroke();
  ctx.fillStyle = paint([170, 162, 150]);
  ctx.fillRect(-9.9, -0.82, 19.8, 0.1);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = paint(mix([170, 162, 150], LATERITE, i * 0.3));
    ctx.fillRect(-1.3 - i * 0.2, -0.5 + i * 0.25, 2.6 + i * 0.4, 0.27);
  }

  // Teak pillars with their carved capitals and brackets.
  for (const x of [-9, -4.05, 4.05, 9]) {
    ctx.fillStyle = warm(TEAK);
    ctx.fillRect(x - 0.15, -6.25, 0.3, 5.5);
    ctx.fillStyle = warm(mix(TEAK, [255, 220, 170], 0.15));
    ctx.fillRect(x - 0.15, -6.25, 0.08, 5.5);
    ctx.fillStyle = warm(mix(TEAK, [0, 0, 0], 0.3));
    ctx.fillRect(x - 0.24, -1.05, 0.48, 0.3);
    ctx.fillRect(x - 0.24, -6.35, 0.48, 0.25);
    ctx.beginPath();
    ctx.moveTo(x - 0.15, -6.1);
    ctx.quadraticCurveTo(x - 0.7, -6.1, x - 0.9, -6.4);
    ctx.lineTo(x - 0.15, -6.4);
    ctx.moveTo(x + 0.15, -6.1);
    ctx.quadraticCurveTo(x + 0.7, -6.1, x + 0.9, -6.4);
    ctx.lineTo(x + 0.15, -6.4);
    ctx.fill();
  }
  // Brass lamps hanging from the eaves, lit in the evenings.
  for (const x of [-6.5, 6.5]) {
    ctx.strokeStyle = paint([120, 100, 60]);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x, -6.4);
    ctx.lineTo(x, -4.9);
    ctx.stroke();
    ctx.fillStyle = paint([200, 160, 70]);
    ctx.beginPath();
    ctx.moveTo(x - 0.22, -4.9);
    ctx.quadraticCurveTo(x, -4.6, x + 0.22, -4.9);
    ctx.closePath();
    ctx.fill();
    if (lamps > 0.02) {
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite("255, 150, 60"), x, -5.0, 1.3, 0.3 * lamps);
      glow(ctx, glowSprite("255, 210, 140"), x, -5.0, 0.2, 0.9 * lamps * (0.9 + 0.1 * Math.sin(seconds * 11 + x)));
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // The roof: a deep eave, rows of terracotta tiles, and the mukhappu gable at its middle.
  const roof = (l: number, r: number, eave: number, ridge: number, inset: number) => {
    ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.4));
    ctx.fillRect(l, eave, r - l, 0.35);
    ctx.fillStyle = paint(TILE);
    ctx.beginPath();
    ctx.moveTo(l - 0.3, eave);
    ctx.lineTo(r + 0.3, eave);
    ctx.lineTo(r - inset, ridge);
    ctx.lineTo(l + inset, ridge);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = paint(mix(TILE, [40, 16, 10], 0.45), 0.7);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (let y = eave - 0.2; y > ridge; y -= 0.28) {
      ctx.moveTo(l - 1, y);
      ctx.lineTo(r + 1, y);
    }
    ctx.stroke();
    ctx.strokeStyle = paint(mix(TILE, [255, 220, 180], 0.2), 0.35);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let x = l; x < r; x += 0.3) {
      ctx.moveTo(x, eave);
      ctx.lineTo(lerp(x, (l + r) / 2, (eave - ridge) / Math.max(1, (r - l) * 1.4)), ridge);
    }
    ctx.stroke();
    const shade = ctx.createLinearGradient(0, ridge, 0, eave);
    shade.addColorStop(0, "rgba(0, 0, 0, 0.25)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shade;
    ctx.fillRect(l - 1, ridge, r - l + 2, eave - ridge);
    ctx.restore();
    ctx.fillStyle = paint(mix(TILE, [60, 24, 14], 0.3));
    ctx.fillRect(l + inset - 0.1, ridge - 0.12, r - l - inset * 2 + 0.2, 0.14);
  };
  roof(-11, 11, -6.35, -9.4, 3.2);
  // The gable: a triangle of carved teak lattice, with barge boards and a brass finial.
  const gl = -3.3;
  const gr = 3.3;
  const base = -7.9;
  const apex = -10.9;
  ctx.fillStyle = paint(TILE);
  ctx.beginPath();
  ctx.moveTo(gl - 0.7, base + 0.4);
  ctx.lineTo(0, apex - 0.3);
  ctx.lineTo(gr + 0.7, base + 0.4);
  ctx.lineTo(gr, base + 0.4);
  ctx.lineTo(0, apex + 0.2);
  ctx.lineTo(gl, base + 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = warm(mix(TEAK, [0, 0, 0], 0.15));
  ctx.beginPath();
  ctx.moveTo(gl, base);
  ctx.lineTo(0, apex + 0.2);
  ctx.lineTo(gr, base);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = warm(mix(TEAK, [255, 220, 170], 0.25));
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (let x = gl; x <= gr; x += 0.36) {
    ctx.moveTo(x, base);
    ctx.lineTo(x, apex);
  }
  for (let y = base; y > apex; y -= 0.36) {
    ctx.moveTo(gl, y);
    ctx.lineTo(gr, y);
  }
  ctx.stroke();
  ctx.fillStyle = warm(mix(TEAK, [0, 0, 0], 0.4));
  ctx.beginPath();
  ctx.arc(0, base - 0.9, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = warm([214, 170, 80]);
  ctx.beginPath();
  ctx.arc(0, base - 0.9, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = paint(mix(TEAK, [0, 0, 0], 0.3));
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.moveTo(gl - 0.8, base + 0.45);
  ctx.lineTo(0, apex - 0.3);
  ctx.lineTo(gr + 0.8, base + 0.45);
  ctx.stroke();
  ctx.fillStyle = paint([214, 170, 80]);
  ctx.beginPath();
  ctx.moveTo(-0.12, apex - 0.3);
  ctx.quadraticCurveTo(-0.2, apex - 0.7, 0, apex - 1.0);
  ctx.quadraticCurveTo(0.2, apex - 0.7, 0.12, apex - 0.3);
  ctx.fill();
  // The screen's warm light spilling onto the plinth and the mittam.
  if (glowLevel > 0.02) {
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, glowSprite("255, 130, 50"), 0, -1.2, 5.0, 0.15 * glowLevel);
    ctx.globalCompositeOperation = "source-over";
  }
}

/** The compound wall and the padippura, the gatehouse between the house and the street. */
export function drawGate(ctx: Ctx, env: Env) {
  const paint = painter(env);
  ctx.fillStyle = paint(LATERITE);
  ctx.fillRect(9.8, -1.1, 3.4, 1.1);
  ctx.fillRect(-13, -1.1, 3.2, 1.1);
  ctx.fillStyle = paint(TILE);
  ctx.fillRect(9.8, -1.22, 3.4, 0.14);
  ctx.fillRect(-13, -1.22, 3.2, 0.14);
  const x = STREET.from - 3.4;
  ctx.fillStyle = paint(LIME);
  ctx.fillRect(x - 1.5, -2.6, 0.5, 2.6);
  ctx.fillRect(x + 1.0, -2.6, 0.5, 2.6);
  ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.3));
  ctx.fillRect(x - 1.0, -2.6, 2.0, 0.3);
  ctx.fillStyle = paint(TILE);
  ctx.beginPath();
  ctx.moveTo(x - 2.1, -2.5);
  ctx.lineTo(x + 2.1, -2.5);
  ctx.lineTo(x + 1.2, -3.6);
  ctx.lineTo(x - 1.2, -3.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint(LATERITE);
  ctx.fillRect(x + 1.5, -1.1, STREET.from - x - 1.5, 1.1);
}

// ─── The oottupura ───────────────────────────────────────────────────────────

/** The dining hall: its back wall, its roof, the pillars along its open front. */
export function drawHall(ctx: Ctx, env: Env, front: boolean) {
  const paint = painter(env);
  const { from, to } = HALL;
  if (!front) {
    ctx.fillStyle = paint([214, 200, 176]);
    ctx.fillRect(from, -3.4, to - from, 3.4);
    ctx.fillStyle = paint([120, 60, 40]);
    ctx.fillRect(from, -0.5, to - from, 0.5);
    // Windows with wooden bars, looking out on palms.
    for (let x = from + 1.5; x < to - 1; x += 3) {
      ctx.fillStyle = paint([96, 120, 70]);
      ctx.fillRect(x, -2.6, 1.3, 1.3);
      ctx.fillStyle = paint(TEAK);
      for (let i = 0; i <= 5; i++) ctx.fillRect(x + i * 0.25, -2.6, 0.06, 1.3);
      ctx.fillRect(x - 0.08, -2.7, 1.46, 0.1);
      ctx.fillRect(x - 0.08, -1.3, 1.46, 0.1);
    }
    // Rafters, then the roof.
    ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.4));
    ctx.fillRect(from - 0.5, -3.7, to - from + 1, 0.4);
    ctx.fillStyle = paint(TILE);
    ctx.beginPath();
    ctx.moveTo(from - 0.8, -3.65);
    ctx.lineTo(to + 0.8, -3.65);
    ctx.lineTo(to - 1.5, -5.8);
    ctx.lineTo(from + 1.5, -5.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint(mix(TILE, [40, 16, 10], 0.45), 0.7);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (let y = -3.85; y > -5.8; y -= 0.28) {
      const t = (-3.65 - y) / 2.15;
      ctx.moveTo(from - 0.8 + t * 2.3, y);
      ctx.lineTo(to + 0.8 - t * 2.3, y);
    }
    ctx.stroke();
    return;
  }
  // The front pillars, and the deep eave along the top.
  for (let x = from + 0.2; x <= to; x += 4) {
    ctx.fillStyle = paint(TEAK);
    ctx.fillRect(x - 0.12, -3.5, 0.24, 3.5 + HALL.front - 0.1);
    ctx.fillStyle = paint(mix(TEAK, [255, 220, 170], 0.15));
    ctx.fillRect(x - 0.12, -3.5, 0.06, 3.5 + HALL.front - 0.1);
  }
}

// ─── Thrissur ────────────────────────────────────────────────────────────────

const SHOPS = (() => {
  const random = mulberry32(5150);
  const out: { x: number; w: number; h: number; c: RGB; board: RGB }[] = [];
  const colours: RGB[] = [
    [140, 180, 200],
    [230, 200, 120],
    [200, 140, 120],
    [150, 190, 150],
    [236, 226, 200],
    [190, 160, 200],
  ];
  const boards: RGB[] = [
    [200, 40, 40],
    [30, 90, 160],
    [240, 200, 40],
    [30, 120, 70],
  ];
  for (let x = STREET.from; x < STREET.to;) {
    const w = 1.8 + random() * 1.6;
    if (x > STREET.tigers - 4.5 && x < STREET.tigers + 5.5) {
      x = STREET.tigers + 5.5;
      continue;
    }
    out.push({
      x,
      w,
      h: 2.6 + random() * 1.4,
      c: colours[Math.floor(random() * colours.length)],
      board: boards[Math.floor(random() * boards.length)],
    });
    x += w + 0.05;
  }
  return out;
})();

/**
 * The Swaraj Round: shops with tiled roofs on either side, and between them the wall and trees of
 * the Thekkinkadu maidan with the Vadakkunnathan temple's gopuram rising behind.
 */
export function drawStreet(ctx: Ctx, env: Env, left: number, right: number, seconds: number) {
  const paint = painter(env);
  const gx = STREET.tigers + 0.5;
  if (gx + 7 > left && gx - 7 < right) {
    // Big trees of the maidan.
    const random = mulberry32(77);
    for (let i = 0; i < 16; i++) {
      const x = gx - 6 + random() * 12;
      const r = 1 + random() * 0.9;
      ctx.fillStyle = paint(mix([40, 90, 44], [70, 120, 60], random()));
      ctx.beginPath();
      ctx.arc(x, -2.6 - random() * 1.4, r, 0, TAU);
      ctx.fill();
    }
    // The gopuram, farther back and so smaller: a laterite base, white walls, two tiers of copper roof.
    ctx.save();
    ctx.translate(gx, -0.9);
    ctx.scale(0.72, 0.72);
    ctx.translate(-gx, 0);
    ctx.fillStyle = paint(LATERITE);
    ctx.fillRect(gx - 2.2, -2.2, 4.4, 2.2);
    ctx.fillStyle = paint(LIME);
    ctx.fillRect(gx - 1.9, -4.2, 3.8, 2.1);
    ctx.fillStyle = paint([30, 20, 18]);
    ctx.fillRect(gx - 0.6, -2.0, 1.2, 2.0);
    ctx.beginPath();
    ctx.arc(gx, -2.0, 0.6, Math.PI, 0);
    ctx.fill();
    const copper: RGB = [96, 130, 110];
    const tier = (w: number, y: number, h: number) => {
      ctx.fillStyle = paint(copper);
      ctx.beginPath();
      ctx.moveTo(gx - w, y);
      ctx.lineTo(gx + w, y);
      ctx.lineTo(gx + w * 0.55, y - h);
      ctx.lineTo(gx - w * 0.55, y - h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = paint(mix(copper, [255, 255, 255], 0.3), 0.5);
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      for (let x = -w; x <= w; x += 0.25) {
        ctx.moveTo(gx + x, y);
        ctx.lineTo(gx + x * 0.55, y - h);
      }
      ctx.stroke();
    };
    tier(3.0, -4.1, 1.1);
    ctx.fillStyle = paint(TEAK);
    ctx.fillRect(gx - 1.4, -5.6, 2.8, 0.5);
    tier(2.1, -5.5, 1.0);
    ctx.fillStyle = paint([214, 170, 80]);
    for (const dx of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(gx + dx - 0.08, -6.5);
      ctx.quadraticCurveTo(gx + dx, -6.95, gx + dx + 0.08, -6.5);
      ctx.fill();
    }
    ctx.restore();
    // The maidan's wall along the road.
    ctx.fillStyle = paint(LATERITE);
    ctx.fillRect(gx - 7, -0.9, 4.8, 0.9);
    ctx.fillRect(gx + 2.2, -0.9, 4.8, 0.9);
    ctx.fillStyle = paint(LIME);
    ctx.fillRect(gx - 7, -1.0, 4.8, 0.12);
    ctx.fillRect(gx + 2.2, -1.0, 4.8, 0.12);
  }
  for (const s of SHOPS) {
    if (s.x + s.w < left || s.x > right) continue;
    ctx.fillStyle = paint(s.c);
    ctx.fillRect(s.x, -s.h, s.w, s.h);
    ctx.fillStyle = paint(mix(s.c, [0, 0, 0], 0.35));
    ctx.fillRect(s.x + 0.15, -1.3, s.w - 0.3, 1.3);
    ctx.fillStyle = paint([60, 50, 44]);
    for (let x = s.x + 0.15; x < s.x + s.w - 0.2; x += 0.12) ctx.fillRect(x, -1.3, 0.02, 1.3);
    ctx.fillStyle = paint(s.board);
    ctx.fillRect(s.x + 0.2, -1.75, s.w - 0.4, 0.34);
    ctx.fillStyle = paint([250, 246, 236], 0.8);
    ctx.fillRect(s.x + 0.35, -1.62, (s.w - 0.7) * 0.6, 0.08);
    // Upstairs windows with people leaning out to watch.
    ctx.fillStyle = paint(mix(s.c, [0, 0, 0], 0.5));
    ctx.fillRect(s.x + 0.3, -s.h + 0.5, 0.5, 0.6);
    ctx.fillRect(s.x + s.w - 0.8, -s.h + 0.5, 0.5, 0.6);
    ctx.fillStyle = paint(TILE);
    ctx.beginPath();
    ctx.moveTo(s.x - 0.15, -s.h + 0.05);
    ctx.lineTo(s.x + s.w + 0.15, -s.h + 0.05);
    ctx.lineTo(s.x + s.w - 0.4, -s.h - 0.9);
    ctx.lineTo(s.x + 0.4, -s.h - 0.9);
    ctx.closePath();
    ctx.fill();
  }
  // Strings of bunting across the road, fluttering.
  const colours: RGB[] = [
    [230, 50, 50],
    [250, 200, 40],
    [40, 120, 200],
    [40, 160, 90],
    [250, 250, 240],
  ];
  for (let k = 0; k < 2; k++) {
    const y0 = -2.5 + k * 0.55;
    const a = Math.max(STREET.from, left);
    const b = Math.min(STREET.to, right);
    for (let x = Math.floor(a * 2.5) / 2.5; x < b; x += 0.4) {
      const sag = Math.sin(((x - STREET.from) / 6) * Math.PI) * 0.35;
      const y = y0 + Math.abs(sag);
      const flap = Math.sin(seconds * 4 + x * 3) * 0.05;
      ctx.fillStyle = paint(colours[Math.floor(x * 2.5 + k) % colours.length]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.3, y);
      ctx.lineTo(x + 0.15 + flap, y + 0.34);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ─── The Pamba ───────────────────────────────────────────────────────────────

export function drawRiverBack(ctx: Ctx, env: Env, hour: Hour, left: number, right: number, seconds: number, p: number) {
  const paint = painter(env);
  if (right < RIVER.from - 3) return;
  // The far bank, a line of green over the water.
  ctx.fillStyle = paint([70, 104, 58]);
  ctx.fillRect(Math.max(RIVER.from - 2, left - 1), -0.5, right - Math.max(RIVER.from - 2, left - 1) + 2, 0.55);
  // The temple on the far bank, its lamps lit toward evening.
  const tx = TEMPLE.x;
  if (tx + 8 > left && tx - 8 < right) {
    const lamps = clamp((p - 0.8) / 0.03);
    drawTemple(ctx, painter({ ...env, tint: WARM }, lamps * 0.12), tx, lamps, seconds);
    // The steps of the kadavu.
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = paint(mix([176, 166, 150], LATERITE, i * 0.15));
      ctx.fillRect(tx - 5 + i * 0.12, -0.45 + i * 0.12, 10 - i * 0.24, 0.13);
    }
    // Oil lamps along the ghat.
    if (lamps > 0.02) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 16; i++) {
        const x = tx - 5.5 + i * 0.73;
        glow(ctx, glowSprite("255, 170, 70"), x, -1.25, 0.5, 0.5 * lamps * (0.9 + 0.1 * Math.sin(seconds * 9 + i)));
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }
  void hour;
}

/** The water: a sky-coloured sheet, darker toward us, with the far bank mirrored and streaming ripples. */
export function drawWater(ctx: Ctx, env: Env, hour: Hour, left: number, right: number, seconds: number, flow: number) {
  const a = Math.max(RIVER.from, left - 1);
  const b = right + 1;
  if (b <= a) return;
  // The embankment where the road ends at the river.
  if (a < RIVER.from + 1) {
    ctx.fillStyle = rgb(tone([150, 90, 60], env));
    ctx.beginPath();
    ctx.moveTo(RIVER.from - 1.2, WATER.far - 0.05);
    ctx.lineTo(RIVER.from + 0.3, WATER.far - 0.05);
    ctx.lineTo(RIVER.from - 0.6, WATER.near + 0.2);
    ctx.lineTo(RIVER.from - 2.2, WATER.near + 0.2);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, WATER.far, 0, WATER.near);
  g.addColorStop(0, rgb(tone(mix(hour.low, [60, 90, 80], 0.45), env)));
  g.addColorStop(0.12, rgb(tone([34, 64, 56], env)));
  g.addColorStop(0.5, rgb(tone(mix(hour.top, [40, 70, 70], 0.5), env)));
  g.addColorStop(1, rgb(tone([26, 48, 46], env)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(RIVER.from + 0.3, WATER.far);
  ctx.lineTo(b, WATER.far);
  ctx.lineTo(b, WATER.near);
  ctx.lineTo(RIVER.from - 0.6, WATER.near);
  ctx.closePath();
  ctx.fill();
  // The sun's glitter, low in the afternoon.
  ctx.globalCompositeOperation = "lighter";
  const random = mulberry32(31);
  const glint = rgb(mix(hour.tint, [255, 255, 255], 0.3), 1);
  ctx.fillStyle = glint;
  for (let i = 0; i < 220; i++) {
    const y = WATER.far + 0.1 + random() ** 1.3 * (WATER.near - 0.2);
    const span = b - a + 6;
    const x = a - 3 + ((((random() * 200 - seconds * flow * (0.3 + y * 0.12)) % span) + span) % span);
    const on = 0.5 + 0.5 * Math.sin(seconds * (1.2 + random()) + i);
    ctx.globalAlpha = on * 0.16 * hour.amb;
    ctx.fillRect(x, y, 0.2 + y * 0.08, 0.018 + y * 0.004);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  // The near bank.
  ctx.fillStyle = rgb(tone([84, 108, 58], env));
  ctx.fillRect(a, WATER.near, b - a, 12);
  ctx.fillStyle = rgb(tone([120, 100, 70], env));
  ctx.fillRect(a, WATER.near, b - a, 0.12);
}

// ─── Snake boats ─────────────────────────────────────────────────────────────

export type Boat = {
  x: number;
  y: number;
  scale: number;
  seed: number;
  umbrella: RGB;
};

/**
 * A chundan vallam in profile, heading +x: a long, low black hull, its stern (the amaram) swept up
 * behind like a cobra's hood, a brass finial and a flag on it, and a muthukkuda on the stern.
 * Returns the waterline's ends, for the rowers.
 */
export function drawHull(ctx: Ctx, boat: Boat, env: Env, seconds: number) {
  const paint = painter(env);
  const L = 11 * boat.scale;
  const s = boat.scale;
  const x0 = boat.x - L / 2;
  const x1 = boat.x + L / 2;
  const y = boat.y;
  ctx.save();
  const bob = Math.sin(seconds * 1.6 + boat.seed) * 0.02 * s;
  ctx.translate(0, bob);
  // The hull.
  ctx.fillStyle = paint([22, 18, 18]);
  ctx.beginPath();
  ctx.moveTo(x1 + 0.4 * s, y - 0.22 * s);
  ctx.quadraticCurveTo(x1 - 1 * s, y + 0.14 * s, x0 + 2 * s, y + 0.12 * s);
  // The stern rising up and curling over.
  ctx.quadraticCurveTo(x0 - 0.2 * s, y + 0.05 * s, x0 - 0.9 * s, y - 1.4 * s);
  ctx.quadraticCurveTo(x0 - 1.1 * s, y - 2.3 * s, x0 - 0.5 * s, y - 2.5 * s);
  ctx.lineTo(x0 - 0.45 * s, y - 2.3 * s);
  ctx.quadraticCurveTo(x0 - 0.8 * s, y - 1.9 * s, x0 - 0.2 * s, y - 1.0 * s);
  ctx.quadraticCurveTo(x0 + 0.6 * s, y - 0.3 * s, x0 + 2 * s, y - 0.16 * s);
  ctx.lineTo(x1 - 1 * s, y - 0.16 * s);
  ctx.closePath();
  ctx.fill();
  // A band of brass and white along the gunwale.
  ctx.strokeStyle = paint([214, 176, 90]);
  ctx.lineWidth = 0.04 * s;
  ctx.beginPath();
  ctx.moveTo(x0 - 0.3 * s, y - 1.2 * s);
  ctx.quadraticCurveTo(x0 + 0.5 * s, y - 0.2 * s, x0 + 2 * s, y - 0.13 * s);
  ctx.lineTo(x1 - 0.8 * s, y - 0.13 * s);
  ctx.lineTo(x1 + 0.35 * s, y - 0.2 * s);
  ctx.stroke();
  // The finial and the flag at the top of the stern.
  ctx.fillStyle = paint([226, 186, 90]);
  ctx.beginPath();
  ctx.arc(x0 - 0.5 * s, y - 2.55 * s, 0.09 * s, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paint([200, 190, 170]);
  ctx.lineWidth = 0.025 * s;
  ctx.beginPath();
  ctx.moveTo(x0 - 0.5 * s, y - 2.55 * s);
  ctx.lineTo(x0 - 0.5 * s, y - 3.4 * s);
  ctx.stroke();
  const flap = Math.sin(seconds * 5 + boat.seed) * 0.06 * s;
  ctx.fillStyle = paint([210, 40, 40]);
  ctx.beginPath();
  ctx.moveTo(x0 - 0.5 * s, y - 3.4 * s);
  ctx.quadraticCurveTo(x0 - 1.0 * s, y - 3.3 * s + flap, x0 - 1.5 * s, y - 3.25 * s - flap);
  ctx.lineTo(x0 - 0.5 * s, y - 3.0 * s);
  ctx.fill();
  // The bow wave and the wake.
  ctx.strokeStyle = paint([230, 240, 236], 0.7);
  ctx.lineWidth = 0.03 * s;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const w = (seconds * 1.5 + i / 3) % 1;
    ctx.moveTo(x1 + 0.3 * s - w * 0.6 * s, y + 0.02 * s + w * 0.1 * s);
    ctx.lineTo(x1 - 0.4 * s - w * 1.4 * s, y + 0.1 * s + w * 0.25 * s);
  }
  ctx.moveTo(x0 + 1 * s, y + 0.12 * s);
  ctx.lineTo(x0 - 1.8 * s, y + 0.2 * s);
  ctx.stroke();
  ctx.restore();
  return { from: x0 + 1.6 * s, to: x1 - 1.2 * s, y: y - 0.1 * s + bob };
}

// ─── The Aranmula temple ─────────────────────────────────────────────────────

/**
 * A Kerala temple seen across the river: a laterite compound wall with a whitewashed coping, the
 * two-storeyed gopuram at its gate under a tiled roof and a copper one above it, each with its
 * carved mukhappu gable and gold finials; the deepastambham, a tiered lamp tower, to one side and
 * the gold dwajasthambham, the flagstaff, to the other. `lamps` lights them at dusk.
 */
function drawTemple(ctx: Ctx, paint: Paint, tx: number, lamps: number, seconds: number) {
  const base = -1.2;
  const copper: RGB = [86, 128, 104];
  const lights: [number, number][] = [];
  // The compound wall, laterite blocks under a whitewashed coping and a line of tiles.
  ctx.fillStyle = paint(LATERITE);
  ctx.fillRect(tx - 7.5, base - 0.75, 15, 0.75);
  ctx.strokeStyle = paint(mix(LATERITE, [40, 20, 10], 0.4), 0.55);
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  for (let r = 0; r < 2; r++) {
    const y = base - 0.75 + r * 0.37;
    ctx.moveTo(tx - 7.5, y);
    ctx.lineTo(tx + 7.5, y);
    for (let x = tx - 7.5 + (r % 2) * 0.3; x < tx + 7.5; x += 0.6) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 0.37);
    }
  }
  ctx.stroke();
  ctx.fillStyle = paint(LIME);
  ctx.fillRect(tx - 7.6, base - 0.9, 15.2, 0.16);
  ctx.fillStyle = paint(TILE);
  ctx.fillRect(tx - 7.7, base - 0.98, 15.4, 0.09);

  // The gopuram, scaled into the distance about its foot.
  ctx.save();
  ctx.translate(tx, base);
  ctx.scale(0.8, 0.8);
  // Ground storey: laterite below, whitewash above, the doorway in the middle.
  ctx.fillStyle = paint(LATERITE);
  ctx.fillRect(-2.2, -0.9, 4.4, 0.9);
  ctx.fillStyle = paint(LIME);
  ctx.fillRect(-2.2, -1.75, 4.4, 0.85);
  ctx.fillStyle = paint(mix(LIME, [120, 110, 100], 0.25));
  ctx.fillRect(-2.2, -0.95, 4.4, 0.06);
  ctx.fillStyle = paint(TEAK);
  ctx.fillRect(-0.7, -1.55, 1.4, 1.55);
  ctx.fillStyle = paint([30, 18, 14]);
  ctx.fillRect(-0.55, -1.42, 1.1, 1.42);
  ctx.fillStyle = paint([214, 170, 80]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ctx.fillRect(-0.36 + c * 0.64, -1.25 + r * 0.3, 0.07, 0.07);
  // Teak lattice panels either side of the door.
  for (const side of [-1, 1]) {
    const x0 = side * 1.45 - 0.45;
    ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.4));
    ctx.fillRect(x0, -1.6, 0.9, 0.55);
    ctx.strokeStyle = paint(TEAK);
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    for (let k = 0; k <= 5; k++) {
      ctx.moveTo(x0 + k * 0.18, -1.6);
      ctx.lineTo(x0 + k * 0.18, -1.05);
    }
    ctx.stroke();
  }
  // A sloping roof: a trapezoid of tile or copper sheet, its courses, and a gable at its middle.
  const roof = (w: number, top: number, bottom: number, inset: number, c: RGB, sheet: boolean) => {
    ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.45));
    ctx.fillRect(-w / 2 + 0.3, bottom - 0.02, w - 0.6, 0.12);
    ctx.fillStyle = paint(c);
    ctx.beginPath();
    ctx.moveTo(-w / 2, bottom);
    ctx.quadraticCurveTo(-w / 2 + inset * 0.35, (top + bottom) / 2 + 0.05, -w / 2 + inset, top);
    ctx.lineTo(w / 2 - inset, top);
    ctx.quadraticCurveTo(w / 2 - inset * 0.35, (top + bottom) / 2 + 0.05, w / 2, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = paint(mix(c, sheet ? [220, 240, 220] : [40, 16, 10], 0.35), 0.55);
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    if (sheet) {
      for (let x = -w / 2; x < w / 2; x += 0.22) {
        ctx.moveTo(x, bottom);
        ctx.lineTo(x * (1 - (inset * 2) / w), top);
      }
    } else {
      for (let y = bottom - 0.14; y > top; y -= 0.14) {
        ctx.moveTo(-w / 2, y);
        ctx.lineTo(w / 2, y);
      }
    }
    ctx.stroke();
    const shade = ctx.createLinearGradient(0, top, 0, bottom);
    shade.addColorStop(0, "rgba(0, 0, 0, 0.22)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shade;
    ctx.fillRect(-w / 2, top, w, bottom - top);
    ctx.restore();
    ctx.fillStyle = paint(mix(c, [30, 20, 14], 0.35));
    ctx.fillRect(-w / 2 + inset - 0.05, top - 0.06, w - inset * 2 + 0.1, 0.08);
  };
  // The mukhappu: a triangle of carved teak lattice under barge boards, projecting from the roof.
  const gable = (w: number, foot: number, apex: number) => {
    ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.15));
    ctx.beginPath();
    ctx.moveTo(-w / 2, foot);
    ctx.lineTo(0, apex);
    ctx.lineTo(w / 2, foot);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = paint(mix(TEAK, [255, 220, 170], 0.3));
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (let x = -w / 2; x <= w / 2; x += 0.12) {
      ctx.moveTo(x, foot);
      ctx.lineTo(x, apex);
    }
    for (let y = foot; y > apex; y -= 0.12) {
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = paint(mix(TEAK, [0, 0, 0], 0.35));
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 0.12, foot + 0.05);
    ctx.lineTo(0, apex - 0.06);
    ctx.lineTo(w / 2 + 0.12, foot + 0.05);
    ctx.stroke();
    ctx.fillStyle = paint([214, 170, 80]);
    ctx.beginPath();
    ctx.arc(0, (foot + apex) / 2 + 0.05, 0.07, 0, TAU);
    ctx.fill();
  };
  const finial = (x: number, y: number, s: number) => {
    // The thazhikakudam: a stack of gold pots on the ridge.
    ctx.fillStyle = paint([226, 180, 80]);
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.12, s * 0.14, s * 0.12, 0, 0, TAU);
    ctx.ellipse(x, y - s * 0.34, s * 0.1, s * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.05, y - s * 0.4);
    ctx.quadraticCurveTo(x, y - s * 0.75, x + s * 0.05, y - s * 0.4);
    ctx.fill();
  };
  roof(6.2, -2.55, -1.72, 1.1, TILE, false);
  gable(1.5, -2.2, -2.85);
  // The upper storey: a band of lattice behind the lower roof.
  ctx.fillStyle = paint(mix(TEAK, [0, 0, 0], 0.3));
  ctx.fillRect(-1.6, -3.05, 3.2, 0.52);
  ctx.strokeStyle = paint(TEAK);
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let x = -1.6; x <= 1.6; x += 0.16) {
    ctx.moveTo(x, -3.05);
    ctx.lineTo(x, -2.55);
  }
  ctx.stroke();
  roof(4.4, -3.75, -3.0, 1.2, copper, true);
  gable(1.1, -3.4, -3.95);
  for (const x of [-0.8, 0, 0.8]) finial(x, -3.8, x ? 0.55 : 0.75);
  ctx.restore();

  // The deepastambham: a stone pillar of stacked rings, every rim set with wicks.
  const dx = tx - 5.0;
  ctx.fillStyle = paint([120, 112, 100]);
  ctx.fillRect(dx - 0.35, base - 0.2, 0.7, 0.2);
  ctx.fillRect(dx - 0.25, base - 0.32, 0.5, 0.12);
  const rings = 8;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const y = base - 0.45 - t * 2.2;
    const r = lerp(0.42, 0.14, t);
    ctx.fillStyle = paint([104, 96, 86]);
    ctx.fillRect(dx - 0.06, y, 0.12, 0.3);
    ctx.fillStyle = paint([140, 130, 116]);
    ctx.beginPath();
    ctx.ellipse(dx, y, r, r * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = paint([90, 82, 74]);
    ctx.beginPath();
    ctx.ellipse(dx, y + r * 0.08, r, r * 0.16, 0, 0, Math.PI);
    ctx.fill();
    const n = Math.max(3, Math.round(r * 16));
    for (let k = 0; k < n; k++) {
      const a = Math.PI * (0.08 + (0.84 * k) / (n - 1));
      lights.push([dx - Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.2 - 0.01]);
    }
  }
  ctx.fillStyle = paint([140, 130, 116]);
  ctx.beginPath();
  ctx.moveTo(dx - 0.1, base - 2.68);
  ctx.quadraticCurveTo(dx, base - 3.0, dx + 0.1, base - 2.68);
  ctx.fill();

  // The dwajasthambham: a gold-sheathed flagstaff on a stepped base, ringed, with its crown.
  const fx = tx + 5.3;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = paint(mix([150, 140, 126], LATERITE, i * 0.2));
    ctx.fillRect(fx - 0.5 + i * 0.12, base - 0.18 - i * 0.16, 1 - i * 0.24, 0.18);
  }
  const gold: RGB = [222, 178, 78];
  const top = base - 5.6;
  ctx.fillStyle = paint(gold);
  ctx.beginPath();
  ctx.moveTo(fx - 0.11, base - 0.48);
  ctx.lineTo(fx - 0.06, top);
  ctx.lineTo(fx + 0.06, top);
  ctx.lineTo(fx + 0.11, base - 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint(mix(gold, [255, 250, 220], 0.35));
  ctx.fillRect(fx - 0.05, top, 0.03, base - 0.48 - top);
  ctx.fillStyle = paint(mix(gold, [80, 50, 20], 0.35));
  for (let y = base - 0.8; y > top; y -= 0.34) ctx.fillRect(fx - 0.13, y, 0.26, 0.05);
  ctx.fillStyle = paint(gold);
  ctx.fillRect(fx - 0.3, top - 0.08, 0.6, 0.1);
  for (const d of [-0.24, 0, 0.24]) {
    ctx.beginPath();
    ctx.ellipse(fx + d, top - 0.2, 0.06, 0.12, 0, 0, TAU);
    ctx.fill();
  }
  // Little bells hanging from the crown.
  for (const d of [-0.26, 0.26]) {
    ctx.beginPath();
    ctx.arc(fx + d, top + 0.12, 0.035, 0, TAU);
    ctx.fill();
  }

  // The lamps, lit at dusk.
  if (lamps > 0.02) {
    ctx.fillStyle = `rgba(255, 214, 140, ${Math.min(1, lamps * 1.4)})`;
    for (const [x, y] of lights) {
      ctx.beginPath();
      ctx.ellipse(x, y - 0.025, 0.018, 0.035, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    const sprite = glowSprite("255, 160, 60");
    for (const [i, [x, y]] of lights.entries())
      glow(ctx, sprite, x, y - 0.03, 0.2, 0.55 * lamps * (0.85 + 0.15 * Math.sin(seconds * 7 + i)));
    glow(ctx, glowSprite("255, 150, 60"), dx, base - 1.5, 2.4, 0.3 * lamps);
    ctx.globalCompositeOperation = "source-over";
  }
}
