// A procedural painting of Durga's face in the Kumartuli "bangla mukh" style: a broad
// forehead tapering to a small chin, long potol-chera eyes that sweep to the temples,
// chandan dots above the brows, varnished clay, a tiered shola mukut framed in silver
// daker saaj, kaan-pasha chains, and a Banarasi border.
// Replace it with real art via `lib/pratima.ts`; nothing else depends on how this looks.
//
// Everything is drawn in 1024-unit painting coordinates onto a 2048px canvas.
import { TAU, mulberry32 } from "@/lib/math";
import {
  CROWN_BASE,
  CROWN_TOP,
  CX,
  EYES,
  RES,
  S,
  FACE_BOTTOM,
  FACE_TOP,
  crownHalfWidth,
  crownPath,
  dot,
  ellipse,
  faceHalfWidth,
  facePath,
  hairline,
  radial,
  drawGrain,
  taperedStroke,
  type Ctx,
} from "./layout";

const GOLD = "#d8a23e";
const GOLD_LIGHT = "#f3cf73";
const GOLD_DARK = "#7d4f16";
const SHOLA = "#f4ecdb";
const SILVER = "#c9cdd3";
const SINDOOR = "#b3140d";
const HAIR_INK = "#0b0705";
const KOHL = "#080403";
const EMERALD = "#1d6a3a";

// ─── Parts of the painting ────────────────────────────────────────────────────

/** Point on a cubic Bézier. */
function bez(t: number, a: number, b: number, c: number, d: number) {
  return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
}

/** A kolka (paisley) drop, pointing up, `h` tall. */
function kolkaPath(ctx: Ctx, h: number, w: number, curl = 0.25) {
  ctx.beginPath();
  ctx.moveTo(w * curl, -h * 0.5);
  ctx.bezierCurveTo(w * 0.9, -h * 0.12, w * 0.75, h * 0.5, 0, h * 0.5);
  ctx.bezierCurveTo(-w * 0.75, h * 0.5, -w * 0.9, -h * 0.12, w * curl, -h * 0.5);
  ctx.closePath();
}

/**
 * Daker saaj: the silver-foil and shola lace that frames a Kumartuli crown, fanning out
 * behind it in pointed kolkas, with tassels of pearl where it meets the hair.
 */
function drawDakerAureole(ctx: Ctx) {
  const random = mulberry32(41);
  const cy = CROWN_BASE;
  // The pointed rays, two layers.
  for (const [count, r0, len, fill] of [
    [30, 262, 76, "#d9dde2"],
    [30, 256, 58, "#fbf6ea"],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const offset = fill === "#fbf6ea" ? 0.5 : 0;
      const a = Math.PI + ((i + 0.5 + offset) / (count + offset)) * Math.PI;
      ctx.save();
      ctx.translate(CX + Math.cos(a) * (r0 + len / 2), cy + Math.sin(a) * (r0 + len / 2));
      ctx.rotate(a + Math.PI / 2);
      const w = (Math.PI * (r0 + len / 2)) / count;
      kolkaPath(ctx, len, w * 0.95, 0);
      const foil = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      foil.addColorStop(0, fill);
      foil.addColorStop(0.5, "#ffffff");
      foil.addColorStop(1, fill === "#fbf6ea" ? "#e9e1cc" : "#a9b0b9");
      ctx.fillStyle = foil;
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // Silver filigree inside each ray, and a sequin.
      ctx.strokeStyle = "rgba(140, 146, 156, 0.7)";
      ctx.lineWidth = 0.9;
      kolkaPath(ctx, len * 0.62, w * 0.55, 0);
      ctx.stroke();
      dot(ctx, 0, len * 0.08, 2.6, random() > 0.5 ? SINDOOR : EMERALD);
      ctx.restore();
    }
  }
  // A lace band behind the crown's rim.
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, cy, 272, Math.PI, TAU);
  ctx.arc(CX, cy, 236, TAU, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = SHOLA;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = "rgba(150, 156, 166, 0.8)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 48; i++) {
    const a = Math.PI + ((i + 0.5) / 48) * Math.PI;
    ellipse(ctx, CX + Math.cos(a) * 254, cy + Math.sin(a) * 254, 9, 9);
    ctx.stroke();
    dot(ctx, CX + Math.cos(a) * 254, cy + Math.sin(a) * 254, 2, GOLD);
  }
  ctx.restore();
  for (const [r, width, color] of [
    [272, 3, GOLD],
    [236, 2, GOLD_DARK],
  ] as const) {
    ctx.beginPath();
    ctx.arc(CX, cy, r, Math.PI, TAU);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  // Pearl tassels where the lace ends at either side.
  for (const side of [-1, 1]) {
    const x = CX + side * 300;
    dot(ctx, x, cy + 4, 9, GOLD);
    dot(ctx, x, cy + 4, 4.5, SINDOOR);
    for (let k = -1; k <= 1; k++) {
      const length = 66 + (k === 0 ? 22 : 0);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, cy + 10);
      ctx.lineTo(x + k * 10, cy + 10 + length);
      ctx.stroke();
      for (let t = 0.18; t <= 1; t += 0.2) dot(ctx, x + k * 10 * t, cy + 10 + length * t, 2.6, "#fbf6ea");
      dot(ctx, x + k * 10, cy + 14 + length, 4.2, k === 0 ? SINDOOR : GOLD_LIGHT);
    }
  }
}

