// A Vrindavan temple on Janmashtami night, today: a sandstone hall of cusped arches under a shikhara
// strung with lights, the sanctum curtain drawn back at midnight, and before it the jhula, a silver
// swing heaped with flowers, with Laddu Gopal in it. Fifty-six dishes of chhappan bhog on the steps,
// the pujari with the aarti, the conch, the bells, and the devotees who have fasted until now.
import {
  TAU,
  clamp,
  flame,
  flicker,
  lerp,
  mix,
  mulberry32,
  onScreen,
  rgb,
  rise,
  type Ctx,
  type RGB,
  type View,
} from "../paint";
import type { Emit, Frame } from "../types";
import { TORCH, type Light } from "./fort";
import { SKIN, drawPerson, type Look } from "./people";
import { MOMENTS, TEMPLE, cut } from "./world";

const X = TEMPLE.x;
const STONE: RGB = [196, 132, 104];
const STONE_DARK: RGB = [120, 70, 60];
const MARBLE: RGB = [236, 224, 206];
const BULB = "255, 196, 110";
const GOLD = "255, 206, 120";

const PUJARI: Look = {
  h: 1.74,
  skin: SKIN[1],
  top: [0, 0, 0],
  bottom: [236, 170, 40],
  wrap: [0, 0, 0],
  head: "shikha",
  dress: "dhoti",
  bare: true,
  shawl: [220, 90, 30],
};
const CONCH: Look = {
  h: 1.7,
  skin: SKIN[0],
  top: [0, 0, 0],
  bottom: [240, 230, 210],
  wrap: [0, 0, 0],
  head: "shikha",
  dress: "dhoti",
  bare: true,
  shawl: [230, 180, 50],
};

type Dish = { x: number; y: number; kind: number };

