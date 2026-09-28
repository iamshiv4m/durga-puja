// The places of the journey, in world units (y down, the house fronts standing on y = 0): the
// havelis around the chowk, the paving, Holika's pyre and its fire, the thali of colour at the
// grandmother's door, the thandai at the neighbours', and the palash at the end of the lane.
import { TAU, clamp, flicker, lerp, mix, mulberry32, onScreen, rgb, type Ctx, type RGB, type View } from "../paint";

// ─── Havelis ─────────────────────────────────────────────────────────────────

export type Jharokha = { x: number; y: number; w: number; dome: boolean };
export type Haveli = {
  x: number;
  w: number;
  h: number;
  wall: RGB;
  trim: RGB;
  shutter: RGB;
  floors: number[];
  doors: { x: number; w: number; h: number }[];
  windows: { x: number; y: number; w: number; h: number }[];
  jharokhas: Jharokha[];
  chhatri: number | null;
  /** A painted panel on the front, left bare here: [x, top, width, height]. */
  panel?: [number, number, number, number];
};

const WALLS: RGB[] = [
  [222, 170, 98], // ochre
  [212, 136, 118], // rose sandstone
  [132, 158, 200], // indigo wash
  [230, 220, 196], // lime
  [196, 108, 76], // red sandstone
  [236, 194, 110], // haldi yellow
  [160, 186, 156], // pale green
];
const SHUTTERS: RGB[] = [
  [40, 110, 90],
  [40, 80, 150],
  [150, 50, 40],
  [90, 60, 36],
];

/** One haveli's front, `w` wide at `x`, `floors` storeys; the details are filled in at random. */
function haveli(random: () => number, x: number, w: number, floors: number, wall: RGB, extra: Partial<Haveli> = {}): Haveli {
  const storey = 2.3;
  const h = floors * storey + 0.6;
  const floorLines = Array.from({ length: floors - 1 }, (_, i) => -(i + 1) * storey);
  const trim = mix(wall, [255, 250, 235], 0.45);
  const shutter = SHUTTERS[Math.floor(random() * SHUTTERS.length)];
  const doors: Haveli["doors"] = [];
  const windows: Haveli["windows"] = [];
  const jharokhas: Jharokha[] = [];
  // Ground floor: a door, and small windows either side.
  const doorX = extra.doors?.[0]?.x ?? x + w * (0.3 + random() * 0.4);
  if (!extra.doors) doors.push({ x: doorX, w: 1.15, h: 1.95 });
  for (let wx = x + 0.55; wx < x + w - 0.8; wx += 1.25) {
    if (Math.abs(wx + 0.3 - doorX) < 1.2) continue;
    windows.push({ x: wx, y: -1.75, w: 0.6, h: 0.85 });
  }
  // Upper floors: a jharokha on some, a row of arched windows on all.
  for (let f = 1; f < floors; f++) {
    const base = -f * storey;
    const withBalcony = random() < 0.75 && w > 3;
    const jx = x + w * (0.3 + random() * 0.4);
    if (withBalcony) jharokhas.push({ x: jx, y: base - 0.15, w: 1.3 + random() * 0.4, dome: random() < 0.5 });
    for (let wx = x + 0.45; wx < x + w - 0.75; wx += 1.1) {
      if (withBalcony && Math.abs(wx + 0.3 - jx) < 1.2) continue;
      windows.push({ x: wx, y: base - 1.55, w: 0.6, h: 1.05 });
    }
  }
  return {
    x,
    w,
    h,
    wall,
    trim,
    shutter,
    floors: floorLines,
    doors: extra.doors ?? doors,
    windows,
    jharokhas,
    chhatri: random() < 0.4 ? x + w * (0.2 + random() * 0.6) : null,
    ...extra,
  };
}

/** The Chowk: open in the middle for the pyre, the grandmother's house to its left, and the lane running right to the fields. */
export const DADI_DOOR = { x: -6.4, w: 1.3, h: 2.2 };
export const MURAL = { x: 5.4, y: -6.95, w: 3.4, h: 4.4 };
export const LANE_END = 19.6;

export function makeHavelis(): Haveli[] {
  const random = mulberry32(1403);
  const list: Haveli[] = [];
  // To the left of the square, out of sight to begin with.
  let x = -34;
  while (x < -9.6) {
    const w = Math.min(-9.6 - x, 3.6 + random() * 2.4);
    if (w < 2.4) break;
    list.push(haveli(random, x, w, random() < 0.5 ? 3 : 2, WALLS[Math.floor(random() * WALLS.length)]));
    x += w + 0.18;
  }
  // The grandmother's house: two storeys of ochre, with a wide door onto the chowk.
  const dadi = haveli(random, -9.4, 6, 2, WALLS[0], { doors: [DADI_DOOR] });
  list.push(dadi);
  // Across the square: a tall lime-washed haveli with Radha and Krishna painted on its front.
  const muralHouse = haveli(random, 3.4, 7.2, 3, WALLS[3], { panel: [MURAL.x, MURAL.y, MURAL.w, MURAL.h] });
  // Keep the upper windows and balconies clear of the painting.
  muralHouse.windows = muralHouse.windows.filter((w) => w.y > -2.4 || w.x + w.w < MURAL.x - 0.15 || w.x > MURAL.x + MURAL.w + 0.15);
  muralHouse.jharokhas = [{ x: 4.3, y: -2.45, w: 1.3, dome: true }, { x: 9.8, y: -4.75, w: 1.3, dome: false }];
  muralHouse.doors = [{ x: 7.1, w: 1.2, h: 2 }];
  muralHouse.windows = muralHouse.windows.filter((w) => w.y < -2 || Math.abs(w.x + 0.3 - 7.1) > 1.1);
  list.push(muralHouse);
  list.push(haveli(random, 10.8, 5.6, 2, WALLS[1], { doors: [{ x: 11.9, w: 1.2, h: 2 }] }));
  list.push(haveli(random, 16.6, 3, 2, WALLS[2]));
  return list;
}

