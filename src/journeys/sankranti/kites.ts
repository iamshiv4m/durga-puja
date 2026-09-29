// The patang of Uttarayan: a square of thin paper hung diagonally on a bamboo spine (dhaddho)
// and a bent bow (kamaan), with a little paper tail. Painted once per design into sprites.
// Also the manja between the kite and the hand, and the geometry for two strings crossing.
import { TAU, mulberry32, type Ctx, type RGB } from "../paint";

const SIZE = 128;
const TALL = 164;

/** Bright kite papers. */
const PAPERS: RGB[] = [
  [236, 40, 110],
  [250, 200, 30],
  [248, 120, 24],
  [40, 170, 90],
  [30, 110, 200],
  [220, 30, 40],
  [248, 244, 232],
  [120, 50, 170],
  [24, 24, 30],
  [20, 180, 200],
  [250, 150, 180],
];

type Design = "half" | "top" | "chand" | "band" | "corner" | "eyes" | "plain";
const DESIGNS: Design[] = ["half", "top", "chand", "band", "corner", "eyes", "plain", "half", "chand"];

const css = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

export type KiteSprite = { paper: HTMLCanvasElement; shadow: HTMLCanvasElement; main: RGB };

const sprites: KiteSprite[] = [];

function diamond(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(64, 6);
  g.lineTo(122, 64);
  g.lineTo(64, 122);
  g.lineTo(6, 64);
  g.closePath();
}

function paintKite(g: CanvasRenderingContext2D, design: Design, a: RGB, b: RGB) {
  // The tail: a small triangle of paper at the bottom corner.
  g.fillStyle = css(b);
  g.beginPath();
  g.moveTo(64, 116);
  g.lineTo(46, 156);
  g.lineTo(82, 156);
  g.closePath();
  g.fill();
  g.save();
  diamond(g);
  g.clip();
  g.fillStyle = css(a);
  g.fillRect(0, 0, SIZE, SIZE);
  g.fillStyle = css(b);
  switch (design) {
    case "half":
      g.fillRect(64, 0, 64, SIZE);
      break;
    case "top":
      g.beginPath();
      g.moveTo(0, 64);
      g.quadraticCurveTo(64, 30, 128, 64);
      g.lineTo(128, 0);
      g.lineTo(0, 0);
      g.fill();
      break;
    case "chand":
      g.beginPath();
      g.arc(64, 66, 26, 0, TAU);
      g.fill();
      break;
    case "band":
      g.save();
      g.translate(64, 64);
      g.rotate(Math.PI / 4);
      g.fillRect(-90, -13, 180, 26);
      g.restore();
      break;
    case "corner":
      g.beginPath();
      g.moveTo(64, 6);
      g.lineTo(90, 32);
      g.lineTo(64, 58);
      g.lineTo(38, 32);
      g.closePath();
      g.moveTo(64, 122);
      g.lineTo(84, 102);
      g.lineTo(64, 82);
      g.lineTo(44, 102);
      g.closePath();
      g.fill();
      break;
    case "eyes":
      g.beginPath();
      g.arc(36, 64, 13, 0, TAU);
      g.arc(92, 64, 13, 0, TAU);
      g.fill();
      break;
    default:
      break;
  }
  // A shine across the paper, as if a little light came through it.
  const shine = g.createLinearGradient(0, 0, SIZE, SIZE);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  shine.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  shine.addColorStop(1, "rgba(0, 0, 0, 0.16)");
  g.fillStyle = shine;
  g.fillRect(0, 0, SIZE, SIZE);
  g.restore();
  // The bamboo: the straight spine and the bent bow.
  g.strokeStyle = "rgba(90, 60, 30, 0.85)";
  g.lineWidth = 3.2;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(64, 8);
  g.lineTo(64, 120);
  g.moveTo(8, 66);
  g.quadraticCurveTo(64, 20, 120, 66);
  g.stroke();
  g.strokeStyle = "rgba(0, 0, 0, 0.25)";
  g.lineWidth = 1.5;
  diamond(g);
  g.stroke();
}

/** The kite sprites, made the first time they are asked for. */
export function kiteSprites() {
  if (sprites.length) return sprites;
  const random = mulberry32(1401);
  for (let i = 0; i < 28; i++) {
    const a = PAPERS[Math.floor(random() * PAPERS.length)];
    let b = PAPERS[Math.floor(random() * PAPERS.length)];
    for (let guard = 0; b === a && guard < 8; guard++) b = PAPERS[Math.floor(random() * PAPERS.length)];
    const design = DESIGNS[i % DESIGNS.length];
    const paper = document.createElement("canvas");
    paper.width = SIZE;
    paper.height = TALL;
    paintKite(paper.getContext("2d")!, design, a, b);
    const shadow = document.createElement("canvas");
    shadow.width = SIZE;
    shadow.height = TALL;
    const s = shadow.getContext("2d")!;
    s.drawImage(paper, 0, 0);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = "#140c16";
    s.fillRect(0, 0, SIZE, TALL);
    sprites.push({ paper, shadow, main: a });
  }
  return sprites;
}

/**
 * A kite centred on (x, y), `size` corner to corner, tipped by `angle`. `dark` lays its
 * silhouette over it (against a low sun, or at dusk); `flap` squeezes it as it flutters.
 */
export function drawKite(ctx: Ctx, sprite: KiteSprite, x: number, y: number, size: number, angle: number, dark = 0, alpha = 1, flap = 0) {
  const k = size / SIZE;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(k * (1 - flap * 0.12), k);
  ctx.translate(-64, -64);
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite.paper, 0, 0);
  if (dark > 0.01) {
    ctx.globalAlpha = alpha * Math.min(1, dark);
    ctx.drawImage(sprite.shadow, 0, 0);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export type P = { x: number; y: number };

/**
 * The manja from the hand to the kite: it rises and sags between them, and bows downwind.
 * Writes `n + 1` points into `out` and returns it.
 */
export function stringPoints(a: P, k: P, sag: number, wind: number, n: number, out: P[] = []) {
  const mx = (a.x + k.x) / 2;
  const my = (a.y + k.y) / 2;
  const len = Math.hypot(k.x - a.x, k.y - a.y);
  const cx = mx + wind * len * 0.12;
  const cy = my + sag * len;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const p = out[i] ?? (out[i] = { x: 0, y: 0 });
    p.x = u * u * a.x + 2 * u * t * cx + t * t * k.x;
    p.y = u * u * a.y + 2 * u * t * cy + t * t * k.y;
  }
  out.length = n + 1;
  return out;
}

/** Where segments ab and cd cross, if they do. */
export function crossing(a: P, b: P, c: P, d: P): P | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + r.x * t, y: a.y + r.y * t };
}

/** The first place two polylines cross, and how far along the second one it is (0..1). */
export function linesCross(one: P[], two: P[]): { at: P; along: number } | null {
  for (let j = 0; j < two.length - 1; j++) {
    for (let i = 0; i < one.length - 1; i++) {
      const at = crossing(one[i], one[i + 1], two[j], two[j + 1]);
      if (at) return { at, along: (j + 0.5) / (two.length - 1) };
    }
  }
  return null;
}

/** Strokes a polyline. */
export function strokeLine(ctx: Ctx, points: P[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}
