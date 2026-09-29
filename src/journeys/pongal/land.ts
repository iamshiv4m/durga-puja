// The land round the village: the sky over the four days, the far tree line with a gopuram on
// it, the paddy fields behind the houses, the Kaveri past the end of the street, the ground, and
// the standing paddy and sugarcane along the near edge of the street.
//
// World units, y down: the fronts of the houses stand on y = 0 and the street comes toward us;
// the far horizon is at HORIZON, at the eye level of someone standing in the street.
import {
  TAU,
  clamp,
  glow,
  glowSprite,
  lerp,
  mix,
  mulberry32,
  rgb,
  rise,
  type Ctx,
  type RGB,
  type View,
} from "../paint";
import { paint, type Env } from "./people";
import { drawCane, gopuramPath, palmPath } from "./things";

export const HORIZON = -1.3;
/** Where the street gives way to the sand of the riverbank. */
export const RIVER = 30.5;
/** The near edge of the street, where the fields begin. */
export const FIELD = 4.4;
/** How much slower the far tree line moves than the street. */
const FAR = 0.35;

// ─── The hours ───────────────────────────────────────────────────────────────

export type Hour = {
  top: RGB;
  low: RGB;
  amb: number;
  tint: RGB;
  stars: number;
  haze: number;
};

const HOURS: (Hour & { at: number })[] = [
  // Bhogi: the last night of Margazhi, cold and clear.
  {
    at: 0,
    top: [6, 8, 24],
    low: [22, 22, 48],
    amb: 0.05,
    tint: [140, 150, 210],
    stars: 1,
    haze: 0.15,
  },
  {
    at: 0.17,
    top: [8, 10, 30],
    low: [36, 30, 60],
    amb: 0.07,
    tint: [150, 150, 210],
    stars: 0.9,
    haze: 0.2,
  },
  // First light for the kolam: blue, then pink along the east.
  {
    at: 0.215,
    top: [26, 36, 78],
    low: [150, 110, 130],
    amb: 0.26,
    tint: [190, 180, 220],
    stars: 0.3,
    haze: 0.6,
  },
  {
    at: 0.3,
    top: [52, 74, 128],
    low: [238, 164, 132],
    amb: 0.46,
    tint: [240, 196, 190],
    stars: 0,
    haze: 0.7,
  },
  // Sunrise on Thai Pongal.
  {
    at: 0.36,
    top: [70, 100, 156],
    low: [255, 178, 110],
    amb: 0.62,
    tint: [255, 196, 140],
    stars: 0,
    haze: 0.55,
  },
  {
    at: 0.44,
    top: [86, 124, 176],
    low: [255, 204, 146],
    amb: 0.78,
    tint: [255, 214, 170],
    stars: 0,
    haze: 0.4,
  },
  {
    at: 0.52,
    top: [92, 138, 192],
    low: [240, 220, 186],
    amb: 0.9,
    tint: [255, 234, 204],
    stars: 0,
    haze: 0.25,
  },
  // The next day, for the cattle: a bright morning.
  {
    at: 0.6,
    top: [92, 140, 196],
    low: [236, 222, 196],
    amb: 0.94,
    tint: [255, 240, 214],
    stars: 0,
    haze: 0.2,
  },
  {
    at: 0.72,
    top: [96, 144, 198],
    low: [238, 222, 194],
    amb: 0.95,
    tint: [255, 238, 210],
    stars: 0,
    haze: 0.2,
  },
  // Kaanum Pongal: an afternoon by the river, going gold.
  {
    at: 0.77,
    top: [98, 138, 188],
    low: [246, 214, 170],
    amb: 0.9,
    tint: [255, 226, 180],
    stars: 0,
    haze: 0.3,
  },
  {
    at: 0.86,
    top: [90, 116, 170],
    low: [255, 190, 124],
    amb: 0.76,
    tint: [255, 204, 146],
    stars: 0,
    haze: 0.4,
  },
  // Sunset over the paddy.
  {
    at: 0.93,
    top: [56, 62, 124],
    low: [255, 132, 70],
    amb: 0.5,
    tint: [255, 160, 100],
    stars: 0,
    haze: 0.6,
  },
  {
    at: 1,
    top: [34, 34, 88],
    low: [214, 96, 70],
    amb: 0.34,
    tint: [240, 140, 110],
    stars: 0.15,
    haze: 0.6,
  },
];

