// Holi's score, in Raag Kafi, the raag of the hori and the phag (Sa Re ga Ma Pa Dha ni):
// - by the fire: a tanpura, crickets, the fire's roar and crackle, a slow dholak and a bansuri alaap
// - a choir as Prahlad walks out of the fire, and again at the first colour
// - in Braj, the dholak in keherwa, manjira, and a hori tune on the bansuri
// - in the lane, the dhol in a bhangra chaal, clapping, the crowd, and "Holi hai!"
// - the afternoon slows; at dusk the tanpura and bansuri come back alone
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { MOMENTS } from "./scene";

const SA = 220;
const n = (semitones: number) => hz(SA, semitones);

// Kafi, in semitones from Sa.
const KAFI = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15];
const TANPURA = [-5, 0, 0, -12];

/** Slow alaap phrases for the night and the dusk, as [semitones, beats]. */
const ALAAP: [number, number][][] = [
  // Sa Re ga, Re Sa.
  [[0, 2], [2, 1], [3, 3], [2, 1], [0, 4]],
  // Ma Pa Dha ni, Dha Pa.
  [[5, 1.5], [7, 1], [9, 1], [10, 1.5], [9, 1], [7, 3]],
  // ga Ma Pa, Ma ga Re Sa.
  [[3, 1], [5, 1], [7, 2], [5, 1], [3, 1], [2, 1], [0, 4]],
];

/** A hori tune, eight beats a line, the way it is sung in the lanes of Braj. */
const HORI: [number, number][][] = [
  [[7, 1], [7, 0.5], [9, 0.5], [10, 1], [9, 0.5], [7, 0.5], [5, 1], [3, 1], [5, 2]],
  [[3, 0.5], [5, 0.5], [7, 1], [5, 0.5], [3, 0.5], [2, 1], [0, 1], [2, 0.5], [3, 0.5], [2, 2]],
  [[12, 1], [10, 0.5], [9, 0.5], [7, 1], [9, 0.5], [10, 0.5], [12, 1], [10, 1], [7, 2]],
  [[5, 1], [7, 0.5], [5, 0.5], [3, 1], [2, 1], [0, 0.5], [-2, 0.5], [0, 3]],
];

// Keherwa, eight beats: dha ge na ti na ka dhi na.
// D = bass and open together, G = bass, N = open, T = slap, K = rim.
const KEHERWA = "DGNTNKDN";
// The dhol's chaal: the heavy dagga and the thin tilli, in a lilting four.
// B = bass (dagga), t = slap (tilli), . = rest.
const CHAAL = "B.tB.tBt";

export class HoliScore implements Score {
  private v!: Voices;
  private pad!: PadHandle;
  private roar!: Handle;
  private crowd!: Handle;
  private phrase = 0;
  private free = 0;

  start(voices: Voices) {
    this.v = voices;
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.045, 700);
    this.roar = voices.bed("wind", 0.05);
    this.crowd = voices.bed("crowd", 0.028);
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const fire = smoothstep(0.085, 0.12, p) * (1 - smoothstep(0.185, 0.235, p));
    const lane = p > 0.47 && p < 0.62;
    // Tanpura, except while the dhol is loudest.
    const drone = 0.04 * (1 - 0.7 * smoothstep(0.46, 0.5, p) * (1 - smoothstep(0.6, 0.66, p)));
    steps(from, to, 1.1, (time, i) => v.tanpura(time, n(TANPURA[i % 4]), drone));

    // Crickets before the fire, and the fire crackling once it is lit.
    if (p < 0.12 && Math.random() < (to - from) * 1.2) v.chirp(from + Math.random() * (to - from), 0.008);
    if (fire > 0.05 && Math.random() < (to - from) * 9 * fire) v.crack(from + Math.random() * (to - from), 0.006 + Math.random() * 0.018);

