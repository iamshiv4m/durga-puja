// Bappa, painted in code: a seated, four-armed Ganesha on a red and gold seat, with Mushak at his
// feet. He is drawn in world units around his base (x = 0, y = 0, y up is negative), about 2.6
// tall, first in grey shadu clay and then in paint. The eyes, the cloth over him and the garland
// are drawn live over the cached figure, since they change with the scroll.
import { TAU, clamp, lerp, mulberry32, rgb, type Ctx, type RGB } from "../paint";

export type Finish = "clay" | "paint";
type Tone = [RGB, RGB, RGB];
type Point = [number, number];

type Palette = {
  skin: Tone;
  ear: Tone;
  gold: Tone;
  dhoti: Tone;
  border: RGB;
  seat: Tone;
  petal: Tone;
  ivory: Tone;
  jewels: [RGB, RGB];
  mouse: Tone;
  sole: RGB;
  lip: RGB;
  line: string;
  sclera: RGB;
  brow: string;
  modak: Tone;
};

const PAINT: Palette = {
  skin: [
    [255, 168, 96],
    [234, 104, 46],
    [160, 48, 24],
  ],
  ear: [
    [255, 186, 160],
    [236, 124, 112],
    [178, 66, 66],
  ],
  gold: [
    [255, 234, 150],
    [228, 168, 52],
    [140, 86, 18],
  ],
  dhoti: [
    [255, 222, 100],
    [242, 172, 30],
    [186, 104, 14],
  ],
  border: [30, 128, 72],
  seat: [
    [220, 62, 64],
    [168, 24, 40],
    [96, 10, 22],
  ],
  petal: [
    [255, 206, 214],
    [238, 124, 154],
    [182, 60, 98],
  ],
  ivory: [
    [255, 252, 240],
    [242, 228, 196],
    [190, 168, 128],
  ],
  jewels: [
    [218, 22, 48],
    [22, 150, 88],
  ],
  mouse: [
    [206, 194, 186],
    [146, 130, 124],
    [84, 72, 68],
  ],
  sole: [220, 60, 60],
  lip: [190, 30, 40],
  line: "rgba(96, 30, 12, 0.5)",
  sclera: [252, 248, 238],
  brow: "rgba(34, 14, 10, 0.9)",
  modak: [
    [255, 250, 232],
    [246, 230, 196],
    [204, 176, 132],
  ],
};

const shift = ([a, b, c]: Tone, d: number): Tone => [a.map((x) => x + d) as RGB, b.map((x) => x + d) as RGB, c.map((x) => x + d) as RGB];
const CLAY_TONE: Tone = [
  [214, 204, 188],
  [176, 165, 148],
  [116, 106, 94],
];

/** Shadu clay: one grey with small shifts, so the carving still reads. */
const CLAY: Palette = {
  skin: CLAY_TONE,
  ear: shift(CLAY_TONE, 8),
  gold: shift(CLAY_TONE, 14),
  dhoti: shift(CLAY_TONE, -6),
  border: [150, 140, 124],
  seat: shift(CLAY_TONE, -14),
  petal: shift(CLAY_TONE, 6),
  ivory: shift(CLAY_TONE, 20),
  jewels: [
    [168, 158, 142],
    [168, 158, 142],
  ],
  mouse: shift(CLAY_TONE, -10),
  sole: [170, 158, 142],
  lip: [156, 144, 128],
  line: "rgba(70, 62, 52, 0.45)",
  sclera: [200, 192, 176],
  brow: "rgba(92, 82, 72, 0.35)",
  modak: shift(CLAY_TONE, 16),
};

/** Where his eyes are; the pupils and kohl are painted last. */
export const EYE = { x: 0.17, y: -1.5 };
/** The box the cached figure is drawn in. */
const BOX = { x: -1.42, y: -2.64, w: 2.84, h: 2.84 };

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function radial(g: Ctx, x: number, y: number, r: number, [light, mid, dark]: Tone) {
  const gradient = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.04, x, y, r);
  gradient.addColorStop(0, rgb(light));
  gradient.addColorStop(0.55, rgb(mid));
  gradient.addColorStop(1, rgb(dark));
  return gradient;
}

/** Gold, lit from the left like a turned band of metal. */
function goldAcross(g: Ctx, x0: number, x1: number, [light, mid, dark]: Tone) {
  const gradient = g.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, rgb(dark));
  gradient.addColorStop(0.32, rgb(light));
  gradient.addColorStop(0.62, rgb(mid));
  gradient.addColorStop(1, rgb(dark));
  return gradient;
}

function outline(g: Ctx, P: Palette, width = 0.012) {
  g.strokeStyle = P.line;
  g.lineWidth = width;
  g.stroke();
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
}

