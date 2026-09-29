// The village and the valley around it, painted once into sprites and paths: the thatched namghar
// and its batsora gate, a homestead with its loom and granary, the mango trees the kopou grows on,
// bamboo, areca palms and bananas, rows of tea, and far off the Brahmaputra and the blue hills.
//
// Sprites are drawn in world units with their base at the origin, in daylight colours; the scene
// grades them for the hour.
import { TAU, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";

export type Sprite = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number };

const cache = new Map<string, Sprite>();

/** Paints `draw` once into a canvas covering [left, left + w] × [top, top + h] world units. */
export function sprite(key: string, left: number, top: number, w: number, h: number, ppu: number, draw: (g: Ctx) => void): Sprite {
  let s = cache.get(key);
  if (!s) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(w * ppu);
    canvas.height = Math.ceil(h * ppu);
    const g = canvas.getContext("2d")!;
    g.scale(ppu, ppu);
    g.translate(-left, -top);
    draw(g);
    s = { canvas, x: left, y: top, w, h };
    cache.set(key, s);
  }
  return s;
}

export function stamp(ctx: Ctx, s: Sprite, x: number, y: number, scale = 1, flip = false) {
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-scale, scale);
    ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
    ctx.restore();
    return;
  }
  ctx.drawImage(s.canvas, x + s.x * scale, y + s.y * scale, s.w * scale, s.h * scale);
}

const THATCH: RGB = [196, 158, 92];
const THATCH_DARK: RGB = [138, 100, 56];
const PLASTER: RGB = [222, 204, 166];
const WOOD: RGB = [110, 72, 44];
const BAMBOO: RGB = [186, 164, 96];

/** A thatched roof from the eaves at `eave` up to a ridge at `ridge`, straw combed down its slope. */
function thatch(g: Ctx, left: number, right: number, eave: number, ridgeLeft: number, ridgeRight: number, ridge: number, seed: number) {
  const random = mulberry32(seed);
  const grad = g.createLinearGradient(0, ridge, 0, eave);
  grad.addColorStop(0, rgb(mix(THATCH, [230, 200, 140], 0.2)));
  grad.addColorStop(0.7, rgb(THATCH));
  grad.addColorStop(1, rgb(THATCH_DARK));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(left, eave);
  g.quadraticCurveTo(lerp(left, ridgeLeft, 0.5) - 0.1, lerp(eave, ridge, 0.5), ridgeLeft, ridge);
  g.quadraticCurveTo((ridgeLeft + ridgeRight) / 2, ridge + 0.08, ridgeRight, ridge);
  g.quadraticCurveTo(lerp(right, ridgeRight, 0.5) + 0.1, lerp(eave, ridge, 0.5), right, eave);
  g.closePath();
  g.fill();
  g.save();
  g.clip();
  g.lineWidth = 0.022;
  for (let i = 0; i < 520; i++) {
    const t = random();
    const x = lerp(left, right, t);
    const top = ridge + random() * (eave - ridge) * 0.9;
    const len = 0.25 + random() * 0.5;
    const slope = (t - 0.5) * 0.5;
    g.strokeStyle = rgb(mix(THATCH_DARK, [236, 206, 140], random()), 0.55);
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x + slope * len, top + len);
    g.stroke();
  }
  g.restore();
  // The cut edge of the thatch, thick and even.
  g.fillStyle = rgb(mix(THATCH_DARK, [0, 0, 0], 0.2));
  g.fillRect(left - 0.02, eave - 0.05, right - left + 0.04, 0.16);
  g.fillStyle = rgb(mix(THATCH, [255, 240, 200], 0.2));
  g.fillRect(left - 0.02, eave + 0.1, right - left + 0.04, 0.04);
  // Bamboo ties along the ridge.
  g.strokeStyle = rgb(mix(THATCH_DARK, [0, 0, 0], 0.3));
  g.lineWidth = 0.06;
  g.beginPath();
  g.moveTo(ridgeLeft, ridge);
  g.quadraticCurveTo((ridgeLeft + ridgeRight) / 2, ridge + 0.08, ridgeRight, ridge);
  g.stroke();
}

