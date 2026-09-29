// The things of Pongal, painted in code: the new clay pot on its hearth with the turmeric tied
// round its neck and the sugarcane over it, the banana leaf laid for Surya, the kuthuvilakku, the
// Bhogi fire, and the houses of the street with their thinnai and their red and white stripes.
import { TAU, clamp, flicker, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import { GOLD, paint, type Env } from "./people";

const caches = new Map<string, HTMLCanvasElement>();

/** Paints something once into an offscreen canvas and reuses it. */
export function cached(key: string, width: number, height: number, draw: (g: Ctx) => void) {
  let canvas = caches.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d")!);
    caches.set(key, canvas);
  }
  return canvas;
}

const CLAY: RGB = [192, 92, 48];
const MILK: RGB = [250, 246, 234];

// ─── Sugarcane and turmeric ─────────────────────────────────────────────────

/** A stalk of sugarcane from (x0, y0) at the root to (x1, y1), jointed, with its leaves at the top. */
export function drawCane(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, env: Env, lift = 0, leaves = true, seed = 1, sway = 0) {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const angle = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  g.addColorStop(0, paint([150, 70, 96], env, lift + 0.1));
  g.addColorStop(0.45, paint([112, 44, 72], env, lift));
  g.addColorStop(1, paint([70, 26, 46], env, lift));
  ctx.fillStyle = g;
  ctx.fillRect(0, -width / 2, length, width);
  // The joints, pale and ringed.
  const joints = Math.max(3, Math.round(length / (width * 5)));
  ctx.fillStyle = paint([200, 176, 120], env, lift, 0.8);
  for (let i = 1; i < joints; i++) ctx.fillRect((i / joints) * length - width * 0.08, -width / 2, width * 0.16, width);
  ctx.restore();
  if (!leaves) return;
  // Long leaves arching out from the top.
  const random = mulberry32(seed * 977);
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const a = angle + (random() - 0.5) * 2.4 + sway * (0.5 + random() * 0.5);
    const l = width * (9 + random() * 7);
    const bend = (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.6);
    const mx = x1 + Math.cos(a) * l * 0.5;
    const my = y1 + Math.sin(a) * l * 0.5;
    ctx.strokeStyle = paint(mix([70, 130, 50], [140, 170, 70], random()), env, lift);
    ctx.lineWidth = width * 0.55;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my - l * 0.2, mx + Math.cos(a + bend) * l * 0.5, my + Math.sin(a + bend) * l * 0.5 + l * 0.15);
    ctx.stroke();
  }
}

/** A whole turmeric plant, pulled up with its rhizome: broad leaves on a stem, `size` tall. */
export function drawTurmeric(ctx: Ctx, x: number, y: number, size: number, angle: number, env: Env, lift = 0, seed = 1) {
  const random = mulberry32(seed * 131);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  // The rhizome, knobbly and orange-brown.
  ctx.fillStyle = paint([196, 128, 50], env, lift);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-0.06 + i * 0.04, 0.02 + random() * 0.03, 0.05, 0.03, random() * 1.5, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = paint([120, 150, 70], env, lift);
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -0.45);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const base = -0.2 - i * 0.08;
    const tilt = side * (0.25 + random() * 0.3);
    ctx.save();
    ctx.translate(0, base);
    ctx.rotate(tilt);
    const g = ctx.createLinearGradient(-0.08, 0, 0.08, 0);
    g.addColorStop(0, paint([56, 120, 44], env, lift));
    g.addColorStop(1, paint([100, 160, 64], env, lift + 0.05));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(0.12, -0.15, 0.1, -0.45, 0, -0.62);
    ctx.bezierCurveTo(-0.1, -0.45, -0.12, -0.15, 0, 0);
    ctx.fill();
    ctx.strokeStyle = paint([150, 190, 110], env, lift, 0.6);
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -0.6);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ─── The pot and the hearth ─────────────────────────────────────────────────

/** Three stones for the hearth, the fire between them, and firewood pushed in from the front. */
export function drawHearth(ctx: Ctx, x: number, y: number, size: number, fire: number, seconds: number, env: Env, lift: number, onLight: (x: number, y: number, r: number, a: number) => void) {
  const s = size;
  // The wood, ends glowing where they burn.
  ctx.lineCap = "round";
  for (const [dx, a, l] of [
    [-0.12, 0.1, 0.9],
    [0.08, -0.12, 0.85],
    [0.0, 0.02, 1.0],
  ]) {
    ctx.save();
    ctx.translate(x + dx * s, y - 0.1 * s);
    ctx.rotate(a);
    ctx.strokeStyle = paint([92, 60, 38], env, lift);
    ctx.lineWidth = 0.08 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, l * 0.6 * s);
    ctx.stroke();
    ctx.restore();
  }
  // Flames, licking up round the pot's belly.
  if (fire > 0.01) {
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const fx = x + lerp(-0.34, 0.34, t) * s;
      const h = s * (0.35 + 0.25 * Math.sin(t * Math.PI)) * fire * flicker(seconds, i * 1.3) * (0.8 + 0.3 * Math.sin(seconds * (7 + i) + i));
      tongue(ctx, fx, y - 0.08 * s, h, 0.14 * s, seconds, i);
    }
    onLight(x, y - 0.25 * s, 2.2 * s * (0.6 + fire * 0.6), 0.55 * fire);
    onLight(x, y - 0.12 * s, 0.6 * s, 0.9 * fire);
  }
  // The three stones: rough, blackened on top from use.
  for (const dx of [-0.46, 0, 0.46]) {
    const sx = x + dx * s;
    const sy = y - (dx === 0 ? -0.04 : 0) * s;
    const g = ctx.createLinearGradient(sx, sy - 0.3 * s, sx, sy);
    g.addColorStop(0, paint([60, 48, 40], env, lift + fire * 0.3));
    g.addColorStop(1, paint([150, 120, 96], env, lift + fire * 0.2));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - 0.13 * s, sy);
    ctx.lineTo(sx - 0.11 * s, sy - 0.26 * s);
    ctx.quadraticCurveTo(sx, sy - 0.32 * s, sx + 0.11 * s, sy - 0.26 * s);
    ctx.lineTo(sx + 0.13 * s, sy);
    ctx.closePath();
    ctx.fill();
  }
}

