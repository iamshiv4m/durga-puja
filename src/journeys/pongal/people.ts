// The people of the street and their cattle, painted flat like cut paper. Figures are drawn in
// units of their own height with the feet on the origin, facing +x; cattle in units of their
// height at the hump.
import { TAU, clamp, lerp, mix, rgb, type Ctx, type RGB } from "../paint";

/** The light on things at one moment: how bright, of what colour, and the colour of the dark. */
export type Env = { amb: number; tint: RGB; night: RGB };

/** A surface colour under `env`, lifted toward full colour by the fire or a lamp nearby. */
export function tone(base: RGB, env: Env, lift = 0): RGB {
  const dark = mix(base, env.night, 0.86);
  const day = mix(base, env.tint, 0.14);
  return mix(dark, day, clamp(env.amb + lift));
}

export const paint = (base: RGB, env: Env, lift = 0, alpha = 1) => rgb(tone(base, env, lift), alpha);

export const SKIN: RGB[] = [
  [150, 98, 66],
  [128, 82, 56],
  [168, 114, 80],
  [112, 72, 50],
  [140, 92, 62],
];
const HAIR: RGB = [22, 16, 14];
const GREY: RGB = [200, 196, 190];
export const GOLD: RGB = [226, 178, 70];

export type Kind = "woman" | "man" | "girl" | "boy" | "paati" | "thatha";

export type Look = {
  kind: Kind;
  h: number;
  skin: RGB;
  /** The sari, veshti or pavadai. */
  cloth: RGB;
  /** Its border, zari gold on silk. */
  border: RGB;
  /** Blouse, shirt or sattai; null for a bare chest. */
  top: RGB | null;
  /** The thundu over a man's shoulder, or tied round his head. */
  towel: RGB | null;
  mundaasu?: boolean;
  /** A veshti folded up to the knee for work. */
  tucked?: boolean;
  flowers?: boolean;
};

export type Hold = "drum" | "ladle" | "cane" | "plate" | "aarti" | "mat" | "rope" | "tiffin" | "stick";

/**
 * Arm angles are measured from hanging straight down, positive swinging towards the way the figure
 * faces: 0 is at the side, π/2 straight out in front, π straight up.
 */
export type Pose = { la: number; lf: number; ra: number; rf: number; lean?: number; bob?: number; hold?: Hold; step?: number };

export type Hands = { left: { x: number; y: number }; right: { x: number; y: number } };

const SHOULDER = { y: -0.785, x: 0.085 };
const UPPER = 0.165;
const FOREARM = 0.16;
const HIP = -0.52;

const child = (k: Kind) => k === "girl" || k === "boy";
const female = (k: Kind) => k === "woman" || k === "girl" || k === "paati";

/** Palms together at the chest: vanakkam. */
export const JOINED: Pose = { la: 0.5, lf: 2.3, ra: 0.5, rf: 2.3 };
export const STANDING: Pose = { la: 0.1, lf: 0.25, ra: 0.12, rf: 0.3 };

