// Lohri & Vaisakhi, as one continuous shot across a Punjabi village's year, west to east: the lane
// in the January fog where the children sing for their Lohri, the haveli's courtyard and its fire,
// the wheat that grows through the winter and turns gold, the Vaisakhi harvest and the bhangra in
// the stubble, the gurdwara with its Nishan Sahib and langar, and the mela at sundown.
//
// World units, y down: house fronts stand on y = 0; the fields run back to the horizon above that
// and towards the viewer below it. Everything that stands is drawn back to front by its feet.
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
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";
import { Cast, DHOLI, FIRE_TOP, drawBullock, type Actor } from "./cast";
import { lohri } from "./content";
import {
  CANE,
  EAST_MUSTARD,
  HARVEST,
  HORIZON,
  MUSTARD,
  WHEAT,
  drawHorizon,
  drawMustardRow,
  drawTree,
  drawWheatRow,
  fieldRows,
  makeHorizon,
  paintCane,
  paintMustardTile,
  paintWheatTiles,
  rowScale,
  type WheatTiles,
} from "./fields";
import {
  Harvest,
  bird,
  bounds,
  cloud,
  drawFog,
  drawGround,
  drawStubbleRow,
  inHarvest,
  isHarvestRow,
  paintCourtyard,
  paintStubble,
} from "./land";
import {
  CART,
  DOOR,
  FIRE,
  GURDWARA,
  JHOOLA,
  LANGAR,
  NISHAN,
  drawAsh,
  drawCart,
  drawGohara,
  drawGurdwara,
  drawHaveli,
  drawHouse,
  drawJhoola,
  drawKabaddi,
  drawKite,
  drawNalka,
  drawNishan,
  drawShamiana,
  drawStall,
  drawTubewell,
  makeHouses,
  makeStalls,
  melaBulbs,
  paintPyre,
  tongue,
  villageWindows,
} from "./places";
import {
  FOG,
  GRADE,
  GRADE_ALPHA,
  MOMENTS,
  PORTRAIT_SHOTS,
  SHOTS,
  SKY_LOW,
  SKY_TOP,
  SUN_ACROSS,
  SUN_UP,
  track,
} from "./timeline";

export { MOMENTS };

const FIRE_LIGHT = "255, 140, 50";
const WINDOW_LIGHT = "255, 176, 96";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
};
type Offering = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: number;
  age: number;
  life: number;
  spin: number;
};
type Puff = {
  x: number;
  y: number;
  r: number;
  age: number;
  life: number;
  vx: number;
};
type Straw = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  angle: number;
  spin: number;
};
type Ring = { x: number; y: number; age: number };
/** A light that opens the night grade and warms the fog around it. */
type Lamp = { x: number; y: number; r: number; heat: number; warm: RGB };

/** How much each chapter's caption side is dimmed: least in the dark night, most over the white marble. */
const SCRIM = [0.4, 0.5, 0.5, 0.76, 0.66, 0.86, 0.62];
const MAX_SPARKS = 360;
const MAX_OFFERINGS = 240;
const GRAVITY = 9;

/** Far-off Lohri fires in other villages, glowing through the fog. */
const FAR_FIRES = [
  [-44, -2.7],
  [-36.5, -2.95],
  [-25, -2.85],
  [11, -2.9],
  [19.5, -3.0],
  [-49, -2.4],
];
const TREES: {
  x: number;
  y: number;
  size: number;
  kind: "pipal" | "kikar" | "shisham";
}[] = [
  { x: -41, y: -2.3, size: 0.8, kind: "kikar" },
  { x: -21.5, y: -1.1, size: 1.15, kind: "pipal" },
  { x: 7.4, y: -1.0, size: 1.0, kind: "shisham" },
  { x: 14.9, y: -1.7, size: 0.9, kind: "shisham" },
  { x: 37.6, y: -1.5, size: 1.2, kind: "pipal" },
  { x: 58.2, y: -1.2, size: 1.25, kind: "pipal" },
  { x: 83, y: -1.0, size: 1.1, kind: "kikar" },
];
const KITES: { x: number; y: number; colour: RGB; size: number }[] = [
  { x: 18.5, y: -6.6, colour: [214, 38, 70], size: 0.32 },
  { x: 23.8, y: -7.4, colour: [250, 196, 40], size: 0.3 },
  { x: 27.2, y: -5.8, colour: [34, 108, 180], size: 0.26 },
  { x: 31.5, y: -7.0, colour: [236, 132, 22], size: 0.3 },
  { x: 14.6, y: -5.4, colour: [196, 40, 120], size: 0.24 },
];

