// Durga as she appears on a Mata ni Pachedi, the shrine cloth of the Devipujak community of
// Ahmedabad: the whole cloth painted in just three colours (alizarin red and maroon, iron black
// and the undyed white of the cotton), the Mother at the centre inside a shrine arch, with
// devotees, peacocks, lamps and garbo pots in panels at her sides and a toran across the top.
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
  faceHalfWidth,
  facePath,
  hairline,
  taperedStroke,
  type Ctx,
} from "./layout";

const CLOTH = "#eee4cf";
const RED = "#92231a";
const DEEP = "#5e140e";
const BLACK = "#1a1311";
/** The maroon ground: the cloth is dyed through with alizarin, the way many pachedis are. */
const GROUND = "#4c0f0b";

/** The colours the small figures are drawn in, swapped to white-on-black inside the panels. */
const ink = { dark: BLACK, light: CLOTH };

const ARCH = { x0: 236, x1: 788, top: 300, radius: 276, bottom: 1000 };
/** The cloth is hung portrait, narrower than the square texture, so the dark around it stays
    clear for the captions; outside these edges the texture is transparent. */
const CLOTH_L = 84;
const CLOTH_R = S - CLOTH_L;
const PANEL = { left: [CLOTH_L + 44, 228] as const, right: [796, CLOTH_R - 44] as const, top: 132, bottom: 980 };

type PathFn = () => void;

function fillPath(ctx: Ctx, path: PathFn, color: string) {
  path();
  ctx.fillStyle = color;
  ctx.fill();
}

function stroke(ctx: Ctx, path: PathFn, width: number, color = ink.dark) {
  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

/** A line of white dots along a path, the kalam-painted edging on every pachedi shape. */
function dotLine(ctx: Ctx, points: [number, number][], spacing: number, r: number, color = ink.light) {
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let d = carry; d < len; d += spacing) {
      const t = d / len;
      dot(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, color);
    }
    carry = (carry - len) % spacing;
    if (carry < 0) carry += spacing;
  }
}

function archPath(ctx: Ctx, inset = 0) {
  const { x0, x1, top, radius, bottom } = ARCH;
  ctx.beginPath();
  ctx.moveTo(x0 + inset, bottom);
  ctx.lineTo(x0 + inset, top);
  ctx.arc(CX, top, radius - inset, Math.PI, TAU);
  ctx.lineTo(x1 - inset, bottom);
  ctx.closePath();
}

/** 1 inside the shrine arch, 0 outside: the relief only rises where the Mother is. */
export function pachediMask(x: number, y: number) {
  if (y > ARCH.bottom || x < ARCH.x0 || x > ARCH.x1) return 0;
  if (y < ARCH.top && Math.hypot(x - CX, y - ARCH.top) > ARCH.radius) return 0;
  return 1;
}

// ─── The cloth around her ─────────────────────────────────────────────────────

function drawBorders(ctx: Ctx) {
  const L = CLOTH_L;
  const R = CLOTH_R;
  const W = R - L;
  ctx.fillStyle = GROUND;
  ctx.fillRect(L, 0, W, S);

  ctx.fillStyle = BLACK;
  ctx.fillRect(L, 0, W, 16);
  ctx.fillRect(L, S - 16, W, 16);
  ctx.fillRect(L, 0, 16, S);
  ctx.fillRect(R - 16, 0, 16, S);

  // A band of white sawtooth, then a red band with white dots.
  const tooth = 22;
  ctx.fillStyle = CLOTH;
  const teeth = (x: number, y: number, dx: number, dy: number, nx: number, ny: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * tooth, y + dy * tooth);
    ctx.lineTo(x + dx * tooth * 0.5 + nx * 18, y + dy * tooth * 0.5 + ny * 18);
    ctx.closePath();
    ctx.fill();
  };
  for (let a = L + 16; a + tooth <= R - 16; a += tooth) {
    teeth(a, 16, 1, 0, 0, 1);
    teeth(a, S - 16, 1, 0, 0, -1);
  }
  for (let a = 16; a + tooth <= S - 16; a += tooth) {
    teeth(L + 16, a, 0, 1, 1, 0);
    teeth(R - 16, a, 0, 1, -1, 0);
  }
  ctx.strokeStyle = RED;
  ctx.lineWidth = 12;
  ctx.strokeRect(L + 30, 46, W - 60, S - 92);
  dotLine(ctx, [[L + 30, 46], [R - 30, 46], [R - 30, S - 46], [L + 30, S - 46], [L + 30, 46]], 12, 2.2);
  ctx.strokeStyle = CLOTH;
  ctx.lineWidth = 2;
  ctx.strokeRect(L + 40, 56, W - 80, S - 112);
}

