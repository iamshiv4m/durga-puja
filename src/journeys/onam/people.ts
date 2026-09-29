// The people of Onam, painted flat: men in the white mundu with a thin gold border and a thorthu
// over the shoulder; women in the kasavu set-mundu, cream with a gold border, jasmine in their
// hair; the painted tigers of Thrissur; the rowers of a snake boat; and the men of the melam.
// Figures are drawn in units of their height, feet at the origin, y up the screen negative.
import { TAU, lerp, mix, type Ctx, type RGB } from "../paint";
import type { Paint } from "./light";

export type Look = {
  h: number;
  skin: RGB;
  woman: boolean;
  /** Mundu, or the set-mundu of a saree. */
  cloth: RGB;
  /** The kasavu, a border of gold (or a coloured one). */
  border: RGB;
  /** A blouse, or a shirt; null for a bare chest. */
  top: RGB | null;
  hair: "short" | "bun" | "wrap" | "bald";
  jasmine?: boolean;
  /** A thorthu, the thin cotton towel, over the left shoulder. */
  towel?: RGB | null;
  /** The mundu folded up to the knee, for work. */
  short?: boolean;
  /** Seen from behind. */
  back?: boolean;
  /** Only the body from the waist up, for someone sitting (the caller draws what is below). */
  upper?: boolean;
};

/**
 * Arm angles are from hanging straight down, positive swinging outward from the body (left arm to
 * the left of the picture, right arm to the right), π/2 out level, π straight up. `lf`, `rf` are
 * the forearms' own angles on the same scale.
 */
export type Pose = {
  la: number;
  lf: number;
  ra: number;
  rf: number;
  lean?: number;
  bob?: number;
  spread?: number;
};

export type Hands = {
  left: { x: number; y: number };
  right: { x: number; y: number };
};

export const SKIN: RGB[] = [
  [150, 96, 62],
  [128, 80, 52],
  [170, 114, 76],
  [112, 70, 46],
  [182, 128, 90],
];

export const GOLD: RGB = [222, 176, 72];
export const KASAVU: RGB = [242, 232, 208];
export const MUNDU: RGB = [246, 242, 230];
export const HAIR: RGB = [22, 16, 14];

const SHOULDER_Y = -0.79;
const UPPER = 0.17;
const FORE = 0.155;