/** One tongue of flame, `h` tall, standing on (x, y). */
export function tongue(ctx: Ctx, x: number, y: number, h: number, w: number, seconds: number, seed: number) {
  const lean = Math.sin(seconds * 3.1 + seed * 2.3) * w * 0.6;
  const layers: [string, number, number][] = [
    ["rgba(230, 70, 20, 0.85)", 1, 1],
    ["rgba(255, 150, 40, 0.9)", 0.72, 0.7],
    ["rgba(255, 226, 140, 0.95)", 0.4, 0.4],
  ];
  for (const [colour, hs, ws] of layers) {
    const th = h * hs;
    const tw = w * ws;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x - tw, y);
    ctx.bezierCurveTo(x - tw, y - th * 0.5, x + lean * 0.5 - tw * 0.2, y - th * 0.7, x + lean, y - th);
    ctx.bezierCurveTo(x + lean * 0.5 + tw * 0.4, y - th * 0.6, x + tw, y - th * 0.4, x + tw, y);
    ctx.closePath();
    ctx.fill();
  }
}

export type PotState = {
  /** How far through heating the milk is, 0..1; 1 is boiling. */
  boil: number;
  /** How far the foam has come over the rim and down the sides, 0..1. */
  spill: number;
};

/**
 * The new clay pongal pot, `size` across the belly, standing on (x, y): sandal and kumkum on its
 * belly, a turmeric plant tied round its neck, and the milk rising.
 */
