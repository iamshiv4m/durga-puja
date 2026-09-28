// Chhath, as one continuous shot over four days by a river in Bihar: the morning bath of Nahay
// Khay and the chulha in the courtyard; the kheer of Kharna by firelight; thekua frying and the
// soop filled; the walk to the ghat with the dauras; the arghya to the setting sun; the kosi lit
// through the night; and the vratis back in the water for the sun coming up.
//
// World units, y down: the far bank sits on the horizon at y = 0, the river comes toward us to
// the ghat's first step at SHORE, and the bank runs on from BANK. Things on the water are drawn
// smaller the farther off they are (`depth`). The courtyard lies downstream, past the bamboo, at
// x ≈ 22..40. The sky, the sun and the far bank are drawn in their own slower layers.
import {
  TAU,
  apply,
  clamp,
  flicker,
  glow,
  glowSprite,
  lerp,
  mix,
  mulberry32,
  onScreen,
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
import {
  drawCane,
  drawCarrier,
  drawChulha,
  drawDiya,
  drawHeap,
  drawKosi,
  drawLauki,
  drawLeaf,
  drawPerson,
  drawPot,
  drawReflection,
  drawRoti,
  drawSitting,
  drawSoop,
  drawThekua,
  drawWalker,
  paint,
  tone,
  type Env,
  type Person,
} from "./pieces";

const SHORE = 6;
const STEP = 0.45;
const BANK = SHORE + STEP * 4;
const GHAT_END = 12;
/** How tall a person stands above the water at depth y. */
const depth = (y: number) => 0.58 * y;

const CHULHA = { x: 26.4, y: 8.85, size: 0.95 };
const LEAF = { x: 28.15, y: 9.2, size: 1.15 };
const LEAF2 = { x: 25.0, y: 9.2 };
const SEAT = { x: 27.3, y: 9.7, size: 1.2 };
const SOOP = { x: 28.9, y: 9.2, width: 1.15 };
const THALI = { x: 29.95, y: 9.66 };
const KOSI = { x: -1, y: BANK - 0.05, size: 2.3 };

const LAMP = "255, 160, 60";
const FIRE = "255, 120, 40";
const SUN = "255, 190, 110";

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  bath: [0, 0.07],
  nahay: 0.09,
  kharna: [0.195, 0.215],
  thekua: [0.325, 0.345],
  soop: [0.362, 0.405],
  walk: [0.425, 0.5],
  dusk: [0.47, 0.6],
  arghya: 0.505,
  lamps: [0.5, 0.6],
  kosi: [0.6, 0.64],
  dawn: [0.745, 0.86],
  sunrise: 0.8,
  morning: [0.86, 1],
} as const;

/** The camera, with a framing of its own for phones where the wide one would lose the subject. */
const FRAMES: (Shot & { portrait?: Partial<Shot> })[] = [
  { at: 0.0, x: 1.0, y: 1.9, zoom: 0.62 },
  { at: 0.05, x: 0.4, y: 2.2, zoom: 0.74 },
  { at: 0.115, x: 25.8, y: 8.15, zoom: 1.85, portrait: { x: 27.0, y: 8.9, zoom: 2.2 } },
  { at: 0.185, x: 25.9, y: 8.2, zoom: 2.0, portrait: { x: 27.0, y: 8.9, zoom: 2.35 } },
  { at: 0.225, x: 26.9, y: 8.35, zoom: 2.1, portrait: { x: 26.1, y: 8.95, zoom: 2.4 } },
  { at: 0.31, x: 26.9, y: 8.4, zoom: 2.3, portrait: { x: 26.1, y: 8.95, zoom: 2.55 } },
  { at: 0.35, x: 27.5, y: 8.35, zoom: 2.1, portrait: { x: 27.9, y: 8.95, zoom: 1.75 } },
  { at: 0.385, x: 29.0, y: 8.85, zoom: 3.0, portrait: { x: 29.1, y: 9.1, zoom: 3.0 } },
  { at: 0.425, x: 28.9, y: 8.9, zoom: 2.7, portrait: { x: 29.1, y: 9.05, zoom: 2.7 } },
  { at: 0.462, x: 16.5, y: 6.6, zoom: 0.95, portrait: { x: 17.5, y: 6.9, zoom: 1.0 } },
  { at: 0.5, x: -3.4, y: 0.95, zoom: 1.36 },
  { at: 0.59, x: -3.5, y: 1.05, zoom: 1.46 },
  { at: 0.635, x: -1.7, y: 5.5, zoom: 1.45, portrait: { x: -1.0, y: 5.95, zoom: 1.8 } },
  { at: 0.685, x: -1.8, y: 5.4, zoom: 1.35, portrait: { x: -1.1, y: 5.8, zoom: 1.6 } },
  { at: 0.735, x: 0.5, y: 2.6, zoom: 0.66 },
  { at: 0.775, x: 3.9, y: 0.95, zoom: 1.3 },
  { at: 0.845, x: 4.1, y: 1.05, zoom: 1.4 },
  { at: 0.925, x: 2.0, y: 2.0, zoom: 0.7 },
  { at: 1.0, x: 1.0, y: 1.9, zoom: 0.62 },
];
const SHOTS: Shot[] = FRAMES.map(({ at, x, y, zoom }) => ({ at, x, y, zoom }));
// Phones see a narrow slice: wide shots come in a little closer.
const PORTRAIT: Shot[] = FRAMES.map(({ at, x, y, zoom, portrait }) => ({ at, x, y, zoom: zoom * lerp(1.2, 0.95, rise(zoom, 0.8, 2.6)), ...portrait }));

// ─── The hours ───────────────────────────────────────────────────────────────

type Hour = { at: number; top: RGB; low: RGB; amb: number; tint: RGB; stars: number; mist: number };

const HOURS: Hour[] = [
  { at: 0, top: [56, 76, 126], low: [246, 184, 126], amb: 0.62, tint: [255, 196, 150], stars: 0, mist: 0.8 },
  { at: 0.06, top: [62, 88, 138], low: [246, 190, 136], amb: 0.68, tint: [255, 204, 160], stars: 0, mist: 0.7 },
  { at: 0.125, top: [92, 132, 180], low: [238, 212, 176], amb: 0.92, tint: [255, 236, 206], stars: 0, mist: 0.2 },
  { at: 0.19, top: [92, 132, 180], low: [238, 212, 176], amb: 0.92, tint: [255, 236, 206], stars: 0, mist: 0.2 },
  { at: 0.215, top: [6, 8, 24], low: [22, 22, 48], amb: 0.05, tint: [140, 150, 200], stars: 1, mist: 0 },
  { at: 0.325, top: [6, 8, 24], low: [22, 22, 48], amb: 0.05, tint: [140, 150, 200], stars: 1, mist: 0 },
  { at: 0.35, top: [88, 128, 182], low: [240, 206, 160], amb: 0.92, tint: [255, 230, 190], stars: 0, mist: 0 },
  { at: 0.43, top: [80, 106, 164], low: [252, 188, 118], amb: 0.84, tint: [255, 206, 150], stars: 0, mist: 0 },
  { at: 0.5, top: [52, 54, 116], low: [255, 146, 70], amb: 0.52, tint: [255, 166, 104], stars: 0, mist: 0.2 },
  { at: 0.585, top: [26, 22, 66], low: [200, 76, 62], amb: 0.26, tint: [236, 128, 110], stars: 0.2, mist: 0.3 },
  { at: 0.625, top: [4, 6, 22], low: [26, 20, 52], amb: 0.05, tint: [150, 150, 210], stars: 1, mist: 0.1 },
  { at: 0.735, top: [4, 6, 22], low: [26, 20, 52], amb: 0.05, tint: [150, 150, 210], stars: 1, mist: 0.1 },
  { at: 0.77, top: [20, 28, 74], low: [150, 94, 128], amb: 0.16, tint: [200, 160, 190], stars: 0.4, mist: 0.6 },
  { at: 0.81, top: [50, 64, 126], low: [255, 150, 92], amb: 0.44, tint: [255, 176, 120], stars: 0, mist: 0.8 },
  { at: 0.9, top: [74, 106, 168], low: [252, 200, 146], amb: 0.72, tint: [255, 214, 170], stars: 0, mist: 0.5 },
  { at: 1, top: [80, 114, 174], low: [250, 206, 156], amb: 0.78, tint: [255, 222, 180], stars: 0, mist: 0.4 },
];