function arch(ctx: Ctx, x: number, y: number, w: number, h: number) {
  // A cusped Rajput arch over a rectangle, (x, y) its top left.
  const r = w / 2;
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y + r * 0.2, x + r * 0.55, y + r * 0.15);
  ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.1, x + r, y - r * 0.12);
  ctx.quadraticCurveTo(x + r * 1.1, y + r * 0.1, x + r * 1.45, y + r * 0.15);
  ctx.quadraticCurveTo(x + w, y + r * 0.2, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/** One haveli front. `dusk` lights its windows from inside. */
export function drawHaveli(ctx: Ctx, v: View, b: Haveli, dusk: number) {
  if (!onScreen(v, b.x + b.w / 2, -b.h / 2, Math.max(b.w, b.h))) return;
  const detail = v.scale > 40;
  const top = -b.h;
  const wall = ctx.createLinearGradient(0, top, 0, 0);
  wall.addColorStop(0, rgb(mix(b.wall, [255, 255, 255], 0.08)));
  wall.addColorStop(1, rgb(mix(b.wall, [60, 40, 30], 0.18)));
  ctx.fillStyle = wall;
  ctx.fillRect(b.x, top, b.w, b.h);
  // Weathering at the corners and along the plinth.
  ctx.fillStyle = "rgba(60, 30, 20, 0.12)";
  ctx.fillRect(b.x, top, 0.12, b.h);
  ctx.fillRect(b.x + b.w - 0.12, top, 0.12, b.h);
  ctx.fillStyle = rgb(mix(b.wall, [70, 44, 30], 0.35));
  ctx.fillRect(b.x, -0.4, b.w, 0.4);

  // Parapet with its kangura, and the floor ledges (chhajja) with their shade.
  const trim = rgb(b.trim);
  ctx.fillStyle = trim;
  ctx.fillRect(b.x - 0.06, top - 0.02, b.w + 0.12, 0.14);
  ctx.fillStyle = rgb(mix(b.wall, [255, 255, 255], 0.15));
  for (let kx = b.x + 0.05; kx < b.x + b.w - 0.1; kx += 0.32) {
    ctx.beginPath();
    ctx.moveTo(kx, top);
    ctx.lineTo(kx, top - 0.14);
    ctx.quadraticCurveTo(kx + 0.11, top - 0.3, kx + 0.22, top - 0.14);
    ctx.lineTo(kx + 0.22, top);
    ctx.fill();
  }
  for (const fy of b.floors) {
    ctx.fillStyle = "rgba(40, 20, 10, 0.16)";
    ctx.fillRect(b.x, fy, b.w, 0.22);
    ctx.fillStyle = trim;
    ctx.fillRect(b.x - 0.1, fy - 0.1, b.w + 0.2, 0.12);
    if (detail) {
      ctx.fillStyle = rgb(mix(b.wall, [80, 50, 30], 0.3));
      for (let bx = b.x + 0.2; bx < b.x + b.w - 0.1; bx += 0.5) ctx.fillRect(bx, fy + 0.02, 0.07, 0.1);
    }
  }

  // Windows: dark within, shutters open, lit from inside at dusk.
  const inside = rgb(mix([46, 30, 30], [255, 176, 90], dusk * 0.85));
  for (const w of b.windows) {
    ctx.fillStyle = trim;
    ctx.beginPath();
    arch(ctx, w.x - 0.07, w.y - 0.07, w.w + 0.14, w.h + 0.12);
    ctx.fill();
    ctx.fillStyle = inside;
    ctx.beginPath();
    arch(ctx, w.x, w.y, w.w, w.h);
    ctx.fill();
    ctx.fillStyle = rgb(b.shutter);
    ctx.fillRect(w.x - 0.2, w.y + w.w * 0.4, 0.14, w.h - w.w * 0.4);
    ctx.fillRect(w.x + w.w + 0.06, w.y + w.w * 0.4, 0.14, w.h - w.w * 0.4);
    if (detail) {
      ctx.strokeStyle = rgb(mix(b.shutter, [0, 0, 0], 0.3), 0.8);
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y + w.h * 0.62);
      ctx.lineTo(w.x + w.w, w.y + w.h * 0.62);
      ctx.moveTo(w.x + w.w / 2, w.y + w.w * 0.3);
      ctx.lineTo(w.x + w.w / 2, w.y + w.h);
      ctx.stroke();
    }
  }

  // Doors: a carved frame, an arch, and old wooden leaves standing open.
  for (const d of b.doors) {
    const dx = d.x - d.w / 2;
    ctx.fillStyle = trim;
    ctx.beginPath();
    arch(ctx, dx - 0.14, -d.h - 0.14, d.w + 0.28, d.h + 0.14);
    ctx.fill();
    ctx.fillStyle = rgb(mix([34, 20, 16], [200, 130, 70], dusk * 0.7));
    ctx.beginPath();
    arch(ctx, dx, -d.h, d.w, d.h);
    ctx.fill();
    ctx.fillStyle = "#6a3c1e";
    ctx.fillRect(dx, -d.h + d.w * 0.5, d.w * 0.2, d.h - d.w * 0.5);
    ctx.fillRect(dx + d.w * 0.8, -d.h + d.w * 0.5, d.w * 0.2, d.h - d.w * 0.5);
    if (detail) {
      ctx.fillStyle = "#c9a040";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(dx + d.w * 0.08, -d.h + d.w * 0.6 + i * 0.3, 0.035, 0.035);
        ctx.fillRect(dx + d.w * 0.88, -d.h + d.w * 0.6 + i * 0.3, 0.035, 0.035);
      }
    }
    ctx.fillStyle = rgb(mix(b.wall, [90, 70, 60], 0.5));
    ctx.fillRect(dx - 0.3, -0.12, d.w + 0.6, 0.12);
  }

  for (const j of b.jharokhas) drawJharokha(ctx, j, b, dusk, detail);

  if (b.chhatri !== null) {
    // A little domed pavilion on the roof.
    const cx = b.chhatri;
    ctx.fillStyle = trim;
    ctx.fillRect(cx - 0.45, top - 0.2, 0.9, 0.1);
    ctx.fillRect(cx - 0.4, top - 0.85, 0.07, 0.65);
    ctx.fillRect(cx + 0.33, top - 0.85, 0.07, 0.65);
    ctx.fillStyle = rgb(mix(b.wall, [255, 255, 255], 0.2));
    ctx.fillRect(cx - 0.5, top - 0.92, 1, 0.1);
    ctx.beginPath();
    ctx.moveTo(cx - 0.42, top - 0.92);
    ctx.quadraticCurveTo(cx - 0.42, top - 1.45, cx, top - 1.5);
    ctx.quadraticCurveTo(cx + 0.42, top - 1.45, cx + 0.42, top - 0.92);
    ctx.fill();
    ctx.fillRect(cx - 0.02, top - 1.72, 0.04, 0.24);
  }
}

