// Gokul, the cowherds' village across the river: mud houses washed with lime and ochre, Nand baba's
// house with a toran over its door, a cowshed and its cows, kadamba trees, and Govardhan low on the
// horizon. Vasudeva reaches the door in the dark; at dawn the village comes out for Nandotsav.
import { TAU, clamp, flame, flicker, lerp, mix, mulberry32, onScreen, rgb, rise, type Ctx, type RGB, type View } from "../paint";
import { DIVINE, TORCH, type Light } from "./fort";
import { SKIN, drawCow, drawPerson, type Cow, type Look, type Pose } from "./people";
import { shoreRight } from "./river";
import { GOKUL, HORIZON, MOMENTS } from "./world";

const WALL: RGB = [184, 128, 80];
const LIME: RGB = [228, 216, 192];
const GERU: RGB = [150, 58, 38];
const THATCH: RGB = [150, 112, 62];
const TILE: RGB = [150, 70, 46];
const WOOD: RGB = [88, 54, 32];

type House = { x: number; w: number; h: number; roof: "thatch" | "tile"; door: number | null };

const YASHODA: Look = {
  h: 1.6,
  skin: SKIN[3],
  top: [200, 50, 60],
  bottom: [196, 40, 56],
  wrap: [236, 156, 40],
  head: "odhni",
  dress: "lehenga",
  woman: true,
  border: [240, 190, 80],
};
const NAND: Look = {
  h: 1.8,
  skin: SKIN[0],
  top: [236, 230, 214],
  bottom: [240, 236, 222],
  wrap: [240, 180, 40],
  head: "pagri",
  dress: "dhoti",
  beard: [230, 226, 216],
  shawl: [200, 60, 40],
};

type Villager = { x: number; y: number; look: Look; kind: "dholak" | "manjira" | "dance" | "throw" | "pot" | "child" | "clap"; facing: 1 | -1; seed: number };

export class Gokul {
  private readonly houses: House[] = [
    { x: 24.9, w: 2.1, h: 2.1, roof: "thatch", door: 25.6 },
    { x: 28.1, w: 5.3, h: 2.7, roof: "tile", door: GOKUL.door },
    { x: 34.2, w: 1.9, h: 2.0, roof: "thatch", door: 35.2 },
  ];
  private readonly villagers: Villager[] = [];
  private readonly cows: { x: number; y: number; cow: Cow; facing: 1 | -1; graze: number }[] = [];
  private readonly fields: { x: number; w: number; tone: number }[] = [];

  constructor() {
    const random = mulberry32(3108);
    const look = (woman: boolean, i: number): Look => {
      const colours: RGB[] = [
        [220, 60, 80],
        [240, 170, 40],
        [60, 140, 90],
        [230, 110, 40],
        [180, 50, 120],
        [60, 110, 190],
      ];
      const c = colours[i % colours.length];
      const d = colours[(i + 2) % colours.length];
      return woman
        ? { h: 1.55 + random() * 0.1, skin: SKIN[i % SKIN.length], top: d, bottom: c, wrap: colours[(i + 4) % colours.length], head: "odhni", dress: "lehenga", woman, border: [240, 196, 90] }
        : { h: 1.7 + random() * 0.12, skin: SKIN[(i + 2) % SKIN.length], top: [236, 228, 208], bottom: [238, 232, 216], wrap: c, head: "pagri", dress: "dhoti", shawl: d };
    };
    const put = (x: number, y: number, kind: Villager["kind"], woman: boolean, facing: 1 | -1, i: number, h?: number) => {
      const l = look(woman, i);
      if (h) l.h = h;
      this.villagers.push({ x, y, look: l, kind, facing, seed: random() * 10 });
    };
    put(26.2, 0.55, "pot", true, 1, 1);
    put(27.3, 0.95, "manjira", false, 1, 0);
    put(28.4, 1.25, "dholak", false, 1, 3);
    put(29.4, 0.85, "dance", true, 1, 4);
    put(33.0, 1.2, "child", false, -1, 5, 1.05);
    put(34.5, 0.75, "dance", true, -1, 2);
    put(35.7, 1.15, "throw", false, -1, 1);
    put(36.6, 0.6, "clap", true, -1, 3);
    put(26.9, 1.5, "clap", true, 1, 5);
    put(31.6, 1.55, "dance", false, 1, 2);
    const coat = (): RGB => mix([236, 230, 220], [200, 180, 150], random());
    this.cows.push({ x: 33.9, y: 0.45, cow: { coat: [240, 234, 222], horns: [200, 40, 40], size: 1.35, seed: 1, bell: true }, facing: -1, graze: 0.1 });
    this.cows.push({ x: 37.7, y: 0.35, cow: { coat: coat(), horns: [40, 110, 200], size: 1.3, seed: 2, bell: true }, facing: 1, graze: 0.9 });
    this.cows.push({ x: 39.6, y: 0.55, cow: { coat: [150, 100, 70], horns: [230, 170, 40], size: 1.35, seed: 3 }, facing: -1, graze: 0.2 });
    this.cows.push({ x: 38.6, y: 0.8, cow: { coat: coat(), horns: [0, 0, 0], size: 0.85, seed: 4, calf: true }, facing: 1, graze: 0.4 });
    let x = 22;
    for (let guard = 0; x < 48 && guard < 100; guard++) {
      const w = 1 + random() * 2.4;
      this.fields.push({ x, w, tone: random() });
      x += w;
    }
  }

