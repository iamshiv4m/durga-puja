// Mahabali's story in shadows, as in tholpavakoothu, Kerala's leather-puppet play: a long white
// screen with a row of oil lamps burning behind it, and cut-out puppets pressed against the cloth,
// their ornaments pricked with holes that let the lamplight through. The story, told as you
// scroll: the king among his equal people; the boy Vamana; the water poured to seal the gift; the
// boy grown into Trivikrama, a step on the earth and one in the sky; the head bowed for the
// third step; and the wish to come home once a year. At the end he comes, and goes again.
import { TAU, clamp, flicker, glow, glowSprite, lerp, rise, type Ctx } from "../paint";
import { MOMENTS, SCREEN } from "./world";

const LAMP_COUNT = 17;
/** Where the puppets stand, a little above the screen's lower edge. */
const GROUND = SCREEN.y + SCREEN.h / 2 - 0.3;

/** How many of the lamps behind the screen are burning, 0..1. */
export function screenLit(p: number) {
  const first = rise(p, 0.004, 0.052) * (1 - rise(p, 0.172, 0.19));
  const again = rise(p, 0.852, 0.878) * (1 - 0.4 * rise(p, 0.95, 1));
  return Math.max(first, again);
}

/** Each lamp's own light, from the middle outward, as the hero is scrolled. */
function lampOn(p: number, i: number) {
  const lit = screenLit(p);
  const order = Math.abs(i - (LAMP_COUNT - 1) / 2) / ((LAMP_COUNT - 1) / 2);
  return clamp((lit * 1.25 - order * 0.25 * (p < 0.5 ? 1 : 0.4)) * 1.1);
}

type Hole = [number, number, number];

/** Pricks the lamplight through a puppet's ornaments. */
function holes(ctx: Ctx, list: Hole[], light: string) {
  ctx.fillStyle = light;
  ctx.beginPath();
  for (const [x, y, r] of list) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
}

/** A row of holes along a line, for a border or a necklace. */
function row(x0: number, y0: number, x1: number, y1: number, n: number, r: number): Hole[] {
  const out: Hole[] = [];
  for (let i = 0; i < n; i++) out.push([lerp(x0, x1, (i + 0.5) / n), lerp(y0, y1, (i + 0.5) / n), r]);
  return out;
}

/**
 * Mahabali in profile facing +x, feet on (0, 0), height 1 to the top of his crown: the tall
 * kireedam, great earrings, a mustache and a round belly, and the olakkuda, the palm-leaf umbrella,
 * held over him. `bow` bends him forward to kneel; `pour` tips the kindi in his front hand.
 */
