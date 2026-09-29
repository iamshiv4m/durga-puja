// Everyone in the journey, and where each of them is and what they are doing at scroll progress p:
// the children singing at the door, the family walking round the Lohri fire, the women's gidda, the
// reapers and the bhangra in the stubble, the sangat, the Panj Pyare and the langar at the
// gurdwara, and the crowd at the mela.
import {
  TAU,
  clamp,
  lerp,
  mulberry32,
  rgb,
  rise,
  type Ctx,
  type RGB,
} from "../paint";
import type { Frame } from "../types";
import { HARVEST } from "./fields";
import { reapLine } from "./land";
import {
  BRIGHT,
  SKIN,
  bhangraPose,
  drawPerson,
  drawSeated,
  giddaPose,
  makeChild,
  makeDancer,
  makeGidda,
  makeLook,
  makePyara,
  type Hold,
  type Look,
  type Pose,
} from "./people";
import {
  CART,
  DOOR,
  FIRE,
  GURDWARA,
  KABADDI,
  LANGAR,
  drawBalloons,
  drawCharpai,
  drawNishan,
  drawStook,
} from "./places";
import { MOMENTS } from "./timeline";

export type Actor = { y: number; draw: () => void };

type Random = () => number;
type Walker = {
  look: Look;
  x: number;
  y: number;
  speed: number;
  seed: number;
  hold?: Hold;
};
type Ringer = {
  look: Look;
  angle: number;
  seed: number;
  hold?: Hold;
  next: number;
  thrown: number;
};

/** Where the fire's heart is, that offerings are thrown at. */
export const FIRE_TOP = { x: FIRE.x, y: FIRE.y - FIRE.h * 0.55 };
/** The gidda's ring, beside the fire. */
export const GIDDA = { x: 5.2, y: 4.7, rx: 1.35, ry: 0.46 };
/** The bhangra in the stubble in front of the harvest. */
export const FIELD_DANCE = { x: 27.2, y: 4.9 };
/** The dhol player at the mela, that the reader plays through. */
export const DHOLI = { x: 67.4, y: 3.7 };

const LIGHT_CLOTHES: RGB[] = [
  [240, 236, 226],
  [226, 222, 208],
  [214, 226, 236],
];
const LOI: RGB[] = [
  [120, 96, 72],
  [150, 60, 50],
  [70, 66, 80],
  [200, 190, 170],
  [96, 80, 110],
];

/** Walking: arms swinging against the legs. */
export function walking(
  seconds: number,
  seed: number,
  moving: number,
  hold?: Hold,
  rate = 5,
): Pose {
  const s = Math.sin(seconds * rate + seed) * moving;
  const carry =
    hold === "plate" ||
    hold === "baby" ||
    hold === "sheaf" ||
    hold === "bucket" ||
    hold === "nishan" ||
    hold === "sword";
  return {
    la: carry ? (hold === "baby" ? 0.7 : 1.0) : -s * 0.35,
    lf: carry ? (hold === "baby" ? 1.9 : 1.5) : -s * 0.4 - 0.08,
    ra: carry
      ? hold === "baby"
        ? 0.6
        : hold === "nishan"
          ? 0.9
          : 1.05
      : s * 0.35,
    rf: carry
      ? hold === "baby"
        ? 1.8
        : hold === "nishan"
          ? 2.4
          : 1.55
      : s * 0.4 + 0.08,
    bob: -Math.abs(s) * 0.012,
    lift: s > 0 ? [0, s * 0.3] : [-s * 0.3, 0],
    hold,
  };
}

function shawled(look: Look, random: Random) {
  look.shawl = LOI[Math.floor(random() * LOI.length)];
  return look;
}

export class Cast {
  readonly children: Look[] = [];
  readonly neighbour: Look;
  readonly ring: Ringer[] = [];
  readonly family: { look: Look; hold?: Hold; offset: number }[] = [];
  readonly gidda: Look[] = [];
  readonly elders: Look[] = [];
  readonly saag: Look[] = [];
  readonly reapers: Look[] = [];
  readonly binders: Look[] = [];
  readonly fieldDancers: Look[] = [];
  readonly players: { look: Look; hold: Hold; x: number; y: number }[] = [];
  readonly sangat: { look: Look; x: number; y: number; seed: number }[] = [];
  readonly pyare: Look[] = [];
  readonly followers: { look: Look; seed: number; dx: number; y: number }[] =
    [];
  readonly nishanchis: Look[] = [];
  readonly sevadars: Look[] = [];
  readonly pangat: {
    look: Look;
    x: number;
    y: number;
    facing: 1 | -1;
    seed: number;
  }[] = [];
  readonly servers: Look[] = [];
  readonly walkers: Walker[] = [];
  readonly kabaddi: Look[] = [];
  readonly melaDancers: Look[] = [];
  readonly dholi: Look;
  readonly balloonMan: Look;
  readonly riders: RGB[] = SKIN;
  /** When the reader last struck the dhol at the mela. */
  struck = -10;
  /** The child's hurricane lantern in the lane, for its light. */
  lantern: { x: number; y: number; alpha: number } | null = null;

