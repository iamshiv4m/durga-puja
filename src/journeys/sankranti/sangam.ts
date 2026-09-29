// The Sangam at Prayagraj before sunrise: the pale Ganga and the green Yamuna meeting, the tents
// and lights of the Magh Mela on the far sands, a pontoon bridge, boats and the winter gulls,
// pilgrims waist deep for the dip and the arghya, the pandas' umbrellas and a sadhu's dhuni.
import { TAU, clamp, flicker, flame, lerp, mix, mulberry32, onScreen, rgb, rise, type RGB } from "../paint";
import { drawFigure, SKINS, type Look, type Pose, type Shade } from "./people";
import { SANGAM, SHORE, paint, tone, spanX, type World } from "./world";

const GANGA: RGB = [168, 150, 118];
const YAMUNA: RGB = [58, 104, 112];
const SAND: RGB = [206, 180, 140];
const FIRE = "255, 130, 50";
const LAMP = "255, 170, 80";
const RIVER_END = SANGAM + 26;
/** How tall a person is who stands in the river at depth y. */
export const wader = (y: number) => 0.62 * y + 0.2;

type Bather = { x: number; y: number; look: Look; pose: Pose; facing: 1 | -1; dip?: boolean; arghya?: boolean; seed: number };
type Ring = { x: number; y: number; born: number; gold: boolean };

const SARIS: [RGB, RGB][] = [
  [[230, 120, 30], [200, 30, 40]],
  [[210, 40, 60], [240, 190, 50]],
  [[240, 196, 50], [200, 60, 30]],
  [[120, 60, 150], [240, 180, 60]],
  [[40, 130, 110], [240, 200, 80]],
  [[240, 236, 226], [200, 40, 40]],
];

export class Sangam {
  private readonly bathers: Bather[] = [];
  private readonly boats: { x: number; y: number; seed: number; facing: 1 | -1 }[] = [];
  private readonly gulls: { x: number; y: number; h: number; seed: number; sit: boolean }[] = [];
  private readonly umbrellas: { x: number; y: number; r: number; seed: number; flag: RGB }[] = [];
  private readonly glitter: { t: number; x: number; seed: number }[] = [];
  private readonly ripples: { x: number; y: number; seed: number }[] = [];
  private readonly mela: { x: number; w: number; h: number; kind: number }[] = [];
  private readonly donas: { x: number; y: number; seed: number }[] = [];
  private readonly smoke: { t: number; seed: number }[] = [];
  private rings: Ring[] = [];
  private nextDip = 0;

