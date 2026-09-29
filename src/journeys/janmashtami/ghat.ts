// The close: the Yamuna at dawn, calm after the storm. A kadamba tree on the bank in flower, a
// peacock on its low branch, cows grazing, and on a flat stone beneath it a bamboo flute and a
// peacock feather.
import {
  TAU,
  clamp,
  lerp,
  mix,
  mulberry32,
  onScreen,
  rgb,
  toScreen,
  type Ctx,
  type RGB,
  type View,
} from "../paint";
import type { Frame } from "../types";
import type { Light } from "./fort";
import { drawCow, type Cow } from "./people";
import { feather } from "./temple";
import { GHAT, HORIZON, MOMENTS, cut } from "./world";

const X = GHAT.x;
const shore = (y: number) => X - 3.4 + (y - HORIZON) * 0.45;

export class Ghat {
  private readonly cows: {
    x: number;
    y: number;
    cow: Cow;
    facing: 1 | -1;
    graze: number;
  }[] = [
    {
      x: X + 3.1,
      y: 0.35,
      cow: {
        coat: [238, 232, 220],
        horns: [210, 50, 40],
        size: 1.3,
        seed: 7,
        bell: true,
      },
      facing: -1,
      graze: 0.95,
    },
    {
      x: X + 5.2,
      y: 0.15,
      cow: { coat: [170, 120, 84], horns: [230, 170, 40], size: 1.25, seed: 8 },
      facing: -1,
      graze: 0.3,
    },
    {
      x: X + 2.0,
      y: 0.8,
      cow: {
        coat: [240, 236, 226],
        horns: [0, 0, 0],
        size: 0.8,
        seed: 9,
        calf: true,
      },
      facing: 1,
      graze: 0.6,
    },
  ];
  private readonly flowers: { a: number; d: number }[] = [];
  private readonly grass: { x: number; y: number; h: number }[] = [];
  private readonly floating: { x: number; y: number; seed: number }[] = [];

  constructor() {
    const random = mulberry32(9908);
    for (let i = 0; i < 60; i++)
      this.flowers.push({ a: random() * TAU, d: Math.sqrt(random()) });
    for (let i = 0; i < 160; i++) {
      const y = HORIZON + 0.1 + random() ** 1.4 * 3.2;
      this.grass.push({
        x: shore(y) + 0.1 + random() * 12,
        y,
        h: 0.08 + random() * 0.16,
      });
    }
    for (let i = 0; i < 8; i++)
      this.floating.push({
        x: X - 12 + random() * 9,
        y: HORIZON + 0.4 + random() * 2.4,
        seed: random() * 10,
      });
  }

  draw(ctx: Ctx, v: View, f: Frame, lights: Light[]) {
    const { p, seconds } = f;
    if (p < cut(MOMENTS.flight3) || !onScreen(v, X, -2, 14)) return;
    const day = clamp((p - 0.86) / 0.14);
    // The far bank in the mist.
    ctx.fillStyle = rgb(mix([120, 100, 130], [150, 140, 160], day));
    ctx.beginPath();
    ctx.moveTo(X - 30, HORIZON + 0.02);
    const random = mulberry32(5);
    for (let x = X - 30; x < X + 30; x += 0.6)
      ctx.lineTo(x, HORIZON - 0.2 - random() * 0.5);
    ctx.lineTo(X + 30, HORIZON + 0.02);
    ctx.fill();
    // The river, and the sun's path on it.
    const water = ctx.createLinearGradient(0, HORIZON, 0, 4);
    water.addColorStop(0, rgb(mix([230, 170, 150], [236, 200, 180], day)));
    water.addColorStop(0.35, rgb(mix([130, 110, 140], [140, 150, 180], day)));
    water.addColorStop(1, rgb(mix([50, 50, 80], [70, 90, 120], day)));
    ctx.fillStyle = water;
    ctx.fillRect(X - 30, HORIZON, 60, 14);
    const sun = { x: v.x + (v.width * 0.7 - v.ax) / v.scale };
    ctx.fillStyle = "rgba(255, 220, 170, 0.55)";
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const y = HORIZON + 0.05 + t * t * 4;
      const w = (0.1 + t * 0.9) * (0.6 + 0.4 * Math.sin(seconds * 2 + i * 1.7));
      ctx.globalAlpha = 0.7 * (1 - t);
      ctx.fillRect(
        sun.x - w / 2 + Math.sin(i * 3.1 + seconds) * 0.1,
        y,
        w,
        0.02 + t * 0.03,
      );
    }
    ctx.globalAlpha = 1;
    // Kadamba flowers floating downstream.
    for (const fl of this.floating) {
      const x = fl.x + ((seconds * 0.06 + fl.seed) % 3);
      ctx.fillStyle = "#f0c040";
      ctx.beginPath();
      ctx.ellipse(x, fl.y, 0.05, 0.02, 0, 0, TAU);
      ctx.fill();
    }
    // Mist lying on the water.
    for (let i = 0; i < 3; i++) {
      const y = HORIZON + 0.2 + i * 0.5;
      const mist = ctx.createLinearGradient(0, y - 0.3, 0, y + 0.3);
      mist.addColorStop(0, "rgba(255, 236, 220, 0)");
      mist.addColorStop(0.5, `rgba(255, 236, 220, ${0.22 * (1 - day * 0.6)})`);
      mist.addColorStop(1, "rgba(255, 236, 220, 0)");
      ctx.fillStyle = mist;
      ctx.fillRect(
        X - 30 + Math.sin(seconds * 0.1 + i) * 1.5,
        y - 0.3,
        60,
        0.6,
      );
    }