/** The namghar, the village prayer hall of Sankardev's faith: long, low and thatched. */
export function namghar() {
  return sprite("namghar", -4.8, -4.2, 9.6, 4.3, 90, (g) => {
    // Plinth.
    g.fillStyle = rgb([200, 176, 136]);
    g.fillRect(-4.3, -0.3, 8.6, 0.3);
    g.fillStyle = rgb([160, 136, 100]);
    g.fillRect(-4.3, -0.06, 8.6, 0.06);
    // Plastered walls between wooden posts, with bamboo lattice windows.
    g.fillStyle = rgb(PLASTER);
    g.fillRect(-4.0, -1.55, 8.0, 1.25);
    for (let i = 0; i <= 9; i++) {
      const x = -4.0 + i * (8 / 9);
      g.fillStyle = rgb(WOOD);
      g.fillRect(x - 0.06, -1.6, 0.12, 1.3);
      if (i < 9 && i !== 4) {
        const wx = x + 0.2;
        const ww = 8 / 9 - 0.4;
        g.fillStyle = "rgb(60, 40, 30)";
        g.fillRect(wx, -1.25, ww, 0.55);
        g.strokeStyle = rgb(BAMBOO);
        g.lineWidth = 0.035;
        g.beginPath();
        for (let k = 1; k < 5; k++) {
          g.moveTo(wx + (k * ww) / 5, -1.25);
          g.lineTo(wx + (k * ww) / 5, -0.7);
        }
        g.moveTo(wx, -0.97);
        g.lineTo(wx + ww, -0.97);
        g.stroke();
      }
    }
    // The doorway, where the kirtan spills out.
    g.fillStyle = "rgb(40, 26, 20)";
    g.fillRect(-0.34, -1.35, 0.68, 1.05);
    g.fillStyle = rgb(WOOD);
    g.fillRect(-0.42, -1.42, 0.84, 0.08);
    // Beam under the eaves.
    g.fillStyle = rgb(mix(WOOD, [0, 0, 0], 0.2));
    g.fillRect(-4.2, -1.66, 8.4, 0.1);
    thatch(g, -4.7, 4.7, -1.62, -3.2, 3.2, -3.95, 11);
    // A little brass finial at the middle of the ridge.
    g.fillStyle = rgb([214, 170, 80]);
    g.beginPath();
    g.moveTo(-0.08, -3.9);
    g.quadraticCurveTo(-0.12, -4.05, 0, -4.18);
    g.quadraticCurveTo(0.12, -4.05, 0.08, -3.9);
    g.fill();
  });
}

/** The batsora: the namghar's gatehouse, two posts under its own little thatch. */
export function batsora() {
  return sprite("batsora", -1.1, -2.5, 2.2, 2.55, 90, (g) => {
    g.fillStyle = rgb(WOOD);
    g.fillRect(-0.72, -1.5, 0.12, 1.5);
    g.fillRect(0.6, -1.5, 0.12, 1.5);
    g.fillRect(-0.8, -1.6, 1.6, 0.1);
    g.fillStyle = rgb([200, 176, 136]);
    g.fillRect(-0.85, -0.08, 1.7, 0.08);
    thatch(g, -1.05, 1.05, -1.52, -0.25, 0.25, -2.4, 5);
  });
}

