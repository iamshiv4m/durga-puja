// Holi, as one continuous shot through a chowk in Braj: Holika's pyre under the Phalgun full moon,
// then the morning after at a grandmother's door, the painting of Radha and Krishna across the
// square, the whole lane at noon in a haze of gulal, thandai in the slow afternoon, and the palash
// in flower at the end of the lane as the light goes gold and the moon comes up again.
//
// World units, y down: the house fronts stand on y = 0 and the paving of the chowk runs towards
// the viewer from there. Pyre, people and props stand at y > 0 and are drawn back to front.
import { windowOpacity } from "@/lib/math";
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
import { Clouds, GULAL, Stains, Water, handprint, hazeSprite, splat } from "./colour";
import { holi } from "./content";
import { drawMural, paintMural } from "./mural";
import {
  CHOWKI,
  DADI_DOOR,
  LANE_END,
  MURAL,
  PALASH,
  PYRE,
  THALI,
  drawAsh,
  drawBackdrop,
  drawFields,
  drawHaveli,
  drawOfferings,
  drawPaving,
  drawTesuPot,
  drawThali,
  drawThandai,
  makeBackdrop,
  makeHavelis,
  paintPalash,
  paintPyre,
  palashFlower,
  pileProfile,
  tongue,
  type Haveli,
} from "./places";
import { drawChild, drawDadi, drawPerson, makeLook, type Look, type Pose } from "./people";

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  fire: [0.085, 0.12],
  holika: [0.115, 0.15],
  prahlad: [0.14, 0.17],
  embers: [0.185, 0.235],
  dawn: [0.2, 0.26],
  feet: [0.262, 0.272],
  cheek: [0.29, 0.3],
  radha: [0.385, 0.4],
  flowers: [0.405, 0.47],
  street: [0.47, 0.6],
  holiHai: [0.49, 0.5],
  thandai: [0.61, 0.72],
  embrace: [0.655, 0.675],
  evening: [0.73, 0.86],
  dusk: [0.86, 1],
} as const;

const SHOTS: Shot[] = [
  { at: 0.0, x: 0, y: 2.5, zoom: 0.8 },
  { at: 0.07, x: 0, y: 2.2, zoom: 0.88 },
  { at: 0.12, x: 0, y: 1.1, zoom: 1.05 },
  { at: 0.17, x: 0, y: 1.2, zoom: 1.0 },
  { at: 0.215, x: -3, y: 0.9, zoom: 1.2 },
  { at: 0.25, x: -6.3, y: 0.3, zoom: 2.05 },
  { at: 0.31, x: -6.2, y: 0.25, zoom: 2.15 },
  { at: 0.365, x: 7.1, y: -4.75, zoom: 1.5 },
  { at: 0.41, x: 7.1, y: -4.7, zoom: 1.62 },
  { at: 0.455, x: 6.5, y: -1.2, zoom: 1.0 },
  { at: 0.51, x: 0, y: -1.8, zoom: 0.58 },
  { at: 0.585, x: 0.5, y: -1.5, zoom: 0.64 },
  { at: 0.635, x: 13.9, y: 0.0, zoom: 1.85 },
  { at: 0.705, x: 14.0, y: -0.05, zoom: 1.75 },
  { at: 0.765, x: 21.8, y: -3.0, zoom: 0.8 },
  { at: 0.845, x: 22.2, y: -3.1, zoom: 0.84 },
  { at: 0.925, x: 8, y: -3.2, zoom: 0.44 },
  { at: 1.0, x: 7, y: -3.2, zoom: 0.42 },
];

/** Phones hold the same story in a narrow frame, above the captions: some shots move in or over. */
const PORTRAIT_SHOTS: Shot[] = [
  { at: 0.0, x: 0, y: 2.4, zoom: 0.95 },
  { at: 0.07, x: 0, y: 2.1, zoom: 1.0 },
  { at: 0.12, x: 0, y: 1.1, zoom: 1.05 },
  { at: 0.17, x: 0, y: 1.2, zoom: 1.0 },
  { at: 0.215, x: -3, y: 0.9, zoom: 1.2 },
  { at: 0.25, x: -6.3, y: 0.3, zoom: 2.05 },
  { at: 0.31, x: -6.2, y: 0.25, zoom: 2.15 },
  { at: 0.365, x: 7.1, y: -4.1, zoom: 1.28 },
  { at: 0.41, x: 7.1, y: -4.05, zoom: 1.34 },
  { at: 0.455, x: 6.5, y: -0.9, zoom: 1.0 },
  { at: 0.51, x: 0, y: -1.4, zoom: 0.6 },
  { at: 0.585, x: 0.5, y: -1.2, zoom: 0.66 },
  { at: 0.635, x: 14.4, y: 0.1, zoom: 1.6 },
  { at: 0.705, x: 14.5, y: 0.05, zoom: 1.55 },
  { at: 0.765, x: 22.6, y: -3.1, zoom: 0.82 },
  { at: 0.845, x: 22.9, y: -3.2, zoom: 0.86 },
  { at: 0.925, x: 6, y: -3.0, zoom: 0.52 },
  { at: 1.0, x: 5, y: -3.0, zoom: 0.5 },
];

const PINK = GULAL[0];
const FIRE_LIGHT = "255, 140, 50";
const WINDOW_LIGHT = "255, 170, 90";

type Keys<T> = [number, T][];

/** Reads a keyed track at `p`, easing between neighbours. */
function track(keys: Keys<number>, p: number): number;
function track(keys: Keys<RGB>, p: number): RGB;
function track(keys: Keys<number | RGB>, p: number): number | RGB {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
  const [a, va] = keys[i];
  const [b, vb] = keys[i + 1];
  const t = rise(p, a, b);
  if (typeof va === "number") return lerp(va, vb as number, t);
  return mix(va, vb as RGB, t);
}

// The sky, the grade over the world, and how warm the light is, through the day.
const SKY_TOP: Keys<RGB> = [
  [0, [5, 6, 18]],
  [0.2, [6, 8, 22]],
  [0.235, [26, 32, 70]],
  [0.265, [118, 156, 206]],
  [0.33, [96, 160, 222]],
  [0.6, [92, 158, 222]],
  [0.7, [116, 156, 206]],
  [0.78, [92, 108, 170]],
  [0.86, [62, 60, 122]],
  [0.93, [30, 28, 70]],
  [1, [16, 16, 44]],
];
const SKY_LOW: Keys<RGB> = [
  [0, [22, 20, 46]],
  [0.2, [26, 22, 50]],
  [0.235, [120, 86, 118]],
  [0.265, [250, 200, 170]],
  [0.33, [236, 226, 212]],
  [0.6, [242, 222, 204]],
  [0.7, [252, 210, 160]],
  [0.78, [255, 170, 92]],
  [0.86, [250, 122, 72]],
  [0.93, [176, 84, 84]],
  [1, [92, 50, 72]],
];
const GRADE: Keys<RGB> = [
  [0, [12, 18, 48]],
  [0.2, [12, 18, 48]],
  [0.24, [40, 44, 90]],
  [0.27, [255, 190, 150]],
  [0.33, [255, 230, 200]],
  [0.47, [255, 230, 200]],
  [0.52, [250, 90, 150]],
  [0.58, [250, 90, 150]],
  [0.63, [255, 220, 180]],
  [0.7, [255, 180, 100]],
  [0.8, [255, 140, 60]],
  [0.87, [200, 80, 70]],
  [0.94, [40, 24, 64]],
  [1, [22, 16, 50]],
];
const GRADE_ALPHA: Keys<number> = [
  [0, 0.8],
  [0.2, 0.8],
  [0.24, 0.55],
  [0.27, 0.12],
  [0.33, 0],
  [0.47, 0],
  [0.52, 0.1],
  [0.58, 0.1],
  [0.63, 0.04],
  [0.7, 0.1],
  [0.8, 0.2],
  [0.87, 0.3],
  [0.94, 0.48],
  [1, 0.56],
];

