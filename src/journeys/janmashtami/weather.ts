// The sky over the whole story: its colour through the night and day, the half moon of Ashtami, the
// dawn sun, the band of monsoon cloud, lightning, and the rain.
import { TAU, clamp, glow, glowSprite, lerp, mix, mulberry32, onScreen, rgb, toScreen, type Ctx, type RGB, type View } from "../paint";
import { CLOUD_LIGHT, CLOUD_SHADE, HORIZON, SKY_LOW, SKY_TOP, track } from "./world";

type Puff = { x: number; y: number; w: number; variant: number; storm: boolean };
type Bolt = { points: { x: number; y: number }[]; branches: { x: number; y: number }[][]; born: number; life: number };

const QUANT = 6;
const q = (c: RGB): RGB => [Math.round(c[0] / QUANT) * QUANT, Math.round(c[1] / QUANT) * QUANT, Math.round(c[2] / QUANT) * QUANT];

/** A puff of cloud lit from above, `light` over `shade`; the last few tints are kept. */
const puffCache = new Map<string, HTMLCanvasElement>();
function puffSprite(light: RGB, shade: RGB, variant: number) {
  const key = `${q(light).join()}/${q(shade).join()}/${variant}`;
  let sprite = puffCache.get(key);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = 256;
  sprite.height = 150;
  const g = sprite.getContext("2d")!;
  const random = mulberry32(31 + variant * 17);
  const lobes = 6 + variant * 2;
  for (let i = 0; i < lobes; i++) {
    const t = i / (lobes - 1);
    const cx = 40 + t * 176 + (random() - 0.5) * 20;
    const r = 30 + Math.sin(t * Math.PI) * 34 + random() * 14;
    const cy = 112 - Math.sin(t * Math.PI) * 26 - random() * 12;
    const gradient = g.createRadialGradient(cx - r * 0.2, cy - r * 0.45, r * 0.1, cx, cy, r);
    gradient.addColorStop(0, rgb(mix(light, [255, 255, 255], 0.08), 0.95));
    gradient.addColorStop(0.55, rgb(mix(light, shade, 0.45), 0.8));
    gradient.addColorStop(1, rgb(shade, 0));
    g.fillStyle = gradient;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.fill();
  }
  puffCache.set(key, sprite);
  if (puffCache.size > 18) puffCache.delete(puffCache.keys().next().value!);
  return sprite;
}

export class Weather {
  private readonly puffs: Puff[] = [];
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private bolts: Bolt[] = [];
  private random = mulberry32(8080);
  /** Brightness of the lightning this frame, 0..1. */
  flash = 0;

  constructor() {
    const random = mulberry32(1908);
    // Low, heavy storm cloud over Mathura and the river; higher, lighter cloud everywhere else.
    for (let x = -34; x < 132; x += 1.6 + random() * 1.6) {
      const stormy = x < 30;
      const rows = stormy ? 3 : 2;
      for (let r = 0; r < rows; r++) {
        const y = stormy ? -12.5 + r * 2.1 + random() * 1.2 : -16.5 + r * 3 + random() * 2;
        this.puffs.push({ x: x + random() * 1.5, y, w: (stormy ? 5.5 : 5) + random() * 4, variant: Math.floor(random() * 3), storm: stormy });
      }
    }
    for (let i = 0; i < 220; i++) this.stars.push({ x: random(), y: random() ** 1.3, r: 0.4 + random() * 1.1, seed: random() * 10 });
  }