function mahabali(ctx: Ctx, ink: string, light: string, bow: number, pour: number, umbrella: number, wave = 0, kindi = true) {
  ctx.fillStyle = ink;
  ctx.save();
  // Kneeling folds the legs; bowing tips the body forward from the hips.
  const kneel = clamp(bow * 1.5);
  const hipY = lerp(-0.46, -0.24, kneel);
  ctx.beginPath();
  // The dhoti, pleated in front.
  ctx.moveTo(-0.1, hipY);
  ctx.lineTo(0.1, hipY);
  if (kneel < 0.5) {
    ctx.quadraticCurveTo(0.16, lerp(-0.2, -0.1, kneel), 0.18, -0.02);
    ctx.lineTo(0.2, 0);
    ctx.lineTo(-0.13, 0);
    ctx.quadraticCurveTo(-0.13, -0.25, -0.1, hipY);
  } else {
    ctx.lineTo(0.22, -0.08);
    ctx.lineTo(0.24, 0);
    ctx.lineTo(-0.2, 0);
    ctx.lineTo(-0.16, -0.14);
    ctx.lineTo(-0.1, hipY);
  }
  ctx.fill();
  ctx.translate(0, hipY);
  ctx.rotate(bow * 0.9);
  ctx.translate(0, -hipY);
  const lift = hipY + 0.46;
  ctx.translate(0, lift);
  // Torso: a broad chest over a round belly.
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.44);
  ctx.quadraticCurveTo(0.2, -0.46, 0.14, -0.6);
  ctx.quadraticCurveTo(0.12, -0.72, 0.08, -0.76);
  ctx.lineTo(-0.1, -0.78);
  ctx.quadraticCurveTo(-0.15, -0.6, -0.1, -0.44);
  ctx.fill();
  // Head in profile: brow, nose, lips, chin.
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.77);
  ctx.lineTo(0.03, -0.78);
  ctx.lineTo(0.06, -0.8);
  ctx.lineTo(0.055, -0.83);
  ctx.lineTo(0.07, -0.845);
  ctx.lineTo(0.06, -0.87);
  ctx.lineTo(0.085, -0.9);
  ctx.lineTo(0.06, -0.92);
  ctx.lineTo(0.06, -0.94);
  ctx.lineTo(-0.06, -0.94);
  ctx.closePath();
  ctx.fill();
  // The mustache, curled up.
  ctx.beginPath();
  ctx.moveTo(0.06, -0.855);
  ctx.quadraticCurveTo(0.1, -0.84, 0.11, -0.87);
  ctx.quadraticCurveTo(0.09, -0.85, 0.06, -0.865);
  ctx.fill();
  // The crown: a flared band, then a tall tapering kireedam with a knob on top.
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.93);
  ctx.lineTo(0.07, -0.93);
  ctx.lineTo(0.08, -0.96);
  ctx.lineTo(0.04, -0.98);
  ctx.lineTo(0.02, -1.14);
  ctx.quadraticCurveTo(0.0, -1.2, -0.01, -1.22);
  ctx.quadraticCurveTo(-0.02, -1.2, -0.04, -1.14);
  ctx.lineTo(-0.07, -0.98);
  ctx.lineTo(-0.1, -0.96);
  ctx.closePath();
  ctx.fill();
  // The halo of the crown behind the head, and the earring.
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.9);
  ctx.quadraticCurveTo(-0.2, -0.96, -0.15, -1.06);
  ctx.quadraticCurveTo(-0.12, -0.98, -0.06, -0.97);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-0.02, -0.84, 0.035, 0, TAU);
  ctx.fill();
  // The back arm, holding the umbrella's staff.
  ctx.lineCap = "round";
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.74);
  ctx.lineTo(-0.12, -0.6);
  ctx.lineTo(-0.05, lerp(-0.62, -0.7, wave));
  ctx.stroke();
  // The front arm: holding the kindi, or raised in blessing.
  const hand = { x: lerp(0.2, 0.26, pour), y: lerp(-0.56, -0.62, pour) };
  ctx.beginPath();
  ctx.moveTo(0.06, -0.74);
  ctx.lineTo(lerp(0.14, 0.12, wave), lerp(-0.62, -0.86, wave));
  ctx.lineTo(lerp(hand.x, 0.2, wave), lerp(hand.y, -1.0, wave));
  ctx.stroke();
  if (kindi && wave < 0.5) {
    // The kindi, a spouted bell-metal water pot.
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(pour * 1.1);
    ctx.beginPath();
    ctx.ellipse(0.04, 0.03, 0.045, 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(0.025, -0.03, 0.03, 0.03);
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(0.075, 0.02);
    ctx.lineTo(0.12, -0.01);
    ctx.stroke();
    ctx.restore();
  }
  // The olakkuda: a tall staff, and a shallow cone of palm leaf with its ribs showing.
  if (umbrella > 0.01) {
    ctx.globalAlpha = umbrella;
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.5);
    ctx.lineTo(-0.02, -1.36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.34, -1.3);
    ctx.quadraticCurveTo(-0.02, -1.5, 0.3, -1.3);
    ctx.lineTo(0.28, -1.28);
    ctx.quadraticCurveTo(-0.02, -1.33, -0.32, -1.28);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 0.01;
    for (let i = 0; i < 7; i++) {
      const x = lerp(-0.3, 0.26, (i + 0.5) / 7);
      ctx.beginPath();
      ctx.moveTo(x, -1.29);
      ctx.lineTo(x, -1.24);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // The pricked ornaments: crown, halo, necklace, belt and the dhoti's border; and his eye.
  const lit: Hole[] = [
    ...row(-0.06, -0.95, 0.06, -0.95, 5, 0.008),
    ...row(-0.04, -1.0, 0.0, -1.12, 4, 0.008),
    ...row(-0.14, -1.0, -0.1, -0.94, 3, 0.007),
    ...row(-0.06, -0.74, 0.08, -0.7, 5, 0.007),
    ...row(-0.1, -0.47, 0.12, -0.47, 7, 0.007),
    [-0.02, -0.84, 0.014],
    [0.035, -0.9, 0.009],
  ];
  if (kneel < 0.5) lit.push(...row(-0.12, -0.04, 0.17, -0.04, 8, 0.007).map(([x, y, r]) => [x, y - lift, r] as Hole));
  holes(ctx, lit, light);
  ctx.restore();
}

/** One of his people, in profile facing +x: a man in a mundu or a woman with her hair knotted. */
function person(ctx: Ctx, ink: string, light: string, woman: boolean, raise: number) {
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-0.09, -0.5);
  ctx.lineTo(0.08, -0.5);
  ctx.lineTo(woman ? 0.12 : 0.1, 0);
  ctx.lineTo(woman ? -0.12 : -0.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.5);
  ctx.lineTo(0.08, -0.5);
  ctx.lineTo(0.07, -0.78);
  ctx.lineTo(-0.08, -0.78);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.01, -0.87, 0.06, 0.075, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.06, -0.88);
  ctx.lineTo(0.085, -0.86);
  ctx.lineTo(0.06, -0.85);
  ctx.fill();
  if (woman) {
    ctx.beginPath();
    ctx.arc(-0.06, -0.9, 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.lineWidth = 0.04;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0.0, -0.75);
  ctx.lineTo(lerp(0.05, 0.1, raise), lerp(-0.6, -0.88, raise));
  ctx.lineTo(lerp(0.1, 0.13, raise), lerp(-0.47, -1.02, raise));
  ctx.stroke();
  holes(ctx, [[0.03, -0.88, 0.01], ...row(-0.09, -0.06, 0.09, -0.06, 5, 0.008)], light);
}

