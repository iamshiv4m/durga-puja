// Pongal's score: mangala isai, the music of a Tamil festival, in Raga Mohanam (Sa Ri Ga Pa Dha,
// the bright five-note scale), with my own tunes in Adi talam (eight beats: 4 + 2 + 2):
// - Bhogi: crickets, the fire's roar and crackle, and the parai with the children's drums
// - the kolam: a tanpura and a veena, slow, with the birds waking
// - Thai Pongal: the ottu drone, the nadaswaram's alapana, then the thavil coming in and the
//   tempo climbing with the milk; at the boil-over the shout, the women's kulavai, the conch,
//   thavil rolls and the nadaswaram at the top of its voice
// - Surya: slower and devotional, with the aarti bells
// - Mattu Pongal: a bright folk-like tune, and cattle bells
// - Kaanum Pongal: veena and flute by the river
// - the close: the nadaswaram alone and slow over the drone, coming home to Sa
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { Mangala } from "./mangala";
import { MOMENTS } from "./scene";

const SA = 220;
const n = (semitones: number) => hz(SA, semitones);

/** Mohanam: Sa Ri2 Ga3 Pa Dha2, in semitones from Sa, over two octaves. */
const MOHANAM = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const TANPURA = [-5, 0, 0, -12];

type Phrase = [number, number][];

// Phrases as [semitones from Sa, beats]. Each tala phrase is one cycle of Adi talam, eight beats.
const ALAPANA: Phrase[] = [
  [
    [7, 2],
    [9, 1],
    [12, 3],
    [9, 1],
    [7, 1],
    [4, 3],
  ],
  [
    [4, 1],
    [7, 1],
    [9, 2],
    [7, 1],
    [4, 1],
    [2, 1],
    [0, 4],
  ],
];
const KRITI: Phrase[] = [
  [
    [12, 1],
    [9, 0.5],
    [7, 0.5],
    [9, 1],
    [12, 1],
    [14, 1],
    [12, 0.5],
    [9, 0.5],
    [7, 2],
  ],
  [
    [7, 0.5],
    [9, 0.5],
    [12, 1],
    [9, 1],
    [7, 1],
    [4, 1],
    [7, 1],
    [4, 0.5],
    [2, 0.5],
    [4, 1],
  ],
  [
    [4, 1],
    [7, 1],
    [9, 0.5],
    [7, 0.5],
    [4, 1],
    [2, 1],
    [4, 0.5],
    [2, 0.5],
    [0, 2],
  ],
  [
    [0, 0.5],
    [2, 0.5],
    [4, 1],
    [7, 1],
    [9, 1],
    [12, 2],
    [9, 1],
    [7, 1],
  ],
];
/** Climbing with the milk, faster and higher. */
const CLIMB: Phrase[] = [
  [
    [7, 0.5],
    [9, 0.5],
    [12, 0.5],
    [14, 0.5],
    [16, 1],
    [14, 0.5],
    [12, 0.5],
    [14, 0.5],
    [16, 0.5],
    [19, 1],
    [16, 0.5],
    [14, 0.5],
    [16, 1],
  ],
  [
    [12, 0.5],
    [14, 0.5],
    [16, 0.5],
    [19, 0.5],
    [21, 1],
    [19, 0.5],
    [21, 0.5],
    [24, 2],
    [21, 0.5],
    [19, 0.5],
    [21, 1],
  ],
];
/** At the boil-over: the top Sa, held and shaken, and down. */
const PEAK: Phrase = [
  [24, 2.5],
  [26, 0.5],
  [24, 1],
  [21, 1],
  [19, 1],
  [21, 1],
  [24, 1],
];
const FESTIVE: Phrase[] = [
  [
    [19, 0.5],
    [21, 0.5],
    [24, 1],
    [21, 1],
    [19, 1],
    [16, 1],
    [19, 1],
    [16, 0.5],
    [14, 0.5],
    [16, 1],
  ],
  [
    [12, 0.5],
    [14, 0.5],
    [16, 1],
    [19, 1],
    [21, 1],
    [24, 2],
    [21, 1],
    [19, 1],
  ],
  [
    [16, 1],
    [19, 1],
    [21, 0.5],
    [19, 0.5],
    [16, 1],
    [14, 1],
    [16, 0.5],
    [14, 0.5],
    [12, 2],
  ],
];
const SURYA: Phrase[] = [
  [
    [4, 2],
    [7, 1],
    [9, 1],
    [7, 2],
    [4, 2],
  ],
  [
    [9, 1.5],
    [7, 0.5],
    [4, 1],
    [2, 1],
    [4, 2],
    [0, 2],
  ],
  [
    [0, 1],
    [2, 1],
    [4, 1],
    [7, 1],
    [9, 2],
    [7, 2],
  ],
];
const MATTU: Phrase[] = [
  [
    [7, 0.5],
    [7, 0.5],
    [9, 0.5],
    [7, 0.5],
    [4, 1],
    [4, 0.5],
    [7, 0.5],
    [9, 1],
    [12, 1],
    [9, 1],
    [7, 1],
  ],
  [
    [12, 0.5],
    [12, 0.5],
    [14, 0.5],
    [12, 0.5],
    [9, 1],
    [7, 1],
    [9, 0.5],
    [7, 0.5],
    [4, 1],
    [2, 1],
    [4, 1],
  ],
  [
    [4, 0.5],
    [7, 0.5],
    [9, 1],
    [7, 0.5],
    [4, 0.5],
    [2, 1],
    [0, 0.5],
    [2, 0.5],
    [4, 1],
    [7, 2],
  ],
];
const RIVER: Phrase[] = [
  [
    [0, 1],
    [4, 1],
    [7, 1],
    [9, 1],
    [12, 2],
    [9, 1],
    [7, 1],
  ],
  [
    [9, 1],
    [7, 1],
    [4, 1],
    [2, 1],
    [4, 2],
    [0, 2],
  ],
  [
    [7, 1],
    [9, 1],
    [12, 1.5],
    [14, 0.5],
    [12, 1],
    [9, 1],
    [7, 2],
  ],
];
const KOLAM: Phrase[] = [
  [
    [7, 1],
    [4, 1],
    [2, 1],
    [4, 1],
    [7, 2],
    [9, 2],
  ],
  [
    [12, 2],
    [9, 1],
    [7, 1],
    [4, 2],
    [2, 2],
  ],
  [
    [4, 1],
    [2, 1],
    [0, 2],
    [-3, 1],
    [0, 3],
  ],
];
const CLOSE: Phrase[] = [
  ...ALAPANA,
  [
    [4, 2],
    [2, 1],
    [0, 5],
  ],
];

