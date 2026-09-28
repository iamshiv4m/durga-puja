// Ganeshotsav's score, around Raga Bhoopali (Sa Re Ga Pa Dha), sung everywhere in Maharashtra:
// - a tanpura and a bansuri in the murtikar's workshop, and a choir as the eyes are painted
// - the dhol-tasha pathak for the aagman: deep dhol strokes, tasha rolls and the jhanj, with the
//   crowd shouting "Morya!"
// - the aarti: clapping, the tal, a hand bell rung fast and a dholki under the bansuri
// - a pandal far off through the ten days, then the Anant Chaturdashi pathak at full force, faster
// - and at the sea, the waves, the wind and the bansuri again, and a choir as he goes under
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { MOMENTS } from "./scene";

const SA = 196;
const n = (semitones: number) => hz(SA, semitones);

const BHOOPALI = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const TANPURA = [-5, 0, 0, -12];

/** Bansuri phrases as [semitones, beats]. */
const PHRASES: [number, number][][] = [
  // Sa Re Ga, Pa Ga Re, Sa.
  [[0, 1], [2, 1], [4, 2], [7, 1], [4, 1], [2, 2], [0, 4]],
  // Ga Pa Dha Sa', Dha Pa Ga.
  [[4, 1], [7, 1], [9, 2], [12, 3], [9, 1], [7, 1], [4, 4]],
  // Dha Pa Ga Re, Ga, Sa.
  [[9, 1.5], [7, 1], [4, 1], [2, 1], [4, 1.5], [0, 4]],
];
const BEAT = 0.5;

// Sixteen steps of dhol-tasha. B = the deep head with the toka, o = the treble head, x = both.
const DHOL = "B..B..B.x.oB.oB.";
// The tasha: T accented, t soft, rolled in between.
const TASHA = "T.tTt.tTT.tTt.tt";
const JHANJ = "X...x...x...x.x.";

export class GaneshScore implements Score {
  private v!: Voices;
  private pad!: PadHandle;
  private water!: Handle;
  private wind!: Handle;
  private crowd!: Handle;
  private flutePhrase = 0;
  private fluteFree = 0;