  constructor() {
    const random = mulberry32(1414);
    for (let i = 0; i < 6; i++)
      this.children.push(makeChild(random, i % 2 === 1));
    this.neighbour = shawled(makeLook(random, true), random);
    this.neighbour.wrap = [236, 226, 206];

    // The family and the neighbours, wrapped against the cold, going round the fire.
    for (let i = 0; i < 9; i++) {
      const woman = i % 2 === 0;
      const look = shawled(makeLook(random, woman), random);
      if (!woman) look.top = LIGHT_CLOTHES[i % 3];
      this.ring.push({
        look,
        angle: (i / 9) * TAU + random() * 0.25,
        seed: random() * 10,
        hold: i % 3 === 1 ? "plate" : undefined,
        next: random() * 3,
        thrown: -10,
      });
    }

    // The first Lohri: the mother with the baby in a red shawl, the father, and a bride in her chooda.
    const mother = makeGidda(random, 0);
    mother.lower = "salwar";
    mother.top = [196, 30, 60];
    mother.bottom = [230, 180, 60];
    mother.wrap = [180, 26, 40];
    const father = makeLook(random, false, 1.74);
    father.head = "pagg";
    father.wrap = [240, 110, 150];
    father.top = [240, 236, 226];
    father.beard = true;
    father.shawl = [110, 80, 60];
    const bride = makeGidda(random, 3);
    bride.lower = "salwar";
    bride.top = [200, 20, 50];
    bride.bottom = [200, 20, 50];
    bride.wrap = [214, 40, 70];
    bride.chooda = true;
    const groom = makeLook(random, false, 1.76);
    groom.wrap = [250, 150, 40];
    groom.top = [236, 226, 200];
    groom.beard = true;
    this.family.push(
      { look: mother, hold: "baby", offset: 0 },
      { look: father, offset: -0.45 },
      { look: bride, offset: Math.PI },
      { look: groom, offset: Math.PI - 0.45 },
    );

    for (let i = 0; i < 8; i++) this.gidda.push(makeGidda(random, i));
    for (let i = 0; i < 2; i++) {
      const elder = shawled(makeLook(random, i === 1, 1.6), random);
      elder.wrap = i === 0 ? [236, 236, 230] : [236, 232, 222];
      elder.beard = i === 0;
      this.elders.push(elder);
    }

    // The fields.
    for (let i = 0; i < 2; i++) this.saag.push(makeLook(random, true));
    for (let i = 0; i < 4; i++) {
      const look = makeLook(random, false);
      look.lower = "tehmat";
      look.top = LIGHT_CLOTHES[i % 3];
      look.bottom = [236, 232, 220];
      look.head = "pagg";
      this.reapers.push(look);
    }
    for (let i = 0; i < 2; i++) this.binders.push(makeLook(random, true));
    for (let i = 0; i < 7; i++) this.fieldDancers.push(makeDancer(random, i));
    const player = (hold: Hold, x: number, y: number) => {
      const look = makeLook(random, false, 1.72);
      look.head = "pagg";
      look.wrap =
        hold === "dhol"
          ? [236, 132, 22]
          : BRIGHT[Math.floor(random() * BRIGHT.length)];
      look.lower = "tehmat";
      look.beard = true;
      this.players.push({ look, hold, x, y });
    };
    player("dhol", FIELD_DANCE.x - 0.3, FIELD_DANCE.y - 1.05);
    player("tumbi", FIELD_DANCE.x + 2.6, FIELD_DANCE.y - 0.95);
    player("chimta", FIELD_DANCE.x - 2.9, FIELD_DANCE.y - 0.9);

    // The gurdwara: the sangat facing it, the Panj Pyare, two Nishanchis, sevadars and the langar.
    for (let i = 0; i < 12; i++) {
      const woman = i % 3 === 1;
      const look = makeLook(random, woman);
      if (!woman) {
        look.head = "dastar";
        look.wrap = [
          [236, 132, 22],
          [22, 38, 96],
          [250, 196, 40],
          [236, 236, 236],
        ][i % 4] as RGB;
        look.beard = true;
      } else look.wrap = [240, 236, 226];
      this.sangat.push({
        look,
        x: GURDWARA.x - 4.4 + (i % 6) * 1.5 + random() * 0.4,
        y: 0.35 + Math.floor(i / 6) * 0.55 + random() * 0.1,
        seed: random() * 10,
      });
    }
    const skins = [SKIN[1], SKIN[2], SKIN[0], SKIN[4], SKIN[3]];
    for (let i = 0; i < 5; i++) this.pyare.push(makePyara(skins[i]));
    for (let i = 0; i < 2; i++) {
      const look = makePyara(skins[(i + 2) % 5]);
      look.top = [240, 236, 226];
      look.bottom = [240, 236, 226];
      this.nishanchis.push(look);
    }
    for (let i = 0; i < 2; i++) {
      const look = makeLook(random, i === 1);
      look.top = [240, 236, 226];
      if (!look.woman) {
        look.head = "dastar";
        look.wrap = [22, 38, 96];
      }
      this.sevadars.push(look);
    }
    for (let i = 0; i < 14; i++) {
      const woman = i % 2 === 1;
      const look = makeLook(random, woman);
      if (!woman) {
        look.head = "dastar";
        look.wrap = [
          [236, 132, 22],
          [22, 38, 96],
          [250, 196, 40],
          [214, 38, 70],
        ][i % 4] as RGB;
      }
      this.followers.push({
        look,
        seed: random() * 10,
        dx: 6.6 + i * 0.62 + random() * 0.2,
        y: 2.05 + (i % 2) * 0.55,
      });
    }
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 6; i++) {
        const look = makeLook(random, (i + row) % 2 === 0);
        if (!look.woman) look.head = "dastar";
        this.pangat.push({
          look,
          x: LANGAR.x0 + 0.55 + i * 0.72,
          y: LANGAR.y0 + 0.62 + row * 0.95 - 0.02,
          facing: row === 0 ? 1 : -1,
          seed: random() * 10,
        });
      }
    }
    for (let i = 0; i < 2; i++) {
      const look = makeLook(random, i === 1);
      look.top = [240, 236, 226];
      if (!look.woman) {
        look.head = "dastar";
        look.wrap = [236, 132, 22];
      }
      this.servers.push(look);
    }

    // The mela.
    for (let i = 0; i < 22; i++) {
      const child = random() < 0.25;
      const look = child
        ? makeChild(random, random() < 0.5)
        : makeLook(random, random() < 0.5);
      look.shawl = undefined;
      this.walkers.push({
        look,
        x: 58 + random() * 24,
        y: 1.5 + random() * 2.6,
        speed: (random() < 0.5 ? -1 : 1) * (0.22 + random() * 0.2),
        seed: random() * 10,
      });
    }
    for (let i = 0; i < 5; i++) {
      const look = makeLook(random, false, 1.7);
      look.lower = "shorts";
      look.top = i === 0 ? [214, 38, 70] : [240, 236, 226];
      look.bottom = i === 0 ? [30, 30, 40] : [22, 38, 96];
      look.head = "patka";
      look.wrap = i === 0 ? [214, 38, 70] : [22, 38, 96];
      this.kabaddi.push(look);
    }
    for (let i = 0; i < 5; i++)
      this.melaDancers.push(makeDancer(random, i + 3));
    this.dholi = makeLook(random, false, 1.74);
    this.dholi.head = "turla";
    this.dholi.wrap = [236, 132, 22];
    this.dholi.vest = [30, 26, 40];
    this.dholi.lower = "tehmat";
    this.dholi.bottom = [28, 140, 110];
    this.dholi.beard = true;
    this.balloonMan = makeLook(random, false);
  }

  // ─── The lane ──────────────────────────────────────────────────────────────

  /** Children at the neighbour's door, singing for their Lohri; she comes out with rewri. */
  lane(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    this.lantern = null;
    if (p < 0.03 || p > 0.215) return;
    const arrive = rise(p, 0.05, MOMENTS.door);
    const leave = rise(p, 0.168, 0.205);
    const fade = 1 - rise(p, 0.195, 0.212);
    const singing = rise(p, MOMENTS.door - 0.01, MOMENTS.door) * (1 - leave);
    const beat = seconds * 2.2;
    this.children.forEach((look, i) => {
      const home = DOOR.x - 1.75 + i * 0.66 + (i > 2 ? 0.45 : 0);
      const x = home - (1 - arrive) * (7 + i * 0.4) + leave * (9 + i * 0.3);
      const y = 0.62 + ((i * 2) % 3) * 0.22;
      const moving =
        Math.max(1 - arrive, leave) > 0.001 && (arrive < 0.999 || leave > 0.001)
          ? 1
          : 0;
      const hold: Hold | undefined =
        i === 1 ? "lantern" : i === 4 ? "bag" : undefined;
      let pose: Pose;
      let facing: 1 | -1 = 1;
      if (moving) pose = walking(seconds, i, 1, hold, 6);
      else {
        facing = x < DOOR.x ? 1 : -1;
        if (hold === "lantern")
          pose = {
            la: 0.1,
            lf: 0.2,
            ra: 0.9,
            rf: 1.3,
            hold,
            bob: -0.01 * Math.abs(Math.sin(beat * Math.PI + i)),
          };
        else if (hold === "bag") {
          const reach = rise(p, MOMENTS.rewri, MOMENTS.rewri + 0.01);
          pose = {
            la: 0.1,
            lf: 0.2,
            ra: lerp(0.3, 1.3, reach),
            rf: lerp(0.4, 1.5, reach),
            hold,
          };
        } else {
          pose = giddaPose(beat * 0.5, i * 1.3, singing);
          pose.bob =
            (pose.bob ?? 0) - 0.015 * Math.abs(Math.sin(beat * Math.PI + i));
        }
      }
      actors.push({
        y,
        draw: () => {
          g.globalAlpha = fade;
          const hands = drawPerson(g, x, y, look, pose, facing);
          if (hold === "lantern")
            this.lantern = { x: hands.tip.x, y: hands.tip.y, alpha: fade };
          g.globalAlpha = 1;
        },
      });
    });
    // The door opens; she stands in it with a thali of rewri, gur and a few coins.
    const open =
      rise(p, MOMENTS.rewri - 0.022, MOMENTS.rewri - 0.01) *
      (1 - rise(p, 0.18, 0.2));
    if (open > 0.01) {
      actors.push({
        y: 0.02,
        draw: () => {
          const dx = DOOR.x - DOOR.w / 2;
          g.fillStyle = rgb([255, 196, 120], open);
          g.fillRect(dx, -DOOR.h, DOOR.w, DOOR.h);
          g.fillStyle = rgb([210, 130, 60], open * 0.6);
          g.fillRect(dx, -DOOR.h * 0.3, DOOR.w, DOOR.h * 0.3);
          // The door leaves, swung inwards and seen edge-on.
          g.fillStyle = rgb([40, 70, 96], open);
          g.fillRect(dx - 0.02, -DOOR.h, 0.1, DOOR.h);
          g.fillRect(dx + DOOR.w - 0.08, -DOOR.h, 0.1, DOOR.h);
        },
      });
      const give = rise(p, MOMENTS.rewri, MOMENTS.rewri + 0.012);
      const pose: Pose = {
        la: lerp(1.0, 1.3, give),
        lf: lerp(1.5, 1.9, give),
        ra: lerp(1.0, 1.3, give),
        rf: lerp(1.5, 1.9, give),
        hold: "plate",
        lean: give * 0.1,
      };
      actors.push({
        y: 0.1,
        draw: () => {
          g.globalAlpha = open;
          drawPerson(g, DOOR.x + 0.05, 0.1, this.neighbour, pose, -1);
          g.globalAlpha = 1;
        },
      });
    }
  }

  // ─── The fire ──────────────────────────────────────────────────────────────

  /**
   * The parikrama: everyone walking slowly round the fire, throwing til, rewri and popcorn in as
   * they pass the front; `offer` is called with where each handful leaves the hand.
   */
  fire(
    actors: Actor[],
    g: Ctx,
    f: Frame,
    offer: (x: number, y: number, count: number) => void,
  ) {
    const { p, seconds } = f;
    const present = rise(p, 0.182, 0.2) * (1 - rise(p, 0.405, 0.425));
    if (present < 0.01) return;
    const walk = rise(p, MOMENTS.parikrama[0], MOMENTS.parikrama[0] + 0.01);
    const turn = (f.reduced ? 0 : seconds * 0.1 * walk) + p * 4;
    const around = (
      angle: number,
      look: Look,
      hold: Hold | undefined,
      seed: number,
      thrown: number,
    ) => {
      const x = FIRE.x + Math.cos(angle) * 2.25;
      const y = FIRE.y + Math.sin(angle) * 0.78;
      // Walking clockwise as seen from above: to the right along the front, back along the far side.
      const facing: 1 | -1 = Math.sin(angle) > 0 ? -1 : 1;
      const throwing = clamp(1 - (seconds - thrown) / 0.6);
      const pose = walking(seconds, seed, walk, hold, 3.2);
      if (throwing > 0 && !hold) {
        pose.ra = lerp(pose.ra, 2.1, throwing);
        pose.rf = lerp(pose.rf, 2.5, throwing);
      }
      return { x, y, pose, facing };
    };
    this.ring.forEach((r) => {
      const angle = r.angle + turn;
      const at = around(angle, r.look, r.hold, r.seed, r.thrown);
      // Those passing the front throw a handful in, now and then.
      if (
        !f.reduced &&
        p > 0.205 &&
        p < 0.4 &&
        Math.sin(angle) > 0.2 &&
        seconds > r.next &&
        !r.hold
      ) {
        r.next = seconds + 2.5 + Math.random() * 3;
        r.thrown = seconds;
        offer(at.x, at.y - r.look.h * 0.85, 4);
      }
      actors.push({
        y: at.y,
        draw: () => {
          g.globalAlpha = present;
          drawPerson(g, at.x, at.y, r.look, at.pose, at.facing);
          g.globalAlpha = 1;
        },
      });
    });
    // The first Lohri's family joins the round.
    const pehli = rise(p, MOMENTS.pehli - 0.012, MOMENTS.pehli) * present;
    if (pehli > 0.01) {
      this.family.forEach((m) => {
        const angle = Math.PI * 0.5 + m.offset + turn * 0.9;
        const at = around(angle, m.look, m.hold, m.offset * 3, -10);
        actors.push({
          y: at.y,
          draw: () => {
            g.globalAlpha = pehli;
            drawPerson(g, at.x, at.y, m.look, at.pose, at.facing);
            g.globalAlpha = 1;
          },
        });
      });
    }
    // Two elders on a charpai, watching, warm in their lois.
    const cx = -3.1;
    const cy = 2.2;
    actors.push({
      y: cy,
      draw: () => {
        g.globalAlpha = present;
        drawCharpai(g, cx, cy);
        drawSeated(g, cx - 0.45, cy - 0.46, this.elders[0], 0, 1);
        drawSeated(g, cx + 0.4, cy - 0.46, this.elders[1], 0, 1);
        g.globalAlpha = 1;
      },
    });
  }

  /** Gidda: the women in a ring, clapping, one in the middle dancing, boliyan thrown across. */
  giddaRing(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const on =
      rise(p, MOMENTS.gidda[0] - 0.015, MOMENTS.gidda[0]) *
      (1 - rise(p, MOMENTS.gidda[1], MOMENTS.gidda[1] + 0.015));
    if (on < 0.01) return;
    const beat = seconds * 1.6;
    const energy = rise(p, MOMENTS.gidda[0], MOMENTS.gidda[0] + 0.03);
    const n = this.gidda.length - 1;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * TAU + (f.reduced ? 0 : seconds * 0.15);
      const x = GIDDA.x + Math.cos(angle) * GIDDA.rx;
      const y = GIDDA.y + Math.sin(angle) * GIDDA.ry;
      const facing: 1 | -1 = Math.cos(angle) > 0 ? -1 : 1;
      const pose = giddaPose(beat, i * 0.7, energy);
      actors.push({
        y,
        draw: () => {
          g.globalAlpha = on;
          drawPerson(g, x, y, this.gidda[i], pose, facing);
          g.globalAlpha = 1;
        },
      });
    }
    // Whoever has the boli dances in the middle; every few bars another takes her place.
    const turn = Math.floor(seconds / 6);
    const centre = this.gidda[n];
    centre.top = BRIGHT[(turn * 3) % BRIGHT.length];
    const pose = giddaPose(beat, 0, energy, true);
    const facing: 1 | -1 = Math.sin(seconds * 0.8) > 0 ? 1 : -1;
    actors.push({
      y: GIDDA.y + 0.01,
      draw: () => {
        g.globalAlpha = on;
        drawPerson(
          g,
          GIDDA.x + Math.sin(seconds * 0.8) * 0.25,
          GIDDA.y + 0.01,
          centre,
          pose,
          facing,
        );
        g.globalAlpha = 1;
      },
    });
  }

  // ─── The fields ────────────────────────────────────────────────────────────

  /** Two women in the mustard in Magh, picking the tender leaves for saag. */
  mustard(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const on = rise(p, 0.44, 0.455) * (1 - rise(p, 0.5, 0.515));
    if (on < 0.01) return;
    this.saag.forEach((look, i) => {
      const x = 10.6 + i * 1.5;
      const y = 2.6 + i * 0.9;
      const pick = Math.sin(seconds * 1.4 + i * 2);
      const pose: Pose = {
        la: 0.5,
        lf: 0.6 + pick * 0.2,
        ra: 0.4,
        rf: 0.5 - pick * 0.2,
        lean: 0.62,
        bob: 0.03,
        hold: i === 0 ? "bag" : undefined,
      };
      actors.push({
        y,
        draw: () => {
          g.globalAlpha = on;
          drawPerson(g, x, y, look, pose, i === 0 ? 1 : -1);
          g.globalAlpha = 1;
        },
      });
    });
  }

  /** How far the reapers have cut along the harvest strip. */
  line(p: number) {
    return reapLine(
      (p - MOMENTS.reap[0]) / (MOMENTS.reap[1] - MOMENTS.reap[0]),
    );
  }

  /** Vaisakhi: the reapers bent over their daatris, the sheaves tied and stood up, the cart filling. */
  harvest(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const on = rise(p, 0.536, 0.548) * (1 - rise(p, 0.652, 0.664));
    if (on < 0.01) return;
    const line = this.line(p);
    const reaping =
      rise(p, MOMENTS.reap[0], MOMENTS.reap[0] + 0.004) *
      (1 - rise(p, MOMENTS.reap[1] - 0.004, MOMENTS.reap[1] + 0.006));
    const gold: RGB = [222, 180, 92];
    // Stooks behind the reapers, stood up as each stretch is cut.
    for (let x = HARVEST.x0 + 0.7; x < HARVEST.x1 - 0.3; x += 1.55) {
      for (const [row, y] of [-0.6, 0.9, 2.3, 3.4].entries()) {
        const up = clamp((line - x - 0.9 - row * 0.2) / 0.6);
        if (up <= 0) continue;
        const sx =
          x +
          (row % 2) * 0.7 +
          (((row * 7 + Math.round(x * 3)) % 5) - 2) * 0.12;
        actors.push({
          y,
          draw: () => drawStook(g, sx, y, (0.55 + y * 0.03) * up, gold),
        });
      }
    }
    // Stooks already standing on the cut ground in front, from the days before.
    for (const [x, y, s] of [
      [17.6, 4.3, 0.8],
      [18.8, 5.9, 0.9],
      [20.1, 7.1, 1.0],
      [34.4, 4.6, 0.8],
      [35.6, 6.2, 0.95],
      [33.2, 7.3, 1.0],
    ]) {
      actors.push({ y, draw: () => drawStook(g, x, y, s * on, gold) });
    }

    // The reapers, one to a few rows, working along together.
    const rows = [-0.85, 0.4, 1.65, 2.95];
    this.reapers.forEach((look, i) => {
      const y = rows[i];
      const x = line + 0.25 - (i % 2) * 0.35;
      const swing = f.reduced
        ? 0.5
        : 0.5 + 0.5 * Math.sin(seconds * 3.2 + i * 1.7);
      const bent = reaping;
      const pose: Pose = {
        la: lerp(0.1, 0.55, bent),
        lf: lerp(0.15, 0.9, bent),
        ra: lerp(0.2, lerp(0.2, 1.0, swing), bent),
        rf: lerp(0.3, lerp(0.4, 1.9, swing), bent),
        lean: 0.78 * bent,
        bob: 0.05 * bent,
        hold: "sickle",
      };
      actors.push({
        y,
        draw: () => {
          g.globalAlpha = on;
          drawPerson(g, x, y, look, pose, 1);
          g.globalAlpha = 1;
        },
      });
    });
    // Women gathering the cut wheat into sheaves and carrying them to the cart.
    this.binders.forEach((look, i) => {
      const y = 1.1 + i * 1.3;
      const t = (seconds * 0.12 + i * 0.5) % 1;
      const carrying = t > 0.5;
      const from = Math.max(HARVEST.x0 + 0.5, line - 1.4 - i * 0.6);
      const x = carrying ? lerp(from, CART.x - 1.8, (t - 0.5) * 2) : from;
      const pose: Pose = carrying
        ? walking(seconds, i, 1, "sheaf", 4)
        : { la: 0.5, lf: 0.7, ra: 0.6, rf: 0.8, lean: 0.45, bob: 0.02 };
      actors.push({
        y,
        draw: () => {
          g.globalAlpha = on * rise(line, HARVEST.x0 + 1, HARVEST.x0 + 2);
          drawPerson(g, x, y, look, pose, 1);
          g.globalAlpha = 1;
        },
      });
    });
  }

  /** The dhol, the tumbi and the chimta, and the men dancing bhangra in the stubble. */
  fieldBhangra(actors: Actor[], g: Ctx, f: Frame, leap: number) {
    const { p, seconds } = f;
    const on =
      rise(p, MOMENTS.bhangra[0] - 0.008, MOMENTS.bhangra[0]) *
      (1 - rise(p, MOMENTS.bhangra[1], MOMENTS.bhangra[1] + 0.02));
    if (on < 0.01) return;
    const energy = rise(p, MOMENTS.hoy - 0.002, MOMENTS.hoy + 0.01);
    const beat = seconds / 0.6;
    this.players.forEach((m) =>
      actors.push({
        y: m.y,
        draw: () => this.player(g, m.look, m.hold, m.x, m.y, seconds, 1, on),
      }),
    );
    this.fieldDancers.forEach((look, i) => {
      const front = i < 4;
      const x =
        FIELD_DANCE.x -
        (front ? 3.3 : 2.4) +
        (front ? i : i - 4) * (front ? 2.2 : 2.4);
      const y = FIELD_DANCE.y + (front ? 0.5 : -0.3);
      const pose = bhangraPose(beat, i * 0.9, lerp(0.3, 1, energy));
      pose.bob = (pose.bob ?? 0) - leap * 0.14;
      const facing: 1 | -1 = i % 2 ? -1 : 1;
      actors.push({
        y,
        draw: () => {
          g.globalAlpha = on;
          drawPerson(g, x, y, look, pose, facing);
          g.globalAlpha = 1;
        },
      });
    });
  }

  /** A musician: the dhol on its strap, the tumbi's single string, or the chimta's jingling tongs. */
  player(
    g: Ctx,
    look: Look,
    hold: Hold,
    x: number,
    y: number,
    seconds: number,
    facing: 1 | -1,
    alpha: number,
    hit = 0,
  ) {
    const beat = seconds / 0.3;
    let pose: Pose;
    if (hold === "dhol") {
      const a = Math.sin(beat * Math.PI);
      const b = Math.cos(beat * Math.PI * 0.5);
      pose = {
        la: 0.7 + b * 0.25 + hit * 0.4,
        lf: 1.4 + b * 0.4 + hit * 0.6,
        ra: 0.55 + a * 0.2 + hit * 0.5,
        rf: 1.3 + a * 0.45 + hit * 0.8,
        hold,
        bob: -0.012 * Math.abs(a) - hit * 0.03,
        lift: [0, Math.max(0, a) * 0.2],
      };
    } else if (hold === "tumbi") {
      const pluck = Math.sin(beat * Math.PI * 2);
      pose = {
        la: 1.25,
        lf: 1.85 + pluck * 0.12,
        ra: 0.9,
        rf: 0.55,
        hold,
        bob: -0.01 * Math.abs(pluck),
        lift: [Math.max(0, pluck) * 0.25, 0],
      };
    } else {
      const clap = Math.sin(beat * Math.PI);
      pose = {
        la: 0.6,
        lf: 1.3 + clap * 0.2,
        ra: 0.9,
        rf: 2.3 + clap * 0.35,
        hold,
        bob: -0.015 * Math.abs(clap),
        lift: [0, Math.max(0, clap) * 0.3],
      };
    }
    g.globalAlpha = alpha;
    drawPerson(g, x, y, look, pose, facing);
    g.globalAlpha = 1;
  }

  // ─── The gurdwara ──────────────────────────────────────────────────────────

  /**
   * The sangat before the gurdwara; the five who stood up at Anandpur Sahib, rising one by one in
   * the old light, seen only from behind; then today's Panj Pyare leading the nagar kirtan out.
   */
  gurdwara(actors: Actor[], g: Ctx, f: Frame, memory: number) {
    const { p, seconds } = f;
    const on = rise(p, 0.648, 0.664) * (1 - rise(p, 0.79, 0.81));
    if (on < 0.01) return;
    const out = rise(p, MOMENTS.kirtan[0], MOMENTS.kirtan[0] + 0.012);
    const go = rise(p, MOMENTS.kirtan[0], MOMENTS.kirtan[1] + 0.03);
    const lead = lerp(GURDWARA.x + 3.4, 61.5, go);

    // The sangat, standing with folded hands, facing the gurdwara; they follow the procession out.
    const stay =
      1 - rise(p, MOMENTS.kirtan[0] + 0.004, MOMENTS.kirtan[0] + 0.016);
    if (stay > 0.01) {
      for (const s of this.sangat) {
        const pose: Pose = { la: 0.9, lf: 2.2, ra: 0.9, rf: 2.2, back: true };
        actors.push({
          y: s.y,
          draw: () => {
            g.globalAlpha = on * stay * (1 - memory);
            drawPerson(g, s.x, s.y, s.look, pose, 1);
            g.globalAlpha = 1;
          },
        });
      }
    }

    // The five.
    const [k0, k1] = MOMENTS.khalsa;
    const colour = rise(p, k1 - 0.004, k1 + 0.006);
    this.pyare.forEach((look, i) => {
      const rose = rise(p, k0 + i * 0.0045, k0 + i * 0.0045 + 0.004);
      if (rose < 0.01) return;
      const rank = 4 - i;
      const sx = GURDWARA.x - 1.8 + i * 0.9;
      const sy = 0.05;
      const walk = rise(p, MOMENTS.kirtan[0], MOMENTS.kirtan[0] + 0.016);
      const x = lerp(sx, lead - 1.1 - rank * 0.85, walk);
      const y = lerp(sy, 2.35 + (rank % 2) * 0.08, walk);
      const pose = walking(seconds, i * 1.3, walk, "sword", 3.6);
      pose.back = true;
      if (walk < 0.01) {
        pose.la = pose.ra = 0.9;
        pose.lf = pose.rf = 2.2;
        pose.lift = [0, 0];
      }
      const shadow: Look = {
        ...look,
        skin: [30, 20, 18],
        top: [40, 26, 20],
        bottom: [40, 26, 20],
        wrap: [44, 28, 22],
        sash: [26, 18, 16],
      };
      actors.push({
        y: y + 0.001 * i,
        draw: () => {
          g.globalAlpha = rose * (1 - colour);
          if (1 - colour > 0.01)
            drawPerson(g, x, y - (1 - rose) * 0.15, shadow, pose, 1);
          g.globalAlpha = rose * colour;
          if (colour > 0.01) drawPerson(g, x, y, look, pose, 1);
          g.globalAlpha = 1;
        },
      });
    });

    // The rest of the nagar kirtan: sevadars sweeping the road ahead, two Nishan Sahibs, the palki
    // with the Guru Granth Sahib, and the sangat walking behind singing.
    if (out < 0.01) return;
    this.sevadars.forEach((look, i) => {
      const x = lead + 2.8 + i * 1.0;
      const y = 2.3 + i * 0.3;
      const sweep = Math.sin(seconds * 3 + i);
      const pose: Pose =
        i === 0
          ? {
              la: 0.6,
              lf: 0.9,
              ra: 0.5 + sweep * 0.3,
              rf: 0.6 + sweep * 0.3,
              lean: 0.35,
              hold: "broom",
            }
          : walking(seconds, i, 1, "bucket", 3.6);
      actors.push({
        y,
        draw: () =>
          this.faded(g, out * on, () => drawPerson(g, x, y, look, pose, 1)),
      });
    });
    this.nishanchis.forEach((look, i) => {
      const x = lead + 0.5 + i * 0.35;
      const y = 2.05 + i * 0.6;
      const pose = walking(seconds, i + 5, 1, "nishan", 3.6);
      pose.back = true;
      actors.push({
        y,
        draw: () =>
          this.faded(g, out * on, () => {
            const hands = drawPerson(g, x, y, look, pose, 1);
            // The back view hides the hands; the pole rises from behind the shoulder.
            const top = { x: hands.tip.x + 0.1, y: y - look.h * 1.55 };
            g.strokeStyle = "#e8e2d4";
            g.lineWidth = 0.035;
            g.beginPath();
            g.moveTo(x + 0.1, y - look.h * 0.6);
            g.lineTo(top.x, top.y);
            g.stroke();
            drawNishan(g, top.x, top.y + 0.02, 0.02, seconds + i, 1, false);
          }),
      });
    });
    const palki = { x: lead - 5.6, y: 2.45 };
    actors.push({
      y: palki.y,
      draw: () =>
        this.faded(g, out * on, () => drawPalki(g, palki.x, palki.y, seconds)),
    });
    for (const fl of this.followers) {
      const x = lead - fl.dx;
      if (x < GURDWARA.x - 1) continue;
      const pose = walking(seconds, fl.seed, 1, undefined, 3.6);
      pose.la = pose.ra = 0.9;
      pose.lf = pose.rf = 2.2;
      actors.push({
        y: fl.y,
        draw: () =>
          this.faded(g, out * on, () =>
            drawPerson(g, x, fl.y, fl.look, pose, 1),
          ),
      });
    }
  }

  /** Langar: the pangat sitting in rows on the durries, sevadars going down them with dal and roti. */
  langar(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const on = rise(p, 0.66, 0.68) * (1 - rise(p, 0.8, 0.83));
    if (on < 0.01) return;
    for (const s of this.pangat) {
      const eating = f.reduced
        ? 0.3
        : Math.max(0, Math.sin(seconds * 1.3 + s.seed));
      actors.push({
        y: s.y,
        draw: () =>
          this.faded(g, on, () =>
            drawSeated(g, s.x, s.y, s.look, eating, s.facing),
          ),
      });
    }
    this.servers.forEach((look, i) => {
      const span = LANGAR.x1 - LANGAR.x0 - 1;
      const t = (seconds * 0.05 + i * 0.5) % 1;
      const x = LANGAR.x0 + 0.5 + (t < 0.5 ? t * 2 : 2 - t * 2) * span;
      const y = LANGAR.y0 + 1.1;
      const pose: Pose = {
        la: 0.1,
        lf: 0.2,
        ra: 0.6,
        rf: 0.9,
        lean: 0.25,
        hold: i === 0 ? "bucket" : "plate",
      };
      if (i === 1) {
        pose.la = 1.0;
        pose.lf = 1.5;
        pose.ra = 1.0;
        pose.rf = 1.5;
      }
      actors.push({
        y,
        draw: () =>
          this.faded(g, on, () =>
            drawPerson(g, x, y, look, pose, t < 0.5 ? 1 : -1),
          ),
      });
    });
  }

  // ─── The mela ──────────────────────────────────────────────────────────────

  mela(actors: Actor[], g: Ctx, f: Frame) {
    const { p, seconds } = f;
    const on = rise(p, 0.765, 0.79);
    if (on < 0.01) return;
    for (const w of this.walkers) {
      const span = 24;
      const x =
        58 +
        ((((w.x - 58 + (f.reduced ? 0 : seconds * w.speed)) % span) + span) %
          span);
      if (Math.abs(x - DHOLI.x) < 3 && Math.abs(w.y - DHOLI.y) < 0.8) continue;
      if (
        Math.abs(x - KABADDI.x) < KABADDI.rx + 0.3 &&
        Math.abs(w.y - KABADDI.y) < KABADDI.ry + 0.3
      )
        continue;
      const pose = walking(seconds, w.seed, 1, undefined, 4.5);
      actors.push({
        y: w.y,
        draw: () =>
          this.faded(g, on, () =>
            drawPerson(g, x, w.y, w.look, pose, w.speed > 0 ? 1 : -1),
          ),
      });
    }
    // Circle kabaddi: the raider in, touching, and racing back over the line.
    const [raider, ...chain] = this.kabaddi;
    const raid = f.reduced ? 0.3 : Math.sin(seconds * 0.9);
    const rx = KABADDI.x - 0.2 + raid * 1.2;
    const rPose: Pose = {
      la: 1.4,
      lf: 1.6,
      ra: 0.8 + Math.sin(seconds * 6) * 0.3,
      rf: 1.4,
      lean: 0.25,
      bob: 0.03,
      lift: [Math.max(0, Math.sin(seconds * 6)) * 0.4, 0],
    };
    actors.push({
      y: KABADDI.y,
      draw: () =>
        this.faded(g, on, () =>
          drawPerson(
            g,
            rx,
            KABADDI.y,
            raider,
            rPose,
            Math.cos(seconds * 0.9) > 0 ? 1 : -1,
          ),
        ),
    });
    chain.forEach((look, j) => {
      const x = KABADDI.x + 0.55 + j * 0.34 + raid * 0.25;
      const y = KABADDI.y + (j % 2 ? 0.14 : -0.14);
      const pose: Pose = {
        la: 1.2,
        lf: 1.5,
        ra: 1.1,
        rf: 1.4,
        lean: 0.35,
        bob: 0.06,
      };
      actors.push({
        y,
        draw: () =>
          this.faded(g, on, () => drawPerson(g, x, y, look, pose, -1)),
      });
    });
    // The balloon seller.
    const bx = 64.6;
    const by = 2.3;
    actors.push({
      y: by,
      draw: () =>
        this.faded(g, on, () => {
          const hands = drawPerson(
            g,
            bx,
            by,
            this.balloonMan,
            { la: 0.1, lf: 0.2, ra: 1.8, rf: 2.8 },
            -1,
          );
          g.strokeStyle = "#8a6a44";
          g.lineWidth = 0.03;
          g.beginPath();
          g.moveTo(hands.right.x, hands.right.y + 0.1);
          g.lineTo(hands.right.x, hands.right.y - 0.5);
          g.stroke();
          drawBalloons(g, hands.right.x, hands.right.y - 0.6, seconds);
        }),
    });
    // The dhol, and the bhangra round it.
    const hit = clamp(1 - (seconds - this.struck) / 0.22);
    const boost = clamp(1 - (seconds - this.struck) / 2.5);
    actors.push({
      y: DHOLI.y,
      draw: () =>
        this.player(
          g,
          this.dholi,
          "dhol",
          DHOLI.x,
          DHOLI.y,
          seconds,
          1,
          on,
          hit,
        ),
    });
    const energy =
      rise(p, 0.79, 0.81) * lerp(0.6, 1, boost) * (1 - rise(p, 0.95, 1) * 0.5);
    this.melaDancers.forEach((look, i) => {
      const angle = (i / this.melaDancers.length) * TAU + 0.4;
      const x = DHOLI.x + Math.cos(angle) * 2.2;
      const y = DHOLI.y + 0.15 + Math.sin(angle) * 0.55;
      const pose = bhangraPose(seconds / 0.6, i * 1.1, energy);
      actors.push({
        y,
        draw: () =>
          this.faded(g, on, () =>
            drawPerson(g, x, y, look, pose, x < DHOLI.x ? 1 : -1),
          ),
      });
    });
  }

  private faded(g: Ctx, alpha: number, draw: () => void) {
    if (alpha < 0.01) return;
    g.globalAlpha = alpha;
    draw();
    g.globalAlpha = 1;
  }
}