/** Draws a person standing on (x, y) facing `facing`; returns where the hands are, in world units. */
export function drawPerson(ctx: Ctx, x: number, y: number, look: Look, pose: Pose, env: Env, lift = 0, facing: 1 | -1 = 1, seconds = 0): Hands {
  const { h, kind } = look;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const c = (base: RGB, extra = 0) => paint(base, env, lift + extra);
  const skin = c(look.skin);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  ctx.lineJoin = "round";

  // Below the waist.
  const step = pose.step ?? 0;
  if (kind === "woman" || kind === "paati") {
    // The sari: pleats down the front, the zari border along the hem.
    ctx.fillStyle = c(look.cloth);
    ctx.beginPath();
    ctx.moveTo(-0.085, -0.56 + bob);
    ctx.lineTo(0.085, -0.56 + bob);
    ctx.quadraticCurveTo(0.13, -0.28, 0.165 + step * 0.03, -0.012);
    ctx.quadraticCurveTo(0, 0.012, -0.165 + step * 0.03, -0.012);
    ctx.quadraticCurveTo(-0.13, -0.28, -0.085, -0.56 + bob);
    ctx.fill();
    ctx.strokeStyle = c(mix(look.cloth, [255, 255, 255], 0.2));
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    for (const px of [0.0, 0.028, 0.056]) {
      ctx.moveTo(px, -0.5 + bob);
      ctx.lineTo(px + 0.012 + step * 0.01, -0.03);
    }
    ctx.stroke();
    ctx.strokeStyle = c(look.border, 0.1);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(0.158 + step * 0.03, -0.03);
    ctx.quadraticCurveTo(0, -0.005, -0.158 + step * 0.03, -0.03);
    ctx.moveTo(0.075, -0.5 + bob);
    ctx.lineTo(0.09 + step * 0.01, -0.04);
    ctx.stroke();
  } else if (kind === "girl") {
    // Pattu pavadai: a long silk skirt with a broad gold border.
    ctx.fillStyle = c(look.cloth);
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.56 + bob);
    ctx.lineTo(0.08, -0.56 + bob);
    ctx.quadraticCurveTo(0.15, -0.3, 0.2, -0.04);
    ctx.lineTo(-0.2, -0.04);
    ctx.quadraticCurveTo(-0.15, -0.3, -0.08, -0.56 + bob);
    ctx.fill();
    ctx.fillStyle = c(look.border, 0.1);
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.04);
    ctx.lineTo(0.2, -0.04);
    ctx.lineTo(0.185, -0.12);
    ctx.lineTo(-0.185, -0.12);
    ctx.fill();
  } else {
    // Veshti, or shorts for a boy; bare shins below.
    const hem = kind === "boy" ? -0.3 : look.tucked ? -0.26 : -0.035;
    ctx.strokeStyle = skin;
    ctx.lineWidth = 0.05;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.045, hem);
    ctx.lineTo(-0.05 - step * 0.03, -0.03);
    ctx.moveTo(0.045, hem);
    ctx.lineTo(0.05 + step * 0.03, -0.03);
    ctx.stroke();
    ctx.fillStyle = c(look.cloth);
    ctx.beginPath();
    ctx.moveTo(-0.085, -0.53 + bob);
    ctx.lineTo(0.085, -0.53 + bob);
    ctx.lineTo(kind === "boy" ? 0.1 : 0.105, hem);
    ctx.lineTo(kind === "boy" ? -0.1 : -0.105, hem);
    ctx.closePath();
    ctx.fill();
    if (kind !== "boy") {
      ctx.strokeStyle = c(look.border, 0.1);
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(-0.1, hem + 0.012);
      ctx.lineTo(0.1, hem + 0.012);
      // The front fold, with its border down the middle.
      ctx.moveTo(0.03, -0.5 + bob);
      ctx.lineTo(0.045, hem + 0.01);
      ctx.stroke();
    }
  }
  // Feet.
  ctx.fillStyle = c(mix(look.skin, [30, 18, 12], 0.3));
  ctx.beginPath();
  ctx.ellipse(-0.05 - step * 0.03, -0.01, 0.04, 0.016, 0, 0, TAU);
  ctx.ellipse(0.06 + step * 0.03, -0.01, 0.04, 0.016, 0, 0, TAU);
  ctx.fill();

  // Above the waist, leaning from the hip.
  ctx.translate(0, HIP + bob);
  ctx.rotate(lean);
  ctx.translate(0, -HIP);

  // A long braid down her back, with jasmine, where it shows past her shoulder.
  if (female(kind) && kind !== "paati") {
    ctx.strokeStyle = rgb(tone(HAIR, env, lift));
    ctx.lineWidth = 0.035;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.9);
    ctx.quadraticCurveTo(-0.1, -0.75, -0.085, kind === "girl" ? -0.6 : -0.56);
    ctx.stroke();
    if (look.flowers) {
      ctx.strokeStyle = c([250, 248, 236], 0.15);
      ctx.lineWidth = 0.028;
      ctx.setLineDash([0.012, 0.01]);
      ctx.beginPath();
      ctx.moveTo(-0.075, -0.92);
      ctx.quadraticCurveTo(-0.115, -0.84, -0.1, -0.7);
      ctx.stroke();
      ctx.setLineDash([]);
      // A tuft of orange kanakambaram with it.
      ctx.fillStyle = c([246, 130, 40], 0.1);
      ctx.beginPath();
      ctx.arc(-0.07, -0.915, 0.018, 0, TAU);
      ctx.fill();
    }
  }

  // The torso: blouse, shirt, or a bare chest.
  const top = look.top ?? look.skin;
  ctx.fillStyle = c(top);
  ctx.beginPath();
  if (female(kind)) {
    ctx.moveTo(-0.08, -0.8);
    ctx.lineTo(0.08, -0.8);
    ctx.lineTo(0.07, -0.62);
    ctx.lineTo(-0.07, -0.62);
  } else {
    ctx.moveTo(-0.09, -0.8);
    ctx.lineTo(0.09, -0.8);
    ctx.lineTo(0.095, -0.5);
    ctx.lineTo(-0.095, -0.5);
  }
  ctx.closePath();
  ctx.fill();
  if (kind === "woman" || kind === "paati") {
    // Midriff, then the pallu from the right hip over the left shoulder, bordered in zari.
    ctx.fillStyle = skin;
    ctx.fillRect(-0.07, -0.62, 0.14, 0.065);
    ctx.fillStyle = c(look.cloth);
    ctx.beginPath();
    ctx.moveTo(0.085, -0.54);
    ctx.lineTo(0.09, -0.6);
    ctx.lineTo(-0.04, -0.81);
    ctx.lineTo(-0.1, -0.8);
    ctx.lineTo(-0.105, -0.72);
    ctx.lineTo(0.02, -0.54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c(look.border, 0.1);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(0.09, -0.6);
    ctx.lineTo(-0.04, -0.81);
    ctx.stroke();
  } else if (kind === "girl") {
    ctx.fillStyle = c(look.cloth);
    ctx.fillRect(-0.08, -0.6, 0.16, 0.04);
  } else if (look.top) {
    // A shirt: its placket and collar.
    ctx.strokeStyle = c(mix(top, [0, 0, 0], 0.18));
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(0, -0.79);
    ctx.lineTo(0, -0.52);
    ctx.moveTo(-0.035, -0.8);
    ctx.lineTo(0, -0.765);
    ctx.lineTo(0.035, -0.8);
    ctx.stroke();
  }
  if (look.towel && !look.mundaasu) {
    // The thundu, over one shoulder and down the chest.
    ctx.strokeStyle = c(look.towel);
    ctx.lineWidth = 0.04;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.81);
    ctx.quadraticCurveTo(-0.03, -0.7, -0.05, -0.55);
    ctx.stroke();
  }

  // Neck and head.
  ctx.fillStyle = skin;
  ctx.fillRect(-0.022, -0.86, 0.044, 0.07);
  ctx.beginPath();
  ctx.ellipse(0, -0.9, 0.058, 0.068, 0, 0, TAU);
  ctx.fill();
  const hair = kind === "paati" || kind === "thatha" ? GREY : HAIR;
  ctx.fillStyle = rgb(tone(hair, env, lift));
  if (look.mundaasu && look.towel) {
    ctx.fillStyle = c(look.towel);
    ctx.beginPath();
    ctx.ellipse(0, -0.95, 0.072, 0.042, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c(mix(look.towel, [0, 0, 0], 0.15));
    ctx.fillRect(-0.068, -0.94, 0.136, 0.012);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -0.92, 0.061, 0.05, 0, Math.PI, 0);
    ctx.fill();
    if (female(kind)) {
      // A centre parting, and a bun at the nape for the grandmother.
      if (kind === "paati") {
        ctx.beginPath();
        ctx.arc(-0.055, -0.9, 0.032, 0, TAU);
        ctx.fill();
      }
    }
  }
  // Marks on the forehead: a pottu for her, vibhuti and a dot of kumkum for the elders.
  if (female(kind)) {
    ctx.fillStyle = c([200, 20, 40], 0.2);
    ctx.beginPath();
    ctx.arc(0.012, -0.905, 0.009, 0, TAU);
    ctx.fill();
    // Gold at the ears and the neck.
    ctx.fillStyle = c(GOLD, 0.3);
    ctx.beginPath();
    ctx.arc(0.058, -0.885, 0.009, 0, TAU);
    ctx.arc(-0.058, -0.885, 0.009, 0, TAU);
    ctx.fill();
    if (!child(kind)) {
      ctx.strokeStyle = c(GOLD, 0.3);
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.arc(0, -0.83, 0.04, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  } else if (kind === "thatha") {
    ctx.strokeStyle = c([246, 244, 236], 0.3);
    ctx.lineWidth = 0.006;
    ctx.beginPath();
    for (const dy of [-0.935, -0.925, -0.915]) {
      ctx.moveTo(-0.03, dy);
      ctx.lineTo(0.042, dy);
    }
    ctx.stroke();
    ctx.fillStyle = c([200, 20, 40], 0.2);
    ctx.beginPath();
    ctx.arc(0.008, -0.905, 0.007, 0, TAU);
    ctx.fill();
  }

  // Arms: sleeve, then forearm and hand, and what they hold.
  const hands: Hands = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
  const arm = (side: -1 | 1, upper: number, fore: number) => {
    const sx = side * SHOULDER.x;
    const sy = SHOULDER.y;
    const ex = sx + Math.sin(upper) * UPPER;
    const ey = sy + Math.cos(upper) * UPPER;
    const hx = ex + Math.sin(fore) * FOREARM;
    const hy = ey + Math.cos(fore) * FOREARM;
    ctx.lineCap = "round";
    ctx.strokeStyle = skin;
    ctx.lineWidth = 0.042;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    if (look.top) {
      // Sleeves: to the elbow on a blouse, to the wrist folded back on a shirt.
      const length = female(kind) ? 0.55 : 0.9;
      ctx.strokeStyle = c(look.top);
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(lerp(sx, ex, length), lerp(sy, ey, length));
      ctx.stroke();
    }
    if (female(kind)) {
      ctx.strokeStyle = c(side < 0 ? [40, 140, 70] : [210, 40, 60], 0.15);
      ctx.lineWidth = 0.046;
      ctx.beginPath();
      ctx.moveTo(lerp(ex, hx, 0.74), lerp(ey, hy, 0.74));
      ctx.lineTo(lerp(ex, hx, 0.82), lerp(ey, hy, 0.82));
      ctx.stroke();
    }
    // The hand in world units, allowing for the lean.
    const cos = Math.cos(lean);
    const sin = Math.sin(lean);
    const ly = hy - HIP;
    const world = { x: x + facing * h * (hx * cos - ly * sin), y: y + h * (HIP + bob + hx * sin + ly * cos) };
    return { local: { x: hx, y: hy }, world };
  };
  const left = arm(-1, pose.la, pose.lf);
  const right = arm(1, pose.ra, pose.rf);
  hands.left = left.world;
  hands.right = right.world;
  holding(ctx, pose.hold, left.local, right.local, env, lift, seconds);
  ctx.restore();
  return hands;
}

/** Things held, drawn in the figure's own units. */
function holding(ctx: Ctx, hold: Hold | undefined, l: { x: number; y: number }, r: { x: number; y: number }, env: Env, lift: number, seconds: number) {
  if (!hold) return;
  const c = (base: RGB, extra = 0) => paint(base, env, lift + extra);
  ctx.lineCap = "round";
  if (hold === "drum" || hold === "stick") {
    // The bhogi melam: a small frame drum in the left hand, beaten with a stick in the right.
    if (hold === "drum") {
      ctx.fillStyle = c([226, 206, 164], 0.1);
      ctx.strokeStyle = c([120, 60, 30]);
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.ellipse(l.x + 0.07, l.y - 0.02, 0.05, 0.09, 0.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = c([90, 56, 30]);
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - 0.1, r.y - 0.08);
    ctx.stroke();
  } else if (hold === "ladle") {
    // A long wooden ladle down into the pot.
    ctx.strokeStyle = c([120, 76, 40]);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo((l.x + r.x) / 2 - 0.02, (l.y + r.y) / 2 - 0.08);
    ctx.lineTo((l.x + r.x) / 2 + 0.2, (l.y + r.y) / 2 + 0.18);
    ctx.stroke();
  } else if (hold === "cane") {
    ctx.strokeStyle = c([96, 40, 60]);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + 0.12);
    ctx.lineTo(r.x + 0.02, r.y - 0.4);
    ctx.stroke();
    ctx.strokeStyle = c([150, 100, 110], 0.1);
    ctx.lineWidth = 0.04;
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      ctx.beginPath();
      ctx.moveTo(lerp(r.x, r.x + 0.02, t) - 0.02, lerp(r.y + 0.12, r.y - 0.4, t));
      ctx.lineTo(lerp(r.x, r.x + 0.02, t) + 0.02, lerp(r.y + 0.12, r.y - 0.4, t));
      ctx.lineWidth = 0.008;
      ctx.stroke();
    }
  } else if (hold === "plate" || hold === "aarti") {
    // A brass plate between both hands; for the aarti, camphor burning on it.
    const px = (l.x + r.x) / 2 + 0.02;
    const py = Math.min(l.y, r.y) - 0.01;
    ctx.fillStyle = c([222, 170, 70], 0.3);
    ctx.beginPath();
    ctx.ellipse(px, py, 0.12, 0.025, 0, 0, TAU);
    ctx.fill();
    if (hold === "plate") {
      ctx.fillStyle = c([214, 150, 60], 0.2);
      ctx.beginPath();
      ctx.ellipse(px, py - 0.02, 0.07, 0.035, 0, Math.PI, 0);
      ctx.fill();
    } else {
      const f = 0.06 + 0.012 * Math.sin(seconds * 17);
      ctx.fillStyle = "rgba(255, 190, 80, 0.95)";
      ctx.beginPath();
      ctx.moveTo(px - 0.025, py - 0.01);
      ctx.quadraticCurveTo(px, py - f * 2, px + 0.025, py - 0.01);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 250, 220, 0.95)";
      ctx.beginPath();
      ctx.ellipse(px, py - 0.02, 0.01, 0.018, 0, 0, TAU);
      ctx.fill();
    }
  } else if (hold === "mat") {
    // An old rolled palm-leaf mat, overhead, for the fire.
    ctx.save();
    ctx.translate((l.x + r.x) / 2, (l.y + r.y) / 2 - 0.02);
    ctx.rotate(0.25);
    ctx.fillStyle = c([176, 140, 80], 0.2);
    ctx.fillRect(-0.2, -0.035, 0.4, 0.07);
    ctx.strokeStyle = c([120, 90, 50], 0.1);
    ctx.lineWidth = 0.008;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 0.055, -0.035);
      ctx.lineTo(i * 0.055, 0.035);
      ctx.stroke();
    }
    ctx.restore();
  } else if (hold === "rope") {
    ctx.strokeStyle = c([150, 120, 80]);
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.quadraticCurveTo(r.x + 0.3, r.y + 0.1, r.x + 0.6, r.y - 0.15);
    ctx.stroke();
  } else if (hold === "tiffin") {
    // A steel tiffin carrier, three tiers.
    ctx.fillStyle = c([196, 200, 206], 0.3);
    ctx.fillRect(r.x - 0.04, r.y + 0.02, 0.08, 0.12);
    ctx.strokeStyle = c([120, 124, 130], 0.2);
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(r.x - 0.04, r.y + 0.06);
    ctx.lineTo(r.x + 0.04, r.y + 0.06);
    ctx.moveTo(r.x - 0.04, r.y + 0.1);
    ctx.lineTo(r.x + 0.04, r.y + 0.1);
    ctx.moveTo(r.x - 0.04, r.y + 0.02);
    ctx.lineTo(r.x, r.y - 0.01);
    ctx.lineTo(r.x + 0.04, r.y + 0.02);
    ctx.stroke();
  }
}

