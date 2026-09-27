// Durga in the Madhubani (Mithila) style: every form drawn with a double black outline,
// filled with flat colour (bharni) or fine hatching (kachni), and no space left empty.
// Behind her head, a prabhamandal of lotus petals; fish, the Mithila sign of plenty, on her
// saree and hanging from her ears; lotus buds all round the crown.
import { TAU } from "@/lib/math";
import {
  CROWN_BASE,
  CROWN_TOP,
  CX,
  EYES,
  RES,
  S,
  crownHalfWidth,
  crownPath,
  dot,
  drawGrain,
  FACE_BOTTOM,
  faceHalfWidth,
  facePath,
  hairline,
  taperedStroke,
  type Ctx,
} from "./layout";

const INK = "#15100c";
const PAPER = "#f3e3bf";
const HALDI = "#f4bd1d";
const KUSUM = "#d21f2b";
const PINK = "#e8578a";
const LEAF = "#2f8a3e";
const INDIGO = "#274b9c";
const ORANGE = "#ef7b1c";

const HALO = { x: CX, y: 404, r: 392 };

type PathFn = () => void;

/** The Mithila double line: two black lines with a thin band of colour between them. */
function outline(ctx: Ctx, path: PathFn, width = 10, gap = 3.5, between = PAPER) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
  path();
  ctx.strokeStyle = between;
  ctx.lineWidth = gap;
  ctx.stroke();
}

function fillPath(ctx: Ctx, path: PathFn, color: string) {
  path();
  ctx.fillStyle = color;
  ctx.fill();
}

function inkDot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  dot(ctx, x, y, r + 1.6, INK);
  dot(ctx, x, y, r, color);
}

function fish(ctx: Ctx, x: number, y: number, size: number, dir: 1 | -1, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * size, size);
  const body: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.bezierCurveTo(-20, -24, 22, -22, 36, 0);
    ctx.bezierCurveTo(22, 22, -20, 24, -40, 0);
    ctx.closePath();
  };
  fillPath(ctx, body, color);
  // Scales.
  ctx.save();
  body();
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  for (let sx = -24; sx < 20; sx += 9) {
    for (let sy = -18; sy < 20; sy += 9) {
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
  outline(ctx, body, 5, 1.6);
  // Tail.
  const tail: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(34, 0);
    ctx.lineTo(56, -16);
    ctx.lineTo(52, 0);
    ctx.lineTo(56, 16);
    ctx.closePath();
  };
  fillPath(ctx, tail, KUSUM);
  outline(ctx, tail, 4, 1.2);
  inkDot(ctx, -26, -4, 4, PAPER);
  dot(ctx, -26, -4, 1.8, INK);
  ctx.restore();
}