    // The bank.
    const bank = ctx.createLinearGradient(0, HORIZON, 0, 3);
    bank.addColorStop(0, rgb(mix([96, 100, 60], [120, 130, 70], day)));
    bank.addColorStop(1, rgb(mix([50, 56, 32], [70, 84, 44], day)));
    ctx.fillStyle = bank;
    ctx.beginPath();
    ctx.moveTo(shore(HORIZON), HORIZON);
    for (let y = HORIZON; y <= 12; y += 0.4)
      ctx.lineTo(shore(y) + Math.sin(y * 4) * 0.1, y);
    ctx.lineTo(X + 30, 12);
    ctx.lineTo(X + 30, HORIZON);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 180, 150, 0.5)";
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let y = HORIZON; y <= 12; y += 0.4)
      ctx.lineTo(shore(y) + Math.sin(y * 4) * 0.1, y);
    ctx.stroke();
    ctx.strokeStyle = rgb(mix([70, 90, 40], [110, 140, 60], day));
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (const g of this.grass) {
      const sway = Math.sin(seconds * 1.4 + g.x) * 0.03;
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + sway, g.y - g.h);
    }
    ctx.stroke();

    // The kadamba, in flower.
    const tx = GHAT.tree;
    ctx.fillStyle = "#4a3424";
    ctx.beginPath();
    ctx.moveTo(tx - 0.3, 0.05);
    ctx.quadraticCurveTo(tx - 0.12, -1.6, tx - 0.2, -3.2);
    ctx.lineTo(tx + 0.18, -3.2);
    ctx.quadraticCurveTo(tx + 0.1, -1.6, tx + 0.34, 0.05);
    ctx.fill();
    // The low branch reaching out over the flute.
    ctx.strokeStyle = "#4a3424";
    ctx.lineWidth = 0.14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx - 0.1, -2.6);
    ctx.quadraticCurveTo(tx - 1.0, -2.9, tx - 2.1, -2.75);
    ctx.stroke();
    const sway = Math.sin(seconds * 0.6) * 0.04;
    const crown = [
      [-1.4, -3.7, 1.2],
      [0.2, -4.4, 1.5],
      [1.5, -3.7, 1.15],
      [-0.5, -3.3, 1.1],
      [0.9, -3.1, 1.0],
      [-2.2, -3.0, 0.7],
    ];
    const leafDark: RGB = mix([36, 60, 40], [46, 84, 44], day);
    const leafLight: RGB = mix([70, 100, 50], [100, 140, 60], day);
    for (const [dx, dy, r] of crown) {
      const g = ctx.createRadialGradient(
        tx + dx - r * 0.3,
        dy - r * 0.4,
        r * 0.2,
        tx + dx,
        dy,
        r,
      );
      g.addColorStop(0, rgb(leafLight));
      g.addColorStop(1, rgb(leafDark));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tx + dx + sway, dy, r, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#f4c440";
    for (const fl of this.flowers) {
      const [dx, dy, r] = crown[Math.floor(fl.a * 10) % crown.length];
      ctx.beginPath();
      ctx.arc(
        tx + dx + sway + Math.cos(fl.a) * fl.d * r * 0.85,
        dy + Math.sin(fl.a) * fl.d * r * 0.85,
        0.07,
        0,
        TAU,
      );
      ctx.fill();
    }
    // A peacock on the branch, his train hanging.
    this.peacock(ctx, tx - 1.55, -2.85, seconds);

    // The cows.
    for (const c of this.cows)
      drawCow(
        ctx,
        c.x,
        c.y,
        c.cow,
        c.graze + Math.sin(seconds * 0.5 + c.cow.seed) * 0.08,
        seconds,
        c.facing,
      );

    // The flute and the feather on a flat stone.
    const fx = GHAT.flute.x;
    const fy = GHAT.flute.y;
    ctx.fillStyle = "#8a8074";
    ctx.beginPath();
    ctx.ellipse(fx, fy, 0.7, 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#a89e90";
    ctx.beginPath();
    ctx.ellipse(fx - 0.05, fy - 0.05, 0.62, 0.1, 0, 0, TAU);
    ctx.fill();
    flute(ctx, fx - 0.5, fy - 0.1, 1.0, -0.06);
    feather(ctx, fx + 0.3, fy - 0.05, 0.75, 1.25);
    lights.push({
      x: fx,
      y: fy - 0.15,
      r: 1.4,
      a: 0.35,
      color: "255, 214, 150",
    });
    lights.push({
      x: fx,
      y: fy - 0.2,
      r: 4.5,
      a: 0.12,
      color: "255, 190, 120",
    });

    // Birds crossing the dawn.
    ctx.strokeStyle = "rgba(40, 30, 40, 0.7)";
    ctx.lineWidth = 0.025;
    for (let i = 0; i < 5; i++) {
      const bx = X - 8 + ((seconds * 0.35 + i * 1.3) % 18);
      const by = -6.2 - i * 0.35 + Math.sin(seconds + i) * 0.1;
      const flap = Math.sin(seconds * 8 + i) * 0.08;
      ctx.beginPath();
      ctx.moveTo(bx - 0.18, by - flap);
      ctx.quadraticCurveTo(bx - 0.08, by - 0.05, bx, by);
      ctx.quadraticCurveTo(bx + 0.08, by - 0.05, bx + 0.18, by - flap);
      ctx.stroke();
    }
    void toScreen;
  }

  private peacock(ctx: Ctx, x: number, y: number, seconds: number) {
    // The train, long and hanging below the branch, with its eyes.
    const drift = Math.sin(seconds * 0.7) * 0.03;
    ctx.fillStyle = "#2a5a3a";
    ctx.beginPath();
    ctx.moveTo(x - 0.15, y);
    ctx.quadraticCurveTo(
      x - 0.35 + drift,
      y + 0.9,
      x - 0.25 + drift * 2,
      y + 1.7,
    );
    ctx.lineTo(x + 0.15 + drift * 2, y + 1.7);
    ctx.quadraticCurveTo(x + 0.1 + drift, y + 0.8, x + 0.1, y);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const t = 0.25 + (i / 8) * 0.7;
      const ex = x - 0.06 + drift * t * 2 + ((i % 3) - 1) * 0.1;
      const ey = y + t * 1.7;
      ctx.fillStyle = "#c89a30";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.06, 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#1a7a9a";
      ctx.beginPath();
      ctx.ellipse(ex, ey + 0.01, 0.04, 0.05, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#101a4a";
      ctx.beginPath();
      ctx.arc(ex, ey + 0.015, 0.02, 0, TAU);
      ctx.fill();
    }
    // Body, neck and crest.
    ctx.fillStyle = "#1c3a8a";
    ctx.beginPath();
    ctx.ellipse(x, y - 0.18, 0.2, 0.14, -0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#1a5ab0";
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(x + 0.1, y - 0.25);
    ctx.quadraticCurveTo(x + 0.22, y - 0.45, x + 0.18, y - 0.6);
    ctx.stroke();
    ctx.fillStyle = "#1a5ab0";
    ctx.beginPath();
    ctx.arc(x + 0.19, y - 0.63, 0.06, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#d8b060";
    ctx.beginPath();
    ctx.moveTo(x + 0.24, y - 0.64);
    ctx.lineTo(x + 0.32, y - 0.62);
    ctx.lineTo(x + 0.24, y - 0.6);
    ctx.fill();
    ctx.strokeStyle = "#1a5ab0";
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(x + 0.18, y - 0.68);
      ctx.lineTo(x + 0.18 + k * 0.05, y - 0.8);
    }
    ctx.stroke();
    ctx.fillStyle = "#1a5ab0";
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.arc(x + 0.18 + k * 0.05, y - 0.81, 0.015, 0, TAU);
      ctx.fill();
    }
    // Feet on the branch.
    ctx.strokeStyle = "#8a7a60";
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x - 0.03, y - 0.06);
    ctx.lineTo(x - 0.03, y + 0.08);
    ctx.moveTo(x + 0.06, y - 0.06);
    ctx.lineTo(x + 0.06, y + 0.08);
    ctx.stroke();
    void lerp;
  }
}

/** A bamboo bansuri lying at `angle`: nodes, finger holes, and the silk binding. */
export function flute(
  ctx: Ctx,
  x: number,
  y: number,
  length: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = length * 0.045;
  const body = ctx.createLinearGradient(0, -w, 0, w);
  body.addColorStop(0, "#f0d49a");
  body.addColorStop(0.5, "#c89a58");
  body.addColorStop(1, "#8a6030");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(0, -w, length, w * 2, w);
  ctx.fill();
  ctx.fillStyle = "#3a2410";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(
      length * (0.5 + i * 0.07),
      -w * 0.1,
      w * 0.3,
      w * 0.25,
      0,
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(length * 0.14, -w * 0.1, w * 0.35, w * 0.28, 0, 0, TAU);
  ctx.fill();
  // Red and gold silk wound at the ends.
  for (const [at, c] of [
    [0.04, "#c02a2a"],
    [0.07, "#e0a840"],
    [0.9, "#c02a2a"],
    [0.93, "#e0a840"],
  ] as const) {
    ctx.fillStyle = c;
    ctx.fillRect(length * at, -w * 1.05, length * 0.025, w * 2.1);
  }
  ctx.restore();
}