/**
 * Someone bent low from the hips, seen side on, one hand down at `reach` (world units): a woman
 * drawing the kolam, or a young man touching an elder's feet. Feet on (x, y), facing `facing`.
 */
export function drawBending(ctx: Ctx, x: number, y: number, look: Look, reach: { x: number; y: number }, env: Env, lift = 0, facing: 1 | -1 = -1, bowl = false, bend = 1.25) {
  const { h } = look;
  const c = (base: RGB, extra = 0) => paint(base, env, lift + extra);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const hip = { x: -0.04, y: -0.5 };
  // The torso runs from the hip toward the head, `bend` from upright.
  const dir = { x: Math.sin(bend), y: -Math.cos(bend) };
  const shoulder = { x: hip.x + dir.x * 0.3, y: hip.y + dir.y * 0.3 };
  const head = { x: hip.x + dir.x * 0.42, y: hip.y + dir.y * 0.42 };
  const woman = female(look.kind);

  // The far arm, holding a bowl of rice flour against her hip, or reaching too.
  const target = { x: ((reach.x - x) / h) * facing, y: (reach.y - y) / h };
  const limb = (from: { x: number; y: number }, to: { x: number; y: number }, width: number, colour: string) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const d = Math.min(Math.hypot(dx, dy), UPPER + FOREARM - 0.001);
    const a = Math.atan2(dy, dx);
    // Two bones: the elbow bends out behind.
    const cosA = (UPPER * UPPER + d * d - FOREARM * FOREARM) / (2 * UPPER * d);
    const elbowAngle = a - Math.acos(clamp(cosA, -1, 1));
    const elbow = { x: from.x + Math.cos(elbowAngle) * UPPER, y: from.y + Math.sin(elbowAngle) * UPPER };
    const hand = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
    return { elbow, hand };
  };
  const skin = c(look.skin);
  if (!bowl) limb({ x: shoulder.x - 0.02, y: shoulder.y }, { x: target.x - 0.05, y: target.y }, 0.04, c(mix(look.skin, [0, 0, 0], 0.2)));

  // Legs: straight, under the sari or veshti.
  ctx.fillStyle = c(look.cloth);
  ctx.beginPath();
  if (woman) {
    ctx.moveTo(hip.x - 0.1, hip.y + 0.02);
    ctx.quadraticCurveTo(hip.x + 0.1, hip.y - 0.06, hip.x + 0.12, hip.y + 0.05);
    ctx.quadraticCurveTo(0.12, -0.25, 0.14, -0.015);
    ctx.lineTo(-0.12, -0.015);
    ctx.quadraticCurveTo(-0.14, -0.25, hip.x - 0.1, hip.y + 0.02);
  } else {
    ctx.moveTo(hip.x - 0.09, hip.y);
    ctx.lineTo(hip.x + 0.11, hip.y - 0.02);
    ctx.lineTo(0.1, -0.03);
    ctx.lineTo(-0.1, -0.03);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c(look.border, 0.1);
  ctx.lineWidth = 0.028;
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.03);
  ctx.lineTo(0.135, -0.03);
  ctx.stroke();
  ctx.fillStyle = c(mix(look.skin, [30, 18, 12], 0.3));
  ctx.beginPath();
  ctx.ellipse(0.06, -0.01, 0.05, 0.016, 0, 0, TAU);
  ctx.fill();

  // The torso, bent over: blouse or shirt, and her pallu tucked in at the waist to work.
  ctx.strokeStyle = c(look.top ?? look.skin);
  ctx.lineWidth = 0.16;
  ctx.beginPath();
  ctx.moveTo(hip.x + dir.x * 0.04, hip.y + dir.y * 0.04);
  ctx.lineTo(shoulder.x, shoulder.y);
  ctx.stroke();
  if (woman) {
    ctx.strokeStyle = c(look.cloth);
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(hip.x + dir.x * 0.02 - 0.02, hip.y + dir.y * 0.02);
    ctx.lineTo(shoulder.x - dir.y * 0.02, shoulder.y + dir.x * 0.02);
    ctx.stroke();
    ctx.strokeStyle = c(look.border, 0.1);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(hip.x + 0.06, hip.y + 0.01);
    ctx.lineTo(shoulder.x + 0.02, shoulder.y + 0.06);
    ctx.stroke();
  }
  // Head, hair, and her braid falling forward with the jasmine in it.
  ctx.fillStyle = skin;
  ctx.fillRect(shoulder.x, shoulder.y - 0.02, dir.x * 0.08, 0.04);
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, 0.068, 0.058, bend - Math.PI / 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgb(tone(look.kind === "thatha" || look.kind === "paati" ? GREY : HAIR, env, lift));
  ctx.beginPath();
  ctx.ellipse(head.x - dir.x * 0.012, head.y - 0.024, 0.066, 0.042, bend - Math.PI / 2, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  if (woman) {
    ctx.strokeStyle = rgb(tone(HAIR, env, lift));
    ctx.lineWidth = 0.034;
    ctx.beginPath();
    ctx.moveTo(head.x - 0.04, head.y - 0.03);
    ctx.quadraticCurveTo(head.x - 0.02, head.y + 0.12, head.x + 0.02, head.y + 0.24);
    ctx.stroke();
    if (look.flowers) {
      ctx.strokeStyle = c([250, 248, 236], 0.15);
      ctx.lineWidth = 0.026;
      ctx.setLineDash([0.012, 0.01]);
      ctx.beginPath();
      ctx.moveTo(head.x - 0.05, head.y - 0.02);
      ctx.quadraticCurveTo(head.x - 0.04, head.y + 0.08, head.x - 0.015, head.y + 0.15);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // The near arm, down to the ground where the line is going.
  const near = limb({ x: shoulder.x, y: shoulder.y + 0.01 }, target, 0.044, skin);
  if (look.top && woman) {
    ctx.strokeStyle = c(look.top);
    ctx.lineWidth = 0.052;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y + 0.01);
    ctx.lineTo(lerp(shoulder.x, near.elbow.x, 0.5), lerp(shoulder.y + 0.01, near.elbow.y, 0.5));
    ctx.stroke();
  }
  if (woman) {
    ctx.strokeStyle = c([210, 40, 60], 0.15);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(lerp(near.elbow.x, near.hand.x, 0.72), lerp(near.elbow.y, near.hand.y, 0.72));
    ctx.lineTo(lerp(near.elbow.x, near.hand.x, 0.8), lerp(near.elbow.y, near.hand.y, 0.8));
    ctx.stroke();
  }
  if (bowl) {
    // Her other hand holds the bowl of kolam maavu at her side.
    const b = { x: hip.x + 0.1, y: hip.y + 0.06 };
    limb({ x: shoulder.x - 0.03, y: shoulder.y }, b, 0.04, c(mix(look.skin, [0, 0, 0], 0.15)));
    ctx.fillStyle = c([140, 96, 60]);
    ctx.beginPath();
    ctx.ellipse(b.x + 0.02, b.y + 0.02, 0.06, 0.035, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = c([248, 244, 232], 0.2);
    ctx.beginPath();
    ctx.ellipse(b.x + 0.02, b.y + 0.02, 0.058, 0.015, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Sitting cross-legged on a mat, seen from the front; `eat` lifts a hand to the mouth now and then. */
export function drawSitting(ctx: Ctx, x: number, y: number, look: Look, env: Env, lift = 0, facing: 1 | -1 = 1, eat = 0) {
  const { h } = look;
  const c = (base: RGB, extra = 0) => paint(base, env, lift + extra);
  ctx.save();
  ctx.translate(x, y + h * 0.42);
  // Crossed legs under the cloth.
  ctx.save();
  ctx.scale(facing * h, h);
  ctx.fillStyle = c(look.cloth);
  ctx.beginPath();
  ctx.moveTo(-0.22, -0.42);
  ctx.quadraticCurveTo(-0.24, -0.5, -0.1, -0.54);
  ctx.lineTo(0.1, -0.54);
  ctx.quadraticCurveTo(0.24, -0.5, 0.22, -0.42);
  ctx.quadraticCurveTo(0, -0.39, -0.22, -0.42);
  ctx.fill();
  ctx.strokeStyle = c(look.border, 0.1);
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(-0.21, -0.425);
  ctx.quadraticCurveTo(0, -0.4, 0.21, -0.425);
  ctx.stroke();
  ctx.restore();
  // Everything above the waist, as if standing, lowered onto the legs.
  const hand = eat > 0.5 ? { la: 0.3, lf: 0.5, ra: 0.6, rf: 2.8 } : { la: 0.5, lf: 1.3, ra: 0.5, rf: 1.4 };
  ctx.translate(0, -0.02 * h);
  drawUpper(ctx, look, hand, env, lift, facing);
  ctx.restore();
}

/** The body above the waist of a figure whose waist is at (0, -0.52h), for sitting figures. */
function drawUpper(ctx: Ctx, look: Look, pose: Pose, env: Env, lift: number, facing: 1 | -1) {
  ctx.save();
  // Clip away the legs, then draw the whole figure: what is left is the torso on the lap.
  ctx.beginPath();
  ctx.rect(-look.h, -look.h * 1.2, look.h * 2, look.h * 0.66);
  ctx.clip();
  drawPerson(ctx, 0, 0, look, pose, env, lift, facing);
  ctx.restore();
}

// ─── Cattle ──────────────────────────────────────────────────────────────────

export type Cattle = {
  body: RGB;
  /** The darker hump and shoulders of a bull. */
  shade: RGB;
  horns: number;
  bull: boolean;
  /** Paint on the horns, from the base up. */
  paints: RGB[];
};

/**
 * A zebu, bullock or cow, side on, feet on (x, y), `size` tall at the hump. `dressed` (0..1)
 * brings on the painted horns, brass caps, bells and garland; `shake` tosses the head.
 */
export function drawCattle(ctx: Ctx, x: number, y: number, size: number, look: Cattle, env: Env, lift: number, facing: 1 | -1, seconds: number, seed: number, dressed: number, shake: number, graze = 0) {
  const c = (base: RGB, extra = 0) => paint(base, env, lift + extra);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const body = c(look.body);
  const far = c(mix(look.body, [0, 0, 0], 0.28));

  // The far legs, then the tail.
  const leg = (lx: number, bend: number, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(lx, -0.62);
    ctx.lineTo(lx + bend, -0.3);
    ctx.lineTo(lx + bend * 0.4, -0.04);
    ctx.stroke();
    ctx.lineWidth = 0.075;
    ctx.strokeStyle = c([40, 32, 28]);
    ctx.beginPath();
    ctx.moveTo(lx + bend * 0.4, -0.05);
    ctx.lineTo(lx + bend * 0.4 + 0.02, 0);
    ctx.stroke();
  };
  leg(-0.5, 0.03, far);
  leg(0.58, -0.02, far);
  const swish = Math.sin(seconds * 1.3 + seed) * 0.12 + Math.sin(seconds * 3.1 + seed) * 0.04;
  ctx.strokeStyle = body;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(-0.84, -1.12);
  ctx.quadraticCurveTo(-0.95, -0.8, -0.9 + swish, -0.36);
  ctx.stroke();
  ctx.fillStyle = c([34, 28, 26]);
  ctx.beginPath();
  ctx.ellipse(-0.9 + swish, -0.3, 0.035, 0.08, swish, 0, TAU);
  ctx.fill();

  // Body, hump, and the dewlap under the neck.
  const g = ctx.createLinearGradient(0, -1.4, 0, -0.6);
  g.addColorStop(0, c(mix(look.body, [255, 255, 255], 0.08), 0.05));
  g.addColorStop(1, c(mix(look.body, [0, 0, 0], 0.18)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.86, -1.12);
  ctx.bezierCurveTo(-0.9, -0.85, -0.8, -0.66, -0.55, -0.62);
  ctx.bezierCurveTo(-0.2, -0.58, 0.3, -0.6, 0.62, -0.64);
  ctx.bezierCurveTo(0.72, -0.66, 0.8, -0.72, 0.86, -0.8);
  // The dewlap, a soft fold hanging from the throat.
  ctx.quadraticCurveTo(0.98, -0.88, 1.06, -1.02);
  ctx.lineTo(0.98, -1.2);
  ctx.bezierCurveTo(0.8, -1.26, 0.66, -1.34, 0.58, -1.38);
  // The hump.
  ctx.bezierCurveTo(0.5, -1.5, 0.3, -1.5, 0.26, -1.22);
  ctx.bezierCurveTo(0.0, -1.2, -0.5, -1.2, -0.86, -1.12);
  ctx.closePath();
  ctx.fill();
  if (look.bull) {
    ctx.fillStyle = c(look.shade);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0.26, -1.22);
    ctx.bezierCurveTo(0.3, -1.5, 0.5, -1.5, 0.58, -1.38);
    ctx.bezierCurveTo(0.7, -1.3, 0.8, -1.2, 0.74, -0.9);
    ctx.bezierCurveTo(0.6, -0.8, 0.4, -0.9, 0.26, -1.22);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Turmeric and kumkum dots on the flank for the day.
  if (dressed > 0.02) {
    ctx.globalAlpha = dressed;
    for (const [px, py, r] of [
      [-0.5, -0.95, 0.06],
      [-0.2, -0.88, 0.05],
      [0.1, -0.95, 0.055],
      [-0.35, -0.75, 0.04],
    ]) {
      ctx.fillStyle = c([240, 180, 30], 0.2);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = c([210, 30, 50], 0.2);
      ctx.beginPath();
      ctx.arc(px, py, r * 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // The near legs.
  leg(-0.62, -0.02, body);
  leg(0.68, 0.04, body);

  // Head and neck, nodding a little, tossed when the bells are rung.
  const nod = Math.sin(seconds * 0.9 + seed) * 0.04 + Math.sin(shake * 18) * shake * 0.18 + graze * 0.9;
  ctx.save();
  ctx.translate(0.9, -1.2);
  ctx.rotate(nod);
  // Horns first, behind the head: up, out and back, painted in bands and capped with brass.
  const hornLength = 0.5 * look.horns;
  const hornPath = (side: number) => {
    const base = { x: 0.1 + side * 0.03, y: -0.12 };
    const mid = { x: 0.02 + side * 0.02, y: -0.12 - hornLength * 0.6 };
    const tip = { x: -0.1 + side * 0.03, y: -0.12 - hornLength };
    return { base, mid, tip };
  };
  for (const side of [-1, 1]) {
    const { base, mid, tip } = hornPath(side);
    const colour = side < 0 ? c(mix([150, 130, 110], [0, 0, 0], 0.25)) : c([170, 150, 126]);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(mid.x + 0.1, mid.y, tip.x, tip.y);
    ctx.stroke();
    if (dressed > 0.02) {
      // Bands of paint along it.
      look.paints.forEach((p, i) => {
        const t0 = i / look.paints.length;
        const t1 = (i + 0.8) / look.paints.length;
        ctx.strokeStyle = paint(p, env, lift + 0.15, dressed * (side < 0 ? 0.8 : 1));
        ctx.lineWidth = 0.062;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const t = lerp(t0, t1, k / 6) * 0.86;
          const qx = (1 - t) * (1 - t) * base.x + 2 * (1 - t) * t * (mid.x + 0.1) + t * t * tip.x;
          const qy = (1 - t) * (1 - t) * base.y + 2 * (1 - t) * t * mid.y + t * t * tip.y;
          if (k === 0) ctx.moveTo(qx, qy);
          else ctx.lineTo(qx, qy);
        }
        ctx.stroke();
      });
      // The brass kuppi on the tip, with its little knob.
      ctx.fillStyle = paint(GOLD, env, lift + 0.35, dressed);
      ctx.beginPath();
      ctx.ellipse(tip.x + 0.01, tip.y + 0.02, 0.035, 0.05, -0.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.x - 0.005, tip.y - 0.025, 0.018, 0, TAU);
      ctx.fill();
    }
  }
  // The long face, down toward the muzzle.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-0.08, 0.02);
  ctx.bezierCurveTo(-0.02, -0.12, 0.12, -0.16, 0.18, -0.1);
  ctx.bezierCurveTo(0.26, 0.0, 0.34, 0.22, 0.36, 0.3);
  ctx.bezierCurveTo(0.36, 0.36, 0.28, 0.38, 0.24, 0.34);
  ctx.bezierCurveTo(0.16, 0.26, 0.04, 0.2, -0.08, 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c([60, 48, 44]);
  ctx.beginPath();
  ctx.ellipse(0.31, 0.31, 0.05, 0.04, 0.6, 0, TAU);
  ctx.fill();
  // An ear out sideways, and the eye, lined dark.
  const flick = Math.max(0, Math.sin(seconds * 0.7 + seed * 3)) ** 20 * 0.4;
  ctx.fillStyle = c(mix(look.body, [0, 0, 0], 0.12));
  ctx.beginPath();
  ctx.ellipse(-0.02, -0.03, 0.12, 0.04, -0.3 - flick, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c([24, 18, 16]);
  ctx.beginPath();
  ctx.ellipse(0.13, -0.02, 0.028, 0.02, 0.5, 0, TAU);
  ctx.fill();
  if (dressed > 0.02) {
    // Turmeric on the forehead with a kumkum dot, and a string of small bells across it.
    ctx.globalAlpha = dressed;
    ctx.fillStyle = c([240, 180, 30], 0.3);
    ctx.beginPath();
    ctx.arc(0.19, 0.03, 0.045, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c([210, 30, 50], 0.3);
    ctx.beginPath();
    ctx.arc(0.19, 0.03, 0.02, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (dressed > 0.02) {
    ctx.globalAlpha = dressed;
    // A garland of marigold and white flowers round the neck.
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const gx = lerp(0.62, 1.0, t);
      const gy = lerp(-1.32, -1.0, t) + Math.sin(t * Math.PI) * 0.24;
      ctx.fillStyle = c(i % 3 === 2 ? [250, 246, 230] : i % 3 === 1 ? [250, 200, 40] : [242, 120, 20], 0.25);
      ctx.beginPath();
      ctx.arc(gx, gy, 0.045, 0, TAU);
      ctx.fill();
    }
    // The neck rope, woven in colours, with the big brass bell hanging from it.
    ctx.strokeStyle = c([200, 40, 60], 0.2);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(0.7, -1.3);
    ctx.quadraticCurveTo(0.78, -0.96, 0.96, -0.92);
    ctx.stroke();
    const swing = Math.sin(seconds * 2.2 + seed) * 0.08 + Math.sin(shake * 22) * shake * 0.5;
    ctx.save();
    ctx.translate(0.86, -0.93);
    ctx.rotate(swing);
    ctx.fillStyle = paint(GOLD, env, lift + 0.35);
    ctx.beginPath();
    ctx.moveTo(-0.05, 0.02);
    ctx.quadraticCurveTo(-0.07, 0.14, -0.08, 0.16);
    ctx.lineTo(0.08, 0.16);
    ctx.quadraticCurveTo(0.07, 0.14, 0.05, 0.02);
    ctx.quadraticCurveTo(0, -0.02, -0.05, 0.02);
    ctx.fill();
    ctx.fillStyle = c([120, 80, 30]);
    ctx.beginPath();
    ctx.arc(0, 0.17, 0.022, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
