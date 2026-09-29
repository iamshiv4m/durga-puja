// The places in the one long world, west to east: the village lane and the haveli's courtyard where
// the Lohri fire is lit, the tubewell and the cart at the edge of the wheat, the gurdwara with its
// Nishan Sahib and langar under a shamiana, and the Vaisakhi mela with its wooden jhoola.
//
// World units, y down. House fronts stand on y = 0; the courtyard and the road run towards the viewer.
import { TAU, flicker, lerp, mix, mulberry32, rgb, type Ctx, type RGB, type View } from "../paint";

export const FIRE = { x: 0.6, y: 3.1, w: 1.25, h: 1.7 };
export const DOOR = { x: -11.4, w: 1.05, h: 1.95 };
export const HAVELI = { x: -4.6, w: 10.4, h: 4.8 };
export const VILLAGE = { x0: -17.6, x1: 8.2 };
export const TUBEWELL = { x: 12.6, y: -1.3 };
export const CART = { x: 34.2, y: 1.6 };
export const GURDWARA = { x: 46.4, y: -0.9 };
export const NISHAN = { x: 40.6, y: 0.5, h: 9.6 };
export const LANGAR = { x0: 51.2, x1: 57.2, y0: 1.0, y1: 5.0 };
export const MELA = { x0: 57.6, x1: 80 };
export const JHOOLA = { x: 72, y: 0.4, r: 3.3 };
export const KABADDI = { x: 64.4, y: 4.9, rx: 2.0, ry: 0.7 };
export const JALEBI = { x: 60.2, y: 0.9 };

// ─── The village ────────────────────────────────────────────────────────────

export type House = {
  x: number;
  w: number;
  h: number;
  wall: RGB;
  trim: RGB;
  door: RGB;
  brick: boolean;
  windows: { x: number; y: number; w: number; h: number }[];
  doorX: number;
  roof: "parapet" | "stack" | "plain";
};

export function makeHouses(): House[] {
  const random = mulberry32(1313);
  const walls: RGB[] = [
    [198, 164, 118],
    [186, 150, 106],
    [222, 210, 186],
    [206, 180, 140],
    [168, 106, 78],
  ];
  const doors: RGB[] = [
    [52, 96, 128],
    [40, 110, 96],
    [120, 70, 40],
    [70, 80, 130],
  ];
  const houses: House[] = [];
  let x = VILLAGE.x0;
  let guard = 0;
  while (x < HAVELI.x - 0.2 && guard++ < 40) {
    const w = Math.min(2.4 + random() * 1.3, HAVELI.x - x);
    if (w < 1.4) break;
    const h = 2.6 + random() * 1.0;
    const wall = walls[Math.floor(random() * walls.length)];
    const brick = wall === walls[4];
    const doorX = x + w * (0.3 + random() * 0.4);
    const windows: House["windows"] = [];
    const wx = doorX < x + w / 2 ? x + w * 0.72 : x + w * 0.16;
    windows.push({ x: wx, y: -1.7, w: 0.5, h: 0.55 });
    houses.push({ x, w, h, wall, trim: mix(wall, [255, 255, 255], 0.35), door: doors[Math.floor(random() * doors.length)], brick, windows, doorX, roof: random() < 0.35 ? "stack" : random() < 0.6 ? "parapet" : "plain" });
    x += w;
  }
  // The neighbour's door where the children sing.
  const lane = houses.find((b) => b.x <= DOOR.x && b.x + b.w > DOOR.x);
  if (lane) lane.doorX = DOOR.x;
  // After the haveli, a last low house and the wall to the fields.
  x = HAVELI.x + HAVELI.w;
  houses.push({ x, w: VILLAGE.x1 - x, h: 2.4, wall: walls[1], trim: mix(walls[1], [255, 255, 255], 0.35), door: doors[1], brick: false, windows: [], doorX: x + 1.0, roof: "stack" });
  return houses;
}

export function drawHouse(g: Ctx, v: View, b: House) {
  const left = v.x - v.width / 2 / v.scale;
  const right = v.x + v.width / 2 / v.scale;
  if (b.x > right || b.x + b.w < left) return;
  // Wall, and the darker plinth where the lipai is renewed each year.
  g.fillStyle = rgb(b.wall);
  g.fillRect(b.x, -b.h, b.w + 0.02, b.h);
  g.fillStyle = rgb(mix(b.wall, [60, 40, 30], 0.25));
  g.fillRect(b.x, -0.35, b.w + 0.02, 0.35);
  if (b.brick) {
    // Small Nanakshahi bricks.
    g.strokeStyle = "rgba(90, 50, 40, 0.35)";
    g.lineWidth = 0.012;
    g.beginPath();
    for (let y = -b.h + 0.12; y < -0.35; y += 0.12) {
      g.moveTo(b.x, y);
      g.lineTo(b.x + b.w, y);
      const offset = Math.round(y / 0.12) % 2 ? 0 : 0.14;
      for (let x = b.x + offset; x < b.x + b.w; x += 0.28) {
        g.moveTo(x, y);
        g.lineTo(x, y + 0.12);
      }
    }
    g.stroke();
  } else {
    // The hand-smoothed mud plaster, in soft sweeps.
    g.strokeStyle = rgb(mix(b.wall, [255, 240, 210], 0.15), 0.5);
    g.lineWidth = 0.05;
    g.beginPath();
    for (let i = 0; i < b.w * 2; i++) {
      const x = b.x + 0.2 + i * 0.5;
      g.moveTo(x, -b.h + 0.4);
      g.quadraticCurveTo(x + 0.2, -b.h * 0.5, x - 0.05, -0.5);
    }
    g.stroke();
  }
  // The parapet (banera) along the roof.
  g.fillStyle = rgb(b.trim);
  g.fillRect(b.x - 0.04, -b.h - 0.12, b.w + 0.1, 0.14);
  if (b.roof === "parapet") {
    g.fillStyle = rgb(mix(b.wall, [255, 255, 255], 0.2));
    for (let x = b.x + 0.1; x < b.x + b.w - 0.2; x += 0.45) g.fillRect(x, -b.h - 0.34, 0.26, 0.22);
  } else if (b.roof === "stack") {
    // Firewood and paathiyan stacked on the roof for the winter.
    g.fillStyle = "#6a4a30";
    g.fillRect(b.x + b.w * 0.2, -b.h - 0.42, b.w * 0.35, 0.3);
    g.fillStyle = "#8a6a48";
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(b.x + b.w * 0.62 + (i % 3) * 0.2, -b.h - 0.2 - Math.floor(i / 3) * 0.13, 0.1, 0.07, 0, 0, TAU);
      g.fill();
    }
  }
  // The door: painted planks, iron studs, a lintel.
  const dw = DOOR.w;
  const dh = DOOR.h;
  const dx = b.doorX - dw / 2;
  g.fillStyle = rgb(mix(b.wall, [40, 30, 24], 0.35));
  g.fillRect(dx - 0.08, -dh - 0.12, dw + 0.16, dh + 0.12);
  g.fillStyle = rgb(b.door);
  g.fillRect(dx, -dh, dw, dh);
  g.strokeStyle = rgb(mix(b.door, [0, 0, 0], 0.35));
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(b.doorX, -dh);
  g.lineTo(b.doorX, 0);
  for (let i = 1; i < 4; i++) {
    g.moveTo(dx, -dh + (i * dh) / 4);
    g.lineTo(dx + dw, -dh + (i * dh) / 4);
  }
  g.stroke();
  g.fillStyle = "rgba(220, 190, 120, 0.8)";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      g.beginPath();
      g.arc(dx + 0.14 + j * (dw - 0.28), -dh + 0.25 + i * 0.45, 0.025, 0, TAU);
      g.fill();
    }
  }
  // Windows, barred.
  for (const w of b.windows) {
    g.fillStyle = rgb(mix(b.wall, [30, 22, 18], 0.4));
    g.fillRect(w.x - 0.06, w.y - 0.06, w.w + 0.12, w.h + 0.12);
    g.fillStyle = "#20160f";
    g.fillRect(w.x, w.y, w.w, w.h);
    g.strokeStyle = "rgba(120, 110, 100, 0.8)";
    g.lineWidth = 0.02;
    g.beginPath();
    for (let x = w.x + 0.1; x < w.x + w.w; x += 0.1) {
      g.moveTo(x, w.y);
      g.lineTo(x, w.y + w.h);
    }
    g.stroke();
  }
}

