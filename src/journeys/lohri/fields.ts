// The land: the tree line on the horizon, the Shivalik hills behind Anandpur Sahib, and the fields
// of the rabi season: mustard in flower and sugarcane beside the village, and wheat to the east that
// grows through the winter and turns from green to gold by Vaisakhi.
//
// World units, y down. The far edge of the plain is at HORIZON; everything nearer stands at y > HORIZON.
import {
  TAU,
  clamp,
  lerp,
  mix,
  mulberry32,
  rgb,
  type Ctx,
  type RGB,
  type View,
} from "../paint";

export const HORIZON = -3.2;
/** The wheat, east of the village, tiled in strips; the part in HARVEST can be cut. */
export const WHEAT = { x0: 16.5, x1: 36.5, tile: 4 };
export const HARVEST = { x0: 20.5, x1: 32.5, y0: -1.4, y1: 3.6 };
/** A field of mustard beside the wheat, in flower through Magh. */
export const EAST_MUSTARD = { x0: 8.5, x1: 16.5 };
/** Mustard and cane to the west. */
export const MUSTARD = { x0: -52, x1: -17.5 };
export const CANE = { x0: -34, x1: -26.5, y0: -1.8, y1: 1.2 };
export const FIELD_NEAR = 7.8;

const TILE_PX = 120;
const TILE_H = 1.4;

/** Rows of the field from the horizon to the viewer, a little closer together far away. */
export function fieldRows() {
  const rows: number[] = [];
  let y = HORIZON + 0.18;
  let guard = 0;
  while (y < FIELD_NEAR && guard++ < 200) {
    rows.push(y);
    y += lerp(0.2, 0.34, clamp((y - HORIZON) / (FIELD_NEAR - HORIZON)));
  }
  return rows;
}

/** How big a row reads, smaller towards the horizon. */
export const rowScale = (y: number) =>
  lerp(0.4, 1.0, clamp((y - HORIZON) / (FIELD_NEAR - HORIZON)));

/** How tall the wheat stands through the season, 0 (Poh) to 1 (Vaisakh). */
export function wheatHeight(season: number) {
  const t = clamp(season) * 3;
  const i = Math.min(2, Math.floor(t));
  const heights = [0.25, 0.55, 0.8, 0.8];
  return lerp(heights[i], heights[i + 1], t - i);
}

// ─── Wheat ──────────────────────────────────────────────────────────────────

/** The wheat's colour at `ripe` 0..1: winter green, spring green, turning, gold. */
export function wheatColour(ripe: number): { stalk: RGB; ear: RGB } {
  const stalks: RGB[] = [
    [70, 132, 54],
    [92, 150, 60],
    [168, 164, 70],
    [214, 172, 78],
  ];
  const ears: RGB[] = [
    [88, 150, 64],
    [120, 170, 70],
    [206, 186, 90],
    [236, 196, 96],
  ];
  const t = clamp(ripe) * 3;
  const i = Math.min(2, Math.floor(t));
  return {
    stalk: mix(stalks[i], stalks[i + 1], t - i),
    ear: mix(ears[i], ears[i + 1], t - i),
  };
}

export type WheatTiles = {
  stages: HTMLCanvasElement[][];
  width: number;
  height: number;
};

/** Stage 0 young tufts, 1 knee-high, 2 in ear, 3 ripe; three variants of each, so rows don't repeat. */
export function paintWheatTiles(): WheatTiles {
  const width = WHEAT.tile * TILE_PX;
  const height = Math.round(TILE_H * TILE_PX);
  const stages: HTMLCanvasElement[][] = [];
  for (let s = 0; s < 4; s++) {
    const row: HTMLCanvasElement[] = [];
    for (let variant = 0; variant < 3; variant++) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const g = canvas.getContext("2d")!;
      g.scale(TILE_PX, TILE_PX);
      g.translate(0, TILE_H);
      const random = mulberry32(700 + variant * 31);
      const colour = wheatColour([0, 0.33, 0.66, 1][s]);
      const tall = wheatHeight(s / 3);
      // Soil between the plants, then clumps back to front.
      g.fillStyle =
        s === 0 ? "rgba(92, 70, 44, 0.9)" : "rgba(60, 50, 30, 0.35)";
      g.fillRect(0, -0.12, WHEAT.tile, 0.12);
      const count = 46;
      for (let i = 0; i < count; i++) {
        const x = ((i + random() * 0.8) / count) * WHEAT.tile;
        clump(
          g,
          x,
          -random() * 0.08,
          tall * (0.85 + random() * 0.3),
          s,
          colour,
          random,
          0,
        );
      }
      row.push(canvas);
    }
    stages.push(row);
  }
  return { stages, width: WHEAT.tile, height: TILE_H };
}

