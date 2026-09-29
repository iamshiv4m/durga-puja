// The people of the day, cut flat like paper: pilgrims at the Sangam, a family in the Bihar
// sun, women in black saris in a Pune wada, and the kite flyers on the roofs of Ahmedabad.
// Everything is drawn in units of the figure's height, feet at the origin, facing +x.
import { TAU, lerp, mix, type Ctx, type RGB } from "../paint";

/** Turns a colour into paint under the hour's light (see scene.ts). */
export type Shade = (c: RGB, alpha?: number) => string;

export type Look = {
  /** Height in world units. */
  h: number;
  skin: RGB;
  /** Kurta, blouse or choli; ignored when bare. */
  top: RGB;
  /** Dhoti, pyjama, sari or skirt. */
  bottom: RGB;
  border?: RGB;
  dress: "dhoti" | "kurta" | "sari" | "bare" | "sadhu" | "frock";
  head: "bare" | "topi" | "pagdi" | "pallu" | "bun" | "jata" | "cap" | "gandhi";
  headColor?: RGB;
  /** A winter shawl round the shoulders. */
  shawl?: RGB;
  beard?: RGB;
  /** The Maharashtrian nath, or a new bride's halwa: jewellery of sugared sesame. */
  jewel?: "nath" | "halwa";
  /** Small dots over the sari: bandhani, or the silver moons of a chandrakala. */
  motif?: RGB;
  bindi?: boolean;
  build?: number;
};

export type Hold = "lota" | "tabak" | "firki" | "pole" | "dish" | "trishul" | "leaf" | "sugad";

/**
 * Arm angles from hanging straight down, positive swinging the way the figure faces: 0 at the
 * side, π/2 straight out in front, π straight up. `sit` folds the legs under.
 */
export type Pose = { la: number; lf: number; ra: number; rf: number; lean?: number; bob?: number; sit?: boolean; hold?: Hold; tip?: number };

export type Point = { x: number; y: number };
export type Hands = { left: Point; right: Point; head: Point };

const SHOULDER = { y: -0.79, x: 0.08 };
const UPPER = 0.17;
const FOREARM = 0.16;
const HIP = -0.5;
const HAIR: RGB = [24, 18, 16];
const SIT = 0.34;

export const SKINS: RGB[] = [
  [178, 120, 84],
  [156, 102, 70],
  [134, 86, 58],
  [196, 140, 100],
  [118, 76, 52],
];