/** A smooth Catmull-Rom curve through `points`, `per` samples between each pair. */
function spline(points: Point[], per = 10, closed = false): Point[] {
  const out: Point[] = [];
  const n = points.length;
  const get = (i: number) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [get(i - 1), get(i), get(i + 1), get(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

function polygon(g: Ctx, pts: Point[]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

/** A tapering tube along `pts` (a trunk, an arm), with a round end; returns its two edges. */
function tube(g: Ctx, pts: Point[], width: (t: number) => number) {
  const left: Point[] = [];
  const right: Point[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const w = width(i / (n - 1)) / 2;
    left.push([pts[i][0] - (ty / len) * w, pts[i][1] + (tx / len) * w]);
    right.push([pts[i][0] + (ty / len) * w, pts[i][1] - (tx / len) * w]);
  }
  const end = pts[n - 1];
  const before = pts[n - 2];
  const angle = Math.atan2(end[1] - before[1], end[0] - before[0]);
  g.beginPath();
  left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.arc(end[0], end[1], width(1) / 2, angle + Math.PI / 2, angle - Math.PI / 2, true);
  for (let i = n - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  return { left, right };
}

function strokeLine(g: Ctx, pts: Point[]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}

function dot(g: Ctx, x: number, y: number, r: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

/** A cut jewel: colour, a darker rim and a glint. */
function jewel(g: Ctx, x: number, y: number, r: number, colour: RGB, P: Palette) {
  dot(g, x, y, r * 1.35, rgb(P.gold[2]));
  dot(g, x, y, r, rgb(colour));
  dot(g, x - r * 0.35, y - r * 0.35, r * 0.35, "rgba(255, 255, 255, 0.7)");
}

/** A row of gold beads along a cubic curve. */
function beads(g: Ctx, a: Point, b: Point, c: Point, d: Point, count: number, r: number, P: Palette) {
  for (let i = 0; i <= count; i++) {
    const [x, y] = cubic(a, b, c, d, i / count);
    dot(g, x, y + r * 0.2, r, rgb(P.gold[2]));
    dot(g, x, y, r, rgb(P.gold[1]));
    dot(g, x - r * 0.3, y - r * 0.3, r * 0.45, rgb(P.gold[0]));
  }
}

/** A gold band around a limb at (x, y), across the limb's direction `angle`. */
function band(g: Ctx, x: number, y: number, angle: number, length: number, thick: number, P: Palette, stone = true) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = goldAcross(g, -length / 2, length / 2, P.gold);
  g.beginPath();
  g.roundRect(-length / 2, -thick / 2, length, thick, thick / 2);
  g.fill();
  outline(g, P, 0.006);
  if (stone) jewel(g, 0, 0, thick * 0.32, P.jewels[0], P);
  g.restore();
}

// ─── The figure, back to front ────────────────────────────────────────────────

/** An ukadiche modak standing on (x, y): a steamed rice dumpling, pleated to a point. */
export function drawModak(g: Ctx, x: number, y: number, s: number, tone: Tone = PAINT.modak) {
  g.beginPath();
  g.moveTo(x, y - s * 1.08);
  g.bezierCurveTo(x + s * 0.1, y - s * 0.78, x + s * 0.64, y - s * 0.56, x + s * 0.52, y - s * 0.16);
  g.quadraticCurveTo(x + s * 0.42, y, x, y);
  g.quadraticCurveTo(x - s * 0.42, y, x - s * 0.52, y - s * 0.16);
  g.bezierCurveTo(x - s * 0.64, y - s * 0.56, x - s * 0.1, y - s * 0.78, x, y - s * 1.08);
  g.closePath();
  g.fillStyle = radial(g, x - s * 0.1, y - s * 0.45, s * 0.7, tone);
  g.fill();
  g.strokeStyle = rgb(tone[2], 0.8);
  g.lineWidth = s * 0.03;
  g.stroke();
  // The pleats, gathered at the top.
  g.lineWidth = s * 0.025;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(x, y - s * 1.0);
    g.quadraticCurveTo(x + i * s * 0.2, y - s * 0.55, x + i * s * 0.17, y - s * 0.06);
    g.stroke();
  }
}

function backArms(g: Ctx, P: Palette) {
  for (const s of [-1, 1]) {
    const upper = spline([[s * 0.42, -1.02], [s * 0.7, -0.94], [s * 0.96, -0.84]], 6);
    tube(g, upper, (t) => lerp(0.19, 0.15, t));
    g.fillStyle = radial(g, s * 0.7, -0.96, 0.38, P.skin);
    g.fill();
    outline(g, P);
    const fore = spline([[s * 0.96, -0.84], [s * 1.04, -0.98], [s * 1.07, -1.12]], 6);
    tube(g, fore, (t) => lerp(0.15, 0.12, t));
    g.fillStyle = radial(g, s * 1.0, -1.0, 0.25, P.skin);
    g.fill();
    outline(g, P);
    band(g, s * 0.74, -0.93, Math.atan2(0.1, s * 0.26) + Math.PI / 2, 0.2, 0.05, P, false);
    band(g, s * 1.055, -1.06, 0.2 * s, 0.15, 0.045, P, false);
    if (s < 0) {
      // His right hand holds the parashu, the axe.
      g.strokeStyle = rgb(P.gold[2]);
      g.lineWidth = 0.04;
      strokeLine(g, [[-1.07, -0.9], [-1.07, -1.66]]);
      g.strokeStyle = rgb(P.gold[1]);
      g.lineWidth = 0.022;
      strokeLine(g, [[-1.075, -0.92], [-1.075, -1.64]]);
      g.beginPath();
      g.moveTo(-1.07, -1.42);
      g.quadraticCurveTo(-1.32, -1.42, -1.31, -1.56);
      g.quadraticCurveTo(-1.26, -1.68, -1.07, -1.64);
      g.closePath();
      g.fillStyle = goldAcross(g, -1.32, -1.07, P.gold);
      g.fill();
      outline(g, P, 0.008);
      dot(g, -1.12, -1.53, 0.022, rgb(P.jewels[0]));
    } else {
      // His left, a lotus.
      g.strokeStyle = rgb(P.border);
      g.lineWidth = 0.022;
      g.beginPath();
      g.moveTo(1.07, -1.12);
      g.quadraticCurveTo(1.12, -1.28, 1.11, -1.42);
      g.stroke();
      for (let i = -2; i <= 2; i++) {
        g.save();
        g.translate(1.11, -1.42);
        g.rotate(i * 0.42);
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(-0.06, -0.04, -0.04, -0.14, 0, -0.17);
        g.bezierCurveTo(0.04, -0.14, 0.06, -0.04, 0, 0);
        g.fillStyle = radial(g, 0, -0.1, 0.12, P.petal);
        g.fill();
        outline(g, P, 0.006);
        g.restore();
      }
      dot(g, 1.11, -1.44, 0.025, rgb(P.dhoti[1]));
    }
    // The fist, closed round what it holds.
    g.beginPath();
    g.ellipse(s * 1.07, -1.16, 0.065, 0.075, 0, 0, TAU);
    g.fillStyle = radial(g, s * 1.07, -1.17, 0.09, P.skin);
    g.fill();
    outline(g, P);
  }
}

const EAR: Point[] = [
  [0.28, -1.74],
  [0.46, -1.86],
  [0.7, -1.88],
  [0.88, -1.76],
  [0.95, -1.54],
  [0.91, -1.3],
  [0.78, -1.14],
  [0.6, -1.08],
  [0.44, -1.14],
  [0.3, -1.3],
];

function earShape(s: number, scale = 1, cx = 0.58, cy = -1.48): Point[] {
  return spline(EAR, 6, true).map(([x, y]) => [s * (cx + (x - cx) * scale), cy + (y - cy) * scale]);
}

function ears(g: Ctx, P: Palette) {
  for (const s of [-1, 1]) {
    polygon(g, earShape(s));
    g.fillStyle = radial(g, s * 0.6, -1.5, 0.48, P.skin);
    g.fill();
    outline(g, P);
    polygon(g, earShape(s, 0.74, 0.6));
    g.fillStyle = radial(g, s * 0.6, -1.5, 0.34, P.ear);
    g.fill();
    // A gold border worked round the ear, and a jewel at its tip.
    const rim = earShape(s, 0.88, 0.6);
    g.strokeStyle = rgb(P.gold[1]);
    g.lineWidth = 0.026;
    polygon(g, rim);
    g.stroke();
    rim.forEach(([x, y], i) => i % 3 === 0 && dot(g, x, y, 0.012, rgb(P.gold[0])));
    jewel(g, s * 0.9, -1.46, 0.02, P.jewels[1], P);
  }
}

function seat(g: Ctx, P: Palette) {
  g.fillStyle = radial(g, 0, -0.14, 1.0, P.seat);
  g.beginPath();
  g.roundRect(-0.9, -0.2, 1.8, 0.24, 0.03);
  g.fill();
  outline(g, P);
  // Gold bands top and bottom, and a row of lotus petals hanging from the top one.
  for (const [y, h] of [[-0.25, 0.07], [0.0, 0.05]] as const) {
    g.fillStyle = goldAcross(g, -0.95, 0.95, P.gold);
    g.beginPath();
    g.roundRect(-0.96, y, 1.92, h, 0.02);
    g.fill();
    outline(g, P, 0.006);
  }
  for (let i = 0; i < 13; i++) {
    const x = lerp(-0.8, 0.8, i / 12);
    g.beginPath();
    g.moveTo(x - 0.065, -0.18);
    g.bezierCurveTo(x - 0.06, -0.1, x - 0.02, -0.04, x, -0.02);
    g.bezierCurveTo(x + 0.02, -0.04, x + 0.06, -0.1, x + 0.065, -0.18);
    g.closePath();
    g.fillStyle = radial(g, x, -0.12, 0.09, P.petal);
    g.fill();
    outline(g, P, 0.005);
  }
  for (let i = 0; i < 9; i++) jewel(g, lerp(-0.84, 0.84, i / 8), -0.215, 0.014, P.jewels[i % 2], P);
}

function legs(g: Ctx, P: Palette) {
  g.beginPath();
  g.moveTo(-0.92, -0.22);
  g.bezierCurveTo(-1.02, -0.42, -0.92, -0.64, -0.64, -0.66);
  g.lineTo(0.64, -0.66);
  g.bezierCurveTo(0.92, -0.64, 1.02, -0.42, 0.92, -0.22);
  g.bezierCurveTo(0.5, -0.17, -0.5, -0.17, -0.92, -0.22);
  g.closePath();
  const silk = g.createLinearGradient(0, -0.66, 0, -0.2);
  silk.addColorStop(0, rgb(P.dhoti[0]));
  silk.addColorStop(0.5, rgb(P.dhoti[1]));
  silk.addColorStop(1, rgb(P.dhoti[2]));
  g.fillStyle = silk;
  g.fill();
  outline(g, P);
  // Knees, and the folds of the pitambar.
  for (const s of [-1, 1]) {
    g.fillStyle = rgb(P.dhoti[0], 0.45);
    g.beginPath();
    g.ellipse(s * 0.72, -0.47, 0.16, 0.1, 0, 0, TAU);
    g.fill();
  }
  g.strokeStyle = rgb(P.dhoti[2], 0.7);
  g.lineWidth = 0.012;
  for (const [a, b, c] of [
    [[-0.84, -0.52], [-0.64, -0.36], [-0.4, -0.28]],
    [[-0.62, -0.6], [-0.44, -0.46], [-0.2, -0.4]],
    [[0.84, -0.52], [0.66, -0.34], [0.44, -0.28]],
    [[0.6, -0.6], [0.5, -0.48], [0.34, -0.44]],
  ] as Point[][]) {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(b[0], b[1], c[0], c[1]);
    g.stroke();
  }
  // The green and gold border of the silk.
  g.strokeStyle = rgb(P.border);
  g.lineWidth = 0.045;
  g.beginPath();
  g.moveTo(-0.9, -0.24);
  g.bezierCurveTo(-0.5, -0.19, 0.5, -0.19, 0.9, -0.24);
  g.stroke();
  g.strokeStyle = rgb(P.gold[1]);
  g.lineWidth = 0.012;
  g.beginPath();
  g.moveTo(-0.9, -0.275);
  g.bezierCurveTo(-0.5, -0.225, 0.5, -0.225, 0.9, -0.275);
  g.stroke();

}

function torso(g: Ctx, P: Palette) {
  g.beginPath();
  g.moveTo(-0.2, -1.18);
  g.bezierCurveTo(-0.36, -1.15, -0.52, -1.12, -0.56, -0.98);
  g.bezierCurveTo(-0.62, -0.84, -0.6, -0.72, -0.52, -0.62);
  g.lineTo(0.52, -0.62);
  g.bezierCurveTo(0.6, -0.72, 0.62, -0.84, 0.56, -0.98);
  g.bezierCurveTo(0.52, -1.12, 0.36, -1.15, 0.2, -1.18);
  g.closePath();
  g.fillStyle = radial(g, -0.05, -0.95, 0.66, P.skin);
  g.fill();
  outline(g, P);
  // The belly, round and full of modaks.
  g.beginPath();
  g.ellipse(0, -0.64, 0.48, 0.38, 0, 0, TAU);
  g.fillStyle = radial(g, -0.08, -0.7, 0.54, P.skin);
  g.fill();
  outline(g, P);
  g.strokeStyle = rgb(P.skin[2], 0.7);
  g.lineWidth = 0.014;
  g.beginPath();
  g.arc(0, -0.62, 0.03, 0.2, Math.PI - 0.2);
  g.stroke();
}

function ornaments(g: Ctx, P: Palette) {
  // Vasuki the snake, tied round his belly for a belt, his hood at the front.
  g.strokeStyle = rgb(P.border);
  g.lineWidth = 0.05;
  g.beginPath();
  g.ellipse(0, -0.52, 0.47, 0.17, 0, 0.08 * Math.PI, 0.92 * Math.PI);
  g.stroke();
  for (let i = 1; i < 16; i++) {
    const a = lerp(0.1, 0.9, i / 16) * Math.PI;
    dot(g, Math.cos(a) * 0.47, -0.52 + Math.sin(a) * 0.17, 0.01, rgb(P.gold[0]));
  }
  g.beginPath();
  g.moveTo(0, -0.3);
  g.bezierCurveTo(-0.08, -0.32, -0.08, -0.44, 0, -0.46);
  g.bezierCurveTo(0.08, -0.44, 0.08, -0.32, 0, -0.3);
  g.fillStyle = rgb(P.border);
  g.fill();
  outline(g, P, 0.006);
  dot(g, 0, -0.39, 0.018, rgb(P.gold[0]));
  // Two strands of gold, the long one with a pendant.
  beads(g, [-0.36, -1.07], [-0.3, -0.84], [0.3, -0.84], [0.36, -1.07], 22, 0.02, P);
  beads(g, [-0.47, -1.0], [-0.46, -0.56], [0.46, -0.56], [0.47, -1.0], 30, 0.022, P);
  g.beginPath();
  g.moveTo(0, -0.7);
  g.bezierCurveTo(-0.07, -0.66, -0.05, -0.58, 0, -0.55);
  g.bezierCurveTo(0.05, -0.58, 0.07, -0.66, 0, -0.7);
  g.fillStyle = goldAcross(g, -0.07, 0.07, P.gold);
  g.fill();
  jewel(g, 0, -0.61, 0.026, P.jewels[0], P);
  // The sacred thread, over his left shoulder.
  g.strokeStyle = rgb(P.ivory[1], 0.75);
  g.lineWidth = 0.008;
  g.beginPath();
  g.moveTo(0.46, -1.04);
  g.bezierCurveTo(0.32, -0.7, -0.1, -0.42, -0.38, -0.3);
  g.stroke();
}

function feet(g: Ctx, P: Palette) {
  // His left foot folded in, sole up and reddened; the toes of his right just showing.
  g.save();
  g.translate(0.1, -0.29);
  g.rotate(-0.12);
  g.beginPath();
  g.ellipse(0, 0, 0.15, 0.07, 0, 0, TAU);
  g.fillStyle = radial(g, 0, -0.02, 0.16, P.skin);
  g.fill();
  outline(g, P);
  g.fillStyle = rgb(P.sole, 0.55);
  g.beginPath();
  g.ellipse(-0.01, 0.005, 0.11, 0.045, 0, 0, TAU);
  g.fill();
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(0.14 + i * 0.004, -0.045 + i * 0.022, 0.022 - i * 0.002, 0, TAU);
    g.fillStyle = radial(g, 0.14, -0.02, 0.05, P.skin);
    g.fill();
    outline(g, P, 0.005);
  }
  band(g, -0.15, 0.0, Math.PI / 2, 0.13, 0.04, P, false);
  g.restore();
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(-0.66 - i * 0.035, -0.26 + i * 0.006, 0.024 - i * 0.002, 0, TAU);
    g.fillStyle = radial(g, -0.7, -0.27, 0.06, P.skin);
    g.fill();
    outline(g, P, 0.005);
  }
}

function frontArms(g: Ctx, P: Palette) {
  for (const s of [-1, 1]) {
    const upper = spline([[s * 0.48, -1.0], [s * 0.67, -0.8], [s * 0.76, -0.6]], 6);
    tube(g, upper, (t) => lerp(0.21, 0.16, t));
    g.fillStyle = radial(g, s * 0.64, -0.84, 0.36, P.skin);
    g.fill();
    outline(g, P);
    band(g, s * 0.66, -0.82, Math.atan2(0.4, s * 0.28) + Math.PI / 2, 0.21, 0.055, P);
  }
  // His right forearm raised in abhaya: do not be afraid.
  tube(g, spline([[-0.76, -0.6], [-0.72, -0.74], [-0.65, -0.86]], 6), (t) => lerp(0.16, 0.12, t));
  g.fillStyle = radial(g, -0.72, -0.72, 0.24, P.skin);
  g.fill();
  outline(g, P);
  for (let i = 0; i < 4; i++) {
    const x = -0.69 + i * 0.034;
    const top = -1.13 + Math.abs(i - 1.3) * 0.02;
    g.beginPath();
    g.roundRect(x - 0.017, top, 0.034, 0.15, 0.017);
    g.fillStyle = radial(g, x, top + 0.03, 0.08, P.skin);
    g.fill();
    outline(g, P, 0.005);
  }
  g.beginPath();
  g.ellipse(-0.638, -0.935, 0.085, 0.085, 0, 0, TAU);
  g.fillStyle = radial(g, -0.64, -0.95, 0.11, P.skin);
  g.fill();
  outline(g, P);
  g.save();
  g.translate(-0.56, -0.93);
  g.rotate(-0.8);
  g.beginPath();
  g.roundRect(-0.015, -0.07, 0.032, 0.09, 0.016);
  g.fillStyle = radial(g, 0, -0.04, 0.07, P.skin);
  g.fill();
  outline(g, P, 0.005);
  g.restore();
  dot(g, -0.635, -0.93, 0.024, rgb(P.sole, 0.8));
  band(g, -0.66, -0.85, 0.3, 0.14, 0.035, P, false);
  band(g, -0.672, -0.815, 0.3, 0.15, 0.03, P, false);

  // His left hand, low, with a modak on the palm.
  tube(g, spline([[0.76, -0.6], [0.68, -0.5], [0.56, -0.46]], 6), (t) => lerp(0.16, 0.13, t));
  g.fillStyle = radial(g, 0.7, -0.56, 0.24, P.skin);
  g.fill();
  outline(g, P);
  band(g, 0.6, -0.47, 1.75, 0.14, 0.035, P, false);
  g.beginPath();
  g.ellipse(0.5, -0.44, 0.1, 0.058, 0, 0, TAU);
  g.fillStyle = radial(g, 0.48, -0.46, 0.12, P.skin);
  g.fill();
  outline(g, P);
  drawModak(g, 0.49, -0.47, 0.17, P.modak);
  // Fingers curled up round it.
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.ellipse(0.42 + i * 0.045, -0.42, 0.022, 0.03, 0, 0, TAU);
    g.fillStyle = radial(g, 0.44 + i * 0.045, -0.43, 0.05, P.skin);
    g.fill();
    outline(g, P, 0.005);
  }
}

function almond(g: Ctx, s: number) {
  const x = s * EYE.x;
  const y = EYE.y;
  g.beginPath();
  g.moveTo(x - s * 0.068, y + 0.006);
  g.quadraticCurveTo(x - s * 0.004, y - 0.064, x + s * 0.084, y - 0.016);
  g.quadraticCurveTo(x + s * 0.012, y + 0.042, x - s * 0.068, y + 0.006);
  g.closePath();
}

const TRUNK = spline(
  [
    [0, -1.6],
    [0, -1.38],
    [-0.03, -1.14],
    [-0.02, -0.96],
    [0.07, -0.84],
    [0.21, -0.8],
    [0.33, -0.86],
    [0.38, -0.95],
    [0.35, -1.03],
  ],
  8,
);

function head(g: Ctx, P: Palette) {
  g.beginPath();
  g.moveTo(-0.12, -1.2);
  g.bezierCurveTo(-0.27, -1.18, -0.37, -1.3, -0.38, -1.46);
  g.bezierCurveTo(-0.39, -1.68, -0.25, -1.87, 0, -1.88);
  g.bezierCurveTo(0.25, -1.87, 0.39, -1.68, 0.38, -1.46);
  g.bezierCurveTo(0.37, -1.3, 0.27, -1.18, 0.12, -1.2);
  g.closePath();
  g.fillStyle = radial(g, -0.06, -1.62, 0.5, P.skin);
  g.fill();
  outline(g, P);
  // The two rounded lobes of the brow, and full cheeks.
  for (const s of [-1, 1]) {
    g.fillStyle = rgb(P.skin[0], 0.35);
    g.beginPath();
    g.ellipse(s * 0.13, -1.72, 0.12, 0.08, 0, 0, TAU);
    g.fill();
    g.fillStyle = rgb(P.skin[0], 0.22);
    g.beginPath();
    g.ellipse(s * 0.24, -1.33, 0.1, 0.08, 0, 0, TAU);
    g.fill();
  }
  // Eyes (the whites only; the pupils come last) and brows.
  for (const s of [-1, 1]) {
    almond(g, s);
    g.fillStyle = rgb(P.sclera);
    g.fill();
    outline(g, P, 0.008);
    g.strokeStyle = P.brow;
    g.lineWidth = 0.014;
    g.beginPath();
    g.moveTo(s * (EYE.x - 0.07), EYE.y - 0.07);
    g.quadraticCurveTo(s * (EYE.x + 0.01), EYE.y - 0.13, s * (EYE.x + 0.1), EYE.y - 0.07);
    g.stroke();
  }
  // Bhalachandra: the crescent moon on his brow, and a red tilak under it.
  g.beginPath();
  g.arc(0, -1.8, 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
  g.arc(0, -1.83, 0.058, 0.8 * Math.PI, 0.2 * Math.PI, true);
  g.closePath();
  g.fillStyle = goldAcross(g, -0.07, 0.07, P.gold);
  g.fill();
  g.beginPath();
  g.ellipse(0, -1.67, 0.022, 0.055, 0, 0, TAU);
  g.fillStyle = rgb(P.lip);
  g.fill();
  g.strokeStyle = rgb(P.gold[1]);
  g.lineWidth = 0.008;
  g.stroke();

  // Tusks: the whole one on his left, and the one he broke off on his right.
  const ivory = (pts: number[]) => {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    g.bezierCurveTo(pts[8], pts[9], pts[10], pts[11], pts[12], pts[13]);
    g.closePath();
    g.fillStyle = radial(g, pts[6] - 0.04, pts[7] - 0.06, 0.16, P.ivory);
    g.fill();
    outline(g, P, 0.008);
  };
  ivory([0.08, -1.22, 0.2, -1.2, 0.27, -1.12, 0.29, -1.0, 0.24, -1.08, 0.17, -1.13, 0.08, -1.15]);
  ivory([-0.08, -1.22, -0.14, -1.21, -0.18, -1.18, -0.19, -1.13, -0.15, -1.14, -0.12, -1.15, -0.08, -1.15]);
  // His mouth, under the trunk.
  g.beginPath();
  g.moveTo(-0.2, -1.12);
  g.quadraticCurveTo(-0.14, -1.05, -0.06, -1.1);
  g.quadraticCurveTo(-0.13, -1.1, -0.2, -1.12);
  g.fillStyle = rgb(P.lip);
  g.fill();

  // The trunk, curling to his left.
  const { left, right } = tube(g, TRUNK, (t) => (t < 0.18 ? lerp(0.19, 0.22, t / 0.18) : lerp(0.22, 0.07, Math.pow((t - 0.18) / 0.82, 0.9))));
  g.fillStyle = radial(g, -0.06, -1.25, 0.55, P.skin);
  g.fill();
  g.strokeStyle = P.line;
  g.lineWidth = 0.012;
  const from = Math.floor(TRUNK.length * 0.2);
  strokeLine(g, left.slice(from));
  strokeLine(g, right.slice(from));
  const end = TRUNK[TRUNK.length - 1];
  g.beginPath();
  g.arc(end[0], end[1], 0.035, 0, TAU);
  g.stroke();
  // The rings of an elephant's trunk.
  g.strokeStyle = rgb(P.skin[2], 0.5);
  g.lineWidth = 0.008;
  for (let i = Math.floor(TRUNK.length * 0.3); i < TRUNK.length - 3; i += 3) {
    const [lx, ly] = left[i];
    const [rx, ry] = right[i];
    const [ax, ay] = TRUNK[i - 1];
    const [bx, by] = TRUNK[i + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    g.beginPath();
    g.moveTo(lx, ly);
    g.quadraticCurveTo((lx + rx) / 2 + ((bx - ax) / len) * 0.02, (ly + ry) / 2 + ((by - ay) / len) * 0.02, rx, ry);
    g.stroke();
  }
  g.fillStyle = rgb(P.ear[2], 0.8);
  g.beginPath();
  g.ellipse(end[0] + 0.005, end[1] - 0.005, 0.018, 0.012, 0.6, 0, TAU);
  g.fill();
}

function mukut(g: Ctx, P: Palette) {
  const tiers: [number, number, number, number][] = [
    // bottom y, top y, bottom half-width, top half-width
    [-1.84, -2.04, 0.33, 0.27],
    [-2.04, -2.2, 0.26, 0.2],
    [-2.2, -2.34, 0.19, 0.11],
  ];
  for (const [y0, y1, w0, w1] of tiers) {
    g.beginPath();
    g.moveTo(-w0, y0);
    g.lineTo(-w1, y1);
    g.lineTo(w1, y1);
    g.lineTo(w0, y0);
    g.closePath();
    g.fillStyle = goldAcross(g, -w0, w0, P.gold);
    g.fill();
    outline(g, P, 0.008);
    // A beaded rim and stones round each tier.
    const count = Math.round(w0 * 22);
    for (let i = 0; i <= count; i++) dot(g, lerp(-w1, w1, i / count), y1 + 0.012, 0.009, rgb(P.gold[0]));
    const stones = Math.max(3, Math.round(w0 * 12));
    for (let i = 0; i < stones; i++) jewel(g, lerp(-w0 * 0.72, w0 * 0.72, i / (stones - 1)), (y0 + y1) / 2, 0.016, P.jewels[i % 2], P);
  }
  // The band on his brow.
  g.beginPath();
  g.moveTo(-0.36, -1.74);
  g.quadraticCurveTo(0, -1.8, 0.36, -1.74);
  g.lineTo(0.34, -1.86);
  g.lineTo(-0.34, -1.86);
  g.closePath();
  g.fillStyle = goldAcross(g, -0.36, 0.36, P.gold);
  g.fill();
  outline(g, P, 0.008);
  for (let i = 0; i < 7; i++) jewel(g, lerp(-0.27, 0.27, i / 6), -1.8, i === 3 ? 0.026 : 0.016, P.jewels[i === 3 ? 1 : 0], P);
  // A pointed arch at the front, and the kalash on top.
  g.beginPath();
  g.moveTo(-0.13, -1.86);
  g.bezierCurveTo(-0.13, -1.98, -0.04, -2.04, 0, -2.13);
  g.bezierCurveTo(0.04, -2.04, 0.13, -1.98, 0.13, -1.86);
  g.closePath();
  g.fillStyle = goldAcross(g, -0.13, 0.13, P.gold);
  g.fill();
  outline(g, P, 0.008);
  jewel(g, 0, -1.95, 0.03, P.jewels[0], P);
  g.beginPath();
  g.ellipse(0, -2.39, 0.06, 0.055, 0, 0, TAU);
  g.fillStyle = goldAcross(g, -0.06, 0.06, P.gold);
  g.fill();
  outline(g, P, 0.008);
  g.beginPath();
  g.moveTo(-0.025, -2.43);
  g.quadraticCurveTo(0, -2.5, 0, -2.56);
  g.quadraticCurveTo(0, -2.5, 0.025, -2.43);
  g.closePath();
  g.fill();
}

/** Mushak, his mouse, sitting at his feet with a modak of his own. */
export function drawMushak(g: Ctx, x: number, y: number, s: number, P: Palette = PAINT) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = rgb(P.mouse[2]);
  g.lineWidth = 0.014;
  g.beginPath();
  g.moveTo(0.13, -0.05);
  g.bezierCurveTo(0.26, -0.02, 0.28, -0.16, 0.2, -0.2);
  g.stroke();
  g.beginPath();
  g.ellipse(0.02, -0.09, 0.14, 0.095, -0.15, 0, TAU);
  g.fillStyle = radial(g, 0.0, -0.12, 0.17, P.mouse);
  g.fill();
  outline(g, P, 0.008);
  g.beginPath();
  g.moveTo(-0.06, -0.19);
  g.bezierCurveTo(-0.18, -0.2, -0.2, -0.14, -0.24, -0.12);
  g.bezierCurveTo(-0.2, -0.09, -0.12, -0.06, -0.05, -0.08);
  g.closePath();
  g.fillStyle = radial(g, -0.1, -0.16, 0.14, P.mouse);
  g.fill();
  outline(g, P, 0.008);
  dot(g, -0.245, -0.12, 0.012, rgb(P.ear[2]));
  g.beginPath();
  g.arc(-0.06, -0.2, 0.04, 0, TAU);
  g.fillStyle = rgb(P.mouse[1]);
  g.fill();
  outline(g, P, 0.006);
  dot(g, -0.06, -0.2, 0.024, rgb(P.ear[1]));
  dot(g, -0.15, -0.15, 0.011, "rgba(10, 6, 6, 0.95)");
  dot(g, -0.154, -0.154, 0.004, "rgba(255, 255, 255, 0.9)");
  drawModak(g, -0.2, -0.01, 0.08, P.modak);
  g.restore();
}

/** The whole murti, in clay or in paint (eyes left blank). */
export function paintMurti(g: Ctx, finish: Finish) {
  const P = finish === "paint" ? PAINT : CLAY;
  g.lineJoin = "round";
  g.lineCap = "round";
  backArms(g, P);
  ears(g, P);
  seat(g, P);
  legs(g, P);
  torso(g, P);
  ornaments(g, P);
  feet(g, P);
  frontArms(g, P);
  head(g, P);
  mukut(g, P);
  drawMushak(g, 0.72, 0.02, 1, P);
  if (finish === "clay") {
    // The grain of clay, still a little damp.
    const random = mulberry32(31);
    g.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = random() < 0.5 ? "rgba(70, 60, 50, 0.12)" : "rgba(255, 250, 240, 0.1)";
      const r = 0.004 + random() * 0.01;
      g.fillRect(BOX.x + random() * BOX.w, BOX.y + random() * BOX.h, r, r);
    }
    g.globalCompositeOperation = "source-over";
  }
}

// ─── Painted live, over the cached figure ────────────────────────────────────

/** The eyes, painted last: kohl, then the pupils. `amount` 0..1. */
export function paintEyes(g: Ctx, amount: number) {
  if (amount <= 0.01) return;
  g.save();
  g.globalAlpha = clamp(amount);
  for (const s of [-1, 1]) {
    const x = s * EYE.x;
    g.save();
    almond(g, s);
    g.clip();
    dot(g, x - s * 0.006, EYE.y - 0.008, 0.032, "#3a1a0c");
    dot(g, x - s * 0.006, EYE.y - 0.008, 0.02, "#0c0604");
    dot(g, x - s * 0.014, EYE.y - 0.02, 0.008, "rgba(255, 255, 255, 0.95)");
    g.restore();
    almond(g, s);
    g.strokeStyle = "#140806";
    g.lineWidth = 0.014;
    g.stroke();
    g.beginPath();
    g.moveTo(x + s * 0.08, EYE.y - 0.016);
    g.quadraticCurveTo(x + s * 0.1, EYE.y - 0.022, x + s * 0.12, EYE.y - 0.04);
    g.stroke();
  }
  g.restore();
}

/** The cloth over him for the road home: `amount` is how far down it has fallen. */
export function paintVeil(g: Ctx, amount: number, seconds: number) {
  if (amount <= 0.005) return;
  const bottom = lerp(-2.58, -0.66, amount);
  const edge = (x: number) => bottom + 0.035 * Math.sin(x * 9 + seconds * 1.4) + 0.02 * Math.sin(x * 23);
  g.save();
  g.beginPath();
  g.moveTo(-1.2, -2.8);
  for (let x = -1.2; x <= 1.2001; x += 0.05) g.lineTo(x, edge(x));
  g.lineTo(1.2, -2.8);
  g.closePath();
  g.clip();
  g.beginPath();
  g.moveTo(0, -2.62);
  g.bezierCurveTo(-0.5, -2.6, -1.04, -2.12, -1.04, -1.5);
  g.lineTo(-1.02, -0.6);
  g.lineTo(1.02, -0.6);
  g.lineTo(1.04, -1.5);
  g.bezierCurveTo(1.04, -2.12, 0.5, -2.6, 0, -2.62);
  g.closePath();
  const folds = g.createLinearGradient(-1.04, 0, 1.04, 0);
  for (let i = 0; i <= 10; i++) folds.addColorStop(i / 10, i % 2 ? "rgba(200, 44, 26, 0.88)" : "rgba(236, 92, 30, 0.9)");
  g.fillStyle = folds;
  g.fill();
  g.strokeStyle = "rgba(120, 20, 10, 0.4)";
  g.lineWidth = 0.012;
  g.stroke();
  // Little gold flowers woven into the cloth.
  for (let i = 0; i < 40; i++) {
    const x = -0.9 + ((i * 0.37) % 1.8);
    const y = -2.3 + Math.floor(i / 5) * 0.22 + (i % 2) * 0.08;
    if (y < bottom - 0.05 && Math.abs(x) < 0.4 + (y + 2.6) * 0.6) dot(g, x, y, 0.014, "rgba(255, 210, 90, 0.8)");
  }
  g.restore();
  // The gold border along its hem, and tassels.
  g.strokeStyle = "#e8b440";
  g.lineWidth = 0.05;
  g.beginPath();
  const half = Math.min(1.03, 0.2 + (bottom + 2.62) * 0.9);
  for (let x = -half; x <= half + 0.001; x += 0.05) {
    if (x === -half) g.moveTo(x, edge(x) - 0.02);
    else g.lineTo(x, edge(x) - 0.02);
  }
  g.stroke();
  for (let x = -half + 0.05; x < half; x += 0.12) dot(g, x, edge(x) + 0.03, 0.018, "#f2c653");
}

/** A red jaswand (hibiscus) flower. */
export function drawHibiscus(g: Ctx, x: number, y: number, r: number, turn = 0) {
  for (let i = 0; i < 5; i++) {
    const a = turn + (i / 5) * TAU;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.58, r * 0.46, a, 0, TAU);
    g.fillStyle = i % 2 ? "#c8122a" : "#dc2234";
    g.fill();
  }
  dot(g, x, y, r * 0.28, "#7a0614");
  g.strokeStyle = "#f6cf4a";
  g.lineWidth = r * 0.14;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.cos(turn + 0.6) * r * 0.9, y + Math.sin(turn + 0.6) * r * 0.9);
  g.stroke();
}

