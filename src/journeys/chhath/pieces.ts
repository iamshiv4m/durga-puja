// The things of Chhath, painted in code: clay diyas, the bamboo soop and what goes into it,
// thekua, sugarcane, the kosi and its clay elephant, the chulha and its pots, and the people at
// the river. Shared by the scene and the greeting card.
import { easeOutBack } from "@/lib/math";
import { TAU, clamp, flame, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";

/** The light on things at one moment of the four days: how bright, and of what colour. */
export type Env = { amb: number; tint: RGB; night: RGB };

export const DAYLIGHT: Env = { amb: 1, tint: [255, 236, 200], night: [8, 8, 20] };

/** A surface colour under `env`, lifted toward full colour by a lamp or fire nearby. */
export function tone(base: RGB, env: Env, lift = 0): RGB {
  const dark = mix(base, env.night, 0.88);
  const day = mix(base, env.tint, 0.12);
  return mix(dark, day, clamp(env.amb + lift));
}

export const paint = (base: RGB, env: Env, lift = 0, alpha = 1) => rgb(tone(base, env, lift), alpha);

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

/** The same picture as a flat silhouette, for laying darkness over it. */
function silhouette(key: string, source: HTMLCanvasElement, color: string) {
  return cached(`${key}/shadow/${color}`, source.width, source.height, (g) => {
    g.drawImage(source, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, source.width, source.height);
  });
}

/** Draws a cached picture centred on (x, y), `width` wide, darkened for the hour. */
function stamp(ctx: Ctx, key: string, image: HTMLCanvasElement, x: number, y: number, width: number, env: Env, lift = 0, rotate = 0) {
  const height = (width * image.height) / image.width;
  ctx.save();
  ctx.translate(x, y);
  if (rotate) ctx.rotate(rotate);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  const dark = 1 - clamp(env.amb + lift);
  if (dark > 0.02) {
    ctx.globalAlpha = dark * 0.9;
    ctx.drawImage(silhouette(key, image, rgb(env.night)), -width / 2, -height / 2, width, height);
  }
  ctx.restore();
}

// ─── Lamps ───────────────────────────────────────────────────────────────────

/** A clay diya seen from the side, `size` wide, sitting on (x, y), lit by `lit` (0..1). */
export function drawDiya(ctx: Ctx, x: number, y: number, size: number, lit: number, seconds: number, seed: number, env: Env) {
  const s = size;
  ctx.fillStyle = paint([178, 92, 44], env, lit * 0.6);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.14);
  ctx.bezierCurveTo(x - s * 0.44, y + s * 0.14, x + s * 0.44, y + s * 0.14, x + s * 0.5, y - s * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint([70, 34, 12], env, lit * 0.9);
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.14, s * 0.5, s * 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paint([230, 150, 90], env, lit * 0.7, 0.9);
  ctx.lineWidth = s * 0.035;
  ctx.stroke();
  if (lit > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(lit * 1.5);
    flame(ctx, x, y - s * 0.16, s * 0.72 * (0.45 + 0.55 * lit), seconds, seed);
    ctx.restore();
  }
}

// ─── Thekua ──────────────────────────────────────────────────────────────────

/** A thekua: wheat, jaggery and ghee, pressed in a wooden mould and fried golden. */
function thekuaSprite() {
  return cached("thekua", 160, 120, (g) => {
    g.translate(80, 60);
    const body = g.createRadialGradient(-10, -8, 4, 0, 0, 74);
    body.addColorStop(0, "#e9a54a");
    body.addColorStop(0.6, "#c97a2a");
    body.addColorStop(1, "#7a3e12");
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(0, 0, 74, 54, 0, 0, TAU);
    g.fill();
    // The mould's leaf: a vein down the middle and ribs either side, and a ring of dots.
    g.strokeStyle = "rgba(92, 42, 10, 0.75)";
    g.lineWidth = 4;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-50, 0);
    g.lineTo(50, 0);
    for (let i = -3; i <= 3; i++) {
      const x = i * 13;
      g.moveTo(x, 0);
      g.lineTo(x + 12, -30 + Math.abs(i) * 5);
      g.moveTo(x, 0);
      g.lineTo(x + 12, 30 - Math.abs(i) * 5);
    }
    g.stroke();
    g.fillStyle = "rgba(92, 42, 10, 0.6)";
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU;
      g.beginPath();
      g.arc(Math.cos(a) * 62, Math.sin(a) * 43, 3, 0, TAU);
      g.fill();
    }
    g.strokeStyle = "rgba(255, 220, 150, 0.35)";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(-4, -4, 66, 46, 0, Math.PI * 1.05, Math.PI * 1.7);
    g.stroke();
  });
}

export function drawThekua(ctx: Ctx, x: number, y: number, width: number, rotate: number, env: Env, lift = 0) {
  stamp(ctx, "thekua", thekuaSprite(), x, y, width, env, lift, rotate);
}

// ─── Sugarcane ───────────────────────────────────────────────────────────────

/** A sugarcane stalk from (x0, y0) up to (x1, y1), with its nodes, and leaves at the top if `leaves`. */
export function drawCane(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, env: Env, lift = 0, leaves = true, seed = 1) {
  const length = Math.hypot(x1 - x0, y1 - y0);
  ctx.lineCap = "round";
  ctx.strokeStyle = paint([92, 36, 58], env, lift);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  // A lit edge down one side.
  ctx.strokeStyle = paint([150, 90, 110], env, lift, 0.35);
  ctx.lineWidth = width * 0.22;
  const nx = ((y1 - y0) / length) * width * 0.25;
  const ny = (-(x1 - x0) / length) * width * 0.25;
  ctx.beginPath();
  ctx.moveTo(x0 + nx, y0 + ny);
  ctx.lineTo(x1 + nx, y1 + ny);
  ctx.stroke();
  // Nodes every so often.
  ctx.strokeStyle = paint([200, 180, 150], env, lift, 0.4);
  ctx.lineWidth = width * 0.12;
  const nodes = Math.floor(length / (width * 4.5));
  const ux = (x1 - x0) / length;
  const uy = (y1 - y0) / length;
  ctx.beginPath();
  for (let i = 1; i <= nodes; i++) {
    const t = i / (nodes + 1);
    const cx = lerp(x0, x1, t);
    const cy = lerp(y0, y1, t);
    ctx.moveTo(cx - uy * width * 0.55, cy + ux * width * 0.55);
    ctx.lineTo(cx + uy * width * 0.55, cy - ux * width * 0.55);
  }
  ctx.stroke();
  if (!leaves) return;
  const random = mulberry32(seed * 1000);
  ctx.strokeStyle = paint([74, 132, 52], env, lift * 0.8);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const reach = width * (7 + random() * 6);
    const lean = Math.atan2(uy, ux);
    const a = lean + side * (0.5 + random() * 0.9);
    const ex = x1 + Math.cos(a) * reach;
    const ey = y1 + Math.sin(a) * reach;
    ctx.lineWidth = width * (0.35 + random() * 0.2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(lerp(x1, ex, 0.5) + ux * reach * 0.4, lerp(y1, ey, 0.5) + uy * reach * 0.4, ex, ey + reach * 0.35);
    ctx.stroke();
  }
}