export function drawPot(ctx: Ctx, x: number, y: number, size: number, state: PotState, seconds: number, env: Env, lift: number, seed = 1) {
  const s = size;
  const rimY = y - 0.98 * s;
  const rimW = 0.3 * s;
  // The turmeric plant's leaves stand up behind the neck.
  drawTurmeric(ctx, x - 0.12 * s, rimY + 0.16 * s, 0.75 * s, -0.35, env, lift, seed);
  drawTurmeric(ctx, x + 0.16 * s, rimY + 0.16 * s, 0.7 * s, 0.4, env, lift, seed + 1);

  // Belly, shoulder and neck.
  const g = ctx.createRadialGradient(x - 0.18 * s, y - 0.62 * s, 0.05 * s, x, y - 0.45 * s, 0.62 * s);
  g.addColorStop(0, paint(mix(CLAY, [255, 190, 130], 0.35), env, lift + 0.1));
  g.addColorStop(0.6, paint(CLAY, env, lift));
  g.addColorStop(1, paint(mix(CLAY, [40, 14, 8], 0.5), env, lift));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rimW * 0.9, rimY + 0.1 * s);
  ctx.bezierCurveTo(x - 0.62 * s, y - 0.72 * s, x - 0.6 * s, y - 0.1 * s, x - 0.2 * s, y - 0.02 * s);
  ctx.quadraticCurveTo(x, y + 0.02 * s, x + 0.2 * s, y - 0.02 * s);
  ctx.bezierCurveTo(x + 0.6 * s, y - 0.1 * s, x + 0.62 * s, y - 0.72 * s, x + rimW * 0.9, rimY + 0.1 * s);
  ctx.closePath();
  ctx.fill();
  // Soot creeping up from the fire.
  const soot = ctx.createLinearGradient(x, y, x, y - 0.4 * s);
  soot.addColorStop(0, `rgba(20, 10, 6, ${0.55 * state.boil + 0.1})`);
  soot.addColorStop(1, "rgba(20, 10, 6, 0)");
  ctx.fillStyle = soot;
  ctx.fill();

  // Three stripes of sandal paste across the belly with dots of kumkum, and a band of white dots.
  ctx.lineCap = "round";
  ctx.strokeStyle = paint([240, 222, 170], env, lift + 0.15, 0.9);
  ctx.lineWidth = 0.028 * s;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 0.2 * s, y - (0.55 - i * 0.07) * s);
    ctx.quadraticCurveTo(x, y - (0.52 - i * 0.07) * s, x + 0.2 * s, y - (0.55 - i * 0.07) * s);
    ctx.stroke();
  }
  ctx.fillStyle = paint([210, 30, 40], env, lift + 0.15);
  ctx.beginPath();
  ctx.arc(x, y - 0.46 * s, 0.035 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint([244, 236, 216], env, lift + 0.15, 0.9);
  for (let i = 0; i < 11; i++) {
    const a = lerp(-1.1, 1.1, i / 10);
    ctx.beginPath();
    ctx.arc(x + Math.sin(a) * 0.46 * s, y - 0.72 * s + Math.cos(a) * 0.04 * s, 0.014 * s, 0, TAU);
    ctx.fill();
  }

  // The thread tying the turmeric on, and the rim.
  ctx.strokeStyle = paint([240, 200, 40], env, lift + 0.2);
  ctx.lineWidth = 0.02 * s;
  ctx.beginPath();
  ctx.ellipse(x, rimY + 0.14 * s, rimW * 0.92, 0.04 * s, 0, 0, Math.PI);
  ctx.stroke();
  ctx.fillStyle = paint(mix(CLAY, [255, 200, 150], 0.2), env, lift + 0.1);
  ctx.beginPath();
  ctx.ellipse(x, rimY, rimW * 1.12, 0.07 * s, 0, 0, TAU);
  ctx.fill();

  // Milk inside, then the foam rising over the rim and running down.
  const boil = state.boil;
  ctx.fillStyle = paint(mix(MILK, [230, 200, 150], 0.25), env, lift + 0.2);
  ctx.beginPath();
  ctx.ellipse(x, rimY, rimW * 0.95, 0.05 * s, 0, 0, TAU);
  ctx.fill();
  if (boil > 0.05) {
    const random = mulberry32(seed * 71 + Math.floor(seconds * 8));
    const dome = clamp((boil - 0.55) / 0.45) * 0.18 * s + state.spill * 0.14 * s;
    ctx.fillStyle = paint(MILK, env, lift + 0.3);
    ctx.beginPath();
    ctx.ellipse(x, rimY - dome * 0.3, rimW * (0.95 + state.spill * 0.25), 0.05 * s + dome, 0, Math.PI, TAU);
    ctx.fill();
    // Bubbles on the top of it.
    const count = Math.floor(4 + boil * 10 + state.spill * 10);
    for (let i = 0; i < count; i++) {
      const bx = x + (random() - 0.5) * rimW * 1.8 * (1 + state.spill * 0.3);
      const bt = Math.abs(bx - x) / (rimW * (1 + state.spill * 0.3));
      const by = rimY - (0.05 * s + dome) * Math.sqrt(Math.max(0, 1 - bt * bt)) * 0.8;
      ctx.beginPath();
      ctx.arc(bx, by, (0.02 + random() * 0.035) * s * (0.5 + boil * 0.5), 0, TAU);
      ctx.fill();
    }
    if (state.spill > 0.01) {
      // Foam spilling down the sides, in runs of different lengths.
      const runs = [-0.95, -0.7, -0.35, 0.1, 0.45, 0.75, 1.0];
      runs.forEach((r, i) => {
        const len = state.spill * (0.25 + ((i * 37) % 10) / 16) * s;
        const rx = x + r * rimW * 1.05;
        const out = Math.abs(r) * 0.22 * s;
        ctx.strokeStyle = paint(MILK, env, lift + 0.3, 0.95);
        ctx.lineWidth = (0.05 + ((i * 13) % 5) / 100) * s;
        ctx.beginPath();
        ctx.moveTo(rx, rimY);
        ctx.quadraticCurveTo(rx + Math.sign(r) * out, rimY + len * 0.4, rx + Math.sign(r) * out * 1.3, rimY + len);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx + Math.sign(r) * out * 1.3, rimY + len, ctx.lineWidth * 0.62, 0, TAU);
        ctx.fillStyle = paint(MILK, env, lift + 0.3);
        ctx.fill();
      });
    }
  }
}

// ─── The offering to Surya ──────────────────────────────────────────────────