function drawHalo(ctx: Ctx) {
  const { x, y, r } = HALO;
  const circle = (radius: number) => () => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
  };
  fillPath(ctx, circle(r), PAPER);

  // A band of sun-ray teeth around the rim.
  const teeth = 64;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * TAU;
    const a1 = ((i + 1) / teeth) * TAU;
    const am = (a0 + a1) / 2;
    const tri: PathFn = () => {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a0) * (r - 12), y + Math.sin(a0) * (r - 12));
      ctx.lineTo(x + Math.cos(am) * (r - 48), y + Math.sin(am) * (r - 48));
      ctx.lineTo(x + Math.cos(a1) * (r - 12), y + Math.sin(a1) * (r - 12));
      ctx.closePath();
    };
    fillPath(ctx, tri, i % 2 ? KUSUM : HALDI);
    tri();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    dot(ctx, x + Math.cos(am) * (r - 24), y + Math.sin(am) * (r - 24), 2.6, i % 2 ? HALDI : KUSUM);
  }
  outline(ctx, circle(r - 6), 8, 3);
  outline(ctx, circle(r - 52), 8, 3);

  // A ring of lotus petals.
  const petals = 30;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU;
    ctx.save();
    ctx.translate(x + Math.cos(a) * (r - 96), y + Math.sin(a) * (r - 96));
    ctx.rotate(a + Math.PI / 2);
    const petal: PathFn = () => {
      ctx.beginPath();
      ctx.moveTo(0, 38);
      ctx.bezierCurveTo(26, 16, 18, -24, 0, -40);
      ctx.bezierCurveTo(-18, -24, -26, 16, 0, 38);
      ctx.closePath();
    };
    fillPath(ctx, petal, i % 2 ? PINK : ORANGE);
    // Bharni: a second petal inside the first, and hatching between.
    const inner: PathFn = () => {
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.bezierCurveTo(14, 10, 10, -14, 0, -24);
      ctx.bezierCurveTo(-10, -14, -14, 10, 0, 26);
      ctx.closePath();
    };
    fillPath(ctx, inner, i % 2 ? KUSUM : HALDI);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    inner();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, -18);
    ctx.stroke();
    outline(ctx, petal, 5, 1.6);
    ctx.restore();
  }
  outline(ctx, circle(r - 142), 8, 3);

  // Fill the field inside with a lattice of red dots.
  ctx.save();
  circle(r - 146)();
  ctx.clip();
  for (let gy = y - r; gy < y + r; gy += 22) {
    for (let gx = x - r + ((gy / 22) % 2) * 11; gx < x + r; gx += 22) dot(ctx, gx, gy, 3, KUSUM);
  }
  ctx.restore();
}

function hairPath(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(CX, 250);
  ctx.bezierCurveTo(CX + 250, 250, CX + 350, 430, CX + 338, 640);
  ctx.bezierCurveTo(CX + 330, 820, CX + 380, 930, CX + 392, S);
  ctx.lineTo(CX - 392, S);
  ctx.bezierCurveTo(CX - 380, 930, CX - 330, 820, CX - 338, 640);
  ctx.bezierCurveTo(CX - 350, 430, CX - 250, 250, CX, 250);
  ctx.closePath();
}

function drawHair(ctx: Ctx) {
  fillPath(ctx, () => hairPath(ctx), INK);
  // Long wavy strands in cream, the Mithila way of drawing hair.
  ctx.save();
  hairPath(ctx);
  ctx.clip();
  ctx.strokeStyle = "rgba(243, 227, 191, 0.55)";
  ctx.lineWidth = 1.6;
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 0; k < 12; k++) {
      const x0 = CX + side * (230 + k * 12);
      ctx.beginPath();
      for (let yy = 300; yy <= S; yy += 6) ctx.lineTo(x0 + side * (yy - 300) * 0.08 + Math.sin(yy * 0.05 + k) * 5, yy);
      ctx.stroke();
    }
  }
  ctx.restore();
  outline(ctx, () => hairPath(ctx), 9, 3);
}

function sareePath(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(90, S);
  ctx.bezierCurveTo(170, 930, 330, 890, 430, 884);
  ctx.lineTo(594, 884);
  ctx.bezierCurveTo(694, 890, 854, 930, 934, S);
  ctx.closePath();
}

function drawSaree(ctx: Ctx) {
  fillPath(ctx, () => sareePath(ctx), KUSUM);
  ctx.save();
  sareePath(ctx);
  ctx.clip();
  // Rows of little yellow triangles over the red.
  for (let yy = 910; yy < S; yy += 26) {
    for (let xx = 80 + ((yy / 26) % 2) * 13; xx < 950; xx += 26) {
      ctx.beginPath();
      ctx.moveTo(xx, yy - 7);
      ctx.lineTo(xx + 7, yy + 6);
      ctx.lineTo(xx - 7, yy + 6);
      ctx.closePath();
      ctx.fillStyle = HALDI;
      ctx.fill();
    }
  }
  ctx.restore();
  fish(ctx, 250, 972, 1.05, 1, HALDI);
  fish(ctx, 774, 972, 1.05, -1, HALDI);

  // A green border at the neckline.
  const border: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(110, S);
    ctx.bezierCurveTo(190, 940, 340, 900, 430, 896);
    ctx.lineTo(594, 896);
    ctx.bezierCurveTo(684, 900, 834, 940, 914, S);
  };
  outline(ctx, border, 30, 22, LEAF);
  border();
  ctx.setLineDash([2, 12]);
  ctx.strokeStyle = HALDI;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.setLineDash([]);
  outline(ctx, () => sareePath(ctx), 9, 3);
}