/**
 * Vamana in profile facing +x, height 1: a brahmin boy with a shaved head and a tuft, a thread
 * across his chest, a little leaf umbrella and a water pot. `hand` holds out his cupped palm.
 */
function vamana(ctx: Ctx, ink: string, light: string, hand: number) {
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.46);
  ctx.lineTo(0.1, -0.46);
  ctx.lineTo(0.12, -0.2);
  ctx.lineTo(-0.12, -0.2);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 0.06;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.22);
  ctx.lineTo(-0.07, -0.01);
  ctx.moveTo(0.05, -0.22);
  ctx.lineTo(0.09, -0.01);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.44);
  ctx.quadraticCurveTo(0.14, -0.42, 0.1, -0.7);
  ctx.lineTo(-0.1, -0.72);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.0, -0.83, 0.12, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.11, -0.84);
  ctx.lineTo(0.15, -0.8);
  ctx.lineTo(0.11, -0.78);
  ctx.fill();
  // The kudumi, his tuft.
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.92);
  ctx.quadraticCurveTo(-0.2, -0.98, -0.18, -0.86);
  ctx.quadraticCurveTo(-0.14, -0.9, -0.09, -0.88);
  ctx.fill();
  // The back arm holds the umbrella over his shoulder.
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.68);
  ctx.lineTo(-0.1, -0.55);
  ctx.lineTo(-0.02, -0.52);
  ctx.stroke();
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.5);
  ctx.lineTo(-0.16, -1.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-0.17, -1.12, 0.26, 0.07, -0.25, Math.PI, 0);
  ctx.fill();
  // The front arm: the water pot, or the cupped palm held out.
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(0.04, -0.68);
  ctx.lineTo(lerp(0.08, 0.16, hand), lerp(-0.52, -0.6, hand));
  ctx.lineTo(lerp(0.1, 0.28, hand), lerp(-0.4, -0.6, hand));
  ctx.stroke();
  if (hand < 0.5) {
    ctx.beginPath();
    ctx.arc(0.11, -0.33, 0.07, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.arc(0.11, -0.42, 0.04, Math.PI, 0);
    ctx.stroke();
  }
  holes(ctx, [[0.06, -0.85, 0.014], ...row(-0.08, -0.7, 0.08, -0.46, 6, 0.01), ...row(-0.1, -0.24, 0.1, -0.24, 5, 0.01)], light);
}