/** A homestead: ikora reed walls plastered with mud, a thatched roof and a verandah in front. */
export function house() {
  return sprite("house", -4.2, -4.3, 8.4, 4.4, 90, (g) => {
    g.fillStyle = rgb([196, 170, 126]);
    g.fillRect(-3.6, -0.34, 7.2, 0.34);
    g.fillStyle = rgb([168, 140, 100]);
    g.fillRect(-3.6, -0.06, 7.2, 0.06);
    // Walls, set back under the verandah.
    const wall = g.createLinearGradient(0, -2.0, 0, -0.3);
    wall.addColorStop(0, rgb(mix(PLASTER, [150, 120, 90], 0.35)));
    wall.addColorStop(1, rgb(PLASTER));
    g.fillStyle = wall;
    g.fillRect(-3.3, -2.0, 6.6, 1.66);
    const random = mulberry32(8);
    g.strokeStyle = "rgba(150, 120, 80, 0.25)";
    g.lineWidth = 0.02;
    for (let i = 0; i < 90; i++) {
      const x = -3.3 + random() * 6.6;
      g.beginPath();
      g.moveTo(x, -2.0);
      g.lineTo(x + (random() - 0.5) * 0.05, -0.34);
      g.stroke();
    }
    // A plank door, and a window with a bamboo grille.
    g.fillStyle = rgb([90, 58, 36]);
    g.fillRect(-0.45, -1.62, 0.9, 1.28);
    g.strokeStyle = rgb([60, 36, 22]);
    g.lineWidth = 0.025;
    g.beginPath();
    for (let k = 1; k < 5; k++) {
      g.moveTo(-0.45 + k * 0.18, -1.62);
      g.lineTo(-0.45 + k * 0.18, -0.34);
    }
    g.stroke();
    for (const wx of [-2.3, 1.5]) {
      g.fillStyle = "rgb(50, 34, 26)";
      g.fillRect(wx, -1.45, 0.8, 0.55);
      g.strokeStyle = rgb(BAMBOO);
      g.lineWidth = 0.04;
      g.beginPath();
      for (let k = 1; k < 5; k++) {
        g.moveTo(wx + k * 0.16, -1.45);
        g.lineTo(wx + k * 0.16, -0.9);
      }
      g.stroke();
    }
    // A gamosa and a mekhela drying on a bamboo line along the verandah.
    g.strokeStyle = rgb(BAMBOO);
    g.lineWidth = 0.03;
    g.beginPath();
    g.moveTo(1.1, -1.8);
    g.lineTo(3.2, -1.8);
    g.stroke();
    g.fillStyle = "rgb(246, 242, 232)";
    g.fillRect(1.3, -1.8, 0.5, 0.75);
    g.fillStyle = "rgb(196, 32, 38)";
    g.fillRect(1.3, -1.18, 0.5, 0.06);
    g.fillRect(1.3, -1.8, 0.05, 0.75);
    g.fillRect(1.75, -1.8, 0.05, 0.75);
    g.fillStyle = "rgb(226, 190, 116)";
    g.fillRect(2.1, -1.8, 0.7, 0.9);
    g.fillStyle = "rgb(176, 26, 34)";
    g.fillRect(2.1, -0.98, 0.7, 0.07);
    // Bamboo posts of the verandah.
    for (const px of [-3.4, -1.7, 0, 1.7, 3.4]) {
      g.fillStyle = rgb(BAMBOO);
      g.fillRect(px - 0.06, -2.1, 0.12, 1.78);
      g.fillStyle = rgb(mix(BAMBOO, [0, 0, 0], 0.3));
      for (let k = 0; k < 4; k++) g.fillRect(px - 0.06, -1.9 + k * 0.45, 0.12, 0.03);
    }
    g.fillStyle = rgb(mix(WOOD, [0, 0, 0], 0.1));
    g.fillRect(-3.6, -2.18, 7.2, 0.1);
    thatch(g, -4.1, 4.1, -2.12, -3.0, 3.0, -4.15, 21);
  });
}

/** The bhoral, the granary, up on its stilts out of the damp. */
export function bhoral() {
  return sprite("bhoral", -1.3, -3.2, 2.6, 3.25, 90, (g) => {
    g.fillStyle = rgb(WOOD);
    for (const px of [-0.8, -0.27, 0.27, 0.8]) g.fillRect(px - 0.05, -0.75, 0.1, 0.75);
    g.fillStyle = rgb(mix(PLASTER, [180, 150, 110], 0.3));
    g.fillRect(-0.95, -1.8, 1.9, 1.05);
    g.strokeStyle = "rgba(120, 90, 50, 0.35)";
    g.lineWidth = 0.02;
    g.beginPath();
    for (let k = 0; k < 12; k++) {
      g.moveTo(-0.95 + k * 0.16, -1.8);
      g.lineTo(-0.95 + k * 0.16, -0.75);
    }
    g.stroke();
    g.fillStyle = rgb(WOOD);
    g.fillRect(-1.0, -0.8, 2.0, 0.08);
    thatch(g, -1.25, 1.25, -1.75, -0.35, 0.35, -3.1, 31);
  });
}