// ─── The soop ────────────────────────────────────────────────────────────────

/** The winnowing basket's outline, `1` wide: a straight open front, curving up round the back. */
function soopPath(g: Ctx) {
  g.beginPath();
  g.moveTo(-0.44, 0.3);
  g.lineTo(0.44, 0.3);
  g.bezierCurveTo(0.53, 0.05, 0.5, -0.32, 0.28, -0.41);
  g.quadraticCurveTo(0, -0.49, -0.28, -0.41);
  g.bezierCurveTo(-0.5, -0.32, -0.53, 0.05, -0.44, 0.3);
  g.closePath();
}

/** An empty soop seen from above and in front, woven of split bamboo, cached. */
function soopSprite() {
  return cached("soop", 1024, 700, (g) => {
    g.translate(512, 370);
    g.scale(1000, 1000 * 0.64);
    soopPath(g);
    const base = g.createLinearGradient(0, -0.45, 0, 0.3);
    base.addColorStop(0, "#9c6a32");
    base.addColorStop(0.5, "#d2a664");
    base.addColorStop(1, "#e2bb78");
    g.fillStyle = base;
    g.fill();
    g.save();
    g.clip();
    // The weave: strips over and under, crossing on the diagonal.
    g.lineWidth = 0.012;
    for (let i = -40; i <= 40; i++) {
      const t = i * 0.028;
      g.strokeStyle = i % 2 ? "rgba(120, 76, 30, 0.45)" : "rgba(255, 230, 170, 0.28)";
      g.beginPath();
      g.moveTo(t - 0.6, -0.6);
      g.lineTo(t + 0.6, 0.6);
      g.stroke();
      g.strokeStyle = i % 2 ? "rgba(255, 230, 170, 0.22)" : "rgba(110, 70, 28, 0.4)";
      g.beginPath();
      g.moveTo(t + 0.6, -0.6);
      g.lineTo(t - 0.6, 0.6);
      g.stroke();
    }
    // The back curves up into a wall, in shadow.
    const wall = g.createLinearGradient(0, -0.5, 0, -0.1);
    wall.addColorStop(0, "rgba(60, 34, 10, 0.55)");
    wall.addColorStop(1, "rgba(60, 34, 10, 0)");
    g.fillStyle = wall;
    g.fillRect(-0.6, -0.6, 1.2, 0.5);
    g.restore();
    // Bound round the edge with a thicker strip, and dotted with sindoor for the puja.
    soopPath(g);
    g.strokeStyle = "#6e4318";
    g.lineWidth = 0.035;
    g.stroke();
    g.strokeStyle = "rgba(255, 220, 150, 0.4)";
    g.lineWidth = 0.008;
    g.stroke();
    g.fillStyle = "#d8261c";
    for (const [x, y] of [[-0.3, 0.2], [0.3, 0.2], [0, -0.36], [-0.38, -0.08], [0.38, -0.08]]) {
      g.beginPath();
      g.ellipse(x, y, 0.018, 0.028, 0, 0, TAU);
      g.fill();
    }
  });
}

function sphere(ctx: Ctx, x: number, y: number, r: number, base: RGB, env: Env, lift: number) {
  const gradient = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gradient.addColorStop(0, paint(mix(base, [255, 250, 230], 0.35), env, lift));
  gradient.addColorStop(0.7, paint(base, env, lift));
  gradient.addColorStop(1, paint(mix(base, [0, 0, 0], 0.45), env, lift));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** When each offering goes into the soop, as a share of `fill`. */
export const SOOP_ORDER = ["cane", "coconut", "fruit", "bananas", "gagal", "thekua", "singhara", "diya"] as const;

const pop = (fill: number, index: number) => {
  const t = clamp((fill * SOOP_ORDER.length - index) / 1.1);
  return t <= 0 ? 0 : easeOutBack(t);
};

/**
 * A soop, `width` wide and centred on (x, y), filled with the offerings as `fill` goes 0..1:
 * sugarcane, coconut, fruit, bananas, a big gagal lemon, thekua, water chestnuts and a diya.
 */
export function drawSoop(ctx: Ctx, x: number, y: number, width: number, fill: number, seconds: number, env: Env, lift = 0, onLamp?: (x: number, y: number) => void) {
  const image = soopSprite();
  stamp(ctx, "soop", image, x, y, width, env, lift);
  const w = width;
  const sy = 0.64;
  const at = (lx: number, ly: number) => [x + lx * w, y + ly * w * sy + w * 0.03] as const;
  ctx.save();
  // Sugarcane pieces laid across the back.
  let k = pop(fill, 0);
  if (k > 0) {
    for (const [a, b, off] of [[-0.36, 0.3, -0.26], [-0.3, 0.36, -0.18]]) {
      const [x0, y0] = at(a, off + 0.04);
      const [x1, y1] = at(b, off - 0.06);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      drawCane(ctx, lerp(cx, x0, k), lerp(cy, y0, k), lerp(cx, x1, k), lerp(cy, y1, k), w * 0.05, env, lift, false);
    }
  }
  // The coconut, husk and all.
  k = pop(fill, 1);
  if (k > 0) {
    const [cx, cy] = at(0.22, -0.2);
    sphere(ctx, cx, cy, w * 0.1 * k, [120, 72, 36], env, lift);
    ctx.strokeStyle = paint([80, 46, 20], env, lift, 0.8);
    ctx.lineWidth = w * 0.006;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.22;
      ctx.moveTo(cx, cy - w * 0.08 * k);
      ctx.lineTo(cx + Math.cos(a) * w * 0.06 * k, cy - w * 0.08 * k + Math.sin(a) * w * 0.05 * k);
    }
    ctx.stroke();
  }
  // Apples and oranges.
  k = pop(fill, 2);
  if (k > 0) {
    for (const [lx, ly, r, color] of [[-0.08, -0.2, 0.058, [196, 40, 36]], [0.04, -0.24, 0.052, [240, 132, 30]], [-0.22, -0.2, 0.05, [236, 140, 36]]] as const) {
      const [cx, cy] = at(lx, ly);
      sphere(ctx, cx, cy, w * r * k, color as unknown as RGB, env, lift);
    }
  }
  // A hand of bananas.
  k = pop(fill, 3);
  if (k > 0) {
    const [bx, by] = at(-0.24, 0.02);
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const a = -0.5 + i * 0.25;
      ctx.strokeStyle = paint(i % 2 ? [214, 196, 60] : [196, 186, 56], env, lift);
      ctx.lineWidth = w * 0.045 * k;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.1 * k, by + (i - 2) * w * 0.012);
      ctx.quadraticCurveTo(bx, by + Math.sin(a) * w * 0.07 * k - w * 0.03, bx + w * 0.12 * k, by + (i - 2) * w * 0.03 - w * 0.02);
      ctx.stroke();
    }
    ctx.fillStyle = paint([70, 60, 20], env, lift);
    ctx.beginPath();
    ctx.arc(bx - w * 0.11 * k, by, w * 0.02 * k, 0, TAU);
    ctx.fill();
  }
  // Gagal, the great knobbly lemon of Chhath.
  k = pop(fill, 4);
  if (k > 0) {
    const [cx, cy] = at(0.27, 0.02);
    sphere(ctx, cx, cy, w * 0.085 * k, [206, 196, 60], env, lift);
    ctx.fillStyle = paint([120, 130, 30], env, lift, 0.35);
    const random = mulberry32(5);
    for (let i = 0; i < 14; i++) {
      const a = random() * TAU;
      const r = random() * w * 0.07 * k;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, w * 0.006, 0, TAU);
      ctx.fill();
    }
  }
  // Thekua, heaped in front.
  k = pop(fill, 5);
  if (k > 0) {
    const spots: [number, number, number][] = [[-0.08, 0.1, 0.3], [0.08, 0.12, -0.4], [-0.02, 0.2, 0.1], [0.14, 0.2, 0.6], [-0.16, 0.2, -0.2], [0.02, 0.06, 0.9]];
    spots.forEach(([lx, ly, r], i) => {
      const t = clamp(k * 1.4 - i * 0.08);
      if (t <= 0) return;
      const [cx, cy] = at(lx, ly);
      drawThekua(ctx, cx, cy, w * 0.13 * t, r, env, lift);
    });
  }
  // Singhara, the water chestnut with its two horns.
  k = pop(fill, 6);
  if (k > 0) {
    for (const [lx, ly] of [[0.3, 0.16], [0.36, 0.1], [0.25, 0.22]]) {
      const [cx, cy] = at(lx, ly);
      ctx.fillStyle = paint([54, 30, 24], env, lift);
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.03 * k, w * 0.018 * k, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = paint([54, 30, 24], env, lift);
      ctx.lineWidth = w * 0.008;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.05 * k, cy - w * 0.012 * k);
      ctx.lineTo(cx + w * 0.05 * k, cy - w * 0.012 * k);
      ctx.stroke();
    }
  }
  ctx.restore();
  // And a lamp, lit last.
  k = pop(fill, 7);
  if (k > 0) {
    const [cx, cy] = at(0.0, -0.04);
    drawDiya(ctx, cx, cy, w * 0.11 * Math.min(1, k), clamp(k), seconds, 3, env);
    onLamp?.(cx, cy - w * 0.05);
  }
}