function drawHair(ctx: Ctx) {
  ctx.fillStyle = HAIR_INK;
  ctx.beginPath();
  ctx.moveTo(CX, 250);
  ctx.bezierCurveTo(CX + 250, 250, CX + 350, 430, CX + 338, 640);
  ctx.bezierCurveTo(CX + 330, 820, CX + 380, 930, CX + 392, S);
  ctx.lineTo(CX - 392, S);
  ctx.bezierCurveTo(CX - 380, 930, CX - 330, 820, CX - 338, 640);
  ctx.bezierCurveTo(CX - 350, 430, CX - 250, 250, CX, 250);
  ctx.fill();

  // Fine lighter strands, so the mass reads as hair and not as a hole.
  ctx.save();
  ctx.clip();
  const random = mulberry32(3);
  ctx.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? 1 : -1;
    const x0 = CX + side * (220 + random() * 110);
    const y0 = 360 + random() * 200;
    ctx.strokeStyle = `rgba(90, 60, 45, ${0.12 + random() * 0.16})`;
    ctx.lineWidth = 1 + random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + side * 30, y0 + 160, x0 + side * (10 + random() * 30), y0 + 320, x0 + side * (20 + random() * 50), y0 + 480 + random() * 120);
    ctx.stroke();
  }
  // Loose waves catching the light, as jute hair does.
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1;
    const x0 = CX + side * (250 + random() * 70);
    ctx.strokeStyle = `rgba(150, 110, 80, ${0.14 + random() * 0.1})`;
    ctx.lineWidth = 2 + random() * 2;
    ctx.beginPath();
    for (let y = 380; y < S; y += 8) {
      const drift = side * (y - 380) * 0.1;
      ctx.lineTo(x0 + drift + Math.sin(y * 0.03 + i) * 10, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawSaree(ctx: Ctx) {
  const random = mulberry32(21);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(90, S);
  ctx.bezierCurveTo(170, 930, 330, 890, 430, 884);
  ctx.lineTo(594, 884);
  ctx.bezierCurveTo(694, 890, 854, 930, 934, S);
  ctx.closePath();
  const silk = ctx.createLinearGradient(0, 880, 0, S);
  silk.addColorStop(0, "#a3150f");
  silk.addColorStop(1, "#5c0906");
  ctx.fillStyle = silk;
  ctx.fill();
  ctx.clip();
  // Gold zari butis scattered on the silk.
  for (let i = 0; i < 70; i++) {
    const x = 120 + random() * 780;
    const y = 900 + random() * 130;
    ctx.fillStyle = `rgba(230, 180, 80, ${0.5 + random() * 0.4})`;
    ellipse(ctx, x, y, 3, 5, random() * Math.PI);
    ctx.fill();
  }
  ctx.restore();

  // The Banarasi border along the neckline: gold edges round a red band of zari kolkas.
  const neckline = () => {
    ctx.beginPath();
    ctx.moveTo(110, S);
    ctx.bezierCurveTo(190, 940, 340, 900, 430, 898);
    ctx.lineTo(594, 898);
    ctx.bezierCurveTo(684, 900, 834, 940, 914, S);
  };
  ctx.lineCap = "butt";
  for (const [width, color] of [
    [48, GOLD_DARK],
    [44, GOLD],
    [30, "#7a0a08"],
    [2, GOLD_LIGHT],
  ] as const) {
    neckline();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  // Kolkas along the band, each tilted to follow the curve.
  const along: [number, number, number][] = [];
  for (const [p0, p1, p2, p3] of [
    [[110, S], [190, 940], [340, 900], [430, 898]],
    [[594, 898], [684, 900], [834, 940], [914, S]],
  ] as const) {
    for (let t = 0.03; t < 1; t += 0.085) {
      const x = bez(t, p0[0], p1[0], p2[0], p3[0]);
      const y = bez(t, p0[1], p1[1], p2[1], p3[1]);
      const dx = bez(t + 0.01, p0[0], p1[0], p2[0], p3[0]) - x;
      const dy = bez(t + 0.01, p0[1], p1[1], p2[1], p3[1]) - y;
      along.push([x, y, Math.atan2(dy, dx)]);
    }
  }
  for (let x = 446; x <= 580; x += 26) along.push([x, 898, 0]);
  along.forEach(([x, y, angle], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    kolkaPath(ctx, 20, 12, 0.3);
    ctx.fillStyle = i % 2 ? GOLD_LIGHT : GOLD;
    ctx.fill();
    dot(ctx, 0, 3, 2, i % 2 ? SINDOOR : EMERALD);
    ctx.restore();
  });
  for (const offset of [-18, 18]) {
    ctx.save();
    ctx.translate(0, offset * 0.8);
    neckline();
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]);
}

function skinGradient(ctx: Ctx) {
  const skin = ctx.createRadialGradient(CX, 500, 30, CX, 560, 330);
  skin.addColorStop(0, "#f6cf6a");
  skin.addColorStop(0.55, "#e8ae45");
  skin.addColorStop(1, "#b9761f");
  return skin;
}

function drawNeck(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(428, 740);
  ctx.quadraticCurveTo(436, 830, 404, 900);
  ctx.lineTo(620, 900);
  ctx.quadraticCurveTo(588, 830, 596, 740);
  ctx.closePath();
  ctx.fillStyle = skinGradient(ctx);
  ctx.fill();
  // The chin's shadow on the neck.
  ctx.save();
  ctx.clip();
  radial(ctx, CX, 790, 120, [
    [0, "rgba(120, 50, 10, 0.45)"],
    [1, "rgba(120, 50, 10, 0)"],
  ]);
  ctx.restore();
}

function drawFace(ctx: Ctx) {
  facePath(ctx);
  ctx.fillStyle = skinGradient(ctx);
  ctx.fill();

  ctx.save();
  facePath(ctx);
  ctx.clip();
  // Temples and jaw fall into shadow; brow, nose and chin catch the light.
  for (const side of [-1, 1]) {
    radial(ctx, CX + side * 250, 520, 190, [
      [0, "rgba(140, 60, 10, 0.5)"],
      [1, "rgba(140, 60, 10, 0)"],
    ]);
    radial(ctx, CX + side * 128, 600, 86, [
      [0, "rgba(226, 88, 40, 0.3)"],
      [1, "rgba(226, 88, 40, 0)"],
    ]);
    radial(ctx, CX + side * 96, 470, 90, [
      [0, "rgba(120, 50, 10, 0.18)"],
      [1, "rgba(120, 50, 10, 0)"],
    ]);
  }
  radial(ctx, CX, 380, 150, [
    [0, "rgba(255, 238, 180, 0.35)"],
    [1, "rgba(255, 238, 180, 0)"],
  ]);
  radial(ctx, CX, 770, 60, [
    [0, "rgba(255, 232, 170, 0.3)"],
    [1, "rgba(255, 232, 170, 0)"],
  ]);
  // The varnish (gorjon tel) that makes a finished pratima shine.
  ctx.globalCompositeOperation = "screen";
  for (const [x, y, r, a] of [
    [CX - 118, 548, 58, 0.32],
    [CX + 132, 552, 44, 0.16],
    [CX - 70, 372, 50, 0.2],
    [CX - 6, 598, 16, 0.4],
    [CX - 12, 764, 34, 0.28],
  ] as const) {
    radial(ctx, x, y, r, [
      [0, `rgba(255, 244, 214, ${a})`],
      [1, "rgba(255, 244, 214, 0)"],
    ]);
  }
  ctx.globalCompositeOperation = "source-over";

  // Nose: a shadow down one side of the bridge and a highlight down the other.
  const bridge = ctx.createLinearGradient(CX - 34, 0, CX + 24, 0);
  bridge.addColorStop(0, "rgba(140, 62, 12, 0)");
  bridge.addColorStop(0.45, "rgba(140, 62, 12, 0.32)");
  bridge.addColorStop(0.62, "rgba(255, 236, 170, 0.35)");
  bridge.addColorStop(1, "rgba(255, 236, 170, 0)");
  ctx.fillStyle = bridge;
  ctx.fillRect(CX - 34, 450, 58, 150);

  // Hair over the brow, dipping to the temples, with the parting in the middle.
  ctx.fillStyle = HAIR_INK;
  ctx.beginPath();
  ctx.moveTo(CX - 240, 250);
  for (let x = CX - 240; x <= CX + 240; x += 4) ctx.lineTo(x, hairline(x));
  ctx.lineTo(CX + 240, 250);
  ctx.closePath();
  ctx.fill();

  // A soft inner shadow round the edge, so the face reads as modelled clay.
  ctx.beginPath();
  ctx.rect(-200, -200, S + 400, S + 400);
  for (let y = FACE_TOP; y <= FACE_BOTTOM; y += 2) ctx.lineTo(CX + faceHalfWidth(y), y);
  for (let y = FACE_BOTTOM; y >= FACE_TOP; y -= 2) ctx.lineTo(CX - faceHalfWidth(y), y);
  ctx.closePath();
  ctx.shadowColor = "rgba(100, 38, 4, 0.6)";
  ctx.shadowBlur = 36;
  ctx.fillStyle = "#000";
  ctx.fill("evenodd");
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.restore();

  // Sindoor already in the parting.
  ctx.fillStyle = SINDOOR;
  ctx.beginPath();
  ctx.moveTo(CX - 4, 300);
  ctx.lineTo(CX + 4, 300);
  ctx.lineTo(CX + 3, 342);
  ctx.lineTo(CX - 3, 342);
  ctx.fill();
}

function drawBrowsAndChandan(ctx: Ctx) {
  for (const { cx, dir } of EYES) {
    // A long thin brow, arched like a drawn bow, almost meeting its twin above the nose.
    taperedStroke(ctx, [CX + dir * 22, 432], [cx + dir * 10, 382], [cx + dir * 128, 424], 12, KOHL);

    // Chandan kolka: arcs of white dots over the brow, with a few red ones.
    for (const [lift, count, r] of [
      [26, 13, 3.2],
      [46, 11, 2.6],
    ] as const) {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const x = CX + dir * (34 + t * 160);
        const y = 432 - lift - Math.sin(t * Math.PI) * 40 + t * 18;
        dot(ctx, x, y, r, i % 4 === 2 ? SINDOOR : "#fbf6ea");
      }
    }
  }
}

/** Potol-chera: a long, pointed eye, the outer corner lifting toward the temple. */
function drawEye(ctx: Ctx, cx: number, cy: number, dir: 1 | -1) {
  const inner = [cx - dir * 84, cy + 8] as const;
  const outer = [cx + dir * 104, cy - 20] as const;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(...inner);
    ctx.bezierCurveTo(cx - dir * 40, cy - 58, cx + dir * 50, cy - 56, ...outer);
    ctx.bezierCurveTo(cx + dir * 56, cy + 20, cx - dir * 30, cy + 38, ...inner);
    ctx.closePath();
  };

  shape();
  const white = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
  white.addColorStop(0, "#efe4d0");
  white.addColorStop(0.5, "#fbf6ec");
  white.addColorStop(1, "#efe4d0");
  ctx.fillStyle = white;
  ctx.fill();

  ctx.save();
  shape();
  ctx.clip();
  // A large iris tucked under the upper lid: a steady, forward gaze.
  const ix = cx + dir * 4;
  const iy = cy - 12;
  const iris = ctx.createRadialGradient(ix, iy, 0, ix, iy, 36);
  iris.addColorStop(0, "#040201");
  iris.addColorStop(0.45, "#0c0604");
  iris.addColorStop(0.8, "#3b2415");
  iris.addColorStop(1, "#24140b");
  ellipse(ctx, ix, iy, 34, 36);
  ctx.fillStyle = iris;
  ctx.fill();
  ctx.strokeStyle = "#050302";
  ctx.lineWidth = 2;
  ctx.stroke();
  dot(ctx, ix + dir * 12, iy - 14, 6.5, "rgba(255,255,255,0.92)");
  dot(ctx, ix - dir * 10, iy + 12, 2.5, "rgba(255,255,255,0.5)");
  // Pink at the inner corner, and the upper lid's shadow on the white.
  radial(ctx, inner[0] + dir * 8, inner[1] - 2, 18, [
    [0, "rgba(200, 70, 60, 0.7)"],
    [1, "rgba(200, 70, 60, 0)"],
  ]);
  radial(ctx, outer[0] - dir * 14, outer[1] + 6, 26, [
    [0, "rgba(200, 60, 50, 0.4)"],
    [1, "rgba(200, 60, 50, 0)"],
  ]);
  ctx.fillStyle = "rgba(60, 30, 10, 0.18)";
  ctx.fillRect(cx - 110, cy - 60, 220, 22);
  ctx.restore();

  // Heavy kohl on the upper lid, a fine line below, and the long wing to the temple.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = KOHL;
  ctx.beginPath();
  ctx.moveTo(...inner);
  ctx.bezierCurveTo(cx - dir * 40, cy - 58, cx + dir * 50, cy - 56, ...outer);
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(...outer);
  ctx.bezierCurveTo(cx + dir * 56, cy + 20, cx - dir * 30, cy + 38, ...inner);
  ctx.lineWidth = 3.5;
  ctx.stroke();
  taperedStroke(ctx, [outer[0] - dir * 30, outer[1] + 4], [outer[0] + dir * 20, outer[1] - 4], [outer[0] + dir * 52, outer[1] - 30], 9, KOHL);
  // A fine line of alta red along the lid, as the potters paint it.
  ctx.beginPath();
  ctx.moveTo(cx - dir * 60, cy - 30);
  ctx.bezierCurveTo(cx - dir * 30, cy - 66, cx + dir * 50, cy - 64, outer[0] - dir * 6, outer[1] - 8);
  ctx.strokeStyle = "rgba(190, 30, 20, 0.75)";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // The lid crease, in brown.
  ctx.beginPath();
  ctx.moveTo(cx - dir * 70, cy - 24);
  ctx.bezierCurveTo(cx - dir * 30, cy - 74, cx + dir * 50, cy - 70, cx + dir * 96, cy - 36);
  ctx.strokeStyle = "rgba(90, 40, 12, 0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawThirdEye(ctx: Ctx, cx: number, cy: number) {
  const shape = (grow = 0) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40 - grow);
    ctx.bezierCurveTo(cx + 22 + grow, cy - 16, cx + 22 + grow, cy + 16, cx, cy + 40 + grow);
    ctx.bezierCurveTo(cx - 22 - grow, cy + 16, cx - 22 - grow, cy - 16, cx, cy - 40 - grow);
    ctx.closePath();
  };
  // A red flame around the eye.
  shape(7);
  ctx.fillStyle = SINDOOR;
  ctx.fill();
  shape();
  ctx.fillStyle = "#fbf6ec";
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  const pupil = ctx.createRadialGradient(cx, cy, 0, cx, cy, 13);
  pupil.addColorStop(0, "#040201");
  pupil.addColorStop(0.7, "#1c100a");
  pupil.addColorStop(1, "#3a2314");
  ellipse(ctx, cx, cy, 11, 17);
  ctx.fillStyle = pupil;
  ctx.fill();
  dot(ctx, cx + 4, cy - 6, 3, "rgba(255,255,255,0.9)");
  ctx.restore();
  shape();
  ctx.strokeStyle = KOHL;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawNoseAndMouth(ctx: Ctx) {
  ctx.strokeStyle = "rgba(120, 52, 12, 0.6)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(500, 470);
  ctx.bezierCurveTo(490, 530, 486, 580, 494, 606);
  ctx.stroke();
  // Nostrils and the soft ball of the nose.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 12, 622);
    ctx.quadraticCurveTo(CX + side * 34, 626, CX + side * 38, 608);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(CX - 16, 624);
  ctx.quadraticCurveTo(CX, 632, CX + 16, 624);
  ctx.stroke();

  // Lips: a sharp bow on top, a fuller lower lip, a dark line between.
  const lips = ctx.createLinearGradient(0, 660, 0, 712);
  lips.addColorStop(0, "#9c150f");
  lips.addColorStop(1, "#c8261a");
  ctx.fillStyle = lips;
  ctx.beginPath();
  ctx.moveTo(462, 684);
  ctx.bezierCurveTo(480, 670, 496, 660, 512, 672);
  ctx.bezierCurveTo(528, 660, 544, 670, 562, 684);
  ctx.bezierCurveTo(540, 718, 484, 718, 462, 684);
  ctx.fill();
  ctx.strokeStyle = "#4a0604";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(466, 685);
  ctx.quadraticCurveTo(512, 694, 558, 685);
  ctx.stroke();
  dot(ctx, 498, 701, 5, "rgba(255, 190, 170, 0.45)");
  // A dimple of shadow under the lower lip.
  radial(ctx, CX, 732, 40, [
    [0, "rgba(130, 55, 10, 0.3)"],
    [1, "rgba(130, 55, 10, 0)"],
  ]);
}

