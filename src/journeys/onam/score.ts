// Onam's score, all in Mohanam (Sa Re Ga Pa Dha, no Ma, no Ni), the pentatonic raga of Kerala's
// temple songs and boat songs, with melodies of its own:
// - night, and the edakka alone, sliding between its notes, as the lamps are lit behind the screen
// - the story in shadows: the edakka telling it, the kuzhal, a swell and a great stroke for
//   Trivikrama's step, falling bends for the king pressed down, and a voice for his wish
// - the ten mornings of the pookalam: a veena over the tanpura, a pluck climbing for every ring,
//   and the women's kurava for the Thrikkakara Appan on Thiruvonam
// - the sadya: the veena, voices in the hall, and a note for every dish set on the leaf
// - Thiruvathira at dusk: one woman sings each line and the rest answer it, clapping
// - pulikali: a heavy, playful groove of thakil and udukku, chenda cracks, and the tigers' growls
// - vallam kali: the vanchipattu, the singers calling and the rowers answering, one stroke of the
//   oars to every beat, faster as the boats race and faster still when the reader urges them on
// - the chenda melam on the ghat: panchari, its six-beat cycle quickening through its kalams,
//   ilathalam, kombu and kuzhal, into a wall of sound
// - and a tender close: the edakka again, a voice, and bells
import { clamp } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { Kerala } from "./instruments";
import { CLAP_BEAT, PULI_STEP, melam, melamBeat, remember, rowing, strokePeriod, tickClock } from "./sync";
import { MOMENTS, dayAt, dishAt } from "./world";

const SA = 146.83;
const n = (semitones: number) => hz(SA, semitones);
/** Mohanam, over two and a half octaves. */
const MOHANAM = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const deg = (i: number) => MOHANAM[Math.max(0, Math.min(MOHANAM.length - 1, i))];

/** The edakka's phrases, as [semitones, seconds], each note sliding in from the one before. */
const EDAKKA: [number, number][][] = [
  [
    [0, 0.5],
    [4, 0.35],
    [2, 0.8],
    [0, 1.2],
  ],
  [
    [7, 0.4],
    [9, 0.4],
    [7, 0.3],
    [4, 0.6],
    [2, 1.2],
  ],
  [
    [-3, 0.6],
    [0, 0.4],
    [2, 0.4],
    [4, 0.9],
    [2, 0.3],
    [0, 1.4],
  ],
];

/** Veena phrases as [semitones, beats]. */
const VEENA: [number, number][][] = [
  [
    [0, 1],
    [2, 1],
    [4, 1],
    [7, 2],
    [4, 1],
    [2, 1],
    [0, 2],
  ],
  [
    [4, 1],
    [7, 1],
    [9, 1],
    [12, 2],
    [9, 1],
    [7, 1],
    [4, 2],
  ],
  [
    [7, 1],
    [9, 0.5],
    [12, 0.5],
    [14, 1],
    [12, 1],
    [9, 1],
    [7, 1],
    [4, 1],
    [2, 1],
    [0, 2],
  ],
  [
    [2, 1],
    [4, 1],
    [7, 1],
    [9, 1],
    [7, 1],
    [4, 1],
    [2, 1],
    [4, 1],
    [0, 2],
  ],
];
const VEENA_BEAT = 0.42;

/** The Thiruvathira song: one line, a note to each clap. */
const TIRU = [7, 7, 9, 7, 4, 4, 2, 4, 7, 9, 12, 9, 7, 4, 2, 0];
const VOWELS = ["a", "o", "a", "e", "a", "o", "i", "a"] as const;

/** The vanchipattu's calls, two notes to each stroke. */
const CALLS = [
  [7, 9, 7, 4],
  [4, 7, 9, 12],
  [12, 9, 7, 4],
  [2, 4, 2, 0],
];

/** The tigers' groove, sixteen steps: T thakil's big head, t its stick, u the udukku, c a chenda crack. */
const PULI = {
  thakil: "T..tT.t.T..tT.tt",
  udukku: "..u...u...u.u..u",
  chenda: "c.cc.c.cc.c.cc.c",
};

/** Panchari's six beats: where the deep valamthala falls. */
const VALAM = "V.VV..";

export class OnamScore implements Score {
  private v!: Voices;
  private k!: Kerala;
  private pad!: PadHandle;
  private water!: Handle;
  private crowd!: Handle;
  private wind!: Handle;
  private edakkaFree = 0;
  private edakkaPhrase = 0;
  private veenaFree = 0;
  private veenaPhrase = 0;
  private nextStroke = 0;
  private strokes = 0;
  private nextBeat = 0;
  private beats = 0;
  private kuzhalFree = 0;
  private closeFree = 0;
  private closeLine = 0;

