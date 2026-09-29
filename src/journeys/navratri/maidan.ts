// Dussehra in the maidan: Ravana, Kumbhakarna and Meghnad in bamboo and coloured paper, packed
// with crackers; Ram on the Ramlila stage with his bow; the shami tree; a fafda-jalebi cart; and
// the town come out to watch, black against the fire.
import { TAU, clamp, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import type { Tilt } from "./world";

export type Effigy = {
  canvas: HTMLCanvasElement;
  charred: HTMLCanvasElement;
  /** Width and height in world units; the canvas is drawn with its foot centred on the base. */
  w: number;
  h: number;
  /** Where its chest is, in units above the base, for the arrow. */
  chest: number;
};

const PPU = 44;
const FOIL: RGB[] = [
  [214, 40, 40],
  [250, 196, 40],
  [40, 140, 72],
  [40, 72, 170],
  [222, 90, 160],
  [240, 120, 30],
];

/** Paints an effigy: `heads` is 10 for Ravana, 1 for his brother and his son. */
export function paintEffigy(heads: number, h: number, palette: RGB[], seed: number): Effigy {
  const w = heads > 1 ? 6.8 : 4.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * PPU);
  canvas.height = Math.round((h + 0.3) * PPU);
  const g = canvas.getContext("2d")!;
  g.scale(PPU, PPU);
  g.translate(w / 2, h + 0.15);
  const random = mulberry32(seed);
  const k = h / 11;
  const Y = (up: number) => -up * k;
  const [A, B, C, D] = palette;
  g.lineJoin = "round";
  g.strokeStyle = "rgba(30, 14, 10, 0.8)";
  g.lineWidth = 0.05;

  // Legs in striped pyjama, pointed juttis.
  for (const side of [-1, 1]) {
    g.fillStyle = rgb(B);
    g.fillRect(side * 0.5 - 0.3, Y(3.2), 0.6, 3.2 * k - 0.25);
    g.fillStyle = rgb(A);
    for (let i = 0; i < 6; i++) g.fillRect(side * 0.5 - 0.3, Y(3.0 - i * 0.5), 0.6, 0.12);
    g.fillStyle = rgb(mix(A, [0, 0, 0], 0.3));
    g.beginPath();
    g.moveTo(side * 0.5 - 0.35, 0);
    g.lineTo(side * 0.5 + 0.35, 0);
    g.quadraticCurveTo(side * 0.5 + side * 0.7, -0.05, side * 0.5 + side * 0.6, -0.35);
    g.lineTo(side * 0.5 - 0.35, -0.3);
    g.fill();
  }
  // The jama, flaring from the waist in panels of foil, with a scalloped hem.
  const hemY = Y(2.8);
  const waistY = Y(5.6);
  const hemW = heads > 1 ? 1.8 : 1.6;
  for (let i = 0; i < 10; i++) {
    const a = i / 10;
    const b = (i + 1) / 10;
    g.fillStyle = rgb([A, B, C, D][i % 4]);
    g.beginPath();
    g.moveTo(lerp(-1.0, 1.0, a), waistY);
    g.lineTo(lerp(-1.0, 1.0, b), waistY);
    g.lineTo(lerp(-hemW, hemW, b), hemY);
    g.lineTo(lerp(-hemW, hemW, a), hemY);
    g.fill();
  }
  g.fillStyle = "#e8e8f0";
  for (let i = 0; i < 12; i++) {
    const x = lerp(-hemW, hemW, (i + 0.5) / 12);
    g.beginPath();
    g.arc(x, hemY, (hemW * 2) / 24, 0, Math.PI);
    g.fill();
  }
  g.strokeStyle = "#f0e6c0";
  g.lineWidth = 0.08;
  g.beginPath();
  for (let i = 0; i <= 16; i++) {
    const x = lerp(-hemW * 0.85, hemW * 0.85, i / 16);
    const y = lerp(hemY, waistY, 0.3) + (i % 2 ? -0.12 : 0.12);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  // Cummerbund.
  g.fillStyle = "#e8b440";
  g.fillRect(-1.05, Y(5.85), 2.1, 0.3 * k);
  // The chest: armour, a medallion, garlands.
  g.fillStyle = rgb(C);
  g.beginPath();
  g.moveTo(-1.0, Y(5.75));
  g.lineTo(1.0, Y(5.75));
  g.lineTo(1.25, Y(7.7));
  g.lineTo(-1.25, Y(7.7));
  g.fill();
  g.fillStyle = "#e8b440";
  g.beginPath();
  g.arc(0, Y(6.7), 0.42, 0, TAU);
  g.fill();
  g.fillStyle = rgb(A);
  g.beginPath();
  g.arc(0, Y(6.7), 0.26, 0, TAU);
  g.fill();
  g.strokeStyle = "#f0e6c0";
  g.lineWidth = 0.1;
  for (const r of [0.8, 1.1]) {
    g.beginPath();
    g.ellipse(0, Y(7.6), r, r * 0.8, 0, 0.15, Math.PI - 0.15);
    g.stroke();
  }
  g.fillStyle = "#e8e8f0";
  for (let i = 0; i < 20; i++) {
    g.beginPath();
    g.arc(-0.9 + random() * 1.8, Y(5.9 + random() * 1.6), 0.05, 0, TAU);
    g.fill();
  }
  // Ravana's heads are all mounted on one tinsel-edged board: the row, and the tenth on the crown.
  if (heads > 1) {
    const board = () => {
      g.beginPath();
      g.moveTo(-3.3, Y(7.5));
      g.lineTo(-3.3, Y(8.7));
      g.quadraticCurveTo(-2.2, Y(9.05), -1.05, Y(9.1));
      g.quadraticCurveTo(-0.75, Y(10.45), 0, Y(10.55));
      g.quadraticCurveTo(0.75, Y(10.45), 1.05, Y(9.1));
      g.quadraticCurveTo(2.2, Y(9.05), 3.3, Y(8.7));
      g.lineTo(3.3, Y(7.5));
      g.closePath();
    };
    g.fillStyle = rgb(mix(A, [60, 10, 20], 0.55));
    board();
    g.fill();
    g.strokeStyle = "#e8b440";
    g.lineWidth = 0.12;
    board();
    g.stroke();
    g.fillStyle = "#f0e6c0";
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      g.arc(-3.1 + (i / 25) * 6.2, Y(8.55 + 0.25 * Math.sin((i / 25) * Math.PI)), 0.05, 0, TAU);
      g.fill();
    }
  }
  // Arms: the sword raised in one, a round shield in the other.
  g.lineCap = "round";
  g.strokeStyle = rgb(D);
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(1.1, Y(7.4));
  g.lineTo(1.9, Y(6.7));
  g.lineTo(2.1, Y(7.9));
  g.moveTo(-1.1, Y(7.4));
  g.lineTo(-1.9, Y(6.5));
  g.lineTo(-2.0, Y(5.9));
  g.stroke();
  g.fillStyle = "#d8dce8";
  g.beginPath();
  g.moveTo(2.0, Y(8.0));
  g.lineTo(2.2, Y(8.0));
  g.lineTo(2.35, Y(10.3));
  g.quadraticCurveTo(2.2, Y(10.8), 2.0, Y(10.4));
  g.fill();
  g.fillStyle = "#e8b440";
  g.fillRect(1.75, Y(8.05), 0.7, 0.14);
  g.fillStyle = rgb(A);
  g.beginPath();
  g.arc(-2.1, Y(5.9), 0.78, 0, TAU);
  g.fill();
  g.strokeStyle = "#e8b440";
  g.lineWidth = 0.1;
  for (const r of [0.6, 0.35]) {
    g.beginPath();
    g.arc(-2.1, Y(5.9), r, 0, TAU);
    g.stroke();
  }
  g.fillStyle = "#e8b440";
  g.beginPath();
  g.arc(-2.1, Y(5.9), 0.14, 0, TAU);
  g.fill();

  // The heads: one in the middle, four either side a little lower, and the tenth set on the main crown.
  const head = (x: number, base: number, size: number, face: RGB, crown: RGB) => {
    const hw = 0.42 * size;
    const hh = 0.55 * size;
    const cy = base - hh;
    g.fillStyle = rgb(face);
    g.beginPath();
    g.ellipse(x, cy, hw, hh, 0, 0, TAU);
    g.fill();
    g.fillStyle = "#e8b440";
    g.beginPath();
    g.arc(x - hw * 1.02, cy + hh * 0.2, hw * 0.22, 0, TAU);
    g.arc(x + hw * 1.02, cy + hh * 0.2, hw * 0.22, 0, TAU);
    g.fill();
    // Eyes, brows, the curled moustache, the mouth.
    for (const side of [-1, 1]) {
      g.fillStyle = "#f8f4ea";
      g.beginPath();
      g.ellipse(x + side * hw * 0.42, cy - hh * 0.08, hw * 0.24, hh * 0.12, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#141010";
      g.beginPath();
      g.arc(x + side * hw * 0.4, cy - hh * 0.08, hw * 0.1, 0, TAU);
      g.fill();
      g.strokeStyle = "#141010";
      g.lineWidth = hh * 0.1;
      g.beginPath();
      g.moveTo(x + side * hw * 0.15, cy - hh * 0.25);
      g.quadraticCurveTo(x + side * hw * 0.45, cy - hh * 0.42, x + side * hw * 0.75, cy - hh * 0.3);
      g.stroke();
      g.lineWidth = hh * 0.11;
      g.beginPath();
      g.moveTo(x, cy + hh * 0.28);
      g.quadraticCurveTo(x + side * hw * 0.55, cy + hh * 0.18, x + side * hw * 0.78, cy + hh * 0.36);
      g.quadraticCurveTo(x + side * hw * 0.9, cy + hh * 0.45, x + side * hw * 0.8, cy + hh * 0.1);
      g.stroke();
    }
    g.fillStyle = "#b8141e";
    g.beginPath();
    g.ellipse(x, cy + hh * 0.5, hw * 0.24, hh * 0.08, 0, 0, TAU);
    g.fill();
    g.fillStyle = "#b8141e";
    g.fillRect(x - hw * 0.05, cy - hh * 0.55, hw * 0.1, hh * 0.28);
    // The crown.
    g.fillStyle = rgb(crown);
    g.beginPath();
    g.moveTo(x - hw * 0.95, cy - hh * 0.55);
    for (let i = 0; i <= 4; i++) {
      const px = x - hw * 0.95 + (i / 4) * hw * 1.9;
      g.lineTo(px, cy - hh * (i % 2 ? 1.05 : 1.45) - (i === 2 ? hh * 0.35 : 0));
    }
    g.lineTo(x + hw * 0.95, cy - hh * 0.55);
    g.closePath();
    g.fill();
    g.fillStyle = "#e8e8f0";
    g.fillRect(x - hw * 0.95, cy - hh * 0.72, hw * 1.9, hh * 0.14);
    g.fillStyle = rgb(A);
    g.beginPath();
    g.arc(x, cy - hh * 0.95, hw * 0.13, 0, TAU);
    g.fill();
  };
  const face: RGB = [236, 186, 150];
  if (heads > 1) {
    for (let i = 4; i >= 1; i--) {
      for (const side of [-1, 1])
        head(
          side * (0.55 + i * 0.6),
          Y(7.85 - i * 0.08),
          0.95,
          mix(face, FOIL[(i + (side > 0 ? 1 : 3)) % FOIL.length], 0.12),
          [232, 180, 64],
        );
    }
    head(0, Y(9.4), 0.72, face, [232, 180, 64]);
    head(0, Y(7.75), 1.35, face, [240, 196, 70]);
  } else {
    head(0, Y(7.75), 1.6, face, [232, 180, 64]);
  }

  // The bamboo frame showing through where the paper is thin.
  g.strokeStyle = "rgba(70, 50, 20, 0.25)";
  g.lineWidth = 0.05;
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.moveTo(-1.5 + random() * 3, Y(random() * 7));
    g.lineTo(-1.5 + random() * 3, Y(random() * 7));
    g.stroke();
  }

  // The charred version: black paper and bamboo, cracks of ember.
  const charred = document.createElement("canvas");
  charred.width = canvas.width;
  charred.height = canvas.height;
  const cg = charred.getContext("2d")!;
  cg.drawImage(canvas, 0, 0);
  cg.globalCompositeOperation = "source-atop";
  cg.fillStyle = "rgba(24, 14, 12, 0.9)";
  cg.fillRect(0, 0, charred.width, charred.height);
  cg.strokeStyle = "rgba(255, 120, 30, 0.9)";
  cg.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    let x = random() * charred.width;
    let y = random() * charred.height;
    cg.beginPath();
    cg.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (random() - 0.5) * 30;
      y += (random() - 0.5) * 30;
      cg.lineTo(x, y);
    }
    cg.stroke();
  }
  return { canvas, charred, w, h, chest: 6.7 * k };
}

