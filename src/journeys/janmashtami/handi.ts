// Gopalkala in Maharashtra: a street between two chawls, their galleries full of people, and high
// over it on a rope an earthen handi of curd and butter hung with marigolds. Below it a govinda
// pathak builds its pyramid, tier on shoulders on tier, while the balconies throw water and a
// dhol-tasha band plays; the smallest climbs last and breaks the pot.
import { TAU, clamp, lerp, mix, mulberry32, onScreen, rgb, rise, type Ctx, type RGB, type View } from "../paint";
import type { Emit, Frame } from "../types";
import type { Light } from "./fort";
import { SKIN, drawPerson, type Look, type Pose } from "./people";
import { HANDI, MOMENTS } from "./world";

const X = HANDI.x;
const FLOOR = 2.4;
const RES = 70;
const TIERS = [9, 6, 5, 4, 3, 2, 1];
const LEFT = { x: X - 10.4, w: 6.8, wall: [150, 190, 172] as RGB, rail: [40, 90, 100] as RGB };
const RIGHT = { x: X + 3.6, w: 6.8, wall: [228, 200, 130] as RGB, rail: [120, 50, 40] as RGB };
const ROPE = { y: -10.0, sag: 0.35 };

type Particle = { x: number; y: number; vx: number; vy: number; age: number; life: number; kind: "shard" | "curd" | "flower" | "water"; r: number; spin: number };

const SHIRTS: RGB[] = [
  [240, 120, 30],
  [230, 100, 20],
  [250, 140, 40],
];