class Lohri implements Scene {
  private readonly emit: Emit;
  private readonly cast = new Cast();
  private readonly houses = makeHouses();
  private readonly windows = villageWindows(this.houses);
  private readonly horizon = makeHorizon();
  private readonly rows = fieldRows();
  private readonly harvest = new Harvest(this.rows);
  private readonly stalls = makeStalls();
  private readonly bulbs = melaBulbs();
  private readonly stars: { x: number; y: number; r: number; seed: number }[] =
    [];
  private readonly clouds: {
    x: number;
    y: number;
    s: number;
    speed: number;
  }[] = [];
  private layer: HTMLCanvasElement | null = null;
  private shade: HTMLCanvasElement | null = null;
  private mist: HTMLCanvasElement | null = null;
  private art: {
    wheat: WheatTiles;
    bloom: HTMLCanvasElement;
    pods: HTMLCanvasElement;
    cane: ReturnType<typeof paintCane>;
    courtyard: ReturnType<typeof paintCourtyard>;
    stubble: ReturnType<typeof paintStubble>;
    pyre: ReturnType<typeof paintPyre>;
    charred: ReturnType<typeof paintPyre>;
  } | null = null;
  private v: View | null = null;
  private previous = 0;
  private sparks: Spark[] = [];
  private offerings: Offering[] = [];
  private smoke: Puff[] = [];
  private straw: Straw[] = [];
  private rings: Ring[] = [];
  private flare = 0;
  private leap = 0;
  private nextSmoke = 0;
  private pressed = false;
  private lastCut = 0;
  private lastPoint: { x: number; y: number } | null = null;

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(1699);
    for (let i = 0; i < 260; i++)
      this.stars.push({
        x: random(),
        y: random() ** 1.4,
        r: 0.4 + random() * 1.1,
        seed: random() * 10,
      });
    for (let i = 0; i < 9; i++)
      this.clouds.push({
        x: random() * 120 - 20,
        y: -8 - random() * 5,
        s: 2.5 + random() * 3,
        speed: 0.2 + random() * 0.3,
      });
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p } = f;
    const unit = (Math.min(width, height) / 8) * (f.portrait ? 1.18 : 1);
    const focus = shot(f.portrait ? PORTRAIT_SHOTS : SHOTS, p);
    // On wide screens, keep what matters clear of the caption.
    if (!f.portrait) {
      const side = lohri.chapters.reduce(
        (sum, c) =>
          sum + windowOpacity(p, c.window) * (c.side === "right" ? 1 : -1),
        0,
      );
      focus.x += (side * width * 0.13) / (unit * focus.zoom);
    }
    const v = view(width, height, focus, unit, f.portrait ? 0.4 : 0.5);
    this.v = v;
    this.ensure();

    const fire = Math.min(
      1.35,
      rise(p, MOMENTS.light, MOMENTS.light + 0.012) *
        (1 - rise(p, 0.4, 0.43)) *
        (1 + this.flare),
    );
    const embers = rise(p, 0.39, 0.42) * (1 - rise(p, 0.47, 0.52));
    const skyTop = track(SKY_TOP, p);
    const skyLow = track(SKY_LOW, p);
    const day = rise(p, 0.425, 0.46) * (1 - rise(p, 0.87, 0.93));
    const memory =
      rise(p, MOMENTS.khalsa[0] - 0.006, MOMENTS.khalsa[0]) *
      (1 - rise(p, MOMENTS.khalsa[1], MOMENTS.khalsa[1] + 0.01));
    this.flare = Math.max(0, this.flare - f.dt * 0.8);
    this.leap = Math.max(0, this.leap - f.dt * 2.2);

    this.sky(ctx, v, f, skyTop, skyLow);

    // The world, painted in daylight colours on its own layer, then graded for the hour.
    const layer = this.layer!;
    const ratio = ctx.getTransform().a || 1;
    if (
      layer.width !== ctx.canvas.width ||
      layer.height !== ctx.canvas.height
    ) {
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
    this.world(g, v, f, fire, embers, mix(skyLow, skyTop, 0.25), memory);
    g.restore();
    const lamps = this.lamps(p, fire, embers);
    this.grade(g, v, f, lamps);
    this.fog(g, v, f, lamps);
    ctx.drawImage(layer, 0, 0, width, height);

    // Light on top: the fire and its sparks, lamps, lit windows, the mela's bulbs.
    ctx.save();
    apply(ctx, v);
    ctx.globalCompositeOperation = "lighter";
    this.lights(ctx, v, f, fire, embers, memory);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // Anandpur Sahib, 1699: the old light, as if remembered.
    if (memory > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = `rgba(150, 104, 56, ${0.75 * memory})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(40, 20, 8, ${0.25 * memory})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // A wash behind the caption, so it reads over the brightest colour.
    if (!f.portrait) {
      // Dusk on the caption's side while a chapter is read: a gradient from the caption's edge to
      // about the middle, leading and trailing the caption a little.
      for (const [i, c] of lohri.chapters.entries()) {
        const [a, b, , e] = c.window;
        const on = rise(p, a - 0.015, b - 0.005) * (1 - rise(p, e, e + 0.02));
        if (on < 0.01) continue;
        const a0 = on * SCRIM[i];
        const right = c.side === "right";
        const wash = ctx.createLinearGradient(
          right ? width : 0,
          0,
          width * 0.5,
          0,
        );
        wash.addColorStop(0, `rgba(10, 6, 10, ${a0})`);
        wash.addColorStop(0.5, `rgba(10, 6, 10, ${a0})`);
        wash.addColorStop(0.72, `rgba(10, 6, 10, ${a0 * 0.8})`);
        wash.addColorStop(1, "rgba(10, 6, 10, 0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      const wash = ctx.createLinearGradient(0, height, 0, height * 0.5);
      wash.addColorStop(0, `rgba(10, 6, 8, ${lerp(0.35, 0.6, day)})`);
      wash.addColorStop(1, "rgba(10, 6, 8, 0)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, height * 0.5, width, height * 0.5);
    }
    if (day > 0.01) {
      const shade = ctx.createLinearGradient(0, 0, 0, 140);
      shade.addColorStop(0, `rgba(10, 6, 8, ${0.55 * day})`);
      shade.addColorStop(1, "rgba(10, 6, 8, 0)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, 140);
    }
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      Math.min(width, height) * 0.35,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    vignette.addColorStop(0, "rgba(8, 5, 8, 0)");
    vignette.addColorStop(1, `rgba(8, 5, 8, ${0.62 - day * 0.34})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    this.cues(f);
    this.previous = p;
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind === "down") this.pressed = true;
    if (kind === "up") {
      this.pressed = false;
      this.lastPoint = null;
      return;
    }
    const v = this.v;
    if (!v) return;
    const p = f.p;
    const world = toWorld(v, x, y);

    // The fire: a handful of rewri, popcorn, peanuts and til thrown in.
    if (p > 0.195 && p < 0.415) {
      if (kind !== "down") return;
      const from =
        Math.hypot(world.x - FIRE_TOP.x, world.y - FIRE_TOP.y) < 7
          ? world
          : {
              x: FIRE_TOP.x + (world.x > FIRE_TOP.x ? 3 : -3),
              y: FIRE.y + 1.5,
            };
      this.offer(from.x, from.y, 14);
      this.emit("offer");
      return;
    }

    // The harvest: drag the daatri through the standing wheat.
    if (p > 0.552 && p < 0.66) {
      if (kind === "move" && !this.pressed) return;
      const points = this.lastPoint ? 6 : 1;
      let cut = 0;
      for (let i = 1; i <= points; i++) {
        const t = i / points;
        const px = this.lastPoint
          ? lerp(this.lastPoint.x, world.x, t)
          : world.x;
        const py = this.lastPoint
          ? lerp(this.lastPoint.y, world.y, t)
          : world.y;
        if (!inHarvest(px, py + 0.5)) continue;
        cut += this.harvest.cut(px, py + 0.5, 0.32, this.cast.line(p));
      }
      this.lastPoint = world;
      if (cut > 0) {
        if (!f.reduced) {
          for (let i = 0; i < Math.min(12, cut); i++) {
            this.straw.push({
              x: world.x + (Math.random() - 0.5) * 0.4,
              y: world.y + 0.2,
              vx: (Math.random() - 0.5) * 2,
              vy: -1.5 - Math.random() * 2,
              age: 0,
              angle: Math.random() * TAU,
              spin: (Math.random() - 0.5) * 12,
            });
          }
          if (this.straw.length > 200)
            this.straw.splice(0, this.straw.length - 200);
        }
        if (f.seconds - this.lastCut > 0.09) {
          this.lastCut = f.seconds;
          this.emit("cut");
        }
      }
      return;
    }

    // The mela: play the dhol. The left of the screen is the dagga's boom, the right the tilli's crack.
    if (p > 0.795 && p < 0.9) {
      if (kind !== "down") return;
      this.cast.struck = f.seconds;
      this.rings.push({ x: DHOLI.x + 0.25, y: DHOLI.y - 0.85, age: 0 });
      this.emit(x < v.width / 2 ? "dagga" : "tilli");
    }
  }

  // ─── Setting up ────────────────────────────────────────────────────────────

  private ensure() {
    if (this.layer) return;
    this.layer = document.createElement("canvas");
    this.shade = document.createElement("canvas");
    this.mist = document.createElement("canvas");
    this.art = {
      wheat: paintWheatTiles(),
      bloom: paintMustardTile(true),
      pods: paintMustardTile(false),
      cane: paintCane(),
      courtyard: paintCourtyard(),
      stubble: paintStubble(),
      pyre: paintPyre(200, false),
      charred: paintPyre(200, true),
    };
  }

  /** A handful thrown from (x, y) so that it lands in the fire. */
  private offer(x: number, y: number, count: number) {
    const t = 0.75;
    for (let i = 0; i < count; i++) {
      const tx = FIRE_TOP.x + (Math.random() - 0.5) * 0.9;
      const ty = FIRE_TOP.y + (Math.random() - 0.5) * 0.4;
      const life = t * (0.85 + Math.random() * 0.3);
      this.offerings.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.2,
        vx: (tx - x) / life,
        vy: (ty - y) / life - 0.5 * GRAVITY * life,
        kind: Math.floor(Math.random() * 5),
        age: 0,
        life,
        spin: (Math.random() - 0.5) * 10,
      });
    }
    if (this.offerings.length > MAX_OFFERINGS)
      this.offerings.splice(0, this.offerings.length - MAX_OFFERINGS);
  }

  // ─── Sky ───────────────────────────────────────────────────────────────────

  private sky(ctx: Ctx, v: View, f: Frame, top: RGB, low: RGB) {
    const { width, height } = v;
    const { p, seconds } = f;
    const horizonY = toScreen(v, 0, HORIZON).y;
    const horizon = clamp(horizonY / height, 0.05, 1.3);
    const sky = ctx.createLinearGradient(0, 0, 0, height * horizon);
    sky.addColorStop(0, rgb(top));
    sky.addColorStop(0.62, rgb(mix(top, low, 0.5)));
    sky.addColorStop(1, rgb(low));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const night = 1 - rise(p, 0.41, 0.44);
    const late = rise(p, 0.9, 0.97);
    const r = Math.min(width, height) * 0.05;

    // Stars: faint through the fog, then clear at the end.
    const stars = Math.max(night * 0.35, late);
    if (stars > 0.01) {
      ctx.fillStyle = "#f2e9d6";
      for (const s of this.stars) {
        const twinkle =
          0.55 + 0.45 * Math.sin(seconds * (0.8 + s.seed * 0.2) + s.seed * 6);
        ctx.globalAlpha = twinkle * stars * (1 - s.y * 0.7) * 0.8;
        ctx.fillRect(s.x * width, s.y * height * horizon * 0.85, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }
    // A winter moon, only a blur of light through the fog.
    if (night > 0.01) {
      const mx = width * 0.78 - (v.x + 20) * 2;
      const my = Math.max(r * 1.6, height * horizon * 0.28);
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite("200, 206, 230"), mx, my, r * 7, 0.2 * night);
      glow(ctx, glowSprite("236, 236, 240"), mx, my, r * 1.4, 0.5 * night);
      ctx.globalCompositeOperation = "source-over";
    }
    // The sun, climbing through the spring, high at Vaisakhi, going down behind the mela.
    const up = track(SUN_UP, p);
    if (p > 0.43 && p < 0.905 && up > -0.2) {
      const x = width * track(SUN_ACROSS, p);
      const y = horizonY - up * (horizonY - height * 0.1);
      const low = 1 - clamp(up / 0.4);
      const tint = mix([255, 244, 214], [255, 150, 70], low);
      ctx.globalCompositeOperation = "lighter";
      glow(
        ctx,
        glowSprite(tint.map(Math.round).join(", ")),
        x,
        y,
        r * (7 + low * 4),
        0.45,
      );
      glow(ctx, glowSprite("255, 250, 230"), x, y, r * 2, 0.7);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgb(mix([255, 252, 236], [255, 200, 130], low));
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, TAU);
      ctx.fill();
    }
    // Clouds, racing while the season turns, then drifting.
    const clouds = rise(p, 0.44, 0.46) * (1 - rise(p, 0.8, 0.87));
    if (clouds > 0.01) {
      const lapse = rise(p, 0.44, 0.46) * (1 - rise(p, 0.52, 0.54));
      const sprite = cloud();
      const size = Math.min(width, height) * 0.1;
      for (const c of this.clouds) {
        const span = width + size * 8;
        const sx =
          ((((c.x * 40 + seconds * c.speed * (20 + 160 * lapse) - v.x * 6) %
            span) +
            span) %
            span) -
          size * 4;
        const sy = height * horizon * (0.12 + ((c.y + 13) / 5) * 0.22);
        ctx.globalAlpha = clouds * 0.5;
        ctx.drawImage(sprite, sx, sy, size * c.s, size * c.s * 0.43);
      }
      ctx.globalAlpha = 1;
    }
    // Birds going home over the fields, in spring and at dusk.
    const birds = Math.max(
      rise(p, 0.46, 0.48) * (1 - rise(p, 0.52, 0.54)),
      rise(p, 0.86, 0.88) * (1 - rise(p, 0.93, 0.95)),
    );
    if (birds > 0.01) {
      ctx.strokeStyle = `rgba(30, 24, 30, ${0.7 * birds})`;
      ctx.lineWidth = 1.4;
      const t = f.reduced ? 3 : seconds;
      for (let i = 0; i < 9; i++) {
        const bx = ((t * 40 + i * 37 + (i % 3) * 20) % (width + 200)) - 100;
        const by =
          height * horizon * 0.45 + Math.abs(i - 4) * 12 + Math.sin(t + i) * 4;
        bird(ctx, width - bx, by, 6, t * 8 + i);
      }
    }
  }

  // ─── The world ─────────────────────────────────────────────────────────────

  private world(
    g: Ctx,
    v: View,
    f: Frame,
    fire: number,
    embers: number,
    haze: RGB,
    memory: number,
  ) {
    const { p, seconds } = f;
    const art = this.art!;
    const season = rise(p, MOMENTS.season[0], MOMENTS.season[1]);
    const wind =
      lerp(0.25, 1, rise(p, 0.43, 0.5)) * (1 - 0.4 * rise(p, 0.88, 1));
    drawHorizon(g, v, this.horizon, haze);
    // Kites for Basant, over the fields in Magh.
    const basant =
      rise(p, MOMENTS.basant[0], MOMENTS.basant[0] + 0.01) *
      (1 - rise(p, MOMENTS.basant[1] - 0.01, MOMENTS.basant[1]));
    if (basant > 0.01) {
      g.globalAlpha = basant;
      KITES.forEach((k, i) =>
        drawKite(
          g,
          k.x + Math.sin(seconds * 0.4 + i) * 0.4,
          k.y + Math.cos(seconds * 0.5 + i * 2) * 0.3 + (1 - basant) * 2,
          k.size,
          k.colour,
          seconds,
          i,
        ),
      );
      g.globalAlpha = 1;
    }
    drawGround(g, v, art.courtyard, haze);
    const view = bounds(v, 2);
    if (onScreen(v, 61.4, 3.9, 3)) drawKabaddi(g);

    const actors: Actor[] = [];
    this.fields(actors, g, v, f, season, wind);
    // The village.
    if (view.right > -19 && view.left < 9) {
      for (const b of this.houses)
        actors.push({ y: -0.002, draw: () => drawHouse(g, v, b) });
      actors.push({ y: -0.001, draw: () => drawHaveli(g, v) });
      actors.push({ y: 0.45, draw: () => drawGohara(g, -7.6, 0.45, 0.7) });
      actors.push({ y: 0.5, draw: () => drawGohara(g, 7.0, 0.5, 0.6) });
      actors.push({ y: 0.55, draw: () => drawNalka(g, -14.6, 0.55) });
      this.fire(actors, g, f, fire, embers);
    }
    const green = mix(
      mix([66, 90, 58], [80, 136, 66], rise(p, 0.45, 0.5)),
      [96, 124, 58],
      rise(p, 0.52, 0.58),
    );
    for (const t of TREES)
      if (t.x > view.left - 4 && t.x < view.right + 4)
        actors.push({
          y: t.y,
          draw: () => drawTree(g, t.x, t.y, t.size, t.kind, seconds, green),
        });
    if (onScreen(v, 12.6, -2, 3))
      actors.push({
        y: -1.3,
        draw: () =>
          drawTubewell(
            g,
            seconds,
            rise(p, 0.44, 0.46) * (1 - rise(p, 0.51, 0.53)),
          ),
      });
    if (onScreen(v, CART.x + 1, CART.y - 1, 4) && p > 0.42 && p < 0.668) {
      const load = rise(p, 0.56, 0.64);
      actors.push({
        y: CART.y - 0.3,
        draw: () =>
          drawBullock(g, CART.x + 3.55, CART.y - 0.3, 1.1, 1, seconds, 1),
      });
      actors.push({ y: CART.y, draw: () => drawCart(g, load) });
      actors.push({
        y: CART.y + 0.05,
        draw: () =>
          drawBullock(g, CART.x + 3.3, CART.y + 0.05, 1.15, 1, seconds, 2),
      });
    }
    // The gurdwara, its Nishan Sahib and the langar.
    if (view.right > 38 && view.left < 60) {
      actors.push({ y: GURDWARA.y, draw: () => drawGurdwara(g, v, haze) });
      actors.push({
        y: NISHAN.y,
        draw: () =>
          drawNishan(
            g,
            NISHAN.x,
            NISHAN.y,
            NISHAN.h,
            seconds,
            0.6 + 0.4 * wind,
            true,
          ),
      });
      actors.push({ y: LANGAR.y0 - 0.01, draw: () => drawShamiana(g, false) });
      actors.push({ y: LANGAR.y1, draw: () => drawShamiana(g, true) });
    }
    // The mela.
    if (view.right > 57 && view.left < 84) {
      for (const s of this.stalls)
        actors.push({ y: 0.9, draw: () => drawStall(g, s, seconds) });
      const angle = (f.reduced ? 0.3 : seconds * 0.22) * rise(p, 0.7, 0.8);
      actors.push({
        y: JHOOLA.y,
        draw: () => drawJhoola(g, angle, this.cast.riders),
      });
    }
    this.cast.lane(actors, g, f);
    this.cast.fire(actors, g, f, (x, y, n) => this.offer(x, y, n));
    this.cast.giddaRing(actors, g, f);
    this.cast.mustard(actors, g, f);
    this.cast.harvest(actors, g, f);
    this.cast.fieldBhangra(actors, g, f, this.leap);
    this.cast.gurdwara(actors, g, f, memory);
    this.cast.langar(actors, g, f);
    this.cast.mela(actors, g, f);
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();

    // The air between here and the horizon.
    const aerial = g.createLinearGradient(0, HORIZON - 1.5, 0, HORIZON + 4.5);
    aerial.addColorStop(0, rgb(haze, 0));
    aerial.addColorStop(0.25, rgb(haze, 0.42));
    aerial.addColorStop(1, rgb(haze, 0));
    g.fillStyle = aerial;
    g.fillRect(view.left, HORIZON - 1.5, view.right - view.left, 6);
    // Cloud shadows racing over the wheat while the season turns.
    const lapse = rise(p, 0.445, 0.46) * (1 - rise(p, 0.53, 0.55));
    if (lapse > 0.01 && view.right > WHEAT.x0 - 8 && view.left < WHEAT.x1) {
      const shadow = glowSprite("24, 36, 18");
      for (let i = 0; i < 6; i++) {
        const x =
          WHEAT.x0 -
          14 +
          ((((i * 9.7 + (f.reduced ? 0 : seconds) * 2.6) % 46) + 46) % 46);
        const y = -1.6 + (i % 3) * 2.6;
        g.globalAlpha = 0.32 * lapse;
        g.drawImage(
          shadow,
          x - 6,
          y - 1.6 * rowScale(y),
          12,
          3.2 * rowScale(y),
        );
      }
      g.globalAlpha = 1;
    }

    this.particles(g, f);
  }

  /**
   * The fog, laid over the graded world at a third of the resolution. It takes its colour from the
   * hour: a deep blue in the winter night, so it adds distance without greying the frame, and warm
   * where the fire and the lamps light it from inside.
   */
  private fog(g: Ctx, v: View, f: Frame, lamps: Lamp[]) {
    const { p } = f;
    const density = track(FOG, p);
    if (density < 0.01) return;
    const mist = this.mist!;
    const w = Math.ceil(g.canvas.width / 3);
    const h = Math.ceil(g.canvas.height / 3);
    if (mist.width !== w || mist.height !== h) {
      mist.width = w;
      mist.height = h;
    }
    const m = mist.getContext("2d")!;
    const k = w / v.width;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = "source-over";
    m.clearRect(0, 0, w, h);
    m.setTransform(k, 0, 0, k, 0, 0);
    m.save();
    apply(m, v);
    drawFog(m, v, density, f.reduced ? 0 : f.seconds, [255, 255, 255]);
    m.restore();
    const night = 1 - rise(p, 0.405, 0.435);
    const dawn = mix([214, 218, 226], track(GRADE, p), track(GRADE_ALPHA, p));
    m.globalCompositeOperation = "source-atop";
    m.fillStyle = rgb(mix(dawn, [36, 46, 82], night));
    m.fillRect(0, 0, v.width, v.height);
    for (const lamp of lamps) {
      const at = toScreen(v, lamp.x, lamp.y);
      const r = lamp.r * 1.05 * v.scale;
      const glow = m.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
      glow.addColorStop(0, `rgba(255, 170, 96, ${0.9 * lamp.heat})`);
      glow.addColorStop(0.35, `rgba(230, 116, 56, ${0.5 * lamp.heat})`);
      glow.addColorStop(1, "rgba(190, 80, 40, 0)");
      m.fillStyle = glow;
      m.fillRect(at.x - r, at.y - r, r * 2, r * 2);
    }
    m.globalCompositeOperation = "source-over";
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = lerp(1, 0.75, night);
    g.drawImage(mist, 0, 0, g.canvas.width, g.canvas.height);
    g.restore();
  }

  /** The crops, row by row from the horizon: mustard and cane to the west, wheat to the east. */
  private fields(
    actors: Actor[],
    g: Ctx,
    v: View,
    f: Frame,
    season: number,
    wind: number,
  ) {
    const { p, seconds } = f;
    const art = this.art!;
    const view = bounds(v, 4);
    const west = view.right > MUSTARD.x0 && view.left < MUSTARD.x1;
    const east = view.right > EAST_MUSTARD.x0 && view.left < EAST_MUSTARD.x1;
    const wheat = view.right > WHEAT.x0 && view.left < WHEAT.x1;
    const pods = rise(p, 0.49, 0.525);
    const vaisakhi = p > MOMENTS.vaisakhi - 0.01;
    // Plots sown a week or two apart, a little ahead or behind each other all season.
    const plot = (x: number) =>
      clamp(
        season * 1.12 - 0.12 + 0.12 * Math.sin(Math.floor(x / 8) * 2.4 + 1),
      );
    for (const y of this.rows) {
      if (west) {
        const skip =
          y > CANE.y0 - 0.2 && y < CANE.y1 + 0.3
            ? { x0: CANE.x0, x1: CANE.x1 }
            : undefined;
        actors.push({
          y,
          draw: () =>
            drawMustardRow(
              g,
              v,
              art.bloom,
              y,
              seconds,
              wind,
              MUSTARD.x0,
              MUSTARD.x1,
              skip,
            ),
        });
      }
      if (east) {
        actors.push({
          y,
          draw: () => {
            if (pods < 0.99)
              drawMustardRow(
                g,
                v,
                art.bloom,
                y,
                seconds,
                wind,
                EAST_MUSTARD.x0,
                EAST_MUSTARD.x1,
              );
            if (pods > 0.01) {
              g.globalAlpha = pods;
              drawMustardRow(
                g,
                v,
                art.pods,
                y,
                seconds,
                wind,
                EAST_MUSTARD.x0,
                EAST_MUSTARD.x1,
              );
              g.globalAlpha = 1;
            }
          },
        });
      }
      if (wheat) {
        if (vaisakhi && y > HARVEST.y1 + 0.01)
          actors.push({
            y,
            draw: () =>
              drawStubbleRow(g, v, art.stubble, y, WHEAT.x0, WHEAT.x1),
          });
        else
          actors.push({
            y,
            draw: () =>
              drawWheatRow(
                g,
                v,
                art.wheat,
                y,
                plot,
                seconds,
                wind,
                vaisakhi && isHarvestRow(y),
              ),
          });
      }
    }
    if (west && view.right > CANE.x0 && view.left < CANE.x1) {
      for (const [i, y] of [
        CANE.y0,
        (CANE.y0 + CANE.y1) / 2,
        CANE.y1,
      ].entries()) {
        const s = rowScale(y);
        actors.push({
          y: y + 0.01,
          draw: () =>
            g.drawImage(
              art.cane.canvas,
              CANE.x0 + i * 0.4 - 0.4,
              y - art.cane.height * s,
              art.cane.width,
              art.cane.height * s,
            ),
        });
      }
    }
    if (wheat && vaisakhi) {
      const line = this.cast.line(p);
      for (const row of this.harvest.rows)
        actors.push({
          y: row.y,
          draw: () =>
            this.harvest.drawRow(g, v, row, line, seconds, wind, art.stubble),
        });
    }
  }

  // ─── The Lohri fire ────────────────────────────────────────────────────────

  private fire(
    actors: Actor[],
    g: Ctx,
    f: Frame,
    fire: number,
    embers: number,
  ) {
    const { p, seconds } = f;
    const v = this.v!;
    if (!onScreen(v, FIRE.x, FIRE.y - 1, 4) || p > 0.56) return;
    const art = this.art!;
    const burnt = rise(p, 0.21, 0.36);
    const shrink = lerp(1, 0.55, rise(p, 0.22, 0.41));
    const ash = rise(p, 0.405, 0.43);
    actors.push({
      y: FIRE.y,
      draw: () => {
        if (ash < 1) {
          const { pyre, charred } = art;
          const pile = (sprite: typeof pyre, alpha: number) => {
            if (alpha < 0.01) return;
            g.globalAlpha = alpha * (1 - ash);
            g.drawImage(
              sprite.canvas,
              FIRE.x - sprite.width / 2,
              FIRE.y - (sprite.height - 0.15) * shrink - 0.15,
              sprite.width,
              sprite.height * shrink,
            );
          };
          pile(pyre, 1);
          pile(charred, burnt);
          g.globalAlpha = 1;
        }
        if (ash > 0.01) {
          g.globalAlpha = ash;
          drawAsh(g, embers);
          g.globalAlpha = 1;
        }
        if (fire > 0.01) {
          // Tall tongues licking up the cone at the back, shorter ones round the foot in front.
          const row = (
            count: number,
            scale: number,
            width: number,
            spread: number,
            seed: number,
          ) => {
            for (let i = 0; i < count; i++) {
              const t = (i + 0.5) / count;
              const dx = lerp(-FIRE.w, FIRE.w, t) * spread;
              const centre = 1 - Math.abs(dx) / FIRE.w;
              const base = FIRE.y - FIRE.h * shrink * centre * 0.7;
              const height =
                fire *
                scale *
                (0.45 + 0.75 * centre) *
                (0.75 + 0.35 * Math.sin(seed + i * 2.1));
              tongue(
                g,
                FIRE.x + dx,
                base + 0.12,
                height,
                width * (0.7 + Math.min(1, fire) * 0.3),
                f.reduced ? 1 : seconds,
                seed + i * 1.7,
                Math.min(1, fire),
              );
            }
          };
          const tall = lerp(1, 0.72, burnt);
          row(6, 2.7 * tall, 0.6, 0.7, 1);
          row(9, 1.8 * tall, 0.44, 0.85, 4);
          g.globalAlpha = 0.85;
          row(11, 0.75, 0.34, 0.95, 7);
          g.globalAlpha = 1;
        }
      },
    });
    if (
      !f.reduced &&
      seconds > this.nextSmoke &&
      (fire > 0.05 || embers > 0.1)
    ) {
      this.nextSmoke = seconds + (fire > 0.05 ? 0.14 : 0.45);
      const top = FIRE.y - FIRE.h * shrink - 2.2 * Math.min(1, fire);
      this.smoke.push({
        x: FIRE.x + (Math.random() - 0.5) * 0.6,
        y: top,
        r: 0.4,
        age: 0,
        life: 3 + Math.random() * 2,
        vx: (Math.random() - 0.3) * 0.3,
      });
      if (this.smoke.length > 60) this.smoke.shift();
    }
  }

  private particles(g: Ctx, f: Frame) {
    const { dt } = f;
    // Smoke, rising into the fog.
    const smoke = glowSprite("110, 104, 110");
    this.smoke = this.smoke.filter((s) => {
      s.age += dt;
      if (s.age > s.life) return false;
      s.y -= dt * 0.9;
      s.x += s.vx * dt;
      s.r += dt * 0.5;
      g.globalAlpha = 0.28 * Math.sin((s.age / s.life) * Math.PI);
      g.drawImage(smoke, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      return true;
    });
    g.globalAlpha = 1;
    // What is thrown into the fire.
    const colours = ["#f6f0e0", "#efe2c0", "#c89a5a", "#8a4a1c", "#a8702e"];
    this.offerings = this.offerings.filter((o) => {
      o.age += dt;
      if (o.age >= o.life) {
        this.flare = Math.min(0.5, this.flare + 0.025);
        if (Math.random() < 0.5) this.burst(o.x, o.y, 3, 2.2);
        return false;
      }
      o.vy += GRAVITY * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      g.fillStyle = colours[o.kind];
      g.save();
      g.translate(o.x, o.y);
      g.rotate(o.age * o.spin);
      g.beginPath();
      if (o.kind === 0) {
        // Popcorn: a puffed knot.
        g.arc(-0.02, 0, 0.035, 0, TAU);
        g.arc(0.02, -0.012, 0.03, 0, TAU);
        g.arc(0.005, 0.02, 0.028, 0, TAU);
      } else if (o.kind === 1) g.ellipse(0, 0, 0.045, 0.03, 0, 0, TAU);
      else if (o.kind === 2) g.ellipse(0, 0, 0.04, 0.022, 0, 0, TAU);
      else if (o.kind === 3) g.arc(0, 0, 0.03, 0, TAU);
      else g.rect(-0.04, -0.03, 0.08, 0.06);
      g.fill();
      if (o.kind === 1) {
        g.fillStyle = "#6a4a2a";
        g.fillRect(-0.015, -0.008, 0.008, 0.008);
        g.fillRect(0.012, 0.004, 0.008, 0.008);
      }
      g.restore();
      return true;
    });
    // Straw flying off the daatri.
    g.strokeStyle = "rgba(240, 206, 120, 0.95)";
    g.lineWidth = 0.02;
    this.straw = this.straw.filter((s) => {
      s.age += dt;
      if (s.age > 1.2) return false;
      s.vy += GRAVITY * 0.5 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.angle += s.spin * dt;
      g.globalAlpha = 1 - s.age / 1.2;
      g.beginPath();
      g.moveTo(s.x - Math.cos(s.angle) * 0.07, s.y - Math.sin(s.angle) * 0.07);
      g.lineTo(s.x + Math.cos(s.angle) * 0.07, s.y + Math.sin(s.angle) * 0.07);
      g.stroke();
      return true;
    });
    g.globalAlpha = 1;
    this.harvest.update(f.reduced ? 1 : dt);
  }

  private burst(x: number, y: number, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const s = speed * (0.5 + Math.random());
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.6 + Math.random() * 1.2,
        age: 0,
      });
    }
    if (this.sparks.length > MAX_SPARKS)
      this.sparks.splice(0, this.sparks.length - MAX_SPARKS);
  }

  // ─── Light ─────────────────────────────────────────────────────────────────

  /** How lit the mela's bulbs and the gurdwara's lights are, as the sun goes. */
  private evening(p: number) {
    return rise(p, 0.83, 0.88);
  }

  private lights(
    ctx: Ctx,
    v: View,
    f: Frame,
    fire: number,
    embers: number,
    memory: number,
  ) {
    const { p, seconds, dt } = f;
    const night = 1 - rise(p, 0.41, 0.445);
    // Other villages' fires, far off in the fog.
    if (night > 0.01 && p > 0.02) {
      const far = glowSprite(FIRE_LIGHT);
      const core = glowSprite("255, 214, 140");
      FAR_FIRES.forEach(([x, y], i) => {
        const a =
          night *
          rise(p, 0.005 + i * 0.008, 0.03 + i * 0.008) *
          (1 - rise(p, 0.12, 0.16));
        glow(ctx, far, x, y, 1.3 * flicker(seconds, i), 0.7 * a);
        glow(ctx, core, x, y + 0.1, 0.2 * flicker(seconds * 1.3, i), a);
      });
    }
    if (night > 0.01) {
      const sprite = glowSprite(WINDOW_LIGHT);
      for (const w of this.windows)
        if (onScreen(v, w.x, w.y, 1.5))
          glow(ctx, sprite, w.x, w.y, w.r, 0.35 * night);
    }
    // The open door, and the child's lantern.
    const open =
      rise(p, MOMENTS.rewri - 0.022, MOMENTS.rewri - 0.01) *
      (1 - rise(p, 0.18, 0.2));
    if (open > 0.01)
      glow(ctx, glowSprite("255, 190, 110"), DOOR.x, -0.8, 2.4, 0.45 * open);
    const lantern = this.cast.lantern;
    if (lantern && lantern.alpha > 0.01) {
      const fl = flicker(seconds, 4);
      glow(
        ctx,
        glowSprite("255, 200, 120"),
        lantern.x,
        lantern.y,
        1.3 * fl,
        0.45 * lantern.alpha,
      );
      glow(
        ctx,
        glowSprite("255, 236, 190"),
        lantern.x,
        lantern.y,
        0.18 * fl,
        0.9 * lantern.alpha,
      );
    }
    // The fire.
    const sprite = glowSprite(FIRE_LIGHT);
    const flick = flicker(seconds * 0.7, 3);
    if (fire > 0.01) {
      glow(
        ctx,
        sprite,
        FIRE.x,
        FIRE_TOP.y - 0.8,
        5.2 * flick * Math.min(1.2, fire),
        0.2 * Math.min(1, fire),
      );
      glow(
        ctx,
        sprite,
        FIRE.x,
        FIRE_TOP.y,
        2.4 * flick,
        0.28 * Math.min(1, fire),
      );
      glow(
        ctx,
        glowSprite("255, 220, 150"),
        FIRE.x,
        FIRE.y - 0.4,
        0.9 * flick,
        0.35 * Math.min(1, fire),
      );
    }
    if (embers > 0.01)
      glow(
        ctx,
        sprite,
        FIRE.x,
        FIRE.y - 0.2,
        1.8,
        0.4 * embers * (1 - Math.min(1, fire)),
      );
    if (!f.reduced && fire > 0.05) {
      const count = Math.floor(dt * 40 * Math.min(1.3, fire) + Math.random());
      for (let i = 0; i < count; i++) {
        this.sparks.push({
          x: FIRE.x + (Math.random() - 0.5) * 1.6,
          y: FIRE_TOP.y - 0.4,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -2.2 - Math.random() * 3.2,
          life: 0.9 + Math.random() * 1.8,
          age: 0,
        });
      }
      if (this.sparks.length > MAX_SPARKS)
        this.sparks.splice(0, this.sparks.length - MAX_SPARKS);
    }
    const spark = glowSprite("255, 180, 80");
    this.sparks = this.sparks.filter((s) => {
      s.age += dt;
      if (s.age >= s.life) return false;
      s.vx += Math.sin(seconds * 3 + s.y) * dt * 2;
      s.vy += 0.8 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      glow(ctx, spark, s.x, s.y, 0.1, 1 - s.age / s.life);
      return true;
    });

    // 1699: a light from the gurdwara's door, behind the five.
    if (memory > 0.01) {
      glow(
        ctx,
        glowSprite("255, 200, 120"),
        GURDWARA.x,
        -1.2,
        6,
        0.32 * memory,
      );
      glow(
        ctx,
        glowSprite("255, 236, 190"),
        GURDWARA.x,
        -1.3,
        1.6,
        0.35 * memory,
      );
    }

    // Evening: the gurdwara's lights, the Nishan Sahib's lamp, the mela's bulbs.
    const lit = this.evening(p);
    if (lit > 0.01) {
      const bulb = glowSprite("255, 214, 140");
      if (onScreen(v, GURDWARA.x, -4, 8)) {
        for (let x = GURDWARA.x - 4.4; x <= GURDWARA.x + 4.41; x += 0.44)
          glow(ctx, bulb, x, GURDWARA.y - 4.05, 0.28, 0.8 * lit);
        for (let x = GURDWARA.x - 5.1; x <= GURDWARA.x + 5.11; x += 0.5)
          glow(ctx, bulb, x, GURDWARA.y - 0.62, 0.26, 0.7 * lit);
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI + (i / 12) * Math.PI;
          glow(
            ctx,
            bulb,
            GURDWARA.x + Math.cos(a) * 1.7,
            GURDWARA.y - 6.6 + Math.sin(a) * 2.4,
            0.24,
            0.7 * lit,
          );
        }
        glow(
          ctx,
          glowSprite("255, 180, 90"),
          GURDWARA.x,
          GURDWARA.y - 1.6,
          3.5,
          0.3 * lit,
        );
      }
      for (const b of this.bulbs) {
        if (!onScreen(v, b.x, b.y, 1)) continue;
        const twinkle = 0.8 + 0.2 * Math.sin(seconds * 3 + b.x * 5);
        glow(ctx, glowSprite(b.c), b.x, b.y, 0.34, lit * twinkle);
      }
      if (onScreen(v, 70, -1, 12))
        glow(ctx, glowSprite("255, 160, 90"), 69, -1.5, 10, 0.18 * lit);
    }

    // The dhol's beat going out through the crowd.
    ctx.lineWidth = 0.04;
    this.rings = this.rings.filter((r) => {
      r.age += Math.max(dt, 0.016);
      if (r.age > 0.7) return false;
      ctx.strokeStyle = `rgba(255, 220, 150, ${0.6 * (1 - r.age / 0.7)})`;
      ctx.beginPath();
      ctx.ellipse(
        r.x,
        r.y,
        0.3 + r.age * 3,
        (0.3 + r.age * 3) * 0.6,
        0,
        0,
        TAU,
      );
      ctx.stroke();
      return true;
    });
  }

  /** Grades the world for the hour: fog-blue night, warm where the fire and lamps are; gold; dusk. */
  /** The lights that open the night grade: the fire, the open door, the lantern, the lit mela. */
  private lamps(p: number, fire: number, embers: number) {
    const holes: Lamp[] = [];
    const heat = Math.min(1, fire) * 0.9 + embers * 0.35;
    if (heat > 0.01)
      holes.push({
        x: FIRE.x,
        y: (FIRE_TOP.y + FIRE.y) / 2,
        r: 4.2 + 1.8 * Math.min(1.2, fire),
        heat: Math.min(1, heat * 1.1),
        warm: [168, 62, 8],
      });
    const open =
      rise(p, MOMENTS.rewri - 0.022, MOMENTS.rewri - 0.01) *
      (1 - rise(p, 0.18, 0.2));
    if (open > 0.01)
      holes.push({
        x: DOOR.x,
        y: -0.4,
        r: 2.6,
        heat: 0.7 * open,
        warm: [150, 70, 20],
      });
    const lantern = this.cast.lantern;
    if (lantern && lantern.alpha > 0.01)
      holes.push({
        x: lantern.x,
        y: lantern.y,
        r: 1.6,
        heat: 0.5 * lantern.alpha,
        warm: [150, 80, 20],
      });
    const lit = this.evening(p);
    if (lit > 0.01) {
      holes.push({
        x: 69,
        y: -0.5,
        r: 11,
        heat: 0.45 * lit,
        warm: [150, 70, 30],
      });
      holes.push({
        x: GURDWARA.x,
        y: -3,
        r: 7,
        heat: 0.4 * lit,
        warm: [140, 90, 30],
      });
    }
    return holes;
  }

  private grade(g: Ctx, v: View, f: Frame, holes: Lamp[]) {
    const { p } = f;
    const colour = track(GRADE, p);
    const alpha = track(GRADE_ALPHA, p);
    if (alpha < 0.005) return;
    const shade = this.shade!;
    const w = Math.ceil(g.canvas.width / 4);
    const h = Math.ceil(g.canvas.height / 4);
    if (shade.width !== w || shade.height !== h) {
      shade.width = w;
      shade.height = h;
    }
    const s = shade.getContext("2d")!;
    const k = w / v.width;
    s.setTransform(1, 0, 0, 1, 0, 0);
    // Firelight first: the daylit world multiplied by the lamps' colour, so a white wall goes amber
    // and a face goes copper rather than grey, and the night grade below only opens onto that.
    s.globalCompositeOperation = "source-over";
    s.clearRect(0, 0, w, h);
    let lit = false;
    const dark = Math.min(1, alpha * 1.25);
    for (const hole of holes) {
      const at = toScreen(v, hole.x, hole.y);
      const x = at.x * k;
      const y = at.y * k;
      const r = hole.r * 1.1 * v.scale * k;
      if (x + r < 0 || x - r > w || y + r < 0 || y - r > h) continue;
      const tint = s.createRadialGradient(x, y, 0, x, y, r);
      tint.addColorStop(0, `rgba(255, 196, 128, ${0.85 * hole.heat * dark})`);
      tint.addColorStop(0.35, `rgba(255, 138, 62, ${0.8 * hole.heat * dark})`);
      tint.addColorStop(0.7, `rgba(236, 104, 44, ${0.45 * hole.heat * dark})`);
      tint.addColorStop(1, "rgba(220, 90, 40, 0)");
      s.fillStyle = tint;
      s.fillRect(x - r, y - r, r * 2, r * 2);
      lit = true;
    }
    if (lit) {
      s.globalCompositeOperation = "destination-in";
      s.drawImage(g.canvas, 0, 0, w, h);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "multiply";
      g.drawImage(shade, 0, 0, g.canvas.width, g.canvas.height);
      g.restore();
      s.globalCompositeOperation = "source-over";
      s.clearRect(0, 0, w, h);
    }
    s.fillStyle = rgb(colour, alpha);
    s.fillRect(0, 0, w, h);
    for (const hole of holes) {
      const at = toScreen(v, hole.x, hole.y);
      const x = at.x * k;
      const y = at.y * k;
      const r = hole.r * v.scale * k;
      if (x + r < 0 || x - r > w || y + r < 0 || y - r > h) continue;
      const cut = s.createRadialGradient(x, y, 0, x, y, r);
      // Light falls off fast from the source and then lingers, as firelight does.
      cut.addColorStop(0, `rgba(0, 0, 0, ${hole.heat})`);
      cut.addColorStop(0.25, `rgba(0, 0, 0, ${hole.heat * 0.82})`);
      cut.addColorStop(0.5, `rgba(0, 0, 0, ${hole.heat * 0.38})`);
      cut.addColorStop(0.8, `rgba(0, 0, 0, ${hole.heat * 0.08})`);
      cut.addColorStop(1, "rgba(0, 0, 0, 0)");
      s.globalCompositeOperation = "destination-out";
      s.fillStyle = cut;
      s.fillRect(x - r, y - r, r * 2, r * 2);
      const warm = s.createRadialGradient(x, y, r * 0.2, x, y, r * 0.9);
      const a = hole.heat * Math.min(1, alpha * 1.6);
      warm.addColorStop(0, rgb(hole.warm, 0.22 * a));
      warm.addColorStop(0.5, rgb(hole.warm, 0.18 * a));
      warm.addColorStop(1, rgb(hole.warm, 0));
      s.globalCompositeOperation = "source-over";
      s.fillStyle = warm;
      s.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.drawImage(shade, 0, 0, g.canvas.width, g.canvas.height);
    g.restore();
  }

  // ─── Moments ───────────────────────────────────────────────────────────────

  private cues(f: Frame) {
    const { p } = f;
    const passed = (point: number) =>
      this.previous < point && p >= point && p - point < 0.03;
    if (passed(MOMENTS.light)) {
      this.flare = 0.5;
      if (!f.reduced) this.burst(FIRE.x, FIRE_TOP.y - 0.4, 90, 4.5);
    }
    if (passed(MOMENTS.hoy)) this.leap = 1;
    // "Hoy!" at the top of every few phrases, all the dancers in the air at once.
    if (
      p > MOMENTS.hoy + 0.004 &&
      p < MOMENTS.bhangra[1] &&
      Math.floor(f.seconds / 4.8) !== Math.floor((f.seconds - f.dt) / 4.8)
    )
      this.leap = 1;
  }
}

export function createScene(emit: Emit): Scene {
  return new Lohri(emit);
}