export const RAVANA_PALETTE: RGB[] = [FOIL[0], FOIL[1], FOIL[2], FOIL[3]];
export const KUMBHA_PALETTE: RGB[] = [FOIL[2], FOIL[5], FOIL[3], FOIL[1]];
export const MEGHNAD_PALETTE: RGB[] = [FOIL[4], FOIL[1], FOIL[0], FOIL[2]];

/**
 * Draws an effigy standing on (x, z) as it burns (`burn` 0..1): the char climbing from its feet,
 * then leaning and falling in on itself.
 */
export function drawEffigy(g: Ctx, t: Tilt, e: Effigy, x: number, z: number, burn: number, lean: number) {
  const base = z * t.s;
  const fall = clamp((burn - 0.72) / 0.28);
  if (fall >= 1) return;
  const scaleY = t.c * (1 - 0.5 * fall * fall);
  g.save();
  g.translate(x, base);
  g.rotate(lean * fall * fall * 0.45);
  g.globalAlpha = 1 - fall;
  const top = -(e.h + 0.15) * scaleY;
  const height = (e.h + 0.3) * scaleY;
  g.drawImage(e.canvas, -e.w / 2, top, e.w, height);
  if (burn > 0.01) {
    const line = clamp(burn * 1.35) * height;
    g.save();
    g.beginPath();
    g.rect(-e.w / 2, top + height - line, e.w, line);
    g.clip();
    g.drawImage(e.charred, -e.w / 2, top, e.w, height);
    g.restore();
  }
  g.restore();
  g.globalAlpha = 1;
}