/** The tatxal, the family loom, with a gamosa half woven on it. */
export function loom() {
  return sprite("loom", -1.0, -1.5, 2.0, 1.55, 110, (g) => {
    g.strokeStyle = rgb(WOOD);
    g.lineWidth = 0.07;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-0.8, 0);
    g.lineTo(-0.8, -1.4);
    g.moveTo(0.8, 0);
    g.lineTo(0.8, -1.4);
    g.moveTo(-0.85, -1.38);
    g.lineTo(0.85, -1.38);
    g.moveTo(-0.85, -0.45);
    g.lineTo(0.85, -0.45);
    g.stroke();
    // Warp threads, white.
    g.strokeStyle = "rgba(250, 248, 240, 0.8)";
    g.lineWidth = 0.008;
    g.beginPath();
    for (let k = 0; k < 40; k++) {
      const x = -0.6 + k * 0.03;
      g.moveTo(x, -1.34);
      g.lineTo(x, -0.62);
    }
    g.stroke();
    // The woven part: white cloth, its red border, the red flowers at the end.
    g.fillStyle = "rgb(246, 242, 232)";
    g.fillRect(-0.62, -0.84, 1.24, 0.34);
    g.fillStyle = "rgb(196, 32, 38)";
    g.fillRect(-0.62, -0.84, 0.06, 0.34);
    g.fillRect(0.56, -0.84, 0.06, 0.34);
    g.fillRect(-0.62, -0.62, 1.24, 0.04);
    for (let k = 0; k < 9; k++) {
      const x = -0.48 + k * 0.12;
      g.beginPath();
      g.moveTo(x, -0.74);
      g.lineTo(x + 0.035, -0.7);
      g.lineTo(x, -0.66);
      g.lineTo(x - 0.035, -0.7);
      g.fill();
    }
    // The beater, and the shuttle resting on it.
    g.fillStyle = rgb(mix(WOOD, [255, 220, 170], 0.2));
    g.fillRect(-0.72, -0.92, 1.44, 0.06);
    g.fillStyle = rgb([160, 110, 60]);
    g.beginPath();
    g.ellipse(0.2, -0.96, 0.14, 0.03, 0, 0, TAU);
    g.fill();
    // A low bench.
    g.fillStyle = rgb(WOOD);
    g.fillRect(-0.5, -0.28, 1.0, 0.06);
    g.fillRect(-0.45, -0.28, 0.06, 0.28);
    g.fillRect(0.39, -0.28, 0.06, 0.28);
  });
}

/** The tulsi on its clay pedestal in the middle of the courtyard. */
export function tulsi() {
  return sprite("tulsi", -0.5, -1.35, 1.0, 1.4, 120, (g) => {
    g.fillStyle = rgb([210, 184, 150]);
    g.beginPath();
    g.moveTo(-0.3, 0);
    g.lineTo(-0.22, -0.55);
    g.lineTo(-0.3, -0.62);
    g.lineTo(0.3, -0.62);
    g.lineTo(0.22, -0.55);
    g.lineTo(0.3, 0);
    g.fill();
    g.fillStyle = rgb([180, 60, 40]);
    g.fillRect(-0.24, -0.4, 0.48, 0.04);
    const random = mulberry32(4);
    for (let i = 0; i < 60; i++) {
      const a = -Math.PI / 2 + (random() - 0.5) * 2.2;
      const r = random() * 0.55;
      g.fillStyle = rgb(mix([40, 100, 40], [110, 160, 60], random()));
      g.beginPath();
      g.ellipse(Math.cos(a) * r * 0.6, -0.62 + Math.sin(a) * r, 0.06, 0.03, a, 0, TAU);
      g.fill();
    }
  });
}

// ─── Trees ─────────────────────────────────────────────────────────────────

/** A clump of leaves: many small ovals in three greens, lit from above. */
function foliage(g: Ctx, cx: number, cy: number, rx: number, ry: number, count: number, random: () => number, palette: RGB[], leaf = 0.16) {
  for (let i = 0; i < count; i++) {
    const a = random() * TAU;
    const r = Math.sqrt(random());
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    const lit = (cy - y) / ry;
    const c = palette[Math.min(palette.length - 1, Math.floor(random() * 1.3 + (lit + 1) * 0.9))];
    g.fillStyle = rgb(mix(c, [0, 0, 0], random() * 0.12));
    g.beginPath();
    g.ellipse(x, y, leaf * (0.7 + random() * 0.6), leaf * 0.45, random() * TAU, 0, TAU);
    g.fill();
  }
}

const MANGO: RGB[] = [
  [34, 62, 34],
  [48, 88, 42],
  [74, 118, 52],
  [120, 150, 70],
];
// The mango's new spring leaves come in copper before they turn green.
const COPPER: RGB[] = [
  [120, 62, 40],
  [170, 96, 56],
  [206, 140, 80],
];

