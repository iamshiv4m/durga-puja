// Onam, as one continuous shot along a strip of Kerala: the shadow screen on a tharavadu's
// verandah where Mahabali's story is played at night; the pookalam in the mittam, a ring a
// morning from Atham to Thiruvonam; the sadya served on a banana leaf in the oottupura; the
// women's Thiruvathira round the nilavilakku at dusk; the painted tigers of Thrissur; the snake
// boats on the Pamba and the chenda melam on the temple ghat; and the king going home again.
import {
  TAU,
  apply,
  clamp,
  flame,
  flicker,
  glow,
  glowSprite,
  lerp,
  mix,
  mulberry32,
  rise,
  toScreen,
  toWorld,
  view,
  type Ctx,
  type RGB,
  type View,
} from "../paint";
import { windowOpacity } from "@/lib/math";
import type { Emit, Frame, Scene } from "../types";
import { onam } from "./content";
import { WARM, cached, envOf, fontOf, painter, type Env, type Paint } from "./light";
import {
  drawChenda,
  drawFolk,
  drawIlathalam,
  drawKombu,
  drawMuthukkuda,
  drawRower,
  drawSitting,
  drawTiger,
  GOLD,
  KASAVU,
  MUNDU,
  SKIN,
  type Look,
  type Tiger,
} from "./people";
import {
  HALL,
  TEMPLE,
  WATER,
  drawBanana,
  drawFar,
  drawGate,
  drawGround,
  drawHall,
  drawHouse,
  drawHull,
  drawPalm,
  drawRiverBack,
  drawSky,
  drawStreet,
  drawWater,
  type Boat,
} from "./places";
import { Pookalam, dayLabel, drawAppan } from "./pookalam";
import { ASPECT, drawLeaf, servedLabel, warmLeaves } from "./sadya";
import { drawScreen, screenLit } from "./shadow";
import { CLAP_BEAT, PULI_STEP, audioNow, melam, melamBeat, phaseOf, rowing, strokePeriod } from "./sync";
import { DAYS, LAMP, LEAF, MOMENTS, POOKALAM, RIVER, STREET, camera, hourAt, type Hour } from "./world";

const LAMP_LIGHT = "255, 170, 70";
/** How much each chapter's caption darkens its side of the scene: most over the bright daytime scenes. */
const SHADE = [0.4, 1, 1, 0.5, 0.9, 1, 0.4];

/** The mittam's earth: swept red soil, with the arcs a coconut-rib broom leaves and a few pebbles. */
const earth = () =>
  cached("onam-earth", 1500, 480, (g) => {
    const random = mulberry32(606);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = random() < 0.5 ? `rgba(120, 70, 40, ${0.08 + random() * 0.12})` : `rgba(250, 220, 180, ${0.06 + random() * 0.1})`;
      g.beginPath();
      g.arc(random() * 1500, random() * 480, 0.8 + random() * 2.2, 0, TAU);
      g.fill();
    }
    g.lineCap = "round";
    for (let i = 0; i < 520; i++) {
      const x = random() * 1500;
      const y = random() * 480;
      const r = 24 + random() * 40;
      const a = random() * TAU;
      g.strokeStyle = random() < 0.5 ? "rgba(110, 64, 34, 0.12)" : "rgba(255, 230, 190, 0.1)";
      g.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.arc(x, y + k * 2.5, r, a, a + 0.5 + random() * 0.4);
        g.stroke();
      }
    }
  });

type Palm = { x: number; y: number; h: number; lean: number; seed: number };
type Person = { x: number; y: number; look: Look; seed: number };
type Dancer = {
  tiger: Tiger;
  x: number;
  y: number;
  shake: number;
  seed: number;
};

const shirt = (random: () => number): RGB => {
  const colours: RGB[] = [
    [240, 236, 226],
    [120, 160, 200],
    [200, 90, 80],
    [110, 150, 110],
    [230, 200, 120],
    [150, 120, 180],
  ];
  return colours[Math.floor(random() * colours.length)];
};

const SAREES: [RGB, RGB][] = [
  [
    [200, 40, 60],
    [240, 190, 60],
  ],
  [
    [40, 110, 90],
    [236, 190, 80],
  ],
  [
    [236, 150, 40],
    [180, 30, 40],
  ],
  [
    [110, 60, 140],
    [236, 190, 80],
  ],
  [
    [230, 90, 130],
    [250, 210, 90],
  ],
  [KASAVU, GOLD],
];

function randomLook(random: () => number, h: number, back = false): Look {
  const woman = random() < 0.5;
  const skin = SKIN[Math.floor(random() * SKIN.length)];
  if (woman) {
    const [cloth, border] = SAREES[Math.floor(random() * SAREES.length)];
    return {
      h: h * 0.94,
      skin,
      woman,
      cloth,
      border,
      top: mix(cloth, [0, 0, 0], 0.2),
      hair: "bun",
      jasmine: random() < 0.6,
      back,
    };
  }
  const top = random() < 0.7 ? shirt(random) : null;
  return {
    h,
    skin,
    woman,
    cloth: random() < 0.8 ? MUNDU : [60, 70, 110],
    border: random() < 0.5 ? GOLD : [60, 110, 70],
    top,
    hair: "short",
    towel: top ? null : [240, 236, 226],
    back,
  };
}