// Thavil strokes, four to a beat, a whole Adi talam cycle to a line.
// B = both heads, T = tha (stick), D = dhom (bass), K = ki (light).
const THAVIL = {
  basic: "B..KT.K.D.T.K.T.B..KT.K.D.TKT.D.",
  light: "D...K...T...K...D...K...T.K.K...",
  folk: "B.KTD.KTB.KTD.T.B.KTD.KTB.TKB.T.",
  roll: "TKTKTKTKTKTKTKTKBKTKTKTKBKTKBKBB",
};
// The parai at the fire: B = the long stick, s = the short one; the children's drums on k.
const PARAI = ["B.s.s.B.s.B.s.s.", "B.ssB.s.BssB.sss"];
const MELAM = "..k...k...k.k.k.";

type Section =
  | "night"
  | "bhogi"
  | "kolam"
  | "alapana"
  | "climb"
  | "festive"
  | "surya"
  | "mattu"
  | "river"
  | "close";

function section(p: number): Section {
  if (p < MOMENTS.light) return "night";
  if (p < 0.2) return "bhogi";
  if (p < MOMENTS.hearth) return "kolam";
  if (p < 0.37) return "alapana";
  if (p < MOMENTS.boil) return "climb";
  if (p < 0.478) return "festive";
  if (p < 0.612) return "surya";
  if (p < 0.748) return "mattu";
  if (p < 0.885) return "river";
  return "close";
}

/** Seconds to a beat. */
function beatAt(p: number) {
  switch (section(p)) {
    case "night":
    case "bhogi":
      return 0.42;
    case "kolam":
      return 0.8;
    case "alapana":
      return 0.7;
    case "climb":
      return 0.62 - 0.2 * smoothstep(0.37, MOMENTS.boil, p);
    case "festive":
      return 0.4;
    case "surya":
      return 0.62;
    case "mattu":
      return 0.44;
    case "river":
      return 0.72;
    default:
      return 0.86;
  }
}