/** A mango tree in spring, big enough to dance under: dark crown, copper new leaves. */
export function mangoTree(key: string, size: number, seed: number) {
  const w = 12 * size;
  const h = 9.5 * size;
  return sprite(key, -w / 2, -h, w, h + 0.05, 60, (g) => {
    const random = mulberry32(seed);
    g.scale(size, size);
    // Trunk and the big limbs.
    g.fillStyle = "rgb(76, 54, 40)";
    g.beginPath();
    g.moveTo(-0.55, 0);
    g.quadraticCurveTo(-0.35, -1.6, -0.4, -3.2);
    g.lineTo(0.35, -3.2);
    g.quadraticCurveTo(0.3, -1.6, 0.6, 0);
    g.fill();
    g.strokeStyle = "rgb(76, 54, 40)";
    g.lineCap = "round";
    for (const [x1, y1, w1] of [
      [-3.4, -5.4, 0.3],
      [3.2, -5.8, 0.3],
      [-1.2, -7.2, 0.26],
      [1.4, -7.6, 0.24],
      [-4.8, -4.4, 0.18],
      [4.6, -4.2, 0.18],
    ]) {
      g.lineWidth = w1;
      g.beginPath();
      g.moveTo(0, -3.0);
      g.quadraticCurveTo(x1 * 0.4, -3.6 + y1 * 0.2, x1, y1);
      g.stroke();
    }
    // Bark lines.
    g.strokeStyle = "rgba(40, 28, 20, 0.5)";
    g.lineWidth = 0.04;
    for (let i = 0; i < 8; i++) {
      const x = -0.35 + i * 0.1;
      g.beginPath();
      g.moveTo(x, -0.1);
      g.quadraticCurveTo(x + 0.05, -1.5, x * 0.8, -3);
      g.stroke();
    }
    // The crown in lobes.
    const lobes = [
      [0, -6.4, 4.6, 2.3],
      [-3.6, -5.0, 2.4, 1.6],
      [3.6, -5.2, 2.4, 1.5],
      [-1.8, -7.6, 2.4, 1.4],
      [1.9, -7.8, 2.3, 1.3],
      [0, -8.6, 2.0, 0.9],
      [-4.8, -4.2, 1.2, 0.9],
      [4.8, -4.1, 1.2, 0.8],
    ];
    for (const [x, y, rx, ry] of lobes) {
      g.fillStyle = rgb(MANGO[0]);
      g.beginPath();
      g.ellipse(x, y + 0.2, rx * 0.95, ry * 0.9, 0, 0, TAU);
      g.fill();
    }
    for (const [x, y, rx, ry] of lobes) foliage(g, x, y, rx, ry, Math.round(rx * ry * 55), random, MANGO, 0.2);
    for (let i = 0; i < 26; i++) {
      const [x, y, rx, ry] = lobes[Math.floor(random() * lobes.length)];
      foliage(g, x + (random() - 0.5) * rx, y - ry * 0.4 * random(), 0.5, 0.3, 14, random, COPPER, 0.14);
    }
    // Sprays of pale mango blossom.
    for (let i = 0; i < 40; i++) {
      const [x, y, rx, ry] = lobes[Math.floor(random() * lobes.length)];
      const bx = x + (random() - 0.5) * rx * 1.4;
      const by = y - ry * (0.2 + random() * 0.6);
      g.fillStyle = "rgba(236, 226, 170, 0.85)";
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.arc(bx + (random() - 0.5) * 0.12, by - k * 0.04, 0.035, 0, TAU);
        g.fill();
      }
    }
  });
}

/** An albizia, the tall thin-crowned shade tree of the tea gardens. */
export function shadeTree(seed: number) {
  return sprite(`shade-${seed}`, -2.2, -6.2, 4.4, 6.25, 60, (g) => {
    const random = mulberry32(seed);
    g.strokeStyle = "rgb(150, 136, 118)";
    g.lineCap = "round";
    g.lineWidth = 0.14;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(0.1, -2.5, -0.05, -4.6);
    g.stroke();
    g.lineWidth = 0.07;
    for (const dx of [-1.5, 1.4, -0.6, 0.8]) {
      g.beginPath();
      g.moveTo(0, -4.2);
      g.quadraticCurveTo(dx * 0.5, -4.8, dx, -5.3);
      g.stroke();
    }
    for (const [x, y, rx] of [
      [-1.2, -5.4, 1.0],
      [1.1, -5.5, 1.0],
      [0, -5.8, 1.2],
    ])
      foliage(g, x, y, rx, 0.4, 60, random, [
        [60, 100, 50],
        [96, 140, 64],
        [140, 176, 90],
      ], 0.14);
  });
}

