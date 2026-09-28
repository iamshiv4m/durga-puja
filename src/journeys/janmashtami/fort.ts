// Kamsa's prison: a fort wall of dark stone in the storm with a barred arch at its foot, and in the
// cell behind it Devaki and Vasudeva in chains, a lamp in its niche and a slit of window high up.
// At midnight the light, the chains, the lock and the gates; outside, two guards and their torches.
import { TAU, clamp, flame, flicker, lerp, mix, mulberry32, onScreen, rgb, type Ctx, type RGB, type View } from "../paint";
import { SKIN, drawPerson, type Look } from "./people";
import { FORT, PATH_Y } from "./world";

export type Light = { x: number; y: number; r: number; a: number; color: string };

export const TORCH = "255, 150, 60";
export const DIVINE = "255, 214, 140";

const { half: HALF, spring: SPRING, apex: APEX } = FORT.arch;
const WALL = { from: -9.6, to: 5.3, top: -6.4 };
const STONE: RGB = [62, 66, 84];
const MORTAR: RGB = [30, 32, 44];

type Block = { x: number; y: number; w: number; h: number; tone: number };

export const DEVAKI: Look = {
  h: 1.64,
  skin: [178, 120, 86],
  top: [120, 36, 44],
  bottom: [132, 40, 48],
  wrap: [140, 46, 52],
  head: "pallu",
  dress: "sari",
  woman: true,
  border: [196, 150, 70],
};
export const VASUDEVA: Look = {
  h: 1.78,
  skin: [160, 104, 70],
  top: [196, 186, 160],
  bottom: [200, 190, 164],
  wrap: [0, 0, 0],
  head: "bun",
  dress: "dhoti",
  bare: false,
  shawl: [156, 104, 52],
  beard: [30, 22, 18],
};
const GUARD = (skin: RGB, turban: RGB): Look => ({
  h: 1.86,
  skin,
  top: [58, 48, 64],
  bottom: [72, 60, 50],
  wrap: turban,
  head: "turban",
  dress: "pyjama",
  shawl: [110, 30, 30],
  beard: [24, 18, 16],
});
const GUARDS = [
  { x: -3.05, facing: 1 as const, look: GUARD(SKIN[1], [130, 30, 34]), seed: 1 },
  { x: 3.05, facing: -1 as const, look: GUARD(SKIN[2], [150, 90, 30]), seed: 2 },
];

export type FortState = {
  p: number;
  seconds: number;
  flash: number;
  /** The midnight light, 0..1, and its first blaze. */
  born: number;
  blaze: number;
  chains: number;
  lock: number;
  sleep: number;
  /** How far the gates have swung, 0..1. */
  open: number;
  /** Where the child is while still in the cell. */
  child: { x: number; y: number } | null;
  lights: Light[];
};

export class Fort {
  private readonly blocks: Block[] = [];
  private readonly inner: Block[] = [];
  private readonly straw: { x: number; y: number; a: number; l: number }[] = [];
  private readonly puddles: { x: number; y: number; w: number }[] = [];
  private readonly skyline: { x: number; w: number; h: number; dome: boolean; lit: number[] }[] = [];

  constructor() {
    const random = mulberry32(1402);
    const course = 0.46;
    for (let row = 0; row * course < -WALL.top + 2.2; row++) {
      let x = WALL.from - random() * 0.8;
      const y = -row * course;
      while (x < WALL.to) {
        const w = 0.7 + random() * 0.8;
        this.blocks.push({ x, y: y - course, w, h: course, tone: random() });
        x += w;
      }
    }
    for (let row = 0; row * 0.38 < -APEX; row++) {
      let x = -HALF - random() * 0.5;
      while (x < HALF) {
        const w = 0.55 + random() * 0.6;
        this.inner.push({ x, y: -0.55 - (row + 1) * 0.38, w, h: 0.38, tone: random() });
        x += w;
      }
    }
    for (let i = 0; i < 90; i++) this.straw.push({ x: -HALF + random() * HALF * 2, y: -0.52 + random() * 0.46, a: (random() - 0.5) * 1.2, l: 0.08 + random() * 0.12 });
    for (let i = 0; i < 9; i++) this.puddles.push({ x: -8 + random() * 13, y: 0.5 + random() * 2.2, w: 0.6 + random() * 1.2 });
    let x = -34;
    for (let guard = 0; x < 3 && guard < 200; guard++) {
      const w = 1.2 + random() * 2.6;
      const palace = x > -17 && x < -1;
      this.skyline.push({
        x,
        w,
        h: palace ? 7 + random() * 5 : 2 + random() * 3.2,
        dome: random() < (palace ? 0.6 : 0.2),
        lit: Array.from({ length: Math.floor(random() * 3) }, () => random()),
      });
      x += w * (0.7 + random() * 0.3);
    }
  }