/** A banana leaf laid on the ground, `length` long, its tip to +x, seen from above at a slant. */
export function drawLeaf(ctx: Ctx, x: number, y: number, length: number, env: Env, lift: number, squash = 0.4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(length, length * squash);
  const g = ctx.createLinearGradient(0, -0.3, 0, 0.3);
  g.addColorStop(0, paint([60, 130, 50], env, lift));
  g.addColorStop(0.5, paint([96, 164, 64], env, lift + 0.05));
  g.addColorStop(1, paint([48, 110, 42], env, lift));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.24);
  ctx.bezierCurveTo(-0.1, -0.32, 0.3, -0.3, 0.52, -0.02);
  ctx.bezierCurveTo(0.3, 0.26, -0.1, 0.3, -0.5, 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = paint([170, 200, 110], env, lift, 0.8);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.5, 0);
  ctx.lineTo(0.5, -0.02);
  ctx.stroke();
  ctx.strokeStyle = paint([130, 180, 90], env, lift, 0.35);
  ctx.lineWidth = 0.006;
  for (let i = 0; i < 16; i++) {
    const t = -0.46 + i * 0.06;
    ctx.beginPath();
    ctx.moveTo(t, 0);
    ctx.lineTo(t + 0.06, -0.25);
    ctx.moveTo(t, 0);
    ctx.lineTo(t + 0.06, 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

/** A heap of sakkarai pongal, brown with jaggery, shining with ghee, cashews and raisins in it. */
export function drawPongalHeap(ctx: Ctx, x: number, y: number, width: number, env: Env, lift: number, sweet = true) {
  const w = width;
  const base: RGB = sweet ? [168, 100, 40] : [236, 222, 180];
  const g = ctx.createRadialGradient(x - w * 0.15, y - w * 0.3, w * 0.02, x, y - w * 0.15, w * 0.55);
  g.addColorStop(0, paint(mix(base, [255, 230, 160], 0.4), env, lift + 0.2));
  g.addColorStop(1, paint(base, env, lift));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.45, y - w * 0.45, x + w * 0.45, y - w * 0.45, x + w / 2, y);
  ctx.quadraticCurveTo(x, y + w * 0.08, x - w / 2, y);
  ctx.fill();
  const random = mulberry32(Math.round(x * 100));
  for (let i = 0; i < 9; i++) {
    const px = x + (random() - 0.5) * w * 0.7;
    const py = y - random() * w * 0.26;
    if (i % 3 === 0) {
      ctx.fillStyle = paint([240, 220, 170], env, lift + 0.2);
      ctx.beginPath();
      ctx.arc(px, py, w * 0.03, 0.3, Math.PI + 0.3);
      ctx.fill();
    } else {
      ctx.fillStyle = paint(sweet ? [80, 30, 30] : [60, 50, 40], env, lift);
      ctx.beginPath();
      ctx.arc(px, py, w * 0.018, 0, TAU);
      ctx.fill();
    }
  }
}

export function drawBananas(ctx: Ctx, x: number, y: number, size: number, env: Env, lift: number) {
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(x + i * size * 0.14, y - i * size * 0.02);
    ctx.rotate(-0.2 + i * 0.12);
    ctx.fillStyle = paint(mix([236, 200, 50], [200, 170, 40], i / 4), env, lift + 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.28, size * 0.62, -size * 0.1);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.12, 0, size * 0.06);
    ctx.fill();
    ctx.fillStyle = paint([70, 50, 20], env, lift);
    ctx.fillRect(-size * 0.03, -size * 0.01, size * 0.05, size * 0.05);
    ctx.restore();
  }
}

/** Half a coconut, broken open for the offering. */
export function drawCoconut(ctx: Ctx, x: number, y: number, r: number, env: Env, lift: number) {
  ctx.fillStyle = paint([120, 76, 40], env, lift);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = paint([250, 246, 236], env, lift + 0.2);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.92, r * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint([150, 100, 56], env, lift);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.66, r * 0.2, 0, 0, TAU);
  ctx.fill();
}

/** The kuthuvilakku: a tall brass lamp, five wicks burning in its bowl, the annam on top. */
export function drawKuthuvilakku(ctx: Ctx, x: number, y: number, h: number, lit: number, seconds: number, env: Env, lift: number, onLight: (x: number, y: number, r: number, a: number) => void) {
  const brass = (extra = 0) => paint(GOLD, env, lift + 0.2 + lit * 0.3 + extra);
  const g = ctx.createLinearGradient(x - h * 0.1, 0, x + h * 0.1, 0);
  g.addColorStop(0, paint(mix(GOLD, [80, 50, 10], 0.5), env, lift + lit * 0.3));
  g.addColorStop(0.4, brass(0.2));
  g.addColorStop(1, paint(mix(GOLD, [80, 50, 10], 0.3), env, lift + lit * 0.3));
  ctx.fillStyle = g;
  // Base, stem with rings, the bowl, and the swan.
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.03, h * 0.16, h * 0.04, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - h * 0.1, y - h * 0.09, h * 0.2, h * 0.06);
  ctx.fillRect(x - h * 0.025, y - h * 0.72, h * 0.05, h * 0.64);
  for (const t of [0.2, 0.42, 0.62]) {
    ctx.beginPath();
    ctx.ellipse(x, y - h * t, h * 0.045, h * 0.018, 0, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - h * 0.17, y - h * 0.74);
  ctx.quadraticCurveTo(x, y - h * 0.62, x + h * 0.17, y - h * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - h * 0.02, y - h * 0.94, h * 0.04, h * 0.2);
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.97, h * 0.05, h * 0.035, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + h * 0.03, y - h * 0.99);
  ctx.quadraticCurveTo(x + h * 0.07, y - h * 1.06, x + h * 0.05, y - h * 1.1);
  ctx.lineTo(x + h * 0.08, y - h * 1.09);
  ctx.quadraticCurveTo(x + h * 0.1, y - h * 1.02, x + h * 0.05, y - h * 0.96);
  ctx.fill();
  if (lit < 0.01) return;
  for (let i = 0; i < 5; i++) {
    const fx = x + lerp(-0.15, 0.15, i / 4) * h;
    const fy = y - h * 0.75;
    const fh = h * 0.13 * lit * flicker(seconds, i * 2.1);
    ctx.fillStyle = "rgba(255, 170, 60, 0.95)";
    ctx.beginPath();
    ctx.moveTo(fx - h * 0.022, fy);
    ctx.quadraticCurveTo(fx - h * 0.02, fy - fh * 0.6, fx + Math.sin(seconds * 3 + i) * h * 0.01, fy - fh);
    ctx.quadraticCurveTo(fx + h * 0.02, fy - fh * 0.6, fx + h * 0.022, fy);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 246, 210, 0.95)";
    ctx.beginPath();
    ctx.ellipse(fx, fy - fh * 0.25, h * 0.008, fh * 0.2, 0, 0, TAU);
    ctx.fill();
    onLight(fx, fy - fh * 0.4, h * 0.35, 0.35 * lit);
  }
  onLight(x, y - h * 0.8, h * 1.6, 0.18 * lit);
}

