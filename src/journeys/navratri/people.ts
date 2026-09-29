// The people of the pol, painted flat like cut cloth: women in chaniya choli with mirror work and
// an odhni, men in kediyu and churidar under a bandhani safo, children, the elders on the otla and
// the band. Every figure is drawn through the tilting camera (./world.ts): heights shorten by the
// tilt's cos, while a flared skirt opens into a disc on the ground by its sin, so a dancer seen
// from overhead is a spinning wheel of colour.
import { TAU, clamp, lerp, mix, rgb, type Ctx, type RGB } from "../paint";
import type { Tilt } from "./world";

export type Look = {
  h: number;
  skin: RGB;
  woman: boolean;
  /** Choli, or the kediyu's fitted yoke. */
  top: RGB;
  /** Chaniya, or the kediyu's flare. */
  skirt: RGB;
  /** The alternate panels of the skirt. */
  skirt2: RGB;
  border: RGB;
  /** Odhni, or the safo. */
  odhni: RGB;
  /** Churidar. */
  legs: RGB;
  head: "bun" | "odhni" | "safo" | "topi" | "bare" | "mukut";
  /** Grey hair, a shawl: the elders. */
  old?: boolean;
  seed: number;
};

/**
 * Hands are placed in figure units: `u` towards the way the figure faces, `hu` up from the feet
 * (1 is the top of the head).
 */
export type Pose = {
  facing: 1 | -1;
  /** How far the skirt flares, 0..1. */
  spin: number;
  /** The skirt's panels turning, radians. */
  turn: number;
  /** Lean from the waist, radians on screen. */
  bend: number;
  /** Rise and fall, figure units. */
  bob: number;
  l: [number, number];
  r: [number, number];
  /** Stride, -1..1. */
  step: number;
  /** A painted dandiya in each hand. */
  sticks?: RGB;
};

export const SKIN: RGB[] = [
  [198, 138, 98],
  [172, 114, 78],
  [146, 94, 62],
  [212, 160, 118],
  [126, 80, 54],
];

// Navratri colours: deep reds and maroons, mustard, parrot green, indigo, magenta, peacock blue.
const CHANIYA: RGB[] = [
  [178, 22, 42],
  [124, 16, 48],
  [214, 150, 18],
  [30, 128, 70],
  [40, 46, 130],
  [196, 30, 110],
  [18, 110, 130],
  [226, 92, 20],
  [90, 24, 100],
];
const BORDERS: RGB[] = [
  [236, 190, 70],
  [240, 224, 180],
  [220, 60, 50],
  [60, 170, 90],
  [250, 200, 40],
];
const KEDIYU: RGB[] = [
  [240, 234, 220],
  [226, 60, 40],
  [250, 190, 40],
  [40, 120, 170],
  [200, 40, 110],
  [236, 226, 200],
];
const SAFO: RGB[] = [
  [214, 30, 40],
  [240, 140, 20],
  [196, 26, 96],
  [250, 196, 30],
];
const MIRROR: RGB = [250, 246, 232];

/** The brightest mirror glints of the frame, collected for the light pass: x, y, size, strength. */
export const glints: number[] = [];
const MAX_GLINTS = 1600;

/** Dresses a dancer for the garba. */
export function makeLook(random: () => number, woman: boolean, h: number): Look {
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const skin = pick(SKIN);
  if (woman) {
    const skirt = pick(CHANIYA);
    let skirt2 = pick(CHANIYA);
    if (skirt2 === skirt) skirt2 = mix(skirt, [250, 210, 80], 0.45);
    return {
      h,
      skin,
      woman,
      top: pick(CHANIYA),
      skirt,
      skirt2,
      border: pick(BORDERS),
      odhni: pick(CHANIYA),
      legs: skin,
      head: random() < 0.25 ? "odhni" : "bun",
      seed: random() * 10,
    };
  }
  const top = pick(KEDIYU);
  return {
    h,
    skin,
    woman,
    top,
    skirt: top,
    skirt2: mix(top, [0, 0, 0], 0.12),
    border: pick(BORDERS),
    odhni: pick(SAFO),
    legs: random() < 0.6 ? [238, 232, 218] : pick(CHANIYA),
    head: random() < 0.7 ? "safo" : random() < 0.5 ? "topi" : "bare",
    seed: random() * 10,
  };
}

