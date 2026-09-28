// Chhath's score: folk tunes of the Bhojpuri songs sung at the ghat, in a Khamaj-like mode
// (Sa Re Ga Ma Pa Dha Ni, with a flat Ni coming down):
// - the river all the way through, and a tanpura and a soft pad under everything
// - a bansuri in the morning, at dusk and at dawn
// - the chulha crackling in the courtyard, and the thekua sizzling
// - a dholak in dadra, manjira and the women's voices on the walk to the ghat and through the night
// - the shankh, bells and a choir swell for the arghya at sunset and at sunrise
import { crossed, at, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { smoothstep } from "@/lib/math";
import { MOMENTS } from "./scene";

const SA = 207.65;
const n = (semitones: number) => hz(SA, semitones);

const MODE = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16];
const TANPURA = [-5, 0, 0, -12];

/** Bansuri phrases as [semitones, beats]. */
const PHRASES: [number, number][][] = [
  // Sa Re Ga Ma Ga, Re Sa: the plainest line of a village song.
  [[0, 1], [2, 1], [4, 2], [5, 1], [4, 1], [2, 2], [0, 3]],
  // Ga Pa Dha Pa Ma Ga, Re Ga.
  [[4, 1], [7, 1.5], [9, 1], [7, 1], [5, 1], [4, 2], [2, 1], [4, 3]],
  // Pa Dha ni Dha Pa, Ma Ga Re Sa: coming down through the flat Ni.
  [[7, 1], [9, 1], [10, 1.5], [9, 1], [7, 2], [5, 1], [4, 1], [2, 1], [0, 4]],
  // From low Pa up to Ga and home.
  [[-5, 1], [-3, 1], [0, 2], [2, 1], [4, 2], [2, 1], [0, 4]],
];
const BEAT = 0.6;

/** The song the women sing, one note per beat of the dadra. */
const SONG = [0, 2, 4, 4, 5, 4, 2, 2, 4, 2, 0, 0, 7, 7, 9, 7, 5, 4, 5, 4, 2, 4, 2, 0];

// Dadra, six beats: dha dhi na, dha ti na.
// D = bass and open together, N = open, T = slap, K = rim.
const DADRA = "DKNDTN";

export class ChhathScore implements Score {
  private v!: Voices;
  private pad!: PadHandle;
  private water!: Handle;
  private crowd!: Handle;
  private flutePhrase = 0;
  private fluteFree = 0;

  start(voices: Voices) {
    this.v = voices;
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.05, 700);
    this.water = voices.bed("water", 0.05);
    this.crowd = voices.bed("crowd", 0.018);
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const song = this.singing(p);
    steps(from, to, 1.2, (time, i) => v.tanpura(time, n(TANPURA[i % 4]), 0.04 * (1 - 0.4 * song)));

    // Crickets at night.
    const night = (p > 0.2 && p < 0.33) || (p > 0.6 && p < 0.78);
    if (night && Math.random() < (to - from) * 1.4) v.chirp(from + Math.random() * (to - from), 0.008);

    // The chulha crackling, and oil spitting round the thekua.
    if (p > 0.1 && p < 0.45 && Math.random() < (to - from) * 2.5) v.crack(from + Math.random() * (to - from), 0.006 + Math.random() * 0.01);
    if (p > 0.335 && p < 0.37 && Math.random() < (to - from) * 3) v.whoosh(from + Math.random() * (to - from), 0.5, 0.006, false);

