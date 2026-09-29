// The ground between the places, and the air over it: the village's beaten earth and the haveli's
// brick courtyard, the soil under the fields, the road out to the gurdwara and the mela, the winter
// fog, and the harvest strip of wheat that the reapers (and the reader) cut clump by clump.
//
// World units, y down, as in ./places.ts and ./fields.ts.
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
import {
  FIELD_NEAR,
  HARVEST,
  HORIZON,
  MUSTARD,
  WHEAT,
  clump,
  makeClumps,
  rowScale,
  wheatColour,
  wheatHeight,
  type Clump,
} from "./fields";
import { GURDWARA, HAVELI, VILLAGE } from "./places";

/** The haveli's courtyard, paved in brick, where the fire is lit. */
export const COURTYARD = {
  x0: HAVELI.x - 0.3,
  x1: HAVELI.x + HAVELI.w + 0.3,
  y0: 0,
  y1: 6.2,
};
/** Beaten earth round the gurdwara, the road and the mela ground. */
export const ROAD = { x0: 36.5, x1: 84 };
/** The gurdwara's marble parikrama, in front of its steps. */
export const MARBLE = { x0: 38.4, x1: 52.6, y0: -0.9, y1: 1.0 };

/** Left, right, top and bottom of what the view can see, in world units. */
export function bounds(v: View, pad = 0) {
  return {
    left: v.x - v.ax / v.scale - pad,
    right: v.x + (v.width - v.ax) / v.scale + pad,
    top: v.y - v.ay / v.scale - pad,
    bottom: v.y + (v.height - v.ay) / v.scale + pad,
  };
}

// ─── Ground ─────────────────────────────────────────────────────────────────

/** The courtyard's brick paving, painted once. */
export function paintCourtyard(px = 60) {
  const w = COURTYARD.x1 - COURTYARD.x0;
  const h = COURTYARD.y1 - COURTYARD.y0;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * px);
  canvas.height = Math.round(h * px);
  const g = canvas.getContext("2d")!;
  g.scale(px, px);
  const random = mulberry32(606);
  g.fillStyle = "#8a5a44";
  g.fillRect(0, 0, w, h);
  // Small bricks laid flat in running bond, courses a little deeper towards the viewer.
  let y = 0;
  let row = 0;
  let guard = 0;
  while (y < h && guard++ < 300) {
    const s = lerp(0.09, 0.16, y / h);
    const bw = s * 2.4;
    const offset = (row % 2) * bw * 0.5;
    for (let x = -offset; x < w; x += bw) {
      g.fillStyle = rgb(mix([168, 96, 70], [128, 74, 56], random()));
      g.fillRect(x + 0.008, y + 0.008, bw - 0.016, s - 0.016);
    }
    y += s;
    row++;
  }
  // Worn paths, dust, and a darker ring where the fire has been lit year after year.
  g.fillStyle = "rgba(200, 170, 130, 0.22)";
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    g.ellipse(
      random() * w,
      random() * h,
      0.3 + random() * 0.8,
      0.1 + random() * 0.2,
      0,
      0,
      TAU,
    );
    g.fill();
  }
  return { canvas, width: w, height: h };
}