function hourAt(p: number): Hour {
  let i = 0;
  while (i < HOURS.length - 2 && p > HOURS[i + 1].at) i++;
  const a = HOURS[i];
  const b = HOURS[i + 1];
  const t = rise(p, a.at, b.at);
  return {
    at: p,
    top: mix(a.top, b.top, t),
    low: mix(a.low, b.low, t),
    amb: lerp(a.amb, b.amb, t),
    tint: mix(a.tint, b.tint, t),
    stars: lerp(a.stars, b.stars, t),
    mist: lerp(a.mist, b.mist, t),
  };
}

/** Where the sun is, in the sky layer's units above the horizon, and how it looks. */
function sunAt(p: number) {
  const fade = (from: number, to: number) => rise(p, from, from + 0.015) * (1 - rise(p, to - 0.015, to));
  if (p < 0.21) return { x: 6.2, y: lerp(-1.1, -2.2, rise(p, 0, 0.2)), r: 0.5, a: fade(-1, 0.205), color: [255, 222, 170] as RGB };
  if (p > 0.33 && p < 0.47) return { x: -3.8, y: lerp(-4.6, -2.8, rise(p, 0.34, 0.47)), r: 0.42, a: fade(0.335, 0.47), color: [255, 240, 210] as RGB };
  if (p >= 0.47 && p < 0.62) {
    const t = rise(p, 0.47, 0.595);
    return { x: -3.6, y: lerp(-1.5, 0.35, t), r: lerp(0.62, 0.8, t), a: 1 - rise(p, 0.6, 0.62), color: mix([255, 200, 120], [255, 96, 44], t) };
  }
  if (p >= 0.74) {
    const t = rise(p, 0.765, 0.86);
    return { x: 3.7, y: lerp(0.8, -1.4, t) - rise(p, 0.86, 1) * 1.2, r: lerp(0.8, 0.6, rise(p, 0.8, 0.95)), a: 1, color: mix([255, 100, 46], [255, 214, 150], rise(p, 0.79, 0.95)) };
  }
  return { x: 0, y: 0, r: 0, a: 0, color: [0, 0, 0] as RGB };
}

type Light = { x: number; y: number; r: number; a: number; color: string; reflect?: number };
type Wader = Person & { x: number; y: number; seed: number; dip?: boolean };
type Floater = { x: number; y: number; born: number; seed: number };
type Ring = { x: number; y: number; born: number; gold: boolean };
type Puff = { x: number; y: number; vx: number; age: number; life: number; size: number };

const SARIS: [RGB, RGB][] = [
  [[242, 178, 18], [210, 30, 30]],
  [[240, 116, 24], [250, 210, 60]],
  [[214, 36, 44], [246, 190, 40]],
  [[246, 196, 40], [226, 70, 20]],
  [[226, 70, 110], [250, 200, 60]],
  [[250, 150, 30], [180, 20, 30]],
];

class Chhath implements Scene {
  private readonly emit: Emit;
  private readonly dusk: Wader[] = [];
  private readonly dawn: Wader[] = [];
  private readonly bathers: Wader[] = [];
  private readonly lamps: { x: number; y: number; at: number; seed: number }[] = [];
  private readonly kosis: { x: number; size: number; seed: number }[] = [];
  private readonly sitters: { x: number; y: number; size: number; cloth: RGB; border: RGB; facing: 1 | -1 }[] = [];
  private readonly ripples: { x: number; y: number; seed: number }[] = [];
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private readonly floaters: Floater[] = [];
  private readonly walkers: { kind: "man" | "woman"; offset: number; cloth: RGB; border: RGB; seed: number }[] = [];
  private readonly bamboo: { x: number; lean: number; height: number; seed: number }[] = [];
  private readonly glitter: { t: number; x: number; seed: number }[] = [];
  private readonly clouds: { x: number; y: number; w: number; seed: number }[] = [];
  private readonly marks: { x: number; y: number; r: number; a: number }[] = [];
  private touched: Floater[] = [];
  private rings: Ring[] = [];
  private puffs: Puff[] = [];
  private farBank: Path2D | null = null;
  private readonly palms: { x: number; h: number; lean: number }[] = [];
  private lights: Light[] = [];
  private v: View | null = null;
  private env: Env = { amb: 1, tint: [255, 255, 255], night: [8, 8, 22] };
  private nextPuff = 0;
  private nextDip = 0;
  private pressed = false;
  private lastTouch = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(2611);

    // The vratis in the river at dusk, facing the setting sun, and at dawn, facing the rising one.
    const crowd = (facing: 1 | -1, hero: number, into: Wader[], from: number, to: number) => {
      into.push({ kind: "vrati", cloth: SARIS[0][0], border: SARIS[0][1], pose: 1, facing, x: hero, y: 3.3, seed: 1 });
      into.push({ kind: "man", cloth: [240, 236, 224], border: [200, 40, 40], pose: 2, facing, x: hero - facing * 0.95, y: 3.42, seed: 2 });
      for (let i = 0; i < 22; i++) {
        const x = from + random() * (to - from);
        const y = 0.9 + random() ** 0.9 * 4.4;
        if (Math.abs(x - hero) < 0.6 * y + 0.8 && y > 1.6) continue;
        const woman = random() < 0.78;
        const [cloth, border] = SARIS[Math.floor(random() * SARIS.length)];
        into.push({ kind: woman ? "vrati" : "man", cloth: woman ? cloth : [236, 232, 220], border: woman ? border : [200, 40, 40], pose: woman ? (random() < 0.7 ? 1 : 0) : 0, facing, x, y, seed: random() * 10 });
      }
      into.sort((a, b) => a.y - b.y);
    };
    // At dusk, none so far downstream that they would show behind the walk to the ghat.
    crowd(-1, -3.1, this.dusk, -18, 8);
    crowd(1, 4.5, this.dawn, -14, 16);
    this.bathers.push(
      { kind: "vrati", cloth: SARIS[1][0], border: SARIS[1][1], pose: 0, facing: 1, x: -5.4, y: 4.0, seed: 3, dip: true },
      { kind: "vrati", cloth: SARIS[3][0], border: SARIS[3][1], pose: 0, facing: 1, x: 5.8, y: 3.3, seed: 4 },
      { kind: "man", cloth: [236, 232, 220], border: [200, 40, 40], pose: 0, facing: 1, x: 8.6, y: 2.2, seed: 5 },
      { kind: "vrati", cloth: SARIS[2][0], border: SARIS[2][1], pose: 0, facing: -1, x: -9.2, y: 2.4, seed: 6 },
    );
    this.bathers.sort((a, b) => a.y - b.y);

    // Lamps along the steps, lit as the sun goes down; and a kosi every few paces.
    for (let row = 1; row < 4; row++) {
      for (let x = -38; x < GHAT_END - 0.4; x += 0.62) {
        this.lamps.push({ x: x + random() * 0.2, y: SHORE + row * STEP + 0.1, at: MOMENTS.lamps[0] + random() * 0.09 + (row - 1) * 0.004, seed: random() * 10 });
      }
    }
    for (const x of [-31, -24, -17, -10, 7, 12.5]) this.kosis.push({ x: x + random() * 0.8, size: 1.7 + random() * 0.25, seed: random() * 10 });
    for (let x = -36; x < GHAT_END; x += 1.1 + random() * 1.4) {
      if (x > -6 && x < 4.5) continue;
      const [cloth, border] = SARIS[Math.floor(random() * SARIS.length)];
      const man = random() < 0.3;
      this.sitters.push({ x, y: BANK + 0.5 + random() * 0.3, size: 1.6 + random() * 0.3, cloth: man ? [230, 226, 214] : cloth, border: man ? [200, 40, 40] : border, facing: random() < 0.5 ? 1 : -1 });
    }

    for (let i = 0; i < 200; i++) this.ripples.push({ x: -40 + random() * 80, y: 0.08 + random() ** 1.5 * (SHORE - 0.2), seed: random() * 10 });
    for (let i = 0; i < 220; i++) this.stars.push({ x: random(), y: random() ** 1.3, r: 0.5 + random() * 1.1, seed: random() * 10 });
    for (let i = 0; i < 40; i++) this.floaters.push({ x: -24 + random() * 36, y: 1.2 + random() ** 0.7 * 4.6, born: -random() * 100, seed: random() * 10 });
    for (let i = 0; i < 110; i++) this.glitter.push({ t: random(), x: random() - 0.5, seed: random() * 10 });
    for (let i = 0; i < 7; i++) this.clouds.push({ x: -14 + random() * 28, y: -1.2 - random() * 3.6, w: 2.5 + random() * 4, seed: random() * 10 });