export class PongalScore implements Score {
  private v!: Voices;
  private m!: Mangala;
  private pad!: PadHandle;
  private ottu!: Handle;
  private fire!: Handle;
  private water!: Handle;
  private crowd!: Handle;
  private clock = 0;
  private tick = 0;
  private melodyFree = 0;
  private phrase = 0;
  private lastSection: Section | null = null;
  private climax = -100;
  private peak = false;
  private rollUntil = 0;
  private heat = 0;
  private boiled = false;

  start(voices: Voices) {
    this.v = voices;
    this.m = new Mangala(voices);
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.045, 700);
    this.ottu = this.m.ottu(n(-12), 0.022);
    this.fire = voices.bed("wind", 0.05);
    this.water = voices.bed("water", 0.045);
    this.crowd = voices.bed("crowd", 0.02);
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const m = this.m;
    const now = section(p);

    // The tanpura, for the kolam, the offering, the river and the close.
    if (
      now === "kolam" ||
      now === "surya" ||
      now === "river" ||
      now === "close" ||
      now === "night"
    ) {
      steps(from, to, 1.2, (time, i) =>
        v.tanpura(time, n(TANPURA[i % 4]), now === "night" ? 0.022 : 0.034),
      );
    }
    // Crickets in the dark; birds at first light and by the river.
    if (p < 0.21 && Math.random() < (to - from) * 1.3)
      v.chirp(from + Math.random() * (to - from), 0.008);
    if (
      ((p > 0.2 && p < 0.38) || now === "river") &&
      Math.random() < (to - from) * 0.5
    )
      m.tweet(from + Math.random() * (to - from), 0.01);
    // The fire crackling, the Bhogi fire and then the hearth.
    const fire =
      smoothstep(MOMENTS.light, MOMENTS.light + 0.02, p) *
        (1 - 0.8 * smoothstep(0.19, 0.24, p)) +
      0.5 *
        smoothstep(MOMENTS.hearth - 0.01, MOMENTS.hearth, p) *
        (1 - smoothstep(0.47, 0.5, p));
    if (fire > 0.02 && Math.random() < (to - from) * 9 * fire)
      m.crackle(
        from + Math.random() * (to - from),
        0.012 + Math.random() * 0.02 * fire,
      );
    // The milk bubbling as it heats.
    const bubbling =
      Math.max(smoothstep(0.35, MOMENTS.boil, p), this.heat) *
      (1 - smoothstep(0.46, 0.5, p));
    if (bubbling > 0.05 && Math.random() < (to - from) * 18 * bubbling)
      m.bubble(from + Math.random() * (to - from), 0.01 + 0.02 * bubbling);
    // Crows by the river.
    if (now === "river" && Math.random() < (to - from) * 0.12)
      m.caw(from + Math.random() * (to - from), 0.018);

