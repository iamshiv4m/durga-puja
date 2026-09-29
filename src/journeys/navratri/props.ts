// Smaller things in the pol and the maidan: the dhol and the harmonium of the garba mandal, the
// aarti thali and the ghanti, the leaf plates of the kanya pujan, strings of festival bulbs, the
// Ramlila stage, and Ram's bow.
import { TAU, clamp, flame, lerp, mix, rgb, type Ctx, type RGB } from "../paint";
import type { Tilt } from "./world";

/** A dhol slung at the waist, its two heads to either side, the rope lacing across its shell. */
export function drawDhol(g: Ctx, x: number, y: number, len: number, c: number) {
  const r = len * 0.34;
  const ry = r * Math.max(c, 0.4);
  const shell = g.createLinearGradient(0, y - ry, 0, y + ry);
  shell.addColorStop(0, "#c07a3a");
  shell.addColorStop(0.5, "#8a4a1e");
  shell.addColorStop(1, "#4a2410");
  g.fillStyle = shell;
  g.beginPath();
  g.moveTo(x - len / 2, y - ry * 0.92);
  g.quadraticCurveTo(x, y - ry * 1.12, x + len / 2, y - ry * 0.92);
  g.lineTo(x + len / 2, y + ry * 0.92);
  g.quadraticCurveTo(x, y + ry * 1.12, x - len / 2, y + ry * 0.92);
  g.closePath();
  g.fill();
  // Rope lacing in a zigzag, and a red cloth band.
  g.strokeStyle = "rgba(240, 226, 190, 0.85)";
  g.lineWidth = len * 0.018;
  g.beginPath();
  for (let i = 0; i <= 8; i++) {
    const xx = lerp(x - len * 0.46, x + len * 0.46, i / 8);
    const yy = y + (i % 2 ? ry * 0.85 : -ry * 0.85);
    if (i === 0) g.moveTo(xx, yy);
    else g.lineTo(xx, yy);
  }
  g.stroke();
  g.fillStyle = "#b8141e";
  g.fillRect(x - len * 0.06, y - ry, len * 0.12, ry * 2);
  // The heads.
  for (const side of [-1, 1]) {
    g.fillStyle = "#e8dcc0";
    g.beginPath();
    g.ellipse(x + (side * len) / 2, y, r * 0.22, ry * 0.95, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "#5a2a10";
    g.lineWidth = len * 0.02;
    g.stroke();
  }
}

/** A hand harmonium on the ground: the wooden box, the keys, the bellows at the back. */
export function drawHarmonium(g: Ctx, x: number, y: number, w: number, c: number, facing: 1 | -1, open: number) {
  const h = w * 0.36 * Math.max(c, 0.4);
  g.fillStyle = "#6a3a1c";
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle = "#8a5028";
  g.fillRect(x - w / 2, y - h - w * 0.18 * (1 - c * 0.6), w, w * 0.18 * (1 - c * 0.6) + 0.002);
  g.fillStyle = "#f4efe2";
  g.fillRect(x - w * 0.44, y - h - w * 0.06, w * 0.88, w * 0.06);
  g.fillStyle = "#1a1210";
  for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) g.fillRect(x - w * 0.42 + i * w * 0.062, y - h - w * 0.06, w * 0.025, w * 0.035);
  // The bellows, opening and closing at the far end.
  g.fillStyle = "#3a2418";
  const bx = x - (facing * w) / 2;
  g.beginPath();
  g.moveTo(bx, y - h);
  g.lineTo(bx - facing * w * (0.05 + 0.12 * open), y - h * 0.95);
  g.lineTo(bx - facing * w * (0.05 + 0.12 * open), y);
  g.lineTo(bx, y);
  g.fill();
}