function drawNeck(ctx: Ctx) {
  const neck: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(428, 740);
    ctx.quadraticCurveTo(436, 830, 404, 900);
    ctx.lineTo(620, 900);
    ctx.quadraticCurveTo(588, 830, 596, 740);
    ctx.closePath();
  };
  fillPath(ctx, neck, HALDI);
  outline(ctx, neck, 8, 3);
}

function drawFace(ctx: Ctx) {
  fillPath(ctx, () => facePath(ctx), HALDI);

  // Hair over the brow.
  const brow: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 206, hairline(CX - 206));
    for (let x = CX - 206; x <= CX + 206; x += 4) ctx.lineTo(x, hairline(x));
    ctx.lineTo(CX + 206, 280);
    ctx.lineTo(CX - 206, 280);
    ctx.closePath();
  };
  ctx.save();
  facePath(ctx);
  ctx.clip();
  fillPath(ctx, brow, INK);
  // Kachni: fine parallel strokes of red along the edge of the face, in place of shading.
  ctx.strokeStyle = "rgba(210, 31, 43, 0.75)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let y = 440; y <= FACE_BOTTOM - 8; y += 7) {
    const hw = faceHalfWidth(y);
    for (const side of [-1, 1]) {
      const x = CX + side * hw;
      ctx.beginPath();
      ctx.moveTo(x - side * 4, y);
      ctx.lineTo(x - side * (18 + 6 * Math.sin(y * 0.05)), y + 5);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = KUSUM;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let y = 430; y <= FACE_BOTTOM; y += 3) ctx.lineTo(CX + faceHalfWidth(y) - 26 * (faceHalfWidth(y) / 222), y - 6);
  ctx.stroke();
  ctx.beginPath();
  for (let y = 430; y <= FACE_BOTTOM; y += 3) ctx.lineTo(CX - faceHalfWidth(y) + 26 * (faceHalfWidth(y) / 222), y - 6);
  ctx.stroke();
  // A flower of dots high on each cheek.
  for (const side of [-1, 1]) {
    const x = CX + side * 132;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      dot(ctx, x + Math.cos(a) * 9, 588 + Math.sin(a) * 9, 3.2, KUSUM);
    }
    dot(ctx, x, 588, 3.4, ORANGE);
  }
  ctx.restore();

  ctx.beginPath();
  for (let x = CX - 206; x <= CX + 206; x += 4) ctx.lineTo(x, hairline(x));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  outline(ctx, () => facePath(ctx), 10, 3.5);

  // Sindoor in the parting.
  ctx.fillStyle = KUSUM;
  ctx.fillRect(CX - 4, 300, 8, 44);

  // Three lines across the throat, as Mithila painters draw a neck.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const yy of [770, 792]) {
    ctx.beginPath();
    ctx.moveTo(CX - 70, yy);
    ctx.quadraticCurveTo(CX, yy + 14, CX + 70, yy);
    ctx.stroke();
  }
}

