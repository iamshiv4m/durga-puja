// Colour for Holi: gulal in clouds, water from pichkaris and buckets, and the stains both leave on
// the lane. Everything is in world units (see ./scene.ts), drawn inside the camera transform.
import { TAU, mulberry32, onScreen, rgb, type Ctx, type RGB, type View } from "../paint";

/** Gulal as it comes from the shop: bright, a little chalky. */
export const GULAL: RGB[] = [
  [238, 42, 123], // pink
  [40, 178, 84], // green
  [250, 196, 24], // yellow
  [124, 58, 204], // purple
  [252, 116, 24], // orange
  [36, 112, 230], // blue
  [214, 26, 58], // red
  [196, 32, 160], // magenta
];

const puffs = new Map<string, HTMLCanvasElement>();

/** A soft, powdery ball of `color`, drawn once and reused. */
export function puffSprite(color: RGB) {
  const key = color.join(",");
  let sprite = puffs.get(key);
  if (!sprite) {
    const size = 128;
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    const g = sprite.getContext("2d")!;
    const c = size / 2;
    const gradient = g.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, rgb(color, 0.9));
    gradient.addColorStop(0.35, rgb(color, 0.62));
    gradient.addColorStop(0.7, rgb(color, 0.18));
    gradient.addColorStop(1, rgb(color, 0));
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    // Grain, so it reads as powder rather than light.
    const random = mulberry32(color[0] * 7 + color[1] * 3 + color[2]);
    for (let i = 0; i < 220; i++) {
      const a = random() * TAU;
      const r = Math.sqrt(random()) * c * 0.85;
      g.fillStyle = rgb(color.map((v) => Math.min(255, v + 40)) as RGB, 0.25 * (1 - r / c));
      g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 1.5, 1.5);
    }
    puffs.set(key, sprite);
  }
  return sprite;
}

type Puff = { x: number; y: number; vx: number; vy: number; r: number; grow: number; life: number; age: number; alpha: number; sprite: HTMLCanvasElement };

const MAX_PUFFS = 1300;

/** Clouds of gulal: each throw is a few dozen puffs that billow out, slow, rise and thin away. */
export class Clouds {
  private puffs: Puff[] = [];

  burst(x: number, y: number, color: RGB, count = 36, speed = 2.4, size = 0.35, up = 0.6) {
    const sprite = puffSprite(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.25 + Math.random() * 0.75);
      this.puffs.push({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.7 - up * Math.random(),
        r: size * (0.4 + Math.random() * 0.6),
        grow: size * (0.5 + Math.random() * 0.9),
        life: 1.8 + Math.random() * 2,
        age: 0,
        alpha: 0.35 + Math.random() * 0.35,
        sprite,
      });
    }
    if (this.puffs.length > MAX_PUFFS) this.puffs.splice(0, this.puffs.length - MAX_PUFFS);
  }

  /** A thrown handful: a burst trailing along the direction of the throw. */
  throw(x: number, y: number, dx: number, dy: number, color: RGB, count = 22, size = 0.3) {
    const sprite = puffSprite(color);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      this.puffs.push({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        vx: dx * (0.4 + t) + (Math.random() - 0.5) * 1.2,
        vy: dy * (0.4 + t) + (Math.random() - 0.5) * 1.2 - 0.4,
        r: size * (0.3 + Math.random() * 0.6),
        grow: size * (1 + Math.random() * 1.5),
        life: 1.8 + Math.random() * 2,
        age: 0,
        alpha: 0.45 + Math.random() * 0.4,
        sprite,
      });
    }
    if (this.puffs.length > MAX_PUFFS) this.puffs.splice(0, this.puffs.length - MAX_PUFFS);
  }

  get count() {
    return this.puffs.length;
  }

  update(dt: number, wind: number) {
    if (dt <= 0) return;
    const drag = Math.exp(-2.6 * dt);
    this.puffs = this.puffs.filter((q) => {
      q.age += dt;
      if (q.age >= q.life) return false;
      q.vx = q.vx * drag + wind * dt;
      q.vy = q.vy * drag - 0.25 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.r += q.grow * dt * (1 - q.age / q.life);
      return true;
    });
  }

  draw(ctx: Ctx, v: View, fade = 1) {
    for (const q of this.puffs) {
      if (!onScreen(v, q.x, q.y, q.r)) continue;
      const t = q.age / q.life;
      const a = q.alpha * fade * Math.min(1, q.age * 8) * (1 - t) ** 1.4;
      if (a < 0.01) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(q.sprite, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
    }
    ctx.globalAlpha = 1;
  }
}

type Drop = { x: number; y: number; vx: number; vy: number; floor: number; color: RGB; age: number };

const MAX_DROPS = 900;

/** Coloured water, from pichkaris and buckets; it stains wherever it lands. */
export class Water {
  private drops: Drop[] = [];