/** One clump of wheat, standing on (x, y): a few stalks leaning out, and ears if it is old enough. */
export function clump(
  g: Ctx,
  x: number,
  y: number,
  tall: number,
  stage: number,
  colour: { stalk: RGB; ear: RGB },
  random: () => number,
  sway: number,
) {
  const stalks = stage === 0 ? 5 : 6;
  g.lineCap = "round";
  for (let k = 0; k < stalks; k++) {
    const lean =
      (k / (stalks - 1) - 0.5) * 0.5 + (random() - 0.5) * 0.12 + sway;
    const h = tall * (0.75 + random() * 0.3);
    const tx = x + Math.sin(lean) * h;
    const ty = y - Math.cos(lean) * h;
    g.strokeStyle = rgb(mix(colour.stalk, [30, 40, 20], random() * 0.25));
    g.lineWidth = stage === 0 ? 0.035 : 0.02;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.sin(lean) * h * 0.3, y - h * 0.6, tx, ty);
    g.stroke();
    if (stage === 0 || stage === 1) {
      // A long leaf arching off the stalk.
      g.strokeStyle = rgb(mix(colour.stalk, [150, 200, 90], 0.25));
      g.lineWidth = 0.028;
      const side = k % 2 ? 1 : -1;
      g.beginPath();
      g.moveTo(x + Math.sin(lean) * h * 0.2, y - h * 0.3);
      g.quadraticCurveTo(
        x + side * h * 0.3,
        y - h * 0.6,
        x + side * h * 0.45,
        y - h * 0.35,
      );
      g.stroke();
    }
    if (stage >= 2) {
      // The ear: a plump spike, with a few awns.
      g.strokeStyle = rgb(mix(colour.ear, [255, 240, 180], random() * 0.2));
      g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(tx + Math.sin(lean) * 0.16, ty - Math.cos(lean) * 0.16);
      g.stroke();
      g.strokeStyle = rgb(colour.ear, 0.7);
      g.lineWidth = 0.006;
      g.beginPath();
      g.moveTo(tx + Math.sin(lean) * 0.16, ty - Math.cos(lean) * 0.16);
      g.lineTo(
        tx + Math.sin(lean + 0.2) * 0.3,
        ty - Math.cos(lean + 0.2) * 0.3,
      );
      g.stroke();
    }
  }
}

/**
 * Draws one row of the wheat at `y` from tiles, blending the two stages either side of `ripe` and
 * leaning with the wind; `skip` leaves out the harvest's strip, drawn clump by clump.
 */
export function drawWheatRow(
  g: Ctx,
  v: View,
  tiles: WheatTiles,
  y: number,
  ripe: number | ((x: number) => number),
  seconds: number,
  wind: number,
  skip: boolean,
) {
  const scale = rowScale(y);
  const h = tiles.height * scale;
  const w = tiles.width;
  const left = v.x - v.width / 2 / v.scale - w;
  const right = v.x + v.width / 2 / v.scale + w;
  const vi = Math.floor((y * 7.3) % 3);
  for (let x = WHEAT.x0; x < WHEAT.x1; x += w) {
    if (x + w < left || x > right) continue;
    if (skip && x >= HARVEST.x0 - 0.01 && x < HARVEST.x1 - 0.01) continue;
    const variant = Math.abs(vi + Math.round(x / w)) % 3;
    // Each plot ripens at its own pace.
    const t = clamp(typeof ripe === "number" ? ripe : ripe(x)) * 3;
    const a = Math.min(2, Math.floor(t));
    const f = t - a;
    const lean =
      wind *
      (0.12 * Math.sin(seconds * 1.1 - x * 0.35 + y * 0.6) +
        0.05 * Math.sin(seconds * 2.3 + x));
    g.save();
    g.translate(x, y);
    g.transform(1, 0, -lean, 1, 0, 0);
    if (f < 0.99) {
      g.globalAlpha = 1;
      g.drawImage(tiles.stages[a][variant], -0.03, -h, w + 0.06, h);
    }
    if (f > 0.01) {
      g.globalAlpha = f;
      g.drawImage(tiles.stages[a + 1][variant], -0.03, -h, w + 0.06, h);
    }
    g.restore();
  }
  g.globalAlpha = 1;
}