// ─── The shami, the stall and the crowd ──────────────────────────────────────

/** The shami tree: a thorny trunk and fine feathery leaves, a red thread and a lamp at its foot. */
export function paintShami() {
  const w = 5;
  const h = 5;
  const ppu = 48;
  const canvas = document.createElement("canvas");
  canvas.width = w * ppu;
  canvas.height = h * ppu;
  const g = canvas.getContext("2d")!;
  g.scale(ppu, ppu);
  g.translate(w / 2, h);
  const random = mulberry32(606);
  g.strokeStyle = "#4a3222";
  g.lineCap = "round";
  const branch = (x: number, y: number, a: number, len: number, width: number, depth: number) => {
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.3) * len * 0.5, y + Math.sin(a + 0.3) * len * 0.5, ex, ey);
    g.stroke();
    if (depth > 0) {
      branch(ex, ey, a - 0.45 - random() * 0.3, len * 0.72, width * 0.65, depth - 1);
      branch(ex, ey, a + 0.4 + random() * 0.3, len * 0.7, width * 0.65, depth - 1);
    }
  };
  branch(0, 0, -Math.PI / 2 - 0.05, 1.6, 0.26, 4);
  for (let i = 0; i < 260; i++) {
    const a = random() * TAU;
    const r = Math.sqrt(random());
    const x = Math.cos(a) * r * 2.1;
    const y = -3.1 + Math.sin(a) * r * 1.3;
    g.fillStyle = rgb(mix([62, 96, 52], [104, 138, 70], random()), 0.75);
    g.beginPath();
    g.ellipse(x, y, 0.2 + random() * 0.18, 0.07, random() * TAU, 0, TAU);
    g.fill();
  }
  g.strokeStyle = "#c81818";
  g.lineWidth = 0.05;
  for (const y of [-0.5, -0.62, -0.74]) {
    g.beginPath();
    g.moveTo(-0.14, y);
    g.lineTo(0.14, y + 0.03);
    g.stroke();
  }
  g.fillStyle = "#b41e24";
  g.fillRect(-0.14, -0.9, 0.28, 0.1);
  return { canvas, w, h };
}