/** The earth, the fields' soil and the road, back to front. */
export function drawGround(
  g: Ctx,
  v: View,
  courtyard: ReturnType<typeof paintCourtyard>,
  haze: RGB,
) {
  const { left, right, bottom } = bounds(v, 1);
  if (bottom < HORIZON) return;
  // The whole plain: soil, hazing to the sky at the horizon.
  const plain = g.createLinearGradient(0, HORIZON, 0, FIELD_NEAR + 2);
  plain.addColorStop(0, rgb(mix([120, 118, 84], haze, 0.5)));
  plain.addColorStop(0.25, "#7a6c48");
  plain.addColorStop(1, "#5e4a32");
  g.fillStyle = plain;
  g.fillRect(left, HORIZON - 0.05, right - left, bottom - HORIZON + 0.05);

  // Furrows under the crops, running away from the viewer.
  const furrow = (x0: number, x1: number) => {
    if (x1 < left || x0 > right) return;
    g.strokeStyle = "rgba(60, 44, 28, 0.35)";
    g.lineWidth = 0.04;
    g.beginPath();
    for (
      let x = Math.max(x0, Math.floor(left));
      x < Math.min(x1, right);
      x += 0.7
    ) {
      g.moveTo(x, HORIZON + 0.2);
      g.lineTo(x + (x - v.x) * 0.25, FIELD_NEAR + 1);
    }
    g.stroke();
  };
  furrow(MUSTARD.x0, MUSTARD.x1);
  furrow(WHEAT.x0 - 8, WHEAT.x1);

  // The village's beaten earth, lipai-smooth in front of the houses.
  if (VILLAGE.x1 > left && VILLAGE.x0 < right) {
    const earth = g.createLinearGradient(0, 0, 0, 9);
    earth.addColorStop(0, "#b39470");
    earth.addColorStop(1, "#9a7a58");
    g.fillStyle = earth;
    g.beginPath();
    g.moveTo(VILLAGE.x0 - 0.6, -0.05);
    g.lineTo(VILLAGE.x1 + 0.6, -0.05);
    g.lineTo(VILLAGE.x1 + 2.4, 9);
    g.lineTo(VILLAGE.x0 - 2.4, 9);
    g.closePath();
    g.fill();
    // A drain along the house fronts.
    g.fillStyle = "rgba(70, 50, 36, 0.35)";
    g.fillRect(VILLAGE.x0, 0, VILLAGE.x1 - VILLAGE.x0, 0.07);
    if (COURTYARD.x1 > left && COURTYARD.x0 < right) {
      const c = courtyard;
      g.drawImage(c.canvas, COURTYARD.x0, COURTYARD.y0, c.width, c.height);
      // Its edge fades into the earth.
      const fade = g.createLinearGradient(
        0,
        COURTYARD.y1 - 1.2,
        0,
        COURTYARD.y1,
      );
      fade.addColorStop(0, "rgba(154, 122, 88, 0)");
      fade.addColorStop(1, "rgba(154, 122, 88, 1)");
      g.fillStyle = fade;
      g.fillRect(COURTYARD.x0, COURTYARD.y1 - 1.2, c.width, 1.2);
    }
  }

  // The road east, and the mela ground: dust, with cart ruts.
  if (ROAD.x1 > left && ROAD.x0 < right) {
    const dust = g.createLinearGradient(0, -1, 0, 9);
    dust.addColorStop(0, "#b8a078");
    dust.addColorStop(1, "#a48660");
    g.fillStyle = dust;
    g.beginPath();
    g.moveTo(ROAD.x0 + 1.4, -1.2);
    g.lineTo(ROAD.x1, -1.2);
    g.lineTo(ROAD.x1, 9);
    g.lineTo(ROAD.x0 - 1.2, 9);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(110, 84, 56, 0.3)";
    g.lineWidth = 0.06;
    g.beginPath();
    for (const y of [2.05, 2.85]) {
      g.moveTo(Math.max(ROAD.x0 - 0.6, left), y);
      g.lineTo(Math.min(ROAD.x1, right), y + 0.05);
    }
    g.stroke();
    if (MARBLE.x1 > left && MARBLE.x0 < right) {
      g.fillStyle = "#e6e0d4";
      g.fillRect(
        MARBLE.x0,
        MARBLE.y0,
        MARBLE.x1 - MARBLE.x0,
        MARBLE.y1 - MARBLE.y0,
      );
      g.strokeStyle = "rgba(150, 140, 126, 0.5)";
      g.lineWidth = 0.02;
      g.beginPath();
      for (let x = MARBLE.x0; x <= MARBLE.x1; x += 0.6) {
        g.moveTo(x, MARBLE.y0);
        g.lineTo(x + (x - GURDWARA.x) * 0.06, MARBLE.y1);
      }
      for (let y = MARBLE.y0 + 0.35; y < MARBLE.y1; y += 0.4) {
        g.moveTo(MARBLE.x0, y);
        g.lineTo(MARBLE.x1, y);
      }
      g.stroke();
    }
  }
}

// ─── Stubble ────────────────────────────────────────────────────────────────

