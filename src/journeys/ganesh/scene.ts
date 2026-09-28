// Ganeshotsav, following Bappa from start to end: grey shadu clay in a murtikar's workshop, painted
// and given his eyes, then veiled and brought home through the streets behind a dhol-tasha
// pathak; unveiled on the makhar for the aarti; ten days in a lit pandal; the long Anant
// Chaturdashi procession; and at last the sea at Girgaon Chowpatty under the moon, where he
// sinks and the waves bring back only marigolds.
//
// World units, y down: Bappa sits on (0, 0) and is about 2.6 tall, so his head is near y = -1.5.
// Each place is a "set" drawn around him; the camera and the sets change with the scroll, and
// between two sets the next one fades in over the last.
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
  toWorld,
  view,
  type Ctx,
  type RGB,
  type Shot,
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";
import { Murti, drawDurva, drawHibiscus, drawModak, paintEyes, paintOfferings, paintVeil } from "./murti";

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  paint: [0.095, 0.155],
  eyes: [0.16, 0.176],
  veil: [0.184, 0.2],
  aagman: [0.215, 0.33],
  unveil: [0.336, 0.352],
  aarti: [0.36, 0.455],
  city: [0.49, 0.595],
  procession: [0.615, 0.725],
  sea: [0.745, 1],
  sink: [0.8, 0.87],
} as const;

type SetId = "workshop" | "street" | "home" | "city" | "procession" | "sea";
const ORDER: SetId[] = ["workshop", "street", "home", "city", "procession", "sea"];
/** Where one set fades into the next. */
const CUTS: [number, number][] = [
  [0.198, 0.215],
  [0.33, 0.346],
  [0.47, 0.49],
  [0.595, 0.615],
  [0.725, 0.745],
];

const SHOTS: Shot[] = [
  { at: 0.0, x: 0, y: -0.45, zoom: 1.05 },
  { at: 0.075, x: 0.35, y: -1.0, zoom: 1.3 },
  { at: 0.11, x: 0.5, y: -1.2, zoom: 1.55 },
  { at: 0.15, x: 0.45, y: -1.3, zoom: 1.9 },
  { at: 0.17, x: 0.2, y: -1.5, zoom: 3.4 },
  { at: 0.18, x: 0.2, y: -1.5, zoom: 3.4 },
  { at: 0.2, x: 0.3, y: -1.3, zoom: 1.6 },
  { at: 0.235, x: 1.7, y: -1.6, zoom: 0.8 },
  { at: 0.315, x: 2.0, y: -1.5, zoom: 0.74 },
  { at: 0.345, x: 0.3, y: -1.3, zoom: 1.3 },
  { at: 0.375, x: 0.6, y: -1.2, zoom: 1.5 },
  { at: 0.45, x: 0.5, y: -1.25, zoom: 1.35 },
  { at: 0.5, x: 0, y: -2.0, zoom: 0.52 },
  { at: 0.585, x: 0, y: -2.2, zoom: 0.46 },
  { at: 0.625, x: 1.0, y: -1.8, zoom: 0.6 },
  { at: 0.715, x: 1.2, y: -1.8, zoom: 0.56 },
  { at: 0.76, x: 0, y: -1.7, zoom: 0.6 },
  { at: 0.8, x: 0, y: -1.3, zoom: 0.74 },
  { at: 0.87, x: 0, y: -1.2, zoom: 0.7 },
  { at: 1.0, x: 0.6, y: -2.6, zoom: 0.52 },
];

const HORIZON = -3.4;
/** How much bigger the Anant Chaturdashi murti is than the one brought home. */
const BIG = 1.45;
const SHORE = 2.6;
const MOON = { x: 4.6, y: -5.9, r: 0.5 };
const LAMP = "255, 170, 80";
const DARK: RGB = [16, 9, 12];
const CLOTHES: RGB[] = [
  [196, 40, 64],
  [46, 92, 156],
  [214, 168, 56],
  [84, 142, 92],
  [226, 222, 210],
  [150, 62, 140],
  [236, 120, 40],
];
const GULAL = ["236, 58, 120", "222, 30, 72", "255, 120, 170", "250, 150, 40"];

type Role = "dhol" | "tasha" | "jhanj" | "flag" | "cheer" | "walk" | "fold";
type Figure = { x: number; y: number; h: number; role: Role; seed: number; tone: number };
type Pose = { x: number; y: number; s: number };
type Puff = { x: number; y: number; vx: number; vy: number; r: number; grow: number; age: number; life: number; color: string };
type Flower = { x: number; depth: number; born: number; seed: number; kind: "marigold" | "hibiscus" | "durva" };
type Building = { x: number; w: number; h: number; wall: RGB; floors: number; windows: { x: number; y: number; lit: number }[] };
type Bulb = { x: number; y: number; i: number };

const frac = (x: number) => x - Math.floor(x);

/** The part of the world the view can see. */
function bounds(v: View) {
  return { left: v.x - v.ax / v.scale, right: v.x + (v.width - v.ax) / v.scale, top: v.y - v.ay / v.scale, bottom: v.y + (v.height - v.ay) / v.scale };
}

/** A vertical sky gradient behind everything, in screen space. */
function sky(g: Ctx, v: View, stops: [number, RGB][]) {
  const gradient = g.createLinearGradient(0, 0, 0, v.height);
  for (const [at, colour] of stops) gradient.addColorStop(clamp(at), rgb(colour));
  g.fillStyle = gradient;
  g.fillRect(0, 0, v.width, v.height);
}

/** Screen y (0..1) of a world y. */
const screenY = (v: View, y: number) => (v.ay + (y - v.y) * v.scale) / v.height;

// ─── People ───────────────────────────────────────────────────────────────────

/** A swallow-tailed saffron dhwaj on a pole top (x, y), `size` long, blowing out to `side`. */
function dhwaj(g: Ctx, x: number, y: number, size: number, lean: number, seconds: number, seed: number, lit: number, side = 1) {
  const drop = size * 0.62;
  const ax = Math.sin(lean) * drop * 0.2;
  const colour = rgb(mix([40, 16, 8], [246, 124, 22], lit));
  const wave = (u: number) => Math.sin(u * 5.5 - seconds * 5 + seed) * size * 0.09 * u;
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    top.push([x + side * size * u, y + drop * u * 0.12 + wave(u)]);
    bottom.push([x - ax + side * size * u * 0.96, y + drop * (1 - u * 0.12) + wave(u)]);
  }
  g.beginPath();
  top.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.lineTo(x + side * size * 0.72, y + drop * 0.5 + wave(0.72));
  for (let i = bottom.length - 1; i >= 0; i--) g.lineTo(bottom[i][0], bottom[i][1]);
  g.closePath();
  g.fillStyle = colour;
  g.fill();
  g.strokeStyle = rgb(mix([30, 10, 6], [200, 80, 10], lit), 0.8);
  g.lineWidth = size * 0.02;
  g.stroke();
}

/**
 * One person standing on (x, y), `h` tall: the pathak in white kurtas and saffron pheta playing
 * dhol, tasha or jhanj, or carrying the dhwaj, and the crowd around them. `beat` counts beats.
 */