/**
 * A soop held up and seen edge on, as in the arghya: in local units, `1` wide, the rim from
 * (-0.5, 0) to (0.5, 0) and the offerings heaped on it. Used for silhouettes.
 */
export function soopEdge(ctx: Ctx, fruit: string, rim: string) {
  ctx.fillStyle = fruit;
  ctx.beginPath();
  ctx.moveTo(-0.42, 0);
  ctx.bezierCurveTo(-0.4, -0.16, -0.26, -0.2, -0.16, -0.14);
  ctx.bezierCurveTo(-0.1, -0.26, 0.06, -0.26, 0.1, -0.16);
  ctx.bezierCurveTo(0.2, -0.24, 0.36, -0.18, 0.4, 0);
  ctx.closePath();
  ctx.fill();
  // A stick of sugarcane standing up out of it, and the leafy tops of the turmeric.
  ctx.strokeStyle = fruit;
  ctx.lineCap = "round";
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.28, -0.05);
  ctx.lineTo(-0.34, -0.56);
  ctx.moveTo(0.22, -0.1);
  ctx.quadraticCurveTo(0.26, -0.3, 0.36, -0.38);
  ctx.moveTo(0.22, -0.1);
  ctx.quadraticCurveTo(0.2, -0.32, 0.12, -0.42);
  ctx.stroke();
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.moveTo(-0.52, -0.04);
  ctx.quadraticCurveTo(0, 0.12, 0.52, -0.04);
  ctx.lineTo(0.5, 0.03);
  ctx.quadraticCurveTo(0, 0.2, -0.5, 0.03);
  ctx.closePath();
  ctx.fill();
}

// ─── The kosi ────────────────────────────────────────────────────────────────

/** A clay elephant, terracotta dotted with white, `size` long, standing on (x, y). */
export function drawHathi(ctx: Ctx, x: number, y: number, size: number, env: Env, lift: number, facing = 1) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  const clay = paint([186, 86, 40], env, lift);
  const dark = paint([120, 50, 22], env, lift);
  ctx.fillStyle = dark;
  for (const lx of [-0.32, 0.18]) ctx.fillRect(lx, -0.3, 0.13, 0.3);
  ctx.fillStyle = clay;
  for (const lx of [-0.22, 0.28]) ctx.fillRect(lx, -0.3, 0.13, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, -0.42, 0.45, 0.24, 0, 0, TAU);
  ctx.fill();
  // Head, ear and trunk.
  ctx.beginPath();
  ctx.arc(0.45, -0.5, 0.18, 0, TAU);
  ctx.fill();
  ctx.lineCap = "round";
  ctx.strokeStyle = clay;
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(0.58, -0.45);
  ctx.quadraticCurveTo(0.7, -0.2, 0.62, -0.06);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0.38, -0.46, 0.09, 0.13, 0.2, 0, TAU);
  ctx.fill();
  // A saddle cloth and white dots, and the lamp stand on its back.
  ctx.fillStyle = paint([220, 40, 40], env, lift);
  ctx.beginPath();
  ctx.moveTo(-0.22, -0.64);
  ctx.lineTo(0.2, -0.64);
  ctx.lineTo(0.16, -0.36);
  ctx.lineTo(-0.18, -0.36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint([250, 236, 210], env, lift, 0.9);
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(-0.34 + i * 0.1, -0.3 + Math.sin(i) * 0.02, 0.018, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0.5, -0.54, 0.025, 0, TAU);
  ctx.fill();
  ctx.fillStyle = clay;
  ctx.fillRect(-0.05, -0.8, 0.1, 0.18);
  ctx.restore();
}

/** A clay kalash with a lamp on its lid, `size` tall, standing on (x, y). */
export function drawKalash(ctx: Ctx, x: number, y: number, size: number, env: Env, lift: number) {
  const s = size;
  const body = ctx.createLinearGradient(x - s * 0.4, 0, x + s * 0.4, 0);
  body.addColorStop(0, paint([110, 44, 20], env, lift));
  body.addColorStop(0.4, paint([200, 96, 46], env, lift));
  body.addColorStop(1, paint([90, 36, 16], env, lift));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.16, y - s * 0.86);
  ctx.bezierCurveTo(x - s * 0.5, y - s * 0.7, x - s * 0.5, y - s * 0.05, x - s * 0.15, y);
  ctx.lineTo(x + s * 0.15, y);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.05, x + s * 0.5, y - s * 0.7, x + s * 0.16, y - s * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint([240, 230, 210], env, lift, 0.85);
  ctx.fillRect(x - s * 0.36, y - s * 0.5, s * 0.72, s * 0.035);
  ctx.fillStyle = paint([214, 40, 30], env, lift);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.08, y - s * 0.62);
  ctx.lineTo(x + s * 0.08, y - s * 0.62);
  ctx.lineTo(x, y - s * 0.72);
  ctx.fill();
  ctx.fillStyle = paint([150, 64, 28], env, lift);
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.88, s * 0.24, s * 0.06, 0, 0, TAU);
  ctx.fill();
}

export type Lamp = (x: number, y: number, size: number) => void;

