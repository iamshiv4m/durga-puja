// The pol: a row of carved timber houses round the chowk, each on its otla with a toran over the
// door and a jharokha above; the chabutro where the pigeons are fed; and the paving underfoot.
import { TAU, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import type { Tilt } from "./world";

export type House = {
  x: number;
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  roof: RGB;
  /** Windows that light at night, in units from the house's left edge and its foot (up negative). */
  windows: { x: number; y: number; w: number; h: number }[];
};

const WALLS: RGB[] = [
  [126, 172, 190],
  [150, 188, 150],
  [222, 190, 128],
  [222, 164, 150],
  [206, 204, 192],
  [172, 148, 200],
  [236, 214, 160],
];
const SHUTTERS: RGB[] = [
  [40, 110, 110],
  [150, 40, 40],
  [40, 70, 130],
  [60, 120, 60],
];
const WOOD: RGB = [92, 54, 32];
const PPU = 56;

/** Paints one house front, `w` by `h` units. */
function paintHouse(random: () => number, w: number, h: number): Omit<House, "x"> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * PPU);
  canvas.height = Math.round(h * PPU);
  const g = canvas.getContext("2d")!;
  g.scale(PPU, PPU);
  const wall = WALLS[Math.floor(random() * WALLS.length)];
  const shutter = SHUTTERS[Math.floor(random() * SHUTTERS.length)];
  const windows: House["windows"] = [];
  const Y = (up: number) => h - up;
  const tiled = random() < 0.55;
  const roofH = tiled ? 0.9 : 0.5;
  const top = h - roofH;

  // The wall, weathered.
  g.fillStyle = rgb(wall);
  g.fillRect(0, Y(top), w, top);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(60, 40, 30, ${0.03 + random() * 0.05})`;
    g.fillRect(random() * w, Y(random() * top), 0.3 + random() * 0.8, 0.2 + random() * 0.6);
  }
  const shade = g.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(40, 20, 10, 0.25)");
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);

  // The otla: a stone plinth to sit on, with steps up to the door.
  g.fillStyle = "#b8ab96";
  g.fillRect(0, Y(0.5), w, 0.5);
  g.fillStyle = "rgba(60, 40, 30, 0.35)";
  g.fillRect(0, Y(0.5), w, 0.06);
  const door = { x: w * (0.3 + random() * 0.4), w: 0.95 };
  g.fillStyle = "#a89a84";
  g.fillRect(door.x - 0.55, Y(0.25), 1.1, 0.25);

  // The door: a carved frame, studded leaves, and a toran of mango leaves over it.
  g.fillStyle = rgb(WOOD);
  g.fillRect(door.x - door.w / 2 - 0.12, Y(2.55), door.w + 0.24, 2.05);
  g.fillStyle = rgb(mix(shutter, [20, 10, 10], 0.35));
  g.fillRect(door.x - door.w / 2, Y(2.4), door.w, 1.9);
  g.strokeStyle = "rgba(230, 190, 110, 0.8)";
  g.lineWidth = 0.03;
  g.strokeRect(door.x - door.w / 2 + 0.08, Y(2.3), door.w / 2 - 0.12, 1.7);
  g.strokeRect(door.x + 0.04, Y(2.3), door.w / 2 - 0.12, 1.7);
  g.fillStyle = "#e0b050";
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.arc(door.x + (i % 2 ? 0.22 : -0.22), Y(2.1 - Math.floor(i / 2) * 0.28), 0.03, 0, TAU);
    g.fill();
  }
  for (let i = 0; i < 9; i++) {
    const lx = door.x - door.w / 2 - 0.05 + (i / 8) * (door.w + 0.1);
    g.fillStyle = i % 2 ? "#3f8a32" : "#2f7028";
    g.beginPath();
    g.moveTo(lx - 0.06, Y(2.52));
    g.quadraticCurveTo(lx, Y(2.1), lx + 0.06, Y(2.52));
    g.fill();
  }
  // A beaded toran with little embroidered flags.
  const colours = ["#d42a2a", "#f5c518", "#2a6bd8", "#2fb36b", "#d6246e"];
  for (let i = 0; i < 7; i++) {
    const lx = door.x - door.w / 2 + 0.05 + (i / 6) * (door.w - 0.1);
    g.fillStyle = colours[i % colours.length];
    g.beginPath();
    g.moveTo(lx - 0.07, Y(2.6));
    g.lineTo(lx + 0.07, Y(2.6));
    g.lineTo(lx, Y(2.38));
    g.fill();
  }

  // A barred window beside the door.
  const side = door.x > w / 2 ? door.x - 1.3 : door.x + 0.85;
  if (side > 0.2 && side + 0.6 < w - 0.1) {
    g.fillStyle = "#2a1c18";
    g.fillRect(side, Y(2.0), 0.6, 0.9);
    g.strokeStyle = "#1a1210";
    g.lineWidth = 0.035;
    for (let i = 1; i < 5; i++) {
      g.beginPath();
      g.moveTo(side + i * 0.12, Y(2.0));
      g.lineTo(side + i * 0.12, Y(1.1));
      g.stroke();
    }
    windows.push({ x: side, y: -2.0, w: 0.6, h: 0.9 });
  }

  // Floor beams with their row of carved bracket ends.
  const floors = h > 6.2 ? [2.9, 4.8] : [2.9];
  for (const at of floors) {
    g.fillStyle = rgb(WOOD);
    g.fillRect(-0.05, Y(at), w + 0.1, 0.2);
    g.fillStyle = rgb(mix(WOOD, [0, 0, 0], 0.3));
    for (let x = 0.1; x < w - 0.05; x += 0.28) g.fillRect(x, Y(at) + 0.2, 0.1, 0.12);
  }

  // The jharokha on the first floor: carved brackets under a balcony, a lattice rail, shutters.
  const jw = Math.min(w - 0.5, 1.6 + random() * 0.8);
  const jx = (w - jw) / 2 + (random() - 0.5) * 0.4;
  g.fillStyle = rgb(mix(shutter, [255, 255, 255], 0.1));
  g.fillRect(jx + 0.15, Y(4.6), jw - 0.3, 1.5);
  g.fillStyle = "#2a1812";
  g.fillRect(jx + 0.4, Y(4.45), jw - 0.8, 1.3);
  windows.push({ x: jx + 0.4, y: -4.45, w: jw - 0.8, h: 1.3 });
  g.fillStyle = rgb(WOOD);
  g.fillRect(jx, Y(3.75), jw, 0.12);
  g.fillRect(jx, Y(3.2), jw, 0.1);
  g.strokeStyle = rgb(WOOD);
  g.lineWidth = 0.04;
  for (let x = jx + 0.06; x < jx + jw; x += 0.12) {
    g.beginPath();
    g.moveTo(x, Y(3.63));
    g.lineTo(x, Y(3.2));
    g.stroke();
  }
  for (let i = 0; i <= 3; i++) {
    const bx = jx + 0.1 + (i / 3) * (jw - 0.2);
    g.fillStyle = rgb(WOOD);
    g.beginPath();
    g.moveTo(bx - 0.08, Y(3.1));
    g.quadraticCurveTo(bx + 0.14, Y(2.95), bx, Y(2.62));
    g.lineTo(bx - 0.06, Y(2.66));
    g.quadraticCurveTo(bx + 0.02, Y(2.9), bx - 0.14, Y(3.05));
    g.fill();
  }
  // Someone watching the garba from the jharokha.
  if (random() < 0.6) {
    const px = jx + 0.5 + random() * (jw - 1);
    g.fillStyle = "#3a2218";
    g.beginPath();
    g.arc(px, Y(3.95), 0.13, 0, TAU);
    g.fill();
    g.fillStyle = colours[Math.floor(random() * colours.length)];
    g.fillRect(px - 0.18, Y(3.82), 0.36, 0.2);
  }

  // Upper windows with arched heads and open shutters.
  const upper = floors.length > 1 ? 5.1 : 3.3;
  if (floors.length > 1 || h > 5.2) {
    const count = w > 3.2 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const wx = ((i + 0.5) / count) * w - 0.27;
      const wy = floors.length > 1 ? upper + 0.9 : upper + 1.6;
      if (wy + 0.2 > top) continue;
      g.fillStyle = rgb(shutter);
      g.fillRect(wx - 0.22, Y(wy), 0.2, 0.85);
      g.fillRect(wx + 0.56, Y(wy), 0.2, 0.85);
      g.fillStyle = "#2a1812";
      g.beginPath();
      g.moveTo(wx, Y(wy - 0.85));
      g.lineTo(wx, Y(wy));
      g.quadraticCurveTo(wx + 0.27, Y(wy + 0.35), wx + 0.54, Y(wy));
      g.lineTo(wx + 0.54, Y(wy - 0.85));
      g.fill();
      windows.push({ x: wx, y: -wy, w: 0.54, h: 0.85 });
    }
  }

  // Cornice, then the roof.
  g.fillStyle = rgb(WOOD);
  g.fillRect(-0.1, Y(top), w + 0.2, 0.16);
  const roof: RGB = tiled ? [150, 70, 48] : mix(wall, [255, 255, 255], 0.2);
  if (tiled) {
    g.fillStyle = rgb(roof);
    g.beginPath();
    g.moveTo(-0.15, Y(top));
    g.lineTo(0.3, Y(h));
    g.lineTo(w - 0.3, Y(h));
    g.lineTo(w + 0.15, Y(top));
    g.fill();
    g.strokeStyle = "rgba(60, 24, 16, 0.5)";
    g.lineWidth = 0.03;
    for (let x = 0; x < w; x += 0.16) {
      g.beginPath();
      g.moveTo(x, Y(top));
      g.lineTo(lerp(0.3, w - 0.3, x / w), Y(h));
      g.stroke();
    }
  } else {
    g.fillStyle = rgb(roof);
    g.fillRect(0, Y(h), w, roofH);
    g.fillStyle = rgb(mix(roof, [0, 0, 0], 0.2));
    for (let x = 0.1; x < w; x += 0.4) g.fillRect(x, Y(h) + 0.12, 0.2, 0.2);
  }
  return { w, h, canvas, roof, windows };
}

/** The back row of the chowk and on along the street to the edge of town. */
export function makeHouses(from: number, to: number) {
  const random = mulberry32(7331);
  const houses: House[] = [];
  let x = from;
  for (let guard = 0; x < to && guard < 60; guard++) {
    const w = 2.6 + random() * 1.3;
    const h = 5.2 + random() * 2.2;
    houses.push({ x, ...paintHouse(random, w, h) });
    x += w + 0.02;
  }
  return houses;
}

/** A house front standing on the back line at `z`, and its roof going back when seen from above. */
export function drawHouse(g: Ctx, t: Tilt, house: House, z: number) {
  const base = z * t.s;
  const top = base - house.h * t.c;
  if (t.s > 0.5) {
    g.fillStyle = rgb(mix(house.roof, [40, 30, 30], 0.25));
    g.fillRect(house.x, top - 5 * t.s, house.w + 0.02, 5 * t.s);
  }
  g.drawImage(house.canvas, house.x, top, house.w, house.h * t.c);
}

// ─── The chabutro ────────────────────────────────────────────────────────────

/** The pigeon house on its pillar, the heart of every pol, with its birds. */
export function drawChabutro(g: Ctx, x: number, z: number, t: Tilt, seconds: number, dawn: number) {
  const base = z * t.s;
  const Y = (h: number) => base - h * t.c;
  // The plinth and the carved pillar.
  g.fillStyle = "#c8b89a";
  g.fillRect(x - 0.5, Y(0.5), 1.0, 0.5 * t.c);
  g.fillStyle = "#b0a080";
  g.beginPath();
  g.ellipse(x, Y(0.5), 0.5, 0.5 * t.s, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#e4d6b8";
  g.fillRect(x - 0.09, Y(4.2), 0.18, 3.7 * t.c);
  g.fillStyle = "#a88c64";
  for (const h of [1.2, 2.2, 3.2]) g.fillRect(x - 0.13, Y(h + 0.08), 0.26, 0.08 * t.c);
  // The feeding tray, the little pavilion and its dome.
  g.fillStyle = "#8a5a36";
  g.beginPath();
  g.ellipse(x, Y(4.2), 0.75, 0.75 * t.s + 0.02, 0, 0, TAU);
  g.fill();
  g.fillRect(x - 0.75, Y(4.2), 1.5, 0.12 * t.c);
  g.fillStyle = "#e8dcc0";
  for (const dx of [-0.55, -0.2, 0.2, 0.55]) g.fillRect(x + dx - 0.035, Y(4.9), 0.07, 0.7 * t.c);
  g.fillStyle = "#6a3a24";
  g.fillRect(x - 0.7, Y(5.0), 1.4, 0.12 * t.c);
  g.fillStyle = "#e8dcc0";
  g.beginPath();
  g.ellipse(x, Y(5.0), 0.62, 0.62 * t.s + 0.01, 0, 0, TAU);
  g.moveTo(x - 0.62, Y(5.0));
  g.quadraticCurveTo(x - 0.6, Y(5.7), x, Y(5.85));
  g.quadraticCurveTo(x + 0.6, Y(5.7), x + 0.62, Y(5.0));
  g.fill();
  g.fillStyle = "#c89a3a";
  g.fillRect(x - 0.03, Y(6.2), 0.06, 0.4 * t.c);
  g.beginPath();
  g.arc(x, Y(6.0), 0.07, 0, TAU);
  g.fill();

  // Pigeons: on the tray, and wheeling round it in the morning.
  g.fillStyle = "#7c7c8c";
  for (let i = 0; i < 6; i++) {
    const px = x - 0.55 + i * 0.22;
    g.beginPath();
    g.ellipse(px, Y(4.28), 0.07, 0.045, 0, 0, TAU);
    g.arc(px + 0.05, Y(4.33), 0.03, 0, TAU);
    g.fill();
  }
  if (dawn > 0.02) {
    g.globalAlpha = dawn;
    for (let i = 0; i < 9; i++) {
      const a = seconds * (0.5 + (i % 3) * 0.12) + i * 0.7;
      const r = 1.2 + (i % 4) * 0.5;
      const px = x + Math.cos(a) * r;
      const py = Y(4.8 + Math.sin(a * 1.3 + i) * 0.8 + (i % 3) * 0.4);
      const flap = Math.sin(seconds * 14 + i * 2) * 0.09;
      g.fillStyle = i % 3 ? "#8a8a9a" : "#6c6c7c";
      g.beginPath();
      g.ellipse(px, py, 0.07, 0.035, 0, 0, TAU);
      g.moveTo(px - 0.02, py);
      g.lineTo(px - 0.14, py - 0.03 - flap);
      g.lineTo(px + 0.02, py - 0.01);
      g.lineTo(px + 0.14, py - 0.03 - flap);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

// ─── The ground ──────────────────────────────────────────────────────────────

export type Ground = {
  canvas: HTMLCanvasElement;
  x: number;
  z: number;
  w: number;
  d: number;
};

/** Stone paving in the chowk, worn in a ring where the garba goes round, and marigold petals. */
export function paintChowk(): Ground {
  const x = -18;
  const z = -8;
  const w = 46;
  const d = 30;
  const ppu = 26;
  const canvas = document.createElement("canvas");
  canvas.width = w * ppu;
  canvas.height = d * ppu;
  const g = canvas.getContext("2d")!;
  g.scale(ppu, ppu);
  g.translate(-x, -z);
  const random = mulberry32(3030);
  g.fillStyle = "#a8967c";
  g.fillRect(x, z, w, d);
  // Slabs, each its own shade.
  for (let row = 0; row < d / 0.9; row++) {
    const zz = z + row * 0.9;
    let xx = x - random();
    for (let guard = 0; xx < x + w && guard < 200; guard++) {
      const sw = 0.9 + random() * 0.9;
      g.fillStyle = rgb(mix([164, 148, 122], [132, 118, 98], random()));
      g.fillRect(xx + 0.02, zz + 0.02, sw - 0.04, 0.86);
      xx += sw;
    }
  }
  // Dust and wear, and the ring the dancers have worn.
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${random() < 0.5 ? "90, 70, 50" : "200, 186, 160"}, ${0.04 + random() * 0.06})`;
    g.beginPath();
    g.arc(x + random() * w, z + random() * d, 0.1 + random() * 0.5, 0, TAU);
    g.fill();
  }
  for (const r of [2.3, 3.4, 4.5]) {
    g.strokeStyle = "rgba(96, 76, 56, 0.12)";
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.stroke();
  }
  // Marigold petals and the odd fallen rose.
  for (let i = 0; i < 260; i++) {
    const a = random() * TAU;
    const r = 1.2 + random() * 5;
    g.fillStyle = random() < 0.8 ? (random() < 0.5 ? "#f2a01a" : "#f07818") : "#c81e3a";
    g.beginPath();
    g.arc(Math.cos(a) * r, Math.sin(a) * r, 0.03 + random() * 0.03, 0, TAU);
    g.fill();
  }
  paintSathiya(g, 0, 1.55, 0.55);
  return { canvas, x, z, w, d };
}