/** A strip of cut field, painted once: stubble in rows, straw lying between. */
export function paintStubble(px = 120) {
  const w = WHEAT.tile;
  const h = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * px);
  canvas.height = Math.round(h * px);
  const g = canvas.getContext("2d")!;
  g.scale(px, px);
  g.translate(0, h);
  const random = mulberry32(313);
  g.fillStyle = "rgba(120, 88, 48, 0.22)";
  g.fillRect(0, -0.05, w, 0.05);
  g.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const x = random() * w;
    g.strokeStyle = rgb(mix([214, 176, 96], [168, 128, 64], random()));
    g.lineWidth = 0.018;
    g.beginPath();
    for (let k = -2; k <= 2; k++) {
      g.moveTo(x + k * 0.02, 0);
      g.lineTo(x + k * 0.03, -0.12 - random() * 0.06);
    }
    g.stroke();
  }
  // Loose straw.
  g.strokeStyle = "rgba(236, 204, 130, 0.8)";
  g.lineWidth = 0.012;
  g.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = random() * w;
    const a = (random() - 0.5) * 0.8;
    g.moveTo(x, -0.02);
    g.lineTo(x + Math.cos(a) * 0.2, -0.02 + Math.sin(a) * 0.04);
  }
  g.stroke();
  return { canvas, width: w, height: h };
}

export function drawStubbleRow(
  g: Ctx,
  v: View,
  tile: ReturnType<typeof paintStubble>,
  y: number,
  x0: number,
  x1: number,
) {
  const { left, right } = bounds(v, WHEAT.tile);
  const s = rowScale(y);
  // Cut straw and chaff lying thick on the soil, so the rows run together.
  const from = Math.max(x0, left);
  const to = Math.min(x1, right);
  if (to > from) {
    const h = tile.height * s;
    const chaff = g.createLinearGradient(0, y, 0, y - h);
    chaff.addColorStop(0, "rgb(170, 132, 72)");
    chaff.addColorStop(0.45, "rgba(186, 148, 82, 0.75)");
    chaff.addColorStop(1, "rgba(196, 160, 92, 0)");
    g.fillStyle = chaff;
    g.fillRect(from, y - h, to - from, h);
  }
  for (let x = x0; x < x1 - 0.01; x += tile.width) {
    if (x + tile.width < left || x > right) continue;
    const w = Math.min(tile.width, x1 - x);
    g.drawImage(
      tile.canvas,
      0,
      0,
      (tile.canvas.width * w) / tile.width,
      tile.canvas.height,
      x - 0.03,
      y - tile.height * s,
      w + 0.06,
      tile.height * s,
    );
  }
}

// ─── The harvest strip ──────────────────────────────────────────────────────

const HARVEST_PX = 80;
const ROW_H = 1.9;
const ROW_FOOT = 0.25;

type Row = {
  clumps: Clump[];
  y: number;
  canvas: HTMLCanvasElement | null;
  dirty: boolean;
  falling: Clump[];
};

/**
 * The strip of ripe wheat that is cut on screen. Each row is painted once into its own canvas and
 * repainted only when the reader cuts into it; the reapers' cut is a clip, so it costs nothing.
 */
export class Harvest {
  readonly rows: Row[];
  private readonly x0 = HARVEST.x0 - 0.4;

  constructor(fieldRows: number[]) {
    this.rows = makeClumps(fieldRows).map((clumps) => ({
      clumps,
      y: clumps[0]?.y ?? 0,
      canvas: null,
      dirty: true,
      falling: [],
    }));
  }

  /** Cuts every standing clump within `r` of (x, y); returns how many fell. */
  cut(x: number, y: number, r: number, line: number) {
    let count = 0;
    for (const row of this.rows) {
      if (Math.abs(row.y - y) > r * 0.8) continue;
      for (const c of row.clumps) {
        if (c.cut > 0 || c.x < line || Math.abs(c.x - x) > r) continue;
        c.cut = 0.01;
        row.falling.push(c);
        row.dirty = true;
        count++;
      }
    }
    return count;
  }

  update(dt: number) {
    for (const row of this.rows) {
      if (!row.falling.length) continue;
      for (const c of row.falling) c.cut = Math.min(1, c.cut + dt * 3.2);
      row.falling = row.falling.filter((c) => c.cut < 1);
    }
  }

