// The pols of old Ahmedabad on Uttarayan: lanes of tall wooden houses packed wall to wall, their
// flat terraces (agashi) crowded from morning to midnight. Far off the minarets and domes of the
// walled city; in the pol's little square a chabutro, the tall birdhouse on its pillar; and on our
// own terrace a family: the flyer with his manja, a girl on the firki, a mother with undhiyu, Dada
// with chikki and a boy with a thorny bamboo, waiting for a loose kite.
import { TAU, clamp, flicker, lerp, mix, mulberry32, onScreen, rgb, type RGB } from "../paint";
import { drawFigure, SKINS, type Look, type Pose, type Shade } from "./people";
import { POL, paint, spanX, type World } from "./world";

const X = POL;
/** The near edge of the parapet on our terrace; everything nearer is our roof. */
export const TERRACE = 3.3;
/** Rows of houses between us and the horizon: their line (y) and how big things are there. */
export const ROWS = [0.45, 0.95, 1.6, 2.35];
/** How tall a person is who stands at depth y. */
export const person = (y: number) => 0.5 * y + 0.3;
const WINDOW = "255, 176, 90";
const BULB = "255, 214, 150";

const WALLS: RGB[] = [
  [236, 226, 204],
  [214, 200, 176],
  [196, 214, 220],
  [232, 206, 190],
  [226, 204, 150],
  [200, 196, 214],
  [240, 236, 226],
  [214, 170, 130],
];
const CLOTHES: RGB[] = [
  [220, 40, 60],
  [240, 180, 30],
  [40, 110, 190],
  [240, 240, 232],
  [230, 110, 40],
  [60, 150, 90],
  [150, 60, 150],
  [30, 30, 40],
];

type House = {
  x: number;
  w: number;
  top: number;
  row: number;
  wall: RGB;
  windows: number;
  jharokha: boolean;
  tank: boolean;
  seed: number;
  lit: number;
  people: Flyer[];
};
type Flyer = {
  x: number;
  y: number;
  h: number;
  look: Look;
  facing: 1 | -1;
  seed: number;
  kite: number;
};

/** Where a flyer's string leaves the hand: a raised right arm. */
export type Anchor = { x: number; y: number; depth: number };

export class Pol {
  readonly houses: House[] = [];
  readonly flyers: Flyer[] = [];
  /** Hands that hold a string, for the kites (see uttarayan.ts). */
  readonly anchors: Anchor[] = [];
  private readonly skyline: {
    x: number;
    w: number;
    h: number;
    kind: number;
  }[] = [];
  private readonly near: { x: number; w: number; h: number; kind: number }[] = [];

