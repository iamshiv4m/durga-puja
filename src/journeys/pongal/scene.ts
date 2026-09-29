// Pongal, as one continuous shot down a street in a Tamil village over three days: the Bhogi fire
// before dawn; a sikku kolam looped at the hero house's door at first light; the new pot boiling
// over in the yard as the sun comes up, and the offering laid out for Surya; the cattle bathed,
// painted and belled for Mattu Pongal in front of the shed; the family out on the sand of the
// Kaveri for Kaanum Pongal; and the paddy and the sugarcane at sunset.
//
// World units, y down: the house fronts stand on y = 0, the street runs toward the viewer to the
// fields at FIELD, and the far horizon is at HORIZON (./land.ts). Everything standing in the street
// is drawn back to front.
import {
  TAU,
  apply,
  clamp,
  flicker,
  glow,
  glowSprite,
  lerp,
  mix,
  mulberry32,
  onScreen,
  rgb,
  rise,
  shot,
  toScreen,
  toWorld,
  view,
  type Ctx,
  type RGB,
  type Shot,
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";
import { makeKolam, strokeKolam, twist, type Kolam } from "./kolam";
import { HORIZON, Land, hourAt, type Hour, type Sun } from "./land";
import {
  JOINED,
  SKIN,
  STANDING,
  drawBending,
  drawCattle,
  drawPerson,
  drawSitting,
  paint,
  type Cattle,
  type Env,
  type Look,
  type Pose,
} from "./people";
import {
  drawBananas,
  drawCane,
  drawCoconut,
  drawHearth,
  drawHouse,
  drawKuthuvilakku,
  drawLeaf,
  drawPile,
  drawPongalHeap,
  drawPot,
  drawShed,
  drawThulasi,
  drawTurmeric,
  flameTongue,
  type House,
} from "./things";

/** Scroll points where things happen; the score listens for the same ones. */
export const MOMENTS = {
  light: 0.045,
  mat: 0.135,
  dawn: 0.2,
  dots: [0.215, 0.24],
  line: [0.24, 0.31],
  flower: 0.312,
  hearth: 0.335,
  boil: 0.425,
  spill: [0.425, 0.445],
  rice: [0.448, 0.47],
  surya: 0.5,
  aarti: 0.525,
  mattu: 0.625,
  kaanum: 0.765,
  close: 0.89,
} as const;

const FIRE = { x: -11, y: 1.9, size: 2.1 };
const KOLAM = { x: 0, y: 1.4, size: 5, spacing: 0.18 };
const HEARTH = { x: 7.3, y: 1.3, size: 0.95 };
const LEAF = { x: 7.0, y: 1.8, length: 1.9 };
const LAMP = { x: 8.45, y: 1.72, h: 0.95 };
const MAT = { x: 34.2, y: 1.55, w: 2.7 };
const KANU = { x: 32.5, y: 2.0 };

const FIRE_LIGHT = "255, 130, 50";
const LAMP_LIGHT = "255, 170, 70";
const FLOUR: RGB = [248, 244, 232];

/** The camera, with a framing of its own for phones, whose captions take the bottom of the screen. */
const FRAMES: (Shot & { portrait?: Partial<Shot> })[] = [
  {
    at: 0.0,
    x: -9.4,
    y: -0.8,
    zoom: 0.74,
    portrait: { x: -10.6, y: -0.2, zoom: 1.05 },
  },
  {
    at: 0.055,
    x: -12.0,
    y: -0.4,
    zoom: 1.0,
    portrait: { x: -11.0, y: 0.5, zoom: 1.4 },
  },
  {
    at: 0.1,
    x: -13.8,
    y: -0.25,
    zoom: 1.24,
    portrait: { x: -11.0, y: 0.8, zoom: 1.75 },
  },
  {
    at: 0.18,
    x: -13.6,
    y: -0.2,
    zoom: 1.34,
    portrait: { x: -11.0, y: 0.8, zoom: 1.85 },
  },
  {
    at: 0.205,
    x: 0.4,
    y: -0.4,
    zoom: 1.4,
    portrait: { x: 0.2, y: 0.6, zoom: 2.0 },
  },
  {
    at: 0.235,
    x: 1.2,
    y: 0.62,
    zoom: 1.9,
    portrait: { x: 0.3, y: 1.3, zoom: 3.1 },
  },
  {
    at: 0.31,
    x: 1.2,
    y: 0.66,
    zoom: 2.0,
    portrait: { x: 0.3, y: 1.3, zoom: 3.2 },
  },
  {
    at: 0.338,
    x: 3.8,
    y: -0.3,
    zoom: 1.45,
    portrait: { x: 5.0, y: 0.3, zoom: 1.9 },
  },
  {
    at: 0.365,
    x: 6.0,
    y: -0.3,
    zoom: 1.7,
    portrait: { x: 7.3, y: 0.3, zoom: 2.35 },
  },
  {
    at: 0.42,
    x: 6.05,
    y: -0.25,
    zoom: 1.82,
    portrait: { x: 7.3, y: 0.3, zoom: 2.5 },
  },
  {
    at: 0.445,
    x: 6.1,
    y: -0.25,
    zoom: 1.88,
    portrait: { x: 7.3, y: 0.25, zoom: 2.55 },
  },
  {
    at: 0.475,
    x: 6.6,
    y: -0.1,
    zoom: 1.7,
    portrait: { x: 6.9, y: 0.6, zoom: 2.2 },
  },
  {
    at: 0.505,
    x: 7.45,
    y: -0.05,
    zoom: 1.75,
    portrait: { x: 6.5, y: 0.9, zoom: 2.2 },
  },
  {
    at: 0.595,
    x: 7.45,
    y: -0.02,
    zoom: 1.82,
    portrait: { x: 6.5, y: 0.9, zoom: 2.3 },
  },
  {
    at: 0.63,
    x: 20.15,
    y: -0.5,
    zoom: 1.08,
    portrait: { x: 20.5, y: 0.3, zoom: 1.5 },
  },
  {
    at: 0.725,
    x: 20.2,
    y: -0.45,
    zoom: 1.12,
    portrait: { x: 20.7, y: 0.3, zoom: 1.6 },
  },
  {
    at: 0.745,
    x: 28.0,
    y: -0.6,
    zoom: 1.0,
    portrait: { x: 30.0, y: 0.2, zoom: 1.3 },
  },
  {
    at: 0.77,
    x: 35.4,
    y: -0.2,
    zoom: 1.48,
    portrait: { x: 33.7, y: 0.9, zoom: 1.95 },
  },
  {
    at: 0.86,
    x: 35.4,
    y: -0.15,
    zoom: 1.55,
    portrait: { x: 33.7, y: 0.9, zoom: 2.05 },
  },
  {
    at: 0.93,
    x: 34.5,
    y: -0.2,
    zoom: 0.62,
    portrait: { x: 33.0, y: 0.3, zoom: 0.95 },
  },
  {
    at: 1.0,
    x: 34.5,
    y: -0.3,
    zoom: 0.56,
    portrait: { x: 33.0, y: 0.2, zoom: 0.88 },
  },
];
const SHOTS: Shot[] = FRAMES.map(({ at, x, y, zoom }) => ({ at, x, y, zoom }));
const PORTRAIT: Shot[] = FRAMES.map(({ at, x, y, zoom, portrait }) => ({
  at,
  x,
  y,
  zoom,
  ...portrait,
}));

// ─── The people of the house ─────────────────────────────────────────────────

const AMMA: Look = {
  kind: "woman",
  h: 1.62,
  skin: SKIN[0],
  cloth: [22, 118, 106],
  border: [236, 184, 64],
  top: [196, 36, 70],
  towel: null,
  flowers: true,
};
const PAATI: Look = {
  kind: "paati",
  h: 1.52,
  skin: SKIN[3],
  cloth: [140, 34, 54],
  border: [232, 180, 70],
  top: [140, 34, 54],
  towel: null,
};
const APPA: Look = {
  kind: "man",
  h: 1.74,
  skin: SKIN[1],
  cloth: [246, 242, 230],
  border: [228, 176, 70],
  top: null,
  towel: [242, 236, 216],
};
const THATHA: Look = {
  kind: "thatha",
  h: 1.64,
  skin: SKIN[3],
  cloth: [242, 238, 226],
  border: [210, 160, 70],
  top: null,
  towel: [242, 238, 226],
};
const MAGAL: Look = {
  kind: "girl",
  h: 1.14,
  skin: SKIN[2],
  cloth: [232, 112, 30],
  border: [34, 122, 72],
  top: [34, 122, 72],
  towel: null,
  flowers: true,
};
const MAGAN: Look = {
  kind: "boy",
  h: 1.06,
  skin: SKIN[4],
  cloth: [60, 70, 120],
  border: [60, 70, 120],
  top: [232, 206, 70],
  towel: null,
};

type Figure = {
  look: Look;
  x: number;
  y: number;
  facing: 1 | -1;
  seed: number;
};

const HOUSES: House[] = [
  {
    x: -21.4,
    width: 6.2,
    wall: [236, 226, 206],
    roof: "tile",
    door: [96, 58, 34],
    stripes: true,
    height: 3.5,
    seed: 1,
  },
  {
    x: -14.6,
    width: 6.6,
    wall: [226, 214, 190],
    roof: "thatch",
    door: [84, 52, 30],
    stripes: false,
    height: 3.3,
    seed: 2,
  },
  {
    x: -7.5,
    width: 6.4,
    wall: [236, 224, 214],
    roof: "tile",
    door: [100, 60, 36],
    stripes: true,
    height: 3.5,
    seed: 3,
  },
  {
    x: 0,
    width: 7.6,
    wall: [244, 238, 224],
    roof: "tile",
    door: [92, 50, 28],
    stripes: true,
    height: 4.0,
    seed: 4,
  },
  {
    x: 14.6,
    width: 6.0,
    wall: [232, 222, 200],
    roof: "tile",
    door: [96, 58, 34],
    stripes: true,
    height: 3.6,
    seed: 5,
  },
  {
    x: 27.4,
    width: 5.4,
    wall: [228, 216, 192],
    roof: "thatch",
    door: [84, 52, 30],
    stripes: false,
    height: 3.3,
    seed: 6,
  },
];
const SHED = { x: 21.1, width: 5.8 };

const HERD: {
  x: number;
  y: number;
  size: number;
  facing: 1 | -1;
  look: Cattle;
  seed: number;
}[] = [
  {
    x: 24.7,
    y: 0.75,
    size: 1.26,
    facing: -1,
    look: {
      body: [62, 58, 58],
      shade: [34, 30, 32],
      horns: 1.0,
      bull: true,
      paints: [
        [240, 120, 30],
        [246, 240, 230],
        [240, 120, 30],
      ],
    },
    seed: 3,
  },
  {
    x: 19.6,
    y: 1.15,
    size: 1.38,
    facing: 1,
    look: {
      body: [228, 224, 214],
      shade: [150, 146, 142],
      horns: 1.25,
      bull: true,
      paints: [
        [200, 30, 50],
        [40, 90, 190],
        [250, 200, 40],
        [200, 30, 50],
      ],
    },
    seed: 1,
  },
  {
    x: 21.0,
    y: 2.1,
    size: 1.2,
    facing: 1,
    look: {
      body: [160, 100, 64],
      shade: [120, 70, 40],
      horns: 0.72,
      bull: false,
      paints: [
        [250, 190, 40],
        [210, 40, 80],
      ],
    },
    seed: 2,
  },
];

type Light = { x: number; y: number; r: number; a: number; color: string };
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
};
type Puff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  steam: boolean;
};
type Grain = { x: number; y: number; vy: number; age: number };
type Small = {
  x: number;
  y: number;
  kolam: Kolam;
  spacing: number;
  at: number;
  path: Path2D | null;
};

