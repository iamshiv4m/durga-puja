// The people of the story, and their cows, painted flat like cut paper: a body, a few garments and
// whatever they carry. A person is drawn in units of their height, feet at the origin, facing +x.
import { TAU, clamp, lerp, mix, rgb, type Ctx, type RGB } from "../paint";

export type Head = "bare" | "bun" | "pagri" | "turban" | "odhni" | "pallu" | "shikha" | "band";
export type Dress = "dhoti" | "lehenga" | "sari" | "shorts" | "pyjama";

export type Look = {
  h: number;
  skin: RGB;
  /** Kurta, choli, blouse or T-shirt. */
  top: RGB;
  /** Dhoti, lehenga, sari or shorts. */
  bottom: RGB;
  /** Pagri, odhni, pallu or headband. */
  wrap: RGB;
  head: Head;
  dress: Dress;
  woman?: boolean;
  /** Bare-chested, with the sacred thread (the pujari), or a shawl over one shoulder. */
  bare?: boolean;
  shawl?: RGB;
  beard?: RGB;
  /** A border woven along the hem of the lehenga or sari. */
  border?: RGB;
};

/**
 * Arm angles are from hanging straight down, positive swinging towards the way the figure faces:
 * 0 is at the side, π/2 straight out in front, π straight up.
 */
export type Pose = {
  la: number;
  lf: number;
  ra: number;
  rf: number;
  lean?: number;
  /** Head bowed forward, radians. */
  nod?: number;
  /** 0 standing, 1 sitting cross-legged on the ground. */
  sit?: number;
  /** Walking: the stride's phase, and how long the stride is. */
  step?: number;
  stride?: number;
  bob?: number;
};

export type Hands = { left: { x: number; y: number }; right: { x: number; y: number }; head: { x: number; y: number } };

const SHOULDER = { y: -0.79, x: 0.085 };
const UPPER = 0.17;
const FOREARM = 0.16;
const HIP = -0.5;
const HAIR: RGB = [22, 16, 14];

export const SKIN: RGB[] = [
  [184, 124, 86],
  [160, 104, 70],
  [134, 84, 56],
  [202, 146, 104],
  [116, 72, 48],
];