  constructor() {
    const random = mulberry32(1401);
    const look = (woman: boolean): Look => {
      const [cloth, border] = SARIS[Math.floor(random() * SARIS.length)];
      return woman
        ? { h: 1, skin: SKINS[Math.floor(random() * SKINS.length)], top: mix(cloth, [0, 0, 0], 0.2), bottom: cloth, border, dress: "sari", head: random() < 0.6 ? "pallu" : "bun", bindi: true }
        : { h: 1, skin: SKINS[Math.floor(random() * SKINS.length)], top: [0, 0, 0], bottom: [238, 232, 216], border: [200, 60, 40], dress: "bare", head: random() < 0.3 ? "topi" : "bare", headColor: [150, 40, 40] };
    };
    const namaskar: Pose = { la: 0.9, lf: 2.3, ra: 0.3, rf: 2.5 };
    // The one in front, pouring his arghya to the sun; his wife beside him, hands joined.
    this.bathers.push({ x: SANGAM - 3.1, y: 3.55, look: { ...look(false), head: "bare" }, pose: { la: 2.5, lf: 2.9, ra: 2.35, rf: 2.8, hold: "lota", tip: -2.2 }, facing: -1, arghya: true, seed: 1 });
    this.bathers.push({ x: SANGAM - 1.6, y: 3.3, look: { ...look(true), head: "pallu", bottom: SARIS[0][0], border: SARIS[0][1], top: [170, 70, 20] }, pose: namaskar, facing: -1, seed: 2 });
    this.bathers.push({ x: SANGAM - 5.6, y: 2.7, look: look(false), pose: namaskar, facing: -1, dip: true, seed: 3 });
    for (let i = 0; i < 26; i++) {
      const x = SANGAM - 16 + random() * 34;
      const y = 0.9 + random() ** 0.9 * 3.4;
      if (Math.abs(x - (SANGAM - 2.4)) < 2.2 && y > 2.6) continue;
      const woman = random() < 0.45;
      const arms = random();
      const pose: Pose = arms < 0.4 ? namaskar : arms < 0.7 ? { la: 2.2, lf: 2.8, ra: 2.3, rf: 2.9 } : { la: 0.3, lf: 0.6, ra: 0.4, rf: 0.8 };
      this.bathers.push({ x, y, look: look(woman), pose, facing: random() < 0.75 ? -1 : 1, seed: random() * 10, dip: random() < 0.15 });
    }
    this.bathers.sort((a, b) => a.y - b.y);

    for (const [x, y, facing] of [
      [-10.5, 1.3, 1],
      [6.5, 1.7, -1],
      [13.5, 2.5, -1],
      [-18, 2.1, 1],
    ] as const)
      this.boats.push({ x: SANGAM + x, y, seed: random() * 10, facing });
    for (let i = 0; i < 40; i++) {
      const sit = random() < 0.3;
      this.gulls.push({ x: SANGAM - 14 + random() * 32, y: 0.8 + random() * 3, h: sit ? 0 : 0.4 + random() * 2.4, seed: random() * 10, sit });
    }
    const flags: RGB[] = [
      [230, 90, 30],
      [220, 40, 50],
      [250, 200, 40],
      [40, 140, 80],
      [240, 240, 230],
    ];
    for (const [x, r] of [
      [3.6, 1.35],
      [6.9, 1.45],
      [10.3, 1.3],
      [13.6, 1.4],
      [-13.4, 1.3],
      [-16.6, 1.4],
    ])
      this.umbrellas.push({ x: SANGAM + x, y: SHORE + 0.7 + random() * 0.3, r, seed: random() * 10, flag: flags[Math.floor(random() * flags.length)] });
    for (let i = 0; i < 120; i++) this.glitter.push({ t: random(), x: random() - 0.5, seed: random() * 10 });
    for (let i = 0; i < 160; i++) this.ripples.push({ x: SANGAM - 30 + random() * 56, y: 0.06 + random() ** 1.4 * (SHORE - 0.2), seed: random() * 10 });
    // The tent city on the far sands: rows of tents, pandals, poles with flags and lights.
    for (let x = SANGAM - 40; x < RIVER_END + 4; x += 0.12 + random() * 0.3) {
      const kind = random();
      this.mela.push({ x, w: 0.1 + random() * 0.22, h: 0.06 + random() * 0.12, kind: kind < 0.1 ? 2 : kind < 0.2 ? 1 : 0 });
    }
    for (let i = 0; i < 14; i++) this.donas.push({ x: SANGAM - 9 + random() * 14, y: SHORE - 0.2 - random() * 1.4, seed: random() * 10 });
    for (let i = 0; i < 14; i++) this.smoke.push({ t: i / 14, seed: random() * 10 });
  }