/**
 * Trivikrama, the boy grown to fill the worlds: only his legs and hips fit on the screen. One foot
 * stands on the earth; the other is lifted (`stride` 0..1) up past the top of the screen, into the
 * sky, then brought down (`press`) on the bowed king's head at (`kx`, `ky`).
 */
function trivikrama(ctx: Ctx, ink: string, light: string, size: number, stride: number, press: number, kx: number, ky: number) {
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  const hip = { x: 0, y: -size * 0.52 };
  // The standing leg.
  ctx.lineWidth = size * 0.11;
  ctx.beginPath();
  ctx.moveTo(hip.x - size * 0.04, hip.y);
  ctx.lineTo(-size * 0.1, -size * 0.25);
  ctx.lineTo(-size * 0.12, -size * 0.03);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-size * 0.08, -size * 0.015, size * 0.1, size * 0.03, 0, 0, TAU);
  ctx.fill();
  // The lifted leg: up into the sky, then down to the king.
  const sky = { x: size * 0.4, y: -size * 1.05 };
  const foot =
    press > 0
      ? { x: lerp(sky.x, kx, press), y: lerp(sky.y, ky, press) }
      : {
          x: lerp(size * 0.12, sky.x, stride),
          y: lerp(-size * 0.02, sky.y, Math.sin(stride * Math.PI * 0.5)),
        };
  const knee = {
    x: (hip.x + foot.x) / 2 + size * 0.18,
    y: (hip.y + foot.y) / 2 + size * 0.05,
  };
  ctx.lineWidth = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(hip.x + size * 0.04, hip.y);
  ctx.quadraticCurveTo(knee.x, knee.y, foot.x, foot.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate(press > 0 ? 0 : -stride * 0.6);
  ctx.beginPath();
  ctx.ellipse(size * 0.04, 0, size * 0.1, size * 0.03, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // The body rising out of sight, a pleated silk fanning at the hips, a sash with its ends hanging.
  ctx.beginPath();
  ctx.moveTo(-size * 0.13, -size * 1.5);
  ctx.lineTo(size * 0.11, -size * 1.5);
  ctx.lineTo(size * 0.12, hip.y - size * 0.2);
  ctx.quadraticCurveTo(size * 0.23, hip.y - size * 0.02, size * 0.2, hip.y + size * 0.14);
  ctx.lineTo(-size * 0.2, hip.y + size * 0.14);
  ctx.quadraticCurveTo(-size * 0.23, hip.y - size * 0.02, -size * 0.14, hip.y - size * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size * 0.06, hip.y - size * 0.17);
  ctx.quadraticCurveTo(size * 0.24, hip.y + size * 0.05, size * 0.15, hip.y + size * 0.32);
  ctx.lineTo(size * 0.11, hip.y + size * 0.31);
  ctx.quadraticCurveTo(size * 0.16, hip.y + size * 0.02, size * 0.02, hip.y - size * 0.15);
  ctx.fill();
  holes(
    ctx,
    [
      ...row(-size * 0.14, hip.y - size * 0.19, size * 0.13, hip.y - size * 0.19, 11, size * 0.008),
      ...row(-size * 0.19, hip.y + size * 0.1, size * 0.19, hip.y + size * 0.1, 13, size * 0.007),
      ...row(-size * 0.11, hip.y - size * 0.62, size * 0.1, hip.y - size * 0.45, 8, size * 0.008),
      ...row(-size * 0.08, hip.y - size * 0.12, -size * 0.12, hip.y + size * 0.06, 4, size * 0.006),
      ...row(size * 0.02, hip.y - size * 0.12, size * 0.04, hip.y + size * 0.06, 4, size * 0.006),
    ],
    light,
  );
}

/** A coconut palm, as the puppeteers cut them: a curved trunk and a burst of fronds. */
function palm(ctx: Ctx, ink: string, size: number, lean: number) {
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = "round";
  ctx.lineWidth = size * 0.035;
  const top = { x: lean * size * 0.25, y: -size };
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * size * 0.2, -size * 0.5, top.x, top.y);
  ctx.stroke();
  ctx.lineWidth = size * 0.02;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI + Math.sin(i * 3.1) * 0.1;
    const len = size * (0.28 + (i % 3) * 0.04);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(
      top.x + Math.cos(a) * len * 0.6,
      top.y + Math.sin(a) * len * 0.5 - size * 0.05,
      top.x + Math.cos(a) * len,
      top.y + Math.sin(a) * len * 0.3 + size * 0.1,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(top.x, top.y + size * 0.03, size * 0.04, 0, TAU);
  ctx.fill();
}

/** A puppet's handling stick, running down out of the screen. */
function stick(ctx: Ctx, ink: string, x: number, y: number) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.018;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 0.05, GROUND + 0.6);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export type ScreenState = { p: number; seconds: number; amb: number };

