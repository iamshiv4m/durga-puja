"use client";

import { useEffect, useRef } from "react";
import { smoothstep } from "@/lib/math";
import { scroll } from "@/lib/scroll";
import { isPortrait, thirdEyeScreen } from "@/lib/screen";
import { timeline } from "@/lib/timeline";

// Mahishasura's shadow. In the Devi Mahatmya (chapter 3) the demon fights her as a buffalo,
// then a lion, then a man with a sword, then an elephant, and a buffalo again. Here his shadow
// rises beside her and changes shape as the reader scrolls, until her third eye opens on him
// and he burns away. Drawn in 2D over the stage, like the inside of the third eye.

type Point = [number, number];
type Shape = { outline: Point[]; eye: Point };

// Outlines in a 200 × 200 box, facing left towards her, feet at y ≈ 190.
const BUFFALO: Shape = {
  eye: [30, 102],
  outline: [
    [18, 122], [20, 108], [34, 92], [44, 84], [34, 66], [40, 46], [58, 32], [84, 28], [102, 34],
    [80, 38], [62, 44], [54, 58], [56, 72], [64, 82], [76, 74], [92, 60], [108, 56], [140, 62],
    [166, 68], [182, 78], [188, 94], [192, 106], [196, 130], [198, 152], [192, 154], [190, 132],
    [186, 114], [186, 132], [182, 150], [184, 164], [182, 190], [168, 190], [168, 168], [164, 150],
    [150, 140], [132, 146], [110, 146], [100, 150], [98, 190], [84, 190], [84, 164], [80, 190],
    [66, 190], [68, 154], [62, 140], [52, 136], [40, 134], [28, 132], [20, 128],
  ],
};

const LION: Shape = {
  eye: [26, 86],
  outline: [
    [14, 96], [18, 86], [28, 78], [30, 64], [24, 54], [36, 48], [34, 36], [48, 34], [52, 22], [64, 28],
    [76, 20], [82, 32], [94, 32], [96, 46], [108, 54], [130, 60], [156, 60], [178, 64], [186, 72],
    [192, 64], [194, 50], [190, 40], [198, 36], [196, 28], [186, 30], [182, 40], [186, 54], [184, 64],
    [188, 96], [184, 120], [178, 142], [182, 172], [186, 190], [168, 190], [162, 168], [156, 146],
    [146, 130], [124, 128], [104, 128], [100, 136], [102, 172], [106, 190], [88, 190], [84, 168],
    [78, 142], [70, 134], [62, 140], [56, 128], [48, 132], [44, 120], [34, 122], [30, 112], [18, 114],
    [26, 106], [14, 104],
  ],
};

const MAN: Shape = {
  eye: [94, 38],
  outline: [
    [90, 30], [82, 12], [96, 24], [106, 24], [118, 12], [112, 30], [116, 40], [114, 52], [126, 58],
    [140, 44], [142, 28], [148, 28], [170, 2], [176, 4], [152, 30], [146, 34], [140, 58], [128, 70],
    [124, 92], [120, 110], [130, 122], [146, 150], [158, 184], [168, 190], [144, 192], [136, 160],
    [110, 132], [94, 152], [80, 184], [82, 190], [56, 190], [64, 180], [76, 150], [88, 120], [86, 98],
    [84, 82], [64, 82], [60, 94], [48, 104], [34, 100], [28, 86], [32, 72], [44, 64], [58, 66],
    [66, 74], [86, 70], [90, 60], [92, 52], [86, 46], [88, 36],
  ],
};

const ELEPHANT: Shape = {
  eye: [60, 68],
  outline: [
    [70, 40], [92, 32], [120, 38], [150, 42], [176, 54], [190, 78], [194, 110], [190, 140], [188, 190],
    [166, 190], [164, 158], [140, 162], [110, 162], [104, 190], [80, 190], [78, 150], [70, 138],
    [62, 124], [54, 120], [32, 116], [18, 106], [22, 104], [36, 110], [52, 112], [48, 104], [40, 94],
    [32, 78], [24, 60], [16, 46], [10, 34], [18, 28], [26, 40], [34, 56], [44, 70], [52, 80], [54, 62],
    [62, 48],
  ],
};

const SEQUENCE = [BUFFALO, LION, MAN, ELEPHANT, BUFFALO];
const POINTS = 220;
const EMBER_EVERY = 3;
const PIXEL_RATIO_MAX = 1.5;

