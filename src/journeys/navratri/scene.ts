// Navratri, as one continuous shot through a pol in Gujarat: the mandvi in the chowk at dawn as
// the kalash and the jawara are set up for Ghatasthapana; the garbo carried in at dusk; the nine
// lanterns of the Navadurga lit one a night; the garba, ring inside ring round the garbo, seen at
// last from overhead; the dandiya raas; then out along the street to the maidan, where Ravana
// burns on Dussehra; and home to the mandvi, where the akhand jyot still burns.
//
// The camera tilts (./world.ts): ground points (X, Z) and heights H project to (X, Z·s − H·c).
import { windowOpacity } from "@/lib/math";
import {
  TAU,
  apply,
  clamp,
  glow,
  glowSprite,
  lerp,
  mix,
  mulberry32,
  rgb,
  rise,
  toScreen,
  toWorld,
  view,
  type Ctx,
  type RGB,
  type View,
} from "../paint";
import { crossed } from "../rhythm";
import type { Emit, Frame, Scene } from "../types";
import { heardPulse, heat } from "./clock";
import { navratri } from "./content";
import { FIREWORK_COLOURS, Particles } from "./fire";
import { drawChabutro, drawGround, drawHouse, makeHouses, paintChowk, paintMaidan, type Ground, type House } from "./houses";
import { FORMS, drawLantern, drawRope, lanternAt } from "./lanterns";
import {
  KUMBHA_PALETTE,
  MEGHNAD_PALETTE,
  RAVANA_PALETTE,
  drawCrowd,
  drawEffigy,
  paintCrowd,
  paintEffigy,
  paintShami,
  paintStall,
  type Crowd,
  type Effigy,
} from "./maidan";
import { drawGarbo, drawMandvi, mandviBulbs, paintPachedi } from "./mandvi";
import { SKIN, dandiyaPose, drawDancer, drawSeated, garbaPose, glints, makeLook, type Hands, type Look, type Pose } from "./people";
import {
  STICKS,
  bulbStrings,
  drawArrow,
  drawBow,
  drawDhol,
  drawGhanti,
  drawHarmonium,
  drawPattal,
  drawStage,
  drawStrings,
  drawThali,
} from "./props";
import { Sky, darkness, paintSkyline, skyLow, skyTop } from "./sky";
import { MOMENTS, PLACES, PORTRAIT_SHOTS, SHOTS, camera, dancing, night, pairing, pulse, type Tilt } from "./world";

const SKYLINE_Z = -12;
const GARBO_LIGHT = "255, 170, 80";
const WINDOW_LIGHT = "255, 180, 100";
const FIRE_LIGHT = "255, 130, 50";
/** How far a garba dancer goes round in one pulse, in world units. */
const TRAVEL = 0.075;
const MAX_JOINED = 28;

type Dancer = {
  look: Look;
  ring: number;
  a0: number;
  seed: number;
  enter: number;
  /** For the reader's dancers: when they came in, in scene seconds. */
  born?: number;
  sticks: RGB;
  /** The dandiya set, and whether in its outer ring; slot is its place in the ring. */
  set: number;
  outer: boolean;
  slot: number;
  struck: number;
};

type Sitter = {
  look: Look;
  x: number;
  z: number;
  lift: number;
  facing: 1 | -1;
  from: number;
  to: number;
  pose: "fold" | "lap" | "eat" | "talk";
};
type Walker = { look: Look; k: number };
type Light = { x: number; y: number; r: number; a: number; color: string };

type Art = {
  skyline: ReturnType<typeof paintSkyline>;
  houses: House[];
  chowk: Ground;
  maidan: Ground;
  pachedi: HTMLCanvasElement;
  ravana: Effigy;
  kumbha: Effigy;
  meghnad: Effigy;
  shami: ReturnType<typeof paintShami>;
  stall: ReturnType<typeof paintStall>;
  crowdChowk: Crowd;
  crowdNear: Crowd;
  crowdFar: Crowd;
};

/** The dandiya's two facing rings: inner radius, outer radius, pairs. */
const SETS = [{ r1: 3.0, r2: 3.8, count: 20 }];
const RING_COUNTS = [16, 16, 26, 26];
const RING_ENTER = [0.372, 0.43, 0.478, 0.515];

export class NavratriScene implements Scene {
  private readonly emit: Emit;
  private readonly sky = new Sky();
  private readonly fire = new Particles();
  private art: Art | null = null;
  private layer: HTMLCanvasElement | null = null;
  private v: View | null = null;
  private t: Tilt = { s: 0.3, c: 0.95 };
  private readonly dancers: Dancer[] = [];
  private readonly joined: Dancer[] = [];
  private readonly walkers: Walker[] = [];
  private readonly sitters: Sitter[] = [];
  private readonly looks: Record<"aarti" | "dholi" | "vaja" | "singer" | "ram" | "lakshman" | "server" | "puja1" | "puja2" | "ba", Look>;
  private phase = 0;
  private readonly lampGlow = new Array(9).fill(0);
  private readonly lampOn = new Array(9).fill(false);
  private touched = 0;
  private offsets: number[] | null = null;
  private loosed: number | null = null;
  private hitAt: number | null = null;
  private previous = 0;
  private lights: Light[] = [];
  private sticks: { x: number; y: number; d: Dancer }[] = [];
  private lastCrack = 0;
  private lastBurst = 0;
  private font = "";
  private seconds = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    this.fire.onBurst = () => {
      if (this.seconds - this.lastBurst < 0.12) return;
      this.lastBurst = this.seconds;
      this.emit("burst");
    };
    const random = mulberry32(9009);

    // The garba: four rings, the women first, then everyone.
    RING_COUNTS.forEach((_, ring) => {
      const count = RING_COUNTS[ring];
      for (let i = 0; i < count; i++) {
        const woman = ring === 0 ? true : ring === 1 ? i % 3 !== 1 : random() < 0.55;
        const child = ring > 1 && random() < 0.12;
        const look = makeLook(random, woman, child ? 1.1 + random() * 0.15 : 1.5 + random() * 0.18);
        this.dancers.push({
          look,
          ring,
          a0: (i / count) * TAU + ring * 0.41 + (random() - 0.5) * 0.08,
          seed: random() * 10,
          enter: RING_ENTER[ring] + (i / count) * 0.012,
          sticks: STICKS[Math.floor(random() * STICKS.length)],
          // The first two rings and a few from the third pair up for the dandiya; the rest watch.
          set: ring < 2 || (ring === 2 && i < 8) ? 0 : -1,
          outer: ring === 1 || (ring === 2 && i % 2 === 1),
          slot: i,
          struck: -9,
        });
      }
    });

    // The garbo procession: five women, lamps lit inside the pots on their heads.
    for (let k = 0; k < 5; k++) {
      const look = makeLook(random, true, 1.5 + random() * 0.1);
      look.head = k % 2 ? "odhni" : "bun";
      this.walkers.push({ look, k });
    }

    // The elders on the otla, and the little girls of the kanya pujan on Ashtami.
    const elder = (x: number, woman: boolean, from: number, pose: Sitter["pose"], facing: 1 | -1) => {
      const look = makeLook(random, woman, 1.5);
      look.old = true;
      look.skirt = woman ? mix(look.skirt, [240, 236, 226], 0.5) : [240, 236, 226];
      look.top = woman ? look.skirt : [236, 232, 220];
      if (!woman) look.head = random() < 0.5 ? "topi" : "safo";
      this.sitters.push({
        look,
        x,
        z: PLACES.backRow + 0.08,
        lift: 0.5,
        facing,
        from,
        to: 0.76,
        pose,
      });
    };
    elder(-11.4, false, 0, "talk", 1);
    elder(-10.7, false, 0, "lap", -1);
    elder(-4.8, true, 0.22, "fold", 1);
    elder(-4.1, true, 0.22, "talk", -1);
    elder(-1.6, false, 0.3, "lap", 1);
    elder(7.4, true, 0.3, "fold", -1);
    elder(8.1, true, 0.3, "talk", -1);
    elder(10.8, false, 0.22, "lap", -1);
    for (let i = 0; i < 7; i++) {
      const look = makeLook(random, true, 0.95 + random() * 0.12);
      look.head = "odhni";
      look.odhni = [200, 24, 36];
      this.sitters.push({
        look,
        x: 1.7 + i * 0.52,
        z: PLACES.backRow + 0.1,
        lift: 0.5,
        facing: 1,
        from: 0.41,
        to: 0.5,
        pose: "eat",
      });
    }

