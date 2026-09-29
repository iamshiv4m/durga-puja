// Janmashtami, as one continuous shot. It opens wide on Kamsa's fort in the monsoon storm and
// moves in through the barred arch of the prison; at midnight the light, and the gates open. Then it
// follows Vasudeva out with the basket on his head, through the rain and into the Yamuna in flood,
// under Sheshnaag's hoods, to Gokul at dawn. From there it rises into the monsoon cloud and comes
// down on a Vrindavan temple at midnight today, then on a street in Maharashtra for the Dahi Handi,
// and last by the Yamuna at dawn, where a flute lies under a kadamba tree.
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
  shot,
  toWorld,
  view,
  type Ctx,
  type Shot,
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";
import { janmashtami } from "./content";
import { DIVINE, Fort, VASUDEVA, type Light } from "./fort";
import { Ghat } from "./ghat";
import { Gokul } from "./gokul";
import { Handi } from "./handi";
import { drawPerson } from "./people";
import { River, type RiverState } from "./river";
import { Temple } from "./temple";
import { Weather } from "./weather";
import {
  FORT,
  GRADE,
  GRADE_ALPHA,
  LATER,
  MOMENTS,
  PORTRAIT_LATER,
  PORTRAIT_SHOTS,
  SHOTS,
  hop,
  storm,
  track,
  vasudeva,
} from "./world";

export { MOMENTS };

const BASKET_FLOOR = { x: 1.42, y: FORT.floor + 0.02 };

/** A shallow basket of woven bamboo with the child in it: yellow cloth, and two small feet. */
export function drawBasket(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  warm: number,
  child: number,
) {
  const h = w * 0.36;
  const cane = mix([120, 84, 44], [240, 200, 120], warm);
  // The child, swaddled in pitambar, yellow silk.
  if (child > 0.01) {
    ctx.globalAlpha = child;
    ctx.fillStyle = rgb(mix([200, 150, 40], [255, 226, 120], warm));
    ctx.beginPath();
    ctx.ellipse(x - w * 0.05, y - h * 0.95, w * 0.34, h * 0.5, -0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgb(mix([150, 100, 70], [255, 206, 170], warm));
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y - h * 1.18, w * 0.06, w * 0.035, -0.5, 0, TAU);
    ctx.ellipse(x + w * 0.36, y - h * 1.08, w * 0.06, w * 0.035, -0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = rgb(cane);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x + w * 0.36, y);
  ctx.lineTo(x - w * 0.36, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(mix(cane, [40, 24, 10], 0.45));
  ctx.lineWidth = w * 0.025;
  ctx.beginPath();
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    ctx.moveTo(lerp(x - w / 2, x - w * 0.36, 0) + t * w, y - h);
    ctx.lineTo(x - w * 0.36 + t * w * 0.72 - w * 0.08, y);
  }
  for (let i = 1; i < 3; i++) {
    const yy = y - h + (i / 3) * h;
    const inset = (i / 3) * w * 0.14;
    ctx.moveTo(x - w / 2 + inset, yy);
    ctx.lineTo(x + w / 2 - inset, yy);
  }
  ctx.stroke();
  ctx.strokeStyle = rgb(mix(cane, [255, 240, 200], 0.3));
  ctx.lineWidth = w * 0.05;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x + w / 2, y - h);
  ctx.stroke();
}

/** How much each chapter's caption side is dimmed: little in the dark night, more in daylight and lamplight. */
const SCRIM = [0.3, 0.5, 0.35, 0.55, 0.5, 0.86, 0.5];