export type Hands = {
  l: { x: number; y: number };
  r: { x: number; y: number };
  top: { x: number; y: number };
};

const HAIR: RGB = [22, 16, 14];

/**
 * A cone of cloth from a waist `waist` above the feet (half-width `wh`) out to a hem of radius
 * `R` on the ground, `hem` above the feet. Seen from the side it is a skirt; from above, a disc.
 */
function cone(
  ctx: Ctx,
  bx: number,
  by: number,
  t: Tilt,
  waist: number,
  wh: number,
  hem: number,
  R: number,
  a: RGB,
  b: RGB,
  border: RGB,
  turn: number,
  panels: number,
  mirrors: number,
  light: number,
  seed: number,
  seconds: number,
) {
  const hy = by - hem * t.c;
  const wy = by - waist * t.c;
  const ry = Math.max(R * t.s, 0.001);
  const inside = wy > hy - ry * 0.92;
  const visible = (angle: number) => inside || Math.sin(angle) > -0.05;
  ctx.fillStyle = rgb(a);
  ctx.beginPath();
  ctx.ellipse(bx, hy, R, ry, 0, 0, TAU);
  if (!inside) {
    ctx.moveTo(bx - wh, wy);
    ctx.quadraticCurveTo(bx - R * 0.72, lerp(wy, hy, 0.62), bx - R, hy);
    ctx.ellipse(bx, hy, R, ry, 0, Math.PI, 0, true);
    ctx.quadraticCurveTo(bx + R * 0.72, lerp(wy, hy, 0.62), bx + wh, wy);
    ctx.closePath();
  }
  ctx.fill();
  // Panels of the other colour, gathered at the waist.
  ctx.fillStyle = rgb(b);
  ctx.beginPath();
  const step = TAU / panels;
  for (let k = 0; k < panels; k += 2) {
    const a1 = turn + k * step;
    const a2 = a1 + step;
    if (!visible((a1 + a2) / 2)) continue;
    ctx.moveTo(bx + Math.cos(a1) * wh * 0.8, wy + Math.sin(a1) * wh * 0.8 * t.s);
    ctx.lineTo(bx + Math.cos(a1) * R, hy + Math.sin(a1) * ry);
    ctx.ellipse(bx, hy, R, ry, 0, a1, a2);
    ctx.lineTo(bx + Math.cos(a2) * wh * 0.8, wy + Math.sin(a2) * wh * 0.8 * t.s);
    ctx.closePath();
  }
  ctx.fill();
  // Shade away from the light: the far side of the cone in the lamp's shadow.
  const shade = ctx.createLinearGradient(bx - R, 0, bx + R, 0);
  shade.addColorStop(0, `rgba(10, 4, 12, ${0.28 * (1 - light)})`);
  shade.addColorStop(0.5, "rgba(10, 4, 12, 0)");
  shade.addColorStop(1, `rgba(10, 4, 12, ${0.18 * (1 - light)})`);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(bx, hy, R, ry, 0, 0, TAU);
  if (!inside) {
    ctx.moveTo(bx - wh, wy);
    ctx.lineTo(bx - R, hy);
    ctx.lineTo(bx + R, hy);
    ctx.lineTo(bx + wh, wy);
    ctx.closePath();
  }
  ctx.fill();
  // Two embroidered bands, the wide one at the hem.
  ctx.strokeStyle = rgb(border);
  const bands: [number, number, number][] = [
    [0.93, 0, 0.1],
    [0.62, 0.3, 0.045],
  ];
  for (const [k, lift, wide] of bands) {
    const r = lerp(wh, R, k);
    const cy = lerp(hy, wy, lift);
    ctx.lineWidth = R * wide;
    ctx.beginPath();
    if (inside) ctx.ellipse(bx, cy, r, r * t.s, 0, 0, TAU);
    else ctx.ellipse(bx, cy, r, r * t.s, 0, -0.05, Math.PI + 0.05);
    ctx.stroke();
  }
  // Mirror work on the hem band, catching the light as it turns.
  if (mirrors > 0) {
    const r = lerp(wh, R, 0.93);
    ctx.fillStyle = rgb(MIRROR);
    const size = R * 0.045;
    // Three levels of glint, one path each.
    for (let level = 0; level < 3; level++) {
      ctx.globalAlpha = 0.3 + 0.45 * ((level + 0.5) / 3) * (0.5 + 0.5 * light);
      ctx.beginPath();
      for (let m = 0; m < mirrors; m++) {
        const angle = turn * 1.0 + (m / mirrors) * TAU;
        if (!visible(angle)) continue;
        const glint = 0.5 + 0.5 * Math.sin(seconds * 5 + m * 2.3 + seed * 3 + angle * 2);
        if (Math.min(2, Math.floor(glint * 3)) !== level) continue;
        const mx = bx + Math.cos(angle) * r;
        const my = hy + Math.sin(angle) * r * t.s;
        ctx.moveTo(mx + size, my);
        ctx.arc(mx, my, size, 0, TAU);
        if (glint > 0.86 && glints.length < MAX_GLINTS * 4) glints.push(mx, my, size, (glint - 0.86) * 7 * (0.3 + 0.7 * light));
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function arm(ctx: Ctx, sx: number, sy: number, hx: number, hy: number, out: number, width: number, skin: RGB, sleeve: RGB) {
  // The elbow bends outwards and down between shoulder and hand.
  const mx = (sx + hx) / 2;
  const my = (sy + hy) / 2;
  const dx = hx - sx;
  const dy = hy - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ex = mx + (-dy / len) * out;
  const ey = my + (dx / len) * out;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgb(skin);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  // A short sleeve of the blouse.
  ctx.strokeStyle = rgb(sleeve);
  ctx.lineWidth = width * 1.15;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(lerp(sx, ex, 0.45), lerp(sy, ey, 0.45));
  ctx.stroke();
  return { ex, ey };
}

/**
 * A dancer standing on ground point (X, Z). `light` (0..1) is how much the garbo's glow falls on
 * them. Returns their hands and the top of the head in screen-world units.
 */
export function drawDancer(ctx: Ctx, X: number, Z: number, t: Tilt, look: Look, pose: Pose, light: number, seconds: number): Hands {
  const { h } = look;
  const f = pose.facing;
  const bx = X;
  const by = Z * t.s - pose.bob * h * t.c;
  const Y = (hu: number) => by - hu * h * t.c;
  const lit = (c: RGB) => mix(c, [255, 214, 150], 0.12 * light);

  // Shadow on the ground.
  ctx.fillStyle = "rgba(8, 4, 10, 0.3)";
  ctx.beginPath();
  ctx.ellipse(bx, Z * t.s, h * 0.26, h * 0.26 * t.s + 0.004, 0, 0, TAU);
  ctx.fill();

  let waist: number;
  if (look.woman) {
    // The odhni's loose end flying out behind her as she turns.
    if (pose.spin > 0.05) {
      const flow = pose.spin;
      const wave = Math.sin(seconds * 7 + look.seed) * 0.05;
      ctx.fillStyle = rgb(mix(lit(look.odhni), [0, 0, 0], 0.15));
      ctx.beginPath();
      ctx.moveTo(bx - f * 0.05 * h, Y(0.8));
      ctx.quadraticCurveTo(bx - f * (0.2 + 0.2 * flow) * h, Y(0.7 + wave), bx - f * (0.32 + 0.3 * flow) * h, Y(0.58 + wave * 2));
      ctx.lineTo(bx - f * (0.26 + 0.26 * flow) * h, Y(0.5 + wave));
      ctx.quadraticCurveTo(bx - f * 0.14 * h, Y(0.58), bx + f * 0.02 * h, Y(0.62));
      ctx.closePath();
      ctx.fill();
    }
    const R = (0.2 + 0.19 * pose.spin) * h;
    cone(
      ctx,
      bx,
      by,
      t,
      0.56 * h,
      0.07 * h,
      0.03 * h,
      R,
      lit(look.skirt),
      lit(look.skirt2),
      look.border,
      pose.turn,
      14,
      16,
      light,
      look.seed,
      seconds,
    );
    waist = 0.56;
  } else {
    // Churidar legs in a stride, and the mojari.
    const stride = pose.step * 0.07;
    ctx.strokeStyle = rgb(lit(look.legs));
    ctx.lineCap = "round";
    ctx.lineWidth = 0.06 * h;
    for (const side of [-1, 1]) {
      const foot = side * 0.045 + stride * side * f;
      ctx.beginPath();
      ctx.moveTo(bx + side * 0.04 * h, Y(0.46));
      ctx.quadraticCurveTo(bx + (side * 0.05 + foot * 0.5) * h, Y(0.24), bx + foot * h, Y(0.03));
      ctx.stroke();
    }
    ctx.fillStyle = "#5a1a14";
    for (const side of [-1, 1]) {
      const foot = side * 0.045 + stride * side * f;
      ctx.beginPath();
      ctx.ellipse(bx + (foot + f * 0.02) * h, Y(0.012), 0.045 * h, 0.018 * h * Math.max(t.c, 0.4), 0, 0, TAU);
      ctx.fill();
    }
    // The kediyu: fitted at the chest, then a short flare of gathered pleats to the hip.
    const R = (0.13 + 0.1 * pose.spin) * h;
    cone(
      ctx,
      bx,
      by,
      t,
      0.7 * h,
      0.085 * h,
      0.42 * h,
      R,
      lit(look.skirt),
      lit(look.skirt2),
      look.border,
      pose.turn,
      18,
      0,
      light,
      look.seed,
      seconds,
    );
    waist = 0.7;
  }

  // Above the waist, leaning from it.
  const wy = Y(waist);
  ctx.save();
  ctx.translate(bx, wy);
  ctx.rotate(pose.bend * f);
  const L = (hu: number) => -(hu - waist) * h * t.c;
  const U = (u: number) => u * h * f;
  if (look.woman) {
    // Midriff, then the choli.
    ctx.fillStyle = rgb(lit(look.skin));
    ctx.beginPath();
    ctx.moveTo(U(-0.062), L(0.56));
    ctx.lineTo(U(0.062), L(0.56));
    ctx.lineTo(U(0.066), L(0.64));
    ctx.lineTo(U(-0.066), L(0.64));
    ctx.fill();
    ctx.fillStyle = rgb(lit(look.top));
    ctx.beginPath();
    ctx.moveTo(U(-0.07), L(0.63));
    ctx.lineTo(U(0.07), L(0.63));
    ctx.lineTo(U(0.086), L(0.815));
    ctx.lineTo(U(-0.086), L(0.815));
    ctx.fill();
    // The odhni across the chest, bordered.
    ctx.fillStyle = rgb(lit(look.odhni));
    ctx.beginPath();
    ctx.moveTo(U(-0.09), L(0.82));
    ctx.lineTo(U(-0.03), L(0.82));
    ctx.lineTo(U(0.08), L(0.6));
    ctx.lineTo(U(0.03), L(0.58));
    ctx.fill();
    ctx.strokeStyle = rgb(look.border);
    ctx.lineWidth = 0.012 * h;
    ctx.beginPath();
    ctx.moveTo(U(-0.03), L(0.82));
    ctx.lineTo(U(0.08), L(0.6));
    ctx.stroke();
  } else {
    // The yoke, with its embroidered and mirrored front.
    ctx.fillStyle = rgb(lit(look.top));
    ctx.beginPath();
    ctx.moveTo(U(-0.085), L(0.7));
    ctx.lineTo(U(0.085), L(0.7));
    ctx.lineTo(U(0.095), L(0.82));
    ctx.lineTo(U(-0.095), L(0.82));
    ctx.fill();
    ctx.fillStyle = rgb(look.border);
    ctx.fillRect(-0.085 * h, L(0.715), 0.17 * h, 0.018 * h * t.c + 0.002);
    ctx.fillStyle = rgb(MIRROR);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(U(-0.04 + i * 0.027), L(0.77 - (i % 2) * 0.02), 0.008 * h, 0, TAU);
      ctx.fill();
    }
  }

  // Arms, from the shoulders to wherever the pose puts the hands.
  const shoulder = L(0.8);
  const sw = 0.075;
  const hand = (target: [number, number]) => ({
    x: U(target[0]),
    y: L(target[1]),
  });
  const lh = hand(pose.l);
  const rh = hand(pose.r);
  const sleeve = lit(look.top);
  arm(ctx, U(-sw), shoulder, lh.x, lh.y, -0.03 * h * f, 0.036 * h, lit(look.skin), sleeve);
  arm(ctx, U(sw), shoulder, rh.x, rh.y, 0.03 * h * f, 0.036 * h, lit(look.skin), sleeve);
  // Bangles.
  if (look.woman) {
    ctx.fillStyle = rgb(look.border);
    for (const hp of [lh, rh]) {
      ctx.beginPath();
      ctx.arc(hp.x, hp.y + 0.02 * h * t.c, 0.016 * h, 0, TAU);
      ctx.fill();
    }
  }
  // Dandiya: painted sticks with tassels, held pointing up and out.
  if (pose.sticks) {
    ctx.lineCap = "round";
    for (const hp of [lh, rh]) {
      const angle = Math.atan2(hp.y - shoulder, hp.x - U(0));
      const len = 0.24 * h;
      const tx = hp.x + Math.cos(angle - 0.6 * f) * len;
      const ty = hp.y + Math.sin(angle - 0.6 * f) * len;
      ctx.strokeStyle = rgb(pose.sticks);
      ctx.lineWidth = 0.022 * h;
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = "rgba(250, 230, 160, 0.9)";
      ctx.lineWidth = 0.012 * h;
      ctx.setLineDash([0.02 * h, 0.03 * h]);
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Neck and head.
  const neck = L(0.86);
  ctx.fillStyle = rgb(lit(look.skin));
  ctx.fillRect(-0.02 * h, neck, 0.04 * h, shoulder - neck + 0.002);
  const hy = L(0.905);
  const hr = 0.062 * h;
  if (look.woman) {
    // An oxidised silver hansdi at the throat.
    ctx.strokeStyle = "rgba(210, 206, 196, 0.9)";
    ctx.lineWidth = 0.012 * h;
    ctx.beginPath();
    ctx.ellipse(0, shoulder + 0.004 * h, 0.05 * h, 0.03 * h * Math.max(t.c, 0.3), 0, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = rgb(lit(look.skin));
  ctx.beginPath();
  ctx.arc(U(0.005), hy, hr, 0, TAU);
  ctx.fill();
  // Hair from above covers more of the head the higher the camera.
  const cap = 0.55 + 0.45 * t.s;
  if (look.head === "bun" || look.head === "odhni" || look.head === "bare") {
    ctx.fillStyle = rgb(look.old ? [200, 196, 188] : HAIR);
    ctx.beginPath();
    ctx.ellipse(U(-0.01), hy - hr * (0.45 - 0.45 * t.s), hr * 1.03, hr * cap, 0, 0, TAU);
    ctx.fill();
    if (look.head !== "bare") {
      // The bun, and a string of jasmine round it.
      ctx.fillStyle = rgb(HAIR);
      ctx.beginPath();
      ctx.arc(U(-0.06), hy + hr * 0.1, hr * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(250, 248, 236, 0.95)";
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * 0.6;
        ctx.beginPath();
        ctx.arc(U(-0.06) + Math.cos(a) * hr * 0.58 * f, hy + hr * 0.1 + Math.sin(a) * hr * 0.58, hr * 0.13, 0, TAU);
        ctx.fill();
      }
    }
    // Face towards the camera: skin shows below the hair when seen from the side.
    ctx.fillStyle = rgb(lit(look.skin));
    ctx.beginPath();
    ctx.ellipse(U(0.02), hy + hr * 0.3 * (1 - t.s), hr * 0.8, hr * 0.62 * (1 - 0.7 * t.s), 0, 0, TAU);
    ctx.fill();
    if (look.head === "odhni") {
      ctx.fillStyle = rgb(lit(look.odhni));
      ctx.beginPath();
      ctx.moveTo(U(0.05), hy - hr * 1.05);
      ctx.quadraticCurveTo(U(-0.08), hy - hr * 1.2, U(-0.1), hy + hr * 1.4);
      ctx.lineTo(U(-0.05), shoulder);
      ctx.quadraticCurveTo(U(-0.02), hy, U(0.05), hy - hr * 1.05);
      ctx.fill();
    }
    // A red bindi.
    ctx.fillStyle = "#c01822";
    ctx.beginPath();
    ctx.arc(U(0.035), hy - hr * 0.08, hr * 0.12, 0, TAU);
    ctx.fill();
  } else if (look.head === "safo") {
    // A bandhani safo, wound high, its tail hanging down the back.
    ctx.fillStyle = rgb(HAIR);
    ctx.beginPath();
    ctx.ellipse(U(0.0), hy + hr * 0.1, hr * 1.0, hr * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(lit(look.skin));
    ctx.beginPath();
    ctx.ellipse(U(0.02), hy + hr * 0.25 * (1 - t.s), hr * 0.8, hr * 0.7 * (1 - 0.7 * t.s), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(mix(lit(look.odhni), [0, 0, 0], 0.15));
    ctx.beginPath();
    ctx.moveTo(U(-0.05), hy - hr * 0.2);
    ctx.quadraticCurveTo(U(-0.12), hy + hr * 1.2, U(-0.1 - pose.spin * 0.1), shoulder + 0.03 * h * t.c);
    ctx.lineTo(U(-0.06 - pose.spin * 0.08), shoulder + 0.03 * h * t.c);
    ctx.quadraticCurveTo(U(-0.06), hy + hr, U(-0.02), hy);
    ctx.fill();
    ctx.fillStyle = rgb(lit(look.odhni));
    ctx.beginPath();
    ctx.ellipse(U(-0.005), hy - hr * 0.55, hr * 1.18, hr * (0.55 + 0.5 * t.s), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 244, 220, 0.85)";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(U(-0.05 + (i % 4) * 0.03), hy - hr * (0.75 - Math.floor(i / 4) * 0.35), hr * 0.07, 0, TAU);
      ctx.fill();
    }
  } else if (look.head === "mukut") {
    // A Ramlila crown of gilt paper, tall and pointed.
    ctx.fillStyle = rgb(HAIR);
    ctx.beginPath();
    ctx.ellipse(U(-0.02), hy + hr * 0.3, hr * 1.1, hr * 1.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(lit(look.skin));
    ctx.beginPath();
    ctx.ellipse(U(0.02), hy + hr * 0.25 * (1 - t.s), hr * 0.82, hr * 0.72 * (1 - 0.7 * t.s), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8b440";
    ctx.beginPath();
    ctx.moveTo(U(-0.07), hy - hr * 0.5);
    ctx.lineTo(U(-0.05), hy - hr * 2.2);
    ctx.lineTo(U(0), hy - hr * 3.0);
    ctx.lineTo(U(0.05), hy - hr * 2.2);
    ctx.lineTo(U(0.07), hy - hr * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c81e2a";
    ctx.beginPath();
    ctx.arc(U(0), hy - hr * 1.3, hr * 0.22, 0, TAU);
    ctx.fill();
  } else {
    // A white topi.
    ctx.fillStyle = rgb(HAIR);
    ctx.beginPath();
    ctx.ellipse(U(-0.01), hy - hr * 0.3, hr, hr * cap * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(lit(look.skin));
    ctx.beginPath();
    ctx.ellipse(U(0.02), hy + hr * 0.3 * (1 - t.s), hr * 0.8, hr * 0.62 * (1 - 0.7 * t.s), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f4efe2";
    ctx.beginPath();
    ctx.ellipse(U(0), hy - hr * 0.7, hr * 0.95, hr * (0.35 + 0.5 * t.s), 0, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
  // Back to world units for the caller.
  const angle = pose.bend * f;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = (x: number, y: number) => ({
    x: bx + x * cos - y * sin,
    y: wy + x * sin + y * cos,
  });
  return { l: out(lh.x, lh.y), r: out(rh.x, rh.y), top: out(0, hy - hr) };
}

/** A garba pose at `phase` through the twelve-pulse cycle: step, step, clap, three times, then turn. */
export function garbaPose(phase: number, facing: 1 | -1, energy: number, seed: number, woman: boolean): Pose {
  const cycle = ((phase % 12) + 12) % 12;
  const beat = cycle % 3;
  // Claps fall on pulses 2, 5 and 8, each to a different side; the turn takes pulses 9 to 12.
  const clapNear = Math.max(0, 1 - Math.abs(beat - 2) / 1.1);
  const turning = cycle >= 9 ? Math.sin(((cycle - 9) / 3) * Math.PI) : 0;
  const side = [1, -1, 1][Math.floor(cycle / 3) % 3] ?? 1;
  const e = energy;
  // Hands open wide, then come together to one side for the clap, low then high.
  const high = Math.floor(cycle / 3) === 1 ? 0.2 : 0;
  const clapX = 0.12 * side;
  const clapY = 0.86 + high;
  const openL: [number, number] = [-0.28, 0.66 + 0.1 * e];
  const openR: [number, number] = [0.28, 0.72 + 0.1 * e];
  const c = clapNear * (1 - turning);
  let l: [number, number] = [lerp(openL[0], clapX - 0.02, c), lerp(openL[1], clapY, c)];
  let r: [number, number] = [lerp(openR[0], clapX + 0.02, c), lerp(openR[1], clapY, c)];
  if (turning > 0) {
    // Arms rise and open for the turn.
    l = [lerp(l[0], -0.2, turning), lerp(l[1], 1.05, turning * (0.5 + 0.5 * e))];
    r = [lerp(r[0], 0.22, turning), lerp(r[1], 1.08, turning * (0.5 + 0.5 * e))];
  }
  const bend = (clapNear * 0.18 * side - 0.05) * (0.4 + 0.6 * e) * (1 - turning);
  return {
    facing,
    spin: clamp(0.15 + turning * (0.55 + 0.35 * e) + e * 0.12) * (woman ? 1 : 0.9),
    turn: phase * 0.35 + seed + turning * 2.4,
    bend,
    bob: -Math.abs(Math.sin((cycle / 3) * Math.PI)) * 0.025 * (0.5 + e),
    l,
    r,
    step: Math.sin((cycle / 3) * Math.PI * 2),
  };
}

/** A dandiya pose: sticks struck together in front, then across to the partner, at `phase`. */
export function dandiyaPose(phase: number, facing: 1 | -1, energy: number, seed: number, colour: RGB): Pose {
  const cycle = ((phase % 6) + 6) % 6;
  // Pulse 0: own sticks together; pulses 2 and 4: across to the partner, right then left.
  const own = Math.max(0, 1 - Math.abs(cycle - 0) / 1.2, 1 - Math.abs(cycle - 6) / 1.2);
  const right = Math.max(0, 1 - Math.abs(cycle - 2) / 1.1);
  const left = Math.max(0, 1 - Math.abs(cycle - 4) / 1.1);
  const reach = 0.2 + 0.06 * energy;
  const l: [number, number] = [lerp(lerp(-0.2, 0.08, own), reach, left), lerp(0.75, 0.9, own + left)];
  const r: [number, number] = [lerp(lerp(0.2, 0.12, own), reach + 0.02, right), lerp(0.72, 0.92, own + right)];
  return {
    facing,
    spin: 0.2 + 0.3 * energy * Math.abs(Math.sin((cycle / 6) * TAU)),
    turn: phase * 0.5 + seed,
    bend: (right + left) * 0.12,
    bob: -Math.abs(Math.sin((cycle / 2) * Math.PI)) * 0.03 * (0.5 + energy),
    l,
    r,
    step: Math.sin((cycle / 3) * Math.PI),
    sticks: colour,
  };
}

/**
 * Someone seated on the ground or the otla, side on: a woman in a saree with the Gujarati seedha
 * pallu over her head and right shoulder, or a man in a kurta. Hands as in `Pose`, in figure units
 * of a standing height `look.h`.
 */
export function drawSeated(
  ctx: Ctx,
  X: number,
  Z: number,
  t: Tilt,
  look: Look,
  facing: 1 | -1,
  l: [number, number],
  r: [number, number],
  light: number,
) {
  const { h } = look;
  const f = facing;
  const bx = X;
  const by = Z * t.s;
  const Y = (hu: number) => by - hu * h * t.c;
  const U = (u: number) => bx + u * h * f;
  const lit = (c: RGB) => mix(c, [255, 214, 150], 0.15 * light);
  const cloth = lit(look.skirt);
  // Folded legs under the saree.
  ctx.fillStyle = rgb(cloth);
  ctx.beginPath();
  ctx.moveTo(U(-0.14), Y(0));
  ctx.quadraticCurveTo(U(-0.17), Y(0.2), U(-0.07), Y(0.26));
  ctx.lineTo(U(0.1), Y(0.2));
  ctx.quadraticCurveTo(U(0.24), Y(0.16), U(0.24), Y(0.03));
  ctx.quadraticCurveTo(U(0.1), Y(-0.01), U(-0.14), Y(0));
  ctx.fill();
  ctx.strokeStyle = rgb(look.border);
  ctx.lineWidth = 0.022 * h;
  ctx.beginPath();
  ctx.moveTo(U(-0.13), Y(0.012));
  ctx.quadraticCurveTo(U(0.1), Y(0.002), U(0.23), Y(0.03));
  ctx.stroke();
  // The torso.
  ctx.fillStyle = rgb(lit(look.top));
  ctx.beginPath();
  ctx.moveTo(U(-0.09), Y(0.22));
  ctx.lineTo(U(0.07), Y(0.22));
  ctx.lineTo(U(0.075), Y(0.5));
  ctx.lineTo(U(-0.075), Y(0.5));
  ctx.fill();
  // Arms.
  const shoulder = Y(0.48);
  const hand = (target: [number, number]) => ({
    x: U(target[0]),
    y: Y(target[1]),
  });
  const lh = hand(l);
  const rh = hand(r);
  arm(ctx, U(-0.04), shoulder, lh.x, lh.y, 0.02 * h * f, 0.034 * h, lit(look.skin), lit(look.top));
  // Head.
  const hy = Y(0.585);
  const hr = 0.062 * h;
  ctx.fillStyle = rgb(lit(look.skin));
  ctx.fillRect(bx - 0.018 * h, Y(0.54), 0.036 * h, 0.05 * h * t.c);
  ctx.beginPath();
  ctx.arc(U(0.01), hy, hr, 0, TAU);
  ctx.fill();
  if (look.woman) {
    // Hair, and the pallu over the head, falling over the right shoulder to the front.
    ctx.fillStyle = rgb(HAIR);
    ctx.beginPath();
    ctx.ellipse(U(-0.01), hy - hr * 0.3, hr, hr * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(cloth);
    ctx.beginPath();
    ctx.moveTo(U(0.045), hy - hr * 1.1);
    ctx.quadraticCurveTo(U(-0.08), hy - hr * 1.4, U(-0.1), hy + hr);
    ctx.lineTo(U(-0.1), Y(0.26));
    ctx.lineTo(U(0.02), Y(0.26));
    ctx.quadraticCurveTo(U(0.1), Y(0.4), U(0.06), Y(0.49));
    ctx.quadraticCurveTo(U(0.0), hy, U(0.045), hy - hr * 1.1);
    ctx.fill();
    ctx.strokeStyle = rgb(look.border);
    ctx.lineWidth = 0.02 * h;
    ctx.beginPath();
    ctx.moveTo(U(0.045), hy - hr * 1.05);
    ctx.quadraticCurveTo(U(-0.06), hy - hr * 1.3, U(-0.09), hy + hr);
    ctx.stroke();
    ctx.fillStyle = "#c01822";
    ctx.beginPath();
    ctx.arc(U(0.055), hy - hr * 0.15, hr * 0.13, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = rgb(look.old ? [214, 210, 200] : HAIR);
    ctx.beginPath();
    ctx.ellipse(U(-0.01), hy - hr * 0.4, hr, hr * 0.6, 0, 0, TAU);
    ctx.fill();
    if (look.head === "safo" || look.head === "topi") {
      ctx.fillStyle = look.head === "topi" ? "#f4efe2" : rgb(lit(look.odhni));
      ctx.beginPath();
      ctx.ellipse(U(0), hy - hr * 0.7, hr * 1.1, hr * 0.5, 0, 0, TAU);
      ctx.fill();
    }
  }
  arm(ctx, U(0.05), shoulder, rh.x, rh.y, -0.02 * h * f, 0.034 * h, lit(look.skin), lit(look.top));
  return { l: lh, r: rh };
}