function drawJharokha(ctx: Ctx, j: Jharokha, b: Haveli, dusk: number, detail: boolean) {
  const x = j.x - j.w / 2;
  const trim = rgb(b.trim);
  const shade = rgb(mix(b.trim, [80, 50, 30], 0.25));
  // Corbels under it, then the floor slab.
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(x, j.y);
  ctx.lineTo(x + j.w, j.y);
  ctx.lineTo(x + j.w * 0.78, j.y + 0.42);
  ctx.lineTo(x + j.w * 0.22, j.y + 0.42);
  ctx.closePath();
  ctx.fill();
  // The opening behind.
  ctx.fillStyle = rgb(mix([40, 26, 26], [255, 170, 90], dusk * 0.8));
  ctx.fillRect(x + 0.08, j.y - 1.25, j.w - 0.16, 1.25);
  // Pillars.
  ctx.fillStyle = trim;
  for (const px of [x + 0.04, x + j.w / 2 - 0.035, x + j.w - 0.11]) ctx.fillRect(px, j.y - 1.2, 0.07, 1.2);
  // The railing, carved.
  ctx.fillStyle = trim;
  ctx.fillRect(x - 0.05, j.y - 0.5, j.w + 0.1, 0.5);
  if (detail) {
    ctx.fillStyle = shade;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x + (i + 0.5) * (j.w / 5), j.y - 0.25, 0.07, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = rgb(mix(b.wall, [255, 255, 255], 0.2));
  ctx.fillRect(x - 0.1, j.y - 0.04, j.w + 0.2, 0.08);
  // A curved bangla roof, or a small dome.
  ctx.fillStyle = trim;
  ctx.beginPath();
  if (j.dome) {
    ctx.moveTo(x - 0.1, j.y - 1.2);
    ctx.lineTo(x + j.w + 0.1, j.y - 1.2);
    ctx.lineTo(x + j.w, j.y - 1.32);
    ctx.quadraticCurveTo(x + j.w, j.y - 1.95, x + j.w / 2, j.y - 2.0);
    ctx.quadraticCurveTo(x, j.y - 1.95, x, j.y - 1.32);
  } else {
    ctx.moveTo(x - 0.15, j.y - 1.15);
    ctx.quadraticCurveTo(x + j.w / 2, j.y - 1.75, x + j.w + 0.15, j.y - 1.15);
    ctx.lineTo(x + j.w + 0.05, j.y - 1.28);
    ctx.quadraticCurveTo(x + j.w / 2, j.y - 1.9, x - 0.05, j.y - 1.28);
  }
  ctx.closePath();
  ctx.fill();
}

// ─── The town beyond, and the paving ────────────────────────────────────────

export type Roof = { x: number; w: number; h: number; kind: "roof" | "dome" | "shikhara" | "tree" };

export function makeBackdrop(): Roof[] {
  const random = mulberry32(77);
  const roofs: Roof[] = [];
  for (let x = -40; x < 40; ) {
    const w = 1.5 + random() * 2.5;
    // Lower across the open side of the chowk, so the moon has sky to rise in.
    const open = Math.abs(x + w / 2) < 4;
    roofs.push({ x, w, h: open ? 0.5 + random() * 0.5 : 0.9 + random() * 1.1, kind: "roof" });
    x += w;
  }
  roofs.push({ x: -3.1, w: 1.4, h: 3.1, kind: "shikhara" });
  roofs.push({ x: -1.7, w: 1.9, h: 2.1, kind: "tree" });
  roofs.push({ x: 26, w: 3.2, h: 3.2, kind: "tree" });
  roofs.push({ x: 30.5, w: 2.6, h: 2.5, kind: "tree" });
  roofs.push({ x: 2.3, w: 1.0, h: 1.6, kind: "dome" });
  return roofs;
}

/** The far roofs, the temple spire and trees over the chowk, hazed with the sky. */
export function drawBackdrop(ctx: Ctx, v: View, roofs: Roof[], haze: RGB) {
  const near = mix([168, 128, 110], haze, 0.5);
  const far = mix([150, 120, 110], haze, 0.7);
  for (const r of roofs) {
    if (!onScreen(v, r.x + r.w / 2, -r.h, Math.max(r.w, r.h) + 1)) continue;
    if (r.kind === "roof") {
      ctx.fillStyle = rgb(far);
      ctx.fillRect(r.x, -r.h, r.w + 0.02, r.h);
    } else if (r.kind === "shikhara") {
      ctx.fillStyle = rgb(near);
      const cx = r.x + r.w / 2;
      ctx.beginPath();
      ctx.moveTo(r.x, 0);
      ctx.lineTo(r.x, -r.h * 0.35);
      ctx.quadraticCurveTo(r.x + r.w * 0.1, -r.h * 0.9, cx, -r.h);
      ctx.quadraticCurveTo(r.x + r.w * 0.9, -r.h * 0.9, r.x + r.w, -r.h * 0.35);
      ctx.lineTo(r.x + r.w, 0);
      ctx.fill();
      ctx.fillRect(cx - 0.02, -r.h - 0.6, 0.04, 0.6);
      ctx.fillStyle = rgb(mix([230, 110, 30], haze, 0.3));
      ctx.beginPath();
      ctx.moveTo(cx + 0.02, -r.h - 0.6);
      ctx.lineTo(cx + 0.45, -r.h - 0.5);
      ctx.lineTo(cx + 0.02, -r.h - 0.38);
      ctx.fill();
    } else if (r.kind === "dome") {
      ctx.fillStyle = rgb(near);
      ctx.fillRect(r.x, -r.h * 0.55, r.w, r.h * 0.55);
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, -r.h * 0.55, r.w / 2, Math.PI, 0);
      ctx.fill();
    } else {
      ctx.fillStyle = rgb(mix([70, 100, 70], haze, 0.55));
      const cx = r.x + r.w / 2;
      ctx.fillRect(cx - 0.08, -r.h * 0.5, 0.16, r.h * 0.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r.w * 0.25, -r.h * 0.68 + Math.sin(a) * r.h * 0.15, r.w * 0.32, 0, TAU);
        ctx.fill();
      }
    }
  }
}