export class Temple {
  private readonly emit: Emit;
  private readonly dishes: Dish[] = [];
  private readonly devotees: {
    x: number;
    y: number;
    look: Look;
    seed: number;
  }[] = [];
  private readonly bulbs: { x: number; y: number; seed: number }[] = [];
  private angle = 0;
  private speed = 0;
  private lastSeconds = 0;
  private lastBell = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(5608);
    // Chhappan bhog: fifty-six dishes on three steps, 22, 19 and 15.
    [
      [22, 0.28, 3.1],
      [19, -0.16, 2.7],
      [15, -0.58, 2.3],
    ].forEach(([n, y, half], row) => {
      for (let i = 0; i < n; i++)
        this.dishes.push({
          x: X - half + ((i + 0.5) / n) * half * 2,
          y,
          kind: (i * 3 + row * 5) % 8,
        });
    });
    const colours: RGB[] = [
      [220, 60, 80],
      [240, 170, 40],
      [240, 230, 214],
      [60, 120, 190],
      [230, 110, 40],
      [180, 50, 120],
      [70, 150, 100],
    ];
    for (let i = 0; i < 13; i++) {
      const woman = i % 2 === 0;
      const c = colours[i % colours.length];
      const look: Look = woman
        ? {
            h: 1.58,
            skin: SKIN[i % 5],
            top: c,
            bottom: c,
            wrap: c,
            head: "pallu",
            dress: "sari",
            woman,
            border: [240, 196, 90],
          }
        : {
            h: 1.74,
            skin: SKIN[(i + 1) % 5],
            top: i % 3 ? [240, 232, 214] : c,
            bottom: [240, 234, 220],
            wrap: [0, 0, 0],
            head: "bare",
            dress: "pyjama",
          };
      this.devotees.push({
        x: X - 6.5 + i * 1.02 + (random() - 0.5) * 0.3,
        y: 1.05 + (i % 3) * 0.28 + random() * 0.1,
        look,
        seed: random() * 10,
      });
    }
    // Lights strung down the shikhara and along the arches.
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const y = lerp(-5.9, -11.6, t);
      const half = 2.6 * Math.pow(1 - t, 0.75) + 0.12;
      this.bulbs.push(
        { x: X - half, y, seed: random() * 10 },
        { x: X + half, y, seed: random() * 10 },
      );
    }
    for (let x = X - 7.3; x <= X + 7.3; x += 0.36)
      this.bulbs.push({
        x,
        y: -5.95 + Math.sin(((x - X) / 7.3) * Math.PI * 4) * 0.12,
        seed: random() * 10,
      });
  }

  private seen(v: View) {
    return onScreen(v, X, -5, 10);
  }

  draw(ctx: Ctx, v: View, f: Frame, lights: Light[]) {
    const { p, seconds } = f;
    const dt = Math.max(0, Math.min(0.05, seconds - this.lastSeconds));
    this.lastSeconds = seconds;
    this.swing(dt, p, seconds);
    if (!this.seen(v) || p < cut(MOMENTS.flight1) || p >= cut(MOMENTS.flight2))
      return;
    const midnight = rise(p, MOMENTS.curtain[0], MOMENTS.curtain[1]);
    const aarti = rise(p, MOMENTS.midnight, MOMENTS.midnight + 0.01);

    // Ground: the courtyard, and the plinth and steps.
    const ground = ctx.createLinearGradient(0, 0, 0, 3);
    ground.addColorStop(0, "#3a2420");
    ground.addColorStop(1, "#140c0c");
    ctx.fillStyle = ground;
    ctx.fillRect(X - 16, 0, 32, 12);
    ctx.fillStyle = rgb(STONE_DARK);
    ctx.fillRect(X - 7.8, -0.35, 15.6, 0.35);

    // The hall's back wall and the sanctum, seen through the arches.
    ctx.fillStyle = rgb(mix([70, 40, 34], [130, 80, 60], midnight * 0.5));
    ctx.fillRect(X - 7.3, -5.6, 14.6, 5.25);
    ctx.strokeStyle = "rgba(40, 20, 16, 0.5)";
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let x = X - 7; x < X + 7.3; x += 1.4) {
      ctx.moveTo(x, -5.5);
      ctx.lineTo(x, -0.35);
    }
    ctx.stroke();
    // The sanctum door, its silver frame, and the glow within once the curtain opens.
    ctx.fillStyle = rgb([200, 196, 190]);
    ctx.fillRect(X - 1.55, -4.85, 3.1, 4.5);
    ctx.fillStyle = rgb(mix([40, 20, 16], [214, 128, 58], midnight));
    ctx.beginPath();
    ctx.moveTo(X - 1.3, -0.35);
    ctx.lineTo(X - 1.3, -3.9);
    ctx.quadraticCurveTo(X, -4.9, X + 1.3, -3.9);
    ctx.lineTo(X + 1.3, -0.35);
    ctx.fill();
    if (midnight > 0.01)
      lights.push({ x: X, y: -2.6, r: 5, a: 0.22 * midnight, color: GOLD });
    // The curtain, red and gold, drawn aside at midnight.
    for (const side of [-1, 1]) {
      const w = lerp(1.3, 0.28, midnight);
      const x0 = X + side * 1.3;
      ctx.fillStyle = "#8a1420";
      ctx.beginPath();
      ctx.moveTo(x0, -4.2);
      ctx.lineTo(x0 - side * w, -4.2);
      for (let k = 0; k <= 6; k++)
        ctx.lineTo(
          x0 -
            side * w +
            Math.sin(k * 1.7 + seconds * 0.5) * 0.03 * (1 - midnight),
          -4.2 + (k / 6) * 3.85,
        );
      ctx.lineTo(x0, -0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#e0a840";
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(x0 - side * w, -4.2);
      ctx.lineTo(x0 - side * w, -0.35);
      ctx.stroke();
    }
    // Marigold garlands hanging in loops across the top of the door.
    this.garland(ctx, X - 1.6, X + 1.6, -4.95, 5, 0.22);

    // Chhappan bhog on its three steps.
    ctx.fillStyle = rgb(MARBLE);
    [0.4, -0.04, -0.46].forEach((y, i) => {
      const half = [3.3, 2.9, 2.5][i];
      ctx.fillRect(
        X - half,
        y,
        half * 2,
        0.36 - i * 0.02 + (i === 0 ? 0 : 0.44),
      );
    });
    ctx.fillStyle = "rgba(120, 90, 70, 0.4)";
    ctx.fillRect(X - 3.3, 0.4, 6.6, 0.05);
    ctx.fillRect(X - 2.9, -0.04, 5.8, 0.05);
    ctx.fillRect(X - 2.5, -0.46, 5.0, 0.05);
    for (const d of this.dishes) dish(ctx, d);

    // The jhula.
    this.jhula(ctx, seconds, midnight, lights);

    // The pujari with the aarti, and the conch at midnight.
    const circle = seconds * 2.6;
    const pujari = drawPerson(
      ctx,
      X - 3.9,
      0.1,
      PUJARI,
      aarti > 0.5
        ? {
            la: 0.4,
            lf: 1.2,
            ra: 1.6 + Math.sin(circle) * 0.35,
            rf: 2.1 + Math.cos(circle) * 0.35,
          }
        : { la: 1.0, lf: 2.4, ra: 1.0, rf: 2.4, nod: 0.1 },
    );
    if (aarti > 0.5) {
      // A brass plate of five flames.
      const hx = pujari.right.x + 0.06;
      const hy = pujari.right.y - 0.02;
      ctx.fillStyle = "#d8a040";
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.2, 0.05, 0, 0, TAU);
      ctx.fill();
      for (let k = -2; k <= 2; k++)
        flame(
          ctx,
          hx + k * 0.07,
          hy - 0.03 - (2 - Math.abs(k)) * 0.03,
          0.1,
          seconds,
          k,
        );
      lights.push({
        x: hx,
        y: hy - 0.1,
        r: 2.6,
        a: 0.55 * flicker(seconds, 3),
        color: TORCH,
      });
      lights.push({
        x: hx,
        y: hy - 0.08,
        r: 0.5,
        a: 0.9,
        color: "255, 230, 170",
      });
    }
    const blow =
      rise(p, MOMENTS.midnight - 0.004, MOMENTS.midnight) *
      (1 - rise(p, MOMENTS.midnight + 0.012, MOMENTS.midnight + 0.02));
    const conch = drawPerson(
      ctx,
      X + 3.9,
      0.1,
      CONCH,
      blow > 0.3
        ? { la: 1.5, lf: 2.9, ra: 1.6, rf: 3.0, lean: -0.05, nod: -0.15 }
        : { la: 1.0, lf: 2.4, ra: 1.0, rf: 2.4, nod: 0.1 },
      -1,
    );
    if (blow > 0.3) {
      const cx = (conch.left.x + conch.right.x) / 2;
      const cy = (conch.left.y + conch.right.y) / 2;
      ctx.fillStyle = "#f4ece0";
      ctx.beginPath();
      ctx.ellipse(cx - 0.08, cy, 0.18, 0.09, -0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#c8b090";
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.arc(cx - 0.12, cy, 0.05, 0, TAU);
      ctx.stroke();
    }

    // The hall itself in front: pillars, cusped arches, the chhajja, and the shikhara.
    this.hall(ctx, seconds, midnight);
    for (const b of this.bulbs) {
      const on = 0.6 + 0.4 * Math.sin(seconds * 3 + b.seed * 4);
      ctx.fillStyle = `rgba(255, 220, 150, ${0.6 + on * 0.4})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 0.04, 0, TAU);
      ctx.fill();
      lights.push({ x: b.x, y: b.y, r: 0.35, a: 0.35 * on, color: BULB });
    }
    // Big bells hanging in the side bays, rung at midnight.
    for (const bx of [X - 5.5, X + 5.5]) {
      const ring = aarti * Math.sin(seconds * 7 + bx) * 0.25;
      bell(ctx, bx, -5.2, 1.3, 0.34, ring);
    }

    // The devotees, with their backs to us, hands folded and then raised for the aarti.
    for (const d of this.devotees) {
      const raise = aarti * clamp(Math.sin(seconds * 1.2 + d.seed) * 0.5 + 0.8);
      const clap = aarti * Math.abs(Math.sin(seconds * 4.2 + d.seed));
      drawPerson(ctx, d.x, d.y, d.look, {
        la: lerp(1.0, 2.7, raise) - clap * 0.2,
        lf: lerp(2.3, 3.0, raise),
        ra: lerp(1.0, 2.7, raise) - clap * 0.2,
        rf: lerp(2.3, 3.0, raise),
        bob: -clap * 0.01,
      });
    }
    // Warm light from the sanctum and the lamps on the steps.
    for (let i = 0; i < 9; i++) {
      const x = X - 3 + i * 0.75;
      lights.push({
        x,
        y: 0.35,
        r: 0.8,
        a: 0.25 * flicker(seconds, i),
        color: TORCH,
      });
    }
    lights.push({
      x: X,
      y: -1.2,
      r: 7,
      a: 0.16 + 0.08 * midnight,
      color: TORCH,
    });
  }

  private swing(dt: number, p: number, seconds: number) {
    // A pendulum, damped a little; after midnight someone keeps it gently moving.
    const auto =
      rise(p, MOMENTS.midnight, MOMENTS.midnight + 0.01) * (p < 0.7 ? 1 : 0);
    this.speed += (-6.2 * Math.sin(this.angle) - 0.35 * this.speed) * dt;
    if (auto > 0 && Math.abs(this.angle) < 0.04 && Math.abs(this.speed) < 0.35)
      this.speed += 0.2 * Math.sign(this.speed || 1) * auto;
    this.angle += this.speed * dt;
    this.angle = clamp(this.angle, -0.6, 0.6);
    // The little bells on the swing ring as it passes the middle.
    if (
      Math.abs(this.angle) < 0.05 &&
      Math.abs(this.speed) > 0.25 &&
      seconds - this.lastBell > 0.5
    ) {
      this.lastBell = seconds;
      if (p > 0.56 && p < 0.67)
        this.emit(Math.abs(this.speed) > 0.6 ? "swing-bells" : "swing-bell");
    }
  }

  private jhula(ctx: Ctx, seconds: number, midnight: number, lights: Light[]) {
    // The frame: two silver posts and a beam with a torana of flowers.
    const silver = "#d8d4cc";
    ctx.fillStyle = silver;
    for (const side of [-1, 1]) {
      ctx.fillRect(
        X + side * 1.5 - 0.07,
        TEMPLE.pivot - 0.35,
        0.14,
        -TEMPLE.pivot + 0.35 - 0.6,
      );
      ctx.beginPath();
      ctx.ellipse(X + side * 1.5, -0.6, 0.22, 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X + side * 1.5, TEMPLE.pivot - 0.42, 0.11, 0, TAU);
      ctx.fill();
    }
    ctx.fillRect(X - 1.6, TEMPLE.pivot - 0.28, 3.2, 0.14);
    this.garland(ctx, X - 1.5, X + 1.5, TEMPLE.pivot - 0.15, 4, 0.18);
    // The swing, about the beam.
    ctx.save();
    ctx.translate(X, TEMPLE.pivot);
    ctx.rotate(this.angle);
    const L = TEMPLE.seat - TEMPLE.pivot;
    ctx.strokeStyle = silver;
    ctx.lineWidth = 0.035;
    ctx.setLineDash([0.06, 0.04]);
    ctx.beginPath();
    for (const side of [-0.65, 0.65]) {
      ctx.moveTo(side, 0);
      ctx.lineTo(side, L - 0.2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Strings of flowers down the chains.
    for (const side of [-0.65, 0.65])
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = k % 2 ? "#f4a01c" : "#f0e6d8";
        ctx.beginPath();
        ctx.arc(side + 0.05, 0.15 + k * 0.22, 0.05, 0, TAU);
        ctx.fill();
      }
    // The seat: a silver palna with a curved back, heaped with marigold and rose.
    ctx.fillStyle = silver;
    ctx.beginPath();
    ctx.moveTo(-0.8, L - 0.2);
    ctx.quadraticCurveTo(-0.85, L - 0.75, -0.55, L - 0.8);
    ctx.lineTo(0.55, L - 0.8);
    ctx.quadraticCurveTo(0.85, L - 0.75, 0.8, L - 0.2);
    ctx.lineTo(0.7, L + 0.05);
    ctx.lineTo(-0.7, L + 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a8a298";
    ctx.lineWidth = 0.025;
    ctx.stroke();
    ctx.fillStyle = "#a02030";
    ctx.fillRect(-0.62, L - 0.62, 1.24, 0.46);
    ctx.fillStyle = "#e0a840";
    ctx.fillRect(-0.62, L - 0.62, 1.24, 0.05);
    const random = mulberry32(12);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = ["#f4a01c", "#f6c030", "#e0303a", "#f0e6d8"][i % 4];
      ctx.beginPath();
      ctx.arc(
        -0.78 + random() * 1.56,
        L - 0.16 + random() * 0.18 - (i % 3 === 0 ? 0.62 : 0),
        0.055,
        0,
        TAU,
      );
      ctx.fill();
    }
    // Laddu Gopal: small, crowned, in yellow, a peacock feather in the crown.
    const gx = 0;
    const gy = L - 0.2;
    ctx.fillStyle = "#f2c030";
    ctx.beginPath();
    ctx.ellipse(gx, gy - 0.12, 0.2, 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e0a020";
    ctx.beginPath();
    ctx.ellipse(gx, gy - 0.02, 0.26, 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2c3e6e";
    ctx.beginPath();
    ctx.arc(gx, gy - 0.36, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8b040";
    ctx.beginPath();
    ctx.moveTo(gx - 0.1, gy - 0.4);
    ctx.lineTo(gx - 0.08, gy - 0.54);
    ctx.lineTo(gx, gy - 0.48);
    ctx.lineTo(gx + 0.08, gy - 0.54);
    ctx.lineTo(gx + 0.1, gy - 0.4);
    ctx.closePath();
    ctx.fill();
    feather(ctx, gx + 0.04, gy - 0.5, 0.3, 0.35);
    ctx.restore();
    const seat = {
      x: X + Math.sin(this.angle) * -(TEMPLE.seat - TEMPLE.pivot),
      y: TEMPLE.pivot + Math.cos(this.angle) * (TEMPLE.seat - TEMPLE.pivot),
    };
    lights.push({
      x: seat.x,
      y: seat.y - 0.5,
      r: 2.2,
      a: 0.2 + 0.15 * midnight,
      color: GOLD,
    });
    lights.push({
      x: seat.x,
      y: seat.y - 0.55,
      r: 0.7,
      a: 0.2 + 0.15 * midnight,
      color: "255, 240, 210",
    });
    void seconds;
  }

  private hall(ctx: Ctx, seconds: number, midnight: number) {
    const lit = mix(STONE, [240, 170, 120], 0.15 + midnight * 0.1);
    ctx.fillStyle = rgb(lit);
    // Side walls.
    ctx.fillRect(X - 7.8, -6.0, 0.8, 5.65);
    ctx.fillRect(X + 7.0, -6.0, 0.8, 5.65);
    // The chhajja across the top, and the parapet with little chhatris.
    ctx.fillRect(X - 8.1, -6.25, 16.2, 0.3);
    ctx.fillStyle = rgb(mix(lit, [0, 0, 0], 0.25));
    ctx.beginPath();
    ctx.moveTo(X - 8.3, -5.95);
    ctx.lineTo(X + 8.3, -5.95);
    ctx.lineTo(X + 8.0, -5.7);
    ctx.lineTo(X - 8.0, -5.7);
    ctx.fill();
    ctx.fillStyle = rgb(lit);
    for (const cx of [X - 7.2, X - 4.4, X + 4.4, X + 7.2]) {
      ctx.fillRect(cx - 0.45, -6.8, 0.1, 0.55);
      ctx.fillRect(cx + 0.35, -6.8, 0.1, 0.55);
      ctx.beginPath();
      ctx.ellipse(cx, -6.85, 0.55, 0.45, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 0.02, -7.6, 0.04, 0.35);
    }
    // The shikhara, curving up in bands to the amalaka and the kalash.
    const shikhara = ctx.createLinearGradient(X - 2.8, 0, X + 2.8, 0);
    shikhara.addColorStop(0, rgb(mix(lit, [0, 0, 0], 0.35)));
    shikhara.addColorStop(0.45, rgb(lit));
    shikhara.addColorStop(1, rgb(mix(lit, [0, 0, 0], 0.45)));
    ctx.fillStyle = shikhara;
    ctx.beginPath();
    ctx.moveTo(X - 2.75, -6.25);
    ctx.bezierCurveTo(X - 2.7, -9, X - 1.3, -11.2, X - 0.5, -11.6);
    ctx.lineTo(X + 0.5, -11.6);
    ctx.bezierCurveTo(X + 1.3, -11.2, X + 2.7, -9, X + 2.75, -6.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(mix(lit, [0, 0, 0], 0.4), 0.7);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const y = lerp(-6.25, -11.6, t);
      const half = 2.75 * Math.pow(1 - t, 0.75) + 0.5 * t;
      ctx.moveTo(X - half, y);
      ctx.lineTo(X + half, y);
    }
    ctx.moveTo(X, -6.25);
    ctx.lineTo(X, -11.6);
    ctx.stroke();
    ctx.fillStyle = rgb(mix(lit, [0, 0, 0], 0.15));
    ctx.beginPath();
    ctx.ellipse(X, -11.75, 0.75, 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8b040";
    ctx.beginPath();
    ctx.ellipse(X, -12.1, 0.18, 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(X - 0.02, -13.5, 0.04, 1.2);
    // The saffron flag.
    ctx.fillStyle = "#f07a1a";
    ctx.beginPath();
    ctx.moveTo(X + 0.02, -13.5);
    ctx.quadraticCurveTo(
      X + 0.6,
      -13.35 + Math.sin(seconds * 2) * 0.06,
      X + 1.1,
      -13.2 + Math.sin(seconds * 2.4) * 0.08,
    );
    ctx.lineTo(X + 0.02, -12.9);
    ctx.fill();
    // Pillars and the cusped arches between them.
    const pillars = [X - 7.0, X - 3.6, X + 3.6, X + 7.0];
    ctx.fillStyle = rgb(lit);
    for (let i = 0; i < pillars.length - 1; i++) {
      const a = pillars[i] + 0.2;
      const b = pillars[i + 1] - 0.2;
      // The spandrel over each arch, with the arch cut from it in cusps.
      ctx.beginPath();
      ctx.moveTo(a - 0.2, -5.7);
      ctx.lineTo(b + 0.2, -5.7);
      ctx.lineTo(b + 0.2, -3.9);
      const cusps = 5;
      const mid = (a + b) / 2;
      const half = (b - a) / 2;
      for (let k = cusps; k >= 0; k--) {
        const t = k / cusps;
        const ang = t * Math.PI;
        const px = mid + Math.cos(ang) * half;
        const py = -3.9 - Math.sin(ang) * Math.min(1.4, half * 0.62);
        ctx.lineTo(px, py);
        if (k > 0) {
          const ang2 = ((k - 0.5) / cusps) * Math.PI;
          ctx.quadraticCurveTo(
            mid + Math.cos(ang2) * half * 0.86,
            -3.9 - Math.sin(ang2) * Math.min(1.4, half * 0.62) * 0.86,
            mid + Math.cos(((k - 1) / cusps) * Math.PI) * half,
            -3.9 -
              Math.sin(((k - 1) / cusps) * Math.PI) *
                Math.min(1.4, half * 0.62),
          );
        }
      }
      ctx.lineTo(a - 0.2, -3.9);
      ctx.closePath();
      ctx.fill();
    }
    for (const x of pillars) {
      ctx.fillStyle = rgb(lit);
      ctx.fillRect(x - 0.22, -5.7, 0.44, 5.35);
      ctx.fillStyle = rgb(mix(lit, [0, 0, 0], 0.25));
      ctx.fillRect(x - 0.3, -0.7, 0.6, 0.35);
      ctx.fillRect(x - 0.3, -4.2, 0.6, 0.3);
      ctx.fillStyle = rgb(mix(lit, [255, 255, 255], 0.2));
      ctx.fillRect(x - 0.1, -3.8, 0.06, 3);
    }
    // Garlands between the pillars.
    for (let i = 0; i < pillars.length - 1; i++)
      this.garland(ctx, pillars[i] + 0.25, pillars[i + 1] - 0.25, -3.8, 3, 0.3);
  }

  private garland(
    ctx: Ctx,
    from: number,
    to: number,
    y: number,
    loops: number,
    sag: number,
  ) {
    const n = Math.floor((to - from) / 0.09);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const loop = (t * loops) % 1;
      const gy = y + Math.sin(loop * Math.PI) * sag;
      ctx.fillStyle = i % 3 === 0 ? "#f6c030" : "#f08a18";
      ctx.beginPath();
      ctx.arc(lerp(from, to, t), gy, 0.055, 0, TAU);
      ctx.fill();
    }
  }

  pointer(
    world: { x: number; y: number },
    kind: "down" | "move" | "up",
    f: Frame,
  ) {
    if (kind !== "down" || f.p < 0.565 || f.p > 0.668) return;
    // Anywhere near the jhula pushes it, the way the reader touched it.
    if (
      Math.abs(world.x - X) < 2.4 &&
      world.y > TEMPLE.pivot - 0.6 &&
      world.y < 0.6
    ) {
      const dir = world.x < X ? -1 : 1;
      this.speed += -dir * 0.9;
      this.emit("push");
    }
  }
}

/** One dish of the chhappan bhog on its brass plate. */
function dish(ctx: Ctx, d: Dish) {
  const { x, y, kind } = d;
  ctx.fillStyle = "#c8943a";
  ctx.beginPath();
  ctx.ellipse(x, y, 0.12, 0.035, 0, 0, TAU);
  ctx.fill();
  const ball = (bx: number, by: number, r: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, TAU);
    ctx.fill();
  };
  switch (kind) {
    case 0: // laddus, heaped
      ball(x - 0.05, y - 0.04, 0.04, "#f29a1a");
      ball(x + 0.05, y - 0.04, 0.04, "#f29a1a");
      ball(x, y - 0.1, 0.04, "#f6a92a");
      break;
    case 1: // jalebi
      ctx.strokeStyle = "#f08a10";
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.arc(x - 0.04, y - 0.05, 0.035, 0, TAU * 0.9);
      ctx.arc(x + 0.04, y - 0.05, 0.035, 0, TAU * 0.9);
      ctx.stroke();
      break;
    case 2: // peda
      for (const dx of [-0.06, 0, 0.06]) {
        ctx.fillStyle = "#d8b890";
        ctx.beginPath();
        ctx.ellipse(x + dx, y - 0.03, 0.032, 0.018, 0, 0, TAU);
        ctx.fill();
      }
      break;
    case 3: // kheer in a bowl
      ctx.fillStyle = "#b08030";
      ctx.beginPath();
      ctx.ellipse(x, y - 0.04, 0.08, 0.05, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#f6eed8";
      ctx.beginPath();
      ctx.ellipse(x, y - 0.045, 0.075, 0.02, 0, 0, TAU);
      ctx.fill();
      break;
    case 4: // bananas and an apple
      ctx.strokeStyle = "#f2d040";
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.arc(x - 0.01, y - 0.12, 0.09, 0.4, 1.5);
      ctx.stroke();
      ball(x + 0.06, y - 0.04, 0.035, "#c02a2a");
      break;
    case 5: // makhan-mishri, butter and sugar
      ctx.fillStyle = "#fbf6e4";
      ctx.beginPath();
      ctx.ellipse(x, y - 0.04, 0.08, 0.05, 0, Math.PI, 0);
      ctx.fill();
      ball(x + 0.02, y - 0.09, 0.015, "#ffffff");
      break;
    case 6: // puris
      ctx.fillStyle = "#e0a850";
      ctx.beginPath();
      ctx.ellipse(x, y - 0.03, 0.09, 0.03, 0, 0, TAU);
      ctx.ellipse(x + 0.01, y - 0.06, 0.08, 0.028, 0, 0, TAU);
      ctx.fill();
      break;
    default: // panjiri
      ctx.fillStyle = "#e8d49a";
      ctx.beginPath();
      ctx.ellipse(x, y - 0.03, 0.08, 0.045, 0, Math.PI, 0);
      ctx.fill();
  }
}

/** A hanging temple bell, `ring` swinging it. */
function bell(
  ctx: Ctx,
  x: number,
  top: number,
  length: number,
  size: number,
  ring: number,
) {
  ctx.save();
  ctx.translate(x, top);
  ctx.rotate(ring);
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, length);
  ctx.stroke();
  ctx.fillStyle = "#c89438";
  ctx.beginPath();
  ctx.moveTo(-size * 0.2, length);
  ctx.quadraticCurveTo(
    -size * 0.35,
    length + size * 0.5,
    -size * 0.55,
    length + size,
  );
  ctx.lineTo(size * 0.55, length + size);
  ctx.quadraticCurveTo(size * 0.35, length + size * 0.5, size * 0.2, length);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 230, 170, 0.5)";
  ctx.fillRect(-size * 0.12, length + size * 0.15, size * 0.08, size * 0.7);
  ctx.fillStyle = "#6a4a20";
  ctx.beginPath();
  ctx.arc(-ring * size, length + size * 1.05, size * 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A peacock feather, the mor pankh: a quill, its barbs and the eye. */
export function feather(
  ctx: Ctx,
  x: number,
  y: number,
  length: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#8a9a50";
  ctx.lineWidth = length * 0.025;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90, 150, 80, 0.8)";
  ctx.lineWidth = length * 0.012;
  ctx.beginPath();
  for (let i = 3; i < 16; i++) {
    const t = i / 16;
    const w = length * 0.16 * Math.sin(t * Math.PI * 0.9);
    ctx.moveTo(0, -length * t);
    ctx.lineTo(-w, -length * t - length * 0.06);
    ctx.moveTo(0, -length * t);
    ctx.lineTo(w, -length * t - length * 0.06);
  }
  ctx.stroke();
  const ey = -length * 0.8;
  ctx.fillStyle = "#2a8a5a";
  ctx.beginPath();
  ctx.ellipse(0, ey, length * 0.13, length * 0.17, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#c89a30";
  ctx.beginPath();
  ctx.ellipse(0, ey + length * 0.01, length * 0.09, length * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#1a8aa8";
  ctx.beginPath();
  ctx.ellipse(0, ey + length * 0.02, length * 0.06, length * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#16225a";
  ctx.beginPath();
  ctx.ellipse(0, ey + length * 0.03, length * 0.035, length * 0.045, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
