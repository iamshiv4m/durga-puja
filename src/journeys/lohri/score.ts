// The score for Lohri & Vaisakhi. The folk sections are in a Khamaj-like mode (Sa Re Ga Ma Pa Dha
// ni, the flat Ni of so much Punjabi folk); the gurdwara's in Bilawal, with a natural Ni. All the
// tunes are new, written for this page:
// - the fog: wind, the algoza's drone and a slow, free tune
// - the lane: children calling a verse and all answering "ho!", with claps and a chimta
// - the fire: its roar and crackle, a dholki walking round with the family, the tumbi coming in
// - gidda: the dholki quicker, the women's claps, boliyan called out and answered "balle!"
// - the wheat: morning birds, the algoza again, the dhol far off and getting nearer
// - Vaisakhi: the dhol in a full bhangra chaal, tumbi riffs, chimta, algoza and "hoy!"
// - Anandpur Sahib: five strokes of the nagara as the five stand, then the harmonium and a slow
//   shabad-like line, the nagara steady under the nagar kirtan
// - the mela: the dhol again, the tumbi and algoza, the crowd; at the end the algoza alone
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type Voices } from "../voices";
import {
  chimta,
  drone,
  harmonium,
  nagara,
  pops,
  reed,
  shout,
  tumbi,
} from "./instruments";
import { MOMENTS } from "./timeline";

const SA = 233.08;
const n = (semitones: number) => hz(SA, semitones);

const KHAMAJ = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16];

type Line = [number, number][];

/** The algoza's free tunes, as [semitones, beats]. */
const ALGOZA: Line[] = [
  [
    [7, 1],
    [9, 0.5],
    [10, 0.5],
    [12, 2],
    [10, 0.5],
    [9, 0.5],
    [7, 1],
    [5, 1],
    [7, 2.5],
  ],
  [
    [4, 1],
    [5, 0.5],
    [7, 0.5],
    [9, 1],
    [7, 1],
    [5, 0.5],
    [4, 0.5],
    [2, 1],
    [0, 2.5],
  ],
  [
    [12, 1],
    [14, 0.5],
    [12, 0.5],
    [10, 1],
    [9, 1],
    [7, 1],
    [9, 0.5],
    [7, 0.5],
    [5, 1],
    [4, 2.5],
  ],
  [
    [0, 1],
    [2, 0.5],
    [4, 0.5],
    [5, 1],
    [7, 1.5],
    [5, 0.5],
    [4, 1],
    [2, 1],
    [0, 3],
  ],
];

/** The algoza's line over the bhangra, in beats of the dhol. */
const LEAD: Line[] = [
  [
    [12, 2],
    [10, 1],
    [9, 1],
    [7, 2],
    [9, 1],
    [10, 1],
    [12, 4],
    [14, 2],
    [12, 1],
    [10, 1],
    [9, 2],
    [7, 2],
  ],
  [
    [7, 2],
    [9, 1],
    [10, 1],
    [12, 2],
    [10, 2],
    [9, 1],
    [7, 1],
    [5, 2],
    [4, 2],
    [5, 2],
    [7, 4],
  ],
];

/** The children's verse, a note a beat, each line answered with "ho!". */
const VERSE = [
  [7, 7, 9, 7, 5, 4],
  [4, 5, 7, 5, 4, 2],
  [7, 9, 10, 9, 7, 5],
  [4, 5, 4, 2, 0, 0],
];

/** A boli: one woman's quick couplet, then everyone's "balle!". */
const BOLI = [
  [12, 12, 10, 9, 10, 12, 9, 7],
  [7, 9, 10, 9, 7, 5, 4, 5],
];

/** Tumbi riffs on the sixteenths of the chaal; null is a rest. */
const RIFF: (number | null)[][] = [
  [12, null, 12, 14, 12, null, 10, null, 12, null, 12, 14, 16, 14, 12, null],
  [7, null, 7, 9, 10, null, 9, null, 7, null, 5, 4, 5, null, 7, null],
];