type Actor = { y: number; draw: () => void };
type Walker = { look: Look; x: number; y: number; speed: number; seed: number; hold?: Pose["hold"] };
type Dancer = { look: Look; x: number; y: number; seed: number; role: "dance" | "throw" | "pichkari" | "dhol" | "clap"; facing: 1 | -1; colour: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; age: number };
type Petal = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; size: number; color: RGB; world: boolean; floor: number; age: number };

const MAX_SPARKS = 320;
const MAX_PETALS = 320;

class Holi implements Scene {
  private readonly emit: Emit;
  private readonly havelis: Haveli[] = makeHavelis();
  private readonly backdrop = makeBackdrop();
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private readonly ring: { look: Look; angle: number; seed: number; hold: Pose["hold"] }[] = [];
  private readonly crowd: Dancer[] = [];
  private readonly lathmar: { look: Look; x: number; y: number; seed: number; woman: boolean }[] = [];
  private readonly walkers: Walker[] = [];
  private readonly balconies: { x: number; y: number; next: number; color: RGB }[] = [];
  private readonly neighbours: Look[] = [];
  private readonly gulal = new Clouds();
  private readonly smoke = new Clouds();
  private readonly water = new Water();
  private stains: Stains | null = null;
  private street: HTMLCanvasElement | null = null;
  private sparks: Spark[] = [];
  private petals: Petal[] = [];
  private pyre: { fresh: ReturnType<typeof paintPyre>; charred: ReturnType<typeof paintPyre> } | null = null;
  private mural: HTMLCanvasElement | null = null;
  private palash: ReturnType<typeof paintPalash> | null = null;
  private layer: HTMLCanvasElement | null = null;
  private v: View | null = null;
  private previous = 0;
  private pressed = false;
  private last = { x: 0, y: 0, t: 0 };
  private throws = 0;
  private nextThrow = 0;
  private nextSmoke = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(3103);
    const bright: RGB[] = [
      [226, 60, 60],
      [240, 170, 40],
      [60, 140, 200],
      [220, 90, 150],
      [80, 160, 90],
      [240, 120, 40],
      [150, 70, 170],
    ];
    for (let i = 0; i < 240; i++) this.stars.push({ x: random(), y: random() ** 1.3, r: 0.4 + random() * 1.1, seed: random() * 10 });

    // The families walking round the fire, with new wheat and coconuts.
    for (let i = 0; i < 11; i++) {
      const woman = i % 2 === 0;
      const child = i % 5 === 3;
      this.ring.push({
        look: makeLook(random, child ? 1.05 : 1.55 + random() * 0.15, woman, bright, GULAL),
        angle: (i / 11) * TAU + random() * 0.2,
        seed: random() * 10,
        hold: i % 3 === 0 ? "coconut" : "wheat",
      });
    }

    // Noon in the lane.
    for (let i = 0; i < 46; i++) {
      const woman = random() < 0.45;
      const child = random() < 0.18;
      const x = -11.5 + random() * 21;
      const y = 0.7 + random() ** 1.3 * 4.6;
      if (Math.abs(x - PYRE.x) < 1.6 && Math.abs(y - PYRE.y) < 0.8) continue;
      if (x < -8 && y < 2) continue;
      const roll = random();
      const role: Dancer["role"] = i === 5 || i === 17 ? "dhol" : roll < 0.4 ? "dance" : roll < 0.6 ? "throw" : roll < 0.78 ? "pichkari" : "clap";
      this.crowd.push({
        look: makeLook(random, child ? 1.0 + random() * 0.15 : 1.5 + random() * 0.2, woman && role !== "dhol", bright, GULAL),
        x,
        y,
        seed: random() * 10,
        role,
        facing: random() < 0.5 ? 1 : -1,
        colour: 0.4 + random() * 0.6,
      });
    }
    this.crowd.sort((a, b) => a.y - b.y);

    // Barsana: the women with lathis, the men of Nandgaon under their shields.
    for (let i = 0; i < 6; i++) {
      const woman = i % 2 === 0;
      const look = makeLook(random, 1.55, woman, bright, GULAL);
      if (woman) {
        look.head = "odhni";
        look.bottom = bright[i % bright.length];
      } else {
        look.head = "turban";
        look.top = [238, 232, 218];
      }
      this.lathmar.push({ look, x: 4.4 + i * 0.92 + (woman ? 0 : 0.3), y: 1.0 + (i % 3) * 0.45, seed: random() * 10, woman });
    }

    // Evening: washed, in new clothes, out visiting.
    for (let i = 0; i < 12; i++) {
      const woman = i % 2 === 1;
      const look = makeLook(random, 1.5 + random() * 0.2, woman, bright, GULAL);
      look.top = woman ? bright[i % bright.length] : [244, 240, 230];
      look.bottom = woman ? bright[(i + 3) % bright.length] : [244, 240, 230];
      look.stains = look.stains.slice(0, 1);
      this.walkers.push({ look, x: -8 + random() * 34, y: 1.2 + random() * 2.2, speed: (random() < 0.5 ? -1 : 1) * (0.25 + random() * 0.2), seed: random() * 10, hold: i % 4 === 0 ? "plate" : undefined });
    }

    // Buckets from the balconies.
    for (const b of this.havelis) {
      for (const j of b.jharokhas) if (j.x > -12 && j.x < 12) this.balconies.push({ x: j.x, y: j.y - 0.5, next: random() * 3, color: GULAL[Math.floor(random() * GULAL.length)] });
    }

