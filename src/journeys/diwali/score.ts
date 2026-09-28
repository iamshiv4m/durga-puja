// Diwali's score, in Raga Yaman, the raga of the evening lamp (Sa Re Ga Ma♯ Pa Dha Ni):
// - a tanpura from the start, and crickets while it is still dark
// - a bansuri alaap over the first lamps and again at dawn
// - the aarti bells as Lakshmi comes in
// - a dholak in keherwa, and the crowd, once the town is lit
// - crackers and rockets at midnight
// - at the big moments, a choir swell
import { crossed, at, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { smoothstep } from "@/lib/math";
import { MOMENTS } from "./scene";

const SA = 220;
const n = (semitones: number) => hz(SA, semitones);

// Yaman, in semitones from Sa.
const YAMAN = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16];
const TANPURA = [-5, 0, 0, -12];

/** Alaap phrases as [semitones, beats]. */
const PHRASES: [number, number][][] = [
  // Ni Re Ga, Re Sa: Yaman's own opening.
  [[-1, 1.5], [2, 1], [4, 3], [2, 1], [0, 4]],
  // Ga Ma♯ Dha Ni Sa', and down.
  [[4, 1], [6, 1], [9, 1.5], [11, 1], [12, 3], [11, 1], [9, 1], [7, 3]],
  // Pa Ma♯ Ga, Re Sa.
  [[7, 2], [6, 1], [4, 2], [2, 1], [0, 5]],
];
const BEAT = 0.55;

// Keherwa, eight beats: dha ge na ti na ka dhi na.
// D = bass and open together, G = bass, N = open, T = slap, K = rim.
const KEHERWA = "DGNTNKDN";

export class DiwaliScore implements Score {
  private v!: Voices;
  private pad!: PadHandle;
  private water!: Handle;
  private crowd!: Handle;
  private flutePhrase = 0;
  private fluteFree = 0;

  start(voices: Voices) {
    this.v = voices;
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.05, 700);
    this.water = voices.bed("water", 0.04);
    this.crowd = voices.bed("crowd", 0.02);
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    // Tanpura, all night.
    steps(from, to, 1.1, (time, i) => v.tanpura(time, n(TANPURA[i % 4]), 0.04 * (1 - 0.5 * smoothstep(0.74, 0.8, p))));

    // Crickets, while the house is still dark.
    if (p < 0.34 && Math.random() < (to - from) * 1.2) v.chirp(from + Math.random() * (to - from), 0.008);

    // The bansuri, where the drums are not.
    const flute = p < 0.34 || (p > 0.37 && p < 0.47) || p > 0.88;
    if (flute && from >= this.fluteFree) {
      const phrase = PHRASES[this.flutePhrase++ % PHRASES.length];
      let time = from;
      let last: number | undefined;
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 12);
        v.flute(time, freq, beats * BEAT, 0.05, last);
        last = freq;
        time += beats * BEAT;
      }
      this.fluteFree = time + 3 + Math.random() * 2;
    }

    // The aarti: a hand bell rung fast and a temple bell now and then, as Lakshmi comes in.
    if (p > 0.48 && p < 0.6) {
      steps(from, to, 0.19, (time, i) => v.bell(time, i % 2 ? 1760 : 1900, 0.012, 0.6));
      steps(from, to, 3.3, (time) => v.bell(time, 440, 0.07, 5));
    }

    // Dholak once the town is lit, quicker at midnight.
    if (p > 0.6 && p < 0.9) {
      const midnight = p > 0.74;
      const drive = smoothstep(0.6, 0.65, p) * (1 - smoothstep(0.86, 0.9, p));
      steps(from, to, midnight ? 0.2 : 0.27, (time, i) => {
        const stroke = at(KEHERWA, i);
        const level = 0.16 * drive * (i % 4 === 0 ? 1.2 : 1);
        if (stroke === "D" || stroke === "G") v.drum(time, "bass", level, 1.4);
        if (stroke === "D" || stroke === "N") v.drum(time, "open", level * 0.8, 1.2);
        if (stroke === "T") v.drum(time, "slap", level * 0.7, 1.2);
        if (stroke === "K") v.drum(time, "rim", level * 0.5, 1.2);
        if (midnight && i % 2 === 0) v.manjira(time, 0.02 * drive, i % 8 === 0);
      });
    }

    // Distant crackers, all through midnight.
    if (p > 0.72 && p < 0.88 && Math.random() < (to - from) * 3) v.crack(from + Math.random() * (to - from), 0.03 + Math.random() * 0.04);
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const warm = smoothstep(0.08, 0.3, p);
    const town = smoothstep(0.6, 0.66, p) * (1 - 0.4 * smoothstep(0.88, 0.95, p));
    this.pad.level(0.35 + 0.35 * warm + 0.3 * town);
    this.pad.bright(600 + 1600 * town + 600 * smoothstep(0.74, 0.8, p));
    this.water.level(smoothstep(0.58, 0.64, p));
    this.crowd.level(town * (1 - smoothstep(0.86, 0.92, p)));
    // The raga's chord moves with the night: Sa Pa, then Ga Pa Ni, and back.
    if (crossed(previous, p, 0.47)) this.pad.chord([n(-8), n(-5), n(-1)], 3);
    if (crossed(previous, p, 0.6)) this.pad.chord([n(-12), n(-5), n(4)], 3);
    if (crossed(previous, p, 0.88)) this.pad.chord([n(-12), n(-5), n(0)], 4);

    if (crossed(previous, p, MOMENTS.yama[0])) {
      v.bell(now + 0.05, 660, 0.08, 5);
      v.choir(now + 0.1, [n(-12), n(0)], 6, 0.02);
    }
    if (crossed(previous, p, MOMENTS.rangoli[0])) v.bell(now + 0.05, 990, 0.05, 3);
    if (crossed(previous, p, MOMENTS.feet[0])) {
      v.choir(now, [n(-12), n(-5), n(4)], 7, 0.03);
      v.bell(now + 0.1, 440, 0.1, 6);
    }
    if (crossed(previous, p, MOMENTS.town[0])) {
      v.swell(now, 0.07, 2.5);
      v.choir(now + 1.5, [n(-12), n(-5), n(0), n(4)], 8, 0.04);
    }
    if (crossed(previous, p, MOMENTS.fireworks[0])) v.swell(now, 0.08, 2);
    if (crossed(previous, p, MOMENTS.dawn[0])) {
      v.bell(now + 0.2, 440, 0.08, 7);
      v.choir(now + 0.5, [n(-12), n(-5), n(0)], 9, 0.03);
    }
  }

  on(event: string, now: number) {
    const v = this.v;
    if (event === "light") v.bell(now, n(YAMAN[Math.floor(Math.random() * YAMAN.length)] + 24), 0.05, 2.5);
    if (event === "pour") v.manjira(now, 0.012);
    if (event === "burst") {
      v.whoosh(now, 0.35, 0.05);
      v.crack(now + 0.32, 0.14);
    }
    if (event === "rocket") v.crack(now, 0.06 + Math.random() * 0.05);
  }
}
