// The people of the lane, painted flat like cut paper: a body, a few garments, and whatever they
// are holding. Everything is drawn in units of the figure's height, feet at the origin, facing +x.
import { TAU, clamp, lerp, mix, rgb, type Ctx, type RGB } from "../paint";

export type Hold = "lathi" | "shield" | "pichkari" | "dhol" | "wheat" | "coconut" | "plate" | "bucket";

export type Look = {
  h: number;
  skin: RGB;
  /** Kurta, or choli. */
  top: RGB;
  /** Dhoti or pyjama, or the skirt. */
  bottom: RGB;
  /** Turban or odhni. */
  wrap: RGB;
  head: "bare" | "turban" | "odhni" | "bun";
  woman: boolean;
  /** Gulal on clothes and faces, in body units. */
  stains: { x: number; y: number; r: number; c: RGB }[];
};

/**
 * Arm angles are measured from hanging straight down, positive swinging towards the way the figure
 * faces: 0 is at the side, π/2 straight out in front, π straight up.
 */
export type Pose = { la: number; lf: number; ra: number; rf: number; lean?: number; bob?: number; hold?: Hold };

export type Hands = { left: { x: number; y: number }; right: { x: number; y: number }; tip: { x: number; y: number } };

const SHOULDER = { y: -0.785, x: 0.08 };
const UPPER = 0.165;
const FOREARM = 0.16;
const HIP = -0.5;

export const SKIN: RGB[] = [
  [196, 136, 96],
  [168, 110, 74],
  [142, 90, 60],
  [210, 158, 116],
  [120, 76, 52],
];

