// The pookalam: from Atham to Thiruvonam, a ring more each morning. Each ring is a pattern of loose
// petals, painted once into an offscreen canvas: a smooth floor of colour under thousands of small
// petals whose colours come from the same pattern, so the design shows through the texture as it
// does in a real one. Rings never overlap, so finished rings are added to (or cleared from) one
// canvas, and only the ring being laid is drawn with a sweep, as hands lay it round the circle.
import { TAU, clamp, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import type { Paint } from "./light";
import { MOMENTS, dayAt } from "./world";

const SIZE = 1400;
const HALF = SIZE / 2;
/** Radius of the whole pookalam in canvas pixels. */
const R = HALF - 10;
/** Where each day's ring ends, as a fraction of the whole radius. */
export const RINGS = [0.13, 0.25, 0.35, 0.445, 0.535, 0.625, 0.715, 0.8, 0.9, 1];
/** How much of a day it takes to lay its ring. */
const LAY = 0.72;

const THUMBA: RGB = [250, 250, 242];
const CHETHI: RGB = [212, 34, 38];
const MARIGOLD: RGB = [246, 138, 22];
const YELLOW: RGB = [250, 198, 30];
const LEAF: RGB = [62, 128, 48];
const DARK_LEAF: RGB = [30, 86, 38];
const BLUE: RGB = [46, 66, 176];
const VIOLET: RGB = [128, 64, 186];
const PINK: RGB = [236, 92, 146];
const HIBISCUS: RGB = [196, 16, 46];

export const FLOWERS: RGB[] = [THUMBA, CHETHI, MARIGOLD, YELLOW, BLUE, VIOLET, PINK, HIBISCUS];

/** Each day's pattern: the colour at `t` across the ring (0 inside, 1 outside) and angle `a`. */
const PATTERNS: ((t: number, a: number) => RGB)[] = [
  // Atham: white thumba alone, round a yellow heart.
  (t) => (t < 0.2 ? YELLOW : THUMBA),
  // A ring of yellow.
  (t) => (t > 0.82 ? MARIGOLD : YELLOW),
  // Red chethi with eight orange petals.
  (t, a) => (t < 1 - Math.pow(Math.abs(Math.sin(a * 4)), 0.6) * 0.95 ? MARIGOLD : CHETHI),
  // Leaves cut small, in a zigzag of dark and light.
  (t, a) => {
    const u = ((a * 16) / TAU) % 1;
    return t < 1 - Math.abs(2 * u - 1) ? DARK_LEAF : LEAF;
  },
  // Blue shankhupushpam and white, in wedges, with a thread of violet.
  (t, a) => {
    if (Math.abs(t - 0.5) < 0.1) return VIOLET;
    return Math.floor((a * 16) / TAU) % 2 ? BLUE : THUMBA;
  },
  // Marigold, with yellow scallops.
  (t, a) => (t > 0.5 + 0.42 * Math.abs(Math.sin(a * 12)) ? YELLOW : MARIGOLD),
  // Pink, with a row of white dots.
  (t, a) => {
    const u = ((a * 30) / TAU) % 1;
    return Math.hypot((u - 0.5) * 1.2, t - 0.5) < 0.28 ? THUMBA : PINK;
  },
  // Red and yellow petals on a ground of leaf.
  (t, a) => {
    const n = (a * 24) / TAU;
    const u = (n % 1) - 0.5;
    if (Math.abs(u) < 0.44 * Math.pow(Math.sin(Math.PI * clamp(t)), 0.7)) return Math.floor(n) % 2 ? HIBISCUS : YELLOW;
    return LEAF;
  },
  // White, with a wave of violet running through it.
  (t, a) => (Math.abs(t - 0.5 - 0.26 * Math.sin(a * 10)) < 0.13 ? VIOLET : THUMBA),
  // Thiruvonam's border: thumba, then marigold dotted with chethi, and a band of leaf outside.
  (t, a) => {
    if (t > 0.8) return DARK_LEAF;
    if (t < 0.34) return THUMBA;
    const u = ((a * 36) / TAU) % 1;
    return Math.hypot((u - 0.5) * 1.4, (t - 0.57) * 2) < 0.28 ? CHETHI : MARIGOLD;
  },
];

function* ringSteps(g: CanvasRenderingContext2D, day: number): Generator<void, void, void> {
  const random = mulberry32(900 + day * 31);
  const r0 = (day === 0 ? 0 : RINGS[day - 1]) * R;
  const r1 = RINGS[day] * R;
  const pattern = PATTERNS[day];
  g.save();
  g.translate(HALF, HALF);
  g.beginPath();
  g.arc(0, 0, r1, 0, TAU);
  if (r0 > 0) g.arc(0, 0, r0, 0, TAU, true);
  g.clip("evenodd");
  // The floor of colour, in small sectors.
  const radial = Math.max(3, Math.round((r1 - r0) / 9));
  const around = Math.max(48, Math.round((TAU * r1) / 9));
  for (let j = 0; j < radial; j++) {
    const a0 = lerp(r0, r1, j / radial);
    const a1 = lerp(r0, r1, (j + 1) / radial);
    for (let i = 0; i < around; i++) {
      const b0 = (i / around) * TAU;
      const b1 = ((i + 1.08) / around) * TAU;
      g.fillStyle = rgb(mix(pattern((j + 0.5) / radial, (b0 + b1) / 2), [90, 60, 40], 0.12));
      g.beginPath();
      g.arc(0, 0, a1 + 0.6, b0, b1);
      g.arc(0, 0, Math.max(0, a0 - 0.6), b1, b0, true);
      g.fill();
    }
    yield;
  }
  // The petals, each a little different, lying every which way.
  const area = Math.PI * (r1 * r1 - r0 * r0);
  const count = Math.round(area / 34);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(lerp(r0 * r0, r1 * r1, random()));
    const a = random() * TAU;
    const t = (r - r0) / Math.max(1, r1 - r0);
    const base = pattern(t, a);
    const shade = random();
    const c = shade < 0.5 ? mix(base, [255, 255, 255], shade * 0.3) : mix(base, [40, 20, 10], (shade - 0.5) * 0.35);
    const size = 3 + random() * 4.5;
    g.fillStyle = rgb(c);
    g.beginPath();
    g.ellipse(Math.cos(a) * r, Math.sin(a) * r, size, size * (0.45 + random() * 0.35), random() * TAU, 0, TAU);
    g.fill();
    if (i % 500 === 499) yield;
  }
  // A thread of white thumba where the ring meets the next.
  if (day < 9) {
    g.fillStyle = rgb(THUMBA);
    const n = Math.round((TAU * r1) / 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + random() * 0.01;
      const r = r1 - 2.5 - random() * 2;
      g.beginPath();
      g.arc(Math.cos(a) * r, Math.sin(a) * r, 1.6 + random() * 1.4, 0, TAU);
      g.fill();
    }
  }
  g.restore();
}