/** A clump of bamboo: culms arching out from the root, feathery leaves at their tips. */
export function bamboo(seed: number) {
  return sprite(`bamboo-${seed}`, -3.2, -9.4, 6.4, 9.45, 60, (g) => {
    const random = mulberry32(seed);
    const tips: [number, number][] = [];
    for (let i = 0; i < 22; i++) {
      const root = (random() - 0.5) * 0.9;
      const lean = (random() - 0.5) * 2.4;
      const h = 6.5 + random() * 2.6;
      const tip: [number, number] = [root + lean * 1.1, -h];
      tips.push(tip);
      g.strokeStyle = rgb(mix([120, 136, 60], [200, 186, 100], random()));
      g.lineWidth = 0.07 + random() * 0.04;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(root, 0);
      g.quadraticCurveTo(root + lean * 0.2, -h * 0.55, tip[0], tip[1]);
      g.stroke();
      // Nodes.
      g.strokeStyle = "rgba(60, 60, 30, 0.5)";
      g.lineWidth = 0.03;
      for (let k = 1; k < 7; k++) {
        const t = k / 8;
        const x = (1 - t) * (1 - t) * root + 2 * (1 - t) * t * (root + lean * 0.2) + t * t * tip[0];
        const y = 2 * (1 - t) * t * (-h * 0.55) + t * t * tip[1];
        g.beginPath();
        g.moveTo(x - 0.06, y);
        g.lineTo(x + 0.06, y);
        g.stroke();
      }
    }
    const leaves: RGB[] = [
      [58, 96, 40],
      [90, 130, 52],
      [140, 170, 80],
    ];
    for (const [x, y] of tips) foliage(g, x, y + 1.3, 1.0, 1.6, 70, random, leaves, 0.2);
    foliage(g, 0, -4, 1.8, 2.6, 110, random, leaves, 0.2);
  });
}

/** A tamul, an areca palm, straight as a rod, a betel vine climbing it. */
export function areca(seed: number, height = 7) {
  return sprite(`areca-${seed}-${height}`, -1.4, -height - 1.2, 2.8, height + 1.25, 60, (g) => {
    const random = mulberry32(seed);
    const lean = (random() - 0.5) * 0.4;
    g.strokeStyle = "rgb(150, 144, 124)";
    g.lineWidth = 0.1;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(lean * 0.3, -height * 0.5, lean, -height);
    g.stroke();
    g.strokeStyle = "rgba(90, 86, 70, 0.6)";
    g.lineWidth = 0.02;
    for (let k = 1; k < height * 3; k++) {
      const t = k / (height * 3);
      const x = lean * t * t;
      g.beginPath();
      g.moveTo(x - 0.05, -height * t);
      g.lineTo(x + 0.05, -height * t);
      g.stroke();
    }
    // The paan vine, heart leaves up the lower trunk.
    g.fillStyle = "rgb(70, 120, 46)";
    for (let k = 0; k < 16; k++) {
      const t = 0.05 + k * 0.022;
      g.beginPath();
      g.ellipse(lean * t * t + (k % 2 ? 0.1 : -0.1), -height * t, 0.1, 0.07, k % 2 ? 0.6 : -0.6, 0, TAU);
      g.fill();
    }
    // Fronds.
    const top = { x: lean, y: -height };
    g.strokeStyle = "rgb(70, 110, 46)";
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i / 8 - 0.5) * 3.2 + (random() - 0.5) * 0.2;
      const len = 0.9 + random() * 0.4;
      const ex = top.x + Math.cos(a) * len;
      const ey = top.y + Math.sin(a) * len * 0.6 + len * 0.35;
      g.lineWidth = 0.035;
      g.beginPath();
      g.moveTo(top.x, top.y);
      g.quadraticCurveTo(top.x + Math.cos(a) * len * 0.6, top.y + Math.sin(a) * len * 0.6, ex, ey);
      g.stroke();
      g.lineWidth = 0.015;
      for (let k = 2; k < 10; k++) {
        const t = k / 10;
        const px = top.x + (ex - top.x) * t;
        const py = top.y + (ey - top.y) * t - Math.sin(t * Math.PI) * 0.1;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + 0.05, py + 0.22 * (1 - t * 0.5));
        g.moveTo(px, py);
        g.lineTo(px - 0.05, py + 0.22 * (1 - t * 0.5));
        g.stroke();
      }
    }
    // A bunch of green nuts under the crown.
    g.fillStyle = "rgb(150, 150, 50)";
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      g.arc(top.x + 0.1 + (k % 3) * 0.06, top.y + 0.25 + Math.floor(k / 3) * 0.06, 0.04, 0, TAU);
      g.fill();
    }
  });
}