/**
 * The screen and everything on it, in world units. Call inside the camera's transform; the house
 * around it is drawn by the caller. Returns how bright the screen is, for the light it throws.
 */
export function drawScreen(ctx: Ctx, s: ScreenState) {
  const { p, seconds } = s;
  const left = SCREEN.x - SCREEN.w / 2;
  const top = SCREEN.y - SCREEN.h / 2;
  const lit = screenLit(p);
  const breathe = 0.93 + 0.07 * flicker(seconds, 3);
  // The cloth: moonlit grey when dark, warm where the lamps burn, brightest along the bottom.
  const cloth = ctx.createLinearGradient(0, top, 0, top + SCREEN.h);
  const day = s.amb;
  const base = (a: number) => {
    const r = lerp(lerp(40, 222, day), 255, a);
    const g = lerp(lerp(44, 214, day), 200, a);
    const b = lerp(lerp(64, 196, day), 128, a);
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };
  cloth.addColorStop(0, base(lit * 0.62 * breathe));
  cloth.addColorStop(0.6, base(lit * 0.82 * breathe));
  cloth.addColorStop(1, base(lit * 0.98 * breathe));
  ctx.fillStyle = cloth;
  ctx.fillRect(left, top, SCREEN.w, SCREEN.h);
  // The weave and the seams of the cloth.
  ctx.strokeStyle = `rgba(80, 50, 30, ${0.08 + lit * 0.06})`;
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = left + (i / 4) * SCREEN.w;
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + SCREEN.h);
  }
  ctx.stroke();

  // The lamps behind, seen as glows through the cloth along its foot.
  ctx.globalCompositeOperation = "lighter";
  const lamp = glowSprite("255, 140, 50");
  const core = glowSprite("255, 200, 120");
  for (let i = 0; i < LAMP_COUNT; i++) {
    const on = lampOn(p, i);
    if (on <= 0.01) continue;
    const x = left + ((i + 0.5) / LAMP_COUNT) * SCREEN.w;
    const f = flicker(seconds, i * 1.3);
    glow(ctx, lamp, x, top + SCREEN.h + 0.05, 0.9 * f, 0.34 * on);
    glow(ctx, core, x, top + SCREEN.h - 0.04, 0.16 * f, 0.45 * on);
  }
  ctx.globalCompositeOperation = "source-over";

  if (lit > 0.02) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, SCREEN.w, SCREEN.h);
    ctx.clip();
    ctx.globalAlpha = clamp(lit * 1.3);
    story(ctx, p, seconds, lit);
    ctx.restore();
  }
  // The black band along the top, as on a koothumadam's screen, and its border.
  ctx.fillStyle = "rgb(18, 10, 8)";
  ctx.fillRect(left, top - 0.36, SCREEN.w, 0.4);
  ctx.fillStyle = "rgba(200, 40, 30, 0.9)";
  ctx.fillRect(left, top - 0.02, SCREEN.w, 0.05);
  return lit * breathe;
}