export type Clump = {
  x: number;
  y: number;
  tall: number;
  seed: number;
  cut: number;
};

/** The clumps of the harvest strip, which the reapers and the reader can cut. */
export function makeClumps(rows: number[]): Clump[][] {
  const random = mulberry32(99);
  return rows
    .filter((y) => y >= HARVEST.y0 && y <= HARVEST.y1)
    .map((y) => {
      const list: Clump[] = [];
      const step = 0.11;
      for (
        let x = HARVEST.x0 + random() * step;
        x < HARVEST.x1;
        x += step * (0.7 + random() * 0.6)
      ) {
        list.push({
          x,
          y: y - random() * 0.06,
          tall: 0.85 + random() * 0.3,
          seed: Math.floor(random() * 1e6),
          cut: 0,
        });
      }
      return list;
    });
}

/** One row of the harvest strip: clumps standing, and stubble where they have been cut. */
export function drawClumpRow(
  g: Ctx,
  v: View,
  row: Clump[],
  ripe: number,
  seconds: number,
  wind: number,
) {
  if (!row.length) return;
  const y = row[0].y;
  const scale = rowScale(y);
  const colour = wheatColour(ripe);
  const stage = ripe < 0.17 ? 0 : ripe < 0.5 ? 1 : ripe < 0.83 ? 2 : 3;
  const left = v.x - v.width / 2 / v.scale - 0.5;
  const right = v.x + v.width / 2 / v.scale + 0.5;
  const lod = v.scale < 70 ? 3 : v.scale < 110 ? 2 : 1;
  const tall = wheatHeight(ripe) * scale;
  // Stubble first, in one stroke.
  g.strokeStyle = "rgba(196, 160, 86, 0.95)";
  g.lineWidth = 0.018;
  g.beginPath();
  for (let i = 0; i < row.length; i += lod) {
    const c = row[i];
    if (c.cut < 0.5 || c.x < left || c.x > right) continue;
    for (let k = -2; k <= 2; k++) {
      g.moveTo(c.x + k * 0.02, c.y);
      g.lineTo(c.x + k * 0.03, c.y - 0.1 * scale);
    }
  }
  g.stroke();
  for (let i = 0; i < row.length; i += lod) {
    const c = row[i];
    if (c.cut >= 0.5 || c.x < left || c.x > right) continue;
    const random = mulberry32(c.seed);
    const sway =
      wind *
        (0.12 * Math.sin(seconds * 1.1 - c.x * 0.35 + y * 0.6) +
          0.05 * Math.sin(seconds * 2.3 + c.x)) +
      c.cut * 1.2;
    clump(g, c.x, c.y, tall * c.tall, stage, colour, random, sway);
  }
}

// ─── Mustard and cane ───────────────────────────────────────────────────────