/** A few blades of durva grass, tied in a bunch. */
export function drawDurva(g: Ctx, x: number, y: number, size: number, turn = 0) {
  g.strokeStyle = "#3f9a3a";
  g.lineWidth = size * 0.06;
  for (let i = -3; i <= 3; i++) {
    const a = turn - Math.PI / 2 + i * 0.16;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * size * 0.5, y + Math.sin(a) * size * 0.5, x + Math.cos(a + i * 0.05) * size, y + Math.sin(a + i * 0.05) * size);
    g.stroke();
  }
}

/** Offerings on him once he is home: a garland of jaswand and durva, durva at his feet. */
export function paintOfferings(g: Ctx, amount: number) {
  if (amount <= 0.01) return;
  g.save();
  g.globalAlpha = clamp(amount);
  const a: Point = [-0.5, -1.04];
  const b: Point = [-0.52, -0.3];
  const c: Point = [0.52, -0.3];
  const d: Point = [0.5, -1.04];
  g.strokeStyle = "#3f8a32";
  g.lineWidth = 0.016;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]);
  g.stroke();
  for (let i = 0; i <= 14; i++) {
    const [x, y] = cubic(a, b, c, d, i / 14);
    if (i % 2) drawDurva(g, x, y + 0.02, 0.09, Math.PI);
    else drawHibiscus(g, x, y, 0.05, i * 0.7);
  }
  drawDurva(g, -0.3, -0.2, 0.2, -0.3);
  drawDurva(g, -0.18, -0.2, 0.18, 0.2);
  drawHibiscus(g, 0.36, -0.22, 0.06, 1);
  drawHibiscus(g, -0.46, -0.22, 0.05, 2);
  drawDurva(g, 0, -2.36, 0.14, 0);
  g.restore();
}