/** Draws a person standing (or sitting) on (x, y); returns where the hands and head are, in world units. */
export function drawPerson(ctx: Ctx, x: number, y: number, look: Look, pose: Pose, facing: 1 | -1 = 1): Hands {
  const { h } = look;
  const sit = clamp(pose.sit ?? 0);
  const bob = (pose.bob ?? 0) + sit * 0.4;
  const lean = pose.lean ?? 0;
  const woman = look.woman ?? false;
  const skin = rgb(look.skin);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Below the waist.
  if (sit > 0.5) {
    // Cross-legged: knees out to either side under the cloth.
    ctx.fillStyle = rgb(look.bottom);
    ctx.beginPath();
    ctx.moveTo(-0.09, HIP + bob + 0.02);
    ctx.quadraticCurveTo(-0.26, -0.1, -0.24, -0.02);
    ctx.quadraticCurveTo(0, 0.02, 0.24, -0.02);
    ctx.quadraticCurveTo(0.26, -0.1, 0.09, HIP + bob + 0.02);
    ctx.closePath();
    ctx.fill();
    if (look.border) {
      ctx.strokeStyle = rgb(look.border);
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(-0.235, -0.025);
      ctx.quadraticCurveTo(0, 0.01, 0.235, -0.025);
      ctx.stroke();
    }
  } else {
    const stride = pose.stride ?? 0;
    const phase = pose.step ?? 0;
    const swing = Math.sin(phase) * stride;
    if (look.dress === "lehenga" || look.dress === "sari") {
      const sway = swing * 0.05;
      ctx.fillStyle = rgb(look.bottom);
      ctx.beginPath();
      ctx.moveTo(-0.075, -0.56 + bob);
      ctx.lineTo(0.075, -0.56 + bob);
      ctx.quadraticCurveTo(0.15 + sway, -0.3, 0.2 + sway, -0.015);
      ctx.quadraticCurveTo(0, 0.02, -0.2 + sway, -0.015);
      ctx.quadraticCurveTo(-0.15 + sway, -0.3, -0.075, -0.56 + bob);
      ctx.fill();
      if (look.border) {
        ctx.strokeStyle = rgb(look.border);
        ctx.lineWidth = 0.028;
        ctx.beginPath();
        ctx.moveTo(0.19 + sway, -0.035);
        ctx.quadraticCurveTo(0, -0.005, -0.19 + sway, -0.035);
        ctx.stroke();
      }
      ctx.fillStyle = rgb(mix(look.skin, [40, 24, 16], 0.25));
      ctx.beginPath();
      ctx.ellipse(-0.06 + swing * 0.06, -0.008, 0.045, 0.018, 0, 0, TAU);
      ctx.ellipse(0.06 - swing * 0.06, -0.008, 0.045, 0.018, 0, 0, TAU);
      ctx.fill();
    } else {
      // Two legs, swinging from the hip when walking.
      const leg = (side: number, angle: number) => {
        const hx = side * 0.05;
        const hy = HIP + bob;
        const kx = hx + Math.sin(angle) * 0.25;
        const ky = hy + Math.cos(angle) * 0.25;
        const back = Math.max(0, -angle) * 0.9;
        const fx = kx + Math.sin(angle - back) * 0.25;
        const fy = Math.min(-0.012, ky + Math.cos(angle - back) * 0.25);
        const cloth = look.dress === "shorts" ? 0.55 : look.dress === "dhoti" ? 0.72 : 1;
        ctx.strokeStyle = skin;
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(kx, ky);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.strokeStyle = rgb(look.bottom);
        ctx.lineWidth = look.dress === "dhoti" ? 0.1 : 0.085;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        if (cloth <= 0.55) ctx.lineTo(lerp(hx, kx, 0.8), lerp(hy, ky, 0.8));
        else {
          ctx.lineTo(kx, ky);
          ctx.lineTo(lerp(kx, fx, (cloth - 0.5) * 2), lerp(ky, fy, (cloth - 0.5) * 2));
        }
        ctx.stroke();
        ctx.fillStyle = rgb(mix(look.skin, [40, 24, 16], 0.25));
        ctx.beginPath();
        ctx.ellipse(fx + 0.02, fy + 0.004, 0.045, 0.018, 0, 0, TAU);
        ctx.fill();
      };
      leg(-1, swing * 0.5);
      leg(1, -swing * 0.5);
      if (look.dress === "dhoti") {
        // The pleated front of the dhoti, falling between the knees.
        ctx.fillStyle = rgb(mix(look.bottom, [255, 255, 255], 0.08));
        ctx.beginPath();
        ctx.moveTo(-0.09, HIP + bob);
        ctx.lineTo(0.09, HIP + bob);
        ctx.lineTo(0.05, -0.22 + bob * 0.5);
        ctx.lineTo(-0.02, -0.2 + bob * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Above the waist, leaning from the hip.
  ctx.translate(0, HIP + bob);
  ctx.rotate(lean);
  ctx.translate(0, -HIP);

  if (look.head === "odhni" || look.head === "pallu") {
    // The odhni falls behind the shoulders to the waist.
    ctx.fillStyle = rgb(mix(look.wrap, [0, 0, 0], 0.2));
    ctx.beginPath();
    ctx.moveTo(-0.075, -0.95);
    ctx.quadraticCurveTo(-0.15, -0.8, -0.14, -0.48);
    ctx.lineTo(0.12, -0.5);
    ctx.quadraticCurveTo(0.14, -0.8, 0.075, -0.95);
    ctx.closePath();
    ctx.fill();
  }

  // Torso.
  ctx.fillStyle = look.bare ? skin : rgb(look.top);
  ctx.beginPath();
  if (woman) {
    ctx.moveTo(-0.088, -0.8);
    ctx.lineTo(0.088, -0.8);
    ctx.lineTo(0.072, -0.54);
    ctx.lineTo(-0.072, -0.54);
  } else {
    ctx.moveTo(-0.092, -0.8);
    ctx.lineTo(0.092, -0.8);
    ctx.lineTo(look.dress === "shorts" || look.bare ? 0.085 : 0.11, look.dress === "shorts" || look.bare ? -0.49 : -0.34);
    ctx.lineTo(look.dress === "shorts" || look.bare ? -0.085 : -0.11, look.dress === "shorts" || look.bare ? -0.49 : -0.34);
  }
  ctx.closePath();
  ctx.fill();
  if (woman) {
    ctx.fillStyle = skin;
    ctx.fillRect(-0.066, -0.585, 0.132, 0.04);
    if (look.dress === "sari") {
      // The pallu, across the chest and over the shoulder.
      ctx.fillStyle = rgb(look.bottom);
      ctx.beginPath();
      ctx.moveTo(-0.07, -0.54);
      ctx.lineTo(0.02, -0.54);
      ctx.lineTo(0.09, -0.8);
      ctx.lineTo(0.02, -0.8);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (look.bare) {
    // The janeu, over the left shoulder.
    ctx.strokeStyle = "rgba(245, 238, 220, 0.9)";
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(-0.07, -0.79);
    ctx.lineTo(0.08, -0.52);
    ctx.stroke();
  }
  if (look.shawl) {
    ctx.fillStyle = rgb(look.shawl);
    ctx.beginPath();
    ctx.moveTo(-0.095, -0.8);
    ctx.lineTo(-0.02, -0.8);
    ctx.lineTo(0.1, -0.5);
    ctx.lineTo(0.04, -0.47);
    ctx.closePath();
    ctx.fill();
  }

  // Neck and head.
  const nod = pose.nod ?? 0;
  ctx.fillStyle = skin;
  ctx.fillRect(-0.022, -0.86, 0.044, 0.08);
  ctx.save();
  ctx.translate(0, -0.84);
  ctx.rotate(nod);
  ctx.translate(0, 0.84);
  ctx.beginPath();
  ctx.ellipse(0, -0.895, 0.058, 0.068, 0, 0, TAU);
  ctx.fill();
  if (look.beard) {
    ctx.fillStyle = rgb(look.beard);
    ctx.beginPath();
    ctx.ellipse(0.005, -0.855, 0.052, 0.04, 0, 0, Math.PI);
    ctx.fill();
  }
  head(ctx, look);
  ctx.restore();

  // Arms: sleeve, then forearm and hand.
  const hands: Hands = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 }, head: { x: x, y: y - h * (0.95 - bob) } };
  const arm = (side: -1 | 1, upper: number, fore: number) => {
    const sx = side * SHOULDER.x;
    const sy = SHOULDER.y;
    const ex = sx + Math.sin(upper) * UPPER;
    const ey = sy + Math.cos(upper) * UPPER;
    const hx = ex + Math.sin(fore) * FOREARM;
    const hy = ey + Math.cos(fore) * FOREARM;
    const sleeve = !look.bare && !woman;
    ctx.strokeStyle = sleeve ? rgb(look.top) : skin;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    if (woman) {
      ctx.strokeStyle = "rgba(210, 40, 60, 0.95)";
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.moveTo(lerp(ex, hx, 0.72), lerp(ey, hy, 0.72));
      ctx.lineTo(lerp(ex, hx, 0.8), lerp(ey, hy, 0.8));
      ctx.stroke();
    }
    // Back to world units, through the lean and the facing.
    const c = Math.cos(lean);
    const s = Math.sin(lean);
    const wx = (hx * c - (hy - HIP) * s) * facing * h + x;
    const wy = (hx * s + (hy - HIP) * c + HIP + bob) * h + y;
    return { x: wx, y: wy };
  };
  hands.left = arm(-1, pose.la, pose.lf);
  hands.right = arm(1, pose.ra, pose.rf);
  ctx.restore();
  return hands;
}

function head(ctx: Ctx, look: Look) {
  const w = look.wrap;
  if (look.head === "pagri" || look.head === "turban") {
    const big = look.head === "pagri";
    ctx.fillStyle = rgb(w);
    ctx.beginPath();
    ctx.ellipse(0, -0.95, big ? 0.082 : 0.07, big ? 0.055 : 0.045, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(mix(w, [255, 255, 255], 0.28));
    ctx.fillRect(-0.075, -0.945, 0.15, 0.012);
    if (big) {
      // The tail of the pagri over the shoulder.
      ctx.fillStyle = rgb(mix(w, [0, 0, 0], 0.15));
      ctx.beginPath();
      ctx.moveTo(-0.06, -0.93);
      ctx.quadraticCurveTo(-0.12, -0.86, -0.1, -0.76);
      ctx.lineTo(-0.07, -0.78);
      ctx.closePath();
      ctx.fill();
    }
  } else if (look.head === "odhni" || look.head === "pallu") {
    ctx.fillStyle = rgb(w);
    ctx.beginPath();
    ctx.ellipse(0, -0.925, 0.072, 0.056, 0, Math.PI, 0);
    ctx.lineTo(0.072, -0.86);
    ctx.lineTo(0.054, -0.9);
    ctx.lineTo(-0.054, -0.9);
    ctx.lineTo(-0.072, -0.86);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = rgb(HAIR);
    ctx.beginPath();
    ctx.ellipse(0, -0.915, 0.06, 0.05, 0, Math.PI, 0);
    ctx.fill();
    if (look.head === "bun") {
      ctx.beginPath();
      ctx.arc(0, -0.965, 0.028, 0, TAU);
      ctx.fill();
    }
    if (look.head === "shikha") {
      ctx.beginPath();
      ctx.moveTo(-0.01, -0.96);
      ctx.quadraticCurveTo(-0.05, -0.97, -0.06, -0.93);
      ctx.lineWidth = 0.012;
      ctx.strokeStyle = rgb(HAIR);
      ctx.stroke();
      // The tilak.
      ctx.strokeStyle = "rgba(240, 200, 120, 0.95)";
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.moveTo(-0.008, -0.93);
      ctx.lineTo(-0.008, -0.905);
      ctx.moveTo(0.008, -0.93);
      ctx.lineTo(0.008, -0.905);
      ctx.stroke();
    }
    if (look.head === "band") {
      ctx.fillStyle = rgb(w);
      ctx.fillRect(-0.061, -0.935, 0.122, 0.022);
      ctx.beginPath();
      ctx.moveTo(-0.058, -0.93);
      ctx.lineTo(-0.1, -0.9);
      ctx.lineTo(-0.085, -0.885);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ─── Cows ────────────────────────────────────────────────────────────────────

export type Cow = { coat: RGB; horns: RGB; size: number; seed: number; calf?: boolean; bell?: boolean };

/**
 * A zebu cow of Braj, side on, standing on (x, y) and facing `facing`: humped, with a dewlap and
 * curved horns, the tips painted. `graze` lowers the head to the grass; `tail` swishes it.
 */
export function drawCow(ctx: Ctx, x: number, y: number, cow: Cow, graze: number, seconds: number, facing: 1 | -1 = 1, light = 1) {
  const s = cow.size;
  const coat = mix([30, 26, 26], cow.coat, light);
  const shade = mix(coat, [40, 30, 30], 0.35);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const legs = (xs: number[], colour: RGB) => {
    ctx.strokeStyle = rgb(colour);
    ctx.lineWidth = 0.075;
    for (const lx of xs) {
      ctx.beginPath();
      ctx.moveTo(lx, -0.55);
      ctx.lineTo(lx + 0.01, -0.05);
      ctx.stroke();
    }
    ctx.fillStyle = rgb([34, 26, 22]);
    for (const lx of xs) ctx.fillRect(lx - 0.035, -0.06, 0.08, 0.06);
  };
  legs([-0.42, 0.3], shade);
  // Tail.
  const swish = Math.sin(seconds * 1.7 + cow.seed * 4) * 0.12;
  ctx.strokeStyle = rgb(shade);
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.58, -0.88);
  ctx.quadraticCurveTo(-0.7 + swish * 0.5, -0.6, -0.64 + swish, -0.3);
  ctx.stroke();
  ctx.fillStyle = rgb([40, 30, 26]);
  ctx.beginPath();
  ctx.ellipse(-0.64 + swish, -0.27, 0.03, 0.07, swish, 0, TAU);
  ctx.fill();
  // Body, hump and dewlap.
  ctx.fillStyle = rgb(coat);
  ctx.beginPath();
  ctx.moveTo(-0.6, -0.86);
  ctx.quadraticCurveTo(-0.3, -0.98, 0.18, -0.95);
  ctx.quadraticCurveTo(0.28, -1.12, 0.4, -1.0);
  ctx.quadraticCurveTo(0.5, -0.92, 0.52, -0.8);
  ctx.quadraticCurveTo(0.5, -0.5, 0.42, -0.48);
  ctx.quadraticCurveTo(0, -0.46, -0.5, -0.5);
  ctx.quadraticCurveTo(-0.66, -0.62, -0.6, -0.86);
  ctx.fill();
  // Belly shade.
  ctx.fillStyle = rgb(shade, 0.5);
  ctx.beginPath();
  ctx.ellipse(-0.05, -0.52, 0.42, 0.07, 0, 0, TAU);
  ctx.fill();
  legs([-0.34, 0.38], coat);
  // Neck and head, lowered to graze.
  const g = clamp(graze);
  const hx = lerp(0.78, 0.74, g);
  const hy = lerp(-0.98, -0.3, g);
  ctx.fillStyle = rgb(coat);
  ctx.beginPath();
  ctx.moveTo(0.36, -1.0);
  ctx.quadraticCurveTo(hx - 0.1, hy - 0.08, hx, hy - 0.04);
  ctx.lineTo(hx + 0.02, hy + 0.1);
  ctx.quadraticCurveTo(0.5, lerp(-0.62, -0.4, g), 0.4, -0.55);
  ctx.closePath();
  ctx.fill();
  // The dewlap, hanging in folds under the neck.
  ctx.fillStyle = rgb(mix(coat, shade, 0.4));
  ctx.beginPath();
  ctx.moveTo(0.42, -0.62);
  ctx.quadraticCurveTo(0.5, lerp(-0.45, -0.36, g), lerp(0.62, 0.66, g), lerp(-0.72, -0.38, g));
  ctx.lineTo(0.5, -0.78);
  ctx.closePath();
  ctx.fill();
  // Head: a long face and a dark muzzle.
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(lerp(0.5, 1.25, g));
  ctx.fillStyle = rgb(coat);
  ctx.beginPath();
  ctx.ellipse(0.08, 0, 0.16, 0.075, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgb([46, 34, 32]);
  ctx.beginPath();
  ctx.ellipse(0.22, 0.005, 0.05, 0.055, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgb([20, 14, 12]);
  ctx.beginPath();
  ctx.arc(0.04, -0.035, 0.014, 0, TAU);
  ctx.fill();
  // An ear, and horns curving up, their tips painted.
  ctx.fillStyle = rgb(shade);
  ctx.beginPath();
  ctx.ellipse(-0.06, 0.04, 0.07, 0.025, 0.6, 0, TAU);
  ctx.fill();
  if (!cow.calf) {
    ctx.strokeStyle = rgb([200, 186, 160]);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.02, -0.05);
    ctx.quadraticCurveTo(-0.08, -0.14, -0.02, -0.22);
    ctx.stroke();
    ctx.strokeStyle = rgb(cow.horns);
    ctx.beginPath();
    ctx.moveTo(-0.045, -0.16);
    ctx.quadraticCurveTo(-0.04, -0.2, -0.02, -0.22);
    ctx.stroke();
  }
  ctx.restore();
  if (cow.bell) {
    // A bell on a red cord.
    ctx.strokeStyle = "rgba(170, 30, 30, 0.95)";
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(lerp(0.5, 0.6, g), lerp(-0.86, -0.5, g));
    ctx.quadraticCurveTo(0.56, lerp(-0.66, -0.42, g), lerp(0.5, 0.52, g), lerp(-0.6, -0.4, g));
    ctx.stroke();
    ctx.fillStyle = rgb([200, 160, 70]);
    ctx.beginPath();
    ctx.arc(lerp(0.52, 0.54, g), lerp(-0.57, -0.37, g), 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Seven hoods of Sheshnaag, fanned over (x, y) and opening by `open` (0..1). */
export function drawHoods(ctx: Ctx, x: number, y: number, size: number, open: number, seconds: number) {
  const count = 7;
  const spread = lerp(0.2, 1.45, open);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const heads: { a: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1) - 0.5;
    heads.push({ a: t * spread, r: 1 - Math.abs(t) * 0.25 });
  }
  // Outer hoods first, the middle one on top.
  heads.sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
  for (const hd of heads) {
    ctx.save();
    ctx.rotate(hd.a + Math.sin(seconds * 1.3 + hd.a * 5) * 0.03);
    ctx.translate(0, -0.9 * hd.r);
    // The neck rising to the hood.
    ctx.fillStyle = "#1c3c46";
    ctx.beginPath();
    ctx.moveTo(-0.1, 0.9 * hd.r);
    ctx.quadraticCurveTo(-0.14, 0.4, -0.12, 0.1);
    ctx.lineTo(0.12, 0.1);
    ctx.quadraticCurveTo(0.14, 0.4, 0.1, 0.9 * hd.r);
    ctx.closePath();
    ctx.fill();
    // The hood, spread wide, pale beneath with the mark on it.
    const hood = ctx.createLinearGradient(0, -0.45, 0, 0.3);
    hood.addColorStop(0, "#2d6470");
    hood.addColorStop(1, "#153039");
    ctx.fillStyle = hood;
    ctx.beginPath();
    ctx.moveTo(0, -0.42);
    ctx.bezierCurveTo(0.28, -0.4, 0.3, -0.05, 0.12, 0.26);
    ctx.lineTo(-0.12, 0.26);
    ctx.bezierCurveTo(-0.3, -0.05, -0.28, -0.4, 0, -0.42);
    ctx.fill();
    ctx.fillStyle = "#d9c98a";
    ctx.beginPath();
    ctx.moveTo(0, -0.3);
    ctx.bezierCurveTo(0.16, -0.26, 0.16, 0.0, 0.07, 0.2);
    ctx.lineTo(-0.07, 0.2);
    ctx.bezierCurveTo(-0.16, 0.0, -0.16, -0.26, 0, -0.3);
    ctx.fill();
    // The mark, and scales in rows.
    ctx.strokeStyle = "rgba(40, 70, 70, 0.8)";
    ctx.lineWidth = 0.018;
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.moveTo(-0.1 + r * 0.01, -0.12 + r * 0.08);
      ctx.quadraticCurveTo(0, -0.08 + r * 0.08, 0.1 - r * 0.01, -0.12 + r * 0.08);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(30, 60, 64, 0.9)";
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.arc(-0.05, -0.2, 0.035, 0, TAU);
    ctx.moveTo(0.085, -0.2);
    ctx.arc(0.05, -0.2, 0.035, 0, TAU);
    ctx.stroke();
    // The head at the top of the hood.
    ctx.fillStyle = "#23505a";
    ctx.beginPath();
    ctx.ellipse(0, -0.47, 0.085, 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffd98a";
    ctx.beginPath();
    ctx.arc(-0.035, -0.49, 0.013, 0, TAU);
    ctx.arc(0.035, -0.49, 0.013, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
