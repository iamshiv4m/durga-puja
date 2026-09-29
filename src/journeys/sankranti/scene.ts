// Makar Sankranti: one winter day across India, painted as a single long world that the camera
// travels west along with the sun. Before dawn at the Sangam in Prayagraj; the morning sun in a
// Bihar village; the afternoon in a Pune wada; and Uttarayan over the pols of Ahmedabad, from the
// first kites to the pech, the sunset and the tukkal lanterns of the night.
import { windowOpacity } from "@/lib/math";
import {
  TAU,
  apply,
  clamp,
  glow,
  glowSprite,
  lerp,
  mix,
  mulberry32,
  rgb,
  rise,
  shot,
  toScreen,
  toWorld,
  view,
  type Ctx,
  type RGB,
  type Shot,
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";
import { sankranti } from "./content";
import { Pol, ROWS, TERRACE } from "./pol";
import { Sangam } from "./sangam";
import { Uttarayan } from "./uttarayan";
import { Village } from "./village";
import { Wada } from "./wada";
import { MOMENTS, POL, hourAt, spanX, sunAt, type Env, type Light, type World } from "./world";

export { MOMENTS };

const SHOTS: Shot[] = [
  { at: 0.0, x: -2, y: -0.4, zoom: 0.62 },
  { at: 0.05, x: -2.4, y: 0.6, zoom: 0.72 },
  { at: 0.085, x: -3.2, y: 2.1, zoom: 0.95 },
  { at: 0.15, x: -3.4, y: 2.4, zoom: 1.08 },
  { at: 0.185, x: 22, y: -7.5, zoom: 0.8 },
  { at: 0.215, x: 44.6, y: 1.9, zoom: 0.95 },
  { at: 0.285, x: 44.3, y: 2.1, zoom: 1.02 },
  { at: 0.312, x: 66, y: -7.5, zoom: 0.8 },
  { at: 0.34, x: 86.6, y: 2.6, zoom: 0.88 },
  { at: 0.41, x: 86.9, y: 2.8, zoom: 0.95 },
  { at: 0.428, x: 94, y: -7, zoom: 0.8 },
  { at: 0.446, x: 126, y: -6.2, zoom: 0.68 },
  { at: 0.472, x: 137.4, y: 0.8, zoom: 0.8 },
  { at: 0.54, x: 137.1, y: 0.4, zoom: 0.74 },
  { at: 0.585, x: 134.6, y: -2.4, zoom: 0.58 },
  { at: 0.66, x: 135, y: -2.6, zoom: 0.56 },
  { at: 0.7, x: 137.4, y: -1.7, zoom: 0.6 },
  { at: 0.77, x: 137.6, y: -1.5, zoom: 0.62 },
  { at: 0.81, x: 135, y: -2.2, zoom: 0.62 },
  { at: 0.885, x: 135, y: -2.6, zoom: 0.58 },
  { at: 0.94, x: 136, y: -3.6, zoom: 0.47 },
  { at: 1.0, x: 136, y: -4.0, zoom: 0.44 },
];

/** Phones see the same day in a tall frame, the subject above the captions. */
const PORTRAIT_SHOTS: Shot[] = [
  { at: 0.0, x: -2.6, y: -0.6, zoom: 0.72 },
  { at: 0.05, x: -2.8, y: 1.4, zoom: 0.78 },
  { at: 0.085, x: -3.4, y: 3.9, zoom: 0.86 },
  { at: 0.15, x: -3.0, y: 4.0, zoom: 0.92 },
  { at: 0.185, x: 22, y: -8, zoom: 0.8 },
  { at: 0.215, x: 44.2, y: 5.1, zoom: 0.9 },
  { at: 0.285, x: 44.0, y: 5.2, zoom: 0.92 },
  { at: 0.312, x: 66, y: -8, zoom: 0.8 },
  { at: 0.34, x: 86.2, y: 5.3, zoom: 0.86 },
  { at: 0.41, x: 86.4, y: 5.4, zoom: 0.9 },
  { at: 0.428, x: 94, y: -7.5, zoom: 0.8 },
  { at: 0.446, x: 126, y: -6.2, zoom: 0.7 },
  { at: 0.472, x: 136.6, y: 3.6, zoom: 0.72 },
  { at: 0.54, x: 136.9, y: 3.4, zoom: 0.7 },
  { at: 0.585, x: 136.4, y: 0.4, zoom: 0.62 },
  { at: 0.66, x: 136.6, y: 0.3, zoom: 0.6 },
  { at: 0.7, x: 137.8, y: 0.6, zoom: 0.62 },
  { at: 0.77, x: 137.8, y: 0.7, zoom: 0.64 },
  { at: 0.81, x: 136.2, y: 0.3, zoom: 0.62 },
  { at: 0.885, x: 136.2, y: 0.1, zoom: 0.6 },
  { at: 0.94, x: 136.2, y: -1.2, zoom: 0.5 },
  { at: 1.0, x: 136.2, y: -1.6, zoom: 0.48 },
];

const NIGHT: RGB = [14, 16, 40];
/** When the reader's kite is up, and when a touch releases a tukkal instead. */
const KITE = [0.448, 0.905] as const;
const STEER = [0.455, 0.79] as const;
const TUKKAL = [0.795, 0.99] as const;
const ARGHYA = [0.07, 0.175] as const;

type Cloud = { x: number; y: number; s: number; sprite: number; seed: number };

class Sankranti implements Scene {
  private readonly emit: Emit;
  private readonly sangam = new Sangam();
  private readonly village = new Village();
  private readonly wada = new Wada();
  private readonly pol = new Pol();
  private readonly sky: Uttarayan;
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private readonly clouds: Cloud[] = [];
  private cloudSprites: HTMLCanvasElement[][] | null = null;
  private v: View | null = null;
  private held = false;
  private lastTug = -10;

  constructor(emit: Emit) {
    this.emit = emit;
    this.sky = new Uttarayan(this.pol.anchors, emit);
    const random = mulberry32(114);
    for (let i = 0; i < 260; i++)
      this.stars.push({
        x: random(),
        y: random() ** 1.4,
        r: 0.4 + random() * 1.2,
        seed: random() * 10,
      });
    for (let i = 0; i < 26; i++)
      this.clouds.push({
        x: -20 + random() * 190,
        y: -3.5 - random() * 7,
        s: 1.6 + random() * 2.6,
        sprite: i % 3,
        seed: random() * 10,
      });
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p, seconds } = f;
    const unit = (Math.min(width, height) / 8) * (f.portrait ? 1.18 : 1);
    const focus = shot(f.portrait ? PORTRAIT_SHOTS : SHOTS, p);
    if (!f.portrait) {
      const side = sankranti.chapters.reduce((sum, c) => sum + windowOpacity(p, c.window) * (c.side === "right" ? 1 : -1), 0);
      focus.x += (side * width * 0.13) / (unit * focus.zoom);
    }
    const v = view(width, height, focus, unit, f.portrait ? 0.42 : 0.5);
    this.v = v;
    const hour = hourAt(p);
    const env: Env = { amb: hour.amb, tint: hour.tint, night: NIGHT };
    const lights: Light[] = [];
    const w: World = {
      ctx,
      v,
      env,
      hour,
      p,
      seconds,
      dt: f.dt,
      lights,
      reduced: f.reduced,
      shadow: lerp(1, -1, rise(p, 0.28, 0.36)),
    };
    const night = rise(p, 0.765, 0.82);

    // The sky, the sun in it, and the clouds.
    const sun = sunAt(p);
    const horizon = toScreen(v, 0, 0).y;
    const sunScreen = {
      x: sun.fx * width,
      y: horizon - sun.elev * (Math.min(width, height) / 8) * 1.05,
      r: sun.r * (Math.min(width, height) / 8),
    };
    this.paintSky(ctx, v, w, sunScreen, sun.color, sun.elev, night);

    ctx.save();
    apply(ctx, v);
    this.land(w);

    // The Sangam.
    const sunWorld = toWorld(v, sunScreen.x, sunScreen.y);
    const road = rise(p, 0.075, 0.105) * (1 - rise(p, 0.17, 0.2));
    this.sangam.farBank(w);
    this.sangam.water(w, sunWorld.x, road, sunScreen.r / v.scale, sun.color);
    this.sangam.mist(w);
    this.sangam.river(w, sunWorld.x, road);
    this.sangam.sands(w);
    this.sangam.birds(w);

    this.village.draw(w);

    // Ahmedabad: the far city, the rows of roofs and their kites, our terrace.
    const [left, right] = spanX(v, 4);
    if (right > POL - 60 && left < POL + 60) {
      this.pol.skylines(w, night);
      this.sky.update(w);
      this.pol.rows(w, night, (row) => {
        if (row < ROWS.length) this.sky.fleet(w, row);
      });
      this.pol.chabutro(w, POL - 6.5, 1.25);
      const flying = p > KITE[0] && p < KITE[1];
      const tug = this.held ? 0.6 : 0.2;
      const hand = this.pol.terrace(w, night, {
        pull: this.held ? 1 : 0.3,
        sway: Math.sin(seconds * 1.4) * tug,
      });
      this.sky.setHand(hand);
      this.sky.mine(w, flying, p > STEER[0] && p < STEER[1]);
      this.sky.night(w);
    }
    // The wada in Pune, over the edge of the city behind it.
    this.wada.draw(w);

    // Light: fires, lamps, windows and lanterns, added over everything.
    ctx.globalCompositeOperation = "lighter";
    for (const l of lights) glow(ctx, glowSprite(l.color), l.x, l.y, l.r, l.a);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    this.finish(ctx, f, hour.amb);
  }

  /** The sky from the zenith to the horizon, stars, the sun and clouds, in screen space. */
  private paintSky(ctx: Ctx, v: View, w: World, sun: { x: number; y: number; r: number }, color: RGB, elev: number, night: number) {
    const { width, height } = v;
    const { hour, seconds } = w;
    const top = toScreen(v, 0, -13).y;
    const horizon = toScreen(v, 0, 0).y;
    const g = ctx.createLinearGradient(0, Math.min(top, horizon - 10), 0, horizon);
    g.addColorStop(0, rgb(hour.top));
    g.addColorStop(0.62, rgb(mix(hour.top, hour.low, 0.45)));
    g.addColorStop(1, rgb(hour.low));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    if (hour.stars > 0.02) {
      const drift = (v.x * v.scale * 0.02) % width;
      ctx.fillStyle = "#f2ecdc";
      for (const s of this.stars) {
        const x = (((s.x * width - drift) % width) + width) % width;
        const y = s.y * Math.max(0, horizon) * 0.95;
        const tw = 0.55 + 0.45 * Math.sin(seconds * (0.7 + s.seed * 0.2) + s.seed * 7);
        ctx.globalAlpha = hour.stars * tw * 0.8 * clamp(1 - y / Math.max(1, horizon));
        ctx.fillRect(x, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    // The sun, and its light spread through the haze.
    const up = clamp((elev + 0.6) / 0.8);
    if (up > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      const c = `${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}`;
      glow(ctx, glowSprite(c), sun.x, sun.y, sun.r * 16, 0.28 * up);
      glow(ctx, glowSprite(c), sun.x, sun.y, sun.r * 5, 0.45 * up);
      ctx.globalCompositeOperation = "source-over";
      const disc = ctx.createRadialGradient(sun.x, sun.y - sun.r * 0.2, 0, sun.x, sun.y, sun.r);
      disc.addColorStop(0, rgb(mix(color, [255, 255, 240], 0.7), up));
      disc.addColorStop(0.8, rgb(color, up));
      disc.addColorStop(1, rgb(mix(color, [255, 80, 40], 0.3 * (1 - clamp(elev / 2.5))), up * 0.9));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.r, 0, TAU);
      ctx.fill();
    }
    this.paintClouds(ctx, v, w, night);
  }

  private paintClouds(ctx: Ctx, v: View, w: World, night: number) {
    const sprites = this.cloudSprites ?? (this.cloudSprites = makeClouds());
    const { p, seconds } = w;
    const warm = Math.max(rise(p, 0.04, 0.09) * (1 - rise(p, 0.14, 0.2)), rise(p, 0.64, 0.72) * (1 - rise(p, 0.78, 0.82)));
    const dark = Math.max(night, 1 - rise(p, 0.05, 0.1));
    const layers: [number, number][] = [
      [0, (1 - dark) * (1 - warm)],
      [1, warm * (1 - dark)],
      [2, dark],
    ];
    for (const c of this.clouds) {
      const parallax = 0.55;
      const cx = v.ax + (c.x + seconds * 0.05 - v.x) * v.scale * parallax;
      const cy = v.ay + (c.y - v.y) * v.scale * 0.8;
      const r = c.s * v.scale * 0.8;
      if (cx + r < 0 || cx - r > v.width || cy + r * 0.5 < 0 || cy - r * 0.5 > v.height) continue;
      for (const [tone, a] of layers) {
        const alpha = a * (tone === 2 ? 0.3 : 0.7);
        if (alpha < 0.02) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprites[tone][c.sprite], cx - r, cy - r * 0.6, r * 2, r * 1.17);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Distant land at the horizon, and plain earth wherever no place is painted. */
  private land(w: World) {
    const { ctx, v, hour, env } = w;
    const [left, right] = spanX(v, 2);
    const bottom = v.y + v.height / 2 / v.scale + 3;
    if (bottom < -0.3) return;
    const far = mix(mix(hour.low, hour.top, 0.5), [20, 22, 30], 0.35 + 0.4 * (1 - env.amb));
    ctx.fillStyle = rgb(mix(far, [60, 70, 50], 0.2 * env.amb));
    ctx.fillRect(left, 0, right - left, bottom);
    ctx.fillStyle = rgb(far);
    ctx.beginPath();
    ctx.moveTo(left, 0.02);
    for (let x = Math.floor(left / 0.6) * 0.6; x <= right + 0.6; x += 0.6)
      ctx.lineTo(x, -0.12 - 0.1 * (0.5 + 0.5 * Math.sin(x * 1.3)) - 0.06 * Math.sin(x * 3.7));
    ctx.lineTo(right, 0.02);
    ctx.closePath();
    ctx.fill();
  }

  /** A wash behind the caption, a little shade under the header, and the vignette. */
  private finish(ctx: Ctx, f: Frame, amb: number) {
    const { width, height, p } = f;
    if (!f.portrait) {
      for (const c of sankranti.chapters) {
        const o = windowOpacity(p, c.window);
        if (o < 0.01) continue;
        const right = c.side === "right";
        const wash = ctx.createLinearGradient(right ? width : 0, 0, right ? width * 0.45 : width * 0.55, 0);
        const a = o * lerp(0.3, 0.6, amb);
        wash.addColorStop(0, `rgba(10, 8, 18, ${a})`);
        wash.addColorStop(0.55, `rgba(10, 8, 18, ${a * 0.5})`);
        wash.addColorStop(1, "rgba(10, 8, 18, 0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      const shade = ctx.createLinearGradient(0, height * 0.55, 0, height);
      shade.addColorStop(0, "rgba(10, 8, 18, 0)");
      shade.addColorStop(1, `rgba(10, 8, 18, ${0.35 + 0.3 * amb})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);
    }
    if (amb > 0.3) {
      const top = ctx.createLinearGradient(0, 0, 0, 140);
      top.addColorStop(0, `rgba(10, 8, 18, ${0.35 * amb})`);
      top.addColorStop(1, "rgba(10, 8, 18, 0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, width, 140);
    }
    const vignette = ctx.createRadialGradient(width / 2, height * 0.5, Math.min(width, height) * 0.35, width / 2, height * 0.5, Math.max(width, height) * 0.8);
    vignette.addColorStop(0, "rgba(6, 8, 18, 0)");
    vignette.addColorStop(1, `rgba(6, 8, 18, ${0.6 - amb * 0.32})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    const v = this.v;
    if (!v) return;
    const { p, seconds } = f;
    const world = toWorld(v, x, y);
    if (kind === "up") {
      this.held = false;
      this.sky.steer(world.x, world.y, seconds, false);
      return;
    }
    if (kind === "down") this.held = true;

    // At the Sangam: a touch on the river, gold once the sun is up for the arghya.
    if (p > ARGHYA[0] && p < ARGHYA[1]) {
      if (kind !== "down") return;
      const gold = p > MOMENTS.sunrise - 0.01;
      if (this.sangam.touch(world.x, world.y, seconds, gold)) this.emit(gold ? "arghya" : "ripple");
      return;
    }

    // Uttarayan: drag and the kite follows.
    if (p > STEER[0] && p < STEER[1]) {
      if (!this.held) return;
      this.sky.steer(world.x, world.y, seconds, true);
      if (kind === "down" || seconds - this.lastTug > 0.35) {
        this.lastTug = seconds;
        this.emit("tug");
      }
      return;
    }

    // Night: a touch sends up a chain of tukkal.
    if (p > TUKKAL[0] && p < TUKKAL[1] && kind === "down" && world.y < TERRACE - 1) {
      this.sky.release(world.x, world.y, seconds);
      this.emit("tukkal");
    }
  }
}

/** Soft cumulus, painted once in three lights: day, dawn and dusk, and night. */
function makeClouds() {
  const tones: [RGB, RGB][] = [
    [
      [255, 255, 255],
      [200, 206, 222],
    ],
    [
      [255, 214, 190],
      [200, 120, 130],
    ],
    [
      [80, 86, 130],
      [30, 34, 64],
    ],
  ];
  return tones.map(([lit, shade]) =>
    [0, 1, 2].map((k) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 150;
      const g = c.getContext("2d")!;
      const random = mulberry32(90 + k);
      for (let i = 0; i < 16; i++) {
        const x = 40 + random() * 176;
        const y = 88 + random() * 16 - Math.sin(((x - 40) / 176) * Math.PI) * 26;
        const r = 16 + random() * 24;
        const grad = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
        grad.addColorStop(0, rgb(lit, 0.55));
        grad.addColorStop(0.6, rgb(mix(lit, shade, 0.4), 0.3));
        grad.addColorStop(1, rgb(shade, 0));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
      }
      return c;
    }),
  );
}

export function createScene(emit: Emit): Scene {
  return new Sankranti(emit);
}