/** A strip of mustard in flower, painted once: blue-green leaves under a haze of yellow. */
export function paintMustardTile(bloom: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = WHEAT.tile * TILE_PX;
  canvas.height = Math.round(TILE_H * TILE_PX);
  const g = canvas.getContext("2d")!;
  g.scale(TILE_PX, TILE_PX);
  g.translate(0, TILE_H);
  const random = mulberry32(bloom ? 41 : 42);
  g.lineCap = "round";
  const heads: { x: number; y: number }[] = [];
  for (let i = 0; i < 44; i++) {
    const x = ((i + random()) / 44) * WHEAT.tile;
    const h = 0.75 + random() * 0.4;
    // Leaves low down, broad and blue-green.
    g.fillStyle = rgb(mix([96, 140, 84], [70, 112, 72], random()));
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      g.ellipse(
        x + (k ? 0.09 : -0.09),
        -0.16 - random() * 0.14,
        0.13,
        0.045,
        k ? -0.5 : 0.5,
        0,
        TAU,
      );
      g.fill();
    }
    g.strokeStyle = rgb(mix([110, 150, 84], [80, 120, 70], random()));
    g.lineWidth = 0.016;
    for (let k = 0; k < 4; k++) {
      const lean = (k / 3 - 0.5) * 0.7 + (random() - 0.5) * 0.2;
      const tx = x + Math.sin(lean) * h;
      const ty = -Math.cos(lean) * h;
      g.beginPath();
      g.moveTo(x, 0);
      g.quadraticCurveTo(x + lean * 0.2, -h * 0.5, tx, ty);
      g.stroke();
      heads.push({ x: tx, y: ty });
    }
  }
  // The flowers: loose clusters of four-petalled yellow that run together into one sheet; or,
  // later, the thin green pods.
  for (const head of heads) {
    if (bloom) {
      for (let j = 0; j < 10; j++) {
        g.fillStyle = rgb(mix([240, 196, 24], [255, 236, 100], random()));
        g.beginPath();
        g.arc(
          head.x + (random() - 0.5) * 0.2,
          head.y + (random() - 0.4) * 0.16,
          0.03 + random() * 0.018,
          0,
          TAU,
        );
        g.fill();
      }
    } else {
      g.strokeStyle = rgb(mix([150, 150, 70], [120, 130, 60], random()));
      g.lineWidth = 0.012;
      for (let j = 0; j < 5; j++) {
        const a = -Math.PI / 2 + (random() - 0.5) * 1.4;
        g.beginPath();
        g.moveTo(head.x, head.y + 0.05);
        g.lineTo(
          head.x + Math.cos(a) * 0.12,
          head.y + 0.05 + Math.sin(a) * 0.12,
        );
        g.stroke();
      }
    }
  }
  return canvas;
}

/** A stand of sugarcane, tall and dense, painted once. */
export function paintCane() {
  const w = CANE.x1 - CANE.x0;
  const hgt = 3.4;
  const px = 70;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * px);
  canvas.height = Math.round(hgt * px);
  const g = canvas.getContext("2d")!;
  g.scale(px, px);
  g.translate(0, hgt);
  const random = mulberry32(55);
  for (let i = 0; i < 180; i++) {
    const x = random() * w;
    const h = 2.2 + random() * 1.0;
    const lean = (random() - 0.5) * 0.12;
    const tone = random();
    // The cane: jointed, purple-green.
    g.strokeStyle = rgb(mix([110, 110, 60], [120, 70, 80], tone));
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + lean * h, -h);
    g.stroke();
    g.strokeStyle = "rgba(40, 30, 20, 0.35)";
    g.lineWidth = 0.055;
    for (let j = 1; j < 7; j++) {
      const t = j / 7;
      g.beginPath();
      g.moveTo(x + lean * h * t - 0.02, -h * t);
      g.lineTo(x + lean * h * t + 0.02, -h * t);
      g.stroke();
    }
    // Long leaves arching from the top.
    g.strokeStyle = rgb(mix([70, 130, 60], [110, 150, 70], random()));
    g.lineWidth = 0.035;
    for (let k = 0; k < 5; k++) {
      const side = k % 2 ? 1 : -1;
      const tx = x + lean * h;
      const ty = -h + k * 0.2;
      const len = 0.6 + random() * 0.5;
      g.beginPath();
      g.moveTo(tx, ty);
      g.quadraticCurveTo(
        tx + side * len * 0.6,
        ty - 0.35,
        tx + side * len,
        ty + 0.25 + random() * 0.3,
      );
      g.stroke();
    }
  }
  return { canvas, width: w, height: hgt };
}