/**
 * A kosi: sugarcane stalks stood in a ring and tied at the top with a yellow cloth, and under
 * them a clay elephant, kalash and lamps. `size` is its height to the tie; it stands on (x, y).
 * `detail` adds the smaller things for close shots. Each lit lamp is passed to `lamp`.
 */
export function drawKosi(ctx: Ctx, x: number, y: number, size: number, lit: number, seconds: number, env: Env, detail: boolean, seed: number, lamp: Lamp) {
  const s = size;
  const top = y - s;
  const lift = lit * 0.55;
  const random = mulberry32(seed * 97 + 3);
  const canes = [-0.52, -0.2, 0.2, 0.52];
  // The two at the back first, darker.
  for (const lx of [-0.34, 0.34]) drawCane(ctx, x + lx * s, y - s * 0.12, x + lx * 0.05 * s, top, s * 0.045, env, lift * 0.5, true, seed + lx);
  if (lit > 0.01 || detail) {
    // The ground under it lit by the lamps.
    const pool = ctx.createRadialGradient(x, y, 0, x, y, s * 0.9);
    pool.addColorStop(0, `rgba(255, 170, 80, ${0.35 * lit})`);
    pool.addColorStop(1, "rgba(255, 170, 80, 0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.9, s * 0.25, 0, 0, TAU);
    ctx.fill();
  }
  // What stands under it.
  drawKalash(ctx, x - s * 0.24, y - s * 0.02, s * 0.3, env, lift);
  drawKalash(ctx, x + s * 0.26, y - s * 0.02, s * 0.26, env, lift);
  drawHathi(ctx, x + s * 0.02, y, s * 0.36, env, lift, random() < 0.5 ? 1 : -1);
  const lamps: [number, number][] = [
    [x - s * 0.24, y - s * 0.3],
    [x + s * 0.26, y - s * 0.27],
    [x + s * 0.02, y - s * 0.3],
  ];
  if (detail) {
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      lamps.push([x + lerp(-0.6, 0.6, t) * s, y + s * 0.06 + Math.sin(t * Math.PI) * s * 0.05]);
    }
    for (let i = 0; i < 5; i++) drawThekua(ctx, x + lerp(-0.4, 0.44, i / 4) * s, y + s * 0.18, s * 0.1, i, env, lift);
  }
  lamps.forEach(([lx, ly], i) => {
    drawDiya(ctx, lx, ly, s * 0.085, lit, seconds, seed + i, env);
    if (lit > 0.02) lamp(lx, ly - s * 0.04, s);
  });
  // The front stalks over it all, meeting at the top.
  canes.forEach((lx, i) => drawCane(ctx, x + lx * s, y + s * 0.02, x + lx * 0.06 * s, top, s * 0.055, env, lift * 0.8, true, seed + i));
  // The yellow cloth tied round where they meet, its ends hanging.
  ctx.fillStyle = paint([238, 180, 30], env, lift * 0.7);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, top - s * 0.02);
  ctx.lineTo(x + s * 0.1, top - s * 0.02);
  ctx.lineTo(x + s * 0.09, top + s * 0.08);
  ctx.lineTo(x - s * 0.09, top + s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.06, top + s * 0.06);
  ctx.quadraticCurveTo(x + s * 0.2 + Math.sin(seconds + seed) * s * 0.02, top + s * 0.2, x + s * 0.14, top + s * 0.34);
  ctx.lineTo(x + s * 0.08, top + s * 0.3);
  ctx.quadraticCurveTo(x + s * 0.12, top + s * 0.2, x + s * 0.02, top + s * 0.07);
  ctx.fill();
  ctx.strokeStyle = paint([200, 30, 20], env, lift * 0.7);
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, top + s * 0.075);
  ctx.lineTo(x + s * 0.1, top + s * 0.075);
  ctx.stroke();
}

// ─── The chulha and its pots ────────────────────────────────────────────────

/** A clay chulha, `size` wide, standing on (x, y), with mango wood burning in its mouth. */
export function drawChulha(ctx: Ctx, x: number, y: number, size: number, fire: number, seconds: number, env: Env, lamp: Lamp) {
  const s = size;
  const lift = fire * 0.35;
  // Ash spilled in front.
  ctx.fillStyle = paint([120, 110, 100], env, lift, 0.5);
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.02, s * 0.46, s * 0.07, 0, 0, TAU);
  ctx.fill();
  const body = ctx.createLinearGradient(x - s * 0.5, 0, x + s * 0.5, 0);
  body.addColorStop(0, paint([120, 70, 40], env, lift));
  body.addColorStop(0.45, paint([176, 112, 70], env, lift));
  body.addColorStop(1, paint([104, 60, 34], env, lift));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.bezierCurveTo(x - s * 0.5, y - s * 0.2, x - s * 0.44, y - s * 0.4, x - s * 0.38, y - s * 0.44);
  ctx.lineTo(x + s * 0.38, y - s * 0.44);
  ctx.bezierCurveTo(x + s * 0.44, y - s * 0.4, x + s * 0.5, y - s * 0.2, x + s * 0.5, y);
  ctx.closePath();
  ctx.fill();
  // The top where the pot sits, smoothed with the hand.
  ctx.fillStyle = paint([150, 94, 58], env, lift);
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.44, s * 0.39, s * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paint([200, 150, 110], env, lift, 0.4);
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.44, s * 0.39, s * 0.08, 0, Math.PI, TAU);
  ctx.stroke();
  // The mouth, and the fire inside it.
  ctx.beginPath();
  ctx.moveTo(x - s * 0.17, y);
  ctx.lineTo(x - s * 0.17, y - s * 0.16);
  ctx.quadraticCurveTo(x - s * 0.17, y - s * 0.3, x, y - s * 0.3);
  ctx.quadraticCurveTo(x + s * 0.17, y - s * 0.3, x + s * 0.17, y - s * 0.16);
  ctx.lineTo(x + s * 0.17, y);
  ctx.closePath();
  const inside = ctx.createRadialGradient(x, y - s * 0.06, 0, x, y - s * 0.1, s * 0.25);
  const f = fire * (0.85 + 0.15 * Math.sin(seconds * 9) * Math.sin(seconds * 4.3));
  inside.addColorStop(0, rgb(mix([20, 10, 6], [255, 214, 120], f)));
  inside.addColorStop(0.5, rgb(mix([14, 8, 5], [230, 90, 20], f)));
  inside.addColorStop(1, rgb(mix([8, 5, 4], [70, 20, 8], f)));
  ctx.fillStyle = inside;
  ctx.fill();
  if (fire > 0.02) {
    ctx.save();
    ctx.globalAlpha = fire;
    for (let i = 0; i < 3; i++) flame(ctx, x + (i - 1) * s * 0.07, y - s * 0.03, s * (0.16 + (i === 1 ? 0.06 : 0)), seconds * 1.3, i * 2.1);
    ctx.restore();
    lamp(x, y - s * 0.1, s * 1.6);
  }
  // Mango wood fed in through the mouth, its ends glowing.
  for (const [a, len, w] of [[-0.28, 0.46, 0.05], [0.1, 0.5, 0.06], [0.36, 0.4, 0.045]]) {
    const ex = x + Math.sin(a) * s * len;
    const ey = y + s * 0.06 + Math.cos(a) * s * 0.03;
    ctx.strokeStyle = paint([92, 60, 40], env, lift + 0.1);
    ctx.lineWidth = s * w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * s * 0.05, y - s * 0.04);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = rgb(mix([60, 30, 20], [255, 120, 40], fire), 0.9);
    ctx.beginPath();
    ctx.arc(x + Math.sin(a) * s * 0.06, y - s * 0.04, s * w * 0.45, 0, TAU);
    ctx.fill();
  }
}