  /** One squirt's worth of drops leaving (x, y) at `angle` (radians, 0 = right, up is negative). */
  squirt(x: number, y: number, angle: number, speed: number, color: RGB, floor: number, count = 3) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * 0.06;
      const s = speed * (0.92 + Math.random() * 0.12);
      this.drops.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, floor: floor + (Math.random() - 0.5) * 0.4, color, age: 0 });
    }
    this.trim();
  }

  /** A bucket tipped over the balcony rail at (x, y). */
  pour(x: number, y: number, color: RGB, floor: number, count = 10) {
    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: x + (Math.random() - 0.5) * 0.35,
        y: y + Math.random() * 0.1,
        vx: 0.6 + Math.random() * 1.1,
        vy: -0.4 + Math.random() * 0.6,
        floor: floor + Math.random() * 1.2,
        color,
        age: 0,
      });
    }
    this.trim();
  }

  private trim() {
    if (this.drops.length > MAX_DROPS) this.drops.splice(0, this.drops.length - MAX_DROPS);
  }

  /** Moves the drops; calls `land` for every drop that reaches its floor. */
  update(dt: number, land: (x: number, y: number, color: RGB) => void) {
    if (dt <= 0) return;
    this.drops = this.drops.filter((d) => {
      d.age += dt;
      d.vy += 9.5 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= d.floor && d.vy > 0) {
        if (Math.random() < 0.35) land(d.x, d.floor, d.color);
        return false;
      }
      return d.age < 4;
    });
  }

  draw(ctx: Ctx, v: View) {
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.035, 2.4 / v.scale);
    for (const d of this.drops) {
      if (!onScreen(v, d.x, d.y, 0.3)) continue;
      ctx.strokeStyle = rgb(d.color, 0.85);
      ctx.beginPath();
      ctx.moveTo(d.x - d.vx * 0.022, d.y - d.vy * 0.022);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }
  }
}

/** A handprint of `color`, fingers up, `size` tall, centred on (x, y). */
export function handprint(g: Ctx, x: number, y: number, size: number, angle: number, color: RGB, alpha = 0.85) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = rgb(color, alpha);
  g.beginPath();
  g.ellipse(0, size * 0.05, size * 0.24, size * 0.28, 0, 0, TAU);
  g.fill();
  // Four fingers and a thumb.
  [
    [-0.17, -0.15, 0.2, -0.14],
    [-0.06, -0.2, 0.26, -0.04],
    [0.06, -0.19, 0.25, 0.04],
    [0.17, -0.13, 0.2, 0.14],
  ].forEach(([fx, fy, len, lean]) => {
    g.save();
    g.translate(fx * size, fy * size);
    g.rotate(lean);
    g.beginPath();
    g.ellipse(0, -len * size * 0.5, size * 0.055, len * size * 0.6, 0, 0, TAU);
    g.fill();
    g.restore();
  });
  g.save();
  g.translate(-size * 0.26, size * 0.08);
  g.rotate(-0.9);
  g.beginPath();
  g.ellipse(0, -size * 0.08, size * 0.06, size * 0.14, 0, 0, TAU);
  g.fill();
  g.restore();
  g.restore();
}

const hazes = new Map<string, HTMLCanvasElement>();

/** A wide, even haze of `color`, for colour hanging in the air. */
export function hazeSprite(color: RGB) {
  const key = color.join(",");
  let sprite = hazes.get(key);
  if (!sprite) {
    const size = 128;
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    const g = sprite.getContext("2d")!;
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, rgb(color, 0.6));
    gradient.addColorStop(0.45, rgb(color, 0.38));
    gradient.addColorStop(0.8, rgb(color, 0.1));
    gradient.addColorStop(1, rgb(color, 0));
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    hazes.set(key, sprite);
  }
  return sprite;
}

/** Powder or coloured water, landed: a soft patch pressed flat, and grains thrown further out. */
export function splat(g: Ctx, x: number, y: number, r: number, color: RGB, random: () => number = Math.random, alpha = 0.7) {
  const sprite = puffSprite(color);
  for (let i = 0; i < 3; i++) {
    const a = random() * TAU;
    const d = random() * r * 0.4;
    const s = r * (0.7 + random() * 0.6);
    g.globalAlpha = alpha * (0.5 + random() * 0.4);
    g.drawImage(sprite, x + Math.cos(a) * d - s, y + Math.sin(a) * d * 0.5 - s * 0.55, s * 2, s * 1.1);
  }
  g.fillStyle = rgb(color);
  for (let i = 0; i < 26; i++) {
    const a = random() * TAU;
    const d = r * (0.2 + random() * 1.2);
    g.globalAlpha = alpha * (0.4 + random() * 0.6);
    const s = r * (0.015 + random() * 0.04);
    g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, s, s);
  }
  g.globalAlpha = 1;
}

/**
 * The lane's colour, kept in two layers over the world: what the day does on its own (painted once
 * and revealed with the scroll) and what the reader throws.
 */
export class Stains {
  static readonly X0 = -34;
  static readonly X1 = 34;
  static readonly Y0 = -9;
  static readonly Y1 = 9;
  static readonly RES = 40;
  readonly thrown: HTMLCanvasElement;
  private readonly g: Ctx;

  constructor() {
    this.thrown = Stains.layer();
    this.g = Stains.context(this.thrown);
  }

  /** A blank layer, and a context on it that draws in world units. */
  static layer() {
    const canvas = document.createElement("canvas");
    canvas.width = (Stains.X1 - Stains.X0) * Stains.RES;
    canvas.height = (Stains.Y1 - Stains.Y0) * Stains.RES;
    return canvas;
  }

  static context(canvas: HTMLCanvasElement) {
    const g = canvas.getContext("2d")!;
    g.setTransform(Stains.RES, 0, 0, Stains.RES, -Stains.X0 * Stains.RES, -Stains.Y0 * Stains.RES);
    return g;
  }

  splat(x: number, y: number, r: number, color: RGB, alpha = 0.6) {
    splat(this.g, x, y, r, color, Math.random, alpha);
  }

  static draw(ctx: Ctx, layer: HTMLCanvasElement, alpha: number) {
    if (alpha <= 0.005) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(layer, Stains.X0, Stains.Y0, Stains.X1 - Stains.X0, Stains.Y1 - Stains.Y0);
    ctx.globalAlpha = 1;
  }
}