// ─── The street ─────────────────────────────────────────────────────────────

export type House = {
  x: number;
  width: number;
  wall: RGB;
  /** Terracotta tiles, or coconut-frond thatch. */
  roof: "tile" | "thatch";
  door: RGB;
  /** Red and white stripes on the thinnai, the kaavi. */
  stripes: boolean;
  height: number;
  seed: number;
};

/**
 * A village house seen from the street: the raised thinnai either side of the steps with its
 * pillars, the sloping roof over it, the carved door, barred windows, and, from Bhogi on, the
 * kaappu of neem, avaram and poolai tied at the eave. `lamp` is the lamp lit inside the door.
 */
export function drawHouse(ctx: Ctx, h: House, env: Env, lift: number, fresh: number, kaappu: number, lamp: number, seconds: number, onLight: (x: number, y: number, r: number, a: number) => void) {
  const { x, width: w, height: H } = h;
  const left = x - w / 2;
  const right = x + w / 2;
  const plinth = 0.55;
  const eave = H - 0.45;
  const wall = mix(h.wall, [255, 252, 244], fresh * 0.35);
  // The back wall.
  ctx.fillStyle = paint(mix(wall, [0, 0, 0], 0.18), env, lift);
  ctx.fillRect(left, -H, w, H - plinth + 0.01);
  // Grime low on it that the whitewash covers.
  if (fresh < 0.98) {
    const grime = ctx.createLinearGradient(0, -plinth, 0, -plinth - 1.2);
    grime.addColorStop(0, paint([90, 76, 60], env, lift, 0.4 * (1 - fresh)));
    grime.addColorStop(1, paint([90, 76, 60], env, lift, 0));
    ctx.fillStyle = grime;
    ctx.fillRect(left, -plinth - 1.2, w, 1.2);
  }
  // A band of kaavi along the foot of the wall.
  ctx.fillStyle = paint([176, 58, 36], env, lift);
  ctx.fillRect(left, -plinth - 0.18, w, 0.18);

  // The door, open onto the lamp inside, in a frame painted round with kaavi.
  const dw = 1.0;
  const dh = 2.0;
  ctx.fillStyle = paint([176, 58, 36], env, lift);
  ctx.fillRect(x - dw / 2 - 0.16, -plinth - dh - 0.2, dw + 0.32, dh + 0.2);
  ctx.fillStyle = paint(h.door, env, lift);
  ctx.fillRect(x - dw / 2 - 0.08, -plinth - dh - 0.1, dw + 0.16, dh + 0.1);
  const inside = ctx.createRadialGradient(x, -plinth - 0.6, 0.05, x, -plinth - 0.9, 1.4);
  inside.addColorStop(0, rgb(mix([20, 12, 8], [255, 196, 110], lamp)));
  inside.addColorStop(0.6, rgb(mix([12, 8, 6], [150, 80, 36], lamp)));
  inside.addColorStop(1, rgb(mix([8, 6, 5], [50, 24, 12], lamp)));
  ctx.fillStyle = inside;
  ctx.fillRect(x - dw / 2, -plinth - dh, dw, dh);
  if (lamp > 0.01) onLight(x, -plinth - 0.8, 1.8, 0.35 * lamp * flicker(seconds, h.seed));
  // The door leaves, swung back, studded with brass.
  for (const side of [-1, 1]) {
    const lx = x + side * (dw / 2 - 0.12) - 0.06;
    ctx.fillStyle = paint(mix(h.door, [0, 0, 0], 0.2), env, lift);
    ctx.fillRect(lx, -plinth - dh, 0.12, dh);
    ctx.fillStyle = paint(GOLD, env, lift + 0.2);
    for (let i = 0; i < 6; i++) ctx.fillRect(lx + 0.04, -plinth - dh + 0.2 + i * 0.3, 0.04, 0.04);
  }
  // A lintel carved with a little Lakshmi niche.
  ctx.fillStyle = paint(mix(h.door, [255, 220, 160], 0.1), env, lift);
  ctx.fillRect(x - dw / 2 - 0.08, -plinth - dh - 0.22, dw + 0.16, 0.12);

  // Barred windows either side.
  for (const side of [-1, 1]) {
    const wx = x + side * Math.min(w * 0.3, 2.4);
    ctx.fillStyle = paint(h.door, env, lift);
    ctx.fillRect(wx - 0.5, -plinth - 1.75, 1.0, 1.0);
    ctx.fillStyle = rgb(mix([10, 8, 6], [120, 70, 34], lamp * 0.6));
    ctx.fillRect(wx - 0.42, -plinth - 1.67, 0.84, 0.84);
    ctx.fillStyle = paint(mix(h.door, [0, 0, 0], 0.1), env, lift);
    for (let i = 1; i < 6; i++) ctx.fillRect(wx - 0.42 + i * 0.14 - 0.015, -plinth - 1.67, 0.03, 0.84);
  }

  // The roof: rows of half-round country tiles, or thatch, sloping down over the thinnai.
  const overhang = 0.35;
  if (h.roof === "tile") {
    const g = ctx.createLinearGradient(0, -H - 0.9, 0, -eave);
    g.addColorStop(0, paint([150, 62, 36], env, lift));
    g.addColorStop(1, paint([186, 84, 48], env, lift));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left - overhang, -eave);
    ctx.lineTo(left - overhang * 0.2, -H - 0.9);
    ctx.lineTo(right + overhang * 0.2, -H - 0.9);
    ctx.lineTo(right + overhang, -eave);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([100, 38, 22], env, lift, 0.7);
    ctx.lineWidth = 0.025;
    for (let row = 1; row < 6; row++) {
      const ry = lerp(-eave, -H - 0.9, row / 6);
      ctx.beginPath();
      ctx.moveTo(left - overhang, ry);
      ctx.lineTo(right + overhang, ry);
      ctx.stroke();
    }
    ctx.fillStyle = paint([200, 96, 56], env, lift);
    for (let tx = left - overhang + 0.12; tx < right + overhang; tx += 0.24) {
      ctx.beginPath();
      ctx.arc(tx, -eave, 0.1, 0, Math.PI);
      ctx.fill();
    }
  } else {
    const g = ctx.createLinearGradient(0, -H - 1.1, 0, -eave);
    g.addColorStop(0, paint([150, 124, 78], env, lift));
    g.addColorStop(1, paint([184, 154, 96], env, lift));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left - overhang, -eave + 0.1);
    ctx.quadraticCurveTo(x, -H - 1.4, right + overhang, -eave + 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([120, 96, 56], env, lift, 0.6);
    ctx.lineWidth = 0.015;
    const random = mulberry32(h.seed * 17);
    for (let i = 0; i < w * 10; i++) {
      const tx = left - overhang + random() * (w + overhang * 2);
      ctx.beginPath();
      ctx.moveTo(tx, -eave + 0.1);
      ctx.lineTo(tx + (random() - 0.5) * 0.1, -eave - 0.25 - random() * 0.3);
      ctx.stroke();
    }
  }
  ctx.fillStyle = paint([70, 40, 24], env, lift);
  ctx.fillRect(left - overhang, -eave - 0.04, w + overhang * 2, 0.08);

  // The kaappu at the eave over the door: neem, yellow avaram, and white poolai flowers.
  if (kaappu > 0.01) {
    ctx.globalAlpha = kaappu;
    const kx = x;
    const ky = -eave + 0.04;
    ctx.strokeStyle = paint([50, 110, 40], env, lift);
    ctx.lineWidth = 0.03;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + (i - 3) * 0.28;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(kx + Math.cos(a) * 0.35, ky + Math.sin(a) * 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = paint([248, 200, 30], env, lift + 0.2);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(kx + (i - 2.5) * 0.07, ky + 0.2 + (i % 2) * 0.06, 0.045, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = paint([246, 244, 236], env, lift + 0.2);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(kx + (i - 1.5) * 0.1, ky + 0.3, 0.02, 0.06, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // A string of mango leaves across the top of the door.
  ctx.fillStyle = paint([50, 120, 44], env, lift);
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const lx = lerp(x - dw / 2 - 0.1, x + dw / 2 + 0.1, t);
    const ly = -plinth - dh - 0.1 + Math.sin(t * Math.PI) * 0.06;
    ctx.beginPath();
    ctx.moveTo(lx - 0.04, ly);
    ctx.quadraticCurveTo(lx, ly + 0.3, lx + 0.04, ly);
    ctx.fill();
  }

  // The thinnai: raised platforms either side of the steps, striped red and white.
  const gap = 0.75;
  for (const [from, to] of [
    [left, x - gap],
    [x + gap, right],
  ]) {
    ctx.fillStyle = paint(mix(wall, [255, 255, 255], 0.05), env, lift);
    ctx.fillRect(from, -plinth, to - from, plinth);
    if (h.stripes) {
      ctx.fillStyle = paint([184, 60, 38], env, lift);
      for (let sx = from + 0.09; sx < to - 0.1; sx += 0.36) ctx.fillRect(sx, -plinth + 0.06, 0.18, plinth - 0.06);
    }
    ctx.fillStyle = paint([120, 110, 100], env, lift);
    ctx.fillRect(from - 0.05, -plinth - 0.05, to - from + 0.1, 0.07);
  }
  // Steps up to the door.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = paint(mix([170, 160, 146], [0, 0, 0], i * 0.08), env, lift);
    ctx.fillRect(x - gap + 0.05, -plinth + (i + 1) * (plinth / 3) - 0.18, (gap - 0.05) * 2, plinth / 3);
  }

  // Pillars on the thinnai's edge up to the eave: dark wood, a stone base, a bracket at the top.
  const pillars = [left + 0.25, x - gap - 0.2, x + gap + 0.2, right - 0.25];
  for (const px of pillars) {
    const g = ctx.createLinearGradient(px - 0.09, 0, px + 0.09, 0);
    g.addColorStop(0, paint([50, 30, 20], env, lift));
    g.addColorStop(0.45, paint([120, 76, 44], env, lift + 0.05));
    g.addColorStop(1, paint([44, 26, 16], env, lift));
    ctx.fillStyle = g;
    ctx.fillRect(px - 0.08, -eave, 0.16, eave - plinth);
    ctx.fillStyle = paint([150, 140, 128], env, lift);
    ctx.fillRect(px - 0.12, -plinth - 0.2, 0.24, 0.2);
    ctx.fillStyle = paint([80, 48, 28], env, lift);
    ctx.beginPath();
    ctx.moveTo(px - 0.28, -eave);
    ctx.lineTo(px + 0.28, -eave);
    ctx.lineTo(px + 0.1, -eave + 0.2);
    ctx.lineTo(px - 0.1, -eave + 0.2);
    ctx.closePath();
    ctx.fill();
  }
  // The ground-level light at the foot of the house.
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(left, -0.04, w, 0.08);
}

/** The thulasi maadam: a little whitewashed pedestal in the yard with the holy basil growing in it. */
export function drawThulasi(ctx: Ctx, x: number, y: number, size: number, env: Env, lift: number) {
  const s = size;
  ctx.fillStyle = paint([236, 230, 216], env, lift);
  ctx.fillRect(x - 0.22 * s, y - 0.62 * s, 0.44 * s, 0.62 * s);
  ctx.fillRect(x - 0.28 * s, y - 0.7 * s, 0.56 * s, 0.1 * s);
  ctx.fillRect(x - 0.28 * s, y - 0.1 * s, 0.56 * s, 0.1 * s);
  ctx.fillStyle = paint([184, 60, 38], env, lift);
  for (let i = 0; i < 3; i++) ctx.fillRect(x - 0.18 * s + i * 0.14 * s, y - 0.52 * s, 0.07 * s, 0.34 * s);
  ctx.fillStyle = paint([240, 180, 30], env, lift + 0.1);
  ctx.beginPath();
  ctx.arc(x, y - 0.35 * s, 0.05 * s, 0, TAU);
  ctx.fill();
  const random = mulberry32(Math.round(x * 13));
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = paint(mix([46, 96, 40], [90, 140, 60], random()), env, lift);
    ctx.beginPath();
    ctx.ellipse(x + (random() - 0.5) * 0.4 * s, y - 0.75 * s - random() * 0.45 * s, 0.06 * s, 0.035 * s, random() * 3, 0, TAU);
    ctx.fill();
  }
}