function drawToran(ctx: Ctx) {
  // Mango leaves hanging from a cord across the top.
  ctx.strokeStyle = CLOTH;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CLOTH_L + 44, 70);
  ctx.lineTo(CLOTH_R - 44, 70);
  ctx.stroke();
  for (let x = CLOTH_L + 60; x < CLOTH_R - 50; x += 30) {
    const leaf: PathFn = () => {
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.bezierCurveTo(x + 13, 84, x + 10, 104, x, 118);
      ctx.bezierCurveTo(x - 10, 104, x - 13, 84, x, 70);
      ctx.closePath();
    };
    fillPath(ctx, leaf, ((x - CLOTH_L - 60) / 30) % 2 ? RED : CLOTH);
    ctx.strokeStyle = GROUND;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 76);
    ctx.lineTo(x, 110);
    ctx.stroke();
  }
}

function devotee(ctx: Ctx, x: number, y: number, s: number, armsUp: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // A skirt as a flared triangle, body, head and arms: the pachedi's figure in a few strokes.
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(30, 52);
    ctx.lineTo(-30, 52);
    ctx.closePath();
  }, RED);
  dotLine(ctx, [[-28, 48], [28, 48]], 7, 1.6);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-9, -32);
    ctx.lineTo(9, -32);
    ctx.lineTo(6, -6);
    ctx.lineTo(-6, -6);
    ctx.closePath();
  }, ink.dark);
  dot(ctx, 0, -44, 11, ink.dark);
  dot(ctx, 3, -46, 2, ink.light);
  ctx.strokeStyle = ink.dark;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 8, -28);
    if (armsUp) ctx.lineTo(side * 20, -58);
    else ctx.lineTo(side * 24, -8);
    ctx.stroke();
    // A dandiya stick in each hand.
    ctx.lineWidth = 3;
    ctx.beginPath();
    const hx = armsUp ? side * 20 : side * 24;
    const hy = armsUp ? -58 : -8;
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + side * 10, hy - 16);
    ctx.stroke();
    ctx.lineWidth = 4;
  }
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-8, 52);
    ctx.lineTo(-12, 66);
    ctx.moveTo(8, 52);
    ctx.lineTo(12, 66);
  }, 4);
  ctx.restore();
}

function peacock(ctx: Ctx, x: number, y: number, s: number, dir: 1 | -1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  // The tail fanned behind, each feather an eye.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.62 + i * 0.07);
    const fx = -8 + Math.cos(a) * 58;
    const fy = 10 - Math.sin(a) * 58 + 30;
    stroke(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-8, 20);
      ctx.lineTo(fx, fy);
    }, 2);
    dot(ctx, fx, fy, 8, RED);
    dot(ctx, fx, fy, 4, ink.dark);
    dot(ctx, fx, fy, 1.6, ink.light);
  }
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-14, 30);
    ctx.bezierCurveTo(-10, 0, 16, -4, 20, -26);
    ctx.lineTo(26, -26);
    ctx.bezierCurveTo(30, 6, 22, 30, -14, 30);
    ctx.closePath();
  }, ink.dark);
  dotLine(ctx, [[-6, 24], [14, 14], [22, -10]], 6, 1.5);
  dot(ctx, 24, -30, 7, ink.dark);
  dot(ctx, 26, -31, 1.6, ink.light);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(30, -30);
    ctx.lineTo(40, -27);
    ctx.lineTo(30, -25);
    ctx.closePath();
  }, RED);
  for (const cx of [20, 24, 28]) {
    stroke(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(24, -36);
      ctx.lineTo(cx, -48);
    }, 1.5);
    dot(ctx, cx, -49, 2.4, RED);
  }
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(2, 30);
    ctx.lineTo(0, 46);
    ctx.moveTo(12, 30);
    ctx.lineTo(14, 46);
  }, 2.5);
  ctx.restore();
}