function drawEye(ctx: Ctx, cx: number, cy: number, dir: 1 | -1) {
  const inner = [cx - dir * 84, cy + 8] as const;
  const outer = [cx + dir * 104, cy - 20] as const;
  const shape: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(...inner);
    ctx.bezierCurveTo(cx - dir * 40, cy - 60, cx + dir * 50, cy - 58, ...outer);
    ctx.bezierCurveTo(cx + dir * 56, cy + 22, cx - dir * 30, cy + 40, ...inner);
    ctx.closePath();
  };
  fillPath(ctx, shape, "#fffaf0");
  ctx.save();
  shape();
  ctx.clip();
  dot(ctx, cx + dir * 4, cy - 10, 34, INK);
  dot(ctx, cx + dir * 4, cy - 10, 26, INDIGO);
  dot(ctx, cx + dir * 4, cy - 10, 16, INK);
  dot(ctx, cx + dir * 12, cy - 20, 6, "#fffaf0");
  ctx.restore();
  outline(ctx, shape, 9, 2.5);

  // Lashes along the upper lid.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const x = (1 - t) ** 3 * inner[0] + 3 * (1 - t) ** 2 * t * (cx - dir * 40) + 3 * (1 - t) * t * t * (cx + dir * 50) + t ** 3 * outer[0];
    const y = (1 - t) ** 3 * inner[1] + 3 * (1 - t) ** 2 * t * (cy - 60) + 3 * (1 - t) * t * t * (cy - 58) + t ** 3 * outer[1];
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + dir * 4, y - 16);
    ctx.stroke();
  }
  // The long kohl tail.
  taperedStroke(ctx, [outer[0] - dir * 24, outer[1] + 4], [outer[0] + dir * 20, outer[1] - 4], [outer[0] + dir * 54, outer[1] - 34], 10, INK);

  // A heavy brow with a second, finer line above it.
  taperedStroke(ctx, [CX + dir * 22, 430], [cx + dir * 10, 378], [cx + dir * 128, 420], 18, INK);
  ctx.beginPath();
  ctx.moveTo(CX + dir * 36, 410);
  ctx.quadraticCurveTo(cx + dir * 10, 362, cx + dir * 118, 398);
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawThirdEye(ctx: Ctx, cx: number, cy: number) {
  const shape: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40);
    ctx.bezierCurveTo(cx + 24, cy - 16, cx + 24, cy + 16, cx, cy + 40);
    ctx.bezierCurveTo(cx - 24, cy + 16, cx - 24, cy - 16, cx, cy - 40);
    ctx.closePath();
  };
  fillPath(ctx, shape, "#fffaf0");
  ctx.save();
  shape();
  ctx.clip();
  dot(ctx, cx, cy, 13, INK);
  dot(ctx, cx, cy, 8, KUSUM);
  dot(ctx, cx + 3, cy - 4, 2.5, "#fffaf0");
  ctx.restore();
  outline(ctx, shape, 8, 3, KUSUM);
}

function drawFeatures(ctx: Ctx) {
  // The nose as one long line from the brow, hooking at the nostril.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(504, 440);
  ctx.bezierCurveTo(492, 520, 484, 580, 494, 612);
  ctx.quadraticCurveTo(504, 626, 526, 616);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(540, 612, 8, Math.PI * 0.9, Math.PI * 2.1);
  ctx.stroke();

  inkDot(ctx, CX, 446, 9, KUSUM);

  const lips: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(464, 684);
    ctx.bezierCurveTo(482, 668, 498, 660, 512, 672);
    ctx.bezierCurveTo(526, 660, 542, 668, 560, 684);
    ctx.bezierCurveTo(538, 716, 486, 716, 464, 684);
    ctx.closePath();
  };
  fillPath(ctx, lips, KUSUM);
  outline(ctx, lips, 6, 1.8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(468, 685);
  ctx.quadraticCurveTo(512, 694, 556, 685);
  ctx.stroke();

  // Nath.
  outline(ctx, () => {
    ctx.beginPath();
    ctx.arc(472, 648, 38, 0, TAU);
  }, 8, 3, HALDI);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.35 + i * 0.14);
    inkDot(ctx, 472 + Math.cos(a) * 38, 648 + Math.sin(a) * 38, 4.5, i % 2 ? KUSUM : PAPER);
  }
}

