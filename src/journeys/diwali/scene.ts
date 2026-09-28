// Diwali, as one continuous shot: a single lamp at a door on the darkest night, then the step,
// the rangoli, Lakshmi's footprints and the whole house; then the camera pulls back across the
// river to a town lit for Ram coming home, rises into a sky of lanterns and fireworks, and comes
// down again at dawn to the lamp it started with.
//
// World units, y down: the house stands on y = 0, the courtyard runs to the ghats at y = 3, and
// the river lies between the town and the viewer from WATER on.
import {
  TAU,
  apply,
  clamp,
  flame,
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
  type Shot,
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";

const WATER = 3.4;
const RANGOLI = { x: 0, y: 1.75, r: 1.3, squash: 0.52 };
const LAMP_LIGHT = "255, 160, 60";
const DOOR_LIGHT = "255, 196, 110";

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  yama: [0.088, 0.104],
  step: [0.215, 0.3],
  rangoli: [0.345, 0.45],
  feet: [0.475, 0.535],
  house: [0.505, 0.585],
  door: [0.52, 0.585],
  town: [0.6, 0.7],
  lanterns: [0.635, 0.86],
  fireworks: [0.74, 0.885],
  dawn: [0.875, 0.97],
} as const;

const SHOTS: Shot[] = [
  { at: 0.0, x: 0, y: 0.42, zoom: 4.2 },
  { at: 0.11, x: 0, y: 0.4, zoom: 3.7 },
  { at: 0.2, x: 0, y: 0.2, zoom: 2.9 },
  { at: 0.28, x: 0, y: -0.25, zoom: 1.7 },
  { at: 0.37, x: 0, y: 1.3, zoom: 1.6 },
  { at: 0.45, x: 0.1, y: 1.25, zoom: 1.4 },
  { at: 0.51, x: 0, y: -1.5, zoom: 0.92 },
  { at: 0.585, x: 0, y: -1.9, zoom: 0.8 },
  { at: 0.645, x: 0, y: -1.2, zoom: 0.3 },
  { at: 0.72, x: 0, y: -2.6, zoom: 0.2 },
  { at: 0.785, x: 0, y: -10.5, zoom: 0.165 },
  { at: 0.865, x: 0, y: -9.5, zoom: 0.17 },
  { at: 0.93, x: 0, y: -2.1, zoom: 0.62 },
  { at: 1.0, x: 0, y: -1.7, zoom: 1.12 },
];

type Lamp = { x: number; y: number; size: number; at: number; seed: number; touched: number | null };
type Building = {
  x: number;
  width: number;
  height: number;
  base: number;
  scale: number;
  kind: "house" | "temple" | "palace";
  lampAt: number;
  lamps: { x: number; y: number }[];
  windows: { x: number; y: number; w: number; h: number }[];
};
type Particle = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; age: number; color: string; drag: number; gravity: number };
type Light = { x: number; y: number; r: number; a: number; color: string };

// ─── Pieces shared with the greeting card ────────────────────────────────────

/** A clay diya `size` wide, sitting on (x, y), lit by `lit` (0..1). */
export function drawDiya(ctx: Ctx, x: number, y: number, size: number, lit: number, seconds: number, seed: number, ambient = 0) {
  const s = size;
  const clay = mix([52, 22, 12], [196, 104, 52], clamp(lit * 0.75 + ambient));
  const shade = mix([24, 10, 6], [120, 52, 22], clamp(lit * 0.7 + ambient));
  const body = ctx.createLinearGradient(x, y - s * 0.12, x, y + s * 0.2);
  body.addColorStop(0, rgb(clay));
  body.addColorStop(1, rgb(shade));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.1);
  ctx.quadraticCurveTo(x - s * 0.44, y + s * 0.2, x, y + s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.38, y + s * 0.2, x + s * 0.5, y - s * 0.02);
  // The spout, where the wick lies.
  ctx.lineTo(x + s * 0.62, y - s * 0.16);
  ctx.lineTo(x + s * 0.34, y - s * 0.12);
  ctx.closePath();
  ctx.fill();
  // Oil in the bowl, and the rim catching the flame.
  ctx.fillStyle = rgb(mix([12, 6, 4], [70, 32, 10], lit));
  ctx.beginPath();
  ctx.ellipse(x - s * 0.04, y - s * 0.1, s * 0.42, s * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgb(mix([70, 34, 18], [255, 190, 120], lit * 0.8), 0.9);
  ctx.lineWidth = s * 0.03;
  ctx.stroke();
  if (lit > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(lit * 1.4);
    flame(ctx, x + s * 0.44, y - s * 0.14, s * 0.62 * (0.4 + 0.6 * lit), seconds, seed);
    ctx.restore();
  }
}

const RANGOLI_COLOURS = {
  white: "#f3ead8",
  yellow: "#f5c518",
  red: "#d42a2a",
  magenta: "#d6246e",
  orange: "#f28a1a",
  green: "#2fb36b",
  blue: "#2a6bd8",
};