let tamilFamily = "";
function tamil() {
  if (!tamilFamily) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-tamil")
      .trim();
    tamilFamily = value
      ? `${value}, "Noto Serif Tamil", serif`
      : `"Noto Serif Tamil", serif`;
  }
  return tamilFamily;
}

class Pongal implements Scene {
  private readonly emit: Emit;
  private readonly land = new Land();
  private readonly kolam: Kolam;
  private kolamPath: {
    key: string;
    path: Path2D;
    tip: { x: number; y: number };
  } | null = null;
  private kolamVersion = 0;
  private readonly small: Small[] = [];
  private readonly kids: (Figure & { drum: boolean })[] = [];
  private readonly visitors: (Figure & { sit: boolean })[] = [];
  private sparks: Spark[] = [];
  private puffs: Puff[] = [];
  private grains: Grain[] = [];
  private twists: { x: number; y: number; born: number }[] = [];
  private lights: Light[] = [];
  private sources: { x: number; y: number; r: number; a: number }[] = [];
  private v: View | null = null;
  private env: Env = { amb: 1, tint: [255, 255, 255], night: [8, 8, 22] };
  private pressed = false;
  private holding = false;
  private lastTouch = -1;
  private lastStoke = 0;
  private flare = 0;
  private heat = 0;
  private spill = 0;
  private overflowAt = -100;
  private overflowed = false;
  private readonly shake = [0, 0, 0];
  private crowsUp = -100;
  private womanX = KOLAM.x + 0.9;
  private nextSpark = 0;
  private nextSmoke = 0;
  private nextSteam = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    this.kolam = makeKolam(KOLAM.size, 23, 0.45);
    const random = mulberry32(1501);
    for (const [x, y, size, seed, at] of [
      [-21.4, 1.55, 3, 11, 0.215],
      [-15.6, 1.45, 3, 12, 0.225],
      [-7.5, 1.55, 4, 13, 0.235],
      [14.6, 1.6, 4, 14, 0.25],
      [27.4, 1.5, 3, 15, 0.26],
    ]) {
      this.small.push({
        x,
        y,
        kolam: makeKolam(size, seed, 0.45),
        spacing: 0.14,
        at,
        path: null,
      });
    }
    // The children at the Bhogi fire, beating the little drums.
    this.kids.push(
      {
        look: { ...MAGAN, top: [210, 70, 50] },
        x: -12.75,
        y: 2.35,
        facing: 1,
        seed: 1,
        drum: true,
      },
      {
        look: { ...MAGAN, top: [236, 214, 90], cloth: [40, 60, 90] },
        x: -9.15,
        y: 2.45,
        facing: -1,
        seed: 2,
        drum: true,
      },
      {
        look: {
          ...MAGAL,
          cloth: [150, 50, 140],
          border: [240, 190, 60],
          top: [240, 190, 60],
        },
        x: -10.1,
        y: 2.95,
        facing: -1,
        seed: 3,
        drum: false,
      },
      {
        look: { ...MAGAN, h: 0.98, top: [120, 170, 210], cloth: [70, 50, 40] },
        x: -12.1,
        y: 3.05,
        facing: 1,
        seed: 4,
        drum: true,
      },
    );
    // Other families along the sand on Kaanum Pongal, farther off.
    const saris: [RGB, RGB][] = [
      [
        [200, 40, 80],
        [240, 190, 60],
      ],
      [
        [240, 150, 30],
        [150, 30, 50],
      ],
      [
        [60, 90, 170],
        [240, 200, 80],
      ],
      [
        [120, 40, 120],
        [240, 190, 60],
      ],
    ];
    for (let i = 0; i < 9; i++) {
      const [cloth, border] = saris[i % saris.length];
      const kind = i % 3 === 0 ? "man" : i % 4 === 1 ? "girl" : "woman";
      const h = (kind === "girl" ? 0.8 : 1.15) + random() * 0.08;
      const look: Look =
        kind === "man"
          ? {
              kind,
              h,
              skin: SKIN[i % SKIN.length],
              cloth: [240, 236, 224],
              border: [200, 160, 70],
              top: random() < 0.5 ? [180, 200, 230] : [240, 240, 236],
              towel: null,
            }
          : {
              kind,
              h,
              skin: SKIN[i % SKIN.length],
              cloth,
              border,
              top: border,
              towel: null,
              flowers: true,
            };
      this.visitors.push({
        look,
        x: 40.4 + i * 0.95 + random() * 0.4,
        y: 0.7 + random() * 0.4,
        facing: random() < 0.5 ? 1 : -1,
        seed: random() * 10,
        sit: i % 4 === 2,
      });
    }
    this.visitors.sort((a, b) => a.y - b.y);
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p, seconds, dt } = f;
    const unit = Math.min(width, height) / 8;
    const focus = shot(f.portrait ? PORTRAIT : SHOTS, p);
    const v = view(width, height, focus, unit, f.portrait ? 0.36 : 0.5);
    this.v = v;
    this.lights = [];
    const hour = hourAt(p);
    this.env = { amb: hour.amb, tint: hour.tint, night: [8, 8, 22] };
    this.step(f);

    const sun = this.land.sky(
      ctx,
      width,
      height,
      v,
      hour,
      seconds,
      p,
      f.portrait,
    );
    this.land.farLand(ctx, v, hour);

    ctx.save();
    apply(ctx, v);
    this.land.back(ctx, v, hour, this.env, sun, seconds);
    this.land.palmsBehind(ctx, v, this.env, seconds);
    this.land.ground(ctx, v, this.env);
    this.street(ctx, v, f);
    this.kolams(ctx, v, f);
    this.standing(ctx, v, f, hour);
    this.particles(ctx, v, f);

    ctx.globalCompositeOperation = "lighter";
    for (const l of this.lights)
      glow(ctx, glowSprite(l.color), l.x, l.y, l.r, l.a);
    ctx.globalCompositeOperation = "source-over";
    this.smoke(ctx, f);
    this.land.crops(ctx, v, this.env, seconds, f.reduced);
    ctx.restore();

    this.shout(ctx, v, f);
    this.sunRays(ctx, f, v, sun, hour);

    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      Math.min(width, height) * 0.3,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    vignette.addColorStop(0, "rgba(6, 4, 10, 0)");
    vignette.addColorStop(1, `rgba(6, 4, 10, ${0.6 - hour.amb * 0.32})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    void dt;
  }

  // ─── State that moves with time ────────────────────────────────────────────

  private step(f: Frame) {
    const { p, dt, seconds } = f;
    this.flare = Math.max(0, this.flare - dt * 0.8);
    for (let i = 0; i < 3; i++)
      this.shake[i] = Math.max(0, this.shake[i] - dt * 0.7);

    // The pot: the scroll brings it to the boil by MOMENTS.boil; holding the fire gets it there sooner.
    if (p < MOMENTS.hearth - 0.01 || p > 0.62) {
      this.heat = 0;
      this.spill = 0;
      this.overflowed = false;
      this.holding = false;
    }
    if (this.holding && p > 0.34 && p < 0.48) {
      this.heat = Math.min(1, this.heat + dt * 0.22);
      if (seconds - this.lastStoke > 0.42) {
        this.lastStoke = seconds;
        this.emit("stoke");
      }
    } else if (!this.overflowed) this.heat = Math.max(0, this.heat - dt * 0.03);
    const boil = this.boil(p);
    if (boil >= 1 && !this.overflowed && p > 0.34 && p < 0.6) {
      this.overflowed = true;
      this.overflowAt = seconds;
      this.emit("overflow");
    }
    if (this.overflowed)
      this.spill = Math.min(1, this.spill + dt * 0.45 + (f.reduced ? 1 : 0));
  }

  private boil(p: number) {
    return Math.max(
      rise(p, MOMENTS.hearth + 0.005, MOMENTS.boil) * 1.0001,
      this.heat,
    );
  }

  private spilled(p: number) {
    return Math.max(
      this.spill,
      clamp((p - MOMENTS.spill[0]) / (MOMENTS.spill[1] - MOMENTS.spill[0])),
    );
  }

  /** How much the Bhogi fire is burning, 0..1+. */
  private fire(p: number) {
    const lit = rise(p, MOMENTS.light, MOMENTS.light + 0.03);
    const down = lerp(1, 0.18, rise(p, 0.19, 0.3));
    const mat =
      rise(p, MOMENTS.mat, MOMENTS.mat + 0.006) *
      (1 - rise(p, MOMENTS.mat + 0.006, MOMENTS.mat + 0.03)) *
      0.45;
    return lit * down * (1 + mat) + this.flare * lit;
  }

  private hearthFire(p: number) {
    return (
      rise(p, MOMENTS.hearth - 0.01, MOMENTS.hearth + 0.01) *
        lerp(1, 0.35, rise(p, 0.47, 0.52)) *
        (1 - rise(p, 0.6, 0.64)) +
      (this.holding ? 0.45 : 0)
    );
  }

  /** Light on a surface from the fires and lamps near it. */
  private liftAt(x: number, y: number) {
    let lift = 0;
    for (const s of this.sources) {
      const d = Math.hypot(x - s.x, (y - s.y) * 1.4);
      if (d < s.r) lift += s.a * (1 - d / s.r) ** 1.3;
    }
    return Math.min(0.85, lift) * (1 - this.env.amb * 0.75);
  }

  private light = (
    x: number,
    y: number,
    r: number,
    a: number,
    color = LAMP_LIGHT,
  ) => {
    this.lights.push({ x, y, r, a, color });
  };

  // ─── The street ────────────────────────────────────────────────────────────

  private street(ctx: Ctx, v: View, f: Frame) {
    const { p, seconds } = f;
    const env = this.env;
    const fire = this.fire(p);
    const hearth = this.hearthFire(p);
    this.sources = [
      { x: FIRE.x, y: FIRE.y - 0.6, r: 7.5, a: fire * 0.95 },
      { x: HEARTH.x, y: HEARTH.y - 0.4, r: 3.2, a: hearth * 0.7 },
    ];
    const night = 1 - rise(p, 0.28, 0.4);
    const dusk = rise(p, 0.93, 1);
    const kaappu = rise(p, 0.09, 0.15);
    for (const house of HOUSES) {
      if (!onScreen(v, house.x, -2, house.width)) continue;
      const lamp =
        house.x === 0
          ? Math.max(night, 0.8 * dusk)
          : Math.max(night * 0.8, 0.7 * dusk);
      drawHouse(
        ctx,
        house,
        env,
        this.liftAt(house.x, 0) * 0.6,
        1,
        kaappu,
        lamp * (0.8 + 0.2 * flicker(seconds, house.seed)),
        seconds,
        (x, y, r, a) => this.light(x, y, r, a),
      );
    }
    if (onScreen(v, SHED.x, -2, SHED.width))
      drawShed(ctx, SHED.x, SHED.width, env, 0);
    // The yard of the hero house: the thulasi maadam, and a neem tree by the wall.
    if (onScreen(v, 8, -2, 6)) {
      this.neem(ctx, 10.9, env, seconds);
      drawThulasi(ctx, 4.9, 0.35, 1.05, env, this.liftAt(4.9, 0.3));
    }
  }

  private neemPath: Path2D | null = null;

  private neem(ctx: Ctx, x: number, env: Env, seconds: number) {
    if (!this.neemPath) {
      const random = mulberry32(31);
      const path = new Path2D();
      for (let i = 0; i < 70; i++) {
        const a = random() * TAU;
        const r = random() ** 0.6 * 2.1;
        const cx = x + Math.cos(a) * r * 1.2;
        const cy = -4.6 + Math.sin(a) * r * 0.7;
        const s = 0.25 + random() * 0.35;
        path.moveTo(cx + s, cy);
        path.arc(cx, cy, s, 0, TAU);
      }
      this.neemPath = path;
    }
    ctx.fillStyle = paint([70, 50, 36], env);
    ctx.beginPath();
    ctx.moveTo(x - 0.22, 0);
    ctx.quadraticCurveTo(x - 0.1, -2.2, x - 0.5, -4.0);
    ctx.lineTo(x + 0.1, -4.2);
    ctx.quadraticCurveTo(x + 0.05, -2.2, x + 0.26, 0);
    ctx.fill();
    ctx.save();
    ctx.translate(x, -3);
    ctx.rotate(Math.sin(seconds * 0.4) * 0.008);
    ctx.translate(-x, 3);
    ctx.fillStyle = paint([46, 84, 40], env);
    ctx.fill(this.neemPath);
    ctx.translate(0.15, 0.12);
    ctx.fillStyle = paint([64, 110, 48], env, 0, 0.55);
    ctx.fill(this.neemPath);
    ctx.restore();
  }

  // ─── Kolams ────────────────────────────────────────────────────────────────

  /** How tilted toward us the ground looks: more when the camera leans in over the kolam. */
  private squash(p: number) {
    return 0.5 + 0.22 * rise(p, 0.205, 0.235) * (1 - rise(p, 0.315, 0.34));
  }

  private kolams(ctx: Ctx, v: View, f: Frame) {
    const { p, seconds } = f;
    const env = this.env;
    const lift = 0.2;
    // The small kolams at the other doors, already done by the time the camera comes past.
    for (const s of this.small) {
      const shown = rise(p, s.at, s.at + 0.05);
      if (shown <= 0 || !onScreen(v, s.x, s.y, 1)) continue;
      if (shown >= 1 && !s.path) {
        s.path = new Path2D();
        strokeKolam(s.path, s.kolam, s.kolam.length + 1);
      }
      const path = shown >= 1 ? s.path! : new Path2D();
      if (shown < 1) strokeKolam(path, s.kolam, s.kolam.length * shown);
      this.paintKolam(
        ctx,
        s.x,
        s.y,
        s.spacing,
        0.5,
        s.kolam,
        s.kolam.dots.length,
        path,
        env,
        lift,
        shown,
      );
    }

    // The hero kolam, drawn as you scroll.
    if (p < MOMENTS.dawn - 0.01 || !onScreen(v, KOLAM.x, KOLAM.y, 2)) return;
    const sq = this.squash(p);
    // First the threshold washed with cow-dung water, dark and damp.
    const wet = rise(p, MOMENTS.dawn, MOMENTS.dots[0]);
    ctx.save();
    ctx.translate(KOLAM.x, KOLAM.y);
    ctx.scale(1, sq);
    const r = (KOLAM.size + 1.4) * KOLAM.spacing * Math.SQRT2 * 0.8;
    const damp = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * wet + 0.01);
    damp.addColorStop(0, paint([80, 70, 46], env, 0, 0.75));
    damp.addColorStop(0.8, paint([90, 76, 50], env, 0, 0.6));
    damp.addColorStop(1, paint([90, 76, 50], env, 0, 0));
    ctx.fillStyle = damp;
    ctx.beginPath();
    ctx.arc(0, 0, r * wet + 0.01, 0, TAU);
    ctx.fill();
    ctx.restore();
    const dots = Math.floor(
      this.kolam.dots.length * rise(p, MOMENTS.dots[0], MOMENTS.dots[1]) +
        0.001,
    );
    const drawn =
      this.kolam.length *
      clamp((p - MOMENTS.line[0]) / (MOMENTS.line[1] - MOMENTS.line[0]));
    const key = `${this.kolamVersion}/${drawn.toFixed(3)}`;
    if (!this.kolamPath || this.kolamPath.key !== key) {
      const path = new Path2D();
      const tip = strokeKolam(path, this.kolam, drawn);
      this.kolamPath = { key, path, tip };
    }
    this.paintKolam(
      ctx,
      KOLAM.x,
      KOLAM.y,
      KOLAM.spacing,
      sq,
      this.kolam,
      dots,
      this.kolamPath.path,
      env,
      lift,
      1,
    );

    // A border of red kaavi round it, and the pumpkin flower in the middle on its pat of cow dung.
    const done = rise(p, MOMENTS.flower, MOMENTS.flower + 0.01);
    if (done > 0) {
      ctx.save();
      ctx.translate(KOLAM.x, KOLAM.y);
      ctx.scale(KOLAM.spacing, KOLAM.spacing * sq);
      const e = KOLAM.size + 1.05;
      ctx.strokeStyle = paint([176, 50, 36], env, 0.1, 0.85 * done);
      ctx.lineWidth = 0.16;
      ctx.setLineDash([0.28, 0.12]);
      ctx.beginPath();
      ctx.moveTo(e, 0);
      ctx.lineTo(0, e);
      ctx.lineTo(-e, 0);
      ctx.lineTo(0, -e);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = paint([96, 84, 50], env, 0, done);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.42, 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = paint([250, 196, 30], env, 0.3, done);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.3, 0.18, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = paint([240, 140, 20], env, 0.3, done);
      ctx.beginPath();
      ctx.arc(0, 0, 0.14, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Twists the reader has made: a puff of flour where the line moved.
    for (const t of this.twists) {
      const age = seconds - t.born;
      if (age > 1.2) continue;
      ctx.strokeStyle = paint(FLOUR, env, 0.4, 0.7 * (1 - age / 1.2));
      ctx.lineWidth = 0.025 * (1 - age / 1.2);
      ctx.beginPath();
      ctx.ellipse(
        t.x,
        t.y,
        0.05 + age * 0.22,
        (0.05 + age * 0.22) * sq,
        0,
        0,
        TAU,
      );
      ctx.stroke();
    }
    this.twists = this.twists.filter((t) => seconds - t.born < 1.2);
  }

  private paintKolam(
    ctx: Ctx,
    x: number,
    y: number,
    spacing: number,
    sq: number,
    kolam: Kolam,
    dots: number,
    path: Path2D,
    env: Env,
    lift: number,
    alpha: number,
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(spacing, spacing * sq);
    ctx.fillStyle = paint(FLOUR, env, lift + 0.1, alpha);
    ctx.beginPath();
    for (let i = 0; i < dots; i++) {
      const d = kolam.dots[i];
      ctx.moveTo(d.x + 0.075, d.y);
      ctx.arc(d.x, d.y, 0.075, 0, TAU);
    }
    ctx.fill();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = paint(FLOUR, env, lift, 0.28 * alpha);
    ctx.lineWidth = 0.17;
    ctx.stroke(path);
    ctx.strokeStyle = paint(FLOUR, env, lift + 0.15, 0.95 * alpha);
    ctx.lineWidth = 0.085;
    ctx.stroke(path);
    ctx.restore();
  }

  /** Where the hand drawing the kolam is, in world units. */
  private kolamHand(p: number, seconds: number) {
    const sq = this.squash(p);
    const at = (x: number, y: number) => ({
      x: KOLAM.x + x * KOLAM.spacing,
      y: KOLAM.y + y * KOLAM.spacing * sq,
    });
    if (p < MOMENTS.dots[0]) {
      // Sprinkling water in a sweep across the threshold.
      const a = Math.sin(seconds * 2.2) * 1.2;
      return at(Math.cos(a) * 3, Math.sin(a) * 3);
    }
    if (p < MOMENTS.line[0]) {
      const i = Math.min(
        this.kolam.dots.length - 1,
        Math.floor(
          this.kolam.dots.length * rise(p, MOMENTS.dots[0], MOMENTS.dots[1]),
        ),
      );
      const d = this.kolam.dots[i];
      return at(d.x, d.y);
    }
    const tip = this.kolamPath?.tip ?? { x: 0, y: 0 };
    return at(tip.x, tip.y);
  }

  // ─── Everything standing in the street, back to front ──────────────────────

  private standing(ctx: Ctx, v: View, f: Frame, hour: Hour) {
    const { p, seconds } = f;
    const env = this.env;
    const items: { y: number; draw: () => void }[] = [];
    const add = (x: number, y: number, r: number, draw: () => void) => {
      if (onScreen(v, x, y - r * 0.6, r)) items.push({ y, draw });
    };
    const person = (
      look: Look,
      x: number,
      y: number,
      pose: Pose,
      facing: 1 | -1,
      extra = 0,
    ) =>
      add(x, y, look.h, () => {
        this.shadow(ctx, x, y, look.h * 0.16);
        drawPerson(
          ctx,
          x,
          y,
          look,
          pose,
          env,
          this.liftAt(x, y - look.h * 0.5) + extra,
          facing,
          seconds,
        );
      });
    const beat = (seed: number) =>
      Math.max(0, Math.sin(seconds * ((2 * Math.PI) / 0.4) + seed * 1.3));

    // Bhogi: the fire, the children with their drums, and the old mat going on.
    const fire = this.fire(p);
    add(FIRE.x, FIRE.y, 3, () => this.bonfire(ctx, f, fire));
    if (p < 0.34) {
      for (const k of this.kids) {
        const b = beat(k.seed);
        const pose: Pose = k.drum
          ? {
              la: 1.3,
              lf: 1.9,
              ra: 0.9 + b * 0.6,
              rf: 1.5 + b * 0.8,
              hold: "drum",
              bob: -b * 0.01,
            }
          : {
              la: 0.7 + b * 0.5,
              lf: 1.8 + b * 0.4,
              ra: 0.7 + b * 0.5,
              rf: 1.8,
              bob: -b * 0.008,
            };
        person(k.look, k.x, k.y, pose, k.facing);
      }
      // A father brings the old palm-leaf mat and throws it on.
      const walk = rise(p, 0.07, MOMENTS.mat);
      const thrown = p > MOMENTS.mat;
      const mx = lerp(-7.9, -9.6, walk);
      const stepping = walk > 0 && walk < 1 ? Math.sin(seconds * 6) : 0;
      person(
        { ...APPA, top: [200, 196, 186], towel: [120, 60, 40] },
        thrown ? -9.6 : mx,
        1.6,
        thrown
          ? { la: 0.2, lf: 0.4, ra: 0.6, rf: 1.3 }
          : { la: 2.7, lf: 2.9, ra: 2.7, rf: 2.9, hold: "mat", step: stepping },
        -1,
      );
      // The grandmother warming her hands, and a woman with the worn-out broom.
      person(
        { ...PAATI, cloth: [90, 60, 110], top: [90, 60, 110] },
        -13.8,
        1.65,
        { la: 1.2, lf: 1.6, ra: 1.3, rf: 1.7 },
        1,
      );
      person(
        { ...AMMA, cloth: [170, 40, 40], top: [40, 90, 140], flowers: false },
        -8.4,
        2.05,
        { la: 0.2, lf: 0.3, ra: 0.9, rf: 1.4 },
        -1,
      );
    }

    // First light: the kolam being drawn at the door.
    if (p > MOMENTS.dawn - 0.01 && p < 0.47) {
      const hand = this.kolamHand(p, seconds);
      if (p < MOMENTS.flower) {
        const target = hand.x + 0.52;
        if (f.reduced || Math.abs(this.womanX - target) > 2)
          this.womanX = target;
        else this.womanX += (target - this.womanX) * Math.min(1, f.dt * 2.2);
        const wy = Math.max(hand.y + 0.18, KOLAM.y - 0.1);
        add(this.womanX, wy, 1.6, () => {
          this.shadow(ctx, this.womanX, wy, 0.3);
          drawBending(
            ctx,
            this.womanX,
            wy,
            AMMA,
            hand,
            env,
            0.15,
            -1,
            true,
            1.25,
          );
        });
        // Flour running from her fingers.
        if (p > MOMENTS.line[0] && !f.reduced && Math.random() < 0.6)
          this.grains.push({
            x: hand.x + (Math.random() - 0.5) * 0.02,
            y: hand.y - 0.1,
            vy: 0.3,
            age: 0,
          });
      } else {
        // Done: she stands back with the bowl on her hip and looks at it.
        const x = lerp(KOLAM.x + 1.2, 8.35, rise(p, 0.34, 0.37));
        const stirring = rise(p, 0.36, 0.37);
        if (stirring < 1)
          person(
            AMMA,
            x,
            KOLAM.y + 0.15 - stirring * 0.2,
            { ...STANDING, step: stirring > 0 ? Math.sin(seconds * 6) : 0 },
            -1,
          );
      }
    }

    // Thai Pongal: the hearth, the pot, the canes, and the family round it.
    if (p > 0.3 && p < 0.66) this.pongal(ctx, v, f, add, person);

    // Mattu Pongal: the cattle in front of the shed.
    if (p > 0.56 && p < 0.8) this.cattle(ctx, f, add, person);

    // Kaanum Pongal: the family out on the sand.
    if (p > 0.7) this.riverbank(ctx, f, add, person);

    items.sort((a, b) => a.y - b.y);
    for (const item of items) item.draw();
    void hour;
  }

  private shadow(ctx: Ctx, x: number, y: number, r: number) {
    ctx.fillStyle = `rgba(20, 10, 6, ${0.12 + 0.12 * this.env.amb})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // ─── Bhogi ─────────────────────────────────────────────────────────────────

  private bonfire(ctx: Ctx, f: Frame, fire: number) {
    const { p, seconds } = f;
    const env = this.env;
    const burn = rise(p, MOMENTS.light, 0.32);
    const w = FIRE.size * (1 - burn * 0.45);
    // The tall tongues behind, then the old things burning, then low flames licking in front.
    const row = (count: number, scale: number, seed: number) => {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const dx = (t - 0.5) * w * 0.85;
        const hump = 1 - Math.abs(dx) / (w * 0.5);
        const h =
          fire *
          scale *
          (0.45 + 0.7 * hump) *
          (0.8 + 0.3 * Math.sin(seed + i * 2.1));
        flameTongue(
          ctx,
          FIRE.x + dx,
          FIRE.y - 0.15 - hump * 0.35 * (1 - burn),
          h,
          0.5 * scale * (0.55 + fire * 0.35),
          seconds,
          seed + i * 1.7,
        );
      }
    };
    if (fire > 0.01) row(7, 1.9, 1);
    drawPile(
      ctx,
      FIRE.x,
      FIRE.y,
      FIRE.size,
      burn,
      env,
      this.liftAt(FIRE.x, FIRE.y) + fire * 0.5,
    );
    if (fire < 0.01) return;
    ctx.fillStyle = `rgba(255, 120, 36, ${Math.min(1, 0.6 * fire + 0.2)})`;
    ctx.beginPath();
    ctx.ellipse(FIRE.x, FIRE.y - 0.05, w * 0.45, 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    row(9, 0.85, 7);
    ctx.globalAlpha = 1;
    this.light(
      FIRE.x,
      FIRE.y - 0.9,
      6.5 * Math.min(1.4, fire),
      0.5 * Math.min(1.2, fire),
      FIRE_LIGHT,
    );
    this.light(
      FIRE.x,
      FIRE.y - 0.5,
      2.2,
      0.8 * Math.min(1, fire),
      "255, 200, 110",
    );
    // Sparks and smoke going up.
    if (!f.reduced && seconds > this.nextSpark) {
      this.nextSpark = seconds + 0.06 / Math.max(0.2, fire);
      this.sparks.push({
        x: FIRE.x + (Math.random() - 0.5) * w * 0.6,
        y: FIRE.y - 0.6 - Math.random() * fire,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.8 - Math.random() * 1.2,
        age: 0,
        life: 1 + Math.random() * 1.6,
      });
    }
    if (!f.reduced && seconds > this.nextSmoke) {
      this.nextSmoke = seconds + 0.22;
      this.puffs.push({
        x: FIRE.x + (Math.random() - 0.5) * 0.6,
        y: FIRE.y - FIRE.size * fire * 0.9,
        vx: 0.15 + Math.random() * 0.1,
        vy: -0.45,
        age: 0,
        life: 5,
        size: 0.5,
        steam: false,
      });
    }
  }

  // ─── Thai Pongal ───────────────────────────────────────────────────────────

  private pongal(
    ctx: Ctx,
    v: View,
    f: Frame,
    add: (x: number, y: number, r: number, draw: () => void) => void,
    person: (
      look: Look,
      x: number,
      y: number,
      pose: Pose,
      facing: 1 | -1,
      extra?: number,
    ) => void,
  ) {
    const { p, seconds } = f;
    const env = this.env;
    const hearth = this.hearthFire(p);
    const boil = this.boil(p);
    const spill = this.spilled(p);
    const s = HEARTH.size;
    const since = seconds - this.overflowAt;
    const cheering = spill > 0.02 && p < 0.49;

    // The sugarcane stood over the pot, tied at the top, and the hearth and pot under it.
    add(HEARTH.x, HEARTH.y - 0.05, 3.4, () => {
      const lift = this.liftAt(HEARTH.x, HEARTH.y - 1);
      for (const side of [-1, 1]) {
        drawCane(
          ctx,
          HEARTH.x + side * 0.95,
          HEARTH.y - 0.02,
          HEARTH.x + side * 0.12,
          HEARTH.y - 3.25,
          0.075,
          env,
          lift,
          true,
          side > 0 ? 3 : 4,
          Math.sin(seconds * 0.6 + side) * 0.05,
        );
      }
      ctx.strokeStyle = paint([240, 200, 60], env, lift);
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(HEARTH.x - 0.2, HEARTH.y - 2.95);
      ctx.lineTo(HEARTH.x + 0.2, HEARTH.y - 3.0);
      ctx.stroke();
      // A kolam of its own round the hearth: a scalloped ring of rice flour with a dot in each scallop.
      ctx.save();
      ctx.translate(HEARTH.x, HEARTH.y + 0.02);
      ctx.scale(1, 0.38);
      ctx.strokeStyle = paint(FLOUR, env, 0.2, 0.85);
      ctx.fillStyle = paint(FLOUR, env, 0.2, 0.85);
      ctx.lineWidth = 0.03;
      const scallops = 22;
      ctx.beginPath();
      for (let i = 0; i < scallops; i++) {
        const a0 = (i / scallops) * TAU;
        const a1 = ((i + 1) / scallops) * TAU;
        const mid = (a0 + a1) / 2;
        ctx.moveTo(Math.cos(a0) * 0.9, Math.sin(a0) * 0.9);
        ctx.quadraticCurveTo(
          Math.cos(mid) * 1.14,
          Math.sin(mid) * 1.14,
          Math.cos(a1) * 0.9,
          Math.sin(a1) * 0.9,
        );
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.84, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < scallops; i++) {
        const mid = ((i + 0.5) / scallops) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(mid) * 0.97, Math.sin(mid) * 0.97, 0.028, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      drawHearth(
        ctx,
        HEARTH.x,
        HEARTH.y,
        s,
        Math.min(1.4, hearth),
        seconds,
        env,
        lift,
        (x, y, r, a) => this.light(x, y, r, a, FIRE_LIGHT),
      );
      drawPot(
        ctx,
        HEARTH.x,
        HEARTH.y - 0.25 * s,
        s,
        { boil, spill },
        seconds,
        env,
        lift + 0.05,
        7,
      );
      const rimY = HEARTH.y - 0.25 * s - 0.98 * s;
      if (spill > 0.02 && this.overflowed)
        this.light(
          HEARTH.x,
          rimY,
          2.2,
          0.28 * spill * Math.max(0, 1 - since / 4),
          "255, 240, 210",
        );
      // Steam, thicker as it comes to the boil.
      if (!f.reduced && boil > 0.25 && seconds > this.nextSteam) {
        this.nextSteam = seconds + (p > 0.47 ? 0.9 : 0.55 - boil * 0.3);
        this.puffs.push({
          x: HEARTH.x + (Math.random() - 0.5) * 0.4,
          y: rimY - 0.15,
          vx: 0.05 + (Math.random() - 0.5) * 0.1,
          vy: -0.3 - boil * 0.25,
          age: 0,
          life: 2.6,
          size: 0.18 + boil * 0.12,
          steam: true,
        });
      }
      // The new rice going in, a handful at a time.
      if (
        !f.reduced &&
        p > MOMENTS.rice[0] &&
        p < MOMENTS.rice[1] &&
        Math.random() < 0.5
      )
        this.grains.push({
          x: HEARTH.x + 0.35 + Math.random() * 0.08,
          y: rimY - 0.55,
          vy: 0.2,
          age: 0,
        });
    });

    // The family, round the pot until it boils over, then facing the sun with the offering.
    const toSun = rise(p, 0.475, 0.5);
    const cheer = (seed: number): Pose => {
      const b = Math.abs(Math.sin(seconds * 5 + seed));
      return {
        la: 2.6 + b * 0.2,
        lf: 2.9,
        ra: 2.5 + b * 0.25,
        rf: 2.8,
        bob: -b * 0.015,
      };
    };
    const kulavai: Pose = { la: 0.25, lf: 0.4, ra: 1.9, rf: -1.76 };
    const aarti =
      rise(p, MOMENTS.aarti - 0.01, MOMENTS.aarti + 0.01) *
      (1 - rise(p, 0.6, 0.62));
    const circle = Math.sin(seconds * 1.6);
    const place = (a: [number, number], b: [number, number]) => ({
      x: lerp(a[0], b[0], toSun),
      y: lerp(a[1], b[1], toSun),
    });
    const walking = toSun > 0 && toSun < 1 ? Math.sin(seconds * 6) : 0;

    if (p >= 0.37) {
      // Amma: stirring, then the rice, then the aarti for Surya.
      const a = place([8.35, 1.35], [5.95, 1.8]);
      let pose: Pose = {
        la: 0.9,
        lf: 1.4,
        ra: 1.0,
        rf: 1.6,
        hold: "ladle",
        lean: 0.1,
      };
      if (cheering && since < 5 && this.overflowed) pose = kulavai;
      else if (cheering && p < MOMENTS.rice[0]) pose = kulavai;
      if (p > MOMENTS.rice[0] && p < MOMENTS.rice[1] + 0.005)
        pose = { la: 0.3, lf: 0.5, ra: 1.7, rf: 1.9 };
      if (toSun > 0) pose = { ...STANDING, step: walking };
      if (toSun >= 1)
        pose =
          aarti > 0
            ? {
                la: 1.5 + aarti * 0.5 + circle * 0.15 * aarti,
                lf: 1.9 + aarti * 0.5,
                ra: 1.5 + aarti * 0.5 + circle * 0.15 * aarti,
                rf: 1.9 + aarti * 0.5,
                hold: "aarti",
              }
            : { ...JOINED };
      person(AMMA, a.x, a.y, pose, toSun > 0.5 ? 1 : -1);
      if (toSun >= 1 && aarti > 0) {
        // The camphor flame lighting her face.
        this.light(
          a.x + 0.42,
          a.y - 1.25 - aarti * 0.2,
          1.1,
          0.5 * aarti,
          LAMP_LIGHT,
        );
      }
    }
    const paati = place([5.8, 1.15], [5.2, 1.45]);
    person(
      PAATI,
      paati.x,
      paati.y,
      cheering
        ? kulavai
        : toSun > 0 && toSun < 1
          ? { ...STANDING, step: walking }
          : JOINED,
      1,
    );
    const appa = place([9.3, 1.05], [4.55, 1.3]);
    person(
      APPA,
      appa.x,
      appa.y,
      cheering
        ? cheer(1)
        : toSun > 0 && toSun < 1
          ? { ...STANDING, step: walking }
          : toSun >= 1
            ? JOINED
            : { la: 0.2, lf: 0.4, ra: 0.3, rf: 1.2 },
      toSun > 0.5 ? 1 : -1,
    );
    const magal = place([6.35, 1.95], [5.55, 2.2]);
    person(
      MAGAL,
      magal.x,
      magal.y,
      cheering
        ? cheer(2)
        : toSun >= 1
          ? JOINED
          : { la: 0.3, lf: 0.6, ra: 0.5, rf: 1.0, step: walking },
      1,
    );
    const magan = place([8.75, 2.05], [4.85, 2.3]);
    person(
      MAGAN,
      magan.x,
      magan.y,
      cheering
        ? cheer(3)
        : toSun >= 1
          ? JOINED
          : { la: 0.2, lf: 0.4, ra: 0.3, rf: 0.6, step: walking },
      toSun > 0.5 ? 1 : -1,
    );

    // The offering for Surya, laid out on a banana leaf in front of the pot.
    const laid = rise(p, 0.47, 0.49);
    if (laid > 0) {
      add(LEAF.x, LEAF.y + 0.1, 1.5, () => {
        ctx.globalAlpha = laid;
        const lift = 0.1;
        drawLeaf(ctx, LEAF.x, LEAF.y, LEAF.length, env, lift, 0.34);
        drawCane(
          ctx,
          LEAF.x - 0.85,
          LEAF.y - 0.14,
          LEAF.x + 0.7,
          LEAF.y - 0.2,
          0.05,
          env,
          lift,
          false,
        );
        drawCane(
          ctx,
          LEAF.x - 0.8,
          LEAF.y - 0.08,
          LEAF.x + 0.75,
          LEAF.y - 0.12,
          0.05,
          env,
          lift,
          false,
        );
        drawPongalHeap(ctx, LEAF.x, LEAF.y + 0.08, 0.55, env, lift + 0.1);
        drawPongalHeap(
          ctx,
          LEAF.x - 0.48,
          LEAF.y + 0.08,
          0.32,
          env,
          lift + 0.1,
          false,
        );
        drawBananas(ctx, LEAF.x + 0.35, LEAF.y + 0.08, 0.34, env, lift);
        drawCoconut(ctx, LEAF.x - 0.72, LEAF.y + 0.1, 0.12, env, lift);
        drawTurmeric(
          ctx,
          LEAF.x + 0.82,
          LEAF.y + 0.02,
          0.45,
          -1.2,
          env,
          lift,
          5,
        );
        ctx.globalAlpha = 1;
      });
      add(LAMP.x, LAMP.y, 1.2, () => {
        ctx.globalAlpha = laid;
        drawKuthuvilakku(
          ctx,
          LAMP.x,
          LAMP.y,
          LAMP.h,
          rise(p, 0.485, 0.5) * (1 - rise(p, 0.6, 0.63)),
          seconds,
          env,
          0.1,
          (x, y, r, a) => this.light(x, y, r, a),
        );
        ctx.globalAlpha = 1;
      });
    }
    void v;
  }

  /** "Pongalo Pongal!", the shout as the pot boils over, rising gold over it. */
  private shout(ctx: Ctx, v: View, f: Frame) {
    const since = f.seconds - this.overflowAt;
    if (!this.overflowed || since > 4.5 || f.p > 0.5) return;
    const rise_ = clamp(since / 0.4);
    const fade = 1 - clamp((since - 3) / 1.5);
    const s = HEARTH.size;
    const at = toScreen(
      v,
      HEARTH.x,
      HEARTH.y - 0.25 * s - 0.98 * s - 0.75 - since * 0.06,
    );
    const size =
      Math.min(v.width * 0.055, 0.3 * v.scale, 64) * (0.85 + 0.15 * rise_);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${size.toFixed(1)}px ${tamil()}`;
    const half = ctx.measureText("பொங்கலோ பொங்கல்!").width / 2;
    at.x = clamp(at.x, half + v.width * 0.04, v.width * 0.96 - half);
    at.y = Math.max(at.y, size * 2.4);
    ctx.globalAlpha = rise_ * fade;
    ctx.shadowColor = "rgba(255, 170, 60, 0.8)";
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = "#ffe2a0";
    ctx.fillText("பொங்கலோ பொங்கல்!", at.x, at.y);
    ctx.restore();
  }

  /** Long shafts of morning light over the yard as the sun comes up, fading into the mist. */
  private sunRays(ctx: Ctx, f: Frame, v: View, sun: Sun, hour: Hour) {
    const on =
      sun.a * rise(f.p, 0.33, 0.38) * (1 - rise(f.p, 0.52, 0.58)) * hour.haze;
    if (on < 0.02 || sun.y < -sun.r * 4) return;
    const horizon = toScreen(v, 0, HORIZON).y;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, f.width, Math.max(0, horizon + (f.height - horizon) * 0.35));
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    const colour = sun.color.map(Math.round).join(", ");
    const len = Math.max(f.width, f.height) * 0.9;
    for (let i = 0; i < 9; i++) {
      const a =
        Math.PI * 0.72 +
        (i - 4) * 0.13 +
        Math.sin(f.seconds * 0.1 + i * 1.7) * 0.02;
      const g = ctx.createLinearGradient(
        sun.x,
        sun.y,
        sun.x + Math.cos(a) * len,
        sun.y + Math.sin(a) * len,
      );
      g.addColorStop(0, `rgba(${colour}, ${0.07 * on})`);
      g.addColorStop(1, `rgba(${colour}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sun.x, sun.y);
      ctx.lineTo(
        sun.x + Math.cos(a - 0.035) * len,
        sun.y + Math.sin(a - 0.035) * len,
      );
      ctx.lineTo(
        sun.x + Math.cos(a + 0.035) * len,
        sun.y + Math.sin(a + 0.035) * len,
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── Mattu Pongal ──────────────────────────────────────────────────────────

  private cattle(
    ctx: Ctx,
    f: Frame,
    add: (x: number, y: number, r: number, draw: () => void) => void,
    person: (
      look: Look,
      x: number,
      y: number,
      pose: Pose,
      facing: 1 | -1,
      extra?: number,
    ) => void,
  ) {
    const { p, seconds } = f;
    const env = this.env;
    const dressed = rise(p, 0.6, 0.645);
    // Straw scattered in front of the shed.
    add(SHED.x, 0.5, 3, () => {
      ctx.strokeStyle = paint([214, 180, 100], env, 0, 0.8);
      ctx.lineWidth = 0.02;
      const random = mulberry32(9);
      ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const x = SHED.x - 3.5 + random() * 7;
        const y = 0.2 + random() * 2.6;
        const a = random() * TAU;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.06);
      }
      ctx.stroke();
    });
    HERD.forEach((c, i) => {
      add(c.x, c.y, c.size * 2, () => {
        this.shadow(ctx, c.x + 0.1 * c.size, c.y, c.size * 1.0);
        const graze = i === 2 ? 0.25 + 0.1 * Math.sin(seconds * 1.4) : 0;
        drawCattle(
          ctx,
          c.x,
          c.y,
          c.size,
          c.look,
          env,
          0.05,
          c.facing,
          seconds,
          c.seed,
          dressed,
          this.shake[i],
          graze,
        );
      });
    });
    // Appa painting the big bull's horns; the boy feeding the cow; Amma with the aarti.
    const brush = Math.sin(seconds * 3) * 0.12;
    person(
      { ...APPA, tucked: true, mundaasu: true, towel: [40, 120, 70] },
      21.55,
      0.8,
      { la: 0.4, lf: 0.8, ra: 2.25 + brush, rf: 2.7 + brush, hold: "stick" },
      -1,
    );
    person(
      MAGAN,
      22.85,
      2.25,
      { la: 0.3, lf: 0.5, ra: 1.35, rf: 1.5, hold: "plate" },
      -1,
    );
    person(
      {
        ...AMMA,
        cloth: [200, 40, 70],
        border: [240, 190, 60],
        top: [240, 190, 60],
      },
      23.75,
      1.5,
      {
        la: 1.5 + Math.sin(seconds * 1.6) * 0.12,
        lf: 1.9,
        ra: 1.5 + Math.sin(seconds * 1.6) * 0.12,
        rf: 1.9,
        hold: "aarti",
      },
      -1,
    );
    if (p > 0.6) this.light(23.35, 1.5 - 1.3, 0.8, 0.25, LAMP_LIGHT);
    person(MAGAL, 19.1, 2.15, { la: 0.3, lf: 0.6, ra: 0.9, rf: 1.3 }, 1);
  }

  // ─── Kaanum Pongal ─────────────────────────────────────────────────────────

  private riverbank(
    ctx: Ctx,
    f: Frame,
    add: (x: number, y: number, r: number, draw: () => void) => void,
    person: (
      look: Look,
      x: number,
      y: number,
      pose: Pose,
      facing: 1 | -1,
      extra?: number,
    ) => void,
  ) {
    const { p, seconds } = f;
    const env = this.env;
    // The mat, woven in stripes, with the tiffin carriers and the leaves of food.
    add(MAT.x, MAT.y - 0.5, 2, () => {
      ctx.save();
      ctx.translate(MAT.x, MAT.y - 0.05);
      ctx.fillStyle = paint([200, 170, 110], env);
      ctx.beginPath();
      ctx.moveTo(-MAT.w / 2, -0.35);
      ctx.lineTo(MAT.w / 2, -0.35);
      ctx.lineTo(MAT.w / 2 + 0.15, 0.3);
      ctx.lineTo(-MAT.w / 2 - 0.15, 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = paint(
          i % 3 === 0
            ? [170, 40, 50]
            : i % 3 === 1
              ? [40, 110, 70]
              : [220, 190, 130],
          env,
          0,
          0.8,
        );
        ctx.fillRect(-MAT.w, -0.35 + i * 0.075, MAT.w * 2, 0.035);
      }
      ctx.restore();
      ctx.restore();
    });
    const tf = { x: 35.05, y: MAT.y - 0.33 };
    add(tf.x, MAT.y - 0.3, 0.4, () => {
      ctx.save();
      ctx.translate(0, tf.y - 1.72);
      ctx.fillStyle = paint([200, 204, 210], env, 0.2);
      ctx.fillRect(34.95, 1.72, 0.2, 0.3);
      ctx.strokeStyle = paint([120, 124, 130], env);
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      ctx.moveTo(34.95, 1.82);
      ctx.lineTo(35.15, 1.82);
      ctx.moveTo(34.95, 1.92);
      ctx.lineTo(35.15, 1.92);
      ctx.moveTo(34.97, 1.72);
      ctx.quadraticCurveTo(35.05, 1.55, 35.13, 1.72);
      ctx.stroke();
      ctx.restore();
      drawLeaf(ctx, 33.0, MAT.y - 0.22, 0.6, env, 0, 0.3);
      drawPongalHeap(ctx, 33.0, MAT.y - 0.19, 0.22, env, 0.1, false);
    });

    // Thatha and Paati on the mat; their grandson bends to touch their feet; his wife waits.
    const bless = 0.5 + 0.5 * Math.sin(seconds * 0.8);
    add(33.55, MAT.y, THATHA.h, () =>
      drawSitting(ctx, 33.55, MAT.y, THATHA, env, 0.05, 1, 0, {
        la: 0.5,
        lf: 1.3,
        ra: 0.6,
        rf: 1.4,
      }),
    );
    add(34.3, MAT.y + 0.05, PAATI.h, () =>
      drawSitting(
        ctx,
        34.3,
        MAT.y + 0.05,
        {
          ...PAATI,
          cloth: [30, 90, 60],
          top: [30, 90, 60],
          border: [236, 190, 70],
        },
        env,
        0.05,
        1,
        0,
        { la: 0.5, lf: 1.3, ra: 1.25 + bless * 0.08, rf: 1.05 + bless * 0.1 },
      ),
    );
    add(35.45, MAT.y + 0.25, 1.7, () => {
      this.shadow(ctx, 35.45, MAT.y + 0.25, 0.3);
      drawBending(
        ctx,
        35.45,
        MAT.y + 0.25,
        { ...APPA, top: [220, 230, 246], towel: null, h: 1.72 },
        { x: 34.6, y: MAT.y + 0.08 },
        env,
        0.05,
        -1,
        false,
        1.2,
      );
    });
    person(
      {
        ...AMMA,
        cloth: [190, 30, 90],
        border: [246, 196, 70],
        top: [246, 196, 70],
      },
      36.25,
      MAT.y - 0.05,
      JOINED,
      -1,
    );

    // Kanu pidi: a girl setting out little balls of coloured rice on a turmeric leaf for the crows.
    add(KANU.x, KANU.y, 0.5, () => {
      drawLeaf(ctx, KANU.x, KANU.y, 0.6, env, 0.05, 0.3);
      const colours: RGB[] = [
        [250, 246, 236],
        [246, 200, 40],
        [210, 50, 50],
        [120, 70, 40],
      ];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = paint(colours[i % 4], env, 0.2);
        ctx.beginPath();
        ctx.arc(
          KANU.x - 0.2 + (i % 4) * 0.12,
          KANU.y - 0.02 - Math.floor(i / 4) * 0.06,
          0.04,
          0,
          TAU,
        );
        ctx.fill();
      }
    });
    add(31.9, KANU.y + 0.02, 1.2, () =>
      drawBending(
        ctx,
        31.9,
        KANU.y + 0.02,
        {
          ...MAGAL,
          cloth: [220, 40, 90],
          border: [246, 200, 60],
          top: [246, 200, 60],
        },
        { x: KANU.x - 0.15, y: KANU.y - 0.05 },
        env,
        0.05,
        1,
        false,
        1.1,
      ),
    );
    this.crows(ctx, f, add);

    // Others along the water, and a boy at its edge.
    for (const vis of this.visitors) {
      if (vis.sit)
        add(vis.x, vis.y, vis.look.h, () =>
          drawSitting(
            ctx,
            vis.x,
            vis.y,
            vis.look,
            env,
            0,
            vis.facing,
            Math.sin(seconds + vis.seed) > 0.6 ? 1 : 0,
          ),
        );
      else
        person(
          vis.look,
          vis.x,
          vis.y,
          Math.sin(seconds * 0.5 + vis.seed) > 0
            ? STANDING
            : { la: 0.3, lf: 0.5, ra: 0.8, rf: 1.8 },
          vis.facing,
        );
    }
    person(
      { ...MAGAN, top: [240, 120, 40] },
      39.7,
      0.72,
      {
        la: 0.8 + Math.sin(seconds * 3) * 0.3,
        lf: 1.2,
        ra: 2.2 + Math.sin(seconds * 3 + 1) * 0.3,
        rf: 2.4,
      },
      1,
    );
    // A coracle going across.
    add(42 + Math.sin(seconds * 0.05) * 1.5, -0.55, 0.8, () => {
      const cx = 42 + Math.sin(seconds * 0.05) * 1.5;
      const cy = -0.55 + Math.sin(seconds * 1.1) * 0.01;
      ctx.fillStyle = paint([60, 44, 32], env);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 0.42, 0.13, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = paint([90, 70, 50], env);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 0.42, 0.06, 0, 0, TAU);
      ctx.fill();
      drawPerson(
        ctx,
        cx + 0.05,
        cy + 0.02,
        {
          ...THATHA,
          h: 0.8,
          kind: "man",
          tucked: true,
          towel: [230, 230, 220],
          mundaasu: true,
        },
        { la: 1.6, lf: 2.2, ra: 1.4, rf: 2.0 },
        env,
        0,
        1,
        seconds,
      );
      ctx.strokeStyle = paint([80, 60, 40], env);
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(cx + 0.35, cy - 0.5);
      ctx.lineTo(cx + 0.55, cy + 0.2);
      ctx.stroke();
    });
    void p;
  }

  private crows(
    ctx: Ctx,
    f: Frame,
    add: (x: number, y: number, r: number, draw: () => void) => void,
  ) {
    const { seconds } = f;
    const env = this.env;
    const up = seconds - this.crowsUp;
    const flying = up < 2.5;
    [
      [KANU.x + 0.5, KANU.y + 0.02, 1],
      [KANU.x + 0.85, KANU.y - 0.2, -1],
      [KANU.x - 0.55, KANU.y + 0.15, 1],
    ].forEach(([x, y, facing], i) => {
      const hop = Math.max(0, Math.sin(seconds * 2.3 + i * 2)) ** 8 * 0.06;
      const peck = Math.max(0, Math.sin(seconds * 3.1 + i)) ** 6;
      const fx = flying ? x + up * 1.2 * facing : x;
      const fy = flying ? y - up * 1.3 - up * up * 0.2 : y - hop;
      add(fx, y, 0.3, () => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(facing * 0.22, 0.22);
        ctx.fillStyle = paint([34, 32, 36], env);
        ctx.beginPath();
        ctx.ellipse(0, -0.5, 0.55, 0.32, -0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = paint([90, 88, 92], env);
        ctx.beginPath();
        ctx.ellipse(0.35, -0.72 + peck * 0.3, 0.2, 0.2, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = paint([24, 22, 26], env);
        ctx.beginPath();
        ctx.moveTo(0.5, -0.76 + peck * 0.3);
        ctx.lineTo(0.8, -0.68 + peck * 0.45);
        ctx.lineTo(0.5, -0.64 + peck * 0.3);
        ctx.fill();
        if (flying) {
          const flap = Math.sin(seconds * 18 + i) * 0.6;
          ctx.beginPath();
          ctx.moveTo(-0.1, -0.6);
          ctx.lineTo(-0.5, -0.6 - 0.7 * flap);
          ctx.lineTo(0.2, -0.55);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-0.45, -0.55);
          ctx.lineTo(-0.9, -0.35);
          ctx.lineTo(-0.4, -0.4);
          ctx.fill();
          ctx.strokeStyle = paint([30, 28, 30], env);
          ctx.lineWidth = 0.06;
          ctx.beginPath();
          ctx.moveTo(0, -0.2);
          ctx.lineTo(-0.05, 0);
          ctx.moveTo(0.1, -0.2);
          ctx.lineTo(0.12, 0);
          ctx.stroke();
        }
        ctx.restore();
      });
    });
  }

  // ─── Sparks, smoke, steam, flour ───────────────────────────────────────────

  private particles(ctx: Ctx, v: View, f: Frame) {
    const dt = f.dt;
    this.sparks = this.sparks.filter((s) => (s.age += dt) < s.life);
    if (this.sparks.length > 220)
      this.sparks.splice(0, this.sparks.length - 220);
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.sparks) {
      s.x += (s.vx + Math.sin(f.seconds * 3 + s.life * 10) * 0.2) * dt;
      s.y += s.vy * dt;
      s.vy *= 1 - dt * 0.3;
      const a = 1 - s.age / s.life;
      ctx.fillStyle = `rgba(255, ${Math.round(150 + a * 90)}, 80, ${a})`;
      ctx.fillRect(s.x - 0.015, s.y - 0.015, 0.03, 0.03);
    }
    ctx.globalCompositeOperation = "source-over";
    this.grains = this.grains.filter((g) => (g.age += dt) < 0.5);
    if (this.grains.length > 160)
      this.grains.splice(0, this.grains.length - 160);
    ctx.fillStyle = paint(FLOUR, this.env, 0.3, 0.9);
    for (const g of this.grains) {
      g.vy += dt * 4;
      g.y += g.vy * dt;
      ctx.fillRect(g.x - 0.006, g.y - 0.006, 0.012, 0.012);
    }
    void v;
  }

  private smoke(ctx: Ctx, f: Frame) {
    const dt = f.dt;
    this.puffs = this.puffs.filter((s) => (s.age += dt) < s.life);
    if (this.puffs.length > 90) this.puffs.splice(0, this.puffs.length - 90);
    for (const s of this.puffs) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const t = s.age / s.life;
      const r = s.size * (0.6 + t * 2.2);
      const a = Math.sin(t * Math.PI) * (s.steam ? 0.2 : 0.2);
      const colour = s.steam
        ? rgb(mix([255, 250, 240], this.env.tint, 0.2), a)
        : rgb(mix([70, 60, 70], this.env.tint, this.env.amb * 0.4), a);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, colour);
      g.addColorStop(1, colour.replace(/[\d.]+\)$/, "0)"));
      ctx.fillStyle = g;
      ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    }
  }

  // ─── Touch ─────────────────────────────────────────────────────────────────

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind === "down") this.pressed = true;
    if (kind === "up") {
      this.pressed = false;
      this.holding = false;
      return;
    }
    const v = this.v;
    if (!v) return;
    const p = f.p;
    const world = toWorld(v, x, y);

    // Bhogi: throw more on the fire.
    if (p > 0.03 && p < 0.21 && kind === "down") {
      if (
        Math.abs(world.x - FIRE.x) > 2.2 ||
        world.y < FIRE.y - 3.5 ||
        world.y > FIRE.y + 1
      )
        return;
      this.flare = Math.min(0.8, this.flare + 0.45);
      this.emit("spark");
      if (f.reduced) return;
      for (let i = 0; i < 40; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
        const s = 1 + Math.random() * 2.5;
        this.sparks.push({
          x: FIRE.x + (Math.random() - 0.5) * 1,
          y: FIRE.y - 1,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          age: 0,
          life: 0.8 + Math.random() * 1.2,
        });
      }
      return;
    }

    // The kolam: touching between two dots moves the line there.
    if (p > 0.235 && p < 0.35) {
      if (
        kind === "move" &&
        (!this.pressed || f.seconds - this.lastTouch < 0.18)
      )
        return;
      const sq = this.squash(p);
      const lx = (world.x - KOLAM.x) / KOLAM.spacing;
      const ly = (world.y - KOLAM.y) / (KOLAM.spacing * sq);
      if (Math.abs(lx) + Math.abs(ly) > KOLAM.size + 0.6) return;
      const moved = twist(this.kolam, KOLAM.size, lx, ly);
      if (!moved) return;
      this.lastTouch = f.seconds;
      this.kolamVersion++;
      for (const m of moved)
        this.twists.push({
          x: KOLAM.x + m.x * KOLAM.spacing,
          y: KOLAM.y + m.y * KOLAM.spacing * sq,
          born: f.seconds,
        });
      this.emit("kolam");
      return;
    }

    // Thai Pongal: hold the fire under the pot.
    if (p > 0.34 && p < 0.48) {
      if (kind !== "down") return;
      const near =
        Math.abs(world.x - HEARTH.x) < 1.4 &&
        world.y > HEARTH.y - 2.2 &&
        world.y < HEARTH.y + 0.8;
      if (near) this.holding = true;
      return;
    }

    // Mattu Pongal: the cattle toss their heads and ring their bells.
    if (p > 0.6 && p < 0.76 && kind === "down") {
      for (let i = HERD.length - 1; i >= 0; i--) {
        const c = HERD[i];
        const x0 = c.x - (c.facing > 0 ? 0.95 : 1.45) * c.size;
        const x1 = c.x + (c.facing > 0 ? 1.45 : 0.95) * c.size;
        if (
          world.x > x0 &&
          world.x < x1 &&
          world.y > c.y - 1.9 * c.size &&
          world.y < c.y + 0.1
        ) {
          this.shake[i] = 1;
          this.emit(`bell${i}`);
          return;
        }
      }
      return;
    }

    // Kaanum Pongal: the crows go up.
    if (
      p > 0.74 &&
      p < 0.9 &&
      kind === "down" &&
      Math.hypot(world.x - KANU.x - 0.2, world.y - KANU.y) < 1.2
    ) {
      this.crowsUp = f.seconds;
      this.emit("caw");
    }
  }
}

export function createScene(emit: Emit): Scene {
  return new Pongal(emit);
}