/** A tiled row of mustard across the west fields. */
export function drawMustardRow(
  g: Ctx,
  v: View,
  tile: HTMLCanvasElement,
  y: number,
  seconds: number,
  wind: number,
  x0: number,
  x1: number,
  skip?: { x0: number; x1: number },
) {
  const w = WHEAT.tile;
  const scale = rowScale(y);
  const h = TILE_H * scale;
  const left = v.x - v.width / 2 / v.scale - w;
  const right = v.x + v.width / 2 / v.scale + w;
  // Long fields stagger their tiles row to row, so no seam runs down the field; the ends are then
  // trimmed back to a field edge, with a little give from row to row.
  const long = x1 - x0 > w * 3;
  const offset = long ? ((y * 13.7) % 1) * w - w : 0;
  const end0 = long ? x0 + 0.12 * Math.sin(y * 5.1) : x0;
  const end1 = long ? x1 + 0.12 * Math.sin(y * 4.3 + 1) : x1;
  let guard = 0;
  for (let x = x0 + offset; x < end1 && guard++ < 200; x += w) {
    if (x + w < left || x > right) continue;
    const a0 = Math.max(x, end0);
    const b1 = Math.min(x + w, end1);
    const parts: [number, number][] = [];
    if (skip && b1 > skip.x0 && a0 < skip.x1) {
      const s0 = skip.x0 + 0.1 * Math.sin(y * 3.7);
      const s1 = skip.x1 + 0.1 * Math.sin(y * 2.9 + 2);
      parts.push([a0, Math.min(b1, s0)], [Math.max(a0, s1), b1]);
    } else parts.push([a0, b1]);
    const lean = wind * 0.1 * Math.sin(seconds * 0.9 - x * 0.3 + y);
    g.save();
    g.translate(x, y);
    g.transform(1, 0, -lean, 1, 0, 0);
    for (const [a, b] of parts) {
      if (b - a < 0.02) continue;
      const pad0 = a === x ? 0.03 : 0;
      const pad1 = b === x + w ? 0.03 : 0;
      g.drawImage(
        tile,
        ((a - x) / w) * tile.width,
        0,
        ((b - a) / w) * tile.width,
        tile.height,
        a - x - pad0,
        -h,
        b - a + pad0 + pad1,
        h,
      );
    }
    g.restore();
  }
}

// ─── Horizon ────────────────────────────────────────────────────────────────

export type Horizon = {
  trees: { x: number; r: number; h: number; kind: number }[];
  hills: { x: number; y: number }[];
};

export function makeHorizon(): Horizon {
  const random = mulberry32(77);
  const trees: Horizon["trees"] = [];
  let x = -60;
  let guard = 0;
  while (x < 95 && guard++ < 2000) {
    const kind = random() < 0.2 ? 2 : random() < 0.5 ? 1 : 0;
    trees.push({
      x,
      r: 0.16 + random() * 0.26 + (kind === 2 ? 0.2 : 0),
      h: 0.25 + random() * 0.4,
      kind,
    });
    x += 0.25 + random() * 0.9 + (random() < 0.12 ? 2 : 0);
  }
  // The Shivaliks: low blue ridges, rising to the east.
  const hills: Horizon["hills"] = [];
  for (let hx = 20; hx <= 100; hx += 0.6) {
    const rise = clamp((hx - 22) / 16);
    const y =
      -rise *
      (1.3 +
        0.9 * Math.sin(hx * 0.21) +
        0.5 * Math.sin(hx * 0.53 + 1) +
        0.25 * Math.sin(hx * 1.7));
    hills.push({ x: hx, y: HORIZON - 0.2 + y });
  }
  return { trees, hills };
}