function drawNath(ctx: Ctx) {
  // The large nose ring through the left nostril, with pearls and a chain to the hair.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ellipse(ctx, 470, 646, 38, 40);
  ctx.stroke();
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 1.5;
  ellipse(ctx, 470, 646, 38, 40);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.35 + i * 0.12);
    dot(ctx, 470 + Math.cos(a) * 38, 646 + Math.sin(a) * 40, i === 3 ? 6 : 4, i === 3 ? SINDOOR : "#fbf6ea");
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(438, 624);
  ctx.bezierCurveTo(380, 610, 330, 560, 312, 470);
  ctx.stroke();
  for (let t = 0.1; t < 1; t += 0.12) {
    const x = (1 - t) ** 3 * 438 + 3 * (1 - t) ** 2 * t * 380 + 3 * (1 - t) * t * t * 330 + t ** 3 * 312;
    const y = (1 - t) ** 3 * 624 + 3 * (1 - t) ** 2 * t * 610 + 3 * (1 - t) * t * t * 560 + t ** 3 * 470;
    dot(ctx, x, y, 2.4, "#fbf6ea");
  }
}

function drawEarring(ctx: Ctx, x: number, y: number) {
  // Karnaphool: a gold flower on the lobe, and a jhumka bell below it.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.fillStyle = GOLD;
    ellipse(ctx, x + Math.cos(a) * 14, y + Math.sin(a) * 14, 9, 6, a);
    ctx.fill();
  }
  dot(ctx, x, y, 11, GOLD_LIGHT);
  dot(ctx, x, y, 6, SINDOOR);

  const bell = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
  bell.addColorStop(0, GOLD_DARK);
  bell.addColorStop(0.45, GOLD_LIGHT);
  bell.addColorStop(1, GOLD_DARK);
  ctx.fillStyle = bell;
  ctx.beginPath();
  ctx.moveTo(x - 36, y + 86);
  ctx.bezierCurveTo(x - 34, y + 40, x - 14, y + 26, x, y + 26);
  ctx.bezierCurveTo(x + 14, y + 26, x + 34, y + 40, x + 36, y + 86);
  ctx.closePath();
  ctx.fill();
  for (let i = -4; i <= 4; i++) dot(ctx, x + i * 8.5, y + 94, 3.6, i % 2 ? "#fbf6ea" : SINDOOR);
}