/** The haveli: two storeys of lime-washed brick, a great arched darwaza, a jharokha above it. */
export function drawHaveli(g: Ctx, v: View) {
  const { x, w, h } = HAVELI;
  if (x > v.x + v.width / 2 / v.scale || x + w < v.x - v.width / 2 / v.scale) return;
  const wall: RGB = [232, 216, 180];
  const trim: RGB = [150, 60, 44];
  g.fillStyle = rgb(wall);
  g.fillRect(x, -h, w, h);
  g.fillStyle = rgb(mix(wall, [80, 50, 30], 0.28));
  g.fillRect(x, -0.4, w, 0.4);
  // A band of red between the storeys, and the cornice.
  g.fillStyle = rgb(trim);
  g.fillRect(x - 0.05, -2.62, w + 0.1, 0.12);
  g.fillRect(x - 0.1, -h - 0.14, w + 0.2, 0.16);
  // Turrets at the corners.
  for (const cx of [x + 0.35, x + w - 0.35]) {
    g.fillStyle = rgb(mix(wall, [255, 255, 255], 0.2));
    g.fillRect(cx - 0.35, -h - 1.0, 0.7, 0.86);
    g.fillStyle = rgb(trim);
    g.beginPath();
    g.moveTo(cx - 0.45, -h - 1.0);
    g.quadraticCurveTo(cx, -h - 1.7, cx + 0.45, -h - 1.0);
    g.fill();
  }
  // Parapet with little arched cut-outs.
  g.fillStyle = rgb(mix(wall, [255, 255, 255], 0.15));
  g.fillRect(x + 0.7, -h - 0.5, w - 1.4, 0.36);
  g.fillStyle = rgb(mix(wall, [60, 40, 30], 0.4));
  for (let cx = x + 1.0; cx < x + w - 0.9; cx += 0.5) {
    g.beginPath();
    g.moveTo(cx - 0.12, -h - 0.16);
    g.lineTo(cx - 0.12, -h - 0.32);
    g.arc(cx, -h - 0.32, 0.12, Math.PI, 0);
    g.lineTo(cx + 0.12, -h - 0.16);
    g.fill();
  }
  // Upper windows, arched, with green shutters.
  for (let i = 0; i < 4; i++) {
    const wx = x + 1.2 + i * 2.4 + (i >= 2 ? 0.6 : 0);
    if (i === 2) continue;
    arch(g, wx, -3.1, 0.62, 1.1, "#241a14");
    g.fillStyle = "#3a7a64";
    g.fillRect(wx - 0.55, -3.1, 0.22, 1.1);
    g.fillRect(wx + 0.33, -3.1, 0.22, 1.1);
  }
  // The jharokha over the gate: a carved balcony on brackets.
  const gx = x + w / 2;
  g.fillStyle = rgb(mix(wall, [255, 255, 255], 0.25));
  g.fillRect(gx - 1.1, -4.1, 2.2, 1.3);
  arch(g, gx, -3.0, 0.9, 0.95, "#2a1c14");
  g.fillStyle = rgb(trim);
  g.fillRect(gx - 1.25, -2.9, 2.5, 0.14);
  g.beginPath();
  g.moveTo(gx - 1.25, -4.1);
  g.quadraticCurveTo(gx, -4.9, gx + 1.25, -4.1);
  g.fill();
  for (const bx of [gx - 0.9, gx, gx + 0.9]) {
    g.beginPath();
    g.moveTo(bx - 0.12, -2.76);
    g.lineTo(bx + 0.12, -2.76);
    g.lineTo(bx, -2.45);
    g.fill();
  }
  // The darwaza: an arch of red brick round two great studded doors, one of them open.
  arch(g, gx, 0, 1.25, 2.3, rgb(trim));
  arch(g, gx, 0, 1.05, 2.15, "#1a120e");
  g.fillStyle = "#6a3e22";
  g.fillRect(gx - 1.05, -1.8, 0.95, 1.8);
  g.fillStyle = "#4a2a16";
  g.fillRect(gx + 0.62, -1.8, 0.43, 1.8);
  g.fillStyle = "rgba(230, 196, 120, 0.85)";
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.fillRect(gx - 0.95 + j * 0.34, -1.65 + i * 0.36, 0.05, 0.05);
  // A lower window each side, and a niche for the lamp.
  for (const wx of [x + 1.3, x + w - 1.3]) {
    g.fillStyle = "#20160f";
    g.fillRect(wx - 0.35, -1.9, 0.7, 0.8);
    g.strokeStyle = "rgba(120, 110, 100, 0.8)";
    g.lineWidth = 0.02;
    g.beginPath();
    for (let bx = wx - 0.25; bx < wx + 0.35; bx += 0.12) {
      g.moveTo(bx, -1.9);
      g.lineTo(bx, -1.1);
    }
    g.stroke();
  }
}