/** Draws a Keralite standing on (x, y), facing us (or away); returns where the hands are, in world units. */
export function drawFolk(ctx: Ctx, x: number, y: number, look: Look, pose: Pose, paint: Paint): Hands {
  const { h } = look;
  const bob = pose.bob ?? 0;
  const spread = pose.spread ?? 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(h, h);

  const waist = -0.5 + bob;
  if (!look.upper) {
    // Feet.
    ctx.fillStyle = paint(mix(look.skin, [30, 18, 12], 0.25));
    ctx.beginPath();
    ctx.ellipse(-0.05 - spread * 0.03, -0.01, 0.04, 0.016, 0, 0, TAU);
    ctx.ellipse(0.05 + spread * 0.03, -0.01, 0.04, 0.016, 0, 0, TAU);
    ctx.fill();

    // The mundu, from the waist down.
    const hem = look.short ? -0.3 : -0.025;
    if (look.short) {
      ctx.strokeStyle = paint(look.skin);
      ctx.lineWidth = 0.05;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-0.05, hem);
      ctx.lineTo(-0.05 - spread * 0.03, -0.03);
      ctx.moveTo(0.05, hem);
      ctx.lineTo(0.05 + spread * 0.03, -0.03);
      ctx.stroke();
    }
    const flare = look.woman ? 0.13 : 0.12;
    ctx.fillStyle = paint(look.cloth);
    ctx.beginPath();
    ctx.moveTo(-0.098, waist);
    ctx.lineTo(0.098, waist);
    ctx.quadraticCurveTo(0.11, lerp(waist, hem, 0.6), flare + spread * 0.03, hem);
    ctx.quadraticCurveTo(0, hem + 0.018, -flare - spread * 0.03, hem);
    ctx.quadraticCurveTo(-0.11, lerp(waist, hem, 0.6), -0.098, waist);
    ctx.fill();
    // Folds, and the gold at the hem and down the pleats.
    ctx.strokeStyle = paint(mix(look.cloth, [120, 110, 96], 0.35), 0.6);
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(-0.04, waist + 0.03);
    ctx.lineTo(-0.06 - spread * 0.02, hem);
    ctx.moveTo(0.05, waist + 0.05);
    ctx.lineTo(0.07 + spread * 0.02, hem);
    ctx.stroke();
    ctx.strokeStyle = paint(look.border);
    ctx.lineWidth = look.woman ? 0.03 : 0.016;
    ctx.beginPath();
    ctx.moveTo(-flare - spread * 0.03 + 0.005, hem - 0.012);
    ctx.quadraticCurveTo(0, hem + 0.004, flare + spread * 0.03 - 0.005, hem - 0.012);
    ctx.stroke();
    if (!look.back) {
      ctx.lineWidth = look.woman ? 0.022 : 0.012;
      ctx.beginPath();
      ctx.moveTo(look.woman ? 0.03 : -0.02, waist + 0.02);
      ctx.lineTo(look.woman ? 0.05 + spread * 0.02 : -0.035 - spread * 0.01, hem - 0.01);
      ctx.stroke();
    }
  }

  // From the waist up, leaning from the hip.
  ctx.translate(0, waist);
  ctx.rotate(pose.lean ?? 0);
  ctx.translate(0, -waist);
  const top = SHOULDER_Y + bob;

  // Torso.
  const chest = look.woman ? (look.top ?? KASAVU) : (look.top ?? look.skin);
  ctx.fillStyle = paint(chest);
  ctx.beginPath();
  ctx.moveTo(-0.104, top);
  ctx.quadraticCurveTo(0, top - 0.02, 0.104, top);
  ctx.lineTo(0.09, waist);
  ctx.lineTo(-0.09, waist);
  ctx.closePath();
  ctx.fill();
  if (look.woman) {
    // A little skin at the waist, and the neriyathu across the body from the left shoulder.
    ctx.fillStyle = paint(look.skin);
    ctx.fillRect(-0.088, waist - 0.07, 0.176, 0.07);
    ctx.fillStyle = paint(look.cloth);
    ctx.beginPath();
    if (look.back) {
      ctx.moveTo(0.104, top);
      ctx.lineTo(0.02, top - 0.005);
      ctx.lineTo(-0.09, waist + 0.02);
      ctx.lineTo(0.02, waist + 0.02);
      ctx.lineTo(0.1, top + 0.12);
    } else {
      ctx.moveTo(-0.104, top);
      ctx.lineTo(-0.02, top - 0.012);
      ctx.lineTo(0.092, waist - 0.05);
      ctx.lineTo(0.09, waist + 0.02);
      ctx.lineTo(-0.02, waist + 0.02);
      ctx.lineTo(-0.1, top + 0.14);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint(look.border);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    if (look.back) {
      ctx.moveTo(0.02, top);
      ctx.lineTo(-0.09, waist + 0.015);
    } else {
      ctx.moveTo(-0.02, top - 0.008);
      ctx.lineTo(0.092, waist - 0.045);
    }
    ctx.stroke();
  } else if (!look.top && !look.back) {
    ctx.strokeStyle = paint(mix(look.skin, [40, 20, 12], 0.3), 0.5);
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(-0.07, top + 0.1);
    ctx.quadraticCurveTo(-0.035, top + 0.12, 0, top + 0.1);
    ctx.quadraticCurveTo(0.035, top + 0.12, 0.07, top + 0.1);
    ctx.stroke();
    ctx.fillStyle = paint(mix(look.skin, [40, 20, 12], 0.35));
    ctx.beginPath();
    ctx.arc(0, waist - 0.05, 0.007, 0, TAU);
    ctx.fill();
  }
  // The waist knot of the mundu.
  ctx.fillStyle = paint(mix(look.cloth, [255, 255, 255], 0.1));
  ctx.fillRect(-0.095, waist - 0.012, 0.19, 0.03);
  if (look.towel) {
    ctx.fillStyle = paint(look.towel);
    ctx.beginPath();
    ctx.moveTo(-0.105, top - 0.005);
    ctx.lineTo(-0.045, top - 0.01);
    ctx.lineTo(-0.06, top + 0.24);
    ctx.lineTo(-0.1, top + 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint(mix(look.towel, [180, 60, 40], 0.5));
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(-0.1, top + 0.23);
    ctx.lineTo(-0.06, top + 0.225);
    ctx.stroke();
  }

  // Neck and head.
  ctx.fillStyle = paint(look.skin);
  ctx.fillRect(-0.022, top - 0.065, 0.044, 0.07);
  const hy = top - 0.105;
  ctx.beginPath();
  ctx.ellipse(0, hy, 0.056, 0.067, 0, 0, TAU);
  ctx.fill();
  const hair = paint(HAIR);
  ctx.fillStyle = hair;
  if (look.back) {
    ctx.beginPath();
    ctx.ellipse(0, hy - 0.004, 0.059, 0.07, 0, 0, TAU);
    ctx.fill();
  } else if (look.hair !== "bald") {
    ctx.beginPath();
    ctx.ellipse(0, hy - 0.024, 0.058, 0.048, 0, Math.PI * 1.02, -0.02);
    ctx.fill();
  }
  if (look.hair === "bun") {
    // The kondakettu, a knot at the side, ringed with jasmine.
    const bx = look.back ? 0 : -0.05;
    const by = look.back ? hy + 0.02 : hy - 0.06;
    ctx.beginPath();
    ctx.arc(bx, by, 0.034, 0, TAU);
    ctx.fill();
    if (look.jasmine) {
      ctx.fillStyle = paint([250, 250, 240]);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 1.1;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 0.04, by + Math.sin(a) * 0.04, 0.009, 0, TAU);
        ctx.fill();
      }
      if (look.back) {
        // A string of it falling down the back.
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(bx + Math.sin(i) * 0.006, by + 0.05 + i * 0.022, 0.008, 0, TAU);
          ctx.fill();
        }
      }
    }
  } else if (look.hair === "wrap") {
    ctx.fillStyle = paint(MUNDU);
    ctx.beginPath();
    ctx.ellipse(0, hy - 0.04, 0.062, 0.03, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(0.03, hy - 0.05, 0.05, 0.018);
  }
  if (!look.back) {
    // The face: eyes, and a mustache or a bindi and a line of sandal paste.
    ctx.fillStyle = paint([20, 12, 10]);
    ctx.fillRect(-0.028, hy - 0.004, 0.016, 0.007);
    ctx.fillRect(0.012, hy - 0.004, 0.016, 0.007);
    if (look.woman) {
      ctx.fillStyle = paint([180, 20, 30]);
      ctx.beginPath();
      ctx.arc(0, hy - 0.024, 0.006, 0, TAU);
      ctx.fill();
      ctx.fillStyle = paint(GOLD);
      ctx.beginPath();
      ctx.arc(-0.056, hy + 0.012, 0.009, 0, TAU);
      ctx.arc(0.056, hy + 0.012, 0.009, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = paint(GOLD);
      ctx.lineWidth = 0.01;
      ctx.beginPath();
      ctx.arc(0, top - 0.03, 0.05, 0.35, Math.PI - 0.35);
      ctx.stroke();
    } else {
      ctx.strokeStyle = paint(HAIR);
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(-0.022, hy + 0.03);
      ctx.quadraticCurveTo(0, hy + 0.022, 0.022, hy + 0.03);
      ctx.stroke();
      ctx.fillStyle = paint([240, 226, 200]);
      ctx.fillRect(-0.016, hy - 0.035, 0.032, 0.008);
    }
  }

  // Arms: the upper arm, the forearm and the hand.
  const hands = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
  const arm = (side: -1 | 1, upper: number, fore: number) => {
    const sx = side * 0.098;
    const sy = top + 0.012;
    const ex = sx + side * Math.sin(upper) * UPPER;
    const ey = sy + Math.cos(upper) * UPPER;
    const hx = ex + side * Math.sin(fore) * FORE;
    const hy2 = ey + Math.cos(fore) * FORE;
    ctx.lineCap = "round";
    ctx.strokeStyle = paint(look.top && !look.woman ? look.top : look.skin);
    ctx.lineWidth = 0.046;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (look.woman && look.top) {
      ctx.strokeStyle = paint(look.top);
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(lerp(sx, ex, 0.4), lerp(sy, ey, 0.4));
      ctx.stroke();
    }
    ctx.strokeStyle = paint(look.skin);
    ctx.lineWidth = 0.038;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy2);
    ctx.stroke();
    ctx.fillStyle = paint(look.skin);
    ctx.beginPath();
    ctx.arc(hx, hy2, 0.024, 0, TAU);
    ctx.fill();
    if (look.woman) {
      ctx.strokeStyle = paint(GOLD);
      ctx.lineWidth = 0.044;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.moveTo(lerp(ex, hx, 0.74), lerp(ey, hy2, 0.74));
      ctx.lineTo(lerp(ex, hx, 0.84), lerp(ey, hy2, 0.84));
      ctx.stroke();
    }
    const world = new DOMPoint(hx, hy2).matrixTransform(ctx.getTransform());
    return { x: world.x, y: world.y };
  };
  const leftHand = arm(-1, pose.la, pose.lf);
  const rightHand = arm(1, pose.ra, pose.rf);
  ctx.restore();
  // Hands, back in the caller's space.
  const back = ctx.getTransform().inverse();
  const l = new DOMPoint(leftHand.x, leftHand.y).matrixTransform(back);
  const r = new DOMPoint(rightHand.x, rightHand.y).matrixTransform(back);
  hands.left = { x: l.x, y: l.y };
  hands.right = { x: r.x, y: r.y };
  return hands;
}