function signedArea(points: Point[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

/** The outline resampled to `POINTS` points evenly spaced along it, all wound the same way. */
function resample(outline: Point[]): Point[] {
  const points = signedArea(outline) < 0 ? [...outline].reverse() : outline;
  const lengths = [0];
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    lengths.push(lengths[i] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = lengths[lengths.length - 1];
  const out: Point[] = [];
  let seg = 0;
  for (let k = 0; k < POINTS; k++) {
    const d = (k / POINTS) * total;
    while (lengths[seg + 1] < d) seg++;
    const t = (d - lengths[seg]) / (lengths[seg + 1] - lengths[seg] || 1);
    const [x0, y0] = points[seg];
    const [x1, y1] = points[(seg + 1) % points.length];
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  return out;
}

/** `b` rotated so its points line up with `a`'s, which keeps the morph from twisting. */
function align(a: Point[], b: Point[]): Point[] {
  let best = 0;
  let bestCost = Infinity;
  for (let k = 0; k < POINTS; k++) {
    let cost = 0;
    for (let i = 0; i < POINTS; i++) {
      const [bx, by] = b[(i + k) % POINTS];
      cost += (a[i][0] - bx) ** 2 + (a[i][1] - by) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = k;
    }
  }
  return b.map((_, i) => b[(i + best) % POINTS]);
}

function buildShapes() {
  const shapes: { outline: Point[]; eye: Point }[] = [];
  SEQUENCE.forEach((shape, i) => {
    const sampled = resample(shape.outline);
    shapes.push({ outline: i === 0 ? sampled : align(shapes[i - 1].outline, sampled), eye: shape.eye });
  });
  return shapes;
}

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function MahishaShadow() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const shapes = buildShapes();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current: Point[] = shapes[0].outline.map(([x, y]) => [x, y]);
    let width = 0;
    let height = 0;
    let seconds = 0;
    let last = performance.now();
    let frame = 0;
    let drawn = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX);
      width = window.innerWidth;
      height = element.clientHeight || window.innerHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (presence: number, shapesT: number, burn: number) => {
      const ctx = context;
      ctx.clearRect(0, 0, width, height);
      const portrait = isPortrait(width, height);
      const size = portrait ? Math.min(width * 0.6, height * 0.34) : Math.min(height * 0.6, width * 0.3);
      const cx = portrait ? width * 0.8 : width * 0.845;
      const cy = (portrait ? height * 0.3 : height * 0.56) + (1 - presence) * size * 0.18;
      const map = ([x, y]: Point): Point => [cx + ((x - 100) / 200) * size, cy + ((y - 110) / 200) * size];

      // Which two shapes he is between: he holds each one, then churns into the next.
      const s = shapesT * (shapes.length - 1);
      const seg = Math.min(Math.floor(s), shapes.length - 2);
      const m = smoothstep(0.45, 1, s - seg);
      const a = shapes[seg];
      const b = shapes[seg + 1];
      const churn = 1.2 + 5 * Math.sin(Math.PI * m);
      const dissolve = smoothstep(0.25, 1, burn);
      const eye = map([a.eye[0] + (b.eye[0] - a.eye[0]) * m, a.eye[1] + (b.eye[1] - a.eye[1]) * m]);
      for (let i = 0; i < POINTS; i++) {
        const x = a.outline[i][0] + (b.outline[i][0] - a.outline[i][0]) * m;
        const y = a.outline[i][1] + (b.outline[i][1] - a.outline[i][1]) * m;
        const boil = Math.sin(i * 0.35 + seconds * 1.7) * churn + Math.sin(i * 0.13 - seconds * 1.1) * churn * 0.8;
        const [px, py] = map([x + boil * 0.6, y + boil * 0.4]);
        // As he burns, the shadow is blown outward from where the fire strikes.
        const dx = px - eye[0];
        const dy = py - eye[1];
        const d = Math.hypot(dx, dy) || 1;
        const push = dissolve * size * 0.12 * (0.6 + hash(i));
        current[i][0] = px + (dx / d) * push;
        current[i][1] = py + (dy / d) * push - dissolve * size * 0.08;
      }
      const path = () => {
        // Curves through the midpoints, so the outline reads as smoke rather than a polygon.
        ctx.beginPath();
        const last = current[POINTS - 1];
        ctx.moveTo((last[0] + current[0][0]) / 2, (last[1] + current[0][1]) / 2);
        for (let i = 0; i < POINTS; i++) {
          const [x0, y0] = current[i];
          const [x1, y1] = current[(i + 1) % POINTS];
          ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }
        ctx.closePath();
      };
      const body = presence * (1 - dissolve) * (portrait ? 0.82 : 1);

      if (body > 0.002) {
        // Smoke rising off his back.
        ctx.globalCompositeOperation = "source-over";
        for (let i = 0; i < POINTS; i += 9) {
          const [x, y] = current[i];
          if (y > cy + size * 0.1) continue;
          for (let k = 0; k < 2; k++) {
            const life = (seconds * 0.22 + hash(i) + k / 2) % 1;
            ctx.globalAlpha = (1 - life) * 0.22 * body;
            ctx.fillStyle = "#0b0405";
            ctx.beginPath();
            ctx.arc(x + Math.sin(life * 5 + i) * size * 0.03, y - life * size * 0.22, size * (0.02 + life * 0.05), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // The body: a soft-edged shadow, faintly red where the lamps light it from inside.
        ctx.globalAlpha = body * 0.92;
        ctx.shadowColor = "rgba(5, 1, 2, 0.95)";
        ctx.shadowBlur = size * 0.07;
        const fill = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.6);
        fill.addColorStop(0, "#2a0706");
        fill.addColorStop(0.6, "#120405");
        fill.addColorStop(1, "#080203");
        ctx.fillStyle = fill;
        path();
        ctx.fill();
        ctx.shadowBlur = 0;

        // An ember rim, and his eyes.
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = body * (0.5 + 0.5 * Math.sin(Math.PI * m));
        ctx.strokeStyle = "rgba(255, 90, 30, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "rgba(255, 60, 20, 0.9)";
        ctx.shadowBlur = 14;
        path();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = body;
        const glint = ctx.createRadialGradient(eye[0], eye[1], 0, eye[0], eye[1], size * 0.035);
        glint.addColorStop(0, "rgba(255, 210, 150, 1)");
        glint.addColorStop(0.3, "rgba(255, 60, 20, 0.8)");
        glint.addColorStop(1, "rgba(255, 30, 10, 0)");
        ctx.fillStyle = glint;
        ctx.fillRect(eye[0] - size * 0.04, eye[1] - size * 0.04, size * 0.08, size * 0.08);
      }

      if (burn > 0) {
        ctx.globalCompositeOperation = "lighter";
        const from: Point = [thirdEyeScreen.x * width, thirdEyeScreen.y * height];
        const reach = smoothstep(0, 0.25, burn);
        const beam = smoothstep(0, 0.12, burn) * (1 - smoothstep(0.7, 1, burn));
        const to: Point = [from[0] + (eye[0] - from[0]) * reach, from[1] + (eye[1] - from[1]) * reach];

        // The fire from her third eye: a beam that widens as it goes.
        if (beam > 0.001) {
          const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
          const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
          ctx.save();
          ctx.translate(...from);
          ctx.rotate(angle);
          for (const [spread, alpha] of [
            [3.2, 0.18],
            [1, 0.85],
          ] as const) {
            const w0 = size * 0.006 * spread;
            const w1 = size * 0.03 * spread;
            const g = ctx.createLinearGradient(0, 0, length, 0);
            g.addColorStop(0, `rgba(255, 248, 225, ${alpha})`);
            g.addColorStop(0.6, `rgba(255, 190, 90, ${alpha * 0.8})`);
            g.addColorStop(1, `rgba(255, 110, 40, ${alpha * 0.6})`);
            ctx.globalAlpha = beam;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, -w0);
            ctx.lineTo(length, -w1);
            ctx.lineTo(length, w1);
            ctx.lineTo(0, w0);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        // Where it strikes, a burst of light.
        const impact = smoothstep(0.2, 0.34, burn) * (1 - smoothstep(0.55, 1, burn));
        if (impact > 0.001) {
          const r = size * (0.12 + 0.35 * smoothstep(0.2, 0.7, burn));
          const g = ctx.createRadialGradient(eye[0], eye[1], 0, eye[0], eye[1], r);
          g.addColorStop(0, "rgba(255, 245, 220, 0.9)");
          g.addColorStop(0.3, "rgba(255, 160, 60, 0.5)");
          g.addColorStop(1, "rgba(200, 40, 10, 0)");
          ctx.globalAlpha = impact;
          ctx.fillStyle = g;
          ctx.fillRect(eye[0] - r, eye[1] - r, r * 2, r * 2);
        }

        // And the shadow goes up as embers.
        for (let i = 0; i < POINTS; i += EMBER_EVERY) {
          const e = smoothstep(0.22 + hash(i + 3) * 0.2, 1, burn);
          if (e <= 0 || e >= 1) continue;
          const [x, y] = current[i];
          ctx.globalAlpha = Math.sin(Math.PI * e) * presence;
          ctx.fillStyle = hash(i) < 0.6 ? "#ffb35c" : hash(i) < 0.9 ? "#ff6a2a" : "#fff0d0";
          ctx.beginPath();
          ctx.arc(
            x + (hash(i + 7) - 0.5) * size * 0.25 * e,
            y - e * size * (0.2 + hash(i + 11) * 0.35),
            1 + hash(i + 5) * 2.2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) seconds += dt;
      const t = timeline(scroll.smooth);
      if (t.mahisha > 0.001 && t.burn < 1) {
        draw(t.mahisha, t.shapes, t.burn);
        drawn = true;
      } else if (drawn) {
        context.clearRect(0, 0, width, height);
        drawn = false;
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} id="mahisha" aria-hidden="true" />;
}