function arch(g: Ctx, cx: number, base: number, halfW: number, height: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(cx - halfW, base);
  g.lineTo(cx - halfW, base - height + halfW);
  g.quadraticCurveTo(cx - halfW, base - height, cx, base - height - halfW * 0.25);
  g.quadraticCurveTo(cx + halfW, base - height, cx + halfW, base - height + halfW);
  g.lineTo(cx + halfW, base);
  g.closePath();
  g.fill();
}

/** Every lit window in the village, for the glow at night. */
export function villageWindows(houses: House[]) {
  const list: { x: number; y: number; r: number }[] = [];
  for (const b of houses) for (const w of b.windows) list.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 0.9 });
  const { x, w } = HAVELI;
  for (let i = 0; i < 4; i++) if (i !== 2) list.push({ x: x + 1.2 + i * 2.4 + (i >= 2 ? 0.6 : 0), y: -3.6, r: 1.0 });
  list.push({ x: x + w / 2, y: -3.5, r: 1.2 });
  list.push({ x: x + w / 2, y: -1.2, r: 1.5 });
  return list;
}

/** A charpai, the string bed, set out by the fire. */
export function drawCharpai(g: Ctx, x: number, y: number) {
  g.fillStyle = "#5a3a22";
  for (const lx of [-0.8, 0.8]) g.fillRect(x + lx - 0.04, y - 0.45, 0.08, 0.45);
  g.fillStyle = "#7a5230";
  g.fillRect(x - 0.9, y - 0.5, 1.8, 0.08);
  g.strokeStyle = "rgba(230, 210, 170, 0.8)";
  g.lineWidth = 0.02;
  g.beginPath();
  for (let i = 0; i < 12; i++) {
    g.moveTo(x - 0.85 + i * 0.15, y - 0.5);
    g.lineTo(x - 0.78 + i * 0.15, y - 0.43);
  }
  g.stroke();
}

/** The nalka, the hand pump by the lane. */
export function drawNalka(g: Ctx, x: number, y: number) {
  g.fillStyle = "#a89a88";
  g.fillRect(x - 0.35, y - 0.12, 0.7, 0.12);
  g.fillStyle = "#3a4a52";
  g.fillRect(x - 0.06, y - 1.0, 0.12, 0.9);
  g.beginPath();
  g.ellipse(x, y - 1.02, 0.1, 0.06, 0, 0, TAU);
  g.fill();
  g.fillRect(x + 0.04, y - 0.7, 0.26, 0.06);
  g.strokeStyle = "#3a4a52";
  g.lineWidth = 0.04;
  g.beginPath();
  g.moveTo(x - 0.04, y - 1.0);
  g.lineTo(x - 0.6, y - 1.18);
  g.stroke();
}

/** A gohara: cow-dung cakes stacked into a rounded heap, thatched on top. */
export function drawGohara(g: Ctx, x: number, y: number, size: number) {
  g.fillStyle = "#7a5a3c";
  g.beginPath();
  g.moveTo(x - 0.7 * size, y);
  g.quadraticCurveTo(x - 0.75 * size, y - 1.1 * size, x, y - 1.25 * size);
  g.quadraticCurveTo(x + 0.75 * size, y - 1.1 * size, x + 0.7 * size, y);
  g.fill();
  g.fillStyle = "rgba(150, 120, 86, 0.8)";
  const random = mulberry32(Math.round(x * 100));
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.ellipse(x + (random() - 0.5) * 1.1 * size, y - random() * 1.0 * size, 0.1 * size, 0.07 * size, 0, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#a88a50";
  g.beginPath();
  g.ellipse(x, y - 1.2 * size, 0.4 * size, 0.14 * size, 0, 0, TAU);
  g.fill();
}

// ─── The Lohri fire ─────────────────────────────────────────────────────────

/** The pile, painted once: logs leant into a cone over a ring of paathiyan. */
export function paintPyre(px: number, charred: boolean) {
  const w = FIRE.w * 2 + 0.6;
  const h = FIRE.h + 0.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * px);
  canvas.height = Math.round(h * px);
  const g = canvas.getContext("2d")!;
  g.scale(px, px);
  g.translate(w / 2, h - 0.15);
  const random = mulberry32(charred ? 8 : 7);
  const shade = (c: RGB) => (charred ? rgb(mix(c, [24, 14, 10], 0.75)) : rgb(c));
  // Logs, leaning in to the top.
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const bx = lerp(-FIRE.w, FIRE.w, t) + (random() - 0.5) * 0.1;
    const tx = (random() - 0.5) * 0.25;
    const ty = -FIRE.h * (0.9 + random() * 0.15);
    g.strokeStyle = shade(mix([112, 76, 46], [70, 46, 30], random()));
    g.lineWidth = 0.08 + random() * 0.05;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(bx, 0);
    g.lineTo(tx, ty);
    g.stroke();
  }
  // Paathiyan: round cakes of dung, stacked in a ring round the foot.
  for (let row = 0; row < 3; row++) {
    const n = 11 - row * 2;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = lerp(-FIRE.w * (1 - row * 0.18), FIRE.w * (1 - row * 0.18), t);
      const cy = -0.08 - row * 0.2;
      g.fillStyle = shade(mix([132, 104, 72], [104, 80, 56], random()));
      g.beginPath();
      g.ellipse(cx, cy, 0.14, 0.1, (random() - 0.5) * 0.4, 0, TAU);
      g.fill();
      g.strokeStyle = shade([80, 60, 40]);
      g.lineWidth = 0.012;
      g.stroke();
    }
  }
  if (charred) {
    // Embers glowing in the cracks.
    g.fillStyle = "rgba(255, 110, 30, 0.8)";
    for (let i = 0; i < 40; i++) g.fillRect((random() - 0.5) * FIRE.w * 1.8, -random() * FIRE.h * 0.7, 0.04, 0.02);
  }
  return { canvas, width: w, height: h };
}