/** A person sitting cross-legged on the floor, as at a sadya; `eat` lifts the right hand to the mouth. */
export function drawSitting(ctx: Ctx, x: number, y: number, look: Look, eat: number, paint: Paint) {
  const { h } = look;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(h, h);
  // The crossed legs under the mundu.
  ctx.fillStyle = paint(look.cloth);
  ctx.beginPath();
  ctx.ellipse(0, -0.06, 0.2, 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paint(look.border);
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.ellipse(0, -0.06, 0.2, 0.07, 0, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.translate(0, 0.38);
  const hands = drawFolk(
    ctx,
    0,
    0,
    { ...look, h: 1, upper: true },
    { la: 0.25, lf: -0.35, ra: lerp(0.3, 0.2, eat), rf: lerp(-0.6, -2.4, eat) },
    paint,
  );
  ctx.restore();
  return hands;
}

// ─── Tigers ──────────────────────────────────────────────────────────────────

export type Tiger = {
  h: number;
  /** Body colour, and the stripes or spots on it. */
  coat: RGB;
  mark: RGB;
  spots: boolean;
  seed: number;
};

/**
 * A pulikali dancer: body painted all over, a tiger's face on the belly, a mask on the head and a
 * belt of bells. `crouch` bends the knees, `paw` raises the arms, `shake` jiggles the belly (-1..1).
 */
export function drawTiger(ctx: Ctx, x: number, y: number, t: Tiger, crouch: number, paw: number, shake: number, paint: Paint) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(t.h, t.h);
  const coat = paint(t.coat);
  const mark = paint(t.mark);
  const drop = crouch * 0.12;
  const stripes = (cx: number, cy: number, w: number, hgt: number, n: number, seed: number) => {
    ctx.strokeStyle = mark;
    ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const yy = cy - hgt / 2 + ((i + 0.5) / n) * hgt;
      const s = Math.sin(seed * 3 + i * 1.7);
      if (t.spots) {
        ctx.fillStyle = mark;
        ctx.beginPath();
        ctx.arc(cx + s * w * 0.3, yy, w * 0.14, 0, TAU);
        ctx.arc(cx - s * w * 0.28 + w * 0.1, yy + hgt / n / 2, w * 0.11, 0, TAU);
        ctx.fill();
      } else {
        ctx.lineWidth = 0.018;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, yy + s * 0.01);
        ctx.quadraticCurveTo(cx - w * 0.1, yy - 0.02, cx + w * (0.05 + 0.2 * s), yy + 0.012);
        ctx.stroke();
      }
    }
  };
  // Legs, knees out.
  const hip = -0.46 + drop;
  for (const side of [-1, 1]) {
    const knee = {
      x: side * (0.14 + crouch * 0.06),
      y: lerp(-0.24, -0.2, crouch),
    };
    ctx.strokeStyle = coat;
    ctx.lineCap = "round";
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(side * 0.07, hip);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(side * 0.1, -0.02);
    ctx.stroke();
    ctx.lineWidth = 0.014;
    ctx.strokeStyle = mark;
    for (let i = 0; i < 3; i++) {
      const tt = 0.25 + i * 0.25;
      const px = lerp(side * 0.07, knee.x, tt);
      const py = lerp(hip, knee.y, tt);
      ctx.beginPath();
      ctx.moveTo(px - 0.035, py - 0.01);
      ctx.lineTo(px + 0.035, py + 0.01);
      ctx.stroke();
      const qx = lerp(knee.x, side * 0.1, tt);
      const qy = lerp(knee.y, -0.02, tt);
      ctx.beginPath();
      ctx.moveTo(qx - 0.035, qy);
      ctx.lineTo(qx + 0.035, qy - 0.012);
      ctx.stroke();
    }
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(side * 0.11, -0.015, 0.05, 0.02, 0, 0, TAU);
    ctx.fill();
  }
  // A short red cloth at the hips, and the belt of bells.
  ctx.fillStyle = paint([190, 30, 34]);
  ctx.beginPath();
  ctx.moveTo(-0.13, hip - 0.05);
  ctx.lineTo(0.13, hip - 0.05);
  ctx.lineTo(0.1, hip + 0.06);
  ctx.lineTo(-0.1, hip + 0.06);
  ctx.closePath();
  ctx.fill();

  // Chest, and the great belly with its face.
  const top = -0.84 + drop;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-0.13, top);
  ctx.quadraticCurveTo(0, top - 0.03, 0.13, top);
  ctx.lineTo(0.15, hip - 0.1);
  ctx.lineTo(-0.15, hip - 0.1);
  ctx.closePath();
  ctx.fill();
  stripes(-0.08, top + 0.12, 0.08, 0.2, 3, t.seed);
  stripes(0.08, top + 0.12, 0.08, 0.2, 3, t.seed + 2);
  const bx = shake * 0.025;
  const by = hip - 0.17 + Math.abs(shake) * 0.01;
  const br = 0.19;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1 + shake * 0.05, 1 - Math.abs(shake) * 0.05);
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, 0, br, br * 0.95, 0, 0, TAU);
  ctx.fill();
  // The face on the belly: eyes round the chest, the nose at the navel, the mouth under it.
  ctx.fillStyle = paint([250, 246, 236]);
  ctx.beginPath();
  ctx.ellipse(0, 0.06, 0.12, 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mark;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.03, -0.1);
    ctx.quadraticCurveTo(side * 0.1, -0.16, side * 0.14, -0.08);
    ctx.quadraticCurveTo(side * 0.09, -0.06, side * 0.03, -0.1);
    ctx.fill();
    ctx.fillStyle = paint([250, 230, 60]);
    ctx.beginPath();
    ctx.arc(side * 0.085, -0.1, 0.022, 0, TAU);
    ctx.fill();
    ctx.fillStyle = mark;
    ctx.beginPath();
    ctx.arc(side * 0.085, -0.1, 0.011, 0, TAU);
    ctx.fill();
    // Whisker stripes.
    ctx.strokeStyle = mark;
    ctx.lineWidth = 0.012;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(side * 0.13, -0.02 + i * 0.04);
      ctx.lineTo(side * 0.18, -0.03 + i * 0.05);
      ctx.stroke();
    }
  }
  ctx.fillStyle = paint([220, 120, 110]);
  ctx.beginPath();
  ctx.moveTo(-0.03, -0.01);
  ctx.lineTo(0.03, -0.01);
  ctx.lineTo(0, 0.025);
  ctx.closePath();
  ctx.fill();
  // The open mouth and its fangs.
  const open = 0.03 + Math.abs(shake) * 0.03;
  ctx.fillStyle = paint([150, 20, 24]);
  ctx.beginPath();
  ctx.ellipse(0, 0.08, 0.075, open, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint([252, 250, 240]);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.05, 0.08 - open);
    ctx.lineTo(side * 0.035, 0.08 - open * 0.1);
    ctx.lineTo(side * 0.022, 0.08 - open);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(side * 0.05, 0.08 + open);
    ctx.lineTo(side * 0.036, 0.08 + open * 0.2);
    ctx.lineTo(side * 0.022, 0.08 + open);
    ctx.fill();
  }
  ctx.restore();
  // The belt of bells.
  ctx.fillStyle = paint(GOLD);
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(i * 0.026, hip - 0.04 + Math.abs(i) * 0.002 + (i % 2) * 0.004, 0.013, 0, TAU);
    ctx.fill();
  }

  // Arms, pawing.
  for (const side of [-1, 1]) {
    const lift = paw * (side === 1 ? 1 : 0.8);
    const sx = side * 0.12;
    const sy = top + 0.02;
    const ex = sx + side * lerp(0.1, 0.16, lift);
    const ey = sy + lerp(0.16, -0.06, lift);
    const hx = ex + side * lerp(0.02, 0.04, lift);
    const hy = ey + lerp(0.15, -0.14, lift);
    ctx.strokeStyle = coat;
    ctx.lineWidth = 0.055;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = mark;
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(lerp(sx, ex, 0.5) - 0.025, lerp(sy, ey, 0.5));
    ctx.lineTo(lerp(sx, ex, 0.5) + 0.025, lerp(sy, ey, 0.5) + 0.01);
    ctx.moveTo(lerp(ex, hx, 0.5) - 0.025, lerp(ey, hy, 0.5));
    ctx.lineTo(lerp(ex, hx, 0.5) + 0.025, lerp(ey, hy, 0.5) + 0.01);
    ctx.stroke();
    // Claws.
    ctx.strokeStyle = paint([248, 244, 232]);
    ctx.lineWidth = 0.008;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * 0.014, hy - 0.01);
      ctx.lineTo(hx + i * 0.02 + side * 0.01, hy - 0.05 * (lift > 0.5 ? 1 : -1) - 0.01);
      ctx.stroke();
    }
  }

  // The mask: a tiger's head, ears up, over the dancer's own.
  const hy = top - 0.12;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, hy, 0.1, 0.1, 0, 0, TAU);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.05, hy - 0.08);
    ctx.lineTo(side * 0.095, hy - 0.14);
    ctx.lineTo(side * 0.1, hy - 0.05);
    ctx.fill();
  }
  ctx.fillStyle = paint([250, 246, 236]);
  ctx.beginPath();
  ctx.ellipse(0, hy + 0.04, 0.06, 0.04, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mark;
  ctx.fillRect(-0.012, hy - 0.09, 0.024, 0.05);
  ctx.beginPath();
  ctx.moveTo(-0.07, hy - 0.05);
  ctx.lineTo(-0.02, hy - 0.02);
  ctx.lineTo(-0.075, hy - 0.02);
  ctx.moveTo(0.07, hy - 0.05);
  ctx.lineTo(0.02, hy - 0.02);
  ctx.lineTo(0.075, hy - 0.02);
  ctx.fill();
  ctx.fillStyle = paint([240, 210, 40]);
  ctx.beginPath();
  ctx.arc(-0.035, hy - 0.01, 0.012, 0, TAU);
  ctx.arc(0.035, hy - 0.01, 0.012, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint([60, 20, 18]);
  ctx.beginPath();
  ctx.arc(0, hy + 0.025, 0.013, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─── The snake boat ──────────────────────────────────────────────────────────

/** A rower in profile, facing +x, sitting at (x, y); `phase` 0..1 through a stroke. Returns the blade tip. */
export function drawRower(ctx: Ctx, x: number, y: number, h: number, phase: number, skin: RGB, paint: Paint, side: 1 | -1 = 1) {
  // Reach forward, dig, pull back past the hip, and lift.
  const reach = phase < 0.45 ? lerp(1, -0.8, phase / 0.45) : lerp(-0.8, 1, (phase - 0.45) / 0.55);
  const dig = phase < 0.45 ? 1 : 0;
  const lean = reach * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(h, h);
  const sx = Math.sin(lean) * 0.32;
  const sy = -Math.cos(lean) * 0.32;
  ctx.lineCap = "round";
  ctx.strokeStyle = paint(skin);
  ctx.lineWidth = 0.13;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  // The white mundu at the waist, over the gunwale.
  ctx.fillStyle = paint(MUNDU);
  ctx.beginPath();
  ctx.ellipse(0, -0.02, 0.1, 0.05, 0, 0, TAU);
  ctx.fill();
  // A white cloth tied on the head.
  ctx.fillStyle = paint(skin);
  ctx.beginPath();
  ctx.arc(sx + Math.sin(lean) * 0.08, sy - Math.cos(lean) * 0.08, 0.055, 0, TAU);
  ctx.fill();
  ctx.fillStyle = paint(MUNDU);
  ctx.beginPath();
  ctx.ellipse(sx + Math.sin(lean) * 0.1, sy - Math.cos(lean) * 0.1, 0.058, 0.03, lean, 0, TAU);
  ctx.fill();
  // The paddle: the top hand high, the lower hand at the shaft, the blade into the water.
  const top = { x: sx + 0.1 + reach * 0.08, y: sy - 0.02 };
  const low = { x: sx + 0.14 + reach * 0.16, y: sy + 0.14 };
  const angle = Math.atan2(low.y - top.y, low.x - top.x);
  const blade = {
    x: top.x + Math.cos(angle) * (0.62 + dig * 0.05),
    y: top.y + Math.sin(angle) * (0.62 + dig * 0.05),
  };
  ctx.strokeStyle = paint(skin);
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 0.02);
  ctx.lineTo(top.x, top.y);
  ctx.moveTo(sx, sy + 0.04);
  ctx.lineTo(low.x, low.y);
  ctx.stroke();
  ctx.strokeStyle = paint([110, 70, 36]);
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(blade.x, blade.y);
  ctx.stroke();
  ctx.fillStyle = paint([120, 76, 38]);
  ctx.beginPath();
  ctx.ellipse(blade.x - Math.cos(angle) * 0.06, blade.y - Math.sin(angle) * 0.06, 0.08, 0.03, angle, 0, TAU);
  ctx.fill();
  void side;
  ctx.restore();
  return { x: x + blade.x * h, y: y + blade.y * h, dig };
}

// ─── The melam ───────────────────────────────────────────────────────────────

/**
 * A chenda player: the drum hung from the shoulder, its head up at the waist, played with two
 * curved sticks. `hit` 0..1 is how far the stick is from the skin (0 on it).
 */
export function drawChenda(ctx: Ctx, x: number, y: number, look: Look, hit: number, alt: number, paint: Paint, lean = 0) {
  const h = look.h;
  const up = (v: number) => lerp(0.35, 2.7, v);
  const hands = drawFolk(
    ctx,
    x,
    y,
    look,
    {
      la: up(alt * hit) * 0.5 + 0.2,
      lf: up(alt * hit) - 0.9,
      ra: up((1 - alt) * hit) * 0.5 + 0.2,
      rf: up((1 - alt) * hit) - 0.9,
      lean,
    },
    paint,
  );
  // The drum, in front of the body.
  const top = y - h * 0.6;
  const w = h * 0.2;
  ctx.fillStyle = paint([150, 90, 40]);
  ctx.fillRect(x - w / 2, top, w, h * 0.34);
  ctx.strokeStyle = paint([220, 200, 170]);
  ctx.lineWidth = h * 0.008;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + (i / 4) * w, top);
    ctx.lineTo(x - w / 2 + ((i + 0.5) / 4) * w, top + h * 0.34);
    ctx.stroke();
  }
  ctx.fillStyle = paint([240, 226, 196]);
  ctx.beginPath();
  ctx.ellipse(x, top, w / 2, h * 0.03, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paint([200, 40, 36]);
  ctx.lineWidth = h * 0.012;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top + h * 0.34);
  ctx.lineTo(x + w / 2, top + h * 0.34);
  ctx.stroke();
  // Sticks.
  ctx.strokeStyle = paint([80, 50, 28]);
  ctx.lineWidth = h * 0.012;
  ctx.lineCap = "round";
  for (const hand of [hands.left, hands.right]) {
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.quadraticCurveTo(lerp(hand.x, x, 0.5), hand.y - h * 0.05, lerp(hand.x, x, 0.8), lerp(hand.y, top, 0.8));
    ctx.stroke();
  }
  return hands;
}