export function hourAt(p: number): Hour {
  let i = 0;
  let guard = 0;
  while (i < HOURS.length - 2 && p > HOURS[i + 1].at && guard++ < 50) i++;
  const a = HOURS[i];
  const b = HOURS[i + 1];
  const t = rise(p, a.at, b.at);
  return {
    top: mix(a.top, b.top, t),
    low: mix(a.low, b.low, t),
    amb: lerp(a.amb, b.amb, t),
    tint: mix(a.tint, b.tint, t),
    stars: lerp(a.stars, b.stars, t),
    haze: lerp(a.haze, b.haze, t),
  };
}

/** Where the sun is in the sky (in sky units from the middle of the screen, up from the horizon), and its colour. */
export function sunAt(p: number) {
  if (p < 0.29) return { x: 0, y: 0, r: 0, a: 0, color: [0, 0, 0] as RGB };
  if (p < 0.47) {
    // Coming up in the east, behind the pot.
    const t = rise(p, 0.3, 0.47);
    return {
      x: 3.6,
      y: lerp(0.5, -1.6, t),
      r: lerp(0.62, 0.5, t),
      a: rise(p, 0.29, 0.31),
      color: mix([255, 130, 60], [255, 220, 160], rise(p, 0.33, 0.45)),
    };
  }
  if (p < 0.61) {
    // Higher, for the offering.
    const t = rise(p, 0.47, 0.51);
    return {
      x: lerp(3.6, 1.6, t),
      y: lerp(-1.6, -1.45, t),
      r: 0.46,
      a: 1 - rise(p, 0.59, 0.61),
      color: [255, 236, 196] as RGB,
    };
  }
  if (p < 0.8) return { x: 0, y: 0, r: 0, a: 0, color: [0, 0, 0] as RGB };
  // Going down in the west, over the river.
  const t = rise(p, 0.8, 1);
  return {
    x: lerp(-2.8, -1.4, t),
    y: lerp(-3.6, -0.15, t),
    r: lerp(0.44, 0.66, t),
    a: rise(p, 0.8, 0.84),
    color: mix([255, 226, 170], [255, 110, 50], rise(p, 0.86, 1)),
  };
}

export type Sun = { x: number; y: number; r: number; a: number; color: RGB };

// ─── The sky ─────────────────────────────────────────────────────────────────

export class Land {
  private readonly stars: { x: number; y: number; r: number; seed: number }[] =
    [];
  private readonly clouds: { x: number; y: number; w: number; seed: number }[] =
    [];
  private far: Path2D | null = null;
  private farPalms: Path2D | null = null;
  private temple: Path2D | null = null;
  private grain: Path2D | null = null;
  private sand: Path2D | null = null;
  private readonly palms: {
    x: number;
    h: number;
    lean: number;
    palmyra: boolean;
    seed: number;
    trunk?: Path2D;
    crown?: Path2D;
  }[] = [];
  private readonly paddy: { x: number; y: number; h: number; seed: number }[] =
    [];
  private readonly canes: {
    x: number;
    y: number;
    h: number;
    lean: number;
    seed: number;
  }[] = [];
  private readonly ripples: {
    x: number;
    y: number;
    w: number;
    seed: number;
  }[] = [];
  private readonly clumps: { stalks: Path2D; ears: Path2D }[] = [];