/** The garbo: a clay pot pierced all over, a lamp burning inside. */
function garbo(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(0, 10, 40, 36, 0, 0, TAU);
  }, RED);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.rect(-16, -34, 32, 14);
  }, ink.dark);
  for (let row = -2; row <= 2; row++) {
    for (let col = -3; col <= 3; col++) {
      const px = col * 10 + (row % 2 ? 5 : 0);
      const py = 10 + row * 11;
      if (Math.hypot(px / 36, (py - 10) / 32) < 1) dot(ctx, px, py, 2.4, ink.light);
    }
  }
  // The flame above the mouth.
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.bezierCurveTo(12, -54, 10, -40, 0, -36);
    ctx.bezierCurveTo(-10, -40, -12, -54, 0, -70);
    ctx.closePath();
  }, RED);
  dot(ctx, 0, -46, 4, ink.light);
  ctx.restore();
}

function lamp(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.quadraticCurveTo(0, 30, 36, 0);
    ctx.closePath();
  }, ink.dark);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-10, 18);
    ctx.lineTo(10, 18);
    ctx.lineTo(18, 40);
    ctx.lineTo(-18, 40);
    ctx.closePath();
  }, RED);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.bezierCurveTo(14, -26, 12, -8, 0, -4);
    ctx.bezierCurveTo(-12, -8, -14, -26, 0, -46);
    ctx.closePath();
  }, RED);
  dot(ctx, 0, -16, 5, ink.light);
  dotLine(ctx, [[-30, 4], [30, 4]], 7, 1.6);
  ctx.restore();
}

function drawPanels(ctx: Ctx) {
  const rows = 4;
  const height = (PANEL.bottom - PANEL.top) / rows;
  const art: ((x: number, y: number, side: 1 | -1) => void)[] = [
    (x, y) => devotee(ctx, x, y + 4, 0.74, true),
    (x, y, side) => peacock(ctx, x - side * 10, y + 4, 0.62, side === 1 ? -1 : 1),
    (x, y) => garbo(ctx, x, y + 9, 0.7),
    (x, y) => lamp(ctx, x, y + 6, 0.74),
  ];
  for (const [side, [x0, x1]] of [
    [-1, PANEL.left],
    [1, PANEL.right],
  ] as const) {
    for (let r = 0; r < rows; r++) {
      const y0 = PANEL.top + r * height;
      ctx.fillStyle = BLACK;
      ctx.fillRect(x0 + 6, y0 + 6, x1 - x0 - 12, height - 12);
      ctx.strokeStyle = CLOTH;
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 6, y0 + 6, x1 - x0 - 12, height - 12);
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 13, y0 + 13, x1 - x0 - 26, height - 26);
      // Alternate the order on the right so the two columns answer each other.
      const pick = side === -1 ? r : (r + 2) % rows;
      ink.dark = CLOTH;
      ink.light = BLACK;
      art[pick]((x0 + x1) / 2, y0 + height / 2, side);
      ink.dark = BLACK;
      ink.light = CLOTH;
    }
  }
}