/** Paints an eight-fold rangoli filling a `size` square canvas, in dry-powder colours. */
export function paintRangoli(g: Ctx, size: number, seed = 7) {
  const c = size / 2;
  const R = size * 0.47;
  const random = mulberry32(seed);
  g.save();
  g.translate(c, c);
  const petal = (angle: number, from: number, to: number, width: number, fill: string, edge?: string) => {
    g.save();
    g.rotate(angle);
    g.beginPath();
    g.moveTo(0, -from);
    g.bezierCurveTo(width, -from - (to - from) * 0.25, width * 0.9, -to + (to - from) * 0.2, 0, -to);
    g.bezierCurveTo(-width * 0.9, -to + (to - from) * 0.2, -width, -from - (to - from) * 0.25, 0, -from);
    g.fillStyle = fill;
    g.fill();
    if (edge) {
      g.strokeStyle = edge;
      g.lineWidth = R * 0.018;
      g.stroke();
    }
    g.restore();
  };
  // Scalloped white border and a blue ring inside it.
  g.fillStyle = RANGOLI_COLOURS.white;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * TAU;
    g.beginPath();
    g.arc(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93, R * 0.085, 0, TAU);
    g.fill();
  }
  g.fillStyle = RANGOLI_COLOURS.blue;
  g.beginPath();
  g.arc(0, 0, R * 0.92, 0, TAU);
  g.fill();
  g.fillStyle = "#1a0d10";
  g.beginPath();
  g.arc(0, 0, R * 0.82, 0, TAU);
  g.fill();
  for (let i = 0; i < 16; i++) petal((i / 16) * TAU + TAU / 32, R * 0.62, R * 0.86, R * 0.07, RANGOLI_COLOURS.green);
  for (let i = 0; i < 8; i++) petal((i / 8) * TAU + TAU / 16, R * 0.26, R * 0.66, R * 0.14, RANGOLI_COLOURS.orange, RANGOLI_COLOURS.yellow);
  for (let i = 0; i < 8; i++) petal((i / 8) * TAU, R * 0.22, R * 0.8, R * 0.2, RANGOLI_COLOURS.magenta, RANGOLI_COLOURS.yellow);
  for (let i = 0; i < 8; i++) petal((i / 8) * TAU, R * 0.34, R * 0.66, R * 0.07, RANGOLI_COLOURS.white);
  g.fillStyle = RANGOLI_COLOURS.white;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    g.beginPath();
    g.arc(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25, R * 0.022, 0, TAU);
    g.fill();
  }
  g.fillStyle = RANGOLI_COLOURS.yellow;
  g.beginPath();
  g.arc(0, 0, R * 0.2, 0, TAU);
  g.fill();
  for (let i = 0; i < 8; i++) petal((i / 8) * TAU, R * 0.02, R * 0.19, R * 0.06, RANGOLI_COLOURS.red);
  g.fillStyle = RANGOLI_COLOURS.white;
  g.beginPath();
  g.arc(0, 0, R * 0.05, 0, TAU);
  g.fill();
  // Dry powder: the edges crumble a little, and the colour has grain.
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i++) {
    const a = random() * TAU;
    const r = Math.sqrt(random()) * R;
    g.globalAlpha = 0.15 + random() * 0.35;
    g.beginPath();
    g.arc(Math.cos(a) * r, Math.sin(a) * r, R * (0.004 + random() * 0.008), 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.restore();
}

// ─── The scene ───────────────────────────────────────────────────────────────

class Diwali implements Scene {
  private readonly emit: Emit;
  private readonly yama: Lamp = { x: 0, y: 0.66, size: 0.26, at: MOMENTS.yama[0], seed: 0.3, touched: null };
  private readonly step: Lamp[] = [];
  private readonly house: Lamp[] = [];
  private readonly town: Building[] = [];
  private readonly river: { x: number; y: number; seed: number }[] = [];
  private readonly lanterns: { x: number; start: number; seed: number }[] = [];
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private readonly feet: { x: number; y: number; angle: number; left: boolean; at: number }[] = [];
  private particles: Particle[] = [];
  private nextRocket = 0;
  private rockets: { x: number; y: number; vy: number; target: number; color: string }[] = [];
  private rangoli: HTMLCanvasElement | null = null;
  private pours: HTMLCanvasElement | null = null;
  private pressed = false;
  private lastPour = 0;
  private v: View | null = null;
  private lights: Light[] = [];

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(1108);

    // Fourteen lamps along the step, lit from the middle outwards.
    for (let i = 0; i < 14; i++) {
      const x = -1.56 + (i * 3.12) / 13;
      const order = Math.abs(i - 6.5) / 6.5;
      this.step.push({ x, y: 0.14, size: 0.17, at: lerp(MOMENTS.step[0], MOMENTS.step[1], order), seed: random() * 10, touched: null });
    }
    // The house: window sills, then the ledge over the door, then the roof.
    const rows: [number, number, number, number, number][] = [
      // y, from x, to x, count, size
      [-1.46, -2.72, -1.88, 3, 0.13],
      [-1.46, 1.88, 2.72, 3, 0.13],
      [-3.36, -3.3, 3.3, 11, 0.14],
      [-5.32, -3.2, 3.2, 13, 0.14],
    ];
    rows.forEach(([y, from, to, count, size], row) =>
      Array.from({ length: count }, (_, i) => {
        const x = count === 1 ? from : lerp(from, to, i / (count - 1));
        const order = row < 2 ? 0.15 * random() : row === 2 ? 0.25 + 0.3 * (Math.abs(x) / 3.3) : 0.6 + 0.4 * (Math.abs(x) / 3.2);
        this.house.push({ x, y, size, at: lerp(MOMENTS.house[0], MOMENTS.house[1], order), seed: random() * 10, touched: null });
      }),
    );

    // Lakshmi's footprints, walking in past the rangoli to the door.
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = lerp(2.6, 0.28, t) + Math.sin(t * Math.PI) * 0.35;
      const y = lerp(3.05, 0.5, t);
      const next = { x: lerp(2.6, 0.28, t + 0.05) + Math.sin((t + 0.05) * Math.PI) * 0.35, y: lerp(3.05, 0.5, t + 0.05) };
      const angle = Math.atan2(next.y - y, next.x - x) + Math.PI / 2;
      const left = i % 2 === 0;
      const side = left ? -1 : 1;
      this.feet.push({
        x: x + Math.cos(angle) * 0.1 * side,
        y: y + Math.sin(angle) * 0.1 * side,
        angle,
        left,
        at: lerp(MOMENTS.feet[0], MOMENTS.feet[1], t),
      });
    }

    // The town along the river: three rows of houses, a temple and the palace of Ayodhya.
    const rowsOfTown = [
      { base: -2.2, scale: 0.46, from: -60, to: 60 },
      { base: -1.2, scale: 0.68, from: -48, to: 48 },
      { base: 0, scale: 1, from: -38, to: 38 },
    ];
    rowsOfTown.forEach(({ base, scale, from, to }, row) => {
      let x = from;
      while (x < to) {
        const width = (3 + random() * 3.4) * scale;
        const near = row === 2;
        // Leave room for our house in the front row.
        if (near && x + width > -3.52 && x < 3.52) {
          // Close the gap up to our house rather than leave a hole to the sky.
          const room = -3.52 - x;
          if (room > 1.4) this.town.push(this.house_(x, room, base, scale, random));
          x = 3.52;
          continue;
        }
        const kind: Building["kind"] =
          row === 1 && Math.abs(x - 11) < 3 ? "temple" : row === 0 && Math.abs(x + 15) < 3.5 ? "palace" : "house";
        const height = (kind === "temple" ? 13 : kind === "palace" ? 7 : 3.4 + random() * 3.8) * scale;
        const w = kind === "palace" ? 11 * scale : width;
        const lamps: { x: number; y: number }[] = [];
        const count = Math.max(2, Math.floor(w / (0.5 * scale)));
        for (let i = 0; i < count; i++) lamps.push({ x: x + ((i + 0.5) / count) * w, y: base - height });
        if (kind === "temple") {
          for (let i = 1; i < 9; i++) {
            const t = i / 9;
            const half = (w / 2) * (1 - t) ** 0.8;
            lamps.push({ x: x + w / 2 - half, y: base - height * 0.3 - t * height * 0.7 }, { x: x + w / 2 + half, y: base - height * 0.3 - t * height * 0.7 });
          }
        }
        const windows: Building["windows"] = [];
        const floors = Math.floor(height / (1.6 * scale));
        for (let f = 0; f < floors; f++)
          for (let c = 0; c < Math.floor(w / (1.3 * scale)); c++)
            if (random() < 0.55) windows.push({ x: x + (c + 0.35) * 1.3 * scale, y: base - (f + 0.75) * 1.6 * scale, w: 0.45 * scale, h: 0.6 * scale });
        const distance = Math.min(1, Math.abs(x + w / 2) / 40);
        this.town.push({ x, width: w, height, base, scale, kind, lamps, windows, lampAt: MOMENTS.town[0] + distance * 0.085 + random() * 0.012 });
        x += w + (0.12 + random() * 0.3) * scale;
      }
    });

    for (let i = 0; i < 70; i++) this.river.push({ x: -45 + random() * 90, y: WATER + 0.5 + random() ** 1.6 * 14, seed: random() * 10 });
    for (let i = 0; i < 46; i++) this.lanterns.push({ x: -26 + random() * 52, start: MOMENTS.lanterns[0] + random() * 0.17, seed: random() * 10 });
    for (let i = 0; i < 260; i++) this.stars.push({ x: random(), y: random() ** 1.4, r: 0.4 + random() * 1.1, seed: random() * 10 });
  }

  /** A plain house for the town, `width` wide at `x`. */
  private house_(x: number, width: number, base: number, scale: number, random: () => number): Building {
    const height = (3.4 + random() * 3.8) * scale;
    const count = Math.max(2, Math.floor(width / (0.5 * scale)));
    const lamps = Array.from({ length: count }, (_, i) => ({ x: x + ((i + 0.5) / count) * width, y: base - height }));
    const windows: Building["windows"] = [];
    for (let f = 0; f < Math.floor(height / (1.6 * scale)); f++)
      for (let c = 0; c < Math.floor(width / (1.3 * scale)); c++)
        if (random() < 0.55) windows.push({ x: x + (c + 0.35) * 1.3 * scale, y: base - (f + 0.75) * 1.6 * scale, w: 0.45 * scale, h: 0.6 * scale });
    return { x, width, height, base, scale, kind: "house", lamps, windows, lampAt: MOMENTS.town[0] + Math.min(1, Math.abs(x + width / 2) / 40) * 0.085 };
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p, seconds } = f;
    const unit = Math.min(width, height) / 8;
    const v = view(width, height, shot(SHOTS, p), unit, f.portrait ? 0.4 : 0.5);
    this.v = v;
    this.lights = [];
    const dawn = rise(p, MOMENTS.dawn[0], MOMENTS.dawn[1]);
    // At dawn the lamps burn low, all but the first one.
    const burn = 1 - dawn * 0.55;

    this.sky(ctx, v, dawn, seconds);
    ctx.save();
    apply(ctx, v);

    const townLight = rise(p, MOMENTS.town[0], MOMENTS.town[1]);
    // Farthest row first; between the rows, the lanes and roofs of the town, so no sky shows through.
    for (const b of this.town) if (b.base === -2.2) this.building(ctx, v, b, p, seconds, burn, dawn);
    this.lanes(ctx, v, -2.25, -1.2, dawn, townLight);
    for (const b of this.town) if (b.base === -1.2) this.building(ctx, v, b, p, seconds, burn, dawn);
    this.lanes(ctx, v, -1.25, 0, dawn, townLight);
    this.ground(ctx, v, dawn, townLight);
    for (const b of this.town) if (b.base === 0) this.building(ctx, v, b, p, seconds, burn, dawn);

    const houseLit = this.houseLight(p, seconds);
    this.facade(ctx, p, houseLit, dawn, seconds);
    this.drawRangoli(ctx, p, houseLit);
    this.footprints(ctx, p, houseLit);

    const yama = rise(p, MOMENTS.yama[0], MOMENTS.yama[1]);
    this.lamp(ctx, v, this.yama, yama, seconds, houseLit, true);
    for (const lamp of this.step) this.lamp(ctx, v, lamp, rise(p, lamp.at, lamp.at + 0.012) * burn, seconds, houseLit);
    for (const lamp of this.house) this.lamp(ctx, v, lamp, this.lampLit(lamp, p, seconds) * burn, seconds, houseLit);
    this.floating(ctx, v, p, seconds, burn);

    // All the light at once, then its reflection in the river.
    ctx.globalCompositeOperation = "lighter";
    const lamp = glowSprite(LAMP_LIGHT);
    for (const l of this.lights) {
      const sprite = l.color === LAMP_LIGHT ? lamp : glowSprite(l.color);
      glow(ctx, sprite, l.x, l.y, l.r, l.a);
      if (l.y < WATER - 0.1) {
        const ry = WATER + (WATER - l.y) * 0.32;
        const shimmer = 0.75 + 0.25 * Math.sin(seconds * 2.2 + l.x * 3.1);
        ctx.globalAlpha = Math.min(1, l.a * 0.32 * shimmer);
        ctx.drawImage(sprite, l.x - l.r * 0.45, ry - l.r * 1.3, l.r * 0.9, l.r * 2.6);
        ctx.globalAlpha = 1;
      }
    }
    this.skyLanterns(ctx, v, p, seconds, dawn);
    this.fireworks(ctx, v, f);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // The edges of the night.
    const vignette = ctx.createRadialGradient(width / 2, height * 0.5, Math.min(width, height) * 0.3, width / 2, height * 0.5, Math.max(width, height) * 0.8);
    vignette.addColorStop(0, "rgba(3, 2, 6, 0)");
    vignette.addColorStop(1, `rgba(3, 2, 6, ${0.7 - dawn * 0.4})`);
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
    if (!v) return;
    const p = f.p;
    const world = toWorld(v, x, y);

    // Pouring colour on the rangoli while it is being drawn, mirrored eight ways.
    if (p > 0.36 && p < 0.47 && this.pressed && this.pours) {
      const lx = (world.x - RANGOLI.x) / RANGOLI.r;
      const ly = (world.y - RANGOLI.y) / (RANGOLI.r * RANGOLI.squash);
      const r = Math.hypot(lx, ly);
      if (r < 1.02 && f.seconds - this.lastPour > 0.03) {
        this.pour(Math.atan2(ly, lx), r, f.seconds);
        if (f.seconds - this.lastPour > 0.14) this.emit("pour");
        this.lastPour = f.seconds;
      }
      return;
    }
    if (kind !== "down") return;

    // Lighting a lamp by touching it.
    if (p > 0.49 && p < 0.61) {
      let best: Lamp | null = null;
      let distance = Math.max(28, 0.4 * v.scale);
      for (const lamp of this.house) {
        if (lamp.touched !== null || this.lampLit(lamp, p, f.seconds) > 0.5) continue;
        const s = toScreen(v, lamp.x, lamp.y);
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < distance) {
          distance = d;
          best = lamp;
        }
      }
      if (best) {
        best.touched = f.seconds;
        this.emit("light");
      }
      return;
    }

    // A burst wherever the sky is touched.
    if (p > 0.75 && p < 0.89 && world.y < -3) {
      this.burst(world.x, world.y, f.seconds);
      this.emit("burst");
    }
  }

  // ─── Light ─────────────────────────────────────────────────────────────────

  private lampLit(lamp: Lamp, p: number, seconds: number) {
    const scrolled = rise(p, lamp.at, lamp.at + 0.01);
    const touched = lamp.touched === null ? 0 : clamp((seconds - lamp.touched) / 0.35);
    return Math.max(scrolled, touched);
  }

  /** How lit the house front is, from its lamps and its open door. */
  private houseLight(p: number, seconds: number) {
    const lamps = this.house.reduce((sum, lamp) => sum + this.lampLit(lamp, p, seconds), 0) / this.house.length;
    return 0.1 * rise(p, MOMENTS.yama[0], MOMENTS.yama[1]) + 0.2 * rise(p, MOMENTS.step[0], MOMENTS.step[1]) + 0.45 * lamps + 0.25 * rise(p, MOMENTS.door[0], MOMENTS.door[1]);
  }

  private lamp(ctx: Ctx, v: View, lamp: Lamp, lit: number, seconds: number, ambient: number, first = false) {
    if (!onScreen(v, lamp.x, lamp.y, lamp.size * 4)) {
      if (lit > 0.02) this.lights.push({ x: lamp.x, y: lamp.y - lamp.size * 0.3, r: lamp.size * 7, a: 0.5 * lit, color: LAMP_LIGHT });
      return;
    }
    drawDiya(ctx, lamp.x, lamp.y, lamp.size, lit, seconds, lamp.seed, ambient * 0.3);
    if (lit > 0.02) {
      const f = flicker(seconds, lamp.seed);
      const cx = lamp.x + lamp.size * 0.44;
      const cy = lamp.y - lamp.size * 0.35;
      this.lights.push({ x: cx, y: cy, r: lamp.size * (first ? 3.2 : 2.4), a: (first ? 0.75 : 0.5) * lit * f, color: LAMP_LIGHT });
      this.lights.push({ x: cx, y: cy, r: lamp.size * (first ? 16 : 7), a: (first ? 0.42 : 0.07) * lit * f, color: LAMP_LIGHT });
    }
  }

  // ─── Sky ───────────────────────────────────────────────────────────────────

  private sky(ctx: Ctx, v: View, dawn: number, seconds: number) {
    const { width, height } = v;
    const horizon = clamp(toScreen(v, 0, -1).y / height, 0.05, 1.4);
    const top = mix([3, 2, 9], [46, 34, 78], dawn);
    const low = mix([20, 9, 22], [236, 138, 84], dawn);
    const sky = ctx.createLinearGradient(0, 0, 0, height * horizon);
    sky.addColorStop(0, rgb(top));
    sky.addColorStop(0.7, rgb(mix(top, low, 0.45)));
    sky.addColorStop(1, rgb(low));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    // Amavasya: no moon, only stars, which fade into the light of the town and then the dawn.
    const town = 1 - dawn;
    if (town < 0.02) return;
    ctx.fillStyle = "#f2e9d6";
    for (const s of this.stars) {
      const y = s.y * height * horizon * 0.95;
      const twinkle = 0.55 + 0.45 * Math.sin(seconds * (0.8 + s.seed * 0.2) + s.seed * 6);
      ctx.globalAlpha = twinkle * town * (1 - (y / (height * horizon)) * 0.7) * 0.8;
      ctx.fillRect(s.x * width, y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  private skyLanterns(ctx: Ctx, v: View, p: number, seconds: number, dawn: number) {
    const sprite = glowSprite("255, 130, 50");
    for (const l of this.lanterns) {
      const t = p - l.start;
      if (t <= 0) continue;
      const y = -2.6 - t * 150 - Math.min(t, 0.01) * 50;
      const x = l.x + Math.sin(seconds * 0.4 + l.seed) * 0.5 + t * 20 * Math.sin(l.seed);
      const size = 0.5 * (1 - Math.min(0.6, t * 2.2));
      const alpha = rise(t, 0, 0.01) * (1 - rise(y, -34, -40)) * (1 - dawn);
      if (alpha < 0.01 || !onScreen(v, x, y, size * 3)) continue;
      const f = flicker(seconds * 0.5, l.seed);
      glow(ctx, sprite, x, y, size * 5, 0.35 * alpha * f);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = alpha;
      const paper = ctx.createLinearGradient(x, y - size, x, y + size);
      paper.addColorStop(0, "rgba(255, 150, 60, 0.9)");
      paper.addColorStop(1, "rgba(255, 220, 140, 1)");
      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.42, y - size * 0.55);
      ctx.lineTo(x + size * 0.42, y - size * 0.55);
      ctx.lineTo(x + size * 0.32, y + size * 0.55);
      ctx.lineTo(x - size * 0.32, y + size * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
    }
  }

  // ─── Town, river and ground ────────────────────────────────────────────────

  private building(ctx: Ctx, v: View, b: Building, p: number, seconds: number, burn: number, dawn: number) {
    const top = b.base - b.height;
    if (!onScreen(v, b.x + b.width / 2, (b.base + top) / 2, Math.max(b.width, b.height))) return;
    const lit = rise(p, b.lampAt, b.lampAt + 0.02);
    const far = 1 - b.scale;
    const wall = mix(mix([12, 7, 9], [26, 16, 18], far * 0.6), [74, 44, 32], lit * 0.35 * b.scale + dawn * 0.2);
    ctx.fillStyle = rgb(wall);
    const cx = b.x + b.width / 2;
    if (b.kind === "temple") {
      // A nagara shikhara, curving up to the kalash and its flag.
      ctx.beginPath();
      ctx.moveTo(b.x, b.base);
      ctx.lineTo(b.x, b.base - b.height * 0.3);
      ctx.quadraticCurveTo(b.x + b.width * 0.08, top + b.height * 0.1, cx, top);
      ctx.quadraticCurveTo(b.x + b.width * 0.92, top + b.height * 0.1, b.x + b.width, b.base - b.height * 0.3);
      ctx.lineTo(b.x + b.width, b.base);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 0.06 * b.scale, top - 1.4 * b.scale, 0.04 * b.scale, 1.4 * b.scale);
      ctx.fillStyle = rgb(mix([90, 30, 12], [230, 110, 30], lit * 0.7 + dawn * 0.3));
      ctx.beginPath();
      ctx.moveTo(cx - 0.04 * b.scale, top - 1.4 * b.scale);
      ctx.lineTo(cx + 0.8 * b.scale, top - 1.15 * b.scale + Math.sin(seconds * 2) * 0.05);
      ctx.lineTo(cx - 0.04 * b.scale, top - 0.9 * b.scale);
      ctx.fill();
    } else if (b.kind === "palace") {
      ctx.fillRect(b.x, top + b.height * 0.25, b.width, b.height * 0.75);
      // Domes and chhatris along the roof.
      [0.15, 0.5, 0.85].forEach((t, i) => {
        const r = (i === 1 ? 1.5 : 0.9) * b.scale;
        const x = b.x + b.width * t;
        const y = top + b.height * 0.25;
        ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 0.6);
        ctx.beginPath();
        ctx.arc(x, y - r * 0.6, r, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - 0.03 * b.scale, y - r * 1.6 - 0.4 * b.scale, 0.06 * b.scale, 0.5 * b.scale);
      });
    } else {
      ctx.fillRect(b.x, top, b.width, b.height);
      // A parapet line and a little chhatri on some roofs.
      ctx.fillRect(b.x - 0.08 * b.scale, top - 0.12 * b.scale, b.width + 0.16 * b.scale, 0.12 * b.scale);
    }
    // Lit windows, then the lamps along the roofline.
    if (lit > 0.01) {
      ctx.fillStyle = rgb([255, 170, 80], 0.7 * lit * burn);
      for (const w of b.windows) {
        if (b.kind === "temple" && w.y < b.base - b.height * 0.3) continue;
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }
      const sprite = LAMP_LIGHT;
      const r = 0.55 * b.scale;
      const dot = Math.max(0.035, 1.2 / v.scale) * b.scale;
      ctx.fillStyle = rgb([255, 214, 150], lit * burn);
      for (const [i, l] of b.lamps.entries()) {
        const f = flicker(seconds, i + b.x);
        ctx.fillRect(l.x - dot / 2, l.y - dot, dot, dot);
        if (i % 2 === 0 || b.scale > 0.9) this.lights.push({ x: l.x, y: l.y - dot, r: r * (b.scale > 0.9 ? 1.4 : 1), a: 0.55 * lit * burn * f, color: sprite });
      }
      // The whole block glows a little from within.
      this.lights.push({ x: cx, y: b.base - b.height * 0.45, r: Math.max(b.width, b.height) * 0.75, a: 0.08 * lit * burn, color: LAMP_LIGHT });
    }
  }

  private lanes(ctx: Ctx, v: View, from: number, to: number, dawn: number, lit: number) {
    const left = v.x - v.width / v.scale;
    const right = v.x + v.width / v.scale;
    ctx.fillStyle = rgb(mix(mix([10, 6, 8], [30, 18, 16], lit * 0.5), [70, 48, 44], dawn * 0.5));
    ctx.fillRect(left, from, right - left, to - from);
  }

  private ground(ctx: Ctx, v: View, dawn: number, townLight: number) {
    const left = v.x - v.width / v.scale;
    const right = v.x + v.width / v.scale;
    // The courtyard in front of the houses.
    const court = ctx.createLinearGradient(0, 0, 0, 3);
    court.addColorStop(0, rgb(mix([20, 12, 9], [70, 44, 30], dawn * 0.6)));
    court.addColorStop(1, rgb(mix([10, 6, 6], [50, 32, 26], dawn * 0.6)));
    ctx.fillStyle = court;
    ctx.fillRect(left, 0, right - left, 3);
    // Ghats down to the water.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgb(mix([16 - i * 3, 10 - i * 2, 9 - i * 2], [80, 58, 46], dawn * 0.5));
      ctx.fillRect(left, 3 + i * 0.14, right - left, 0.14);
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(left, 3 + i * 0.14 + 0.12, right - left, 0.02);
    }
    // The river: dark, with the sky's colour at dawn, and faint ripples.
    const bottom = v.y + v.height / v.scale;
    const river = ctx.createLinearGradient(0, WATER, 0, Math.max(WATER + 2, bottom));
    river.addColorStop(0, rgb(mix(mix([6, 5, 12], [30, 16, 20], townLight * 0.4), [150, 90, 80], dawn)));
    river.addColorStop(1, rgb(mix([3, 3, 7], [60, 44, 70], dawn)));
    ctx.fillStyle = river;
    ctx.fillRect(left, WATER, right - left, Math.max(2, bottom - WATER));
    ctx.strokeStyle = `rgba(255, 200, 150, ${0.04 + townLight * 0.05})`;
    ctx.lineWidth = 1 / v.scale;
    for (let i = 0; i < 26; i++) {
      const y = WATER + 0.2 + i * i * 0.05;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
  }

  private floating(ctx: Ctx, v: View, p: number, seconds: number, burn: number) {
    const shown = rise(p, 0.62, 0.66);
    if (shown < 0.01) return;
    for (const d of this.river) {
      const x = ((d.x + seconds * 0.12 + 45) % 90) - 45;
      const y = d.y + Math.sin(seconds * 0.8 + d.seed) * 0.03;
      const size = 0.2 * (0.8 + (y - WATER) * 0.05);
      if (!onScreen(v, x, y, size * 6)) continue;
      drawDiya(ctx, x, y, size, shown * burn, seconds, d.seed);
      this.lights.push({ x: x + size * 0.44, y: y - size * 0.4, r: size * 6, a: 0.4 * shown * burn, color: LAMP_LIGHT });
      // Its own reflection, right under it.
      this.lights.push({ x: x + size * 0.44, y: y + size * 0.8, r: size * 3, a: 0.25 * shown * burn, color: LAMP_LIGHT });
    }
  }

  // ─── The house ─────────────────────────────────────────────────────────────

  private facade(ctx: Ctx, p: number, light: number, dawn: number, seconds: number) {
    const lit = clamp(light + dawn * 0.35);
    // Lime-washed walls, warmest near the ground where the lamps are.
    const wall = ctx.createLinearGradient(0, 0, 0, -5.4);
    wall.addColorStop(0, rgb(mix([14, 8, 6], [168, 112, 66], lit)));
    wall.addColorStop(1, rgb(mix([9, 5, 5], [112, 70, 44], lit)));
    ctx.fillStyle = wall;
    ctx.fillRect(-3.5, -5.3, 7, 5.3);
    ctx.fillStyle = rgb(mix([10, 6, 5], [120, 76, 48], lit));
    ctx.fillRect(-3.5, -0.34, 7, 0.34);
    // Parapet with little arches.
    ctx.fillStyle = rgb(mix([12, 7, 6], [140, 92, 56], lit));
    ctx.fillRect(-3.62, -5.36, 7.24, 0.14);
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(-3.2 + i * 0.58 + 0.29, -5.1, 0.16, Math.PI, 0);
      ctx.fillStyle = rgb(mix([6, 3, 3], [60, 36, 24], lit));
      ctx.fill();
    }
    // The ledge over the door.
    ctx.fillStyle = rgb(mix([12, 7, 6], [150, 98, 60], lit));
    ctx.fillRect(-3.72, -3.36, 7.44, 0.16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(-3.6, -3.2, 7.2, 0.12);

    // Jali windows.
    for (const x of [-2.3, 2.3]) {
      ctx.fillStyle = rgb(mix([6, 3, 3], [40, 22, 14], lit));
      ctx.fillRect(x - 0.55, -2.75, 1.1, 1.25);
      ctx.strokeStyle = rgb(mix([18, 11, 8], [160, 110, 70], lit));
      ctx.lineWidth = 0.04;
      ctx.strokeRect(x - 0.55, -2.75, 1.1, 1.25);
      ctx.lineWidth = 0.02;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 0.55 + i * 0.183, -2.75);
        ctx.lineTo(x - 0.55 + i * 0.183, -1.5);
        ctx.moveTo(x - 0.55, -2.75 + i * 0.208);
        ctx.lineTo(x + 0.55, -2.75 + i * 0.208);
        ctx.stroke();
      }
    }

    // The door: a carved frame, and inside, the puja lit for Lakshmi.
    const door = rise(p, MOMENTS.door[0], MOMENTS.door[1]);
    ctx.fillStyle = rgb(mix([14, 8, 6], [92, 50, 26], lit));
    ctx.fillRect(-1.02, -3.08, 2.04, 3.08);
    const inside = ctx.createRadialGradient(0, -1.0, 0.1, 0, -1.2, 2.2);
    inside.addColorStop(0, rgb(mix([6, 3, 3], [255, 196, 110], door)));
    inside.addColorStop(0.5, rgb(mix([4, 2, 2], [170, 90, 36], door)));
    inside.addColorStop(1, rgb(mix([3, 2, 2], [40, 18, 10], door)));
    ctx.fillStyle = inside;
    ctx.beginPath();
    ctx.moveTo(-0.78, 0);
    ctx.lineTo(-0.78, -2.3);
    ctx.quadraticCurveTo(-0.78, -2.9, 0, -2.95);
    ctx.quadraticCurveTo(0.78, -2.9, 0.78, -2.3);
    ctx.lineTo(0.78, 0);
    ctx.closePath();
    ctx.fill();
    if (door > 0.01) {
      // The little shrine inside: a kalash, and a lamp before it.
      ctx.fillStyle = `rgba(120, 50, 12, ${door})`;
      ctx.beginPath();
      ctx.ellipse(0, -0.55, 0.22, 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(-0.09, -0.92, 0.18, 0.14);
      ctx.fillStyle = `rgba(60, 120, 40, ${door})`;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 0.07, -0.98, 0.04, 0.12, i * 0.35, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(200, 60, 20, ${door})`;
      ctx.beginPath();
      ctx.arc(0, -1.1, 0.08, 0, TAU);
      ctx.fill();
      this.lights.push({ x: 0, y: -1.2, r: 2.6, a: 0.55 * door, color: DOOR_LIGHT });
      this.lights.push({ x: 0, y: -0.3, r: 1.4, a: 0.5 * door * flicker(seconds, 2), color: DOOR_LIGHT });
    }
    // Door panels, swung open.
    ctx.fillStyle = rgb(mix([10, 5, 4], [80, 40, 20], lit));
    ctx.fillRect(-0.78, -2.3, 0.18, 2.3);
    ctx.fillRect(0.6, -2.3, 0.18, 2.3);

    // Toran of mango leaves and marigolds across the top of the door, and garlands down its sides.
    const marigold = rgb(mix([60, 26, 6], [250, 150, 20], lit * 1.1));
    const leaf = rgb(mix([10, 20, 8], [52, 120, 40], lit));
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = lerp(-1.02, 1.02, t);
      const y = -3.02 + Math.sin(t * Math.PI) * 0.14;
      if (i % 2 === 0) {
        ctx.fillStyle = leaf;
        ctx.beginPath();
        ctx.moveTo(x - 0.05, y);
        ctx.quadraticCurveTo(x, y + 0.34, x + 0.05, y);
        ctx.fill();
      } else {
        ctx.fillStyle = marigold;
        ctx.beginPath();
        ctx.arc(x, y + 0.02, 0.06, 0, TAU);
        ctx.fill();
      }
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 5 === 4 ? leaf : marigold;
        ctx.beginPath();
        ctx.arc(side * 0.94, -2.9 + i * 0.13, 0.055, 0, TAU);
        ctx.fill();
      }
    }

    // A star lantern (akash kandil) hanging from the ledge.
    const kandil = rise(p, 0.5, 0.52);
    const kx = 3.0 + Math.sin(seconds * 0.7) * 0.03;
    ctx.strokeStyle = rgb(mix([20, 12, 8], [120, 80, 50], lit));
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(3.0, -3.2);
    ctx.lineTo(kx, -2.85);
    ctx.stroke();
    ctx.fillStyle = rgb(mix([50, 12, 10], [240, 70, 40], clamp(kandil + lit * 0.3)));
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const r = i % 2 === 0 ? 0.36 : 0.15;
      ctx.lineTo(kx + Math.cos(a) * r, -2.45 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb(mix([40, 20, 8], [255, 200, 60], kandil), 0.9);
    for (let i = 0; i < 5; i++) ctx.fillRect(kx - 0.12 + i * 0.06, -2.1, 0.012, 0.28);
    if (kandil > 0.01) this.lights.push({ x: kx, y: -2.45, r: 1.3, a: 0.5 * kandil * flicker(seconds * 0.6, 4), color: "255, 110, 60" });

    // The step at the threshold.
    ctx.fillStyle = rgb(mix([18, 11, 8], [132, 92, 64], lit));
    ctx.fillRect(-1.75, 0, 3.5, 0.26);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(-1.75, 0.22, 3.5, 0.04);
  }

  // ─── Rangoli and footprints ────────────────────────────────────────────────

  private ensureRangoli() {
    if (this.rangoli) return;
    const size = 640;
    this.rangoli = document.createElement("canvas");
    this.rangoli.width = this.rangoli.height = size;
    paintRangoli(this.rangoli.getContext("2d")!, size);
    this.pours = document.createElement("canvas");
    this.pours.width = this.pours.height = size;
  }

  private pour(angle: number, r: number, seconds: number) {
    this.ensureRangoli();
    const g = this.pours!.getContext("2d")!;
    const size = this.pours!.width;
    const R = size * 0.47;
    const colours = Object.values(RANGOLI_COLOURS);
    const colour = colours[Math.floor(seconds * 1.5) % colours.length];
    g.save();
    g.translate(size / 2, size / 2);
    g.fillStyle = colour;
    for (let k = 0; k < 8; k++) {
      for (const mirror of [1, -1]) {
        const a = mirror * angle + (k / 8) * TAU;
        const x = Math.cos(a) * r * R;
        const y = Math.sin(a) * r * R;
        for (let i = 0; i < 6; i++) {
          g.globalAlpha = 0.5 + Math.random() * 0.5;
          g.beginPath();
          g.arc(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 14, 2 + Math.random() * 5, 0, TAU);
          g.fill();
        }
      }
    }
    g.restore();
  }

  private drawRangoli(ctx: Ctx, p: number, light: number) {
    const reveal = rise(p, MOMENTS.rangoli[0], MOMENTS.rangoli[1]);
    if (reveal < 0.001) return;
    this.ensureRangoli();
    const { x, y, r, squash } = RANGOLI;
    const shade = clamp(0.35 + light * 0.9);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash);
    // Poured from the middle outwards.
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.02 * reveal, 0, TAU);
    ctx.clip();
    ctx.globalAlpha = shade;
    ctx.drawImage(this.rangoli!, -r, -r, r * 2, r * 2);
    ctx.drawImage(this.pours!, -r, -r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.restore();
    if (reveal < 1) this.lights.push({ x, y: y + r * squash * reveal * 0.2, r: r * reveal * 1.2, a: 0.1, color: "255, 220, 180" });
  }

  private footprints(ctx: Ctx, p: number, light: number) {
    for (const foot of this.feet) {
      const shown = rise(p, foot.at, foot.at + 0.008);
      if (shown < 0.01) continue;
      ctx.save();
      ctx.translate(foot.x, foot.y);
      ctx.scale(1, 0.6);
      ctx.rotate(foot.angle);
      ctx.globalAlpha = shown * (0.6 + light * 0.4);
      ctx.fillStyle = "#c81e1e";
      // Sole and heel, then five toes.
      ctx.beginPath();
      ctx.ellipse(0, 0.02, 0.055, 0.1, 0, 0, TAU);
      ctx.fill();
      const side = foot.left ? -1 : 1;
      [0.024, 0.018, 0.016, 0.014, 0.012].forEach((toe, i) => {
        ctx.beginPath();
        ctx.arc(side * (-0.04 + i * 0.022), -0.115 + Math.abs(i - 1) * 0.008, toe, 0, TAU);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // ─── Fireworks ─────────────────────────────────────────────────────────────

  private burst(x: number, y: number, seconds: number) {
    const palettes = ["255, 200, 90", "255, 90, 80", "120, 255, 160", "200, 170, 255", "255, 255, 230"];
    const colour = palettes[Math.floor((seconds * 7 + x) % palettes.length + palettes.length) % palettes.length];
    const count = 110;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.1;
      const speed = 7 + Math.random() * 4.5;
      this.particles.push({ x, y, px: x, py: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1.6 + Math.random() * 0.8, age: 0, color: colour, drag: 1.4, gravity: 3.2 });
    }
  }

  private fireworks(ctx: Ctx, v: View, f: Frame) {
    const { p, dt, seconds } = f;
    const active = rise(p, MOMENTS.fireworks[0], MOMENTS.fireworks[0] + 0.02) * (1 - rise(p, MOMENTS.fireworks[1] - 0.02, MOMENTS.fireworks[1]));

    if (f.reduced) {
      // No motion: a few bursts, held still.
      if (active < 0.01) return;
      const sprite = glowSprite("255, 200, 90");
      [[-8, -16], [7, -19], [0, -13]].forEach(([bx, by]) => {
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * TAU;
          glow(ctx, sprite, bx + Math.cos(a) * 3.5, by + Math.sin(a) * 3.5, 0.5, 0.6 * active);
        }
      });
      return;
    }

    if (active > 0.1 && seconds > this.nextRocket) {
      this.nextRocket = seconds + 0.35 + Math.random() * 0.6;
      this.rockets.push({ x: -22 + Math.random() * 44, y: -2.5, vy: -18 - Math.random() * 6, target: -13 - Math.random() * 11, color: "255, 220, 150" });
    }
    // Anar fountains in the street.
    if (active > 0.1) {
      for (const ax of [-9, 6.5, 19, -21]) {
        for (let i = 0; i < 2; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          const speed = 5 + Math.random() * 3;
          this.particles.push({ x: ax, y: 2.2, px: ax, py: 2.2, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.8 + Math.random() * 0.5, age: 0, color: "255, 190, 90", drag: 0.8, gravity: 9 });
        }
      }
    }
    this.rockets = this.rockets.filter((r) => {
      r.y += r.vy * dt;
      this.particles.push({ x: r.x, y: r.y, px: r.x, py: r.y + 0.3, vx: (Math.random() - 0.5) * 0.5, vy: 1, life: 0.4, age: 0, color: r.color, drag: 2, gravity: 2 });
      if (r.y > r.target) return true;
      this.burst(r.x, r.y, seconds);
      this.emit("rocket");
      return false;
    });

    ctx.lineCap = "round";
    const alive: Particle[] = [];
    for (const q of this.particles) {
      q.age += dt;
      if (q.age >= q.life) continue;
      q.px = q.x;
      q.py = q.y;
      const drag = Math.exp(-q.drag * dt);
      q.vx *= drag;
      q.vy = q.vy * drag + q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      alive.push(q);
      const fade = 1 - q.age / q.life;
      if (!onScreen(v, q.x, q.y, 1)) continue;
      ctx.strokeStyle = `rgba(${q.color}, ${fade})`;
      ctx.lineWidth = Math.max(0.05, 1.8 / v.scale);
      ctx.beginPath();
      ctx.moveTo(q.px - q.vx * 0.03, q.py - q.vy * 0.03);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      if (Math.random() < 0.3) glow(ctx, glowSprite(q.color), q.x, q.y, 0.6, 0.35 * fade);
    }
    this.particles = alive.length > 4000 ? alive.slice(-4000) : alive;
  }
}

export function createScene(emit: Emit): Scene {
  return new Diwali(emit);
}
