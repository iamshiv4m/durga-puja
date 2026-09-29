// Rongali Bihu, as one continuous shot along a village in the Brahmaputra valley: the kopou tree by
// the namghar at the end of Chot, the sun going down and coming up again on the cattle at the pond,
// the new year's gamosa given on the verandah, the husori singing in the courtyard, the dance under
// the mango trees in the long gold afternoon, and the night in the open fields, full of fireflies.
//
// World units, y down (see layout.ts). The world is painted in daylight colours on its own layer,
// then graded for the hour; light (lamps, fireflies, sun through leaves) is added on top.
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
  onScreen,
  rgb,
  rise,
  shot,
  toScreen,
  toWorld,
  view,
  flicker,
  type Ctx,
  type RGB,
  type View,
} from "../paint";
import type { Emit, Frame, Scene } from "../types";
import { Air, Fireflies, cloudSprite } from "./air";
import { bihu } from "./content";
import {
  BATSORA,
  COURT,
  FIELD,
  GRADE,
  GRADE_ALPHA,
  HORIZON,
  HOUSE,
  HUSORI_BEAT,
  KOPOU,
  MOMENTS,
  NAACH_BEAT,
  NAMGHAR,
  POND,
  PORTRAIT_SHOTS,
  RING,
  SHOTS,
  SKY_LOW,
  SKY_TOP,
  SUN_UP,
  TOLI,
  darkness,
  track,
} from "./layout";
import { dancePose, drawCow, drawFigure, makeLook, type Cow, type Look, type Pose } from "./people";
import {
  areca,
  bamboo,
  banana,
  batsora,
  bhoral,
  fields,
  grassChunks,
  house,
  loom,
  mangoTree,
  namghar,
  orchidLeaves,
  raceme,
  shadeTree,
  sprite,
  stamp,
  teaRows,
  tulsi,
  valley,
  type Sprite,
} from "./places";
import * as pose from "./poses";

export { MOMENTS } from "./layout";

type Actor = { y: number; draw: () => void };
type Tree = { sprite: Sprite; x: number; y: number; flip: boolean };
type Raceme = { x: number; y: number; variant: number; scale: number; seed: number };
type Role = "dhol" | "pepa" | "taal" | "gogona" | "toka" | "clap" | "leap" | "watch" | "sit" | "dance";
type Person = { look: Look; x: number; y: number; seed: number; role: Role; facing: 1 | -1 };
type Member = { look: Look; role: Role; angle: number; seed: number; gifted: boolean; start: number };
type Beast = { cow: Cow; x: number; y: number; facing: 1 | -1; seed: number; wet: number; shake: number; inWater: boolean };
type Toss = { from: { x: number; y: number }; member: number; age: number };
type Pulse = { x: number; y: number; age: number };

const SUN = "255, 200, 130";
const LAMP = "255, 170, 80";
const WATER: RGB = [96, 132, 138];

class Bihu implements Scene {
  private readonly emit: Emit;
  private readonly stars: { x: number; y: number; r: number; seed: number }[] = [];
  private readonly clouds: { x: number; h: number; s: number; speed: number; kind: number }[] = [];
  private readonly trees: Tree[] = [];
  private readonly racemes: Raceme[] = [];
  private readonly yard: Person[] = [];
  private readonly beasts: Beast[] = [];
  private readonly boys: Person[] = [];
  private readonly members: Member[] = [];
  private readonly dancers: Person[] = [];
  private readonly band: Person[] = [];
  private readonly crowd: Person[] = [];
  private readonly night: Person[] = [];
  private readonly home: Record<"grandfather" | "grandmother" | "son" | "daughter" | "weaver" | "girl" | "boy", Look>;
  private readonly air = new Air();
  private readonly flies = new Fireflies(38, 66, 150, 77);
  private readonly village = new Fireflies(-30, 38, 110, 91);
  private backdrop: ReturnType<typeof valley> | null = null;
  private grass: ReturnType<typeof grassChunks> | null = null;
  private paddy: ReturnType<typeof fields> | null = null;
  private tea: Sprite | null = null;
  private layer: HTMLCanvasElement | null = null;
  private v: View | null = null;
  private unit = 100;
  private zoom = 1;
  private previous = 0;
  private tosses: Toss[] = [];
  private pulses: Pulse[] = [];
  private shaken = -10;
  private struck = -10;
  private nextSplash = 0;
  private nextDrift = 0;
  private spin = 0;
  private naachBeat = 0;
  private nightSpin = 0;