/** The shabad-like line at the gurdwara, in Bilawal. */
const KIRTAN: Line[] = [
  [
    [0, 2],
    [2, 1],
    [4, 1],
    [5, 2],
    [4, 1],
    [2, 1],
    [0, 4],
  ],
  [
    [4, 1],
    [5, 1],
    [7, 2],
    [9, 1],
    [7, 1],
    [5, 1],
    [4, 1],
    [2, 4],
  ],
  [
    [7, 2],
    [9, 1],
    [11, 1],
    [12, 3],
    [11, 1],
    [9, 1],
    [7, 1],
    [5, 2],
    [4, 2],
  ],
  [
    [5, 1],
    [4, 1],
    [2, 2],
    [4, 1],
    [2, 1],
    [0, 4],
  ],
];

// The dhol's bhangra chaal, 3 + 3 + 2 in sixteenths: D = dagga (the bass stick), t = tilli (the
// cane on the treble head), . = rest.
const CHAAL = "D.tD.tDtD.tD.tt.";
// The dholki under the parikrama, a gentle keherwa: dha ge na ti na ka dhi na.
const KEHERWA = "DGNTNKDN";
// The dholki for gidda, and where the claps fall.
const GIDDA = "D.tD.tDt";
const THAAP = "x.x.x.xx";

const STEP = 0.15;

export class LohriScore implements Score {
  private v!: Voices;
  private wind!: Handle;
  private roar!: Handle;
  private crowd!: Handle;
  private pipe!: Handle;
  private reeds!: ReturnType<typeof harmonium>;
  private free = 0;
  private phrase = 0;
  private cut = 0;