/** The cattle shed: posts, a thatched roof sloping to the street, a heap of straw, and the trough. */
export function drawShed(ctx: Ctx, x: number, width: number, env: Env, lift: number) {
  const left = x - width / 2;
  const right = x + width / 2;
  ctx.fillStyle = paint([70, 52, 36], env, lift);
  ctx.fillRect(left, -2.6, width, 2.6);
  ctx.fillStyle = paint([96, 74, 50], env, lift);
  for (let i = 0; i < 18; i++) ctx.fillRect(left + (i / 18) * width, -2.6, 0.04, 2.6);
  // Straw heaped at the back.
  ctx.fillStyle = paint([206, 170, 96], env, lift);
  ctx.beginPath();
  ctx.moveTo(right - 3.2, 0);
  ctx.quadraticCurveTo(right - 2.2, -2.2, right - 0.4, -1.6);
  ctx.lineTo(right - 0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = paint([170, 134, 70], env, lift, 0.7);
  ctx.lineWidth = 0.02;
  const random = mulberry32(51);
  for (let i = 0; i < 40; i++) {
    const sx = right - 3 + random() * 2.7;
    ctx.beginPath();
    ctx.moveTo(sx, -random() * 1.4);
    ctx.lineTo(sx + (random() - 0.5) * 0.4, -random() * 1.6);
    ctx.stroke();
  }
  // Roof.
  const g = ctx.createLinearGradient(0, -3.8, 0, -2.4);
  g.addColorStop(0, paint([140, 116, 72], env, lift));
  g.addColorStop(1, paint([180, 150, 92], env, lift));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(left - 0.5, -2.35);
  ctx.lineTo(left, -3.9);
  ctx.lineTo(right, -3.9);
  ctx.lineTo(right + 0.5, -2.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = paint([120, 96, 56], env, lift, 0.6);
  ctx.lineWidth = 0.015;
  for (let i = 0; i < width * 9; i++) {
    const tx = left - 0.4 + random() * (width + 0.8);
    ctx.beginPath();
    ctx.moveTo(tx, -2.36);
    ctx.lineTo(tx + (random() - 0.5) * 0.1, -2.7 - random() * 0.5);
    ctx.stroke();
  }
  // Posts.
  for (const px of [left + 0.1, x, right - 0.1]) {
    ctx.fillStyle = paint([84, 58, 36], env, lift);
    ctx.fillRect(px - 0.08, -2.4, 0.16, 2.4);
  }
  // The stone trough.
  ctx.fillStyle = paint([130, 124, 116], env, lift);
  ctx.fillRect(left + 0.6, -0.45, 1.6, 0.45);
  ctx.fillStyle = paint([90, 110, 90], env, lift);
  ctx.fillRect(left + 0.7, -0.42, 1.4, 0.08);
}

// ─── The Bhogi fire ─────────────────────────────────────────────────────────

/**
 * The pile for Bhogi: old mats, a broken winnowing basket, a worn broom and the year's broken
 * wood, on (x, y), `size` wide. `burn` (0..1) takes it down to embers.
 */
export function drawPile(ctx: Ctx, x: number, y: number, size: number, burn: number, env: Env, lift: number) {
  const s = size * (1 - burn * 0.55);
  const char = clamp(burn * 1.4);
  const c = (base: RGB) => paint(mix(base, [30, 20, 16], char), env, lift);
  ctx.fillStyle = c([110, 80, 50]);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.55, x, y - s * 0.5);
  ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.5, x + s * 0.5, y);
  ctx.closePath();
  ctx.fill();
  // A rolled palm-leaf mat, leaning in.
  ctx.save();
  ctx.translate(x - s * 0.25, y - s * 0.2);
  ctx.rotate(-0.6);
  ctx.fillStyle = c([176, 140, 80]);
  ctx.fillRect(-s * 0.3, -s * 0.06, s * 0.6, s * 0.12);
  ctx.restore();
  // The murram, a winnowing basket, broken.
  ctx.save();
  ctx.translate(x + s * 0.22, y - s * 0.25);
  ctx.rotate(0.5);
  ctx.fillStyle = c([190, 150, 90]);
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.12);
  ctx.quadraticCurveTo(0, -s * 0.2, s * 0.2, -s * 0.12);
  ctx.lineTo(s * 0.16, s * 0.12);
  ctx.lineTo(-s * 0.12, s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Sticks and the broom.
  ctx.strokeStyle = c([80, 54, 34]);
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.04;
  for (const [a, l] of [
    [-0.9, 0.5],
    [0.8, 0.55],
    [-0.3, 0.6],
    [0.2, 0.5],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.05);
    ctx.lineTo(x + Math.sin(a) * s * l, y - s * 0.05 - Math.cos(a) * s * l);
    ctx.stroke();
  }
  ctx.strokeStyle = c([200, 180, 110]);
  ctx.lineWidth = s * 0.01;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y - s * 0.35);
    ctx.lineTo(x + s * (0.3 + i * 0.015), y - s * (0.6 + (i % 3) * 0.03));
    ctx.stroke();
  }
}