function renderRing(g: CanvasRenderingContext2D, day: number) {
  const steps = ringSteps(g, day);
  let guard = 0;
  while (!steps.next().done && guard++ < 10000);
}

function clearRing(g: CanvasRenderingContext2D, day: number) {
  const r0 = (day === 0 ? 0 : RINGS[day - 1]) * R;
  const r1 = RINGS[day] * R;
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.translate(HALF, HALF);
  g.beginPath();
  g.arc(0, 0, r1 + 1, 0, TAU);
  if (r0 > 0) g.arc(0, 0, Math.max(0, r0 - 0.5), 0, TAU, true);
  g.fill("evenodd");
  g.restore();
}

/** Where the laying of each day stands at `p`: how many rings are done, and how far round the next is. */
export function progress(p: number) {
  let done = 0;
  let laying = -1;
  let sweep = 0;
  for (let i = 0; i < 10; i++) {
    const t = (p - dayAt(i)) / (MOMENTS.days[1] * LAY);
    if (t >= 1) done = i + 1;
    else if (t > 0) {
      laying = i;
      sweep = t;
      break;
    } else break;
  }
  return { done, laying, sweep };
}

type Petal = {
  x: number;
  y: number;
  c: RGB;
  size: number;
  angle: number;
  born: number;
};

type Job = {
  day: number;
  canvas: HTMLCanvasElement;
  steps: Generator<void, void, void> | null;
};

export class Pookalam {
  private done: HTMLCanvasElement | null = null;
  private doneCount = 0;
  /** Rings painted ahead of time, a little each frame, so no frame waits for one. */
  private jobs: Job[] = [];
  private readonly petals: Petal[] = [];

  private doneCanvas() {
    if (!this.done) {
      this.done = document.createElement("canvas");
      this.done.width = this.done.height = SIZE;
    }
    return this.done;
  }

  /** The canvas for a ring, painting it now if it was not painted ahead. */
  private ringCanvas(day: number) {
    let job = this.jobs.find((j) => j.day === day);
    if (!job) job = this.queue(day);
    if (job.steps) {
      let guard = 0;
      while (!job.steps.next().done && guard++ < 10000);
      job.steps = null;
    }
    return job.canvas;
  }

  /** Starts painting a ring into a spare canvas (keeping at most three). */
  private queue(day: number) {
    const found = this.jobs.find((j) => j.day === day);
    if (found) return found;
    let canvas: HTMLCanvasElement;
    if (this.jobs.length >= 3) canvas = this.jobs.shift()!.canvas;
    else {
      canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
    }
    const g = canvas.getContext("2d")!;
    g.clearRect(0, 0, SIZE, SIZE);
    const job: Job = { day, canvas, steps: ringSteps(g, day) };
    this.jobs.push(job);
    return job;
  }