/** A round-bellied pot on the fire, `size` wide at its belly, its base on (x, y). */
export function drawPot(ctx: Ctx, x: number, y: number, size: number, metal: "clay" | "brass" | "iron", inside: RGB, env: Env, lift: number, seconds: number, simmer = true) {
  const s = size;
  const colors: Record<typeof metal, [RGB, RGB, RGB]> = {
    clay: [[96, 40, 18], [196, 96, 50], [80, 32, 14]],
    brass: [[120, 80, 20], [236, 190, 90], [100, 64, 16]],
    iron: [[20, 18, 18], [70, 64, 60], [14, 12, 12]],
  };
  const [dark, light, edge] = colors[metal];
  if (metal === "iron") {
    // A kadhai: wide and shallow, with two ring handles.
    const body = ctx.createLinearGradient(x - s * 0.6, 0, x + s * 0.6, 0);
    body.addColorStop(0, paint(dark, env, lift));
    body.addColorStop(0.35, paint(light, env, lift));
    body.addColorStop(1, paint(edge, env, lift));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.26);
    ctx.quadraticCurveTo(x, y + s * 0.18, x + s * 0.6, y - s * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint(light, env, lift);
    ctx.lineWidth = s * 0.03;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + side * s * 0.64, y - s * 0.24, s * 0.05, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = paint(inside, env, lift + 0.2);
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.26, s * 0.58, s * 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = paint([40, 36, 34], env, lift);
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    return;
  }
  const body = ctx.createLinearGradient(x - s * 0.5, 0, x + s * 0.5, 0);
  body.addColorStop(0, paint(dark, env, lift));
  body.addColorStop(0.35, paint(light, env, lift));
  body.addColorStop(0.55, paint(mix(light, dark, 0.3), env, lift));
  body.addColorStop(1, paint(edge, env, lift));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.72);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.55, x - s * 0.55, y - s * 0.02, x, y);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.02, x + s * 0.6, y - s * 0.55, x + s * 0.3, y - s * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint(inside, env, lift + 0.15);
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.74, s * 0.33, s * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paint(light, env, lift);
  ctx.lineWidth = s * 0.04;
  ctx.stroke();
  if (!simmer) return;
  // It simmers: a bubble or two breaking on top.
  ctx.fillStyle = paint(mix(inside, [255, 255, 255], 0.3), env, lift + 0.2, 0.8);
  for (let i = 0; i < 3; i++) {
    const t = (seconds * 0.7 + i * 0.37) % 1;
    ctx.beginPath();
    ctx.arc(x + (i - 1) * s * 0.14, y - s * 0.74, s * 0.025 * Math.sin(t * Math.PI), 0, TAU);
    ctx.fill();
  }
}

/** A banana leaf laid on the floor, `size` long, centred on (x, y). */
export function drawLeaf(ctx: Ctx, x: number, y: number, size: number, env: Env, lift: number) {
  const s = size;
  ctx.fillStyle = paint([54, 120, 40], env, lift);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y + s * 0.02);
  ctx.bezierCurveTo(x - s * 0.4, y - s * 0.16, x + s * 0.3, y - s * 0.17, x + s * 0.5, y - s * 0.04);
  ctx.bezierCurveTo(x + s * 0.34, y + s * 0.14, x - s * 0.3, y + s * 0.15, x - s * 0.5, y + s * 0.02);
  ctx.fill();
  ctx.strokeStyle = paint([150, 190, 90], env, lift, 0.6);
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y + s * 0.02);
  ctx.quadraticCurveTo(x, y - s * 0.02, x + s * 0.5, y - s * 0.04);
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const mx = lerp(x - s * 0.5, x + s * 0.5, t);
    const my = lerp(y + s * 0.02, y - s * 0.04, t) - s * 0.015;
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + s * 0.04, my - s * 0.11 * Math.sin(t * Math.PI));
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + s * 0.04, my + s * 0.11 * Math.sin(t * Math.PI));
  }
  ctx.stroke();
}

/** A heap of something soft (rice, kheer) on a leaf. */
export function drawHeap(ctx: Ctx, x: number, y: number, width: number, base: RGB, env: Env, lift: number, grains = true) {
  const w = width;
  const g = ctx.createRadialGradient(x - w * 0.15, y - w * 0.25, w * 0.05, x, y - w * 0.1, w * 0.55);
  g.addColorStop(0, paint(mix(base, [255, 255, 255], 0.3), env, lift));
  g.addColorStop(1, paint(mix(base, [0, 0, 0], 0.3), env, lift));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.bezierCurveTo(x - w * 0.45, y - w * 0.36, x + w * 0.45, y - w * 0.36, x + w * 0.5, y);
  ctx.quadraticCurveTo(x, y + w * 0.08, x - w * 0.5, y);
  ctx.fill();
  if (!grains) return;
  ctx.fillStyle = paint([255, 255, 250], env, lift, 0.7);
  const random = mulberry32(Math.round(x * 100));
  for (let i = 0; i < 26; i++) {
    const a = random();
    const px = x + (a - 0.5) * w * 0.85;
    const py = y - random() * w * 0.24 * Math.sin(a * Math.PI);
    ctx.fillRect(px, py, w * 0.022, w * 0.01);
  }
}

/** A roti, lightly charred. */
export function drawRoti(ctx: Ctx, x: number, y: number, width: number, env: Env, lift: number) {
  const w = width;
  ctx.fillStyle = paint([224, 184, 120], env, lift);
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint([120, 70, 30], env, lift, 0.55);
  const random = mulberry32(Math.round(x * 31));
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.ellipse(x + (random() - 0.5) * w * 0.7, y + (random() - 0.5) * w * 0.25, w * 0.04, w * 0.018, 0, 0, TAU);
    ctx.fill();
  }
}

/** A long pale bottle gourd, the kaddu of kaddu-bhaat. */
export function drawLauki(ctx: Ctx, x: number, y: number, length: number, angle: number, env: Env, lift: number) {
  const l = length;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -l * 0.14, 0, l * 0.14);
  g.addColorStop(0, paint([200, 220, 140], env, lift));
  g.addColorStop(0.5, paint([140, 176, 80], env, lift));
  g.addColorStop(1, paint([70, 100, 40], env, lift));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-l * 0.5, 0);
  ctx.bezierCurveTo(-l * 0.5, -l * 0.14, -l * 0.05, -l * 0.14, l * 0.1, -l * 0.08);
  ctx.bezierCurveTo(l * 0.3, -l * 0.06, l * 0.5, -l * 0.06, l * 0.5, 0);
  ctx.bezierCurveTo(l * 0.5, l * 0.06, l * 0.3, l * 0.06, l * 0.1, l * 0.08);
  ctx.bezierCurveTo(-l * 0.05, l * 0.14, -l * 0.5, l * 0.14, -l * 0.5, 0);
  ctx.fill();
  ctx.strokeStyle = paint([80, 90, 40], env, lift);
  ctx.lineWidth = l * 0.03;
  ctx.beginPath();
  ctx.moveTo(l * 0.5, 0);
  ctx.lineTo(l * 0.58, -l * 0.03);
  ctx.stroke();
  ctx.restore();
}