    // Two neighbours, and a third bringing gujiya.
    const a = makeLook(random, 1.62, false, bright, GULAL);
    a.head = "turban";
    a.wrap = [230, 120, 30];
    const b = makeLook(random, 1.58, false, bright, GULAL);
    b.head = "bare";
    b.top = [238, 232, 218];
    const c = makeLook(random, 1.5, true, bright, GULAL);
    c.head = "odhni";
    this.neighbours.push(a, b, c);
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p } = f;
    // Phones see the same shots a little closer.
    const unit = (Math.min(width, height) / 8) * (f.portrait ? 1.18 : 1);
    const focus = shot(f.portrait ? PORTRAIT_SHOTS : SHOTS, p);
    // On wide screens, keep what matters clear of the caption.
    if (!f.portrait) {
      const side = holi.chapters.reduce((sum, c) => sum + windowOpacity(p, c.window) * (c.side === "right" ? 1 : -1), 0);
      focus.x += (side * width * 0.13) / (unit * focus.zoom);
    }
    const v = view(width, height, focus, unit, f.portrait ? 0.4 : 0.5);
    this.v = v;
    this.ensure();

    const fire = rise(p, MOMENTS.fire[0], MOMENTS.fire[1]) * (1 - rise(p, MOMENTS.embers[0], MOMENTS.embers[1]));
    const embers = rise(p, 0.16, 0.2) * (1 - rise(p, 0.26, 0.34));
    const dusk = rise(p, 0.86, 0.95);
    const day = rise(p, 0.22, 0.28) * (1 - 0.6 * dusk);
    const skyTop = track(SKY_TOP, p);
    const skyLow = track(SKY_LOW, p);

    this.sky(ctx, v, p, skyTop, skyLow, f);

    // The world, painted in daylight colours on its own layer, then graded for the hour.
    const layer = this.layer!;
    const ratio = ctx.getTransform().a || 1;
    if (layer.width !== ctx.canvas.width || layer.height !== ctx.canvas.height) {
      layer.width = ctx.canvas.width;
      layer.height = ctx.canvas.height;
    }
    const g = layer.getContext("2d")!;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, width, height);
    g.save();
    apply(g, v);
    this.world(g, v, f, fire, embers, dusk, mix(skyLow, skyTop, 0.2));
    g.restore();
    this.grade(g, v, p, fire, embers);
    ctx.drawImage(layer, 0, 0, width, height);

    // Light on top: the fire, sparks, lit windows at dusk.
    ctx.save();
    apply(ctx, v);
    ctx.globalCompositeOperation = "lighter";
    this.fireLight(ctx, f, fire, embers);
    if (dusk > 0.01) this.windowLight(ctx, v, dusk);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
    this.flowers(ctx, f);

    // A wash behind the caption, so it reads over the brightest colour.
    if (!f.portrait) {
      for (const c of holi.chapters) {
        const o = windowOpacity(p, c.window);
        if (o < 0.01) continue;
        const right = c.side === "right";
        const wash = ctx.createLinearGradient(right ? width : 0, 0, right ? width * 0.45 : width * 0.55, 0);
        const a = o * lerp(0.25, 0.62, day);
        wash.addColorStop(0, `rgba(14, 6, 10, ${a})`);
        wash.addColorStop(0.55, `rgba(14, 6, 10, ${a * 0.5})`);
        wash.addColorStop(1, "rgba(14, 6, 10, 0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, width, height);
      }
    }
    // And a little shade along the top in daylight, under the header and the counter.
    if (!f.portrait && day > 0.01) {
      const shade = ctx.createLinearGradient(0, 0, 0, 140);
      shade.addColorStop(0, `rgba(14, 6, 10, ${0.4 * day})`);
      shade.addColorStop(1, "rgba(14, 6, 10, 0)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, 140);
    }
    const vignette = ctx.createRadialGradient(width / 2, height * 0.5, Math.min(width, height) * 0.35, width / 2, height * 0.5, Math.max(width, height) * 0.8);
    vignette.addColorStop(0, "rgba(10, 5, 8, 0)");
    vignette.addColorStop(1, `rgba(10, 5, 8, ${0.62 - day * 0.36})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    this.cues(f);
    this.previous = p;
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind === "down") this.pressed = true;
    if (kind === "up") {
      this.pressed = false;
      return;
    }
    const v = this.v;
    if (!v) return;
    const p = f.p;
    const world = toWorld(v, x, y);

    // At night: sparks fly up from the fire.
    if (p > 0.09 && p < 0.21) {
      if (kind !== "down") return;
      this.emit("spark");
      if (f.reduced) return;
      const top = PYRE.y - PYRE.h * 0.9;
      for (let i = 0; i < 46; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const s = 2 + Math.random() * 4.5;
        this.sparks.push({ x: PYRE.x + (Math.random() - 0.5) * 1.2, y: top, vx: Math.cos(a) * s + (world.x - PYRE.x) * 0.2, vy: Math.sin(a) * s, life: 1 + Math.random() * 1.4, age: 0 });
      }
      if (this.sparks.length > MAX_SPARKS) this.sparks.splice(0, this.sparks.length - MAX_SPARKS);
      return;
    }

    // At dusk: the palash lets its flowers go.
    if (p > 0.76 && p < 0.9) {
      if (kind !== "down") return;
      for (let i = 0; i < 28; i++) this.dropFlower(PALASH.x + (Math.random() - 0.5) * 5.5, PALASH.y - PALASH.h * (0.45 + Math.random() * 0.4));
      this.emit("petals");
      return;
    }

    // All day: gulal, thrown by the handful, and dragged in trails in the lane.
    if (p < 0.25 || p > 0.74) return;
    const drag = p > 0.47 && p < 0.62;
    if (kind === "move" && !(this.pressed && drag)) return;
    if (kind === "move" && f.seconds - this.last.t < 0.06) return;
    const color = GULAL[this.throws % GULAL.length];
    if (kind === "down") this.throws++;
    const dx = kind === "move" ? clamp((world.x - this.last.x) * 8, -4, 4) : 0;
    const dy = kind === "move" ? clamp((world.y - this.last.y) * 8, -4, 4) : 0;
    const size = 0.9 / Math.sqrt(v.scale / 100);
    if (!f.reduced) {
      if (kind === "down") this.gulal.burst(world.x, world.y, color, 40, 2.6 * size, 0.3 * size);
      else this.gulal.throw(world.x, world.y, dx, dy, color, 14, 0.25 * size);
    }
    // Where it lands: on the paving under it, or the wall behind.
    const landY = world.y > 0 ? world.y + 0.1 : Math.min(world.y + 0.4, -0.02);
    const onPainting = world.x > MURAL.x && world.x < MURAL.x + MURAL.w && landY > MURAL.y && landY < MURAL.y + MURAL.h;
    if (!onPainting) this.stains?.splat(world.x, landY, 0.28 * size, color, 0.5);
    this.last = { x: world.x, y: world.y, t: f.seconds };
    if (kind === "down" || Math.random() < 0.3) this.emit("gulal");
  }

  // ─── Setting up ────────────────────────────────────────────────────────────

  private ensure() {
    if (this.layer) return;
    this.layer = document.createElement("canvas");
    this.pyre = { fresh: paintPyre(260, false), charred: paintPyre(260, true) };
    this.mural = paintMural(300);
    this.palash = paintPalash(130);
    this.stains = new Stains();
    this.street = this.paintStreet();
  }

  /** The colour the day leaves on its own: splashes over the paving, handprints on the walls. */
  private paintStreet() {
    const canvas = Stains.layer();
    const g = Stains.context(canvas);
    const random = mulberry32(2026);
    for (let i = 0; i < 520; i++) {
      const x = -13 + random() * (LANE_END + 13);
      const y = 0.1 + random() ** 1.5 * 6;
      if (Math.abs(x - PYRE.x) < 1.4 && Math.abs(y - PYRE.y) < 0.5) continue;
      splat(g, x, y, 0.12 + random() * 0.4, GULAL[Math.floor(random() * GULAL.length)], random, 0.35 + random() * 0.35);
    }
    // Splashes up the walls, and handprints where people leant.
    for (let i = 0; i < 110; i++) {
      const x = -13 + random() * (LANE_END + 13);
      splat(g, x, -(random() ** 2) * 1.6, 0.08 + random() * 0.16, GULAL[Math.floor(random() * GULAL.length)], random, 0.25 + random() * 0.25);
    }
    for (let i = 0; i < 46; i++) {
      const x = -12 + random() * (LANE_END + 11);
      handprint(g, x, -0.9 - random() * 1.1, 0.2, (random() - 0.5) * 0.6, GULAL[Math.floor(random() * GULAL.length)], 0.7);
    }
    // Spilt round the grandmother's thali.
    for (let i = 0; i < 14; i++) splat(g, THALI.x + (random() - 0.5) * 1.6, THALI.y + (random() - 0.3) * 0.5, 0.06 + random() * 0.1, GULAL[i % 5], random, 0.5);
    return canvas;
  }

  // ─── Sky ───────────────────────────────────────────────────────────────────

  private sky(ctx: Ctx, v: View, p: number, top: RGB, low: RGB, f: Frame) {
    const { width, height } = v;
    const horizon = clamp(toScreen(v, 0, -1.5).y / height, 0.08, 1.2);
    const sky = ctx.createLinearGradient(0, 0, 0, height * horizon);
    sky.addColorStop(0, rgb(top));
    sky.addColorStop(0.65, rgb(mix(top, low, 0.5)));
    sky.addColorStop(1, rgb(low));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const night = 1 - rise(p, 0.2, 0.26);
    const late = rise(p, 0.88, 1);
    const r = Math.min(width, height) * 0.055;

    // Stars, at night and again at the end.
    const stars = Math.max(night, late * 0.6);
    if (stars > 0.01) {
      ctx.fillStyle = "#f2e9d6";
      for (const s of this.stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(f.seconds * (0.8 + s.seed * 0.2) + s.seed * 6);
        ctx.globalAlpha = twinkle * stars * (1 - s.y * 0.6) * 0.75;
        ctx.fillRect(s.x * width, s.y * height * horizon * 0.9, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    // The full moon of Phalgun, over the chowk.
    if (night > 0.01) {
      const at = toScreen(v, 1.9, 0);
      const my = Math.max(r * 1.3, Math.min(height * 0.17, toScreen(v, 0, -1.2).y - r * 1.3));
      this.moon(ctx, at.x, my - (1 - night) * r, r, night, [246, 238, 214], [255, 240, 200]);
    }
    // The sun going down beyond the fields, then the moon rising again over the town.
    const sunset = rise(p, 0.72, 0.8) * (1 - rise(p, 0.87, 0.93));
    if (sunset > 0.01) {
      const at = toScreen(v, 26.8, lerp(-4.8, -0.6, rise(p, 0.74, 0.9)));
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite("255, 170, 90"), at.x, at.y, r * 9, 0.55 * sunset);
      glow(ctx, glowSprite("255, 220, 160"), at.x, at.y, r * 2.2, 0.9 * sunset);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(255, 236, 200, ${sunset})`;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r * 0.8, 0, TAU);
      ctx.fill();
    }
    if (late > 0.01) {
      const at = toScreen(v, -1.4, 0);
      const my = Math.max(r * 1.4, toScreen(v, 0, -2.4).y - r * (1.5 + late * 2.5));
      this.moon(ctx, at.x, my, r * 1.15, late, [252, 214, 160], [255, 190, 120]);
    }
  }

  private moon(ctx: Ctx, x: number, y: number, r: number, alpha: number, face: RGB, halo: RGB) {
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, glowSprite(halo.join(", ")), x, y, r * 6, 0.22 * alpha);
    ctx.globalCompositeOperation = "source-over";
    const disc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    disc.addColorStop(0, rgb(face, alpha));
    disc.addColorStop(1, rgb(mix(face, [200, 170, 130], 0.4), alpha));
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    // Its seas, faintly.
    ctx.fillStyle = `rgba(170, 150, 120, ${0.25 * alpha})`;
    for (const [dx, dy, s] of [
      [-0.3, -0.2, 0.28],
      [0.2, 0.1, 0.22],
      [-0.05, 0.35, 0.18],
    ]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, s * r, 0, TAU);
      ctx.fill();
    }
  }

  // ─── The world ─────────────────────────────────────────────────────────────

  private world(g: Ctx, v: View, f: Frame, fire: number, embers: number, dusk: number, haze: RGB) {
    const { p, seconds } = f;
    drawBackdrop(g, v, this.backdrop, haze);
    drawFields(g, v);
    for (const b of this.havelis) drawHaveli(g, v, b, dusk);
    if (onScreen(v, MURAL.x + MURAL.w / 2, MURAL.y + MURAL.h / 2, MURAL.h)) drawMural(g, this.mural!, rise(p, MOMENTS.radha[0], MOMENTS.radha[1]));
    drawPaving(g, v);

    // The colour of the day, then whatever the reader has thrown.
    Stains.draw(g, this.street!, rise(p, 0.28, 0.58));
    Stains.draw(g, this.stains!.thrown, 1);

    const actors: Actor[] = [];
    this.pyreActors(actors, g, f, fire, embers);
    this.doorstep(actors, g, p, seconds);
    this.laneActors(actors, g, f);
    this.afternoon(actors, g, p, seconds);
    this.evening(actors, g, f);
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();

    // Colour in the air, and water in it.
    if (!f.reduced) {
      this.gulal.update(f.dt, 0.15);
      this.water.update(f.dt, (x, y, c) => this.stains!.splat(x, y, 0.08 + Math.random() * 0.08, c, 0.4));
    }
    this.staticClouds(g, v, p, seconds);
    this.gulal.draw(g, v);
    this.water.draw(g, v);
    this.smoke.draw(g, v, 1);
  }

  /** The cloud of colour that hangs over the lane at noon: always there, whatever the motion setting. */
  private staticClouds(g: Ctx, v: View, p: number, seconds: number) {
    const noon = rise(p, 0.46, 0.52) * (1 - rise(p, 0.6, 0.65));
    const braj = rise(p, 0.43, 0.46) * (1 - rise(p, 0.47, 0.5));
    const haze = Math.max(noon, braj * 0.5);
    if (haze < 0.01) return;
    const random = mulberry32(88);
    for (let i = 0; i < 70; i++) {
      const c = GULAL[i % GULAL.length];
      const x = -12 + random() * 24 + Math.sin(seconds * 0.1 + i) * 0.6;
      const y = -1.5 - random() * 5 + Math.cos(seconds * 0.13 + i) * 0.3;
      const r = 1.6 + random() * 2.4;
      if (!onScreen(v, x, y, r)) continue;
      g.globalAlpha = haze * (0.07 + random() * 0.08);
      g.drawImage(hazeSprite(c), x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }

  // ─── Holika's fire ─────────────────────────────────────────────────────────

  private pyreActors(actors: Actor[], g: Ctx, f: Frame, fire: number, embers: number) {
    const { p, seconds } = f;
    const v = this.v!;
    if (p > 0.34 && !onScreen(v, PYRE.x, PYRE.y - 1, 3)) return;
    const burnt = rise(p, 0.1, 0.18);
    const shrink = lerp(1, 0.6, rise(p, 0.12, 0.22));
    const ash = rise(p, 0.2, 0.25);
    const pyre = this.pyre!;

    actors.push({
      y: PYRE.y,
      draw: () => {
        if (ash < 1) {
          g.save();
          g.globalAlpha = 1 - ash;
          const { fresh, charred } = pyre;
          const drawPile = (sprite: typeof fresh, alpha: number) => {
            if (alpha < 0.01) return;
            g.globalAlpha = alpha * (1 - ash);
            g.drawImage(sprite.canvas, PYRE.x - sprite.width / 2, PYRE.y - (PYRE.h + 0.2) * shrink, sprite.width, sprite.height * shrink);
          };
          drawPile(fresh, 1);
          drawPile(charred, burnt);
          g.globalAlpha = 1 - ash;
          // The pole in the middle, with its saffron flag.
          const poleTop = PYRE.y - PYRE.pole * lerp(1, 0.85, burnt);
          g.fillStyle = "#6a5030";
          g.fillRect(PYRE.x - 0.035, poleTop, 0.07, PYRE.y - poleTop - 0.1);
          g.fillStyle = "#f08a1a";
          g.beginPath();
          g.moveTo(PYRE.x + 0.035, poleTop);
          g.quadraticCurveTo(PYRE.x + 0.3, poleTop + 0.05 + Math.sin(seconds * 3) * 0.03, PYRE.x + 0.5, poleTop + 0.12);
          g.lineTo(PYRE.x + 0.035, poleTop + 0.3);
          g.fill();
          g.restore();
        }
        if (ash > 0.01) {
          g.globalAlpha = ash;
          drawAsh(g, embers);
          g.globalAlpha = 1;
        }
        drawOfferings(g);
        this.flames(g, f, fire, embers, shrink);
      },
    });

    // The families going round it; only while it is night.
    if (p < 0.26) {
      const walking = rise(p, 0.1, 0.12);
      for (const r of this.ring) {
        const angle = r.angle + (f.reduced ? 0 : seconds * 0.12 * walking) + p * 3;
        const x = PYRE.x + Math.cos(angle) * 2.3;
        const y = PYRE.y + Math.sin(angle) * 0.75;
        const facing: 1 | -1 = Math.sin(angle) > 0 ? 1 : -1;
        const step = Math.sin(seconds * 4 + r.seed) * walking;
        const offer = 0.5 + 0.5 * Math.sin(seconds * 0.7 + r.seed);
        const pose: Pose = {
          la: -0.1 + step * 0.1,
          lf: -0.1 + step * 0.1,
          ra: r.hold === "wheat" ? lerp(0.6, 1.3, offer) : 0.9,
          rf: r.hold === "wheat" ? lerp(1.4, 2.2, offer) : 1.5,
          bob: Math.abs(step) * 0.008,
          hold: r.hold,
        };
        actors.push({ y, draw: () => drawPerson(g, x, y, r.look, pose, 0, facing) });
      }
    }
  }

  private flames(g: Ctx, f: Frame, fire: number, embers: number, shrink: number) {
    const { p, seconds } = f;
    const top = PYRE.y - PYRE.h * shrink;
    if (fire > 0.01) {
      // Back row of tongues, then Holika and Prahlad seen through the fire, then the front row.
      const row = (count: number, scale: number, seed: number) => {
        for (let i = 0; i < count; i++) {
          const t = (i + 0.5) / count;
          const dx = lerp(-PYRE.w, PYRE.w, t) * 0.85;
          const base = PYRE.y - PYRE.h * shrink * pileProfile(dx) * 0.8;
          const height = fire * scale * (0.7 + 0.6 * (1 - Math.abs(dx) / PYRE.w)) * (0.8 + 0.3 * Math.sin(seed + i * 2.1));
          tongue(g, PYRE.x + dx, base + 0.1, height, 0.55 * scale * (0.6 + fire * 0.4), seconds, seed + i * 1.7, fire);
        }
      };
      row(7, 2.6, 1);
      this.holika(g, p, seconds, top);
      g.globalAlpha = 0.75;
      row(9, 1.0, 7);
      g.globalAlpha = 1;
    }
    if (!f.reduced && fire > 0.05 && seconds > this.nextSmoke) {
      this.nextSmoke = seconds + 0.12;
      this.smoke.burst(PYRE.x + (Math.random() - 0.5) * 0.8, top - 2.4 * fire, [60, 54, 58], 2, 0.3, 0.6, 1.2);
    }
    if (!f.reduced && fire < 0.05 && embers > 0.1 && seconds > this.nextSmoke) {
      this.nextSmoke = seconds + 0.5;
      this.smoke.burst(PYRE.x + (Math.random() - 0.5) * 0.4, PYRE.y - 0.7, [150, 146, 150], 1, 0.15, 0.25, 0.6);
    }
    if (!f.reduced) this.smoke.update(f.dt, 0.25);
  }

  /** Holika, seated in the fire with the boy in her lap; then only Prahlad, standing, unhurt. */
  private holika(g: Ctx, p: number, seconds: number, top: number) {
    const holika = rise(p, MOMENTS.holika[0], MOMENTS.holika[0] + 0.01) * (1 - rise(p, MOMENTS.holika[1] - 0.012, MOMENTS.holika[1] + 0.004));
    const prahlad = rise(p, MOMENTS.prahlad[0], MOMENTS.prahlad[0] + 0.01) * (1 - rise(p, MOMENTS.prahlad[1], MOMENTS.prahlad[1] + 0.015));
    const x = PYRE.x;
    const base = top + 0.2;
    if (holika > 0.01) {
      // She burns from the edges in: the silhouette thins and lifts as it goes.
      const going = rise(p, MOMENTS.holika[1] - 0.02, MOMENTS.holika[1]);
      g.save();
      g.globalAlpha = holika * 0.95;
      g.translate(x, base - going * 0.3);
      g.scale(1.15 * (1 - going * 0.2), 1.15);
      g.fillStyle = "rgb(46, 14, 8)";
      g.beginPath();
      // Seated cross-legged, the odhni over her head and falling to her knees.
      g.moveTo(-0.62, 0);
      g.quadraticCurveTo(-0.6, -0.26, -0.3, -0.34);
      g.quadraticCurveTo(-0.34, -0.8, -0.2, -1.05);
      g.quadraticCurveTo(-0.2, -1.32, 0, -1.36);
      g.quadraticCurveTo(0.2, -1.32, 0.2, -1.1);
      g.quadraticCurveTo(0.36, -0.8, 0.3, -0.34);
      g.quadraticCurveTo(0.6, -0.26, 0.62, 0);
      g.closePath();
      g.fill();
      g.restore();
    }
    if (prahlad > 0.01 || holika > 0.01) {
      // The boy in her lap, then on his feet with his hands together, saying Narayan's name.
      const standing = rise(p, MOMENTS.prahlad[0] - 0.005, MOMENTS.prahlad[0] + 0.01);
      const look: Look = {
        h: 0.8,
        skin: mix([60, 20, 10], [255, 226, 160], standing),
        top: mix([60, 20, 10], [255, 236, 190], standing),
        bottom: mix([60, 20, 10], [250, 200, 110], standing),
        wrap: [0, 0, 0],
        head: "bare",
        woman: false,
        stains: [],
      };
      const pose: Pose = { la: 0.3, lf: 2.82, ra: -0.3, rf: -2.82 };
      g.save();
      g.globalAlpha = Math.max(holika * 0.9 * (1 - standing), prahlad);
      drawPerson(g, x, base - lerp(0.25, 0.1, standing) - Math.sin(seconds * 1.5) * 0.01 * standing, look, pose, 0, 1);
      g.restore();
    }
  }

  private fireLight(ctx: Ctx, f: Frame, fire: number, embers: number) {
    const { p, seconds, dt } = f;
    const sprite = glowSprite(FIRE_LIGHT);
    const flick = flicker(seconds * 0.7, 3);
    const cy = PYRE.y - PYRE.h * 0.8;
    if (fire > 0.01) {
      glow(ctx, sprite, PYRE.x, cy - 0.6, 6.5 * flick, 0.4 * fire);
      glow(ctx, sprite, PYRE.x, cy, 2.4 * flick, 0.55 * fire);
    }
    if (embers > 0.01) glow(ctx, sprite, PYRE.x, PYRE.y - 0.3, 1.6, 0.35 * embers * (1 - fire));
    // The lamp in the puja thali at its foot, that the fire is lit from.
    const lamp = 1 - rise(p, 0.2, 0.24);
    if (lamp > 0.01) {
      const f2 = flicker(seconds, 9);
      glow(ctx, sprite, PYRE.x + 0.62, PYRE.y + 0.3, 0.9 * f2, 0.45 * lamp);
      glow(ctx, glowSprite("255, 220, 150"), PYRE.x + 0.62, PYRE.y + 0.27, 0.12 * f2, 0.9 * lamp);
    }
    const prahlad = rise(p, MOMENTS.prahlad[0], MOMENTS.prahlad[0] + 0.01) * (1 - rise(p, MOMENTS.prahlad[1], MOMENTS.prahlad[1] + 0.015));
    if (prahlad > 0.01) glow(ctx, glowSprite("255, 236, 190"), PYRE.x, cy - 0.35, 1.3, 0.7 * prahlad);

    // Sparks, always rising off the fire.
    if (!f.reduced && fire > 0.05) {
      const count = Math.floor(dt * 60 * fire + Math.random());
      for (let i = 0; i < count; i++) {
        this.sparks.push({ x: PYRE.x + (Math.random() - 0.5) * 1.6, y: cy, vx: (Math.random() - 0.5) * 1.2, vy: -2 - Math.random() * 3, life: 0.8 + Math.random() * 1.6, age: 0 });
      }
      if (this.sparks.length > MAX_SPARKS) this.sparks.splice(0, this.sparks.length - MAX_SPARKS);
    }
    const spark = glowSprite("255, 180, 80");
    this.sparks = this.sparks.filter((s) => {
      s.age += dt;
      if (s.age >= s.life) return false;
      s.vx += Math.sin(seconds * 3 + s.y) * dt * 2;
      s.vy += 0.9 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const a = 1 - s.age / s.life;
      glow(ctx, spark, s.x, s.y, 0.09, a);
      return true;
    });
  }

  // ─── The morning after ─────────────────────────────────────────────────────

  private doorstep(actors: Actor[], g: Ctx, p: number, seconds: number) {
    const v = this.v!;
    if (p < 0.2 || !onScreen(v, THALI.x - 1.4, 0.4, 3)) return;
    const feet = rise(p, MOMENTS.feet[0], MOMENTS.feet[1]);
    const cheek = rise(p, MOMENTS.cheek[0], MOMENTS.cheek[1]);
    const bend = rise(p, 0.235, 0.26);
    const reach = rise(p, 0.278, 0.29);
    const bless = rise(p, 0.27, 0.282) * (1 - rise(p, 0.3, 0.33));
    // They come out as it gets light.
    const out = rise(p, 0.2, 0.225);
    const faded = (draw: () => void) => () => {
      g.globalAlpha = out;
      draw();
      g.globalAlpha = 1;
    };
    const dadi = { x: DADI_DOOR.x - 1.05, y: 1.18 };
    actors.push({ y: dadi.y, draw: faded(() => drawDadi(g, dadi.x, dadi.y, 1.55, feet, cheek, bless, PINK)) });
    // The child: in front of her, bending to her feet and then up to her cheek.
    const child = { x: dadi.x + lerp(0.95, 0.66, reach), y: dadi.y + 0.14 };
    actors.push({ y: child.y, draw: faded(() => drawChild(g, child.x, child.y, 0.98, bend, reach, PINK, seconds)) });
    actors.push({ y: THALI.y, draw: faded(() => drawThali(g, [GULAL[0], GULAL[1], GULAL[2], GULAL[6], GULAL[3]])) });
  }

  // ─── Braj, and the lane at noon ───────────────────────────────────────────

  private laneActors(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const beat = seconds * 2.3;

    // Barsana's women and Nandgaon's men, in front of the painted house.
    const barsana = rise(p, 0.33, 0.35) * (1 - rise(p, 0.62, 0.64));
    if (barsana > 0.01) {
      for (const l of this.lathmar) {
        const swing = Math.sin(beat * 1.3 + l.seed);
        const pose: Pose = l.woman
          ? { la: -0.4, lf: -0.9, ra: 2.7, rf: lerp(2.1, 3.1, 0.5 + 0.5 * swing), hold: "lathi", bob: Math.abs(swing) * 0.01 }
          : { la: -0.8, lf: -1.4, ra: 2.9, rf: 3.05, hold: "shield", lean: 0.3 + 0.08 * swing, bob: 0.05 };
        actors.push({ y: l.y, draw: () => drawPerson(g, l.x, l.y, l.look, pose, 0.3, l.woman ? -1 : 1) });
      }
    }

    // The crowd in the lane.
    const noon = rise(p, 0.43, 0.46) * (1 - rise(p, 0.64, 0.68));
    if (noon < 0.01) return;
    const colour = rise(p, 0.46, 0.58);
    const active = !f.reduced && p > 0.47 && p < 0.62;
    for (const d of this.crowd) {
      const phase = beat + d.seed;
      const hop = Math.abs(Math.sin(phase * Math.PI * 0.5));
      let pose: Pose;
      switch (d.role) {
        case "dhol":
          pose = { la: 0.6, lf: 1.2 + Math.sin(phase * TAU) * 0.3, ra: 0.5, rf: 1.3 + Math.cos(phase * TAU) * 0.4, hold: "dhol", bob: hop * 0.01 };
          break;
        case "throw":
          pose = { la: -0.3, lf: -0.4, ra: lerp(1.2, 2.9, hop), rf: lerp(1.6, 3.1, hop), bob: hop * 0.015 };
          break;
        case "pichkari":
          pose = { la: 0.9, lf: 1.4, ra: 1.3, rf: 1.85, hold: "pichkari" };
          break;
        case "clap":
          pose = { la: 0.5, lf: 2.2 + Math.sin(phase * TAU) * 0.3, ra: -0.5, rf: -2.2 - Math.sin(phase * TAU) * 0.3, bob: hop * 0.01 };
          break;
        default:
          // Arms up, one shoulder then the other, the way the dhol asks.
          pose = { la: -2.5 - Math.sin(phase * 1.6) * 0.35, lf: -2.8 - Math.sin(phase * 1.6) * 0.3, ra: 2.5 - Math.cos(phase * 1.6) * 0.35, rf: 2.8 - Math.cos(phase * 1.6) * 0.3, bob: hop * 0.03, lean: Math.sin(phase * 0.8) * 0.06 };
      }
      actors.push({
        y: d.y,
        draw: () => {
          const hands = drawPerson(g, d.x, d.y, d.look, pose, colour * d.colour, d.facing);
          if (!active) return;
          if (d.role === "pichkari" && Math.sin(phase * 0.7) > 0.2) {
            const angle = d.facing > 0 ? -0.55 : Math.PI + 0.55;
            this.water.squirt(hands.tip.x, hands.tip.y, angle, 5.2, GULAL[Math.floor(d.seed * 3) % GULAL.length], d.y + 0.2, 1);
          }
          if (d.role === "throw" && hop > 0.97 && Math.random() < f.dt * 3) {
            this.gulal.burst(hands.right.x, hands.right.y - 0.2, GULAL[Math.floor(Math.random() * GULAL.length)], 20, 2.2, 0.35, 1);
          }
        },
      });
    }

    // Buckets tipped from the balconies.
    if (active) {
      for (const b of this.balconies) {
        if (seconds < b.next) continue;
        if (seconds > b.next + 0.5) {
          b.next = seconds + 2 + Math.random() * 4;
          b.color = GULAL[Math.floor(Math.random() * GULAL.length)];
          continue;
        }
        this.water.pour(b.x + 0.5, b.y, b.color, 0.4, 3);
      }
    }
  }

  // ─── The afternoon ─────────────────────────────────────────────────────────

  private afternoon(actors: Actor[], g: Ctx, p: number, seconds: number) {
    const v = this.v!;
    if (!onScreen(v, CHOWKI.x + 1, 0, 4)) return;
    actors.push({ y: CHOWKI.y, draw: () => drawThandai(g, seconds) });
    const [a, b, c] = this.neighbours;
    const hug = rise(p, MOMENTS.embrace[0], MOMENTS.embrace[1]);
    const colour = 0.8;
    const ax = CHOWKI.x + 1.5 + lerp(-0.3, 0, hug);
    const bx = CHOWKI.x + 2.35 - lerp(-0.3, 0, hug) - hug * 0.33;
    const y = 0.85;
    const pat = Math.sin(seconds * 5) * 0.1 * hug;
    actors.push({
      y,
      draw: () => {
        drawPerson(g, ax, y, a, { la: lerp(-0.1, 1.2, hug), lf: lerp(-0.1, 1.9, hug) + pat, ra: lerp(0.1, 1.4, hug), rf: lerp(0.1, 1.8, hug), lean: hug * 0.08 }, colour, 1);
        drawPerson(g, bx, y + 0.01, b, { la: lerp(-0.1, 1.3, hug), lf: lerp(-0.1, 1.8, hug), ra: lerp(0.1, 1.2, hug), rf: lerp(0.1, 1.9, hug) - pat, lean: hug * 0.08 }, colour, -1);
      },
    });
    actors.push({ y: 0.7, draw: () => drawPerson(g, CHOWKI.x - 1.45, 0.7, c, { la: -0.1, lf: -0.2, ra: 0.9, rf: 1.5, hold: "plate" }, 0.6, 1) });
  }

  // ─── The evening ───────────────────────────────────────────────────────────

  private evening(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const v = this.v!;
    const palash = this.palash!;
    if (onScreen(v, PALASH.x, PALASH.y - PALASH.h / 2, PALASH.h)) {
      actors.push({
        y: PALASH.y,
        draw: () => {
          // Fallen flowers on the ground round it, then the tree.
          const random = mulberry32(4);
          for (let i = 0; i < 80; i++) palashFlower(g, PALASH.x + (random() - 0.5) * 7, PALASH.y + 0.1 + random() * 1.4, 0.07, random() * TAU, random());
          g.drawImage(palash.canvas, PALASH.x - palash.width / 2, PALASH.y - palash.offsetY, palash.width, palash.height);
        },
      });
      actors.push({ y: PALASH.y + 0.5, draw: () => drawTesuPot(g, PALASH.x - 1.9, PALASH.y + 0.5, seconds) });
      if (!f.reduced && p > 0.72 && Math.random() < f.dt * 2.5) this.dropFlower(PALASH.x + (Math.random() - 0.5) * 5, PALASH.y - PALASH.h * (0.5 + Math.random() * 0.35));
    }
    const out = rise(p, 0.735, 0.755);
    if (out < 0.01) return;
    for (const w of this.walkers) {
      const span = 34;
      const x = -8 + ((((w.x + 8 + (f.reduced ? 0 : seconds * w.speed)) % span) + span) % span);
      const step = Math.sin(seconds * 5 + w.seed);
      const pose: Pose = { la: -0.1 - step * 0.15, lf: -0.1 - step * 0.2, ra: w.hold ? 1.1 : 0.1 + step * 0.15, rf: w.hold ? 1.6 : 0.1 + step * 0.2, bob: Math.abs(step) * 0.01, hold: w.hold };
      actors.push({
        y: w.y,
        draw: () => {
          g.globalAlpha = out;
          drawPerson(g, x, w.y, w.look, pose, 0.35, w.speed > 0 ? 1 : -1);
          g.globalAlpha = 1;
        },
      });
    }
  }

  private dropFlower(x: number, y: number) {
    this.petals.push({ x, y, vx: (Math.random() - 0.5) * 0.6, vy: 0.3, spin: (Math.random() - 0.5) * 5, angle: Math.random() * TAU, size: 0.09, color: [240, 100, 20], world: true, floor: PALASH.y + Math.random() * 1.4, age: 0 });
    if (this.petals.length > MAX_PETALS) this.petals.splice(0, this.petals.length - MAX_PETALS);
  }

  /** Falling flowers: rose and marigold at Vrindavan, and the palash letting go at dusk. */
  private flowers(ctx: Ctx, f: Frame) {
    const { width, height, p, dt } = f;
    const v = this.v!;
    const vrindavan = rise(p, MOMENTS.flowers[0], MOMENTS.flowers[0] + 0.01) * (1 - rise(p, MOMENTS.flowers[1] - 0.01, MOMENTS.flowers[1]));
    const colours: RGB[] = [
      [200, 24, 52],
      [250, 150, 20],
      [252, 200, 40],
      [236, 80, 120],
    ];
    if (f.reduced && vrindavan > 0.01) {
      // Held still, scattered over the frame.
      const random = mulberry32(12);
      for (let i = 0; i < 60; i++) this.petal(ctx, random() * width, random() * height, random() * TAU, 5 + random() * 5, colours[i % 4], vrindavan);
    }
    if (!f.reduced && vrindavan > 0.05 && Math.random() < dt * 40 * vrindavan) {
      const unit = Math.min(width, height);
      this.petals.push({ x: Math.random() * width, y: -10, vx: (Math.random() - 0.5) * 40, vy: 110 + Math.random() * 90, spin: (Math.random() - 0.5) * 6, angle: Math.random() * TAU, size: unit * (0.008 + Math.random() * 0.008), color: colours[Math.floor(Math.random() * 4)], world: false, floor: height + 20, age: 0 });
      if (this.petals.length > MAX_PETALS) this.petals.shift();
    }
    // Screen petals thin out as the scroll leaves Vrindavan, wherever they are in their fall.
    const linger = rise(p, MOMENTS.flowers[0] - 0.01, MOMENTS.flowers[0]) * (1 - rise(p, MOMENTS.flowers[1], MOMENTS.flowers[1] + 0.025));
    const alive: Petal[] = [];
    for (const q of this.petals) {
      q.age += dt;
      const falling = q.y < q.floor;
      if (falling) {
        q.vx += Math.sin(q.age * 2 + q.angle) * (q.world ? 0.8 : 30) * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.angle += q.spin * dt;
      }
      if (q.world ? q.age > 14 : q.y > height + 20 || linger < 0.01) continue;
      alive.push(q);
      if (q.world) {
        const s = toScreen(v, q.x, q.y);
        this.petal(ctx, s.x, s.y, q.angle, q.size * v.scale, q.color, 1, true);
      } else this.petal(ctx, q.x, q.y, q.angle, q.size, q.color, linger);
    }
    this.petals = alive;
  }

  private petal(ctx: Ctx, x: number, y: number, angle: number, size: number, color: RGB, alpha: number, tesu = false) {
    if (tesu) {
      ctx.globalAlpha = alpha;
      palashFlower(ctx, x, y, size, angle, 0.6);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = rgb(color, alpha * 0.95);
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.55, angle, 0, TAU);
    ctx.fill();
  }

  // ─── Light over the world ──────────────────────────────────────────────────

  /** Grades the world layer for the hour: moonlight, warmed round the fire; then gold, then dusk. */
  private grade(g: Ctx, v: View, p: number, fire: number, embers: number) {
    const color = track(GRADE, p);
    const alpha = track(GRADE_ALPHA, p);
    if (alpha < 0.005) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-atop";
    const heat = Math.max(fire, embers * 0.35) * (1 - rise(p, 0.22, 0.26));
    if (heat > 0.01) {
      const ratio = g.canvas.width / v.width;
      const at = toScreen(v, PYRE.x, PYRE.y - PYRE.h * 0.9);
      const radius = (3.6 + 1.6 * heat) * v.scale * ratio;
      const glowing = g.createRadialGradient(at.x * ratio, at.y * ratio, 0, at.x * ratio, at.y * ratio, radius);
      glowing.addColorStop(0, rgb([150, 60, 10], alpha * (1 - 0.8 * heat)));
      glowing.addColorStop(0.25, rgb([90, 30, 14], alpha * (1 - 0.62 * heat)));
      glowing.addColorStop(0.55, rgb(mix([30, 16, 30], color, 0.5), alpha * (1 - 0.3 * heat)));
      glowing.addColorStop(1, rgb(color, alpha));
      g.fillStyle = glowing;
    } else g.fillStyle = rgb(color, alpha);
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.restore();
  }

  private windowLight(ctx: Ctx, v: View, dusk: number) {
    const sprite = glowSprite(WINDOW_LIGHT);
    for (const b of this.havelis) {
      if (!onScreen(v, b.x + b.w / 2, -b.h / 2, Math.max(b.w, b.h))) continue;
      for (const w of b.windows) glow(ctx, sprite, w.x + w.w / 2, w.y + w.h / 2, 1.1, 0.3 * dusk);
      for (const j of b.jharokhas) glow(ctx, sprite, j.x, j.y - 0.7, 1.4, 0.3 * dusk);
    }
  }

  // ─── Moments ───────────────────────────────────────────────────────────────

  /** One-off bursts as the scroll passes a point, so the story's big moments move. */
  private cues(f: Frame) {
    const { p } = f;
    const passed = (point: number) => this.previous < point && p >= point && p - point < 0.03;
    if (f.reduced) return;
    if (passed(MOMENTS.feet[0])) this.gulal.burst(DADI_DOOR.x - 1.05 + 0.55, 1.12, PINK, 14, 0.5, 0.06, 0.2);
    if (passed(MOMENTS.cheek[0])) this.gulal.burst(DADI_DOOR.x - 1.05 + 0.1, -0.1, PINK, 10, 0.4, 0.05, 0.2);
    if (passed(MOMENTS.holiHai[0])) {
      for (let i = 0; i < 9; i++) this.gulal.burst(-9 + i * 2.2, -1.5 - Math.random() * 2, GULAL[i % GULAL.length], 30, 3, 0.4, 1);
    }
    // Thrown now and then in the lane, even without the reader.
    if (p > 0.47 && p < 0.6 && f.seconds > this.nextThrow) {
      this.nextThrow = f.seconds + 0.5 + Math.random() * 0.7;
      const x = -10 + Math.random() * 19;
      this.gulal.burst(x, -0.8 - Math.random() * 2.4, GULAL[Math.floor(Math.random() * GULAL.length)], 26, 2.6, 0.5, 1);
    }
  }
}

export function createScene(emit: Emit): Scene {
  return new Holi(emit);
}