/** A banana plant, its broad leaves torn by the wind. */
export function banana(seed: number) {
  return sprite(`banana-${seed}`, -1.6, -3.2, 3.2, 3.25, 70, (g) => {
    const random = mulberry32(seed);
    g.fillStyle = "rgb(120, 140, 70)";
    g.beginPath();
    g.moveTo(-0.14, 0);
    g.lineTo(-0.1, -1.5);
    g.lineTo(0.1, -1.5);
    g.lineTo(0.14, 0);
    g.fill();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.8;
      const len = 1.1 + random() * 0.5;
      g.save();
      g.translate(0, -1.45);
      g.rotate(a + Math.PI / 2);
      g.fillStyle = rgb(mix([60, 110, 40], [140, 176, 80], random()));
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(0.3, -len * 0.5, 0.05, -len);
      g.quadraticCurveTo(-0.3, -len * 0.5, 0, 0);
      g.fill();
      g.strokeStyle = "rgba(200, 220, 140, 0.5)";
      g.lineWidth = 0.02;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0.05, -len);
      g.stroke();
      g.restore();
    }
  });
}

// ─── The kopou orchid ──────────────────────────────────────────────────────

/** One raceme of the foxtail orchid: a dense, drooping tail of pink-spotted white flowers. */
export function raceme(variant: number) {
  return sprite(`raceme-${variant}`, -0.2, -0.02, 0.4, 0.72, 220, (g) => {
    const random = mulberry32(40 + variant);
    const bend = (variant - 1) * 0.08;
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const x = Math.sin(t * 1.6) * bend * 2 + (random() - 0.5) * 0.09 * (1 - t * 0.5);
      const y = t * 0.66;
      const r = 0.026 * (1 - t * 0.45);
      g.fillStyle = rgb(mix([252, 240, 246], [236, 156, 206], random() * 0.6));
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      if (random() < 0.6) {
        g.fillStyle = "rgb(186, 70, 160)";
        g.beginPath();
        g.arc(x + (random() - 0.5) * r, y + (random() - 0.5) * r, r * 0.35, 0, TAU);
        g.fill();
      }
    }
  });
}

/** The orchid's thick strap leaves, in two ranks, clasping the branch. */
export function orchidLeaves() {
  return sprite("orchid-leaves", -0.5, -0.3, 1.0, 0.45, 180, (g) => {
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const len = 0.35 + (i % 3) * 0.06;
      g.save();
      g.rotate(side * (0.4 + i * 0.12));
      g.fillStyle = rgb(mix([50, 96, 50], [110, 150, 80], i / 6));
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(side * len * 0.5, -0.08, side * len, 0.02);
      g.quadraticCurveTo(side * len * 0.5, 0.04, 0, 0.03);
      g.fill();
      g.restore();
    }
  });
}

// ─── The ground ────────────────────────────────────────────────────────────

/** Rows of tea, pruned flat as tables, the new flush bright on top; built once in world units. */
export function teaRows(from: number, to: number, rows: number[]) {
  const random = mulberry32(606);
  const body = new Path2D();
  const flush = new Path2D();
  for (const y of rows) {
    const r = 0.26 + y * 0.03;
    let x = from + random() * 0.4;
    let guard = 0;
    while (x < to && guard++ < 400) {
      const len = 2.6 + random() * 3;
      for (let t = 0; t < len; t += r * 0.8) {
        const bx = x + t;
        const by = y - r * 0.5 + (random() - 0.5) * 0.05;
        body.moveTo(bx + r, by);
        body.arc(bx, by, r, 0, TAU);
        flush.moveTo(bx + r * 0.75, by - r * 0.55);
        flush.ellipse(bx, by - r * 0.55, r * 0.75, r * 0.3, 0, 0, TAU);
      }
      body.rect(x, y - r * 0.5, len, r * 0.5);
      x += len + 0.35 + random() * 0.3;
    }
  }
  return { body, flush };
}