  start(voices: Voices) {
    this.v = voices;
    this.k = new Kerala(voices);
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.04, 700);
    this.water = voices.bed("water", 0.05);
    this.crowd = voices.bed("crowd", 0.02);
    this.wind = voices.bed("wind", 0.02);
  }

  /** 1 inside [a, b] of the scroll, 0 outside, with short fades either side. */
  private within(p: number, a: number, b: number, fade = 0.008) {
    return clamp((p - a + fade) / fade) * clamp((b + fade - p) / fade);
  }

  schedule(from: number, to: number, p: number) {
    const { v } = this;
    const night = this.within(p, -1, 0.18) + this.within(p, 0.46, 0.57) + this.within(p, 0.87, 2);
    if (night > 0.3 && Math.random() < (to - from) * 1.2) v.chirp(from + Math.random() * (to - from), 0.007);

    // The drone: tanpura in the mornings and the hall, and for the songs at dusk and at the end.
    const drone = this.within(p, 0.19, 0.44) + this.within(p, 0.455, 0.57) * 0.8 + this.within(p, 0.88, 2) * 0.7;
    if (drone > 0.02) steps(from, to, 1.1, (time, i) => v.tanpura(time, n([-5, 0, 0, -12][i % 4]), 0.035 * Math.min(1, drone)));

    this.edakka(from, p);
    this.story(from, to, p);
    this.veena(from, p);
    this.thiruvathira(from, to, p);
    this.pulikali(from, to, p);
    this.vallam(from, to, p);
    this.melam(from, to, p);
    this.close(from, p);

    // The clink of a tumbler in the hall at the sadya.
    if (this.within(p, 0.335, 0.44) > 0.5 && Math.random() < (to - from) * 1.5)
      v.bell(from + Math.random() * (to - from), 2200 + Math.random() * 900, 0.004, 0.4);
  }

  /** The edakka alone at night: the opening, and between the scenes of the story. */
  private edakka(from: number, p: number) {
    const on = this.within(p, -1, 0.176);
    if (on < 0.05 || from < this.edakkaFree) return;
    const phrase = EDAKKA[this.edakkaPhrase++ % EDAKKA.length];
    let time = from + 0.05;
    let last = phrase[0][0];
    const level = 0.08 * (p < 0.06 ? 1 : 0.85);
    for (const [semi, dur] of phrase) {
      // The player squeezes the laces: each note starts at the last and bends to its own.
      this.k.edakka(time, n(last), level, n(semi), Math.max(0.5, dur * 1.2));
      if (dur > 0.7) this.k.edakka(time + dur * 0.5, n(semi), level * 0.45, n(semi), 0.4);
      last = semi;
      time += dur;
    }
    this.edakkaFree = time + (p < 0.06 ? 1.4 : 0.6) + Math.random() * 0.6;
  }

  /** Under the story: a soft chenda pulse and the kuzhal while the king reigns; a roll as the boy grows. */
  private story(from: number, to: number, p: number) {
    const { k } = this;
    const reign = this.within(p, 0.058, MOMENTS.vamana[0]);
    if (reign > 0.05) {
      steps(from, to, 0.45, (time, i) => {
        if (i % 4 === 0) k.chenda(time, "valam", 0.085 * reign, i);
        if (i % 2 === 1) k.chenda(time, "ghost", 0.08 * reign, i + 1);
        if (i % 8 === 0) k.ilathalam(time, 0.02 * reign, false, i);
      });
      if (from >= this.kuzhalFree) {
        const line = [7, 9, 12, 9, 7, 4, 7];
        let time = from + 0.05;
        let last: number | undefined;
        for (const [j, semi] of line.entries()) {
          const d = j === line.length - 1 ? 1.8 : 0.45;
          k.kuzhal(time, n(semi + 12), d, 0.03 * reign, last);
          last = n(semi + 12);
          time += d;
        }
        this.kuzhalFree = time + 1.5;
      }
    }
    // Trivikrama growing: a drum roll, quickening and swelling into the step.
    const grow = this.within(p, MOMENTS.grow[0], MOMENTS.step, 0.004);
    if (grow > 0.05) {
      const t = clamp((p - MOMENTS.grow[0]) / (MOMENTS.step - MOMENTS.grow[0]));
      steps(from, to, 0.18 - t * 0.1, (time, i) => k.chenda(time, i % 3 ? "ghost" : "tha", 0.03 + 0.07 * t, i));
    }
    // Pressed down: slow deep strokes, sinking.
    const press = this.within(p, MOMENTS.press[0] + 0.004, MOMENTS.press[1], 0.004);
    if (press > 0.05) steps(from, to, 0.9, (time) => k.edakka(time, n(0), 0.06 * press, n(-7), 1.2));
  }

  /** The veena for the pookalam and the sadya. */
  private veena(from: number, p: number) {
    const on = this.within(p, 0.192, 0.44);
    if (on < 0.05 || from < this.veenaFree) return;
    const phrase = VEENA[this.veenaPhrase++ % VEENA.length];
    const beat = p > 0.33 ? VEENA_BEAT * 0.85 : VEENA_BEAT;
    let time = Math.ceil(from / beat) * beat;
    let last: number | undefined;
    for (const [semi, beats] of phrase) {
      const freq = n(semi + 12);
      // A little gamaka: sliding up into a note from a step below.
      this.k.veena(time, freq, 0.07 * on, last && last < freq ? freq * 0.94 : undefined, 0.09);
      if (beats >= 2) this.k.veena(time + beat, freq, 0.03 * on);
      last = freq;
      time += beats * beat;
    }
    this.veenaFree = time + beat * (2 + Math.floor(Math.random() * 2));
  }

  private thiruvathira(from: number, to: number, p: number) {
    const on = this.within(p, MOMENTS.dance[0] - 0.004, MOMENTS.dance[1] + 0.004);
    if (on < 0.02) return;
    const { v, k } = this;
    steps(from, to, CLAP_BEAT, (time, i) => {
      v.clap(time, 0.1 * on, 8);
      const line = Math.floor(i / TIRU.length);
      const note = TIRU[i % TIRU.length];
      const lead = line % 2 === 0;
      const vowel = VOWELS[i % VOWELS.length];
      // One woman sings the line; then all of them answer it.
      k.sing(time, n(note + 12), CLAP_BEAT * 0.95, vowel, (lead ? 0.04 : 0.03) * on, lead ? 1 : 5);
      if (!lead) k.sing(time, n(note), CLAP_BEAT * 0.95, vowel, 0.016 * on, 3);
      if (i % 4 === 0) k.ilathalam(time, 0.012 * on, false, i);
    });
  }

  private pulikali(from: number, to: number, p: number) {
    const on = this.within(p, 0.572, 0.7);
    if (on < 0.02) return;
    const { v, k } = this;
    steps(from, to, PULI_STEP, (time, i) => {
      const s = i % 16;
      const accent = s % 4 === 0 ? 1.2 : 1;
      const th = at(PULI.thakil, i);
      if (th === "T") k.thakil(time, "thom", 0.19 * on * accent);
      if (th === "t") k.thakil(time, "ta", 0.14 * on);
      if (th === ".") k.thakil(time, "kit", 0.06 * on);
      if (at(PULI.udukku, i) === "u") k.udukku(time, 0.09 * on, s === 15 ? 9 : 5);
      if (at(PULI.chenda, i) === "c") k.chenda(time, s % 4 === 0 ? "tha" : "ghost", 0.09 * on, i);
      if (s === 0) k.ilathalam(time, 0.025 * on, i % 32 === 0, i);
      // A pounce every two bars: the crowd surges and a tiger roars.
      if (i % 32 === 24) {
        k.growl(time, 0.05 * on);
        v.whoosh(time, 1.1, 0.02 * on, true);
      }
    });
  }

  private vallam(from: number, to: number, p: number) {
    const on = this.within(p, MOMENTS.river[0] - 0.006, MOMENTS.melam[1]);
    if (on < 0.02) {
      this.nextStroke = 0;
      return;
    }
    const { v, k } = this;
    if (this.nextStroke < from) this.nextStroke = from + 0.02;
    const song = this.within(p, MOMENTS.river[0], MOMENTS.melam[0] + 0.004);
    let guard = 0;
    while (this.nextStroke < to && guard++ < 16) {
      const time = this.nextStroke;
      const period = strokePeriod(p, rowing.boost);
      const i = this.strokes++;
      remember(rowing.strokes, { t: time, n: i });
      // The paddles bite together, on the beat.
      k.splash(time + period * 0.05, 0.1 * on);
      v.manjira(time, 0.024 * on, i % 4 === 0);
      if (song > 0.05) {
        k.sing(time, n(0), 0.14, "e", 0.045 * song, 6, true);
        k.chenda(time, "valam", 0.07 * song, i);
        const call = CALLS[Math.floor(i / 4) % CALLS.length];
        const half = period / 2;
        const s = i % 4;
        if (s < 2) {
          // The singer's call, two notes to a stroke.
          k.sing(time + 0.02, n(call[s * 2] + 12), half * 1.05, "a", 0.06 * song, 2, true);
          k.sing(time + half, n(call[s * 2 + 1] + 12), half * 1.05, "o", 0.06 * song, 2, true);
        } else {
          // And the whole boat answers it.
          const j = (s - 2) * 2;
          k.sing(time + 0.02, n(call[j]), half, "a", 0.045 * song, 6, true);
          k.sing(time + half, n(call[j + 1]), half, "e", 0.045 * song, 6, true);
          k.sing(time + 0.02, n(call[j] + 12), half, "a", 0.02 * song, 3, true);
        }
        // A thalam keeps the half-strokes; toward the finish a chenda joins them.
        k.ilathalam(time + half, 0.014 * song, false, i);
        const drive = clamp((p - 0.745) / 0.05);
        if (drive > 0) {
          k.chenda(time, "tha", 0.08 * drive, i);
          k.chenda(time + half / 2, "ghost", 0.05 * drive, i + 2);
          k.chenda(time + half, "ghost", 0.07 * drive, i + 1);
          k.chenda(time + half * 1.5, "ghost", 0.05 * drive, i + 3);
          if (i % 2 === 0) k.chenda(time, "valam", 0.09 * drive, i);
        }
      }
      this.nextStroke += period;
    }
  }

  private melam(from: number, to: number, p: number) {
    const on = this.within(p, MOMENTS.melam[0], MOMENTS.melam[1], 0.004);
    if (on < 0.02) {
      this.nextBeat = 0;
      return;
    }
    const { k } = this;
    if (this.nextBeat < from) this.nextBeat = from + 0.02;
    const t = clamp((p - MOMENTS.melam[0]) / (MOMENTS.melam[1] - MOMENTS.melam[0]));
    const level = on * (0.6 + 0.4 * t);
    let guard = 0;
    while (this.nextBeat < to && guard++ < 24) {
      const time = this.nextBeat;
      const beat = melamBeat(p);
      const i = this.beats++;
      remember(melam.beats, { t: time, n: i });
      const s = i % 6;
      // Ilathalam on every beat, the cycle's first left to ring.
      k.ilathalam(time, 0.06 * level, s === 0, i);
      k.ilathalam(time + 0.006, 0.045 * level, false, i + 2);
      if (at(VALAM, s) === "V") {
        k.chenda(time, "valam", 0.17 * level, 0);
        k.chenda(time + 0.01, "valam", 0.15 * level, 3);
      }
      // The uruttu chendas: a crack from the whole row on the beat, rolls between.
      const sub = beat > 0.18 ? 4 : 2;
      for (let j = 0; j < sub; j++) {
        const st = time + (j * beat) / sub;
        for (let lane = 0; lane < 4; lane++) k.chenda(st + lane * 0.004, j === 0 ? "tha" : "ghost", (j === 0 ? 0.11 : 0.075) * level, lane);
      }
      // In the faster kalams the deep heads roll between the beats too.
      if (t > 0.4) k.chenda(time + beat / 2, "valam", 0.08 * level * t, 1 + (i % 2));
      // The kombu calls at the turn of every other cycle, in fifths.
      if (s === 0 && Math.floor(i / 6) % 2 === 0) {
        k.kombu(time, n(7), beat * 2.4, 0.05 * level);
        k.kombu(time + 0.02, n(0), beat * 2.4, 0.045 * level);
      }
      // The kuzhal, high and bright, a note to each beat.
      k.kuzhal(time, n(deg(9 + ((i * 3) % 5)) + 12), beat * 0.9, 0.028 * level, n(deg(8 + ((i * 3 + 2) % 5)) + 12));
      this.nextBeat += beat;
    }
  }

  /** The last evening: a voice and the veena, slow, and the edakka answering. */
  private close(from: number, p: number) {
    const on = this.within(p, 0.868, 1.01, 0.012);
    if (on < 0.05 || from < this.closeFree) return;
    const { k } = this;
    const lines = [
      [7, 9, 7, 4, 2, 4, 0],
      [4, 7, 9, 12, 9, 7, 4],
      [2, 4, 7, 4, 2, 0, -3, 0],
    ];
    const line = lines[this.closeLine++ % lines.length];
    let time = from + 0.05;
    let last: number | undefined;
    for (const [j, semi] of line.entries()) {
      const d = j === line.length - 1 ? 2.4 : 0.75;
      k.sing(time, n(semi + 12), d, j % 2 ? "o" : "a", 0.022 * on, 1, false, last);
      k.veena(time, n(semi + 12), 0.035 * on);
      last = n(semi + 12);
      time += d;
    }
    k.edakka(time, n(0), 0.05 * on, n(4), 0.8);
    k.edakka(time + 0.5, n(4), 0.04 * on, n(2), 1.2);
    this.closeFree = time + 2.2;
  }

  update(p: number, previous: number, now: number) {
    tickClock(now);
    const { v, k } = this;
    // Beds: the river by the boats, the crowds in the hall, the street and at the ghat, a breeze by day.
    this.water.level(this.within(p, 0.695, 0.87, 0.02) * 1.5);
    this.crowd.level(
      this.within(p, 0.335, 0.44, 0.01) * 0.7 +
        this.within(p, 0.575, 0.7, 0.01) * 1.3 +
        this.within(p, 0.74, 0.85, 0.02) * (1.2 + 1.3 * this.within(p, 0.8, 0.848, 0.01)),
    );
    this.wind.level(this.within(p, 0.19, 0.44) * 0.5 + this.within(p, 0.87, 1.1, 0.02) * 0.4);
    this.pad.level(this.within(p, -1, 0.19, 0.01) * 0.8 + this.within(p, 0.44, 0.58, 0.01) * 0.6 + this.within(p, 0.846, 1.1, 0.01) * 0.65);
    this.pad.bright(500 + 700 * this.within(p, 0.87, 1.1, 0.02));

    // The lamps behind the screen, each lit with a small bell.
    for (let i = 0; i < 9; i++) {
      if (crossed(previous, p, 0.006 + i * 0.005)) v.bell(now + 0.02, n(deg(8 + (i % 5)) + 12), 0.018, 2.4);
    }
    const M = MOMENTS;
    if (crossed(previous, p, M.vamana[0])) v.bell(now, n(24), 0.03, 3);
    if (crossed(previous, p, M.pour)) {
      for (let i = 0; i < 10; i++) v.bell(now + i * 0.09 + Math.random() * 0.03, n(deg(12 - (i % 4))) * 2, 0.008, 0.5);
    }
    if (crossed(previous, p, M.grow[0])) v.swell(now, 0.07, 2.6);
    if (crossed(previous, p, M.step)) {
      k.chenda(now, "valam", 0.22, 0);
      k.chenda(now + 0.01, "valam", 0.2, 3);
      k.ilathalam(now, 0.07, true, 0);
      k.kombu(now + 0.05, n(-5), 2.6, 0.06);
      k.kombu(now + 0.07, n(0), 2.6, 0.05);
      v.swell(now, 0.09, 1.2);
    }
    if (crossed(previous, p, M.press[0] + 0.006)) {
      k.chenda(now, "valam", 0.18, 1);
      v.choir(now + 0.1, [n(-12), n(-5)], 3.5, 0.02);
    }
    if (crossed(previous, p, M.wish[0])) {
      k.sing(now + 0.2, n(12), 1.6, "a", 0.03, 1, false, n(9));
      k.sing(now + 1.8, n(9), 1.0, "o", 0.028, 1);
      k.sing(now + 2.8, n(7), 2.6, "a", 0.026, 1);
    }
    if (crossed(previous, p, M.dawn)) {
      v.bell(now, n(24), 0.03, 4);
      v.flute(now + 0.4, n(24), 0.35, 0.02);
      v.flute(now + 0.9, n(26), 0.25, 0.018, n(24));
    }
    // A pluck climbing for every ring of the pookalam, and the kurava for the Appan.
    for (let i = 0; i < 10; i++) {
      if (!crossed(previous, p, dayAt(i))) continue;
      for (let j = 0; j <= Math.min(4, 1 + Math.floor(i / 2)); j++) k.veena(now + j * 0.11, n(deg(5 + i + j)), 0.05);
      v.bell(now, n(deg(10 + (i % 5))) * 2, 0.012, 2);
    }
    if (crossed(previous, p, M.appan)) {
      this.kurava(now + 0.1);
      v.bell(now, n(12), 0.05, 5);
      v.bell(now + 0.8, n(19), 0.03, 4);
    }
    // A note for each dish on the leaf, climbing through the raga; the payasam gets a chord.
    for (let i = 0; i < 20; i++) {
      if (!crossed(previous, p, dishAt(i))) continue;
      k.veena(now + 0.02, n(deg(5 + (i % 11))), 0.05);
      if (i === 19) {
        for (const [j, semi] of [0, 4, 7, 12].entries()) k.veena(now + 0.2 + j * 0.08, n(semi + 12), 0.05);
        v.bell(now + 0.3, n(24), 0.03, 3);
      }
    }
    if (crossed(previous, p, M.lit)) v.bell(now, n(12), 0.04, 4);
    if (crossed(previous, p, 0.585)) k.kombu(now, n(7), 1.2, 0.04);
    if (crossed(previous, p, M.river[0])) {
      k.kombu(now, n(0), 1.6, 0.045);
      k.kombu(now + 0.02, n(7), 1.6, 0.035);
    }
    // The melam's end: everything at once, the cymbals left ringing, and a long kombu.
    if (crossed(previous, p, M.melam[1] - 0.002)) {
      for (let lane = 0; lane < 4; lane++) {
        k.chenda(now + lane * 0.005, "tha", 0.12, lane);
        k.chenda(now + lane * 0.005, "valam", 0.12, lane);
      }
      k.ilathalam(now, 0.08, true, 0);
      k.ilathalam(now + 0.01, 0.07, true, 2);
      k.kombu(now + 0.05, n(0), 3.2, 0.05);
      k.kombu(now + 0.07, n(7), 3.2, 0.045);
      k.kombu(now + 0.09, n(12), 3.2, 0.03);
      v.swell(now, 0.08, 0.8);
    }
    if (crossed(previous, p, M.melam[0])) this.pad.chord([n(-12), n(-5), n(4)], 2);
    if (crossed(previous, p, M.home)) this.pad.chord([n(-12), n(-5), n(0)], 3);
    if (crossed(previous, p, 0.94)) {
      v.choir(now, [n(-12), n(-5), n(0), n(4)], 8, 0.022);
      v.bell(now + 0.2, n(12), 0.05, 6);
      v.bell(now + 1.4, n(19), 0.03, 5);
    }
  }

  /** Kurava: the women's high, trilling cry of joy, the tongue flicking fast against it. */
  private kurava(time: number) {
    const { ctx, bus } = this.v;
    for (let w = 0; w < 4; w++) {
      const t = time + w * 0.25;
      const dur = 2.2 + Math.random() * 0.6;
      const freq = n(24 + [0, 2, 4, 7][w]) * (1 + (Math.random() - 0.5) * 0.01);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.018, t + 0.15);
      gain.gain.setValueAtTime(0.018, t + dur - 0.4);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      const trill = ctx.createGain();
      trill.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 11 + Math.random() * 2;
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(trill.gain);
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2400;
      band.Q.value = 1.2;
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq * 0.9, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.2);
      o.frequency.setValueAtTime(freq, t + dur - 0.5);
      o.frequency.exponentialRampToValueAtTime(freq * 1.06, t + dur);
      o.connect(trill).connect(band).connect(gain).connect(bus);
      lfo.start(t);
      o.start(t);
      lfo.stop(t + dur + 0.1);
      o.stop(t + dur + 0.1);
    }
  }

  on(event: string, now: number) {
    const { v, k } = this;
    if (event === "flower") {
      // On the veena's next half-beat: a note of the raga, and a little bell.
      const time = Math.ceil(now / (VEENA_BEAT / 2)) * (VEENA_BEAT / 2);
      const semi = deg(8 + Math.floor(Math.random() * 6));
      k.veena(time, n(semi + 12), 0.06, n(semi + 10), 0.08);
      v.bell(time + 0.01, n(semi + 24), 0.012, 1.4);
    }
    if (event === "tiger") {
      const time = Math.ceil(now / PULI_STEP) * PULI_STEP;
      k.growl(time, 0.07);
      k.jingle(time, 0.025);
      k.jingle(time + 0.12, 0.02);
      k.thakil(time, "thom", 0.14);
      k.udukku(time + PULI_STEP, 0.08, 9);
      k.udukku(time + PULI_STEP * 2, 0.07, 12);
    }
    if (event === "row") {
      k.splash(now, 0.05);
      k.sing(now + 0.05, n(7), 0.2, "e", 0.025, 5, true);
    }
  }
}