    // The bansuri, where the songs are not.
    const flute = p < 0.2 || (p > 0.34 && p < 0.42) || (p > 0.5 && p < 0.6) || (p > 0.76 && song < 0.1);
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
      this.fluteFree = time + 2.5 + Math.random() * 2;
    }

    // The songs: dholak in dadra, manjira, and the women's voices on the tune.
    if (song > 0.01) {
      steps(from, to, 0.34, (time, i) => {
        const stroke = at(DADRA, i);
        const level = 0.15 * song * (i % 6 === 0 ? 1.2 : 1);
        if (stroke === "D") v.drum(time, "bass", level, 1.3);
        if (stroke === "D" || stroke === "N") v.drum(time, "open", level * 0.7, 1.15);
        if (stroke === "T") v.drum(time, "slap", level * 0.6, 1.2);
        if (stroke === "K") v.drum(time, "rim", level * 0.4, 1.2);
        if (i % 3 === 0) v.manjira(time, 0.018 * song, i % 6 === 0);
        if (i % 3 === 0) {
          const note = SONG[Math.floor(i / 3) % SONG.length];
          v.choir(time, [n(note), n(note - 12)], 1.25, 0.018 * song);
          v.flute(time, n(note + 12), 0.95, 0.03 * song);
        }
      });
    }
  }

  /** How much of the evening's singing is on: the walk to the ghat, and the night at the kosi. */
  private singing(p: number) {
    const walk = smoothstep(0.425, 0.44, p) * (1 - smoothstep(0.48, 0.5, p));
    const kosi = smoothstep(0.615, 0.64, p) * (1 - smoothstep(0.72, 0.745, p));
    return Math.max(walk, kosi);
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const river = 1 - smoothstep(0.08, 0.12, p) * (1 - smoothstep(0.44, 0.48, p));
    this.water.level(0.35 + 0.65 * river);
    const ghat = smoothstep(0.46, 0.5, p) * (1 - smoothstep(0.58, 0.62, p)) + smoothstep(0.76, 0.8, p) * (1 - smoothstep(0.9, 0.96, p));
    this.crowd.level(ghat);
    const warm = smoothstep(0.47, 0.52, p) + smoothstep(0.78, 0.84, p);
    this.pad.level(0.45 + 0.25 * Math.min(1, warm) + 0.2 * this.singing(p));
    this.pad.bright(600 + 900 * Math.min(1, warm));
    // The chord moves with the day: Sa Pa, then Ma Sa at night, and Ga Pa for the sun.
    if (crossed(previous, p, MOMENTS.kharna[0])) this.pad.chord([n(-7), n(0), n(5)], 3);
    if (crossed(previous, p, MOMENTS.thekua[0])) this.pad.chord([n(-12), n(-5), n(0)], 3);
    if (crossed(previous, p, MOMENTS.dusk[0])) this.pad.chord([n(-12), n(-5), n(4)], 3);
    if (crossed(previous, p, MOMENTS.kosi[0])) this.pad.chord([n(-7), n(0), n(5)], 3);
    if (crossed(previous, p, MOMENTS.dawn[0])) this.pad.chord([n(-12), n(-5), n(0)], 4);
    if (crossed(previous, p, MOMENTS.sunrise)) this.pad.chord([n(-12), n(-5), n(4)], 4);

    if (crossed(previous, p, MOMENTS.nahay)) {
      v.bell(now + 0.05, n(24), 0.05, 4);
      v.choir(now + 0.1, [n(-12), n(0)], 6, 0.018);
    }
    if (crossed(previous, p, MOMENTS.kharna[1])) v.bell(now + 0.05, n(12), 0.07, 5);
    if (crossed(previous, p, MOMENTS.soop[1])) v.bell(now, n(24), 0.04, 3);
    if (crossed(previous, p, MOMENTS.arghya)) this.arghya(now);
    if (crossed(previous, p, MOMENTS.kosi[0])) {
      v.bell(now + 0.1, n(12), 0.06, 5);
      v.choir(now, [n(-12), n(-5), n(0)], 7, 0.025);
    }
    if (crossed(previous, p, MOMENTS.sunrise)) this.arghya(now);
    if (crossed(previous, p, 0.9)) v.choir(now, [n(-12), n(-5), n(0), n(4)], 9, 0.03);
  }

  /** The arghya: a swell, the shankh blown, the bells and the voices. */
  private arghya(now: number) {
    const v = this.v;
    v.swell(now, 0.06, 2.5);
    this.shankh(now + 1.2, 0.05);
    this.shankh(now + 4.4, 0.04);
    v.choir(now + 1.5, [n(-12), n(-5), n(0), n(4)], 9, 0.035);
    for (let i = 0; i < 14; i++) v.bell(now + 1.6 + i * 0.21, i % 2 ? n(31) : n(33), 0.01, 0.6);
    v.bell(now + 1.6, n(12), 0.08, 6);
  }

  /** A conch: a buzzing horn tone that bends up into its note and holds. */
  private shankh(time: number, level: number) {
    const { ctx, bus } = this.v;
    const freq = n(7);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.35);
    gain.gain.setValueAtTime(level, time + 2.2);
    gain.gain.linearRampToValueAtTime(0, time + 3);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq * 3;
    filter.Q.value = 1.2;
    filter.connect(gain).connect(bus);
    [1, 2, 3].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq * mult * 0.94, time);
      osc.frequency.exponentialRampToValueAtTime(freq * mult, time + 0.4);
      osc.frequency.setValueAtTime(freq * mult, time + 2.3);
      osc.frequency.exponentialRampToValueAtTime(freq * mult * 0.97, time + 3);
      const g = ctx.createGain();
      g.gain.value = [1, 0.4, 0.2][i];
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(time + 3.1);
    });
  }

  /** A drop into still water: a quick upward blip. */
  private drop(time: number, level: number) {
    const { ctx, bus } = this.v;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(500 + Math.random() * 300, time);
    osc.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 400, time + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(gain).connect(bus);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  on(event: string, now: number) {
    const v = this.v;
    const note = () => n(MODE[Math.floor(Math.random() * MODE.length)] + 24);
    if (event === "ripple") this.drop(now, 0.03);
    if (event === "arghya") {
      this.drop(now, 0.035);
      v.bell(now + 0.02, note(), 0.035, 3);
    }
    if (event === "float") {
      this.drop(now, 0.025);
      v.bell(now + 0.05, note(), 0.04, 2.5);
    }
  }
}