  constructor() {
    const random = mulberry32(1947);
    // The far city: roofs, the minarets of the old mosques, domes, a temple's shikhara, a water tower.
    for (let x = X - 44; x < X + 70;) {
      const r = random();
      const kind = r < 0.05 ? 1 : r < 0.1 ? 2 : r < 0.13 ? 3 : r < 0.15 ? 4 : 0;
      const w = kind === 1 ? 0.5 : kind === 2 ? 0.9 : kind === 3 ? 0.7 : kind === 4 ? 0.5 : 0.3 + random() * 0.8;
      this.skyline.push({
        x,
        w,
        h: kind === 0 ? 0.18 + random() * 0.4 : kind === 1 ? 1.1 + random() * 0.4 : kind === 2 ? 0.5 : kind === 3 ? 0.8 : 0.9,
        kind,
      });
      x += w * (0.7 + random() * 0.5);
    }
    for (let x = X - 44; x < X + 70;) {
      const w = 0.6 + random() * 1.4;
      const r = random();
      this.near.push({
        x,
        w,
        h: 0.35 + random() * 0.6,
        kind: r < 0.08 ? 1 : r < 0.14 ? 2 : 0,
      });
      x += w;
    }
    // The rows of houses, back to front.
    ROWS.forEach((y, row) => {
      const s = person(y) / 2;
      for (let x = X - 46 + random() * 2; x < X + 46;) {
        const w = s * (1.6 + random() * 1.8);
        // A lane between houses now and then.
        if (random() < 0.12) x += s * 0.8;
        this.houses.push({
          x,
          w,
          top: y - s * (1.2 + random() * 1.5 + (random() < 0.2 ? 1 : 0)),
          row,
          wall: WALLS[Math.floor(random() * WALLS.length)],
          windows: 1 + Math.floor(random() * 3),
          jharokha: random() < 0.55,
          tank: random() < 0.45,
          seed: random() * 10,
          lit: random(),
          people: [],
        });
        x += w + s * 0.05;
      }
    });
    // People on the other terraces, most of them flying, some watching.
    for (const h of this.houses) {
      if (Math.abs(h.x - X) > 30) continue;
      const y = ROWS[h.row];
      const count = random() < 0.25 ? 0 : random() < 0.6 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const woman = random() < 0.4;
        const hh = person(y) * (random() < 0.2 ? 0.7 : 1);
        const cloth = CLOTHES[Math.floor(random() * CLOTHES.length)];
        const look: Look = woman
          ? {
              h: hh,
              skin: SKINS[Math.floor(random() * SKINS.length)],
              top: mix(cloth, [0, 0, 0], 0.2),
              bottom: cloth,
              border: CLOTHES[Math.floor(random() * CLOTHES.length)],
              dress: "sari",
              head: random() < 0.5 ? "pallu" : "bun",
              bindi: true,
            }
          : {
              h: hh,
              skin: SKINS[Math.floor(random() * SKINS.length)],
              top: cloth,
              bottom: random() < 0.5 ? [230, 226, 214] : [60, 60, 80],
              dress: "kurta",
              head: random() < 0.45 ? "cap" : "bare",
              headColor: CLOTHES[Math.floor(random() * CLOTHES.length)],
            };
        const fx = h.x + h.w * (0.25 + random() * 0.5);
        const flyer: Flyer = {
          x: fx,
          y: h.top + hh * 0.42,
          h: hh,
          look,
          facing: random() < 0.6 ? 1 : -1,
          seed: random() * 10,
          kite: -1,
        };
        if (!woman || random() < 0.5) {
          flyer.kite = this.anchors.length;
          this.anchors.push({
            x: fx + flyer.facing * hh * 0.1,
            y: flyer.y - hh * 1.02,
            depth: y,
          });
        }
        this.flyers.push(flyer);
        h.people.push(flyer);
      }
    }
  }

  /** The far city at the horizon, grey-blue with distance, lit up after dark. */
  skylines(w: World, night: number) {
    const { ctx, v, hour } = w;
    const [left, right] = spanX(v, 2);
    if (right < X - 44 || left > X + 70) return;
    const haze = mix(hour.low, hour.top, 0.35);
    const layers = [
      {
        items: this.skyline,
        color: mix(haze, [40, 36, 60], 0.28 + 0.4 * (1 - w.env.amb)),
        lift: 0,
      },
      {
        items: this.near,
        color: mix(haze, [34, 28, 46], 0.45 + 0.4 * (1 - w.env.amb)),
        lift: 0.12,
      },
    ];
    for (const layer of layers) {
      ctx.fillStyle = rgb(layer.color);
      ctx.beginPath();
      for (const b of layer.items) {
        if (b.x + b.w < left || b.x > right) continue;
        const base = layer.lift + 0.02;
        if (b.kind === 1) {
          // A minaret: a slim shaft with two balconies and a little cupola.
          const cx = b.x + b.w / 2;
          ctx.rect(cx - 0.05, base - b.h, 0.1, b.h);
          ctx.rect(cx - 0.09, base - b.h * 0.55, 0.18, 0.04);
          ctx.rect(cx - 0.08, base - b.h * 0.85, 0.16, 0.035);
          ctx.moveTo(cx - 0.06, base - b.h);
          ctx.quadraticCurveTo(cx, base - b.h - 0.16, cx + 0.06, base - b.h);
          ctx.rect(cx - 0.25, base - 0.3, 0.5, 0.3);
        } else if (b.kind === 2) {
          // A dome on a drum.
          const cx = b.x + b.w / 2;
          ctx.rect(b.x, base - 0.3, b.w, 0.3);
          ctx.moveTo(cx - b.w * 0.36, base - 0.3);
          ctx.bezierCurveTo(cx - b.w * 0.4, base - 0.62, cx - 0.05, base - 0.66, cx, base - 0.74);
          ctx.bezierCurveTo(cx + 0.05, base - 0.66, cx + b.w * 0.4, base - 0.62, cx + b.w * 0.36, base - 0.3);
        } else if (b.kind === 3) {
          // A temple shikhara with its flag pole.
          const cx = b.x + b.w / 2;
          ctx.rect(b.x, base - 0.25, b.w, 0.25);
          ctx.moveTo(b.x + 0.05, base - 0.25);
          ctx.quadraticCurveTo(cx - 0.12, base - b.h * 0.8, cx, base - b.h);
          ctx.quadraticCurveTo(cx + 0.12, base - b.h * 0.8, b.x + b.w - 0.05, base - 0.25);
          ctx.rect(cx - 0.01, base - b.h - 0.22, 0.02, 0.22);
        } else if (b.kind === 4) {
          // The water tower on its legs.
          const cx = b.x + b.w / 2;
          ctx.rect(cx - 0.2, base - b.h, 0.4, 0.2);
          ctx.rect(cx - 0.16, base - b.h + 0.2, 0.03, b.h - 0.2);
          ctx.rect(cx + 0.13, base - b.h + 0.2, 0.03, b.h - 0.2);
        } else {
          ctx.rect(b.x, base - b.h, b.w + 0.01, b.h);
        }
      }
      ctx.fill();
    }
    // The walled city after dark: windows and strings of bulbs coming on.
    if (night > 0.02) {
      ctx.globalCompositeOperation = "lighter";
      const random = mulberry32(77);
      for (let i = 0; i < 260; i++) {
        const x = X - 40 + random() * 100;
        const y = -0.05 - random() * 0.5;
        const on = random() < 0.7 ? 1 : 0.5 + 0.5 * Math.sin(w.seconds * 1.5 + i);
        if (x < left || x > right) continue;
        ctx.fillStyle = `rgba(255, ${170 + Math.floor(random() * 60)}, 110, ${0.7 * night * on})`;
        ctx.fillRect(x, y, 0.035, 0.03);
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /** The rows of houses and their terraces, back to front; `kites` is drawn between the rows. */
  rows(w: World, night: number, between: (row: number) => void) {
    const { ctx, v } = w;
    const [left, right] = spanX(v, 3);
    if (right < X - 48 || left > X + 48) return;
    let row = -1;
    for (const h of this.houses) {
      if (h.row !== row) {
        row = h.row;
        between(row);
      }
      if (h.x + h.w < left || h.x > right) continue;
      this.house(w, h, night);
    }
    between(ROWS.length);
    void ctx;
  }

  /** One house seen over the roofs: its top storey and parapet, windows, and who is up there. */
  private house(w: World, h: House, night: number) {
    const { ctx, env, seconds, lights, p } = w;
    const y = ROWS[h.row];
    const s = person(y) / 2;
    const shade: Shade = (c, a = 1) => paint(c, env, 0, a);
    // Who is up on this terrace, drawn first so the parapet hides their legs.
    if (h.tank) {
      const tx = h.x + h.w * 0.78;
      ctx.fillStyle = shade([40, 38, 42]);
      ctx.fillRect(tx - s * 0.22, h.top - s * 0.52, s * 0.44, s * 0.52);
      ctx.fillStyle = shade([70, 68, 72]);
      ctx.beginPath();
      ctx.ellipse(tx, h.top - s * 0.52, s * 0.22, s * 0.05, 0, 0, TAU);
      ctx.fill();
    }
    for (const fl of h.people) {
      const tug = Math.sin(seconds * (1.5 + fl.seed * 0.1) + fl.seed * 4) * 0.25;
      const pose: Pose = fl.kite >= 0 ? { la: 1.6 + tug * 0.5, lf: 2.0 + tug, ra: 2.6, rf: 2.8 } : { la: 0.3, lf: 0.8, ra: 0.2, rf: 0.6 };
      drawFigure(ctx, fl.x, fl.y, fl.look, pose, shade, fl.facing);
    }
    // The top storey and its parapet: lime-washed walls, carved wood, a jali in the parapet.
    const bottom = y + 2.2;
    ctx.fillStyle = shade(h.wall);
    ctx.fillRect(h.x, h.top, h.w, bottom - h.top);
    ctx.fillStyle = shade(mix(h.wall, [0, 0, 0], 0.18));
    ctx.fillRect(h.x, h.top, h.w, s * 0.08);
    ctx.fillRect(h.x + h.w - s * 0.06, h.top, s * 0.06, bottom - h.top);
    ctx.fillStyle = shade(mix(h.wall, [255, 255, 255], 0.25));
    ctx.fillRect(h.x - s * 0.03, h.top - s * 0.04, h.w + s * 0.06, s * 0.06);
    // A cornice below the parapet.
    const cornice = h.top + s * 0.45;
    ctx.fillStyle = shade(mix(h.wall, [60, 40, 30], 0.35));
    ctx.fillRect(h.x - s * 0.04, cornice, h.w + s * 0.08, s * 0.07);
    // Windows: shuttered, with a carved wooden balcony on some.
    const wy = cornice + s * 0.3;
    const ww = s * 0.34;
    const wh = s * 0.55;
    for (let i = 0; i < h.windows; i++) {
      const wx = h.x + ((i + 0.5) / h.windows) * h.w - ww / 2;
      const glow = night * (h.lit > 0.25 ? 1 : 0) * (0.75 + 0.25 * Math.sin(seconds * 0.7 + h.seed + i));
      ctx.fillStyle = glow > 0.05 ? rgb(mix(tone3(h.wall, env), [255, 190, 110], glow)) : shade([46, 34, 30]);
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = shade([96, 60, 36]);
      ctx.fillRect(wx - s * 0.04, wy - s * 0.05, ww + s * 0.08, s * 0.05);
      ctx.fillRect(wx, wy, s * 0.03, wh);
      ctx.fillRect(wx + ww - s * 0.03, wy, s * 0.03, wh);
      if (glow > 0.05)
        lights.push({
          x: wx + ww / 2,
          y: wy + wh / 2,
          r: s * 1.1,
          a: 0.3 * glow,
          color: WINDOW,
        });
      if (h.jharokha && i === 0) {
        // The jharokha: a wooden balcony on brackets, its front carved.
        const jx = wx - s * 0.12;
        const jw = ww + s * 0.24;
        const jy = wy + wh * 0.55;
        ctx.fillStyle = shade([110, 70, 40]);
        ctx.fillRect(jx, jy, jw, s * 0.26);
        ctx.fillStyle = shade([80, 48, 28]);
        for (let k = 0; k < 4; k++) ctx.fillRect(jx + s * 0.04 + (k * (jw - s * 0.08)) / 3, jy + s * 0.04, s * 0.03, s * 0.16);
        ctx.beginPath();
        ctx.moveTo(jx + s * 0.04, jy + s * 0.26);
        ctx.lineTo(jx + s * 0.1, jy + s * 0.44);
        ctx.lineTo(jx + s * 0.16, jy + s * 0.26);
        ctx.moveTo(jx + jw - s * 0.16, jy + s * 0.26);
        ctx.lineTo(jx + jw - s * 0.1, jy + s * 0.44);
        ctx.lineTo(jx + jw - s * 0.04, jy + s * 0.26);
        ctx.fill();
      }
    }
    // A string of bulbs along the parapet after dark.
    if (night > 0.05 && h.lit > 0.55) {
      for (let i = 0; i < 7; i++) {
        const bx = h.x + ((i + 0.5) / 7) * h.w;
        const by = h.top + s * 0.1 + Math.sin((i / 6) * Math.PI) * s * 0.06;
        const on = 0.6 + 0.4 * Math.sin(seconds * 3 + i * 1.3 + h.seed);
        ctx.fillStyle = `rgba(255, 230, 170, ${night * on})`;
        ctx.fillRect(bx - s * 0.02, by - s * 0.02, s * 0.04, s * 0.04);
        if (i % 2 === 0)
          lights.push({
            x: bx,
            y: by,
            r: s * 0.6,
            a: 0.25 * night * on,
            color: BULB,
          });
      }
    }
    void p;
  }

  /** The chabutro in the pol's square: a painted birdhouse on a pillar, the pigeons round it. */
  chabutro(w: World, x: number, y: number) {
    const { ctx, v, env, seconds } = w;
    const s = person(y) / 2;
    if (!onScreen(v, x, y - s * 4, s * 5)) return;
    const shade: Shade = (c, a = 1) => paint(c, env, 0, a);
    ctx.fillStyle = shade([226, 216, 196]);
    ctx.fillRect(x - s * 0.12, y - s * 3.2, s * 0.24, s * 3.2);
    ctx.fillStyle = shade([200, 190, 170]);
    ctx.fillRect(x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.3);
    // The octagonal house for the birds, with its little arches, and a domed top.
    ctx.fillStyle = shade([60, 120, 110]);
    ctx.fillRect(x - s * 0.6, y - s * 3.8, s * 1.2, s * 0.6);
    ctx.fillStyle = shade([236, 220, 180]);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - s * 0.42 + i * s * 0.28, y - s * 3.42, s * 0.09, Math.PI, 0);
      ctx.lineTo(x - s * 0.33 + i * s * 0.28, y - s * 3.28);
      ctx.lineTo(x - s * 0.51 + i * s * 0.28, y - s * 3.28);
      ctx.fill();
    }
    ctx.fillStyle = shade([180, 60, 50]);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.72, y - s * 3.8);
    ctx.quadraticCurveTo(x - s * 0.3, y - s * 4.5, x, y - s * 4.7);
    ctx.quadraticCurveTo(x + s * 0.3, y - s * 4.5, x + s * 0.72, y - s * 3.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - s * 0.015, y - s * 5.0, s * 0.03, s * 0.3);
    // Pigeons on its roof, and a few coming and going.
    ctx.fillStyle = shade([150, 150, 166]);
    for (let i = 0; i < 6; i++) {
      const px = x - s * 0.5 + i * s * 0.2;
      ctx.beginPath();
      ctx.ellipse(px, y - s * 3.86 - Math.abs(i - 2.5) * s * 0.1, s * 0.07, s * 0.045, 0, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const t = (seconds * 0.2 + i * 0.2) % 1;
      const px = x + Math.cos(t * TAU + i) * s * (1.2 + i * 0.3);
      const py = y - s * 4.2 + Math.sin(t * TAU * 2 + i) * s * 0.5;
      const flap = Math.sin(seconds * 14 + i * 3);
      ctx.strokeStyle = shade([150, 150, 166]);
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(px - s * 0.14, py - flap * s * 0.06);
      ctx.lineTo(px, py);
      ctx.lineTo(px + s * 0.14, py - flap * s * 0.06);
      ctx.stroke();
    }
  }

  /** Our terrace: its floor and parapet, and the family on it. Returns the flyer's hand. */
  terrace(w: World, night: number, kiteHand: { pull: number; sway: number }) {
    const { ctx, v, env, seconds, lights, shadow } = w;
    const [left, right] = spanX(v, 2);
    const shade: Shade = (c, a = 1) => paint(c, env, night * 0.25, a);
    const bottom = v.y + v.height / 2 / v.scale + 2;
    const l = Math.max(left, X - 40);
    const r = Math.min(right, X + 40);
    // The parapet, a low wall of plastered brick with a jali of cement lattice.
    const top = TERRACE - 0.6;
    ctx.fillStyle = shade([214, 204, 186]);
    ctx.fillRect(l, top, r - l, 0.62);
    ctx.fillStyle = shade([236, 228, 212]);
    ctx.fillRect(l, top - 0.06, r - l, 0.08);
    ctx.fillStyle = shade([150, 140, 126]);
    for (let x = Math.floor(l / 0.5) * 0.5; x < r; x += 0.5) {
      if (Math.abs(x - X) < 0.01) continue;
      ctx.beginPath();
      ctx.arc(x + 0.25, top + 0.26, 0.1, 0, TAU);
      ctx.fill();
    }
    // The floor, laid with square tiles, warm in the sun.
    const g = ctx.createLinearGradient(0, TERRACE, 0, TERRACE + 4);
    g.addColorStop(0, paint([176, 160, 140], env, night * 0.2));
    g.addColorStop(1, paint([200, 180, 150], env, night * 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(l, TERRACE, r - l, bottom - TERRACE);
    ctx.strokeStyle = shade([140, 124, 104], 0.4);
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const y = TERRACE + i * i * 0.12;
      ctx.moveTo(l, y);
      ctx.lineTo(r, y);
    }
    for (let x = Math.floor((l - X) / 0.8) * 0.8 + X; x < r; x += 0.8) {
      ctx.moveTo(x, TERRACE);
      ctx.lineTo(X + (x - X) * 1.8, TERRACE + 4);
    }
    ctx.stroke();
    if (!onScreen(v, X, TERRACE, 9)) return { x: X + 1.2, y: TERRACE - 1 };

    const shadowAt = (x: number, y: number, rx: number) => {
      ctx.fillStyle = `rgba(40, 24, 20, ${0.22 * (1 - night)})`;
      ctx.beginPath();
      ctx.ellipse(x + shadow * rx, y + 0.03, rx * 1.4, rx * 0.2, 0, 0, TAU);
      ctx.fill();
    };

    // A black water tank, a stack of spare kites against it and a spare firki.
    const tx = X - 5.4;
    ctx.fillStyle = shade([34, 32, 36]);
    ctx.beginPath();
    ctx.moveTo(tx - 0.7, TERRACE + 0.4);
    ctx.lineTo(tx - 0.72, TERRACE - 1.2);
    ctx.quadraticCurveTo(tx, TERRACE - 1.45, tx + 0.72, TERRACE - 1.2);
    ctx.lineTo(tx + 0.7, TERRACE + 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade([60, 58, 62]);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(tx - 0.71, TERRACE - 0.8 + i * 0.35);
      ctx.lineTo(tx + 0.71, TERRACE - 0.8 + i * 0.35);
    }
    ctx.stroke();
    const spare: RGB[] = [
      [236, 40, 110],
      [250, 200, 30],
      [30, 110, 200],
      [40, 170, 90],
    ];
    spare.forEach((c, i) => {
      const kx = tx + 0.9 + i * 0.12;
      const ky = TERRACE - 0.1;
      ctx.fillStyle = shade(c);
      ctx.beginPath();
      ctx.moveTo(kx, ky - 0.7);
      ctx.lineTo(kx + 0.32, ky - 0.36);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx - 0.32, ky - 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade([110, 80, 40], 0.8);
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      ctx.moveTo(kx, ky - 0.7);
      ctx.lineTo(kx, ky);
      ctx.stroke();
    });

    // Dada on a plastic chair in his shawl and cap, a steel plate of chikki on his knee.
    const dx = X - 3.2;
    const dy = TERRACE + 0.95;
    shadowAt(dx, dy, 0.5);
    ctx.fillStyle = shade([230, 230, 226]);
    ctx.fillRect(dx - 0.36, dy - 0.8, 0.72, 0.06);
    ctx.fillRect(dx - 0.34, dy - 0.8, 0.05, 0.8);
    ctx.fillRect(dx + 0.29, dy - 0.8, 0.05, 0.8);
    ctx.fillRect(dx - 0.36, dy - 1.5, 0.06, 0.7);
    const chew = Math.max(0, Math.sin(seconds * 1.3)) * 0.35;
    drawFigure(
      ctx,
      dx + 0.02,
      dy - 0.46,
      {
        h: 2.05,
        skin: SKINS[0],
        top: [240, 238, 230],
        bottom: [240, 236, 226],
        dress: "kurta",
        head: "gandhi",
        shawl: [140, 110, 80],
        beard: [226, 224, 220],
      },
      {
        la: 1.2,
        lf: 1.6,
        ra: 1.0 + chew,
        rf: 2.3 + chew,
        sit: true,
        hold: "leaf",
      },
      shade,
      1,
    );

    // The mother, in a bandhani sari with the pallu brought over the right shoulder, with undhiyu.
    const mx = X - 1.7;
    const my = TERRACE + 1.35;
    shadowAt(mx, my, 0.4);
    drawFigure(
      ctx,
      mx,
      my,
      {
        h: 2.1,
        skin: SKINS[3],
        top: [150, 20, 40],
        bottom: [200, 30, 50],
        border: [240, 190, 50],
        dress: "sari",
        head: "bun",
        motif: [250, 230, 200],
        bindi: true,
      },
      { la: 0.4, lf: 0.9, ra: 1.3, rf: 1.6, hold: "dish" },
      shade,
      1,
    );

    // The girl on the firki, letting out manja or winding it in as her father asks.
    const gx = X + 0.25;
    const gy = TERRACE + 1.65;
    const wind = kiteHand.pull;
    shadowAt(gx, gy, 0.3);
    drawFigure(
      ctx,
      gx,
      gy,
      {
        h: 1.4,
        skin: SKINS[1],
        top: [240, 180, 30],
        bottom: [40, 110, 190],
        border: [220, 40, 60],
        dress: "frock",
        head: "bun",
        motif: [250, 230, 120],
        bindi: true,
      },
      {
        la: 1.2 + Math.sin(seconds * 6) * 0.3 * wind,
        lf: 1.5,
        ra: 1.3 - Math.sin(seconds * 6) * 0.3 * wind,
        rf: 1.6,
        hold: "firki",
      },
      shade,
      1,
    );

    // The flyer: right hand high with the string, left hand pulling in the slack.
    const fx = X + 1.35;
    const fy = TERRACE + 1.45;
    shadowAt(fx, fy, 0.4);
    const tug = kiteHand.sway;
    const hands = drawFigure(
      ctx,
      fx,
      fy,
      {
        h: 2.2,
        skin: SKINS[2],
        top: [240, 236, 226],
        bottom: [70, 80, 110],
        dress: "kurta",
        head: "cap",
        headColor: [240, 240, 236],
        shawl: undefined,
      },
      {
        la: 1.7 + tug * 0.4,
        lf: 2.2 + tug,
        ra: 2.55 - tug * 0.2,
        rf: 2.85 - tug * 0.2,
        lean: -0.05,
      },
      shade,
      1,
    );
    // Manja slack from his hands down to the girl's firki.
    ctx.strokeStyle = rgb([250, 250, 250], 0.55);
    ctx.lineWidth = 1.1 / v.scale;
    ctx.beginPath();
    ctx.moveTo(hands.left.x, hands.left.y);
    ctx.quadraticCurveTo(lerp(hands.left.x, gx, 0.5), gy - 0.4, gx + 0.1, gy - 0.72);
    ctx.stroke();

    // A boy with a long bamboo, a thorny branch tied at the top, to catch the loose kites.
    const bx = X + 3.7;
    const by = TERRACE + 0.95;
    shadowAt(bx, by, 0.3);
    drawFigure(
      ctx,
      bx,
      by,
      {
        h: 1.55,
        skin: SKINS[0],
        top: [40, 150, 90],
        bottom: [60, 60, 80],
        dress: "kurta",
        head: "cap",
        headColor: [220, 40, 60],
      },
      {
        la: 0.8,
        lf: 1.3,
        ra: 2.3 + Math.sin(seconds * 0.8) * 0.15,
        rf: 2.7 + Math.sin(seconds * 0.8) * 0.15,
        hold: "pole",
      },
      shade,
      -1,
    );

    // On a durrie, the day's food: undhiyu in its clay matlu, chikki, ber and sugarcane.
    const px = X - 0.3;
    const py = TERRACE + 2.6;
    ctx.fillStyle = shade([176, 40, 50]);
    ctx.beginPath();
    ctx.moveTo(px - 1.5, py + 0.4);
    ctx.lineTo(px + 1.7, py + 0.4);
    ctx.lineTo(px + 1.4, py - 0.3);
    ctx.lineTo(px - 1.2, py - 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade([240, 190, 60], 0.8);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(px - 1.35, py + 0.28);
    ctx.lineTo(px + 1.55, py + 0.28);
    ctx.moveTo(px - 1.15, py - 0.2);
    ctx.lineTo(px + 1.35, py - 0.2);
    ctx.stroke();
    // The matlu, a round clay pot, sooty from being buried upside down in the embers.
    ctx.fillStyle = shade([120, 64, 40]);
    ctx.beginPath();
    ctx.arc(px - 0.5, py - 0.15, 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([50, 36, 30], 0.8);
    ctx.beginPath();
    ctx.arc(px - 0.5, py - 0.15, 0.3, 0.2, Math.PI - 0.2);
    ctx.fill();
    ctx.fillStyle = shade([96, 120, 44]);
    ctx.beginPath();
    ctx.ellipse(px - 0.5, py - 0.43, 0.2, 0.05, 0, 0, TAU);
    ctx.fill();
    // A steel thali of chikki, golden slabs of peanut and gur.
    ctx.fillStyle = shade([200, 204, 206]);
    ctx.beginPath();
    ctx.ellipse(px + 0.4, py + 0.05, 0.36, 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([200, 130, 50]);
    for (let i = 0; i < 5; i++) ctx.fillRect(px + 0.14 + (i % 3) * 0.16, py - 0.02 - Math.floor(i / 3) * 0.05, 0.13, 0.05);
    ctx.fillStyle = shade([150, 90, 30]);
    for (let i = 0; i < 8; i++) ctx.fillRect(px + 0.18 + (i % 4) * 0.12, py - 0.01, 0.02, 0.015);
    // Ber, and pieces of sugarcane.
    ctx.fillStyle = shade([220, 150, 40]);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(px + 1.0 + (i % 4) * 0.08, py + 0.1 - Math.floor(i / 4) * 0.07, 0.045, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = shade([150, 110, 80]);
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(px - 1.0, py + 0.25);
    ctx.lineTo(px - 0.4, py + 0.3);
    ctx.moveTo(px - 1.05, py + 0.12);
    ctx.lineTo(px - 0.5, py + 0.2);
    ctx.stroke();

    // After dark, a bulb on a wire over the terrace.
    if (night > 0.02) {
      const lx = X - 0.8;
      const ly = TERRACE - 2.9;
      ctx.strokeStyle = shade([40, 40, 44]);
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(X - 5.4, TERRACE - 1.4);
      ctx.quadraticCurveTo(lx, ly + 0.2, X + 6, TERRACE - 3.4);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 236, 190, ${night})`;
      ctx.beginPath();
      ctx.arc(lx, ly + 0.1, 0.07, 0, TAU);
      ctx.fill();
      const f = flicker(seconds * 0.2, 5);
      lights.push({
        x: lx,
        y: ly,
        r: 5,
        a: 0.3 * night * clamp(f),
        color: BULB,
      });
    }
    return hands.right;
  }
}

function tone3(c: RGB, env: World["env"]) {
  return mix(mix(c, env.night, 0.86), c, clamp(env.amb));
}