function drawArch(ctx: Ctx) {
  // The shrine: a deep red niche patterned with white butis, edged in black and dots.
  fillPath(ctx, () => archPath(ctx), RED);
  ctx.save();
  archPath(ctx);
  ctx.clip();
  for (let y = 20; y < S; y += 26) {
    for (let x = ARCH.x0 + ((y / 26) % 2) * 13; x < ARCH.x1; x += 26) {
      dot(ctx, x, y, 2.6, CLOTH);
      dot(ctx, x, y, 1, RED);
    }
  }
  ctx.restore();
  stroke(ctx, () => archPath(ctx), 12);
  stroke(ctx, () => archPath(ctx, 12), 3);
  const points: [number, number][] = [[ARCH.x0 + 6, ARCH.bottom], [ARCH.x0 + 6, ARCH.top]];
  for (let a = Math.PI; a <= TAU + 0.001; a += 0.05) points.push([CX + Math.cos(a) * (ARCH.radius - 6), ARCH.top + Math.sin(a) * (ARCH.radius - 6)]);
  points.push([ARCH.x1 - 6, ARCH.bottom]);
  dotLine(ctx, points, 11, 2.2);
}

// ─── The Mother ───────────────────────────────────────────────────────────────

function drawFigure(ctx: Ctx) {
  ctx.save();
  archPath(ctx, 14);
  ctx.clip();

  // Hair: black, streaked with fine white lines.
  const hair: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(CX, 250);
    ctx.bezierCurveTo(CX + 250, 250, CX + 350, 430, CX + 338, 640);
    ctx.bezierCurveTo(CX + 330, 820, CX + 380, 930, CX + 392, S);
    ctx.lineTo(CX - 392, S);
    ctx.bezierCurveTo(CX - 380, 930, CX - 330, 820, CX - 338, 640);
    ctx.bezierCurveTo(CX - 350, 430, CX - 250, 250, CX, 250);
    ctx.closePath();
  };
  fillPath(ctx, hair, BLACK);
  ctx.save();
  hair();
  ctx.clip();
  ctx.strokeStyle = "rgba(238, 228, 207, 0.45)";
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 18; k++) {
    for (const side of [-1, 1]) {
      const x0 = CX + side * (226 + k * 9);
      ctx.beginPath();
      ctx.moveTo(x0, 380);
      ctx.quadraticCurveTo(x0 + side * 20, 700, x0 + side * 44, S);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Odhani: a black chunri with red and white bandhani dots over the shoulders.
  const odhani: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(90, S);
    ctx.bezierCurveTo(170, 930, 330, 890, 430, 884);
    ctx.lineTo(594, 884);
    ctx.bezierCurveTo(694, 890, 854, 930, 934, S);
    ctx.closePath();
  };
  fillPath(ctx, odhani, BLACK);
  ctx.save();
  odhani();
  ctx.clip();
  for (let y = 900; y < S; y += 18) {
    for (let x = 90 + ((y / 18) % 2) * 9; x < 940; x += 18) {
      dot(ctx, x, y, 3.2, (x + y) % 36 < 18 ? RED : CLOTH);
      dot(ctx, x, y, 1, BLACK);
    }
  }
  ctx.restore();
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(110, S);
    ctx.bezierCurveTo(190, 940, 340, 900, 430, 896);
    ctx.lineTo(594, 896);
    ctx.bezierCurveTo(684, 900, 834, 940, 914, S);
  }, 18, RED);
  dotLine(ctx, [[430, 896], [594, 896]], 10, 2.4);

  // Neck and face in red, as the Mother is painted on the pachedi.
  const neck: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(428, 740);
    ctx.quadraticCurveTo(436, 830, 404, 900);
    ctx.lineTo(620, 900);
    ctx.quadraticCurveTo(588, 830, 596, 740);
    ctx.closePath();
  };
  fillPath(ctx, neck, RED);
  stroke(ctx, neck, 5);
  fillPath(ctx, () => facePath(ctx), RED);
  ctx.save();
  facePath(ctx);
  ctx.clip();
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.moveTo(CX - 240, 250);
  for (let x = CX - 240; x <= CX + 240; x += 4) ctx.lineTo(x, hairline(x));
  ctx.lineTo(CX + 240, 250);
  ctx.closePath();
  ctx.fill();
  // A cheek ornament of white dots on each side.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      dot(ctx, CX + side * 132 + Math.cos(a) * 16, 610 + Math.sin(a) * 16, 2.8, CLOTH);
    }
    dot(ctx, CX + side * 132, 610, 4, CLOTH);
  }
  ctx.restore();
  stroke(ctx, () => facePath(ctx), 6);
  const faceEdge: [number, number][] = [];
  for (let y = 360; y <= 800; y += 6) {
    const w = faceHalfWidth(y) - 10;
    if (w > 0) faceEdge.push([CX - w, y]);
  }
  dotLine(ctx, faceEdge, 12, 1.8);
  dotLine(
    ctx,
    faceEdge.map(([x, y]) => [2 * CX - x, y]),
    12,
    1.8,
  );

  for (const { cx, cy, dir } of EYES) drawEye(ctx, cx, cy, dir);
  drawThirdEye(ctx, CX, 392);

  // Nose, a black line with a white highlight beside it.
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(504, 446);
    ctx.bezierCurveTo(494, 520, 486, 580, 494, 610);
    ctx.quadraticCurveTo(506, 624, 528, 614);
  }, 5);
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(516, 470);
    ctx.lineTo(512, 580);
  }, 2.5, CLOTH);

  dot(ctx, CX, 446, 10, BLACK);
  dot(ctx, CX, 446, 5, CLOTH);

  // Lips in black and white.
  const lips: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(464, 684);
    ctx.bezierCurveTo(482, 668, 498, 660, 512, 672);
    ctx.bezierCurveTo(526, 660, 542, 668, 560, 684);
    ctx.bezierCurveTo(538, 716, 486, 716, 464, 684);
    ctx.closePath();
  };
  fillPath(ctx, lips, DEEP);
  stroke(ctx, lips, 4);
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(470, 686);
    ctx.quadraticCurveTo(512, 696, 554, 686);
  }, 2.5, CLOTH);

  // Nath and earrings: black rings, white dots.
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.arc(472, 648, 38, 0, TAU);
  }, 6);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    dot(ctx, 472 + Math.cos(a) * 38, 648 + Math.sin(a) * 38, 2, CLOTH);
  }
  for (const ex of [286, 738]) {
    dot(ctx, ex, 600, 22, BLACK);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      dot(ctx, ex + Math.cos(a) * 14, 600 + Math.sin(a) * 14, 3, CLOTH);
    }
    dot(ctx, ex, 600, 6, RED);
    fillPath(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(ex - 28, 694);
      ctx.lineTo(ex, 626);
      ctx.lineTo(ex + 28, 694);
      ctx.closePath();
    }, RED);
    dotLine(ctx, [[ex - 26, 690], [ex + 26, 690]], 8, 2.4);
  }

  // Necklaces: black strands beaded in white.
  for (const r of [150, 196, 244]) {
    stroke(ctx, () => {
      ctx.beginPath();
      ctx.arc(CX, 724, r, 0.2 * Math.PI, 0.8 * Math.PI);
    }, 12);
    const pts: [number, number][] = [];
    for (let a = 0.2 * Math.PI; a <= 0.8 * Math.PI; a += 0.02) pts.push([CX + Math.cos(a) * r, 724 + Math.sin(a) * r]);
    dotLine(ctx, pts, 11, 2.8);
  }
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(430, 818);
    ctx.quadraticCurveTo(CX, 856, 594, 818);
  }, 20, BLACK);
  dotLine(ctx, [[436, 822], [CX, 838], [588, 822]], 10, 3, RED);

  drawCrown(ctx);
  ctx.restore();
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
  fillPath(ctx, shape, CLOTH);
  ctx.save();
  shape();
  ctx.clip();
  dot(ctx, cx + dir * 4, cy - 10, 30, BLACK);
  dot(ctx, cx + dir * 12, cy - 18, 5, CLOTH);
  ctx.restore();
  stroke(ctx, shape, 8);
  taperedStroke(ctx, [outer[0] - dir * 24, outer[1] + 4], [outer[0] + dir * 20, outer[1] - 4], [outer[0] + dir * 54, outer[1] - 34], 10, BLACK);
  taperedStroke(ctx, [CX + dir * 22, 430], [cx + dir * 10, 378], [cx + dir * 128, 420], 16, BLACK);
  dotLine(ctx, [[CX + dir * 40, 404], [cx + dir * 10, 382], [cx + dir * 110, 398]], 12, 2.2);
}