function drawEarring(ctx: Ctx, x: number, y: number) {
  // A lotus stud, and below it a fish hanging nose-down: the Mithila sign of luck.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    inkDot(ctx, x + Math.cos(a) * 16, y + Math.sin(a) * 16, 6, i % 2 ? KUSUM : HALDI);
  }
  inkDot(ctx, x, y, 10, LEAF);
  dot(ctx, x, y, 3.5, HALDI);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 22);
  ctx.lineTo(x, y + 34);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y + 86);
  ctx.rotate(-Math.PI / 2);
  fish(ctx, 0, 0, 1, -1, HALDI);
  ctx.restore();
  for (let i = -2; i <= 2; i++) inkDot(ctx, x + i * 10, y + 150 - Math.abs(i) * 5, 3.4, i % 2 ? KUSUM : LEAF);
}

function drawJewellery(ctx: Ctx) {
  // Hansuli: a solid crescent collar, hatched in red and edged with beads.
  const hansuli: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(414, 802);
    ctx.quadraticCurveTo(CX, 846, 610, 802);
    ctx.quadraticCurveTo(CX, 912, 414, 802);
    ctx.closePath();
  };
  fillPath(ctx, hansuli, HALDI);
  ctx.save();
  hansuli();
  ctx.clip();
  ctx.strokeStyle = KUSUM;
  ctx.lineWidth = 2;
  for (let x = 400; x < 620; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 800);
    ctx.lineTo(x + 14, 880);
    ctx.stroke();
  }
  ctx.restore();
  outline(ctx, hansuli, 6, 2);
  inkDot(ctx, CX, 872, 10, KUSUM);
  inkDot(ctx, CX, 872, 4, PAPER);
  for (const side of [-1, 1]) inkDot(ctx, CX + side * 44, 864, 6, LEAF);

  // Two garlands of beads on a black thread.
  const colors = [KUSUM, LEAF, HALDI, INDIGO];
  for (const [r, bead] of [
    [204, 7],
    [250, 8],
  ] as const) {
    const start = 0.2 * Math.PI;
    const end = 0.8 * Math.PI;
    outline(ctx, () => {
      ctx.beginPath();
      ctx.arc(CX, 724, r, start, end);
    }, 5, 2, HALDI);
    const count = Math.round(r / 13);
    for (let i = 0; i <= count; i++) {
      const a = start + ((end - start) * i) / count;
      inkDot(ctx, CX + Math.cos(a) * r, 724 + Math.sin(a) * r, bead, colors[i % colors.length]);
    }
    // A pendant fish-eye at the lowest point.
    inkDot(ctx, CX, 724 + r + bead + 10, bead + 4, HALDI);
    inkDot(ctx, CX, 724 + r + bead + 10, bead - 2, KUSUM);
  }
}