    const person = (woman: boolean, h: number, edit: (look: Look) => void) => {
      const look = makeLook(random, woman, h);
      edit(look);
      return look;
    };
    this.looks = {
      aarti: person(true, 1.52, (l) => {
        l.head = "odhni";
        l.skirt = [178, 22, 42];
        l.skirt2 = [214, 150, 18];
        l.odhni = [236, 138, 40];
        l.top = [124, 16, 48];
      }),
      dholi: person(false, 1.62, (l) => {
        l.head = "safo";
        l.top = [240, 234, 220];
        l.skirt = [240, 234, 220];
        l.skirt2 = [226, 220, 204];
        l.odhni = [214, 30, 40];
      }),
      vaja: person(false, 1.6, (l) => {
        l.head = "topi";
        l.top = [236, 226, 200];
        l.skirt = [236, 226, 200];
        l.old = true;
      }),
      singer: person(true, 1.52, (l) => {
        l.skirt = [30, 128, 70];
        l.top = [30, 128, 70];
        l.border = [236, 190, 70];
      }),
      ram: person(false, 1.64, (l) => {
        l.head = "mukut";
        l.skin = [104, 124, 178];
        l.top = [244, 190, 40];
        l.skirt = [244, 190, 40];
        l.skirt2 = [230, 160, 30];
        l.legs = [244, 190, 40];
        l.border = [200, 40, 40];
      }),
      lakshman: person(false, 1.58, (l) => {
        l.head = "mukut";
        l.skin = SKIN[0];
        l.top = [236, 120, 30];
        l.skirt = [236, 120, 30];
        l.skirt2 = [214, 90, 20];
        l.legs = [236, 120, 30];
        l.border = [240, 200, 60];
      }),
      server: person(true, 1.5, (l) => {
        l.head = "odhni";
        l.skirt = [40, 46, 130];
        l.odhni = [236, 190, 70];
      }),
      puja1: person(true, 1.5, (l) => {
        l.head = "odhni";
        l.skirt = [196, 30, 110];
      }),
      puja2: person(true, 1.46, (l) => {
        l.head = "odhni";
        l.skirt = [226, 92, 20];
      }),
      ba: person(true, 1.46, (l) => {
        l.old = true;
        l.skirt = [122, 28, 42];
        l.top = [122, 28, 42];
        l.border = [226, 176, 70];
      }),
    };
  }

  // ─── Each frame ────────────────────────────────────────────────────────────

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p } = f;
    this.seconds = f.seconds;
    const cam = camera(f.portrait ? PORTRAIT_SHOTS : SHOTS, p);
    const unit = height / 8;
    // On wide screens, keep what matters clear of the caption.
    if (!f.portrait) {
      const side = navratri.chapters.reduce((sum, c) => sum + windowOpacity(p, c.window) * (c.side === "right" ? 1 : -1), 0);
      cam.x += (side * width * 0.14) / (unit * cam.zoom);
    }
    const t: Tilt = { s: Math.sin(cam.pitch), c: Math.cos(cam.pitch) };
    const v = view(width, height, { x: cam.x, y: cam.z * t.s - cam.h * t.c, zoom: cam.zoom }, unit, f.portrait ? 0.4 : 0.5);
    this.v = v;
    this.t = t;
    this.ensure();
    const art = this.art!;
    this.step(f);

    const dark = darkness(p);
    const horizon = toScreen(v, 0, SKYLINE_Z * t.s).y;
    this.sky.draw(ctx, width, height, p, horizon, f.seconds, cam.x * v.scale * 0.25);

    // The world in daylight colours on its own layer, then graded for the hour.
    const layer = this.layer!;
    if (layer.width !== ctx.canvas.width || layer.height !== ctx.canvas.height) {
      layer.width = ctx.canvas.width;
      layer.height = ctx.canvas.height;
    }
    const ratio = ctx.getTransform().a || 1;
    const g = layer.getContext("2d")!;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, width, height);
    this.skyline(g, v, t, cam.x, p, dark, horizon);
    g.save();
    apply(g, v);
    this.lights = [];
    this.sticks = [];
    glints.length = 0;
    this.world(g, f, t, art, dark);
    this.fire.drawSmoke(g, t);
    g.restore();
    this.grade(g, width, height, p, dark, t.s);
    ctx.drawImage(layer, 0, 0, width, height);

    // Light on top: first the lamps bringing up the colours they fall on, then what glows.
    ctx.save();
    apply(ctx, v);
    this.relight(ctx, f, t, dark);
    ctx.globalCompositeOperation = "lighter";
    this.skylineLights(ctx, t, cam.x, dark, f.seconds);
    this.light(ctx, f, t, art, dark);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
    this.sunlight(ctx, width, height, p);
    this.labels(ctx, f, v, t);
    this.frame(ctx, f, dark);
    this.previous = p;
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind !== "down") return;
    const v = this.v;
    if (!v) return;
    const p = f.p;
    const t = this.t;
    const w = toWorld(v, x, y);

    // The nine nights: light the next lantern.
    if (p > MOMENTS.lamps[0] - 0.012 && p < MOMENTS.lamps[1] + 0.03) {
      const lit = this.lampOn.filter(Boolean).length;
      if (lit < 9) this.touched = lit + 1;
      return;
    }

    // Garba: a new dancer joins the outer ring where the reader taps.
    if (p > 0.48 && p < 0.605) {
      if (this.joined.length >= MAX_JOINED) this.joined.shift();
      const Z = t.s > 0.05 ? w.y / t.s : 3;
      const angle = Math.atan2(Z, w.x);
      const r = PLACES.rings[3];
      const random = Math.random;
      const woman = random() < 0.6;
      this.joined.push({
        look: makeLook(random, woman, 1.45 + random() * 0.2),
        ring: 3,
        a0: angle - this.rotation(r),
        seed: random() * 10,
        enter: 0,
        born: f.reduced ? -99 : f.seconds,
        sticks: STICKS[Math.floor(random() * STICKS.length)],
        set: -1,
        outer: false,
        slot: 0,
        struck: -9,
      });
      this.emit("join");
      return;
    }

    // Dandiya: strike the sticks of the pair nearest the tap.
    if (p > 0.615 && p < 0.73) {
      let best: (typeof this.sticks)[number] | null = null;
      let bestD = 1.6;
      for (const s of this.sticks) {
        const d = Math.hypot(s.x - w.x, s.y - w.y);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      const at = best ?? { x: w.x, y: w.y };
      if (best) best.d.struck = f.seconds;
      if (!f.reduced)
        this.fire.burst(at.x, 0, -at.y / Math.max(t.c, 0.1), best ? `${best.d.sticks.join(", ")}` : "255, 220, 150", 26, 2.4, 0.55);
      this.emit("strike");
      return;
    }

    // Dussehra: loose the arrow.
    if (p > 0.772 && p < MOMENTS.arrow && this.loosed === null) {
      this.loosed = f.reduced ? f.seconds - 10 : f.seconds;
      this.emit("loose");
    }
  }

  // ─── Setting up ────────────────────────────────────────────────────────────

  private ensure() {
    if (this.art) return;
    this.layer = document.createElement("canvas");
    this.font = getComputedStyle(document.documentElement).getPropertyValue("--font-gujarati").trim() || "serif";
    this.art = {
      skyline: paintSkyline(-40, 100, 20),
      houses: makeHouses(-26, 25),
      chowk: paintChowk(),
      maidan: paintMaidan(),
      pachedi: paintPachedi(300, 400),
      ravana: paintEffigy(10, PLACES.ravana.h, RAVANA_PALETTE, 21),
      kumbha: paintEffigy(1, PLACES.kumbha.h, KUMBHA_PALETTE, 22),
      meghnad: paintEffigy(1, PLACES.meghnad.h, MEGHNAD_PALETTE, 23),
      shami: paintShami(),
      stall: paintStall(),
      crowdChowk: paintCrowd(-16, 16, 71),
      crowdNear: paintCrowd(15, 64, 72),
      crowdFar: paintCrowd(17, 62, 73),
    };
  }

  // ─── Time ──────────────────────────────────────────────────────────────────

  private step(f: Frame) {
    const { p, dt } = f;
    // The garba's pulse, following the dhol when it can be heard.
    this.phase += dt / pulse(p);
    const heard = f.reduced ? null : heardPulse();
    if (heard !== null) {
      const diff = heard - this.phase;
      if (Math.abs(diff) > 6) this.phase = heard;
      else this.phase += diff * Math.min(1, dt * 5);
    }

    // The lanterns of the nine nights, one a night or one a touch.
    if (p < MOMENTS.lamps[0] - 0.03) this.touched = 0;
    const [l0, l1] = MOMENTS.lamps;
    const auto = p < l0 ? 0 : Math.min(9, 1 + Math.floor(((p - l0) / (l1 - l0)) * 8 + 1e-6));
    const count = Math.max(auto, this.touched);
    for (let i = 0; i < 9; i++) {
      const on = i < count;
      if (on && !this.lampOn[i]) this.emit(`lamp:${i}`);
      this.lampOn[i] = on;
      const target = on ? 1 : 0;
      this.lampGlow[i] = f.reduced ? target : this.lampGlow[i] + (target - this.lampGlow[i]) * Math.min(1, dt * 3);
    }

    // The dandiya pairs take their places as the circle breaks up.
    if (pairing(p) <= 0) this.offsets = null;
    else if (!this.offsets) this.assignPairs();

    // Ram's arrow, loosed by the scroll or by the reader.
    if (p < 0.77) {
      this.loosed = null;
      this.hitAt = null;
    }
    if (this.loosed === null && crossed(this.previous, p, MOMENTS.arrow - 0.003)) this.emit("loose");
    if (this.hitAt === null) {
      const landed = this.loosed !== null ? f.seconds - this.loosed >= 0.9 : p >= MOMENTS.arrow + 0.004;
      if (landed) {
        this.hitAt = f.seconds;
        if (p < MOMENTS.burn[1]) this.emit("hit");
      }
    }
    this.fire.update(dt);
    const burns = this.burns(p);
    this.spawnFire(f, burns);
    const hot = (b: number) => (b > 0 && b < 1 ? 0.45 + 0.55 * Math.sin(b * Math.PI) : b >= 1 ? 0.25 : 0);
    heat.level = Math.max(hot(burns.ravana), hot(burns.side) * 0.7) * (1 - rise(p, 0.868, 0.92));
  }

  /** How far each effigy has burnt, 0..1. */
  private burns(p: number) {
    if (this.hitAt === null) return { ravana: 0, side: 0 };
    const timed = this.loosed !== null ? (this.seconds - this.hitAt) / 11 : 0;
    const ravana = Math.max(rise(p, MOMENTS.burn[0], MOMENTS.burn[1]), clamp(timed));
    const side = Math.max(rise(p, MOMENTS.burn[0] + 0.004, MOMENTS.burn[1] - 0.004), clamp(timed * 1.1 - 0.04));
    return { ravana, side };
  }

  private spawnFire(f: Frame, burns: { ravana: number; side: number }) {
    const dt = f.dt;
    if (dt <= 0 || f.p < 0.76 || f.p > 0.93) return;
    const art = this.art!;
    const R = PLACES.ravana;
    const K = PLACES.kumbha;
    const M = PLACES.meghnad;
    const burning: [Effigy, number, number, number][] = [
      [art.ravana, R.x, R.z, burns.ravana],
      [art.kumbha, K.x, K.z, burns.side],
      [art.meghnad, M.x, M.z, burns.side],
    ];
    for (const [e, x, z, b] of burning) {
      if (b <= 0) continue;
      const alive = b < 1;
      const line = Math.min(1, b * 1.35) * e.h;
      const rate = alive ? (8 + 38 * Math.min(1, b * 1.35)) * (e.h / 11) : 8 * (1 - rise(f.p, 0.86, 0.92));
      for (let i = 0; i < rate * dt + Math.random() - 0.5; i++) {
        const h = alive ? Math.random() * line * 0.95 : Math.random() * 0.8;
        const spread = h > e.h * 0.62 ? 0.5 : h > e.h * 0.27 ? 0.34 : 0.2;
        this.fire.flame(x + (Math.random() - 0.5) * e.w * spread, z + 0.2, h, 0.5 + Math.random() * (alive ? 1.0 : 0.4));
      }
      if (Math.random() < 3 * dt) this.fire.smoke(x + (Math.random() - 0.5) * 2, z, line + 0.5);
      if (alive && Math.random() < 14 * dt * (e.h / 11)) {
        this.fire.flash(x + (Math.random() - 0.5) * e.w * 0.4, z + 0.3, Math.random() * line);
        if (f.seconds - this.lastCrack > 0.07) {
          this.lastCrack = f.seconds;
          this.emit("crack");
        }
      }
      if (alive && b > 0.15 && b < 0.9 && Math.random() < 1.3 * dt * (e.h / 11)) {
        this.fire.rocket(
          x + (Math.random() - 0.5) * 3,
          z - 1.5,
          0.5,
          FIREWORK_COLOURS[Math.floor(Math.random() * FIREWORK_COLOURS.length)],
        );
        this.emit("rocket");
      }
    }
    // More rockets from the crowd once Ravana is down.
    if (f.p > 0.845 && f.p < 0.9 && Math.random() < 1.2 * dt) {
      this.fire.rocket(28 + Math.random() * 24, -6, 0.2, FIREWORK_COLOURS[Math.floor(Math.random() * FIREWORK_COLOURS.length)]);
      this.emit("rocket");
    }
  }

  /** How far a ring of radius r has gone round. */
  private rotation(r: number) {
    return (this.phase * TRAVEL) / r;
  }

  private assignPairs() {
    // Each set's rings take their slots in the order the dancers stand, so nobody crosses over.
    this.offsets = SETS.map((_, s) => {
      const inner = this.dancers.filter((d) => d.set === s && !d.outer);
      const outer = this.dancers.filter((d) => d.set === s && d.outer);
      let offset = 0;
      for (const [list, half] of [
        [inner, 0],
        [outer, 0.5],
      ] as const) {
        const angles = list.map((d) => ({
          d,
          a: (((d.a0 + this.rotation(PLACES.rings[d.ring])) % TAU) + TAU) % TAU,
        }));
        angles.sort((a, b) => a.a - b.a);
        angles.forEach(({ d }, i) => (d.slot = i));
        if (half === 0 && angles.length) offset = angles[0].a;
      }
      return offset;
    });
  }

  // ─── The sky and the far town ──────────────────────────────────────────────

  /** The far town, painted first into the world's layer and hazed by the distance. */
  private skyline(g: Ctx, v: View, t: Tilt, camX: number, p: number, dark: number, horizon: number) {
    const s = this.art!.skyline;
    if (horizon < -50) return;
    const base = SKYLINE_Z * t.s;
    g.save();
    apply(g, v);
    g.drawImage(s.canvas, s.from + camX * 0.55, base - s.tall * t.c, s.width, s.tall * t.c);
    g.restore();
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = rgb(mix(skyLow(p), skyTop(p), 0.35), 0.5 * (1 - dark) + 0.22 * dark);
    g.fillRect(0, 0, v.width, v.height);
    g.restore();
  }

  private skylineLights(ctx: Ctx, t: Tilt, camX: number, dark: number, seconds: number) {
    if (dark < 0.3) return;
    const s = this.art!.skyline;
    const base = SKYLINE_Z * t.s;
    const sprite = glowSprite(WINDOW_LIGHT);
    s.lights.forEach((l, i) => {
      const a = (dark - 0.3) * (0.5 + 0.5 * Math.sin(seconds * 0.3 + i)) * 0.5;
      glow(ctx, sprite, l.x + camX * 0.55, base + l.y * t.c, 0.35, a);
    });
  }

  // ─── The world ─────────────────────────────────────────────────────────────

  private world(g: Ctx, f: Frame, t: Tilt, art: Art, dark: number) {
    const v = this.v!;
    const p = f.p;
    const x0 = v.x - v.ax / v.scale - 3;
    const x1 = v.x + (v.width - v.ax) / v.scale + 3;
    const seen = (a: number, b: number) => b > x0 && a < x1;

    // The ground: dust to the far town, the chowk's paving, the maidan.
    // Dust only where the chowk's paving doesn't cover it.
    const c = art.chowk;
    g.fillStyle = "#9c8a6c";
    g.fillRect(x0, SKYLINE_Z * t.s, x1 - x0, (c.z - SKYLINE_Z) * t.s + 0.02);
    g.fillRect(x0, (c.z + c.d) * t.s - 0.02, x1 - x0, (60 + SKYLINE_Z - c.z - c.d) * t.s);
    if (x0 < c.x) g.fillRect(x0, c.z * t.s, c.x - x0 + 0.02, c.d * t.s);
    if (x1 > c.x + c.w) g.fillRect(c.x + c.w - 0.02, c.z * t.s, x1 - c.x - c.w, c.d * t.s);
    if (seen(art.chowk.x, art.chowk.x + art.chowk.w)) drawGround(g, t, art.chowk);
    if (seen(art.maidan.x, art.maidan.x + art.maidan.w)) drawGround(g, t, art.maidan);

    const items: { z: number; draw: () => void }[] = [];
    const add = (z: number, x: number, w: number, draw: () => void) => {
      if (seen(x - w, x + w)) items.push({ z, draw });
    };

    // The pol: houses at the back, the chabutro, the elders on the otla.
    add(PLACES.backRow, 0, 30, () => {
      for (const h of art.houses) if (seen(h.x, h.x + h.w)) drawHouse(g, t, h, PLACES.backRow);
    });
    add(PLACES.chabutro.z, PLACES.chabutro.x, 1.5, () => drawChabutro(g, PLACES.chabutro.x, PLACES.chabutro.z, t, f.seconds, 1 - dark));
    for (const s of this.sitters) {
      const a = rise(p, s.from - 0.01, s.from) * (1 - rise(p, s.to, s.to + 0.01));
      if (a <= 0.01) continue;
      add(s.z, s.x, 1, () => this.sitter(g, t, s, a, f.seconds, dark));
    }

    // The garba mandal: the dholi, the harmonium, a singer.
    const band = rise(p, 0.3, 0.32) * (1 - rise(p, MOMENTS.hush, MOMENTS.hush + 0.01));
    if (band > 0.01) add(PLACES.band.z, PLACES.band.x, 2.5, () => this.band(g, t, band, f.seconds, dark));

    // The lanterns and the bulbs, high over the chowk: on top of everything from overhead.
    const high = lerp(-1.25, 100, rise(Math.asin(t.s), 0.5, 0.9));
    add(high, 0, 12, () => this.overhead(g, t, f.seconds, dark));

    // The mandvi.
    const growth = rise(p, 0.28, 0.77);
    add(0, 0, 1.2, () =>
      drawMandvi(g, t, {
        soil: rise(p, MOMENTS.soil - 0.006, MOMENTS.soil + 0.004),
        seeds: rise(p, MOMENTS.sow - 0.006, MOMENTS.sow + 0.008),
        kalash: rise(p, MOMENTS.kalash - 0.008, MOMENTS.kalash + 0.003),
        coconut: rise(p, MOMENTS.coconut - 0.008, MOMENTS.coconut + 0.003),
        jyot: rise(p, MOMENTS.jyot - 0.004, MOMENTS.jyot + 0.003) * (1 - 0.35 * rise(p, 0.95, 1)),
        growth,
        garbo: rise(p, MOMENTS.placed - 0.006, MOMENTS.placed + 0.003),
        night: night(p),
        seconds: f.seconds,
        pachedi: art.pachedi,
      }),
    );

    // Ghatasthapana: she sows the barley, sets the kalash, lights the jyot, and does the aarti.
    const morning = rise(p, 0.07, 0.085) * (1 - rise(p, 0.205, 0.215));
    if (morning > 0.01) add(0.9, -0.85, 1, () => this.aarti(g, t, p, morning, f.seconds));

    // The garbo procession at dusk.
    if (p > MOMENTS.procession[0] - 0.01 && p < 0.37)
      this.walkers.forEach((w) => add(1.45 + (w.k % 2) * 0.3, 0, 30, () => this.walker(g, t, w, p, f.seconds, dark)));

    // The garba and the dandiya.
    if (p > RING_ENTER[0] - 0.01 && p < 0.77) this.garba(g, t, f, add, dark);

    // And at the end, Ba sits before the garbo with her hands folded.
    const ba = rise(p, 0.93, 0.95);
    if (ba > 0.01) add(1.05, -0.95, 1, () => this.sit(g, t, this.looks.ba, -0.95, 1.05, 0, 1, "fold", ba, 0.8));

    // The crowd at the chowk's edge, seen from behind.
    const crowd = this.chowkCrowd(p, t);
    if (crowd > 0.01) {
      add(8, 0, 16, () => {
        g.globalAlpha = crowd;
        drawCrowd(g, t, art.crowdChowk, 8);
        crowdFloor(g, t, 8, -16, 16);
        g.globalAlpha = 1;
      });
    }

    // The maidan.
    if (p > 0.7 && p < 0.93) this.maidan(g, t, f, art, add, dark);

    items.sort((a, b) => a.z - b.z);
    for (const item of items) item.draw();
  }

  /** Someone seated, on the ground or up on an otla `lift` high. */
  private sit(
    g: Ctx,
    t: Tilt,
    look: Look,
    x: number,
    z: number,
    lift: number,
    facing: 1 | -1,
    pose: Sitter["pose"],
    alpha: number,
    light: number,
    seconds = 0,
  ) {
    const talk = Math.sin(seconds * 2 + x) * 0.03;
    const hands: Record<Sitter["pose"], [[number, number], [number, number]]> = {
      fold: [
        [0.1, 0.44],
        [0.11, 0.44],
      ],
      lap: [
        [0.12, 0.26],
        [0.16, 0.24],
      ],
      eat: [
        [0.14, 0.24],
        [0.18, 0.3 + Math.max(0, Math.sin(seconds * 1.6 + x * 3)) * 0.12],
      ],
      talk: [
        [0.12, 0.26],
        [0.2, 0.36 + talk],
      ],
    };
    const [l, r] = hands[pose];
    g.save();
    g.globalAlpha = alpha;
    g.translate(0, -lift * t.c);
    drawSeated(g, x, z, t, look, facing, l, r, light);
    g.restore();
  }

  private sitter(g: Ctx, t: Tilt, s: Sitter, alpha: number, seconds: number, dark: number) {
    this.sit(g, t, s.look, s.x, s.z, s.lift, s.facing, s.pose, alpha, dark * 0.4, seconds);
    if (s.pose === "eat") {
      const y = s.z * t.s - s.lift * t.c;
      g.globalAlpha = alpha;
      drawPattal(g, s.x + s.facing * 0.2, y - 0.02, 0.13, t.c);
      g.globalAlpha = 1;
    }
  }

  // ─── Ghatasthapana ─────────────────────────────────────────────────────────

  private aarti(g: Ctx, t: Tilt, p: number, alpha: number, seconds: number) {
    const X = -0.85;
    const Z = 0.9;
    // Where her hands go through the morning, in figure units.
    const sow = rise(p, 0.084, 0.09) * (1 - rise(p, 0.104, 0.108));
    const place = rise(p, 0.104, 0.108) * (1 - rise(p, 0.13, 0.134));
    const light = rise(p, 0.134, 0.138) * (1 - rise(p, 0.146, 0.15));
    const aarti = rise(p, MOMENTS.aarti[0] - 0.004, MOMENTS.aarti[0]);
    const turn = seconds * 1.6;
    const sprinkle = Math.sin(seconds * 7) * 0.025;
    let l: [number, number] = [0.08, 0.48];
    let r: [number, number] = [0.1, 0.46];
    const blend = (to: [number, number], k: number, from: [number, number]): [number, number] => [
      lerp(from[0], to[0], k),
      lerp(from[1], to[1], k),
    ];
    l = blend([0.14, 0.42], sow, l);
    r = blend([0.33, 0.3 + sprinkle], sow, r);
    l = blend([0.3, 0.34], place, l);
    r = blend([0.34, 0.36], place, r);
    l = blend([0.1, 0.62], light, l);
    r = blend([0.34, 0.34], light, r);
    // The aarti: the thali circling in her right hand, the ghanti ringing in her left.
    l = blend([0.12, 0.66], aarti, l);
    r = blend([0.3 + Math.cos(turn) * 0.08, 0.6 + Math.sin(turn) * 0.09], aarti, r);
    const pose: Pose = {
      facing: 1,
      spin: 0.03,
      turn: 0.4,
      bend: -0.02 + 0.08 * (sow + place),
      bob: 0,
      l,
      r,
      step: 0,
    };
    g.save();
    g.globalAlpha = alpha;
    const hands = drawDancer(g, X, Z, t, this.looks.aarti, pose, 0.3, seconds);
    if (sow > 0.3) {
      // A small bowl of barley in her other hand.
      g.fillStyle = "#b07a3a";
      g.beginPath();
      g.ellipse(hands.l.x, hands.l.y + 0.02, 0.06, 0.025, 0, 0, Math.PI);
      g.fill();
    }
    if (aarti > 0.05) {
      drawThali(g, hands.r.x, hands.r.y - 0.01, 0.1, t.c, seconds, aarti);
      drawGhanti(g, hands.l.x, hands.l.y - 0.02, 0.07, Math.sin(seconds * 18) * 0.35);
      this.lights.push({
        x: hands.r.x,
        y: hands.r.y - 0.06,
        r: 0.5,
        a: 0.5 * aarti,
        color: GARBO_LIGHT,
      });
    }
    g.restore();
  }

  // ─── The garbo procession ──────────────────────────────────────────────────

  private walker(g: Ctx, t: Tilt, w: Walker, p: number, seconds: number, dark: number) {
    const [a, b] = MOMENTS.procession;
    const k = clamp((p - a) / (b - 0.006 - a));
    const ease = 1 - Math.pow(1 - k, 1.6);
    const lead = lerp(14, 0.62, ease);
    const X = lead + w.k * 1.15;
    const Z = 1.45 + (w.k % 2) * 0.3;
    const alpha = rise(p, a - 0.01, a) * (1 - rise(p, 0.335, 0.36));
    if (alpha <= 0.01) return;
    const moving = k < 1;
    const stride = moving ? Math.sin(X * 3.4) : 0;
    const placed = w.k === 0 ? rise(p, MOMENTS.placed - 0.008, MOMENTS.placed) : 0;
    // One hand steadies the garbo on her head; the lead woman lifts hers down into the mandvi.
    const r: [number, number] = placed > 0 ? [lerp(0.06, 0.3, placed), lerp(1.08, 0.72, placed)] : [0.06, 1.08];
    const l: [number, number] = [-0.16 + stride * 0.05, 0.5];
    const pose: Pose = {
      facing: -1,
      spin: 0.12 + 0.06 * Math.abs(stride),
      turn: X * 0.6,
      bend: 0.03,
      bob: -Math.abs(stride) * 0.012,
      l,
      r,
      step: stride,
    };
    const light = 0.5 * dark;
    g.save();
    g.globalAlpha = alpha;
    const hands: Hands = drawDancer(g, X, Z, t, w.look, pose, light, seconds);
    const lit = rise(p, 0.2, 0.23);
    if (placed < 0.98) {
      const gx = lerp(hands.top.x, hands.r.x - 0.1, placed);
      const gy = lerp(hands.top.y + 0.03, hands.r.y + 0.14, placed);
      drawGarbo(g, gx, gy, 0.36, t.c, lit, seconds, 3 + w.k);
      this.lights.push({
        x: gx,
        y: gy - 0.17 * t.c,
        r: 1.3,
        a: 0.45 * lit * alpha,
        color: GARBO_LIGHT,
      });
    }
    g.restore();
  }

  // ─── The nine nights, overhead ─────────────────────────────────────────────

  private overhead(g: Ctx, t: Tilt, seconds: number, dark: number) {
    const strings = this.strings(t);
    drawStrings(g, strings.lines, strings.bulbs, dark, seconds);
    drawRope(g, t);
    for (let i = 0; i < 9; i++) drawLantern(g, t, i, this.lampGlow[i], Math.sin(seconds * 0.8 + i * 1.3) * 0.04, seconds);
  }

  private strings(t: Tilt) {
    return bulbStrings(t, PLACES.mandvi.top + 0.6, [
      [-13, PLACES.backRow, 5.4],
      [-6.5, PLACES.backRow, 5.8],
      [6.5, PLACES.backRow, 5.8],
      [13, PLACES.backRow, 5.4],
    ]);
  }

  // ─── The garba mandal ──────────────────────────────────────────────────────

  private band(g: Ctx, t: Tilt, alpha: number, seconds: number, dark: number) {
    const { x, z } = PLACES.band;
    const hit = Math.max(0, Math.sin(this.phase * Math.PI));
    const other = Math.max(0, Math.sin(this.phase * Math.PI + Math.PI / 2));
    g.save();
    g.globalAlpha = alpha;
    // The harmonium player and the singer, seated.
    this.sit(g, t, this.looks.singer, x - 1.6, z + 0.25, 0, 1, "talk", alpha, 0.3 * dark, seconds);
    const vx = x - 0.9;
    const vz = z - 0.35;
    const vy = vz * t.s;
    drawHarmonium(g, vx + 0.3, vy + 0.02, 0.42, t.c, 1, 0.5 + 0.5 * Math.sin(seconds * 2.2));
    drawSeated(
      g,
      vx,
      vz,
      t,
      this.looks.vaja,
      1,
      [0.12 + 0.02 * Math.sin(seconds * 2.2), 0.3],
      [0.22 + 0.02 * Math.sin(seconds * 9), 0.3],
      0.3 * dark,
    );
    // The dholi, the dhol slung across him, his stick and his hand on the two heads.
    const h = this.looks.dholi.h;
    const pose: Pose = {
      facing: 1,
      spin: 0.1,
      turn: 0,
      bend: 0.04,
      bob: -hit * 0.01,
      l: [-0.22 - 0.04 * other, 0.56 + 0.06 * other],
      r: [0.24 + 0.03 * hit, 0.62 + 0.08 * (1 - hit)],
      step: 0,
    };
    drawDancer(g, x, z, t, this.looks.dholi, pose, 0.4 * dark, seconds);
    drawDhol(g, x, z * t.s - 0.58 * h * t.c, 0.5 * h * 0.62, t.c);
    g.restore();
  }

  // ─── Garba and dandiya ─────────────────────────────────────────────────────

  private garba(g: Ctx, t: Tilt, f: Frame, add: (z: number, x: number, w: number, draw: () => void) => void, dark: number) {
    const p = f.p;
    const dance = dancing(p);
    const pair = pairing(p);
    const energy = rise(p, 0.4, 0.7);
    const leave = 1 - rise(p, 0.735, 0.76);
    const all = this.dancers.concat(this.joined);
    const stand: Pose = {
      facing: 1,
      spin: 0.1,
      turn: 0,
      bend: 0,
      bob: 0,
      l: [-0.14, 0.46],
      r: [0.14, 0.46],
      step: 0,
    };
    for (const d of all) {
      const enter = d.born !== undefined ? clamp((f.seconds - d.born) / 0.7) : rise(p, d.enter, d.enter + 0.018);
      const alpha = enter * leave * (d.set >= 0 ? 1 : 1 - pair);
      if (alpha <= 0.01) continue;
      const r0 = PLACES.rings[d.ring];
      const angle = d.a0 + this.rotation(r0) * dance;
      const rg = r0 + (1 - enter) * 2.2;
      let X = Math.cos(angle) * rg;
      let Z = Math.sin(angle) * rg;
      let facing: 1 | -1 = -Math.sin(angle) >= 0 ? 1 : -1;
      if (pair > 0 && this.offsets && d.set >= 0) {
        const set = SETS[d.set];
        const step = TAU / set.count;
        const cycle = this.phase / 6;
        const shift = Math.floor(cycle) + rise(cycle - Math.floor(cycle), 0.72, 1);
        const a = this.offsets[d.set] + (d.slot + (d.outer ? 0.5 - shift : 0)) * step;
        const r = d.outer ? set.r2 : set.r1;
        X = lerp(X, Math.cos(a) * r, pair);
        Z = lerp(Z, Math.sin(a) * r, pair);
        const partnerDx = d.outer ? -Math.cos(a) : Math.cos(a);
        const tangent = -Math.sin(a) * (d.outer ? -1 : 1);
        facing = partnerDx + tangent * 0.4 >= 0 ? 1 : -1;
      }
      const light = dark * clamp(1.1 - Math.hypot(X, Z) / 7);
      const seed = d.seed;
      add(Z, X, 1, () => {
        let pose: Pose;
        if (pair > 0.5 && d.set >= 0) pose = dandiyaPose(this.phase + seed * 0.02, facing, energy, seed, d.sticks);
        else {
          const gp = garbaPose(this.phase + seed * 0.03, facing, energy * dance, seed, d.look.woman);
          pose = dance < 1 ? blendPose(stand, gp, dance, facing) : gp;
        }
        g.globalAlpha = alpha;
        const hands = drawDancer(g, X, Z, t, d.look, pose, light, f.seconds);
        g.globalAlpha = 1;
        if (pose.sticks) {
          const mid = {
            x: (hands.l.x + hands.r.x) / 2,
            y: Math.min(hands.l.y, hands.r.y) - d.look.h * 0.12 * t.c,
            d,
          };
          this.sticks.push(mid);
          const flash = 1 - clamp((f.seconds - d.struck) / 0.35);
          if (flash > 0)
            this.lights.push({
              x: mid.x,
              y: mid.y,
              r: 0.6,
              a: 0.8 * flash,
              color: d.sticks.join(", "),
            });
        }
      });
    }
  }

  // ─── Dussehra ──────────────────────────────────────────────────────────────

  private maidan(g: Ctx, t: Tilt, f: Frame, art: Art, add: (z: number, x: number, w: number, draw: () => void) => void, dark: number) {
    const p = f.p;
    const burns = this.burns(p);
    const R = PLACES.ravana;
    const K = PLACES.kumbha;
    const M = PLACES.meghnad;
    const S = PLACES.shami;

    // The shami, and two women doing its puja with a lamp at its foot.
    add(S.z, S.x, 3, () => {
      const sh = art.shami;
      g.drawImage(sh.canvas, S.x - sh.w / 2, S.z * t.s - sh.h * t.c, sh.w, sh.h * t.c);
    });
    const puja = rise(p, 0.73, 0.745) * (1 - rise(p, 0.86, 0.88));
    if (puja > 0.01) {
      add(S.z + 0.6, S.x, 2, () => {
        this.sit(g, t, this.looks.puja1, S.x - 0.75, S.z + 0.6, 0, 1, "fold", puja, 0.4 * dark);
        this.sit(g, t, this.looks.puja2, S.x + 0.75, S.z + 0.7, 0, -1, "fold", puja, 0.4 * dark);
        const ly = (S.z + 0.35) * t.s;
        g.fillStyle = "#a8561e";
        g.beginPath();
        g.ellipse(S.x, ly, 0.08, 0.03, 0, 0, TAU);
        g.fill();
        this.lights.push({
          x: S.x,
          y: ly - 0.06,
          r: 0.8,
          a: 0.6 * puja,
          color: GARBO_LIGHT,
        });
      });
    }

    // The three effigies.
    add(K.z, K.x, 3, () => drawEffigy(g, t, art.kumbha, K.x, K.z, burns.side, -1));
    add(M.z, M.x, 3, () => drawEffigy(g, t, art.meghnad, M.x, M.z, burns.side, 1));
    add(R.z, R.x, 4, () => drawEffigy(g, t, art.ravana, R.x, R.z, burns.ravana, -1));

    // The fafda-jalebi cart.
    const st = PLACES.stall;
    add(st.z, st.x, 2, () => {
      const s = art.stall;
      g.drawImage(s.canvas, st.x - s.w / 2, st.z * t.s - s.h * t.c, s.w, s.h * t.c);
      this.lights.push({
        x: st.x + s.lamp.x,
        y: st.z * t.s + s.lamp.y * t.c + 0.26 * t.c,
        r: 1.4,
        a: 0.7 * dark,
        color: WINDOW_LIGHT,
      });
    });

    // The Ramlila stage: Ram with his bow, Lakshman at his side.
    const stage = PLACES.stage;
    add(stage.z, stage.x, 2.5, () => {
      drawStage(g, t, stage.x, stage.z, stage.w, stage.d, stage.h);
      // Two petromax lamps on poles at the front of the stage.
      for (const side of [-1, 1]) {
        const lx = stage.x + side * (stage.w / 2 + 0.1);
        const base = (stage.z + stage.d / 2) * t.s;
        g.fillStyle = "#5a4028";
        g.fillRect(lx - 0.03, base - 2.9 * t.c, 0.06, 2.9 * t.c);
        g.fillStyle = "#d8d0c0";
        g.fillRect(lx - 0.09, base - 3.05 * t.c, 0.18, 0.2 * t.c);
        this.lights.push({ x: lx, y: base - 2.95 * t.c, r: 2.2, a: 0.55 * dark, color: "255, 236, 200" });
        this.lights.push({ x: lx, y: base - 2.95 * t.c, r: 0.35, a: 0.9 * dark, color: "255, 250, 235" });
      }
    });
    add(stage.z + 0.01, stage.x, 2.5, () => this.ram(g, t, f, dark, burns.ravana));

    // The town come out to watch.
    add(6.3, 40, 25, () => drawCrowd(g, t, art.crowdFar, 6.3));
    add(7.8, 40, 25, () => {
      drawCrowd(g, t, art.crowdNear, 7.8);
      crowdFloor(g, t, 7.8, 15, 64);
    });
  }

  private ram(g: Ctx, t: Tilt, f: Frame, dark: number, burn: number) {
    const p = f.p;
    const stage = PLACES.stage;
    const lift = stage.h * t.c;
    const X = PLACES.ram.x;
    const Z = PLACES.ram.z;
    const loosed = this.loosed !== null || p >= MOMENTS.arrow - 0.003;
    const draw = loosed ? 0 : rise(p, MOMENTS.bow - 0.006, MOMENTS.bow + 0.012);
    const light = 0.7 * dark + 0.3 * heat.level;
    g.save();
    g.translate(0, -lift);
    // Lakshman, his bow at rest.
    const lp: Pose = {
      facing: 1,
      spin: 0.1,
      turn: 0,
      bend: 0,
      bob: 0,
      l: [-0.12, 0.5],
      r: [0.14, 0.66],
      step: 0,
    };
    const lh = drawDancer(g, X - 1.05, Z - 0.1, t, this.looks.lakshman, lp, light, f.seconds);
    drawBow(g, lh.r, lh.r, this.looks.lakshman.h * 0.62, 0, false, 1);
    // Ram, drawing.
    const h = this.looks.ram.h;
    const pose: Pose = {
      facing: 1,
      spin: 0.1,
      turn: 0,
      bend: -0.04 * draw,
      bob: 0,
      l: [lerp(0.2, 0.02, draw), 0.8],
      r: [lerp(0.26, 0.4, draw), lerp(0.66, 0.8, draw)],
      step: 0,
    };
    const hands = drawDancer(g, X, Z, t, this.looks.ram, pose, light, f.seconds);
    drawBow(g, hands.r, hands.l, h * 0.72, draw, !loosed, 1);
    g.restore();

    // The arrow in flight, burning.
    const start = { x: X + 0.4, z: Z, h: stage.h + 0.8 * h };
    const end = {
      x: PLACES.ravana.x,
      z: PLACES.ravana.z,
      h: this.art!.ravana.chest,
    };
    const k = this.loosed !== null ? clamp((f.seconds - this.loosed) / 0.9) : clamp((p - (MOMENTS.arrow - 0.003)) / 0.007);
    if (loosed && k > 0 && k < 1 && burn <= 0) {
      const at = (q: number) => {
        const x = lerp(start.x, end.x, q);
        const z = lerp(start.z, end.z, q);
        const hh = lerp(start.h, end.h, q) + Math.sin(q * Math.PI) * 1.6;
        return { x, y: z * t.s - hh * t.c };
      };
      const tip = at(k);
      const tail = at(Math.max(0, k - 0.08));
      drawArrow(g, tail.x, tail.y, tip.x, tip.y, 0.05);
      this.lights.push(
        { x: tip.x, y: tip.y, r: 1.2, a: 1, color: FIRE_LIGHT },
        { x: tail.x, y: tail.y, r: 0.6, a: 0.6, color: "255, 220, 150" },
      );
    }
  }

  // ─── Light ─────────────────────────────────────────────────────────────────

  private light(ctx: Ctx, f: Frame, t: Tilt, art: Art, dark: number) {
    const p = f.p;
    const v = this.v!;
    const x0 = v.x - v.ax / v.scale - 3;
    const x1 = v.x + (v.width - v.ax) / v.scale + 3;
    const seconds = f.seconds;

    // Windows along the pol, lit at dusk.
    if (dark > 0.05) {
      // A lamp in the room behind each lit window, brightest in the middle.
      const lamp = glowSprite(WINDOW_LIGHT);
      const base = PLACES.backRow * t.s;
      let i = 0;
      ctx.globalAlpha = 0.75 * dark;
      for (const h of art.houses) {
        if (h.x > x1 || h.x + h.w < x0) continue;
        for (const w of h.windows) {
          i++;
          if (i % 3 === 1) continue;
          ctx.drawImage(lamp, h.x + w.x - w.w * 0.15, base + w.y * t.c - w.h * t.c * 0.1, w.w * 1.3, w.h * t.c * 1.3);
        }
      }
      ctx.globalAlpha = 1;
    }

    // The garbo's light pooling on the chowk, and the mandvi's bulbs.
    const garbo = rise(p, MOMENTS.placed - 0.006, MOMENTS.placed + 0.003);
    if (x0 < 12 && x1 > -12) {
      const deck = PLACES.mandvi.deck;
      const gy = -0.2 * t.s - (deck + 0.3) * t.c;
      if (garbo > 0.01) {
        glow(ctx, glowSprite(GARBO_LIGHT), 0, gy, 1.6, 0.8 * garbo);
        glow(ctx, glowSprite("255, 230, 180"), 0, gy, 0.5, 0.9 * garbo);
      }
      const jyot = rise(p, MOMENTS.jyot - 0.004, MOMENTS.jyot + 0.003);
      if (jyot > 0.01) {
        const jy = 0.44 * t.s - (deck + 0.14) * t.c;
        glow(ctx, glowSprite(GARBO_LIGHT), 0.36, jy, 0.35 + 0.4 * dark, jyot * (0.5 + 0.4 * dark));
      }
      if (dark > 0.3) {
        mandviBulbs(t).forEach((b, i) => {
          const on = 0.6 + 0.4 * Math.sin(seconds * 4 + i * 0.9);
          glow(ctx, glowSprite(i % 3 === 0 ? "255, 80, 60" : i % 3 === 1 ? "255, 210, 90" : "120, 230, 140"), b.x, b.y, 0.18, dark * on);
        });
        const strings = this.strings(t);
        strings.bulbs.forEach((b, i) =>
          glow(ctx, glowSprite(b.color), b.x, b.y + 0.03, 0.22, dark * (0.45 + 0.35 * Math.sin(seconds * 3 + i * 1.7))),
        );
      }
      // The lanterns.
      for (let i = 0; i < 9; i++) {
        const lit = this.lampGlow[i];
        if (lit < 0.01) continue;
        const at = lanternAt(t, i, Math.sin(seconds * 0.8 + i * 1.3) * 0.04);
        const colour = FORMS[i].paper;
        glow(ctx, glowSprite(tone(mix(colour, [255, 230, 180], 0.4))), at.x, at.y, 1.5, 0.55 * lit);
        glow(ctx, glowSprite("255, 236, 200"), at.x, at.y, 0.45, 0.6 * lit);
      }
    }

    // Everything else that gives light, collected as the world was painted.
    for (const l of this.lights) glow(ctx, glowSprite(l.color), l.x, l.y, l.r, l.a);

    // Ravana's fire lighting the maidan and the rims of the crowd.
    if (heat.level > 0.01 && x1 > 25) {
      const R = PLACES.ravana;
      const b = this.burns(p);
      const line = Math.min(1, b.ravana * 1.35) * R.h * 0.5;
      glow(ctx, glowSprite(FIRE_LIGHT, 256), R.x, R.z * t.s - line * t.c, 16 * heat.level, 0.55 * heat.level);
      ctx.globalAlpha = Math.min(1, heat.level * 1.2);
      drawCrowd(ctx, t, art.crowdFar, 6.3, true);
      drawCrowd(ctx, t, art.crowdNear, 7.8, true);
      ctx.globalAlpha = 1;
    }
    // The garba's light along the heads of the crowd at the chowk's edge.
    const crowd = this.chowkCrowd(p, t);
    if (crowd > 0.01) {
      ctx.globalAlpha = 0.45 * crowd * dark;
      drawCrowd(ctx, t, art.crowdChowk, 8, true);
      ctx.globalAlpha = 1;
    }
    this.fire.drawLight(ctx, t);
    this.glints(ctx, dark);
  }

  /**
   * At night in the chowk, lamplight multiplies into what it falls on rather than adding haze:
   * the garbo's pool, then the lanterns and the bulbs, each warming and saturating the paint.
   */
  private relight(ctx: Ctx, f: Frame, t: Tilt, dark: number) {
    const p = f.p;
    const v = this.v!;
    const amount = dark * rise(p, 0.3, 0.36) * (1 - rise(p, 0.73, 0.75));
    const x0 = v.x - v.ax / v.scale;
    const x1 = v.x + (v.width - v.ax) / v.scale;
    if (amount < 0.02 || x0 > 14 || x1 < -14) return;
    const garbo = rise(p, MOMENTS.placed - 0.006, MOMENTS.placed + 0.003);
    const pool = poolSprite("255, 196, 120");
    const tight = poolSprite("255, 232, 190");
    ctx.save();
    // From overhead the canopy's roof is above the lamps, so it stays out of their light.
    if (t.s > 0.75) {
      const { half, roof } = PLACES.mandvi;
      const e = half + 0.1;
      const y = (Z: number) => Z * t.s - (roof + 0.35) * t.c;
      ctx.beginPath();
      ctx.rect(x0 - 1, -60, x1 - x0 + 2, 120);
      ctx.moveTo(-e, y(-e));
      ctx.lineTo(e, y(-e));
      ctx.lineTo(e, y(e));
      ctx.lineTo(-e, y(e));
      ctx.closePath();
      ctx.clip("evenodd");
    }
    ctx.globalCompositeOperation = "overlay";
    const sx = 1;
    const sy = Math.max(t.s, 0.3);
    const ellipse = (sprite: HTMLCanvasElement, x: number, y: number, r: number, a: number) => {
      if (a <= 0.01) return;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(sprite, x - r * sx, y - r * sy, 2 * r * sx, 2 * r * sy);
    };
    // The garbo: a wide warm pool, and a brighter one close about the mandvi.
    const lit = amount * (0.35 + 0.65 * garbo);
    ellipse(pool, 0, 0.3 * t.s, 6.2, 0.9 * lit);
    ellipse(tight, 0, 0.6 * t.s, 3.4, 0.6 * lit);
    // The lanterns overhead, each its own colour.
    for (let i = 0; i < 9; i++) {
      const on = this.lampGlow[i];
      if (on < 0.01) continue;
      const at = lanternAt(t, i, 0);
      ellipse(poolSprite(tone(mix(FORMS[i].paper, [255, 220, 170], 0.5))), at.x, at.y + 0.6 * t.c, 1.9, 0.7 * on * amount);
    }
    // The strings of bulbs.
    const strings = this.strings(t);
    strings.bulbs.forEach((b, i) => {
      if (i % 2) return;
      ellipse(poolSprite(b.color), b.x, b.y + 0.3 * t.c, 1.0, 0.55 * amount);
    });
    // Lamplight in the rooms spilling onto the painted walls of the pol, when they are in view.
    if (t.s < 0.75) {
      const warm = poolSprite(WINDOW_LIGHT);
      const base = PLACES.backRow * t.s;
      let i = 0;
      for (const h of this.art!.houses) {
        if (h.x > x1 || h.x + h.w < x0) continue;
        for (const w of h.windows) {
          i++;
          if (i % 3 === 1) continue;
          ctx.globalAlpha = 0.85 * amount;
          const r = w.w * 1.6;
          ctx.drawImage(warm, h.x + w.x + w.w * 0.5 - r, base + (w.y + w.h * 0.6) * t.c - r * t.c, 2 * r, 2 * r * t.c);
        }
      }
    }
    ctx.restore();
  }

  /** The mirror work catching the light as the skirts turn. */
  private glints(ctx: Ctx, dark: number) {
    if (glints.length === 0 || dark < 0.2) return;
    ctx.fillStyle = "rgb(255, 246, 224)";
    for (const [lo, hi, alpha] of [
      [0.45, 0.7, 0.5],
      [0.7, 9, 1],
    ]) {
      ctx.globalAlpha = alpha * dark;
      ctx.beginPath();
      for (let i = 0; i < glints.length; i += 4) {
        const k = glints[i + 3];
        if (k < lo || k >= hi) continue;
        const r = glints[i + 2] * (0.7 + 0.5 * Math.min(1, k));
        ctx.moveTo(glints[i] + r, glints[i + 1]);
        ctx.arc(glints[i], glints[i + 1], r, 0, TAU);
      }
      ctx.fill();
    }
    // The brightest flash with a little halo.
    const halo = glowSprite("255, 236, 200");
    for (let i = 0; i < glints.length; i += 4) {
      if (glints[i + 3] < 0.7) continue;
      glow(ctx, halo, glints[i], glints[i + 1], glints[i + 2] * 6, 0.55 * dark);
    }
    ctx.globalAlpha = 1;
  }

  private chowkCrowd(p: number, t: Tilt) {
    return rise(p, 0.44, 0.48) * (1 - rise(p, 0.735, 0.75)) * (1 - rise(Math.asin(t.s), 0.55, 0.9));
  }

  /** Morning light slanting in over the rooftops, and the dust in it. */
  private sunlight(ctx: Ctx, width: number, height: number, p: number) {
    const sun = (1 - rise(p, 0.17, 0.22)) * rise(p, 0.0, 0.05);
    if (sun < 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const random = mulberry32(5);
    for (let i = 0; i < 5; i++) {
      const x = width * (0.45 + random() * 0.6);
      const w = width * (0.04 + random() * 0.07);
      const beam = ctx.createLinearGradient(x, 0, x - height * 0.5, height);
      beam.addColorStop(0, `rgba(255, 226, 170, ${0.1 * sun})`);
      beam.addColorStop(1, "rgba(255, 226, 170, 0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w - height * 0.55, height);
      ctx.lineTo(x - height * 0.55, height);
      ctx.fill();
    }
    ctx.restore();
  }

  /** The names of the nine forms under their lanterns as they light. */
  private labels(ctx: Ctx, f: Frame, v: View, t: Tilt) {
    const show = rise(f.p, MOMENTS.lamps[0] - 0.01, MOMENTS.lamps[0]) * (1 - rise(f.p, MOMENTS.lamps[1] + 0.012, MOMENTS.lamps[1] + 0.03));
    if (show < 0.01) return;
    const size = clamp(v.scale * 0.2, 10, 17);
    // On wide screens, keep the names off the caption's side.
    const clear = (x: number) => {
      if (f.portrait) return 1;
      const side = navratri.chapters.find((c) => windowOpacity(f.p, c.window) > 0.01)?.side;
      if (!side) return 1;
      const k = x / v.width;
      return side === "right" ? 1 - rise(k, 0.62, 0.7) : rise(k, 0.3, 0.38);
    };
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < 9; i++) {
      const lit = this.lampGlow[i];
      if (lit < 0.02) continue;
      const at = lanternAt(t, i, 0);
      const s = toScreen(v, at.x, at.y + 0.62 * Math.max(t.c, 0.3));
      if (s.x < -60 || s.x > v.width + 60) continue;
      const room = clear(s.x);
      if (room < 0.02) continue;
      ctx.globalAlpha = show * lit * 0.92 * room;
      ctx.fillStyle = "#ffe6b0";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 6;
      ctx.font = `${size}px ${this.font}`;
      ctx.fillText(FORMS[i].gu, s.x, s.y);
      ctx.fillStyle = "rgba(242, 233, 214, 0.75)";
      ctx.font = `${Math.round(size * 0.72)}px serif`;
      ctx.fillText(FORMS[i].en, s.x, s.y + size * 1.35);
    }
    ctx.restore();
  }

  // ─── Grading and framing ───────────────────────────────────────────────────

  private grade(g: Ctx, width: number, height: number, p: number, dark: number, tilt: number) {
    // Dusk's warmth, the morning's, then night's blue: folded into a single fill.
    const dusk = Math.max(rise(p, 0.2, 0.235) * (1 - rise(p, 0.26, 0.3)), rise(p, 0.722, 0.745) * (1 - rise(p, 0.79, 0.84)));
    const morning = 1 - rise(p, 0.05, 0.1);
    const washes: [RGB, number][] = [
      [[200, 90, 60], dusk > 0.01 ? 0.22 * dusk : 0],
      [[250, 170, 120], morning > 0.01 && dark < 0.5 ? 0.16 * morning : 0],
      [chowkNight(p), dark > 0.01 ? 0.72 * dark : 0],
    ];
    let keep = 1;
    let colour: RGB = [0, 0, 0];
    for (const [c, a] of washes) {
      colour = colour.map((v, i) => v * (1 - a) + c[i] * a) as RGB;
      keep *= 1 - a;
    }
    const alpha = 1 - keep;
    if (alpha < 0.005) return;
    const rgb = tone(colour.map((v) => v / alpha) as RGB);
    // Looking along the pol at night, the lamps are low: the tops of the walls fall into shadow.
    const shade = 0.5 * dark * (1 - rise(tilt, 0.5, 0.75));
    g.save();
    g.globalCompositeOperation = "source-atop";
    if (shade > 0.01) {
      const fill = g.createLinearGradient(0, 0, 0, height * 0.75);
      fill.addColorStop(0, `rgba(${rgb}, ${1 - keep * (1 - shade)})`);
      fill.addColorStop(1, `rgba(${rgb}, ${alpha})`);
      g.fillStyle = fill;
    } else g.fillStyle = `rgba(${rgb}, ${alpha})`;
    g.fillRect(0, 0, width, height);
    g.restore();
  }

  private frame(ctx: Ctx, f: Frame, dark: number) {
    const { width, height, p } = f;
    // A wash behind the caption, so it reads over the brightest parts.
    if (!f.portrait) {
      for (const c of navratri.chapters) {
        const o = windowOpacity(p, c.window);
        if (o < 0.01) continue;
        const right = c.side === "right";
        const wash = ctx.createLinearGradient(right ? width : 0, 0, right ? width * 0.5 : width * 0.5, 0);
        const a = o * lerp(0.55, 0.35, dark);
        wash.addColorStop(0, `rgba(10, 5, 12, ${a})`);
        wash.addColorStop(0.6, `rgba(10, 5, 12, ${a * 0.4})`);
        wash.addColorStop(1, "rgba(10, 5, 12, 0)");
        ctx.fillStyle = wash;
        ctx.fillRect(right ? width * 0.5 : 0, 0, width * 0.5, height);
      }
      const shade = ctx.createLinearGradient(0, 0, 0, 130);
      shade.addColorStop(0, `rgba(10, 5, 12, ${0.35 * (1 - dark) + 0.15})`);
      shade.addColorStop(1, "rgba(10, 5, 12, 0)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, 130);
    } else {
      // Phones: a floor of shade under the captions.
      const floor = ctx.createLinearGradient(0, height * 0.55, 0, height);
      floor.addColorStop(0, "rgba(10, 5, 12, 0)");
      floor.addColorStop(1, "rgba(10, 5, 12, 0.7)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);
    }
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.48,
      Math.min(width, height) * 0.35,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    vignette.addColorStop(0, "rgba(8, 4, 10, 0)");
    vignette.addColorStop(1, `rgba(8, 4, 10, ${0.3 + 0.38 * dark})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}

/** The rest of the crowd, packed in below the back of the front row. */
function crowdFloor(g: Ctx, t: Tilt, z: number, from: number, to: number) {
  const y = z * t.s;
  const fade = g.createLinearGradient(0, y - 0.05, 0, y + 1.2);
  fade.addColorStop(0, "rgb(34, 24, 34)");
  fade.addColorStop(1, "rgb(16, 10, 16)");
  g.fillStyle = fade;
  g.fillRect(from, y - 0.05, to - from, 12);
}

const tone = (c: RGB) => c.map(Math.round).join(", ");

/** Night in the chowk is a warm dark, lamplit; out on the maidan it is the blue of the open sky. */
const chowkNight = (p: number): RGB => mix([24, 9, 14], [14, 10, 38], rise(p, 0.72, 0.76) * (1 - rise(p, 0.9, 0.94)));

/** A broad soft pool of light, flatter than a glow so that it lights an area rather than a point. */
const pools = new Map<string, HTMLCanvasElement>();
function poolSprite(color: string) {
  let sprite = pools.get(color);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 128;
    const g = sprite.getContext("2d")!;
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${color}, 1)`);
    gradient.addColorStop(0.35, `rgba(${color}, 0.78)`);
    gradient.addColorStop(0.7, `rgba(${color}, 0.3)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
    pools.set(color, sprite);
  }
  return sprite;
}

/** Eases a dancer from standing into the dance. */
function blendPose(a: Pose, b: Pose, k: number, facing: 1 | -1): Pose {
  return {
    facing,
    spin: lerp(a.spin, b.spin, k),
    turn: b.turn,
    bend: lerp(a.bend, b.bend, k),
    bob: lerp(a.bob, b.bob, k),
    l: [lerp(a.l[0], b.l[0], k), lerp(a.l[1], b.l[1], k)],
    r: [lerp(a.r[0], b.r[0], k), lerp(a.r[1], b.r[1], k)],
    step: lerp(a.step, b.step, k),
  };
}

export function createScene(emit: Emit): Scene {
  return new NavratriScene(emit);
}