/** A rangoli at the mandvi's foot: a sathiya inside a ring of petals and dots. */
function paintSathiya(g: Ctx, cx: number, cz: number, r: number) {
  const petals = ["#f5c518", "#d42a2a", "#f28a1a", "#2fb36b", "#d6246e", "#2a6bd8"];
  g.fillStyle = "#f3ead8";
  g.beginPath();
  g.arc(cx, cz, r, 0, TAU);
  g.fill();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.fillStyle = petals[i % petals.length];
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * r * 0.82, cz + Math.sin(a) * r * 0.82, r * 0.16, r * 0.08, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#b41e24";
  g.beginPath();
  g.arc(cx, cz, r * 0.6, 0, TAU);
  g.fill();
  g.strokeStyle = "#f5c518";
  g.lineWidth = r * 0.08;
  g.lineCap = "square";
  const k = r * 0.38;
  g.beginPath();
  g.moveTo(cx, cz - k);
  g.lineTo(cx, cz + k);
  g.moveTo(cx - k, cz);
  g.lineTo(cx + k, cz);
  g.moveTo(cx, cz - k);
  g.lineTo(cx + k, cz - k);
  g.moveTo(cx + k, cz);
  g.lineTo(cx + k, cz + k);
  g.moveTo(cx, cz + k);
  g.lineTo(cx - k, cz + k);
  g.moveTo(cx - k, cz);
  g.lineTo(cx - k, cz - k);
  g.stroke();
  g.fillStyle = "#f5c518";
  for (const [dx, dz] of [
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
    [-0.5, -0.5],
  ]) {
    g.beginPath();
    g.arc(cx + dx * k * 0.9, cz + dz * k * 0.9, r * 0.05, 0, TAU);
    g.fill();
  }
}