  /** The river, from the far bank to the sand, with the sun's road on it. */
  water(w: World, sunX: number, sunA: number, sunR: number, sunColor: RGB) {
    const { ctx, v, env, hour, seconds } = w;
    const [left, right] = spanX(v, 1);
    const l = Math.max(left, SANGAM - 60);
    const r = Math.min(right, RIVER_END);
    if (r <= l) return;
    const g = ctx.createLinearGradient(0, 0, 0, SHORE);
    const sky = mix(hour.low, hour.top, 0.2);
    g.addColorStop(0, rgb(mix(sky, tone(GANGA, env), 0.25)));
    g.addColorStop(0.4, rgb(mix(mix(hour.top, hour.low, 0.4), tone(GANGA, env), 0.35)));
    g.addColorStop(1, rgb(mix(mix(hour.top, [6, 8, 20], 0.35), tone(GANGA, env), 0.3)));
    ctx.fillStyle = g;
    ctx.fillRect(l, 0, r - l, SHORE + 0.2);
    // The Yamuna comes in from the left, greener and darker, and you can see where they meet.
    ctx.fillStyle = rgb(tone(YAMUNA, env), 0.42 * (0.35 + 0.65 * env.amb));
    ctx.beginPath();
    ctx.moveTo(SANGAM - 60, 0);
    ctx.lineTo(SANGAM - 1.2, 0);
    ctx.bezierCurveTo(SANGAM - 0.4, 1.2, SANGAM + 2.6, 2.4, SANGAM + 1.2, SHORE + 0.2);
    ctx.lineTo(SANGAM - 60, SHORE + 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(mix(tone(GANGA, env), [255, 250, 230], 0.25), 0.18 * env.amb);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(SANGAM - 1.2, 0);
    ctx.bezierCurveTo(SANGAM - 0.4, 1.2, SANGAM + 2.6, 2.4, SANGAM + 1.2, SHORE + 0.2);
    ctx.stroke();

    // Faint ripples, longer as they come nearer.
    ctx.lineCap = "round";
    const light = rgb(mix(hour.low, [255, 255, 255], 0.3));
    const dark = rgb(mix(hour.top, [0, 0, 0], 0.5));
    for (const rp of this.ripples) {
      const x = rp.x + Math.sin(seconds * 0.3 + rp.seed) * 0.3;
      const len = 0.08 + rp.y * 0.1;
      if (x < l || x > r || !onScreen(v, x, rp.y, len)) continue;
      const on = 0.5 + 0.5 * Math.sin(seconds * 0.8 + rp.seed * 5);
      ctx.strokeStyle = rp.seed % 2 < 1 ? light : dark;
      ctx.globalAlpha = 0.22 * on * (0.3 + 0.7 * env.amb);
      ctx.lineWidth = (1 + rp.y * 0.25) / v.scale;
      ctx.beginPath();
      ctx.moveTo(x - len, rp.y);
      ctx.lineTo(x + len, rp.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The sun's road across the water: glints that widen as they come nearer.
    if (sunA > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgb(mix(sunColor, [255, 250, 230], 0.4));
      for (const gl of this.glitter) {
        const t = gl.t ** 1.7;
        const y = 0.02 + SHORE * t;
        const spread = sunR * (0.6 + t * 6);
        const x = sunX + gl.x * spread * 2 + Math.sin(seconds * 0.9 + gl.seed) * spread * 0.1;
        if (x < l || x > r) continue;
        const on = 0.5 + 0.5 * Math.sin(seconds * (1.5 + gl.seed * 0.3) + gl.seed * 7);
        const width = (0.04 + t * 0.4) * (0.4 + on);
        ctx.globalAlpha = sunA * on * (1 - Math.abs(gl.x) * 1.6) * (1 - t * 0.4) * 0.8;
        ctx.fillRect(x - width / 2, y, width, 0.012 + t * 0.03);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /** The far bank: the Mela's tents and lights, and the pontoon bridge coming across. */
  farBank(w: World) {
    const { ctx, v, env, hour, p, seconds, lights } = w;
    const [left, right] = spanX(v, 1);
    if (right < SANGAM - 42 || left > RIVER_END + 6) return;
    const bank = rgb(mix(mix(hour.low, hour.top, 0.55), [14, 12, 24], 0.5 + (1 - env.amb) * 0.3));
    ctx.fillStyle = bank;
    ctx.fillRect(Math.max(left, SANGAM - 42), -0.05, Math.min(right, RIVER_END + 6) - Math.max(left, SANGAM - 42), 0.06);
    const lit = 1 - rise(p, 0.07, 0.14);
    ctx.beginPath();
    for (const t of this.mela) {
      if (t.x < left || t.x > right) continue;
      if (t.kind === 2) {
        // A tall pole with a flag.
        ctx.rect(t.x, -0.62, 0.012, 0.6);
        ctx.moveTo(t.x + 0.012, -0.62);
        ctx.lineTo(t.x + 0.16, -0.58 + Math.sin(seconds * 3 + t.x) * 0.01);
        ctx.lineTo(t.x + 0.012, -0.54);
      } else if (t.kind === 1) {
        // A pandal: a big square tent with a peaked roof.
        ctx.rect(t.x - t.w, -t.h * 1.3, t.w * 2, t.h * 1.3);
        ctx.moveTo(t.x - t.w * 1.1, -t.h * 1.3);
        ctx.lineTo(t.x, -t.h * 2.2);
        ctx.lineTo(t.x + t.w * 1.1, -t.h * 1.3);
      } else {
        ctx.moveTo(t.x - t.w / 2, 0);
        ctx.lineTo(t.x, -t.h);
        ctx.lineTo(t.x + t.w / 2, 0);
      }
    }
    ctx.fill();
    // Trees behind, grey with distance.
    ctx.fillStyle = rgb(mix(mix(hour.low, hour.top, 0.5), [14, 12, 24], 0.35 + (1 - env.amb) * 0.3), 0.8);
    ctx.beginPath();
    for (let x = Math.floor(Math.max(left, SANGAM - 42) / 0.8) * 0.8; x < Math.min(right, RIVER_END + 6); x += 0.8) {
      const h = 0.1 + 0.08 * Math.sin(x * 1.7) + 0.06 * Math.sin(x * 4.1);
      ctx.moveTo(x, -0.05);
      ctx.ellipse(x, -0.08, 0.5, h + 0.06, 0, Math.PI, 0);
    }
    ctx.fill();
    // Its lights, still on before dawn.
    if (lit > 0.02) {
      for (const t of this.mela) {
        if (t.x < left || t.x > right || t.kind === 0) continue;
        const f = 0.6 + 0.4 * Math.sin(seconds * 2 + t.x * 9);
        ctx.fillStyle = `rgba(255, 210, 140, ${lit * f})`;
        ctx.fillRect(t.x, t.kind === 2 ? -0.64 : -t.h * 1.4, 0.03, 0.03);
        lights.push({ x: t.x, y: t.kind === 2 ? -0.62 : -t.h, r: 0.35, a: 0.25 * lit * f, color: LAMP });
      }
    }
    // The pontoon bridge: iron floats in a line, with the road over them.
    const bx = (t: number) => lerp(SANGAM + 13, SANGAM + 27, t);
    const by = (t: number) => lerp(0.02, 2.2, t * t);
    if (right > bx(0)) {
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        const x = bx(t);
        const y = by(t);
        const s = 0.08 + y * 0.18;
        ctx.fillStyle = paint([60, 58, 60], env);
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.9, s * 0.35, 0, 0, Math.PI);
        ctx.fill();
      }
      ctx.strokeStyle = paint([70, 60, 56], env);
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const s = 0.08 + by(t) * 0.18;
        if (i === 0) ctx.moveTo(bx(t), by(t) - s * 0.3);
        else ctx.lineTo(bx(t), by(t) - s * 0.3);
      }
      ctx.stroke();
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const s = 0.08 + by(t) * 0.18;
        if (i === 0) ctx.moveTo(bx(t), by(t) - s * 1.2);
        else ctx.lineTo(bx(t), by(t) - s * 1.2);
        if (i % 3 === 0) {
          ctx.moveTo(bx(t), by(t) - s * 0.3);
          ctx.lineTo(bx(t), by(t) - s * 1.2);
        }
      }
      ctx.stroke();
    }
  }

  /** Mist lying on the water, heaviest before sunrise. */
  mist(w: World) {
    const { ctx, v, hour } = w;
    if (hour.mist < 0.02) return;
    const [left, right] = spanX(v, 1);
    const l = Math.max(left, SANGAM - 60);
    const r = Math.min(right, RIVER_END + 8);
    if (r <= l) return;
    const c = mix(hour.low, [255, 255, 255], 0.3);
    const g = ctx.createLinearGradient(0, -0.6, 0, 3);
    g.addColorStop(0, rgb(c, 0));
    g.addColorStop(0.25, rgb(c, 0.45 * hour.mist));
    g.addColorStop(0.6, rgb(c, 0.16 * hour.mist));
    g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(l, -0.6, r - l, 3.6);
  }

  /** Gulls from the north that winter on the Sangam, wheeling over the boats. */
  birds(w: World) {
    const { ctx, v, env, seconds } = w;
    ctx.lineCap = "round";
    for (const g of this.gulls) {
      const drift = g.sit ? Math.sin(seconds * 0.2 + g.seed) * 0.2 : ((seconds * 0.4 * (0.6 + (g.seed % 1)) + g.seed * 3) % 12) - 6;
      const x = g.x + drift;
      const y = g.y - g.h - (g.sit ? 0 : Math.sin(seconds * 0.7 + g.seed) * 0.15);
      const s = 0.04 + g.y * 0.03;
      if (!onScreen(v, x, y, s * 4)) continue;
      ctx.strokeStyle = paint([244, 242, 236], env, 0.25);
      ctx.fillStyle = paint([244, 242, 236], env, 0.25);
      if (g.sit) {
        ctx.beginPath();
        ctx.ellipse(x, y - s * 0.3, s * 0.9, s * 0.35, 0, 0, TAU);
        ctx.fill();
        continue;
      }
      const flap = Math.sin(seconds * 8 + g.seed * 4);
      ctx.lineWidth = s * 0.35;
      ctx.beginPath();
      ctx.moveTo(x - s * 2, y - s * flap * 0.9);
      ctx.quadraticCurveTo(x - s * 0.8, y - s * (0.5 + flap * 0.4), x, y);
      ctx.quadraticCurveTo(x + s * 0.8, y - s * (0.5 + flap * 0.4), x + s * 2, y - s * flap * 0.9);
      ctx.stroke();
    }
  }

  private boat(w: World, b: { x: number; y: number; seed: number; facing: 1 | -1 }) {
    const { ctx, env, seconds } = w;
    const L = 0.5 + b.y * 0.7;
    const x = b.x + Math.sin(seconds * 0.1 + b.seed) * 0.4;
    const y = b.y + Math.sin(seconds * 1.1 + b.seed) * 0.01;
    const shade: Shade = (c, a = 1) => paint(c, env, 0, a);
    // Pilgrims sitting in it, wrapped in shawls; the boatman at the back with his long oar.
    const sitters: RGB[] = [
      [200, 60, 50],
      [236, 200, 60],
      [230, 226, 214],
    ];
    sitters.forEach((c, i) => {
      drawFigure(ctx, x + (i - 1) * L * 0.2, y - L * 0.08, { h: L * 0.34, skin: SKINS[i], top: c, bottom: c, dress: "kurta", head: i === 1 ? "pallu" : "topi", shawl: c, headColor: [90, 40, 30] }, { la: 0.3, lf: 0.8, ra: 0.3, rf: 0.8, sit: true }, shade, b.facing);
    });
    const bx = x - b.facing * L * 0.4;
    drawFigure(ctx, bx, y - L * 0.08, { h: L * 0.42, skin: SKINS[2], top: [120, 110, 100], bottom: [220, 214, 200], dress: "kurta", head: "topi", headColor: [60, 50, 50], shawl: [110, 96, 80] }, { la: 1.2, lf: 1.9, ra: 1.0, rf: 1.6, lean: 0.1 * b.facing }, shade, b.facing);
    ctx.strokeStyle = paint([110, 80, 50], env);
    ctx.lineWidth = L * 0.018;
    ctx.beginPath();
    ctx.moveTo(bx + b.facing * L * 0.1, y - L * 0.28);
    ctx.lineTo(bx - b.facing * L * 0.3, y + L * 0.06);
    ctx.stroke();
    // The hull: long, low and pointed, painted along the gunwale.
    ctx.fillStyle = paint([88, 56, 36], env);
    ctx.beginPath();
    ctx.moveTo(x - L / 2, y - L * 0.12);
    ctx.quadraticCurveTo(x - L * 0.35, y + L * 0.04, x, y + L * 0.04);
    ctx.quadraticCurveTo(x + L * 0.35, y + L * 0.04, x + L / 2, y - L * 0.12);
    ctx.lineTo(x + L * 0.42, y - L * 0.06);
    ctx.lineTo(x - L * 0.42, y - L * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([200, 150, 60], env);
    ctx.lineWidth = L * 0.012;
    ctx.beginPath();
    ctx.moveTo(x - L * 0.45, y - L * 0.08);
    ctx.quadraticCurveTo(x, y - L * 0.03, x + L * 0.45, y - L * 0.08);
    ctx.stroke();
    ctx.fillStyle = paint([40, 30, 40], env, 0, 0.25);
    ctx.beginPath();
    ctx.ellipse(x, y + L * 0.05, L * 0.5, L * 0.03, 0, 0, TAU);
    ctx.fill();
  }

  /** Everyone in the water, and the boats among them, back to front. */
  river(w: World, sunX: number, sunA: number) {
    const { ctx, v, env, seconds, lights, p } = w;
    this.rings = this.rings.filter((rg) => seconds - rg.born < 3.2);
    for (const rg of this.rings) {
      const age = seconds - rg.born;
      for (let k = 0; k < 3; k++) {
        const t = age - k * 0.35;
        if (t <= 0) continue;
        const rx = t * 0.5 * (0.4 + rg.y * 0.14);
        const a = (1 - t / 3) * 0.7;
        if (a <= 0) continue;
        ctx.strokeStyle = rgb(rg.gold ? [255, 214, 140] : mix(w.hour.low, [255, 250, 230], 0.4), a);
        ctx.lineWidth = Math.max(1.2 / v.scale, 0.012 * rg.y);
        ctx.beginPath();
        ctx.ellipse(rg.x, rg.y, rx, rx * 0.22, 0, 0, TAU);
        ctx.stroke();
      }
      if (rg.gold) lights.push({ x: rg.x, y: rg.y, r: 0.5 + age * 0.2, a: 0.4 * (1 - age / 3.2), color: "255, 200, 120" });
    }
    // Leaf donas with a lamp in each, set on the water before dawn.
    const lamps = 1 - rise(p, 0.12, 0.2);
    if (lamps > 0.01) {
      for (const d of this.donas) {
        const x = d.x + seconds * 0.04 + Math.sin(seconds * 0.3 + d.seed) * 0.1;
        const y = d.y + Math.sin(seconds * 0.9 + d.seed) * 0.02;
        const s = 0.06 + y * 0.03;
        if (!onScreen(v, x, y, 0.5)) continue;
        ctx.fillStyle = paint([60, 90, 40], env, 0.3);
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 150, 40, ${lamps})`;
        ctx.beginPath();
        ctx.arc(x - s * 0.3, y - s * 0.2, s * 0.14, 0, TAU);
        ctx.arc(x + s * 0.25, y - s * 0.15, s * 0.14, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.globalAlpha = lamps;
        flame(ctx, x, y - s * 0.2, s * 0.9, seconds, d.seed);
        ctx.restore();
        lights.push({ x, y: y - s * 0.5, r: s * 6, a: 0.45 * lamps * flicker(seconds, d.seed), color: LAMP });
      }
    }

    let boat = 0;
    const sunLeft = sunX;
    for (const b of this.bathers) {
      while (boat < this.boats.length && this.boats[boat].y < b.y) {
        const bt = this.boats[boat++];
        if (onScreen(v, bt.x, bt.y, 3)) this.boat(w, bt);
      }
      const H = wader(b.y);
      if (!onScreen(v, b.x, b.y - H * 0.3, H)) continue;
      let sink = 0;
      if (b.dip) {
        const phase = (seconds * 0.22 + b.seed) % 1;
        sink = phase < 0.22 ? Math.sin((phase / 0.22) * Math.PI) * 0.55 : 0;
        if (phase < 0.02 && seconds > this.nextDip && !w.reduced) {
          this.nextDip = seconds + 0.8;
          this.rings.push({ x: b.x, y: b.y, born: seconds, gold: false });
        }
      }
      const rim = sunA * (Math.sign(sunLeft - b.x) === b.facing ? 1 : 0.3) * clamp(1.1 - env.amb);
      const shade: Shade = (c, a = 1) => paint(c, env, rim * 0.35, a);
      // Reflection first, faint and broken.
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x - H, b.y, H * 2, H * 0.6);
      ctx.clip();
      ctx.translate(b.x, b.y);
      ctx.scale(1, -0.7);
      ctx.translate(-b.x, -b.y);
      ctx.globalAlpha = 0.18;
      drawFigure(ctx, b.x + Math.sin(seconds * 1.7 + b.seed) * H * 0.01, b.y + H * 0.5, { ...b.look, h: H }, b.pose, shade, b.facing);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x - H, b.y - H * 1.4, H * 2, H * 1.4);
      ctx.clip();
      const hands = drawFigure(ctx, b.x, b.y + H * (0.5 + sink), { ...b.look, h: H }, b.pose, shade, b.facing);
      ctx.restore();
      ctx.strokeStyle = rgb(mix(env.tint, [255, 255, 255], 0.3), 0.35);
      ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, H * 0.14, H * 0.025, 0, 0, TAU);
      ctx.stroke();
      if (b.arghya && sunA > 0.05) this.arghya(w, b, hands.right, H, sunA);
    }
    for (; boat < this.boats.length; boat++) {
      const bt = this.boats[boat];
      if (onScreen(v, bt.x, bt.y, 3)) this.boat(w, bt);
    }
  }

  /** Water poured from the lota in a thin bright stream, lit by the sun it is poured to. */
  private arghya(w: World, b: Bather, hand: { x: number; y: number }, H: number, sunA: number) {
    const { ctx, seconds, lights } = w;
    const x = hand.x + b.facing * H * 0.05;
    const y = hand.y - H * 0.01;
    ctx.strokeStyle = `rgba(255, 236, 196, ${0.8 * sunA})`;
    ctx.lineWidth = H * 0.012;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      ctx.lineTo(x + b.facing * H * 0.1 * t * t + Math.sin(seconds * 9 + t * 8) * H * 0.004, y + t * (b.y - y));
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 236, 196, ${0.35 * sunA})`;
    ctx.beginPath();
    ctx.ellipse(x + b.facing * H * 0.1, b.y, H * 0.06 * (1 + 0.2 * Math.sin(seconds * 6)), H * 0.012, 0, 0, TAU);
    ctx.fill();
    lights.push({ x: x + b.facing * H * 0.05, y: lerp(y, b.y, 0.5), r: H * 0.4, a: 0.25 * sunA, color: "255, 210, 150" });
  }

  /** The near sands: the pandas' umbrellas and flags, and the sadhus at their fire. */
  sands(w: World) {
    const { ctx, v, env, seconds, lights, hour } = w;
    const [left, right] = spanX(v, 1);
    if (left > RIVER_END + 2 || right < SANGAM - 60) return;
    const bottom = v.y + v.height / 2 / v.scale + 2;
    const l = Math.max(left, SANGAM - 60);
    const r = Math.min(right, RIVER_END + 2);
    const g = ctx.createLinearGradient(0, SHORE, 0, SHORE + 4);
    g.addColorStop(0, paint(mix(SAND, [120, 110, 100], 0.3), env));
    g.addColorStop(0.1, paint(SAND, env));
    g.addColorStop(1, paint(mix(SAND, [150, 110, 80], 0.4), env));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(l, SHORE + 0.1);
    for (let x = Math.floor(l); x <= r + 1; x += 1) ctx.lineTo(x, SHORE + 0.05 * Math.sin(x * 0.7) + 0.06);
    ctx.lineTo(r + 1, bottom);
    ctx.lineTo(l, bottom);
    ctx.closePath();
    ctx.fill();
    // Wet sand at the water's edge.
    ctx.fillStyle = rgb(mix(hour.low, [255, 255, 255], 0.2), 0.12);
    ctx.fillRect(l, SHORE + 0.02, r - l, 0.08);
    // Footprints and the tracks of carts.
    ctx.fillStyle = paint(mix(SAND, [90, 70, 50], 0.35), env, 0, 0.4);
    const random = mulberry32(55);
    for (let i = 0; i < 90; i++) {
      const x = SANGAM - 20 + random() * 44;
      const y = SHORE + 0.3 + random() ** 1.3 * 3;
      if (x < l || x > r) continue;
      ctx.beginPath();
      ctx.ellipse(x, y, 0.03 + y * 0.004, 0.012, 0, 0, TAU);
      ctx.fill();
    }

    const shade: Shade = (c, a = 1) => paint(c, env, 0, a);
    for (const u of this.umbrellas) {
      if (u.x < l - 2 || u.x > r + 2) continue;
      this.umbrella(w, u, shade);
    }
    this.dhuni(w, SANGAM - 8.2, SHORE + 1.7, shade);
    void lights;
    void seconds;
  }

  private umbrella(w: World, u: { x: number; y: number; r: number; seed: number; flag: RGB }, shade: Shade) {
    const { ctx, env, seconds } = w;
    const top = u.y - 2.3;
    // A tall bamboo with the panda's flag, his sign so that families find him year after year.
    const fx = u.x + u.r * 0.9;
    ctx.strokeStyle = paint([150, 120, 70], env);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(fx, u.y);
    ctx.lineTo(fx, u.y - 4.2);
    ctx.stroke();
    ctx.fillStyle = paint(u.flag, env);
    ctx.beginPath();
    ctx.moveTo(fx, u.y - 4.2);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      ctx.lineTo(fx + t * 0.9, u.y - 4.2 + Math.sin(seconds * 3 + t * 4 + u.seed) * 0.05 * t);
    }
    for (let i = 8; i >= 0; i--) {
      const t = i / 8;
      ctx.lineTo(fx + t * 0.9, u.y - 3.75 + Math.sin(seconds * 3 + t * 4 + u.seed) * 0.05 * t);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paint(mix(u.flag, [255, 255, 255], 0.6), env);
    ctx.beginPath();
    ctx.arc(fx + 0.42, u.y - 3.98 + Math.sin(seconds * 3 + 2 + u.seed) * 0.02, 0.1, 0, TAU);
    ctx.fill();
    // The takht, a low wooden platform, and the panda on it.
    ctx.fillStyle = paint([110, 76, 48], env);
    ctx.fillRect(u.x - u.r * 0.7, u.y - 0.34, u.r * 1.4, 0.1);
    ctx.fillRect(u.x - u.r * 0.66, u.y - 0.24, 0.06, 0.24);
    ctx.fillRect(u.x + u.r * 0.6, u.y - 0.24, 0.06, 0.24);
    ctx.fillStyle = paint([240, 234, 220], env);
    ctx.fillRect(u.x - u.r * 0.68, u.y - 0.38, u.r * 1.36, 0.05);
    drawFigure(ctx, u.x - 0.2, u.y - 0.36, { h: 1.35, skin: SKINS[0], top: [236, 190, 60], bottom: [240, 234, 222], dress: "kurta", head: "bare", shawl: [236, 170, 60] }, { la: 0.4, lf: 0.9, ra: 0.6, rf: 1.3, sit: true }, shade, -1);
    // His brass lota and a tray of sindoor and flowers.
    ctx.fillStyle = paint([214, 160, 70], env);
    ctx.beginPath();
    ctx.arc(u.x + 0.35, u.y - 0.45, 0.07, 0, TAU);
    ctx.fill();
    ctx.fillStyle = paint([240, 140, 30], env);
    ctx.beginPath();
    ctx.ellipse(u.x + 0.7, u.y - 0.41, 0.15, 0.03, 0, 0, TAU);
    ctx.fill();
    // The pole, and the great umbrella of bamboo and cloth.
    ctx.strokeStyle = paint([130, 100, 60], env);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y - 0.3);
    ctx.lineTo(u.x, top);
    ctx.stroke();
    const cloth = ctx.createLinearGradient(u.x - u.r, 0, u.x + u.r, 0);
    cloth.addColorStop(0, paint([150, 110, 70], env));
    cloth.addColorStop(0.5, paint([196, 156, 104], env));
    cloth.addColorStop(1, paint([130, 96, 60], env));
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(u.x - u.r, top + 0.42);
    ctx.quadraticCurveTo(u.x - u.r * 0.4, top - 0.1, u.x, top - 0.2);
    ctx.quadraticCurveTo(u.x + u.r * 0.4, top - 0.1, u.x + u.r, top + 0.42);
    for (let i = 8; i >= 0; i--) ctx.lineTo(u.x - u.r + (i / 8) * u.r * 2, top + 0.42 + (i % 2) * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint([90, 64, 40], env, 0, 0.7);
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      ctx.moveTo(u.x, top - 0.2);
      ctx.lineTo(u.x - u.r + (i / 8) * u.r * 2, top + 0.44);
    }
    ctx.stroke();
  }

  /** A sadhu's dhuni: the fire that is kept alight through the month, and two sadhus at it. */
  private dhuni(w: World, x: number, y: number, shade: Shade) {
    const { ctx, v, env, seconds, lights, p } = w;
    if (!onScreen(v, x, y - 1, 4)) return;
    const fire = 1 - 0.5 * rise(p, 0.16, 0.3);
    const lift = (1 - env.amb) * 0.9 * fire;
    const lit: Shade = (c, a = 1) => paint(c, env, lift, a);
    // Smoke going straight up in the still cold air, then leaning.
    for (const s of this.smoke) {
      const t = (s.t + seconds * 0.05) % 1;
      const sx = x + Math.sin(t * 5 + s.seed) * 0.1 + t * t * 1.4;
      const sy = y - 0.4 - t * 4;
      const r = 0.12 + t * 0.7;
      ctx.fillStyle = rgb(mix(w.hour.low, [200, 196, 190], 0.5), 0.14 * (1 - t) * fire);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    }
    drawFigure(ctx, x - 1.05, y + 0.05, { h: 1.7, skin: [150, 140, 128], top: [0, 0, 0], bottom: [226, 110, 30], dress: "sadhu", head: "jata", beard: [120, 116, 110] }, { la: 0.5, lf: 1.4, ra: 0.9, rf: 1.8, sit: true, hold: "trishul" }, lit, 1);
    drawFigure(ctx, x + 1.0, y + 0.15, { h: 1.9, skin: [140, 110, 90], top: [230, 120, 30], bottom: [230, 120, 30], dress: "kurta", head: "pagdi", headColor: [230, 120, 30], shawl: [214, 96, 30], beard: [60, 50, 40] }, { la: 1.3, lf: 1.6, ra: 1.1, rf: 1.5, lean: -0.1 }, lit, -1);
    // The ring of stones and the logs, and a pair of iron tongs, the chimta, stuck in the ash.
    ctx.fillStyle = shade([150, 146, 140]);
    ctx.beginPath();
    ctx.ellipse(x, y, 0.5, 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([70, 60, 56]);
    ctx.beginPath();
    ctx.ellipse(x, y - 0.02, 0.4, 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = lit([90, 60, 40]);
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(x - 0.35, y + 0.02);
    ctx.lineTo(x + 0.15, y - 0.12);
    ctx.moveTo(x + 0.35, y + 0.02);
    ctx.lineTo(x - 0.1, y - 0.14);
    ctx.stroke();
    ctx.strokeStyle = shade([60, 60, 64]);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x + 0.3, y - 0.05);
    ctx.lineTo(x + 0.42, y - 0.8);
    ctx.moveTo(x + 0.34, y - 0.05);
    ctx.lineTo(x + 0.48, y - 0.78);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = fire;
    flame(ctx, x - 0.1, y - 0.06, 0.5, seconds, 1);
    flame(ctx, x + 0.1, y - 0.04, 0.36, seconds * 1.1, 2);
    ctx.restore();
    const f = flicker(seconds, 3);
    lights.push({ x, y: y - 0.25, r: 0.9, a: 0.55 * fire * f, color: FIRE });
    lights.push({ x, y: y - 0.3, r: 3.2, a: (0.2 + 0.25 * (1 - env.amb)) * fire * f, color: FIRE });
  }

  /** A touch on the water: a ripple, gold once the sun is up. */
  touch(x: number, y: number, seconds: number, gold: boolean) {
    if (y < 0.3 || y > SHORE - 0.1 || x > RIVER_END - 1) return false;
    this.rings.push({ x, y, born: seconds, gold });
    if (this.rings.length > 24) this.rings.shift();
    return true;
  }
}