/** Grass: tufts over the whole ground, in chunks along x so only the ones on screen are stroked. */
export function grassChunks(from: number, to: number, depth: number) {
  const random = mulberry32(99);
  const chunks: { x: number; path: Path2D; flowers: Path2D }[] = [];
  for (let x0 = from; x0 < to; x0 += 6) {
    const path = new Path2D();
    const flowers = new Path2D();
    for (let i = 0; i < 180; i++) {
      const x = x0 + random() * 6;
      const y = 0.2 + random() ** 0.8 * depth;
      const h = 0.06 + y * 0.012 + random() * 0.05;
      for (let k = -1; k <= 1; k++) {
        path.moveTo(x + k * 0.02, y);
        path.lineTo(x + k * 0.05 + (random() - 0.5) * 0.02, y - h);
      }
      if (random() < 0.12) {
        flowers.moveTo(x + 0.025, y - h);
        flowers.arc(x, y - h, 0.022, 0, TAU);
      }
    }
    chunks.push({ x: x0, path, flowers });
  }
  return chunks;
}

// ─── Far away ──────────────────────────────────────────────────────────────

/**
 * The valley beyond the village, in its own units (1 = one unit above the horizon at zoom 1):
 * two ridges of blue hills, the Brahmaputra with its sandbars, and a line of groves between.
 */
export function valley() {
  const random = mulberry32(1414);
  const ridge = (base: number, height: number, rough: number) => {
    const path = new Path2D();
    path.moveTo(-120, 0.2);
    let guard = 0;
    for (let x = -120; x <= 120 && guard++ < 2000; x += 0.8) {
      const y = base - height * (0.5 + 0.35 * Math.sin(x * 0.11 + height) + 0.15 * Math.sin(x * 0.37)) - (random() - 0.5) * rough;
      path.lineTo(x, y);
    }
    path.lineTo(120, 0.2);
    path.closePath();
    return path;
  };
  const far = ridge(-0.3, 1.6, 0.1);
  const near = ridge(-0.2, 0.8, 0.12);
  const river = new Path2D();
  const bars = new Path2D();
  river.rect(-120, -0.3, 240, 0.16);
  for (let x = -120; x < 120; x += 3 + random() * 6) {
    const w = 1 + random() * 3;
    bars.moveTo(x, -0.2);
    bars.ellipse(x + w / 2, -0.21, w / 2, 0.025, 0, 0, TAU);
  }
  // Groves: round crowns, areca palms standing above them, bamboo plumes.
  const groves = new Path2D();
  groves.rect(-120, -0.14, 240, 0.16);
  let x = -120;
  let guard = 0;
  while (x < 120 && guard++ < 2000) {
    const w = 0.8 + random() * 3;
    for (let t = 0; t < w; t += 0.12 + random() * 0.1) {
      const e = Math.sin((t / w) * Math.PI);
      const r = (0.05 + random() * 0.08) * (0.5 + e * 0.6);
      groves.moveTo(x + t + r, -0.12 - e * 0.14);
      groves.arc(x + t, -0.12 - e * 0.14, r, 0, TAU);
    }
    if (random() < 0.7) {
      const px = x + random() * w;
      const ph = 0.35 + random() * 0.2;
      groves.rect(px - 0.006, -ph, 0.012, ph);
      groves.moveTo(px + 0.07, -ph);
      groves.ellipse(px, -ph, 0.07, 0.03, 0, 0, TAU);
    }
    x += w + random() * 1.2;
  }
  return { far, near, river, bars, groves };
}

/** Paddy stubble and the bunds between fields, for the open ground at night. */
export function fields(from: number, to: number, depth: number) {
  const random = mulberry32(51);
  const stubble = new Path2D();
  const bunds = new Path2D();
  for (let y = 0.4; y < depth; y += 0.22 + y * 0.04) {
    for (let x = from; x < to; x += 0.25 + random() * 0.2) {
      const h = 0.05 + y * 0.01;
      stubble.moveTo(x, y);
      stubble.lineTo(x - 0.02, y - h);
      stubble.moveTo(x + 0.03, y);
      stubble.lineTo(x + 0.05, y - h);
    }
  }
  for (let y = 1.2; y < depth; y += 1.6 + random()) {
    bunds.moveTo(from, y);
    let guard = 0;
    for (let x = from; x < to && guard++ < 400; x += 2) bunds.lineTo(x, y + Math.sin(x * 0.3 + y) * 0.06);
  }
  return { stubble, bunds };
}
