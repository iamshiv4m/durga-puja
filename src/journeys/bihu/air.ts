// What moves through the air of the Bihu valley, in world units: kopou petals falling from the
// orchid, pond water thrown over the cattle and its rings, a gamosa flung to the husori, fireflies
// over the fields at night, and the soft spring clouds.
import { TAU, glow, glowSprite, lerp, mix, mulberry32, rgb, type Ctx, type RGB, type View } from "../paint";

type Petal = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  size: number;
  color: RGB;
  floor: number;
  age: number;
};
type Drop = { x: number; y: number; vx: number; vy: number; floor: number; age: number };
type Ring = { x: number; y: number; age: number; size: number };

const MAX_PETALS = 360;
const MAX_DROPS = 300;
const MAX_RINGS = 40;

export const PETAL_COLOURS: RGB[] = [
  [250, 236, 244],
  [238, 170, 214],
  [214, 110, 186],
  [248, 214, 232],
];

/** Kopou petals, pond water and its rings. */
export class Air {
  petals: Petal[] = [];
  drops: Drop[] = [];
  rings: Ring[] = [];

  /** Petals let go from around (x, y), to settle on the ground at `floor`. */
  petalsFrom(x: number, y: number, count: number, spread: number, floor: number) {
    for (let i = 0; i < count; i++) {
      this.petals.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.4,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.2 - Math.random() * 0.4,
        spin: (Math.random() - 0.5) * 8,
        angle: Math.random() * TAU,
        size: 0.028 + Math.random() * 0.03,
        color: PETAL_COLOURS[Math.floor(Math.random() * PETAL_COLOURS.length)],
        floor: floor + (Math.random() - 0.3) * 0.8,
        age: 0,
      });
    }
    if (this.petals.length > MAX_PETALS) this.petals.splice(0, this.petals.length - MAX_PETALS);
  }

  /** Water thrown up from the hands at (x, y), falling back on to the water at `floor`. */
  splash(x: number, y: number, count: number, toward = 0) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6 + toward * 0.4;
      const s = 2 + Math.random() * 3.2;
      this.drops.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y,
        vx: Math.cos(a) * s * 0.6,
        vy: Math.sin(a) * s,
        floor: y + 0.1 + Math.random() * 0.4,
        age: 0,
      });
    }
    if (this.drops.length > MAX_DROPS) this.drops.splice(0, this.drops.length - MAX_DROPS);
  }

  ring(x: number, y: number, size = 1) {
    this.rings.push({ x, y, age: 0, size });
    if (this.rings.length > MAX_RINGS) this.rings.shift();
  }

  update(dt: number, wind: number) {
    for (const p of this.petals) {
      p.age += dt;
      if (p.y < p.floor) {
        p.vy = Math.min(0.55, p.vy + dt * 1.2);
        p.vx += (wind * 0.3 + Math.sin(p.age * 2.3 + p.spin) * 0.6 - p.vx) * dt * 1.5;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
      } else p.y = p.floor;
    }
    this.petals = this.petals.filter((p) => p.age < 9);
    const fallen: Drop[] = [];
    for (const d of this.drops) {
      d.age += dt;
      d.vy += dt * 9;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.vy > 0 && d.y > d.floor) fallen.push(d);
    }
    for (const d of fallen) if (Math.random() < 0.3) this.ring(d.x, d.floor, 0.4);
    this.drops = this.drops.filter((d) => !(d.vy > 0 && d.y > d.floor) && d.age < 3);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < 1.6);
  }

  drawRings(g: Ctx) {
    g.lineWidth = 0.018;
    for (const r of this.rings) {
      const t = r.age / 1.6;
      g.strokeStyle = `rgba(236, 244, 250, ${0.4 * (1 - t)})`;
      g.beginPath();
      g.ellipse(r.x, r.y, (0.1 + t * 0.9) * r.size, (0.03 + t * 0.14) * r.size, 0, 0, TAU);
      g.stroke();
    }
  }

  drawPetals(g: Ctx) {
    for (const p of this.petals) {
      const fade = p.age > 7 ? 1 - (p.age - 7) / 2 : 1;
      g.globalAlpha = fade;
      g.fillStyle = rgb(p.color);
      g.beginPath();
      g.ellipse(p.x, p.y, p.size, p.size * 0.6 * Math.abs(Math.cos(p.angle)) + p.size * 0.2, p.angle * 0.3, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  drawDrops(g: Ctx) {
    g.fillStyle = "rgba(230, 240, 248, 0.85)";
    for (const d of this.drops) {
      g.beginPath();
      g.ellipse(d.x, d.y, 0.022, 0.034, Math.atan2(d.vy, d.vx) + Math.PI / 2, 0, TAU);
      g.fill();
    }
  }
}

// ─── Fireflies ───────────────────────────────────────────────────────────────

type Fly = { x: number; y: number; h: number; seed: number; speed: number; born: number; life: number };

const MAX_FLIES = 420;

/** Jonaki: fireflies rising out of the grass, blinking, drifting. */
export class Fireflies {
  private readonly flies: Fly[] = [];

  constructor(from: number, to: number, count: number, seed: number) {
    const random = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      this.flies.push({
        x: lerp(from, to, random()),
        y: 0.2 + random() ** 0.8 * 6,
        h: 0.1 + random() * 1.8,
        seed: random() * 100,
        speed: 0.3 + random() * 0.6,
        born: -1,
        life: 0,
      });
    }
  }

  /** New ones, woken from the grass at (x, y). */
  wake(x: number, y: number, count: number, seconds: number) {
    for (let i = 0; i < count; i++) {
      this.flies.push({
        x: x + (Math.random() - 0.5) * 1.6,
        y: y + (Math.random() - 0.5) * 0.4,
        h: 0,
        seed: Math.random() * 100,
        speed: 0.6 + Math.random() * 0.8,
        born: seconds,
        life: 8 + Math.random() * 6,
      });
    }
    if (this.flies.length > MAX_FLIES) this.flies.splice(0, this.flies.length - MAX_FLIES);
  }

  /** Call inside "lighter". */
  draw(ctx: Ctx, v: View, seconds: number, amount: number, reduced: boolean) {
    if (amount < 0.01) return;
    const sprite = glowSprite("190, 255, 120", 64);
    const t = reduced ? 0 : seconds;
    const halfW = v.width / 2 / v.scale + 2;
    const halfH = v.height / 2 / v.scale + 3;
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      let rise = f.h;
      let fade = 1;
      if (f.born >= 0) {
        const age = seconds - f.born;
        if (age > f.life) {
          this.flies.splice(i, 1);
          continue;
        }
        rise = Math.min(2.4, age * f.speed * 0.5);
        fade = Math.min(1, age * 2) * Math.min(1, (f.life - age) / 2);
      }
      const x = f.x + Math.sin(t * 0.3 * f.speed + f.seed) * 0.8 + Math.sin(t * 0.9 + f.seed * 3) * 0.15;
      const y = f.y - rise - Math.sin(t * 0.4 * f.speed + f.seed * 2) * 0.35;
      if (Math.abs(x - v.x) > halfW || Math.abs(y - v.y) > halfH) continue;
      const blink = Math.max(0, Math.sin(t * (1.3 + f.speed) + f.seed * 5));
      const a = amount * fade * (0.15 + 0.85 * blink ** 3);
      if (a < 0.02) continue;
      glow(ctx, sprite, x, y, 0.22 + 0.08 * blink, a * 0.7);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgb(236, 255, 190)";
      ctx.fillRect(x - 0.018, y - 0.018, 0.036, 0.036);
      ctx.globalAlpha = 1;
    }
  }
}