class Janmashtami implements Scene {
  private readonly emit: Emit;
  private readonly weather = new Weather();
  private readonly fort = new Fort();
  private readonly river = new River();
  private readonly gokul = new Gokul();
  private readonly temple: Temple;
  private readonly handi: Handi;
  private readonly ghat = new Ghat();
  private readonly random = mulberry32(415);
  private lights: Light[] = [];
  private rays: { x: number; y: number; a: number } | null = null;
  private v: View | null = null;
  private nextStrike = 1.5;
  private lastP = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    this.temple = new Temple(emit);
    this.handi = new Handi(emit);
  }

  private camera(p: number, portrait: boolean) {
    const early = shot(portrait ? PORTRAIT_SHOTS : SHOTS, p);
    const later = shot(portrait ? PORTRAIT_LATER : LATER, p);
    const V = vasudeva(p);
    // Following Vasudeva: he is kept clear of each caption's side, and the camera lifts as the river does.
    const side = portrait
      ? 0
      : lerp(lerp(2.3, -2.6, rise(p, 0.255, 0.29)), 2.6, rise(p, 0.405, 0.44));
    const surge =
      rise(p, MOMENTS.surge[0], MOMENTS.touch) *
      (1 - rise(p, MOMENTS.part[1], MOMENTS.bank));
    const follow = {
      x: V.x + side,
      y: lerp(-1.7, -1.9, surge) - (portrait ? 0.2 : 0),
      zoom:
        (portrait ? 1.25 : 1.02) *
        lerp(1, 0.86, surge) *
        lerp(1, 1.08, rise(p, 0.3, 0.32)),
    };
    const into = rise(p, 0.238, 0.262);
    const out = rise(p, 0.425, 0.445);
    const mixShot = (a: Shot | typeof follow, b: typeof follow, t: number) => ({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)),
    });
    let cam = p < 0.44 ? mixShot(early, follow, into) : later;
    if (p >= 0.425 && p < 0.44) cam = mixShot(follow, later, out);
    // Up through the cloud between places.
    const flights = [MOMENTS.flight1, MOMENTS.flight2, MOMENTS.flight3];
    const up = Math.max(...flights.map((w) => hop(p, w)));
    return {
      x: cam.x,
      y: cam.y - up * 11,
      zoom: cam.zoom / (1 + 2.4 * up),
      up,
    };
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p, seconds } = f;
    const cam = this.camera(p, f.portrait);
    const unit = Math.min(width, height) / 8;
    const v = view(width, height, cam, unit, f.portrait ? 0.4 : 0.5);
    this.v = v;
    this.lights = [];
    this.rays = null;
    const rain = storm(p);

    // The storm's own lightning, not during the hush before midnight.
    const hushed = p > MOMENTS.hush[0] - 0.004 && p < 0.222;
    if (
      !f.reduced &&
      p > 0.004 &&
      p < 0.415 &&
      !hushed &&
      seconds > this.nextStrike
    ) {
      const near = p > MOMENTS.surge[0] && p < MOMENTS.touch + 0.01;
      this.nextStrike =
        seconds + (near ? 1.2 : 2.6) + this.random() * (near ? 2 : 4.5);
      const x = v.x + (this.random() - 0.5) * (v.width / v.scale) * 0.9;
      this.weather.strike(x, -1 - this.random() * 2, seconds);
      this.emit(near || this.random() < 0.4 ? "thunder-near" : "thunder");
    }
    if (p !== this.lastP && Math.abs(p - this.lastP) < 0.02)
      this.cues(p, this.lastP);
    this.lastP = p;

    const born = rise(p, MOMENTS.birth, MOMENTS.birth + 0.006);
    const moon =
      born * (1 - rise(p, 0.28, 0.31)) * 0.9 +
      rise(p, 0.585, 0.6) * (1 - rise(p, 0.652, 0.665));
    const sun =
      rise(p, 0.45, 0.48) * (1 - rise(p, 0.53, 0.55)) + rise(p, 0.86, 0.9);
    const stars = rise(p, 0.575, 0.59) * (1 - rise(p, 0.652, 0.665));
    this.weather.sky(ctx, v, p, seconds, moon, sun, stars);

    ctx.save();
    apply(ctx, v);
    this.weather.lightning(ctx, v, seconds);
    const flash = this.weather.flash;
    this.weather.clouds(ctx, v, p, seconds, p * 6);

    // Mathura, the river and Gokul.
    const V = vasudeva(p);
    const fortState = this.fortState(p, seconds, flash);
    this.fort.drawSkyline(ctx, v, fortState);
    const riverState = this.riverState(p, seconds, flash, rain, V.x);
    this.river.drawBack(ctx, v, riverState);
    this.fort.drawGround(ctx, v, fortState, 6);
    this.gokul.drawGround(ctx, v, p);
    this.river.drawBanks(
      ctx,
      v,
      riverState,
      [30, 30, 38],
      mix([30, 30, 38], [150, 120, 80], rise(p, 0.44, 0.48)),
    );
    const devaki = this.fort.drawBack(ctx, v, fortState);
    const child = this.childAt(p, devaki);
    fortState.child = child.pos;
    if (V.inside) this.drawVasudeva(ctx, p, seconds, V, child, riverState);
    this.fort.drawFront(ctx, v, fortState);
    this.gokul.drawBack(ctx, v, p, seconds, this.lights);
    if (!V.inside) this.drawVasudeva(ctx, p, seconds, V, child, riverState);
    this.river.drawFront(ctx, v, riverState);
    this.gokul.drawFront(ctx, v, p, seconds, this.lights);
    this.lights.push(...fortState.lights, ...riverState.lights);

    this.temple.draw(ctx, v, f, this.lights);
    this.handi.draw(ctx, v, f, this.lights);
    this.ghat.draw(ctx, v, f, this.lights);
    ctx.restore();

    // Night over Gokul before the dawn comes.
    const gradeA = track(GRADE_ALPHA, p);
    if (gradeA > 0.005) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = rgb(track(GRADE, p), gradeA);
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
    }

    // All the light at once.
    ctx.save();
    apply(ctx, v);
    ctx.globalCompositeOperation = "lighter";
    for (const l of this.lights)
      glow(ctx, glowSprite(l.color), l.x, l.y, l.r, l.a);
    this.drawRays(ctx, seconds);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    this.weather.rain(ctx, width, height, rain, seconds, f.reduced);
    this.weather.mist(
      ctx,
      width,
      height,
      p,
      clamp(cam.up * 1.5 - 0.35),
      seconds,
    );
    if (flash > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(120, 135, 190, ${flash * 0.16})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
    }

    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      Math.min(width, height) * 0.3,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    vignette.addColorStop(0, "rgba(2, 3, 8, 0)");
    vignette.addColorStop(
      1,
      `rgba(2, 3, 8, ${0.62 - 0.3 * rise(p, 0.46, 0.5) * (1 - rise(p, 0.56, 0.58)) - 0.3 * rise(p, 0.68, 0.7) * (1 - rise(p, 0.83, 0.85))})`,
    );
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    if (!f.portrait) this.scrim(ctx, width, height, p);
  }

  /** Dusk on the caption's side of the frame while a chapter is being read, so the text stays legible. */
  private scrim(ctx: Ctx, width: number, height: number, p: number) {
    for (const [i, c] of janmashtami.chapters.entries()) {
      const [a, b, , e] = c.window;
      // Leads and trails the caption slightly: the scene's progress is eased, the caption's is not.
      const on = rise(p, a - 0.015, b - 0.005) * (1 - rise(p, e, e + 0.02));
      if (on < 0.01) continue;
      const a0 = on * SCRIM[i];
      const left = c.side === "left";
      const g = ctx.createLinearGradient(
        left ? 0 : width,
        0,
        left ? width * 0.5 : width * 0.5,
        0,
      );
      g.addColorStop(0, `rgba(10, 8, 18, ${a0})`);
      g.addColorStop(0.5, `rgba(10, 8, 18, ${a0})`);
      g.addColorStop(0.7, `rgba(10, 8, 18, ${a0 * 0.85})`);
      g.addColorStop(1, "rgba(10, 8, 18, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  }

  /** Rays of the midnight light, turning slowly, out through the bars into the rain. */
  private drawRays(ctx: Ctx, seconds: number) {
    const r = this.rays;
    if (!r || r.a < 0.01) return;
    const length = 11;
    const gradient = ctx.createRadialGradient(r.x, r.y, 0.2, r.x, r.y, length);
    gradient.addColorStop(0, `rgba(255, 226, 160, ${0.34 * r.a})`);
    gradient.addColorStop(0.35, `rgba(255, 210, 140, ${0.12 * r.a})`);
    gradient.addColorStop(1, "rgba(255, 200, 120, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + seconds * 0.04 + Math.sin(i * 2.3) * 0.08;
      const w = 0.035 + (i % 3) * 0.02;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(
        r.x + Math.cos(a - w) * length,
        r.y + Math.sin(a - w) * length,
      );
      ctx.lineTo(
        r.x + Math.cos(a + w) * length,
        r.y + Math.sin(a + w) * length,
      );
      ctx.closePath();
    }
    ctx.fill();
  }

  /** One-shot moments the score hears as the scroll crosses them. */
  private cues(p: number, previous: number) {
    const crossed = (at: number) => previous < at && p >= at;
    if (crossed(MOMENTS.birth)) this.emit("birth");
    if (crossed(MOMENTS.touch)) this.emit("touch");
  }

  private fortState(p: number, seconds: number, flash: number) {
    const blaze =
      rise(p, MOMENTS.birth, MOMENTS.birth + 0.004) *
      (1 - rise(p, MOMENTS.birth + 0.006, 0.23));
    return {
      p,
      seconds,
      flash,
      born: rise(p, MOMENTS.birth, MOMENTS.birth + 0.006),
      blaze,
      chains: rise(p, MOMENTS.chains, MOMENTS.chains + 0.005),
      lock: rise(p, MOMENTS.lock, MOMENTS.lock + 0.004),
      sleep: rise(p, MOMENTS.sleep[0], MOMENTS.sleep[1]),
      open: rise(p, MOMENTS.doors[0], MOMENTS.doors[1]),
      child: null as { x: number; y: number } | null,
      lights: [] as Light[],
    };
  }

  private riverState(
    p: number,
    seconds: number,
    flash: number,
    rain: number,
    vx: number,
  ): RiverState {
    return {
      p,
      seconds,
      flash,
      storm: rain,
      vx,
      surge:
        rise(p, MOMENTS.surge[0], MOMENTS.touch) *
        (1 - rise(p, MOMENTS.touch + 0.001, MOMENTS.part[0] + 0.008)),
      part: rise(p, MOMENTS.part[0], MOMENTS.part[1]),
      shesh:
        rise(p, MOMENTS.shesh[0], MOMENTS.shesh[1]) *
        (1 - rise(p, 0.405, 0.425)),
      calm: 0,
      lights: [],
    };
  }

  /** Where the child is: in Devaki's arms, then laid in the basket. */
  private childAt(p: number, devaki: { x: number; y: number } | null) {
    if (p < MOMENTS.birth) return { pos: null, stage: 0 };
    const arms = devaki ?? { x: -0.5, y: -0.8 };
    const t = rise(p, 0.238, 0.244);
    if (t < 1)
      return {
        pos: {
          x: lerp(arms.x, BASKET_FLOOR.x, t),
          y:
            lerp(arms.y, BASKET_FLOOR.y - 0.12, t) -
            Math.sin(t * Math.PI) * 0.4,
        },
        stage: 1,
      };
    return { pos: null, stage: 2 };
  }

  private drawVasudeva(
    ctx: Ctx,
    p: number,
    seconds: number,
    V: ReturnType<typeof vasudeva>,
    child: { pos: { x: number; y: number } | null; stage: number },
    river: RiverState,
  ) {
    if (V.alpha <= 0.01) return;
    const warm = rise(p, MOMENTS.birth, MOMENTS.birth + 0.006);
    const look = { ...VASUDEVA, h: VASUDEVA.h * V.scale };
    const up = V.carry;
    const facing: 1 | -1 = up > 0 || p > 0.25 ? 1 : -1;
    const inRiver = V.x > 6.5 && V.x < 21.8;
    const head = {
      x: V.x + 0.01,
      y: V.y - look.h * 1.0 + V.walking * Math.abs(Math.sin(V.x * 5.5)) * -0.02,
    };
    if (p > 0.43) river.shesh = 0;
    // Sheshnaag rises behind him, his hoods over the basket.
    if (up >= 0.99 && river.shesh > 0.01)
      this.river.drawSerpent(ctx, river, head);
    ctx.globalAlpha = V.alpha;
    drawPerson(
      ctx,
      V.x,
      V.y,
      look,
      {
        la: lerp(0.5, 2.85, up),
        lf: lerp(1.3, 3.3, up),
        ra: lerp(0.45, 2.75, up),
        rf: lerp(1.35, 3.8, up),
        sit: V.sit,
        nod: lerp(0.1, -0.05, warm) * (1 - up),
        step: V.x * 5.5,
        stride: V.walking * (inRiver ? 0.25 : 0.5),
        bob: V.walking * Math.abs(Math.sin(V.x * 5.5)) * -0.012,
      },
      facing,
    );
    // The basket: on the floor, then up on his head.
    const bx = lerp(BASKET_FLOOR.x, head.x, up);
    const by = lerp(BASKET_FLOOR.y, head.y, up);
    const inBasket = child.stage === 2 ? 1 : 0;
    drawBasket(ctx, bx, by, 0.62, warm, inBasket);
    ctx.globalAlpha = 1;
    if (inBasket) {
      const flicker = 0.92 + 0.08 * Math.sin(seconds * 3.1);
      const touch =
        rise(p, MOMENTS.touch - 0.004, MOMENTS.touch) *
        (1 - rise(p, MOMENTS.touch + 0.002, MOMENTS.part[1]));
      const a = V.alpha * flicker;
      this.lights.push({
        x: bx,
        y: by - 0.25,
        r: 1.1,
        a: 0.8 * a,
        color: DIVINE,
      });
      this.lights.push({
        x: bx,
        y: by - 0.2,
        r: 4.2,
        a: (0.28 + touch * 0.25) * a,
        color: DIVINE,
      });
      if (touch > 0)
        this.lights.push({
          x: bx + 0.25,
          y: by - 0.05,
          r: 1.5,
          a: 0.6 * touch,
          color: "255, 250, 230",
        });
      if (inRiver)
        this.lights.push({
          x: bx,
          y: river.vx ? this.river.surface(bx, river) : by,
          r: 2.5,
          a: 0.25 * a,
          color: DIVINE,
        });
    }
    if (child.pos) {
      this.lights.push({
        x: child.pos.x,
        y: child.pos.y,
        r: 0.8,
        a: 0.75,
        color: "255, 246, 220",
      });
      this.lights.push({
        x: child.pos.x,
        y: child.pos.y,
        r: 3.2,
        a: 0.45,
        color: DIVINE,
      });
      this.lights.push({
        x: child.pos.x,
        y: child.pos.y,
        r: 8,
        a: 0.22 * warm,
        color: DIVINE,
      });
      this.rays = { ...child.pos, a: warm * (1 - rise(p, 0.236, 0.244)) };
    }
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    const v = this.v;
    if (!v) return;
    const world = toWorld(v, x, y);
    const p = f.p;
    // Lightning wherever the stormy sky is touched.
    if (kind === "down" && p > 0.03 && p < 0.415 && y < v.height * 0.62) {
      this.weather.strike(world.x, Math.max(world.y, -2), f.seconds);
      this.emit("lightning");
      return;
    }
    this.temple.pointer(world, kind, f);
    this.handi.pointer(world, kind, f);
  }
}

export function createScene(emit: Emit): Scene {
  return new Janmashtami(emit);
}