/** Palmyra and coconut palms, the trees of the Tamil country, as a flat shape on (x, y), `h` tall. */
export function palmPath(x: number, y: number, h: number, lean: number, palmyra: boolean, seed: number) {
  const path = new Path2D();
  const random = mulberry32(seed);
  const top = { x: x + lean * h, y: y - h };
  // The trunk, a little wider at the foot.
  path.moveTo(x - h * 0.025, y);
  path.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.5, top.x - h * 0.012, top.y);
  path.lineTo(top.x + h * 0.012, top.y);
  path.quadraticCurveTo(x + lean * h * 0.3 + h * 0.02, y - h * 0.5, x + h * 0.025, y);
  path.closePath();
  if (palmyra) {
    // A round head of stiff fan leaves.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const r = h * (0.13 + random() * 0.04);
      const fx = top.x + Math.cos(a) * r;
      const fy = top.y + Math.sin(a) * r * 0.85;
      path.moveTo(top.x, top.y);
      path.lineTo(fx + Math.cos(a + 0.4) * h * 0.04, fy + Math.sin(a + 0.4) * h * 0.04);
      path.lineTo(fx + Math.cos(a - 0.4) * h * 0.04, fy + Math.sin(a - 0.4) * h * 0.04);
      path.closePath();
    }
  } else {
    // Long feathery fronds arching down.
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.38 + (random() - 0.5) * 0.2;
      const l = h * (0.28 + random() * 0.08);
      const end = { x: top.x + Math.cos(a) * l, y: top.y + Math.sin(a) * l * 0.5 + l * 0.45 };
      const mid = { x: top.x + Math.cos(a) * l * 0.55, y: top.y + Math.sin(a) * l * 0.55 - l * 0.08 };
      path.moveTo(top.x, top.y);
      path.quadraticCurveTo(mid.x, mid.y - h * 0.02, end.x, end.y);
      path.quadraticCurveTo(mid.x, mid.y + h * 0.02, top.x, top.y + h * 0.01);
      path.closePath();
    }
  }
  return path;
}