/** A bullock, white, with a hump and painted horns, standing yoked. */
export function drawBullock(
  g: Ctx,
  x: number,
  y: number,
  s: number,
  facing: 1 | -1,
  seconds: number,
  seed: number,
) {
  g.save();
  g.translate(x, y);
  g.scale(facing * s, s);
  const body = "#e6dfd2";
  const shade = "#c8bfae";
  g.strokeStyle = shade;
  g.lineCap = "round";
  g.lineWidth = 0.1;
  g.beginPath();
  for (const lx of [-0.55, -0.38, 0.42, 0.58]) {
    g.moveTo(lx, -0.6);
    g.lineTo(lx + 0.02, -0.02);
  }
  g.stroke();
  g.fillStyle = "#3a2a1e";
  for (const lx of [-0.55, -0.38, 0.42, 0.58])
    g.fillRect(lx - 0.05, -0.05, 0.12, 0.05);
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, -0.78, 0.74, 0.3, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(0.4, -1.04, 0.17, 0.15, -0.2, 0, TAU);
  g.fill();
  // The dewlap, the neck and the long head, lowered.
  g.beginPath();
  g.moveTo(0.5, -1.0);
  g.quadraticCurveTo(0.85, -1.02, 1.02, -0.92);
  g.lineTo(1.16, -0.6);
  g.quadraticCurveTo(1.08, -0.52, 1.0, -0.6);
  g.quadraticCurveTo(0.8, -0.5, 0.62, -0.5);
  g.closePath();
  g.fill();
  g.fillStyle = shade;
  g.beginPath();
  g.ellipse(1.1, -0.6, 0.07, 0.05, 0, 0, TAU);
  g.fill();
  // Horns painted in stripes, and a string of bells round the neck.
  g.strokeStyle = "#d8402a";
  g.lineWidth = 0.05;
  g.beginPath();
  g.moveTo(0.95, -0.96);
  g.quadraticCurveTo(0.92, -1.2, 0.84, -1.26);
  g.stroke();
  g.fillStyle = "#e0b040";
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(0.72 + i * 0.07, -0.7 + i * 0.03, 0.03, 0, TAU);
    g.fill();
  }
  // The tail, flicking.
  g.strokeStyle = shade;
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(-0.72, -0.86);
  g.quadraticCurveTo(
    -0.86 + Math.sin(seconds * 1.7 + seed) * 0.05,
    -0.6,
    -0.8,
    -0.36,
  );
  g.stroke();
  g.restore();
}