function drawThirdEye(ctx: Ctx, cx: number, cy: number) {
  const shape: PathFn = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40);
    ctx.bezierCurveTo(cx + 24, cy - 16, cx + 24, cy + 16, cx, cy + 40);
    ctx.bezierCurveTo(cx - 24, cy + 16, cx - 24, cy - 16, cx, cy - 40);
    ctx.closePath();
  };
  fillPath(ctx, shape, CLOTH);
  ctx.save();
  shape();
  ctx.clip();
  dot(ctx, cx, cy, 12, BLACK);
  dot(ctx, cx + 3, cy - 4, 2.4, CLOTH);
  ctx.restore();
  stroke(ctx, shape, 6);
}

function drawCrown(ctx: Ctx) {
  fillPath(ctx, () => crownPath(ctx), BLACK);
  ctx.save();
  crownPath(ctx);
  ctx.clip();
  // Tiers of red scallops edged with white dots.
  for (let tier = 5; tier >= 0; tier--) {
    const r = 70 + tier * 48;
    const count = 10 + tier * 4;
    for (let i = 0; i < count; i++) {
      const a = Math.PI + ((i + 0.5) / count) * Math.PI;
      const px = CX + Math.cos(a) * r;
      const py = CROWN_BASE + Math.sin(a) * r;
      const size = (Math.PI * r) / count / 2.2;
      fillPath(ctx, () => {
        ctx.beginPath();
        ctx.arc(px, py, size, 0, TAU);
      }, tier % 2 ? RED : BLACK);
      for (let k = 0; k < 8; k++) {
        const b = (k / 8) * TAU;
        dot(ctx, px + Math.cos(b) * size * 0.75, py + Math.sin(b) * size * 0.75, 1.5, CLOTH);
      }
      dot(ctx, px, py, 2.2, tier % 2 ? CLOTH : RED);
    }
  }
  ctx.restore();
  stroke(ctx, () => crownPath(ctx), 6);
  const edge: [number, number][] = [];
  for (let y = CROWN_TOP + 6; y <= CROWN_BASE; y += 4) edge.push([CX + crownHalfWidth(y) - 8, y]);
  dotLine(ctx, edge, 12, 2.4);
  dotLine(
    ctx,
    edge.map(([x, y]) => [2 * CX - x, y]),
    12,
    2.4,
  );
  // The band on the brow and a red crest.
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(CX - 238, CROWN_BASE - 6);
    ctx.quadraticCurveTo(CX, CROWN_BASE + 34, CX + 238, CROWN_BASE - 6);
  }, 24, RED);
  const band: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.02) band.push([CX - 238 + t * 476, CROWN_BASE - 6 + 40 * t * (1 - t)]);
  dotLine(ctx, band, 12, 3);
  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(CX, 150);
    ctx.bezierCurveTo(CX + 44, 190, CX + 44, 250, CX, 282);
    ctx.bezierCurveTo(CX - 44, 250, CX - 44, 190, CX, 150);
    ctx.closePath();
  }, RED);
  // A white flower of dots on the crest, so it never reads as another eye.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    dot(ctx, CX + Math.cos(a) * 14, 222 + Math.sin(a) * 18, 4, CLOTH);
  }
  dot(ctx, CX, 222, 5, BLACK);
  dot(ctx, CX, 222, 2, CLOTH);
}

export function drawPachedi(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(RES / S, RES / S);

  drawBorders(ctx);
  drawToran(ctx);
  drawPanels(ctx);
  drawArch(ctx);
  drawFigure(ctx);

  // The weave and the slight bleed of natural dye.
  drawGrain(ctx, 0.3);
  ctx.clearRect(0, 0, CLOTH_L, S);
  ctx.clearRect(CLOTH_R, 0, S - CLOTH_R, S);
  return canvas;
}