/** The sandstone paving of the chowk, down to the bottom of the screen. */
export function drawPaving(ctx: Ctx, v: View) {
  const left = v.x - v.ax / v.scale - 1;
  const right = v.x + (v.width - v.ax) / v.scale + 1;
  const bottom = v.y + (v.height - v.ay) / v.scale + 1;
  if (bottom < 0) return;
  const floor = ctx.createLinearGradient(0, 0, 0, 8);
  floor.addColorStop(0, "#b99a78");
  floor.addColorStop(0.3, "#c9a882");
  floor.addColorStop(1, "#a88460");
  ctx.fillStyle = floor;
  ctx.fillRect(left, 0, right - left, bottom);
  // A drain along the house fronts, then the joints between the slabs.
  ctx.fillStyle = "rgba(70, 50, 36, 0.35)";
  ctx.fillRect(left, 0, right - left, 0.08);
  ctx.strokeStyle = "rgba(96, 70, 50, 0.3)";
  ctx.lineWidth = Math.max(0.01, 1.1 / v.scale);
  ctx.beginPath();
  let y = 0.3;
  for (let row = 0; y < bottom; row++) {
    const depth = 0.32 + row * 0.07;
    if (y > v.y - v.ay / v.scale - 1) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      const step = 1.1 + row * 0.12;
      const offset = (row % 2) * step * 0.5;
      for (let x = Math.floor((left - offset) / step) * step + offset; x < right; x += step) {
        ctx.moveTo(x, y);
        ctx.lineTo(x - (x - v.x) * 0.02, y + depth);
      }
    }
    y += depth;
  }
  ctx.stroke();
}

// ─── Holika ──────────────────────────────────────────────────────────────────

export const PYRE = { x: 0, y: 2.7, w: 1.35, h: 1.55, pole: 3.1 };

/** Pile height at `dx` from the pyre's middle, as a fraction of its full height. */
export function pileProfile(dx: number) {
  const t = clamp(Math.abs(dx) / PYRE.w);
  return Math.pow(1 - t * t, 0.9);
}

