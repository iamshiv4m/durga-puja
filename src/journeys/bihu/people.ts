// The people of the village, painted flat like cut paper and facing us: the women in mekhela
// chador, the men in dhoti with a gamosa, and the cattle. Figures are drawn in units of their
// height with the feet at the origin; arms reach for hand targets, so a hand can find a drum
// head, a pipe or a xorai.
import { TAU, clamp, lerp, mix, rgb, type Ctx, type RGB } from "../paint";

export type Look = {
  h: number;
  skin: RGB;
  woman: boolean;
  /** Blouse, vest or kurta; null for a bare chest. */
  top: RGB | null;
  /** The mekhela, or the dhoti. */
  bottom: RGB;
  /** The woven border and motifs of the mekhela and chador, or the dhoti's edge. */
  border: RGB;
  /** The chador draped over a woman's shoulder. */
  chador?: RGB;
  hair: "khopa" | "grey" | "short" | "band";
  /** Kopou orchids tucked into the khopa. */
  flowers: boolean;
  gamosa: "none" | "shoulders" | "waist";
  sleeves: boolean;
  /** Children are a little rounder in the face. */
  child?: boolean;
};

export type Hold = "dhol" | "pepa" | "taal" | "gamosa" | "xorai" | "twig" | "toka" | "gogona" | "pitha";

type Point = { x: number; y: number };

export type Pose = {
  /** The hips, sideways, in units of height: the Bihu sway. */
  sway: number;
  /** Knees bent, 0..0.12. */
  crouch: number;
  /** The shoulders over the hips, sideways, in units of height. */
  lean: number;
  /** Head bowed, 0..1; negative tips it back. */
  bow: number;
  left: Point;
  right: Point;
  hold?: Hold;
  /** A heel lifted: which foot (-1 left, 1 right) and how far. */
  lift?: number;
  /** The dhol stick's swing, 0..1. */
  strike?: number;
  /** Seat height, in units of height, for someone sitting on a low pira. */
  seated?: number;
};

export type Hands = { left: Point; right: Point; head: Point; shoulders: Point };

export const SKIN: RGB[] = [
  [198, 146, 104],
  [176, 124, 84],
  [156, 104, 70],
  [210, 164, 122],
  [136, 90, 60],
];

const HAIR: RGB = [22, 16, 14];
const GAMOSA: RGB = [246, 242, 232];
const GAMOSA_RED: RGB = [196, 32, 38];
const BRONZE: RGB = [206, 160, 84];

/** Where the elbow goes for a hand reaching `t` from the shoulder `s`: outward and down. */
function elbow(s: Point, t: Point, side: number, upper: number, fore: number): { e: Point; h: Point } {
  let dx = t.x - s.x;
  let dy = t.y - s.y;
  let d = Math.hypot(dx, dy);
  const reach = upper + fore - 0.001;
  if (d > reach) {
    dx *= reach / d;
    dy *= reach / d;
    d = reach;
  }
  d = Math.max(d, Math.abs(upper - fore) + 0.001);
  const h = { x: s.x + dx, y: s.y + dy };
  const a = (upper * upper - fore * fore + d * d) / (2 * d);
  const k = Math.sqrt(Math.max(0, upper * upper - a * a));
  const px = s.x + (a * dx) / d;
  const py = s.y + (a * dy) / d;
  const nx = -dy / d;
  const ny = dx / d;
  const e1 = { x: px + nx * k, y: py + ny * k };
  const e2 = { x: px - nx * k, y: py - ny * k };
  const score = (e: Point) => side * e.x + e.y * 0.6;
  return { e: score(e1) > score(e2) ? e1 : e2, h };
}

/** A strip of gamosa: white, a red line along each edge. */
function gamosaBand(ctx: Ctx, points: Point[], width: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = () => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  };
  ctx.strokeStyle = rgb(GAMOSA_RED);
  ctx.lineWidth = width;
  path();
  ctx.stroke();
  ctx.strokeStyle = rgb(GAMOSA);
  ctx.lineWidth = width * 0.7;
  path();
  ctx.stroke();
}

/** The end of a gamosa hanging down from `a`: white, with its red woven flowers at the bottom. */
function gamosaEnd(ctx: Ctx, x: number, y: number, length: number, width: number, swing = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.fillStyle = rgb(GAMOSA);
  ctx.fillRect(-width / 2, 0, width, length);
  ctx.fillStyle = rgb(GAMOSA_RED);
  ctx.fillRect(-width / 2, 0, width * 0.14, length);
  ctx.fillRect(width / 2 - width * 0.14, 0, width * 0.14, length);
  ctx.fillRect(-width / 2, length * 0.72, width, length * 0.07);
  ctx.fillRect(-width / 2, length * 0.84, width, length * 0.1);
  ctx.restore();
}