/** A gopuram, the tiered tower over a temple gate, far off: its outline only, `h` tall. */
export function gopuramPath(x: number, y: number, h: number) {
  const path = new Path2D();
  const tiers = 7;
  const base = h * 0.42;
  path.moveTo(x - base / 2, y);
  for (let i = 0; i <= tiers; i++) {
    const t = i / tiers;
    const w = lerp(base, base * 0.32, t) / 2;
    const ty = y - h * 0.15 - t * h * 0.7;
    path.lineTo(x - w, ty);
    path.lineTo(x - w * 0.94, ty - h * 0.03);
  }
  // The barrel vault on top with its row of kalasams.
  const top = y - h * 0.88;
  path.lineTo(x - base * 0.2, top);
  path.quadraticCurveTo(x, top - h * 0.1, x + base * 0.2, top);
  for (let i = tiers; i >= 0; i--) {
    const t = i / tiers;
    const w = lerp(base, base * 0.32, t) / 2;
    const ty = y - h * 0.15 - t * h * 0.7;
    path.lineTo(x + w * 0.94, ty - h * 0.03);
    path.lineTo(x + w, ty);
  }
  path.lineTo(x + base / 2, y);
  path.closePath();
  for (let i = 0; i < 5; i++) {
    const kx = x + lerp(-base * 0.16, base * 0.16, i / 4);
    path.moveTo(kx - h * 0.008, top - h * 0.05);
    path.lineTo(kx, top - h * 0.1);
    path.lineTo(kx + h * 0.008, top - h * 0.05);
    path.closePath();
  }
  return path;
}
