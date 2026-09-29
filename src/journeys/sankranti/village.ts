// A village in Bihar on a January morning: mustard in flower to the horizon, a neem, the straw
// stack and a mud house with dung cakes drying on its wall; and in the aangan, in the sun, a
// family at breakfast of dahi-chura and tilkut while the khichdi cooks on the chulha.
import { TAU, flame, flicker, lerp, mix, mulberry32, onScreen, rgb, type RGB } from "../paint";
import { drawFigure, SKINS, type Shade } from "./people";
import { VILLAGE, paint, spanX, type World } from "./world";

const X = VILLAGE;
const YARD = 2.7;
const FIRE = "255, 130, 50";

export class Village {
  private readonly mustard: { x: number; y: number; r: number }[] = [];
  private readonly steam: { t: number; seed: number }[] = [];
  private readonly marks: { x: number; y: number; r: number; a: number }[] = [];

  constructor() {
    const random = mulberry32(2026);
    // Flowers only on the mustard strips, and not on the path between them.
    const strips = [0, 0.08, 0.2, 0.36, 0.58, 0.86, 1.24, 1.7, 2.2, YARD + 0.1];
    for (let i = 0, guard = 0; i < 900 && guard < 5000; guard++) {
      const y = 0.05 + random() ** 1.3 * (YARD - 0.1);
      const x = X - 22 + random() * 44;
      const strip = strips.findIndex((top, k) => y >= top && y < strips[k + 1]);
      if (strip % 3 === 1) continue;
      const t = y / YARD;
      if (x > lerp(X - 1.3, X + 0.3, t) && x < lerp(X - 0.8, X + 1.9, t)) continue;
      this.mustard.push({ x, y, r: 0.01 + y * 0.012 });
      i++;
    }
    for (let i = 0; i < 12; i++) this.steam.push({ t: i / 12, seed: random() * 10 });
    for (let i = 0; i < 60; i++)
      this.marks.push({
        x: X - 8 + random() * 16,
        y: YARD + 0.3 + random() * 4.5,
        r: 0.2 + random() * 0.35,
        a: random() * TAU,
      });
  }

  draw(w: World) {
    const { v, env } = w;
    const [left, right] = spanX(v, 2);
    if (right < X - 24 || left > X + 24) return;
    const shade: Shade = (c, a = 1) => paint(c, env, 0, a);
    this.fields(w, left, right);
    this.tree(w, X - 5.2, YARD - 0.1, shade);
    this.straw(w, X - 7.6, YARD + 0.05, shade);
    this.house(w, shade);
    this.yard(w, left, right);
    this.flyer(w, shade);
    this.family(w, shade);
    this.chulha(w, X + 5.6, YARD + 1.9, shade);
  }