/** A kombu player: the long C-curved brass horn raised to the sky. */
export function drawKombu(ctx: Ctx, x: number, y: number, look: Look, raise: number, paint: Paint) {
  const h = look.h;
  drawFolk(
    ctx,
    x,
    y,
    look,
    {
      la: 0.5 + raise * 0.4,
      lf: 2.4 + raise * 0.3,
      ra: 0.3 + raise * 0.3,
      rf: 2.2 + raise * 0.4,
    },
    paint,
  );
  const mx = x;
  const my = y - h * 0.88;
  ctx.strokeStyle = paint([214, 170, 80]);
  ctx.lineCap = "round";
  ctx.lineWidth = h * 0.03;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.bezierCurveTo(mx + h * 0.3, my - h * (0.05 + raise * 0.1), mx + h * 0.4, my - h * 0.45, mx + h * 0.1, my - h * (0.55 + raise * 0.1));
  ctx.stroke();
  ctx.fillStyle = paint([236, 196, 110]);
  ctx.beginPath();
  ctx.ellipse(mx + h * 0.08, my - h * (0.56 + raise * 0.1), h * 0.06, h * 0.03, -0.5, 0, TAU);
  ctx.fill();
}

/** An ilathalam player: the heavy cymbals raised and struck together. */
export function drawIlathalam(ctx: Ctx, x: number, y: number, look: Look, hit: number, paint: Paint, lean = 0) {
  const open = hit;
  const hands = drawFolk(
    ctx,
    x,
    y,
    look,
    {
      la: 0.6 + open * 0.5,
      lf: -0.4 + open * 1.2,
      ra: 0.6 + open * 0.5,
      rf: -0.4 + open * 1.2,
      lean,
    },
    paint,
  );
  ctx.fillStyle = paint([226, 186, 96]);
  for (const hand of [hands.left, hands.right]) {
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y, look.h * 0.05, look.h * 0.02, 0, 0, TAU);
    ctx.fill();
  }
}