  start(voices: Voices) {
    this.v = voices;
    this.wind = voices.bed("wind", 0.03);
    this.roar = voices.bed("wind", 0.06);
    this.crowd = voices.bed("crowd", 0.03);
    this.pipe = drone(voices, [n(-12), n(-5)], 0.035);
    this.reeds = harmonium(voices, [n(-12), n(-5), n(0)], 0.03);
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const span = to - from;
    const fire =
      smoothstep(MOMENTS.light, MOMENTS.light + 0.01, p) *
      (1 - smoothstep(0.4, 0.43, p));

    // The fire crackling; birds in the spring morning.
    if (fire > 0.05 && Math.random() < span * 8 * fire)
      v.crack(from + Math.random() * span, 0.005 + Math.random() * 0.016);
    if (p > 0.44 && p < 0.53 && Math.random() < span * 2)
      this.birdsong(from + Math.random() * span);

    // The algoza's free tune: in the fog, in the fields, and alone at the end.
    const free = p < 0.09 || (p > 0.425 && p < 0.53) || p > 0.9;
    if (free && from >= this.free)
      this.tune(
        from,
        ALGOZA,
        p > 0.9 ? 0.62 : 0.52,
        0.045,
        2 + Math.random() * 2,
      );

    // The children at the door: the verse on the beat, "ho!", claps and the chimta.
    const lane =
      smoothstep(MOMENTS.door - 0.012, MOMENTS.door, p) *
      (1 - smoothstep(0.165, 0.185, p));
    if (lane > 0.01) {
      steps(from, to, 0.36, (time, i) => {
        const beat = i % 8;
        const line = VERSE[Math.floor(i / 8) % VERSE.length];
        if (beat < 6)
          v.choir(
            time,
            [n(line[beat]), n(line[beat] + 12)],
            0.34,
            0.012 * lane,
          );
        if (beat === 6) shout(v, time, 0.045 * lane, 1.35, 5);
        if (beat % 2 === 0) v.clap(time, 0.04 * lane, 3);
        if (beat % 4 === 2) chimta(v, time, 0.02 * lane);
      });
    }

    // Round the fire: the dholki's keherwa, and the tumbi picking out Sa and Pa.
    const walk =
      smoothstep(MOMENTS.light, MOMENTS.light + 0.015, p) *
      (1 - smoothstep(0.3, 0.315, p));
    if (walk > 0.01) {
      steps(from, to, 0.28, (time, i) => {
        const stroke = at(KEHERWA, i);
        const level = 0.1 * walk;
        if (stroke === "D" || stroke === "G") v.drum(time, "bass", level, 1.4);
        if (stroke === "D" || stroke === "N")
          v.drum(time, "open", level * 0.6, 1.3);
        if (stroke === "T") v.drum(time, "slap", level * 0.5, 1.3);
        if (i % 4 === 0) tumbi(v, time, n(i % 16 === 8 ? 7 : 12), 0.03 * walk);
      });
      if (from >= this.free && p > 0.21)
        this.tune(from, ALGOZA, 0.42, 0.035, 1.5);
    }

    // Gidda: a quicker dholki, the claps, and a boli called and answered every few bars.
    const gidda = smoothstep(0.3, 0.315, p) * (1 - smoothstep(0.405, 0.425, p));
    if (gidda > 0.01) {
      steps(from, to, 0.19, (time, i) => {
        const stroke = at(GIDDA, i);
        const level = 0.13 * gidda;
        if (stroke === "D") v.drum(time, "bass", level, 1.35);
        if (stroke === "t") v.drum(time, "slap", level * 0.6, 1.4);
        if (at(THAAP, i) === "x") v.clap(time, 0.07 * gidda, 7);
        const bar = Math.floor(i / 8) % 4;
        if (bar === 2) {
          const boli = BOLI[Math.floor(i / 32) % BOLI.length];
          v.choir(time, [n(boli[i % 8] + 12)], 0.2, 0.016 * gidda);
        }
        if (bar === 3 && i % 8 === 0) {
          shout(v, time, 0.05 * gidda, 1.5, 7);
          shout(v, time + 0.38, 0.045 * gidda, 1.4, 7);
        }
        if (i % 4 === 0) tumbi(v, time, n(RIFF[1][i % 16] ?? 7), 0.028 * gidda);
      });
    }

    // The wheat ripening: the dhol far off, nearer and nearer, and the tumbi getting up.
    const near = smoothstep(0.49, 0.545, p) * (1 - smoothstep(0.545, 0.55, p));
    if (near > 0.01) {
      steps(from, to, STEP, (time, i) => {
        if (i % 4 === 0) v.drum(time, "bass", 0.12 * near, 0.8);
        if (i % 4 === 2 && near > 0.5) v.drum(time, "slap", 0.06 * near, 1.6);
        if (i % 2 === 0 && near > 0.3)
          tumbi(v, time, n(i % 8 === 0 ? 0 : 12), 0.025 * near);
      });
    }

    // Vaisakhi: the reaping groove, then the bhangra; and the dhol again at the mela.
    const harvest =
      smoothstep(MOMENTS.vaisakhi, MOMENTS.vaisakhi + 0.008, p) *
      (1 - smoothstep(0.655, 0.668, p));
    const bhangra =
      smoothstep(MOMENTS.hoy - 0.002, MOMENTS.hoy + 0.002, p) *
      (1 - smoothstep(0.655, 0.668, p));
    const mela = smoothstep(0.785, 0.8, p) * (1 - smoothstep(0.93, 0.99, p));
    const dhol = Math.max(harvest * 0.7 + bhangra * 0.3, mela * 0.8);
    if (dhol > 0.01) {
      const roll = p > MOMENTS.hoy - 0.012 && p < MOMENTS.hoy;
      const full = Math.max(bhangra, mela);
      steps(from, to, STEP, (time, i) => {
        if (roll) {
          // The roll into the drop: the tilli racing, the dagga on every beat.
          v.drum(time, "slap", 0.1 + 0.08 * ((i % 8) / 8), 1.7);
          v.drum(time + STEP / 2, "slap", 0.06, 1.8);
          if (i % 2 === 0) v.drum(time, "bass", 0.14, 0.8);
          return;
        }
        const stroke = at(CHAAL, i);
        const level = 0.19 * dhol;
        if (stroke === "D") {
          v.drum(time, "bass", level * (i % 8 === 0 ? 1.2 : 0.95), 0.78);
          v.drum(time, "open", level * 0.3, 0.85);
        }
        if (stroke === "t") v.drum(time, "slap", level * 0.7, 1.6);
        if (i % 4 === 2) chimta(v, time, 0.028 * Math.max(full, harvest * 0.5));
        if (i % 8 === 4 && full > 0.1) v.clap(time, 0.06 * full, 8);
        const riff = RIFF[Math.floor(i / 32) % 2][i % 16];
        if (riff !== null && (full > 0.1 || i % 2 === 0))
          tumbi(v, time, n(riff), 0.036 * Math.max(full, harvest * 0.6));
        if (i % 64 === 60 && full > 0.5) shout(v, time, 0.055 * full, 1.1, 8);
      });
      if (from >= this.free && full > 0.5)
        this.tune(from, LEAD, STEP * 2, 0.04, STEP * 4);
    }

    // The gurdwara: the harmonium's line over the drone, the nagara under the nagar kirtan.
    const kirtan =
      smoothstep(MOMENTS.khalsa[1] - 0.004, MOMENTS.khalsa[1] + 0.006, p) *
      (1 - smoothstep(0.778, 0.79, p));
    if (kirtan > 0.01) {
      if (from >= this.free) {
        const line = KIRTAN[this.phrase++ % KIRTAN.length];
        let time = from;
        for (const [semi, beats] of line) {
          reed(v, time, n(semi + 12), beats * 0.62 * 0.96, 0.03 * kirtan);
          v.choir(time, [n(semi)], beats * 0.62, 0.008 * kirtan);
          time += beats * 0.62;
        }
        this.free = time + 1.2;
      }
      const march =
        smoothstep(MOMENTS.kirtan[0], MOMENTS.kirtan[0] + 0.01, p) * kirtan;
      if (march > 0.01) {
        steps(from, to, 0.62, (time, i) => {
          if (i % 2 === 0) nagara(v, time, 0.16 * march);
          else nagara(v, time, 0.07 * march, true);
        });
      }
    }
  }

