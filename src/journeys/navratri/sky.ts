// The sky over the pol: morning, dusk and the nine nights, a moon that waxes night by night from
// a thin crescent to past half, and the town's far skyline of temple spires and water tanks.
import { TAU, clamp, glow, glowSprite, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import { night, track, type Keys } from "./world";

const SKY_TOP: Keys<RGB> = [
  [0, [44, 52, 104]],
  [0.07, [104, 142, 196]],
  [0.19, [116, 156, 204]],
  [0.228, [70, 66, 126]],
  [0.262, [24, 22, 62]],
  [0.3, [7, 7, 24]],
  [0.72, [8, 8, 26]],
  [0.748, [64, 60, 124]],
  [0.79, [30, 26, 70]],
  [0.84, [9, 9, 28]],
  [1, [7, 7, 24]],
];
const SKY_LOW: Keys<RGB> = [
  [0, [252, 176, 132]],
  [0.07, [250, 214, 172]],
  [0.19, [246, 222, 186]],
  [0.228, [252, 142, 74]],
  [0.262, [150, 64, 84]],
  [0.3, [30, 20, 48]],
  [0.72, [30, 20, 48]],
  [0.748, [252, 128, 60]],
  [0.79, [170, 70, 70]],
  [0.84, [34, 22, 50]],
  [1, [28, 18, 46]],
];
/** How dark it is: 0 in daylight, 1 on the nights. */
const DARK: Keys<number> = [
  [0, 0.25],
  [0.07, 0],
  [0.19, 0],
  [0.235, 0.45],
  [0.29, 1],
  [0.72, 1],
  [0.748, 0.45],
  [0.8, 0.85],
  [0.84, 1],
  [1, 1],
];

export const skyTop = (p: number) => track(SKY_TOP, p);
export const skyLow = (p: number) => track(SKY_LOW, p);
export const darkness = (p: number) => track(DARK, p);

type Star = { x: number; y: number; r: number; seed: number };

export class Sky {
  private readonly stars: Star[] = [];

  constructor() {
    const random = mulberry32(909);
    for (let i = 0; i < 220; i++) this.stars.push({ x: random(), y: random() ** 1.3, r: 0.6 + random() * 1.3, seed: random() * 10 });
  }

  /** Fills the screen with the sky; `horizon` is the screen y where the far town stands. */
  draw(ctx: Ctx, width: number, height: number, p: number, horizon: number, seconds: number, panX: number) {
    const top = skyTop(p);
    const low = skyLow(p);
    const h = clamp(horizon, height * 0.1, height * 1.5);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(top));
    sky.addColorStop(0.6, rgb(mix(top, low, 0.45)));
    sky.addColorStop(1, rgb(low));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const dark = darkness(p);
    if (dark > 0.05) {
      ctx.fillStyle = "#f2ecdc";
      for (const s of this.stars) {
        const y = s.y * h * 0.92;
        const twinkle = 0.6 + 0.4 * Math.sin(seconds * (0.7 + s.seed * 0.2) + s.seed * 5);
        ctx.globalAlpha = twinkle * (dark - 0.05) * (1 - (y / h) * 0.7) * 0.8;
        const x = (((s.x * width * 1.4 - panX * 0.6) % (width * 1.4)) + width * 1.4) % (width * 1.4);
        if (x > width) continue;
        ctx.fillRect(x, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    // The moon of Ashvin, waxing: past the first night's sliver it rides higher every night.
    const moon = clamp((dark - 0.3) / 0.6);
    if (moon > 0.01) {
      const n = night(p);
      const r = Math.min(width, height) * 0.036;
      const x = width * 0.8 - panX * 0.04;
      const y = clamp(h * (0.28 - 0.012 * n), r * 2.2, h - r * 2);
      drawMoon(ctx, x, y, r, n, moon);
    }
  }
}

/** The moon on the `n`th night of the bright fortnight, lit from the right. */
export function drawMoon(ctx: Ctx, x: number, y: number, r: number, n: number, alpha: number) {
  const lit = (1 - Math.cos((clamp(n + 0.5, 1, 15) / 15) * Math.PI)) / 2;
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 236, 200"), x, y, r * (4 + 4 * lit), 0.18 * alpha * (0.4 + lit));
  ctx.globalCompositeOperation = "source-over";
  // The dark of it, faintly, in the earthshine.
  ctx.fillStyle = `rgba(40, 40, 70, ${0.35 * alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  const face = ctx.createRadialGradient(x + r * 0.3, y - r * 0.3, 0, x, y, r);
  face.addColorStop(0, `rgba(252, 246, 226, ${alpha})`);
  face.addColorStop(1, `rgba(222, 206, 170, ${alpha})`);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
  ctx.ellipse(x, y, r * Math.abs(1 - 2 * lit), r, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
  ctx.fill();
  if (lit > 0.3) {
    ctx.fillStyle = `rgba(176, 160, 130, ${0.22 * alpha})`;
    for (const [dx, dy, s] of [
      [0.35, -0.2, 0.22],
      [0.15, 0.25, 0.18],
      [0.5, 0.3, 0.12],
    ]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, s * r, 0, TAU);
      ctx.fill();
    }
  }
}

/** The far town: roofs, the spires of a haveli temple and a derasar, water tanks and neem trees. */
export function paintSkyline(from: number, to: number, ppu: number) {
  const width = to - from;
  const tall = 9;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ppu);
  canvas.height = Math.round(tall * ppu);
  const g = canvas.getContext("2d")!;
  g.scale(ppu, ppu);
  g.translate(-from, tall);
  const random = mulberry32(4411);
  const lights: { x: number; y: number }[] = [];
  // Roofs, one after another.
  let x = from;
  for (let guard = 0; x < to && guard < 400; guard++) {
    const w = 1.2 + random() * 2.4;
    const h = 1.6 + random() * 2.6;
    g.fillStyle = rgb(mix([57, 48, 74], [44, 38, 62], random()));
    g.fillRect(x, -h, w + 0.05, h);
    if (random() < 0.45) {
      // A sloped tile roof.
      g.beginPath();
      g.moveTo(x - 0.1, -h);
      g.lineTo(x + w / 2, -h - 0.7 - random() * 0.4);
      g.lineTo(x + w + 0.1, -h);
      g.fill();
    } else if (random() < 0.4) {
      g.fillRect(x + w * 0.3, -h - 0.9, 0.7, 0.6);
      g.fillRect(x + w * 0.35, -h - 0.3, 0.08, 0.3);
      g.fillRect(x + w * 0.3 + 0.55, -h - 0.3, 0.08, 0.3);
    }
    for (let i = 0; i < 3; i++) if (random() < 0.5) lights.push({ x: x + 0.3 + random() * (w - 0.6), y: -0.5 - random() * (h - 1) });
    x += w;
  }
  // Temple spires with their flags.
  for (const at of [from + width * 0.18, from + width * 0.52, from + width * 0.83]) {
    const h = 5.5 + random() * 1.5;
    g.fillStyle = "#302842";
    g.beginPath();
    g.moveTo(at - 1.3, -2.6);
    g.lineTo(at - 1.1, -h * 0.55);
    g.quadraticCurveTo(at - 0.6, -h * 0.95, at, -h);
    g.quadraticCurveTo(at + 0.6, -h * 0.95, at + 1.1, -h * 0.55);
    g.lineTo(at + 1.3, -2.6);
    g.fill();
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(at + side * 1.9, -2.6);
      g.quadraticCurveTo(at + side * 1.6, -h * 0.62, at + side * 1.2, -h * 0.5);
      g.lineTo(at + side * 1.2, -2.6);
      g.fill();
    }
    g.fillRect(at - 0.03, -h - 1, 0.06, 1);
    g.fillStyle = "#6a2a30";
    g.beginPath();
    g.moveTo(at + 0.03, -h - 1);
    g.lineTo(at + 0.8, -h - 0.8);
    g.lineTo(at + 0.03, -h - 0.55);
    g.fill();
  }
  // Neem trees between the roofs.
  g.fillStyle = "#2c283c";
  for (let i = 0; i < 16; i++) {
    const tx = from + random() * width;
    const r = 0.8 + random() * 0.8;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.arc(tx + (random() - 0.5) * r * 1.6, -2.4 - r - random() * r, r * (0.5 + random() * 0.4), 0, TAU);
      g.fill();
    }
  }
  return { canvas, from, width, tall, lights };
}