  /** Paints queued rings for up to `budget` milliseconds. */
  private pump(budget: number) {
    const start = performance.now();
    for (const job of this.jobs) {
      let guard = 0;
      while (job.steps && performance.now() - start < budget && guard++ < 1000) {
        if (job.steps.next().done) job.steps = null;
      }
    }
  }

  /** Brings the finished rings up to date, and paints the next ring ahead. */
  private update(done: number, laying: number, p: number) {
    const g = this.doneCanvas().getContext("2d")!;
    let guard = 0;
    while (this.doneCount < done && guard++ < 12) g.drawImage(this.ringCanvas(this.doneCount++), 0, 0);
    while (this.doneCount > done && guard++ < 24) clearRing(g, --this.doneCount);
    const next = laying >= 0 ? laying + 1 : done;
    if (p > MOMENTS.days[0] - 0.03 && next < 10) {
      if (laying >= 0) this.queue(laying);
      this.queue(next);
      this.pump(5);
    }
  }

  /** Adds a handful of flowers where the reader touched, in the pookalam's own units (radius 1). */
  add(x: number, y: number, seconds: number) {
    const random = Math.random;
    const base = FLOWERS[Math.floor(random() * FLOWERS.length)];
    for (let i = 0; i < 22; i++) {
      const a = random() * TAU;
      const d = random() ** 0.7 * 0.11;
      const c = i % 5 === 4 ? THUMBA : mix(base, [255, 255, 255], random() * 0.25);
      this.petals.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        c,
        size: 0.012 + random() * 0.012,
        angle: random() * TAU,
        born: seconds + i * 0.01,
      });
    }
    if (this.petals.length > 700) this.petals.splice(0, this.petals.length - 700);
  }

  /**
   * Draws it lying on the ground at (x, y) with world radius `radius`, squashed by `tilt`; `wilt`
   * browns and scatters it on the last evening.
   */
  draw(
    ctx: Ctx,
    x: number,
    y: number,
    radius: number,
    tilt: number,
    p: number,
    seconds: number,
    paint: Paint,
    wilt: number,
    reduced: boolean,
    dark: number,
  ) {
    const { done, laying, sweep } = progress(p);
    this.update(done, laying, p);
    if (done === 0 && laying < 0) return;
    const doneCanvas = this.doneCanvas();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, tilt);
    const scale = radius / R;
    // The chalk circles of the design, drawn before the first flower.
    ctx.strokeStyle = paint([240, 236, 226], 0.35 * (1 - wilt));
    ctx.lineWidth = radius * 0.004;
    for (const r of RINGS) {
      ctx.beginPath();
      ctx.arc(0, 0, r * radius, 0, TAU);
      ctx.stroke();
    }
    // The flowers, in the light of the hour.
    ctx.globalAlpha = 1 - wilt * 0.35;
    ctx.drawImage(doneCanvas, -HALF * scale, -HALF * scale, SIZE * scale, SIZE * scale);
    if (laying >= 0) {
      const start = -Math.PI / 2 + laying * 0.9;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius * 1.02, start, start + sweep * TAU);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(this.ringCanvas(laying), -HALF * scale, -HALF * scale, SIZE * scale, SIZE * scale);
      ctx.restore();
      // Petals falling at the edge being laid.
      if (!reduced) {
        const a = start + sweep * TAU;
        const r0 = (laying === 0 ? 0 : RINGS[laying - 1]) * radius;
        const r1 = RINGS[laying] * radius;
        const colours = [PATTERNS[laying](0.3, a), PATTERNS[laying](0.7, a + 0.05)];
        for (let i = 0; i < 10; i++) {
          const t = (seconds * 1.4 + i / 10) % 1;
          const rr = lerp(r0, r1, (i * 0.37) % 1);
          const px = Math.cos(a - 0.02 * i) * rr;
          const py = Math.sin(a - 0.02 * i) * rr - (1 - t) * radius * 0.18;
          ctx.fillStyle = rgb(colours[i % 2], 1 - t * 0.3);
          ctx.beginPath();
          ctx.ellipse(px, py, radius * 0.01, radius * 0.006, seconds * 3 + i, 0, TAU);
          ctx.fill();
        }
      }
    }
    // The reader's own flowers.
    for (const petal of this.petals) {
      const age = seconds - petal.born;
      if (age < 0) continue;
      const fall = clamp(age / 0.45);
      const lift = (1 - fall) * 0.12;
      ctx.globalAlpha = (0.3 + 0.7 * fall) * (1 - wilt * 0.5);
      ctx.fillStyle = rgb(mix(petal.c, [110, 70, 40], wilt * 0.5));
      ctx.beginPath();
      ctx.ellipse(
        petal.x * radius,
        (petal.y - lift) * radius,
        petal.size * radius * (1 + lift * 4),
        petal.size * radius * 0.55 * (1 + lift * 4),
        petal.angle + age * (1 - fall) * 5,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Wilting, a brown wash over it all; and the dark of the evening.
    if (wilt > 0.01) {
      ctx.fillStyle = `rgba(90, 60, 30, ${wilt * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
    }
    if (dark > 0.01) {
      ctx.fillStyle = `rgba(10, 10, 30, ${dark * 0.8})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.01, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * The Thrikkakara Appan: pyramids of clay for the Vamana of Thrikkakara, painted red and marked
 * with white rice paste, a spray of thumba on each, set on a wooden plank at the heart of the
 * pookalam on Thiruvonam. `rise` 0..1 sets them down.
 */
export function drawAppan(ctx: Ctx, x: number, y: number, size: number, rise: number, tilt: number, paint: Paint) {
  if (rise <= 0.01) return;
  const drop = (1 - rise) * size * 0.8;
  ctx.save();
  ctx.globalAlpha = clamp(rise * 1.6);
  // The plank.
  ctx.fillStyle = paint([120, 70, 34]);
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.95, size * 0.95 * tilt * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint([150, 94, 50]);
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.04, size * 0.9, size * 0.9 * tilt * 0.5, 0, 0, TAU);
  ctx.fill();
  const one = (cx: number, cy: number, h: number) => {
    const base = h * 0.84;
    const topW = h * 0.2;
    const top = cy - h;
    // Two faces of the pyramid, the lit one and the shaded one.
    ctx.fillStyle = paint([176, 56, 34]);
    ctx.beginPath();
    ctx.moveTo(cx - base / 2, cy);
    ctx.lineTo(cx + base * 0.1, cy + base * 0.08 * tilt);
    ctx.lineTo(cx + topW * 0.2, top);
    ctx.lineTo(cx - topW / 2, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paint([128, 36, 24]);
    ctx.beginPath();
    ctx.moveTo(cx + base * 0.1, cy + base * 0.08 * tilt);
    ctx.lineTo(cx + base / 2, cy - base * 0.04 * tilt);
    ctx.lineTo(cx + topW / 2, top);
    ctx.lineTo(cx + topW * 0.2, top);
    ctx.closePath();
    ctx.fill();
    // The rice-paste marks: bands, dots and chevrons.
    ctx.strokeStyle = paint([248, 244, 232]);
    ctx.fillStyle = paint([248, 244, 232]);
    ctx.lineWidth = h * 0.018;
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const yy = lerp(cy, top, t);
      const w = lerp(base, topW, t);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + h * 0.01, yy);
      ctx.lineTo(cx + w * 0.1, yy + base * 0.05 * tilt * (1 - t));
      ctx.stroke();
      for (let d = 0; d < 3; d++) {
        ctx.beginPath();
        ctx.arc(cx - w * 0.3 + d * w * 0.16, yy - h * 0.07, h * 0.012, 0, TAU);
        ctx.fill();
      }
    }
    // A spray of thumba and a red chethi on top.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.35;
      ctx.fillStyle = paint(THUMBA);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * h * 0.08, top + Math.sin(a) * h * 0.06, h * 0.022, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = paint(CHETHI);
    ctx.beginPath();
    ctx.arc(cx, top - h * 0.05, h * 0.03, 0, TAU);
    ctx.fill();
  };
  one(x - size * 0.5, y - size * 0.1 * tilt - drop, size * 0.62);
  one(x + size * 0.5, y - size * 0.1 * tilt - drop, size * 0.62);
  one(x, y + size * 0.05 * tilt - drop, size);
  ctx.restore();
}

/** Screen-space label for the day being laid: its star's name in Malayalam and in English. */
export function dayLabel(p: number) {
  const { done, laying } = progress(p);
  const day = laying >= 0 ? laying : done - 1;
  if (day < 0) return null;
  const start = dayAt(day);
  const shown = clamp((p - start) / 0.002) * (1 - clamp((p - start - MOMENTS.days[1] * 0.92) / 0.002));
  const last = day === 9 ? 1 - clamp((p - 0.31) / 0.008) : shown;
  return {
    day,
    alpha: day === 9 ? Math.min(clamp((p - start) / 0.002), last) : shown,
  };
}

/** The finished pookalam of Thiruvonam, every ring laid, as a canvas `SIZE` pixels across. */
export function fullPookalam() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext("2d")!;
  for (let day = 0; day < 10; day++) renderRing(g, day);
  return { canvas, radius: R };
}