/** The Shivaliks, then the tree line, both hazed towards the sky colour. */
export function drawHorizon(g: Ctx, v: View, horizon: Horizon, haze: RGB) {
  const left = v.x - v.width / 2 / v.scale - 2;
  const right = v.x + v.width / 2 / v.scale + 2;
  if (right > 20) {
    g.fillStyle = rgb(mix([96, 116, 150], haze, 0.55));
    g.beginPath();
    g.moveTo(Math.max(20, left), HORIZON + 0.1);
    for (const p of horizon.hills)
      if (p.x > left - 1 && p.x < right + 1) g.lineTo(p.x, p.y);
    g.lineTo(Math.min(100, right), HORIZON + 0.1);
    g.closePath();
    g.fill();
    // A nearer ridge, a little darker.
    g.fillStyle = rgb(mix([84, 106, 120], haze, 0.4));
    g.beginPath();
    g.moveTo(Math.max(24, left), HORIZON + 0.1);
    for (const p of horizon.hills)
      if (p.x > 24 && p.x > left - 1 && p.x < right + 1)
        g.lineTo(
          p.x,
          HORIZON + 0.1 + (p.y - HORIZON) * 0.45 + 0.1 * Math.sin(p.x * 2.1),
        );
    g.lineTo(Math.min(100, right), HORIZON + 0.1);
    g.closePath();
    g.fill();
  }
  // The tree line: kikar, shisham and the odd great pipal, all one far green.
  g.fillStyle = rgb(mix([52, 78, 50], haze, 0.35));
  g.beginPath();
  for (const t of horizon.trees) {
    if (t.x < left || t.x > right) continue;
    const top = HORIZON - t.h - t.r;
    if (t.kind === 1) {
      // Kikar: a flat umbrella.
      g.ellipse(t.x, top + t.r * 0.5, t.r * 1.3, t.r * 0.45, 0, 0, TAU);
    } else {
      g.moveTo(t.x + t.r, top + t.r);
      g.arc(t.x, top + t.r, t.r, 0, TAU);
      g.moveTo(t.x + t.r * 0.8 + 0.3, top + t.r * 1.2);
      g.arc(t.x + 0.3, top + t.r * 1.2, t.r * 0.8, 0, TAU);
    }
    g.rect(t.x - 0.04, top + t.r, 0.08, HORIZON - top - t.r + 0.1);
  }
  g.fill();
  // Low scrub along the foot of it.
  g.fillRect(left, HORIZON - 0.12, right - left, 0.22);
}

/** A tree in the fields: a spreading pipal or a kikar. */
export function drawTree(
  g: Ctx,
  x: number,
  y: number,
  size: number,
  kind: "pipal" | "kikar" | "shisham",
  seconds: number,
  green: RGB,
) {
  const sway = Math.sin(seconds * 0.6 + x) * 0.03 * size;
  g.fillStyle = "#4a3426";
  g.beginPath();
  g.moveTo(x - 0.12 * size, y);
  g.quadraticCurveTo(
    x - 0.05 * size,
    y - 1.2 * size,
    x - 0.3 * size,
    y - 2 * size,
  );
  g.lineTo(x - 0.15 * size, y - 2.05 * size);
  g.quadraticCurveTo(
    x + 0.02 * size,
    y - 1.5 * size,
    x + 0.35 * size,
    y - 2.1 * size,
  );
  g.lineTo(x + 0.45 * size, y - 2.0 * size);
  g.quadraticCurveTo(x + 0.1 * size, y - 1.1 * size, x + 0.14 * size, y);
  g.closePath();
  g.fill();
  const blobs =
    kind === "kikar"
      ? [
          [0, -2.35, 1.4, 0.38],
          [-0.8, -2.15, 0.8, 0.3],
          [0.9, -2.2, 0.8, 0.3],
        ]
      : kind === "pipal"
        ? [
            [0, -2.9, 1.3, 1.0],
            [-1.0, -2.4, 0.9, 0.75],
            [1.0, -2.45, 0.95, 0.75],
            [-0.3, -3.5, 0.8, 0.6],
            [0.6, -3.3, 0.8, 0.6],
          ]
        : [
            [0, -2.8, 0.8, 1.0],
            [-0.5, -2.3, 0.6, 0.6],
            [0.5, -2.4, 0.6, 0.6],
          ];
  blobs.forEach(([bx, by, rx, ry], i) => {
    g.fillStyle = rgb(
      mix(green, i % 2 ? [20, 40, 20] : [120, 150, 80], 0.15 + (i % 3) * 0.08),
    );
    g.beginPath();
    g.ellipse(
      x + bx * size + sway * (1 - by / 4),
      y + by * size,
      rx * size,
      ry * size,
      0,
      0,
      TAU,
    );
    g.fill();
  });
}