  private paint(row: Row) {
    const width = HARVEST.x1 - this.x0 + 0.4;
    if (!row.canvas) {
      row.canvas = document.createElement("canvas");
      row.canvas.width = Math.round(width * HARVEST_PX);
      row.canvas.height = Math.round(ROW_H * HARVEST_PX);
    }
    const g = row.canvas.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, row.canvas.width, row.canvas.height);
    g.setTransform(
      HARVEST_PX,
      0,
      0,
      HARVEST_PX,
      -this.x0 * HARVEST_PX,
      (ROW_H - ROW_FOOT - row.y) * HARVEST_PX,
    );
    const scale = rowScale(row.y);
    const colour = wheatColour(1);
    const tall = wheatHeight(1) * scale;
    // Stubble where the reader has cut.
    g.strokeStyle = "rgba(200, 162, 88, 0.95)";
    g.lineWidth = 0.018;
    g.beginPath();
    for (const c of row.clumps) {
      if (c.cut <= 0) continue;
      for (let k = -2; k <= 2; k++) {
        g.moveTo(c.x + k * 0.02, c.y);
        g.lineTo(c.x + k * 0.03, c.y - 0.1 * scale);
      }
    }
    g.stroke();
    for (const c of row.clumps)
      if (c.cut <= 0)
        clump(g, c.x, c.y, tall * c.tall, 3, colour, mulberry32(c.seed), 0);
    row.dirty = false;
  }

  /**
   * One row: stubble behind the reapers' `line`, the standing wheat beyond it, and any clumps the
   * reader has just cut, still falling.
   */
  drawRow(
    g: Ctx,
    v: View,
    row: Row,
    line: number,
    seconds: number,
    wind: number,
    stubble: ReturnType<typeof paintStubble>,
  ) {
    const { left, right } = bounds(v, 0.5);
    if (line > this.x0)
      drawStubbleRow(
        g,
        v,
        stubble,
        row.y + 0.02,
        HARVEST.x0,
        Math.min(line, HARVEST.x1),
      );
    if (line >= HARVEST.x1) return;
    if (row.dirty || !row.canvas) this.paint(row);
    const canvas = row.canvas!;
    const from = Math.max(line, this.x0, left);
    const to = Math.min(HARVEST.x1 + 0.4, right);
    if (to > from) {
      const lean =
        wind *
        (0.1 * Math.sin(seconds * 1.1 + row.y * 0.6) +
          0.04 * Math.sin(seconds * 2.3 + row.y));
      const sx = (from - this.x0) * HARVEST_PX;
      const sw = (to - from) * HARVEST_PX;
      g.save();
      g.translate(0, row.y);
      g.transform(1, 0, -lean, 1, 0, 0);
      g.drawImage(
        canvas,
        sx,
        0,
        sw,
        canvas.height,
        from,
        -(ROW_H - ROW_FOOT),
        to - from,
        ROW_H,
      );
      g.restore();
    }
    const scale = rowScale(row.y);
    const tall = wheatHeight(1) * scale;
    for (const c of row.falling) {
      g.globalAlpha = 1 - c.cut;
      clump(
        g,
        c.x,
        c.y - c.cut * 0.1,
        tall * c.tall * (1 - c.cut * 0.3),
        3,
        wheatColour(1),
        mulberry32(c.seed),
        c.cut * 1.3,
      );
    }
    g.globalAlpha = 1;
  }
}

// ─── Air ────────────────────────────────────────────────────────────────────

let bandSprite: HTMLCanvasElement | null = null;

/** A long soft band of mist, faded top and bottom and ragged along its length. */
function band() {
  if (bandSprite) return bandSprite;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const g = canvas.getContext("2d")!;
  const random = mulberry32(5150);
  for (let i = 0; i < 90; i++) {
    const x = random() * 512;
    const y = 32 + (random() - 0.5) * 20;
    const r = 18 + random() * 30;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    // Wrap round, so the band tiles.
    if (x < r) g.fillRect(x - r + 512, y - r, r * 2, r * 2);
    if (x > 512 - r) g.fillRect(x - r - 512, y - r, r * 2, r * 2);
  }
  bandSprite = canvas;
  return canvas;
}