/** One tongue of flame, `height` tall, standing on (x, y). */
export function tongue(g: Ctx, x: number, y: number, height: number, width: number, seconds: number, seed: number, heat: number) {
  const h = height * flicker(seconds * 1.4, seed);
  const lean = Math.sin(seconds * 3.1 + seed * 5) * width * 0.35 + Math.sin(seconds * 7.3 + seed) * width * 0.1;
  const tip = { x: x + lean, y: y - h };
  const grad = g.createLinearGradient(x, y, x, tip.y);
  grad.addColorStop(0, `rgba(255, 236, 170, ${0.95 * heat})`);
  grad.addColorStop(0.25, `rgba(255, 170, 50, ${0.9 * heat})`);
  grad.addColorStop(0.65, `rgba(236, 84, 20, ${0.7 * heat})`);
  grad.addColorStop(1, "rgba(160, 30, 10, 0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(x - width / 2, y);
  g.bezierCurveTo(x - width * 0.6, y - h * 0.4, tip.x - width * 0.1, tip.y + h * 0.35, tip.x, tip.y);
  g.bezierCurveTo(tip.x + width * 0.1, tip.y + h * 0.35, x + width * 0.6, y - h * 0.4, x + width / 2, y);
  g.closePath();
  g.fill();
}

/** Ash, and a scatter of burnt paathiyan, where the fire was. */
export function drawAsh(g: Ctx, embers: number) {
  g.fillStyle = "rgba(90, 84, 80, 0.9)";
  g.beginPath();
  g.ellipse(FIRE.x, FIRE.y - 0.05, FIRE.w * 1.1, 0.28, 0, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(50, 40, 36, 0.9)";
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.ellipse(FIRE.x - 0.9 + i * 0.22, FIRE.y - 0.12 - (i % 3) * 0.05, 0.16, 0.05, 0.2 * (i % 2), 0, TAU);
    g.fill();
  }
  if (embers > 0.01) {
    g.fillStyle = `rgba(255, 110, 30, ${0.8 * embers})`;
    for (let i = 0; i < 16; i++) g.fillRect(FIRE.x - 0.8 + ((i * 37) % 16) * 0.1, FIRE.y - 0.1 - ((i * 13) % 5) * 0.04, 0.05, 0.03);
  }
}

// ─── The fields' edge ───────────────────────────────────────────────────────

/** The tubewell's kotha: a brick room, and water pouring from its pipe into the channel. */
export function drawTubewell(g: Ctx, seconds: number, flowing: number) {
  const { x, y } = TUBEWELL;
  g.fillStyle = "#a8644a";
  g.fillRect(x - 1.0, y - 1.8, 2.0, 1.8);
  g.fillStyle = "#c8b8a0";
  g.fillRect(x - 1.1, y - 1.9, 2.2, 0.12);
  g.fillStyle = "#2a1c16";
  g.fillRect(x - 0.7, y - 1.3, 0.55, 1.3);
  g.fillStyle = "#8a8e90";
  g.fillRect(x + 0.2, y - 0.8, 0.9, 0.12);
  // The tank, and the khaal carrying water off into the field.
  g.fillStyle = "#b0a898";
  g.fillRect(x + 0.9, y - 0.4, 1.2, 0.4);
  g.fillStyle = "#6a94a8";
  g.fillRect(x + 0.95, y - 0.35, 1.1, 0.14);
  if (flowing > 0.01) {
    g.strokeStyle = `rgba(210, 232, 240, ${0.8 * flowing})`;
    g.lineWidth = 0.08;
    g.beginPath();
    g.moveTo(x + 1.1, y - 0.74);
    for (let i = 0; i <= 6; i++) g.lineTo(x + 1.1 + i * 0.03 + Math.sin(seconds * 20 + i) * 0.01, y - 0.74 + i * 0.07);
    g.stroke();
  }
}

/** The gadda, a bullock cart, loaded with sheaves and resting on its shafts. */
export function drawCart(g: Ctx, load: number) {
  const { x, y } = CART;
  g.strokeStyle = "#6a4426";
  g.lineWidth = 0.08;
  g.beginPath();
  g.moveTo(x - 1.6, y - 1.0);
  g.lineTo(x + 2.8, y - 0.02);
  g.stroke();
  g.fillStyle = "#7a5230";
  g.fillRect(x - 1.5, y - 1.15, 2.6, 0.14);
  if (load > 0.01) {
    g.fillStyle = "#d8b060";
    g.beginPath();
    g.moveTo(x - 1.6, y - 1.15);
    g.quadraticCurveTo(x - 1.4, y - 1.15 - 1.3 * load, x - 0.2, y - 1.2 - 1.5 * load);
    g.quadraticCurveTo(x + 1.0, y - 1.15 - 1.3 * load, x + 1.2, y - 1.15);
    g.fill();
    g.strokeStyle = "rgba(160, 120, 50, 0.7)";
    g.lineWidth = 0.02;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      g.moveTo(lerp(x - 1.4, x + 1.0, t), y - 1.15);
      g.lineTo(lerp(x - 1.2, x + 0.8, t) + 0.1, y - 1.2 - 1.3 * load * Math.sin(t * Math.PI));
    }
    g.stroke();
  }
  // Two tall wooden wheels.
  g.strokeStyle = "#4a2e1a";
  g.lineWidth = 0.07;
  g.beginPath();
  g.arc(x - 0.2, y - 0.62, 0.62, 0, TAU);
  g.stroke();
  g.lineWidth = 0.035;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.moveTo(x - 0.2, y - 0.62);
    g.lineTo(x - 0.2 + Math.cos(a) * 0.6, y - 0.62 + Math.sin(a) * 0.6);
  }
  g.stroke();
}