  start(voices: Voices) {
    this.v = voices;
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.05, 700);
    this.water = voices.bed("water", 0.05);
    this.wind = voices.bed("wind", 0.03);
    this.crowd = voices.bed("crowd", 0.03);
  }

  /** How hard the pathak is playing at `p`, 0..1, and how fast. */
  private pathak(p: number) {
    const aagman = smoothstep(0.2, 0.225, p) * (1 - smoothstep(0.325, 0.345, p));
    const city = 0.22 * smoothstep(0.48, 0.52, p) * (1 - smoothstep(0.59, 0.61, p));
    const night = smoothstep(0.6, 0.625, p) * (1 - smoothstep(0.73, 0.8, p) * 0.8) * (1 - smoothstep(0.8, 0.84, p));
    const level = Math.max(aagman, city, night);
    const step = night > aagman && night > city ? (p > 0.67 ? 0.11 : 0.125) : city > aagman ? 0.16 : 0.14;
    return { level, step, far: city > aagman && city > night };
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const sea = smoothstep(0.745, 0.78, p);
    // Tanpura under everything but the loudest drums.
    const loud = this.pathak(p).level;
    steps(from, to, 1.2, (time, i) => v.tanpura(time, n(TANPURA[i % 4]), 0.04 * (1 - 0.7 * Math.min(1, loud * 1.4))));

    // The murtikar's tools, tapping now and then in the workshop.
    if (p < 0.19 && Math.random() < (to - from) * 0.8) v.drum(from + Math.random() * (to - from), "rim", 0.03, 0.8 + Math.random() * 0.4);

    // The bansuri, where the drums are not.
    const flute = p < 0.2 || (p > 0.36 && p < 0.46) || p > 0.76;
    if (flute && from >= this.fluteFree) {
      const phrase = PHRASES[this.flutePhrase++ % PHRASES.length];
      const beat = BEAT * (p > 0.76 ? 1.3 : p > 0.36 && p < 0.46 ? 0.92 : 1.1);
      let time = from;
      let last: number | undefined;
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 12);
        v.flute(time, freq, beats * beat, 0.05, last);
        last = freq;
        time += beats * beat;
      }
      this.fluteFree = time + (p > 0.36 && p < 0.46 ? 0.5 : 2.5 + Math.random() * 2);
    }

    // Dhol-tasha.
    const { level, step, far } = this.pathak(p);
    if (level > 0.01) {
      const tone = far ? 0.8 : 1;
      steps(from, to, step, (time, i) => {
        const bar = i % 64 >= 48;
        const d = at(DHOL, i);
        const lvl = 0.18 * level;
        if (d === "B" || d === "x") v.drum(time, "bass", lvl * (i % 16 === 0 ? 1.2 : 1), 0.8);
        if (d === "o" || d === "x") v.drum(time, "open", lvl * 0.7, 0.9);
        // The tashas roll twice to each step, and all together in the last bar of four.
        const t = at(TASHA, i);
        const roll = bar || t !== ".";
        if (roll) {
          v.drum(time, "slap", lvl * (t === "T" ? 0.55 : 0.32) * tone, 2.2);
          v.drum(time + step / 2, "rim", lvl * 0.3 * tone, 2.4);
        }
        const j = at(JHANJ, i);
        if (j !== ".") v.manjira(time, 0.028 * level, j === "X");
        // The crowd between phrases: "Ganpati Bappa... Morya!"
        if (!far && level > 0.5 && i % 64 === 56) v.choir(time, [n(4), n(9)], 0.35, 0.03 * level);
        if (!far && level > 0.5 && i % 64 === 58) {
          v.choir(time, [n(0), n(7)], 0.7, 0.035 * level);
          v.clap(time, 0.06 * level, 8);
        }
      });
    }

    // The aarti: clapping and the tal on the beat, the hand bell rung fast, a dholki under it.
    const aarti = smoothstep(0.355, 0.37, p) * (1 - smoothstep(0.455, 0.47, p));
    if (aarti > 0.01) {
      steps(from, to, 0.46, (time, i) => {
        v.clap(time, 0.07 * aarti, 6);
        v.manjira(time + 0.23, 0.02 * aarti);
        if (i % 2 === 0) v.manjira(time, 0.03 * aarti, true);
        v.drum(time, i % 4 === 0 ? "bass" : "open", 0.09 * aarti, 1.3);
        if (i % 8 === 0) v.bell(time, 440, 0.06 * aarti, 5);
      });
      steps(from, to, 0.13, (time, i) => v.bell(time, i % 2 ? 1760 : 1900, 0.01 * aarti, 0.5));
    }

    // A temple bell in the pandal now and then, and at the sea a last one.
    if (p > 0.48 && p < 0.6) steps(from, to, 4.1, (time) => v.bell(time, 330, 0.04, 5));
    if (sea > 0.5 && Math.random() < (to - from) * 0.2) v.bell(from, n(24 + BHOOPALI[Math.floor(Math.random() * 5)]), 0.012, 3);
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const aarti = smoothstep(0.35, 0.37, p) * (1 - smoothstep(0.455, 0.47, p));
    const sea = smoothstep(0.745, 0.8, p);
    this.pad.level(0.3 + 0.3 * smoothstep(0.08, 0.2, p) + 0.4 * aarti + 0.2 * sea);
    this.pad.bright(600 + 1200 * aarti + 500 * smoothstep(0.6, 0.66, p) * (1 - sea));
    this.water.level(sea);
    this.wind.level(0.4 * sea + 0.6 * smoothstep(0.86, 0.95, p));
    const crowd =
      0.5 * smoothstep(0.21, 0.24, p) * (1 - smoothstep(0.32, 0.345, p)) +
      0.7 * smoothstep(0.48, 0.52, p) * (1 - smoothstep(0.59, 0.61, p)) +
      smoothstep(0.6, 0.63, p) * (1 - smoothstep(0.74, 0.8, p) * 0.6) * (1 - smoothstep(0.84, 0.9, p));
    this.crowd.level(crowd);
    // The chord moves with him: Sa Pa for the workshop, Ga Pa Sa' at the aarti, Dha Sa Ga at night.
    if (crossed(previous, p, 0.34)) this.pad.chord([n(-8), n(-5), n(0)], 3);
    if (crossed(previous, p, 0.47)) this.pad.chord([n(-12), n(-5), n(4)], 3);
    if (crossed(previous, p, 0.74)) this.pad.chord([n(-15), n(-12), n(-8)], 4);
    if (crossed(previous, p, 0.9)) this.pad.chord([n(-12), n(-5), n(0)], 4);

    if (crossed(previous, p, MOMENTS.paint[0])) v.bell(now + 0.05, n(24), 0.04, 3);
    if (crossed(previous, p, MOMENTS.eyes[0])) {
      v.choir(now + 0.1, [n(-12), n(0), n(7)], 7, 0.035);
      v.bell(now + 0.6, 440, 0.07, 6);
    }
    if (crossed(previous, p, MOMENTS.veil[0])) v.whoosh(now, 1.2, 0.02, false);
    if (crossed(previous, p, MOMENTS.aagman[0])) v.swell(now, 0.07, 1.5);
    if (crossed(previous, p, MOMENTS.unveil[0])) {
      v.choir(now, [n(-12), n(-5), n(4)], 8, 0.04);
      v.bell(now + 0.2, 440, 0.1, 6);
      v.bell(now + 0.5, 660, 0.05, 4);
    }
    if (crossed(previous, p, MOMENTS.city[0])) v.swell(now, 0.05, 2.5);
    if (crossed(previous, p, MOMENTS.procession[0])) {
      v.swell(now, 0.08, 1.5);
      v.choir(now + 1.4, [n(0), n(7), n(12)], 1.2, 0.04);
    }
    if (crossed(previous, p, MOMENTS.sink[0])) {
      v.choir(now, [n(-12), n(-5), n(0), n(4)], 10, 0.04);
      v.bell(now + 0.3, 440, 0.08, 7);
    }
    if (crossed(previous, p, 0.9)) {
      v.bell(now + 0.1, 440, 0.06, 7);
      v.choir(now + 0.5, [n(-12), n(-5), n(0)], 9, 0.025);
    }
  }

  on(event: string, now: number) {
    const v = this.v;
    if (event === "wave") v.bell(now, 1760 + Math.random() * 300, 0.03, 1.2);
    if (event === "gulal") {
      v.whoosh(now, 0.45, 0.035);
      v.clap(now + 0.05, 0.05, 5);
      for (let i = 0; i < 6; i++) v.drum(now + i * 0.05, "slap", 0.05 * (1 - i / 8), 2.3);
    }
    if (event === "flower") {
      v.drum(now, "rim", 0.04, 1.6);
      v.bell(now + 0.02, n(24 + BHOOPALI[Math.floor(Math.random() * BHOOPALI.length)]), 0.025, 2);
    }
  }
}