/** The puppets, as the scroll tells the story. */
function story(ctx: Ctx, p: number, seconds: number, lit: number) {
  const ink = "rgba(34, 16, 8, 0.92)";
  const light = `rgba(255, 226, 150, ${0.85 * lit})`;
  const x0 = SCREEN.x;
  const sway = (seed: number) => Math.sin(seconds * 1.3 + seed) * 0.03;
  const M = MOMENTS;

  // Palms at either end, for the land he ruled.
  const land = 1 - rise(p, M.grow[0], M.grow[0] + 0.008) + rise(p, M.wish[0], M.wish[1]);
  if (land > 0.01) {
    ctx.globalAlpha = Math.min(1, land) * lit;
    for (const [x, size, lean] of [
      [-3.25, 2.4, 0.3],
      [-2.75, 1.8, -0.2],
      [3.3, 2.6, -0.35],
    ] as const) {
      if (p > 0.5 && x < 0) continue;
      ctx.save();
      ctx.translate(x0 + x, GROUND + 0.05);
      palm(ctx, ink, size, lean + sway(x) * 2);
      ctx.restore();
    }
    ctx.globalAlpha = lit;
  }

  const coming = p > 0.5;
  if (!coming) {
    // Mahabali: on the left, facing his people, from the reign until he is pressed down.
    const bow = rise(p, M.press[0], M.press[0] + 0.007);
    const sink = rise(p, M.press[0] + 0.007, M.press[1]);
    const rising = rise(p, M.wish[0], M.wish[0] + 0.01);
    const pour = rise(p, M.pour - 0.005, M.pour + 0.002) * (1 - rise(p, M.grow[0] - 0.002, M.grow[0] + 0.004));
    const kx = x0 - 1.7;
    const ky = GROUND + sink * 1.8 * (1 - rising * 0.55);
    ctx.save();
    ctx.translate(kx, ky + Math.sin(seconds * 1.1) * 0.015);
    ctx.scale(2.3, 2.3);
    mahabali(ctx, ink, light, p > M.wish[0] ? 0 : bow, pour, p > M.wish[0] ? rising : 1 - bow, p > M.wish[0] ? rising : 0);
    ctx.restore();
    if (p < M.press[0]) stick(ctx, ink, kx + 0.1, ky - 1.2);

    // His people, all of a height, holding hands: on the right, before Vamana comes, and after.
    const people = 1 - rise(p, M.vamana[0] - 0.006, M.vamana[0] + 0.004) + rise(p, M.wish[0] + 0.004, M.wish[1] - 0.002);
    if (people > 0.01) {
      ctx.globalAlpha = Math.min(1, people) * lit;
      for (let i = 0; i < 5; i++) {
        const x = x0 + 0.1 + i * 0.62;
        ctx.save();
        ctx.translate(x, GROUND + Math.abs(Math.sin(seconds * 2 + i)) * -0.03);
        ctx.scale(-1.45, 1.45);
        person(ctx, ink, light, i % 2 === 1, p > M.wish[0] ? 0.9 : 0.35 + 0.25 * Math.sin(seconds * 1.6 + i));
        ctx.restore();
      }
      ctx.globalAlpha = lit;
    }

    // Vamana walks in from the right, stops before the king, holds out his hand, and grows.
    const walk = rise(p, M.vamana[0], M.vamana[0] + 0.012);
    const grow = rise(p, M.grow[0], M.grow[0] + 0.012);
    const giant = rise(p, M.grow[0] + 0.009, M.grow[0] + 0.014);
    const gone = rise(p, M.wish[0], M.wish[0] + 0.008);
    if (walk > 0 && giant < 1) {
      const vx = lerp(x0 + 4.2, x0 + 0.1, walk);
      const size = lerp(1.15, 4.2, grow * grow);
      const step = walk < 1 ? Math.abs(Math.sin(walk * 18)) * 0.06 : 0;
      ctx.save();
      ctx.globalAlpha = lit * (1 - giant);
      ctx.translate(vx + grow * 0.6, GROUND - step);
      ctx.scale(-size, size);
      vamana(ctx, ink, light, rise(p, M.pour - 0.008, M.pour - 0.003));
      ctx.restore();
      if (grow < 0.2) stick(ctx, ink, vx, GROUND - size * 0.6);
    }
    if (giant > 0 && gone < 1) {
      const stride = rise(p, M.step - 0.004, M.step + 0.006);
      const press = rise(p, M.press[0] + 0.001, M.press[0] + 0.008);
      ctx.save();
      ctx.globalAlpha = lit * giant * (1 - gone);
      // For the third step he leans over the king, so the foot comes down from above.
      const gx = lerp(x0 + 1.2, kx + 1.5, press);
      ctx.translate(gx, GROUND);
      ctx.scale(-1, 1);
      trivikrama(ctx, ink, light, 3.9, stride, press, -(kx - gx) - 0.1, ky - GROUND - 1.95 * (1 - bow * 0.35));
      ctx.restore();
      // The sun and the moon, for the sky his second step took.
      const heaven = rise(p, M.step - 0.006, M.step + 0.004) * (1 - gone);
      if (heaven > 0.01) {
        ctx.globalAlpha = lit * heaven;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(x0 - 2.7, SCREEN.y - 1.2, 0.36, 0, TAU);
        ctx.fill();
        holes(
          ctx,
          Array.from(
            { length: 12 },
            (_, i) => [x0 - 2.7 + Math.cos((i / 12) * TAU) * 0.26, SCREEN.y - 1.2 + Math.sin((i / 12) * TAU) * 0.26, 0.03] as Hole,
          ),
          light,
        );
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(x0 + 3.0, SCREEN.y - 1.3, 0.3, 0, TAU);
        ctx.arc(x0 + 3.12, SCREEN.y - 1.36, 0.26, 0, TAU, true);
        ctx.fill("evenodd");
      }
    }
    // Water poured from the kindi into Vamana's palm, to seal the gift.
    const water = rise(p, M.pour - 0.004, M.pour) * (1 - rise(p, M.grow[0] - 0.004, M.grow[0]));
    if (water > 0.01) {
      ctx.fillStyle = `rgba(34, 16, 8, ${0.8 * water})`;
      const sx = kx + 0.62;
      const sy = ky - 1.48;
      const ex = x0 - 0.05 + 0.02;
      const ey = GROUND - 0.7;
      for (let i = 0; i < 16; i++) {
        const t = (i / 16 + seconds * 1.6) % 1;
        const x = lerp(sx, ex, t);
        const y = lerp(sy, ey, t) - Math.sin(t * Math.PI) * 0.25;
        ctx.beginPath();
        ctx.arc(x, y, 0.028, 0, TAU);
        ctx.fill();
      }
    }
    // Down in Patala, a glow at the ground where he went, for his wish.
    ctx.globalAlpha = lit;
    return;
  }

  // The last evening: he rises among his people and blesses them, then turns and walks away.
  const t = rise(p, M.leaving[0], M.leaving[1]);
  const up = rise(p, 0.858, 0.88);
  const turned = t > 0.36;
  const walk = rise(t, 0.4, 1);
  const x = lerp(x0 - 1.2, x0 - 5.2, walk);
  const walking = walk > 0 && walk < 1;
  ctx.save();
  ctx.translate(x, GROUND + (1 - up) * 2.3 - (walking ? Math.abs(Math.sin(seconds * 3)) * 0.04 : 0));
  ctx.scale(turned ? -2.3 : 2.3, 2.3);
  mahabali(ctx, ink, light, 0, 0, 1, turned ? 0 : rise(t, 0.04, 0.16), false);
  ctx.restore();
  ctx.globalAlpha = lit * up;
  for (let i = 0; i < 5; i++) {
    const px = x0 + 0.6 + i * 0.62;
    ctx.save();
    ctx.translate(px, GROUND);
    ctx.scale(-1.45, 1.45);
    person(ctx, ink, light, i % 2 === 1, 0.7 + 0.3 * Math.sin(seconds * 3 + i));
    ctx.restore();
  }
  ctx.globalAlpha = lit;
}