/** Sheaves, tied and stood up in a little stook to dry. */
export function drawStook(g: Ctx, x: number, y: number, size: number, colour: RGB) {
  for (let i = -2; i <= 2; i++) {
    const lean = i * 0.14;
    g.fillStyle = rgb(mix(colour, [120, 90, 40], 0.1 + Math.abs(i) * 0.08));
    g.beginPath();
    g.moveTo(x + i * 0.12 * size - 0.12 * size, y);
    g.lineTo(x + i * 0.12 * size + 0.12 * size, y);
    g.lineTo(x + Math.sin(lean) * 0.9 * size + 0.14 * size, y - 0.9 * size);
    g.lineTo(x + Math.sin(lean) * 0.9 * size - 0.14 * size, y - 0.9 * size);
    g.closePath();
    g.fill();
    g.fillStyle = rgb(mix(colour, [255, 230, 150], 0.3));
    g.beginPath();
    g.ellipse(x + Math.sin(lean) * 0.95 * size, y - 1.0 * size, 0.16 * size, 0.14 * size, lean, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#7a5a2a";
  g.fillRect(x - 0.3 * size, y - 0.5 * size, 0.6 * size, 0.06 * size);
}

/** A patang, a paper kite, with its tail; flown for Basant in Magh. */
export function drawKite(g: Ctx, x: number, y: number, size: number, colour: RGB, seconds: number, seed: number) {
  const tilt = Math.sin(seconds * 1.3 + seed) * 0.2;
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.fillStyle = rgb(colour);
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * 0.75, 0);
  g.lineTo(0, size);
  g.lineTo(-size * 0.75, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(255, 255, 255, 0.5)";
  g.lineWidth = size * 0.05;
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(0, size);
  g.moveTo(-size * 0.75, 0);
  g.quadraticCurveTo(0, -size * 0.3, size * 0.75, 0);
  g.stroke();
  g.fillStyle = rgb(mix(colour, [255, 255, 255], 0.4));
  g.beginPath();
  g.moveTo(0, size);
  g.lineTo(size * 0.2, size * 1.35);
  g.lineTo(-size * 0.2, size * 1.35);
  g.fill();
  g.restore();
  // The string, falling away to a roof far off.
  g.strokeStyle = "rgba(240, 240, 240, 0.35)";
  g.lineWidth = 0.012;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - 2, y + 3, x - 3.5 - seed, y + 8);
  g.stroke();
}

// ─── The gurdwara ───────────────────────────────────────────────────────────

/**
 * The Khanda: the double-edged khanda in the middle, the chakkar round it, and two kirpans crossed
 * beneath, their blades curving up either side. Drawn in `colour`, centred on (0, 0), `s` its half height.
 */
export function drawKhanda(g: Ctx, s: number, colour: string) {
  g.fillStyle = colour;
  g.strokeStyle = colour;
  // The chakkar.
  g.lineWidth = s * 0.13;
  g.beginPath();
  g.arc(0, -s * 0.05, s * 0.45, 0, TAU);
  g.stroke();
  // The khanda: a broad double-edged blade, pointed, with a guard and grip.
  g.beginPath();
  g.moveTo(0, -s * 1.0);
  g.quadraticCurveTo(s * 0.1, -s * 0.8, s * 0.12, -s * 0.5);
  g.lineTo(s * 0.13, s * 0.4);
  g.lineTo(-s * 0.13, s * 0.4);
  g.lineTo(-s * 0.12, -s * 0.5);
  g.quadraticCurveTo(-s * 0.1, -s * 0.8, 0, -s * 1.0);
  g.fill();
  g.fillRect(-s * 0.24, s * 0.4, s * 0.48, s * 0.08);
  g.fillRect(-s * 0.06, s * 0.48, s * 0.12, s * 0.28);
  g.beginPath();
  g.arc(0, s * 0.8, s * 0.07, 0, TAU);
  g.fill();
  // The two kirpans.
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * -s * 0.18, s * 0.72);
    g.quadraticCurveTo(side * s * 0.72, s * 0.62, side * s * 0.72, -s * 0.1);
    g.quadraticCurveTo(side * s * 0.72, -s * 0.36, side * s * 0.56, -s * 0.58);
    g.quadraticCurveTo(side * s * 0.6, -s * 0.2, side * s * 0.55, s * 0.12);
    g.quadraticCurveTo(side * s * 0.45, s * 0.52, side * -s * 0.12, s * 0.62);
    g.closePath();
    g.fill();
    // Its hilt, crossing the other below the khanda's grip.
    g.lineWidth = s * 0.08;
    g.beginPath();
    g.moveTo(side * -s * 0.14, s * 0.67);
    g.lineTo(side * -s * 0.42, s * 0.92);
    g.stroke();
  }
}

/** The gurdwara: white on its plinth, five arches, chhatris at the corners, a gilded dome. */
export function drawGurdwara(g: Ctx, v: View, day: RGB) {
  const { x, y } = GURDWARA;
  if (x + 6 < v.x - v.width / 2 / v.scale || x - 6 > v.x + v.width / 2 / v.scale) return;
  const white = rgb(mix([246, 244, 238], day, 0.1));
  const shade = rgb(mix([214, 210, 204], day, 0.1));
  const deep = "#b8a890";
  const gold = (y0: number, y1: number) => {
    const grad = g.createLinearGradient(x - 1.7, y0, x + 1.7, y1);
    grad.addColorStop(0, "#f6d27a");
    grad.addColorStop(0.45, "#e0a838");
    grad.addColorStop(1, "#a26a1e");
    return grad;
  };
  // Plinth and steps.
  g.fillStyle = shade;
  g.fillRect(x - 5.2, y - 0.6, 10.4, 0.6);
  g.fillStyle = white;
  for (let i = 0; i < 3; i++) g.fillRect(x - 1.4 - i * 0.2, y - 0.2 * (i + 1), 2.8 + i * 0.4, 0.2);
  // The hall.
  g.fillStyle = white;
  g.fillRect(x - 4.4, y - 3.9, 8.8, 3.3);
  g.fillStyle = shade;
  g.fillRect(x - 4.4, y - 3.9, 0.3, 3.3);
  g.fillRect(x + 4.1, y - 3.9, 0.3, 3.3);
  // Five cusped arches along the front, the middle one the door.
  for (let i = -2; i <= 2; i++) {
    const cx = x + i * 1.6;
    cuspedArch(g, cx, y - 0.6, i === 0 ? 0.62 : 0.52, i === 0 ? 2.3 : 2.0, deep);
    cuspedArch(g, cx, y - 0.6, i === 0 ? 0.5 : 0.42, i === 0 ? 2.15 : 1.85, i === 0 ? "#e8c070" : "#c8b8a0");
  }
  // Cornice, and a jaali parapet.
  g.fillStyle = shade;
  g.fillRect(x - 4.6, y - 4.05, 9.2, 0.18);
  g.fillStyle = white;
  g.fillRect(x - 4.4, y - 4.45, 8.8, 0.4);
  g.fillStyle = shade;
  for (let px = x - 4.2; px < x + 4.2; px += 0.3) g.fillRect(px, y - 4.4, 0.12, 0.3);
  // Chhatris: little pavilions on the corners, each with a gilded dome.
  for (const cx of [x - 3.9, x + 3.9, x - 2.3, x + 2.3]) {
    const small = Math.abs(cx - x) < 3;
    const s = small ? 0.7 : 1;
    const base = y - 4.45;
    g.fillStyle = white;
    g.fillRect(cx - 0.45 * s, base - 1.0 * s, 0.1 * s, 1.0 * s);
    g.fillRect(cx + 0.35 * s, base - 1.0 * s, 0.1 * s, 1.0 * s);
    g.fillRect(cx - 0.55 * s, base - 1.12 * s, 1.1 * s, 0.14 * s);
    g.fillStyle = gold(base - 1.9 * s, base - 1.1 * s);
    g.beginPath();
    g.moveTo(cx - 0.5 * s, base - 1.12 * s);
    g.bezierCurveTo(cx - 0.6 * s, base - 1.6 * s, cx - 0.1 * s, base - 1.75 * s, cx, base - 2.0 * s);
    g.bezierCurveTo(cx + 0.1 * s, base - 1.75 * s, cx + 0.6 * s, base - 1.6 * s, cx + 0.5 * s, base - 1.12 * s);
    g.fill();
  }
  // The drum, then the great fluted dome on a ring of lotus petals.
  const drumTop = y - 5.5;
  g.fillStyle = white;
  g.fillRect(x - 1.7, drumTop, 3.4, 1.05);
  for (let i = -2; i <= 2; i++) cuspedArch(g, x + i * 0.62, y - 4.55, 0.18, 0.7, shade);
  g.fillStyle = gold(drumTop - 0.3, drumTop);
  for (let i = 0; i < 9; i++) {
    const px = x - 1.8 + i * 0.45;
    g.beginPath();
    g.moveTo(px - 0.24, drumTop);
    g.quadraticCurveTo(px, drumTop - 0.5, px + 0.24, drumTop);
    g.fill();
  }
  const domeBase = drumTop - 0.2;
  const domeTop = domeBase - 2.7;
  g.fillStyle = gold(domeTop, domeBase);
  g.beginPath();
  g.moveTo(x - 1.6, domeBase);
  g.bezierCurveTo(x - 2.1, domeBase - 1.4, x - 0.6, domeBase - 2.0, x, domeTop);
  g.bezierCurveTo(x + 0.6, domeBase - 2.0, x + 2.1, domeBase - 1.4, x + 1.6, domeBase);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(140, 90, 20, 0.45)";
  g.lineWidth = 0.03;
  g.beginPath();
  for (let i = -3; i <= 3; i++) {
    const t = i / 3.6;
    g.moveTo(x + t * 1.6, domeBase);
    g.quadraticCurveTo(x + t * 1.7, domeBase - 1.5, x, domeTop + 0.1);
  }
  g.stroke();
  // The kalash finial, and a small khanda at its tip.
  g.fillStyle = "#f0c860";
  for (const [dy, r] of [
    [0.15, 0.2],
    [0.45, 0.14],
    [0.7, 0.1],
  ]) {
    g.beginPath();
    g.arc(x, domeTop - dy, r, 0, TAU);
    g.fill();
  }
  g.save();
  g.translate(x, domeTop - 1.05);
  drawKhanda(g, 0.28, "#f0c860");
  g.restore();
}