  /** Plays the next line of `lines` on the algoza, holding back the next tune until it is done. */
  private tune(
    from: number,
    lines: Line[],
    beat: number,
    level: number,
    rest: number,
  ) {
    const v = this.v;
    const line = lines[this.phrase++ % lines.length];
    let time = from;
    let last: number | undefined;
    for (const [semi, beats] of line) {
      const freq = n(semi + 12);
      v.flute(time, freq, beats * beat * 0.92, level, last);
      last = freq;
      time += beats * beat;
    }
    this.free = time + rest;
  }

  /** A bulbul, a few quick bright notes. */
  private birdsong(time: number) {
    const { ctx, bus } = this.v;
    const base = 2400 + Math.random() * 1200;
    for (let i = 0; i < 3; i++) {
      const t = time + i * 0.09;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(base * (1 + i * 0.1), t);
      osc.frequency.exponentialRampToValueAtTime(
        base * (1.3 - i * 0.1),
        t + 0.06,
      );
      const gain = this.v.envelope(t, 0.005, 0.07, 0.006);
      osc.connect(gain).connect(bus);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const fire =
      smoothstep(MOMENTS.light, MOMENTS.light + 0.01, p) *
      (1 - smoothstep(0.4, 0.43, p));
    const night = 1 - smoothstep(0.41, 0.445, p);
    this.wind.level(0.4 + 0.6 * night - 0.3 * fire);
    this.roar.level(fire * 0.8);
    const bhangra =
      smoothstep(MOMENTS.hoy - 0.004, MOMENTS.hoy, p) *
      (1 - smoothstep(0.655, 0.668, p));
    const langar = smoothstep(0.7, 0.72, p) * (1 - smoothstep(0.77, 0.79, p));
    const mela = smoothstep(0.785, 0.81, p) * (1 - smoothstep(0.93, 1, p));
    const gidda = smoothstep(0.3, 0.315, p) * (1 - smoothstep(0.405, 0.425, p));
    this.crowd.level(
      0.2 * fire + 0.4 * gidda + 0.8 * bhangra + 0.5 * langar + mela,
    );
    // The algoza's drone under everything folk; the harmonium's at the gurdwara.
    const gurdwara =
      smoothstep(0.662, 0.672, p) * (1 - smoothstep(0.778, 0.79, p));
    this.pipe.level(
      smoothstep(0, 0.03, p) *
        (1 - 0.5 * Math.max(bhangra, mela * 0.8)) *
        (1 - gurdwara),
    );
    this.reeds.level(gurdwara);

    if (crossed(previous, p, MOMENTS.door)) chimta(v, now, 0.03);
    if (crossed(previous, p, MOMENTS.rewri)) {
      shout(v, now, 0.05, 1.4, 6);
      v.bell(now + 0.1, n(24), 0.025, 1.5);
    }
    if (crossed(previous, p, MOMENTS.light)) {
      v.swell(now, 0.07, 2.2);
      v.crack(now + 0.3, 0.06);
      v.whoosh(now + 0.2, 1.6, 0.05);
      v.choir(now + 1.2, [n(-12), n(-5), n(0), n(4)], 6, 0.025);
    }
    if (crossed(previous, p, MOMENTS.pehli)) {
      v.choir(now, [n(-12), n(0), n(4), n(7)], 6, 0.028);
      shout(v, now + 0.4, 0.04, 1.5, 6);
    }
    if (crossed(previous, p, MOMENTS.vaisakhi)) {
      v.swell(now, 0.07, 1.8);
      shout(v, now + 1.8, 0.05, 1.1, 8);
    }
    if (crossed(previous, p, MOMENTS.hoy)) {
      // The drop: every voice at once, and the whole crowd.
      v.swell(now, 0.09, 0.6);
      shout(v, now + 0.1, 0.08, 1.05, 12);
      v.choir(now + 0.2, [n(0), n(4), n(7), n(12)], 2.4, 0.04);
      for (let i = 0; i < 4; i++) v.clap(now + 0.3 + i * STEP * 2, 0.1, 10);
    }
    // Anandpur Sahib: a stroke of the nagara for each of the five as they stand.
    for (let i = 0; i < 5; i++) {
      if (crossed(previous, p, MOMENTS.khalsa[0] + i * 0.0045)) {
        nagara(v, now, 0.26);
        if (i === 0) v.choir(now, [n(-24), n(-12), n(-5)], 9, 0.03);
        if (i === 4) v.swell(now + 0.3, 0.07, 2.5);
      }
    }
    if (crossed(previous, p, MOMENTS.kirtan[0])) {
      // The jaikara: one voice calls, and the sangat answers.
      shout(v, now, 0.05, 1.0, 2);
      shout(v, now + 0.9, 0.07, 0.95, 12);
      shout(v, now + 1.3, 0.06, 0.9, 12);
    }
    if (crossed(previous, p, 0.8)) shout(v, now, 0.05, 1.15, 8);
    if (crossed(previous, p, MOMENTS.finale))
      v.choir(now + 0.3, [n(-12), n(-5), n(0), n(4)], 10, 0.03);
  }

  on(event: string, now: number) {
    const v = this.v;
    // On the dhol's grid, so what the reader plays stays in time.
    const beat = Math.ceil(now / STEP - 1e-6) * STEP;
    if (event === "offer") {
      v.whoosh(now, 0.5, 0.03, true);
      v.crack(now + 0.75, 0.035);
      pops(v, now + 0.4, 5, 0.035);
      tumbi(v, beat, n(KHAMAJ[Math.floor(Math.random() * 5) + 3]), 0.03);
    }
    if (event === "cut") {
      v.whoosh(now, 0.16, 0.035, false);
      v.thump(now + 0.02, 0.04, 4800, 0.04);
      tumbi(v, beat, n(KHAMAJ[this.cut++ % KHAMAJ.length]), 0.028);
    }
    if (event === "dagga") {
      v.drum(beat, "bass", 0.24, 0.78);
      v.drum(beat, "open", 0.07, 0.85);
    }
    if (event === "tilli") {
      v.drum(beat, "slap", 0.18, 1.6);
      v.drum(beat + STEP / 2, "slap", 0.08, 1.7);
    }
  }
}