function person(g: Ctx, f: Figure, beat: number, seconds: number, lit: number) {
  const { x, y, h, role, seed } = f;
  const pathak = role === "dhol" || role === "tasha" || role === "jhanj" || role === "flag";
  const bob = Math.abs(Math.sin((beat + seed) * Math.PI)) * h * 0.018;
  const cloth = rgb(mix(DARK, pathak ? [236, 228, 212] : CLOTHES[f.tone], lit * (pathak ? 1 : 0.8)));
  const skin = rgb(mix(DARK, [150, 92, 62], lit));
  const shoulder = y - h * 0.79 - bob;
  // Legs, kurta, head.
  g.fillStyle = rgb(mix(DARK, pathak ? [210, 200, 184] : CLOTHES[(f.tone + 3) % CLOTHES.length], lit * 0.7));
  g.fillRect(x - h * 0.085, y - h * 0.4, h * 0.075, h * 0.4);
  g.fillRect(x + h * 0.012, y - h * 0.4, h * 0.075, h * 0.4);
  g.fillStyle = cloth;
  g.beginPath();
  g.moveTo(x - h * 0.13, shoulder);
  g.quadraticCurveTo(x, shoulder - h * 0.03, x + h * 0.13, shoulder);
  g.lineTo(x + h * 0.16, y - h * 0.34);
  g.lineTo(x - h * 0.16, y - h * 0.34);
  g.closePath();
  g.fill();
  const hy = y - h * 0.885 - bob;
  const r = h * 0.066;
  g.fillStyle = skin;
  g.beginPath();
  g.arc(x, hy, r, 0, TAU);
  g.fill();
  if (pathak) {
    // The saffron pheta, its tail blowing behind.
    g.fillStyle = rgb(mix(DARK, [244, 128, 26], lit));
    g.beginPath();
    g.ellipse(x, hy - r * 0.45, r * 1.22, r * 0.78, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(x + r * 0.6, hy - r * 0.2);
    g.quadraticCurveTo(x + r * 1.8, hy + r * (0.6 + 0.3 * Math.sin(seconds * 4 + seed * 9)), x + r * 1.5, hy + r * 1.9);
    g.lineTo(x + r * 0.9, hy + r * 1.3);
    g.closePath();
    g.fill();
  } else {
    g.fillStyle = rgb(mix(DARK, [30, 20, 18], lit));
    g.beginPath();
    g.arc(x, hy - r * 0.25, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    g.fill();
  }

  // Arms, and what they hold.
  const arm = (sx: number, ex: number, ey: number, hx: number, hy2: number) => {
    g.strokeStyle = cloth;
    g.lineWidth = h * 0.055;
    g.beginPath();
    g.moveTo(sx, shoulder + h * 0.02);
    g.lineTo(ex, ey);
    g.lineTo(hx, hy2);
    g.stroke();
    g.fillStyle = skin;
    g.beginPath();
    g.arc(hx, hy2, h * 0.03, 0, TAU);
    g.fill();
  };
  const L = x - h * 0.12;
  const R = x + h * 0.12;
  g.lineCap = "round";
  g.lineJoin = "round";
  if (role === "dhol") {
    const cy = y - h * 0.5;
    const w = h * 0.44;
    const hh = h * 0.27;
    const lift = Math.pow(frac(beat + seed * 0.1), 0.5);
    g.fillStyle = rgb(mix(DARK, [148, 42, 26], lit));
    g.beginPath();
    g.roundRect(x - w / 2, cy - hh / 2, w, hh, hh * 0.3);
    g.fill();
    g.strokeStyle = rgb(mix(DARK, [236, 206, 150], lit * 0.8));
    g.lineWidth = h * 0.008;
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = x - w * 0.42 + (i / 8) * w * 0.84;
      g.lineTo(px, cy + (i % 2 ? hh * 0.42 : -hh * 0.42));
    }
    g.stroke();
    g.fillStyle = rgb(mix(DARK, [232, 216, 184], lit));
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + (s * w) / 2, cy, hh * 0.16, hh * 0.52, 0, 0, TAU);
      g.fill();
    }
    // The heavy toka on the right head, the thin cane on the left.
    const hx = x + w * 0.5 + h * 0.04;
    const hyR = cy - h * 0.12 - lift * h * 0.2;
    arm(R, R + h * 0.1, cy - h * 0.06, hx, hyR);
    g.strokeStyle = rgb(mix(DARK, [120, 70, 40], lit));
    g.lineWidth = h * 0.028;
    g.beginPath();
    g.moveTo(hx, hyR);
    g.lineTo(hx - h * 0.02, hyR + h * (0.16 - lift * 0.1));
    g.stroke();
    arm(L, L - h * 0.08, cy - h * 0.05, x - w * 0.5 - h * 0.02, cy - h * 0.06);
  } else if (role === "tasha") {
    const cy = y - h * 0.6;
    g.fillStyle = rgb(mix(DARK, [120, 64, 30], lit));
    g.beginPath();
    g.ellipse(x, cy, h * 0.15, h * 0.08, 0, 0, Math.PI);
    g.fill();
    g.fillStyle = rgb(mix(DARK, [232, 216, 184], lit));
    g.beginPath();
    g.ellipse(x, cy, h * 0.15, h * 0.035, 0, 0, TAU);
    g.fill();
    const a = Math.abs(Math.sin((beat + seed) * TAU * 2));
    const b = Math.abs(Math.cos((beat + seed) * TAU * 2));
    arm(L, L - h * 0.04, cy - h * 0.05, x - h * 0.07, cy - h * 0.08 - a * h * 0.1);
    arm(R, R + h * 0.04, cy - h * 0.05, x + h * 0.07, cy - h * 0.08 - b * h * 0.1);
    g.strokeStyle = rgb(mix(DARK, [200, 170, 120], lit));
    g.lineWidth = h * 0.012;
    g.beginPath();
    g.moveTo(x - h * 0.07, cy - h * 0.08 - a * h * 0.1);
    g.lineTo(x - h * 0.02, cy - h * 0.01);
    g.moveTo(x + h * 0.07, cy - h * 0.08 - b * h * 0.1);
    g.lineTo(x + h * 0.02, cy - h * 0.01);
    g.stroke();
  } else if (role === "jhanj") {
    const open = Math.abs(Math.sin((beat + seed) * Math.PI));
    const cy = y - h * 0.72;
    for (const s of [-1, 1]) {
      const hx = x + s * h * (0.04 + open * 0.1);
      arm(s < 0 ? L : R, x + s * h * 0.16, cy + h * 0.06, hx, cy);
      g.fillStyle = rgb(mix(DARK, [240, 196, 90], lit));
      g.beginPath();
      g.ellipse(hx + s * h * 0.01, cy, h * 0.02, h * 0.06, 0, 0, TAU);
      g.fill();
    }
  } else if (role === "flag") {
    const lean = Math.sin(seconds * 1.3 + seed * 5) * 0.26;
    const bx = x + h * 0.02;
    const by = y - h * 0.5;
    const len = h * 2.3;
    const tx = bx + Math.sin(lean) * len;
    const ty = by - Math.cos(lean) * len;
    arm(L, L - h * 0.02, shoulder - h * 0.08, lerp(bx, tx, 0.18), lerp(by, ty, 0.18));
    arm(R, R + h * 0.06, shoulder - h * 0.02, lerp(bx, tx, 0.08), lerp(by, ty, 0.08));
    g.strokeStyle = rgb(mix(DARK, [150, 110, 70], lit));
    g.lineWidth = h * 0.03;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(tx, ty);
    g.stroke();
    dhwaj(g, tx, ty, h * 1.1, lean, seconds, seed * 7, lit, seed > 0.5 ? 1 : -1);
  } else if (role === "cheer") {
    const pump = Math.sin((beat + seed) * Math.PI) * h * 0.06;
    arm(R, R + h * 0.1, shoulder - h * 0.15, R + h * 0.1, shoulder - h * 0.34 - pump);
    if (seed > 0.45) arm(L, L - h * 0.1, shoulder - h * 0.15, L - h * 0.1, shoulder - h * 0.34 + pump * 0.5);
    else arm(L, L - h * 0.04, y - h * 0.58, L - h * 0.03, y - h * 0.44);
  } else if (role === "fold") {
    arm(L, x - h * 0.13, y - h * 0.6, x - h * 0.01, y - h * 0.72);
    arm(R, x + h * 0.13, y - h * 0.6, x + h * 0.01, y - h * 0.72);
  } else {
    const swing = Math.sin((beat + seed) * Math.PI) * h * 0.04;
    arm(L, L - h * 0.03, y - h * 0.6, L - h * 0.04 + swing, y - h * 0.44);
    arm(R, R + h * 0.03, y - h * 0.6, R + h * 0.04 - swing, y - h * 0.44);
  }
}

/** A string of little lights between two points, sagging, twinkling in turn. */
function lightString(g: Ctx, lights: { x: number; y: number; a: number; c: string }[], x0: number, y0: number, x1: number, y1: number, sag: number, count: number, seconds: number, seed: number, colours = ["255, 196, 90", "255, 90, 70", "120, 200, 255", "140, 255, 150"]) {
  g.strokeStyle = "rgba(20, 12, 10, 0.8)";
  g.lineWidth = 0.012;
  g.beginPath();
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = lerp(x0, x1, t);
    const y = lerp(y0, y1, t) + Math.sin(t * Math.PI) * sag;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
    const c = colours[(((i + Math.floor(seconds * 2 + seed)) % colours.length) + colours.length) % colours.length];
    lights.push({ x, y: y + 0.03, a: 0.55 + 0.45 * Math.sin(seconds * 3 + i * 1.7 + seed), c });
  }
  g.stroke();
}

/** Marigold and mango-leaf bunting swagged from x0 to x1. */
function toran(g: Ctx, x0: number, x1: number, y: number, sag: number, count: number, lit: number, size = 0.07) {
  const marigold = rgb(mix([40, 20, 6], [250, 150, 20], lit));
  const deep = rgb(mix([40, 16, 6], [226, 96, 16], lit));
  const leaf = rgb(mix([8, 16, 6], [52, 120, 40], lit));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = lerp(x0, x1, t);
    const yy = y + Math.sin(t * Math.PI) * sag;
    if (i % 3 === 1) {
      g.fillStyle = leaf;
      g.beginPath();
      g.moveTo(x - size * 0.7, yy);
      g.quadraticCurveTo(x, yy + size * 4.5, x + size * 0.7, yy);
      g.fill();
    } else {
      g.fillStyle = i % 2 ? deep : marigold;
      g.beginPath();
      g.arc(x, yy + size * 0.3, size, 0, TAU);
      g.fill();
    }
  }
}

// ─── The scene ────────────────────────────────────────────────────────────────

type Part = "back" | "front";
type Light = { x: number; y: number; a: number; c: string };

class Ganeshotsav implements Scene {
  private readonly emit: Emit;
  private readonly murti = new Murti();
  private v: View | null = null;
  private layer: HTMLCanvasElement | null = null;
  private lights: Light[] = [];
  private puffs: Puff[] = [];
  private flowers: Flower[] = [];
  private pressed = false;
  private lastThrow = 0;
  private seeded = false;
  private readonly thali = { x: 0, y: -0.5, tx: 0, ty: -0.5, touched: -10, angle: Math.PI, travelled: 0, trail: [] as { x: number; y: number }[] };

  private readonly shelves: { x: number; y: number; h: number; paint: number }[] = [];
  private readonly motes: { x: number; y: number; seed: number }[] = [];
  private readonly buildings: Building[] = [];
  private readonly towers: Building[] = [];
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private readonly bulbs: Bulb[] = [];
  private readonly necklace: { x: number; y: number }[] = [];
  private readonly pathak: Figure[] = [];
  private readonly followers: Figure[] = [];
  private readonly darshan: Figure[] = [];
  private readonly mirvanuk: Figure[] = [];
  private readonly shore: Figure[] = [];

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(1893);

    // The workshop: two shelves of murtis waiting for colour, some done already.
    for (const [y, h, from, to] of [[-2.9, 0.62, -9, 9], [-1.25, 0.8, -9, 9]] as const) {
      for (let x = from; x < to; x += h * (0.95 + random() * 0.3)) {
        if (Math.abs(x) < 1.7 && y > -2) continue;
        this.shelves.push({ x, y, h: h * (0.8 + random() * 0.3), paint: random() < 0.4 ? Math.floor(random() * 4) : -1 });
      }
    }
    for (let i = 0; i < 46; i++) this.motes.push({ x: -2 + random() * 4.4, y: -3.4 + random() * 3.6, seed: random() * 10 });