/**
 * The palki of the nagar kirtan: a float hung with marigolds, and under its gilded canopy the Guru
 * Granth Sahib, covered in its rumala.
 */
export function drawPalki(g: Ctx, x: number, y: number, seconds: number) {
  // The float, skirted in white, garlanded.
  g.fillStyle = "#f2eee6";
  g.fillRect(x - 1.5, y - 0.75, 3.0, 0.75);
  g.fillStyle = "#e8e2d4";
  g.fillRect(x - 1.55, y - 0.82, 3.1, 0.1);
  for (let i = 0; i < 7; i++) {
    const gx = x - 1.45 + i * 0.48;
    g.strokeStyle = i % 2 ? "#f4a020" : "#f6c83a";
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(gx, y - 0.72);
    g.quadraticCurveTo(gx + 0.24, y - 0.42, gx + 0.48, y - 0.72);
    g.stroke();
  }
  // Pillars and the dome.
  g.fillStyle = "#e8c060";
  for (const px of [x - 0.9, x + 0.9]) g.fillRect(px - 0.05, y - 2.2, 0.1, 1.4);
  const dome = g.createLinearGradient(x - 1, y - 3, x + 1, y - 2.2);
  dome.addColorStop(0, "#f6d27a");
  dome.addColorStop(0.5, "#e0a838");
  dome.addColorStop(1, "#a86e1e");
  g.fillStyle = dome;
  g.fillRect(x - 1.1, y - 2.32, 2.2, 0.14);
  g.beginPath();
  g.moveTo(x - 1.0, y - 2.3);
  g.bezierCurveTo(x - 1.1, y - 2.8, x - 0.2, y - 2.9, x, y - 3.25);
  g.bezierCurveTo(x + 0.2, y - 2.9, x + 1.1, y - 2.8, x + 1.0, y - 2.3);
  g.fill();
  // Marigold strings hanging from the canopy's edge.
  g.fillStyle = "#f59a1c";
  for (let i = 0; i < 9; i++) {
    const hx = x - 0.95 + i * 0.24;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(
        hx + Math.sin(seconds * 2 + i) * 0.01,
        y - 2.12 + k * 0.1,
        0.045,
        0,
        TAU,
      );
      g.fill();
    }
  }
  // The manji sahib, and the rumala over it.
  g.fillStyle = "#8a5a2a";
  g.fillRect(x - 0.55, y - 1.12, 1.1, 0.32);
  g.fillStyle = "#b8182e";
  g.beginPath();
  g.moveTo(x - 0.6, y - 0.95);
  g.quadraticCurveTo(x - 0.62, y - 1.38, x - 0.2, y - 1.42);
  g.lineTo(x + 0.2, y - 1.42);
  g.quadraticCurveTo(x + 0.62, y - 1.38, x + 0.6, y - 0.95);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(250, 206, 90, 0.95)";
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(x - 0.58, y - 1.0);
  g.lineTo(x + 0.58, y - 1.0);
  g.stroke();
  g.fillStyle = "rgba(250, 206, 90, 0.9)";
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(x - 0.36 + i * 0.18, y - 1.22, 0.035, 0, TAU);
    g.fill();
  }
}