  constructor(emit: Emit) {
    this.emit = emit;
    const random = mulberry32(1404);
    for (let i = 0; i < 260; i++) this.stars.push({ x: random(), y: random() ** 1.4, r: 0.4 + random() * 1.1, seed: random() * 10 });
    for (let i = 0; i < 7; i++)
      this.clouds.push({ x: random(), h: 0.25 + random() * 0.4, s: 0.7 + random() * 0.7, speed: 0.4 + random() * 0.6, kind: i % 3 });

    // The trees of the village, back to front.
    const tree = (s: Sprite, x: number, y: number, flip = false) => this.trees.push({ sprite: s, x, y, flip });
    tree(bamboo(1), -44, -0.5);
    tree(bamboo(2), -35.5, -0.7, true);
    tree(shadeTree(3), -41.5, 1.3);
    tree(shadeTree(4), -37.2, 1.8);
    tree(shadeTree(5), -46, 1.9);
    tree(areca(6, 7.5), -33.2, -0.4);
    tree(areca(7, 6.5), -32.4, -0.1);
    tree(mangoTree("kopou-tree", KOPOU.size, 7), KOPOU.x, KOPOU.y);
    tree(bamboo(8), -13.4, -0.4);
    tree(areca(9, 7), -12.2, -0.2);
    tree(banana(10), -14.6, 0.5);
    tree(mangoTree("pond-mango", 0.5, 11), -1.4, -0.6, true);
    tree(areca(12, 7.2), 1.2, -0.2);
    tree(areca(13, 6.4), 2.3, 0.15);
    tree(banana(14), 0.4, 0.55, true);
    tree(areca(15, 7), 18.9, -0.25);
    tree(banana(16), 17.9, 0.45);
    tree(bamboo(17), 21.2, -0.5, true);
    tree(areca(18, 7.6), 22.6, -0.1);
    tree(mangoTree("toli-west", 0.85, 19), 26.0, 0.1);
    tree(mangoTree("toli-east", 0.72, 20), 36.6, -0.1, true);
    tree(areca(21, 6.8), 39.4, -0.3);
    tree(bamboo(22), 41.6, -0.6);
    tree(areca(23, 7.4), 56.5, -0.8);
    tree(bamboo(24), 60.5, -0.8, true);
    tree(mangoTree("far-mango", 0.5, 25), 64.5, -0.7);

    // The kopou, hanging in tails under the crown of the old mango.
    for (let i = 0; i < 26; i++) {
      const lx = -4.9 + (i / 25) * 9.8 + (random() - 0.5) * 0.4;
      const edge = -3.3 - 0.8 * (1 - (Math.abs(lx) / 5.2) ** 2);
      this.racemes.push({
        x: KOPOU.x + lx * KOPOU.size,
        y: KOPOU.y + (edge + 0.15 + random() * 0.35) * KOPOU.size,
        variant: i % 3,
        scale: 1.0 + random() * 0.5,
        seed: random() * 10,
      });
    }

    // At the namghar: the young practising the first songs, an old man watching.
    const yard: [number, number, Role, boolean][] = [
      [-28.2, 1.0, "dhol", false],
      [-27.1, 1.25, "pepa", false],
      [-25.6, 1.45, "dance", true],
      [-24.6, 1.3, "dance", true],
      [-23.6, 1.5, "dance", true],
      [-22.3, 1.05, "watch", false],
    ];
    for (const [x, y, role, woman] of yard) {
      const look = makeLook(random, woman ? 1.5 : 1.62, woman, role !== "watch");
      if (role === "watch") {
        look.hair = "grey";
        look.gamosa = "shoulders";
        look.top = [240, 236, 226];
      }
      if (woman) look.flowers = true;
      this.yard.push({ look, x, y, seed: random() * 10, role, facing: x < -25 ? 1 : -1 });
    }

    // Goru Bihu: the cattle, and the boys who bathe them.
    const cows: [Cow, number, number, 1 | -1, boolean][] = [
      [{ coat: [226, 214, 196], patch: null, horns: 1, size: 1.05 }, -8.4, 2.05, 1, true],
      [{ coat: [150, 96, 60], patch: [236, 226, 210], horns: 0.6, size: 1.0 }, -5.4, 2.45, -1, true],
      [{ coat: [120, 80, 56], patch: null, horns: 0.2, size: 0.7 }, -3.9, 1.85, -1, true],
      [{ coat: [206, 186, 160], patch: [120, 90, 70], horns: 0.8, size: 1.0 }, -13.3, 1.45, 1, false],
    ];
    for (const [cow, x, y, facing, inWater] of cows)
      this.beasts.push({ cow, x, y, facing, seed: random() * 10, wet: inWater ? 1 : 0, shake: 0, inWater });
    const boy = (x: number, y: number, role: Role, facing: 1 | -1, h: number) => {
      const look = makeLook(random, h, false, false);
      look.top = null;
      look.gamosa = "waist";
      look.child = h < 1.3;
      this.boys.push({ look, x, y, seed: random() * 10, role, facing });
    };
    boy(-9.9, 2.45, "leap", 1, 1.15);
    boy(-6.6, 2.85, "clap", -1, 1.1);
    boy(-14.5, 1.75, "watch", 1, 1.62);

    // The family at home.
    const tones: RGB[] = [
      [198, 146, 104],
      [176, 124, 84],
      [210, 164, 122],
    ];
    const skin = (i: number) => tones[i];
    this.home = {
      grandfather: {
        h: 1.55,
        skin: skin(1),
        woman: false,
        top: [242, 238, 228],
        bottom: [244, 240, 228],
        border: [196, 32, 38],
        hair: "grey",
        flowers: false,
        gamosa: "none",
        sleeves: true,
      },
      grandmother: {
        h: 1.45,
        skin: skin(0),
        woman: true,
        top: [236, 228, 206],
        bottom: [240, 230, 204],
        border: [176, 26, 34],
        chador: [244, 236, 214],
        hair: "grey",
        flowers: false,
        gamosa: "none",
        sleeves: true,
      },
      son: {
        h: 1.64,
        skin: skin(1),
        woman: false,
        top: [244, 240, 230],
        bottom: [246, 242, 232],
        border: [196, 32, 38],
        hair: "short",
        flowers: false,
        gamosa: "none",
        sleeves: true,
      },
      daughter: {
        h: 1.5,
        skin: skin(2),
        woman: true,
        top: [196, 30, 40],
        bottom: [226, 190, 116],
        border: [176, 26, 34],
        chador: [226, 190, 116],
        hair: "khopa",
        flowers: true,
        gamosa: "none",
        sleeves: true,
      },
      weaver: {
        h: 1.48,
        skin: skin(0),
        woman: true,
        top: [70, 130, 110],
        bottom: [214, 76, 96],
        border: [40, 70, 120],
        chador: [236, 120, 140],
        hair: "khopa",
        flowers: false,
        gamosa: "none",
        sleeves: true,
      },
      girl: {
        h: 1.05,
        skin: skin(2),
        woman: true,
        top: [236, 170, 80],
        bottom: [214, 76, 96],
        border: [176, 26, 34],
        hair: "khopa",
        flowers: true,
        gamosa: "none",
        sleeves: true,
        child: true,
      },
      boy: {
        h: 1.1,
        skin: skin(1),
        woman: false,
        top: [230, 200, 150],
        bottom: [244, 240, 228],
        border: [196, 32, 38],
        hair: "short",
        flowers: false,
        gamosa: "none",
        sleeves: false,
        child: true,
      },
    };

    // The husori: men of the village with dhol, pepa, taal and toka.
    const roles: Role[] = ["dhol", "clap", "pepa", "taal", "clap", "dhol", "toka", "taal", "clap"];
    roles.forEach((role, i) => {
      const look = makeLook(random, 1.56 + random() * 0.12, false, false);
      look.bottom = [246, 242, 232];
      look.top = i % 3 === 1 ? [236, 228, 210] : [246, 242, 232];
      look.hair = i % 2 ? "band" : "short";
      look.gamosa = "waist";
      look.sleeves = true;
      this.members.push({ look, role, angle: (i / roles.length) * TAU, seed: random() * 10, gifted: false, start: 0.465 + i * 0.005 });
    });

    // The Bihutoli: the women's line, the band behind them, everyone else round the edge.
    for (let i = 0; i < 7; i++) {
      const look = makeLook(random, 1.54 + random() * 0.06, true, true);
      this.dancers.push({
        look,
        x: TOLI.x - 3.9 + i * 1.3 + (random() - 0.5) * 0.15,
        y: 2.45 + (i % 2) * 0.2,
        seed: random() * 10,
        role: "dance",
        facing: i < 3 ? 1 : -1,
      });
    }
    const bandRoles: Role[] = ["dhol", "pepa", "dhol", "gogona", "toka", "taal", "pepa"];
    bandRoles.forEach((role, i) => {
      const look = makeLook(random, 1.58 + random() * 0.1, false, true);
      this.band.push({ look, x: TOLI.x - 3.2 + i * 1.08, y: 1.0 + (i % 2) * 0.12, seed: random() * 10, role, facing: i < 3 ? 1 : -1 });
    });
    for (const [x, y] of [
      [TOLI.x - 5.0, 2.35],
      [TOLI.x + 5.0, 2.3],
    ]) {
      const look = makeLook(random, 1.62, false, true);
      this.band.push({ look, x, y, seed: random() * 10, role: "leap", facing: x < TOLI.x ? 1 : -1 });
    }
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 6);
      const woman = random() < 0.5;
      const child = row === 2;
      const look = makeLook(random, child ? 1.0 + random() * 0.1 : 1.45 + random() * 0.2, woman, false);
      look.child = child;
      const x = TOLI.x + side * (6.2 + row * 0.7 + random() * 1.6);
      const y = [0.5, 1.4, 3.0][row] + random() * 0.4;
      this.crowd.push({
        look,
        x,
        y,
        seed: random() * 10,
        role: child ? "sit" : random() < 0.6 ? "clap" : "watch",
        facing: side > 0 ? -1 : 1,
      });
    }

    // Night in the fields: a ring of dancers round a lantern, far off.
    const nightRoles: Role[] = ["dance", "dhol", "dance", "dance", "pepa", "dance", "dance", "dhol", "dance", "taal"];
    nightRoles.forEach((role, i) => {
      const woman = role === "dance";
      this.night.push({
        look: makeLook(random, woman ? 1.4 : 1.5, woman, true),
        x: (i / nightRoles.length) * TAU,
        y: 0,
        seed: random() * 10,
        role,
        facing: 1,
      });
    });
  }

  draw(ctx: Ctx, f: Frame) {
    const { width, height, p } = f;
    const unit = Math.min(width, height) / 8;
    const focus = shot(f.portrait ? PORTRAIT_SHOTS : SHOTS, p);
    // On wide screens, keep what matters clear of the caption.
    if (!f.portrait) {
      const side = bihu.chapters.reduce((sum, c) => sum + windowOpacity(p, c.window) * (c.side === "right" ? 1 : -1), 0);
      focus.x += (side * width * 0.12) / (unit * focus.zoom);
    }
    const v = view(width, height, focus, unit, f.portrait ? 0.38 : 0.5);
    this.v = v;
    this.unit = unit;
    this.zoom = focus.zoom;
    this.ensure();
    this.tick(f);

    const top = track(SKY_TOP, p);
    const low = track(SKY_LOW, p);
    const dark = darkness(p);
    const haze = mix(low, top, 0.25);
    this.sky(ctx, v, f, top, low, dark);

    // The world, on its own layer, graded for the hour.
    const layer = this.layer!;
    const ratio = ctx.getTransform().a || 1;
    if (layer.width !== ctx.canvas.width || layer.height !== ctx.canvas.height) {
      layer.width = ctx.canvas.width;
      layer.height = ctx.canvas.height;
    }
    const g = layer.getContext("2d")!;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, width, height);
    this.valley(g, v, haze, low);
    g.save();
    apply(g, v);
    this.world(g, v, f, haze);
    g.restore();
    this.grade(g, p);
    ctx.drawImage(layer, 0, 0, width, height);

    // Light on top.
    ctx.save();
    apply(ctx, v);
    ctx.globalCompositeOperation = "lighter";
    this.lights(ctx, v, f, dark);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // A wash behind the caption, and a little shade under the header in daylight.
    const day = 1 - dark;
    if (!f.portrait) {
      for (const c of bihu.chapters) {
        const o = windowOpacity(p, c.window);
        if (o < 0.01) continue;
        const right = c.side === "right";
        const wash = ctx.createLinearGradient(right ? width : 0, 0, right ? width * 0.5 : width * 0.5, 0);
        const a = o * lerp(0.2, 0.5, day);
        wash.addColorStop(0, `rgba(6, 10, 8, ${a})`);
        wash.addColorStop(0.55, `rgba(6, 10, 8, ${a * 0.45})`);
        wash.addColorStop(1, "rgba(6, 10, 8, 0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, width, height);
      }
    }
    const shade = ctx.createLinearGradient(0, 0, 0, 150);
    shade.addColorStop(0, `rgba(6, 10, 8, ${0.35 * day})`);
    shade.addColorStop(1, "rgba(6, 10, 8, 0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, 150);
    // The hero and finale words sit low and centred.
    const low2 = Math.max(windowOpacity(p, bihu.hero), windowOpacity(p, bihu.finale.window));
    if (low2 > 0.01 || f.portrait) {
      const foot = ctx.createLinearGradient(0, height * 0.45, 0, height);
      const a = Math.max(low2 * 0.5, f.portrait ? 0.45 : 0);
      foot.addColorStop(0, "rgba(6, 10, 8, 0)");
      foot.addColorStop(1, `rgba(6, 10, 8, ${a})`);
      ctx.fillStyle = foot;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);
    }
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      Math.min(width, height) * 0.35,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    vignette.addColorStop(0, "rgba(4, 8, 6, 0)");
    vignette.addColorStop(1, `rgba(4, 8, 6, ${0.55 - day * 0.3})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    this.cues(f);
    this.previous = p;
  }

  pointer(x: number, y: number, kind: "down" | "move" | "up", f: Frame) {
    if (kind !== "down") return;
    const v = this.v;
    if (!v) return;
    const { p, seconds } = f;
    const at = toWorld(v, x, y);

    // Chot: the kopou lets its flowers go.
    if (p > 0.095 && p < 0.205) {
      const near = [...this.racemes].sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y)).slice(0, 5);
      for (const r of near) this.air.petalsFrom(r.x, r.y + 0.3, 14, 0.4, KOPOU.y + 0.6);
      this.shaken = seconds;
      this.emit("kopou");
      return;
    }
    // Goru Bihu: water thrown over the nearest cow.
    if (p > 0.235 && p < 0.35) {
      const beast = this.beasts
        .filter((b) => b.inWater)
        .sort((a, b) => Math.hypot(a.x - at.x, a.y - a.cow.size * 0.8 - at.y) - Math.hypot(b.x - at.x, b.y - b.cow.size * 0.8 - at.y))[0];
      if (!beast) return;
      if (!f.reduced) this.air.splash(beast.x - beast.facing * 0.4, beast.y - beast.cow.size * 0.9, 34);
      this.air.ring(beast.x, beast.y + 0.05, 1.6);
      beast.shake = 1;
      this.emit("splash");
      return;
    }
    // Husori: a gamosa from the house for the nearest singer who has none yet.
    if (p > 0.515 && p < 0.625) {
      const ring = this.ringPositions(seconds, p);
      let best = -1;
      let dist = Infinity;
      ring.forEach((m, i) => {
        if (this.members[i].gifted || this.tosses.some((t) => t.member === i)) return;
        const d = Math.hypot(m.x - at.x, m.y - 0.8 - at.y);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      if (best < 0) return;
      if (f.reduced) this.members[best].gifted = true;
      else this.tosses.push({ from: { x: HOUSE.x - 1.2, y: -0.9 }, member: best, age: 0 });
      this.emit("gamosa");
      return;
    }
    // The dance: strike the dhol.
    if (p > 0.655 && p < 0.79) {
      this.struck = seconds;
      for (const b of this.band) if (b.role === "dhol" || b.role === "leap") this.pulses.push({ x: b.x, y: b.y - b.look.h * 0.5, age: 0 });
      if (this.pulses.length > 30) this.pulses.splice(0, this.pulses.length - 30);
      this.emit("dhol");
      return;
    }
    // The night: fireflies out of the grass.
    if (p > 0.8) {
      this.flies.wake(at.x, Math.max(0.3, at.y + 0.5), 24, seconds);
      this.emit("jonaki");
    }
  }

  // ─── Setting up ────────────────────────────────────────────────────────────

  private ensure() {
    if (this.layer) return;
    this.layer = document.createElement("canvas");
    this.backdrop = valley();
    this.grass = grassChunks(-52, 70, 9);
    this.paddy = fields(42, 70, 8);
    const rows = teaRows(-50, -24.5, [2.3, 2.9, 3.6, 4.4, 5.3, 6.3, 7.4]);
    this.tea = sprite("tea", -51, 1.4, 32, 6.8, 70, (g) => {
      g.fillStyle = "rgb(30, 64, 36)";
      g.fill(rows.body);
      g.fillStyle = "rgb(84, 136, 56)";
      g.fill(rows.flush);
      // Leaves: the pruned tops catch the light, new flush pale on top.
      g.save();
      g.clip(rows.body);
      const random = mulberry32(61);
      for (let i = 0; i < 9000; i++) {
        const x = -50 + random() * 30;
        const y = 1.8 + random() * 6;
        const lit = random();
        g.fillStyle = lit < 0.5 ? "rgba(20, 50, 28, 0.6)" : lit < 0.85 ? "rgba(110, 160, 70, 0.6)" : "rgba(186, 220, 110, 0.8)";
        g.beginPath();
        g.ellipse(x, y, 0.06 + y * 0.006, 0.03 + y * 0.003, random() * 3, 0, TAU);
        g.fill();
      }
      g.restore();
    });
  }

  // ─── Sky ───────────────────────────────────────────────────────────────────

  private sky(ctx: Ctx, v: View, f: Frame, top: RGB, low: RGB, dark: number) {
    const { width, height } = v;
    const { p, seconds } = f;
    const hz = toScreen(v, 0, HORIZON).y;
    const horizon = clamp(hz / height, 0.05, 1.5);
    const sky = ctx.createLinearGradient(0, 0, 0, height * horizon);
    sky.addColorStop(0, rgb(top));
    sky.addColorStop(0.6, rgb(mix(top, low, 0.45)));
    sky.addColorStop(1, rgb(low));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const r = Math.min(width, height) * 0.045;

    if (dark > 0.01) {
      ctx.fillStyle = "#f2ecd8";
      for (const s of this.stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(seconds * (0.8 + s.seed * 0.2) + s.seed * 6);
        ctx.globalAlpha = twinkle * dark * (1 - s.y * 0.5) * 0.8;
        ctx.fillRect(s.x * width, s.y * hz * 0.95, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    // The sun: westering over Chot, rising on Goru Bihu, and going down again after the dance.
    const up = track(SUN_UP, p);
    if (up > -0.1) {
      const sx = width * (p < 0.22 ? 0.72 : lerp(0.2, 0.78, rise(p, 0.23, 0.78)));
      const sy = hz - up * height;
      const warm = 1 - clamp(up / 0.35);
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, glowSprite(SUN), sx, sy, r * lerp(7, 11, warm), lerp(0.25, 0.55, warm));
      glow(ctx, glowSprite("255, 236, 200"), sx, sy, r * 2.4, 0.8);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgb(mix([255, 250, 236], [255, 196, 120], warm));
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.75, 0, TAU);
      ctx.fill();
    }

    // Soft spring clouds, drifting.
    const cloud = (1 - dark) * 0.7;
    if (cloud > 0.01) {
      const span = width * 1.6;
      for (const c of this.clouds) {
        const sprite = cloudSprite(c.kind);
        const w = width * 0.3 * c.s * lerp(0.8, 1.2, clamp(this.zoom));
        const x = ((((c.x * span - v.x * this.unit * 0.06 + (f.reduced ? 0 : seconds) * 4 * c.speed) % span) + span) % span) - width * 0.3;
        const y = hz - c.h * height * 0.9 - w * 0.2;
        ctx.globalAlpha = cloud * (0.5 + c.h * 0.6);
        ctx.drawImage(sprite, x, y, w, w * 0.43);
      }
      ctx.globalAlpha = 1;
    }

    // The half moon of Bohag, waxing, high over the fields at night.
    const moon = rise(p, 0.8, 0.85);
    if (moon > 0.01) {
      const mx = width * (f.portrait ? 0.72 : 0.7);
      const my = Math.max(r * 3.2, hz - height * 0.5);
      this.halfMoon(ctx, mx, my, r * 0.95, moon);
    }

    // Egrets going over at dawn.
    const egrets = rise(p, 0.24, 0.26) * (1 - rise(p, 0.33, 0.36));
    if (egrets > 0.01 && !f.reduced) {
      const span = width + 400;
      const base = ((seconds * 38) % span) - 200;
      ctx.strokeStyle = `rgba(250, 248, 240, ${0.9 * egrets})`;
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const x = base - i * r * 1.1 - (i % 2) * r * 0.4;
        const y = height * 0.22 + i * r * 0.35 + Math.sin(seconds + i) * 3;
        const flap = Math.sin(seconds * 5 + i * 1.3) * r * 0.22;
        const s = r * 0.35;
        ctx.beginPath();
        ctx.moveTo(x - s, y - flap);
        ctx.quadraticCurveTo(x - s * 0.4, y - flap * 0.2, x, y);
        ctx.quadraticCurveTo(x + s * 0.4, y - flap * 0.2, x + s, y - flap);
        ctx.stroke();
      }
    }
  }

  /** The moon a week after new: its right half lit. */
  private halfMoon(ctx: Ctx, x: number, y: number, r: number, alpha: number) {
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, glowSprite("200, 214, 255"), x, y, r * 7, 0.18 * alpha);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(60, 70, 100, ${0.35 * alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    const face = ctx.createRadialGradient(x + r * 0.3, y - r * 0.2, 0, x, y, r);
    face.addColorStop(0, `rgba(250, 246, 226, ${alpha})`);
    face.addColorStop(1, `rgba(214, 206, 180, ${alpha})`);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
    ctx.ellipse(x, y, r * 0.08, r, 0, Math.PI / 2, -Math.PI / 2, false);
    ctx.fill();
    ctx.fillStyle = `rgba(170, 160, 140, ${0.3 * alpha})`;
    for (const [dx, dy, s] of [
      [0.35, -0.3, 0.2],
      [0.5, 0.2, 0.16],
      [0.25, 0.4, 0.12],
    ]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, s * r, 0, TAU);
      ctx.fill();
    }
  }

  // ─── The valley behind ─────────────────────────────────────────────────────

  /** Hills, the Brahmaputra and the groves along it, on the horizon, moving slower than the village. */
  private valley(g: Ctx, v: View, haze: RGB, low: RGB) {
    const b = this.backdrop!;
    const hz = toScreen(v, 0, HORIZON).y;
    if (hz < -50) return;
    const s = this.unit * Math.pow(this.zoom, 0.45) * 1.25;
    g.save();
    g.translate(v.width / 2 - v.x * 0.1 * s, hz);
    g.scale(s, s);
    g.fillStyle = rgb(mix([104, 128, 170], haze, 0.55));
    g.fill(b.far);
    g.fillStyle = rgb(mix([66, 100, 104], haze, 0.35));
    g.fill(b.near);
    const river = g.createLinearGradient(0, -0.3, 0, -0.14);
    river.addColorStop(0, rgb(mix(low, [220, 226, 230], 0.3)));
    river.addColorStop(1, rgb(mix(low, [150, 170, 180], 0.4)));
    g.fillStyle = river;
    g.fill(b.river);
    g.fillStyle = rgb(mix([232, 220, 186], low, 0.3), 0.85);
    g.fill(b.bars);
    g.fillStyle = rgb(mix([52, 84, 52], haze, 0.3));
    g.fill(b.groves);
    g.restore();
  }

  // ─── The world ─────────────────────────────────────────────────────────────

  private world(g: Ctx, v: View, f: Frame, haze: RGB) {
    const { p } = f;
    const left = v.x - v.width / 2 / v.scale - 1;
    const right = v.x + v.width / 2 / v.scale + 1;
    const bottom = v.y + v.height / v.scale + 1;

    // The ground, hazy towards the horizon.
    const ground = g.createLinearGradient(0, HORIZON, 0, HORIZON + 9);
    ground.addColorStop(0, rgb(mix([140, 164, 110], haze, 0.5)));
    ground.addColorStop(0.1, rgb(mix([120, 158, 80], haze, 0.2)));
    ground.addColorStop(0.45, "rgb(92, 140, 58)");
    ground.addColorStop(1, "rgb(64, 110, 44)");
    g.fillStyle = ground;
    g.fillRect(left, HORIZON, right - left, bottom - HORIZON);
    // Far paddy, in strips.
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? "rgba(170, 190, 110, 0.14)" : "rgba(80, 120, 60, 0.1)";
      g.fillRect(left, HORIZON + 0.08 + i * 0.2, right - left, 0.08 + i * 0.03);
    }
    // Grass.
    g.lineWidth = 0.018;
    g.strokeStyle = "rgba(48, 96, 34, 0.75)";
    for (const c of this.grass!) if (c.x + 6 > left && c.x < right) g.stroke(c.path);
    g.fillStyle = "rgba(250, 240, 190, 0.8)";
    for (const c of this.grass!) if (c.x + 6 > left && c.x < right) g.fill(c.flowers);

    // The open fields, stubble after the harvest.
    if (right > 42) {
      g.strokeStyle = "rgba(176, 156, 96, 0.55)";
      g.lineWidth = 0.02;
      g.stroke(this.paddy!.stubble);
      g.strokeStyle = "rgba(110, 92, 56, 0.6)";
      g.lineWidth = 0.06;
      g.stroke(this.paddy!.bunds);
    }
    // The swept earth of the courtyard, and of the Bihutoli.
    this.earth(g, COURT.x, COURT.y, COURT.rx, COURT.ry, [216, 196, 154]);
    this.earth(g, TOLI.x, TOLI.y, TOLI.rx, TOLI.ry, [198, 170, 120]);
    this.earth(g, NAMGHAR.x, 1.0, 5.2, 0.9, [206, 186, 144]);
    if (onScreen(v, POND.x, POND.y, POND.rx + 1)) this.pond(g, f);

    const actors: Actor[] = [];
    this.scenery(actors, g, v, f);
    this.chot(actors, g, f);
    this.goru(actors, g, f);
    this.manuh(actors, g, f);
    this.husori(actors, g, f);
    this.naach(actors, g, f);
    this.fields(actors, g, f);
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();

    if (!f.reduced) this.air.update(f.dt, 0.4);
    this.air.drawPetals(g);
    this.air.drawDrops(g);
    this.drift(g, f);
    this.flying(g, f);
    void p;
  }

  private earth(g: Ctx, x: number, y: number, rx: number, ry: number, color: RGB) {
    if (!this.v || !onScreen(this.v, x, y, rx)) return;
    for (let i = 0; i < 3; i++) {
      g.fillStyle = rgb(color, 0.35 + i * 0.25);
      g.beginPath();
      g.ellipse(x, y, rx * (1 - i * 0.08), ry * (1 - i * 0.12), 0, 0, TAU);
      g.fill();
    }
  }

  private pond(g: Ctx, f: Frame) {
    const { seconds } = f;
    const t = f.reduced ? 0 : seconds;
    const low = track(SKY_LOW, f.p);
    const top = track(SKY_TOP, f.p);
    g.fillStyle = "rgb(112, 90, 58)";
    g.beginPath();
    g.ellipse(POND.x, POND.y, POND.rx + 0.3, POND.ry + 0.16, 0, 0, TAU);
    g.fill();
    const far = mix(low, WATER, 0.45);
    const near = mix(top, [44, 72, 80], 0.6);
    const water = g.createLinearGradient(0, POND.y - POND.ry, 0, POND.y + POND.ry);
    water.addColorStop(0, rgb(far));
    water.addColorStop(1, rgb(near));
    g.fillStyle = water;
    g.beginPath();
    g.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU);
    g.clip();
    // The sky's light in it, broken by the breeze.
    g.strokeStyle = rgb(mix(low, [255, 255, 255], 0.3), 0.35);
    g.lineWidth = 0.025;
    const random = mulberry32(5);
    for (let i = 0; i < 26; i++) {
      const y = POND.y - POND.ry + random() * POND.ry * 2;
      const x = POND.x - POND.rx + random() * POND.rx * 2 + Math.sin(t * 0.5 + i) * 0.2;
      const w = 0.3 + random() * 0.9;
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + w, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    this.air.drawRings(g);
    g.restore();
    // Water hyacinth along the edge, lilac-flowered.
    const clumps: [number, number][] = [
      [-11.2, 2.3],
      [-10.6, 1.4],
      [-2.9, 2.5],
      [-3.4, 1.35],
      [-7.2, 3.1],
    ];
    for (const [x, y] of clumps) {
      for (let k = 0; k < 7; k++) {
        g.fillStyle = k % 2 ? "rgb(60, 118, 50)" : "rgb(86, 146, 64)";
        g.beginPath();
        g.ellipse(x + (k - 3) * 0.12, y - (k % 3) * 0.04, 0.12, 0.07, (k - 3) * 0.3, 0, TAU);
        g.fill();
      }
      g.fillStyle = "rgb(186, 160, 226)";
      g.beginPath();
      g.arc(x + 0.05, y - 0.16, 0.05, 0, TAU);
      g.arc(x - 0.08, y - 0.13, 0.04, 0, TAU);
      g.fill();
    }
  }

  /** Draws someone standing in the pond: above the surface as they are, below it only faintly. */
  private wading(g: Ctx, x: number, y: number, half: number, depth: number, seconds: number, draw: () => void) {
    const surface = y - depth + Math.sin(seconds * 2 + x) * 0.015;
    const under = () => {
      g.beginPath();
      g.rect(x - half, surface, half * 2, depth + 0.4);
    };
    g.save();
    g.beginPath();
    g.rect(x - 20, y - 20, 40, 40);
    g.rect(x - half, surface, half * 2, depth + 0.4);
    g.clip("evenodd");
    draw();
    g.restore();
    g.save();
    under();
    g.clip();
    g.globalAlpha = 0.16;
    draw();
    g.restore();
    g.strokeStyle = "rgba(236, 244, 248, 0.4)";
    g.lineWidth = 0.018;
    g.beginPath();
    g.ellipse(x, surface, half * 0.8, 0.045, 0, 0, TAU);
    g.stroke();
  }

  // ─── Scenery ───────────────────────────────────────────────────────────────

  private scenery(actors: Actor[], g: Ctx, v: View, f: Frame) {
    const place = (s: Sprite, x: number, y: number, flip = false, after?: () => void) => {
      if (!onScreen(v, x, y + s.y + s.h / 2, Math.max(s.w, s.h) * 0.6)) return;
      actors.push({
        y,
        draw: () => {
          stamp(g, s, x, y, 1, flip);
          after?.();
        },
      });
    };
    for (const t of this.trees) place(t.sprite, t.x, t.y, t.flip, t.x === KOPOU.x ? () => this.kopou(g, f) : undefined);
    place(namghar(), NAMGHAR.x, NAMGHAR.y);
    place(batsora(), BATSORA.x, BATSORA.y);
    place(house(), HOUSE.x, HOUSE.y);
    place(bhoral(), 16.6, -0.2);
    place(tulsi(), 3.4, 1.25);
    place(loom(), 13.7, 0.42);
    const tea = this.tea!;
    if (onScreen(v, tea.x + tea.w / 2, tea.y + tea.h / 2, tea.w / 2)) actors.push({ y: 2.0, draw: () => stamp(g, tea, 0, 0) });
  }

  /** The kopou orchids hanging under the old mango, and the koel calling from it. */
  private kopou(g: Ctx, f: Frame) {
    const leaves = orchidLeaves();
    const t = f.reduced ? 0 : f.seconds;
    const shake = Math.exp(-Math.max(0, f.seconds - this.shaken) * 2.2);
    for (const r of this.racemes) {
      const swing = Math.sin(t * 1.1 + r.seed) * 0.05 + Math.sin(t * 11 + r.seed) * 0.14 * shake;
      g.save();
      g.translate(r.x, r.y);
      g.rotate(swing);
      stamp(g, leaves, 0, 0.02, r.scale * 0.75);
      stamp(g, raceme(r.variant), 0, 0, r.scale);
      g.restore();
    }
    // The kuli, the koel: glossy black, a red eye, calling with its tail flicking.
    const x = KOPOU.x + 5.3 * KOPOU.size;
    const y = KOPOU.y - 3.55 * KOPOU.size;
    const calling = Math.max(0, Math.sin(t * 1.2)) ** 6;
    g.save();
    g.translate(x, y);
    g.strokeStyle = "rgb(76, 54, 40)";
    g.lineWidth = 0.04;
    g.beginPath();
    g.moveTo(-0.5, 0.06);
    g.lineTo(0.3, 0.02);
    g.stroke();
    g.rotate(-0.15);
    g.fillStyle = "rgb(18, 20, 28)";
    g.beginPath();
    g.moveTo(-0.08, -0.02);
    g.lineTo(-0.34, 0.08 + calling * 0.06);
    g.lineTo(-0.33, 0.13 + calling * 0.06);
    g.lineTo(-0.05, 0.04);
    g.fill();
    g.beginPath();
    g.ellipse(0, -0.05, 0.12, 0.055, -0.2, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(0.1, -0.11 - calling * 0.02, 0.045, 0, TAU);
    g.fill();
    g.fillStyle = "rgb(180, 196, 150)";
    g.beginPath();
    g.moveTo(0.14, -0.12 - calling * 0.02);
    g.lineTo(0.2, -0.12 - calling * 0.04);
    g.lineTo(0.14, -0.1);
    g.lineTo(0.2, -0.09 + calling * 0.02);
    g.fill();
    g.fillStyle = "rgb(220, 40, 30)";
    g.beginPath();
    g.arc(0.115, -0.12 - calling * 0.02, 0.011, 0, TAU);
    g.fill();
    g.restore();
  }

  private shadow(g: Ctx, x: number, y: number, r: number) {
    g.fillStyle = "rgba(20, 30, 12, 0.22)";
    g.beginPath();
    g.ellipse(x, y, r, r * 0.22, 0, 0, TAU);
    g.fill();
  }

  private person(actors: Actor[], g: Ctx, look: Look, x: number, y: number, p: Pose, facing: 1 | -1, after?: () => void) {
    actors.push({
      y,
      draw: () => {
        this.shadow(g, x, y, look.h * 0.14);
        if (p.seated) {
          // A low pira of jackfruit wood.
          const seat = p.seated * look.h;
          g.fillStyle = "rgb(120, 76, 44)";
          g.fillRect(x - look.h * 0.17, y - seat, look.h * 0.34, look.h * 0.035);
          g.fillStyle = "rgb(90, 56, 32)";
          g.fillRect(x - look.h * 0.15, y - seat + look.h * 0.03, look.h * 0.03, seat - look.h * 0.03);
          g.fillRect(x + look.h * 0.12, y - seat + look.h * 0.03, look.h * 0.03, seat - look.h * 0.03);
        }
        drawFigure(g, x, y, look, p, facing);
        after?.();
      },
    });
  }

  /** The pose for someone in the band, playing (energy 0 stills them). */
  private play(role: Role, t: number, energy: number, seed: number): Pose {
    switch (role) {
      case "dhol":
        return pose.dhol(t, energy);
      case "pepa":
        return pose.pepa(t, energy);
      case "taal":
        return pose.taal(t, energy);
      case "gogona":
        return pose.gogona(t);
      case "toka":
        return pose.toka(t);
      case "clap":
        return pose.clap(t);
      case "leap":
        return pose.leap(t, energy, seed);
      case "dance":
        return dancePose(t, energy, seed);
      case "sit":
        return pose.seated(0);
      default:
        return pose.stand();
    }
  }

  // ─── I. Chot: the namghar yard ─────────────────────────────────────────────

  private chot(actors: Actor[], g: Ctx, f: Frame) {
    if (f.p > 0.32 || !onScreen(this.v!, NAMGHAR.x, 0, 7)) return;
    const t = f.seconds / 0.7;
    for (const m of this.yard) this.person(actors, g, m.look, m.x, m.y, this.play(m.role, t + m.seed * 0.1, 0.35, m.seed), m.facing);
  }

  // ─── II. Goru Bihu: the pond ───────────────────────────────────────────────

  private goru(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds, dt } = f;
    if (!onScreen(this.v!, POND.x - 2, POND.y - 1, 9)) return;
    const t = f.reduced ? 0 : seconds;
    for (const b of this.beasts) {
      b.shake = Math.max(0, b.shake - dt * 1.2);
      const paste = b.inWater ? 0.55 * rise(p, 0.27, 0.31) : rise(p, 0.25, 0.3);
      const cowPose = {
        step: 0,
        graze: b.inWater ? 0.2 + 0.2 * Math.sin(t * 0.3 + b.seed) : 0.1,
        tail: Math.sin(t * 1.7 + b.seed) + b.shake * Math.sin(t * 17),
        wet: b.inWater ? 1 : 0,
        paste,
        shake: b.shake * Math.sin(t * 22),
      };
      actors.push({
        y: b.y,
        draw: () => {
          const cow = () => drawCow(g, b.x, b.y, b.cow, cowPose, b.facing);
          if (b.inWater) this.wading(g, b.x, b.y, 1.1 * b.cow.size, 0.3 * b.cow.size, t, cow);
          else {
            this.shadow(g, b.x, b.y, 0.9 * b.cow.size);
            cow();
          }
        },
      });
    }
    for (const boy of this.boys) {
      const phase = t * 2.2 + boy.seed;
      let p0: Pose;
      if (boy.role === "leap") {
        // Switching the cow gently with a sprig of dighloti.
        const hit = Math.max(0, Math.sin(phase));
        p0 = { ...pose.stand(), bow: 0.2, left: { x: -0.12, y: -0.5 }, right: { x: 0.24, y: lerp(-0.72, -1.0, hit) }, hold: "twig" };
      } else if (boy.role === "clap") {
        // Scooping water up over the cow.
        const scoop = 0.5 + 0.5 * Math.sin(phase * 0.8);
        p0 = {
          ...pose.stand(),
          crouch: 0.05 * (1 - scoop),
          bow: 0.3,
          left: { x: 0.02, y: lerp(-0.4, -0.95, scoop) },
          right: { x: 0.14, y: lerp(-0.42, -0.98, scoop) },
        };
        if (!f.reduced && p > 0.24 && p < 0.34 && seconds > this.nextSplash && scoop > 0.95) {
          this.nextSplash = seconds + 1.4;
          this.air.splash(boy.x + boy.facing * 0.2, boy.y - boy.look.h * 0.9, 12, boy.facing);
        }
      } else {
        // Rubbing maah-halodhi into the cow's flank.
        const rub = Math.sin(phase * 0.7);
        p0 = {
          ...pose.stand(),
          bow: 0.3,
          lean: 0.03,
          left: { x: 0.26 + rub * 0.03, y: -0.62 + rub * 0.02 },
          right: { x: 0.3 - rub * 0.03, y: -0.55 - rub * 0.02 },
        };
      }
      const wading = boy.role !== "watch";
      actors.push({
        y: boy.y,
        draw: () => {
          const body = () => drawFigure(g, boy.x, boy.y, boy.look, p0, boy.facing);
          if (wading) this.wading(g, boy.x, boy.y, 0.3, 0.3, t, body);
          else {
            this.shadow(g, boy.x, boy.y, 0.2);
            body();
          }
        },
      });
    }
    // Lau and bengena for the cattle, in a basket on the bank; and the bowl of paste.
    actors.push({ y: 2.6, draw: () => this.basket(g, -12.1, 2.6) });
    // Egrets at the water's edge.
    for (const [x, y, s] of [
      [-2.4, 1.62, 1],
      [-2.2, 2.78, -1],
    ]) {
      actors.push({ y, draw: () => this.egret(g, x, y, s, t) });
    }
  }

  /** A bamboo basket of gourds and brinjals, and a brass bowl of turmeric paste beside it. */
  private basket(g: Ctx, x: number, y: number) {
    this.shadow(g, x, y, 0.45);
    g.fillStyle = "rgb(170, 140, 80)";
    g.beginPath();
    g.moveTo(x - 0.34, y - 0.26);
    g.lineTo(x + 0.34, y - 0.26);
    g.lineTo(x + 0.26, y);
    g.lineTo(x - 0.26, y);
    g.fill();
    g.strokeStyle = "rgba(110, 86, 44, 0.8)";
    g.lineWidth = 0.012;
    g.beginPath();
    for (let k = 0; k < 7; k++) {
      g.moveTo(x - 0.3 + k * 0.1, y - 0.26);
      g.lineTo(x - 0.24 + k * 0.08, y);
    }
    g.stroke();
    for (const [dx, a] of [
      [-0.16, -0.3],
      [0.08, 0.2],
    ]) {
      g.fillStyle = "rgb(130, 170, 90)";
      g.beginPath();
      g.ellipse(x + dx, y - 0.32, 0.2, 0.07, a, 0, TAU);
      g.fill();
    }
    g.fillStyle = "rgb(90, 40, 100)";
    for (const dx of [-0.02, 0.2, -0.24]) {
      g.beginPath();
      g.ellipse(x + dx, y - 0.34, 0.07, 0.05, 0.4, 0, TAU);
      g.fill();
    }
    g.fillStyle = "rgb(200, 150, 70)";
    g.beginPath();
    g.ellipse(x + 0.62, y - 0.06, 0.15, 0.07, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgb(236, 178, 30)";
    g.beginPath();
    g.ellipse(x + 0.62, y - 0.1, 0.12, 0.035, 0, 0, TAU);
    g.fill();
  }

  private egret(g: Ctx, x: number, y: number, facing: number, t: number) {
    const dip = Math.max(0, Math.sin(t * 0.5 + x)) ** 8;
    g.save();
    g.translate(x, y);
    g.scale(facing * 0.9, 0.9);
    g.strokeStyle = "rgb(60, 50, 40)";
    g.lineWidth = 0.018;
    g.beginPath();
    g.moveTo(-0.02, 0);
    g.lineTo(0, -0.3);
    g.moveTo(0.04, 0);
    g.lineTo(0.02, -0.3);
    g.stroke();
    g.fillStyle = "rgb(250, 250, 244)";
    g.beginPath();
    g.ellipse(0, -0.38, 0.16, 0.08, -0.3, 0, TAU);
    g.fill();
    g.strokeStyle = "rgb(250, 250, 244)";
    g.lineWidth = 0.035;
    g.beginPath();
    g.moveTo(0.1, -0.42);
    g.quadraticCurveTo(0.2, -0.6 + dip * 0.3, 0.12 + dip * 0.12, -0.66 + dip * 0.4);
    g.stroke();
    g.fillStyle = "rgb(240, 200, 60)";
    g.beginPath();
    g.moveTo(0.12 + dip * 0.12, -0.68 + dip * 0.4);
    g.lineTo(0.26 + dip * 0.08, -0.65 + dip * 0.5);
    g.lineTo(0.12 + dip * 0.12, -0.64 + dip * 0.4);
    g.fill();
    g.restore();
  }

  // ─── III. Manuh Bihu: the verandah ─────────────────────────────────────────

  /** Where the son and daughter stand, and what they are doing, at `p`. */
  private family(p: number) {
    const approach = rise(p, 0.372, 0.392);
    const bow = rise(p, MOMENTS.bow[0], MOMENTS.bow[1]);
    const given = rise(p, MOMENTS.gamosa[0], MOMENTS.gamosa[1]);
    const toXorai = rise(p, 0.552, 0.582);
    const son = {
      x: lerp(lerp(9.4, 7.45, approach), 8.7, toXorai),
      y: lerp(0.55, 1.45, toXorai),
      walking: (approach > 0 && approach < 1) || (toXorai > 0 && toXorai < 1),
      bow: bow * (1 - given * 0.6) * (1 - rise(p, 0.45, 0.47)),
      given,
    };
    const come = rise(p, 0.405, 0.43);
    const bow2 = rise(p, MOMENTS.second[0], MOMENTS.second[0] + 0.012);
    const given2 = rise(p, MOMENTS.second[0] + 0.012, MOMENTS.second[1]);
    const daughter = {
      x: lerp(2.6, 4.25, come),
      y: 0.52,
      walking: come > 0 && come < 1,
      bow: bow2 * (1 - given2 * 0.6) * (1 - rise(p, 0.47, 0.49)),
      given: given2,
      shown: come > 0,
    };
    return { son, daughter };
  }

  private manuh(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    if (!onScreen(this.v!, HOUSE.x + 2, 0, 10)) return;
    const h = this.home;
    const t = f.reduced ? 0 : seconds;
    const { son, daughter } = this.family(p);
    const beat = seconds / HUSORI_BEAT;
    const husori = rise(p, 0.5, 0.52) * (1 - rise(p, 0.6, 0.63));

    // The grandparents, seated on the verandah, blessing.
    const grandfather = son.given > 0.5 ? { ...h.grandfather, gamosa: "shoulders" as const } : h.grandfather;
    const grandmother = daughter.given > 0.5 ? { ...h.grandmother, gamosa: "shoulders" as const } : h.grandmother;
    const gx = 6.5;
    const mx = 5.2;
    const sy = 0.12;
    // The son's head, in the grandfather's figure units, so the blessing hand finds it.
    const sonHead = { x: (son.x - 0.1 - gx) / h.grandfather.h, y: (son.y - h.son.h * (0.87 - son.bow * 0.12) - sy) / h.grandfather.h };
    const bless = rise(p, 0.418, 0.432) * (1 - rise(p, 0.455, 0.47));
    this.person(actors, g, grandfather, gx, sy, pose.seated(bless, { x: clamp(sonHead.x, 0.1, 0.3), y: clamp(sonHead.y, -1, -0.6) }), 1);
    const bless2 = rise(p, 0.45, 0.458) * (1 - rise(p, 0.475, 0.49));
    this.person(
      actors,
      g,
      grandmother,
      mx,
      sy,
      pose.seated(bless2, { x: clamp((mx - daughter.x) / h.grandmother.h, 0.1, 0.3), y: -0.8 }),
      -1,
    );

    // The kahi of pitha and laru between them.
    actors.push({ y: 0.5, draw: () => this.kahi(g, 5.85, 0.5) });

    // The son: comes, bows, gives the gamosa, folds his hands; later brings out the xorai.
    let sonPose: Pose;
    if (p > 0.545) sonPose = pose.offer("xorai", 1, 0.25);
    else if (son.walking) sonPose = pose.walk(t * 2.4);
    else if (son.given < 0.5 && son.bow > 0.01) sonPose = pose.offer("gamosa", son.bow, son.bow);
    else if (son.given >= 0.5)
      sonPose = { ...pose.stand(), bow: son.bow, crouch: son.bow * 0.04, left: { x: 0.01, y: -0.74 }, right: { x: 0.03, y: -0.74 } };
    else sonPose = { ...pose.offer("gamosa", 0, 0), bow: 0.1 };
    this.person(actors, g, h.son, son.x, son.y, sonPose, -1);

    if (daughter.shown) {
      let dPose: Pose;
      if (daughter.walking) dPose = pose.walk(t * 2.4);
      else if (husori > 0.01) dPose = pose.clap(beat, 0);
      else if (daughter.given < 0.5) dPose = pose.offer("gamosa", daughter.bow, daughter.bow);
      else dPose = { ...pose.stand(), bow: daughter.bow, left: { x: 0.0, y: -0.74 }, right: { x: 0.03, y: -0.74 } };
      this.person(actors, g, h.daughter, daughter.x, daughter.y, dPose, 1);
    }

    // The children, with pitha, then clapping for the husori.
    const girlPose =
      husori > 0.01
        ? pose.clap(beat + 0.2)
        : { ...pose.stand(), right: { x: 0.1, y: -0.8 + Math.sin(t * 0.8) * 0.04 }, hold: "pitha" as const };
    this.person(actors, g, h.girl, 10.0, 0.95, girlPose, -1);
    const boyPose =
      husori > 0.01
        ? pose.leap(beat, 0.5, 1)
        : { ...pose.stand(), left: { x: -0.1, y: -0.55 }, right: { x: 0.16, y: -0.78 }, hold: "pitha" as const };
    this.person(actors, g, h.boy, 10.8, 0.78, boyPose, -1);

    // At the loom, until the husori come.
    if (p < 0.5) {
      const knock = Math.pow(1 - ((t * 1.1) % 1), 3);
      const weave: Pose = {
        ...pose.seated(0),
        bow: 0.35,
        left: { x: -0.14, y: -0.58 + knock * 0.03 },
        right: { x: 0.14, y: -0.58 + knock * 0.03 },
      };
      actors.push({ y: 0.36, draw: () => drawFigure(g, 13.7, 0.36, h.weaver, weave, 1) });
    }
  }

  /** A bell-metal kahi: til pitha rolled like cigars, ghila pitha, laru, and doi-chira in a bati. */
  private kahi(g: Ctx, x: number, y: number) {
    this.shadow(g, x, y, 0.4);
    const metal = g.createLinearGradient(x - 0.36, 0, x + 0.36, 0);
    metal.addColorStop(0, "#8a5a1e");
    metal.addColorStop(0.4, "#f0c870");
    metal.addColorStop(1, "#7a4a16");
    g.fillStyle = metal;
    g.beginPath();
    g.ellipse(x, y - 0.03, 0.36, 0.09, 0, 0, TAU);
    g.fill();
    g.fillStyle = "#f6dc98";
    g.beginPath();
    g.ellipse(x, y - 0.05, 0.3, 0.065, 0, 0, TAU);
    g.fill();
    // Til pitha.
    g.fillStyle = "rgb(240, 228, 200)";
    for (let k = 0; k < 4; k++) {
      g.save();
      g.translate(x - 0.16 + k * 0.035, y - 0.08 - k * 0.012);
      g.rotate(-0.3);
      g.fillRect(-0.09, -0.015, 0.18, 0.03);
      g.restore();
    }
    // Laru: coconut and sesame balls.
    for (const [dx, dy, c] of [
      [0.08, -0.09, "rgb(248, 240, 222)"],
      [0.14, -0.08, "rgb(160, 110, 60)"],
      [0.11, -0.13, "rgb(248, 240, 222)"],
      [0.19, -0.11, "rgb(160, 110, 60)"],
    ] as const) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x + dx, y + dy, 0.035, 0, TAU);
      g.fill();
    }
    // Ghila pitha, round and fried.
    g.fillStyle = "rgb(176, 110, 50)";
    g.beginPath();
    g.ellipse(x - 0.02, y - 0.1, 0.06, 0.03, 0, 0, TAU);
    g.fill();
    // Doi-chira beside it in a bati.
    g.fillStyle = metal;
    g.beginPath();
    g.moveTo(x + 0.36, y - 0.12);
    g.lineTo(x + 0.6, y - 0.12);
    g.quadraticCurveTo(x + 0.58, y + 0.02, x + 0.48, y + 0.02);
    g.quadraticCurveTo(x + 0.38, y + 0.02, x + 0.36, y - 0.12);
    g.fill();
    g.fillStyle = "rgb(250, 248, 240)";
    g.beginPath();
    g.ellipse(x + 0.48, y - 0.12, 0.12, 0.03, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgb(226, 206, 160)";
    for (let k = 0; k < 5; k++) g.fillRect(x + 0.4 + k * 0.035, y - 0.13 + (k % 2) * 0.01, 0.02, 0.008);
  }

  // ─── IV. Husori: the courtyard ─────────────────────────────────────────────

  /** Where each husori singer is: walking in, going round in the ring, standing to bless. */
  private ringPositions(seconds: number, p: number) {
    const bless = rise(p, MOMENTS.bless[0], MOMENTS.bless[0] + 0.012);
    return this.members.map((m, i) => {
      const arrive = rise(p, m.start, m.start + 0.04);
      const angle = m.angle + this.spin;
      const rx = RING.rx * lerp(1, 0.85, bless);
      const ringX = RING.x + Math.cos(angle) * rx;
      const ringY = RING.y + Math.sin(angle) * RING.ry;
      const startX = RING.x + 8.5 + i * 0.75;
      const startY = 1.5 + (i % 3) * 0.35;
      const x = lerp(startX, ringX, arrive);
      const y = lerp(startY, ringY, arrive);
      const walking = arrive > 0 && arrive < 1;
      const facing: 1 | -1 = walking ? -1 : bless > 0.5 ? (x < RING.x ? 1 : -1) : -Math.sin(angle) >= 0 ? 1 : -1;
      return { x, y, facing, walking, bless, arrive, phase: seconds + i * 0.13 };
    });
  }

  private husori(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    if (p < 0.45 || p > 0.72 || !onScreen(this.v!, RING.x, RING.y - 1, 12)) return;
    const beat = seconds / HUSORI_BEAT;
    const positions = this.ringPositions(seconds, p);
    this.members.forEach((m, i) => {
      const at = positions[i];
      if (at.arrive <= 0) return;
      const look = m.gifted ? { ...m.look, gamosa: "shoulders" as const } : m.look;
      let body: Pose;
      if (at.bless > 0.5 && m.role !== "dhol" && m.role !== "pepa") {
        body = { ...pose.stand(), bow: 0.35, left: { x: -0.015, y: -0.8 }, right: { x: 0.015, y: -0.8 } };
      } else {
        body = this.play(m.role, beat + m.seed * 0.02, at.bless > 0.5 ? 0.15 : 0.6, m.seed);
        if (at.walking) body.lift = Math.sin(seconds * 6 + i);
      }
      this.person(actors, g, look, at.x, at.y, body, at.facing);
    });
  }

  // ─── V. Bihu naach: the Bihutoli ───────────────────────────────────────────

  private naachEnergy(p: number, seconds: number) {
    const on = rise(p, 0.64, 0.675) * (1 - 0.55 * rise(p, 0.78, 0.8));
    const climax = rise(p, MOMENTS.climax[0], MOMENTS.climax[0] + 0.02) * (1 - rise(p, MOMENTS.climax[1], MOMENTS.climax[1] + 0.02));
    const boost = Math.exp(-Math.max(0, seconds - this.struck) * 2.5) * 0.35;
    return { energy: on * lerp(0.75, 1.15, climax) + boost, climax };
  }

  private naach(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    if (p > 0.805 || !onScreen(this.v!, TOLI.x, TOLI.y - 1, 13)) return;
    const { energy } = this.naachEnergy(p, seconds);
    const t = this.naachBeat;
    for (const d of this.dancers) {
      const body = dancePose(t + d.seed * 0.05, Math.max(0.2, energy), d.seed);
      const step = Math.sin(t * Math.PI * 0.25 + d.seed) * 0.12 * energy;
      this.person(actors, g, d.look, d.x + step, d.y, body, d.facing);
    }
    for (const b of this.band)
      this.person(actors, g, b.look, b.x, b.y, this.play(b.role, t + b.seed * 0.03, Math.max(0.3, energy), b.seed), b.facing);
    for (const c of this.crowd) {
      const body = c.role === "clap" ? pose.clap(t * 0.5 + c.seed, 0) : this.play(c.role, t, 0, c.seed);
      this.person(actors, g, c.look, c.x, c.y, body, c.facing);
    }
  }

  // ─── VI. Mukoli Bihu: the open fields ──────────────────────────────────────

  private fields(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    if (p < 0.7 || !onScreen(this.v!, FIELD.x, FIELD.y - 1, 9)) return;
    const t = seconds / 0.42;
    this.night.forEach((m, i) => {
      const angle = m.x + this.nightSpin;
      const x = FIELD.x + Math.cos(angle) * 2.1;
      const y = FIELD.y + 0.2 + Math.sin(angle) * 0.5;
      const facing: 1 | -1 = -Math.sin(angle) >= 0 ? 1 : -1;
      this.person(actors, g, m.look, x, y, this.play(m.role, t + i * 0.1, 0.8, m.seed), facing);
    });
    // A hurricane lantern hung on a bamboo pole in the middle of them.
    actors.push({
      y: FIELD.y + 0.2,
      draw: () => {
        const x = FIELD.x;
        const y = FIELD.y + 0.2;
        g.strokeStyle = "rgb(150, 130, 80)";
        g.lineWidth = 0.05;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y - 1.7);
        g.lineTo(x + 0.3, y - 1.75);
        g.stroke();
        g.fillStyle = "rgb(60, 50, 40)";
        g.fillRect(x + 0.2, y - 1.72, 0.2, 0.04);
        g.fillStyle = "rgb(255, 214, 140)";
        g.beginPath();
        g.ellipse(x + 0.3, y - 1.5, 0.08, 0.13, 0, 0, TAU);
        g.fill();
        g.fillStyle = "rgb(60, 50, 40)";
        g.fillRect(x + 0.21, y - 1.38, 0.18, 0.04);
      },
    });
  }

  // ─── Things in the air ─────────────────────────────────────────────────────

  /** Gamosas thrown from the verandah to the husori, fluttering as they go. */
  private flying(g: Ctx, f: Frame) {
    if (!this.tosses.length) return;
    const positions = this.ringPositions(f.seconds, f.p);
    const landed: Toss[] = [];
    for (const toss of this.tosses) {
      toss.age += f.dt;
      const t = Math.min(1, toss.age / 0.9);
      const m = this.members[toss.member];
      const to = { x: positions[toss.member].x, y: positions[toss.member].y - m.look.h * 0.8 };
      const x = lerp(toss.from.x, to.x, t);
      const y = lerp(toss.from.y, to.y, t) - Math.sin(t * Math.PI) * 2.2;
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(toss.age * 9) * 0.5 + t * 3);
      const flap = 0.6 + 0.4 * Math.sin(toss.age * 14);
      g.fillStyle = "rgb(246, 242, 232)";
      g.fillRect(-0.4, -0.1 * flap, 0.8, 0.2 * flap);
      g.fillStyle = "rgb(196, 32, 38)";
      g.fillRect(-0.4, -0.1 * flap, 0.07, 0.2 * flap);
      g.fillRect(0.33, -0.1 * flap, 0.07, 0.2 * flap);
      g.fillRect(-0.4, -0.1 * flap, 0.8, 0.02);
      g.restore();
      if (t >= 1) landed.push(toss);
    }
    for (const toss of landed) {
      this.members[toss.member].gifted = true;
      this.emit("hoi");
    }
    this.tosses = this.tosses.filter((t) => !landed.includes(t));
  }

  /** Kopou petals drifting down on their own in Chot; blossom and dust in the gold light of the dance. */
  private drift(g: Ctx, f: Frame) {
    const { p, seconds } = f;
    if (!f.reduced && p > 0.08 && p < 0.21 && seconds > this.nextDrift) {
      this.nextDrift = seconds + 0.5 + Math.random() * 0.6;
      const r = this.racemes[Math.floor(Math.random() * this.racemes.length)];
      this.air.petalsFrom(r.x, r.y + 0.4, 1, 0.2, KOPOU.y + 0.6);
    }
    const gold = rise(p, 0.64, 0.68) * (1 - rise(p, 0.77, 0.8));
    if (gold < 0.01) return;
    const t = f.reduced ? 0 : seconds;
    const random = mulberry32(31);
    g.fillStyle = "rgba(255, 236, 190, 0.8)";
    for (let i = 0; i < 70; i++) {
      const x = TOLI.x - 9 + random() * 18 + Math.sin(t * 0.3 + i) * 0.5;
      const fall = (random() * 6 + t * (0.15 + random() * 0.15)) % 6;
      const y = -4.5 + fall + Math.sin(t + i) * 0.1;
      g.globalAlpha = gold * (0.3 + 0.5 * random()) * Math.sin((fall / 6) * Math.PI);
      g.fillRect(x, y, 0.035, 0.035);
    }
    g.globalAlpha = 1;
  }

  // ─── Light ─────────────────────────────────────────────────────────────────

  private lights(ctx: Ctx, v: View, f: Frame, dark: number) {
    const { p, seconds, dt } = f;
    const t = f.reduced ? 0 : seconds;
    const lamp = glowSprite(LAMP);
    // The saki in the namghar, lit at dusk, and again at night.
    const evening = Math.max(rise(p, 0.185, 0.205) * (1 - rise(p, 0.23, 0.25)), rise(p, 0.82, 0.9));
    if (evening > 0.01) {
      const fl = flicker(t, 2);
      glow(ctx, lamp, NAMGHAR.x, NAMGHAR.y - 0.8, 1.4 * fl, 0.55 * evening);
      glow(ctx, lamp, NAMGHAR.x, NAMGHAR.y - 0.75, 0.35 * fl, 0.9 * evening);
      for (const dx of [-1.9, 1.9]) glow(ctx, lamp, HOUSE.x + dx, -1.17, 0.9 * fl, 0.4 * evening);
    }
    // Sun through the mango leaves on the dancing ground.
    const gold = rise(p, 0.63, 0.67) * (1 - rise(p, 0.775, 0.8));
    if (gold > 0.01 && onScreen(v, TOLI.x, TOLI.y, 12)) {
      const sun = glowSprite(SUN);
      glow(ctx, sun, TOLI.x + 7, -5.5, 10, 0.22 * gold);
      const random = mulberry32(12);
      for (let i = 0; i < 26; i++) {
        const x = TOLI.x - 8 + random() * 16;
        const y = 0.5 + random() * 3;
        const r = 0.35 + random() * 0.6;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.35);
        glow(ctx, sun, 0, 0, r * 1.4, gold * (0.07 + 0.05 * Math.sin(t * 0.7 + i * 1.7)));
        ctx.restore();
      }
    }
    // Each stroke of the dhol, going out from the drum.
    for (const pulse of this.pulses) {
      pulse.age += dt || 0.016;
      const k = pulse.age / 0.7;
      if (k >= 1) continue;
      ctx.strokeStyle = `rgba(255, 220, 150, ${0.6 * (1 - k)})`;
      ctx.lineWidth = 0.05 * (1 - k) + 0.01;
      ctx.beginPath();
      ctx.ellipse(pulse.x, pulse.y, 0.2 + k * 1.3, 0.12 + k * 0.6, 0, 0, TAU);
      ctx.stroke();
    }
    this.pulses = this.pulses.filter((pulse) => pulse.age < 0.7);
    // The lantern in the fields.
    const night = rise(p, 0.8, 0.84);
    if (night > 0.01) {
      const fl = flicker(t, 5);
      glow(ctx, lamp, FIELD.x + 0.3, FIELD.y - 1.3, 3.2 * fl, 0.45 * night);
      glow(ctx, lamp, FIELD.x + 0.3, FIELD.y - 1.3, 0.5 * fl, 0.9 * night);
    }
    this.flies.draw(ctx, v, seconds, night * dark, f.reduced);
    this.village.draw(ctx, v, seconds, rise(p, 0.9, 0.96), f.reduced);
  }

  private grade(g: Ctx, p: number) {
    const alpha = track(GRADE_ALPHA, p);
    if (alpha < 0.005) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = rgb(track(GRADE, p), alpha);
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.restore();
  }

  /** Clocks that run with the music: the husori going round, the dance's beat, the ring at night. */
  private tick(f: Frame) {
    const { p, dt } = f;
    const bless = rise(p, MOMENTS.bless[0], MOMENTS.bless[0] + 0.012);
    this.spin += dt * 0.22 * (1 - bless);
    const { climax } = this.naachEnergy(p, f.seconds);
    this.naachBeat += dt / (NAACH_BEAT * lerp(1, 0.86, climax));
    this.nightSpin += dt * 0.12;
  }

  private cues(f: Frame) {
    const { p } = f;
    const passed = (point: number) => this.previous < point && p >= point && p - point < 0.03;
    if (f.reduced) return;
    if (passed(MOMENTS.climax[0])) {
      for (const b of this.band) this.pulses.push({ x: b.x, y: b.y - b.look.h * 0.5, age: 0 });
    }
    if (passed(MOMENTS.kopou[0] + 0.02))
      for (const r of this.racemes.slice(0, 6)) this.air.petalsFrom(r.x, r.y + 0.3, 4, 0.3, KOPOU.y + 0.6);
  }
}

export function createScene(emit: Emit): Scene {
  return new Bihu(emit);
}