function drawCrown(ctx: Ctx) {
  fillPath(ctx, () => crownPath(ctx), HALDI);
  ctx.save();
  crownPath(ctx);
  ctx.clip();
  // Radiating wedges of red and green, each with a yellow heart and dots.
  const wedges = 16;
  for (let i = 0; i < wedges; i++) {
    const a0 = Math.PI + (i / wedges) * Math.PI;
    const a1 = Math.PI + ((i + 1) / wedges) * Math.PI;
    const am = (a0 + a1) / 2;
    ctx.beginPath();
    ctx.moveTo(CX, CROWN_BASE);
    ctx.arc(CX, CROWN_BASE, 330, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? KUSUM : LEAF;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a0) * 120, CROWN_BASE + Math.sin(a0) * 120);
    ctx.lineTo(CX + Math.cos(am) * 290, CROWN_BASE + Math.sin(am) * 290);
    ctx.lineTo(CX + Math.cos(a1) * 120, CROWN_BASE + Math.sin(a1) * 120);
    ctx.closePath();
    ctx.fillStyle = HALDI;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const rr = 150 + k * 32;
      inkDot(ctx, CX + Math.cos(am) * rr, CROWN_BASE + Math.sin(am) * rr, 4, i % 2 ? LEAF : KUSUM);
    }
  }
  // Tiers, double-lined.
  for (const rr of [118, 210]) {
    outline(ctx, () => {
      ctx.beginPath();
      ctx.arc(CX, CROWN_BASE, rr, Math.PI, TAU);
    }, 10, 4, HALDI);
  }
  ctx.restore();

  // Little lotus buds all along the crown's edge, alternating red and green.
  let k = 0;
  for (let yy = CROWN_TOP + 26; yy < CROWN_BASE - 10; yy += 24) {
    for (const side of [-1, 1]) {
      const x = CX + side * crownHalfWidth(yy);
      const a = Math.atan2(yy - CROWN_BASE, x - CX);
      ctx.save();
      ctx.translate(x + Math.cos(a) * 6, yy + Math.sin(a) * 6);
      ctx.rotate(a + Math.PI / 2);
      const bud: PathFn = () => {
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.bezierCurveTo(11, 2, 8, -10, 0, -18);
        ctx.bezierCurveTo(-8, -10, -11, 2, 0, 8);
        ctx.closePath();
      };
      fillPath(ctx, bud, k++ % 2 ? KUSUM : LEAF);
      outline(ctx, bud, 4, 1.2);
      ctx.restore();
    }
  }
  outline(ctx, () => crownPath(ctx), 10, 3.5);
  // A lotus bud on a stem at the very top.
  const topBud: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(CX, CROWN_TOP + 12);
    ctx.bezierCurveTo(CX + 22, CROWN_TOP - 2, CX + 14, CROWN_TOP - 26, CX, CROWN_TOP - 30);
    ctx.bezierCurveTo(CX - 14, CROWN_TOP - 26, CX - 22, CROWN_TOP - 2, CX, CROWN_TOP + 12);
    ctx.closePath();
  };
  fillPath(ctx, topBud, PINK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, CROWN_TOP + 8);
  ctx.lineTo(CX, CROWN_TOP - 22);
  ctx.stroke();
  outline(ctx, topBud, 5, 1.6);

  // A sun medallion at the centre of the crown.
  inkDot(ctx, CX, 226, 44, HALDI);
  inkDot(ctx, CX, 226, 30, KUSUM);
  inkDot(ctx, CX, 226, 14, LEAF);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    inkDot(ctx, CX + Math.cos(a) * 37, 226 + Math.sin(a) * 37, 3.5, PAPER);
  }

  // The band on the brow.
  outline(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(CX - 238, CROWN_BASE - 6);
    ctx.quadraticCurveTo(CX, CROWN_BASE + 34, CX + 238, CROWN_BASE - 6);
  }, 26, 16, KUSUM);
  for (let i = 0; i < 24; i++) {
    const t = (i + 0.5) / 24;
    const x = CX - 238 + t * 476;
    const y = CROWN_BASE - 6 + 40 * t * (1 - t);
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 5);
    ctx.lineTo(x, y - 6);
    ctx.lineTo(x + 7, y + 5);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? HALDI : LEAF;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

export function drawMadhubani(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(RES / S, RES / S);

  drawHalo(ctx);
  drawHair(ctx);
  drawSaree(ctx);
  drawNeck(ctx);
  drawFace(ctx);
  for (const { cx, cy, dir } of EYES) drawEye(ctx, cx, cy, dir);
  drawThirdEye(ctx, CX, 392);
  drawFeatures(ctx);
  drawEarring(ctx, 286, 600);
  drawEarring(ctx, 738, 600);
  drawJewellery(ctx);
  drawCrown(ctx);

  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  drawGrain(ctx, 0.28);
  ctx.restore();
  return canvas;
}
