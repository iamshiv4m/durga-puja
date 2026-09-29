// The mandvi at the heart of the chowk, and what is set in it: Amba on a Mata ni Pachedi, the
// kalash on its bed of sprouting barley, the akhand jyot in its glass, and the garbo.
import { TAU, clamp, flame, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import { PLACES, type Tilt } from "./world";

const RED: RGB = [168, 24, 30];
const GOLD: RGB = [226, 176, 70];
const MAROON = "#6e1812";
const INK = "#1c1210";
const CREAM = "#f0e2c2";

// ─── Mata ni Pachedi ─────────────────────────────────────────────────────────

/**
 * Amba, the mother goddess, in the manner of a Mata ni Pachedi, Gujarat's painted cloth shrine:
 * maroon, black and the cloth's own cream, the goddess on her tiger under a cusped arch, her
 * eight arms holding trident, sword, chakra, conch, lotus, bow and bell, one hand raised to bless.
 */
export function paintPachedi(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  const random = mulberry32(51);
  const W = width;
  const H = height;
  g.fillStyle = MAROON;
  g.fillRect(0, 0, W, H);
  // Borders: a black band with cream triangles, then dots.
  const band = W * 0.05;
  g.fillStyle = INK;
  g.fillRect(band * 0.3, band * 0.3, W - band * 0.6, H - band * 0.6);
  g.fillStyle = CREAM;
  const tri = (x: number, y: number, s: number, up: boolean) => {
    g.beginPath();
    g.moveTo(x - s / 2, y);
    g.lineTo(x + s / 2, y);
    g.lineTo(x, y + (up ? -s : s));
    g.fill();
  };
  for (let x = band; x < W - band * 0.5; x += band * 0.7) {
    tri(x, band * 0.95, band * 0.55, true);
    tri(x, H - band * 0.95, band * 0.55, false);
  }
  g.fillStyle = MAROON;
  g.fillRect(band, band, W - band * 2, H - band * 2);
  g.fillStyle = CREAM;
  for (let y = band * 1.3; y < H - band; y += band * 0.45) {
    g.beginPath();
    g.arc(band * 1.3, y, band * 0.1, 0, TAU);
    g.arc(W - band * 1.3, y, band * 0.1, 0, TAU);
    g.fill();
  }
  const inner = {
    x: band * 1.7,
    y: band * 1.7,
    w: W - band * 3.4,
    h: H - band * 3.4,
  };
  g.fillStyle = CREAM;
  g.fillRect(inner.x, inner.y, inner.w, inner.h);

  const cx = W / 2;
  // The cusped arch over her, black, with parrots on it.
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(inner.x, inner.y);
  g.lineTo(inner.x + inner.w, inner.y);
  g.lineTo(inner.x + inner.w, inner.y + inner.h * 0.34);
  const cusps = 7;
  for (let i = cusps; i >= 0; i--) {
    const t = i / cusps;
    const ax = inner.x + inner.w * (0.06 + 0.88 * t);
    const ay = inner.y + inner.h * (0.1 + 0.24 * Math.pow(Math.abs(t - 0.5) * 2, 1.6));
    g.quadraticCurveTo(ax + inner.w * 0.03, ay + inner.h * 0.05, ax, ay);
  }
  g.lineTo(inner.x, inner.y + inner.h * 0.34);
  g.closePath();
  g.fill();
  g.fillStyle = CREAM;
  for (let i = 0; i < 18; i++) {
    g.beginPath();
    g.arc(inner.x + inner.w * (0.05 + (i / 17) * 0.9), inner.y + inner.h * 0.045, W * 0.008, 0, TAU);
    g.fill();
  }
  for (const side of [-1, 1]) {
    const px = cx + side * inner.w * 0.34;
    const py = inner.y + inner.h * 0.1;
    g.fillStyle = MAROON;
    g.beginPath();
    g.ellipse(px, py, W * 0.035, W * 0.02, side * 0.4, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(px + side * W * 0.03, py - W * 0.015, W * 0.013, 0, TAU);
    g.fill();
  }

  // The tiger, walking, in profile.
  const ty = inner.y + inner.h * 0.8;
  const tl = inner.w * 0.78;
  g.fillStyle = "#e8a848";
  g.strokeStyle = INK;
  g.lineWidth = W * 0.008;
  g.beginPath();
  g.ellipse(cx, ty, tl * 0.4, inner.h * 0.075, 0, 0, TAU);
  g.fill();
  g.stroke();
  // Legs.
  for (const lx of [-0.3, -0.18, 0.18, 0.3]) {
    g.fillStyle = "#e8a848";
    g.beginPath();
    g.rect(cx + lx * tl - W * 0.02, ty + inner.h * 0.03, W * 0.04, inner.h * 0.1);
    g.fill();
    g.stroke();
  }
  // Head, with ears, eye and teeth.
  const hx = cx - tl * 0.44;
  const hy = ty - inner.h * 0.05;
  g.fillStyle = "#e8a848";
  g.beginPath();
  g.arc(hx, hy, inner.h * 0.06, 0, TAU);
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(hx + W * 0.02, hy - inner.h * 0.055, W * 0.018, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(hx - W * 0.012, hy - inner.h * 0.012, W * 0.008, 0, TAU);
  g.fill();
  g.fillStyle = CREAM;
  g.fillRect(hx - inner.h * 0.058, hy + inner.h * 0.02, W * 0.03, W * 0.01);
  // Stripes.
  g.strokeStyle = INK;
  g.lineWidth = W * 0.007;
  for (let i = 0; i < 9; i++) {
    const sx = cx - tl * 0.3 + (i / 8) * tl * 0.62;
    g.beginPath();
    g.moveTo(sx, ty - inner.h * 0.07);
    g.quadraticCurveTo(sx + W * 0.012, ty - inner.h * 0.02, sx - W * 0.006, ty + inner.h * 0.02);
    g.stroke();
  }
  // Tail, curling up.
  g.lineWidth = W * 0.014;
  g.beginPath();
  g.moveTo(cx + tl * 0.38, ty - inner.h * 0.02);
  g.bezierCurveTo(cx + tl * 0.5, ty - inner.h * 0.02, cx + tl * 0.52, ty - inner.h * 0.16, cx + tl * 0.44, ty - inner.h * 0.18);
  g.stroke();

  // The goddess seated on its back.
  const seat = ty - inner.h * 0.07;
  const gh = inner.h * 0.52;
  const neck = seat - gh * 0.62;
  // The halo, with its rays.
  g.fillStyle = "#e8b440";
  g.beginPath();
  g.arc(cx, neck - gh * 0.16, gh * 0.26, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = W * 0.006;
  g.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * gh * 0.2, neck - gh * 0.16 + Math.sin(a) * gh * 0.2);
    g.lineTo(cx + Math.cos(a) * gh * 0.26, neck - gh * 0.16 + Math.sin(a) * gh * 0.26);
    g.stroke();
  }
  // Eight arms, fanned, each hand holding something.
  const holds = ["trishul", "chakra", "lotus", "bless", "sword", "conch", "bow", "bell"];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? 1 : -1;
    const k = i % 4;
    const angle = -Math.PI / 2 + side * (0.55 + k * 0.42);
    const sx = cx + side * gh * 0.1;
    const sy = neck + gh * 0.08;
    const len = gh * (0.36 - k * 0.02);
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len;
    g.strokeStyle = INK;
    g.lineWidth = W * 0.024;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(sx + side * len * 0.4, sy + len * 0.1, ex, ey);
    g.stroke();
    g.strokeStyle = "#d89a6a";
    g.lineWidth = W * 0.016;
    g.stroke();
    holdThing(g, holds[i], ex, ey, gh * 0.08, side);
  }
  // Her skirt spread over the tiger, maroon with cream dots.
  g.fillStyle = MAROON;
  g.strokeStyle = INK;
  g.lineWidth = W * 0.007;
  g.beginPath();
  g.moveTo(cx - gh * 0.1, seat - gh * 0.34);
  g.lineTo(cx + gh * 0.1, seat - gh * 0.34);
  g.quadraticCurveTo(cx + gh * 0.4, seat - gh * 0.1, cx + gh * 0.44, seat + gh * 0.04);
  g.lineTo(cx - gh * 0.44, seat + gh * 0.04);
  g.quadraticCurveTo(cx - gh * 0.4, seat - gh * 0.1, cx - gh * 0.1, seat - gh * 0.34);
  g.fill();
  g.stroke();
  g.fillStyle = CREAM;
  for (let i = 0; i < 26; i++) {
    const u = random() * 2 - 1;
    const v = random();
    g.beginPath();
    g.arc(cx + u * gh * (0.1 + 0.3 * v), seat - gh * 0.3 + v * gh * 0.3, W * 0.006, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#e8b440";
  g.fillRect(cx - gh * 0.44, seat + gh * 0.01, gh * 0.88, gh * 0.03);
  // Torso, in a red choli, with a garland.
  g.fillStyle = "#b41e24";
  g.beginPath();
  g.moveTo(cx - gh * 0.12, neck + gh * 0.04);
  g.lineTo(cx + gh * 0.12, neck + gh * 0.04);
  g.lineTo(cx + gh * 0.09, seat - gh * 0.32);
  g.lineTo(cx - gh * 0.09, seat - gh * 0.32);
  g.fill();
  g.stroke();
  g.strokeStyle = "#f0a020";
  g.lineWidth = W * 0.012;
  g.beginPath();
  g.moveTo(cx - gh * 0.1, neck + gh * 0.05);
  g.quadraticCurveTo(cx, seat - gh * 0.2, cx + gh * 0.1, neck + gh * 0.05);
  g.stroke();
  // Face, crown and eyes.
  const fy = neck - gh * 0.1;
  g.fillStyle = "#e0a070";
  g.strokeStyle = INK;
  g.lineWidth = W * 0.006;
  g.beginPath();
  g.ellipse(cx, fy, gh * 0.085, gh * 0.105, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = "#e8b440";
  g.beginPath();
  g.moveTo(cx - gh * 0.1, fy - gh * 0.07);
  g.lineTo(cx - gh * 0.08, fy - gh * 0.2);
  g.lineTo(cx - gh * 0.04, fy - gh * 0.16);
  g.lineTo(cx, fy - gh * 0.3);
  g.lineTo(cx + gh * 0.04, fy - gh * 0.16);
  g.lineTo(cx + gh * 0.08, fy - gh * 0.2);
  g.lineTo(cx + gh * 0.1, fy - gh * 0.07);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "#b41e24";
  g.beginPath();
  g.arc(cx, fy - gh * 0.14, gh * 0.018, 0, TAU);
  g.fill();
  for (const side of [-1, 1]) {
    // Wide, fish-shaped eyes.
    g.fillStyle = CREAM;
    g.beginPath();
    g.ellipse(cx + side * gh * 0.035, fy - gh * 0.01, gh * 0.03, gh * 0.014, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = INK;
    g.beginPath();
    g.arc(cx + side * gh * 0.035, fy - gh * 0.01, gh * 0.009, 0, TAU);
    g.fill();
    g.fillStyle = "#e8b440";
    g.beginPath();
    g.arc(cx + side * gh * 0.088, fy + gh * 0.03, gh * 0.014, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#b41e24";
  g.beginPath();
  g.arc(cx, fy - gh * 0.045, gh * 0.009, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(cx, fy + gh * 0.05, gh * 0.022, gh * 0.009, 0, 0, TAU);
  g.fill();

  // Devotees with lamps either side of the tiger, and a row of lamps along the foot.
  for (const side of [-1, 1]) {
    const dx = cx + side * inner.w * 0.4;
    const dy = inner.y + inner.h * 0.62;
    g.fillStyle = INK;
    g.beginPath();
    g.arc(dx, dy - inner.h * 0.08, W * 0.022, 0, TAU);
    g.fill();
    g.fillStyle = MAROON;
    g.beginPath();
    g.moveTo(dx - W * 0.03, dy - inner.h * 0.06);
    g.lineTo(dx + W * 0.03, dy - inner.h * 0.06);
    g.lineTo(dx + W * 0.045, dy + inner.h * 0.05);
    g.lineTo(dx - W * 0.045, dy + inner.h * 0.05);
    g.fill();
    g.fillStyle = "#e8b440";
    g.beginPath();
    g.arc(dx - side * W * 0.035, dy - inner.h * 0.04, W * 0.012, 0, TAU);
    g.fill();
  }
  const footY = inner.y + inner.h * 0.965;
  for (let i = 0; i < 11; i++) {
    const lx = inner.x + inner.w * (0.06 + (i / 10) * 0.88);
    g.fillStyle = MAROON;
    g.beginPath();
    g.ellipse(lx, footY, W * 0.018, W * 0.008, 0, 0, Math.PI);
    g.fill();
    g.fillStyle = "#e8a020";
    g.beginPath();
    g.moveTo(lx - W * 0.006, footY);
    g.quadraticCurveTo(lx, footY - W * 0.03, lx + W * 0.006, footY);
    g.fill();
  }
  return canvas;
}

function holdThing(g: Ctx, what: string, x: number, y: number, s: number, side: number) {
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = s * 0.14;
  g.lineCap = "round";
  if (what === "trishul") {
    g.beginPath();
    g.moveTo(x, y + s * 1.2);
    g.lineTo(x, y - s * 1.3);
    g.moveTo(x - s * 0.45, y - s * 0.9);
    g.quadraticCurveTo(x - s * 0.45, y - s * 0.4, x, y - s * 0.4);
    g.quadraticCurveTo(x + s * 0.45, y - s * 0.4, x + s * 0.45, y - s * 0.9);
    g.stroke();
  } else if (what === "sword") {
    g.beginPath();
    g.moveTo(x, y + s * 0.2);
    g.lineTo(x + side * s * 0.25, y - s * 1.4);
    g.stroke();
    g.fillRect(x - s * 0.3, y, s * 0.6, s * 0.12);
  } else if (what === "chakra") {
    g.beginPath();
    g.arc(x, y - s * 0.5, s * 0.5, 0, TAU);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.beginPath();
      g.moveTo(x, y - s * 0.5);
      g.lineTo(x + Math.cos(a) * s * 0.5, y - s * 0.5 + Math.sin(a) * s * 0.5);
      g.stroke();
    }
  } else if (what === "conch") {
    g.fillStyle = CREAM;
    g.beginPath();
    g.ellipse(x, y - s * 0.3, s * 0.3, s * 0.5, side * 0.5, 0, TAU);
    g.fill();
    g.stroke();
  } else if (what === "lotus") {
    g.fillStyle = "#d85a78";
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.ellipse(x + i * s * 0.16, y - s * 0.5, s * 0.14, s * 0.4, i * 0.35, 0, TAU);
      g.fill();
    }
  } else if (what === "bow") {
    g.beginPath();
    g.arc(x + side * s * 0.6, y - s * 0.3, s * 0.9, Math.PI * 0.6, Math.PI * 1.4);
    g.stroke();
  } else if (what === "bell") {
    g.fillStyle = "#c89a3a";
    g.beginPath();
    g.moveTo(x - s * 0.35, y);
    g.quadraticCurveTo(x - s * 0.3, y - s * 0.7, x, y - s * 0.7);
    g.quadraticCurveTo(x + s * 0.3, y - s * 0.7, x + s * 0.35, y);
    g.fill();
    g.stroke();
  } else {
    // The raised right hand, palm out.
    g.fillStyle = "#d89a6a";
    g.beginPath();
    g.ellipse(x, y - s * 0.35, s * 0.28, s * 0.42, 0, 0, TAU);
    g.fill();
    g.stroke();
  }
}

// ─── The garbo ───────────────────────────────────────────────────────────────

/**
 * A garbo standing on (x, y), `size` wide: a painted clay pot pierced with rows of holes, lit
 * from inside by `lit` (0..1).
 */
export function drawGarbo(g: Ctx, x: number, y: number, size: number, c: number, lit: number, seconds: number, seed: number) {
  const r = size / 2;
  const cy = y - r * 0.95 * c;
  const ry = r * 0.92 * Math.max(c, 0.35);
  // Body.
  const body = g.createRadialGradient(x - r * 0.3, cy - ry * 0.3, r * 0.1, x, cy, r * 1.1);
  body.addColorStop(0, rgb(mix([196, 96, 50], [255, 190, 110], lit * 0.3)));
  body.addColorStop(1, rgb(mix([110, 44, 24], [180, 80, 40], lit * 0.3)));
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(x, cy, r, ry, 0, 0, TAU);
  g.fill();
  // Painted bands, white and yellow and green.
  g.lineWidth = r * 0.07;
  const bands: [number, string][] = [
    [-0.55, "#f0e6d0"],
    [0.05, "#f5c518"],
    [0.55, "#2fb36b"],
  ];
  for (const [k, color] of bands) {
    g.strokeStyle = color;
    g.beginPath();
    const w = Math.sqrt(1 - k * k) * r;
    g.ellipse(x, cy + k * ry, w, w * 0.2 * (1 - c * 0.6) + 0.001, 0, 0.1, Math.PI - 0.1);
    g.stroke();
  }
  // The neck and its lip.
  g.fillStyle = "#8a3a1e";
  g.fillRect(x - r * 0.36, cy - ry - r * 0.18 * c, r * 0.72, r * 0.22 * c + 0.002);
  g.fillStyle = "#b85a2e";
  g.beginPath();
  g.ellipse(x, cy - ry - r * 0.18 * c, r * 0.42, r * 0.42 * Math.sqrt(1 - c * c) + r * 0.05, 0, 0, TAU);
  g.fill();
  // The holes, in rows of diamonds: dark by day, burning when the lamp is in.
  const random = mulberry32(Math.floor(seed * 1000));
  const rows = 5;
  const glowOn = lit > 0.02;
  for (let row = 0; row < rows; row++) {
    const k = -0.7 + (row / (rows - 1)) * 1.4;
    const w = Math.sqrt(1 - k * k) * r;
    const count = 5 + (row % 2);
    for (let i = 0; i < count; i++) {
      const a = ((i + (row % 2) * 0.5) / count) * Math.PI;
      const hx = x - Math.cos(a) * w * 0.85;
      const hy = cy + k * ry * 0.9;
      const flick = glowOn ? 0.75 + 0.25 * Math.sin(seconds * 9 + random() * 30) : 0;
      g.fillStyle = glowOn ? `rgba(255, ${Math.round(190 + 50 * flick)}, ${Math.round(110 + 60 * flick)}, ${0.35 + 0.65 * lit})` : "#3a160c";
      const hs = r * 0.06 * Math.sin(a) + r * 0.02;
      g.beginPath();
      g.moveTo(hx, hy - hs * 1.3);
      g.lineTo(hx + hs, hy);
      g.lineTo(hx, hy + hs * 1.3);
      g.lineTo(hx - hs, hy);
      g.fill();
    }
  }
  // Light spilling from the mouth.
  if (glowOn) {
    g.fillStyle = `rgba(255, 220, 150, ${0.8 * lit})`;
    g.beginPath();
    g.ellipse(x, cy - ry - r * 0.18 * c, r * 0.3, r * 0.3 * Math.sqrt(1 - c * c) + r * 0.03, 0, 0, TAU);
    g.fill();
  }
}

// ─── Kalash, jawara and the akhand jyot ──────────────────────────────────────

export type Altar = {
  /** How far each thing is along, 0..1, as the morning goes. */
  soil: number;
  seeds: number;
  kalash: number;
  coconut: number;
  jyot: number;
  /** How tall the barley has grown, 0..1 over the nine days. */
  growth: number;
  garbo: number;
};

/** The clay dish of soil, the barley in it, and the kalash on top, standing on (x, y). */
export function drawKalash(g: Ctx, x: number, y: number, c: number, s: Tilt["s"], state: Altar, seconds: number) {
  if (state.soil < 0.01) return;
  const r = 0.2;
  // The dish, and its soil.
  g.globalAlpha = clamp(state.soil * 1.5);
  g.fillStyle = "#8a3c1e";
  g.beginPath();
  g.ellipse(x, y, r, r * s, 0, 0, Math.PI);
  g.lineTo(x - r, y - 0.06 * c);
  g.ellipse(x, y - 0.06 * c, r, r * s, 0, Math.PI, 0, true);
  g.fill();
  g.fillStyle = "#4a2e1a";
  g.beginPath();
  g.ellipse(x, y - 0.06 * c, r * 0.92, r * 0.92 * s, 0, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
  // Barley grains, then shoots coming up through the nine days.
  if (state.seeds > 0.01) {
    const random = mulberry32(12);
    const n = Math.floor(70 * state.seeds);
    for (let i = 0; i < n; i++) {
      const a = random() * TAU;
      const d = Math.sqrt(random()) * r * 0.85;
      const gx = x + Math.cos(a) * d;
      const gy = y - 0.06 * c + Math.sin(a) * d * s;
      const tall = state.growth * (0.16 + random() * 0.12);
      if (tall < 0.01) {
        g.fillStyle = "#d8c080";
        g.fillRect(gx - 0.006, gy - 0.004, 0.012, 0.008);
        continue;
      }
      const sway = Math.sin(seconds * 1.3 + i) * 0.01 * state.growth;
      g.strokeStyle = rgb(mix([180, 220, 100], [70, 150, 50], random()));
      g.lineWidth = 0.008;
      g.beginPath();
      g.moveTo(gx, gy);
      g.quadraticCurveTo(gx + sway, gy - tall * c * 0.6, gx + sway * 2 + (random() - 0.5) * 0.03, gy - tall * c);
      g.stroke();
    }
  }
  if (state.kalash < 0.01) return;
  // The kalash, lowered into place.
  const drop = (1 - state.kalash) * 0.25;
  const ky = y - 0.06 * c - drop * c;
  g.globalAlpha = clamp(state.kalash * 2);
  const kr = 0.105;
  const kcy = ky - kr * 0.9 * c;
  const metal = g.createRadialGradient(x - kr * 0.4, kcy - kr * 0.4 * c, 0, x, kcy, kr * 1.2);
  metal.addColorStop(0, "#f8d890");
  metal.addColorStop(0.5, "#c88a3a");
  metal.addColorStop(1, "#6a3c14");
  g.fillStyle = metal;
  g.beginPath();
  g.ellipse(x, kcy, kr, kr * 0.95 * c + 0.01, 0, 0, TAU);
  g.fill();
  g.fillStyle = "#b07830";
  g.fillRect(x - kr * 0.45, kcy - kr * 1.25 * c, kr * 0.9, kr * 0.5 * c);
  // The red mauli thread round its neck, and a sathiya in kumkum on its belly.
  g.strokeStyle = "#d02020";
  g.lineWidth = 0.012;
  g.beginPath();
  g.ellipse(x, kcy - kr * 0.8 * c, kr * 0.5, 0.012, 0, 0, Math.PI);
  g.stroke();
  g.strokeStyle = "#c01010";
  g.lineWidth = 0.009;
  const k = kr * 0.28;
  g.beginPath();
  g.moveTo(x, kcy - k * c);
  g.lineTo(x, kcy + k * c);
  g.moveTo(x - k, kcy);
  g.lineTo(x + k, kcy);
  g.moveTo(x, kcy - k * c);
  g.lineTo(x + k, kcy - k * c);
  g.moveTo(x + k, kcy);
  g.lineTo(x + k, kcy + k * c);
  g.moveTo(x, kcy + k * c);
  g.lineTo(x - k, kcy + k * c);
  g.moveTo(x - k, kcy);
  g.lineTo(x - k, kcy - k * c);
  g.stroke();
  const mouth = kcy - kr * 1.25 * c;
  // Five mango leaves fanned in the mouth, and the coconut in its red chunri.
  if (state.coconut > 0.01) {
    g.globalAlpha = clamp(state.coconut * 2);
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.42;
      g.fillStyle = i % 2 ? "#3a8a30" : "#2c7026";
      g.beginPath();
      g.moveTo(x, mouth);
      const lx = x + Math.cos(a) * 0.16;
      const ly = mouth + Math.sin(a) * 0.11 * c + 0.02;
      g.quadraticCurveTo(x + Math.cos(a - 0.3) * 0.1, mouth + Math.sin(a - 0.3) * 0.08 * c, lx, ly);
      g.quadraticCurveTo(x + Math.cos(a + 0.3) * 0.1, mouth + Math.sin(a + 0.3) * 0.08 * c, x, mouth);
      g.fill();
    }
    const cdrop = (1 - state.coconut) * 0.15;
    const ccy = mouth - 0.05 * c - cdrop;
    g.fillStyle = "#c8141e";
    g.beginPath();
    g.ellipse(x, ccy, 0.06, 0.075 * c + 0.01, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "#f2c040";
    g.lineWidth = 0.008;
    g.beginPath();
    g.ellipse(x, ccy + 0.02 * c, 0.058, 0.02, 0, 0, Math.PI);
    g.stroke();
    g.fillStyle = "#6a4020";
    g.beginPath();
    g.arc(x, ccy - 0.07 * c, 0.014, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** The akhand jyot: a brass lamp inside a glass chimney, so no breath of wind can put it out. */
export function drawJyot(g: Ctx, x: number, y: number, c: number, lit: number, seconds: number) {
  const brass = "#c89238";
  g.fillStyle = "#8a6020";
  g.beginPath();
  g.ellipse(x, y, 0.07, 0.025, 0, 0, TAU);
  g.fill();
  g.fillStyle = brass;
  g.fillRect(x - 0.015, y - 0.1 * c, 0.03, 0.1 * c);
  g.beginPath();
  g.ellipse(x, y - 0.1 * c, 0.06, 0.02, 0, 0, Math.PI);
  g.lineTo(x - 0.06, y - 0.1 * c);
  g.fill();
  if (lit > 0.01) {
    g.save();
    g.globalAlpha = clamp(lit * 1.3);
    flame(g, x, y - 0.11 * c, 0.07 * (0.5 + 0.5 * lit), seconds, 4.2);
    g.restore();
  }
  // The glass.
  g.strokeStyle = "rgba(220, 236, 240, 0.55)";
  g.fillStyle = "rgba(200, 220, 230, 0.12)";
  g.lineWidth = 0.008;
  g.beginPath();
  g.moveTo(x - 0.05, y - 0.08 * c);
  g.quadraticCurveTo(x - 0.075, y - 0.17 * c, x - 0.04, y - 0.28 * c);
  g.lineTo(x + 0.04, y - 0.28 * c);
  g.quadraticCurveTo(x + 0.075, y - 0.17 * c, x + 0.05, y - 0.08 * c);
  g.closePath();
  g.fill();
  g.stroke();
  g.strokeStyle = "rgba(255, 255, 255, 0.35)";
  g.beginPath();
  g.moveTo(x - 0.035, y - 0.12 * c);
  g.lineTo(x - 0.03, y - 0.24 * c);
  g.stroke();
}

// ─── The mandvi ──────────────────────────────────────────────────────────────

type MandviState = Altar & {
  night: number;
  seconds: number;
  pachedi: HTMLCanvasElement;
};

/** Projects a point of the mandvi. */
const P = (t: Tilt, X: number, Z: number, H: number) => ({
  x: X,
  y: Z * t.s - H * t.c,
});

function quad(g: Ctx, pts: { x: number; y: number }[]) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fill();
}

/** The mandvi: a carved, painted wooden shrine with the goddess, the lamps and the garbo in it. */
export function drawMandvi(g: Ctx, t: Tilt, st: MandviState) {
  const { half, deck, roof, top } = PLACES.mandvi;
  const s = t.s;
  const c = t.c;
  const post = half - 0.08;

  // The deck: a red cloth over the top, the painted front with its row of mirrors.
  g.fillStyle = "#6a2a18";
  quad(g, [P(t, -half, half, 0), P(t, half, half, 0), P(t, half, half, deck), P(t, -half, half, deck)]);
  g.fillStyle = rgb(RED);
  quad(g, [P(t, -half, -half, deck), P(t, half, -half, deck), P(t, half, half, deck), P(t, -half, half, deck)]);
  g.fillStyle = rgb(GOLD);
  const front = P(t, -half, half, deck);
  g.fillRect(front.x, front.y, half * 2, 0.05 * c + 0.004);
  g.fillStyle = "#b8322a";
  g.fillRect(front.x, front.y + 0.05 * c, half * 2, (deck - 0.1) * c);
  g.fillStyle = "#f4f0e0";
  for (let i = 0; i < 13; i++) {
    g.beginPath();
    g.arc(-half + 0.08 + (i / 12) * (half * 2 - 0.16), front.y + deck * 0.55 * c, 0.022, 0, TAU);
    g.fill();
  }
  g.fillStyle = rgb(GOLD);
  g.fillRect(front.x, P(t, 0, half, 0.05).y, half * 2, 0.04 * c + 0.003);

  // The back pillars and the goddess between them.
  const pillar = (X: number, Z: number) => {
    const b = P(t, X, Z, deck);
    const tp = P(t, X, Z, roof);
    g.fillStyle = "#7a2e1a";
    g.fillRect(X - 0.045, tp.y, 0.09, b.y - tp.y);
    g.fillStyle = rgb(GOLD);
    for (const k of [0.12, 0.5, 0.88]) {
      const yy = lerp(b.y, tp.y, k);
      g.fillRect(X - 0.06, yy - 0.025 * c, 0.12, 0.05 * c + 0.002);
    }
  };
  pillar(-post, -post);
  pillar(post, -post);
  const pw = (post - 0.06) * 2;
  const ph = 1.75;
  const pb = P(t, 0, -post + 0.02, deck + 0.08);
  g.drawImage(st.pachedi, -pw / 2, pb.y - ph * c, pw, ph * c);
  // Marigold strings down either side of her.
  for (const X of [-pw / 2 + 0.04, pw / 2 - 0.04]) {
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? "#f28a1a" : "#f5b018";
      g.beginPath();
      g.arc(X, pb.y - ph * c + (i / 15) * ph * c, 0.035, 0, TAU);
      g.fill();
    }
  }

  // What stands on the deck: the garbo before her, the kalash, the akhand jyot.
  if (st.garbo > 0.01) {
    const gp = P(t, 0, -0.2, deck);
    g.fillStyle = "#6a2a18";
    g.fillRect(-0.16, gp.y - 0.14 * c, 0.32, 0.14 * c + 0.01);
    g.fillStyle = rgb(GOLD);
    g.beginPath();
    g.ellipse(0, gp.y - 0.14 * c, 0.18, 0.18 * s + 0.01, 0, 0, TAU);
    g.fill();
    g.globalAlpha = clamp(st.garbo * 2);
    drawGarbo(g, 0, gp.y - 0.14 * c - (1 - st.garbo) * 0.3, 0.4, c, st.garbo, st.seconds, 1.7);
    g.globalAlpha = 1;
  }
  const kp = P(t, -0.34, 0.42, deck);
  drawKalash(g, kp.x, kp.y, c, s, st, st.seconds);
  const jp = P(t, 0.36, 0.44, deck);
  drawJyot(g, jp.x, jp.y, c, st.jyot, st.seconds);

  // Front pillars.
  pillar(-post, post);
  pillar(post, post);

  // The canopy: a cusped arch on the front, the roof, and a dome with its kalash and flag.
  const r0 = P(t, -half - 0.08, half + 0.08, roof);
  const archTop = roof + 0.35;
  g.fillStyle = "#8a2a1a";
  g.beginPath();
  g.moveTo(-half - 0.08, r0.y);
  const cusps = 5;
  for (let i = 0; i <= cusps; i++) {
    const k = i / cusps;
    const X = lerp(-post, post, k);
    const H = roof - 0.35 * Math.sin(k * Math.PI) - (i % 2 ? 0.06 : 0);
    g.lineTo(X, P(t, X, half + 0.08, H).y);
  }
  g.lineTo(half + 0.08, r0.y);
  g.lineTo(half + 0.08, P(t, 0, half + 0.08, archTop).y);
  g.lineTo(-half - 0.08, P(t, 0, half + 0.08, archTop).y);
  g.closePath();
  g.fill();
  // Its painted border and bells.
  g.fillStyle = rgb(GOLD);
  g.fillRect(-half - 0.08, P(t, 0, half + 0.08, archTop).y, (half + 0.08) * 2, 0.06 * c + 0.004);
  for (let i = 0; i < 7; i++) {
    const X = -half + (i / 6) * half * 2;
    const by = P(t, X, half + 0.08, roof - 0.02).y + 0.06;
    g.fillStyle = "#d8a840";
    g.beginPath();
    g.moveTo(X - 0.03, by + 0.05);
    g.quadraticCurveTo(X, by - 0.03, X + 0.03, by + 0.05);
    g.fill();
  }
  // The roof slab seen from above.
  g.fillStyle = "#9a3420";
  quad(g, [P(t, -half - 0.1, -half - 0.1, archTop), P(t, half + 0.1, -half - 0.1, archTop), P(t, half + 0.1, half + 0.1, archTop), P(t, -half - 0.1, half + 0.1, archTop)]);
  // The dome.
  const db = P(t, 0, 0, archTop + 0.05);
  const dh = top - archTop - 0.25;
  g.fillStyle = "#c8452a";
  g.beginPath();
  g.ellipse(0, db.y, 0.62, 0.62 * s + 0.005, 0, 0, TAU);
  g.moveTo(-0.62, db.y);
  g.bezierCurveTo(-0.62, db.y - dh * c * 0.7, -0.2, db.y - dh * c, 0, db.y - dh * c);
  g.bezierCurveTo(0.2, db.y - dh * c, 0.62, db.y - dh * c * 0.7, 0.62, db.y);
  g.fill();
  g.strokeStyle = rgb(GOLD);
  g.lineWidth = 0.03;
  for (const k of [0.25, 0.55]) {
    const w = 0.62 * Math.sqrt(1 - k * k);
    g.beginPath();
    g.ellipse(0, db.y - dh * c * k, w, w * s + 0.002, 0, 0.05, Math.PI - 0.05);
    g.stroke();
  }
  // The kalash finial and a red flag.
  const fy = db.y - dh * c;
  g.fillStyle = rgb(GOLD);
  g.beginPath();
  g.arc(0, fy - 0.08 * c, 0.07, 0, TAU);
  g.fill();
  g.fillRect(-0.02, fy - 0.9 * c, 0.03, 0.8 * c);
  const wave = Math.sin(st.seconds * 2.5) * 0.05;
  g.fillStyle = "#d8141e";
  g.beginPath();
  g.moveTo(0.01, fy - 0.9 * c);
  g.quadraticCurveTo(0.3, fy - (0.86 + wave) * c, 0.55, fy - (0.8 + wave * 2) * c);
  g.lineTo(0.01, fy - 0.55 * c);
  g.fill();
  // Marigold swags along the front of the canopy.
  for (let i = 0; i <= 24; i++) {
    const k = i / 24;
    const X = lerp(-half, half, k);
    const sag = Math.sin(((k * 3) % 1) * Math.PI) * 0.12;
    g.fillStyle = i % 3 === 1 ? "#3f8a32" : i % 2 ? "#f28a1a" : "#f5b018";
    g.beginPath();
    g.arc(X, P(t, X, half + 0.1, archTop - 0.02).y + sag * c + 0.02, 0.035, 0, TAU);
    g.fill();
  }
}

/** Where the mandvi's outline bulbs hang, for the light pass. */
export function mandviBulbs(t: Tilt) {
  const { half, roof } = PLACES.mandvi;
  const archTop = roof + 0.35;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= 12; i++) {
    const X = lerp(-half - 0.08, half + 0.08, i / 12);
    out.push(P(t, X, half + 0.08, archTop + 0.02));
  }
  for (let i = 1; i < 6; i++) {
    const H = lerp(0.4, roof, i / 6);
    out.push(P(t, -half + 0.08, half, H), P(t, half - 0.08, half, H));
  }
  return out;
}