// ─── The cache ────────────────────────────────────────────────────────────────

export type Layer = Finish | "shadow";

/**
 * The figure drawn once per finish at a resolution close to what the camera needs, and redrawn
 * only when the camera moves enough closer or further away to want another one.
 */
export class Murti {
  private bucket = 0;
  private readonly layers = new Map<Layer, HTMLCanvasElement>();

  private image(layer: Layer, pxPerUnit: number) {
    const bucket = clamp(Math.pow(2, Math.ceil(Math.log2(Math.max(1, pxPerUnit)) * 2) / 2), 32, 2048 / BOX.h);
    if (bucket !== this.bucket) {
      this.layers.clear();
      this.bucket = bucket;
    }
    let canvas = this.layers.get(layer);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = Math.ceil(BOX.w * bucket);
      canvas.height = Math.ceil(BOX.h * bucket);
      const g = canvas.getContext("2d")!;
      if (layer === "shadow") {
        g.drawImage(this.image("paint", pxPerUnit), 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = "#06101f";
        g.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        g.scale(bucket, bucket);
        g.translate(-BOX.x, -BOX.y);
        paintMurti(g, layer);
      }
      this.layers.set(layer, canvas);
    }
    return canvas;
  }

  /** Draws the figure standing on (x, y) at size `s`, in whatever transform `ctx` has. */
  draw(ctx: Ctx, layer: Layer, x: number, y: number, s: number, alpha = 1) {
    if (alpha <= 0.003) return;
    const m = ctx.getTransform();
    const image = this.image(layer, Math.hypot(m.a, m.b) * s);
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, x + BOX.x * s, y + BOX.y * s, BOX.w * s, BOX.h * s);
    ctx.globalAlpha = 1;
  }
}

export { BOX as MURTI_BOX };