    // The bansuri: a slow alaap at night and at dusk, a hori tune in the day.
    const tune = (p > 0.23 && p < 0.47) || (p > 0.5 && p < 0.74);
    const alaap = p < 0.2 || p > 0.76;
    if ((tune || alaap) && from >= this.free) {
      const lines = tune ? HORI : ALAAP;
      const beat = tune ? (lane ? 0.2 : p > 0.62 ? 0.3 : 0.25) : 0.55;
      const phrase = lines[this.phrase++ % lines.length];
      let time = from;
      let last: number | undefined;
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 12);
        v.flute(time, freq, beats * beat * 0.95, tune ? 0.045 : 0.05, alaap ? last : undefined);
        last = freq;
        time += beats * beat;
      }
      this.free = time + (tune ? beat * (lane ? 0 : 2) : 3 + Math.random() * 2);
    }

    // A slow dholak as the families walk round the fire.
    if (p > 0.1 && p < 0.2) {
      const walk = smoothstep(0.1, 0.12, p) * (1 - smoothstep(0.18, 0.2, p));
      steps(from, to, 0.42, (time, i) => {
        const stroke = at(KEHERWA, i);
        const level = 0.1 * walk;
        if (stroke === "D" || stroke === "G") v.drum(time, "bass", level, 1.3);
        if (stroke === "D" || stroke === "N") v.drum(time, "open", level * 0.6, 1.2);
        if (stroke === "T") v.drum(time, "slap", level * 0.5, 1.2);
      });
    }

    // The morning, Braj and the afternoon: dholak in keherwa, and manjira.
    const keherwa = (p > 0.25 && p < 0.47) || (p > 0.6 && p < 0.74);
    if (keherwa) {
      const drive = p < 0.47 ? smoothstep(0.25, 0.3, p) * (p < 0.34 ? 0.6 : 1) : smoothstep(0.6, 0.63, p) * 0.7 * (1 - smoothstep(0.71, 0.74, p));
      const step = p > 0.6 ? 0.26 : 0.22;
      steps(from, to, step, (time, i) => {
        const stroke = at(KEHERWA, i);
        const level = 0.15 * drive * (i % 4 === 0 ? 1.2 : 1);
        if (stroke === "D" || stroke === "G") v.drum(time, "bass", level, 1.4);
        if (stroke === "D" || stroke === "N") v.drum(time, "open", level * 0.8, 1.2);
        if (stroke === "T") v.drum(time, "slap", level * 0.7, 1.2);
        if (stroke === "K") v.drum(time, "rim", level * 0.5, 1.2);
        if (i % 2 === 0 && p > 0.34) v.manjira(time, 0.018 * drive, i % 8 === 0);
      });
    }

    // The lane: the dhol's chaal, and hands clapping on the off-beat.
    if (lane) {
      const drive = smoothstep(0.47, 0.5, p) * (1 - smoothstep(0.58, 0.62, p));
      steps(from, to, 0.15, (time, i) => {
        const stroke = at(CHAAL, i);
        const level = 0.18 * drive;
        if (stroke === "B") {
          v.drum(time, "bass", level * (i % 8 === 0 ? 1.2 : 0.9), 0.9);
          v.drum(time, "open", level * 0.35, 0.9);
        }
        if (stroke === "t") v.drum(time, "slap", level * 0.75, 1.5);
        if (i % 8 === 4) v.clap(time, 0.07 * drive, 6);
        if (i % 2 === 0) v.manjira(time, 0.02 * drive, i % 16 === 0);
      });
    }
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const fire = smoothstep(0.085, 0.12, p) * (1 - smoothstep(0.185, 0.235, p));
    const lane = smoothstep(0.46, 0.5, p) * (1 - smoothstep(0.6, 0.66, p));
    const day = smoothstep(0.22, 0.28, p) * (1 - smoothstep(0.8, 0.9, p));
    this.pad.level(0.4 + 0.3 * day - 0.3 * lane + 0.3 * smoothstep(0.86, 0.95, p));
    this.pad.bright(600 + 900 * day + 500 * lane);
    this.roar.level(fire);
    this.crowd.level(0.15 * fire + 0.25 * smoothstep(0.3, 0.4, p) * (1 - lane) * (1 - smoothstep(0.7, 0.8, p)) + lane);
    // The chord moves with the day: Sa Pa, then ga in the lane, then Ma and back to Sa at dusk.
    if (crossed(previous, p, 0.34)) this.pad.chord([n(-12), n(-5), n(3)], 3);
    if (crossed(previous, p, 0.62)) this.pad.chord([n(-7), n(0), n(5)], 3);
    if (crossed(previous, p, 0.76)) this.pad.chord([n(-12), n(-5), n(0)], 4);

    if (crossed(previous, p, MOMENTS.fire[0])) {
      v.swell(now, 0.06, 2.5);
      v.crack(now + 0.4, 0.05);
    }
    if (crossed(previous, p, MOMENTS.prahlad[0])) {
      v.choir(now, [n(-12), n(-5), n(0), n(7)], 8, 0.04);
      v.bell(now + 0.3, 440, 0.08, 6);
    }
    if (crossed(previous, p, MOMENTS.feet[0])) {
      v.choir(now, [n(-12), n(0), n(3)], 6, 0.03);
      v.bell(now + 0.05, 880, 0.05, 3);
    }
    if (crossed(previous, p, MOMENTS.radha[0])) {
      v.choir(now, [n(-12), n(-5), n(3), n(7)], 7, 0.03);
      v.bell(now + 0.1, 660, 0.05, 4);
    }
    if (crossed(previous, p, MOMENTS.holiHai[0])) {
      // "Holi hai!": the crowd shouts, and everyone claps at once.
      v.swell(now, 0.08, 1.4);
      v.choir(now + 1.2, [n(0), n(3), n(7), n(12)], 1.8, 0.05);
      for (let i = 0; i < 4; i++) v.clap(now + 1.3 + i * 0.15, 0.1, 8);
    }
    if (crossed(previous, p, MOMENTS.embrace[0])) v.bell(now, 990, 0.04, 3);
    if (crossed(previous, p, 0.9)) {
      v.choir(now + 0.3, [n(-12), n(-5), n(0), n(3)], 9, 0.035);
      v.bell(now + 0.2, 440, 0.07, 7);
    }
  }

  on(event: string, now: number) {
    const v = this.v;
    if (event === "gulal") {
      // A handful thrown: a soft puff of air.
      v.whoosh(now, 0.35, 0.05, false);
      v.thump(now + 0.02, 0.05, 260, 0.3);
    }
    if (event === "spark") {
      v.crack(now, 0.04);
      v.whoosh(now, 0.6, 0.02);
    }
    if (event === "petals") v.bell(now, n(KAFI[Math.floor(Math.random() * KAFI.length)] + 24), 0.03, 2.5);
  }
}