    // Down the bank to the ghat: five men with the dauras on their heads, the women behind.
    for (let i = 0; i < 9; i++) {
      const man = i < 5;
      const [cloth, border] = SARIS[(i * 2) % SARIS.length];
      const dhotis: RGB[] = [[240, 234, 218], [236, 220, 170], [226, 228, 222], [240, 200, 90]];
      this.walkers.push({ kind: man ? "man" : "woman", offset: i * 1.45 + (man ? random() * 0.25 : 0.5), cloth: man ? dhotis[i % dhotis.length] : cloth, border, seed: random() * 10 });
    }
    for (let i = 0; i < 16; i++) this.bamboo.push({ x: 12.8 + random() * 4.2, lean: (random() - 0.5) * 0.5, height: 9 + random() * 4, seed: random() * 10 });
    // The swirls of a hand smoothing fresh mud on the wall and floor.
    for (let i = 0; i < 90; i++) this.marks.push({ x: 21.5 + random() * 18, y: 4.6 + random() * 6, r: 0.25 + random() * 0.4, a: random() * TAU });
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p, seconds } = f;
    const unit = Math.min(width, height) / 8;
    const focus = shot(f.portrait ? PORTRAIT : SHOTS, p);
    const v = view(width, height, focus, unit, f.portrait ? 0.34 : 0.5);
    this.v = v;
    this.lights = [];
    const hour = hourAt(p);
    this.env = { amb: hour.amb, tint: hour.tint, night: [8, 8, 22] };
    const horizon = toScreen(v, 0, 0).y;
    const skyScale = unit * Math.pow(focus.zoom, 0.4);

    const sun = this.sky(ctx, f, v, hour, horizon, skyScale);
    this.water(ctx, f, v, hour, horizon, sun);

    ctx.save();
    apply(ctx, v);
    this.waterMarks(ctx, v, hour, seconds);
    this.mist(ctx, v, hour);
    this.drawRings(ctx, v, f);
    this.floating(ctx, v, p, seconds);
    this.waders(ctx, v, f, sun);
    this.ghat(ctx, v, p, seconds, hour);
    this.bank(ctx, v, p, seconds, hour);
    this.courtyard(ctx, v, p, seconds);
    this.procession(ctx, v, p, hour);

    ctx.globalCompositeOperation = "lighter";
    const lamp = glowSprite(LAMP);
    for (const l of this.lights) {
      const sprite = l.color === LAMP ? lamp : glowSprite(l.color);
      glow(ctx, sprite, l.x, l.y, l.r, l.a);
      if (l.reflect !== undefined) {
        // A lamp on the water, doubled below it in a long broken streak.
        const shimmer = 0.7 + 0.3 * Math.sin(seconds * 2.4 + l.x * 3.1);
        const ry = l.reflect + (l.reflect - l.y) * 1.4;
        ctx.globalAlpha = Math.min(1, l.a * 0.5 * shimmer);
        ctx.drawImage(sprite, l.x - l.r * 0.28, ry - l.r * 0.9, l.r * 0.56, l.r * 1.8);
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = "source-over";
    this.smoke(ctx, v, f);
    ctx.restore();

    const warm = hour.amb;
    const vignette = ctx.createRadialGradient(width / 2, height * 0.5, Math.min(width, height) * 0.3, width / 2, height * 0.5, Math.max(width, height) * 0.8);
    vignette.addColorStop(0, "rgba(6, 4, 12, 0)");
    vignette.addColorStop(1, `rgba(6, 4, 12, ${0.62 - warm * 0.32})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind === "down") this.pressed = true;
    if (kind === "up") {
      this.pressed = false;
      return;
    }
    const v = this.v;
    if (!v || (kind === "move" && (!this.pressed || f.seconds - this.lastTouch < 0.25))) return;
    const world = toWorld(v, x, y);
    // Only the river answers, and only where it is not the bank or the courtyard.
    if (world.y < 0.3 || world.y > SHORE - 0.1 || world.x > GHAT_END + 1) return;
    this.lastTouch = f.seconds;
    const p = f.p;
    if (p > 0.64 && p < 0.77) {
      this.touched.push({ x: world.x, y: world.y, born: f.seconds, seed: Math.random() * 10 });
      if (this.touched.length > 40) this.touched.shift();
      this.emit("float");
      return;
    }
    const arghya = (p > 0.49 && p < 0.61) || p > 0.76;
    this.rings.push({ x: world.x, y: world.y, born: f.seconds, gold: arghya });
    if (this.rings.length > 24) this.rings.shift();
    this.emit(arghya ? "arghya" : "ripple");
  }

  // ─── Sky and water ─────────────────────────────────────────────────────────

  private sky(ctx: Ctx, f: Frame, v: View, hour: Hour, horizon: number, skyScale: number) {
    const { width, height, p, seconds } = f;
    const h = Math.max(horizon, 1);
    const sky = ctx.createLinearGradient(0, Math.min(0, h - height), 0, h);
    sky.addColorStop(0, rgb(hour.top));
    sky.addColorStop(0.65, rgb(mix(hour.top, hour.low, 0.45)));
    sky.addColorStop(1, rgb(hour.low));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const s = sunAt(p);
    const squeeze = f.portrait ? 0.45 : 1;
    const sun = { x: v.ax + (s.x * squeeze - v.x * 0.06) * skyScale, y: horizon + s.y * skyScale, r: s.r * skyScale, a: s.a, color: s.color };
    if (horizon <= 0) return sun;

    if (hour.stars > 0.01) {
      ctx.fillStyle = "#f2ecdc";
      for (const star of this.stars) {
        const y = star.y * h * 0.92;
        const twinkle = 0.55 + 0.45 * Math.sin(seconds * (0.8 + star.seed * 0.2) + star.seed * 6);
        ctx.globalAlpha = twinkle * hour.stars * (1 - (y / h) * 0.75) * 0.85;
        ctx.fillRect(((star.x * width * 1.4 - v.x * skyScale * 0.04) % width + width) % width, y, star.r, star.r);
      }
      ctx.globalAlpha = 1;
      // The moon of the sixth night, a little more than half, going down in the west.
      const moon = rise(p, 0.6, 0.64) * (1 - rise(p, 0.74, 0.77));
      if (moon > 0.01) {
        const mx = v.ax + (-6.5 * squeeze - v.x * 0.06) * skyScale;
        const my = horizon - 4.2 * skyScale;
        const mr = 0.28 * skyScale;
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, glowSprite("200, 210, 255"), mx, my, mr * 7, 0.25 * moon);
        ctx.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TAU);
        ctx.clip();
        ctx.fillStyle = rgb(mix(hour.top, [40, 44, 70], 0.5), moon);
        ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        ctx.fillStyle = `rgba(250, 244, 222, ${moon})`;
        ctx.beginPath();
        ctx.arc(mx, my, mr, -Math.PI / 2 - 0.3, Math.PI / 2 - 0.3, true);
        ctx.ellipse(mx, my, mr * 0.25, mr, -0.3, Math.PI / 2, -Math.PI / 2, true);
        ctx.fill();
        ctx.restore();
      }
    }

    // Long thin clouds, lit from below by a low sun.
    const low = Math.max(0, 1 - hour.amb) * 0.6 + 0.25;
    for (const c of this.clouds) {
      const cx = v.ax + (c.x - v.x * 0.1 + seconds * 0.02) * skyScale;
      const cy = horizon + c.y * skyScale;
      const w = c.w * skyScale;
      if (cx + w < 0 || cx - w > width) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w);
      const lit = mix(hour.low, [255, 240, 220], 0.2);
      g.addColorStop(0, rgb(mix(lit, hour.top, 0.3), 0.35 * low * (1 - hour.stars)));
      g.addColorStop(1, rgb(lit, 0));
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.08 + (c.seed % 1) * 0.05);
      ctx.translate(-cx, -cy);
      ctx.fillRect(cx - w, cy - w, w * 2, w * 2);
      ctx.restore();
    }

    if (sun.a > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      const color = sun.color.map(Math.round).join(", ");
      glow(ctx, glowSprite(color), sun.x, sun.y, sun.r * 9, 0.55 * sun.a);
      glow(ctx, glowSprite(color), sun.x, sun.y, sun.r * 3.2, 0.5 * sun.a);
      ctx.globalCompositeOperation = "source-over";
      const disc = ctx.createRadialGradient(sun.x, sun.y - sun.r * 0.2, 0, sun.x, sun.y, sun.r);
      disc.addColorStop(0, rgb(mix(sun.color, [255, 255, 240], 0.7), sun.a));
      disc.addColorStop(0.8, rgb(sun.color, sun.a));
      disc.addColorStop(1, rgb(mix(sun.color, [255, 90, 40], 0.4), sun.a));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.r, 0, TAU);
      ctx.fill();
    }
    this.birds(ctx, f, v, hour, horizon, skyScale);
    return sun;
  }

  private birds(ctx: Ctx, f: Frame, v: View, hour: Hour, horizon: number, skyScale: number) {
    const shown = (1 - hour.stars) * (1 - rise(hour.amb, 0.8, 0.9));
    if (shown < 0.05) return;
    ctx.strokeStyle = rgb(mix(hour.top, [10, 8, 16], 0.7), shown * 0.8);
    ctx.lineWidth = Math.max(1, skyScale * 0.02);
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const x = v.ax + ((((f.seconds * 0.35 + i * 0.7) % 16) - 8 + (i % 3) * 0.3 - v.x * 0.08) * skyScale);
      const y = horizon + (-2.6 - (i % 4) * 0.28 - Math.sin(i * 1.3) * 0.2) * skyScale;
      const flap = Math.sin(f.seconds * 7 + i * 1.7) * 0.5;
      const w = skyScale * 0.09;
      ctx.beginPath();
      ctx.moveTo(x - w, y - w * flap);
      ctx.quadraticCurveTo(x - w * 0.4, y - w * 0.4, x, y);
      ctx.quadraticCurveTo(x + w * 0.4, y - w * 0.4, x + w, y - w * flap);
      ctx.stroke();
    }
  }

  private ensureFarBank() {
    if (this.farBank) return this.farBank;
    // The far bank, flat as the plains are: groves of mango and peepal, scrub between them, a
    // temple or two, and toddy palms standing up out of it all.
    const random = mulberry32(77);
    const path = new Path2D();
    path.rect(-90, -0.06, 180, 0.08);
    let x = -90;
    while (x < 90) {
      const grove = 1.2 + random() * 4;
      for (let t = 0; t < grove; t += 0.1 + random() * 0.12) {
        const edge = Math.sin((t / grove) * Math.PI);
        const r = (0.06 + random() * 0.12) * (0.5 + edge * 0.6);
        path.moveTo(x + t + r, -0.04 - edge * 0.2);
        path.arc(x + t, -0.04 - edge * 0.2 - random() * 0.06, r, 0, TAU);
      }
      x += grove;
      // Scrub, and now and then a hut or a temple.
      const gap = 0.3 + random() * 2.2;
      if (random() < 0.2) {
        const tx = x + gap / 2;
        path.moveTo(tx - 0.14, -0.04);
        path.lineTo(tx - 0.14, -0.2);
        path.quadraticCurveTo(tx - 0.1, -0.42, tx, -0.52);
        path.lineTo(tx + 0.005, -0.62);
        path.lineTo(tx + 0.01, -0.52);
        path.quadraticCurveTo(tx + 0.1, -0.42, tx + 0.14, -0.2);
        path.lineTo(tx + 0.14, -0.04);
        path.closePath();
      } else if (random() < 0.4) {
        const hx = x + gap / 2;
        path.moveTo(hx - 0.14, -0.03);
        path.lineTo(hx - 0.14, -0.1);
        path.lineTo(hx, -0.18);
        path.lineTo(hx + 0.14, -0.1);
        path.lineTo(hx + 0.14, -0.03);
        path.closePath();
      }
      x += gap;
    }
    for (let i = 0; i < 40; i++) this.palms.push({ x: -80 + random() * 160, h: 0.35 + random() * 0.35, lean: (random() - 0.5) * 0.1 });
    this.farBank = path;
    return path;
  }

  private water(ctx: Ctx, f: Frame, v: View, hour: Hour, horizon: number, sun: { x: number; y: number; r: number; a: number; color: RGB }) {
    const { width, height, seconds } = f;
    if (horizon >= height) return;
    const top = Math.max(0, horizon);
    const g = ctx.createLinearGradient(0, horizon, 0, height);
    g.addColorStop(0, rgb(mix(hour.low, hour.top, 0.25)));
    g.addColorStop(0.35, rgb(mix(hour.top, hour.low, 0.25)));
    g.addColorStop(1, rgb(mix(hour.top, [4, 4, 14], 0.45)));
    ctx.fillStyle = g;
    ctx.fillRect(0, top, width, height - top);

    // The far bank, and its reflection.
    const unit = Math.min(width, height) / 8;
    const bankScale = unit * Math.pow(v.scale / unit, 0.55);
    if (horizon > -bankScale * 2) {
      const path = this.ensureFarBank();
      const bank = rgb(mix(mix(hour.low, hour.top, 0.5), [10, 10, 20], 0.55 + (1 - hour.amb) * 0.35));
      ctx.save();
      ctx.translate(v.ax - v.x * 0.3 * bankScale, horizon);
      ctx.scale(bankScale, bankScale);
      ctx.fillStyle = bank;
      ctx.fill(path);
      ctx.strokeStyle = bank;
      ctx.lineCap = "round";
      for (const palm of this.palms) {
        const tx = palm.x + palm.lean;
        ctx.lineWidth = 0.022;
        ctx.beginPath();
        ctx.moveTo(palm.x, 0);
        ctx.lineTo(tx, -palm.h);
        ctx.stroke();
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9;
          ctx.moveTo(tx, -palm.h);
          ctx.quadraticCurveTo(tx + Math.cos(a) * 0.08, -palm.h + Math.sin(a) * 0.1, tx + Math.cos(a) * 0.15, -palm.h + Math.sin(a) * 0.08 + 0.05);
        }
        ctx.stroke();
      }
      ctx.scale(1, -0.5);
      ctx.globalAlpha = 0.3;
      ctx.fill(path);
      ctx.restore();
      // Haze where the bank meets the water.
      const haze = ctx.createLinearGradient(0, horizon - bankScale * 0.6, 0, horizon + bankScale * 0.3);
      haze.addColorStop(0, rgb(hour.low, 0));
      haze.addColorStop(0.7, rgb(hour.low, 0.25 * (0.4 + hour.mist)));
      haze.addColorStop(1, rgb(hour.low, 0));
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizon - bankScale * 0.6, width, bankScale * 0.9);
    }

    // The sun's road across the river: glints that widen as they come nearer.
    if (sun.a > 0.01 && sun.y < horizon + sun.r) {
      const strength = sun.a * clamp((horizon + sun.r - sun.y) / (sun.r * 2));
      const color = sun.color.map(Math.round).join(", ");
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite(color), sun.x, horizon, sun.r * 4, 0.35 * strength);
      ctx.fillStyle = rgb(mix(sun.color, [255, 250, 230], 0.4));
      for (const gl of this.glitter) {
        const t = gl.t ** 1.7;
        const y = horizon + (height - horizon) * t + 1;
        const spread = sun.r * (0.5 + t * 7);
        const x = sun.x + gl.x * spread * 2 + Math.sin(seconds * 0.9 + gl.seed) * spread * 0.1;
        const on = 0.5 + 0.5 * Math.sin(seconds * (1.5 + gl.seed * 0.3) + gl.seed * 7);
        const w = (4 + t * 40) * (0.4 + on);
        ctx.globalAlpha = strength * on * (1 - Math.abs(gl.x) * 1.6) * (1 - t * 0.5);
        ctx.fillRect(x - w / 2, y, w, 1 + t * 2.5);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /** Faint ripples all over the water, longer as they come nearer. */
  private waterMarks(ctx: Ctx, v: View, hour: Hour, seconds: number) {
    ctx.lineCap = "round";
    const light = rgb(mix(hour.low, [255, 255, 255], 0.3));
    const dark = rgb(mix(hour.top, [0, 0, 0], 0.5));
    for (const r of this.ripples) {
      const x = r.x + Math.sin(seconds * 0.3 + r.seed) * 0.3;
      const len = 0.08 + r.y * 0.1;
      if (!onScreen(v, x, r.y, len)) continue;
      const on = 0.5 + 0.5 * Math.sin(seconds * 0.8 + r.seed * 5);
      ctx.strokeStyle = r.seed % 2 < 1 ? light : dark;
      ctx.globalAlpha = 0.2 * on * (0.25 + 0.75 * hour.amb);
      ctx.lineWidth = (1 + r.y * 0.25) / v.scale;
      ctx.beginPath();
      ctx.moveTo(x - len, r.y);
      ctx.lineTo(x + len, r.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private mist(ctx: Ctx, v: View, hour: Hour) {
    if (hour.mist < 0.02) return;
    const left = v.x - v.width / v.scale;
    const right = v.x + v.width / v.scale;
    const g = ctx.createLinearGradient(0, -0.4, 0, 2.2);
    const c = mix(hour.low, [255, 255, 255], 0.25);
    g.addColorStop(0, rgb(c, 0));
    g.addColorStop(0.3, rgb(c, 0.35 * hour.mist));
    g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(left, -0.4, right - left, 2.6);
  }

  private drawRings(ctx: Ctx, v: View, f: Frame) {
    this.rings = this.rings.filter((r) => f.seconds - r.born < 3.2);
    // The bather's dips send out rings of their own.
    const light = mix(hourAt(f.p).low, [255, 250, 230], 0.4);
    for (const r of this.rings) {
      const age = f.seconds - r.born;
      for (let k = 0; k < 3; k++) {
        const t = age - k * 0.35;
        if (t <= 0) continue;
        const rx = t * 0.5 * (0.4 + r.y * 0.14);
        const a = (1 - t / 3) * 0.7;
        if (a <= 0) continue;
        ctx.strokeStyle = rgb(r.gold ? [255, 214, 140] : light, a);
        ctx.lineWidth = Math.max(1.2 / v.scale, 0.02 * r.y * 0.3);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rx, rx * 0.22, 0, 0, TAU);
        ctx.stroke();
      }
      if (r.gold) this.lights.push({ x: r.x, y: r.y, r: 0.5 + age * 0.2, a: 0.4 * (1 - age / 3.2), color: SUN });
    }
  }

  private floating(ctx: Ctx, v: View, p: number, seconds: number) {
    const shown = rise(p, 0.6, 0.64) * (1 - rise(p, 0.9, 0.97));
    const all = shown > 0.01 ? this.floaters.concat(this.touched) : this.touched;
    for (const d of all) {
      const age = seconds - d.born;
      const own = this.touched.includes(d);
      const lit = own ? clamp(age / 0.6) * Math.max(shown, 0.6) : shown;
      if (lit < 0.01) continue;
      const x = own ? d.x + age * 0.05 : ((d.x + seconds * 0.05 + 30) % 42) - 30;
      const y = d.y + Math.sin(seconds * 0.9 + d.seed) * 0.02;
      const s = 0.07 + y * 0.028;
      if (!onScreen(v, x, y, s * 6)) continue;
      // A dona of sal leaves, and the lamp in it.
      ctx.fillStyle = paint([40, 80, 30], this.env, lit * 0.4);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.8, s * 0.22, 0, 0, TAU);
      ctx.fill();
      drawDiya(ctx, x, y - s * 0.05, s, lit, seconds, d.seed, this.env);
      const fl = flicker(seconds, d.seed);
      this.lights.push({ x, y: y - s * 0.45, r: s * 7, a: 0.45 * lit * fl, color: LAMP, reflect: y });
    }
  }

  // ─── People in the river ───────────────────────────────────────────────────

  private waders(ctx: Ctx, v: View, f: Frame, sun: { x: number; a: number }) {
    const { p, seconds } = f;
    const sunScreen = sun.x;
    const groups: [Wader[], number, number][] = [
      [this.bathers, 1 - rise(p, 0.08, 0.11), 0],
      [this.dusk, rise(p, 0.43, 0.455) * (1 - rise(p, 0.6, 0.625)), rise(p, 0.48, 0.52)],
      [this.dawn, rise(p, 0.735, 0.76), rise(p, 0.775, 0.81)],
    ];
    for (const [people, shown, raise] of groups) {
      if (shown < 0.01) continue;
      ctx.globalAlpha = shown;
      for (const w of people) {
        let size = depth(w.y);
        if (!onScreen(v, w.x, w.y - size / 2, size * 1.2)) continue;
        // The bather goes under and comes up again.
        let sink = 0;
        if (w.dip) {
          const phase = (seconds * 0.25 + w.seed) % 1;
          sink = phase < 0.25 ? Math.sin((phase / 0.25) * Math.PI) * 0.95 : 0;
          if (phase < 0.02 && seconds > this.nextDip && !f.reduced) {
            this.nextDip = seconds + 1;
            this.rings.push({ x: w.x, y: w.y, born: seconds, gold: false });
          }
        }
        size = size * 1;
        const screen = toScreen(v, w.x, w.y);
        const towardSun = Math.sign(sunScreen - screen.x) === w.facing ? 1 : 0.35;
        const rim = sun.a * towardSun * clamp(1.1 - this.env.amb) * 0.9;
        drawReflection(ctx, w, w.x, w.y, size, this.env, 0, seconds, w.seed);
        ctx.save();
        ctx.beginPath();
        ctx.rect(w.x - size, w.y - size * 1.6, size * 2, size * 1.6);
        ctx.clip();
        drawPerson(ctx, w, w.x, w.y + sink * size, size, this.env, rim, 0, raise, seconds, w.seed, (lx, ly, s) => {
          if (raise > 0.4) this.lights.push({ x: lx, y: ly, r: s * 0.5, a: 0.5 * raise * shown, color: LAMP });
        });
        ctx.restore();
        // Where the water meets her: a ring of light.
        ctx.strokeStyle = rgb(mix(this.env.tint, [255, 255, 255], 0.3), 0.35);
        ctx.lineWidth = size * 0.015;
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, size * 0.26, size * 0.045, 0, 0, TAU);
        ctx.stroke();
        if (w.pose === 2 && raise > 0.2) this.pour(ctx, w, size, seconds, raise);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** The arghya: milk poured from the lota over the edge of her soop, into the river. */
  private pour(ctx: Ctx, w: Wader, size: number, seconds: number, raise: number) {
    const x = w.x + w.facing * size * 0.38;
    const y = w.y - size * 0.84;
    ctx.strokeStyle = `rgba(250, 246, 236, ${0.75 * raise})`;
    ctx.lineWidth = size * 0.018;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      ctx.lineTo(x + w.facing * size * 0.05 * t + Math.sin(seconds * 9 + t * 8) * size * 0.006, y + t * (w.y - y));
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(250, 246, 236, ${0.4 * raise})`;
    ctx.beginPath();
    ctx.ellipse(x + w.facing * size * 0.05, w.y, size * 0.08 * (1 + 0.2 * Math.sin(seconds * 6)), size * 0.02, 0, 0, TAU);
    ctx.fill();
  }

  // ─── The ghat ──────────────────────────────────────────────────────────────

  private ghat(ctx: Ctx, v: View, p: number, seconds: number, hour: Hour) {
    const left = v.x - v.width / v.scale - 1;
    const right = Math.min(GHAT_END + 0.6, v.x + v.width / v.scale + 1);
    const env = this.env;
    if (right > left && onScreen(v, (left + right) / 2, SHORE + STEP * 2, Math.max(STEP * 3, (right - left) / 2))) {
      for (let i = 0; i < 4; i++) {
        const y = SHORE + i * STEP;
        const g = ctx.createLinearGradient(0, y, 0, y + STEP);
        g.addColorStop(0, paint([164, 130, 104], env, 0.05));
        g.addColorStop(1, paint([128, 98, 78], env));
        ctx.fillStyle = g;
        ctx.fillRect(left, y, right - left, STEP);
        // The lip of each step catching the sky, and the wet edge at the water.
        ctx.fillStyle = rgb(mix(tone([200, 170, 140], env, 0.1), hour.low, 0.25));
        ctx.fillRect(left, y, right - left, 0.035);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(left, y - 0.03, right - left, 0.03);
        // The joints between the blocks of stone.
        ctx.strokeStyle = "rgba(30, 20, 20, 0.22)";
        ctx.lineWidth = 1.2 / v.scale;
        ctx.beginPath();
        const block = 1.4 + i * 0.25;
        for (let x = Math.floor(left / block) * block + (i % 2) * block * 0.5; x < right; x += block) {
          ctx.moveTo(x, y + 0.04);
          ctx.lineTo(x, y + STEP);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(20, 16, 20, 0.4)";
      ctx.fillRect(left, SHORE, right - left, 0.08);
    }

    // The lamps along the steps.
    const burn = 1 - rise(p, 0.9, 0.99) * 0.7;
    const px = 0.24 * v.scale;
    for (const lamp of this.lamps) {
      const lit = rise(p, lamp.at, lamp.at + 0.01) * burn;
      if (lit < 0.01 || !onScreen(v, lamp.x, lamp.y, 0.6)) continue;
      const fl = flicker(seconds, lamp.seed);
      if (px > 7) drawDiya(ctx, lamp.x, lamp.y, 0.24, lit, seconds, lamp.seed, env);
      else {
        ctx.fillStyle = `rgba(255, 220, 150, ${lit})`;
        ctx.fillRect(lamp.x - 0.05, lamp.y - 0.12, 0.1, 0.1);
      }
      this.lights.push({ x: lamp.x, y: lamp.y - 0.14, r: 0.45, a: 0.55 * lit * fl, color: LAMP });
      if (lamp.seed < 3.5) this.lights.push({ x: lamp.x, y: lamp.y - 0.16, r: 1.6, a: 0.12 * lit * fl, color: LAMP });
    }

    // The kosi, stood at each family's place on the top step.
    const standing = rise(p, 0.43, 0.46);
    if (standing > 0.01) {
      const lit = rise(p, MOMENTS.kosi[0], MOMENTS.kosi[1]) * burn;
      ctx.globalAlpha = standing;
      const lamp = (x: number, y: number, s: number) => {
        const fl = flicker(seconds, x);
        this.lights.push({ x, y, r: s * 0.18, a: 0.6 * lit * fl, color: LAMP });
        this.lights.push({ x, y, r: s * 0.7, a: 0.08 * lit * fl, color: LAMP });
      };
      for (const k of this.kosis) {
        if (!onScreen(v, k.x, BANK - k.size / 2, k.size * 1.4)) continue;
        drawKosi(ctx, k.x, BANK - 0.1, k.size, lit, seconds, env, false, k.seed, lamp);
      }
      if (onScreen(v, KOSI.x, KOSI.y - KOSI.size / 2, KOSI.size * 1.6)) {
        drawKosi(ctx, KOSI.x, KOSI.y, KOSI.size, lit, seconds, env, true, 11, lamp);
        if (lit > 0.01) this.lights.push({ x: KOSI.x, y: KOSI.y - KOSI.size * 0.3, r: KOSI.size * 1.3, a: 0.16 * lit, color: LAMP });
      }
      ctx.globalAlpha = 1;
    }
  }

  private bank(ctx: Ctx, v: View, p: number, seconds: number, hour: Hour) {
    const env = this.env;
    const left = v.x - v.width / v.scale - 1;
    const right = v.x + v.width / v.scale + 1;
    const bottom = v.y + v.height / v.scale + 1;
    // The top of the ghat and the bank all along.
    if (bottom > BANK) {
      const g = ctx.createLinearGradient(0, BANK, 0, BANK + 4);
      g.addColorStop(0, paint([132, 100, 72], env));
      g.addColorStop(1, paint([84, 60, 42], env));
      ctx.fillStyle = g;
      ctx.fillRect(left, BANK, right - left, bottom - BANK);
    }
    // Downstream the ghat ends and the bank rises, grassy, to the bamboo and the house.
    if (right > GHAT_END - 1) {
      ctx.fillStyle = paint([96, 104, 58], env);
      ctx.beginPath();
      ctx.moveTo(GHAT_END - 0.2, BANK + 0.05);
      ctx.bezierCurveTo(GHAT_END, SHORE + 0.4, GHAT_END + 1, SHORE - 0.5, GHAT_END + 3, SHORE - 0.7);
      ctx.lineTo(60, SHORE - 0.7);
      ctx.lineTo(60, BANK + 0.05);
      ctx.closePath();
      ctx.fill();
      this.grove(ctx, v, seconds, hour);
    }
    // Families sitting on the top step through the evening, the night and the morning.
    const sitting = rise(p, 0.45, 0.48);
    if (sitting > 0.01) {
      ctx.globalAlpha = sitting;
      for (const s of this.sitters) {
        if (!onScreen(v, s.x, s.y - s.size / 2, s.size)) continue;
        drawSitting(ctx, s.x, s.y, s.size, s.cloth, s.border, env, 0, s.facing);
      }
      ctx.globalAlpha = 1;
    }
    // At the kosi, two women keep the lamps and sing.
    const night = rise(p, 0.6, 0.63) * (1 - rise(p, 0.74, 0.77));
    if (night > 0.01 && onScreen(v, KOSI.x, KOSI.y, 3)) {
      ctx.globalAlpha = night;
      drawSitting(ctx, KOSI.x - 1.7, KOSI.y + 0.7, 1.45, SARIS[0][0], SARIS[0][1], env, 0.5, 1);
      drawSitting(ctx, KOSI.x + 1.75, KOSI.y + 0.8, 1.4, SARIS[4][0], SARIS[4][1], env, 0.5, -1);
      ctx.globalAlpha = 1;
    }
  }

  private grove(ctx: Ctx, v: View, seconds: number, hour: Hour) {
    const env = this.env;
    if (!onScreen(v, 26, 2, 16)) return;
    const leaf = tone([52, 84, 40], env);
    const deep = tone([30, 50, 28], env);
    // Mango trees behind the house, one dark mass to the ground.
    ctx.fillStyle = rgb(deep);
    ctx.beginPath();
    ctx.moveTo(18, SHORE);
    const random = mulberry32(9);
    for (let x = 18; x <= 50; x += 1.6) ctx.quadraticCurveTo(x + 0.8, -2.8 - random() * 2.2, x + 1.6, -1.6 - random() * 1.5);
    ctx.lineTo(50, SHORE);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(mix(leaf, hour.low, 0.15), 0.6);
    const random2 = mulberry32(12);
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.ellipse(18.5 + random2() * 30, -1 + random2() * 4, 0.9 + random2() * 1.2, 0.5 + random2() * 0.6, 0, 0, TAU);
      ctx.fill();
    }
    // A clump of bamboo, leaning and swaying.
    ctx.lineCap = "round";
    for (const b of this.bamboo) {
      const sway = Math.sin(seconds * 0.5 + b.seed) * 0.15;
      const tx = b.x + b.lean * b.height + sway;
      const ty = SHORE + 0.2 - b.height;
      ctx.strokeStyle = paint([120, 128, 64], env);
      ctx.lineWidth = 0.09;
      ctx.beginPath();
      ctx.moveTo(b.x, SHORE + 0.4);
      ctx.quadraticCurveTo(b.x + b.lean * b.height * 0.3, SHORE - b.height * 0.5, tx, ty);
      ctx.stroke();
      ctx.strokeStyle = paint([60, 96, 44], env, 0, 0.9);
      ctx.lineWidth = 0.05;
      for (let i = 0; i < 9; i++) {
        const t = 0.45 + i * 0.06;
        const lx = lerp(b.x, tx, t * t);
        const ly = lerp(SHORE, ty, t);
        const side = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + side * 0.6, ly - 0.1, lx + side * 1.0, ly + 0.35);
        ctx.stroke();
      }
    }
    // Banana plants by the wall.
    for (const [bx, h] of [[19.6, 3.2], [20.8, 2.6]]) {
      ctx.strokeStyle = paint([100, 120, 60], env);
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      ctx.moveTo(bx, BANK);
      ctx.lineTo(bx + 0.1, BANK - h);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45 + Math.sin(seconds * 0.6 + i) * 0.03;
        ctx.save();
        ctx.translate(bx + 0.1, BANK - h);
        ctx.rotate(a);
        // A long leaf, drooping at the tip, torn a little by the wind.
        ctx.fillStyle = paint(i % 2 ? [70, 128, 50] : [84, 140, 58], env);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.4, -0.3, 1.1, -0.28, 1.5, 0.15);
        ctx.bezierCurveTo(1.1, 0.12, 0.4, 0.18, 0, 0);
        ctx.fill();
        ctx.strokeStyle = paint([150, 170, 90], env, 0, 0.7);
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0.8, -0.1, 1.5, 0.15);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ─── The courtyard ─────────────────────────────────────────────────────────

  private courtyard(ctx: Ctx, v: View, p: number, seconds: number) {
    if (!onScreen(v, 30, 7, 10)) return;
    const env = this.env;
    const WALL_TOP = 4.4;
    const FLOOR = BANK + 0.1;
    const dark = 1 - env.amb;
    // Firelight falls off from the chulha.
    const fire = 1 - rise(p, 0.45, 0.48);
    const near = (x: number, y: number) => fire * clamp(1 - Math.hypot(x - CHULHA.x, (y - CHULHA.y) * 1.4) / 2.6) * dark * 0.7;

    // The wall: mud plastered fresh for the festival, and a tiled roof over it.
    const wall = ctx.createLinearGradient(0, WALL_TOP, 0, FLOOR);
    wall.addColorStop(0, paint([104, 70, 44], env));
    wall.addColorStop(0.35, paint([150, 104, 66], env));
    wall.addColorStop(1, paint([168, 118, 76], env, near(CHULHA.x, FLOOR)));
    ctx.fillStyle = wall;
    ctx.fillRect(21.6, WALL_TOP, 30, FLOOR - WALL_TOP);
    ctx.fillStyle = paint([116, 76, 46], env, near(CHULHA.x, FLOOR));
    ctx.fillRect(21.6, FLOOR - 0.42, 30, 0.42);
    ctx.fillStyle = paint([92, 60, 38], env);
    ctx.fillRect(21.6, WALL_TOP, 0.14, FLOOR - WALL_TOP);
    ctx.fillStyle = paint([120, 50, 34], env);
    ctx.beginPath();
    ctx.moveTo(21.1, WALL_TOP + 0.15);
    ctx.lineTo(21.9, WALL_TOP - 1.2);
    ctx.lineTo(52, WALL_TOP - 1.2);
    ctx.lineTo(52, WALL_TOP + 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([70, 28, 20], env, 0, 0.8);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let x = 21.6; x < 40; x += 0.32) {
      ctx.moveTo(x, WALL_TOP + 0.12);
      ctx.lineTo(x + 0.2, WALL_TOP - 1.15);
    }
    ctx.stroke();

    // The hand's swirls in the mud.
    ctx.strokeStyle = paint([210, 160, 110], env, 0, 0.1);
    ctx.lineWidth = 0.025;
    for (const m of this.marks) {
      if (!onScreen(v, m.x, m.y, m.r)) continue;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, m.a, m.a + 1.8);
      ctx.stroke();
    }

    // The door into the house, dark inside.
    ctx.fillStyle = paint([70, 44, 28], env, near(24, 7));
    ctx.fillRect(23.3, 5.5, 1.4, FLOOR - 5.5);
    ctx.fillStyle = paint([22, 14, 10], env);
    ctx.fillRect(23.45, 5.65, 1.1, FLOOR - 5.65);
    ctx.fillStyle = paint([60, 36, 22], env);
    ctx.fillRect(23.45, 5.65, 0.2, FLOOR - 5.65);
    // Rice-paste aripan along the foot of the wall: a vine of little five-petalled flowers.
    ctx.fillStyle = paint([244, 236, 220], env, near(27, FLOOR), 0.7);
    ctx.strokeStyle = paint([244, 236, 220], env, near(27, FLOOR), 0.55);
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (let x = 25; x < 34; x += 0.05) ctx.lineTo(x, FLOOR - 0.2 + Math.sin(x * 9) * 0.03);
    ctx.stroke();
    for (let x = 25.17; x < 34; x += 0.35) {
      const fy = FLOOR - 0.2 + Math.sin(x * 9) * 0.03;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 0.028, fy + Math.sin(a) * 0.028, 0.02, 0.009, a, 0, TAU);
        ctx.fill();
      }
    }
    // Mango leaves strung over the door, and sindoor marks beside it.
    ctx.strokeStyle = paint([60, 40, 26], env, 0, 0.8);
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(23.3, 5.55);
    ctx.quadraticCurveTo(24, 5.7, 24.7, 5.55);
    ctx.stroke();
    ctx.fillStyle = paint([60, 110, 40], env, near(24, 6));
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const lx = lerp(23.35, 24.65, t);
      const ly = 5.56 + Math.sin(t * Math.PI) * 0.07;
      ctx.beginPath();
      ctx.moveTo(lx - 0.04, ly);
      ctx.quadraticCurveTo(lx, ly + 0.3, lx + 0.04, ly);
      ctx.fill();
    }
    ctx.fillStyle = paint([200, 30, 24], env, near(24, 6));
    for (let i = 0; i < 5; i++) ctx.fillRect(24.86, 6.0 + i * 0.14, 0.05, 0.08);
    // Mango wood stacked against the wall, and a clay matka of water.
    for (let i = 0; i < 9; i++) {
      const wx = 25.05 + (i % 5) * 0.09;
      ctx.strokeStyle = paint(i % 2 ? [96, 62, 40] : [120, 80, 50], env, near(25.3, 7.4));
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(wx - 0.1, FLOOR - 0.02 - Math.floor(i / 5) * 0.05);
      ctx.lineTo(wx + 0.12, FLOOR - 1.1 + (i % 3) * 0.08);
      ctx.stroke();
    }
    drawPot(ctx, 30.6, FLOOR + 0.05, 0.62, "clay", [30, 30, 40], env, near(30.6, FLOOR), seconds, false);
    // Sugarcane, bought for the ghat, leaning on the wall.
    for (let i = 0; i < 5; i++) drawCane(ctx, 31.2 + i * 0.16, FLOOR + 0.02, 31.55 + i * 0.2, FLOOR - 3.2 + (i % 2) * 0.2, 0.07, env, 0, true, i + 20);
    // A niche in the wall, with a lamp in it after dark.
    ctx.fillStyle = paint([60, 36, 22], env, dark * 0.4);
    ctx.beginPath();
    ctx.moveTo(29.3, 6.95);
    ctx.lineTo(29.3, 6.45);
    ctx.quadraticCurveTo(29.55, 6.2, 29.8, 6.45);
    ctx.lineTo(29.8, 6.95);
    ctx.closePath();
    ctx.fill();
    drawDiya(ctx, 29.55, 6.93, 0.2, dark, seconds, 7, env);
    if (dark > 0.05) this.lights.push({ x: 29.6, y: 6.8, r: 0.9, a: 0.4 * dark * flicker(seconds, 7), color: LAMP });

    // The floor, smoothed with mud and cow dung, darker where the eave shades it.
    const floor = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 3);
    floor.addColorStop(0, paint([104, 72, 46], env, near(CHULHA.x, CHULHA.y)));
    floor.addColorStop(0.25, paint([132, 94, 60], env, near(CHULHA.x, CHULHA.y) * 0.8));
    floor.addColorStop(1, paint([100, 70, 44], env));
    ctx.fillStyle = floor;
    ctx.fillRect(21.6, FLOOR, 30, 6);
    const shade = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 0.25);
    shade.addColorStop(0, "rgba(20, 10, 6, 0.35)");
    shade.addColorStop(1, "rgba(20, 10, 6, 0)");
    ctx.fillStyle = shade;
    ctx.fillRect(21.6, FLOOR, 30, 0.25);

    const kharna = rise(p, MOMENTS.kharna[0], MOMENTS.kharna[1]);
    const thekua = rise(p, MOMENTS.thekua[0], MOMENTS.thekua[1]);
    const lift = near(CHULHA.x, CHULHA.y);
    const shadow = (x: number, y: number, rx: number) => {
      ctx.fillStyle = "rgba(20, 10, 6, 0.3)";
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.16, 0, 0, TAU);
      ctx.fill();
    };
    const addFire = (x: number, y: number, r: number) => {
      const fl = flicker(seconds * 0.8, 1);
      this.lights.push({ x, y, r: r * 0.9, a: (0.35 + 0.3 * dark) * fire * fl, color: FIRE });
      this.lights.push({ x, y: y - r * 0.2, r: r * 2.2, a: 0.28 * dark * fire * fl, color: FIRE });
    };

    // Nahay Khay: rice in the clay handi, and a leaf of rice, dal and lauki.
    const day1 = 1 - kharna;
    // Kharna: rasiya, rice and jaggery, in a brass pot; roti on the leaf; one lamp.
    const day2 = kharna * (1 - thekua);
    const potTop = CHULHA.y - CHULHA.size * 0.44;
    shadow(CHULHA.x, CHULHA.y, CHULHA.size * 0.6);
    drawChulha(ctx, CHULHA.x, CHULHA.y, CHULHA.size, fire, seconds, env, addFire);
    // She sits by the fire all three days; on the third, behind the soop she is filling.
    const vrati = (x: number, y: number, s: number, alpha: number) => {
      if (alpha < 0.01) return;
      ctx.globalAlpha = alpha;
      shadow(x, y, s * 0.5);
      drawSitting(ctx, x, y, s, SARIS[0][0], SARIS[0][1], env, lift * 1.4 + 0.15 * fire * dark, -1);
      ctx.globalAlpha = 1;
    };
    if (day1 > 0.01) {
      ctx.globalAlpha = day1;
      drawPot(ctx, CHULHA.x, potTop + 0.02, 0.62, "clay", [240, 236, 224], env, lift, seconds);
      shadow(LEAF.x, LEAF.y + 0.05, LEAF.size * 0.5);
      drawLeaf(ctx, LEAF.x, LEAF.y, LEAF.size, env, lift * 0.5);
      drawHeap(ctx, LEAF.x - 0.2, LEAF.y + 0.02, 0.36, [244, 240, 226], env, lift * 0.5);
      drawHeap(ctx, LEAF.x + 0.22, LEAF.y + 0.04, 0.24, [170, 190, 110], env, lift * 0.5, false);
      ctx.fillStyle = paint([170, 80, 40], env, lift * 0.5);
      ctx.beginPath();
      ctx.ellipse(LEAF.x + 0.02, LEAF.y + 0.12, 0.13, 0.05, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = paint([240, 190, 60], env, lift * 0.5);
      ctx.beginPath();
      ctx.ellipse(LEAF.x + 0.02, LEAF.y + 0.1, 0.1, 0.03, 0, 0, TAU);
      ctx.fill();
      shadow(LEAF.x + 0.95, LEAF.y + 0.2, 0.4);
      drawLauki(ctx, LEAF.x + 0.95, LEAF.y + 0.12, 0.8, -0.2, env, 0);
      ctx.globalAlpha = 1;
    }
    if (day2 > 0.01) {
      ctx.globalAlpha = day2;
      drawPot(ctx, CHULHA.x, potTop + 0.02, 0.6, "brass", [196, 146, 92], env, lift, seconds);
      const lx = LEAF2.x;
      const ly = LEAF2.y;
      shadow(lx, ly + 0.05, LEAF.size * 0.5);
      drawLeaf(ctx, lx, ly, LEAF.size, env, lift * 0.6 + 0.2);
      drawRoti(ctx, lx + 0.22, ly + 0.02, 0.34, env, lift * 0.6 + 0.2);
      drawRoti(ctx, lx + 0.26, ly - 0.02, 0.32, env, lift * 0.6 + 0.2);
      drawHeap(ctx, lx - 0.18, ly + 0.04, 0.34, [186, 128, 76], env, lift * 0.6 + 0.2, false);
      ctx.strokeStyle = paint([214, 200, 70], env, lift * 0.6 + 0.2);
      ctx.lineWidth = 0.06;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lx - 0.45, ly + 0.12);
      ctx.quadraticCurveTo(lx - 0.35, ly + 0.02, lx - 0.22, ly + 0.14);
      ctx.stroke();
      drawDiya(ctx, lx + 0.72, ly + 0.2, 0.2, day2, seconds, 4, env);
      this.lights.push({ x: lx + 0.72, y: ly + 0.1, r: 0.25, a: 0.5 * day2, color: LAMP });
      this.lights.push({ x: lx + 0.72, y: ly + 0.1, r: 1.3, a: 0.3 * day2 * flicker(seconds, 4), color: LAMP });
      ctx.globalAlpha = 1;
    }
    vrati(SEAT.x, SEAT.y, SEAT.size, 1 - thekua);
    // Thekua frying in the kadhai, a thali heaped with them, and the soop filling.
    if (thekua > 0.01) {
      vrati(SOOP.x + 0.9, SOOP.y - 0.3, SEAT.size * 0.9, thekua);
      ctx.globalAlpha = thekua;
      drawPot(ctx, CHULHA.x, potTop + 0.05, 0.62, "iron", [176, 110, 34], env, lift, seconds);
      ctx.save();
      ctx.translate(CHULHA.x, potTop - 0.11);
      ctx.scale(1, 0.4);
      [[-0.18, 0.02], [0.02, -0.06], [0.19, 0.04], [0.0, 0.1]].forEach(([tx, ty], i) => drawThekua(ctx, tx, ty / 0.4, 0.17, i, env, lift + 0.2));
      ctx.restore();
      ctx.fillStyle = "rgba(255, 230, 170, 0.7)";
      for (let i = 0; i < 12; i++) {
        const t = (seconds * 1.6 + i * 0.37) % 1;
        const a = i * 2.4;
        ctx.beginPath();
        ctx.arc(CHULHA.x + Math.cos(a) * 0.26, potTop - 0.11 + Math.sin(a) * 0.05, 0.012 * Math.sin(t * Math.PI), 0, TAU);
        ctx.fill();
      }
      const tx = THALI.x;
      const ty = THALI.y;
      shadow(tx, ty + 0.04, 0.44);
      ctx.fillStyle = paint([214, 170, 80], env, lift * 0.5);
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.42, 0.11, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = paint([250, 214, 130], env, lift * 0.5);
      ctx.lineWidth = 0.02;
      ctx.stroke();
      ctx.save();
      ctx.translate(tx, ty - 0.03);
      ctx.scale(1, 0.5);
      [[-0.2, 0], [0, 0.05], [0.2, 0], [-0.1, -0.1], [0.1, -0.1], [0, -0.22]].forEach(([dx, dy], i) => drawThekua(ctx, dx, dy, 0.2, i * 1.3, env, lift * 0.5));
      ctx.restore();
      const fill = rise(p, MOMENTS.soop[0], MOMENTS.soop[1]);
      shadow(SOOP.x, SOOP.y + 0.2, SOOP.width * 0.52);
      drawSoop(ctx, SOOP.x, SOOP.y, SOOP.width, fill, seconds, env, 0, (lx, ly) => {
        this.lights.push({ x: lx, y: ly, r: 0.2, a: 0.6 * thekua, color: LAMP });
      });
      ctx.globalAlpha = 1;
    }
  }

  /** Smoke and steam from the chulha, rising and spreading. */
  private smoke(ctx: Ctx, v: View, f: Frame) {
    const fire = 1 - rise(f.p, 0.45, 0.48);
    if (fire < 0.01 || !onScreen(v, CHULHA.x, CHULHA.y - 1.5, 2.5)) {
      this.puffs = [];
      return;
    }
    const top = CHULHA.y - CHULHA.size * 0.9;
    if (f.reduced) {
      this.puffs = [0, 1, 2].map((i) => ({ x: CHULHA.x + i * 0.1, y: top - i * 0.5, vx: 0, age: 1 + i, life: 5, size: 0.3 + i * 0.2 }));
    } else if (f.seconds > this.nextPuff && this.puffs.length < 36) {
      this.nextPuff = f.seconds + 0.18;
      this.puffs.push({ x: CHULHA.x + (Math.random() - 0.5) * 0.3, y: top, vx: 0.04 + Math.random() * 0.08, age: 0, life: 4 + Math.random() * 2, size: 0.12 + Math.random() * 0.08 });
    }
    const sprite = glowSprite("235, 232, 228");
    const night = 1 - this.env.amb;
    this.puffs = this.puffs.filter((q) => {
      q.age += f.dt;
      q.x += q.vx * f.dt + Math.sin(f.seconds * 0.7 + q.life) * 0.004;
      q.y -= 0.32 * f.dt;
      const t = q.age / q.life;
      const r = q.size + t * 0.9;
      glow(ctx, sprite, q.x, q.y, r, 0.16 * Math.sin(Math.PI * clamp(t)) * (1 - night * 0.6));
      return q.age < q.life;
    });
  }

  // ─── The walk to the ghat ──────────────────────────────────────────────────

  private procession(ctx: Ctx, v: View, p: number, hour: Hour) {
    const walked = rise(p, MOMENTS.walk[0], MOMENTS.walk[1]);
    if (walked <= 0 || walked >= 1) return;
    const env = this.env;
    const rim = clamp(1 - hour.amb) * 0.9 + 0.2;
    for (const w of this.walkers) {
      const x = lerp(23, 2, walked) + w.offset;
      const y = BANK + 0.75;
      const size = 2.5;
      if (!onScreen(v, x, y - size / 2, size)) continue;
      // Their steps follow the scroll, so they stand still when you do.
      const stride = x * 3.2 + w.seed;
      const tall = 0.94 + (w.seed % 1) * 0.1;
      if (w.kind === "man") drawCarrier(ctx, x, y, size * tall, stride, env, rim, -1, true, w.cloth, w.seed > 4);
      else drawWalker(ctx, x, y, size * 0.9 * tall, stride, env, rim, -1, w.cloth, w.border);
    }
  }
}

export function createScene(emit: Emit): Scene {
  return new Chhath(emit);
}