/** The pyre before it is lit, painted once: logs leant together, garlands of upla, raw cotton thread. */
export function paintPyre(scale: number, charred: boolean) {
  const W = PYRE.w * 2 + 0.6;
  const H = PYRE.h + 0.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(W * scale);
  canvas.height = Math.ceil(H * scale);
  const g = canvas.getContext("2d")!;
  g.scale(scale, scale);
  g.translate(W / 2, PYRE.h + 0.2);
  const random = mulberry32(charred ? 31 : 29);
  const wood = (t: number): RGB => (charred ? mix([24, 16, 14], [60, 30, 20], t) : mix([92, 62, 40], [150, 110, 72], t));
  // The heap's body, so no gaps show between the logs.
  g.fillStyle = rgb(charred ? [20, 12, 10] : [70, 48, 32]);
  g.beginPath();
  g.moveTo(-PYRE.w, 0);
  for (let i = 0; i <= 40; i++) {
    const dx = lerp(-PYRE.w, PYRE.w, i / 40);
    g.lineTo(dx, -PYRE.h * pileProfile(dx) * 0.96);
  }
  g.closePath();
  g.fill();
  // Logs leant in towards the pole, in three layers.
  g.lineCap = "round";
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 26; i++) {
      const bx = lerp(-PYRE.w * 0.98, PYRE.w * 0.98, random());
      const topX = bx * (0.1 + random() * 0.25);
      const topY = -PYRE.h * lerp(0.75, 1.02, random()) * pileProfile(topX);
      const baseY = -PYRE.h * pileProfile(bx) * 0.15 * layer;
      g.strokeStyle = rgb(wood(random()));
      g.lineWidth = 0.05 + random() * 0.05;
      g.beginPath();
      g.moveTo(bx, baseY);
      g.lineTo(topX + (random() - 0.5) * 0.2, topY);
      g.stroke();
    }
  }
  // Cross pieces, and dry twigs sticking out.
  for (let i = 0; i < 18; i++) {
    const y = -PYRE.h * random() * 0.8;
    const half = PYRE.w * pileProfile(0) * Math.sqrt(1 - Math.abs(y) / PYRE.h) * 0.9;
    g.strokeStyle = rgb(wood(random()));
    g.lineWidth = 0.035 + random() * 0.03;
    g.beginPath();
    g.moveTo(-half * random(), y);
    g.lineTo(half * random(), y + (random() - 0.5) * 0.2);
    g.stroke();
  }
  // Garlands of upla (cow-dung cakes) draped round it.
  for (let row = 0; row < 4; row++) {
    const y = -PYRE.h * (0.18 + row * 0.2);
    const half = PYRE.w * Math.sqrt(1 - Math.pow(Math.abs(y) / PYRE.h, 1.2)) * 0.95;
    const count = 9 - row;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = lerp(-half, half, t);
      const sag = Math.sin(t * Math.PI) * 0.1;
      const r = 0.075 - row * 0.008;
      g.fillStyle = rgb(charred ? [30, 22, 18] : mix([108, 84, 50], [140, 112, 70], random()));
      g.beginPath();
      g.ellipse(x, y + sag, r, r * 0.85, 0, 0, TAU);
      g.fill();
      g.fillStyle = rgb(charred ? [14, 10, 8] : [70, 52, 32]);
      g.beginPath();
      g.arc(x, y + sag, r * 0.25, 0, TAU);
      g.fill();
    }
  }
  if (!charred) {
    // Raw cotton thread, wound round the heap on the parikrama.
    g.strokeStyle = "rgba(245, 240, 225, 0.85)";
    g.lineWidth = 0.012;
    for (let i = 0; i < 5; i++) {
      const y = -0.28 - i * 0.035;
      const half = PYRE.w * pileProfile(0) * Math.sqrt(1 - Math.abs(y) / PYRE.h);
      g.beginPath();
      g.moveTo(-half, y);
      g.quadraticCurveTo(0, y + 0.1, half, y);
      g.stroke();
    }
  } else {
    // Embers in the cracks.
    for (let i = 0; i < 90; i++) {
      const x = lerp(-PYRE.w, PYRE.w, random());
      const y = -PYRE.h * pileProfile(x) * random();
      g.fillStyle = `rgba(255, ${Math.floor(90 + random() * 80)}, 30, ${0.4 + random() * 0.5})`;
      g.fillRect(x, y, 0.03 + random() * 0.06, 0.012 + random() * 0.02);
    }
  }
  return { canvas, width: W, height: H };
}