/** Draws a person standing (or sitting) on (x, y); returns the hands and head in world units. */
export function drawFigure(ctx: Ctx, x: number, y: number, look: Look, pose: Pose, shade: Shade, facing: 1 | -1 = 1): Hands {
  const { h } = look;
  const w = look.build ?? 1;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const woman = look.dress === "sari" || look.dress === "frock";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const skin = shade(look.skin);
  const lower = shade(look.bottom);
  const border = look.border ? shade(look.border) : null;

  if (pose.sit) {
    // Legs folded under, the cloth spread round them.
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(-0.2 * w, 0);
    ctx.bezierCurveTo(-0.24 * w, -0.09, -0.16 * w, -0.17, -0.09 * w, -0.19);
    ctx.lineTo(0.08 * w, -0.19);
    ctx.bezierCurveTo(0.2 * w, -0.17, 0.3 * w, -0.1, 0.27 * w, 0);
    ctx.closePath();
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(-0.19 * w, -0.012);
      ctx.quadraticCurveTo(0.04, 0.008, 0.26 * w, -0.012);
      ctx.stroke();
    }
    ctx.fillStyle = shade(mix(look.skin, [40, 24, 16], 0.2));
    ctx.beginPath();
    ctx.ellipse(0.2 * w, -0.03, 0.045, 0.018, 0, 0, TAU);
    ctx.fill();
    ctx.translate(0, SIT);
  } else if (woman) {
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(-0.08 * w, -0.56 + bob);
    ctx.lineTo(0.08 * w, -0.56 + bob);
    ctx.quadraticCurveTo(0.14 * w, -0.3, 0.18 * w, -0.012);
    ctx.quadraticCurveTo(0, 0.018, -0.18 * w, -0.012);
    ctx.quadraticCurveTo(-0.14 * w, -0.3, -0.08 * w, -0.56 + bob);
    ctx.fill();
    // The pleats tucked in at the front.
    ctx.strokeStyle = shade(mix(look.bottom, [0, 0, 0], 0.3), 0.7);
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    for (const px of [0.03, 0.06, 0.09]) {
      ctx.moveTo(px * w * 0.6, -0.5);
      ctx.lineTo(px * w * 1.5, -0.02);
    }
    ctx.stroke();
    if (look.motif) {
      ctx.fillStyle = shade(look.motif);
      for (let row = 0; row < 7; row++) {
        const yy = -0.5 + row * 0.07;
        const half = lerp(0.08, 0.16, (yy + 0.5) / 0.5) * w;
        for (let col = -3; col <= 3; col++) {
          const xx = (col + (row % 2) * 0.5) * half * 0.3;
          if (Math.abs(xx) > half - 0.02) continue;
          ctx.beginPath();
          ctx.arc(xx, yy, 0.008, 0, TAU);
          ctx.fill();
        }
      }
    }
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.moveTo(0.17 * w, -0.03);
      ctx.quadraticCurveTo(0, 0.0, -0.17 * w, -0.03);
      ctx.stroke();
    }
  } else if (look.dress === "kurta") {
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(-0.075 * w, -0.4);
    ctx.lineTo(0.075 * w, -0.4);
    ctx.lineTo(0.075 * w, -0.012);
    ctx.lineTo(0.018, -0.012);
    ctx.lineTo(0.0, -0.3);
    ctx.lineTo(-0.018, -0.012);
    ctx.lineTo(-0.075 * w, -0.012);
    ctx.closePath();
    ctx.fill();
  } else {
    // A dhoti, or the sadhu's saffron cloth, to the ankle.
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(-0.085 * w, -0.53 + bob);
    ctx.lineTo(0.085 * w, -0.53 + bob);
    ctx.quadraticCurveTo(0.11 * w, -0.25, 0.09 * w, -0.05);
    ctx.lineTo(0.015, -0.05);
    ctx.lineTo(0.0, -0.22);
    ctx.lineTo(-0.015, -0.05);
    ctx.lineTo(-0.09 * w, -0.05);
    ctx.quadraticCurveTo(-0.11 * w, -0.25, -0.085 * w, -0.53 + bob);
    ctx.fill();
    ctx.strokeStyle = shade(mix(look.bottom, [0, 0, 0], 0.25), 0.6);
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(0.02, -0.52);
    ctx.quadraticCurveTo(0.05, -0.35, 0.02, -0.2);
    ctx.stroke();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.moveTo(-0.09 * w, -0.06);
      ctx.lineTo(0.09 * w, -0.06);
      ctx.stroke();
    }
    // Bare shins.
    ctx.strokeStyle = skin;
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.06);
    ctx.lineTo(-0.055, -0.015);
    ctx.moveTo(0.05, -0.06);
    ctx.lineTo(0.055, -0.015);
    ctx.stroke();
  }
  if (!pose.sit) {
    ctx.fillStyle = shade(mix(look.skin, [40, 24, 16], 0.25));
    ctx.beginPath();
    ctx.ellipse(-0.055, -0.008, 0.045, 0.017, 0, 0, TAU);
    ctx.ellipse(0.065, -0.008, 0.045, 0.017, 0, 0, TAU);
    ctx.fill();
  }

  // Above the waist, leaning from the hip.
  ctx.translate(0, HIP + bob);
  ctx.rotate(lean);
  ctx.translate(0, -HIP);

  const pallu = woman && look.dress === "sari";
  const hood = look.head === "pallu";
  if (pallu || hood) {
    // The pallu falls down her back from the shoulder, or from the head.
    ctx.fillStyle = shade(mix(look.bottom, [0, 0, 0], 0.18));
    ctx.beginPath();
    ctx.moveTo(-0.02, hood ? -0.975 : -0.81);
    ctx.quadraticCurveTo(-0.15 * w, hood ? -0.85 : -0.72, -0.14 * w, -0.46);
    ctx.lineTo(-0.06 * w, -0.47);
    ctx.lineTo(-0.02, -0.8);
    ctx.closePath();
    ctx.fill();
  }

  // Torso.
  const bare = look.dress === "bare" || look.dress === "sadhu";
  ctx.fillStyle = bare ? skin : shade(look.top);
  ctx.beginPath();
  if (woman) {
    ctx.moveTo(-0.08 * w, -0.8);
    ctx.lineTo(0.08 * w, -0.8);
    ctx.lineTo(0.068 * w, -0.55);
    ctx.lineTo(-0.068 * w, -0.55);
  } else if (look.dress === "kurta") {
    ctx.moveTo(-0.09 * w, -0.8);
    ctx.lineTo(0.09 * w, -0.8);
    ctx.lineTo(0.12 * w, -0.34);
    ctx.lineTo(-0.12 * w, -0.34);
  } else {
    ctx.moveTo(-0.088 * w, -0.8);
    ctx.lineTo(0.088 * w, -0.8);
    ctx.lineTo(0.08 * w, -0.52);
    ctx.lineTo(-0.08 * w, -0.52);
  }
  ctx.closePath();
  ctx.fill();
  if (woman) {
    ctx.fillStyle = skin;
    ctx.fillRect(-0.062 * w, -0.6, 0.124 * w, 0.045);
  }
  if (look.dress === "kurta") {
    ctx.strokeStyle = shade(mix(look.top, [0, 0, 0], 0.25), 0.7);
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(0.03, -0.8);
    ctx.lineTo(0.03, -0.66);
    ctx.stroke();
  }
  if (bare) {
    // The janeu, the sacred thread, over the left shoulder; and rudraksha for the sadhu.
    ctx.strokeStyle = shade([240, 236, 220], 0.9);
    ctx.lineWidth = 0.007;
    ctx.beginPath();
    ctx.moveTo(-0.07, -0.79);
    ctx.lineTo(0.07, -0.54);
    ctx.stroke();
    if (look.dress === "sadhu") {
      ctx.fillStyle = shade([90, 44, 26]);
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        ctx.beginPath();
        ctx.arc(lerp(-0.05, 0.05, t), -0.79 + Math.sin(t * Math.PI) * 0.12, 0.011, 0, TAU);
        ctx.fill();
      }
    }
  }
  if (pallu && !pose.sit) {
    // Across the front from the waist up over the shoulder, with its border.
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(-0.085 * w, -0.81);
    ctx.lineTo(0.0, -0.81);
    ctx.lineTo(0.085 * w, -0.6);
    ctx.lineTo(0.082 * w, -0.53);
    ctx.lineTo(0.02, -0.53);
    ctx.closePath();
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(0.0, -0.81);
      ctx.lineTo(0.085 * w, -0.6);
      ctx.stroke();
    }
  } else if (pallu) {
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(-0.085 * w, -0.81);
    ctx.lineTo(0.0, -0.81);
    ctx.lineTo(0.075 * w, -0.56);
    ctx.lineTo(-0.02, -0.55);
    ctx.closePath();
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(0.0, -0.81);
      ctx.lineTo(0.075 * w, -0.56);
      ctx.stroke();
    }
  }
  if (look.shawl) {
    ctx.fillStyle = shade(look.shawl);
    ctx.beginPath();
    ctx.moveTo(-0.1 * w, -0.82);
    ctx.quadraticCurveTo(0, -0.86, 0.1 * w, -0.82);
    ctx.lineTo(0.12 * w, -0.56);
    ctx.quadraticCurveTo(0, -0.52, -0.12 * w, -0.58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(mix(look.shawl, [255, 240, 210], 0.35), 0.8);
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(0.11 * w, -0.6);
    ctx.quadraticCurveTo(0, -0.56, -0.115 * w, -0.61);
    ctx.stroke();
  }

  // Neck and head.
  ctx.fillStyle = skin;
  ctx.fillRect(-0.022, -0.86, 0.044, 0.07);
  ctx.beginPath();
  ctx.ellipse(0, -0.9, 0.056, 0.066, 0, 0, TAU);
  ctx.fill();
  // The nose, turned the way the figure faces.
  ctx.beginPath();
  ctx.moveTo(0.05, -0.915);
  ctx.lineTo(0.068, -0.885);
  ctx.lineTo(0.05, -0.878);
  ctx.fill();
  const hair = shade(HAIR);
  switch (look.head) {
    case "topi": {
      // A knitted woollen cap pulled over the ears.
      ctx.fillStyle = shade(look.headColor ?? [120, 40, 40]);
      ctx.beginPath();
      ctx.ellipse(-0.004, -0.925, 0.064, 0.058, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(0.03, -0.9);
      ctx.lineTo(-0.058, -0.87);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(mix(look.headColor ?? [120, 40, 40], [255, 255, 255], 0.3), 0.7);
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.moveTo(-0.06, -0.93);
      ctx.lineTo(0.062, -0.93);
      ctx.stroke();
      break;
    }
    case "pagdi": {
      ctx.fillStyle = shade(look.headColor ?? [240, 236, 226]);
      ctx.beginPath();
      ctx.ellipse(-0.006, -0.95, 0.07, 0.048, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade(mix(look.headColor ?? [240, 236, 226], [0, 0, 0], 0.12));
      ctx.fillRect(-0.068, -0.95, 0.136, 0.012);
      break;
    }
    case "pallu": {
      ctx.fillStyle = shade(look.bottom);
      ctx.beginPath();
      ctx.ellipse(-0.006, -0.918, 0.07, 0.07, 0, Math.PI * 0.62, Math.PI * 2.12);
      ctx.lineTo(0.03, -0.86);
      ctx.lineTo(-0.02, -0.8);
      ctx.lineTo(-0.075, -0.86);
      ctx.closePath();
      ctx.fill();
      if (border) {
        ctx.strokeStyle = border;
        ctx.lineWidth = 0.016;
        ctx.beginPath();
        ctx.ellipse(-0.006, -0.918, 0.066, 0.066, 0, Math.PI * 1.35, Math.PI * 2.1);
        ctx.stroke();
      }
      break;
    }
    case "jata": {
      // Matted hair tied up in a tall knot, and a grey beard.
      ctx.fillStyle = shade([58, 46, 36]);
      ctx.beginPath();
      ctx.ellipse(0, -0.93, 0.058, 0.042, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-0.01, -1.0, 0.035, 0.05, -0.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = shade([58, 46, 36]);
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(-0.05, -0.9);
      ctx.quadraticCurveTo(-0.08, -0.8, -0.06, -0.7);
      ctx.stroke();
      break;
    }
    case "gandhi": {
      // The white cotton Gandhi topi of an older Gujarati man.
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(0, -0.915, 0.058, 0.045, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade(look.headColor ?? [246, 244, 236]);
      ctx.beginPath();
      ctx.moveTo(-0.064, -0.93);
      ctx.lineTo(0.062, -0.935);
      ctx.lineTo(0.05, -0.985);
      ctx.lineTo(-0.05, -0.98);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "cap": {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(0, -0.915, 0.058, 0.05, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade(look.headColor ?? [230, 60, 50]);
      ctx.beginPath();
      ctx.ellipse(0, -0.94, 0.06, 0.04, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(0.0, -0.945, 0.11, 0.014);
      break;
    }
    default: {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(-0.004, -0.918, 0.06, 0.052, 0, Math.PI * 0.92, Math.PI * 2.02);
      ctx.fill();
      if (look.head === "bun") {
        ctx.beginPath();
        ctx.arc(-0.055, -0.9, 0.032, 0, TAU);
        ctx.fill();
        // A gajra of jasmine round it.
        ctx.fillStyle = shade([250, 246, 232]);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI + Math.PI * 0.5;
          ctx.beginPath();
          ctx.arc(-0.055 + Math.cos(a) * 0.034, -0.9 + Math.sin(a) * 0.034, 0.009, 0, TAU);
          ctx.fill();
        }
      }
    }
  }
  if (look.beard) {
    ctx.fillStyle = shade(look.beard);
    ctx.beginPath();
    ctx.moveTo(-0.03, -0.875);
    ctx.quadraticCurveTo(0.06, -0.87, 0.055, -0.86);
    ctx.quadraticCurveTo(0.03, look.head === "jata" ? -0.76 : -0.8, -0.02, look.head === "jata" ? -0.78 : -0.82);
    ctx.closePath();
    ctx.fill();
  }
  if (look.dress === "sadhu") {
    // Tripundra: three lines of ash across the forehead, and a red dot.
    ctx.strokeStyle = shade([250, 248, 240]);
    ctx.lineWidth = 0.006;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(0.012, -0.945 + i * 0.012);
      ctx.lineTo(0.05, -0.945 + i * 0.012);
    }
    ctx.stroke();
  }
  if (look.bindi) {
    ctx.fillStyle = shade([200, 20, 30]);
    ctx.beginPath();
    ctx.arc(0.052, -0.935, 0.008, 0, TAU);
    ctx.fill();
  }
  if (look.jewel === "nath") {
    ctx.strokeStyle = shade([250, 240, 220]);
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.arc(0.06, -0.87, 0.018, -Math.PI * 0.4, Math.PI * 0.9);
    ctx.stroke();
  }
  if (look.jewel === "halwa") {
    // Necklace, armlets and a little crown of white sugared sesame.
    ctx.fillStyle = shade([252, 250, 244]);
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      ctx.beginPath();
      ctx.arc(lerp(-0.05, 0.05, t), -0.79 + Math.sin(t * Math.PI) * 0.09, 0.011, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-0.04 + i * 0.02, -0.965 - Math.sin((i / 4) * Math.PI) * 0.02, 0.01, 0, TAU);
      ctx.fill();
    }
  }

  // Arms: sleeve, forearm and hand.
  const sleeve = look.shawl ? shade(look.shawl) : bare ? skin : shade(look.top);
  const arm = (side: -1 | 1, upper: number, fore: number) => {
    const sx = side * SHOULDER.x * w;
    const sy = SHOULDER.y;
    const ex = sx + Math.sin(upper) * UPPER;
    const ey = sy + Math.cos(upper) * UPPER;
    const hx = ex + Math.sin(fore) * FOREARM;
    const hy = ey + Math.cos(fore) * FOREARM;
    ctx.strokeStyle = woman && !look.shawl ? skin : sleeve;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (woman && !look.shawl) {
      // A short blouse sleeve.
      ctx.strokeStyle = shade(look.top);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(lerp(sx, ex, 0.45), lerp(sy, ey, 0.45));
      ctx.stroke();
    }
    ctx.strokeStyle = look.dress === "kurta" && !look.shawl ? sleeve : skin;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    if (woman) {
      // Glass bangles, green in Maharashtra, red elsewhere.
      ctx.strokeStyle = shade(look.jewel === "nath" ? [40, 160, 70] : look.jewel === "halwa" ? [252, 250, 244] : [210, 40, 60]);
      ctx.lineWidth = 0.046;
      ctx.beginPath();
      ctx.moveTo(lerp(ex, hx, 0.72), lerp(ey, hy, 0.72));
      ctx.lineTo(lerp(ex, hx, 0.82), lerp(ey, hy, 0.82));
      ctx.stroke();
    }
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 0.025, 0, TAU);
    ctx.fill();
    return { x: hx, y: hy, angle: fore };
  };

  if (pose.hold === "trishul") {
    // The trishul planted beside him, a damaru tied below the prongs.
    ctx.strokeStyle = shade([90, 80, 70]);
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(0.28, pose.sit ? -SIT : 0);
    ctx.lineTo(0.28, -1.28);
    ctx.moveTo(0.22, -1.2);
    ctx.quadraticCurveTo(0.22, -1.1, 0.28, -1.1);
    ctx.quadraticCurveTo(0.34, -1.1, 0.34, -1.2);
    ctx.stroke();
    ctx.fillStyle = shade([150, 60, 40]);
    ctx.beginPath();
    ctx.moveTo(0.25, -1.06);
    ctx.lineTo(0.31, -1.06);
    ctx.lineTo(0.25, -0.98);
    ctx.lineTo(0.31, -0.98);
    ctx.closePath();
    ctx.fill();
  }
  const left = arm(-1, pose.la, pose.lf);
  const right = arm(1, pose.ra, pose.rf);

  switch (pose.hold) {
    case "lota": {
      // A copper lota, tipped to pour by `tip`.
      ctx.save();
      ctx.translate(right.x + 0.02, right.y - 0.03);
      ctx.rotate(pose.tip ?? 0);
      ctx.fillStyle = shade([196, 104, 60]);
      ctx.beginPath();
      ctx.arc(0, 0.01, 0.05, 0, TAU);
      ctx.fill();
      ctx.fillRect(-0.025, -0.07, 0.05, 0.05);
      ctx.fillRect(-0.038, -0.08, 0.076, 0.016);
      ctx.fillStyle = shade([236, 160, 100], 0.8);
      ctx.fillRect(-0.03, -0.01, 0.02, 0.03);
      ctx.restore();
      break;
    }
    case "tabak": {
      // A brass plate: tilgul laddus, the haldi and kumkum boxes, a lamp.
      const cx = (left.x + right.x) / 2;
      const cy = Math.min(left.y, right.y) - 0.01;
      ctx.fillStyle = shade([214, 170, 70]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 0.13, 0.03, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade([176, 120, 60]);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * 0.035, cy - 0.022, 0.019, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = shade([236, 190, 40]);
      ctx.beginPath();
      ctx.arc(cx - 0.1, cy - 0.015, 0.016, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade([200, 20, 40]);
      ctx.beginPath();
      ctx.arc(cx + 0.1, cy - 0.015, 0.016, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "firki": {
      // The firki: a wooden reel of manja on a handle, held in both hands.
      const cx = (left.x + right.x) / 2;
      const cy = (left.y + right.y) / 2;
      ctx.strokeStyle = shade([150, 100, 50]);
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
      ctx.fillStyle = shade([236, 60, 90]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 0.04, 0.07, 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = shade([190, 130, 60]);
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.ellipse(cx - 0.035, cy - 0.01, 0.018, 0.075, 0.3, 0, TAU);
      ctx.ellipse(cx + 0.035, cy + 0.01, 0.018, 0.075, 0.3, 0, TAU);
      ctx.stroke();
      break;
    }
    case "pole": {
      // A long bamboo with a thorny branch tied at the top, to catch the loose kites.
      const a = { x: right.x + Math.sin(right.angle) * 0.9, y: right.y + Math.cos(right.angle) * 0.9 };
      const b = { x: right.x - Math.sin(right.angle) * 0.2, y: right.y - Math.cos(right.angle) * 0.2 };
      ctx.strokeStyle = shade([170, 140, 80]);
      ctx.lineWidth = 0.016;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.strokeStyle = shade([90, 70, 40]);
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = right.angle + (i - 2.5) * 0.4;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + Math.sin(ang) * 0.1, a.y + Math.cos(ang) * 0.1);
      }
      ctx.stroke();
      break;
    }
    case "dish": {
      // A steel dish of undhiyu.
      ctx.fillStyle = shade([200, 204, 206]);
      ctx.beginPath();
      ctx.ellipse(right.x, right.y - 0.01, 0.11, 0.028, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade([90, 110, 40]);
      ctx.beginPath();
      ctx.ellipse(right.x, right.y - 0.025, 0.085, 0.03, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade([170, 90, 40]);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(right.x + i * 0.03, right.y - 0.035 - Math.abs(i) * -0.005, 0.012, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case "leaf": {
      // A pattal, a plate of sal leaves stitched together, of chura, dahi and gur.
      ctx.fillStyle = shade([96, 124, 50]);
      ctx.beginPath();
      ctx.ellipse(left.x + 0.04, left.y - 0.005, 0.1, 0.024, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade([246, 242, 232]);
      ctx.beginPath();
      ctx.ellipse(left.x + 0.04, left.y - 0.018, 0.07, 0.022, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade([150, 84, 36]);
      ctx.beginPath();
      ctx.arc(left.x + 0.08, left.y - 0.022, 0.014, 0, TAU);
      ctx.fill();
      break;
    }
    case "sugad": {
      drawSugad(ctx, right.x + 0.01, right.y + 0.02, 0.13, shade);
      break;
    }
  }
  ctx.restore();

  // Back to world units, mirrored with the figure and turned about the hip.
  const sitDrop = pose.sit ? SIT : 0;
  const world = (p: { x: number; y: number }) => {
    const py = p.y - HIP;
    const rx = p.x * Math.cos(lean) - py * Math.sin(lean);
    const ry = p.x * Math.sin(lean) + py * Math.cos(lean) + HIP + bob + sitDrop;
    return { x: x + facing * rx * h, y: y + ry * h };
  };
  return { left: world(left), right: world(right), head: world({ x: 0, y: -0.9 }) };
}

/** A sugad: a little clay pot, marked with haldi and kumkum, with carrots, sugarcane and ber in it. */
export function drawSugad(ctx: Ctx, x: number, y: number, size: number, shade: Shade) {
  const s = size;
  // What sticks out of the mouth.
  ctx.lineCap = "round";
  ctx.strokeStyle = shade([226, 110, 36]);
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y - s * 0.7);
  ctx.lineTo(x - s * 0.22, y - s * 1.1);
  ctx.stroke();
  ctx.strokeStyle = shade([150, 170, 80]);
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.05, y - s * 0.7);
  ctx.lineTo(x + s * 0.12, y - s * 1.25);
  ctx.stroke();
  ctx.fillStyle = shade([200, 150, 40]);
  ctx.beginPath();
  ctx.arc(x + s * 0.18, y - s * 0.78, s * 0.08, 0, TAU);
  ctx.fill();
  // The pot, and its lid turned up.
  ctx.fillStyle = shade([176, 88, 48]);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.28, y - s * 0.66);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.5, x - s * 0.5, y, x, y);
  ctx.bezierCurveTo(x + s * 0.5, y, x + s * 0.6, y - s * 0.5, x + s * 0.28, y - s * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade([130, 60, 34]);
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.66, s * 0.3, s * 0.07, 0, 0, TAU);
  ctx.fill();
  // Haldi and kumkum dabbed on its belly, and a cotton thread round the neck.
  ctx.fillStyle = shade([240, 190, 30]);
  ctx.beginPath();
  ctx.arc(x - s * 0.14, y - s * 0.34, s * 0.06, 0, TAU);
  ctx.fill();
  ctx.fillStyle = shade([200, 20, 40]);
  ctx.beginPath();
  ctx.arc(x + s * 0.12, y - s * 0.34, s * 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = shade([250, 246, 236]);
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.34, y - s * 0.56);
  ctx.quadraticCurveTo(x, y - s * 0.48, x + s * 0.34, y - s * 0.56);
  ctx.stroke();
}