function cuspedArch(g: Ctx, cx: number, base: number, halfW: number, height: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(cx - halfW, base);
  g.lineTo(cx - halfW, base - height + halfW * 1.1);
  // Three lobes, then a point.
  g.quadraticCurveTo(cx - halfW, base - height + halfW * 0.5, cx - halfW * 0.55, base - height + halfW * 0.5);
  g.quadraticCurveTo(cx - halfW * 0.55, base - height + halfW * 0.05, cx, base - height - halfW * 0.1);
  g.quadraticCurveTo(cx + halfW * 0.55, base - height + halfW * 0.05, cx + halfW * 0.55, base - height + halfW * 0.5);
  g.quadraticCurveTo(cx + halfW, base - height + halfW * 0.5, cx + halfW, base - height + halfW * 1.1);
  g.lineTo(cx + halfW, base);
  g.closePath();
  g.fill();
}

/**
 * A Nishan Sahib: a tall pole wrapped in its saffron chola, a steel khanda at the top, and the
 * triangular flag with the Khanda on it, flying. `fresh` is the new chola going up for Vaisakhi.
 */
export function drawNishan(g: Ctx, x: number, y: number, h: number, seconds: number, wind: number, big = true) {
  const top = y - h;
  if (big) {
    // The platform it stands on.
    g.fillStyle = "#e8e4dc";
    g.fillRect(x - 0.7, y - 0.4, 1.4, 0.4);
    g.fillStyle = "#c8c2b6";
    g.fillRect(x - 0.8, y - 0.48, 1.6, 0.1);
  }
  const pole = g.createLinearGradient(x - 0.08, 0, x + 0.08, 0);
  pole.addColorStop(0, "#c8660e");
  pole.addColorStop(0.5, "#f29a2a");
  pole.addColorStop(1, "#b0560a");
  g.fillStyle = pole;
  g.fillRect(x - (big ? 0.09 : 0.03), top, big ? 0.18 : 0.06, h - (big ? 0.45 : 0));
  // The flag: a long triangle rippling out from the pole.
  const len = big ? 2.4 : 0.9;
  const tall = big ? 1.5 : 0.55;
  const fy = top + (big ? 0.5 : 0.18);
  const wave = (t: number) => Math.sin(seconds * 3.2 - t * 5) * tall * 0.12 * wind * t;
  g.fillStyle = "#f28a14";
  g.beginPath();
  g.moveTo(x, fy);
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    g.lineTo(x + t * len, fy + t * tall * 0.5 + wave(t) - tall * 0.02);
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    g.lineTo(x + t * len, fy + tall - t * tall * 0.5 + wave(t));
  }
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(160, 70, 0, 0.25)";
  g.beginPath();
  g.moveTo(x, fy + tall * 0.62);
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    g.lineTo(x + t * len, fy + tall * (0.62 - t * 0.12) + wave(t));
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    g.lineTo(x + t * len, fy + tall - t * tall * 0.5 + wave(t));
  }
  g.closePath();
  g.fill();
  g.save();
  g.translate(x + len * 0.3, fy + tall * 0.5 + wave(0.3));
  drawKhanda(g, tall * 0.26, "#1c2a6a");
  g.restore();
  // The steel khanda at the top of the pole.
  g.save();
  g.translate(x, top - (big ? 0.42 : 0.14));
  drawKhanda(g, big ? 0.4 : 0.14, "#d8dce4");
  g.restore();
}