  /** The sky, behind everything, in screen space. `moon` and `sun` fade them in. */
  sky(ctx: Ctx, v: View, p: number, seconds: number, moon: number, sun: number, stars: number) {
    const { width, height } = v;
    const horizon = clamp(toScreen(v, 0, HORIZON).y / height, 0.08, 1.6);
    const top = track(SKY_TOP, p);
    const low = track(SKY_LOW, p);
    const lit = this.flash * 0.5;
    const sky = ctx.createLinearGradient(0, 0, 0, height * horizon);
    sky.addColorStop(0, rgb(mix(top, [120, 130, 170], lit * 0.6)));
    sky.addColorStop(0.65, rgb(mix(mix(top, low, 0.45), [150, 160, 200], lit)));
    sky.addColorStop(1, rgb(mix(low, [170, 180, 220], lit)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    if (stars > 0.01) {
      ctx.fillStyle = "#eef0ff";
      for (const s of this.stars) {
        const y = s.y * height * horizon * 0.9;
        const twinkle = 0.55 + 0.45 * Math.sin(seconds * (0.7 + s.seed * 0.2) + s.seed * 6);
        ctx.globalAlpha = twinkle * stars * (1 - y / (height * horizon)) * 0.8;
        ctx.fillRect(s.x * width, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    const R = Math.min(width, height);
    if (moon > 0.01) {
      // The half moon of Ashtami, lit on its left side as it wanes, low in the east at midnight.
      const mx = width * 0.78;
      const my = height * horizon * 0.34;
      const mr = R * 0.035;
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite("200, 210, 255"), mx, my, mr * 9, 0.35 * moon);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = moon;
      ctx.fillStyle = "rgba(40, 44, 70, 0.6)";
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f4f0e0";
      ctx.beginPath();
      ctx.arc(mx, my, mr, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (sun > 0.01) {
      const sx = width * 0.7;
      const sy = height * horizon * 0.93;
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite("255, 170, 90"), sx, sy, R * 0.7, 0.55 * sun);
      glow(ctx, glowSprite("255, 220, 170"), sx, sy, R * 0.16, 0.8 * sun);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgb([255, 236, 200], sun);
      ctx.beginPath();
      ctx.arc(sx, sy, R * 0.035, 0, TAU);
      ctx.fill();
    }
  }

  /** The band of cloud, in world space. */
  clouds(ctx: Ctx, v: View, p: number, seconds: number, drift: number) {
    const light = mix(track(CLOUD_LIGHT, p), [190, 200, 240], this.flash * 0.7);
    const shade = mix(track(CLOUD_SHADE, p), [70, 80, 120], this.flash * 0.7);
    const sprites = [0, 1, 2].map((i) => puffSprite(light, shade, i));
    for (const c of this.puffs) {
      const x = c.x + Math.sin(seconds * 0.05 + c.w) * 0.6 + drift * (c.storm ? 1 : 0.4);
      const h = c.w * 0.58;
      if (!onScreen(v, x, c.y, c.w)) continue;
      ctx.globalAlpha = c.storm ? 0.95 : 0.85;
      ctx.drawImage(sprites[c.variant], x - c.w / 2, c.y - h / 2, c.w, h);
    }
    ctx.globalAlpha = 1;
  }

  /** A bolt from the cloud base down towards (x, y), in world units. */
  strike(x: number, y: number, seconds: number) {
    const random = this.random;
    const top = -9.5 - random() * 2;
    const points: { x: number; y: number }[] = [];
    const steps = 14;
    let px = x + (random() - 0.5) * 3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ty = lerp(top, y, t);
      px = lerp(px, x, 0.25) + (random() - 0.5) * 0.9;
      points.push({ x: i === steps ? x : px, y: ty });
    }
    const branches: { x: number; y: number }[][] = [];
    for (let b = 0; b < 3; b++) {
      const from = points[2 + Math.floor(random() * 8)];
      const branch = [from];
      let bx = from.x;
      let by = from.y;
      const dir = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 5; i++) {
        bx += dir * (0.3 + random() * 0.5);
        by += 0.4 + random() * 0.5;
        branch.push({ x: bx, y: by });
      }
      branches.push(branch);
    }
    this.bolts.push({ points, branches, born: seconds, life: 0.45 + random() * 0.2 });
  }

  /** Lightning, drawn additively in world space; also sets `flash`. */
  lightning(ctx: Ctx, v: View, seconds: number) {
    this.bolts = this.bolts.filter((b) => seconds - b.born < b.life && seconds >= b.born - 0.001);
    let flash = 0;
    const sprite = glowSprite("170, 190, 255");
    for (const b of this.bolts) {
      const age = (seconds - b.born) / b.life;
      // A bolt flickers: a strike, a dip, a return stroke.
      const strength = age < 0.12 ? 1 : age < 0.22 ? 0.35 : age < 0.36 ? 0.9 : Math.max(0, 1 - (age - 0.36) / 0.64) * 0.6;
      flash = Math.max(flash, strength);
      ctx.globalCompositeOperation = "lighter";
      const mid = b.points[Math.floor(b.points.length * 0.4)];
      glow(ctx, sprite, mid.x, mid.y, 7, 0.3 * strength);
      ctx.strokeStyle = `rgba(190, 205, 255, ${0.55 * strength})`;
      ctx.lineWidth = 6 / v.scale;
      ctx.lineJoin = "round";
      const path = (pts: { x: number; y: number }[]) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const pt of pts) ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      };
      path(b.points);
      ctx.lineWidth = 3 / v.scale;
      b.branches.forEach(path);
      ctx.strokeStyle = `rgba(250, 252, 255, ${strength})`;
      ctx.lineWidth = 1.6 / v.scale;
      path(b.points);
      ctx.lineWidth = 0.9 / v.scale;
      b.branches.forEach(path);
      ctx.globalCompositeOperation = "source-over";
    }
    this.flash = flash;
  }

  /** Rain, in screen space: two sheets of streaks, the near one faster and heavier. */
  rain(ctx: Ctx, width: number, height: number, amount: number, seconds: number, reduced: boolean) {
    if (amount < 0.02) return;
    const t = reduced ? 0 : seconds;
    const slant = 0.2;
    ctx.lineCap = "round";
    [
      { n: 260, speed: 1.1, len: 0.035, w: 1, a: 0.22 },
      { n: 140, speed: 1.9, len: 0.07, w: 1.5, a: 0.3 },
    ].forEach((sheet, layer) => {
      const count = Math.floor(sheet.n * amount * (width / 1000 + 0.5));
      ctx.strokeStyle = `rgba(190, 205, 230, ${sheet.a * (0.6 + 0.4 * amount) + this.flash * 0.3})`;
      ctx.lineWidth = sheet.w;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const a = Math.sin(i * 12.9898 + layer * 78.233) * 43758.5453;
        const b = Math.sin(i * 39.3468 + layer * 11.135) * 24634.6345;
        const fx = a - Math.floor(a);
        const fy = b - Math.floor(b);
        const y = ((fy + t * sheet.speed) % 1.1) * height * 1.1 - height * 0.05;
        const x = ((fx + (t * sheet.speed * slant * height) / width) % 1.2) * width * 1.2 - width * 0.1;
        const len = sheet.len * height;
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * slant, y - len);
      }
      ctx.stroke();
    });
  }

  /** Flying through the cloud: a wash of mist, and puffs rushing past the lens. */
  mist(ctx: Ctx, width: number, height: number, p: number, amount: number, seconds: number) {
    if (amount < 0.01) return;
    const light = track(CLOUD_LIGHT, p);
    const shade = track(CLOUD_SHADE, p);
    ctx.fillStyle = rgb(mix(shade, light, 0.6), Math.min(1, amount * 1.05));
    ctx.fillRect(0, 0, width, height);
    const sprite = puffSprite(light, shade, 1);
    const random = mulberry32(77);
    for (let i = 0; i < 9; i++) {
      const w = width * (0.6 + random() * 0.8);
      const x = ((random() + seconds * 0.02 + p * 18) % 1.6) * width * 1.4 - w * 0.9;
      const y = random() * height - w * 0.2;
      ctx.globalAlpha = amount * 0.7;
      ctx.drawImage(sprite, x, y, w, w * 0.58);
    }
    ctx.globalAlpha = 1;
  }
}