export class Handi {
  private readonly emit: Emit;
  private readonly buildings: { canvas: HTMLCanvasElement | null; spec: typeof LEFT }[] = [
    { canvas: null, spec: LEFT },
    { canvas: null, spec: RIGHT },
  ];
  private readonly govindas: Look[][] = [];
  private readonly crowd: { x: number; y: number; look: Look; seed: number }[] = [];
  private readonly throwers: { x: number; floor: number; look: Look; seed: number; facing: 1 | -1 }[] = [];
  private readonly towers: { x: number; w: number; h: number }[] = [];
  private particles: Particle[] = [];
  private taps = 0;
  private built = 0;
  private smashedByTap = false;
  private broken = false;
  private lastTier = 0;
  private lastSeconds = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(8508);
    TIERS.forEach((n, tier) => {
      const row: Look[] = [];
      for (let i = 0; i < n; i++) {
        const child = tier === TIERS.length - 1;
        row.push({
          h: child ? 1.02 : 1.6 + random() * 0.08,
          skin: SKIN[Math.floor(random() * SKIN.length)],
          top: SHIRTS[(i + tier) % SHIRTS.length],
          bottom: tier < 2 ? [40, 44, 60] : [230, 226, 214],
          wrap: [200, 30, 40],
          head: "band",
          dress: "shorts",
        });
      }
      this.govindas.push(row);
    });
    const colours: RGB[] = [
      [240, 120, 30],
      [230, 230, 220],
      [60, 110, 180],
      [200, 40, 60],
      [240, 190, 40],
      [70, 150, 100],
    ];
    for (let i = 0; i < 26; i++) {
      const woman = random() < 0.4;
      const c = colours[Math.floor(random() * colours.length)];
      this.crowd.push({
        x: X - 8.5 + i * 0.68 + (random() - 0.5) * 0.3,
        y: 1.9 + random() * 0.6,
        look: woman
          ? { h: 1.55, skin: SKIN[i % 5], top: c, bottom: c, wrap: c, head: "pallu", dress: "sari", woman, border: [240, 196, 90] }
          : { h: 1.72, skin: SKIN[(i + 2) % 5], top: c, bottom: [50, 54, 70], wrap: [200, 30, 40], head: random() < 0.5 ? "band" : "bare", dress: "pyjama" },
        seed: random() * 10,
      });
    }
    const thrower = (x: number, floor: number, facing: 1 | -1, i: number) => {
      const woman = i % 2 === 0;
      const c = colours[(i + 1) % colours.length];
      this.throwers.push({
        x,
        floor,
        facing,
        seed: random() * 10,
        look: woman
          ? { h: 1.55, skin: SKIN[i % 5], top: c, bottom: c, wrap: c, head: "pallu", dress: "sari", woman }
          : { h: 1.7, skin: SKIN[(i + 3) % 5], top: c, bottom: [60, 60, 70], wrap: [0, 0, 0], head: "bare", dress: "pyjama" },
      });
    };
    thrower(X - 4.4, 3, 1, 0);
    thrower(X - 6.2, 2, 1, 1);
    thrower(X - 4.9, 1, 1, 2);
    thrower(X + 4.3, 3, -1, 3);
    thrower(X + 5.4, 2, -1, 4);
    thrower(X + 4.6, 1, -1, 5);
    let x = X - 26;
    for (let guard = 0; x < X + 26 && guard < 100; guard++) {
      const w = 1.4 + random() * 2.6;
      this.towers.push({ x, w, h: 10 + random() * 9 });
      x += w + random() * 0.8;
    }
  }

  private seen(v: View) {
    return onScreen(v, X, -5, 13);
  }

  /** The pyramid's height: by scroll alone it rises through the chapter; taps add to it. */
  private height(p: number) {
    const scroll = 6 * rise(p, MOMENTS.pyramid[0], MOMENTS.pyramid[1]) + rise(p, MOMENTS.climb[0], MOMENTS.climb[1]);
    return Math.min(7, Math.max(scroll, this.built));
  }

  draw(ctx: Ctx, v: View, f: Frame, lights: Light[]) {
    const { p, seconds } = f;
    const dt = Math.max(0, Math.min(0.05, seconds - this.lastSeconds));
    this.lastSeconds = seconds;
    if (p < MOMENTS.flight2[0] - 0.01) {
      this.taps = 0;
      this.built = 0;
      this.smashedByTap = false;
    }
    this.built = lerp(this.built, this.taps, 1 - Math.exp(-dt * 3));
    const B = this.height(p);
    const tier = Math.floor(B + 0.02);
    if (tier > this.lastTier && p > MOMENTS.flight2[1] - 0.01 && p < 0.83) this.emit(tier >= 7 ? "climb" : "govinda");
    this.lastTier = tier;
    const smashed = this.smashedByTap || (p >= MOMENTS.smash && B > 6.9);
    if (smashed && !this.broken && p < 0.83) this.smash();
    if (!smashed && this.broken) {
      this.broken = false;
      this.particles = [];
    }
    this.step(dt);
    if (!this.seen(v) || p < 0.64 || p > 0.87) return;
    const joy = smashed ? 1 : 0;

    // Far off, the towers of the city in the monsoon haze.
    ctx.fillStyle = "rgba(150, 160, 172, 0.8)";
    for (const t of this.towers) ctx.fillRect(t.x, -t.h, t.w, t.h + 0.1);
    ctx.fillStyle = "rgba(200, 206, 212, 0.35)";
    for (const t of this.towers) for (let y = -t.h + 0.6; y < -0.5; y += 0.9) ctx.fillRect(t.x + 0.2, y, t.w - 0.4, 0.12);
    // The street, wet.
    const road = ctx.createLinearGradient(0, 0, 0, 4);
    road.addColorStop(0, "#6a6a70");
    road.addColorStop(1, "#3a3a42");
    ctx.fillStyle = road;
    ctx.fillRect(X - 20, -0.02, 40, 12);
    ctx.fillStyle = "rgba(220, 225, 235, 0.18)";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(X - 6 + i * 2.1, 1.1 + (i % 3) * 0.5, 0.9, 0.08, 0, 0, TAU);
      ctx.fill();
    }
    for (const b of this.buildings) {
      b.canvas ??= paintChawl(b.spec);
      ctx.drawImage(b.canvas, b.spec.x - 0.2, -4 * FLOOR - 1.0, b.spec.w + 0.4, 4 * FLOOR + 1.0);
    }
    // People in the galleries, and their buckets of water.
    for (const t of this.throwers) {
      const base = -t.floor * FLOOR;
      const cycle = (seconds * 0.45 + t.seed) % 1;
      const heave = cycle < 0.5 ? Math.sin((cycle / 0.5) * Math.PI) : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(t.x - 1, base - 3, 2, 3 - 0.85);
      ctx.clip();
      const hands = drawPerson(ctx, t.x, base, t.look, { la: lerp(0.5, 2.4, heave), lf: lerp(1.2, 2.5, heave), ra: lerp(0.5, 2.4, heave), rf: lerp(1.2, 2.5, heave) }, t.facing);
      ctx.restore();
      ctx.fillStyle = "#3a6ab0";
      ctx.beginPath();
      ctx.moveTo(hands.right.x - 0.14, hands.right.y - 0.05);
      ctx.lineTo(hands.right.x + 0.14, hands.right.y - 0.05);
      ctx.lineTo(hands.right.x + 0.1, hands.right.y + 0.18);
      ctx.lineTo(hands.right.x - 0.1, hands.right.y + 0.18);
      ctx.fill();
      if (p > MOMENTS.flight2[1] - 0.005 && p < 0.822 && Math.abs(cycle - 0.25) < dt * 0.45 + 0.004 && this.particles.length < 600) this.pour(hands.right.x, hands.right.y, t.facing);
    }
    // Bunting strung across the street.
    for (const [y, sag] of [
      [-7.4, 0.5],
      [-5.0, 0.4],
    ]) {
      const a = LEFT.x + LEFT.w;
      const b = RIGHT.x;
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(a, y);
      ctx.quadraticCurveTo(X, y + sag * 2, b, y);
      ctx.stroke();
      const n = 16;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const fx = lerp(a, b, t);
        const fy = y + sag * 4 * t * (1 - t) + Math.sin(seconds * 3 + i) * 0.01;
        ctx.fillStyle = ["#f07a1a", "#f6f0e0", "#2a8a4a", "#e03a3a", "#f6c030"][i % 5];
        ctx.beginPath();
        ctx.moveTo(fx - 0.14, fy);
        ctx.lineTo(fx + 0.14, fy);
        ctx.lineTo(fx, fy + 0.3);
        ctx.fill();
      }
    }

    // The rope, and the handi on it.
    const sway = Math.sin(seconds * 1.1) * 0.05 * (smashed ? 0.3 : 1);
    ctx.strokeStyle = "#8a7050";
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(LEFT.x + LEFT.w, ROPE.y);
    ctx.quadraticCurveTo(X, ROPE.y + ROPE.sag * 2, RIGHT.x, ROPE.y);
    ctx.stroke();
    const hang = { x: X, y: ROPE.y + ROPE.sag };
    const pot = { x: X + sway * 6, y: HANDI.pot };
    ctx.beginPath();
    ctx.moveTo(hang.x, hang.y);
    ctx.lineTo(pot.x, pot.y - 0.45);
    ctx.stroke();
    this.pot(ctx, pot.x, pot.y, smashed, seconds);

    // The pyramid, tier by tier from the ground.
    const tierY = (i: number) => HANDI.base - i * HANDI.tier;
    const climbers: { x: number; y: number; look: Look; pose: Pose; alpha: number }[] = [];
    for (let i = 0; i < TIERS.length; i++) {
      const n = TIERS[i];
      const t = clamp(B - i);
      if (t <= 0) continue;
      const wobble = Math.sin(seconds * 1.4 + i * 0.7) * 0.025 * i * (smashed ? 0.4 : 1);
      for (let j = 0; j < n; j++) {
        const order = n === 1 ? 0 : Math.abs(j - (n - 1) / 2) / ((n - 1) / 2);
        const start = (1 - order) * 0.6;
        const c = clamp((t - start) / 0.4);
        if (c <= 0) continue;
        const ease = 1 - (1 - c) ** 3;
        const x = X + (j - (n - 1) / 2) * (i === 0 ? 0.42 : 0.4) + wobble;
        const y = lerp(tierY(Math.max(0, i - 1)) + (i === 0 ? 0.6 : 0), tierY(i), ease);
        const top = i === TIERS.length - 1;
        const pose: Pose = top
          ? { la: smashed ? 2.9 : lerp(0.3, 2.6, ease), lf: smashed ? 3.1 : 2.8, ra: smashed ? 3.0 : lerp(0.3, 2.0, ease), rf: 3.0, bob: smashed ? -Math.abs(Math.sin(seconds * 5)) * 0.03 : 0 }
          : {
              la: -1.45 + (smashed && i > 2 && j === 0 ? 3.9 : 0),
              lf: -1.6 + (smashed && i > 2 && j === 0 ? 4.5 : 0),
              ra: 1.45,
              rf: 1.6,
              lean: 0,
            };
        climbers.push({ x, y, look: this.govindas[i][j], pose, alpha: Math.min(1, c * 3) });
      }
    }
    // Supporters crowding in round the base: the thar.
    if (B > 0.2) {
      const base = clamp(B * 2);
      for (let k = 0; k < 10; k++) {
        const x = X + (k - 4.5) * 0.46;
        ctx.globalAlpha = base;
        drawPerson(ctx, x, HANDI.base + 0.32, this.govindas[0][k % 9], { la: 2.3, lf: 2.6, ra: 2.1, rf: 2.5, lean: 0.02 * Math.sin(k) }, k % 2 ? 1 : -1);
      }
      ctx.globalAlpha = 1;
    }
    for (const c of climbers) {
      ctx.globalAlpha = c.alpha;
      drawPerson(ctx, c.x, c.y, c.look, c.pose);
    }
    ctx.globalAlpha = 1;

    // The dhol-tasha pathak, at the side of the street.
    this.band(ctx, X - 7.2, 1.35, seconds, B);

    // The crowd, nearest of all, hands up when the pot breaks.
    for (const c of this.crowd) {
      const cheer = Math.max(joy, 0.3 * Math.abs(Math.sin(seconds * 2 + c.seed)));
      const hop = joy * Math.abs(Math.sin(seconds * 6 + c.seed)) * 0.06;
      drawPerson(ctx, c.x, c.y, c.look, { la: lerp(0.3, 2.8, cheer), lf: lerp(0.4, 3.0, cheer), ra: lerp(0.4, 2.6, cheer * (0.5 + (c.seed % 1) * 0.5)), rf: lerp(0.5, 2.9, cheer), bob: -hop });
    }

    this.drawParticles(ctx);
    lights.push({ x: pot.x, y: pot.y, r: 1.8, a: 0.12, color: "255, 230, 180" });
  }

  /** The earthen pot, painted, with a marigold garland; or what is left of it. */
  private pot(ctx: Ctx, x: number, y: number, broken: boolean, seconds: number) {
    const r = 0.44;
    if (broken) {
      // Only the neck is left on the cord, dripping.
      ctx.fillStyle = "#9a4a2a";
      ctx.beginPath();
      ctx.moveTo(x - 0.22, y - 0.45);
      ctx.lineTo(x + 0.22, y - 0.45);
      ctx.lineTo(x + 0.3, y - 0.2);
      ctx.lineTo(x + 0.1, y - 0.28);
      ctx.lineTo(x - 0.05, y - 0.16);
      ctx.lineTo(x - 0.28, y - 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(250, 246, 234, 0.9)";
      const drip = (seconds * 1.5) % 1;
      ctx.beginPath();
      ctx.arc(x, y - 0.15 + drip * 0.5, 0.035 * (1 - drip), 0, TAU);
      ctx.fill();
      return;
    }
    const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.3, r * 0.1, x, y, r * 1.1);
    body.addColorStop(0, "#d8783e");
    body.addColorStop(0.7, "#a24a24");
    body.addColorStop(1, "#6a2c16");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8a3a1e";
    ctx.fillRect(x - r * 0.45, y - r * 1.12, r * 0.9, r * 0.3);
    ctx.fillStyle = "#b85a30";
    ctx.beginPath();
    ctx.ellipse(x, y - r * 1.12, r * 0.55, r * 0.1, 0, 0, TAU);
    ctx.fill();
    // Butter at the mouth.
    ctx.fillStyle = "#fbf6e2";
    ctx.beginPath();
    ctx.ellipse(x, y - r * 1.16, r * 0.4, r * 0.12, 0, Math.PI, 0);
    ctx.fill();
    // White paint: dots and a band of triangles.
    ctx.fillStyle = "rgba(250, 244, 230, 0.9)";
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + i * 0.22;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * r * 0.95, y - r * 0.15);
      ctx.lineTo(x + Math.sin(a + 0.11) * r * 0.95, y + r * 0.1);
      ctx.lineTo(x + Math.sin(a + 0.22) * r * 0.95, y - r * 0.15);
      ctx.fill();
    }
    // A marigold garland round the belly, and one hanging below.
    for (let i = 0; i < 13; i++) {
      const a = -1.2 + (i / 12) * 2.4;
      ctx.fillStyle = i % 2 ? "#f08a18" : "#f6c030";
      ctx.beginPath();
      ctx.arc(x + Math.sin(a) * r, y - r * 0.35 + Math.cos(a) * 0.04, 0.06, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "#f08a18" : "#f6c030";
      ctx.beginPath();
      ctx.arc(x + Math.sin(seconds * 1.3) * 0.02 * i, y + r + 0.06 + i * 0.11, 0.055, 0, TAU);
      ctx.fill();
    }
  }

  private band(ctx: Ctx, x: number, y: number, seconds: number, B: number) {
    const beat = seconds * 4.2;
    // A flag bearer with the saffron flag.
    const flag = drawPerson(ctx, x - 1.1, y + 0.2, this.crowd[0].look, { la: 2.7, lf: 2.9, ra: 2.5, rf: 2.8 });
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(flag.left.x, flag.left.y + 0.6);
    ctx.lineTo(flag.left.x, flag.left.y - 1.4);
    ctx.stroke();
    ctx.fillStyle = "#f07a1a";
    ctx.beginPath();
    ctx.moveTo(flag.left.x, flag.left.y - 1.4);
    for (let k = 0; k <= 6; k++) ctx.lineTo(flag.left.x + k * 0.18, flag.left.y - 1.35 + Math.sin(seconds * 5 - k * 0.8) * 0.06 * k * 0.4 + k * 0.03);
    ctx.lineTo(flag.left.x + 1.0, flag.left.y - 0.75 + Math.sin(seconds * 5 - 5) * 0.08);
    ctx.lineTo(flag.left.x, flag.left.y - 0.8);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const px = x + k * 0.75;
      const hit = Math.max(0, Math.sin(beat * Math.PI + k));
      const look = this.govindas[1][k];
      const hands = drawPerson(ctx, px, y + (k % 2) * 0.15, look, { la: 1.0 + hit * 0.5, lf: 1.6 + hit * 0.5, ra: 0.9, rf: 1.5 - hit * 0.3 });
      // The dhol, slung across the waist, and its stick.
      ctx.fillStyle = "#7a2a1a";
      ctx.beginPath();
      ctx.ellipse(px + 0.12, y - look.h * 0.48 + (k % 2) * 0.15, 0.22, 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#e8d4a0";
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.ellipse(px + 0.12, y - look.h * 0.48 + (k % 2) * 0.15, 0.22, 0.26, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "#3a2410";
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(hands.left.x, hands.left.y);
      ctx.lineTo(hands.left.x + 0.2, hands.left.y + 0.1);
      ctx.stroke();
    }
    void B;
  }

  private pour(x: number, y: number, facing: number) {
    const random = Math.random;
    for (let i = 0; i < 26; i++) {
      this.particles.push({
        x: x + (random() - 0.5) * 0.2,
        y,
        vx: facing * (1.6 + random() * 1.6),
        vy: -0.6 - random() * 1.2,
        age: 0,
        life: 1.6,
        kind: "water",
        r: 0.03 + random() * 0.03,
        spin: 0,
      });
    }
  }

  private smash() {
    this.broken = true;
    this.emit("smash");
    const random = Math.random;
    const x = X;
    const y = HANDI.pot;
    for (let i = 0; i < 16; i++) {
      const a = random() * TAU;
      const s = 1.5 + random() * 3;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, age: 0, life: 2.5, kind: "shard", r: 0.08 + random() * 0.1, spin: (random() - 0.5) * 10 });
    }
    for (let i = 0; i < 70; i++) {
      const a = random() * TAU;
      const s = 0.8 + random() * 3.5;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, age: 0, life: 2.2, kind: "curd", r: 0.04 + random() * 0.07, spin: 0 });
    }
    for (let i = 0; i < 90; i++) {
      const a = random() * TAU;
      const s = 0.5 + random() * 2.5;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, age: 0, life: 6, kind: "flower", r: 0.05 + random() * 0.03, spin: random() * 6 });
    }
  }

  private step(dt: number) {
    if (dt <= 0) return;
    for (const pt of this.particles) {
      pt.age += dt;
      const g = pt.kind === "flower" ? 1.2 : 9;
      const drag = pt.kind === "flower" ? 2.2 : 0.3;
      pt.vx -= pt.vx * drag * dt;
      pt.vy += g * dt - (pt.kind === "flower" ? pt.vy * drag * dt : 0);
      pt.x += pt.vx * dt + (pt.kind === "flower" ? Math.sin(pt.age * 3 + pt.spin) * 0.01 : 0);
      pt.y += pt.vy * dt;
    }
    this.particles = this.particles.filter((pt) => pt.age < pt.life && pt.y < 3);
  }

  private drawParticles(ctx: Ctx) {
    for (const pt of this.particles) {
      const fade = 1 - pt.age / pt.life;
      if (pt.kind === "water") {
        ctx.strokeStyle = `rgba(200, 225, 245, ${0.7 * fade})`;
        ctx.lineWidth = pt.r;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - pt.vx * 0.04, pt.y - pt.vy * 0.04);
        ctx.stroke();
      } else if (pt.kind === "shard") {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.age * pt.spin);
        ctx.fillStyle = `rgba(168, 76, 40, ${fade})`;
        ctx.beginPath();
        ctx.moveTo(-pt.r, -pt.r * 0.5);
        ctx.lineTo(pt.r, -pt.r * 0.3);
        ctx.lineTo(pt.r * 0.2, pt.r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = pt.kind === "curd" ? `rgba(252, 248, 236, ${fade})` : pt.spin > 3 ? `rgba(246, 160, 30, ${fade})` : `rgba(246, 196, 48, ${fade})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
        ctx.fill();
      }
    }
  }

  pointer(world: { x: number; y: number }, kind: "down" | "move" | "up", f: Frame) {
    if (kind !== "down" || f.p < MOMENTS.flight2[1] - 0.005 || f.p > 0.815 || this.broken) return;
    const B = this.height(f.p);
    if (B > 6.9 && Math.hypot(world.x - X, world.y - HANDI.pot) < 1.6) {
      this.smashedByTap = true;
      return;
    }
    if (this.taps < 7) {
      this.taps = Math.min(7, Math.max(this.taps, Math.floor(B + 0.02)) + 1);
      this.emit("add");
    }
  }
}

/** One chawl, painted once: four floors of galleries with railings, doors, laundry and plants. */
function paintChawl(spec: typeof LEFT) {
  const w = spec.w + 0.4;
  const h = 4 * FLOOR + 1.0;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * RES);
  canvas.height = Math.round(h * RES);
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  g.translate(0.2, 1.0);
  const random = mulberry32(Math.round(spec.x * 10));
  const wall = spec.wall;
  const W = spec.w;
  g.fillStyle = rgb(wall);
  g.fillRect(0, -1.0, W, 4 * FLOOR + 1.0);
  // Rain stains down the plaster.
  for (let i = 0; i < 14; i++) {
    const x = random() * W;
    const top = -1 + random() * 6;
    const grad = g.createLinearGradient(0, top, 0, top + 2 + random() * 3);
    grad.addColorStop(0, rgb(mix(wall, [40, 40, 40], 0.3), 0.35));
    grad.addColorStop(1, rgb(wall, 0));
    g.fillStyle = grad;
    g.fillRect(x, top, 0.2 + random() * 0.5, 5);
  }
  // Parapet.
  g.fillStyle = rgb(mix(wall, [255, 255, 255], 0.2));
  g.fillRect(-0.2, -1.0, W + 0.4, 0.25);
  for (let floor = 0; floor < 4; floor++) {
    const top = floor * FLOOR;
    const bottom = top + FLOOR;
    if (floor === 3) {
      // Shops on the street: rolling shutters, one open with a lit counter.
      for (let s = 0; s < 3; s++) {
        const sx = 0.3 + s * (W / 3);
        const sw = W / 3 - 0.5;
        const open = s === 1;
        g.fillStyle = open ? "#3a2a20" : "#8a8a90";
        g.fillRect(sx, top + 0.6, sw, FLOOR - 0.6);
        if (!open) {
          g.strokeStyle = "rgba(60, 60, 66, 0.6)";
          g.lineWidth = 0.02;
          g.beginPath();
          for (let y = top + 0.7; y < bottom; y += 0.12) {
            g.moveTo(sx, y);
            g.lineTo(sx + sw, y);
          }
          g.stroke();
        } else {
          g.fillStyle = "#e8c070";
          g.fillRect(sx, bottom - 0.8, sw, 0.12);
          for (let k = 0; k < 6; k++) {
            g.fillStyle = ["#e03a3a", "#f6c030", "#2a8a4a", "#3a6ab0"][k % 4];
            g.fillRect(sx + 0.15 + k * 0.28, top + 0.9, 0.18, 0.3);
          }
        }
        g.fillStyle = ["#c83030", "#2a6ab0", "#e0a020"][s];
        g.fillRect(sx - 0.05, top + 0.1, sw + 0.1, 0.4);
      }
      continue;
    }
    // Doors and windows along the gallery.
    for (let d = 0; d < 4; d++) {
      const dx = 0.4 + d * (W / 4);
      g.fillStyle = ["#2a5a8a", "#8a3a2a", "#3a6a3a", "#6a3a7a"][(d + floor) % 4];
      g.fillRect(dx, top + 0.45, 0.62, FLOOR - 0.45);
      g.fillStyle = "rgba(20, 16, 14, 0.8)";
      g.fillRect(dx + 0.85, top + 0.75, 0.55, 0.7);
      g.strokeStyle = rgb(spec.rail);
      g.lineWidth = 0.03;
      g.beginPath();
      for (let k = 1; k < 4; k++) {
        g.moveTo(dx + 0.85 + k * 0.14, top + 0.75);
        g.lineTo(dx + 0.85 + k * 0.14, top + 1.45);
      }
      g.stroke();
    }
    // Laundry on a line across the gallery.
    g.strokeStyle = "rgba(60, 60, 60, 0.6)";
    g.lineWidth = 0.015;
    g.beginPath();
    g.moveTo(0.2, top + 0.35);
    g.lineTo(W - 0.2, top + 0.35);
    g.stroke();
    for (let k = 0; k < 7; k++) {
      if (random() < 0.3) continue;
      g.fillStyle = ["#e03a3a", "#f6f0e0", "#3a6ab0", "#f6c030", "#9a4aa0"][Math.floor(random() * 5)];
      const cx = 0.4 + random() * (W - 0.8);
      g.fillRect(cx, top + 0.35, 0.28 + random() * 0.3, 0.35 + random() * 0.4);
    }
    // The gallery's floor slab and its railing.
    g.fillStyle = rgb(mix(wall, [0, 0, 0], 0.25));
    g.fillRect(-0.2, bottom - 0.12, W + 0.4, 0.18);
    g.strokeStyle = rgb(spec.rail);
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(-0.1, bottom - 0.85);
    g.lineTo(W + 0.1, bottom - 0.85);
    g.moveTo(-0.1, bottom - 0.5);
    g.lineTo(W + 0.1, bottom - 0.5);
    g.stroke();
    g.lineWidth = 0.025;
    g.beginPath();
    for (let x = -0.05; x < W + 0.1; x += 0.16) {
      g.moveTo(x, bottom - 0.85);
      g.lineTo(x, bottom - 0.12);
    }
    g.stroke();
    // A tulsi pot or two on the ledge.
    for (let k = 0; k < 2; k++) {
      const px = 0.6 + random() * (W - 1.2);
      g.fillStyle = "#a0522d";
      g.fillRect(px, bottom - 1.1, 0.24, 0.25);
      g.fillStyle = "#3a8a3a";
      g.beginPath();
      g.arc(px + 0.12, bottom - 1.2, 0.16, 0, TAU);
      g.fill();
    }
  }
  return canvas;
}