/** Offerings round the foot of the pyre: coconuts, marigolds, a lota, heaps of roli and rice. */
export function drawOfferings(ctx: Ctx) {
  const { x, y } = PYRE;
  const items: [number, number][] = [
    [-1.0, 0.18],
    [-0.45, 0.28],
    [0.3, 0.3],
    [0.95, 0.2],
  ];
  for (const [dx, dy] of items) {
    ctx.fillStyle = "#5a3a1e";
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy - 0.06, 0.1, 0.085, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#7a5230";
    ctx.beginPath();
    ctx.ellipse(x + dx - 0.03, y + dy - 0.09, 0.03, 0.025, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#f29a1a";
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    ctx.beginPath();
    ctx.arc(x + lerp(-1.3, 1.3, t), y + 0.08 + Math.sin(t * Math.PI) * 0.34, 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#c8201e";
  ctx.beginPath();
  ctx.ellipse(x - 0.7, y + 0.36, 0.12, 0.04, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#f2eee0";
  ctx.beginPath();
  ctx.ellipse(x + 0.65, y + 0.38, 0.12, 0.04, 0, Math.PI, 0);
  ctx.fill();
  // A clay diya, whose flame lights the pyre.
  ctx.fillStyle = "#8a4a22";
  ctx.beginPath();
  ctx.ellipse(x + 0.62, y + 0.33, 0.07, 0.03, 0, 0, Math.PI);
  ctx.fill();
  // A brass lota of water.
  ctx.fillStyle = "#c99a3a";
  ctx.beginPath();
  ctx.ellipse(x + 0.02, y + 0.33, 0.1, 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - 0.04, y + 0.18, 0.08, 0.08);
}

/** A tongue of the bonfire, `height` tall and `width` wide at the base, standing on (x, y). */
export function tongue(ctx: Ctx, x: number, y: number, height: number, width: number, seconds: number, seed: number, heat = 1) {
  const h = height * flicker(seconds * 0.6, seed);
  const sway = Math.sin(seconds * 3.1 + seed * 4.3) * width * 0.35 + Math.sin(seconds * 7.7 + seed) * width * 0.12;
  const tip = { x: x + sway, y: y - h };
  const body = ctx.createLinearGradient(x, y, x, tip.y);
  body.addColorStop(0, `rgba(255, ${Math.round(150 + 60 * heat)}, 60, 0.95)`);
  body.addColorStop(0.35, "rgba(255, 140, 30, 0.9)");
  body.addColorStop(0.75, "rgba(230, 70, 20, 0.6)");
  body.addColorStop(1, "rgba(160, 30, 10, 0)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.bezierCurveTo(x - width * 0.6, y - h * 0.4, tip.x - width * 0.2, tip.y + h * 0.35, tip.x, tip.y);
  ctx.bezierCurveTo(tip.x + width * 0.25, tip.y + h * 0.4, x + width * 0.6, y - h * 0.35, x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

/** Holika's pile, long after: a low grey mound of ash, with a thread of smoke. */
export function drawAsh(ctx: Ctx, glowing: number) {
  const { x, y } = PYRE;
  const ash = ctx.createLinearGradient(0, y - 0.5, 0, y);
  ash.addColorStop(0, "#a8a098");
  ash.addColorStop(1, "#6a625c");
  ctx.fillStyle = ash;
  ctx.beginPath();
  ctx.moveTo(x - 1.3, y);
  ctx.quadraticCurveTo(x - 0.8, y - 0.55, x, y - 0.55);
  ctx.quadraticCurveTo(x + 0.8, y - 0.55, x + 1.3, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2c24";
  ctx.lineWidth = 0.05;
  ctx.lineCap = "round";
  for (const [a, b, c, d] of [
    [-0.7, -0.1, -0.2, -0.4],
    [0.1, -0.45, 0.6, -0.15],
    [-0.3, -0.2, 0.3, -0.3],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + a, y + b);
    ctx.lineTo(x + c, y + d);
    ctx.stroke();
  }
  if (glowing > 0.01) {
    ctx.fillStyle = `rgba(255, 120, 30, ${0.7 * glowing})`;
    for (let i = 0; i < 14; i++) ctx.fillRect(x - 0.8 + i * 0.12, y - 0.25 - Math.sin(i * 1.7) * 0.12, 0.05, 0.02);
  }
}

// ─── The thali of colour ────────────────────────────────────────────────────

export const THALI = { x: -5.5, y: 1.45, r: 0.5 };

/** A brass plate with five heaps of gulal, a pichkari beside it. */
export function drawThali(ctx: Ctx, colours: RGB[]) {
  const { x, y, r } = THALI;
  ctx.fillStyle = "rgba(60, 40, 20, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x + 0.06, y + 0.06, r * 1.04, r * 0.3, 0, 0, TAU);
  ctx.fill();
  const brass = ctx.createLinearGradient(x - r, y, x + r, y);
  brass.addColorStop(0, "#9a6a1e");
  brass.addColorStop(0.4, "#f0c860");
  brass.addColorStop(0.7, "#c8942e");
  brass.addColorStop(1, "#8a5a18");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#b8862a";
  ctx.beginPath();
  ctx.ellipse(x, y - 0.01, r * 0.88, r * 0.23, 0, 0, TAU);
  ctx.fill();
  // Heaps, back row first.
  const heaps: [number, number, number][] = [
    [-0.26, -0.05, 0],
    [0.05, -0.08, 1],
    [0.3, -0.03, 2],
    [-0.12, 0.05, 3],
    [0.18, 0.06, 4],
  ];
  for (const [dx, dy, i] of heaps) {
    const c = colours[i % colours.length];
    const hx = x + dx * r * 2;
    const hy = y + dy * r;
    const hr = r * 0.2;
    ctx.fillStyle = rgb(mix(c, [0, 0, 0], 0.18));
    ctx.beginPath();
    ctx.ellipse(hx, hy, hr * 1.05, hr * 0.35, 0, 0, TAU);
    ctx.fill();
    const heap = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.6, 0, hx, hy - hr * 0.2, hr * 1.1);
    heap.addColorStop(0, rgb(mix(c, [255, 255, 255], 0.3)));
    heap.addColorStop(1, rgb(mix(c, [0, 0, 0], 0.1)));
    ctx.fillStyle = heap;
    ctx.beginPath();
    ctx.moveTo(hx - hr, hy);
    ctx.quadraticCurveTo(hx - hr * 0.6, hy - hr * 0.95, hx, hy - hr * 0.95);
    ctx.quadraticCurveTo(hx + hr * 0.6, hy - hr * 0.95, hx + hr, hy);
    ctx.quadraticCurveTo(hx, hy + hr * 0.3, hx - hr, hy);
    ctx.fill();
  }
  // A brass pichkari lying beside the plate: barrel, nozzle, and the plunger's ring behind.
  ctx.save();
  ctx.translate(x + r * 1.05, y + 0.1);
  ctx.rotate(-0.25);
  const tube = ctx.createLinearGradient(0, -0.07, 0, 0.07);
  tube.addColorStop(0, "#f6d878");
  tube.addColorStop(0.5, "#d0a040");
  tube.addColorStop(1, "#8a5a18");
  ctx.fillStyle = tube;
  ctx.fillRect(0, -0.065, 0.34, 0.13);
  ctx.beginPath();
  ctx.moveTo(0.34, -0.065);
  ctx.lineTo(0.44, -0.02);
  ctx.lineTo(0.56, -0.012);
  ctx.lineTo(0.56, 0.012);
  ctx.lineTo(0.44, 0.02);
  ctx.lineTo(0.34, 0.065);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8a5a18";
  for (const rx of [0.04, 0.17, 0.3]) ctx.fillRect(rx, -0.07, 0.018, 0.14);
  ctx.fillRect(-0.2, -0.012, 0.2, 0.024);
  ctx.strokeStyle = "#b8862a";
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.arc(-0.25, 0, 0.05, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ─── Thandai ─────────────────────────────────────────────────────────────────

export const CHOWKI = { x: 13.3, y: 1.1, w: 2.3 };

/** A low table at the neighbours' door: a handi of thandai, clay cups, and a plate of gujiya. */
export function drawThandai(ctx: Ctx, seconds: number) {
  const { x, y, w } = CHOWKI;
  const top = y - 0.42;
  // The chowki.
  ctx.fillStyle = "rgba(50, 30, 20, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 0.02, w * 0.55, 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#5a3218";
  ctx.fillRect(x - w / 2 + 0.08, top, 0.1, 0.42);
  ctx.fillRect(x + w / 2 - 0.18, top, 0.1, 0.42);
  ctx.fillStyle = "#7c4822";
  ctx.fillRect(x - w / 2, top - 0.1, w, 0.12);
  ctx.fillStyle = "#9a5e2e";
  ctx.fillRect(x - w / 2, top - 0.1, w, 0.025);

  // The handi: brass, wide-mouthed, full to the brim.
  const hx = x - 0.55;
  const hy = top - 0.1;
  const brass = ctx.createLinearGradient(hx - 0.4, 0, hx + 0.4, 0);
  brass.addColorStop(0, "#8a5a18");
  brass.addColorStop(0.35, "#f0c860");
  brass.addColorStop(0.65, "#c8942e");
  brass.addColorStop(1, "#7a4a12");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(hx - 0.3, hy - 0.62);
  ctx.quadraticCurveTo(hx - 0.48, hy - 0.3, hx - 0.3, hy);
  ctx.lineTo(hx + 0.3, hy);
  ctx.quadraticCurveTo(hx + 0.48, hy - 0.3, hx + 0.3, hy - 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d9a441";
  ctx.beginPath();
  ctx.ellipse(hx, hy - 0.62, 0.33, 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#efdcb8";
  ctx.beginPath();
  ctx.ellipse(hx, hy - 0.62, 0.29, 0.055, 0, 0, TAU);
  ctx.fill();
  // Rose petals, almond slivers and saffron on top, turning slowly.
  for (let i = 0; i < 9; i++) {
    const a = seconds * 0.15 + i * 2.4;
    const r = 0.06 + (i % 3) * 0.07;
    ctx.fillStyle = i % 3 === 0 ? "#c8283a" : i % 3 === 1 ? "#f4ecd8" : "#e0801a";
    ctx.beginPath();
    ctx.ellipse(hx + Math.cos(a) * r, hy - 0.62 + Math.sin(a) * r * 0.18, 0.025, 0.01, a, 0, TAU);
    ctx.fill();
  }
  // The ladle.
  ctx.strokeStyle = "#b8862a";
  ctx.lineWidth = 0.035;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + 0.08, hy - 0.64);
  ctx.lineTo(hx + 0.4, hy - 1.05);
  ctx.stroke();

  // Kulhads of thandai.
  for (const [dx, dy] of [
    [0.02, 0],
    [0.28, 0.05],
    [0.16, -0.06],
  ]) {
    const cx = x + dx;
    const cy = top - 0.1 + dy;
    ctx.fillStyle = "#a4522c";
    ctx.beginPath();
    ctx.moveTo(cx - 0.09, cy - 0.2);
    ctx.lineTo(cx + 0.09, cy - 0.2);
    ctx.lineTo(cx + 0.065, cy);
    ctx.lineTo(cx - 0.065, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f0dfbe";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.2, 0.09, 0.022, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e0801a";
    ctx.fillRect(cx - 0.02, cy - 0.205, 0.03, 0.006);
  }

  // A brass plate heaped with gujiya.
  const gx = x + 0.7;
  const gy = top - 0.12;
  ctx.fillStyle = "#c8942e";
  ctx.beginPath();
  ctx.ellipse(gx, gy, 0.42, 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e6b850";
  ctx.beginPath();
  ctx.ellipse(gx, gy - 0.01, 0.36, 0.06, 0, 0, TAU);
  ctx.fill();
  const gujiyas: [number, number, number][] = [
    [-0.22, 0, 0.1],
    [0, 0.01, -0.1],
    [0.21, 0, 0.15],
    [-0.1, -0.07, 0.05],
    [0.12, -0.08, -0.15],
    [0.01, -0.14, 0],
  ];
  for (const [dx, dy, a] of gujiyas) {
    gujiya(ctx, gx + dx, gy + dy - 0.02, 0.13, a);
  }
}

/** One gujiya: a half-moon of fried pastry, its edge crimped. */
export function gujiya(ctx: Ctx, x: number, y: number, r: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const crust = ctx.createLinearGradient(0, -r * 0.6, 0, 0);
  crust.addColorStop(0, "#f0cf8a");
  crust.addColorStop(1, "#c88a3a");
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(-r, -r * 0.75, 0, -r * 0.75);
  ctx.quadraticCurveTo(r, -r * 0.75, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b87a30";
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const a = Math.PI + t * Math.PI;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.72 + r * 0.02, r * 0.08, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 245, 220, 0.5)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.45, r * 0.3, r * 0.1, -0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─── The palash at the end of the lane ──────────────────────────────────────

export const PALASH = { x: 24.2, y: 0.9, h: 6.8 };

/** The palash tree in flower, painted once: black branches, and flame-orange flowers on bare wood. */
export function paintPalash(scale: number) {
  const W = 11;
  const H = PALASH.h + 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(W * scale);
  canvas.height = Math.ceil(H * scale);
  const g = canvas.getContext("2d")!;
  g.scale(scale, scale);
  g.translate(W / 2, H - 0.3);
  const random = mulberry32(912);
  const tips: { x: number; y: number; a: number }[] = [];
  g.lineCap = "round";
  const branch = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
    const bend = (random() - 0.5) * 0.5;
    const mx = x + Math.sin(angle + bend) * length * 0.5;
    const my = y - Math.cos(angle + bend) * length * 0.5;
    const ex = x + Math.sin(angle) * length;
    const ey = y - Math.cos(angle) * length;
    g.strokeStyle = rgb(mix([28, 18, 18], [58, 40, 36], random() * 0.5));
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(mx, my, ex, ey);
    g.stroke();
    if (depth === 0 || length < 0.35) {
      tips.push({ x: ex, y: ey, a: angle });
      return;
    }
    const n = depth > 3 ? 2 : 2 + Math.floor(random() * 2);
    for (let i = 0; i < n; i++) {
      const spread = (i / (n - 1 || 1) - 0.5) * (0.9 + random() * 0.5);
      branch(ex, ey, angle + spread + (random() - 0.5) * 0.3, length * (0.62 + random() * 0.2), width * 0.66, depth - 1);
    }
  };
  // A crooked trunk, leaning a little, and its first boughs.
  g.fillStyle = "#281a18";
  g.beginPath();
  g.moveTo(-0.32, 0);
  g.quadraticCurveTo(-0.2, -1.2, -0.12, -2.3);
  g.lineTo(0.18, -2.3);
  g.quadraticCurveTo(0.2, -1.2, 0.36, 0);
  g.closePath();
  g.fill();
  branch(0, -2.2, -0.75, 1.8, 0.22, 5);
  branch(0, -2.2, 0.2, 2.0, 0.24, 5);
  branch(0, -2.2, 0.9, 1.7, 0.2, 5);
  branch(-0.05, -1.5, -1.25, 1.3, 0.14, 4);
  // A few late leaves, three to a stalk.
  for (let i = 0; i < 40; i++) {
    const t = tips[Math.floor(random() * tips.length)];
    g.fillStyle = rgb(mix([70, 96, 50], [110, 130, 60], random()), 0.8);
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.ellipse(t.x + (random() - 0.5) * 0.5, t.y + 0.15 + random() * 0.3, 0.12, 0.08, random() * TAU, 0, TAU);
      g.fill();
    }
  }
  // Clusters of flowers along every twig: curved like a parrot's beak, orange on a black calyx.
  for (const t of tips) {
    const count = 10 + Math.floor(random() * 12);
    for (let i = 0; i < count; i++) {
      const along = random() * 0.7;
      const fx = t.x - Math.sin(t.a) * along + (random() - 0.5) * 0.4;
      const fy = t.y + Math.cos(t.a) * along + (random() - 0.5) * 0.35;
      palashFlower(g, fx, fy, 0.1 + random() * 0.07, random() * TAU, random());
    }
  }
  return { canvas, width: W, height: H, offsetY: H - 0.3 };
}

/** One tesu flower: a hooked orange petal from a dark velvet cup. */
export function palashFlower(g: Ctx, x: number, y: number, size: number, angle: number, shade = 0.5) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = rgb(mix([244, 84, 12], [255, 150, 36], shade));
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(size * 0.9, -size * 0.2, size * 1.1, size * 0.6);
  g.quadraticCurveTo(size * 0.6, size * 0.1, 0, size * 0.25);
  g.closePath();
  g.fill();
  g.fillStyle = "#2a1814";
  g.beginPath();
  g.ellipse(0, size * 0.12, size * 0.2, size * 0.16, 0, 0, TAU);
  g.fill();
  g.restore();
}

/** The low mud wall past the last house, and the fields beyond it. */
export function drawFields(ctx: Ctx, v: View) {
  const right = v.x + (v.width - v.ax) / v.scale + 1;
  if (right < LANE_END) return;
  ctx.fillStyle = "#c69a66";
  ctx.fillRect(LANE_END, -1.0, right - LANE_END, 1.0);
  ctx.fillStyle = "#ad8050";
  ctx.fillRect(LANE_END, -0.12, right - LANE_END, 0.12);
  ctx.fillStyle = "#d8b07a";
  ctx.beginPath();
  ctx.moveTo(LANE_END, -1.0);
  for (let x = LANE_END; x < right; x += 0.6) ctx.quadraticCurveTo(x + 0.3, -1.12, x + 0.6, -1.0);
  ctx.lineTo(right, -0.92);
  ctx.lineTo(LANE_END, -0.92);
  ctx.fill();
}

/** A brass degchi of orange tesu water under the tree, petals floating in it. */
export function drawTesuPot(ctx: Ctx, x: number, y: number, seconds: number) {
  ctx.fillStyle = "rgba(60, 30, 10, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 0.02, 0.5, 0.08, 0, 0, TAU);
  ctx.fill();
  const brass = ctx.createLinearGradient(x - 0.45, 0, x + 0.45, 0);
  brass.addColorStop(0, "#8a5a18");
  brass.addColorStop(0.4, "#f0c860");
  brass.addColorStop(1, "#7a4a12");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(x - 0.42, y - 0.42);
  ctx.quadraticCurveTo(x - 0.5, y - 0.05, x - 0.3, y);
  ctx.lineTo(x + 0.3, y);
  ctx.quadraticCurveTo(x + 0.5, y - 0.05, x + 0.42, y - 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8b04a";
  ctx.beginPath();
  ctx.ellipse(x, y - 0.42, 0.44, 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f07818";
  ctx.beginPath();
  ctx.ellipse(x, y - 0.42, 0.39, 0.052, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 6; i++) palashFlower(ctx, x - 0.25 + i * 0.1, y - 0.43 + Math.sin(seconds + i) * 0.008, 0.06, i * 1.3, 0.7);
}