/**
 * The fog of a Punjabi January: long bands lying over the fields at every depth, drifting, thick
 * enough that the tree line goes and the houses at the end of the lane are only shapes.
 */
export function drawFog(
  g: Ctx,
  v: View,
  density: number,
  seconds: number,
  colour: RGB,
  near = true,
) {
  if (density < 0.01) return;
  const sprite = band();
  const { left, right, top, bottom } = bounds(v, 2);
  // A veil over the far distance, thickest at the horizon.
  const veil = g.createLinearGradient(0, HORIZON - 4, 0, HORIZON + 5);
  veil.addColorStop(0, rgb(colour, 0));
  veil.addColorStop(0.45, rgb(colour, 0.75 * density));
  veil.addColorStop(1, rgb(colour, 0));
  g.fillStyle = veil;
  g.fillRect(left, HORIZON - 4, right - left, 9);
  // A thin wash of the fog's colour over the land, then the white bands; the grade tints them.
  const wash = g.createLinearGradient(0, HORIZON - 3, 0, HORIZON + 1);
  wash.addColorStop(0, rgb(colour, 0));
  wash.addColorStop(1, rgb(colour, 0.1 * density));
  g.fillStyle = wash;
  g.fillRect(
    left,
    HORIZON - 3,
    right - left,
    Math.max(0, bottom - HORIZON + 3),
  );
  const span = 16;
  for (let i = 0; i < 12; i++) {
    const y = HORIZON - 1.2 + i * 0.85;
    if (!near && y > 2) break;
    if (y < top - 2 || y > bottom + 2) continue;
    const drift =
      seconds * (0.12 + (i % 3) * 0.05) * (i % 2 ? 1 : -1) + i * 5.3;
    const h = 1.2 + i * 0.12;
    const alpha = density * lerp(0.8, 0.22, i / 11);
    g.globalAlpha = alpha;
    const start = Math.floor((left - drift) / span) * span + drift;
    let guard = 0;
    for (let x = start; x < right && guard++ < 40; x += span)
      g.drawImage(sprite, x, y - h / 2, span, h);
  }
  g.globalAlpha = 1;
}

let cloudSprite: HTMLCanvasElement | null = null;

/** A fair-weather cloud, painted once and reused at any size. */
export function cloud() {
  if (cloudSprite) return cloudSprite;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 110;
  const g = canvas.getContext("2d")!;
  const random = mulberry32(81);
  for (let i = 0; i < 26; i++) {
    const x = 40 + random() * 176;
    const y =
      50 + (random() - 0.3) * 30 - Math.sin(((x - 40) / 176) * Math.PI) * 18;
    const r = 18 + random() * 26;
    const grad = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(0.7, "rgba(250, 248, 244, 0.5)");
    grad.addColorStop(1, "rgba(240, 240, 240, 0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  cloudSprite = canvas;
  return canvas;
}

/** A bird in flight, a flick of two wings. */
export function bird(g: Ctx, x: number, y: number, size: number, flap: number) {
  const w = Math.sin(flap) * 0.4;
  g.beginPath();
  g.moveTo(x - size, y - size * w);
  g.quadraticCurveTo(x - size * 0.4, y - size * (0.35 + w * 0.5), x, y);
  g.quadraticCurveTo(
    x + size * 0.4,
    y - size * (0.35 + w * 0.5),
    x + size,
    y - size * w,
  );
  g.stroke();
}

/** The rows of the fields east of the village, split where the harvest strip is drawn by clump. */
export function isHarvestRow(y: number) {
  return y >= HARVEST.y0 && y <= HARVEST.y1;
}

export const inHarvest = (x: number, y: number) =>
  x > HARVEST.x0 &&
  x < HARVEST.x1 &&
  y > HARVEST.y0 - 0.3 &&
  y < HARVEST.y1 + 0.4;

/** How far along the strip the reapers have got at `t` 0..1. */
export const reapLine = (t: number) =>
  lerp(HARVEST.x0 - 0.5, HARVEST.x1, clamp(t));