/** Kaan-pasha: chains of gold and pearl from the ear up into the crown. */
function drawEarChain(ctx: Ctx, x: number, dir: 1 | -1) {
  for (const [lift, bead] of [
    [0, "#fbf6ea"],
    [18, SINDOOR],
  ] as const) {
    const p0 = [x, 588] as const;
    const p1 = [x + dir * (40 + lift), 520 - lift] as const;
    const p2 = [x + dir * (30 + lift), 410] as const;
    const p3 = [CX + dir * (250 + lift * 0.6), CROWN_BASE + 8] as const;
    ctx.beginPath();
    ctx.moveTo(...p0);
    ctx.bezierCurveTo(...p1, ...p2, ...p3);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let t = 0.06; t < 1; t += 0.07) {
      const bx = bez(t, p0[0], p1[0], p2[0], p3[0]);
      const by = bez(t, p0[1], p1[1], p2[1], p3[1]);
      dot(ctx, bx, by, 3, bead);
    }
  }
}

function drawJewellery(ctx: Ctx) {
  // Chik: a close choker of gold set with red stones.
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(430, 818);
  ctx.quadraticCurveTo(CX, 856, 594, 818);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 22;
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = 430 + t * 164;
    const y = 818 + 38 * 4 * t * (1 - t) * 0.5;
    dot(ctx, x, y, 5, i % 2 ? SINDOOR : EMERALD);
  }

  // Sita haar: three long strands of gold and pearl.
  for (const [r, width, span] of [
    [150, 10, 0.62],
    [196, 12, 0.6],
    [244, 16, 0.58],
  ] as const) {
    const start = (0.5 - span / 2) * Math.PI;
    const end = (0.5 + span / 2) * Math.PI;
    ctx.beginPath();
    ctx.arc(CX, 724, r, start, end);
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = width + 3;
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = width;
    ctx.stroke();
    const beads = Math.round(r / 11);
    for (let i = 0; i <= beads; i++) {
      const a = start + ((end - start) * i) / beads;
      dot(ctx, CX + Math.cos(a) * r, 724 + Math.sin(a) * r, width * 0.32, i % 5 === 0 ? SINDOOR : "#fbf6ea");
    }
    // A pendant at the lowest point.
    dot(ctx, CX, 724 + r + width, width * 0.9, GOLD_LIGHT);
    dot(ctx, CX, 724 + r + width, width * 0.5, SINDOOR);
  }
}