  /** Mustard and wheat in strips to the edge of the world, brightest near. */
  private fields(w: World, left: number, right: number) {
    const { ctx, v, env, seconds } = w;
    const l = Math.max(left, X - 24);
    const r = Math.min(right, X + 24);
    const strips = [0, 0.08, 0.2, 0.36, 0.58, 0.86, 1.24, 1.7, 2.2, YARD + 0.1];
    for (let i = 0; i < strips.length - 1; i++) {
      const y0 = strips[i];
      const y1 = strips[i + 1];
      const yellow = i % 3 !== 1;
      const base: RGB = yellow ? [228, 196, 40] : [104, 146, 58];
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, paint(mix(base, w.hour.low, 0.35 - i * 0.03), env));
      g.addColorStop(1, paint(mix(base, [60, 80, 30], 0.15), env));
      ctx.fillStyle = g;
      ctx.fillRect(l, y0, r - l, y1 - y0 + 0.01);
    }
    // A raised path between the fields, and the little flowers.
    ctx.fillStyle = paint([176, 140, 96], env);
    ctx.beginPath();
    ctx.moveTo(X - 1.2, 0.02);
    ctx.lineTo(X - 0.9, 0.02);
    ctx.lineTo(X + 1.8, YARD);
    ctx.lineTo(X + 0.4, YARD);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paint([252, 222, 60], env, 0.1);
    ctx.beginPath();
    for (const m of this.mustard) {
      if (m.x < l || m.x > r) continue;
      const sway = Math.sin(seconds * 1.2 + m.x * 2) * m.r * 0.5;
      ctx.moveTo(m.x + sway + m.r, m.y);
      ctx.arc(m.x + sway, m.y, m.r, 0, TAU);
    }
    ctx.fill();
    void v;
  }

  private tree(w: World, x: number, y: number, shade: Shade) {
    const { ctx, v, seconds } = w;
    if (!onScreen(v, x, y - 3, 5)) return;
    ctx.fillStyle = shade([70, 50, 40]);
    ctx.beginPath();
    ctx.moveTo(x - 0.22, y);
    ctx.quadraticCurveTo(x - 0.1, y - 1.5, x - 0.35, y - 2.6);
    ctx.lineTo(x + 0.1, y - 2.6);
    ctx.quadraticCurveTo(x + 0.1, y - 1.5, x + 0.26, y);
    ctx.closePath();
    ctx.fill();
    const random = mulberry32(8);
    const blobs = Array.from({ length: 22 }, () => ({
      bx: x + (random() - 0.5) * 4,
      by: y - 2.6 - random() * 2.2,
      r: 0.5 + random() * 0.6,
      k: random(),
    }));
    for (const pass of [0, 1]) {
      for (const b of blobs) {
        const sway = Math.sin(seconds * 0.6 + b.k * 6) * 0.04;
        ctx.fillStyle = shade(pass === 0 ? [38, 66, 34] : mix([70, 110, 50], [110, 140, 60], b.k), pass === 0 ? 1 : 0.8);
        ctx.beginPath();
        ctx.arc(b.bx + sway + (pass ? 0.12 : 0), b.by - (pass ? 0.12 : 0), b.r * (pass ? 0.7 : 1), 0, TAU);
        ctx.fill();
      }
    }
  }

  /** The stack of paddy straw, kept for the cattle through the winter. */
  private straw(w: World, x: number, y: number, shade: Shade) {
    const { ctx, v } = w;
    if (!onScreen(v, x, y - 1, 2.5)) return;
    const g = ctx.createLinearGradient(x - 1.4, 0, x + 1.4, 0);
    g.addColorStop(0, shade([220, 180, 100]));
    g.addColorStop(1, shade([160, 120, 60]));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 1.4, y);
    ctx.bezierCurveTo(x - 1.5, y - 1.4, x - 0.5, y - 2.2, x, y - 2.3);
    ctx.bezierCurveTo(x + 0.5, y - 2.2, x + 1.5, y - 1.4, x + 1.4, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade([130, 96, 50], 0.5);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      ctx.moveTo(x - 1.3 + t * 2.6, y);
      ctx.quadraticCurveTo(x - 0.8 + t * 1.6, y - 1.4, x, y - 2.25);
    }
    ctx.stroke();
    ctx.strokeStyle = shade([90, 70, 40]);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y - 2.3);
    ctx.lineTo(x, y - 2.7);
    ctx.stroke();
  }

  /** The house: mud walls, a roof of clay khapra tiles, dung cakes drying in the sun. */
  private house(w: World, shade: Shade) {
    const { ctx, v } = w;
    const l = X + 2.6;
    const r = X + 10;
    const base = YARD + 0.15;
    const top = base - 2.5;
    if (!onScreen(v, (l + r) / 2, base - 2, 6)) return;
    const wall = ctx.createLinearGradient(0, top, 0, base);
    wall.addColorStop(0, shade([170, 118, 76]));
    wall.addColorStop(1, shade([196, 144, 96]));
    ctx.fillStyle = wall;
    ctx.fillRect(l, top, r - l, base - top);
    // The plinth, and the verandah step.
    ctx.fillStyle = shade([150, 104, 66]);
    ctx.fillRect(l - 0.2, base - 0.3, r - l + 0.4, 0.34);
    // The door, a window with bars, and aripan in rice paste at the threshold.
    ctx.fillStyle = shade([70, 44, 28]);
    ctx.fillRect(X + 3.6, top + 0.7, 1.0, base - 0.3 - top - 0.7);
    ctx.fillStyle = shade([24, 16, 12]);
    ctx.fillRect(X + 3.72, top + 0.82, 0.76, base - 0.3 - top - 0.82);
    ctx.fillStyle = shade([40, 26, 20]);
    ctx.fillRect(X + 5.4, top + 0.9, 0.7, 0.6);
    ctx.strokeStyle = shade([110, 76, 50]);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
      ctx.moveTo(X + 5.4 + i * 0.14, top + 0.9);
      ctx.lineTo(X + 5.4 + i * 0.14, top + 1.5);
    }
    ctx.stroke();
    ctx.fillStyle = shade([246, 240, 226], 0.85);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(X + 3.5 + i * 0.15, base - 0.24, 0.035, 0, TAU);
      ctx.fill();
    }
    // Goitha, cow dung patted into cakes and stuck on the wall to dry for the fire.
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 6; i++) {
        const cx = X + 6.8 + i * 0.44 + (row % 2) * 0.22;
        const cy = top + 0.7 + row * 0.44;
        ctx.fillStyle = shade([112, 84, 54]);
        ctx.beginPath();
        ctx.arc(cx, cy, 0.18, 0, TAU);
        ctx.fill();
        ctx.fillStyle = shade([90, 64, 40], 0.6);
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(cx - 0.08 + k * 0.05, cy - 0.02, 0.025, 0, TAU);
          ctx.fill();
        }
      }
    }
    // The roof: rows of khapra tiles on bamboo, and its shadow under the eave.
    ctx.fillStyle = shade([150, 72, 44]);
    ctx.beginPath();
    ctx.moveTo(l - 0.5, top + 0.2);
    ctx.lineTo(l + 0.6, top - 1.4);
    ctx.lineTo(r - 0.6, top - 1.4);
    ctx.lineTo(r + 0.5, top + 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade([96, 44, 28], 0.8);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const y = top + 0.2 - i * 0.27;
      const t = i / 6;
      ctx.moveTo(lerp(l - 0.5, l + 0.6, t), y);
      ctx.lineTo(lerp(r + 0.5, r - 0.6, t), y);
    }
    ctx.stroke();
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let x = l - 0.3; x < r + 0.4; x += 0.22) {
      ctx.moveTo(x, top + 0.2);
      ctx.lineTo(x + (x - X - 6.3) * -0.05, top - 1.35);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(30, 16, 10, 0.25)";
    ctx.fillRect(l, top, r - l, 0.35);
  }

  /** The aangan, plastered smooth with mud, warm in the sun. */
  private yard(w: World, left: number, right: number) {
    const { ctx, v, env } = w;
    const bottom = v.y + v.height / 2 / v.scale + 2;
    const l = Math.max(left, X - 24);
    const r = Math.min(right, X + 24);
    const g = ctx.createLinearGradient(0, YARD, 0, YARD + 5);
    g.addColorStop(0, paint([150, 116, 80], env));
    g.addColorStop(0.15, paint([186, 144, 100], env));
    g.addColorStop(1, paint([150, 108, 70], env));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(l, YARD + 0.12);
    ctx.quadraticCurveTo(X - 4, YARD - 0.1, X, YARD + 0.1);
    ctx.lineTo(r, YARD + 0.1);
    ctx.lineTo(r, bottom);
    ctx.lineTo(l, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([214, 170, 120], env, 0, 0.12);
    ctx.lineWidth = 0.025;
    for (const m of this.marks) {
      if (m.x < l || m.x > r) continue;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, m.a, m.a + 1.8);
      ctx.stroke();
    }
  }

  /** A boy out at the edge of the field with a kite of his own, even here. */
  private flyer(w: World, shade: Shade) {
    const { ctx, v, seconds } = w;
    const x = X - 3.4;
    const y = YARD + 0.05;
    if (!onScreen(v, x - 2, y - 4, 7)) return;
    const hands = drawFigure(
      ctx,
      x,
      y,
      {
        h: 1.05,
        skin: SKINS[1],
        top: [40, 100, 170],
        bottom: [70, 60, 60],
        dress: "kurta",
        head: "topi",
        headColor: [210, 40, 40],
      },
      { la: 1.2, lf: 1.9, ra: 2.6, rf: 2.9 },
      shade,
      -1,
    );
    const kx = x - 3.6 + Math.sin(seconds * 0.7) * 0.25;
    const ky = y - 5.6 + Math.sin(seconds * 1.1) * 0.2;
    ctx.strokeStyle = shade([250, 250, 250], 0.55);
    ctx.lineWidth = 1 / v.scale;
    ctx.beginPath();
    ctx.moveTo(hands.right.x, hands.right.y);
    ctx.quadraticCurveTo(lerp(hands.right.x, kx, 0.55) + 0.4, lerp(hands.right.y, ky, 0.5) + 0.6, kx, ky);
    ctx.stroke();
    // A small plain patang, red and yellow.
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(Math.sin(seconds * 1.3) * 0.15);
    ctx.fillStyle = shade([230, 50, 40]);
    ctx.beginPath();
    ctx.moveTo(0, -0.28);
    ctx.lineTo(0.28, 0);
    ctx.lineTo(0, 0.28);
    ctx.lineTo(-0.28, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade([250, 200, 40]);
    ctx.beginPath();
    ctx.moveTo(0, -0.28);
    ctx.lineTo(0.28, 0);
    ctx.lineTo(0, 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0.25);
    ctx.lineTo(-0.07, 0.38);
    ctx.lineTo(0.07, 0.38);
    ctx.fill();
    ctx.restore();
  }

  private family(w: World, shade: Shade) {
    const { ctx, v, seconds, shadow } = w;
    if (!onScreen(v, X + 1, YARD + 2, 7)) return;
    const shadowAt = (x: number, y: number, rx: number) => {
      ctx.fillStyle = "rgba(40, 20, 10, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + shadow * rx * 0.6, y + 0.03, rx * 1.2, rx * 0.16, 0, 0, TAU);
      ctx.fill();
    };

    // The charpai, woven jute on a wooden frame; Dada on it in his shawl and cap.
    const cx = X + 0.8;
    const cy = YARD + 1.45;
    shadowAt(cx, cy + 0.02, 1.2);
    ctx.fillStyle = shade([110, 72, 40]);
    for (const lx of [cx - 1.1, cx + 1.05]) ctx.fillRect(lx, cy - 0.5, 0.1, 0.52);
    ctx.fillStyle = shade([210, 180, 130]);
    ctx.fillRect(cx - 1.15, cy - 0.58, 2.35, 0.16);
    ctx.strokeStyle = shade([160, 120, 80]);
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      ctx.moveTo(cx - 1.12 + i * 0.15, cy - 0.58);
      ctx.lineTo(cx - 1.05 + i * 0.15, cy - 0.42);
    }
    ctx.stroke();
    ctx.fillStyle = shade([120, 80, 46]);
    ctx.fillRect(cx - 1.18, cy - 0.62, 2.42, 0.06);
    const chew = Math.max(0, Math.sin(seconds * 1.6)) * 0.4;
    drawFigure(
      ctx,
      cx - 0.3,
      cy - 0.6,
      {
        h: 2.0,
        skin: SKINS[0],
        top: [236, 230, 216],
        bottom: [240, 236, 224],
        dress: "kurta",
        head: "topi",
        headColor: [110, 90, 70],
        shawl: [120, 100, 80],
        beard: [220, 218, 212],
      },
      {
        la: 1.1,
        lf: 1.6,
        ra: 1.0 + chew,
        rf: 2.2 + chew,
        sit: true,
        hold: "leaf",
      },
      shade,
      1,
    );
    // A kansa plate of tilkut beside him: sesame pounded into jaggery, from Gaya.
    ctx.fillStyle = shade([200, 170, 100]);
    ctx.beginPath();
    ctx.ellipse(cx + 0.7, cy - 0.64, 0.3, 0.06, 0, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const tx = cx + 0.55 + (i % 3) * 0.13;
      const ty = cy - 0.68 - Math.floor(i / 3) * 0.04;
      ctx.fillStyle = shade([176, 120, 60]);
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.07, 0.025, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade([240, 230, 200], 0.9);
      ctx.fillRect(tx - 0.03, ty - 0.01, 0.012, 0.008);
      ctx.fillRect(tx + 0.02, ty, 0.012, 0.008);
    }

    // The mat, and on it Maa serving, and the children eating.
    const mx = X - 1.6;
    const my = YARD + 2.35;
    ctx.fillStyle = shade([196, 160, 100]);
    ctx.beginPath();
    ctx.moveTo(mx - 1.8, my + 0.25);
    ctx.lineTo(mx + 1.9, my + 0.25);
    ctx.lineTo(mx + 1.6, my - 0.35);
    ctx.lineTo(mx - 1.5, my - 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade([150, 110, 60], 0.6);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      ctx.moveTo(lerp(mx - 1.5, mx + 1.6, t), my - 0.35);
      ctx.lineTo(lerp(mx - 1.8, mx + 1.9, t), my + 0.25);
    }
    ctx.stroke();
    ctx.strokeStyle = shade([180, 60, 40], 0.7);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(mx - 1.7, my + 0.1);
    ctx.lineTo(mx + 1.8, my + 0.1);
    ctx.stroke();
    // A basket of chura, the clay matki of dahi, and a lump of gur on a leaf.
    const bx = mx - 0.2;
    const by = my - 0.12;
    ctx.fillStyle = shade([176, 136, 70]);
    ctx.beginPath();
    ctx.ellipse(bx, by, 0.36, 0.1, 0, 0, Math.PI);
    ctx.lineTo(bx - 0.36, by);
    ctx.fill();
    ctx.fillStyle = shade([244, 236, 214]);
    ctx.beginPath();
    ctx.ellipse(bx, by, 0.34, 0.12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = shade([220, 206, 180]);
    for (let i = 0; i < 12; i++) ctx.fillRect(bx - 0.28 + (i % 6) * 0.1, by - 0.06 - Math.floor(i / 6) * 0.05, 0.04, 0.012);
    const px = mx + 1.3;
    const py = my - 0.08;
    ctx.fillStyle = shade([160, 76, 44]);
    ctx.beginPath();
    ctx.moveTo(px - 0.14, py - 0.42);
    ctx.bezierCurveTo(px - 0.36, py - 0.3, px - 0.34, py, px, py);
    ctx.bezierCurveTo(px + 0.34, py, px + 0.36, py - 0.3, px + 0.14, py - 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade([248, 246, 238]);
    ctx.beginPath();
    ctx.ellipse(px, py - 0.42, 0.15, 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([96, 124, 50]);
    ctx.beginPath();
    ctx.ellipse(mx + 0.6, my + 0.12, 0.18, 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([150, 84, 36]);
    ctx.beginPath();
    ctx.arc(mx + 0.6, my + 0.09, 0.07, Math.PI, 0);
    ctx.fill();

    const serve = Math.sin(seconds * 0.9) * 0.15;
    drawFigure(
      ctx,
      mx - 1.0,
      my,
      {
        h: 1.95,
        skin: SKINS[1],
        top: [150, 30, 40],
        bottom: [200, 40, 50],
        border: [240, 190, 50],
        dress: "sari",
        head: "pallu",
        shawl: [80, 60, 90],
        bindi: true,
      },
      { la: 0.9, lf: 1.4, ra: 1.3 + serve, rf: 1.5 + serve, sit: true },
      shade,
      1,
    );
    drawFigure(
      ctx,
      mx + 0.6,
      my + 0.02,
      {
        h: 1.35,
        skin: SKINS[3],
        top: [220, 170, 40],
        bottom: [60, 70, 110],
        dress: "kurta",
        head: "topi",
        headColor: [40, 110, 170],
      },
      {
        la: 1.2,
        lf: 1.4,
        ra: 0.9 - serve,
        rf: 2.4 - serve,
        sit: true,
        hold: "leaf",
      },
      shade,
      -1,
    );
    drawFigure(
      ctx,
      mx + 1.9,
      my + 0.3,
      {
        h: 1.25,
        skin: SKINS[0],
        top: [200, 60, 120],
        bottom: [240, 120, 60],
        border: [250, 220, 90],
        dress: "frock",
        head: "bun",
        shawl: [230, 200, 60],
      },
      {
        la: 1.2,
        lf: 1.4,
        ra: 1.0 + serve,
        rf: 2.5 + serve,
        sit: true,
        hold: "leaf",
      },
      shade,
      -1,
    );
  }

  /** The chulha of clay, and the handi of khichdi on it for later. */
  private chulha(w: World, x: number, y: number, shade: Shade) {
    const { ctx, v, env, seconds, lights, hour } = w;
    if (!onScreen(v, x, y - 1, 3)) return;
    for (const s of this.steam) {
      const t = (s.t + seconds * 0.08) % 1;
      const sx = x + Math.sin(t * 6 + s.seed) * 0.12 + t * 0.5;
      const sy = y - 1.0 - t * 2.4;
      ctx.fillStyle = rgb(mix(hour.low, [255, 255, 255], 0.6), 0.2 * (1 - t) * Math.min(1, t * 4));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.12 + t * 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(40, 20, 10, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + 0.3, y + 0.02, 0.8, 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([150, 100, 64]);
    ctx.beginPath();
    ctx.moveTo(x - 0.55, y);
    ctx.lineTo(x - 0.5, y - 0.5);
    ctx.lineTo(x + 0.5, y - 0.5);
    ctx.lineTo(x + 0.55, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade([40, 20, 14]);
    ctx.beginPath();
    ctx.moveTo(x - 0.2, y);
    ctx.lineTo(x - 0.2, y - 0.26);
    ctx.quadraticCurveTo(x, y - 0.38, x + 0.2, y - 0.26);
    ctx.lineTo(x + 0.2, y);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 0.2, y - 0.4, 0.4, 0.4);
    ctx.clip();
    flame(ctx, x, y - 0.02, 0.3, seconds, 4);
    ctx.restore();
    lights.push({
      x,
      y: y - 0.12,
      r: 0.6,
      a: 0.5 * flicker(seconds, 4),
      color: FIRE,
    });
    // The handi: black with soot below, clay above; khichdi yellow with turmeric.
    ctx.fillStyle = shade([50, 36, 30]);
    ctx.beginPath();
    ctx.moveTo(x - 0.24, y - 0.98);
    ctx.bezierCurveTo(x - 0.62, y - 0.9, x - 0.55, y - 0.5, x, y - 0.48);
    ctx.bezierCurveTo(x + 0.55, y - 0.5, x + 0.62, y - 0.9, x + 0.24, y - 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade([150, 84, 50]);
    ctx.beginPath();
    ctx.ellipse(x, y - 0.98, 0.27, 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([232, 190, 60]);
    ctx.beginPath();
    ctx.ellipse(x, y - 0.98, 0.21, 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = shade([200, 160, 80]);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(x + 0.05, y - 0.99);
    ctx.lineTo(x + 0.42, y - 1.4);
    ctx.stroke();
    void env;
  }
}
