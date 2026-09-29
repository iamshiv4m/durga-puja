// The Yamuna in flood: the far bank's trees against the lightning, rows of storm waves, the water
// rising on the line Vasudeva wades until it touches the child's feet, then parting round him,
// and Sheshnaag rising behind with his hoods spread over the basket.
import { TAU, clamp, lerp, mix, mulberry32, rgb, type Ctx, type RGB, type View } from "../paint";
import type { Light } from "./fort";
import { drawHoods } from "./people";
import { HORIZON, PATH_Y, RIVER, depth } from "./world";

export type RiverState = {
  p: number;
  seconds: number;
  flash: number;
  storm: number;
  /** Where Vasudeva is. */
  vx: number;
  surge: number;
  part: number;
  /** Sheshnaag rising, 0..1. */
  shesh: number;
  /** The dawn after, 0..1: the same river calming. */
  calm: number;
  lights: Light[];
};

export const SERPENT_LIGHT = "120, 230, 210";

/** The shoreline on each bank, which leans away from us as it goes back. */
export const shoreLeft = (y: number) => RIVER.from - 0.5 + (y - HORIZON) * 0.3;
export const shoreRight = (y: number) => RIVER.to + 0.5 - (y - HORIZON) * 0.3;

const DEEP: RGB = [10, 20, 28];
const WATER: RGB = [30, 56, 68];

export class River {
  private readonly trees: { x: number; h: number; w: number; kind: number }[] = [];
  private readonly reeds: { x: number; y: number; h: number; lean: number }[] = [];

  constructor() {
    const random = mulberry32(2208);
    let x = 2;
    for (let guard = 0; x < 27 && guard < 300; guard++) {
      this.trees.push({ x, h: 0.6 + random() * 1.3, w: 0.5 + random() * 0.9, kind: random() < 0.3 ? 1 : 0 });
      x += 0.3 + random() * 0.8;
    }
    for (let i = 0; i < 70; i++) {
      const left = i < 35;
      const y = HORIZON + 0.2 + random() * 2.5;
      const edge = left ? shoreLeft(y) : shoreRight(y);
      this.reeds.push({ x: edge + (left ? -1 : 1) * random() * 0.7, y, h: 0.3 + random() * 0.5, lean: (random() - 0.5) * 0.4 });
    }
  }

  /** The water's surface on Vasudeva's line, at x. */
  surface(x: number, s: RiverState) {
    const d = depth(x);
    const deep = d / RIVER.deep;
    const t = s.seconds;
    const chop = (0.07 * Math.sin(x * 2.1 - t * 2.6) + 0.045 * Math.sin(x * 4.7 + t * 3.3) + 0.09 * Math.sin(x * 0.9 - t * 1.3)) * lerp(0.2, 1.3, s.storm);
    const swell = s.surge * 0.35 * deep;
    const crest = s.surge * 0.75 * Math.exp(-(((x - s.vx - 0.1) / 0.6) ** 2)) * deep;
    const off = Math.abs(x - s.vx);
    const inside = 1 - clamp((off - 1.05) / 0.5);
    const wall = Math.exp(-(((off - 1.55) / 0.3) ** 2)) * 0.55;
    const trough = s.part * ((d - 0.1) * inside - wall * deep);
    return PATH_Y - d + chop * deep - swell - crest + trough;
  }