  constructor() {
    const random = mulberry32(1401);
    for (let i = 0; i < 240; i++)
      this.stars.push({
        x: random(),
        y: random() ** 1.3,
        r: 0.5 + random() * 1.1,
        seed: random() * 10,
      });
    for (let i = 0; i < 8; i++)
      this.clouds.push({
        x: -16 + random() * 32,
        y: -2.2 - random() * 3.4,
        w: 2.5 + random() * 4,
        seed: random() * 10,
      });
    // Coconut palms behind the houses, and palmyra out in the fields.
    for (const [x, h, palmyra] of [
      [-23, 7.6, 0],
      [-17.2, 8.4, 0],
      [-9.4, 7.2, 0],
      [-3.1, 8.8, 0],
      [4.4, 6.4, 1],
      [10.6, 8.2, 0],
      [12.4, 7.0, 0],
      [17.3, 8.6, 0],
      [24.6, 7.8, 0],
      [29.4, 9.0, 0],
      [31.2, 7.4, 0],
      [45.5, 8.6, 0],
      [48.0, 7.2, 0],
    ] as const) {
      this.palms.push({
        x,
        h,
        lean: (random() - 0.5) * 0.14,
        palmyra: palmyra === 1,
        seed: random() * 1000,
      });
    }
    // Standing paddy along the near edge of the street, and a stand of sugarcane at the riverbank.
    for (let x = -30; x < 56; x += 0.16 + random() * 0.12)
      this.paddy.push({
        x,
        y: FIELD + 0.2 + random() * 2.8,
        h: 0.7 + random() * 0.3,
        seed: random() * 10,
      });
    this.paddy.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 26; i++)
      this.canes.push({
        x: 24.5 + random() * 4.2,
        y: FIELD + 0.4 + random() * 1.8,
        h: 3.4 + random() * 1.2,
        lean: (random() - 0.5) * 0.3,
        seed: random() * 10,
      });
    this.canes.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 90; i++)
      this.ripples.push({
        x: RIVER - 2 + random() * 32,
        y: HORIZON + 0.05 + random() ** 1.4 * 1.45,
        w: 0.2 + random() * 0.7,
        seed: random() * 10,
      });
  }

  sky(
    ctx: Ctx,
    width: number,
    height: number,
    v: View,
    hour: Hour,
    seconds: number,
    p: number,
    portrait: boolean,
  ): Sun {
    const horizon = v.ay + (HORIZON - v.y) * v.scale;
    const h = Math.max(horizon, 1);
    const g = ctx.createLinearGradient(0, Math.min(0, h - height), 0, h);
    g.addColorStop(0, rgb(hour.top));
    g.addColorStop(0.62, rgb(mix(hour.top, hour.low, 0.45)));
    g.addColorStop(1, rgb(hour.low));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    const skyScale = (Math.max(width, height) / 8) * 0.45;
    const s = sunAt(p);
    const squeeze = portrait ? 0.4 : 1;
    const sun: Sun = {
      x: v.ax + s.x * squeeze * skyScale - v.x * 0.02 * skyScale,
      y: horizon + s.y * skyScale,
      r: s.r * skyScale,
      a: s.a,
      color: s.color,
    };

    if (hour.stars > 0.01) {
      ctx.fillStyle = "#f2ecdc";
      for (const star of this.stars) {
        const y = star.y * h * 0.95;
        const twinkle =
          0.55 +
          0.45 * Math.sin(seconds * (0.8 + star.seed * 0.2) + star.seed * 6);
        ctx.globalAlpha = twinkle * hour.stars * (1 - (y / h) * 0.7) * 0.85;
        ctx.fillRect(
          (((star.x * width * 1.4 - v.x * skyScale * 0.03) % width) + width) %
            width,
          y,
          star.r,
          star.r,
        );
      }
      ctx.globalAlpha = 1;
    }

    // Long thin clouds, lit from below when the sun is low.
    const low = Math.max(0, 1 - hour.amb) * 0.6 + 0.25;
    for (const c of this.clouds) {
      const cx = v.ax + (c.x - v.x * 0.04 + seconds * 0.02) * skyScale;
      const cy = horizon + c.y * skyScale;
      const w = c.w * skyScale;
      if (cx + w < 0 || cx - w > width) continue;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w);
      const lit = mix(hour.low, [255, 240, 220], 0.25);
      cg.addColorStop(
        0,
        rgb(mix(lit, hour.top, 0.25), 0.4 * low * (1 - hour.stars * 0.8)),
      );
      cg.addColorStop(1, rgb(lit, 0));
      ctx.fillStyle = cg;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.08 + (c.seed % 1) * 0.05);
      ctx.translate(-cx, -cy);
      ctx.fillRect(cx - w, cy - w, w * 2, w * 2);
      ctx.restore();
    }

    if (sun.a > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      const colour = sun.color.map(Math.round).join(", ");
      glow(ctx, glowSprite(colour), sun.x, sun.y, sun.r * 10, 0.5 * sun.a);
      glow(ctx, glowSprite(colour), sun.x, sun.y, sun.r * 3.4, 0.55 * sun.a);
      ctx.globalCompositeOperation = "source-over";
      const disc = ctx.createRadialGradient(
        sun.x,
        sun.y - sun.r * 0.2,
        0,
        sun.x,
        sun.y,
        sun.r,
      );
      disc.addColorStop(0, rgb(mix(sun.color, [255, 255, 240], 0.7), sun.a));
      disc.addColorStop(0.8, rgb(sun.color, sun.a));
      disc.addColorStop(1, rgb(mix(sun.color, [255, 90, 40], 0.4), sun.a));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.r, 0, TAU);
      ctx.fill();
    }
    this.birds(ctx, width, v, hour, horizon, skyScale, seconds, p);
    return sun;
  }

  /** Crows and mynas by day; egrets going home in a line at sunset. */
  private birds(
    ctx: Ctx,
    width: number,
    v: View,
    hour: Hour,
    horizon: number,
    skyScale: number,
    seconds: number,
    p: number,
  ) {
    const shown = rise(hour.amb, 0.3, 0.5) * (1 - hour.stars);
    if (shown < 0.05) return;
    const egrets = rise(p, 0.86, 0.9);
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, skyScale * 0.022);
    for (let i = 0; i < 9; i++) {
      const drift = egrets > 0.5 ? seconds * 0.3 : seconds * 0.4;
      const x =
        v.ax +
        (((drift + i * 0.6) % 18) - 9 + (i % 3) * 0.3) * skyScale -
        v.x * 0.03 * skyScale;
      const y =
        horizon +
        (-3.4 -
          (egrets > 0.5 ? i * 0.12 : (i % 4) * 0.35) -
          Math.sin(i * 1.3) * 0.2) *
          skyScale;
      if (x < -20 || x > width + 20) continue;
      const flap = Math.sin(seconds * (egrets > 0.5 ? 4 : 7) + i * 1.7) * 0.5;
      const w = skyScale * (egrets > 0.5 ? 0.13 : 0.08);
      ctx.strokeStyle =
        egrets > 0.5
          ? `rgba(250, 244, 232, ${shown * 0.85})`
          : rgb(mix(hour.top, [10, 8, 16], 0.75), shown * 0.8);
      ctx.beginPath();
      ctx.moveTo(x - w, y - w * flap);
      ctx.quadraticCurveTo(x - w * 0.4, y - w * 0.4, x, y);
      ctx.quadraticCurveTo(x + w * 0.4, y - w * 0.4, x + w, y - w * flap);
      ctx.stroke();
    }
  }

  // ─── The far country ───────────────────────────────────────────────────────

  private ensureFar() {
    if (this.far) return;
    // A low line of trees along the horizon, tamarind, mango and banyan in groves, flat as the delta is.
    const random = mulberry32(88);
    const path = new Path2D();
    path.moveTo(-80, HORIZON + 0.03);
    let start = -80;
    let length = 0;
    let until = -80;
    let height = 0;
    for (let x = -80; x <= 80; x += 0.03) {
      if (x > until) {
        start = x;
        length = 0.5 + random() * 2.6;
        until = x + length + random() * 1.4;
        height = 0.07 + random() * 0.13;
      }
      const t = (x - start) / length;
      const grove = t >= 0 && t <= 1 ? Math.sin(t * Math.PI) ** 0.45 : 0;
      const crowns =
        0.72 +
        0.18 * Math.abs(Math.sin(x * 19.3)) +
        0.1 * Math.abs(Math.sin(x * 47.1 + 1.3));
      path.lineTo(x, HORIZON - 0.012 - grove * height * crowns);
    }
    path.lineTo(80, HORIZON + 0.03);
    path.closePath();
    this.far = path;
    const palms = new Path2D();
    for (let i = 0; i < 60; i++)
      palms.addPath(
        palmPath(
          -70 + random() * 140,
          HORIZON,
          0.55 + random() * 0.6,
          (random() - 0.5) * 0.15,
          random() < 0.45,
          i * 7,
        ),
      );
    this.farPalms = palms;
    this.temple = gopuramPath(10.8, HORIZON, 2.0);
  }

  /** The far tree line and the gopuram, moving slower than the street. */
  farLand(ctx: Ctx, v: View, hour: Hour) {
    this.ensureFar();
    ctx.save();
    ctx.translate(v.ax, v.ay);
    ctx.scale(v.scale, v.scale);
    ctx.translate(-v.x * FAR, -v.y);
    const haze = mix(hour.low, hour.top, 0.3);
    const dark = mix(haze, [16, 14, 30], 0.42 - hour.amb * 0.2);
    // The gopuram, its tiers catching the light.
    ctx.fillStyle = rgb(mix(dark, haze, 0.35));
    ctx.fill(this.temple!);
    ctx.strokeStyle = rgb(mix(haze, [255, 240, 220], 0.15), 0.35);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      const w = lerp(0.84, 0.27, t) / 2;
      const y = HORIZON - 0.3 - t * 1.4;
      ctx.moveTo(10.8 - w, y);
      ctx.lineTo(10.8 + w, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgb(mix(dark, haze, 0.15));
    ctx.fill(this.farPalms!);
    ctx.fillStyle = rgb(dark);
    ctx.fill(this.far!);
    ctx.restore();
  }

  // ─── Behind the houses: fields, and the river ─────────────────────────────

  /** The paddy behind the houses and, past the end of the street, the Kaveri. */
  back(ctx: Ctx, v: View, hour: Hour, env: Env, sun: Sun, seconds: number) {
    const left = v.x - v.ax / v.scale - 1;
    const right = v.x + (v.width - v.ax) / v.scale + 1;
    const top = HORIZON;
    // Fields: paddy going gold, in rows closer together toward the horizon, hazy far off.
    if (left < RIVER) {
      const r = Math.min(right, RIVER + 0.5);
      const g = ctx.createLinearGradient(0, top, 0, 0);
      g.addColorStop(0, paint([170, 164, 96], env));
      g.addColorStop(0.35, paint([150, 154, 74], env));
      g.addColorStop(1, paint([104, 132, 56], env));
      ctx.fillStyle = g;
      ctx.fillRect(left, top, r - left, -top + 0.02);
      ctx.strokeStyle = paint([214, 190, 100], env, 0, 0.22);
      for (let i = 1; i < 16; i++) {
        const t = (i / 16) ** 1.8;
        ctx.lineWidth = 0.006 + t * 0.02;
        ctx.beginPath();
        ctx.moveTo(left, lerp(top, 0, t));
        ctx.lineTo(r, lerp(top, 0, t));
        ctx.stroke();
      }
      // A bund running off across the fields, and the haze lying on them.
      ctx.strokeStyle = paint([150, 120, 80], env, 0, 0.5);
      ctx.lineWidth = 0.03;
      for (const bx of [-18, -2, 9, 22]) {
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx * FAR + 6, top);
        ctx.stroke();
      }
      const mist = ctx.createLinearGradient(0, top, 0, top + 0.9);
      mist.addColorStop(
        0,
        rgb(mix(hour.low, [255, 255, 255], 0.1), 0.35 + hour.haze * 0.4),
      );
      mist.addColorStop(1, rgb(hour.low, 0));
      ctx.fillStyle = mist;
      ctx.fillRect(left, top, r - left, 0.9);
    }
    // The river, bright with the sky, and the far bank's shadow in it.
    if (right > RIVER - 1.5) {
      const l = Math.max(left, RIVER - 1.5);
      const g = ctx.createLinearGradient(0, top, 0, 0.4);
      g.addColorStop(0, rgb(mix(hour.low, hour.top, 0.2)));
      g.addColorStop(0.5, rgb(mix(hour.top, hour.low, 0.4)));
      g.addColorStop(1, rgb(mix(hour.top, [20, 40, 50], 0.35)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(RIVER - 1.5, 0.45);
      ctx.bezierCurveTo(
        RIVER - 0.8,
        -0.2,
        RIVER + 0.2,
        top + 0.2,
        RIVER + 1.4,
        top,
      );
      ctx.lineTo(Math.max(right, RIVER + 2), top);
      ctx.lineTo(Math.max(right, RIVER + 2), 0.45);
      ctx.closePath();
      ctx.fill();
      // The sun's road across the water, when it is low.
      if (
        sun.a > 0.01 &&
        sun.y > (HORIZON - v.y) * v.scale + v.ay - v.height * 0.3
      ) {
        const sx = (sun.x - v.ax) / v.scale + v.x;
        const low =
          sun.a *
          clamp(
            1 - ((HORIZON - v.y) * v.scale + v.ay - sun.y) / (v.height * 0.3),
          );
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgb(sun.color, 0.45 * low);
        const random = mulberry32(5);
        for (let i = 0; i < 40; i++) {
          const t = random() ** 1.3;
          const y = top + 0.02 + t * 1.6;
          const w = (0.05 + t * 0.35) * (0.4 + random());
          const x =
            sx +
            (random() - 0.5) * (0.2 + t * 1.4) +
            Math.sin(seconds * 1.4 + i) * 0.04;
          if (x < RIVER) continue;
          ctx.fillRect(x - w / 2, y, w, 0.008 + t * 0.012);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.strokeStyle = rgb(mix(hour.low, [255, 255, 255], 0.3), 0.22);
      ctx.lineWidth = 0.008;
      for (const rp of this.ripples) {
        if (rp.x < l || rp.x > right) continue;
        const x = rp.x + Math.sin(seconds * 0.4 + rp.seed) * 0.15;
        ctx.beginPath();
        ctx.moveTo(x - rp.w / 2, rp.y);
        ctx.lineTo(x + rp.w / 2, rp.y);
        ctx.stroke();
      }
    }
  }

  /** Coconut palms behind the houses, in the world. */
  palmsBehind(ctx: Ctx, v: View, env: Env, seconds: number) {
    const left = v.x - v.ax / v.scale - 4;
    const right = v.x + (v.width - v.ax) / v.scale + 4;
    const trunk = paint([96, 84, 70], env);
    const crown = paint([44, 84, 42], env);
    for (const palm of this.palms) {
      if (palm.x < left || palm.x > right) continue;
      palm.trunk ??= palmPath(
        palm.x,
        -0.2,
        palm.h,
        palm.lean,
        palm.palmyra,
        palm.seed,
        "trunk",
      );
      palm.crown ??= palmPath(
        palm.x,
        -0.2,
        palm.h,
        palm.lean,
        palm.palmyra,
        palm.seed,
        "crown",
      );
      ctx.save();
      ctx.translate(palm.x, -0.2);
      ctx.rotate(Math.sin(seconds * 0.5 + palm.seed) * 0.012);
      ctx.translate(-palm.x, 0.2);
      ctx.fillStyle = trunk;
      ctx.fill(palm.trunk);
      ctx.fillStyle = crown;
      ctx.fill(palm.crown);
      ctx.restore();
    }
  }

  // ─── The ground ────────────────────────────────────────────────────────────

  private ensureGround() {
    if (this.grain) return;
    // Ruts, pebbles and the swept marks of a broom on the street; ripples of sand by the river.
    const random = mulberry32(606);
    const grain = new Path2D();
    for (let i = 0; i < 900; i++) {
      const x = -32 + random() * (RIVER + 32);
      const y = 0.1 + random() * (FIELD - 0.2);
      const r = 0.012 + random() * 0.03;
      grain.moveTo(x + r, y);
      grain.ellipse(x, y, r, r * 0.6, 0, 0, TAU);
    }
    this.grain = grain;
    const sand = new Path2D();
    for (let i = 0; i < 160; i++) {
      const x = RIVER + random() * 26;
      const y = 0.5 + random() * 4;
      const w = 0.3 + random() * 0.8;
      sand.moveTo(x - w / 2, y);
      sand.quadraticCurveTo(x, y - 0.04, x + w / 2, y);
    }
    this.sand = sand;
  }

  ground(ctx: Ctx, v: View, env: Env) {
    this.ensureGround();
    const left = v.x - v.ax / v.scale - 1;
    const right = v.x + (v.width - v.ax) / v.scale + 1;
    const bottom = v.y + (v.height - v.ay) / v.scale + 1;
    // The street: laterite earth, packed hard and swept.
    const g = ctx.createLinearGradient(0, 0, 0, FIELD + 3);
    g.addColorStop(0, paint([150, 104, 76], env));
    g.addColorStop(0.5, paint([170, 122, 88], env));
    g.addColorStop(1, paint([150, 108, 76], env));
    ctx.fillStyle = g;
    ctx.fillRect(
      left,
      -0.01,
      Math.min(right, RIVER + 1) - left,
      Math.max(bottom, FIELD + 4),
    );
    ctx.fillStyle = paint([120, 82, 60], env, 0, 0.5);
    ctx.fill(this.grain!);
    // The sand of the riverbank, pale, with the water's edge along it.
    if (right > RIVER - 1.5) {
      const s = ctx.createLinearGradient(0, 0, 0, 5);
      s.addColorStop(0, paint([222, 204, 170], env));
      s.addColorStop(1, paint([206, 184, 146], env));
      ctx.fillStyle = s;
      ctx.beginPath();
      ctx.moveTo(RIVER - 1.5, 0.45);
      ctx.bezierCurveTo(
        RIVER - 0.6,
        1.5,
        RIVER - 1.8,
        3,
        RIVER - 0.8,
        Math.max(bottom, FIELD + 4),
      );
      ctx.lineTo(Math.max(right, RIVER + 2), Math.max(bottom, FIELD + 4));
      ctx.lineTo(Math.max(right, RIVER + 2), 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = paint([180, 156, 120], env, 0, 0.5);
      ctx.lineWidth = 0.02;
      ctx.stroke(this.sand!);
      // Wet sand where the water laps.
      ctx.fillStyle = paint([150, 140, 120], env, 0, 0.5);
      ctx.fillRect(
        RIVER - 0.4,
        0.38,
        Math.max(right, RIVER + 2) - RIVER + 0.4,
        0.12,
      );
    }
  }

  // ─── The near edge: paddy and sugarcane ────────────────────────────────────

  /** A few clumps of paddy, one unit tall, as filled shapes: thin blades and bowed ears of grain. */
  private ensureClumps() {
    if (this.clumps.length) return;
    const random = mulberry32(4242);
    for (let c = 0; c < 6; c++) {
      const stalks = new Path2D();
      const ears = new Path2D();
      for (let k = 0; k < 9; k++) {
        const a = (k - 4) * 0.09 + (random() - 0.5) * 0.12;
        const h = 0.75 + random() * 0.35;
        const bx = (k - 4) * 0.018;
        const tx = bx + Math.sin(a) * h;
        const ty = -Math.cos(a) * h;
        const w = 0.012;
        stalks.moveTo(bx - w, 0);
        stalks.quadraticCurveTo(
          bx + Math.sin(a) * h * 0.4 - w,
          -h * 0.55,
          tx,
          ty,
        );
        stalks.quadraticCurveTo(
          bx + Math.sin(a) * h * 0.4 + w,
          -h * 0.55,
          bx + w,
          0,
        );
        stalks.closePath();
        // The ear, heavy with grain, bowed over.
        const dir = a < 0 ? -1 : 1;
        ears.moveTo(tx, ty);
        ears.quadraticCurveTo(
          tx + dir * 0.14,
          ty - 0.05,
          tx + dir * 0.2,
          ty + 0.16,
        );
        ears.quadraticCurveTo(
          tx + dir * 0.11,
          ty + 0.02,
          tx - dir * 0.015,
          ty + 0.03,
        );
        ears.closePath();
      }
      // A long blade or two, arching out.
      for (let k = 0; k < 3; k++) {
        const dir = random() < 0.5 ? -1 : 1;
        const h = 0.55 + random() * 0.3;
        stalks.moveTo(-0.01, 0);
        stalks.quadraticCurveTo(
          dir * h * 0.15,
          -h * 0.8,
          dir * h * 0.45,
          -h * 0.7,
        );
        stalks.quadraticCurveTo(dir * h * 0.12, -h * 0.72, 0.01, 0);
        stalks.closePath();
      }
      this.clumps.push({ stalks, ears });
    }
  }

  /** Paddy heavy in the ear along the near edge, and sugarcane standing tall by the river. */
  crops(ctx: Ctx, v: View, env: Env, seconds: number, reduced: boolean) {
    const topY = v.y - v.ay / v.scale;
    const bottom = v.y + (v.height - v.ay) / v.scale;
    if (bottom < FIELD - 0.4) return;
    const left = v.x - v.ax / v.scale - 1;
    const right = v.x + (v.width - v.ax) / v.scale + 1;
    // The bund, a raised earth path, then the field's water glinting between the stalks.
    ctx.fillStyle = paint([130, 96, 66], env);
    ctx.fillRect(left, FIELD - 0.15, right - left, 0.3);
    const water = ctx.createLinearGradient(0, FIELD + 0.1, 0, FIELD + 3.5);
    water.addColorStop(0, paint([150, 148, 76], env));
    water.addColorStop(1, paint([118, 128, 56], env));
    ctx.fillStyle = water;
    ctx.fillRect(left, FIELD + 0.15, right - left, Math.max(4, bottom - FIELD));
    const wind = reduced ? 0 : 1;
    this.ensureClumps();
    const stalk = paint([112, 138, 58], env);
    const ear = paint([222, 184, 86], env, 0.05);
    for (const clump of this.paddy) {
      if (
        clump.x < left ||
        clump.x > right ||
        clump.y - clump.h > bottom ||
        clump.y < topY
      )
        continue;
      const sway =
        (Math.sin(seconds * 0.9 + clump.x * 0.4) * 0.1 +
          Math.sin(seconds * 2.1 + clump.seed) * 0.025) *
        wind;
      const shape =
        this.clumps[Math.floor(clump.seed * 10) % this.clumps.length];
      ctx.save();
      ctx.translate(clump.x, clump.y);
      ctx.transform(clump.h, 0, -sway * clump.h, clump.h, 0, 0);
      ctx.fillStyle = stalk;
      ctx.fill(shape.stalks);
      ctx.fillStyle = ear;
      ctx.fill(shape.ears);
      ctx.restore();
    }
    for (const cane of this.canes) {
      if (cane.x < left - 2 || cane.x > right + 2) continue;
      const sway = Math.sin(seconds * 0.7 + cane.seed) * 0.05 * wind;
      const x1 = cane.x + Math.sin(cane.lean + sway) * cane.h;
      const y1 = cane.y - Math.cos(cane.lean + sway) * cane.h;
      drawCane(
        ctx,
        cane.x,
        cane.y,
        x1,
        y1,
        0.08,
        env,
        0,
        true,
        Math.floor(cane.seed * 10),
        sway * 4,
      );
    }
  }
}