// ─── People ──────────────────────────────────────────────────────────────────
// Figures stand at the waterline on (0, 0), facing +x, about 1 tall from the water to the crown.

type Figure = { body: Path2D; skin: Path2D; border: Path2D; sindoor: Path2D | null };

function vratiShape(): Figure {
  // Her sari and the pallu drawn over her head and down her back.
  const body = new Path2D();
  body.moveTo(-0.21, 0.02);
  body.bezierCurveTo(-0.24, -0.25, -0.22, -0.5, -0.15, -0.66);
  body.bezierCurveTo(-0.13, -0.82, -0.1, -0.95, 0.0, -0.97);
  body.bezierCurveTo(0.07, -0.98, 0.115, -0.93, 0.12, -0.88);
  body.bezierCurveTo(0.08, -0.82, 0.05, -0.72, 0.06, -0.64);
  body.bezierCurveTo(0.12, -0.6, 0.15, -0.52, 0.15, -0.42);
  body.bezierCurveTo(0.15, -0.28, 0.14, -0.12, 0.17, 0.02);
  body.closePath();
  // Her face in profile, inside the pallu's edge.
  const skin = new Path2D();
  skin.moveTo(0.1, -0.9);
  skin.bezierCurveTo(0.12, -0.87, 0.125, -0.84, 0.125, -0.815);
  skin.lineTo(0.152, -0.772);
  skin.lineTo(0.134, -0.758);
  skin.lineTo(0.138, -0.742);
  skin.lineTo(0.13, -0.73);
  skin.lineTo(0.132, -0.718);
  skin.bezierCurveTo(0.125, -0.7, 0.11, -0.69, 0.09, -0.688);
  skin.bezierCurveTo(0.08, -0.67, 0.078, -0.65, 0.08, -0.63);
  skin.lineTo(0.05, -0.64);
  skin.bezierCurveTo(0.04, -0.72, 0.07, -0.84, 0.1, -0.9);
  skin.closePath();
  // The sari's border along the pallu.
  const border = new Path2D();
  border.moveTo(0.12, -0.9);
  border.bezierCurveTo(0.075, -0.83, 0.05, -0.74, 0.055, -0.64);
  border.bezierCurveTo(0.1, -0.6, 0.13, -0.56, 0.14, -0.5);
  // Sindoor from the tip of the nose up to the parting.
  const sindoor = new Path2D();
  sindoor.moveTo(0.148, -0.774);
  sindoor.lineTo(0.124, -0.815);
  sindoor.bezierCurveTo(0.124, -0.84, 0.118, -0.87, 0.1, -0.905);
  return { body, skin, border, sindoor };
}

function manShape(): Figure {
  const body = new Path2D();
  body.moveTo(-0.2, 0.02);
  body.bezierCurveTo(-0.22, -0.25, -0.22, -0.52, -0.16, -0.62);
  body.bezierCurveTo(-0.1, -0.67, -0.05, -0.68, -0.03, -0.72);
  body.lineTo(0.05, -0.72);
  body.bezierCurveTo(0.07, -0.66, 0.15, -0.62, 0.17, -0.5);
  body.bezierCurveTo(0.18, -0.3, 0.15, -0.12, 0.17, 0.02);
  body.closePath();
  const skin = new Path2D();
  skin.addPath(body);
  skin.moveTo(0.12, -0.83);
  skin.arc(0.02, -0.83, 0.1, 0, TAU);
  skin.moveTo(0.118, -0.84);
  skin.lineTo(0.145, -0.8);
  skin.lineTo(0.115, -0.79);
  skin.closePath();
  // A gamchha, red checked cloth, over the shoulder; and his hair.
  const border = new Path2D();
  border.moveTo(-0.14, -0.64);
  border.quadraticCurveTo(0.0, -0.6, 0.12, -0.5);
  const hair = new Path2D();
  hair.arc(0.01, -0.845, 0.1, Math.PI * 0.9, Math.PI * 1.9);
  hair.closePath();
  return { body: hair, skin, border, sindoor: null };
}

let shapes: { vrati: Figure; man: Figure } | null = null;
const figures = () => (shapes ??= { vrati: vratiShape(), man: manShape() });

export type Person = {
  kind: "vrati" | "man";
  /** Sari or dhoti colour, and the border. */
  cloth: RGB;
  border: RGB;
  /** 0: hands joined; 1: the soop held up; 2: pouring from a lota. */
  pose: 0 | 1 | 2;
  facing: 1 | -1;
};

const SKIN: RGB = [150, 96, 66];

/**
 * A person standing waist deep, `size` tall above the water, at (x, y). `rim` is how much the low
 * sun behind lights their edge (0..1), from the side they face; `lift` is lamplight on them.
 */
export function drawPerson(ctx: Ctx, person: Person, x: number, y: number, size: number, env: Env, rim: number, lift: number, raise: number, seconds: number, seed: number, lamp?: Lamp) {
  const shape = figures()[person.kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size * person.facing, size);
  const breathe = Math.sin(seconds * 1.1 + seed) * 0.004;
  ctx.translate(0, breathe);
  const rimColor = rgb(mix(env.tint, [255, 220, 150], 0.5), rim);
  const skin = paint(SKIN, env, lift);
  const cloth = paint(person.cloth, env, lift);

  // The arms behind the body first, then the body, then the arms in front.
  const arms = (front: boolean) => {
    ctx.strokeStyle = skin;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.055;
    const shoulder = front ? [0.05, -0.6] : [-0.02, -0.62];
    const hold = person.pose === 1 ? raise : 0;
    const elbow = person.pose === 2 ? [0.22, -0.62] : [lerp(0.14, 0.24, hold), lerp(-0.42, -0.6, hold)];
    const hand = person.pose === 2 ? [0.32, -0.82] : [lerp(0.2, 0.36, hold), lerp(-0.56, -0.8, hold)];
    ctx.beginPath();
    ctx.moveTo(shoulder[0], shoulder[1]);
    ctx.lineTo(elbow[0], elbow[1]);
    ctx.lineTo(hand[0] + (front ? 0.015 : -0.01), hand[1]);
    ctx.stroke();
    return hand;
  };
  arms(false);
  if (rim > 0.02) {
    ctx.save();
    ctx.translate(0.018, -0.006);
    ctx.fillStyle = rimColor;
    ctx.fill(shape.body);
    if (person.kind === "man") ctx.fill(shape.skin);
    ctx.restore();
  }
  if (person.kind === "vrati") {
    ctx.fillStyle = skin;
    ctx.fill(shape.skin);
    ctx.fillStyle = cloth;
    ctx.fill(shape.body);
  } else {
    ctx.fillStyle = skin;
    ctx.fill(shape.skin);
    ctx.fillStyle = paint([20, 16, 16], env, lift);
    ctx.fill(shape.body);
  }
  ctx.lineWidth = 0.022;
  ctx.strokeStyle = paint(person.border, env, lift + rim * 0.3);
  ctx.stroke(shape.border);
  if (shape.sindoor) {
    ctx.lineWidth = 0.011;
    ctx.strokeStyle = rgb(mix([255, 96, 10], env.night, (1 - clamp(env.amb + lift + rim * 0.6)) * 0.4));
    ctx.stroke(shape.sindoor);
  }
  const hand = arms(true);

  if (person.pose === 1 && raise > 0.01) {
    // The soop, held up to the sun, with a lamp burning on it.
    ctx.save();
    ctx.translate(hand[0] + 0.1, hand[1] - 0.02);
    ctx.rotate(-0.35 * raise + 0.1);
    ctx.scale(0.5, 0.5);
    soopEdge(ctx, paint([200, 130, 50], env, lift + rim * 0.3), paint([150, 96, 40], env, lift + rim * 0.2));
    ctx.restore();
    lamp?.(x + person.facing * size * (hand[0] + 0.1), y + size * (hand[1] - 0.12), size);
  }
  if (person.pose === 2) {
    // A brass lota, tipped to pour.
    ctx.save();
    ctx.translate(hand[0] + 0.03, hand[1] - 0.02);
    ctx.rotate(0.9);
    ctx.fillStyle = paint([220, 170, 70], env, lift + rim * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, 0.06, 0, TAU);
    ctx.fill();
    ctx.fillRect(-0.03, -0.09, 0.06, 0.05);
    ctx.fillRect(-0.045, -0.1, 0.09, 0.02);
    ctx.restore();
  }
  ctx.restore();
}