/** The muthukkuda, the ornamental silk umbrella of temple festivals: a dome of colour with gold drops. */
export function drawMuthukkuda(ctx: Ctx, x: number, y: number, size: number, color: RGB, spin: number, paint: Paint) {
  ctx.strokeStyle = paint([150, 110, 60]);
  ctx.lineWidth = size * 0.04;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + size * 1.6);
  ctx.stroke();
  ctx.fillStyle = paint(color);
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.5, size * 0.42, 0, Math.PI, 0);
  ctx.lineTo(x + size * 0.5, y + size * 0.05);
  ctx.lineTo(x - size * 0.5, y + size * 0.05);
  ctx.closePath();
  ctx.fill();
  // Bands of gold and mirror-work round it, catching the light as it turns.
  ctx.strokeStyle = paint(GOLD);
  ctx.lineWidth = size * 0.035;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.5 * (1 - i * 0.28), size * 0.42 * (1 - i * 0.28), 0, Math.PI, 0);
    ctx.stroke();
  }
  ctx.fillStyle = paint([255, 236, 170]);
  for (let i = 0; i < 9; i++) {
    const a = ((i + spin) / 9) * Math.PI;
    const dx = Math.cos(a) * size * 0.48;
    ctx.beginPath();
    ctx.ellipse(x + dx, y + size * 0.12, size * 0.02, size * 0.07, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = paint(GOLD);
  ctx.beginPath();
  ctx.arc(x, y - size * 0.44, size * 0.06, 0, TAU);
  ctx.fill();
}