    // A street of chawls: long balconies, one room to a window.
    for (let x = -24; x < 24; ) {
      const w = 2.4 + random() * 2.2;
      const floors = 4 + Math.floor(random() * 4);
      const windows: Building["windows"] = [];
      const cols = Math.max(2, Math.floor(w / 0.62));
      for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) windows.push({ x: x + ((c + 0.5) / cols) * w, y: 0.4 - (fl + 0.62) * 0.92, lit: random() < 0.6 ? 0.5 + random() * 0.5 : 0 });
      const wall = CLOTHES[Math.floor(random() * 5)];
      this.buildings.push({ x, w, h: floors * 0.92 + 0.3, wall: mix(wall, [200, 180, 160], 0.55), floors, windows });
      x += w + 0.08 + random() * 0.2;
    }
    // The city behind the pandal.
    for (let x = -40; x < 40; ) {
      const w = 1.6 + random() * 2.4;
      const h = 3 + random() ** 1.5 * 11;
      const windows: Building["windows"] = [];
      for (let i = 0; i < Math.min(40, h * w * 1.4); i++) windows.push({ x: x + 0.15 + random() * (w - 0.3), y: 0.5 - 0.3 - random() * (h - 0.5), lit: random() < 0.5 ? 0.4 + random() * 0.6 : 0 });
      this.towers.push({ x, w, h, wall: [22, 22, 40], floors: 0, windows });
      x += w + random() * 0.6;
    }
    for (let i = 0; i < 160; i++) this.stars.push({ x: random(), y: random() ** 1.3 * 0.6, r: 0.5 + random(), seed: random() * 10 });

    // Bulbs outlining the pandal: its arch, its walls and its domes.
    const add = (pts: [number, number][], spacing: number) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k];
        const [x1, y1] = pts[k + 1];
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / spacing));
        for (let i = 0; i < n; i++) this.bulbs.push({ x: lerp(x0, x1, i / n), y: lerp(y0, y1, i / n), i: this.bulbs.length });
      }
    };
    add(this.archPoints(), 0.2);
    add([[-4.6, 0.9], [-4.6, -5.2], [4.6, -5.2], [4.6, 0.9]], 0.24);
    for (const s of [-1, 1]) {
      const dome: [number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        dome.push([s * 3.8 + Math.cos(a) * 0.75, -5.2 + Math.sin(a) * 0.95]);
      }
      add(dome, 0.2);
    }
    const big: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      big.push([Math.cos(a) * 1.6, -5.2 + Math.sin(a) * 1.9]);
    }
    add(big, 0.2);
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * TAU;
      this.bulbs.push({ x: Math.cos(a) * 1.18, y: -1.5 + Math.sin(a) * 1.18, i: this.bulbs.length });
    }

    // Marine Drive's lights, the Queen's Necklace, curving round the bay.
    for (let i = 0; i < 90; i++) {
      const t = i / 89;
      this.necklace.push({ x: lerp(-46, -5, t), y: HORIZON - 0.05 - Math.sin(t * Math.PI * 0.9) * 0.22 + (random() - 0.5) * 0.03 });
    }

    // The pathak on the way home: dhwaj, dhols, tashas and jhanj, in two rows.
    const roles: Role[] = ["flag", "dhol", "tasha", "dhol", "jhanj", "dhol", "tasha", "flag", "dhol", "tasha", "dhol"];
    roles.forEach((role, i) => {
      const back = i % 2 === 1;
      this.pathak.push({ x: 2.1 + i * 0.62 + random() * 0.1, y: back ? 0.86 : 1.02, h: back ? 1.42 : 1.56, role, seed: random(), tone: 0 });
    });
    this.pathak.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 16; i++) {
      const x = -1.7 - random() * 7;
      this.followers.push({ x, y: 0.9 + random() * 0.3, h: 1.35 + random() * 0.2, role: random() < 0.55 ? "cheer" : "walk", seed: random(), tone: Math.floor(random() * CLOTHES.length) });
    }
    for (let i = 0; i < 26; i++) this.followers.push({ x: -8 + random() * 18, y: 1.7 + random() * 0.8, h: 1.6 + random() * 0.2, role: random() < 0.5 ? "cheer" : "walk", seed: random(), tone: Math.floor(random() * CLOTHES.length) });
    this.followers.sort((a, b) => a.y - b.y);

    // The darshan queue before the pandal.
    for (let i = 0; i < 90; i++) {
      const y = 1.35 + random() ** 0.8 * 2.6;
      this.darshan.push({ x: -9 + random() * 18, y, h: 1.05 + (y - 1.3) * 0.22, role: random() < 0.45 ? "fold" : random() < 0.5 ? "cheer" : "walk", seed: random(), tone: Math.floor(random() * CLOTHES.length) });
    }
    this.darshan.sort((a, b) => a.y - b.y);

    // Anant Chaturdashi: a bigger pathak ahead of the truck, and the whole city behind.
    const loud: Role[] = ["flag", "dhol", "dhol", "tasha", "dhol", "jhanj", "dhol", "tasha", "flag", "dhol", "dhol", "tasha", "dhol", "flag"];
    loud.forEach((role, i) => {
      const back = i % 2 === 0;
      this.mirvanuk.push({ x: -3.7 - i * 0.58 - random() * 0.1, y: back ? 0.9 : 1.06, h: back ? 1.3 : 1.42, role, seed: random(), tone: 0 });
    });
    for (let i = 0; i < 70; i++) {
      const y = 1.45 + random() ** 0.9 * 2.3;
      const x = -13 + random() * 22;
      // Flags only out with the pathak, where they will not wave across him or the words.
      const flag = x < -4.5 && random() < 0.14;
      this.mirvanuk.push({ x, y, h: 1.2 + (y - 1.4) * 0.3, role: flag ? "flag" : "cheer", seed: flag ? random() * 0.45 : random(), tone: Math.floor(random() * CLOTHES.length) });
    }
    this.mirvanuk.sort((a, b) => a.y - b.y);

    // The crowd on the sand at Chowpatty.
    for (let i = 0; i < 50; i++) {
      const y = SHORE + 0.5 + random() ** 0.8 * 1.8;
      this.shore.push({ x: -12 + random() * 24, y: y + 0.3, h: 1.15 + (y - SHORE) * 0.18, role: random() < 0.5 ? "fold" : "cheer", seed: random(), tone: Math.floor(random() * CLOTHES.length) });
    }
    this.shore.sort((a, b) => a.y - b.y);
  }

  private archPoints(): [number, number][] {
    const pts: [number, number][] = [[-1.9, 0.9], [-1.9, -2.9]];
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const x = lerp(-1.9, 1.9, t);
      // A cusped Maratha arch, peaked at the top.
      const y = -2.9 - Math.pow(Math.sin(t * Math.PI), 0.7) * 1.4 - Math.abs(Math.sin(t * Math.PI * 5)) * 0.12;
      pts.push([x, y]);
    }
    pts.push([1.9, 0.9]);
    return pts;
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p } = f;
    const ratio = ctx.getTransform().a || 1;
    const focus = shot(SHOTS, p);
    if (f.portrait) {
      // Phones: closer in, and centred, since the captions run along the bottom.
      focus.zoom *= 1.3 * lerp(1, 1.35, clamp((1.2 - focus.zoom) / 0.7));
      focus.x *= 0.3;
    }
    const v = view(width, height, focus, Math.min(width, height) / 8, f.portrait ? 0.4 : 0.5);
    this.v = v;
    this.update(f);
    const { a, b, t } = this.cut(p);
    this.pass(ctx, f, v, ratio, a, b, t, "back");
    this.bappa(ctx, f, v, this.pose(a, b, t, f));
    this.pass(ctx, f, v, ratio, a, b, t, "front");

    const vignette = ctx.createRadialGradient(width / 2, height * 0.45, Math.min(width, height) * 0.3, width / 2, height * 0.5, Math.max(width, height) * 0.78);
    vignette.addColorStop(0, "rgba(6, 3, 4, 0)");
    vignette.addColorStop(1, "rgba(6, 3, 4, 0.62)");
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
    // Waving the aarti: the thali follows the hand.
    if (p > 0.36 && p < 0.465) {
      this.thali.tx = clamp(world.x, -1.6, 1.6);
      this.thali.ty = clamp(world.y, -2.4, 0.4);
      this.thali.touched = f.seconds;
      return;
    }
    // Throwing gulal in the street.
    if ((p > 0.215 && p < 0.335) || (p > 0.61 && p < 0.735)) {
      if (kind === "move" && (!this.pressed || f.seconds - this.lastThrow < 0.12)) return;
      this.lastThrow = f.seconds;
      this.throwGulal(world.x, world.y, 26);
      this.emit("gulal");
      return;
    }
    // A flower for the sea.
    if (p > 0.76 && kind === "down" && world.y > HORIZON + 0.25 && world.y < SHORE) {
      this.flowers.push({ x: world.x, depth: world.y, born: f.seconds, seed: Math.random() * 10, kind: Math.random() < 0.75 ? "marigold" : "hibiscus" });
      if (this.flowers.length > 90) this.flowers.shift();
      this.emit("flower");
    }
  }

  // ─── Sets, cuts and the murti ────────────────────────────────────────────────

  private cut(p: number): { a: SetId; b: SetId; t: number } {
    let i = 0;
    for (const [k, [from, to]] of CUTS.entries()) {
      if (p >= to) i = k + 1;
      else if (p > from) return { a: ORDER[k], b: ORDER[k + 1], t: rise(p, from, to) };
    }
    return { a: ORDER[i], b: ORDER[i], t: 0 };
  }

  private pass(ctx: Ctx, f: Frame, v: View, ratio: number, a: SetId, b: SetId, t: number, part: Part) {
    if (t <= 0.001 || a === b) return this.part(ctx, f, v, a, part);
    if (t >= 0.999) return this.part(ctx, f, v, b, part);
    if (part === "back") {
      this.part(ctx, f, v, a, part);
      this.blend(ctx, ratio, t, (g) => this.part(g, f, v, b, part));
    } else {
      this.blend(ctx, ratio, 1 - t, (g) => this.part(g, f, v, a, part));
      this.blend(ctx, ratio, t, (g) => this.part(g, f, v, b, part));
    }
  }

  /** Draws `paint` into an offscreen layer and lays it over `ctx` at `alpha`. */
  private blend(ctx: Ctx, ratio: number, alpha: number, paint: (g: Ctx) => void) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (!this.layer) this.layer = document.createElement("canvas");
    if (this.layer.width !== w || this.layer.height !== h) {
      this.layer.width = w;
      this.layer.height = h;
    }
    const g = this.layer.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(g);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.layer, 0, 0);
    ctx.restore();
  }

  private part(g: Ctx, f: Frame, v: View, id: SetId, part: Part) {
    g.save();
    this.lights = [];
    if (id === "workshop") this.workshop(g, f, v, part);
    else if (id === "street") this.street(g, f, v, part, false);
    else if (id === "home") this.home(g, f, v, part);
    else if (id === "city") this.city(g, f, v, part);
    else if (id === "procession") this.street(g, f, v, part, true);
    else this.sea(g, f, v, part);
    g.restore();
  }

  /** Additive light for everything collected in `lights`, in world space. */
  private shine(g: Ctx, size: number, strength = 1) {
    g.globalCompositeOperation = "lighter";
    for (const l of this.lights) glow(g, glowSprite(l.c), l.x, l.y, size, l.a * strength);
    g.globalCompositeOperation = "source-over";
    this.lights = [];
  }

  private seaPose(f: Frame): Pose & { water: number } {
    const out = rise(f.p, 0.762, 0.8);
    const s = lerp(1, 0.8, out);
    const base = lerp(0.35, -0.55, out);
    const sink = rise(f.p, MOMENTS.sink[0], MOMENTS.sink[1]);
    return { x: 0, y: base + sink * 2.95 * s, s, water: base - 0.12 * s };
  }

  private pose(a: SetId, b: SetId, t: number, f: Frame): Pose {
    const one = (id: SetId): Pose => {
      if (id === "street") return { x: 0, y: -Math.abs(Math.sin(f.seconds * 2.6)) * 0.03, s: 1 };
      if (id === "procession") return { x: 0, y: -Math.abs(Math.sin(f.seconds * 1.8)) * 0.03, s: BIG };
      if (id === "sea") return this.seaPose(f);
      return { x: 0, y: 0, s: 1 };
    };
    const pa = one(a);
    if (a === b || t <= 0) return pa;
    const pb = one(b);
    return { x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t), s: lerp(pa.s, pb.s, t) };
  }

  /** How far into the night the sea is. */
  private night(p: number) {
    return rise(p, 0.745, 0.86);
  }

  private bappa(ctx: Ctx, f: Frame, v: View, pose: Pose) {
    const { p, seconds } = f;
    ctx.save();
    apply(ctx, v);
    ctx.translate(pose.x, pose.y);
    ctx.scale(pose.s, pose.s);
    const paint = rise(p, MOMENTS.paint[0], MOMENTS.paint[1]);
    const front = (x: number) => lerp(0.2, -2.72, paint) + 0.05 * Math.sin(x * 7 + 1) + 0.03 * Math.sin(x * 17);
    if (paint < 1) this.murti.draw(ctx, "clay", 0, 0, 1);
    if (paint > 0) {
      ctx.save();
      if (paint < 1) {
        // The colour rises up him from the seat, brushstroke by brushstroke.
        ctx.beginPath();
        ctx.moveTo(-1.5, 0.4);
        for (let x = -1.5; x <= 1.501; x += 0.05) ctx.lineTo(x, front(x));
        ctx.lineTo(1.5, 0.4);
        ctx.closePath();
        ctx.clip();
      }
      this.murti.draw(ctx, "paint", 0, 0, 1);
      ctx.restore();
    }
    if (paint > 0.01 && paint < 0.99) {
      const bx = Math.sin(seconds * 2.2) * 0.7;
      this.brush(ctx, bx, front(bx), "#e8622a");
    }
    const eyes = rise(p, MOMENTS.eyes[0], MOMENTS.eyes[1]);
    paintEyes(ctx, eyes);
    if (eyes > 0.02 && eyes < 0.98) this.brush(ctx, (eyes < 0.5 ? -0.17 : 0.17) + Math.sin(seconds * 5) * 0.03, -1.51, "#140806", 0.5);
    paintOfferings(ctx, rise(p, 0.35, 0.37));
    paintVeil(ctx, rise(p, MOMENTS.veil[0], MOMENTS.veil[1]) * (1 - rise(p, MOMENTS.unveil[0], MOMENTS.unveil[1])), seconds);
    const night = this.night(p);
    if (night > 0.01) this.murti.draw(ctx, "shadow", 0, 0, 1, night * 0.42);
    ctx.restore();
  }

  /** The murtikar's brush, its tip at (x, y). */
  private brush(g: Ctx, x: number, y: number, colour: string, size = 1) {
    g.save();
    g.translate(x, y);
    g.scale(size, size);
    g.rotate(-0.5);
    g.fillStyle = "#8a5a2e";
    g.fillRect(-0.018, -0.9, 0.036, 0.72);
    g.fillStyle = "#c9c2b4";
    g.fillRect(-0.022, -0.2, 0.044, 0.08);
    g.fillStyle = colour;
    g.beginPath();
    g.moveTo(-0.022, -0.12);
    g.quadraticCurveTo(-0.026, -0.03, 0, 0);
    g.quadraticCurveTo(0.026, -0.03, 0.022, -0.12);
    g.fill();
    g.restore();
  }

  // ─── Particles ──────────────────────────────────────────────────────────────

  private throwGulal(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = 0.8 + Math.random() * 2.2;
      this.puffs.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 0.18 + Math.random() * 0.2, grow: 0.5 + Math.random() * 0.6, age: 0, life: 2 + Math.random() * 2.5, color: GULAL[Math.floor(Math.random() * GULAL.length)] });
    }
    if (this.puffs.length > 320) this.puffs.splice(0, this.puffs.length - 320);
  }

  private update(f: Frame) {
    const { p, dt, seconds } = f;
    // The crowd throws gulal on its own, far more on Anant Chaturdashi.
    const street = p > 0.2 && p < 0.34;
    const procession = p > 0.6 && p < 0.74;
    if (!f.reduced && (street || procession) && Math.random() < dt * (procession ? 7 : 3)) {
      this.throwGulal(procession ? -12 + Math.random() * 16 : -6 + Math.random() * 14, procession ? 0.6 + Math.random() * 1.2 : 0.3 + Math.random() * 0.8, procession ? 14 : 9);
    }
    if (f.reduced && (street || procession) && this.puffs.length === 0) {
      // No motion: a haze of gulal already hanging in the air.
      const random = mulberry32(7);
      for (let i = 0; i < 40; i++) {
        this.puffs.push({ x: -10 + random() * 18, y: -0.5 + random() * 2, vx: 0, vy: 0, r: 0.5 + random() * 0.9, grow: 0, age: 1, life: 1e9, color: GULAL[i % GULAL.length] });
      }
    }
    this.puffs = this.puffs.filter((q) => {
      q.age += dt;
      const drag = Math.exp(-1.8 * dt);
      q.vx = q.vx * drag + 0.12 * dt;
      q.vy = q.vy * drag - 0.08 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.r += q.grow * dt;
      return q.age < q.life;
    });

    // The aarti thali: round and round clockwise, unless a hand is waving it.
    const t = this.thali;
    t.angle += dt * 2.3;
    const waving = seconds - t.touched < 1.6;
    const tx = waving ? t.tx : Math.sin(t.angle) * 0.62;
    const ty = waving ? t.ty : -1.05 - Math.cos(t.angle) * 0.55;
    const k = f.reduced ? 1 : 1 - Math.exp(-dt * (waving ? 12 : 7));
    const nx = lerp(t.x, tx, k);
    const ny = lerp(t.y, ty, k);
    if (p > 0.36 && p < 0.46) {
      t.travelled += Math.hypot(nx - t.x, ny - t.y);
      if (t.travelled > 1.4) {
        t.travelled = 0;
        this.emit("wave");
      }
    }
    t.x = nx;
    t.y = ny;
    t.trail.push({ x: nx, y: ny });
    if (t.trail.length > 24) t.trail.shift();

    // Once he has gone under, the sea brings back the flowers he wore.
    if (p > MOMENTS.sink[0] + 0.03 && !this.seeded) {
      this.seeded = true;
      const random = mulberry32(14);
      const water = this.seaPose(f).water;
      for (let i = 0; i < 26; i++) {
        this.flowers.push({ x: (random() - 0.5) * 3.2, depth: water + (random() - 0.35) * 1.4, born: seconds - random() * 2, seed: random() * 10, kind: i % 5 === 0 ? "durva" : i % 4 === 0 ? "hibiscus" : "marigold" });
      }
    }
    if (p < MOMENTS.sink[0] - 0.02 && this.seeded) {
      this.seeded = false;
      this.flowers = this.flowers.filter((fl) => fl.born < 0);
    }
  }

  private drawPuffs(g: Ctx, v: View, alpha = 1) {
    for (const q of this.puffs) {
      if (!onScreen(v, q.x, q.y, q.r)) continue;
      const fade = Math.min(1, q.age * 4) * (1 - q.age / q.life);
      glow(g, glowSprite(q.color), q.x, q.y, q.r, 0.32 * fade * alpha);
    }
  }

  // ─── I. The workshop ────────────────────────────────────────────────────────

  /** A small murti on a shelf: clay grey, or already painted. */
  private mini(g: Ctx, x: number, y: number, h: number, paint: number, lit: number) {
    const colours: RGB[] = [
      [232, 100, 44],
      [240, 160, 130],
      [236, 186, 64],
      [228, 90, 90],
    ];
    const clay: RGB = [168, 158, 142];
    const skin = rgb(mix(DARK, paint < 0 ? clay : colours[paint], lit));
    const gold = rgb(mix(DARK, paint < 0 ? [186, 176, 160] : [236, 186, 70], lit));
    const cloth = rgb(mix(DARK, paint < 0 ? [150, 140, 126] : [236, 180, 40], lit));
    g.fillStyle = gold;
    g.fillRect(x - h * 0.36, y - h * 0.1, h * 0.72, h * 0.1);
    g.fillStyle = cloth;
    g.beginPath();
    g.ellipse(x, y - h * 0.16, h * 0.36, h * 0.1, 0, 0, TAU);
    g.fill();
    g.fillStyle = skin;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + s * h * 0.2, y - h * 0.62, h * 0.17, h * 0.14, s * 0.2, 0, TAU);
      g.fill();
    }
    g.beginPath();
    g.ellipse(x, y - h * 0.33, h * 0.27, h * 0.2, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(x, y - h * 0.62, h * 0.15, h * 0.15, 0, 0, TAU);
    g.fill();
    g.strokeStyle = skin;
    g.lineWidth = h * 0.08;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x, y - h * 0.58);
    g.quadraticCurveTo(x - h * 0.02, y - h * 0.4, x + h * 0.1, y - h * 0.38);
    g.stroke();
    g.fillStyle = gold;
    g.beginPath();
    g.moveTo(x - h * 0.13, y - h * 0.72);
    g.lineTo(x, y - h * 1.0);
    g.lineTo(x + h * 0.13, y - h * 0.72);
    g.closePath();
    g.fill();
    // Shade the side away from the bulb.
    g.fillStyle = "rgba(10, 6, 4, 0.25)";
    g.beginPath();
    g.ellipse(x - h * 0.12, y - h * 0.4, h * 0.2, h * 0.4, 0, 0, TAU);
    g.fill();
  }

  private workshop(g: Ctx, f: Frame, v: View, part: Part) {
    const { seconds } = f;
    const bulb = { x: 0.9, y: -3.25 };
    apply(g, v);
    const b = bounds(v);
    if (part === "back") {
      const wall = g.createRadialGradient(bulb.x, bulb.y + 1, 0.3, bulb.x, bulb.y + 1.5, 9);
      wall.addColorStop(0, "#7a5638");
      wall.addColorStop(0.35, "#4a3222");
      wall.addColorStop(1, "#140d09");
      g.fillStyle = wall;
      g.fillRect(b.left, b.top, b.right - b.left, 0.6 - b.top);
      // Old limewash, patched: a few paler streaks.
      g.fillStyle = "rgba(255, 230, 190, 0.035)";
      for (let i = 0; i < 9; i++) g.fillRect(-8 + i * 1.9, -6, 0.5 + (i % 3) * 0.3, 6);
      for (const y of [-2.9, -1.25]) {
        g.fillStyle = "#5a3a22";
        g.fillRect(b.left, y, b.right - b.left, 0.09);
        g.fillStyle = "rgba(0, 0, 0, 0.35)";
        g.fillRect(b.left, y + 0.09, b.right - b.left, 0.1);
      }
      for (const m of this.shelves) {
        if (m.x + m.h < b.left || m.x - m.h > b.right) continue;
        const lit = clamp(1 - Math.hypot(m.x - bulb.x, (m.y - bulb.y) * 1.4) / 9) * 0.85 + 0.12;
        this.mini(g, m.x, m.y, m.h, m.paint, lit);
      }
      // Big murtis for the mandals, still in clay, and one under a cloth.
      this.mini(g, -3.4, 0.55, 2.3, -1, 0.4);
      this.mini(g, 3.5, 0.55, 2.1, -1, 0.45);
      const cloth = g.createLinearGradient(-6.2, 0, -4.5, 0);
      for (let i = 0; i <= 6; i++) cloth.addColorStop(i / 6, i % 2 ? "#4a1418" : "#5e1c1e");
      g.fillStyle = cloth;
      g.beginPath();
      g.moveTo(-6.3, 0.55);
      g.quadraticCurveTo(-6.4, -0.6, -6.0, -1.1);
      g.quadraticCurveTo(-6.3, -1.9, -5.4, -2.3);
      g.quadraticCurveTo(-4.5, -1.9, -4.8, -1.1);
      g.quadraticCurveTo(-4.4, -0.6, -4.5, 0.55);
      g.closePath();
      g.fill();
      const floor = g.createLinearGradient(0, 0.5, 0, 4);
      floor.addColorStop(0, "#3a281a");
      floor.addColorStop(1, "#120c08");
      g.fillStyle = floor;
      g.fillRect(b.left, 0.55, b.right - b.left, Math.max(1, b.bottom - 0.55));
      // The turntable stand he is made on.
      g.fillStyle = "#6a4426";
      g.fillRect(-1.1, 0.04, 2.2, 0.14);
      g.fillStyle = "#3e2716";
      g.fillRect(-0.95, 0.18, 0.12, 0.44);
      g.fillRect(0.83, 0.18, 0.12, 0.44);
      g.fillRect(-1.1, 0.16, 2.2, 0.04);
      return;
    }
    // Pots of colour and brushes on a stool.
    g.fillStyle = "#4a2e1a";
    g.fillRect(1.55, 0.24, 1.0, 0.08);
    g.fillRect(1.62, 0.32, 0.07, 0.3);
    g.fillRect(2.41, 0.32, 0.07, 0.3);
    ["#e8622a", "#f2b01e", "#1f8a4c", "#e87890", "#f4efe2"].forEach((c, i) => {
      const x = 1.66 + i * 0.19;
      g.fillStyle = "#2a1a10";
      g.beginPath();
      g.ellipse(x, 0.2, 0.08, 0.05, 0, 0, TAU);
      g.fill();
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(x, 0.17, 0.065, 0.025, 0, 0, TAU);
      g.fill();
    });
    g.strokeStyle = "#8a5a2e";
    g.lineWidth = 0.025;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(2.46 + i * 0.03, 0.2);
      g.lineTo(2.52 + i * 0.07, -0.25);
      g.stroke();
    }
    // The one bulb, and dust turning in its light.
    g.strokeStyle = "#1a120c";
    g.lineWidth = 0.02;
    g.beginPath();
    g.moveTo(bulb.x, b.top);
    g.lineTo(bulb.x, bulb.y - 0.12);
    g.stroke();
    g.fillStyle = "#fff4d8";
    g.beginPath();
    g.ellipse(bulb.x, bulb.y, 0.07, 0.09, 0, 0, TAU);
    g.fill();
    g.globalCompositeOperation = "lighter";
    const cone = g.createLinearGradient(0, bulb.y, 0, 0.6);
    cone.addColorStop(0, "rgba(255, 200, 130, 0.14)");
    cone.addColorStop(1, "rgba(255, 200, 130, 0)");
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(bulb.x - 0.08, bulb.y);
    g.lineTo(bulb.x + 0.08, bulb.y);
    g.lineTo(bulb.x + 2.2, 0.6);
    g.lineTo(bulb.x - 3.4, 0.6);
    g.closePath();
    g.fill();
    const warm = glowSprite(LAMP);
    glow(g, warm, bulb.x, bulb.y, 0.5, 0.9);
    glow(g, warm, bulb.x, bulb.y, 3.2, 0.3);
    glow(g, warm, 0.2, -1.3, 2.6, 0.14);
    const dust = glowSprite("255, 226, 180", 32);
    for (const m of this.motes) {
      const x = m.x + Math.sin(seconds * 0.2 + m.seed) * 0.3;
      const y = m.y + Math.sin(seconds * 0.13 + m.seed * 2) * 0.25;
      glow(g, dust, x, y, 0.035, 0.35 + 0.3 * Math.sin(seconds + m.seed * 3));
    }
    g.globalCompositeOperation = "source-over";
  }

  // ─── II and V. The street: aagman at dusk, and the Anant Chaturdashi night ──

  private chawl(g: Ctx, bd: Building, x: number, lit: number, night: boolean) {
    const top = 0.4 - bd.h;
    const dx = x - bd.x;
    g.fillStyle = rgb(mix(DARK, bd.wall, lit * (night ? 0.3 : 0.55)));
    g.fillRect(x, top, bd.w, bd.h);
    g.fillStyle = rgb(mix(DARK, bd.wall, lit * (night ? 0.4 : 0.7)));
    g.fillRect(x - 0.06, top - 0.12, bd.w + 0.12, 0.14);
    for (let fl = 0; fl < bd.floors; fl++) {
      // Each floor's long balcony and its railing.
      const y = 0.4 - fl * 0.92 - 0.14;
      g.fillStyle = rgb(mix(DARK, [60, 50, 50], lit * 0.6));
      g.fillRect(x - 0.08, y, bd.w + 0.16, 0.08);
      g.fillStyle = "rgba(0, 0, 0, 0.3)";
      g.fillRect(x, y + 0.08, bd.w, 0.06);
    }
    for (const w of bd.windows) {
      g.fillStyle = w.lit ? `rgba(255, ${night ? 180 : 196}, ${night ? 100 : 120}, ${w.lit * (night ? 0.9 : 0.55)})` : "rgba(8, 5, 6, 0.75)";
      g.fillRect(w.x + dx - 0.15, w.y - 0.2, 0.3, 0.42);
      if (night && w.lit > 0.8) this.lights.push({ x: w.x + dx, y: w.y, a: 0.12, c: LAMP });
    }
  }

  private street(g: Ctx, f: Frame, v: View, part: Part, night: boolean) {
    const { seconds } = f;
    const lit = night ? 0.72 : 0.9;
    const beat = seconds / (night ? 0.52 : 0.6);
    const people = night ? this.mirvanuk : [...this.pathak, ...this.followers];
    if (part === "back") {
      if (night)
        sky(g, v, [
          [0, [6, 5, 16]],
          [screenY(v, -6), [34, 12, 36]],
          [screenY(v, 0), [140, 44, 80]],
        ]);
      else
        sky(g, v, [
          [0, [34, 26, 68]],
          [screenY(v, -6), [156, 72, 96]],
          [screenY(v, -1.5), [246, 150, 90]],
        ]);
      g.save();
      apply(g, v);
      const b = bounds(v);
      const drift = (night ? 1 : -1) * seconds * 0.35;
      for (const bd of this.buildings) {
        const x = (((bd.x + drift + 24) % 48) + 48) % 48 - 24;
        if (x + bd.w < b.left || x > b.right) continue;
        this.chawl(g, bd, x, lit, night);
      }
      // Bunting and strings of lights across the street, moving past with the buildings.
      const period = 4.6;
      const shift = (((drift % period) + period) % period) - period;
      for (let x = Math.floor(b.left / period) * period + shift; x < b.right + period; x += period) {
        lightString(g, this.lights, x, -3.7, x + period, -3.7, 0.4, 16, seconds, x);
        for (let i = 0; i < 9; i++) {
          const t = (i + 0.5) / 9;
          const bx = x + t * period;
          const by = -4.6 + Math.sin(t * Math.PI) * 0.3;
          g.fillStyle = i % 2 ? rgb(mix(DARK, [246, 124, 22], lit)) : rgb(mix(DARK, [240, 230, 214], lit * 0.8));
          g.beginPath();
          g.moveTo(bx - 0.13, by);
          g.lineTo(bx + 0.13, by);
          g.lineTo(bx, by + 0.3);
          g.closePath();
          g.fill();
        }
      }
      g.fillStyle = rgb(mix(DARK, [90, 76, 70], lit * 0.6));
      g.fillRect(b.left, 0.4, b.right - b.left, 0.2);
      const road = g.createLinearGradient(0, 0.6, 0, 4);
      road.addColorStop(0, night ? "#2a1422" : "#3a2a2a");
      road.addColorStop(1, "#0e080a");
      g.fillStyle = road;
      g.fillRect(b.left, 0.6, b.right - b.left, Math.max(1, b.bottom - 0.6));
      // Gulal already on the road.
      g.fillStyle = night ? "rgba(236, 58, 120, 0.2)" : "rgba(236, 58, 120, 0.1)";
      g.fillRect(b.left, 0.6, b.right - b.left, 0.8);
      if (night) {
        // Searchlights from the truck, sweeping.
        g.globalCompositeOperation = "lighter";
        for (const s of [-1, 1]) {
          const a = s * 0.35 + Math.sin(seconds * 0.5 + s) * 0.3;
          const beam = g.createLinearGradient(s * 1.6, -2.8, s * 1.6 + Math.sin(a) * 12, -2.8 - Math.cos(a) * 12);
          beam.addColorStop(0, "rgba(255, 220, 190, 0.16)");
          beam.addColorStop(1, "rgba(255, 220, 190, 0)");
          g.fillStyle = beam;
          g.beginPath();
          g.moveTo(s * 1.6, -2.8);
          g.lineTo(s * 1.6 + Math.sin(a - 0.07) * 12, -2.8 - Math.cos(a - 0.07) * 12);
          g.lineTo(s * 1.6 + Math.sin(a + 0.07) * 12, -2.8 - Math.cos(a + 0.07) * 12);
          g.closePath();
          g.fill();
        }
        g.globalCompositeOperation = "source-over";
      }
      this.shine(g, 0.5, 0.45);
      for (const fig of people) if (fig.y < 1.3) person(g, fig, beat, seconds, lit);
      if (night) {
        g.save();
        g.translate(0, this.pose("procession", "procession", 0, f).y);
        g.scale(BIG, BIG);
        this.truck(g, f, lit);
        g.restore();
      } else this.cart(g, f, lit);
      this.shine(g, 0.35);
      g.restore();
      return;
    }
    apply(g, v);
    for (const fig of people) if (fig.y >= 1.3) person(g, fig, beat, seconds, lit * 0.8);
    this.drawPuffs(g, v, night ? 1.2 : 1);
    g.globalCompositeOperation = "lighter";
    glow(g, glowSprite(night ? "255, 120, 170" : LAMP), 0, -1.4, 3.2, night ? 0.12 : 0.1);
    g.globalCompositeOperation = "source-over";
    if (night) {
      // The air itself pink with gulal.
      const ratio = g.canvas.width / v.width;
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      const haze = g.createLinearGradient(0, 0, 0, v.height);
      haze.addColorStop(0, "rgba(236, 58, 120, 0)");
      haze.addColorStop(1, "rgba(236, 58, 120, 0.16)");
      g.fillStyle = haze;
      g.fillRect(0, 0, v.width, v.height);
    }
  }

  private cart(g: Ctx, f: Frame, lit: number) {
    // Two men pushing from behind.
    person(g, { x: -1.5, y: 0.95, h: 1.5, role: "walk", seed: 0.3, tone: 4 }, f.seconds / 0.6, f.seconds, lit);
    g.fillStyle = rgb(mix(DARK, [120, 72, 40], lit));
    g.beginPath();
    g.roundRect(-1.15, 0.03, 2.3, 0.26, 0.04);
    g.fill();
    toran(g, -1.15, 1.15, 0.29, 0.08, 24, lit, 0.055);
    for (const s of [-1, 1]) {
      const cx = s * 0.8;
      g.fillStyle = rgb(mix(DARK, [60, 40, 30], lit));
      g.beginPath();
      g.arc(cx, 0.66, 0.25, 0, TAU);
      g.fill();
      g.strokeStyle = rgb(mix(DARK, [160, 120, 80], lit));
      g.lineWidth = 0.03;
      for (let i = 0; i < 4; i++) {
        const a = f.seconds * 1.6 + (i / 4) * Math.PI;
        g.beginPath();
        g.moveTo(cx - Math.cos(a) * 0.22, 0.66 - Math.sin(a) * 0.22);
        g.lineTo(cx + Math.cos(a) * 0.22, 0.66 + Math.sin(a) * 0.22);
        g.stroke();
      }
    }
  }

  private truck(g: Ctx, f: Frame, lit: number) {
    const { seconds } = f;
    // A gold arch of bulbs over him on the trailer.
    g.strokeStyle = rgb(mix(DARK, [200, 150, 60], lit));
    g.lineWidth = 0.1;
    g.beginPath();
    g.moveTo(-1.75, 0.05);
    g.lineTo(-1.75, -2.4);
    g.quadraticCurveTo(-1.6, -3.5, 0, -3.6);
    g.quadraticCurveTo(1.6, -3.5, 1.75, -2.4);
    g.lineTo(1.75, 0.05);
    g.stroke();
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const [x, y] = t < 0.3 ? [-1.75, lerp(0.05, -2.4, t / 0.3)] : t > 0.7 ? [1.75, lerp(-2.4, 0.05, (t - 0.7) / 0.3)] : [lerp(-1.75, 1.75, (t - 0.3) / 0.4), -2.4 - Math.sin(((t - 0.3) / 0.4) * Math.PI) * 1.15];
      const on = 0.5 + 0.5 * Math.sin(seconds * 6 - i * 0.9);
      g.fillStyle = `rgba(255, 236, 190, ${0.5 + on * 0.5})`;
      g.fillRect(x - 0.04, y - 0.04, 0.08, 0.08);
      this.lights.push({ x, y, a: 0.4 * on, c: i % 3 ? LAMP : "255, 90, 140" });
    }
    // The cab, garlanded, heading the way the drums go.
    g.fillStyle = rgb(mix(DARK, [70, 40, 60], lit));
    g.beginPath();
    g.roundRect(-3.3, -0.95, 1.3, 1.45, 0.12);
    g.fill();
    g.fillStyle = "rgba(255, 210, 160, 0.28)";
    g.fillRect(-3.15, -0.8, 0.8, 0.5);
    toran(g, -3.3, -2.0, -0.95, 0.25, 12, lit, 0.06);
    g.fillStyle = rgb(mix(DARK, [90, 50, 60], lit));
    g.fillRect(-2.1, 0.03, 4.2, 0.42);
    toran(g, -2.1, 2.1, 0.45, 0.1, 40, lit, 0.06);
    for (let i = 0; i < 26; i++) {
      const x = -2.05 + (i / 25) * 4.1;
      const on = frac(seconds * 1.5 - i / 8) < 0.5 ? 1 : 0.3;
      const c = ["255, 90, 70", "120, 200, 255", "255, 210, 90", "140, 255, 150"][i % 4];
      g.fillStyle = `rgba(${c}, ${on})`;
      g.fillRect(x - 0.03, 0.06, 0.06, 0.06);
      this.lights.push({ x, y: 0.09, a: 0.3 * on, c });
    }
    for (const x of [-2.7, -1.3, 1.3]) {
      g.fillStyle = "#0c080a";
      g.beginPath();
      g.arc(x, 0.64, 0.25, 0, TAU);
      g.fill();
      g.fillStyle = "#3a3036";
      g.beginPath();
      g.arc(x, 0.64, 0.1, 0, TAU);
      g.fill();
    }
  }

  // ─── III. Home: the makhar and the aarti ────────────────────────────────────

  private samai(g: Ctx, x: number, y: number, seconds: number, seed: number) {
    const gold = (x0: number, x1: number) => {
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, "#7a4a12");
      gr.addColorStop(0.35, "#f6d27a");
      gr.addColorStop(1, "#8a5614");
      return gr;
    };
    g.fillStyle = gold(x - 0.3, x + 0.3);
    g.beginPath();
    g.ellipse(x, y, 0.28, 0.07, 0, 0, TAU);
    g.fill();
    g.fillRect(x - 0.035, y - 1.4, 0.07, 1.4);
    for (const k of [0.2, 0.55, 0.95]) {
      g.beginPath();
      g.ellipse(x, y - k * 1.4, 0.08, 0.035, 0, 0, TAU);
      g.fill();
    }
    const top = y - 1.42;
    g.beginPath();
    g.ellipse(x, top, 0.26, 0.06, 0, 0, Math.PI);
    g.fill();
    // A little peacock on the top, as on a Maharashtrian samai.
    g.beginPath();
    g.moveTo(x - 0.02, top - 0.02);
    g.quadraticCurveTo(x - 0.06, top - 0.24, x + 0.02, top - 0.3);
    g.quadraticCurveTo(x + 0.08, top - 0.26, x + 0.05, top - 0.2);
    g.quadraticCurveTo(x + 0.14, top - 0.1, x + 0.05, top - 0.02);
    g.closePath();
    g.fill();
    for (let i = 0; i < 5; i++) {
      const fx = x + (i - 2) * 0.11;
      flame(g, fx, top - 0.02, 0.14, seconds, seed + i);
      this.lights.push({ x: fx, y: top - 0.08, a: 0.5 * flicker(seconds, seed + i), c: LAMP });
    }
  }

  private home(g: Ctx, f: Frame, v: View, part: Part) {
    const { p, seconds } = f;
    apply(g, v);
    const b = bounds(v);
    if (part === "back") {
      const wall = g.createRadialGradient(0, -1.4, 0.5, 0, -1.2, 7);
      wall.addColorStop(0, "#c88a58");
      wall.addColorStop(0.45, "#7a4a2c");
      wall.addColorStop(1, "#1e110b");
      g.fillStyle = wall;
      g.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
      toran(g, b.left, b.right, -4.25, 0, Math.ceil((b.right - b.left) / 0.16), 0.8, 0.075);

      // The makhar: a velvet back inside a scalloped arch on two pillars.
      const arch = () => {
        g.beginPath();
        g.moveTo(-2.0, 0.36);
        g.lineTo(-2.0, -2.7);
        g.bezierCurveTo(-2.0, -3.5, -0.9, -3.7, 0, -3.95);
        g.bezierCurveTo(0.9, -3.7, 2.0, -3.5, 2.0, -2.7);
        g.lineTo(2.0, 0.36);
        g.closePath();
      };
      arch();
      const velvet = g.createRadialGradient(0, -1.5, 0.3, 0, -1.5, 3.2);
      velvet.addColorStop(0, "#8a1424");
      velvet.addColorStop(1, "#3a0610");
      g.fillStyle = velvet;
      g.fill();
      g.save();
      arch();
      g.clip();
      g.fillStyle = "rgba(240, 190, 90, 0.35)";
      for (let y = -3.8; y < 0.4; y += 0.28) for (let x = -2; x < 2; x += 0.28) g.fillRect(x + ((y * 10) % 2 ? 0.14 : 0), y, 0.035, 0.035);
      g.restore();
      // The prabhaval, a sunburst of gold behind his head.
      g.save();
      g.translate(0, -1.55);
      for (let i = 0; i < 28; i++) {
        g.rotate(TAU / 28);
        g.fillStyle = i % 2 ? "#f2c14e" : "#d8962a";
        g.beginPath();
        g.moveTo(-0.1, -1.05);
        g.lineTo(0, -1.3);
        g.lineTo(0.1, -1.05);
        g.closePath();
        g.fill();
      }
      g.fillStyle = "#e8b440";
      g.beginPath();
      g.arc(0, 0, 1.08, 0, TAU);
      g.fill();
      g.fillStyle = "#b8141e";
      g.beginPath();
      g.arc(0, 0, 0.96, 0, TAU);
      g.fill();
      g.fillStyle = "#f6d680";
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * TAU;
        g.beginPath();
        g.arc(Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0.025, 0, TAU);
        g.fill();
      }
      g.restore();
      // Pillars wound with marigolds, and the arch over them.
      for (const s of [-1, 1]) {
        const x = s * 2.0;
        const pillar = g.createLinearGradient(x - 0.18, 0, x + 0.18, 0);
        pillar.addColorStop(0, "#8a5a1e");
        pillar.addColorStop(0.4, "#f4d68a");
        pillar.addColorStop(1, "#7a4a14");
        g.fillStyle = pillar;
        g.fillRect(x - 0.17, -2.75, 0.34, 3.1);
        for (let i = 0; i < 26; i++) {
          const y = -2.7 + i * 0.12;
          g.fillStyle = i % 2 ? "#f28c18" : "#f8b62a";
          g.beginPath();
          g.arc(x + Math.sin(i * 0.9) * 0.14, y, 0.06, 0, TAU);
          g.fill();
        }
      }
      g.strokeStyle = "#e8b440";
      g.lineWidth = 0.22;
      g.beginPath();
      g.moveTo(-2.0, -2.7);
      g.bezierCurveTo(-2.0, -3.5, -0.9, -3.7, 0, -3.95);
      g.bezierCurveTo(0.9, -3.7, 2.0, -3.5, 2.0, -2.7);
      g.stroke();
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        const [x, y] = t < 0.5 ? cubicAt([-2, -2.7], [-2, -3.5], [-0.9, -3.7], [0, -3.95], t * 2) : cubicAt([0, -3.95], [0.9, -3.7], [2, -3.5], [2, -2.7], t * 2 - 1);
        const c = ["255, 196, 90", "255, 90, 70", "120, 200, 255", "140, 255, 150"][i % 4];
        const on = 0.55 + 0.45 * Math.sin(seconds * 3 + i * 1.3);
        g.fillStyle = `rgba(${c}, ${on})`;
        g.beginPath();
        g.arc(x, y, 0.04, 0, TAU);
        g.fill();
        this.lights.push({ x, y, a: 0.4 * on, c });
      }
      toran(g, -1.8, 0, -3.3, 0.35, 12, 1, 0.06);
      toran(g, 0, 1.8, -3.3, 0.35, 12, 1, 0.06);
      // The chowrang under him, in red cloth with a gold edge.
      g.fillStyle = "#a01422";
      g.fillRect(-1.85, 0.04, 3.7, 0.32);
      g.fillStyle = "#e8b440";
      g.fillRect(-1.85, 0.3, 3.7, 0.04);
      const floor = g.createLinearGradient(0, 0.36, 0, 3);
      floor.addColorStop(0, "#3a2418");
      floor.addColorStop(1, "#140c08");
      g.fillStyle = floor;
      g.fillRect(b.left, 0.36, b.right - b.left, Math.max(1, b.bottom - 0.36));
      g.fillStyle = "#a01422";
      g.beginPath();
      g.moveTo(-1.85, 0.34);
      for (let i = 0; i <= 18; i++) {
        const x = lerp(-1.85, 1.85, i / 18);
        g.quadraticCurveTo(x - 0.1, 0.5, x, 0.34);
      }
      g.fill();
      this.shine(g, 0.3);
      return;
    }

    // Twenty-one modaks on a silver plate, and a bowl of jaswand and durva.
    const plate = g.createLinearGradient(-1.75, 0, -0.85, 0);
    plate.addColorStop(0, "#8a8a92");
    plate.addColorStop(0.4, "#eeeef2");
    plate.addColorStop(1, "#7a7a84");
    g.fillStyle = plate;
    g.beginPath();
    g.ellipse(-1.3, 0.08, 0.46, 0.08, 0, 0, TAU);
    g.fill();
    for (let row = 0; row < 6; row++) {
      const count = 6 - row;
      for (let i = 0; i < count; i++) drawModak(g, -1.3 + (i - (count - 1) / 2) * 0.13, 0.08 - row * 0.1, 0.14);
    }
    g.fillStyle = "#c08a2a";
    g.beginPath();
    g.ellipse(1.3, 0.04, 0.34, 0.14, 0, 0, Math.PI);
    g.fill();
    for (let i = 0; i < 6; i++) drawHibiscus(g, 1.06 + i * 0.1, 0.0 - (i % 2) * 0.06, 0.07, i);
    drawDurva(g, 1.5, 0.02, 0.26, 0.4);
    drawDurva(g, 1.12, 0.02, 0.22, -0.4);
    // Agarbatti, smoke curling up past him.
    g.strokeStyle = "#5a2a14";
    g.lineWidth = 0.012;
    g.beginPath();
    g.moveTo(1.78, 0.1);
    g.lineTo(1.7, -0.45);
    g.stroke();
    g.strokeStyle = "rgba(230, 220, 210, 0.16)";
    g.lineWidth = 0.02;
    g.beginPath();
    for (let i = 0; i <= 30; i++) {
      const y = -0.45 - i * 0.07;
      const x = 1.7 + Math.sin(y * 3 + seconds * 0.8) * 0.06 * (i / 10);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    this.lights.push({ x: 1.7, y: -0.45, a: 0.5, c: "255, 90, 40" });
    for (const s of [-1, 1]) this.samai(g, s * 2.45, 0.66, seconds, s + 2);

    // The aarti.
    const show = rise(p, 0.352, 0.37) * (1 - rise(p, 0.455, 0.47));
    if (show > 0.01) {
      const t = this.thali;
      g.globalAlpha = show;
      g.globalCompositeOperation = "lighter";
      const warm = glowSprite(LAMP);
      t.trail.forEach((q, i) => glow(g, warm, q.x, q.y - 0.12, 0.18, (i / t.trail.length) * 0.25 * show));
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = show;
      const brass = g.createLinearGradient(t.x - 0.32, 0, t.x + 0.32, 0);
      brass.addColorStop(0, "#8a5a14");
      brass.addColorStop(0.4, "#f8d88a");
      brass.addColorStop(1, "#8a5614");
      g.fillStyle = brass;
      g.beginPath();
      g.ellipse(t.x, t.y + 0.06, 0.32, 0.08, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#6a3a0c";
      g.beginPath();
      g.ellipse(t.x, t.y + 0.075, 0.26, 0.05, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#c81e28";
      g.beginPath();
      g.arc(t.x - 0.16, t.y + 0.06, 0.035, Math.PI, 0);
      g.fill();
      g.fillStyle = "#f2b81e";
      g.beginPath();
      g.arc(t.x + 0.16, t.y + 0.06, 0.035, Math.PI, 0);
      g.fill();
      drawHibiscus(g, t.x - 0.06, t.y + 0.07, 0.04, 1);
      g.fillStyle = brass;
      g.beginPath();
      g.ellipse(t.x + 0.05, t.y + 0.03, 0.08, 0.035, 0, 0, TAU);
      g.fill();
      flame(g, t.x + 0.05, t.y + 0.02, 0.24, seconds, 9);
      g.globalAlpha = 1;
      this.lights.push({ x: t.x + 0.05, y: t.y - 0.08, a: 0.9 * show, c: LAMP });
      g.globalCompositeOperation = "lighter";
      glow(g, glowSprite(LAMP), t.x, t.y - 0.1, 2.2, 0.3 * show);
      g.globalCompositeOperation = "source-over";
    }
    this.shine(g, 0.35);
    g.globalCompositeOperation = "lighter";
    glow(g, glowSprite(LAMP), 0, -1.2, 3, 0.1);
    g.globalCompositeOperation = "source-over";
  }

  // ─── IV. The ten days: the pandal ───────────────────────────────────────────

  private city(g: Ctx, f: Frame, v: View, part: Part) {
    const { seconds } = f;
    if (part === "front") {
      apply(g, v);
      for (const fig of this.darshan) person(g, fig, seconds / 0.9, seconds, 0.35 + 0.25 * clamp(1 - Math.abs(fig.x) / 8));
      g.globalCompositeOperation = "lighter";
      glow(g, glowSprite("255, 200, 140"), 0, -1.3, 3.4, 0.14);
      g.globalCompositeOperation = "source-over";
      return;
    }
    sky(g, v, [
      [0, [4, 6, 20]],
      [screenY(v, -8), [18, 18, 48]],
      [screenY(v, 0.5), [96, 50, 60]],
    ]);
    g.fillStyle = "#f2e9d6";
    for (const s of this.stars) {
      const y = s.y * v.height * 0.5;
      g.globalAlpha = 0.3 * (0.55 + 0.45 * Math.sin(seconds * 0.9 + s.seed * 6));
      g.fillRect(s.x * v.width, y, s.r, s.r);
    }
    g.globalAlpha = 1;
    apply(g, v);
    const b = bounds(v);
    for (const t of this.towers) {
      if (t.x + t.w < b.left || t.x > b.right) continue;
      g.fillStyle = "#15142a";
      g.fillRect(t.x, 0.5 - t.h, t.w, t.h);
      for (const w of t.windows) {
        if (!w.lit) continue;
        g.fillStyle = `rgba(255, 200, 130, ${w.lit * 0.6})`;
        g.fillRect(w.x, w.y, 0.1, 0.14);
      }
    }
    g.fillStyle = "#120a0c";
    g.fillRect(b.left, 0.5, b.right - b.left, Math.max(1, b.bottom - 0.5));
    for (const s of [-1, 1]) {
      lightString(g, this.lights, s * 4.6, -5.1, s * 11, -3.2, 0.5, 18, seconds, s * 3);
      lightString(g, this.lights, s * 4.6, -2.4, s * 11, -1.4, 0.35, 16, seconds, s * 5);
    }

    // The pandal: a palace front of wood and cloth for ten days, lit with a thousand bulbs.
    const facade = g.createLinearGradient(0, -7, 0, 1);
    facade.addColorStop(0, "#5a3420");
    facade.addColorStop(1, "#b07a44");
    g.fillStyle = facade;
    g.fillRect(-4.6, -5.2, 9.2, 6.1);
    g.beginPath();
    g.ellipse(0, -5.2, 1.6, 1.9, 0, Math.PI, TAU);
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * 3.8, -5.2, 0.75, 0.95, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = "rgba(40, 20, 12, 0.35)";
      g.fillRect(s * 3.8 - 0.7, -5.2, 1.4, 6.1);
      g.fillStyle = facade;
      // Windows in the side towers.
      for (let i = 0; i < 3; i++) {
        g.fillStyle = "rgba(255, 200, 120, 0.5)";
        g.beginPath();
        g.moveTo(s * 3.8 - 0.25, -1.0 - i * 1.4);
        g.lineTo(s * 3.8 - 0.25, -1.5 - i * 1.4);
        g.quadraticCurveTo(s * 3.8, -1.9 - i * 1.4, s * 3.8 + 0.25, -1.5 - i * 1.4);
        g.lineTo(s * 3.8 + 0.25, -1.0 - i * 1.4);
        g.closePath();
        g.fill();
      }
      g.fillStyle = facade;
    }
    const arch = this.archPoints();
    g.beginPath();
    arch.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    const inside = g.createRadialGradient(0, -1.5, 0.2, 0, -1.5, 4);
    inside.addColorStop(0, "#d0402a");
    inside.addColorStop(0.5, "#7a1018");
    inside.addColorStop(1, "#2a0408");
    g.fillStyle = inside;
    g.fill();
    for (const bulb of this.bulbs) {
      const on = 0.55 + 0.45 * Math.sin(seconds * 4 - bulb.i * 0.35);
      g.fillStyle = `rgba(255, 226, 160, ${0.4 + on * 0.6})`;
      g.fillRect(bulb.x - 0.04, bulb.y - 0.04, 0.08, 0.08);
      if (bulb.i % 2 === 0) this.lights.push({ x: bulb.x, y: bulb.y, a: 0.35 * on, c: LAMP });
    }
    g.fillStyle = "#7a1420";
    g.fillRect(-2.3, 0.04, 4.6, 0.86);
    g.fillStyle = "#e8b440";
    g.fillRect(-2.3, 0.04, 4.6, 0.06);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i % 2 ? "#3a2018" : "#4a2a1e";
      g.fillRect(-2.6 - i * 0.3, 0.9 + i * 0.14, 5.2 + i * 0.6, 0.14);
    }
    this.shine(g, 0.5);
  }

  // ─── VI. The sea at Girgaon Chowpatty ───────────────────────────────────────

  private wave(y0: number, x: number, t: number) {
    const near = clamp((y0 - HORIZON) / (SHORE - HORIZON));
    const amp = 0.012 + 0.11 * Math.pow(near, 1.3);
    const k = 2.4 / (0.3 + near * 1.4);
    return y0 + amp * (0.6 * Math.sin(x * k + t * 1.1 + y0 * 7) + 0.4 * Math.sin(x * k * 1.9 - t * 0.7 + y0 * 3));
  }

  private sea(g: Ctx, f: Frame, v: View, part: Part) {
    const { p, seconds } = f;
    const n = this.night(p);
    const pose = this.seaPose(f);
    const water = pose.water;
    const tops: number[] = [];
    for (let k = 0; k < 18; k++) tops.push(HORIZON + Math.pow(k / 17, 1.7) * (SHORE - HORIZON));
    tops.push(water);
    tops.sort((a, c) => a - c);
    const b = bounds(v);

    if (part === "back") {
      const hy = screenY(v, HORIZON);
      sky(g, v, [
        [0, mix([54, 40, 92], [3, 6, 20], n)],
        [hy * 0.6, mix([196, 92, 110], [12, 18, 46], n)],
        [hy, mix([250, 150, 90], [34, 40, 76], n)],
      ]);
      g.fillStyle = "#f2e9d6";
      for (const s of this.stars) {
        const y = s.y * v.height * hy;
        g.globalAlpha = n * 0.7 * (0.55 + 0.45 * Math.sin(seconds * 0.9 + s.seed * 6));
        g.fillRect(s.x * v.width, y, s.r, s.r);
      }
      g.globalAlpha = 1;
      g.save();
      apply(g, v);
      // The moon, a day short of full.
      g.globalCompositeOperation = "lighter";
      glow(g, glowSprite("200, 210, 255"), MOON.x, MOON.y, 5, 0.25 * n);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = rgb(mix([240, 170, 150], [246, 240, 222], n), 0.3 + 0.7 * n);
      g.beginPath();
      g.arc(MOON.x, MOON.y, MOON.r, 0, TAU);
      g.fill();
      g.fillStyle = `rgba(160, 160, 180, ${0.25 * n})`;
      g.beginPath();
      g.arc(MOON.x - 0.18, MOON.y - 0.1, 0.16, 0, TAU);
      g.arc(MOON.x + 0.2, MOON.y + 0.18, 0.1, 0, TAU);
      g.fill();
      // Marine Drive across the bay: the Queen's Necklace.
      g.fillStyle = rgb(mix([120, 70, 90], [10, 12, 26], n));
      for (let x = -46; x < -5; x += 0.55) {
        const h = 0.08 + (Math.sin(x * 3.1) * 0.5 + 0.5) ** 2 * 0.4 * (1 - (x + 46) / 60);
        g.fillRect(x, HORIZON - 0.05 - h - Math.sin(((x + 46) / 41) * Math.PI * 0.9) * 0.22, 0.4, h + 0.1);
      }
      for (const [i, l] of this.necklace.entries()) {
        g.fillStyle = `rgba(255, 214, 140, ${0.3 + 0.7 * n})`;
        g.fillRect(l.x - 0.04, l.y - 0.02, 0.08, 0.04);
        if (i % 2 === 0) this.lights.push({ x: l.x, y: l.y, a: 0.45 * n, c: "255, 200, 120" });
      }
      this.shine(g, 0.45);
      for (const y0 of tops) if (y0 < water) this.band(g, v, b, y0, tops, seconds, n);
      g.restore();
      return;
    }

    apply(g, v);
    // Those carrying him in, up to their chests.
    const sink = rise(p, MOMENTS.sink[0], MOMENTS.sink[1]);
    const carry = 1 - rise(sink, 0.4, 0.8);
    if (carry > 0.01) {
      g.globalAlpha = carry;
      for (const dx of [-1.25, -0.7, 0.7, 1.25]) {
        const x = pose.x + dx * pose.s;
        const hands = Math.min(pose.y + 0.02 * pose.s, water + 0.1);
        const colour = rgb(mix([60, 40, 40], [10, 10, 20], n));
        g.strokeStyle = colour;
        g.lineWidth = 0.07;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x - 0.1, water - 0.32);
        g.lineTo(x - dx * 0.12, hands);
        g.moveTo(x + 0.1, water - 0.32);
        g.lineTo(x - dx * 0.2, hands);
        g.stroke();
        g.fillStyle = colour;
        g.beginPath();
        g.ellipse(x, water - 0.18, 0.2, 0.2, 0, Math.PI, TAU);
        g.fill();
        g.beginPath();
        g.arc(x, water - 0.5, 0.1, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    for (const y0 of tops) if (y0 >= water) this.band(g, v, b, y0, tops, seconds, n);
    // Still just visible under the water as he goes.
    const ghost = 0.2 * (1 - rise(sink, 0.55, 1)) * rise(sink, 0, 0.1);
    if (ghost > 0.005) {
      g.save();
      g.beginPath();
      g.rect(b.left, water + 0.04, b.right - b.left, 6);
      g.clip();
      this.murti.draw(g, "paint", pose.x, pose.y, pose.s, ghost);
      g.restore();
    }
    // Rings on the water where he went down.
    const rings = rise(p, 0.86, 0.875) * (1 - rise(p, 0.95, 0.995));
    if (rings > 0.01) {
      g.lineWidth = 0.02;
      for (let i = 0; i < 3; i++) {
        const t = frac(seconds * 0.25 + i / 3);
        g.strokeStyle = `rgba(230, 236, 255, ${0.35 * rings * (1 - t)})`;
        g.beginPath();
        g.ellipse(pose.x, water + 0.02, 0.2 + t * 2.4, (0.2 + t * 2.4) * 0.16, 0, 0, TAU);
        g.stroke();
      }
    }
    // The sand, the last wash of a wave, and the crowd seeing him off.
    const wash = (x: number) => SHORE + 0.3 + 0.1 * Math.sin(seconds * 0.7 + x * 0.3) + 0.04 * Math.sin(x * 2.3 + seconds);
    g.beginPath();
    g.moveTo(b.left, b.bottom + 1);
    for (let x = b.left; x <= b.right + 0.2; x += 0.2) g.lineTo(x, wash(x));
    g.lineTo(b.right + 0.2, b.bottom + 1);
    g.closePath();
    const sand = g.createLinearGradient(0, SHORE, 0, SHORE + 3);
    sand.addColorStop(0, rgb(mix([120, 84, 70], [28, 26, 36], n)));
    sand.addColorStop(1, rgb(mix([60, 40, 34], [10, 9, 14], n)));
    g.fillStyle = sand;
    g.fill();
    g.strokeStyle = `rgba(240, 244, 255, ${0.25 + 0.15 * Math.sin(seconds)})`;
    g.lineWidth = 0.035;
    g.beginPath();
    for (let x = b.left; x <= b.right + 0.2; x += 0.2) {
      if (x === b.left) g.moveTo(x, wash(x));
      else g.lineTo(x, wash(x));
    }
    g.stroke();
    for (const fig of this.shore) person(g, fig, seconds / 0.9, seconds, lerp(0.45, 0.14, n));
  }

  /** One band of the sea from `y0` down, then the flowers riding on it. */
  private band(g: Ctx, v: View, b: ReturnType<typeof bounds>, y0: number, tops: number[], seconds: number, n: number) {
    const near = clamp((y0 - HORIZON) / (SHORE - HORIZON));
    const step = Math.max(0.06, 12 / v.scale);
    g.beginPath();
    g.moveTo(b.left - 1, b.bottom + 1);
    for (let x = b.left - 1; x <= b.right + 1; x += step) g.lineTo(x, this.wave(y0, x, seconds));
    g.lineTo(b.right + 1, b.bottom + 1);
    g.closePath();
    const far = mix([168, 96, 118], [34, 50, 94], n);
    const deep = mix([54, 34, 64], [5, 12, 28], n);
    g.fillStyle = rgb(mix(far, deep, Math.pow(near, 0.6)));
    g.fill();
    // Crests catching the light, and foam on the near ones.
    g.strokeStyle = `rgba(236, 240, 255, ${0.04 + 0.26 * near * near})`;
    g.lineWidth = 0.008 + 0.03 * near;
    g.beginPath();
    for (let x = b.left - 1; x <= b.right + 1; x += step) {
      if (x === b.left - 1) g.moveTo(x, this.wave(y0, x, seconds) + 0.004);
      else g.lineTo(x, this.wave(y0, x, seconds) + 0.004);
    }
    g.stroke();
    // The moon's path on the water.
    const spread = 0.3 + near * 3.2;
    g.fillStyle = "rgba(255, 244, 220, 1)";
    for (let i = 0; i < 6; i++) {
      const h = frac(Math.sin(i * 12.9898 + y0 * 78.233) * 43758.5453);
      const gx = MOON.x + (h - 0.5) * spread * 2 + Math.sin(seconds * 0.4 + i) * 0.1;
      const a = (0.25 + 0.75 * n) * (0.4 + 0.6 * Math.sin(seconds * 2.5 + i * 7 + y0 * 11)) * (1 - Math.abs(h - 0.5) * 1.6);
      if (a <= 0.02) continue;
      g.globalAlpha = a * 0.8;
      const len = 0.08 + near * 0.5;
      g.fillRect(gx - len / 2, this.wave(y0, gx, seconds) + 0.01, len, 0.012 + near * 0.02);
    }
    g.globalAlpha = 1;
    const next = tops.find((t) => t > y0) ?? Infinity;
    for (const fl of this.flowers) {
      if (fl.depth < y0 || fl.depth >= next) continue;
      const age = seconds - fl.born;
      const x = fl.x + Math.sin(seconds * 0.3 + fl.seed) * 0.12 + age * 0.015 * Math.sin(fl.seed * 3);
      if (!onScreen(v, x, fl.depth, 0.4)) continue;
      const size = (0.07 + 0.12 * clamp((fl.depth - HORIZON) / (SHORE - HORIZON))) * clamp(age * 3);
      const y = this.wave(fl.depth, x, seconds) - size * 0.2 - Math.max(0, 0.3 - age) * 0.8;
      g.save();
      g.translate(x, y);
      g.scale(1, 0.55);
      if (fl.kind === "marigold") {
        dot(g, 0, 0, size, "#e8740e");
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * TAU + fl.seed;
          dot(g, Math.cos(a) * size * 0.72, Math.sin(a) * size * 0.72, size * 0.36, i % 2 ? "#f79a1c" : "#f5b02a");
        }
        dot(g, 0, 0, size * 0.42, "#f8c030");
        dot(g, 0, 0, size * 0.16, "#b8520a");
      } else if (fl.kind === "hibiscus") drawHibiscus(g, 0, 0, size, fl.seed);
      else drawDurva(g, 0, size * 0.5, size * 2, fl.seed);
      g.restore();
      if (n > 0.2) {
        g.fillStyle = `rgba(3, 6, 18, ${0.35 * n})`;
        g.beginPath();
        g.ellipse(x, y, size * 1.05, size * 0.6, 0, 0, TAU);
        g.fill();
      }
    }
  }
}

function dot(g: Ctx, x: number, y: number, r: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function cubicAt(a: [number, number], b: [number, number], c: [number, number], d: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
}

export function createScene(emit: Emit): Scene {
  return new Ganeshotsav(emit);
}