/** Her reflection: the same figure, darker, upside down under the water and broken by ripples. */
export function drawReflection(ctx: Ctx, person: Person, x: number, y: number, size: number, env: Env, lift: number, seconds: number, seed: number) {
  const shape = figures()[person.kind];
  ctx.save();
  ctx.translate(x + Math.sin(seconds * 1.7 + seed) * size * 0.01, y);
  ctx.scale(size * person.facing, -size * 0.8);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = paint(mix(person.cloth, [20, 20, 40], 0.5), env, lift);
  ctx.fill(person.kind === "vrati" ? shape.body : shape.skin);
  ctx.restore();
}

/**
 * A woman sitting on the ground, seen from behind, her pallu over her head: `size` tall. She
 * turns a little toward `facing`; `glow` is lamplight on that side of her.
 */
export function drawSitting(ctx: Ctx, x: number, y: number, size: number, cloth: RGB, border: RGB, env: Env, glow: number, facing = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size * facing, size);
  const body = ctx.createLinearGradient(-0.4, 0, 0.4, 0);
  body.addColorStop(0, paint(mix(cloth, [0, 0, 0], 0.4), env, 0));
  body.addColorStop(0.55, paint(cloth, env, glow * 0.4));
  body.addColorStop(1, paint(mix(cloth, [255, 230, 180], 0.15), env, glow));
  ctx.fillStyle = body;
  // Folded legs under the sari, the hips and back, the pallu over her head and shoulders.
  ctx.beginPath();
  ctx.moveTo(-0.4, 0);
  ctx.bezierCurveTo(-0.42, -0.1, -0.34, -0.17, -0.25, -0.2);
  ctx.bezierCurveTo(-0.2, -0.3, -0.17, -0.42, -0.2, -0.54);
  ctx.bezierCurveTo(-0.22, -0.62, -0.16, -0.66, -0.09, -0.69);
  ctx.bezierCurveTo(-0.13, -0.76, -0.12, -0.99, 0.01, -0.99);
  ctx.bezierCurveTo(0.12, -0.99, 0.14, -0.78, 0.1, -0.7);
  ctx.bezierCurveTo(0.17, -0.67, 0.23, -0.63, 0.21, -0.54);
  ctx.bezierCurveTo(0.19, -0.42, 0.2, -0.3, 0.25, -0.2);
  ctx.bezierCurveTo(0.34, -0.17, 0.43, -0.1, 0.42, 0);
  ctx.closePath();
  ctx.fill();
  // A fold where the back meets the legs.
  ctx.strokeStyle = paint(mix(cloth, [0, 0, 0], 0.35), env, 0, 0.6);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.24, -0.19);
  ctx.quadraticCurveTo(0, -0.14, 0.24, -0.19);
  ctx.stroke();
  // The border of the pallu, from her crown down across her back, and along the hem.
  ctx.strokeStyle = paint(border, env, glow * 0.6);
  ctx.lineWidth = 0.03;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0.08, -0.93);
  ctx.bezierCurveTo(0.14, -0.8, 0.08, -0.68, -0.02, -0.58);
  ctx.bezierCurveTo(-0.12, -0.46, -0.2, -0.32, -0.16, -0.2);
  ctx.moveTo(-0.39, -0.02);
  ctx.quadraticCurveTo(0, 0.02, 0.41, -0.02);
  ctx.stroke();
  // Her arm, bare below the elbow, reaching forward.
  ctx.strokeStyle = paint([150, 96, 66], env, glow);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(0.18, -0.55);
  ctx.quadraticCurveTo(0.26, -0.38, 0.36, -0.3);
  ctx.stroke();
  if (glow > 0.02) {
    ctx.strokeStyle = `rgba(255, 200, 120, ${0.6 * Math.min(1, glow)})`;
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(0.01, -0.99);
    ctx.bezierCurveTo(0.12, -0.99, 0.14, -0.78, 0.1, -0.7);
    ctx.bezierCurveTo(0.17, -0.67, 0.23, -0.63, 0.21, -0.54);
    ctx.bezierCurveTo(0.19, -0.42, 0.2, -0.3, 0.25, -0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A man walking to the ghat with a daura on his head: a deep bamboo basket covered in yellow
 * cloth, sugarcane sticking out of it. `size` is his height; his feet are on (x, y); `stride` is
 * how far through his step he is, in radians.
 */
export function drawCarrier(ctx: Ctx, x: number, y: number, size: number, stride: number, env: Env, rim: number, facing: number, carrying: boolean, cloth: RGB, vest = true) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  const skin = paint(SKIN, env, 0);
  const dhoti = paint(cloth, env, 0);
  const swing = Math.sin(stride) * 0.1;
  const bob = Math.abs(Math.cos(stride)) * 0.012;
  ctx.translate(0, -bob);
  ctx.lineCap = "round";
  // Legs, under the dhoti.
  ctx.strokeStyle = paint([110, 70, 48], env, 0);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(0, -0.46);
  ctx.lineTo(swing, 0);
  ctx.moveTo(0, -0.46);
  ctx.lineTo(-swing, 0);
  ctx.stroke();
  ctx.fillStyle = dhoti;
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.56);
  ctx.lineTo(0.11, -0.56);
  ctx.lineTo(0.1 + Math.max(0, swing) * 0.6, -0.18);
  ctx.lineTo(-0.1 + Math.min(0, -swing) * 0.6, -0.18);
  ctx.closePath();
  ctx.fill();
  // Torso, bare or in a vest; head.
  ctx.fillStyle = vest ? paint([236, 230, 214], env, 0) : paint(SKIN, env, 0);
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.55);
  ctx.lineTo(-0.11, -0.8);
  ctx.quadraticCurveTo(0, -0.86, 0.11, -0.8);
  ctx.lineTo(0.1, -0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0.01, -0.9, 0.06, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.06, -0.91);
  ctx.lineTo(0.085, -0.88);
  ctx.lineTo(0.06, -0.87);
  ctx.fill();
  if (rim > 0.02) {
    ctx.strokeStyle = `rgba(255, 210, 140, ${rim * 0.8})`;
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.arc(0.01, -0.9, 0.06, -Math.PI * 0.6, Math.PI * 0.3);
    ctx.moveTo(0.11, -0.8);
    ctx.lineTo(0.1, -0.55);
    ctx.stroke();
  }
  // Arms up, steadying the daura.
  ctx.strokeStyle = skin;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(0.08, -0.8);
  ctx.lineTo(0.16, -0.92);
  ctx.lineTo(0.12, -1.02);
  ctx.moveTo(-0.08, -0.8);
  ctx.lineTo(-0.15, -0.92);
  ctx.lineTo(-0.12, -1.02);
  ctx.stroke();
  if (carrying) {
    // Offerings heaped above the rim: sugarcane, bananas, a coconut, apples.
    ctx.strokeStyle = paint([92, 36, 58], env, rim * 0.3);
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(-0.1, -1.1);
    ctx.lineTo(-0.22, -1.62);
    ctx.moveTo(0.08, -1.1);
    ctx.lineTo(0.2, -1.55);
    ctx.stroke();
    ctx.strokeStyle = paint([80, 130, 50], env, rim * 0.3);
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    for (const [tx, ty, d] of [[-0.22, -1.62, -1], [0.2, -1.55, 1]]) {
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + d * (0.06 + i * 0.04), ty - 0.08 + i * 0.02, tx + d * (0.1 + i * 0.05), ty + 0.02 + i * 0.03);
      }
    }
    ctx.stroke();
    const heap = (hx: number, hy: number, r: number, color: RGB) => {
      ctx.fillStyle = paint(color, env, rim * 0.3);
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, TAU);
      ctx.fill();
    };
    heap(0.1, -1.16, 0.07, [120, 72, 36]);
    heap(-0.05, -1.15, 0.05, [200, 40, 36]);
    heap(0.18, -1.13, 0.045, [236, 140, 36]);
    ctx.strokeStyle = paint([214, 196, 60], env, rim * 0.3);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(-0.22, -1.12);
    ctx.quadraticCurveTo(-0.14, -1.24, -0.04, -1.16);
    ctx.stroke();
    // The daura: a deep round basket of split bamboo, wider at the mouth.
    const basket = ctx.createLinearGradient(-0.26, 0, 0.26, 0);
    basket.addColorStop(0, paint([130, 86, 40], env, 0));
    basket.addColorStop(0.6, paint([196, 146, 80], env, rim * 0.3));
    basket.addColorStop(1, paint([150, 100, 50], env, rim * 0.5));
    ctx.fillStyle = basket;
    ctx.beginPath();
    ctx.moveTo(-0.19, -0.97);
    ctx.lineTo(0.19, -0.97);
    ctx.lineTo(0.26, -1.13);
    ctx.quadraticCurveTo(0, -1.1, -0.26, -1.13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([110, 70, 30], env, 0, 0.55);
    ctx.lineWidth = 0.007;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      ctx.moveTo(-0.19 + i * 0.0475, -0.97);
      ctx.lineTo(-0.26 + i * 0.065, -1.12);
    }
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      ctx.moveTo(-0.19 - t * 0.07, -0.97 - t * 0.155);
      ctx.lineTo(0.19 + t * 0.07, -0.97 - t * 0.155);
    }
    ctx.stroke();
    // A yellow cloth tucked over the front of it, its red border hanging down.
    ctx.fillStyle = paint([242, 190, 30], env, rim * 0.4);
    ctx.beginPath();
    ctx.moveTo(-0.27, -1.13);
    ctx.quadraticCurveTo(-0.05, -1.2, 0.05, -1.12);
    ctx.quadraticCurveTo(0.02, -1.02, -0.08, -0.98);
    ctx.lineTo(-0.2, -1.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([200, 30, 30], env, rim * 0.3);
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.98);
    ctx.lineTo(-0.2, -1.0);
    ctx.stroke();
  }
  ctx.restore();
}