  /** The river behind everything on Vasudeva's line: the far bank, the open water, the banks. */
  drawBack(ctx: Ctx, v: View, s: RiverState) {
    const left = v.x - v.width / v.scale;
    const right = v.x + v.width / v.scale;
    if (right < RIVER.from - 4 || left > RIVER.to + 4) return;
    const flash = s.flash;
    // The far bank upriver: a line of trees against the sky.
    ctx.fillStyle = rgb(mix(mix([12, 14, 22], [60, 60, 70], s.calm), [70, 80, 120], flash * 0.4));
    ctx.beginPath();
    ctx.moveTo(1, HORIZON + 0.05);
    for (const tr of this.trees) {
      if (tr.kind) {
        ctx.lineTo(tr.x, HORIZON - tr.h * 0.3);
        ctx.lineTo(tr.x + tr.w * 0.1, HORIZON - tr.h * 1.4);
        ctx.lineTo(tr.x + tr.w * 0.2, HORIZON - tr.h * 0.3);
      } else {
        ctx.quadraticCurveTo(tr.x + tr.w * 0.5, HORIZON - tr.h * 1.6, tr.x + tr.w, HORIZON - tr.h * 0.4);
      }
    }
    ctx.lineTo(28, HORIZON + 0.05);
    ctx.closePath();
    ctx.fill();
    // Open water, darker far off.
    const water = ctx.createLinearGradient(0, HORIZON, 0, 3);
    water.addColorStop(0, rgb(mix(mix([30, 40, 54], [140, 150, 170], s.calm), [120, 140, 180], flash * 0.6)));
    water.addColorStop(0.3, rgb(mix(DEEP, [70, 80, 110], s.calm * 0.6)));
    water.addColorStop(1, rgb(mix(WATER, [80, 96, 120], s.calm * 0.5)));
    ctx.fillStyle = water;
    ctx.fillRect(shoreLeft(HORIZON) - 1, HORIZON, RIVER.to - RIVER.from + 2, 30);
    // Rows of storm waves running downriver.
    ctx.lineCap = "round";
    for (let r = 0; r < 9; r++) {
      const y = HORIZON + 0.06 + (r / 8) ** 1.6 * (PATH_Y - 0.9 - HORIZON);
      const amp = (0.02 + (r / 8) * 0.07) * lerp(0.2, 1.4, s.storm);
      ctx.strokeStyle = rgb(mix([90, 120, 130], [220, 230, 255], flash * 0.5), 0.14 + r * 0.03);
      ctx.lineWidth = 0.02 + r * 0.004;
      ctx.beginPath();
      const x0 = shoreLeft(y) + 0.2;
      const x1 = shoreRight(y) - 0.2;
      for (let x = Math.max(x0, left); x <= Math.min(x1, right); x += 0.18) {
        const wy = y - Math.abs(Math.sin(x * (1.6 + r * 0.2) - s.seconds * (1.4 + r * 0.12) + r)) * amp;
        if (x === Math.max(x0, left)) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  /** Both banks, laid over the water's edges, with reeds. */
  drawBanks(ctx: Ctx, v: View, s: RiverState, ground: RGB, gokulGround: RGB) {
    const bank = (from: (y: number) => number, dir: number, colour: RGB) => {
      const g = ctx.createLinearGradient(0, HORIZON, 0, 4);
      g.addColorStop(0, rgb(mix(colour, [0, 0, 0], 0.3)));
      g.addColorStop(1, rgb(mix(colour, [0, 0, 0], 0.6)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(from(HORIZON), HORIZON);
      for (let y = HORIZON; y <= 12; y += 0.5) ctx.lineTo(from(y) + Math.sin(y * 3.1) * 0.12, y);
      ctx.lineTo(from(12) - dir * 30, 12);
      ctx.lineTo(from(HORIZON) - dir * 30, HORIZON);
      ctx.closePath();
      ctx.fill();
      // Mud at the water's edge.
      ctx.strokeStyle = rgb(mix(colour, [120, 110, 90], 0.3), 0.6);
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      for (let y = HORIZON; y <= 12; y += 0.5) ctx.lineTo(from(y) + Math.sin(y * 3.1) * 0.12, y);
      ctx.stroke();
    };
    bank(shoreLeft, 1, ground);
    bank(shoreRight, -1, gokulGround);
    ctx.strokeStyle = rgb(mix([30, 40, 30], [80, 100, 60], s.calm));
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (const r of this.reeds) {
      const sway = Math.sin(s.seconds * 2.2 + r.x * 3) * 0.1 * (0.3 + s.storm);
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(r.x + k * 0.04, r.y);
        ctx.quadraticCurveTo(r.x + k * 0.06 + sway * 0.5, r.y - r.h * 0.6, r.x + k * 0.1 + sway + r.lean, r.y - r.h);
      }
    }
    ctx.stroke();
  }

  /** Sheshnaag, rising from the river behind Vasudeva, his hoods over the basket. */
  drawSerpent(ctx: Ctx, s: RiverState, head: { x: number; y: number }) {
    if (s.shesh < 0.01) return;
    const up = clamp(s.shesh * 1.6);
    const open = clamp((s.shesh - 0.35) / 0.65);
    const water = this.surface(s.vx - 1.6, s);
    const neck = { x: head.x - 0.06, y: lerp(water + 0.2, head.y - 0.15, up) };
    ctx.lineCap = "round";
    // Coils breaking the water behind him.
    for (const [dx, r] of [
      [-2.4, 0.34],
      [-3.3, 0.26],
    ]) {
      const cx = s.vx + dx;
      const cy = this.surface(cx, s) + 0.08;
      ctx.fillStyle = "#17343c";
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.4 * up, r * up, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 200, 190, 0.5)";
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.4 * up, r * up, 0, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
    }
    // The body, thick and scaled, curving up his back.
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(s.vx - 1.7, water + 0.1);
      ctx.bezierCurveTo(s.vx - 1.2, lerp(water, -2.2, up), s.vx - 0.55, lerp(water, -0.55, up), neck.x, neck.y + 0.35);
    };
    ctx.strokeStyle = "#163038";
    ctx.lineWidth = 0.34;
    path();
    ctx.stroke();
    ctx.strokeStyle = "#2b5a62";
    ctx.lineWidth = 0.2;
    path();
    ctx.stroke();
    ctx.strokeStyle = "rgba(220, 200, 130, 0.55)";
    ctx.lineWidth = 0.1;
    ctx.setLineDash([0.05, 0.09]);
    path();
    ctx.stroke();
    ctx.setLineDash([]);
    drawHoods(ctx, neck.x, neck.y + 0.35, 0.95, open, s.seconds);
    s.lights.push({ x: neck.x, y: neck.y - 0.6, r: 3.2, a: 0.35 * open, color: SERPENT_LIGHT });
    s.lights.push({ x: neck.x, y: neck.y - 0.55, r: 1.3, a: 0.25 * open, color: "255, 230, 170" });
  }

  /** The water in front of Vasudeva's line, over his legs, and the waves nearer to us. */
  drawFront(ctx: Ctx, v: View, s: RiverState) {
    const left = Math.max(RIVER.from - 1, v.x - v.width / v.scale);
    const right = Math.min(RIVER.to + 1, v.x + v.width / v.scale);
    if (right < left) return;
    ctx.save();
    // Only where the river is.
    ctx.beginPath();
    ctx.moveTo(shoreLeft(HORIZON), HORIZON - 6);
    ctx.lineTo(shoreRight(HORIZON), HORIZON - 6);
    ctx.lineTo(shoreRight(12), 12);
    ctx.lineTo(shoreLeft(12), 12);
    ctx.closePath();
    ctx.clip();
    const step = 0.08;
    const pts: { x: number; y: number }[] = [];
    for (let x = left; x <= right + step; x += step) pts.push({ x, y: this.surface(x, s) });
    const top = Math.min(...pts.map((pt) => pt.y));
    const water = ctx.createLinearGradient(0, top, 0, PATH_Y + 3);
    water.addColorStop(0, rgb(mix([40, 76, 88], [150, 170, 210], s.flash * 0.5), 0.72));
    water.addColorStop(0.12, rgb(mix([28, 56, 68], [120, 140, 180], s.flash * 0.4), 0.9));
    water.addColorStop(0.4, rgb(WATER, 0.97));
    water.addColorStop(1, rgb(DEEP));
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, 12);
    for (const pt of pts) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(pts[pts.length - 1].x, 12);
    ctx.closePath();
    ctx.fill();
    // Foam along the top, heavier where the water is steep.
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgb(mix([170, 200, 205], [240, 245, 255], s.flash), 0.7);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
    ctx.stroke();
    ctx.fillStyle = "rgba(220, 235, 240, 0.55)";
    for (let i = 1; i < pts.length - 1; i++) {
      const slope = Math.abs(pts[i + 1].y - pts[i - 1].y) / (step * 2);
      if (slope < 0.5 && (i * 7) % 5) continue;
      const r = 0.02 + Math.min(0.08, slope * 0.02);
      ctx.beginPath();
      ctx.arc(pts[i].x + Math.sin(i * 3 + s.seconds * 4) * 0.03, pts[i].y + 0.03 + ((i * 13) % 7) * 0.02, r, 0, TAU);
      ctx.fill();
    }
    // Waves nearer to us.
    for (let r = 0; r < 6; r++) {
      const y = PATH_Y + 0.35 + r * r * 0.18 + r * 0.25;
      const amp = (0.06 + r * 0.035) * lerp(0.15, 1.3, s.storm);
      ctx.strokeStyle = rgb(mix([90, 130, 140], [220, 230, 255], s.flash * 0.5), 0.25);
      ctx.lineWidth = 0.03 + r * 0.01;
      ctx.beginPath();
      for (let x = left; x <= right; x += 0.2) {
        const wy = y - Math.abs(Math.sin(x * (1.1 - r * 0.08) - s.seconds * (1.8 - r * 0.1) + r * 2)) * amp;
        if (x === left) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    // Rain landing on the water.
    if (s.storm > 0.05) {
      ctx.strokeStyle = "rgba(200, 215, 230, 0.45)";
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      const frame = Math.floor(s.seconds * 12);
      const random = mulberry32(frame);
      const n = Math.floor(70 * s.storm);
      for (let i = 0; i < n; i++) {
        const x = lerp(left, right, random());
        const y = lerp(PATH_Y - 0.2, PATH_Y + 3, random() ** 1.5);
        const h = 0.04 + random() * 0.08;
        ctx.moveTo(x, y);
        ctx.lineTo(x - h * 0.3, y - h);
        ctx.moveTo(x + 0.03, y);
        ctx.lineTo(x + 0.06, y - h * 0.7);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