/** A handcart selling fafda and jalebi, its lamp lit. */
export function paintStall() {
  const w = 3;
  const h = 2.6;
  const ppu = 56;
  const canvas = document.createElement("canvas");
  canvas.width = w * ppu;
  canvas.height = h * ppu;
  const g = canvas.getContext("2d")!;
  g.scale(ppu, ppu);
  g.translate(w / 2, h);
  // Wheels, the cart, its awning on poles.
  g.fillStyle = "#3a2618";
  for (const x of [-0.9, 0.9]) {
    g.beginPath();
    g.arc(x, -0.3, 0.3, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#2a7a8a";
  g.fillRect(-1.3, -1.0, 2.6, 0.45);
  g.fillStyle = "#e8b440";
  g.fillRect(-1.3, -1.0, 2.6, 0.06);
  g.fillStyle = "#6a4020";
  g.fillRect(-1.25, -2.3, 0.06, 1.3);
  g.fillRect(1.19, -2.3, 0.06, 1.3);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? "#d42a2a" : "#f5f0e0";
    g.beginPath();
    g.moveTo(-1.4 + i * 0.35, -2.3);
    g.lineTo(-1.4 + (i + 1) * 0.35, -2.3);
    g.lineTo(-1.4 + (i + 0.5) * 0.35, -2.05);
    g.fill();
  }
  g.fillStyle = "#b8322a";
  g.fillRect(-1.45, -2.5, 2.9, 0.22);
  // The kadai of oil, a tray of jalebi coils, and a heap of fafda.
  g.fillStyle = "#2a2020";
  g.beginPath();
  g.ellipse(-0.6, -1.05, 0.45, 0.14, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = "#c89238";
  g.fillRect(0, -1.08, 1.1, 0.06);
  g.strokeStyle = "#f08a14";
  g.lineWidth = 0.05;
  for (let i = 0; i < 6; i++) {
    const jx = 0.12 + (i % 3) * 0.32;
    const jy = -1.18 - Math.floor(i / 3) * 0.1;
    g.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.4) {
      const r = 0.02 + a * 0.012;
      const px = jx + Math.cos(a) * r;
      const py = jy + Math.sin(a) * r * 0.5;
      if (a === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  }
  g.strokeStyle = "#e8cc78";
  g.lineWidth = 0.06;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.moveTo(-1.15 + i * 0.03, -1.05 - (i % 3) * 0.04);
    g.lineTo(-0.7 + i * 0.03, -1.1 - (i % 3) * 0.04);
    g.stroke();
  }
  // The lamp hanging from the awning.
  g.fillStyle = "#c8c8c8";
  g.fillRect(0.55, -2.05, 0.18, 0.3);
  g.fillStyle = "#fff0c0";
  g.beginPath();
  g.arc(0.64, -1.82, 0.08, 0, TAU);
  g.fill();
  return { canvas, w, h, lamp: { x: 0.64, y: -1.82 } };
}

/**
 * The crowd seen from behind, facing the fire or the garba: heads and shoulders, raised hands,
 * a child on a father's shoulders. Also returns a rim of light along their top edges.
 */
export function paintCrowd(from: number, to: number, seed: number) {
  const w = to - from;
  const h = 2.4;
  const ppu = 30;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * ppu);
  canvas.height = Math.round(h * ppu);
  const rim = document.createElement("canvas");
  rim.width = canvas.width;
  rim.height = canvas.height;
  const g = canvas.getContext("2d")!;
  const r = rim.getContext("2d")!;
  for (const c of [g, r]) {
    c.scale(ppu, ppu);
    c.translate(-from, h);
  }
  const random = mulberry32(seed);
  const cloth: RGB[] = [
    [70, 30, 40],
    [40, 40, 70],
    [80, 60, 30],
    [50, 70, 50],
    [90, 30, 60],
    [60, 50, 60],
  ];
  let x = from - 0.2;
  for (let guard = 0; x < to + 0.2 && guard < 800; guard++) {
    const tall = 1.4 + random() * 0.45;
    const width = 0.4 + random() * 0.15;
    const colour = cloth[Math.floor(random() * cloth.length)];
    const shape = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - width, 0);
      c.quadraticCurveTo(x - width, -tall + 0.35, x - width * 0.5, -tall + 0.3);
      c.lineTo(x + width * 0.5, -tall + 0.3);
      c.quadraticCurveTo(x + width, -tall + 0.35, x + width, 0);
      c.closePath();
      c.moveTo(x + 0.13, -tall + 0.15);
      c.arc(x, -tall + 0.15, 0.13, 0, TAU);
    };
    g.fillStyle = rgb(colour);
    shape(g);
    g.fill();
    g.fillStyle = "#1a1210";
    g.beginPath();
    g.arc(x, -tall + 0.17, 0.13, Math.PI, TAU);
    g.fill();
    r.strokeStyle = "rgba(255, 190, 120, 0.9)";
    r.lineWidth = 0.035;
    r.beginPath();
    r.arc(x, -tall + 0.15, 0.13, Math.PI * 1.05, Math.PI * 1.95);
    r.moveTo(x - width * 0.9, -tall + 0.4);
    r.quadraticCurveTo(x, -tall + 0.26, x + width * 0.9, -tall + 0.4);
    r.stroke();
    if (random() < 0.12) {
      // Hands up.
      g.strokeStyle = rgb(colour);
      g.lineWidth = 0.1;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x + width * 0.6, -tall + 0.4);
      g.lineTo(x + width * 0.9, -tall - 0.4);
      g.stroke();
    } else if (random() < 0.06) {
      // A child on the shoulders.
      g.fillStyle = rgb(cloth[Math.floor(random() * cloth.length)]);
      g.fillRect(x - 0.18, -tall - 0.35, 0.36, 0.45);
      g.fillStyle = "#1a1210";
      g.beginPath();
      g.arc(x, -tall - 0.45, 0.11, 0, TAU);
      g.fill();
    }
    x += width * (0.9 + random() * 0.6);
  }
  return { canvas, rim, from, w, h };
}

export type Crowd = ReturnType<typeof paintCrowd>;

export function drawCrowd(g: Ctx, t: Tilt, crowd: Crowd, z: number, rim = false) {
  const base = z * t.s;
  const c = Math.max(t.c, 0.35);
  g.drawImage(rim ? crowd.rim : crowd.canvas, crowd.from, base - crowd.h * c, crowd.w, crowd.h * c);
}