class Onam implements Scene {
  private readonly emit: Emit;
  private readonly pookalam = new Pookalam();
  private readonly palms: Palm[] = [];
  private readonly bananas: {
    x: number;
    y: number;
    h: number;
    seed: number;
  }[] = [];
  private readonly audience: Person[] = [];
  private readonly diners: Person[] = [];
  private readonly women: Look[] = [];
  private readonly tigers: Dancer[] = [];
  private readonly band: Person[] = [];
  private readonly crowd: Person[] = [];
  private readonly near: Person[] = [];
  private readonly banks: Person[] = [];
  private readonly melamBand: (Person & {
    role: "chenda" | "ilathalam" | "kombu" | "kuzhal";
  })[] = [];
  private readonly boats: Boat[] = [
    { x: 0, y: 1.95, scale: 0.84, seed: 1, umbrella: [220, 40, 40] },
    { x: 0, y: 3.55, scale: 1.0, seed: 2, umbrella: [40, 90, 200] },
  ];
  private readonly splashes: { x: number; y: number; born: number }[] = [];
  private v: View | null = null;
  private tilt = 0.42;
  private rowClock = 0;
  private melamClock = 0;
  private melamCount = 0;
  private lead = 0;
  private fonts: { ml: string; serif: string; sc: string } | null = null;
  private lastTouch = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    // Paint the heavier offscreen layers soon after load, one at a time, before they are needed.
    if (typeof window !== "undefined") {
      window.setTimeout(() => earth(), 400);
      window.setTimeout(() => warmLeaves(), 900);
    }
    const random = mulberry32(1509);
    // Palms behind everything, thicker by the river and round the house.
    for (let x = -60; x < 130; x += 1.4 + random() * 2.2) {
      if (x > -11 && x < 11 && random() < 0.6) continue;
      if (x > STREET.from - 1 && x < STREET.to + 1) continue;
      const far = x > RIVER.from;
      this.palms.push({
        x,
        y: far ? -0.45 - random() * 0.2 : -0.4 - random() * 0.6,
        h: far ? 2.0 + random() * 1.2 : 5 + random() * 3.5,
        lean: (random() - 0.5) * 0.25,
        seed: random() * 10,
      });
    }
    for (const x of [-10.6, 10.4, -12.4, 12.2])
      this.bananas.push({
        x,
        y: 0.4 + random() * 0.3,
        h: 2 + random() * 0.5,
        seed: random() * 10,
      });
    // The audience at the shadow play, sitting in the mittam with their backs to us.
    for (let row = 0; row < 3; row++) {
      for (let x = -5.2 + row * 0.3; x < 5.4; x += 0.75 + random() * 0.35) {
        this.audience.push({
          x: x + random() * 0.2,
          y: 0.9 + row * 0.55,
          look: randomLook(random, 0.95 + random() * 0.1, true),
          seed: random() * 10,
        });
      }
    }
    this.audience.sort((a, b) => a.y - b.y);
    // Diners in the oottupura, in two rows facing each other across the leaves.
    for (const y of [1.25, LEAF.y - 0.45]) {
      for (let x = HALL.from + 1.2; x < HALL.to - 0.6; x += 0.8) {
        const look = randomLook(random, 1);
        this.diners.push({
          x: Math.abs(x - LEAF.x) < 0.3 ? LEAF.x : x,
          y,
          look: {
            ...look,
            top: look.woman ? look.top : null,
            towel: look.woman ? null : MUNDU,
          },
          seed: random() * 10,
        });
      }
    }
    // The Thiruvathira dancers, all in kasavu, jasmine in their hair.
    const blouses: RGB[] = [
      [170, 30, 50],
      [40, 110, 80],
      [200, 120, 30],
      [120, 40, 110],
      [30, 70, 140],
    ];
    for (let i = 0; i < 10; i++) {
      this.women.push({
        h: 0.9 + random() * 0.07,
        skin: SKIN[i % SKIN.length],
        woman: true,
        cloth: KASAVU,
        border: GOLD,
        top: blouses[i % blouses.length],
        hair: "bun",
        jasmine: true,
      });
    }
    // The tigers, and the drummers behind them.
    const coats: [RGB, RGB, boolean][] = [
      [[246, 176, 30], [26, 18, 14], false],
      [[240, 140, 20], [30, 16, 10], false],
      [[30, 30, 34], [240, 190, 40], true],
      [[250, 196, 40], [30, 20, 12], false],
      [[90, 170, 200], [20, 30, 60], true],
      [[246, 160, 30], [26, 18, 14], false],
    ];
    const places = [
      [-2.8, 2.5],
      [-1.7, 3.35],
      [-0.5, 2.4],
      [0.6, 3.3],
      [1.7, 2.45],
      [2.8, 3.25],
    ];
    coats.forEach(([coat, mark, spots], i) => {
      this.tigers.push({
        tiger: {
          h: 1.25 + random() * 0.12,
          coat,
          mark,
          spots,
          seed: random() * 10,
        },
        x: STREET.tigers + places[i][0],
        y: places[i][1],
        shake: 0,
        seed: random() * 10,
      });
    });
    this.tigers.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 6; i++) {
      this.band.push({
        x: STREET.tigers - 2.2 + i * 0.85,
        y: 1.65,
        look: {
          h: 0.98,
          skin: SKIN[i % SKIN.length],
          woman: false,
          cloth: MUNDU,
          border: [200, 40, 40],
          top: i % 2 ? null : [236, 120, 40],
          hair: "wrap",
          towel: null,
        },
        seed: random() * 10,
      });
    }
    for (let row = 0; row < 2; row++) {
      for (let x = STREET.from + 0.3; x < STREET.to; x += 0.42 + random() * 0.3) {
        this.crowd.push({
          x,
          y: 0.5 + row * 0.42,
          look: randomLook(random, 0.8 + random() * 0.12),
          seed: random() * 10,
        });
      }
    }
    this.crowd.sort((a, b) => a.y - b.y);
    for (let x = STREET.from; x < RIVER.from + 60; x += 0.5 + random() * 0.4) {
      const onStreet = x < STREET.to;
      this.near.push({
        x,
        y: onStreet ? 5.25 + random() * 0.3 : WATER.near + 1.75 + random() * 0.3,
        look: randomLook(random, onStreet ? 1.15 + random() * 0.1 : 1.3 + random() * 0.1, true),
        seed: random() * 10,
      });
    }
    // People along the far bank and the ghat, watching the boats.
    for (let x = RIVER.from + 1; x < RIVER.from + 60; x += 0.5 + random() * 0.8) {
      if (Math.abs(x - TEMPLE.x) < 5.5) continue;
      this.banks.push({
        x,
        y: -0.1 - random() * 0.15,
        look: randomLook(random, 0.62),
        seed: random() * 10,
      });
    }
    // The melam on the ghat: kombu and kuzhal at the back, chendas in the middle, ilathalam in front.
    // Each man his own height and build, his own mundu and way of tying his hair.
    const man = (h: number): Look => {
      const k = random();
      return {
        h: h * (0.92 + random() * 0.16),
        skin: SKIN[Math.floor(random() * SKIN.length)],
        woman: false,
        cloth: random() < 0.8 ? MUNDU : KASAVU,
        border: random() < 0.6 ? GOLD : random() < 0.5 ? [190, 40, 40] : [40, 110, 70],
        top: null,
        hair: k < 0.3 ? "wrap" : k < 0.45 ? "bald" : "short",
        towel: random() < 0.7 ? (random() < 0.75 ? MUNDU : [230, 150, 60]) : null,
      };
    };
    const jitter = () => (random() - 0.5) * 0.22;
    for (let i = 0; i < 6; i++)
      this.melamBand.push({
        x: TEMPLE.x - 3.2 + i * 1.25 + jitter(),
        y: -0.62 + jitter() * 0.2,
        look: man(0.8),
        seed: random() * 10,
        role: i % 3 === 1 ? "kuzhal" : "kombu",
      });
    for (let i = 0; i < 12; i++)
      this.melamBand.push({
        x: TEMPLE.x - 4.4 + i * 0.8 + jitter() * 0.6,
        y: -0.32 + jitter() * 0.25,
        look: man(0.84),
        seed: random() * 10,
        role: "chenda",
      });
    for (let i = 0; i < 9; i++)
      this.melamBand.push({
        x: TEMPLE.x - 4.0 + i * 1.0 + jitter(),
        y: -0.02 + jitter() * 0.2,
        look: man(0.82),
        seed: random() * 10,
        role: "ilathalam",
      });
    this.melamBand.sort((a, b) => a.y - b.y);
  }

  draw(ctx: Ctx, f: Frame) {
    // Whatever happens in a frame, the next one starts clean.
    const base = ctx.getTransform();
    try {
      this.paint(ctx, f);
    } finally {
      ctx.setTransform(base);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  private paint(ctx: Ctx, f: Frame) {
    const { width, height, p, seconds } = f;
    const unit = Math.min(width, height) / 8;
    const cam = camera(p, f.portrait);
    this.tilt = cam.tilt;
    const v = view(width, height, cam, unit, f.portrait ? 0.36 : 0.5);
    this.v = v;
    const hour = hourAt(p);
    const env = envOf(hour);
    const horizon = toScreen(v, 0, 0).y;
    const left = v.x - v.width / 2 / v.scale - 1;
    const right = v.x + v.width / 2 / v.scale + 1;
    const top = v.y - v.ay / v.scale - 1;
    const bottom = v.y + (v.height - v.ay) / v.scale + 1;
    const now = audioNow();
    this.clocks(f, now);

    drawSky(ctx, width, height, v, hour, seconds, horizon, unit, p);
    drawFar(ctx, v, hour, horizon, unit);

    ctx.save();
    apply(ctx, v);
    const paint = painter(env);
    for (const palm of this.palms) {
      if (palm.x < left - 4 || palm.x > right + 4) continue;
      if (palm.x > TEMPLE.x - 7.5 && palm.x < TEMPLE.x + 7) continue;
      drawPalm(ctx, palm.x, palm.y, palm.h, palm.lean, f.reduced ? 0 : seconds, palm.seed, paint);
    }
    drawGround(ctx, left, right, env);
    const lit = screenLit(p);
    if (left < HALL.to + 1 && right > HALL.from - 1) drawHall(ctx, env, false);
    if (left < 16 && right > -13) {
      const lamps = rise(p, 0.45, 0.47) * (1 - rise(p, 0.57, 0.58)) + rise(p, 0.855, 0.875);
      drawHouse(ctx, env, lit, lamps, seconds);
      drawScreen(ctx, { p, seconds, amb: hour.amb });
      drawGate(ctx, env);
      for (const b of this.bananas) drawBanana(ctx, b.x, b.y, b.h, b.seed, f.reduced ? 0 : seconds, paint);
    }
    if (right > STREET.from - 2 && left < STREET.to + 2) drawStreet(ctx, env, left, right, f.reduced ? 0 : seconds);
    if (right > RIVER.from - 3) {
      drawRiverBack(ctx, env, hour, left, right, seconds, p);
      drawWater(ctx, env, hour, left, right, f.reduced ? 0 : seconds, 1 + rowing.boost);
    }

    // The mittam: the pookalam, the audience, the Thrikkakara Appan, the lamp and the dancers.
    if (left < 14 && right > -12) this.mittam(ctx, f, env, hour, lit, top, bottom);
    if (left < HALL.to + 1 && right > HALL.from - 1) this.hall(ctx, f, env);
    if (right > STREET.from - 2 && left < STREET.to + 2) this.street(ctx, f, env, left, right, now);
    if (right > RIVER.from - 3) this.river(ctx, f, env, left, right, now);
    ctx.restore();

    this.headerWash(ctx, f);
    this.labels(ctx, f, v);
    this.captionShade(ctx, f);

    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      Math.min(width, height) * 0.3,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    vignette.addColorStop(0, "rgba(6, 4, 10, 0)");
    vignette.addColorStop(1, `rgba(6, 4, 10, ${0.6 - hour.amb * 0.34})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  /** Runs the boats' and the melam's own clocks when the sound is off. */
  private clocks(f: Frame, now: number | null) {
    rowing.boost = Math.max(0, rowing.boost - f.dt * 0.22);
    const period = strokePeriod(f.p, rowing.boost);
    this.lead = clamp(this.lead + f.dt * (rowing.boost * 0.5 - 0.04), 0, 3);
    if (now === null) {
      this.rowClock = (this.rowClock + f.dt / period) % 1;
      this.melamClock += f.dt / melamBeat(f.p);
      if (this.melamClock >= 1) {
        this.melamClock %= 1;
        this.melamCount++;
      }
    }
  }

  private rowPhase(now: number | null, p: number) {
    if (now !== null) {
      const ph = phaseOf(rowing.strokes, now, strokePeriod(p, rowing.boost));
      if (ph) return ph.phase;
    }
    return this.rowClock;
  }

  private melamPhase(now: number | null, p: number) {
    if (now !== null) {
      const ph = phaseOf(melam.beats, now, melamBeat(p));
      if (ph) return ph;
    }
    return { phase: this.melamClock, n: this.melamCount };
  }

  // ─── The mittam ────────────────────────────────────────────────────────────

  private mittam(ctx: Ctx, f: Frame, env: Env, hour: Hour, lit: number, top: number, bottom: number) {
    const { p, seconds } = f;
    const tilt = this.tilt;
    const paint = painter(env);
    // The swept earth of the mittam, broom marks and all.
    ctx.globalAlpha = 0.2 + 0.3 * hour.amb;
    ctx.drawImage(earth(), -11, 0.05, 25, 8);
    ctx.globalAlpha = 1;
    // A tulasi thara, the little shrine of holy basil every house keeps in front.
    this.tulasi(ctx, -9.6, 1.5, paint);
    // A basket of the morning's flowers by the pookalam.
    if (p > 0.18 && p < 0.35) this.basket(ctx, -3.3, 5.5, paint, seconds);

    // The pookalam, from Atham, wilting on the last evening.
    const wilt = rise(p, 0.86, 0.93);
    if (p > MOMENTS.days[0] - 0.03 && bottom > POOKALAM.y - POOKALAM.r && top < POOKALAM.y + POOKALAM.r) {
      this.pookalam.draw(
        ctx,
        POOKALAM.x,
        POOKALAM.y,
        POOKALAM.r,
        tilt,
        p,
        seconds,
        paint,
        wilt,
        f.reduced,
        clamp((1 - hour.amb) * 1.1 - 0.1),
      );
      const lamp = rise(p, 0.45, 0.47) * (1 - rise(p, 0.57, 0.58));
      drawAppan(ctx, POOKALAM.x, POOKALAM.y + 0.05, 0.62, rise(p, MOMENTS.appan, MOMENTS.appan + 0.006), tilt, painter(env, lamp * 0.2));
    }

    // The audience at the shadow play.
    const watching = Math.max(rise(p, 0.0, 0.02) * (1 - rise(p, 0.176, 0.19)), rise(p, 0.86, 0.88));
    if (watching > 0.01 && top < 3) {
      ctx.globalAlpha = watching;
      for (const a of this.audience) {
        const glowLift = lit * 0.22 * (1 - (a.y - 0.9) * 0.3);
        const pa = painter({ ...env, tint: WARM }, glowLift);
        drawSitting(ctx, a.x, a.y, a.look, 0, pa);
      }
      ctx.globalAlpha = 1;
    }

    // Lamps along the edge of the verandah on the evenings.
    const edge = rise(p, 0.448, 0.47) * (1 - rise(p, 0.57, 0.58)) + rise(p, 0.855, 0.875) * 0.8;
    if (edge > 0.01) this.edgeLamps(ctx, f, env, edge);
    // Thiruvathira: the nilavilakku lit at dusk, and the women circling it.
    const evening = rise(p, 0.448, 0.466) * (1 - rise(p, 0.568, 0.58));
    const lastEvening = rise(p, 0.86, 0.88) * (1 - rise(p, 0.93, 0.99) * 0.6);
    const lampOn = Math.max(evening, lastEvening * 0.7);
    if (LAMP.x < this.v!.x + this.v!.width / this.v!.scale && lampOn > -1) this.nilavilakku(ctx, f, env, lampOn);
    if (evening > 0.01) this.thiruvathira(ctx, f, env, evening, lampOn);
  }

  private edgeLamps(ctx: Ctx, f: Frame, env: Env, on: number) {
    const paint = painter({ ...env, tint: WARM }, on * 0.3);
    const spots: [number, number][] = [];
    for (let x = -9.4; x <= 9.5; x += 0.95) {
      if (Math.abs(x) < 1.6) continue;
      ctx.fillStyle = paint([200, 150, 70]);
      ctx.beginPath();
      ctx.ellipse(x, -0.82, 0.08, 0.025, 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = clamp(on * 1.4);
      flame(ctx, x + 0.03, -0.84, 0.07, f.seconds, x);
      ctx.restore();
      spots.push([x, -0.88]);
    }
    ctx.globalCompositeOperation = "lighter";
    const sprite = glowSprite(LAMP_LIGHT);
    for (const [x, y] of spots) glow(ctx, sprite, x, y, 0.9 * flicker(f.seconds, x), 0.32 * on);
    ctx.globalCompositeOperation = "source-over";
  }

  /** A shallow bamboo basket, a poovatti, heaped with thumba, chethi and marigold. */
  private basket(ctx: Ctx, x: number, y: number, paint: Paint, seconds: number) {
    const t = this.tilt;
    ctx.fillStyle = "rgba(40, 24, 10, 0.25)";
    ctx.beginPath();
    ctx.ellipse(x + 0.06, y + 0.05, 0.5, 0.5 * t, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = paint([176, 136, 80]);
    ctx.beginPath();
    ctx.ellipse(x, y, 0.48, 0.48 * t, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = paint([130, 96, 50], 0.7);
    ctx.lineWidth = 0.02;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y, 0.48 - i * 0.03, (0.48 - i * 0.03) * t, 0, 0, TAU);
      ctx.stroke();
    }
    const random = mulberry32(55);
    const colours: RGB[] = [
      [250, 250, 242],
      [212, 34, 38],
      [246, 138, 22],
      [250, 198, 30],
      [236, 92, 146],
    ];
    for (let i = 0; i < 90; i++) {
      const a = random() * TAU;
      const r = Math.sqrt(random()) * 0.38;
      ctx.fillStyle = paint(colours[i % colours.length]);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * t - (0.38 - r) * 0.12, 0.028 + random() * 0.02, 0, TAU);
      ctx.fill();
    }
    void seconds;
  }

  private tulasi(ctx: Ctx, x: number, y: number, paint: Paint) {
    ctx.fillStyle = paint([156, 74, 48]);
    ctx.beginPath();
    ctx.moveTo(x - 0.35, y);
    ctx.lineTo(x + 0.35, y);
    ctx.lineTo(x + 0.26, y - 0.75);
    ctx.lineTo(x - 0.26, y - 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paint([232, 224, 204]);
    ctx.fillRect(x - 0.32, y - 0.85, 0.64, 0.12);
    ctx.fillStyle = paint([240, 230, 200]);
    ctx.fillRect(x - 0.12, y - 0.5, 0.24, 0.2);
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (i - 7) * 0.2;
      ctx.fillStyle = paint(i % 2 ? [60, 110, 50] : [90, 130, 60]);
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 0.22, y - 0.95 + Math.sin(a) * 0.3, 0.07, 0.04, a, 0, TAU);
      ctx.fill();
    }
  }

  /** The nilavilakku: a tall brass lamp, five wicks burning in its bowl, the paddy-filled para beside it. */
  private nilavilakku(ctx: Ctx, f: Frame, env: Env, on: number) {
    const { x, y } = LAMP;
    const paint = painter({ ...env, tint: WARM }, on * 0.5);
    const brass: RGB = [214, 168, 72];
    const shine: RGB = [255, 226, 150];
    // The para, a wooden measure brimming with paddy, a spray of coconut flower standing in it.
    const px = x + 0.42;
    ctx.fillStyle = paint([120, 70, 34]);
    ctx.beginPath();
    ctx.moveTo(px - 0.13, y);
    ctx.lineTo(px + 0.13, y);
    ctx.lineTo(px + 0.11, y - 0.2);
    ctx.lineTo(px - 0.11, y - 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paint(brass);
    ctx.fillRect(px - 0.13, y - 0.03, 0.26, 0.03);
    ctx.fillRect(px - 0.115, y - 0.21, 0.23, 0.025);
    ctx.fillStyle = paint([214, 170, 70]);
    ctx.beginPath();
    ctx.ellipse(px, y - 0.21, 0.11, 0.04, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = paint([240, 226, 180]);
    ctx.lineWidth = 0.012;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(px, y - 0.22);
      ctx.quadraticCurveTo(px + (i - 3) * 0.02, y - 0.4, px + (i - 3) * 0.04, y - 0.52 - Math.abs(i - 3) * -0.02);
      ctx.stroke();
    }
    // The lamp: a round foot, a ringed stem, the bowl, and its crown.
    ctx.fillStyle = paint(brass);
    ctx.beginPath();
    ctx.ellipse(x, y - 0.02, 0.2, 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 0.16, y - 0.03);
    ctx.quadraticCurveTo(x - 0.03, y - 0.08, x - 0.025, y - 0.16);
    ctx.lineTo(x + 0.025, y - 0.16);
    ctx.quadraticCurveTo(x + 0.03, y - 0.08, x + 0.16, y - 0.03);
    ctx.fill();
    ctx.fillRect(x - 0.022, y - 0.62, 0.044, 0.48);
    for (const ry of [-0.2, -0.32, -0.46, -0.58]) {
      ctx.beginPath();
      ctx.ellipse(x, y + ry, 0.045, 0.018, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x - 0.17, y - 0.66);
    ctx.quadraticCurveTo(x, y - 0.56, x + 0.17, y - 0.66);
    ctx.lineTo(x + 0.15, y - 0.69);
    ctx.lineTo(x - 0.15, y - 0.69);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 0.012, y - 0.95, 0.024, 0.27);
    ctx.beginPath();
    ctx.moveTo(x - 0.05, y - 0.95);
    ctx.quadraticCurveTo(x, y - 1.06, x + 0.05, y - 0.95);
    ctx.fill();
    ctx.fillStyle = paint(shine, 0.7);
    ctx.fillRect(x - 0.012, y - 0.6, 0.01, 0.42);
    if (on <= 0.01) return;
    // Five flames round the bowl.
    for (let i = 0; i < 5; i++) {
      const fx = x + (i - 2) * 0.07;
      const fy = y - 0.69 - Math.abs(i - 2) * -0.005;
      ctx.save();
      ctx.globalAlpha = clamp(on * 1.5);
      flame(ctx, fx, fy, 0.09 * (0.7 + 0.3 * on), f.seconds, i * 1.7);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "lighter";
    const fl = flicker(f.seconds, 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, this.tilt);
    glow(ctx, glowSprite("255, 150, 60"), 0, 0, 3.4 * fl, 0.3 * on);
    ctx.restore();
    glow(ctx, glowSprite(LAMP_LIGHT), x, y - 0.72, 3.2 * fl, 0.4 * on);
    glow(ctx, glowSprite("255, 200, 120"), x, y - 0.72, 0.8 * fl, 0.6 * on);
    ctx.globalCompositeOperation = "source-over";
  }

  private thiruvathira(ctx: Ctx, f: Frame, env: Env, shown: number, lampOn: number) {
    const { p, seconds } = f;
    const now = audioNow();
    const clock = now ?? seconds;
    const beat = (clock / CLAP_BEAT) % 1;
    const count = Math.floor(clock / CLAP_BEAT);
    const dancing = rise(p, MOMENTS.dance[0] - 0.006, MOMENTS.dance[0]);
    // They go round slowly, a step for every two claps.
    const turn = (f.reduced ? 0 : clock * 0.09) * dancing + p * 8;
    const rx = 1.45;
    const ry = 1.45 * this.tilt * 1.05;
    const order = this.women.map((look, i) => {
      const a = turn + (i / this.women.length) * TAU;
      return {
        look,
        i,
        a,
        x: LAMP.x + Math.cos(a) * rx,
        y: LAMP.y + Math.sin(a) * ry,
      };
    });
    order.sort((a, b) => a.y - b.y);
    ctx.globalAlpha = shown;
    for (const w of order) {
      // Clap on the beat, hands low and wide between; a dip of the knees and a sway with it.
      const clap = dancing * (1 - clamp(Math.abs(beat - 0.02) * 5));
      const open = dancing * Math.sin(beat * Math.PI);
      const side = count % 4 < 2 ? 1 : -1;
      const back = w.y > LAMP.y + ry * 0.2;
      const d = Math.hypot(w.x - LAMP.x, (w.y - LAMP.y) / this.tilt);
      const pa = painter({ ...env, tint: WARM }, lampOn * 0.6 * clamp(1.4 - d * 0.4));
      const pose = {
        la: lerp(0.35, 0.55 + open * 0.25, 1 - clap) - clap * 0.1,
        lf: lerp(-1.9, 0.7 + open * 0.6, 1 - clap),
        ra: lerp(0.35, 0.55 + open * 0.25, 1 - clap) - clap * 0.1,
        rf: lerp(-1.9, 0.7 + open * 0.6, 1 - clap),
        lean: dancing * side * 0.08 * Math.sin(beat * Math.PI),
        bob: dancing * 0.025 * Math.sin(beat * Math.PI),
        spread: dancing * 0.4 * Math.abs(Math.sin(beat * Math.PI)),
      };
      drawFolk(ctx, w.x, w.y, { ...w.look, back }, pose, pa);
    }
    ctx.globalAlpha = 1;
  }

  // ─── The oottupura ─────────────────────────────────────────────────────────

  private hall(ctx: Ctx, f: Frame, env: Env) {
    const { p, seconds } = f;
    const tilt = this.tilt;
    const paint = painter(env);
    const up = clamp((tilt - 0.6) / 0.3);
    const served = p > MOMENTS.dishes[0];
    // The leaves, each with a steel tumbler of water beside it.
    for (const d of this.diners) {
      const ly = d.y + 0.45;
      const hero = d.x === LEAF.x && d.y === LEAF.y - 0.45;
      ctx.globalAlpha = hero ? 1 : 1 - up;
      if (!hero && up < 0.99) drawLeaf(ctx, d.x, ly, LEAF.length, tilt, p, false, 1 - up);
      // A steel tumbler of pink, spiced drinking water.
      const tx = d.x + 0.2;
      const ty = ly - 0.2 * tilt;
      ctx.fillStyle = paint([176, 182, 188]);
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.034, 0.034 * tilt, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = paint([226, 230, 234]);
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.031, 0.031 * tilt, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = paint([200, 104, 118]);
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.025, 0.025 * tilt, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawLeaf(ctx, LEAF.x, LEAF.y, LEAF.length, tilt, p, true);
    // The diners, sitting on the floor; they fade as the camera looks straight down at the leaf.
    for (const d of this.diners) {
      const hero = Math.abs(d.x - LEAF.x) < 1.2 && d.y > 2;
      const alpha = hero ? 1 - up : 1 - up * 0.6;
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      const eat = served ? Math.max(0, Math.sin(seconds * 1.3 + d.seed * 3)) ** 3 : 0;
      drawSitting(ctx, d.x, d.y, d.look, eat, paint);
    }
    ctx.globalAlpha = 1 - up;
    // Two men serving down the aisle, one with a bucket and ladle, one with a basket of pappadam.
    if (up < 0.99) {
      for (let i = 0; i < 2; i++) {
        const span = HALL.to - HALL.from - 3;
        const x = HALL.from + 1.5 + (((((seconds * 0.25 + i * 0.5) * span) % span) + span) % span);
        const y = 2.2;
        const look: Look = {
          h: 1,
          skin: SKIN[i + 1],
          woman: false,
          cloth: MUNDU,
          border: GOLD,
          top: null,
          hair: "short",
          towel: MUNDU,
          short: true,
        };
        const walk = Math.sin(seconds * 5 + i);
        const hands = drawFolk(
          ctx,
          x,
          y,
          look,
          {
            la: 0.2,
            lf: 0.2,
            ra: 0.5,
            rf: 0.4,
            spread: Math.abs(walk) * 0.5,
            bob: Math.abs(walk) * -0.01,
          },
          paint,
        );
        ctx.fillStyle = paint(i ? [200, 170, 110] : [190, 196, 200]);
        ctx.beginPath();
        ctx.ellipse(hands.right.x + 0.05, hands.right.y + 0.08, 0.13, 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = paint(i ? [240, 220, 170] : [220, 170, 60]);
        ctx.beginPath();
        ctx.ellipse(hands.right.x + 0.05, hands.right.y - 0.03, 0.12, 0.035, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (up < 0.99) {
      ctx.globalAlpha = 1 - up;
      drawHall(ctx, env, true);
      ctx.globalAlpha = 1;
    }
  }

  // ─── Thrissur ──────────────────────────────────────────────────────────────

  private street(ctx: Ctx, f: Frame, env: Env, left: number, right: number, now: number | null) {
    const { seconds, dt } = f;
    const paint = painter(env);
    const clock = now ?? seconds;
    const step = Math.floor(clock / PULI_STEP);
    const within = (clock % PULI_STEP) / PULI_STEP;
    // A beat every four steps; a pounce every two bars.
    const beat = ((step % 4) + within) / 4;
    const bar = Math.floor(step / 16);
    const pounce = step % 32 >= 24 ? Math.sin((((step % 32) - 24 + within) / 8) * Math.PI) : 0;
    const cheer = pounce;
    for (const c of this.crowd) {
      if (c.x < left || c.x > right) continue;
      const jump = Math.max(0, Math.sin(clock * 4 + c.seed * 3)) * 0.03 * cheer;
      const arm = cheer * (0.5 + 0.5 * Math.sin(c.seed * 7)) * 2.4;
      drawFolk(
        ctx,
        c.x,
        c.y - jump,
        c.look,
        {
          la: 0.15 + arm * 0.6,
          lf: 0.1 + arm,
          ra: 0.15 + arm * 0.5,
          rf: 0.1 + arm * 0.9,
        },
        paint,
      );
    }
    // The rope along the pavement.
    ctx.strokeStyle = paint([200, 180, 140]);
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(Math.max(STREET.from, left), 1.1);
    for (let x = Math.max(STREET.from, left); x < Math.min(STREET.to, right); x += 2) ctx.quadraticCurveTo(x + 1, 1.2, x + 2, 1.1);
    ctx.stroke();
    // The drummers behind the tigers: chendas, and a thakil or two.
    this.band.forEach((b, i) => {
      if (b.x < left || b.x > right) return;
      const hit = i % 3 === 2 ? 1 - within : Math.abs(Math.sin(((step % 2) + within) * Math.PI * 0.5));
      if (i % 3 === 2) {
        const hands = drawFolk(ctx, b.x, b.y, b.look, { la: 0.5, lf: 1.4 - hit * 0.6, ra: 0.5, rf: 1.4 - hit * 0.6 }, paint);
        ctx.fillStyle = paint([130, 70, 30]);
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - 0.58, 0.26, 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = paint([230, 214, 180]);
        ctx.beginPath();
        ctx.ellipse(hands.left.x + 0.02, b.y - 0.58, 0.035, 0.11, 0, 0, TAU);
        ctx.ellipse(hands.right.x - 0.02, b.y - 0.58, 0.035, 0.11, 0, 0, TAU);
        ctx.fill();
      } else {
        drawChenda(ctx, b.x, b.y, b.look, hit, step % 2, paint);
      }
    });
    // The tigers.
    for (const t of this.tigers) {
      if (t.x < left - 1 || t.x > right + 1) continue;
      t.shake = Math.max(0, t.shake - dt * 0.9);
      const own = Math.sin(clock * 2.1 + t.seed) * 0.5;
      const crouch = 0.5 + 0.5 * Math.sin(beat * TAU + t.seed * 0.3);
      const jiggle = Math.sin(clock * 26 + t.seed) * t.shake + Math.sin(beat * TAU * 2) * 0.12;
      const paw = clamp(0.25 + pounce * 0.9 + 0.2 * Math.sin(clock * 3 + t.seed));
      const x = t.x + own * 0.15 + (bar % 2 ? 1 : -1) * pounce * 0.15;
      const y = t.y + pounce * 0.2;
      // A shadow on the road under each.
      ctx.fillStyle = "rgba(20, 20, 24, 0.25)";
      ctx.beginPath();
      ctx.ellipse(x, y, 0.35 * t.tiger.h, 0.08 * t.tiger.h, 0, 0, TAU);
      ctx.fill();
      drawTiger(ctx, x, y, t.tiger, crouch, paw, jiggle, paint);
    }
    // The crowd on our side of the road.
    for (const c of this.near) {
      if (c.x < left || c.x > right || c.x > STREET.to) continue;
      drawFolk(ctx, c.x, c.y, c.look, { la: 0.15, lf: 0.1, ra: 0.15 + cheer * 1.5, rf: 0.2 + cheer * 2 }, paint);
    }
  }

  // ─── The Pamba ─────────────────────────────────────────────────────────────

  private river(ctx: Ctx, f: Frame, env: Env, left: number, right: number, now: number | null) {
    const { p, seconds } = f;
    const paint = painter(env);
    for (const b of this.banks) {
      if (b.x < left || b.x > right) continue;
      drawFolk(
        ctx,
        b.x,
        b.y,
        b.look,
        {
          la: 0.2,
          lf: 0.2,
          ra: 0.2 + Math.max(0, Math.sin(seconds + b.seed)) * 2,
          rf: 0.2 + Math.max(0, Math.sin(seconds + b.seed)) * 2.4,
        },
        paint,
      );
    }
    this.melamOnGhat(ctx, f, env, left, right, now);

    const phase = this.rowPhase(now, p);
    // The boats come down the river toward the ghat, and the camera rides along with them.
    const track = Math.max(TEMPLE.x - 0.5, camera(Math.max(p, 0.72), f.portrait).x - 0.4);
    this.boats[0].x = track + 1.6 - this.lead * 0.1;
    this.boats[1].x = track - this.lead * 0.5;
    // Coming in to the ghat, they draw nearer its steps.
    const landing = rise(p, 0.79, 0.832);
    this.boats[0].y = lerp(1.95, 1.2, landing);
    this.boats[1].y = lerp(3.55, 2.45, landing);
    const skins = SKIN;
    const singing = Math.sin(phase * TAU);
    for (const [i, boat] of this.boats.entries()) {
      const L = 12 * boat.scale;
      if (boat.x + L < left || boat.x - L > right) continue;
      const pb = painter(env, 0);
      // Heading left: the whole boat drawn mirrored about its middle.
      ctx.save();
      ctx.translate(boat.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-boat.x, 0);
      const line = drawHull(ctx, boat, env, f.reduced ? 0 : seconds);
      const n = 26;
      // The far row of rowers, a little in shadow, then the near row.
      for (const row of [0, 1]) {
        const rp = painter({ ...env, amb: env.amb * (row ? 1 : 0.75) }, 0);
        for (let k = 0; k < n; k++) {
          const x = lerp(line.from, line.to, k / (n - 1)) + (row ? 0 : 0.1);
          const h = 0.74 * boat.scale;
          const tip = drawRower(
            ctx,
            x,
            line.y - (row ? 0 : 0.05),
            h,
            (phase + k * 0.004 + i * 0.13) % 1,
            skins[(k + row + i) % skins.length],
            rp,
          );
          if (row && tip.dig && k % 3 === 0 && !f.reduced) {
            const s = clamp(((phase + i * 0.13) % 1) / 0.45);
            ctx.fillStyle = paint([240, 248, 246], 0.7 * (1 - s));
            ctx.beginPath();
            ctx.arc(tip.x + s * 0.1, line.y + 0.12 * boat.scale - s * 0.1, 0.05 * boat.scale * (1 - s * 0.5), 0, TAU);
            ctx.fill();
          }
        }
      }
      // The singers standing amidships, and the helmsmen at the stern with their long oars.
      const mid = lerp(line.from, line.to, 0.42);
      for (let k = 0; k < 3; k++) {
        const look: Look = {
          h: 0.9 * boat.scale,
          skin: skins[k + 1],
          woman: false,
          cloth: MUNDU,
          border: GOLD,
          top: null,
          hair: "wrap",
          towel: MUNDU,
        };
        const up = Math.max(0, singing) * 2.2;
        drawFolk(
          ctx,
          mid + k * 0.4 * boat.scale,
          line.y,
          look,
          {
            la: 0.4 + up * 0.5,
            lf: 0.2 + up,
            ra: 0.4 + up * 0.5,
            rf: 0.2 + up,
          },
          pb,
        );
      }
      for (let k = 0; k < 3; k++) {
        const sx = line.from - 0.9 * boat.scale + k * 0.35 * boat.scale;
        const sy = line.y - 0.15 * boat.scale - k * 0.05;
        const look: Look = {
          h: 0.9 * boat.scale,
          skin: skins[k],
          woman: false,
          cloth: MUNDU,
          border: GOLD,
          top: null,
          hair: "wrap",
          towel: null,
        };
        drawFolk(ctx, sx, sy, look, { la: 0.6, lf: 1.2, ra: 0.9, rf: 1.4 }, pb);
        ctx.strokeStyle = paint([110, 70, 36]);
        ctx.lineWidth = 0.03 * boat.scale;
        ctx.beginPath();
        ctx.moveTo(sx + 0.25 * boat.scale, sy - 0.75 * boat.scale);
        ctx.lineTo(sx - 0.7 * boat.scale, line.y + 0.35 * boat.scale);
        ctx.stroke();
      }
      drawMuthukkuda(
        ctx,
        line.from - 0.4 * boat.scale,
        line.y - 1.55 * boat.scale,
        0.6 * boat.scale,
        boat.umbrella,
        f.reduced ? 0 : seconds * 1.5,
        paint,
      );
      ctx.restore();
    }
    // Where the reader urged them on.
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      const age = seconds - s.born;
      if (age > 1.2) {
        this.splashes.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(240, 250, 246, ${0.6 * (1 - age / 1.2)})`;
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 0.2 + age * 0.8, (0.2 + age * 0.8) * 0.3, 0, 0, TAU);
      ctx.stroke();
    }
    // The crowd on the near bank, their backs to us.
    for (const c of this.near) {
      if (c.x < left || c.x > right || c.x < RIVER.from) continue;
      const cheer = Math.max(0, Math.sin(seconds * 2 + c.seed)) * rise(p, 0.76, 0.8);
      drawFolk(ctx, c.x, c.y, c.look, { la: 0.15 + cheer * 1.4, lf: 0.2 + cheer * 2.2, ra: 0.15, rf: 0.1 }, paint);
    }
  }

  private melamOnGhat(ctx: Ctx, f: Frame, env: Env, left: number, right: number, now: number | null) {
    if (TEMPLE.x + 6 < left || TEMPLE.x - 6 > right) return;
    const { p, seconds } = f;
    const playing = rise(p, MOMENTS.melam[0] - 0.01, MOMENTS.melam[0]) * (1 - rise(p, MOMENTS.melam[1] + 0.01, MOMENTS.melam[1] + 0.03));
    const { phase, n } = this.melamPhase(now, p);
    const lamps = clamp((p - 0.8) / 0.03);
    const paint = painter({ ...env, tint: WARM }, lamps * 0.25);
    // Muthukkuda held up behind the band.
    const colours: RGB[] = [
      [200, 30, 40],
      [240, 180, 30],
      [40, 110, 190],
      [220, 90, 150],
      [60, 150, 90],
    ];
    for (let i = 0; i < 5; i++) {
      drawMuthukkuda(ctx, TEMPLE.x - 3.2 + i * 1.6, -2.35 - (i % 2) * 0.2, 0.7, colours[i], f.reduced ? 0 : seconds * 0.6 + i, paint);
    }
    for (const m of this.melamBand) {
      // Each player a hair behind or ahead of the beat, swaying to it in his own way.
      const own = ((phase - (m.seed % 1) * 0.14 + 1) % 1) as number;
      const hit = playing > 0 ? 1 - Math.pow(own, 0.5) : 0.35 + 0.1 * Math.sin(m.seed);
      const lean = f.reduced ? 0 : Math.sin(seconds * (1.2 + (m.seed % 0.5)) + m.seed) * 0.06 * (0.4 + playing);
      const alt = (n + Math.floor(m.seed)) % 2;
      if (m.role === "chenda") drawChenda(ctx, m.x, m.y, m.look, hit, alt, paint, lean);
      else if (m.role === "ilathalam") drawIlathalam(ctx, m.x, m.y, m.look, playing > 0 ? Math.pow(own, 0.6) : 0.2, paint, lean);
      else if (m.role === "kombu") drawKombu(ctx, m.x, m.y, m.look, playing * (0.5 + 0.5 * Math.sin(seconds * 0.7 + m.seed * 3)), paint);
      else {
        // The kuzhal, a short double-reed pipe with a flared bell, held up to the lips.
        const hands = drawFolk(ctx, m.x, m.y, m.look, { la: 0.25, lf: -2.3, ra: 0.25, rf: -2.1 }, paint);
        const h = m.look.h;
        const mouth = { x: m.x, y: m.y - h * 0.86 };
        const tip = {
          x: (hands.left.x + hands.right.x) / 2 + h * 0.02,
          y: Math.max(hands.left.y, hands.right.y) + h * 0.12,
        };
        ctx.strokeStyle = paint([90, 56, 30]);
        ctx.lineWidth = h * 0.025;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(mouth.x, mouth.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        ctx.fillStyle = paint([214, 170, 80]);
        ctx.beginPath();
        ctx.ellipse(tip.x, tip.y, h * 0.035, h * 0.018, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  // ─── Words on the scene ────────────────────────────────────────────────────

  /** On wide screens, a wash from the caption's edge toward the middle while it shows, for the bright scenes. */
  /** In portrait the pookalam shot looks down past the house's plinth; let the top of the frame sink into shade under the header. */
  private headerWash(ctx: Ctx, f: Frame) {
    if (!f.portrait) return;
    const o = clamp((f.p - 0.194) / 0.008) * clamp((0.322 - f.p) / 0.014);
    if (o <= 0.01) return;
    const h = Math.min(170, f.height * 0.2);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(18, 12, 8, ${0.97 * o})`);
    g.addColorStop(0.5, `rgba(18, 12, 8, ${0.78 * o})`);
    g.addColorStop(1, "rgba(18, 12, 8, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, f.width, h);
  }

  private captionShade(ctx: Ctx, f: Frame) {
    if (f.portrait) return;
    for (const [i, chapter] of onam.chapters.entries()) {
      const o = windowOpacity(f.p, chapter.window) * SHADE[i];
      if (o <= 0.01) continue;
      const left = chapter.side === "left";
      const edge = left ? 0 : f.width;
      const mid = f.width * (left ? 0.5 : 0.5);
      const g = ctx.createLinearGradient(edge, 0, mid, 0);
      g.addColorStop(0, `rgba(12, 6, 4, ${0.55 * o})`);
      g.addColorStop(0.55, `rgba(12, 6, 4, ${0.3 * o})`);
      g.addColorStop(1, "rgba(12, 6, 4, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(left ? 0 : mid, 0, f.width / 2, f.height);
    }
  }

  private labels(ctx: Ctx, f: Frame, v: View) {
    const { p } = f;
    const day = p > 0.19 && p < 0.33 ? dayLabel(p) : null;
    const served = p > 0.355 && p < 0.445 ? servedLabel(p) : null;
    if (!day && !served) return;
    this.fonts ??= {
      ml: fontOf("--font-malayalam", "serif"),
      serif: fontOf("--font-serif", "Georgia, serif"),
      sc: fontOf("--font-sc", "Georgia, serif"),
    };
    const fonts = this.fonts;
    const small = f.portrait ? 0.85 : 1;
    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(10, 6, 4, 0.85)";
    ctx.shadowBlur = 14;
    if (day && day.alpha > 0.01) {
      const at = toScreen(v, POOKALAM.x, POOKALAM.y - POOKALAM.r * this.tilt - 0.32);
      const y = Math.max(f.portrait ? 120 : 70, at.y);
      const [ml, en] = DAYS[day.day];
      ctx.globalAlpha = day.alpha;
      ctx.fillStyle = "#f6ecd2";
      ctx.font = `${Math.round(34 * small)}px ${fonts.ml}`;
      ctx.fillText(ml, at.x, y);
      ctx.font = `${Math.round(15 * small)}px ${fonts.sc}`;
      ctx.letterSpacing = "3px";
      ctx.fillStyle = "rgba(246, 236, 210, 0.85)";
      ctx.fillText(`${en.toLowerCase()} · day ${day.day + 1} of ten`, at.x, y + 24 * small);
      ctx.letterSpacing = "0px";
    }
    if (served && served.alpha > 0.01) {
      const leafTop = toScreen(v, LEAF.x, LEAF.y - (LEAF.length * ASPECT * this.tilt) / 2).y;
      const leafBottom = toScreen(v, LEAF.x, LEAF.y + (LEAF.length * ASPECT * this.tilt) / 2).y;
      const cx = toScreen(v, LEAF.x, LEAF.y).x;
      const y = f.portrait ? leafTop - 44 : leafBottom + 46;
      {
        const { dish, alpha } = served;
        ctx.globalAlpha = alpha;
        // A ring round the dish on the leaf.
        const at = toScreen(
          v,
          LEAF.x - LEAF.length / 2 + dish.x * LEAF.length,
          LEAF.y - (LEAF.length * ASPECT * this.tilt) / 2 + dish.y * LEAF.length * this.tilt,
        );
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255, 240, 200, ${0.6 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(at.x, at.y, 0.045 * LEAF.length * v.scale + 6, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#f6ecd2";
        ctx.font = `${Math.round(28 * small)}px ${fonts.ml}`;
        ctx.fillText(dish.ml, cx, y);
        ctx.font = `italic ${Math.round(18 * small)}px ${fonts.serif}`;
        ctx.fillStyle = "rgba(246, 236, 210, 0.85)";
        ctx.fillText(dish.en, cx, y + 26 * small);
      }
    }
    ctx.restore();
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind !== "down" || !this.v) return;
    if (f.seconds - this.lastTouch < 0.12 && !f.reduced) return;
    const world = toWorld(this.v, x, y);
    const p = f.p;
    if (p > 0.195 && p < 0.33) {
      const lx = (world.x - POOKALAM.x) / POOKALAM.r;
      const ly = (world.y - POOKALAM.y) / (POOKALAM.r * this.tilt);
      if (Math.hypot(lx, ly) < 1.05) {
        this.lastTouch = f.seconds;
        this.pookalam.add(lx, ly, f.seconds);
        this.emit("flower");
      }
      return;
    }
    if (p > 0.585 && p < 0.7) {
      for (const t of this.tigers) {
        const h = t.tiger.h;
        if (Math.abs(world.x - t.x) < 0.4 * h && world.y < t.y + 0.1 && world.y > t.y - h * 1.1) {
          t.shake = 1;
          this.lastTouch = f.seconds;
          this.emit("tiger");
          return;
        }
      }
      return;
    }
    if (p > 0.715 && p < 0.85 && world.x > RIVER.from) {
      this.lastTouch = f.seconds;
      rowing.boost = Math.min(1, rowing.boost + 0.3);
      this.splashes.push({
        x: world.x,
        y: clamp(world.y, WATER.far + 0.2, WATER.near + 1),
        born: f.seconds,
      });
      if (this.splashes.length > 12) this.splashes.shift();
      this.emit("row");
    }
  }
}

export const createScene = (emit: Emit): Scene => new Onam(emit);