/** Draws a person standing on (x, y) facing `facing`; returns where the hands are, in world units. */
export function drawPerson(ctx: Ctx, x: number, y: number, look: Look, pose: Pose, colour = 0, facing: 1 | -1 = 1): Hands {
  const { h } = look;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);

  // Below the waist.
  if (look.woman) {
    ctx.fillStyle = rgb(look.bottom);
    ctx.beginPath();
    ctx.moveTo(-0.075, -0.56 + bob);
    ctx.lineTo(0.075, -0.56 + bob);
    ctx.quadraticCurveTo(0.14, -0.3, 0.19, -0.015);
    ctx.quadraticCurveTo(0, 0.02, -0.19, -0.015);
    ctx.quadraticCurveTo(-0.14, -0.3, -0.075, -0.56 + bob);
    ctx.fill();
    // A border at the hem.
    ctx.strokeStyle = rgb(mix(look.bottom, [250, 200, 80], 0.6));
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(0.18, -0.03);
    ctx.quadraticCurveTo(0, 0.0, -0.18, -0.03);
    ctx.stroke();
  } else {
    ctx.fillStyle = rgb(look.bottom);
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.52 + bob);
    ctx.lineTo(0.08, -0.52 + bob);
    ctx.lineTo(0.095, -0.01);
    ctx.lineTo(0.02, -0.01);
    ctx.lineTo(0, -0.3);
    ctx.lineTo(-0.02, -0.01);
    ctx.lineTo(-0.095, -0.01);
    ctx.closePath();
    ctx.fill();
  }
  // Feet.
  ctx.fillStyle = rgb(mix(look.skin, [40, 24, 16], 0.25));
  ctx.beginPath();
  ctx.ellipse(-0.06, -0.008, 0.045, 0.018, 0, 0, TAU);
  ctx.ellipse(0.06, -0.008, 0.045, 0.018, 0, 0, TAU);
  ctx.fill();

  // Above the waist, leaning from the hip.
  ctx.translate(0, HIP + bob);
  ctx.rotate(lean);
  ctx.translate(0, -HIP);

  if (look.head === "odhni") {
    // The odhni falls behind the shoulders to the waist.
    ctx.fillStyle = rgb(mix(look.wrap, [0, 0, 0], 0.18));
    ctx.beginPath();
    ctx.moveTo(-0.075, -0.95);
    ctx.quadraticCurveTo(-0.14, -0.8, -0.13, -0.5);
    ctx.lineTo(0.13, -0.5);
    ctx.quadraticCurveTo(0.14, -0.8, 0.075, -0.95);
    ctx.closePath();
    ctx.fill();
  }

  // Torso.
  ctx.fillStyle = rgb(look.top);
  ctx.beginPath();
  if (look.woman) {
    ctx.moveTo(-0.085, -0.8);
    ctx.lineTo(0.085, -0.8);
    ctx.lineTo(0.07, -0.54);
    ctx.lineTo(-0.07, -0.54);
  } else {
    ctx.moveTo(-0.09, -0.8);
    ctx.lineTo(0.09, -0.8);
    ctx.lineTo(0.115, -0.3);
    ctx.lineTo(-0.115, -0.3);
  }
  ctx.closePath();
  ctx.fill();
  if (look.woman) {
    ctx.fillStyle = rgb(look.skin);
    ctx.fillRect(-0.065, -0.58, 0.13, 0.035);
  }
  // Neck and head.
  ctx.fillStyle = rgb(look.skin);
  ctx.fillRect(-0.022, -0.86, 0.044, 0.07);
  ctx.beginPath();
  ctx.ellipse(0, -0.895, 0.058, 0.068, 0, 0, TAU);
  ctx.fill();
  const hair: RGB = [26, 18, 16];
  if (look.head === "turban") {
    ctx.fillStyle = rgb(look.wrap);
    ctx.beginPath();
    ctx.ellipse(0, -0.95, 0.072, 0.045, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(mix(look.wrap, [255, 255, 255], 0.25));
    ctx.fillRect(-0.068, -0.94, 0.136, 0.012);
  } else if (look.head === "odhni") {
    ctx.fillStyle = rgb(look.wrap);
    ctx.beginPath();
    ctx.ellipse(0, -0.925, 0.07, 0.055, 0, Math.PI, 0);
    ctx.lineTo(0.07, -0.86);
    ctx.lineTo(0.052, -0.9);
    ctx.lineTo(-0.052, -0.9);
    ctx.lineTo(-0.07, -0.86);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = rgb(hair);
    ctx.beginPath();
    ctx.ellipse(0, -0.915, 0.06, 0.05, 0, Math.PI, 0);
    ctx.fill();
    if (look.head === "bun") {
      ctx.beginPath();
      ctx.arc(-0.05, -0.93, 0.03, 0, TAU);
      ctx.fill();
    }
  }

  // Gulal, on the clothes and the face.
  if (colour > 0.01) {
    for (const s of look.stains) {
      ctx.fillStyle = rgb(s.c, 0.85 * clamp(colour * 1.5 - (s.y + 1) * 0.3));
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.8, s.x * 3, 0, TAU);
      ctx.fill();
    }
  }

  // Arms: sleeve, then forearm and hand.
  const arm = (side: -1 | 1, upper: number, fore: number) => {
    const sx = side * SHOULDER.x;
    const sy = SHOULDER.y;
    const ex = sx + Math.sin(upper) * UPPER;
    const ey = sy + Math.cos(upper) * UPPER;
    const hx = ex + Math.sin(fore) * FOREARM;
    const hy = ey + Math.cos(fore) * FOREARM;
    ctx.lineCap = "round";
    ctx.strokeStyle = rgb(look.woman ? look.skin : look.top);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = rgb(look.skin);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    if (look.woman) {
      // Bangles.
      ctx.strokeStyle = "rgba(220, 40, 60, 0.9)";
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.moveTo(lerp(ex, hx, 0.72), lerp(ey, hy, 0.72));
      ctx.lineTo(lerp(ex, hx, 0.8), lerp(ey, hy, 0.8));
      ctx.stroke();
    }
    ctx.fillStyle = rgb(look.skin);
    ctx.beginPath();
    ctx.arc(hx, hy, 0.026, 0, TAU);
    ctx.fill();
    return { x: hx, y: hy, angle: fore };
  };

  // Things carried in front of the body go on before the arms.
  if (pose.hold === "dhol") {
    ctx.strokeStyle = "rgba(60, 30, 20, 0.9)";
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.78);
    ctx.lineTo(0.02, -0.5);
    ctx.stroke();
    const drum = ctx.createLinearGradient(0, -0.6, 0, -0.38);
    drum.addColorStop(0, "#c2502a");
    drum.addColorStop(0.5, "#8a2c18");
    drum.addColorStop(1, "#5a1a0e");
    ctx.fillStyle = drum;
    ctx.beginPath();
    ctx.ellipse(0, -0.49, 0.2, 0.11, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8d6b0";
    ctx.beginPath();
    ctx.ellipse(-0.19, -0.49, 0.03, 0.105, 0, 0, TAU);
    ctx.ellipse(0.19, -0.49, 0.03, 0.105, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(240, 210, 140, 0.8)";
    ctx.lineWidth = 0.008;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-0.17, -0.49 + i * 0.03);
      ctx.lineTo(0.17, -0.49 - i * 0.03);
      ctx.stroke();
    }
  }
  const left = arm(-1, pose.la, pose.lf);
  const right = arm(1, pose.ra, pose.rf);

  let tip = { x: right.x, y: right.y };
  const along = (d: number) => ({ x: right.x + Math.sin(right.angle) * d, y: right.y + Math.cos(right.angle) * d });
  ctx.lineCap = "round";
  switch (pose.hold) {
    case "lathi": {
      // A long bamboo lathi, bound with brass.
      const a = along(0.75);
      const b = along(-0.35);
      ctx.strokeStyle = "#8a5a2a";
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.strokeStyle = "#e0b850";
      ctx.lineWidth = 0.028;
      const c = along(0.68);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      tip = a;
      break;
    }
    case "shield": {
      ctx.fillStyle = "#7a4a22";
      ctx.beginPath();
      ctx.ellipse(right.x, right.y - 0.02, 0.2, 0.07, -0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#d9a441";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(right.x - 0.09 + i * 0.06, right.y - 0.03, 0.012, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "pichkari": {
      const a = along(0.24);
      ctx.strokeStyle = "#c9a040";
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.strokeStyle = "#8a6420";
      ctx.lineWidth = 0.012;
      const b = along(-0.08);
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      tip = along(0.27);
      break;
    }
    case "wheat": {
      // A few stalks of new wheat, ears up.
      for (let i = -1; i <= 1; i++) {
        const top = { x: right.x + i * 0.03, y: right.y - 0.3 };
        ctx.strokeStyle = "#b99a4a";
        ctx.lineWidth = 0.008;
        ctx.beginPath();
        ctx.moveTo(right.x, right.y + 0.05);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();
        ctx.fillStyle = "#e0bd5a";
        ctx.beginPath();
        ctx.ellipse(top.x, top.y - 0.03, 0.012, 0.04, i * 0.2, 0, TAU);
        ctx.fill();
      }
      tip = { x: right.x, y: right.y - 0.33 };
      break;
    }
    case "coconut": {
      ctx.fillStyle = "#6a4222";
      ctx.beginPath();
      ctx.arc(right.x, right.y - 0.03, 0.045, 0, TAU);
      ctx.fill();
      break;
    }
    case "plate": {
      ctx.fillStyle = "#d8a93a";
      ctx.beginPath();
      ctx.ellipse(right.x, right.y - 0.01, 0.12, 0.025, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#e9c27a";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(right.x + i * 0.04, right.y - 0.03, 0.022, 0.014, 0, Math.PI, 0);
        ctx.fill();
      }
      break;
    }
    case "bucket": {
      ctx.fillStyle = "#8a96a0";
      ctx.beginPath();
      ctx.moveTo(right.x - 0.07, right.y);
      ctx.lineTo(right.x + 0.07, right.y);
      ctx.lineTo(right.x + 0.05, right.y + 0.12);
      ctx.lineTo(right.x - 0.05, right.y + 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();

  // Back to world units (mirror with the figure, and the lean around the hip).
  const world = (p: { x: number; y: number }) => {
    const py = p.y - HIP;
    const rx = p.x * Math.cos(lean) - py * Math.sin(lean);
    const ry = p.x * Math.sin(lean) + py * Math.cos(lean) + HIP + bob;
    return { x: x + facing * rx * h, y: y + ry * h };
  };
  return { left: world(left), right: world(right), tip: world(tip) };
}

/** A random figure for the crowd; `random` keeps the lane the same on every visit. */
export function makeLook(random: () => number, h: number, woman: boolean, palette: RGB[], stains: RGB[]): Look {
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const white: RGB = [238, 232, 218];
  const light = random() < (woman ? 0.2 : 0.65);
  const look: Look = {
    h,
    skin: pick(SKIN),
    top: light ? white : pick(palette),
    bottom: woman ? pick(palette) : random() < 0.7 ? white : [214, 206, 188],
    wrap: pick(palette),
    head: woman ? (random() < 0.7 ? "odhni" : "bun") : random() < 0.45 ? "turban" : "bare",
    woman,
    stains: [],
  };
  const count = 3 + Math.floor(random() * 5);
  for (let i = 0; i < count; i++) {
    const onFace = i === 0;
    look.stains.push({
      x: onFace ? (random() - 0.5) * 0.06 : (random() - 0.5) * 0.18,
      y: onFace ? -0.88 : -0.78 + random() * (woman ? 0.7 : 0.45),
      r: onFace ? 0.035 : 0.03 + random() * 0.05,
      c: pick(stains),
    });
  }
  return look;
}

// ─── The grandmother and the child at her door ──────────────────────────────

const DADI_SARI: RGB = [236, 228, 208];
const DADI_BORDER: RGB = [150, 30, 40];

/**
 * The eldest of the house, seated on a low peedha, facing +x; `s` is her standing height. `feet`
 * is how much gulal is on her feet, `cheek` on her cheek, and `bless` how far her hand is raised.
 */
export function drawDadi(ctx: Ctx, x: number, y: number, s: number, feet: number, cheek: number, bless: number, pink: RGB) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const skin: RGB = [184, 128, 92];

  // The peedha: a low wooden seat.
  ctx.fillStyle = "#6e3e1e";
  ctx.fillRect(-0.28, -0.16, 0.36, 0.035);
  ctx.fillStyle = "#4e2a12";
  ctx.fillRect(-0.26, -0.125, 0.03, 0.125);
  ctx.fillRect(0.03, -0.125, 0.03, 0.125);
  ctx.fillStyle = "#8a5028";
  ctx.fillRect(-0.28, -0.16, 0.36, 0.008);

  // Feet, in front of her, with a silver toe ring.
  ctx.fillStyle = rgb(skin);
  ctx.beginPath();
  ctx.moveTo(0.26, -0.05);
  ctx.quadraticCurveTo(0.31, -0.055, 0.4, -0.018);
  ctx.quadraticCurveTo(0.43, -0.004, 0.41, 0.004);
  ctx.lineTo(0.24, 0.004);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e0e0e8";
  ctx.fillRect(0.385, -0.02, 0.014, 0.008);

  // The sari, and its pallu drawn over her head.
  const sari = new Path2D();
  sari.moveTo(-0.06, -0.93);
  sari.quadraticCurveTo(0.03, -0.965, 0.085, -0.9);
  sari.quadraticCurveTo(0.05, -0.86, 0.035, -0.77);
  sari.quadraticCurveTo(0.08, -0.7, 0.09, -0.6);
  sari.quadraticCurveTo(0.1, -0.44, 0.14, -0.4);
  sari.quadraticCurveTo(0.24, -0.39, 0.29, -0.33);
  sari.quadraticCurveTo(0.3, -0.18, 0.3, -0.03);
  sari.lineTo(0.3, 0);
  sari.lineTo(0.2, 0);
  sari.quadraticCurveTo(0.19, -0.14, 0.15, -0.22);
  sari.quadraticCurveTo(0.05, -0.17, -0.04, -0.165);
  sari.lineTo(-0.2, -0.16);
  sari.quadraticCurveTo(-0.25, -0.34, -0.19, -0.6);
  sari.quadraticCurveTo(-0.16, -0.76, -0.12, -0.84);
  sari.quadraticCurveTo(-0.11, -0.91, -0.06, -0.93);
  sari.closePath();

  // Her face in profile, under the pallu.
  ctx.fillStyle = rgb(skin);
  ctx.beginPath();
  ctx.moveTo(-0.03, -0.9);
  ctx.quadraticCurveTo(0.05, -0.915, 0.075, -0.875);
  ctx.quadraticCurveTo(0.083, -0.855, 0.08, -0.845);
  ctx.lineTo(0.098, -0.81);
  ctx.quadraticCurveTo(0.1, -0.8, 0.085, -0.798);
  ctx.quadraticCurveTo(0.09, -0.79, 0.086, -0.783);
  ctx.quadraticCurveTo(0.09, -0.775, 0.083, -0.77);
  ctx.quadraticCurveTo(0.082, -0.752, 0.06, -0.75);
  ctx.quadraticCurveTo(0.04, -0.745, 0.03, -0.73);
  ctx.lineTo(0.0, -0.7);
  ctx.lineTo(-0.04, -0.74);
  ctx.closePath();
  ctx.fill();
  // Grey hair at the parting, the eye, spectacles and a bindi.
  ctx.fillStyle = "#b8b2aa";
  ctx.beginPath();
  ctx.ellipse(0.035, -0.895, 0.04, 0.014, -0.25, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 24, 18, 0.9)";
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.moveTo(0.055, -0.845);
  ctx.quadraticCurveTo(0.064, -0.85, 0.073, -0.843);
  ctx.stroke();
  ctx.strokeStyle = "rgba(60, 50, 40, 0.8)";
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.arc(0.066, -0.84, 0.016, 0, TAU);
  ctx.moveTo(0.05, -0.842);
  ctx.lineTo(0.0, -0.85);
  ctx.stroke();
  ctx.fillStyle = "#b01c24";
  ctx.beginPath();
  ctx.arc(0.074, -0.873, 0.006, 0, TAU);
  ctx.fill();
  // A smile.
  ctx.strokeStyle = "rgba(90, 40, 30, 0.8)";
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.moveTo(0.074, -0.781);
  ctx.quadraticCurveTo(0.08, -0.776, 0.086, -0.782);
  ctx.stroke();
  if (cheek > 0.01) {
    ctx.strokeStyle = rgb(pink, 0.85 * cheek);
    ctx.lineWidth = 0.02;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0.03, -0.815);
    ctx.lineTo(lerp(0.03, 0.07, cheek), lerp(-0.815, -0.8, cheek));
    ctx.stroke();
  }

  ctx.fillStyle = rgb(DADI_SARI);
  ctx.fill(sari);
  // Folds, and the border along the pallu's edge and the hem.
  ctx.save();
  ctx.clip(sari);
  ctx.strokeStyle = "rgba(150, 130, 100, 0.35)";
  ctx.lineWidth = 0.006;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-0.15 + i * 0.03, -0.62);
    ctx.quadraticCurveTo(-0.1 + i * 0.05, -0.35, 0.02 + i * 0.05, -0.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = rgb(DADI_BORDER);
  ctx.lineWidth = 0.016;
  ctx.beginPath();
  ctx.moveTo(-0.06, -0.93);
  ctx.quadraticCurveTo(0.03, -0.965, 0.085, -0.9);
  ctx.quadraticCurveTo(0.05, -0.86, 0.035, -0.77);
  ctx.quadraticCurveTo(0.08, -0.7, 0.09, -0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.2, -0.008);
  ctx.lineTo(0.3, -0.008);
  ctx.stroke();

  // Her near arm: resting on her knee, or raised over the child in blessing.
  const shoulder = { x: -0.06, y: -0.68 };
  const elbow = { x: lerp(-0.02, 0.0, bless), y: lerp(-0.5, -0.54, bless) };
  const hand = { x: lerp(0.2, 0.16, bless), y: lerp(-0.4, -0.66, bless) };
  ctx.lineCap = "round";
  ctx.strokeStyle = rgb([200, 60, 60]);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(lerp(shoulder.x, elbow.x, 0.45), lerp(shoulder.y, elbow.y, 0.45));
  ctx.stroke();
  ctx.strokeStyle = rgb(skin);
  ctx.lineWidth = 0.036;
  ctx.beginPath();
  ctx.moveTo(lerp(shoulder.x, elbow.x, 0.45), lerp(shoulder.y, elbow.y, 0.45));
  ctx.lineTo(elbow.x, elbow.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.fillStyle = rgb(skin);
  ctx.beginPath();
  ctx.ellipse(hand.x + 0.012, hand.y - 0.006, 0.026, 0.018, lerp(0.2, -1.1, bless), 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#d8b24a";
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.moveTo(lerp(elbow.x, hand.x, 0.78), lerp(elbow.y, hand.y, 0.78) - 0.02);
  ctx.lineTo(lerp(elbow.x, hand.x, 0.78), lerp(elbow.y, hand.y, 0.78) + 0.02);
  ctx.stroke();

  // The first colour of the day, on her feet.
  if (feet > 0.01) {
    ctx.fillStyle = rgb(pink, 0.9 * feet);
    ctx.beginPath();
    ctx.ellipse(0.35, -0.03, 0.03, 0.014, -0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(pink, 0.5 * feet);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(0.3 + i * 0.018, 0.004 + (i % 3) * 0.004, 0.006 + (i % 2) * 0.004, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

const CHILD: Look = {
  h: 1,
  skin: [196, 140, 100],
  top: [250, 196, 40],
  bottom: [236, 60, 110],
  wrap: [40, 160, 90],
  head: "bun",
  woman: true,
  stains: [],
};

/** Her grandchild, facing her (−x): bending to her feet (`bend`), then reaching up to her cheek. */
export function drawChild(ctx: Ctx, x: number, y: number, h: number, bend: number, reach: number, pink: RGB, seconds: number) {
  const b = clamp(bend - reach);
  const lean = b * 1.05;
  const la = lerp(0.35, 1.4, b);
  const pose: Pose = {
    la,
    lf: lerp(0.5, 1.7, b),
    ra: lerp(0.3, 1.25, b) + reach * 1.9,
    rf: lerp(0.4, 1.6, b) + reach * 1.8 + Math.sin(seconds * 3) * 0.04 * reach,
    lean,
  };
  const hands = drawPerson(ctx, x, y, { ...CHILD, h }, pose, 0, -1);
  // A pinch of pink between her fingers.
  ctx.fillStyle = rgb(pink, 0.95);
  ctx.beginPath();
  ctx.arc(hands.right.x - 0.01, hands.right.y, h * 0.022, 0, TAU);
  ctx.fill();
  return hands;
}