/** The shamiana for the langar: a patterned canopy on poles over long durries. */
export function drawShamiana(g: Ctx, front: boolean) {
  const { x0, x1, y0, y1 } = LANGAR;
  if (!front) {
    // The durries in rows on the ground.
    for (let i = 0; i < 3; i++) {
      const y = y0 + 0.9 + i * 1.3;
      g.fillStyle = i % 2 ? "#7a2a3a" : "#2a4a7a";
      g.fillRect(x0 + 0.3, y - 0.2, x1 - x0 - 0.6, 0.4);
      g.strokeStyle = "rgba(240, 220, 180, 0.5)";
      g.lineWidth = 0.03;
      g.beginPath();
      g.moveTo(x0 + 0.3, y - 0.12);
      g.lineTo(x1 - 0.3, y - 0.12);
      g.moveTo(x0 + 0.3, y + 0.12);
      g.lineTo(x1 - 0.3, y + 0.12);
      g.stroke();
    }
    // The poles at the back, and the back cloth hanging.
    g.fillStyle = "#e8dcc4";
    g.fillRect(x0, y0 - 3.2, x1 - x0, 0.6);
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4) {
      g.fillStyle = "#8a6a4a";
      g.fillRect(x - 0.05, y0 - 3.2, 0.1, 3.2);
    }
    return;
  }
  // The canopy seen from below its front edge, with a scalloped valance.
  const top = y0 - 3.2;
  g.fillStyle = "#c8283a";
  g.fillRect(x0 - 0.2, top - 0.3, x1 - x0 + 0.4, 0.5);
  g.fillStyle = "#f2c040";
  for (let x = x0 - 0.2; x < x1 + 0.2; x += 0.5) {
    g.beginPath();
    g.moveTo(x, top + 0.2);
    g.quadraticCurveTo(x + 0.25, top + 0.55, x + 0.5, top + 0.2);
    g.fill();
  }
  g.fillStyle = "#1e5a8a";
  for (let x = x0; x < x1; x += 0.8) g.fillRect(x + 0.2, top - 0.2, 0.3, 0.3);
}

// ─── The mela ───────────────────────────────────────────────────────────────

/** The jhoola: a great wooden wheel on an A-frame, its cradles hanging level as it turns. */
export function drawJhoola(g: Ctx, angle: number, riders: RGB[]) {
  const { x, y, r } = JHOOLA;
  const hub = { x, y: y - r - 0.9 };
  g.strokeStyle = "#6a4426";
  g.lineWidth = 0.16;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(x - 1.8, y);
  g.lineTo(hub.x, hub.y);
  g.lineTo(x + 1.8, y);
  g.stroke();
  // The rim and spokes.
  g.strokeStyle = "#8a5a2e";
  g.lineWidth = 0.1;
  g.beginPath();
  g.arc(hub.x, hub.y, r, 0, TAU);
  g.stroke();
  g.lineWidth = 0.05;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = angle + (i / 8) * TAU;
    g.moveTo(hub.x, hub.y);
    g.lineTo(hub.x + Math.cos(a) * r, hub.y + Math.sin(a) * r);
  }
  g.stroke();
  g.fillStyle = "#4a2e1a";
  g.beginPath();
  g.arc(hub.x, hub.y, 0.22, 0, TAU);
  g.fill();
  // Cradles: painted boxes on hangers.
  const colours: RGB[] = [
    [214, 38, 70],
    [34, 108, 180],
    [250, 196, 40],
    [28, 140, 110],
  ];
  for (let i = 0; i < 8; i++) {
    const a = angle + (i / 8) * TAU;
    const cx = hub.x + Math.cos(a) * r;
    const cy = hub.y + Math.sin(a) * r;
    g.strokeStyle = "#3a2a1a";
    g.lineWidth = 0.03;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx, cy + 0.5);
    g.stroke();
    // Two riders' heads over the side.
    const rider = riders[i % riders.length];
    g.fillStyle = rgb(rider);
    g.beginPath();
    g.arc(cx - 0.18, cy + 0.52, 0.12, 0, TAU);
    g.arc(cx + 0.18, cy + 0.5, 0.12, 0, TAU);
    g.fill();
    g.fillStyle = rgb(colours[i % 4]);
    g.beginPath();
    g.moveTo(cx - 0.45, cy + 0.55);
    g.lineTo(cx + 0.45, cy + 0.55);
    g.lineTo(cx + 0.38, cy + 0.95);
    g.lineTo(cx - 0.38, cy + 0.95);
    g.closePath();
    g.fill();
  }
}

export type Stall = { x: number; w: number; kind: "jalebi" | "bangles" | "parandi" | "toys" | "pakora"; awning: RGB; stripe: RGB };

export function makeStalls(): Stall[] {
  return [
    { x: JALEBI.x - 1.4, w: 2.8, kind: "jalebi", awning: [214, 60, 40], stripe: [250, 220, 150] },
    { x: 62.9, w: 2.4, kind: "bangles", awning: [40, 110, 170], stripe: [240, 240, 230] },
    { x: 65.6, w: 2.4, kind: "parandi", awning: [200, 40, 120], stripe: [250, 200, 60] },
    { x: 76.2, w: 2.4, kind: "toys", awning: [30, 140, 100], stripe: [250, 240, 200] },
    { x: 78.8, w: 2.4, kind: "pakora", awning: [230, 140, 30], stripe: [250, 240, 220] },
  ];
}

const STALL_Y = 0.9;