  private seen(v: View) {
    return onScreen(v, 32, -2, 12);
  }

  /** Far fields and Govardhan on the horizon, behind the river bank. */
  drawGround(ctx: Ctx, v: View, p: number) {
    if (!this.seen(v) || p < 0.3) return;
    const day = rise(p, 0.44, 0.48);
    // Govardhan, a long low hill.
    ctx.fillStyle = rgb(mix([30, 30, 50], [150, 130, 150], day));
    ctx.beginPath();
    ctx.moveTo(33, HORIZON + 0.02);
    ctx.quadraticCurveTo(37, HORIZON - 1.1, 41, HORIZON - 1.0);
    ctx.quadraticCurveTo(45, HORIZON - 1.3, 49, HORIZON + 0.02);
    ctx.fill();
  }

  drawBack(ctx: Ctx, v: View, p: number, seconds: number, lights: Light[]) {
    if (!this.seen(v) || p < 0.3) return;
    const day = rise(p, 0.44, 0.48);
    // A band of fields between the bank and the houses.
    for (const f of this.fields) {
      if (f.x < shoreRight(0)) continue;
      ctx.fillStyle = rgb(mix([96, 110, 60], [150, 150, 80], f.tone), 0.45);
      ctx.fillRect(f.x, HORIZON, f.w, -HORIZON);
    }
    ctx.strokeStyle = "rgba(60, 70, 40, 0.35)";
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let y = HORIZON + 0.1; y < 0; y += 0.1 + (y - HORIZON) * 0.15) {
      ctx.moveTo(shoreRight(y) + 0.3, y);
      ctx.lineTo(48, y);
    }
    ctx.stroke();
    // Trees behind the roofs: neem, and kadamba in flower.
    this.tree(ctx, 23.6, 0.05, 2.2, true, seconds);
    this.tree(ctx, 27.4, -0.1, 3.3, false, seconds);
    this.tree(ctx, 34.0, -0.15, 3.0, false, seconds);
    this.tree(ctx, 41.2, 0.1, 2.6, true, seconds);
    for (const h of this.houses) this.house(ctx, h, day, p, seconds, lights);
    this.cowshed(ctx, 36.6, 3.6);
  }

  drawFront(ctx: Ctx, v: View, p: number, seconds: number, lights: Light[]) {
    if (!this.seen(v) || p < 0.3) return;
    const dawn = rise(p, MOMENTS.dawn[0], MOMENTS.dawn[1]);
    const joy = rise(p, MOMENTS.nandotsav[0], MOMENTS.nandotsav[1]);
    const beat = seconds * 2.4;
    // Lamps at Nand's door, lit before dawn.
    for (const dx of [-0.75, 0.75]) {
      const x = GOKUL.door + dx;
      ctx.fillStyle = "#6a3a20";
      ctx.beginPath();
      ctx.ellipse(x, 0.08, 0.1, 0.035, 0, 0, TAU);
      ctx.fill();
      const lit = rise(p, 0.43, 0.44);
      if (lit > 0.01) {
        flame(ctx, x + 0.04, 0.06, 0.13 * lit, seconds, dx);
        lights.push({ x, y: -0.05, r: 1.4, a: 0.35 * lit * flicker(seconds, dx), color: TORCH });
      }
    }
    // The cows, and the one Nand gives away, with a red cloth on her back.
    for (const c of this.cows) {
      drawCow(ctx, c.x, c.y, c.cow, c.graze + Math.sin(seconds * 0.4 + c.cow.seed) * 0.1, seconds, c.facing);
      if (c.cow.seed === 1) {
        ctx.fillStyle = rgb([190, 30, 40], 0.95);
        ctx.beginPath();
        ctx.moveTo(c.x + 0.4, c.y - 1.28);
        ctx.quadraticCurveTo(c.x - 0.05, c.y - 1.34, c.x - 0.45, c.y - 1.24);
        ctx.lineTo(c.x - 0.5, c.y - 0.8);
        ctx.lineTo(c.x + 0.45, c.y - 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(240, 190, 80, 0.95)";
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.moveTo(c.x - 0.5, c.y - 0.82);
        ctx.lineTo(c.x + 0.45, c.y - 0.84);
        ctx.stroke();
      }
    }
    if (dawn < 0.01) return;
    ctx.globalAlpha = dawn;
    // Yashoda at the door with the child; Nand baba, his hand raised over them.
    const y = drawPerson(ctx, GOKUL.door - 0.05, 0.2, YASHODA, { la: 0.9, lf: 1.9, ra: 0.75, rf: 1.75, sit: 1, nod: 0.18, lean: 0.06 });
    const child = { x: (y.left.x + y.right.x) / 2 + 0.05, y: (y.left.y + y.right.y) / 2 - 0.06 };
    ctx.fillStyle = "#f2c040";
    ctx.beginPath();
    ctx.ellipse(child.x, child.y, 0.2, 0.1, -0.15, 0, TAU);
    ctx.fill();
    lights.push({ x: child.x, y: child.y, r: 1.6, a: 0.45 * dawn, color: DIVINE });
    drawPerson(ctx, GOKUL.door + 1.35, 0.4, NAND, { la: 0.2, lf: 0.3, ra: 1.9, rf: 2.3 + Math.sin(seconds) * 0.05, lean: -0.03 }, -1);
    ctx.globalAlpha = 1;
    if (joy < 0.01) return;

    // The village, out in the lane.
    for (const w of [...this.villagers].sort((a, b) => a.y - b.y)) {
      const t = clamp(joy * 1.6 - (w.seed % 1) * 0.5);
      if (t < 0.01) continue;
      ctx.globalAlpha = t;
      const bounce = Math.abs(Math.sin(beat * Math.PI * 0.5 + w.seed)) * 0.04;
      let pose: Pose;
      switch (w.kind) {
        case "dholak":
          pose = { la: 0.9, lf: 1.4 + Math.max(0, Math.sin(beat * Math.PI)) * 0.4, ra: 0.9, rf: 1.4 + Math.max(0, -Math.sin(beat * Math.PI)) * 0.4, sit: 1 };
          break;
        case "manjira": {
          const clash = Math.abs(Math.sin(beat * Math.PI));
          pose = { la: 1.2, lf: 1.5 + clash * 0.4, ra: 1.2, rf: 1.5 + clash * 0.4, bob: -bounce };
          break;
        }
        case "dance":
          pose = { la: 2.4 + Math.sin(beat + w.seed) * 0.4, lf: 2.9, ra: 2.0 - Math.sin(beat + w.seed) * 0.4, rf: 2.6, bob: -bounce, lean: Math.sin(beat * 0.5 + w.seed) * 0.08 };
          break;
        case "throw": {
          const swing = (beat * 0.35 + w.seed) % 1;
          pose = { la: 0.5, lf: 1, ra: lerp(0.4, 3.0, swing), rf: lerp(0.8, 3.1, swing), lean: -0.05 };
          break;
        }
        case "pot":
          pose = { la: 2.9, lf: 3.5, ra: 0.3, rf: 0.6 + Math.sin(beat) * 0.1, bob: -bounce * 0.5 };
          break;
        case "child":
          pose = { la: 2.8, lf: 3, ra: 2.8, rf: 3, bob: -Math.abs(Math.sin(beat * 1.2 + w.seed)) * 0.12 };
          break;
        default:
          pose = { la: 1.3 + Math.sin(beat * Math.PI) * 0.2, lf: 2.2, ra: 1.3 + Math.sin(beat * Math.PI) * 0.2, rf: 2.2, bob: -bounce };
      }
      const hands = drawPerson(ctx, w.x, w.y, w.look, pose, w.facing);
      if (w.kind === "dholak") {
        // The dholak across his lap.
        ctx.fillStyle = "#7a3a1e";
        ctx.beginPath();
        ctx.ellipse(w.x + 0.28, w.y - 0.3, 0.3, 0.13, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#e8d8b0";
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        for (let k = -2; k <= 2; k++) {
          ctx.moveTo(w.x + 0.28 + k * 0.1, w.y - 0.42);
          ctx.lineTo(w.x + 0.28 + k * 0.1 + 0.05, w.y - 0.18);
        }
        ctx.stroke();
      }
      if (w.kind === "manjira") {
        ctx.fillStyle = "#e0b050";
        for (const hnd of [hands.left, hands.right]) {
          ctx.beginPath();
          ctx.ellipse(hnd.x, hnd.y, 0.06, 0.025, 0, 0, TAU);
          ctx.fill();
        }
      }
      if (w.kind === "pot") {
        ctx.fillStyle = "#9a4a2a";
        ctx.beginPath();
        ctx.arc(w.x, w.y - w.look.h * 1.08, 0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#f4f0e4";
        ctx.beginPath();
        ctx.ellipse(w.x, w.y - w.look.h * 1.08 - 0.17, 0.12, 0.04, 0, 0, TAU);
        ctx.fill();
      }
      if (w.kind === "throw") this.dahi(ctx, hands.right, w.facing, seconds, w.seed);
    }
    ctx.globalAlpha = 1;
    // Turmeric and curd splashed on the ground.
    ctx.fillStyle = "rgba(240, 190, 40, 0.5)";
    const random = mulberry32(99);
    for (let i = 0; i < 26; i++) {
      const a = clamp(joy * 2 - random());
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.7;
      ctx.beginPath();
      ctx.ellipse(27 + random() * 10, 0.4 + random() * 1.3, 0.05 + random() * 0.12, 0.02 + random() * 0.03, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Curd and turmeric flung up and over the lane: dadhi kando. */
  private dahi(ctx: Ctx, hand: { x: number; y: number }, facing: number, seconds: number, seed: number) {
    for (let k = 0; k < 14; k++) {
      const t = (seconds * 0.55 + k / 14 + seed) % 1;
      const spread = Math.sin(k * 7.3) * 0.5;
      const x = hand.x + facing * (t * (1.6 + spread));
      const y = hand.y - t * 2.2 + t * t * 2.8;
      ctx.fillStyle = k % 3 ? `rgba(245, 196, 40, ${0.85 * (1 - t)})` : `rgba(250, 246, 230, ${0.85 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.04 + (k % 4) * 0.012, 0, TAU);
      ctx.fill();
    }
  }

  private tree(ctx: Ctx, x: number, y: number, h: number, kadamba: boolean, seconds: number) {
    ctx.fillStyle = "#3a2a1c";
    ctx.beginPath();
    ctx.moveTo(x - 0.12, y);
    ctx.lineTo(x - 0.06, y - h * 0.55);
    ctx.lineTo(x + 0.06, y - h * 0.55);
    ctx.lineTo(x + 0.14, y);
    ctx.fill();
    const random = mulberry32(Math.floor(x * 10));
    const sway = Math.sin(seconds * 0.8 + x) * 0.03;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const r = h * (0.22 + random() * 0.1);
      ctx.fillStyle = rgb(mix(kadamba ? [40, 86, 44] : [52, 92, 46], [90, 130, 60], random() * 0.5));
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * h * 0.25 + sway, y - h * 0.72 + Math.sin(a) * h * 0.16, r, 0, TAU);
      ctx.fill();
    }
    if (kadamba) {
      // Kadamba flowers: small golden balls, out in the monsoon.
      ctx.fillStyle = "#f0c040";
      for (let i = 0; i < 22; i++) {
        const a = random() * TAU;
        const d = Math.sqrt(random()) * h * 0.38;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d + sway, y - h * 0.72 + Math.sin(a) * d * 0.7, 0.05, 0, TAU);
        ctx.fill();
      }
    }
  }

  private house(ctx: Ctx, h: House, day: number, p: number, seconds: number, lights: Light[]) {
    const top = -h.h;
    // Mud walls, a lime-washed plinth with a red geru border.
    ctx.fillStyle = rgb(WALL);
    ctx.fillRect(h.x, top, h.w, h.h);
    ctx.fillStyle = rgb(mix(WALL, [0, 0, 0], 0.18));
    ctx.fillRect(h.x, top, h.w, 0.2);
    ctx.fillStyle = rgb(LIME);
    ctx.fillRect(h.x, -0.42, h.w, 0.42);
    ctx.fillStyle = rgb(GERU);
    ctx.fillRect(h.x, -0.48, h.w, 0.07);
    // Mandana: white chalk patterns on the wall.
    ctx.strokeStyle = rgb(LIME, 0.85);
    ctx.lineWidth = 0.03;
    for (let x = h.x + 0.35; x < h.x + h.w - 0.2; x += 0.9) {
      if (h.door !== null && Math.abs(x - h.door) < 0.9) continue;
      const cy = top + h.h * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, cy - 0.22);
      ctx.lineTo(x + 0.18, cy);
      ctx.lineTo(x, cy + 0.22);
      ctx.lineTo(x - 0.18, cy);
      ctx.closePath();
      ctx.moveTo(x + 0.06, cy);
      ctx.arc(x, cy, 0.06, 0, TAU);
      ctx.stroke();
    }
    // Roof.
    if (h.roof === "thatch") {
      ctx.fillStyle = rgb(THATCH);
      ctx.beginPath();
      ctx.moveTo(h.x - 0.35, top + 0.1);
      ctx.lineTo(h.x + h.w / 2, top - 1.1);
      ctx.lineTo(h.x + h.w + 0.35, top + 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgb(mix(THATCH, [60, 40, 20], 0.4));
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const t = i / 15;
        ctx.moveTo(h.x + h.w / 2, top - 1.1);
        ctx.lineTo(lerp(h.x - 0.35, h.x + h.w + 0.35, t), top + 0.1);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = rgb(TILE);
      ctx.beginPath();
      ctx.moveTo(h.x - 0.45, top + 0.12);
      ctx.lineTo(h.x + 0.6, top - 1.25);
      ctx.lineTo(h.x + h.w - 0.6, top - 1.25);
      ctx.lineTo(h.x + h.w + 0.45, top + 0.12);
      ctx.closePath();
      ctx.fill();
      // Rows of khaprail tiles.
      ctx.strokeStyle = rgb(mix(TILE, [40, 16, 10], 0.4));
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      for (let r = 1; r < 6; r++) {
        const t = r / 6;
        const yy = lerp(top - 1.25, top + 0.12, t);
        ctx.moveTo(lerp(h.x + 0.6, h.x - 0.45, t), yy);
        ctx.lineTo(lerp(h.x + h.w - 0.6, h.x + h.w + 0.45, t), yy);
      }
      for (let x = h.x; x < h.x + h.w; x += 0.22) {
        ctx.moveTo(x + 0.3, top - 1.2);
        ctx.lineTo(x + 0.3 + (x - (h.x + h.w / 2)) * 0.1, top + 0.1);
      }
      ctx.stroke();
      // Two small windows with wooden jali.
      for (const wx of [h.x + 0.7, h.x + h.w - 1.2]) {
        ctx.fillStyle = rgb(WOOD);
        ctx.fillRect(wx, top + 0.7, 0.5, 0.6);
        const lit = rise(p, 0.42, 0.43) * (1 - day * 0.8);
        ctx.fillStyle = rgb(mix([30, 18, 12], [255, 180, 90], lit));
        ctx.fillRect(wx + 0.06, top + 0.76, 0.38, 0.48);
        ctx.strokeStyle = rgb(WOOD);
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        for (let k = 1; k < 4; k++) {
          ctx.moveTo(wx + 0.06 + k * 0.095, top + 0.76);
          ctx.lineTo(wx + 0.06 + k * 0.095, top + 1.24);
          ctx.moveTo(wx + 0.06, top + 0.76 + k * 0.12);
          ctx.lineTo(wx + 0.44, top + 0.76 + k * 0.12);
        }
        ctx.stroke();
        if (lit > 0.01) lights.push({ x: wx + 0.25, y: top + 1, r: 1.2, a: 0.4 * lit, color: TORCH });
      }
    }
    if (h.door === null) return;
    const big = h.roof === "tile";
    const dw = big ? 1.0 : 0.7;
    const dh = big ? 1.95 : 1.5;
    const dx = h.door - dw / 2;
    // A carved frame, the door open into a lit room.
    ctx.fillStyle = rgb(WOOD);
    ctx.fillRect(dx - 0.12, -dh - 0.12, dw + 0.24, dh + 0.12);
    const inside = big ? rise(p, 0.43, 0.445) : 0.3;
    ctx.fillStyle = rgb(mix([24, 14, 10], [200, 130, 70], inside * 0.8));
    ctx.fillRect(dx, -dh, dw, dh);
    if (big && inside > 0.01) lights.push({ x: h.door, y: -dh * 0.5, r: 2.2, a: 0.35 * inside, color: TORCH });
    if (!big) return;
    // The toran: mango leaves and marigolds strung over the door.
    const sway = Math.sin(seconds * 1.1) * 0.01;
    ctx.strokeStyle = "#6a4a20";
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(dx - 0.3, -dh - 0.2);
    ctx.quadraticCurveTo(h.door, -dh - 0.05, dx + dw + 0.3, -dh - 0.2);
    ctx.stroke();
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const lx = lerp(dx - 0.25, dx + dw + 0.25, t);
      const ly = -dh - 0.2 + Math.sin(t * Math.PI) * 0.07;
      ctx.fillStyle = i % 2 ? "#3f8a3a" : "#2f6e2c";
      ctx.beginPath();
      ctx.moveTo(lx - 0.045, ly);
      ctx.quadraticCurveTo(lx, ly + 0.26 + sway, lx + 0.045, ly);
      ctx.fill();
      ctx.fillStyle = i % 2 ? "#f29a1a" : "#f6c030";
      ctx.beginPath();
      ctx.arc(lx + 0.05, ly + 0.03, 0.045, 0, TAU);
      ctx.fill();
    }
    // A kalash painted either side, and the auspicious swastik in geru.
    for (const side of [-1, 1]) {
      const cx = h.door + side * (dw / 2 + 0.55);
      ctx.fillStyle = rgb(GERU);
      ctx.beginPath();
      ctx.arc(cx, -0.95, 0.2, 0, TAU);
      ctx.fill();
      ctx.fillRect(cx - 0.1, -1.25, 0.2, 0.12);
      ctx.fillStyle = "#3f8a3a";
      ctx.beginPath();
      ctx.moveTo(cx - 0.18, -1.25);
      ctx.lineTo(cx, -1.5);
      ctx.lineTo(cx + 0.18, -1.25);
      ctx.fill();
      // And a lotus of chalk and geru above it.
      const sy = -1.95;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        ctx.fillStyle = k % 2 ? rgb(GERU) : rgb(LIME);
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 0.12, sy + Math.sin(a) * 0.12, 0.1, 0.04, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = rgb(GERU);
      ctx.beginPath();
      ctx.arc(cx, sy, 0.05, 0, TAU);
      ctx.fill();
    }
  }

  /** The gaushala: a thatch on bamboo posts over a manger. */
  private cowshed(ctx: Ctx, x: number, w: number) {
    ctx.strokeStyle = rgb(WOOD);
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const px = x + (i / 3) * w;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, -2.1 + (i / 3) * 0.3);
    }
    ctx.stroke();
    ctx.fillStyle = rgb(THATCH);
    ctx.beginPath();
    ctx.moveTo(x - 0.4, -2.0);
    ctx.lineTo(x + 0.3, -2.9);
    ctx.lineTo(x + w + 0.4, -2.6);
    ctx.lineTo(x + w + 0.5, -1.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(mix(THATCH, [60, 40, 20], 0.4));
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      ctx.moveTo(lerp(x + 0.3, x + w + 0.4, t), lerp(-2.9, -2.6, t));
      ctx.lineTo(lerp(x - 0.4, x + w + 0.5, t), lerp(-2.0, -1.7, t));
    }
    ctx.stroke();
    // The manger, and hay in it.
    ctx.fillStyle = "#8a6a4a";
    ctx.fillRect(x + 0.3, -0.5, w - 0.6, 0.35);
    ctx.fillStyle = "#c8a050";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, -0.5, w / 2 - 0.35, 0.12, 0, Math.PI, 0);
    ctx.fill();
  }
}