  /** Mathura behind the fort, Kamsa's palace among it: far roofs and domes against the storm. */
  drawSkyline(ctx: Ctx, v: View, s: FortState) {
    if (!onScreen(v, -15, -5, 22)) return;
    ctx.fillStyle = rgb(mix([22, 26, 40], [80, 90, 130], s.flash * 0.5));
    for (const b of this.skyline) {
      const top = -1.2 - b.h;
      ctx.fillRect(b.x, top, b.w, b.h + 1.3);
      if (b.dome) {
        ctx.beginPath();
        ctx.ellipse(b.x + b.w / 2, top, b.w * 0.36, b.w * 0.42, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(b.x + b.w / 2 - 0.03, top - b.w * 0.42 - 0.4, 0.06, 0.4);
      }
    }
    for (const b of this.skyline) {
      for (const l of b.lit) {
        const wx = b.x + b.w * (0.2 + l * 0.6);
        const wy = -1.2 - b.h * (0.3 + l * 0.5);
        ctx.fillStyle = "rgba(255, 170, 90, 0.7)";
        ctx.fillRect(wx, wy, 0.14, 0.22);
        s.lights.push({ x: wx + 0.07, y: wy + 0.11, r: 0.5, a: 0.18, color: TORCH });
      }
    }
  }

  /** The wall, the cell through the arch, and the people inside it. */
  drawBack(ctx: Ctx, v: View, s: FortState) {
    if (!onScreen(v, (WALL.from + WALL.to) / 2, -4, 12)) return;
    const flash = s.flash;
    const warm = s.born;
    // The wall and its two towers.
    ctx.fillStyle = rgb(mix(STONE, [120, 130, 170], flash * 0.35));
    ctx.fillRect(WALL.from, WALL.top, WALL.to - WALL.from, -WALL.top + 0.02);
    const towers = [
      { x: -9.9, w: 2.9, top: -8.8 },
      { x: 3.4, w: 2.4, top: -7.8 },
    ];
    for (const t of towers) {
      ctx.fillRect(t.x, t.top, t.w, -t.top);
      // A chhatri on each tower.
      ctx.fillRect(t.x + t.w * 0.2, t.top - 1.1, 0.12, 1.1);
      ctx.fillRect(t.x + t.w * 0.8 - 0.12, t.top - 1.1, 0.12, 1.1);
      ctx.fillRect(t.x + t.w * 0.12, t.top - 1.2, t.w * 0.76, 0.14);
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.top - 1.2, t.w * 0.34, t.w * 0.3, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(t.x + t.w / 2 - 0.03, t.top - 1.2 - t.w * 0.3 - 0.35, 0.06, 0.35);
    }
    // Merlons along the parapet.
    for (let x = WALL.from; x < WALL.to - 0.3; x += 0.7) {
      ctx.beginPath();
      ctx.moveTo(x + 0.08, WALL.top);
      ctx.lineTo(x + 0.08, WALL.top - 0.38);
      ctx.lineTo(x + 0.3, WALL.top - 0.55);
      ctx.lineTo(x + 0.52, WALL.top - 0.38);
      ctx.lineTo(x + 0.52, WALL.top);
      ctx.fill();
    }
    // Stones, each a little different, and the mortar between them.
    for (const b of this.blocks) {
      if (b.y < WALL.top - 0.1 && !towers.some((t) => b.x + b.w > t.x && b.x < t.x + t.w && b.y > t.top)) continue;
      if (b.y + b.h > 0.01) continue;
      const shade = (b.tone - 0.5) * 0.18;
      ctx.fillStyle = shade > 0 ? `rgba(160, 170, 200, ${shade * 0.35})` : `rgba(8, 8, 14, ${-shade * 0.9})`;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.strokeStyle = rgb(MORTAR, 0.8);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (const b of this.blocks) {
      if (b.y + b.h > 0.01 || b.y < towers[0].top) continue;
      ctx.rect(b.x, b.y, b.w, b.h);
    }
    ctx.stroke();
    // Rain darkening the wall in long streaks.
    const streaks = ctx.createLinearGradient(0, WALL.top, 0, 0);
    streaks.addColorStop(0, "rgba(8, 10, 18, 0.35)");
    streaks.addColorStop(1, "rgba(8, 10, 18, 0)");
    ctx.fillStyle = streaks;
    ctx.fillRect(WALL.from, WALL.top, WALL.to - WALL.from, -WALL.top);

    // The cell through the arch.
    ctx.save();
    archPath(ctx, HALF);
    ctx.clip();
    ctx.fillStyle = rgb(mix([22, 22, 30], [96, 70, 40], warm * 0.8));
    ctx.fillRect(-HALF, APEX, HALF * 2, -APEX);
    ctx.strokeStyle = rgb(mix([12, 12, 18], [60, 40, 20], warm), 0.9);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (const b of this.inner) ctx.rect(b.x, b.y, b.w, b.h);
    ctx.stroke();
    // A slit of window high on the back wall, white when the lightning comes.
    ctx.fillStyle = rgb(mix([20, 24, 40], [210, 220, 255], flash));
    ctx.beginPath();
    ctx.moveTo(-0.28, -2.35);
    ctx.lineTo(-0.28, -2.95);
    ctx.quadraticCurveTo(0, -3.25, 0.28, -2.95);
    ctx.lineTo(0.28, -2.35);
    ctx.fill();
    ctx.strokeStyle = "#101014";
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (const bx of [-0.12, 0.05, 0.2]) {
      ctx.moveTo(bx, -2.35);
      ctx.lineTo(bx, -3.1);
    }
    ctx.stroke();
    if (flash > 0.05) s.lights.push({ x: 0, y: -2.7, r: 2.2, a: 0.4 * flash, color: "170, 190, 255" });
    // The floor, and straw on it.
    ctx.fillStyle = rgb(mix([34, 30, 30], [120, 90, 50], warm * 0.8));
    ctx.fillRect(-HALF, -0.58, HALF * 2, 0.6);
    ctx.strokeStyle = rgb(mix([90, 76, 44], [220, 180, 100], warm), 0.7);
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    for (const st of this.straw) {
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(st.x + Math.cos(st.a) * st.l, st.y + Math.sin(st.a) * st.l * 0.3);
    }
    ctx.stroke();
    // The lamp in its niche.
    ctx.fillStyle = "#0e0c10";
    ctx.beginPath();
    ctx.moveTo(1.3, -1.45);
    ctx.lineTo(1.3, -1.9);
    ctx.quadraticCurveTo(1.52, -2.12, 1.74, -1.9);
    ctx.lineTo(1.74, -1.45);
    ctx.fill();
    ctx.fillStyle = "#5a3620";
    ctx.beginPath();
    ctx.ellipse(1.52, -1.5, 0.13, 0.045, 0, 0, TAU);
    ctx.fill();
    const lamp = flicker(s.seconds, 3) * (1 - 0.3 * s.born);
    flame(ctx, 1.58, -1.52, 0.16 * lamp, s.seconds, 3);
    s.lights.push({ x: 1.58, y: -1.62, r: 2.6, a: 0.28 * lamp, color: TORCH });
    s.lights.push({ x: 1.58, y: -1.62, r: 0.4, a: 0.6 * lamp, color: TORCH });

    // Rings in the wall and the chains to their wrists; at midnight they fall open.
    const rings = [
      { x: -1.5, y: -1.45, wrist: { x: -0.6, y: -0.72 } },
      { x: 1.62, y: -1.2, wrist: { x: 0.95, y: -0.74 } },
    ];
    for (const r of rings) {
      const drop = clamp(s.chains);
      const end = { x: lerp(r.wrist.x, r.x + (r.x < 0 ? 0.28 : -0.28), drop), y: lerp(r.wrist.y, -0.4, drop * drop) };
      chain(ctx, r.x, r.y, end.x, end.y, lerp(0.35, 0.6, drop), warm);
      ctx.strokeStyle = rgb(mix([70, 70, 76], [220, 190, 130], warm));
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 0.08, 0, TAU);
      ctx.stroke();
      // The shackle at the end, open once it has fallen.
      ctx.beginPath();
      ctx.arc(end.x, end.y, 0.07, drop * 1.2, TAU - drop * 0.3);
      ctx.stroke();
    }
    ctx.restore();

    // Devaki, and the child in her arms.
    const holding = s.child && s.child.x < 0;
    drawPerson(ctx, -0.78, FORT.floor, DEVAKI, {
      la: holding ? 0.9 : 0.6,
      lf: holding ? 1.9 : 1.3,
      ra: holding ? 0.7 : 0.45,
      rf: holding ? 1.7 : 1.35,
      sit: 1,
      nod: holding ? 0.25 : 0.12 - s.born * 0.1,
      lean: holding ? 0.08 : 0.04,
    });
  }

  /** The arch itself, its gates, the guards and the torches, in front of whoever is in the cell. */
  drawFront(ctx: Ctx, v: View, s: FortState) {
    if (!onScreen(v, 0, -2, 7)) return;
    const flash = s.flash;
    const warm = s.born;
    // The deep stone of the arch around the opening, and its voussoirs.
    const edge = rgb(mix(mix([84, 88, 108], [140, 150, 190], flash * 0.4), [200, 160, 100], warm * 0.5));
    ctx.save();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 0.34;
    archPath(ctx, HALF + 0.17, false);
    ctx.stroke();
    ctx.strokeStyle = rgb(MORTAR, 0.9);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const pt = archPoint(HALF + 0.17, t);
      const n = archPoint(HALF + 0.17, Math.min(1, t + 0.001));
      const dx = n.y - pt.y;
      const dy = -(n.x - pt.x);
      const l = Math.hypot(dx, dy) || 1;
      ctx.moveTo(pt.x - (dx / l) * 0.17, pt.y - (dy / l) * 0.17);
      ctx.lineTo(pt.x + (dx / l) * 0.17, pt.y + (dy / l) * 0.17);
    }
    ctx.stroke();
    ctx.restore();
    // The sill.
    ctx.fillStyle = rgb(mix([54, 56, 70], [150, 120, 80], warm * 0.5));
    ctx.fillRect(-HALF - 0.4, -0.05, HALF * 2 + 0.8, 0.16);

    // Two iron gates, swinging out towards us about their hinges.
    const angle = s.open * 1.3;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * HALF, 0);
      ctx.scale(Math.cos(angle), 1 + Math.sin(angle) * 0.06);
      gate(ctx, side, warm, s.lock);
      ctx.restore();
    }
    // The chain and lock across the middle, until they fall.
    if (s.lock < 1) {
      const fall = s.lock * s.lock * 0.9;
      ctx.strokeStyle = rgb(mix([80, 80, 86], [230, 200, 130], warm));
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(-0.28, -1.5 + fall);
      ctx.quadraticCurveTo(0, -1.25 + fall, 0.28, -1.5 + fall);
      ctx.stroke();
      ctx.fillStyle = rgb(mix([66, 60, 50], [230, 190, 110], warm));
      ctx.fillRect(-0.13, -1.34 + fall, 0.26, 0.28);
      ctx.strokeStyle = rgb(mix([66, 60, 50], [230, 190, 110], warm));
      ctx.beginPath();
      ctx.arc(0, -1.34 + fall, 0.09, Math.PI + s.lock * 0.8, 0);
      ctx.stroke();
    }

    // Torches in their brackets, guttering in the rain.
    for (const side of [-1, 1]) {
      const tx = side * 3.55;
      const ty = -2.7;
      ctx.strokeStyle = "#1c1a1c";
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(tx, ty + 0.6);
      ctx.lineTo(tx - side * 0.15, ty + 0.25);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = "#3a2618";
      ctx.fillRect(tx - 0.07, ty - 0.12, 0.14, 0.2);
      const f = flicker(s.seconds * 1.4, side + 4);
      flame(ctx, tx, ty - 0.08, 0.42 * f * (1 - 0.35 * s.sleep), s.seconds * 1.4, side + 4);
      s.lights.push({ x: tx, y: ty - 0.3, r: 3.4, a: 0.32 * f, color: TORCH });
      s.lights.push({ x: tx, y: ty - 0.25, r: 0.7, a: 0.7 * f, color: TORCH });
    }

    // The guards, who fall asleep where they stand.
    for (const g of GUARDS) {
      const sleep = clamp(s.sleep * 1.2 - (g.seed - 1) * 0.15);
      const x = g.x + g.facing * -0.1 * sleep;
      // The spear, upright in his hand, then leaning on the wall.
      const lean = sleep * 0.45 * -g.facing;
      const sx = x + g.facing * 0.2;
      const base = { x: sx + lean * 0.3, y: PATH_Y - 0.05 };
      const tip = { x: base.x + Math.sin(lean) * 2.4, y: base.y - Math.cos(lean) * 2.4 };
      ctx.strokeStyle = "#3a2a1c";
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.fillStyle = rgb(mix([120, 124, 140], [230, 210, 160], warm * 0.5 + flash * 0.3));
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(lean);
      ctx.beginPath();
      ctx.moveTo(0, -0.28);
      ctx.lineTo(0.06, -0.02);
      ctx.lineTo(-0.06, -0.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // A round shield on his back.
      ctx.fillStyle = "#2a2226";
      ctx.beginPath();
      ctx.arc(x - g.facing * 0.12, PATH_Y - g.look.h * lerp(0.62, 0.32, sleep), 0.26, 0, TAU);
      ctx.fill();
      drawPerson(
        ctx,
        x,
        PATH_Y,
        g.look,
        { la: 0.1, lf: 0.2, ra: lerp(0.35, 0.2, sleep), rf: lerp(1.35, 0.7, sleep), sit: sleep, nod: sleep * 0.55, lean: -sleep * 0.08 },
        g.facing,
      );
    }
    // The first blaze pours out through the bars.
    if (s.blaze > 0.01 && s.child) s.lights.push({ x: s.child.x, y: s.child.y, r: 14, a: 0.55 * s.blaze, color: DIVINE });
  }

  /** The wet ground in front, puddles catching the light. */
  drawGround(ctx: Ctx, v: View, s: FortState, until: number) {
    const ground = ctx.createLinearGradient(0, 0, 0, 4);
    ground.addColorStop(0, rgb(mix([30, 30, 38], [90, 70, 50], s.born * 0.5)));
    ground.addColorStop(1, "#0c0d14");
    ctx.fillStyle = ground;
    ctx.fillRect(-40, -0.02, until + 40, 30);
    for (const pd of this.puddles) {
      if (!onScreen(v, pd.x, pd.y, pd.w)) continue;
      ctx.fillStyle = rgb(mix([40, 46, 66], [180, 190, 230], s.flash * 0.7), 0.7);
      ctx.beginPath();
      ctx.ellipse(pd.x, pd.y, pd.w, pd.w * 0.12, 0, 0, TAU);
      ctx.fill();
      // Rings where the rain lands.
      ctx.strokeStyle = "rgba(170, 180, 210, 0.35)";
      ctx.lineWidth = 0.012;
      for (let k = 0; k < 3; k++) {
        const t = (s.seconds * 1.3 + k * 0.37 + pd.x) % 1;
        const rx = pd.x + Math.sin(k * 7 + Math.floor(s.seconds * 1.3 + k * 0.37 + pd.x) * 3.1) * pd.w * 0.6;
        ctx.globalAlpha = 1 - t;
        ctx.beginPath();
        ctx.ellipse(rx, pd.y, t * 0.25, t * 0.03, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}

function archPoint(half: number, t: number) {
  // Up the left jamb, over the pointed crown and down the right, as t goes 0..1.
  const H = SPRING - APEX;
  const bez = (a: number, b: number, c: number, d: number, u: number) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
  if (t < 0.5) {
    const u = t * 2;
    return { x: bez(-half, -half, -half * 0.35, 0, u), y: bez(SPRING, SPRING - 0.75 * H, APEX + 0.08 * H, APEX, u) };
  }
  const u = (t - 0.5) * 2;
  return { x: bez(0, half * 0.35, half, half, u), y: bez(APEX, APEX + 0.08 * H, SPRING - 0.75 * H, SPRING, u) };
}

const ARCH_LEFT = Array.from({ length: 65 }, (_, i) => archPoint(HALF, i / 128));

/** The height of the inside of the arch above x. */
function archY(x: number) {
  const ax = -Math.abs(x);
  if (ax <= -HALF) return SPRING;
  for (let i = 0; i < ARCH_LEFT.length - 1; i++) {
    const a = ARCH_LEFT[i];
    const b = ARCH_LEFT[i + 1];
    if (ax >= a.x && ax <= b.x) return lerp(a.y, b.y, (ax - a.x) / (b.x - a.x || 1));
  }
  return APEX;
}

/** The pointed arch of the cell, closed along the ground unless `closed` is false. */
function archPath(ctx: Ctx, half: number, closed = true) {
  const H = SPRING - APEX;
  ctx.beginPath();
  ctx.moveTo(-half, closed ? 0.02 : 0);
  ctx.lineTo(-half, SPRING);
  ctx.bezierCurveTo(-half, SPRING - 0.75 * H, -half * 0.35, APEX + 0.08 * H, 0, APEX);
  ctx.bezierCurveTo(half * 0.35, APEX + 0.08 * H, half, SPRING - 0.75 * H, half, SPRING);
  ctx.lineTo(half, closed ? 0.02 : 0);
  if (closed) ctx.closePath();
}

/** One iron gate, drawn from its hinge at the origin towards the middle of the arch. */
function gate(ctx: Ctx, side: number, warm: number, lock: number) {
  const iron = rgb(mix([28, 28, 32], [120, 96, 60], warm * 0.6));
  const lit = rgb(mix([70, 72, 82], [250, 214, 150], warm), 0.9);
  const H = SPRING - APEX;
  // The top of each bar follows the arch.
  const topAt = (x: number) => archY(side * HALF + x);
  ctx.lineCap = "butt";
  const bars = 7;
  for (let i = 0; i <= bars; i++) {
    const x = -side * (i / bars) * HALF;
    const top = topAt(x) + 0.08;
    ctx.strokeStyle = iron;
    ctx.lineWidth = 0.075;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, top);
    ctx.stroke();
    ctx.strokeStyle = lit;
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(x + side * 0.02, 0);
    ctx.lineTo(x + side * 0.02, top);
    ctx.stroke();
    // Spikes along the top.
    ctx.fillStyle = iron;
    ctx.beginPath();
    ctx.moveTo(x - 0.05, top + 0.04);
    ctx.lineTo(x, top - 0.1);
    ctx.lineTo(x + 0.05, top + 0.04);
    ctx.fill();
  }
  // Cross bands, studded.
  ctx.strokeStyle = iron;
  ctx.lineWidth = 0.1;
  for (const y of [-0.55, -1.45, -2.35]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(-side * HALF, y);
    ctx.stroke();
  }
  ctx.fillStyle = lit;
  for (const y of [-0.55, -1.45, -2.35])
    for (let i = 0; i <= bars; i++) {
      ctx.beginPath();
      ctx.arc(-side * (i / bars) * HALF, y, 0.035, 0, TAU);
      ctx.fill();
    }
  // The hasp where the lock went.
  if (lock < 1) {
    ctx.fillStyle = iron;
    ctx.fillRect(-side * HALF - (side > 0 ? 0 : -0.0), -1.55, side * 0.12, 0.2);
  }
}

/** A chain of iron links from (x0, y0) to (x1, y1), hanging with `sag`. */
function chain(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, warm: number) {
  const links = 14;
  ctx.strokeStyle = rgb(mix([60, 60, 66], [220, 190, 130], warm));
  ctx.lineWidth = 0.022;
  for (let i = 0; i < links; i++) {
    const t = (i + 0.5) / links;
    const x = lerp(x0, x1, t);
    const y = lerp(y0, y1, t) + Math.sin(t * Math.PI) * sag;
    const nx = lerp(x0, x1, t + 0.02);
    const ny = lerp(y0, y1, t + 0.02) + Math.sin((t + 0.02) * Math.PI) * sag;
    ctx.beginPath();
    ctx.ellipse(x, y, 0.05, i % 2 ? 0.018 : 0.03, Math.atan2(ny - y, nx - x), 0, TAU);
    ctx.stroke();
  }
}