export function drawStall(g: Ctx, s: Stall, seconds: number) {
  const y = STALL_Y;
  const top = y - 2.4;
  // Bamboo poles and a striped awning.
  g.fillStyle = "#9a7a4a";
  g.fillRect(s.x, top, 0.07, 2.4);
  g.fillRect(s.x + s.w - 0.07, top, 0.07, 2.4);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = rgb(i % 2 ? s.stripe : s.awning);
    g.beginPath();
    g.moveTo(s.x - 0.2 + (i * (s.w + 0.4)) / 8, top);
    g.lineTo(s.x - 0.2 + ((i + 1) * (s.w + 0.4)) / 8, top);
    g.lineTo(s.x - 0.2 + ((i + 1) * (s.w + 0.4)) / 8 + 0.05, top + 0.55);
    g.lineTo(s.x - 0.2 + (i * (s.w + 0.4)) / 8 + 0.05, top + 0.55);
    g.closePath();
    g.fill();
  }
  // The counter.
  g.fillStyle = "#7a5230";
  g.fillRect(s.x - 0.05, y - 0.9, s.w + 0.1, 0.12);
  g.fillStyle = "rgba(90, 60, 36, 0.9)";
  g.fillRect(s.x, y - 0.78, s.w, 0.78);
  const cx = s.x + s.w / 2;
  switch (s.kind) {
    case "jalebi": {
      // The kadhai on its clay stove, jalebis frying in coils, and a heap of them on a tray.
      g.fillStyle = "#5a4a40";
      g.fillRect(cx - 0.9, y - 1.3, 0.9, 0.4);
      g.fillStyle = "#2a2420";
      g.beginPath();
      g.ellipse(cx - 0.45, y - 1.3, 0.55, 0.14, 0, 0, TAU);
      g.fill();
      g.strokeStyle = "#f08a1a";
      g.lineWidth = 0.035;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(cx - 0.7 + i * 0.25, y - 1.33, 0.07, seconds + i, seconds + i + TAU * 0.9);
        g.stroke();
      }
      g.fillStyle = "#c8a860";
      g.fillRect(cx + 0.2, y - 1.0, 0.8, 0.08);
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.arc(cx + 0.3 + (i % 4) * 0.2, y - 1.08 - Math.floor(i / 4) * 0.1, 0.08, 0, TAU);
        g.stroke();
      }
      break;
    }
    case "bangles": {
      // Glass bangles stacked on upright sticks, every colour there is.
      const colours = ["#d62640", "#2270c0", "#f2c030", "#1c9070", "#c02880", "#f06a28", "#7a3aa8"];
      for (let i = 0; i < 7; i++) {
        const bx = s.x + 0.25 + i * 0.3;
        g.fillStyle = "#6a4a2a";
        g.fillRect(bx - 0.015, y - 1.6, 0.03, 0.7);
        g.strokeStyle = colours[i];
        g.lineWidth = 0.035;
        for (let j = 0; j < 8; j++) {
          g.beginPath();
          g.ellipse(bx, y - 1.55 + j * 0.07, 0.1, 0.025, 0, 0, TAU);
          g.stroke();
        }
      }
      break;
    }
    case "parandi": {
      // Parandis hanging from a line: silk plaits ending in tassels, bright as the bangles.
      const colours = ["#f2c030", "#d62640", "#1c9070", "#c02880", "#2270c0", "#f06a28", "#f2c030", "#d62640"];
      g.strokeStyle = "#3a2a1a";
      g.lineWidth = 0.02;
      g.beginPath();
      g.moveTo(s.x, top + 0.7);
      g.lineTo(s.x + s.w, top + 0.7);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        const px = s.x + 0.2 + i * 0.28;
        const sway = Math.sin(seconds * 1.5 + i) * 0.03;
        g.strokeStyle = colours[i];
        g.lineWidth = 0.05;
        g.beginPath();
        g.moveTo(px, top + 0.7);
        g.lineTo(px + sway, top + 1.3);
        g.stroke();
        g.fillStyle = colours[(i + 3) % colours.length];
        g.beginPath();
        g.arc(px + sway, top + 1.36, 0.06, 0, TAU);
        g.fill();
      }
      break;
    }
    case "toys": {
      // Phirkis, paper pinwheels, spinning on their sticks.
      for (let i = 0; i < 5; i++) {
        const px = s.x + 0.3 + i * 0.45;
        const py = y - 1.5 - (i % 2) * 0.3;
        g.strokeStyle = "#8a6a4a";
        g.lineWidth = 0.02;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px, y - 0.9);
        g.stroke();
        for (let k = 0; k < 4; k++) {
          const a = seconds * 4 + i + (k * TAU) / 4;
          g.fillStyle = ["#d62640", "#f2c030", "#2270c0", "#1c9070"][k];
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px + Math.cos(a) * 0.18, py + Math.sin(a) * 0.18);
          g.lineTo(px + Math.cos(a + 0.8) * 0.12, py + Math.sin(a + 0.8) * 0.12);
          g.fill();
        }
      }
      break;
    }
    default: {
      // Pakoras from a second kadhai, piled golden on paper.
      g.fillStyle = "#2a2420";
      g.beginPath();
      g.ellipse(cx, y - 1.0, 0.6, 0.14, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#c88a30";
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.arc(cx - 0.4 + i * 0.11, y - 1.04 - (i % 2) * 0.04, 0.06, 0, TAU);
        g.fill();
      }
    }
  }
}

/** The bulbs strung over the stalls and round the jhoola, lit as the sun goes. */
export function melaBulbs() {
  const bulbs: { x: number; y: number; c: string }[] = [];
  const colours = ["255, 200, 90", "255, 120, 90", "140, 220, 255", "255, 240, 180"];
  let k = 0;
  for (let x = 58; x < 81.5; x += 0.45) {
    const sag = Math.sin(((x - 58) / 2.6) * Math.PI);
    bulbs.push({ x, y: STALL_Y - 2.6 + Math.abs(sag) * 0.3, c: colours[k++ % colours.length] });
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    bulbs.push({ x: JHOOLA.x + Math.cos(a) * JHOOLA.r, y: JHOOLA.y - JHOOLA.r - 0.9 + Math.sin(a) * JHOOLA.r, c: colours[i % colours.length] });
  }
  return bulbs;
}

/** The kabaddi circle: a ring of lime in the dust, and the line across it. */
export function drawKabaddi(g: Ctx) {
  const { x, y, rx, ry } = KABADDI;
  g.fillStyle = "rgba(200, 170, 120, 0.5)";
  g.beginPath();
  g.ellipse(x, y, rx + 0.3, ry + 0.12, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(250, 250, 240, 0.8)";
  g.lineWidth = 0.05;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.moveTo(x, y - ry);
  g.lineTo(x, y + ry);
  g.stroke();
}

/** A balloon seller's bunch, bobbing on its stick. */
export function drawBalloons(g: Ctx, x: number, y: number, seconds: number) {
  const colours = ["#e8243c", "#f2c030", "#2a80d0", "#20a070", "#d02a90", "#f07028", "#8a4ac0"];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const bx = x + Math.cos(a) * 0.35 + Math.sin(seconds + i) * 0.03;
    const by = y - 0.4 + Math.sin(a) * 0.3 + Math.cos(seconds * 1.3 + i) * 0.03;
    g.strokeStyle = "rgba(240, 240, 240, 0.5)";
    g.lineWidth = 0.008;
    g.beginPath();
    g.moveTo(x, y + 0.2);
    g.lineTo(bx, by + 0.14);
    g.stroke();
    g.fillStyle = colours[i % colours.length];
    g.beginPath();
    g.ellipse(bx, by, 0.13, 0.16, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(255, 255, 255, 0.35)";
    g.beginPath();
    g.arc(bx - 0.04, by - 0.06, 0.035, 0, TAU);
    g.fill();
  }
}