/** A brass aarti thali: kumkum, rice, a flower and the burning diya. */
export function drawThali(g: Ctx, x: number, y: number, r: number, c: number, seconds: number, lit: number) {
  const ry = r * Math.max(0.3, 1 - c * 0.7);
  const brass = g.createRadialGradient(x - r * 0.3, y - ry * 0.3, 0, x, y, r);
  brass.addColorStop(0, "#f8dc98");
  brass.addColorStop(0.7, "#d09a3a");
  brass.addColorStop(1, "#8a5a1c");
  g.fillStyle = brass;
  g.beginPath();
  g.ellipse(x, y, r, ry, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#c8141e";
  g.beginPath();
  g.ellipse(x - r * 0.45, y, r * 0.16, ry * 0.2, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#f4efe0";
  g.beginPath();
  g.ellipse(x + r * 0.45, y + ry * 0.1, r * 0.16, ry * 0.2, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#f28a1a";
  g.beginPath();
  g.arc(x + r * 0.1, y + ry * 0.4, r * 0.13, 0, TAU);
  g.fill();
  // The diya, and its flame.
  g.fillStyle = "#a8561e";
  g.beginPath();
  g.ellipse(x, y - ry * 0.1, r * 0.22, r * 0.1, 0, 0, Math.PI);
  g.fill();
  if (lit > 0.01) {
    g.save();
    g.globalAlpha = clamp(lit);
    flame(g, x, y - ry * 0.15, r * 0.45, seconds, 2.2);
    g.restore();
  }
}

/** The small brass bell rung in the other hand. */
export function drawGhanti(g: Ctx, x: number, y: number, s: number, swing: number) {
  g.save();
  g.translate(x, y);
  g.rotate(swing);
  g.fillStyle = "#c89238";
  g.fillRect(-s * 0.08, -s * 0.9, s * 0.16, s * 0.5);
  g.beginPath();
  g.arc(0, -s * 0.95, s * 0.14, 0, TAU);
  g.fill();
  g.fillStyle = "#e0b050";
  g.beginPath();
  g.moveTo(-s * 0.45, 0);
  g.quadraticCurveTo(-s * 0.4, -s * 0.45, 0, -s * 0.45);
  g.quadraticCurveTo(s * 0.4, -s * 0.45, s * 0.45, 0);
  g.closePath();
  g.fill();
  g.restore();
}

/** A pattal, a plate of stitched leaves, with puri, chana and a heap of sheero. */
export function drawPattal(g: Ctx, x: number, y: number, r: number, c: number) {
  const ry = r * Math.max(0.3, 1 - c * 0.6);
  g.fillStyle = "#4e7a2c";
  g.beginPath();
  g.ellipse(x, y, r, ry, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#e0b060";
  g.beginPath();
  g.ellipse(x - r * 0.35, y - ry * 0.1, r * 0.35, ry * 0.4, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#e89a3a";
  g.beginPath();
  g.ellipse(x + r * 0.3, y, r * 0.28, ry * 0.35, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#8a5020";
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(x + r * (0.05 + (i % 3) * 0.1), y + ry * (0.35 + (i % 2) * 0.15), r * 0.06, 0, TAU);
    g.fill();
  }
}

// ─── Festival bulbs ───────────────────────────────────────────────────────────

export type Bulb = { x: number; y: number; color: string };

const BULB_COLOURS = ["255, 70, 60", "255, 200, 70", "90, 220, 120", "90, 160, 255", "255, 110, 210"];

/** Strings of little bulbs from the mandvi's dome out to the houses, sagging between. */
export function bulbStrings(t: Tilt, dome: number, ends: [number, number, number][]) {
  const lines: { x: number; y: number }[][] = [];
  const bulbs: Bulb[] = [];
  ends.forEach(([ex, ez, eh], s) => {
    const line: { x: number; y: number }[] = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const X = lerp(0, ex, k);
      const Z = lerp(0, ez, k);
      const H = lerp(dome, eh, k) - Math.sin(k * Math.PI) * 1.1;
      const pt = { x: X, y: Z * t.s - H * t.c };
      line.push(pt);
      if (i > 1 && i < 24)
        bulbs.push({
          ...pt,
          color: BULB_COLOURS[(i + s) % BULB_COLOURS.length],
        });
    }
    lines.push(line);
  });
  return { lines, bulbs };
}

export function drawStrings(g: Ctx, lines: { x: number; y: number }[][], bulbs: Bulb[], dark: number, seconds: number) {
  g.strokeStyle = "rgba(30, 20, 20, 0.8)";
  g.lineWidth = 0.02;
  for (const line of lines) {
    g.beginPath();
    line.forEach((pt, i) => (i ? g.lineTo(pt.x, pt.y) : g.moveTo(pt.x, pt.y)));
    g.stroke();
  }
  bulbs.forEach((b, i) => {
    const on = dark > 0.2 ? 0.55 + 0.45 * Math.sin(seconds * 3 + i * 1.7) : 0;
    g.fillStyle = on > 0 ? `rgba(${b.color}, ${0.5 + 0.5 * on})` : "rgba(220, 210, 200, 0.7)";
    g.beginPath();
    g.arc(b.x, b.y + 0.03, 0.035, 0, TAU);
    g.fill();
  });
}

// ─── The Ramlila ─────────────────────────────────────────────────────────────

/** A plank stage on bamboo, a red cloth front with gold border and marigolds, standing `h` high. */
export function drawStage(g: Ctx, t: Tilt, x: number, z: number, w: number, d: number, h: number) {
  const front = (z + d / 2) * t.s;
  const back = (z - d / 2) * t.s;
  const top = h * t.c;
  // The deck.
  g.fillStyle = "#7a5230";
  g.beginPath();
  g.moveTo(x - w / 2, back - top);
  g.lineTo(x + w / 2, back - top);
  g.lineTo(x + w / 2, front - top);
  g.lineTo(x - w / 2, front - top);
  g.fill();
  // Bamboo poles at the back corners, a painted backdrop of a palace arch.
  g.fillStyle = "#8a6a3a";
  for (const side of [-1, 1]) g.fillRect(x + (side * w) / 2 - 0.05 - side * 0.05, back - top - 3.2 * t.c, 0.1, 3.2 * t.c);
  const bw = w - 0.3;
  g.fillStyle = "#7a1a24";
  g.fillRect(x - bw / 2, back - top - 2.8 * t.c, bw, 2.8 * t.c);
  g.fillStyle = "#e8b440";
  g.beginPath();
  g.moveTo(x - bw * 0.3, back - top);
  g.lineTo(x - bw * 0.3, back - top - 1.6 * t.c);
  g.quadraticCurveTo(x, back - top - 2.5 * t.c, x + bw * 0.3, back - top - 1.6 * t.c);
  g.lineTo(x + bw * 0.3, back - top);
  g.fill();
  g.fillStyle = "#3a0e16";
  g.beginPath();
  g.moveTo(x - bw * 0.24, back - top);
  g.lineTo(x - bw * 0.24, back - top - 1.5 * t.c);
  g.quadraticCurveTo(x, back - top - 2.3 * t.c, x + bw * 0.24, back - top - 1.5 * t.c);
  g.lineTo(x + bw * 0.24, back - top);
  g.fill();
  // The cloth front.
  g.fillStyle = "#b41e24";
  g.fillRect(x - w / 2, front - top, w, top);
  g.fillStyle = "#e8b440";
  g.fillRect(x - w / 2, front - top, w, 0.08 * t.c + 0.01);
  for (let i = 0; i <= 20; i++) {
    const k = i / 20;
    const sag = Math.sin(((k * 4) % 1) * Math.PI) * 0.18;
    g.fillStyle = i % 2 ? "#f28a1a" : "#f5b018";
    g.beginPath();
    g.arc(x - w / 2 + k * w, front - top + 0.1 + sag * t.c, 0.06, 0, TAU);
    g.fill();
  }
}

/**
 * Ram's bow, held out in the front hand with the string drawn back to the other; `draw` is how
 * far (0..1), and the arrow is on the string until it is loosed.
 */
export function drawBow(g: Ctx, front: { x: number; y: number }, back: { x: number; y: number }, size: number, draw: number, arrow: boolean, facing: 1 | -1) {
  const half = size * 0.5;
  const bend = size * (0.16 + 0.1 * draw) * facing;
  const top = { x: front.x - bend * 0.4, y: front.y - half };
  const bottom = { x: front.x - bend * 0.4, y: front.y + half };
  g.strokeStyle = "#6a3a14";
  g.lineWidth = size * 0.045;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(top.x, top.y);
  g.quadraticCurveTo(front.x + bend, front.y, bottom.x, bottom.y);
  g.stroke();
  g.strokeStyle = "#e8b440";
  g.lineWidth = size * 0.02;
  g.stroke();
  // The string, to the drawing hand.
  const nock = { x: lerp(top.x, back.x, draw), y: lerp(front.y, back.y, draw) };
  g.strokeStyle = "rgba(240, 236, 220, 0.9)";
  g.lineWidth = size * 0.008;
  g.beginPath();
  g.moveTo(top.x, top.y);
  g.lineTo(nock.x, nock.y);
  g.lineTo(bottom.x, bottom.y);
  g.stroke();
  if (arrow) drawArrow(g, nock.x, nock.y, front.x + facing * size * 0.35, front.y, size * 0.02);
}

export function drawArrow(g: Ctx, x0: number, y0: number, x1: number, y1: number, width: number) {
  g.strokeStyle = "#d8c8a0";
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.fillStyle = "#e8e0d0";
  g.beginPath();
  g.moveTo(x1 + Math.cos(a) * width * 5, y1 + Math.sin(a) * width * 5);
  g.lineTo(x1 + Math.cos(a + 2.5) * width * 3, y1 + Math.sin(a + 2.5) * width * 3);
  g.lineTo(x1 + Math.cos(a - 2.5) * width * 3, y1 + Math.sin(a - 2.5) * width * 3);
  g.fill();
  g.fillStyle = "#c8141e";
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + Math.cos(a + side * 0.4) * width * 5, y0 + Math.sin(a + side * 0.4) * width * 5);
    g.lineTo(x0 + Math.cos(a) * width * 7, y0 + Math.sin(a) * width * 7);
    g.fill();
  }
}

/** Colours of the painted dandiya: lacquered stripes with little mirrors. */
export const STICKS: RGB[] = [
  [214, 40, 60],
  [240, 180, 30],
  [40, 150, 90],
  [60, 90, 200],
  [220, 70, 170],
];

export const lighten = (c: RGB, k: number) => rgb(mix(c, [255, 240, 210], k));