/** A woman walking to the ghat behind the men, a lota in her hands, singing. Like `drawCarrier`. */
export function drawWalker(ctx: Ctx, x: number, y: number, size: number, stride: number, env: Env, rim: number, facing: number, cloth: RGB, border: RGB) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  const swing = Math.sin(stride) * 0.05;
  ctx.translate(0, -Math.abs(Math.cos(stride)) * 0.008);
  ctx.fillStyle = paint([110, 70, 48], env, 0);
  ctx.fillRect(swing - 0.03, -0.04, 0.07, 0.04);
  ctx.fillRect(-swing - 0.03, -0.04, 0.07, 0.04);
  // The sari falls to her ankles, the pallu over her head and down her back.
  ctx.fillStyle = paint(cloth, env, 0);
  ctx.beginPath();
  ctx.moveTo(-0.13 - Math.abs(swing) * 0.4, -0.03);
  ctx.bezierCurveTo(-0.13, -0.3, -0.14, -0.6, -0.12, -0.8);
  ctx.bezierCurveTo(-0.1, -0.92, -0.07, -0.98, 0.0, -0.98);
  ctx.bezierCurveTo(0.05, -0.98, 0.08, -0.95, 0.075, -0.9);
  ctx.bezierCurveTo(0.05, -0.86, 0.05, -0.82, 0.1, -0.78);
  ctx.bezierCurveTo(0.12, -0.6, 0.1, -0.3, 0.13 + Math.abs(swing) * 0.4, -0.03);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paint(SKIN, env, 0);
  ctx.beginPath();
  ctx.moveTo(0.07, -0.93);
  ctx.lineTo(0.095, -0.88);
  ctx.lineTo(0.08, -0.86);
  ctx.lineTo(0.08, -0.83);
  ctx.lineTo(0.05, -0.82);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = paint(border, env, 0);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(0.075, -0.92);
  ctx.bezierCurveTo(0.03, -0.84, 0.02, -0.7, 0.1, -0.6);
  ctx.moveTo(-0.13 - Math.abs(swing) * 0.4, -0.05);
  ctx.lineTo(0.13 + Math.abs(swing) * 0.4, -0.05);
  ctx.stroke();
  // Arms bent, the lota held before her.
  ctx.strokeStyle = paint(SKIN, env, 0);
  ctx.lineWidth = 0.04;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0.04, -0.76);
  ctx.lineTo(0.08, -0.6);
  ctx.lineTo(0.17, -0.62);
  ctx.stroke();
  ctx.fillStyle = paint([226, 176, 72], env, rim * 0.4);
  ctx.beginPath();
  ctx.arc(0.19, -0.64, 0.05, 0, TAU);
  ctx.fill();
  ctx.fillRect(0.165, -0.72, 0.05, 0.05);
  if (rim > 0.02) {
    ctx.strokeStyle = `rgba(255, 210, 140, ${rim * 0.7})`;
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.8);
    ctx.bezierCurveTo(-0.1, -0.92, -0.07, -0.98, 0.0, -0.98);
    ctx.stroke();
  }
  ctx.restore();
}