/** A kopou spray: small pink-white flowers along a drooping tail. */
export function kopouSpray(ctx: Ctx, x: number, y: number, length: number, angle: number, r: number) {
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const bend = angle + t * 0.9;
    const px = x + Math.sin(bend) * length * t;
    const py = y + Math.cos(bend) * length * t * 0.95;
    ctx.fillStyle = i % 3 === 0 ? "rgb(214, 120, 190)" : i % 3 === 1 ? "rgb(248, 226, 240)" : "rgb(236, 170, 214)";
    ctx.beginPath();
    ctx.arc(px, py, r * (1 - t * 0.35), 0, TAU);
    ctx.fill();
  }
}

/** Draws one person standing (or sitting) on (x, y); returns where the hands and head are in world units. */
export function drawFigure(ctx: Ctx, x: number, y: number, look: Look, pose: Pose, facing: 1 | -1 = 1): Hands {
  const { h, woman } = look;
  const seated = pose.seated ?? 0;
  const drop = seated ? 0.46 - seated : pose.crouch;
  const sway = pose.sway;
  const waist = (woman ? -0.56 : -0.54) + drop;
  const shY = -0.8 + drop * 0.95;
  const shX = sway * -0.25 + pose.lean;
  const headX = shX + pose.lean * 0.4;
  const bow = pose.bow;
  const headY = shY - 0.1 + bow * 0.035;
  const skin = look.skin;
  const shade = mix(skin, [40, 22, 14], 0.25);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);

  // The chador's loose end, falling down the back from the left shoulder.
  if (woman && look.chador) {
    ctx.fillStyle = rgb(mix(look.chador, [40, 20, 10], 0.22));
    ctx.beginPath();
    ctx.moveTo(shX - 0.1, shY - 0.01);
    ctx.quadraticCurveTo(shX - 0.17, shY + 0.2, shX - 0.15 + sway * 0.6, waist + 0.2);
    ctx.lineTo(shX - 0.07 + sway * 0.6, waist + 0.18);
    ctx.quadraticCurveTo(shX - 0.09, shY + 0.15, shX - 0.04, shY);
    ctx.closePath();
    ctx.fill();
  }
  // The khopa, and the kopou in it, behind the head.
  if (look.hair === "khopa" || (look.hair === "grey" && woman)) {
    ctx.fillStyle = rgb(look.hair === "grey" ? [150, 146, 140] : HAIR);
    ctx.beginPath();
    ctx.arc(headX - 0.045, headY - 0.05, 0.036, 0, TAU);
    ctx.fill();
    if (look.flowers) kopouSpray(ctx, headX - 0.07, headY - 0.06, 0.12, -0.9, 0.013);
  }

  // Below the waist.
  if (seated) {
    // A low pira: the lap, and the shins going down to the floor.
    if (woman) {
      ctx.fillStyle = rgb(look.bottom);
      ctx.beginPath();
      ctx.moveTo(sway - 0.1, waist);
      ctx.lineTo(sway + 0.1, waist);
      ctx.quadraticCurveTo(0.17, -seated + 0.02, 0.15, -0.015);
      ctx.lineTo(-0.15, -0.015);
      ctx.quadraticCurveTo(-0.17, -seated + 0.02, sway - 0.1, waist);
      ctx.fill();
      ctx.fillStyle = rgb(look.border);
      ctx.fillRect(-0.15, -0.05, 0.3, 0.022);
    } else {
      ctx.strokeStyle = rgb(skin);
      ctx.lineCap = "round";
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(-0.08, -seated);
      ctx.lineTo(-0.085, -0.03);
      ctx.moveTo(0.08, -seated);
      ctx.lineTo(0.085, -0.03);
      ctx.stroke();
      ctx.fillStyle = rgb(look.bottom);
      ctx.beginPath();
      ctx.moveTo(sway - 0.1, waist);
      ctx.lineTo(sway + 0.1, waist);
      ctx.quadraticCurveTo(0.17, -seated - 0.02, 0.15, -seated + 0.08);
      ctx.lineTo(-0.15, -seated + 0.08);
      ctx.quadraticCurveTo(-0.17, -seated - 0.02, sway - 0.1, waist);
      ctx.fill();
    }
    ctx.fillStyle = rgb(shade);
    ctx.beginPath();
    ctx.ellipse(-0.09, -0.012, 0.045, 0.016, 0, 0, TAU);
    ctx.ellipse(0.09, -0.012, 0.045, 0.016, 0, 0, TAU);
    ctx.fill();
  } else if (woman) {
    // Feet, one heel lifting with the step.
    const lift = pose.lift ?? 0;
    ctx.fillStyle = rgb(shade);
    ctx.beginPath();
    ctx.ellipse(-0.05, -0.01 - Math.max(0, -lift) * 0.04, 0.038, 0.016, 0, 0, TAU);
    ctx.ellipse(0.05, -0.01 - Math.max(0, lift) * 0.04, 0.038, 0.016, 0, 0, TAU);
    ctx.fill();
    // The mekhela: a straight wrap from the waist to the ankles, swinging with the hips.
    const hem = sway * 0.3;
    const body = rgb(look.bottom);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(sway - 0.078, waist);
    ctx.lineTo(sway + 0.078, waist);
    ctx.quadraticCurveTo(sway + 0.112, waist + 0.14, hem + 0.098, -0.028);
    ctx.lineTo(hem - 0.098, -0.028);
    ctx.quadraticCurveTo(sway - 0.112, waist + 0.14, sway - 0.078, waist);
    ctx.fill();
    // A fold down the front, where it is tucked.
    ctx.strokeStyle = rgb(mix(look.bottom, [60, 30, 10], 0.25));
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(sway + 0.03, waist + 0.02);
    ctx.quadraticCurveTo(lerp(sway, hem, 0.5) + 0.045, -0.25, hem + 0.04, -0.03);
    ctx.stroke();
    // Woven motifs, and the red border at the hem.
    ctx.fillStyle = rgb(look.border);
    for (let row = 0; row < 3; row++) {
      const ry = lerp(waist + 0.1, -0.2, row / 2);
      const cx = lerp(sway, hem, (ry - waist) / -waist);
      for (let i = -1; i <= 1; i++) {
        const mx = cx + i * 0.055 + (row % 2) * 0.027;
        ctx.beginPath();
        ctx.moveTo(mx, ry - 0.014);
        ctx.lineTo(mx + 0.01, ry);
        ctx.lineTo(mx, ry + 0.014);
        ctx.lineTo(mx - 0.01, ry);
        ctx.fill();
      }
    }
    ctx.fillRect(hem - 0.1, -0.1, 0.2, 0.028);
    ctx.fillRect(hem - 0.1, -0.052, 0.2, 0.024);
  } else {
    // Legs, knees splaying as they bend, and the dhoti over them.
    const k = pose.crouch;
    const knee = 0.075 + k * 0.9;
    const lift = pose.lift ?? 0;
    ctx.strokeStyle = rgb(skin);
    ctx.lineCap = "round";
    ctx.lineWidth = 0.048;
    for (const side of [-1, 1]) {
      const up = Math.max(0, side * lift) * 0.05;
      ctx.beginPath();
      ctx.moveTo(sway + side * 0.05, waist + 0.2);
      ctx.lineTo(sway * 0.5 + side * knee, -0.24 + k - up);
      ctx.lineTo(side * 0.065, -0.03 - up);
      ctx.stroke();
      ctx.fillStyle = rgb(shade);
      ctx.beginPath();
      ctx.ellipse(side * 0.07, -0.012 - up, 0.042, 0.016, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = rgb(look.bottom);
    ctx.beginPath();
    ctx.moveTo(sway - 0.09, waist);
    ctx.lineTo(sway + 0.09, waist);
    ctx.quadraticCurveTo(sway + 0.13, waist + 0.14, sway * 0.5 + knee + 0.05, -0.2 + k);
    ctx.lineTo(sway * 0.5 + knee - 0.04, -0.17 + k);
    ctx.lineTo(sway * 0.7 + 0.015, -0.3 + k * 0.6);
    ctx.lineTo(sway * 0.7 - 0.015, -0.3 + k * 0.6);
    ctx.lineTo(sway * 0.5 - knee + 0.04, -0.17 + k);
    ctx.lineTo(sway * 0.5 - knee - 0.05, -0.2 + k);
    ctx.quadraticCurveTo(sway - 0.13, waist + 0.14, sway - 0.09, waist);
    ctx.fill();
    // The kasa, the pleats tucked at the front.
    ctx.fillStyle = rgb(mix(look.bottom, [255, 255, 255], 0.35));
    ctx.beginPath();
    ctx.moveTo(sway - 0.018, waist + 0.01);
    ctx.lineTo(sway + 0.018, waist + 0.01);
    ctx.lineTo(sway * 0.7 + 0.02, -0.26 + k * 0.6);
    ctx.lineTo(sway * 0.7 - 0.02, -0.26 + k * 0.6);
    ctx.fill();
    ctx.strokeStyle = rgb(look.border);
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(sway * 0.5 + knee + 0.05, -0.2 + k);
    ctx.lineTo(sway * 0.5 + knee - 0.04, -0.17 + k);
    ctx.moveTo(sway * 0.5 - knee - 0.05, -0.2 + k);
    ctx.lineTo(sway * 0.5 - knee + 0.04, -0.17 + k);
    ctx.stroke();
  }

  // The torso: waist to shoulders, the shoulders sitting back over the swaying hips.
  const shW = woman ? 0.09 : 0.105;
  const wW = woman ? 0.066 : 0.085;
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(sway - wW, waist + 0.01);
    ctx.lineTo(sway + wW, waist + 0.01);
    ctx.quadraticCurveTo(shX + shW + 0.01, shY + 0.14, shX + shW, shY + 0.01);
    ctx.quadraticCurveTo(shX, shY - 0.03, shX - shW, shY + 0.01);
    ctx.quadraticCurveTo(shX - shW - 0.01, shY + 0.14, sway - wW, waist + 0.01);
    ctx.closePath();
  };
  if (woman) {
    ctx.fillStyle = rgb(look.top ?? look.bottom);
    torso();
    ctx.fill();
    if (look.chador) {
      // The chador, wrapped round from the waist and up over the left shoulder.
      const c = look.chador;
      ctx.fillStyle = rgb(c);
      ctx.beginPath();
      ctx.moveTo(sway - wW - 0.004, waist + 0.012);
      ctx.lineTo(sway + wW + 0.004, waist + 0.012);
      ctx.lineTo(lerp(sway + wW, shX + shW, 0.35), lerp(waist, shY, 0.35));
      ctx.lineTo(shX - shW * 0.2, shY - 0.005);
      ctx.lineTo(shX - shW - 0.012, shY + 0.02);
      ctx.quadraticCurveTo(shX - shW - 0.012, shY + 0.14, sway - wW - 0.004, waist + 0.012);
      ctx.fill();
      ctx.strokeStyle = rgb(look.border);
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      ctx.moveTo(lerp(sway + wW, shX + shW, 0.35), lerp(waist, shY, 0.35));
      ctx.lineTo(shX - shW * 0.2, shY - 0.005);
      ctx.stroke();
      ctx.lineWidth = 0.006;
      ctx.beginPath();
      ctx.moveTo(lerp(sway + wW, shX + shW, 0.35) - 0.018, lerp(waist, shY, 0.35) + 0.012);
      ctx.lineTo(shX - shW * 0.2 - 0.018, shY + 0.01);
      ctx.stroke();
      // A band of motifs across it.
      ctx.fillStyle = rgb(look.border);
      for (let i = 0; i < 3; i++) {
        const t = 0.35 + i * 0.16;
        const mx = lerp(sway, shX - 0.03, t) - 0.03;
        const my = lerp(waist, shY, t);
        ctx.beginPath();
        ctx.arc(mx, my, 0.008, 0, TAU);
        ctx.fill();
      }
    }
  } else {
    ctx.fillStyle = rgb(look.top ?? skin);
    torso();
    ctx.fill();
    if (!look.top) {
      ctx.strokeStyle = rgb(shade, 0.5);
      ctx.lineWidth = 0.006;
      ctx.beginPath();
      ctx.moveTo(shX - 0.05, shY + 0.1);
      ctx.quadraticCurveTo(shX, shY + 0.12, shX + 0.05, shY + 0.1);
      ctx.stroke();
    }
    if (look.gamosa === "waist")
      gamosaBand(
        ctx,
        [
          { x: sway - wW - 0.01, y: waist + 0.005 },
          { x: sway + wW + 0.01, y: waist + 0.005 },
        ],
        0.032,
      );
  }

  // Neck and head.
  ctx.fillStyle = rgb(skin);
  ctx.fillRect(headX - 0.02, shY - 0.05, 0.04, 0.06);
  ctx.beginPath();
  ctx.ellipse(headX, headY, look.child ? 0.062 : 0.056, look.child ? 0.062 : 0.066, 0, 0, TAU);
  ctx.fill();
  // Hair.
  const hairColor = look.hair === "grey" ? ([150, 146, 140] as RGB) : HAIR;
  ctx.fillStyle = rgb(hairColor);
  ctx.beginPath();
  ctx.ellipse(headX, headY - 0.014, 0.059, 0.057, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(headX, headY - 0.045, headX - 0.058, headY - 0.01);
  ctx.fill();
  if (woman) {
    ctx.fillStyle = "rgb(200, 30, 40)";
    ctx.beginPath();
    ctx.arc(headX, headY - 0.028, 0.007, 0, TAU);
    ctx.fill();
    // A gold junbiri at the throat.
    ctx.fillStyle = rgb(BRONZE);
    ctx.beginPath();
    ctx.ellipse(headX, shY + 0.012, 0.022, 0.012, 0, 0, Math.PI);
    ctx.fill();
  }
  if (look.hair === "band") {
    // A gamosa tied round the head, its ends flying at the side.
    ctx.fillStyle = rgb(GAMOSA);
    ctx.fillRect(headX - 0.061, headY - 0.048, 0.122, 0.026);
    ctx.fillStyle = rgb(GAMOSA_RED);
    ctx.fillRect(headX - 0.061, headY - 0.048, 0.122, 0.006);
    ctx.fillRect(headX - 0.061, headY - 0.028, 0.122, 0.006);
    ctx.fillStyle = rgb(GAMOSA);
    ctx.beginPath();
    ctx.moveTo(headX + 0.055, headY - 0.04);
    ctx.lineTo(headX + 0.11, headY - 0.0 + sway * 0.8);
    ctx.lineTo(headX + 0.09, headY + 0.015 + sway * 0.8);
    ctx.lineTo(headX + 0.05, headY - 0.025);
    ctx.fill();
    ctx.fillStyle = rgb(GAMOSA_RED);
    ctx.fillRect(headX + 0.085, headY - 0.002 + sway * 0.8, 0.02, 0.008);
  }

  // A gamosa round the neck, its ends down the chest.
  if (look.gamosa === "shoulders") {
    gamosaBand(
      ctx,
      [
        { x: shX - shW + 0.01, y: shY + 0.005 },
        { x: headX, y: shY + 0.03 },
        { x: shX + shW - 0.01, y: shY + 0.005 },
      ],
      0.03,
    );
    gamosaEnd(ctx, shX - 0.05, shY + 0.01, 0.2, 0.034, -0.05);
    gamosaEnd(ctx, shX + 0.05, shY + 0.01, 0.2, 0.034, 0.05);
  }

  // The dhol hangs in front, across the waist.
  const hold = pose.hold;
  const dholY = waist + 0.04;
  if (hold === "dhol") {
    ctx.strokeStyle = "rgb(80, 44, 24)";
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(shX + shW - 0.02, shY + 0.01);
    ctx.lineTo(-0.15, dholY - 0.05);
    ctx.stroke();
    drawDhol(ctx, sway * 0.4, dholY, 0.44, 0.105);
  }

  // Arms.
  const upper = 0.165;
  const fore = 0.16;
  const arm = (side: -1 | 1, target: Point) => {
    const s = { x: shX + side * (shW - 0.01), y: shY + 0.02 };
    const { e, h: hand } = elbow(s, target, side, upper, fore);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const sleeve = woman ? (look.top ?? skin) : look.sleeves && look.top ? look.top : skin;
    ctx.strokeStyle = rgb(skin);
    ctx.lineWidth = 0.042;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
    if (sleeve !== skin) {
      ctx.strokeStyle = rgb(sleeve);
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(lerp(s.x, e.x, woman ? 0.55 : 0.9), lerp(s.y, e.y, woman ? 0.55 : 0.9));
      ctx.stroke();
    }
    if (woman) {
      // Gamkharu, the broad gold bangle.
      ctx.strokeStyle = rgb(BRONZE);
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(lerp(e.x, hand.x, 0.74), lerp(e.y, hand.y, 0.74));
      ctx.lineTo(lerp(e.x, hand.x, 0.84), lerp(e.y, hand.y, 0.84));
      ctx.stroke();
    }
    ctx.fillStyle = rgb(skin);
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y, 0.026, 0.03, Math.atan2(hand.y - e.y, hand.x - e.x) + Math.PI / 2, 0, TAU);
    ctx.fill();
    return hand;
  };
  const left = arm(-1, pose.left);
  const right = arm(1, pose.right);

  // What the hands hold.
  switch (hold) {
    case "dhol": {
      // The maari: a short curved bamboo stick, striking the right head.
      ctx.strokeStyle = "rgb(214, 186, 120)";
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.quadraticCurveTo(right.x + 0.06, right.y + 0.02, right.x + 0.07, right.y + 0.09);
      ctx.stroke();
      break;
    }
    case "pepa": {
      // The buffalo horn, flaring up and away from the lips, a cane reed in the mouth.
      const mx = headX + 0.012;
      const my = headY + 0.036;
      ctx.fillStyle = "rgb(46, 32, 26)";
      ctx.beginPath();
      ctx.moveTo(mx, my - 0.006);
      ctx.quadraticCurveTo(mx + 0.12, my + 0.0, mx + 0.2, my - 0.12);
      ctx.lineTo(mx + 0.235, my - 0.095);
      ctx.quadraticCurveTo(mx + 0.13, my + 0.03, mx, my + 0.008);
      ctx.fill();
      ctx.fillStyle = "rgb(120, 96, 70)";
      ctx.beginPath();
      ctx.ellipse(mx + 0.218, my - 0.108, 0.022, 0.01, -0.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgb(222, 196, 130)";
      ctx.fillRect(mx - 0.012, my - 0.005, 0.02, 0.01);
      break;
    }
    case "taal": {
      for (const hand of [left, right]) {
        ctx.fillStyle = rgb(BRONZE);
        ctx.beginPath();
        ctx.ellipse(hand.x + (hand === left ? 0.02 : -0.02), hand.y, 0.014, 0.05, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgb(mix(BRONZE, [255, 250, 220], 0.5));
        ctx.beginPath();
        ctx.ellipse(hand.x + (hand === left ? 0.024 : -0.024), hand.y - 0.012, 0.005, 0.02, 0, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "gamosa": {
      // Held out on both hands: the length of it sagging between them, the ends falling.
      const mid = { x: (left.x + right.x) / 2, y: Math.max(left.y, right.y) + 0.05 };
      gamosaBand(ctx, [left, mid, right], 0.05);
      gamosaEnd(ctx, left.x, left.y, 0.16, 0.05, 0.05);
      gamosaEnd(ctx, right.x, right.y, 0.16, 0.05, -0.05);
      break;
    }
    case "xorai": {
      drawXorai(ctx, (left.x + right.x) / 2, (left.y + right.y) / 2 + 0.02, 0.2, true);
      break;
    }
    case "twig": {
      // Dighloti: a switch of long narrow leaves.
      ctx.strokeStyle = "rgb(90, 70, 40)";
      ctx.lineWidth = 0.01;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.lineTo(right.x + 0.1, right.y - 0.2);
      ctx.stroke();
      ctx.fillStyle = "rgb(70, 130, 50)";
      for (let i = 0; i < 7; i++) {
        const t = 0.3 + i * 0.1;
        const lx = right.x + 0.1 * t;
        const ly = right.y - 0.2 * t;
        ctx.beginPath();
        ctx.ellipse(lx + (i % 2 ? 0.03 : -0.03), ly, 0.035, 0.01, i % 2 ? 0.5 : -0.5, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "toka": {
      // A length of bamboo split down half its length.
      ctx.strokeStyle = "rgb(196, 176, 96)";
      ctx.lineWidth = 0.024;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y + 0.08);
      ctx.lineTo(right.x + 0.02, right.y - 0.08);
      ctx.stroke();
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(right.x + 0.02, right.y - 0.08);
      ctx.lineTo(right.x - 0.01, right.y - 0.3);
      ctx.moveTo(right.x + 0.02, right.y - 0.08);
      ctx.lineTo(right.x + 0.06, right.y - 0.3);
      ctx.stroke();
      break;
    }
    case "gogona": {
      ctx.strokeStyle = "rgb(170, 140, 80)";
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      ctx.moveTo(headX - 0.03, headY + 0.04);
      ctx.lineTo(headX + 0.1, headY + 0.05);
      ctx.stroke();
      break;
    }
    case "pitha": {
      ctx.fillStyle = "rgb(236, 222, 190)";
      ctx.beginPath();
      ctx.ellipse(right.x, right.y - 0.01, 0.03, 0.014, 0.3, 0, TAU);
      ctx.fill();
      break;
    }
  }
  ctx.restore();

  const world = (p: Point) => ({ x: x + facing * p.x * h, y: y + p.y * h });
  return { left: world(left), right: world(right), head: world({ x: headX, y: headY }), shoulders: world({ x: shX, y: shY }) };
}

/** The Bihu dhol: a barrel of jackfruit wood, its two heads laced tight with leather. */
export function drawDhol(ctx: Ctx, cx: number, cy: number, length: number, r: number) {
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, "#9a4a26");
  g.addColorStop(0.45, "#6e2e16");
  g.addColorStop(1, "#3c160a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - length / 2, cy - r * 0.86);
  ctx.quadraticCurveTo(cx, cy - r * 1.12, cx + length / 2, cy - r * 0.86);
  ctx.lineTo(cx + length / 2, cy + r * 0.86);
  ctx.quadraticCurveTo(cx, cy + r * 1.12, cx - length / 2, cy + r * 0.86);
  ctx.closePath();
  ctx.fill();
  // The lacing, zigzag from head to head.
  ctx.strokeStyle = "rgba(226, 196, 140, 0.85)";
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const yy = cy - r * 0.85 + t * r * 1.7;
    ctx.moveTo(cx - length / 2 + r * 0.1, yy);
    ctx.lineTo(cx + length / 2 - r * 0.1, cy - r * 0.85 + ((i + 0.5) / 8) * r * 1.7);
  }
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#2a120a";
    ctx.beginPath();
    ctx.ellipse(cx + (side * length) / 2, cy, r * 0.3, r * 0.98, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e6d4ac";
    ctx.beginPath();
    ctx.ellipse(cx + (side * length) / 2, cy, r * 0.2, r * 0.8, 0, 0, TAU);
    ctx.fill();
  }
}

/**
 * A xorai: the bell-metal offering tray on its stand, with tamul-paan on it. Drawn standing on
 * (x, y), `size` wide.
 */
export function drawXorai(ctx: Ctx, x: number, y: number, size: number, paan = true) {
  const s = size;
  const g = ctx.createLinearGradient(x - s / 2, 0, x + s / 2, 0);
  g.addColorStop(0, "#8a5a1e");
  g.addColorStop(0.35, "#f0c870");
  g.addColorStop(0.55, "#d8a040");
  g.addColorStop(1, "#7a4a16");
  ctx.fillStyle = g;
  // Foot, stem and tray.
  ctx.beginPath();
  ctx.moveTo(x - s * 0.28, y);
  ctx.quadraticCurveTo(x - s * 0.1, y - s * 0.08, x - s * 0.06, y - s * 0.22);
  ctx.lineTo(x - s * 0.08, y - s * 0.3);
  ctx.lineTo(x - s * 0.04, y - s * 0.36);
  ctx.quadraticCurveTo(x - s * 0.44, y - s * 0.38, x - s * 0.5, y - s * 0.5);
  ctx.lineTo(x + s * 0.5, y - s * 0.5);
  ctx.quadraticCurveTo(x + s * 0.44, y - s * 0.38, x + s * 0.04, y - s * 0.36);
  ctx.lineTo(x + s * 0.08, y - s * 0.3);
  ctx.lineTo(x + s * 0.06, y - s * 0.22);
  ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.08, x + s * 0.28, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6dc98";
  ctx.fillRect(x - s * 0.5, y - s * 0.52, s, s * 0.04);
  ctx.fillRect(x - s * 0.1, y - s * 0.31, s * 0.2, s * 0.03);
  if (paan) {
    // Betel leaves, heart-shaped, and cut areca nut.
    ctx.fillStyle = "#4e8a32";
    for (const [dx, a] of [
      [-0.2, -0.5],
      [0.05, 0.2],
      [0.24, 0.6],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x + s * dx, y - s * 0.58, s * 0.13, s * 0.07, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#8a5a36";
    for (const dx of [-0.08, 0.12]) {
      ctx.beginPath();
      ctx.arc(x + s * dx, y - s * 0.62, s * 0.05, 0, TAU);
      ctx.fill();
    }
  } else {
    // The lid, a cone with a finial.
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.42, y - s * 0.52);
    ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.62, x - s * 0.04, y - s * 0.92);
    ctx.lineTo(x + s * 0.04, y - s * 0.92);
    ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.62, x + s * 0.42, y - s * 0.52);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - s * 0.96, s * 0.05, 0, TAU);
    ctx.fill();
  }
}

// ─── Cattle ────────────────────────────────────────────────────────────────

export type Cow = {
  coat: RGB;
  patch: RGB | null;
  horns: number;
  size: number;
};

export type CowPose = {
  /** Walking phase in turns, or 0 standing. */
  step: number;
  /** Head lowered to drink, 0..1. */
  graze: number;
  tail: number;
  /** Wet with pond water, 0..1. */
  wet: number;
  /** Maah-halodhi smeared on, 0..1. */
  paste: number;
  /** A shake of the head, -1..1. */
  shake: number;
};

/**
 * A cow of the valley, in profile: small, with the zebu's hump and dewlap and short horns.
 * Standing on (x, y), `cow.size` tall at the shoulder, facing `facing`.
 */
export function drawCow(ctx: Ctx, x: number, y: number, cow: Cow, pose: CowPose, facing: 1 | -1) {
  const s = cow.size;
  const coat = mix(cow.coat, [30, 22, 18], pose.wet * 0.3);
  const dark = mix(coat, [20, 12, 8], 0.35);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  ctx.lineCap = "round";

  // Far legs first, a little darker.
  const leg = (lx: number, phase: number, far: boolean) => {
    const swing = pose.step ? Math.sin((pose.step + phase) * TAU) * 0.08 : 0;
    ctx.strokeStyle = rgb(far ? mix(coat, [0, 0, 0], 0.25) : coat);
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(lx, -0.6);
    ctx.lineTo(lx + swing * 0.5, -0.3);
    ctx.lineTo(lx + swing, -0.05);
    ctx.stroke();
    ctx.fillStyle = "rgb(40, 30, 26)";
    ctx.fillRect(lx + swing - 0.045, -0.06, 0.09, 0.06);
  };
  leg(0.44, 0.5, true);
  leg(-0.46, 0, true);

  // The tail, swishing.
  const tx = -0.66;
  const tail = pose.tail;
  ctx.strokeStyle = rgb(coat);
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(tx, -0.9);
  ctx.quadraticCurveTo(tx - 0.12 + tail * 0.1, -0.6, tx - 0.06 + tail * 0.25, -0.34);
  ctx.stroke();
  ctx.fillStyle = "rgb(40, 30, 26)";
  ctx.beginPath();
  ctx.ellipse(tx - 0.06 + tail * 0.25, -0.3, 0.035, 0.07, tail * 0.4, 0, TAU);
  ctx.fill();

  // Body, with the hump over the shoulders.
  ctx.fillStyle = rgb(coat);
  ctx.beginPath();
  ctx.moveTo(-0.7, -0.88);
  ctx.quadraticCurveTo(-0.6, -1.0, -0.2, -0.97);
  ctx.quadraticCurveTo(0.15, -0.96, 0.24, -1.02);
  ctx.quadraticCurveTo(0.34, -1.14, 0.44, -1.02);
  ctx.quadraticCurveTo(0.6, -0.9, 0.62, -0.72);
  ctx.quadraticCurveTo(0.6, -0.5, 0.42, -0.5);
  ctx.quadraticCurveTo(0, -0.46, -0.44, -0.52);
  ctx.quadraticCurveTo(-0.72, -0.56, -0.7, -0.88);
  ctx.fill();
  if (cow.patch) {
    ctx.fillStyle = rgb(mix(cow.patch, [30, 22, 18], pose.wet * 0.3));
    ctx.beginPath();
    ctx.ellipse(-0.25, -0.76, 0.2, 0.15, 0.3, 0, TAU);
    ctx.ellipse(0.3, -0.7, 0.12, 0.14, -0.2, 0, TAU);
    ctx.fill();
  }
  // Near legs.
  leg(0.34, 0, false);
  leg(-0.56, 0.5, false);

  // Neck, dewlap and head.
  const graze = pose.graze;
  const hx = 0.86 + graze * 0.06 + pose.shake * 0.03;
  const hy = -0.92 + graze * 0.5;
  ctx.fillStyle = rgb(coat);
  ctx.beginPath();
  ctx.moveTo(0.3, -1.0);
  ctx.quadraticCurveTo(0.62, -0.98, hx - 0.05, hy - 0.08);
  ctx.lineTo(hx + 0.02, hy + 0.1);
  ctx.quadraticCurveTo(0.7, -0.52 + graze * 0.1, 0.52, -0.46);
  ctx.quadraticCurveTo(0.5, -0.6, 0.4, -0.7);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.9 + graze * 0.5 + pose.shake * 0.15);
  ctx.fillStyle = rgb(coat);
  ctx.beginPath();
  ctx.ellipse(0.1, 0, 0.2, 0.085, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgb(dark);
  ctx.beginPath();
  ctx.ellipse(0.26, 0.005, 0.06, 0.07, 0, 0, TAU);
  ctx.fill();
  // Ear, horn and eye.
  ctx.fillStyle = rgb(mix(coat, [0, 0, 0], 0.15));
  ctx.beginPath();
  ctx.ellipse(-0.04, -0.1, 0.09, 0.03, -0.6 + pose.shake * 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgb(214, 200, 170)";
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.05);
  ctx.quadraticCurveTo(-0.12, -0.08, -0.14 - cow.horns * 0.04, -0.02 - cow.horns * 0.1);
  ctx.stroke();
  ctx.fillStyle = "rgb(20, 14, 12)";
  ctx.beginPath();
  ctx.arc(0.05, -0.05, 0.018, 0, TAU);
  ctx.fill();
  if (pose.paste > 0.01) {
    ctx.fillStyle = `rgba(236, 178, 30, ${0.9 * pose.paste})`;
    ctx.beginPath();
    ctx.arc(0.02, 0.02, 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Maah-halodhi: turmeric-yellow smears on the flank and the back.
  if (pose.paste > 0.01) {
    ctx.fillStyle = `rgba(236, 178, 30, ${0.85 * pose.paste})`;
    for (const [px, py, r] of [
      [-0.4, -0.78, 0.09],
      [-0.1, -0.84, 0.07],
      [0.2, -0.78, 0.08],
      [0.36, -1.02, 0.05],
      [-0.55, -0.7, 0.05],
    ]) {
      ctx.beginPath();
      ctx.ellipse(px, py, r * 1.3, r, 0.2, 0, TAU);
      ctx.fill();
    }
  }
  // A wet sheen along the back.
  if (pose.wet > 0.01) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * pose.wet})`;
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(-0.6, -0.92);
    ctx.quadraticCurveTo(-0.2, -0.99, 0.2, -0.99);
    ctx.stroke();
  }
  // A garland of marigold round the neck, for the day.
  ctx.fillStyle = "rgb(246, 150, 30)";
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.arc(lerp(0.5, 0.66, t), lerp(-0.94, -0.56, t) + Math.sin(t * Math.PI) * 0.04, 0.035, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** A random villager: `woman` in mekhela chador, otherwise in dhoti. */
export function makeLook(random: () => number, h: number, woman: boolean, festive: boolean): Look {
  const skin = SKIN[Math.floor(random() * SKIN.length)];
  if (woman) {
    const muga: RGB = [226, 190, 116];
    const pat: RGB[] = [
      [226, 190, 116],
      [240, 228, 206],
      [214, 76, 96],
      [70, 130, 110],
      [236, 170, 80],
      [150, 60, 110],
    ];
    const bottom = festive ? muga : pat[Math.floor(random() * pat.length)];
    const border: RGB = festive ? [176, 26, 34] : random() < 0.5 ? [176, 26, 34] : [40, 70, 120];
    return {
      h,
      skin,
      woman: true,
      top: festive ? [196, 30, 40] : pat[Math.floor(random() * pat.length)],
      bottom,
      border,
      chador: festive ? muga : mix(bottom, [255, 255, 255], 0.15),
      hair: "khopa",
      flowers: festive,
      gamosa: "none",
      sleeves: true,
    };
  }
  const dhoti: RGB = random() < 0.7 ? [244, 240, 228] : [236, 226, 200];
  const tops: (RGB | null)[] = [[244, 240, 230], [236, 228, 210], null, [200, 214, 230], [230, 200, 150]];
  return {
    h,
    skin,
    woman: false,
    top: festive ? [246, 242, 232] : tops[Math.floor(random() * tops.length)],
    bottom: dhoti,
    border: [196, 32, 38],
    hair: festive ? "band" : "short",
    flowers: false,
    gamosa: festive ? "waist" : random() < 0.5 ? "shoulders" : "none",
    sleeves: random() < 0.5,
  };
}

/** The Bihu dance, at `t` beats: the hips swing, the hands turn at shoulder height, a heel lifts. */
export function dancePose(t: number, energy: number, seed: number): Pose {
  const beat = t * Math.PI;
  const sway = Math.sin(beat) * 0.035 * energy;
  const up = 0.5 + 0.5 * Math.sin(beat * 0.5 + seed);
  const flick = Math.sin(beat * 2 + seed) * 0.02 * energy;
  const reach = lerp(0.2, 0.26, energy);
  return {
    sway,
    crouch: 0.03 + 0.03 * energy * (0.5 + 0.5 * Math.cos(beat * 2)),
    lean: -sway * 0.3,
    bow: 0.2 - 0.3 * energy * up,
    left: { x: -reach - flick, y: lerp(-0.78, -0.98, up * energy) + Math.sin(beat + 1) * 0.03 },
    right: { x: reach + flick, y: lerp(-0.98, -0.78, up * energy) + Math.sin(beat) * 0.03 },
    lift: Math.sin(beat) * clamp(energy),
  };
}