    // The beat: drums and melody on a clock of quarter beats that follows the tempo of each part.
    if (this.clock < from - 0.3 || this.clock > to + 1) this.clock = from;
    let guard = 0;
    while (this.clock < to && guard++ < 64) {
      const beat = beatAt(p);
      this.pulse(this.clock, this.tick, p, now, beat);
      this.clock += beat / 4;
      this.tick++;
    }
    this.heat = Math.max(0, this.heat - (to - from) * 0.05);
  }

  private pulse(
    time: number,
    tick: number,
    p: number,
    now: Section,
    beat: number,
  ) {
    const v = this.v;
    const m = this.m;
    const cycle = tick % 32;
    if (now !== this.lastSection) {
      // A new part starts its tunes from the top, on the next beat.
      this.lastSection = now;
      this.phrase = 0;
      this.melodyFree = Math.min(this.melodyFree, time + beat);
    }

    // Bhogi: the parai and the children's drums round the fire.
    if (now === "bhogi") {
      const drive =
        smoothstep(MOMENTS.light + 0.005, MOMENTS.light + 0.03, p) *
        (1 - smoothstep(0.185, 0.2, p));
      const stroke = at(PARAI[Math.floor(tick / 16) % 2], tick);
      const accent = tick % 16 === 0 ? 1.25 : 1;
      if (stroke === "B") m.parai(time, "boom", 0.19 * drive * accent);
      if (stroke === "s") m.parai(time, "slap", 0.1 * drive);
      if (at(MELAM, tick) === "k") v.drum(time, "slap", 0.06 * drive, 1.7);
    }

    // The thavil.
    let pattern: string | null = null;
    let level = 0;
    if (
      time < this.rollUntil &&
      (now === "alapana" || now === "climb" || now === "festive")
    ) {
      pattern = THAVIL.roll;
      level = 0.17;
    } else if (now === "climb") {
      pattern = p > MOMENTS.boil - 0.012 ? THAVIL.roll : THAVIL.basic;
      level = 0.1 + 0.08 * smoothstep(0.37, MOMENTS.boil, p);
    } else if (now === "festive") {
      pattern = THAVIL.basic;
      level = 0.17 * (1 - 0.5 * smoothstep(0.46, 0.478, p));
    } else if (now === "surya") {
      pattern = THAVIL.light;
      level = 0.09;
    } else if (now === "mattu") {
      pattern = THAVIL.folk;
      level = 0.12 * smoothstep(0.615, 0.632, p);
    }
    if (pattern && level > 0) {
      const stroke = at(pattern, cycle);
      const accent =
        cycle === 0 ? 1.3 : cycle % 16 === 0 || cycle % 8 === 0 ? 1.12 : 1;
      if (stroke === "B" || stroke === "D")
        m.thavil(time, "dhom", level * 1.2 * accent);
      if (stroke === "B" || stroke === "T")
        m.thavil(time, "tha", level * accent);
      if (stroke === "K") m.thavil(time, "ki", level * 0.8);
      // The talam kept on small cymbals (jalra) at the festive height.
      if ((now === "festive" || now === "mattu") && tick % 4 === 0)
        v.manjira(time, 0.012, cycle === 0);
    }

    // Mattu Pongal: the herd's bells, now and then.
    if (now === "mattu" && tick % 2 === 0 && Math.random() < 0.18)
      m.jingle(time + Math.random() * 0.05, 0.01);
    if (now === "mattu" && cycle === 0 && Math.random() < 0.5)
      m.cattleBell(
        time,
        n(12 + [0, 7, 4][Math.floor(Math.random() * 3)]),
        0.03,
        4,
      );

    // The melody, a phrase at a time, starting on a beat.
    if (tick % 4 === 0 && time >= this.melodyFree - 0.001)
      this.melody(time, p, now, beat);
  }

  private melody(time: number, p: number, now: Section, beat: number) {
    const m = this.m;
    if (
      this.peak &&
      (now === "alapana" || now === "climb" || now === "festive")
    ) {
      // The top of it, as the pot boils over.
      this.peak = false;
      let t = time;
      let last: number | undefined;
      for (const [semi, beats] of PEAK) {
        m.nadaswaram(t, n(semi), beats * beat * 0.97, 0.065, last);
        last = n(semi);
        t += beats * beat;
      }
      this.melodyFree = t;
      return;
    }
    let phrases: Phrase[] = [];
    let voice: "nadaswaram" | "veena" | "duet" = "nadaswaram";
    let rest = 0;
    let lift = 0;
    let level = 0.045;
    switch (now) {
      case "night":
        phrases = KOLAM;
        voice = "veena";
        rest = 3;
        level = 0.03;
        break;
      case "kolam":
        phrases = KOLAM;
        voice = "veena";
        rest = 1;
        level = 0.045;
        break;
      case "alapana":
        phrases = ALAPANA;
        rest = 1;
        level = 0.04;
        break;
      case "climb":
        phrases = p > 0.4 ? CLIMB : KRITI;
        level = 0.045 + 0.02 * smoothstep(0.37, MOMENTS.boil, p);
        break;
      case "festive":
        phrases = FESTIVE;
        level = 0.06;
        break;
      case "surya":
        phrases = SURYA;
        lift = 12;
        level = 0.04;
        rest = 1;
        break;
      case "mattu":
        phrases = MATTU;
        lift = 12;
        level = 0.042;
        break;
      case "river":
        phrases = RIVER;
        voice = "duet";
        rest = 1;
        break;
      case "close":
        phrases = CLOSE;
        level = 0.038 * (1 - smoothstep(0.975, 1, p));
        rest = 2;
        break;
      default:
        return;
    }
    if (!phrases.length || level < 0.002) return;
    const phrase = phrases[this.phrase++ % phrases.length];
    let t = time;
    let last: number | undefined;
    for (const [semi, beats] of phrase) {
      const freq = n(semi + lift);
      const length = beats * beat;
      if (voice === "nadaswaram")
        m.nadaswaram(
          t,
          freq,
          length * 0.97,
          level,
          last && last !== freq ? last : undefined,
        );
      else if (voice === "veena")
        m.veena(
          t,
          n(semi),
          level,
          last && Math.random() < 0.3 ? last / 2 : undefined,
          Math.max(1.2, length * 1.5),
        );
      else {
        m.veena(t, n(semi), 0.04, undefined, Math.max(1.2, length * 1.4));
        if (beats >= 1)
          this.v.flute(t, n(semi + 12), length * 0.95, 0.03, last);
      }
      last = freq;
      t += length;
    }
    this.melodyFree = t + rest * beat;
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const m = this.m;
    const bhogi =
      smoothstep(MOMENTS.light, MOMENTS.light + 0.02, p) *
      (1 - smoothstep(0.19, 0.24, p));
    this.fire.level(
      bhogi +
        0.25 *
          smoothstep(MOMENTS.hearth - 0.01, MOMENTS.hearth, p) *
          (1 - smoothstep(0.47, 0.5, p)),
    );
    const pongal =
      smoothstep(0.335, 0.36, p) * (1 - smoothstep(0.605, 0.625, p)) +
      smoothstep(0.87, 0.9, p);
    this.ottu.level(pongal);
    this.water.level(
      smoothstep(0.74, 0.77, p) * (1 - 0.5 * smoothstep(0.95, 1, p)),
    );
    const gathering =
      smoothstep(0.08, 0.1, p) * (1 - smoothstep(0.18, 0.21, p)) * 0.5 +
      smoothstep(0.42, 0.43, p) * (1 - smoothstep(0.47, 0.5, p)) +
      smoothstep(0.76, 0.78, p) * (1 - smoothstep(0.86, 0.9, p)) * 0.6;
    this.crowd.level(gathering);
    const bright =
      smoothstep(0.37, MOMENTS.boil, p) * (1 - smoothstep(0.47, 0.5, p));
    this.pad.level(
      0.35 +
        0.25 * smoothstep(0.2, 0.3, p) +
        0.35 * bright -
        0.25 * smoothstep(0.62, 0.64, p) * (1 - smoothstep(0.86, 0.9, p)),
    );
    this.pad.bright(600 + 1400 * bright + 300 * smoothstep(0.9, 0.95, p));

    // The pad moves with the day: Sa Pa; then Sa Ga Pa for the sun; Pa Sa Ri for the river; home.
    if (crossed(previous, p, MOMENTS.hearth))
      this.pad.chord([n(-12), n(-5), n(4)], 3);
    if (crossed(previous, p, MOMENTS.surya))
      this.pad.chord([n(-12), n(-8), n(-5)], 3);
    if (crossed(previous, p, MOMENTS.kaanum))
      this.pad.chord([n(-12), n(-5), n(2)], 3);
    if (crossed(previous, p, MOMENTS.close))
      this.pad.chord([n(-12), n(-5), n(0)], 4);

    if (crossed(previous, p, MOMENTS.light)) {
      v.whoosh(now, 1.4, 0.06, true);
      for (let i = 0; i < 8; i++)
        m.crackle(now + 0.4 + Math.random() * 1.5, 0.03);
      m.parai(now + 1.2, "boom", 0.2);
    }
    if (crossed(previous, p, MOMENTS.mat)) {
      v.whoosh(now, 0.9, 0.05, true);
      v.crack(now + 0.5, 0.06);
    }
    if (crossed(previous, p, MOMENTS.dawn)) {
      v.bell(now + 0.2, n(12), 0.05, 6);
      v.choir(now + 0.4, [n(-12), n(0)], 7, 0.012);
    }
    if (crossed(previous, p, MOMENTS.flower)) v.bell(now, n(24), 0.035, 3);
    if (crossed(previous, p, MOMENTS.hearth)) v.crack(now, 0.05);
    if (crossed(previous, p, MOMENTS.boil - 0.012)) {
      m.conch(now + 0.1, n(7), 0.04, 1.6);
      v.swell(now, 0.05, 2.2);
    }
    if (p < MOMENTS.hearth - 0.01) this.boiled = false;
    if (crossed(previous, p, MOMENTS.boil) && !this.boiled) this.overflow(now);
    if (crossed(previous, p, MOMENTS.aarti)) {
      m.conch(now + 0.2, n(7), 0.045, 2.4);
      for (let i = 0; i < 18; i++)
        v.bell(now + 0.3 + i * 0.19, i % 2 ? n(31) : n(33), 0.011, 0.6);
      v.bell(now + 0.3, n(12), 0.07, 6);
      v.choir(now + 0.8, [n(-12), n(-5), n(4)], 7, 0.02);
    }
    if (crossed(previous, p, MOMENTS.mattu)) m.cattleBell(now, n(12), 0.06, 10);
    if (crossed(previous, p, MOMENTS.kaanum)) v.swell(now, 0.03, 2);
    if (crossed(previous, p, MOMENTS.close)) {
      v.choir(now + 0.3, [n(-12), n(-5), n(0), n(4)], 9, 0.026);
      v.bell(now + 0.5, n(12), 0.05, 7);
    }
  }

  /** Pongalo pongal! The shout, the kulavai, the conch, the bells, and the thavil rolling. */
  private overflow(now: number) {
    if (now - this.climax < 8) return;
    this.climax = now;
    this.boiled = true;
    const v = this.v;
    const m = this.m;
    m.shout(now + 0.05, 0.05);
    m.shout(now + 1.75, 0.045);
    m.shout(now + 3.45, 0.04);
    m.kulavai(now + 0.2, 3.4, 1180, 0.022);
    m.kulavai(now + 0.35, 3.0, 1320, 0.018);
    m.kulavai(now + 0.6, 2.8, 1060, 0.018);
    m.conch(now + 0.4, n(7), 0.05, 2.6);
    v.drum(now, "bass", 0.2, 0.8);
    v.manjira(now + 0.02, 0.05, true);
    for (let i = 0; i < 20; i++)
      v.bell(now + 0.25 + i * 0.16, i % 2 ? n(31) : n(33), 0.012, 0.6);
    v.bell(now + 0.1, n(12), 0.08, 6);
    v.choir(now + 0.3, [n(-12), n(-5), n(0), n(4)], 6, 0.03);
    this.rollUntil = now + 1.6;
    this.peak = true;
    this.melodyFree = 0;
  }

  on(event: string, now: number) {
    const v = this.v;
    const m = this.m;
    // Touches land on the next quarter beat where the music has a beat going.
    const grid = this.clock > now && this.clock - now < 0.5 ? this.clock : now;
    const note = () => n(MOHANAM[Math.floor(Math.random() * MOHANAM.length)]);
    if (event === "spark") {
      v.whoosh(now, 0.5, 0.04, true);
      for (let i = 0; i < 5; i++)
        m.crackle(now + 0.1 + Math.random() * 0.6, 0.03);
      m.parai(grid, "boom", 0.16);
    }
    if (event === "kolam") m.veena(grid, note(), 0.05, undefined, 2);
    if (event === "stoke") {
      v.crack(now, 0.035);
      m.thavil(grid, "tha", 0.08);
      this.heat = Math.min(1, this.heat + 0.12);
      for (let i = 0; i < 4; i++) m.bubble(now + Math.random() * 0.4, 0.025);
    }
    if (event === "overflow") this.overflow(now);
    if (event.startsWith("bell")) {
      const i = Number(event.slice(4)) || 0;
      m.cattleBell(grid, n(12 + [4, 0, 7][i % 3]), 0.07, 9);
    }
    if (event === "caw") {
      m.caw(now, 0.03);
      m.caw(now + 0.35, 0.025);
      v.whoosh(now, 0.4, 0.02, false);
    }
  }
}