function drawCrown(ctx: Ctx) {
  crownPath(ctx);
  const shola = ctx.createLinearGradient(0, CROWN_TOP, 0, CROWN_BASE);
  shola.addColorStop(0, "#fffaf0");
  shola.addColorStop(1, SHOLA);
  ctx.fillStyle = shola;
  ctx.fill();

  ctx.save();
  crownPath(ctx);
  ctx.clip();
  const random = mulberry32(9);
  const cy = CROWN_BASE;
  const arc = (r: number, width: number, color: string) => {
    ctx.beginPath();
    ctx.arc(CX, cy, r, Math.PI, TAU);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // Outer tier: open shola flowers, petal on petal, each edged in silver daker.
  for (let tier = 2; tier >= 0; tier--) {
    const r = 222 + tier * 34;
    const petals = 26 + tier * 4;
    for (let i = 0; i < petals; i++) {
      const a = Math.PI + ((i + 0.5 + (tier % 2) * 0.5) / petals) * Math.PI;
      ctx.save();
      ctx.translate(CX + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      const len = 40;
      const wid = (Math.PI * r) / petals / 1.5;
      ctx.beginPath();
      ctx.moveTo(0, len * 0.5);
      ctx.bezierCurveTo(wid, len * 0.3, wid * 0.8, -len * 0.4, 0, -len * 0.75);
      ctx.bezierCurveTo(-wid * 0.8, -len * 0.4, -wid, len * 0.3, 0, len * 0.5);
      ctx.fillStyle = tier % 2 ? "#fbf7ee" : "#efe6d2";
      ctx.fill();
      ctx.strokeStyle = SILVER;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(150, 156, 166, 0.55)";
      ctx.lineWidth = 0.8;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(k * wid * 0.2, len * 0.35);
        ctx.lineTo(k * wid * 0.1, -len * 0.5);
        ctx.stroke();
      }
      if (tier === 1) dot(ctx, 0, 0, 3, i % 2 ? GOLD : SINDOOR);
      ctx.restore();
    }
  }
  arc(206, 12, GOLD_DARK);
  arc(206, 8, GOLD);
  for (let i = 0; i < 34; i++) {
    const a = Math.PI + ((i + 0.5) / 34) * Math.PI;
    dot(ctx, CX + Math.cos(a) * 206, cy + Math.sin(a) * 206, 3, i % 3 === 0 ? EMERALD : i % 3 === 1 ? SINDOOR : "#fbf6ea");
  }

  // Middle tier: a ring of silver kolkas on red velvet.
  ctx.beginPath();
  ctx.arc(CX, cy, 200, Math.PI, TAU);
  ctx.lineTo(CX, cy);
  ctx.closePath();
  const velvet = ctx.createRadialGradient(CX, cy, 60, CX, cy, 200);
  velvet.addColorStop(0, "#6e0a10");
  velvet.addColorStop(1, "#9c1119");
  ctx.fillStyle = velvet;
  ctx.fill();
  const kolkas = 15;
  for (let i = 0; i < kolkas; i++) {
    const a = Math.PI + ((i + 0.5) / kolkas) * Math.PI;
    ctx.save();
    ctx.translate(CX + Math.cos(a) * 156, cy + Math.sin(a) * 156);
    ctx.rotate(a + Math.PI / 2);
    kolkaPath(ctx, 74, 38);
    ctx.fillStyle = "#f8f3e8";
    ctx.fill();
    ctx.strokeStyle = SILVER;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.2;
    kolkaPath(ctx, 50, 24);
    ctx.stroke();
    dot(ctx, 0, 10, 5, i % 2 ? SINDOOR : EMERALD);
    dot(ctx, 0, 10, 2, "rgba(255,255,255,0.7)");
    ctx.restore();
  }
  // Gold sequins scattered on the velvet between them.
  for (let i = 0; i < 70; i++) {
    const a = Math.PI + random() * Math.PI;
    const r = 110 + random() * 86;
    dot(ctx, CX + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6 + random(), GOLD_LIGHT);
  }
  arc(112, 10, GOLD_DARK);
  arc(112, 6, GOLD);

  // Inner tier: a sunburst of gold zari.
  ctx.beginPath();
  ctx.arc(CX, cy, 108, Math.PI, TAU);
  ctx.lineTo(CX, cy);
  ctx.closePath();
  ctx.fillStyle = "#fbf6ea";
  ctx.fill();
  for (let i = 0; i < 24; i++) {
    const a = Math.PI + ((i + 0.5) / 24) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a - 0.05) * 30, cy + Math.sin(a - 0.05) * 30);
    ctx.lineTo(CX + Math.cos(a) * 104, cy + Math.sin(a) * 104);
    ctx.lineTo(CX + Math.cos(a + 0.05) * 30, cy + Math.sin(a + 0.05) * 30);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? GOLD : GOLD_LIGHT;
    ctx.fill();
  }

  // Tinsel sparkle.
  for (let i = 0; i < 300; i++) {
    const a = Math.PI + random() * Math.PI;
    const r = 60 + random() * 300;
    dot(ctx, CX + Math.cos(a) * r, cy + Math.sin(a) * r, 0.8 + random() * 1.2, `rgba(255,255,255,${0.4 + random() * 0.5})`);
  }
  // Light from above on the upper tiers, shade toward the brow.
  const light = ctx.createLinearGradient(0, CROWN_TOP, 0, CROWN_BASE);
  light.addColorStop(0, "rgba(255, 250, 235, 0.12)");
  light.addColorStop(1, "rgba(90, 60, 20, 0.14)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, S, CROWN_BASE + 30);
  ctx.restore();

  // Scalloped silver edge with a bead at each scallop.
  crownPath(ctx);
  ctx.strokeStyle = SILVER;
  ctx.lineWidth = 6;
  ctx.stroke();
  crownPath(ctx);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let y = CROWN_TOP + 14; y < CROWN_BASE - 6; y += 18) {
    for (const side of [-1, 1]) dot(ctx, CX + side * crownHalfWidth(y), y, 3.4, "#fbf6ea");
  }

  // The gold band that sits on the brow, set with stones, with a pearl fringe below.
  ctx.beginPath();
  ctx.moveTo(CX - 238, CROWN_BASE - 6);
  ctx.quadraticCurveTo(CX, CROWN_BASE + 34, CX + 238, CROWN_BASE - 6);
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 26;
  ctx.stroke();
  const band = ctx.createLinearGradient(0, CROWN_BASE - 16, 0, CROWN_BASE + 24);
  band.addColorStop(0, GOLD_LIGHT);
  band.addColorStop(0.5, GOLD);
  band.addColorStop(1, GOLD_DARK);
  ctx.strokeStyle = band;
  ctx.lineWidth = 20;
  ctx.stroke();
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = CX - 238 + t * 476;
    const y = CROWN_BASE - 6 + 40 * t * (1 - t);
    dot(ctx, x, y, i % 2 ? 4 : 6, i % 2 ? "#fbf6ea" : i % 4 === 0 ? EMERALD : SINDOOR);
    if (i % 2 === 0) dot(ctx, x - 1.5, y - 2, 1.6, "rgba(255,255,255,0.7)");
  }
  // The fringe hangs only over the hair at the temples, clear of the face.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = CX + side * (206 + i * 7);
      const t = (x - (CX - 238)) / 476;
      const y = CROWN_BASE - 6 + 40 * t * (1 - t) + 12;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 18 + (i % 2) * 8);
      ctx.stroke();
      dot(ctx, x, y + 20 + (i % 2) * 8, 2.8, i % 2 ? SINDOOR : "#fbf6ea");
    }
  }

  // The crest: a tall gold kolka set with a ruby and edged in pearls.
  ctx.save();
  ctx.translate(CX, 196);
  kolkaPath(ctx, 196, 78, 0);
  const crest = ctx.createLinearGradient(-40, 0, 40, 0);
  crest.addColorStop(0, GOLD_DARK);
  crest.addColorStop(0.45, GOLD_LIGHT);
  crest.addColorStop(1, GOLD);
  ctx.fillStyle = crest;
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  for (let t = 0.04; t < 1; t += 0.06) {
    const x = bez(t, 0, 78 * 0.9, 78 * 0.75, 0);
    const y = bez(t, -98, -196 * 0.12 - 0, 98, 98);
    dot(ctx, x, y, 2.8, "#fbf6ea");
    dot(ctx, -x, y, 2.8, "#fbf6ea");
  }
  kolkaPath(ctx, 120, 46, 0);
  ctx.fillStyle = "#8e0f16";
  ctx.fill();
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 0, 18, 18, 26);
  const ruby = ctx.createRadialGradient(-5, 8, 2, 0, 18, 26);
  ruby.addColorStop(0, "#ff6a5a");
  ruby.addColorStop(0.4, SINDOOR);
  ruby.addColorStop(1, "#5a0605");
  ctx.fillStyle = ruby;
  ctx.fill();
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 3;
  ctx.stroke();
  dot(ctx, 0, -38, 7, EMERALD);
  dot(ctx, -2, -40, 2, "rgba(255,255,255,0.7)");
  dot(ctx, -6, 8, 4, "rgba(255,230,220,0.75)");
  ctx.restore();
  // The finial at the very top.
  dot(ctx, CX, CROWN_TOP + 4, 9, GOLD);
  dot(ctx, CX, CROWN_TOP + 4, 4, SINDOOR);
}

function drawTikli(ctx: Ctx) {
  // A small maang tikka hanging from the parting to just above the third eye.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, 344);
  ctx.lineTo(CX, 350);
  ctx.stroke();
  dot(ctx, CX, 350, 5, GOLD_LIGHT);
}

export function drawBengal(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(RES / S, RES / S);

  drawDakerAureole(ctx);
  drawHair(ctx);
  drawSaree(ctx);
  drawNeck(ctx);
  drawFace(ctx);
  drawBrowsAndChandan(ctx);
  for (const { cx, cy, dir } of EYES) drawEye(ctx, cx, cy, dir);
  drawThirdEye(ctx, CX, 392);
  dot(ctx, CX, 446, 8, SINDOOR);
  drawNoseAndMouth(ctx);
  drawNath(ctx);
  drawEarChain(ctx, 286, -1);
  drawEarChain(ctx, 738, 1);
  drawEarring(ctx, 286, 600);
  drawEarring(ctx, 738, 600);
  drawJewellery(ctx);
  drawCrown(ctx);
  drawTikli(ctx);

  // Grain only where there is paint: keep the transparent background clean.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  drawGrain(ctx);
  ctx.restore();

  return canvas;
}