/** The maidan: open ground, trodden dust, and scraps of paper from last year's crackers. */
export function paintMaidan(): Ground {
  const x = 26;
  const z = -10;
  const w = 40;
  const d = 32;
  const ppu = 16;
  const canvas = document.createElement("canvas");
  canvas.width = w * ppu;
  canvas.height = d * ppu;
  const g = canvas.getContext("2d")!;
  g.scale(ppu, ppu);
  g.translate(-x, -z);
  const random = mulberry32(1010);
  const soil = g.createLinearGradient(x, 0, x + 4, 0);
  soil.addColorStop(0, "#a8967c");
  soil.addColorStop(1, "#9a8466");
  g.fillStyle = soil;
  g.fillRect(x, z, w, d);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${random() < 0.5 ? "80, 60, 40" : "190, 170, 130"}, ${0.05 + random() * 0.08})`;
    g.beginPath();
    g.ellipse(x + random() * w, z + random() * d, 0.2 + random() * 0.9, 0.1 + random() * 0.3, 0, 0, TAU);
    g.fill();
  }
  for (let i = 0; i < 90; i++) {
    g.fillStyle = "rgba(70, 110, 50, 0.35)";
    g.beginPath();
    g.arc(x + random() * w, z + random() * d, 0.1 + random() * 0.25, 0, TAU);
    g.fill();
  }
  return { canvas, x, z, w, d };
}

export function drawGround(g: Ctx, t: Tilt, ground: Ground) {
  g.drawImage(ground.canvas, ground.x, ground.z * t.s, ground.w, ground.d * t.s);
}