// ─── Clouds ──────────────────────────────────────────────────────────────────

const cloudSprites: HTMLCanvasElement[] = [];

/** A soft spring cumulus: many overlapping puffs, lit from above, flat below. */
export function cloudSprite(index: number) {
  if (cloudSprites[index]) return cloudSprites[index];
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 180;
  const g = canvas.getContext("2d")!;
  const random = mulberry32(700 + index * 13);
  const puffs = 22 + index * 4;
  for (let i = 0; i < puffs; i++) {
    const t = random();
    const x = 50 + t * 320;
    const hump = Math.sin(t * Math.PI);
    const r = 24 + hump * 46 * (0.6 + random() * 0.6);
    const y = 140 - r * 0.7 - hump * 20 * random();
    const grad = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
    const lit = mix([255, 255, 255], [214, 220, 232], 0.2 + (y / 180) * 0.3);
    grad.addColorStop(0, rgb(lit, 0.9));
    grad.addColorStop(0.6, rgb(lit, 0.5));
    grad.addColorStop(1, rgb(lit, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // Flatten the underside.
  g.globalCompositeOperation = "destination-out";
  const cut = g.createLinearGradient(0, 128, 0, 160);
  cut.addColorStop(0, "rgba(0, 0, 0, 0)");
  cut.addColorStop(1, "rgba(0, 0, 0, 1)");
  g.fillStyle = cut;
  g.fillRect(0, 128, 420, 52);
  cloudSprites[index] = canvas;
  return canvas;
}
