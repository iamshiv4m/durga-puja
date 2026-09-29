// Janmashtami's score. One bansuri motif runs through the night and the morning after: in Raga
// Malkauns (Sa, komal Ga, Ma, komal Dha, komal Ni), the raga of the deep night, while he is born and
// carried across the river, and in Pahadi, the folk raga of the hills and of Braj, once it is day.
// - the storm: rain, wind, thunder rolling in, a tanpura tuned to Ma and a dark drone
// - the prison: the motif alone, slow, over the rain
// - midnight: a hush, then the ghanta, the shankh, the jhanjh and the voices, all at once
// - the Yamuna: the pakhawaj in chautaal, rolling harder as the river rises, silent as it touches his
//   feet, and a swell as it falls back
// - Gokul at dawn: a kirtan, dholak in keherwa, manjira and clapping, the village singing
// - Vrindavan at midnight: temple bells, the conch at the curtain, then the aarti
// - Dahi Handi: a dhol-tasha pathak and a banjo party, faster tier by tier, "Govinda ala re!", and a
//   crash as the pot breaks
// - the close: the bansuri alone by the river, in Pahadi, with the cows' bells
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { MOMENTS, cut, storm } from "./world";

const SA = 174.61;
const n = (semitones: number) => hz(SA, semitones);

/** The five notes of each raga the motif is played in. */
const MALKAUNS = [0, 3, 5, 8, 10];
const PAHADI = [0, 2, 4, 7, 9];
/** Semitones of a scale degree in a five-note raga, across octaves. */
const degree = (raga: number[], d: number) =>
  raga[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5);

/** The bansuri's phrases as [scale degree, beats]; the first is the motif that comes back. */
const MOTIF: [number, number][] = [
  [-1, 0.5],
  [0, 1],
  [2, 1],
  [3, 1.5],
  [4, 0.5],
  [3, 1],
  [2, 1],
  [1, 1],
  [2, 3],
];
const PHRASES: [number, number][][] = [
  MOTIF,
  // Down from the upper Sa and home.
  [
    [5, 1.5],
    [4, 0.5],
    [3, 1],
    [2, 1],
    [3, 0.5],
    [2, 0.5],
    [1, 1],
    [0, 3],
  ],
  MOTIF,
  // A run up to the upper Sa, and back to the motif's resting note.
  [
    [0, 0.5],
    [1, 0.5],
    [2, 0.5],
    [3, 0.5],
    [4, 1],
    [5, 2],
    [4, 0.5],
    [3, 0.5],
    [4, 1],
    [3, 1],
    [2, 3],
  ],
];

// Chautaal on the pakhawaj, twelve matras: dha dha | din ta | kita dha | din ta | tita kata | gadi gana.
// D = both heads, N = the open treble, T = a slap, K = kita (two quick slaps), R = tita kata, G = gadi gana.
const CHAUTAAL = "DDNTKDNTRRGG";
// Keherwa on the dholak, eight matras: dha ge na ti | na ka dhi na.
const KEHERWA = "DgNtNkDN";
// The dhol-tasha pathak: B = the deep head, o = the treble, x = both.
const DHOL = "B..B..B.x.oB.oB.";
const TASHA = "T.tTt.tTT.tTt.tt";
const JHANJ = "X...x...x...x.x.";

/** The kirtan in Gokul, one note to a beat (-99 is a breath): "nand ke anand bhayo, jai kanhaiya lal ki". */
const KIRTAN = [
  4, 4, 7, 7, 9, 7, 4, -99, 4, 4, 2, 4, 2, 0, 0, -99, 7, 7, 9, 12, 9, 7, 9, -99,
  7, 4, 2, 4, 0, 0, 0, -99,
];
/** The aarti in Vrindavan, in Malkauns. */
const AARTI = [
  0, 3, 5, 5, 8, 5, 3, 5, 8, 10, 12, 10, 8, 5, 3, -99, 3, 5, 8, 10, 8, 5, 3, 0,
  -2, 0, 3, 5, 3, 0, 0, -99,
];
/** The banjo party's tune, one note to a dhol step (-99 lets the last note ring). */
const BANJO = [
  7, -99, 7, 9, 7, 4, 2, 4, 7, -99, 7, 9, 12, 9, 7, -99, 9, -99, 9, 12, 9, 7, 4,
  7, 4, 2, 0, 2, 4, -99, -99, -99,
];

export class JanmashtamiScore implements Score {
  private v!: Voices;
  private pad!: PadHandle;
  private rain!: Handle;
  private wind!: Handle;
  private water!: Handle;
  private crowd!: Handle;
  private phrase = 0;
  private fluteFree = 0;
  private lastThunder = 0;
  private smashedAt = -99;

  start(voices: Voices) {
    this.v = voices;
    this.pad = voices.pad([n(-12), n(-7), n(0)], 0.05, 600);
    this.rain = this.rainBed();
    this.wind = voices.bed("wind", 0.05);
    this.water = voices.bed("water", 0.06);
    this.crowd = voices.bed("crowd", 0.03);
  }

  // ─── Where the music is ──────────────────────────────────────────────────

  /** Night (Malkauns) or day (Pahadi). */
  private raga(p: number) {
    const night =
      p < 0.435 || (p > cut(MOMENTS.flight1) && p < cut(MOMENTS.flight2));
    return night ? MALKAUNS : PAHADI;
  }

  /** The pakhawaj on the river: waking as he steps in, harder as it rises, silent at the touch. */
  private pakhawaj(p: number) {
    const wade =
      smoothstep(0.282, 0.3, p) *
      (0.45 + 0.55 * smoothstep(0.33, MOMENTS.touch - 0.004, p));
    const hush =
      1 -
      smoothstep(MOMENTS.touch - 0.003, MOMENTS.touch, p) *
        (1 -
          smoothstep(MOMENTS.part[1] - 0.004, MOMENTS.part[1] + 0.004, p) *
            0.6);
    return wade * hush * (1 - smoothstep(0.41, 0.428, p));
  }

  private kirtan(p: number) {
    return smoothstep(0.455, 0.47, p) * (1 - smoothstep(0.528, 0.542, p));
  }

  private aarti(p: number) {
    return (
      smoothstep(MOMENTS.midnight + 0.004, MOMENTS.midnight + 0.012, p) *
      (1 - smoothstep(0.648, 0.662, p))
    );
  }

  /** The pathak in the street: how loud, and how fast as the pyramid climbs. */
  private pathak(p: number) {
    const build = smoothstep(MOMENTS.pyramid[0], MOMENTS.climb[1], p);
    const level =
      smoothstep(0.678, 0.7, p) *
      (0.55 + 0.45 * build) *
      (1 - smoothstep(0.815, 0.835, p));
    return { level, build, step: 0.15 - 0.03 * build };
  }

  // ─── Scheduling ──────────────────────────────────────────────────────────

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const raga = this.raga(p);
    const loud = Math.max(
      this.pathak(p).level,
      this.pakhawaj(p) * 0.6,
      this.kirtan(p) * 0.4,
    );
    const hush =
      smoothstep(MOMENTS.hush[0], MOMENTS.hush[1] - 0.004, p) *
      (1 - smoothstep(MOMENTS.birth, MOMENTS.birth + 0.002, p));
    // The tanpura: tuned to Ma for Malkauns, which has no Pa, and to Pa by day.
    const strings = raga === MALKAUNS ? [-7, 0, 0, -12] : [-5, 0, 0, -12];
    steps(from, to, 1.25, (time, i) =>
      v.tanpura(
        time,
        n(strings[i % 4]),
        0.042 * (1 - 0.7 * Math.min(1, loud * 1.3)) * (1 - 0.6 * hush),
      ),
    );

    this.bansuri(from, to, p, raga);
    this.river(from, to, p);
    this.gokul(from, to, p);
    this.temple(from, to, p);
    this.street(from, to, p);

    // Crickets under the rain before midnight; birds and the cows' bells in the mornings.
    if (p > 0.08 && p < 0.19 && Math.random() < (to - from) * 0.8)
      v.chirp(from + Math.random() * (to - from), 0.006);
    const morning = (p > 0.44 && p < 0.53) || p > cut(MOMENTS.flight3);
    if (morning && Math.random() < (to - from) * 0.5)
      this.bird(from + Math.random() * (to - from), 0.012);
    if (morning && Math.random() < (to - from) * 0.35)
      this.cowBell(from + Math.random() * (to - from));
  }

  /** The motif and its answers, wherever the drums and voices are not. */
  private bansuri(from: number, to: number, p: number, raga: number[]) {
    const v = this.v;
    const prison = p > 0.03 && p < MOMENTS.hush[0];
    const glow = p > MOMENTS.birth + 0.012 && p < 0.285;
    const dawn = p > MOMENTS.door - 0.004 && p < 0.458;
    const temple = p > cut(MOMENTS.flight1) && p < MOMENTS.curtain[0];
    const close = p > MOMENTS.flight3[1] - 0.02;
    if (!(prison || glow || dawn || temple || close) || from < this.fluteFree)
      return;
    const phrase = PHRASES[this.phrase++ % PHRASES.length];
    // Slow and grave in the prison, tender after the birth, and slowest of all at the close.
    const beat = prison ? 0.62 : close ? 0.68 : dawn ? 0.44 : 0.55;
    const level = close ? 0.06 : prison ? 0.045 : 0.05;
    let time = from + 0.05;
    let last: number | undefined;
    for (const [d, beats] of phrase) {
      const freq = n(degree(raga, d) + 12);
      v.flute(time, freq, beats * beat, level, last);
      last = freq;
      time += beats * beat;
    }
    this.fluteFree =
      time + (close ? 1.8 : dawn ? 0.6 : 2.2) + Math.random() * 1.5;
  }

  /** The pakhawaj in chautaal as he wades the Yamuna, rolling as it rises. */
  private river(from: number, to: number, p: number) {
    const v = this.v;
    const level = this.pakhawaj(p);
    if (level < 0.01) return;
    const surge =
      smoothstep(MOMENTS.surge[0], MOMENTS.touch - 0.004, p) *
      (1 - smoothstep(MOMENTS.touch - 0.002, MOMENTS.touch, p));
    const step = 0.3 - 0.07 * surge;
    steps(from, to, step, (time, i) => {
      const s = at(CHAUTAAL, i);
      const lvl = 0.16 * level * (i % 12 === 0 ? 1.25 : 1);
      if (s === "D" || s === "G") v.drum(time, "bass", lvl, 0.72);
      if (s === "D" || s === "N") v.drum(time, "open", lvl * 0.75, 0.82);
      if (s === "T") v.drum(time, "slap", lvl * 0.6, 1.3);
      if (s === "K" || s === "G") {
        v.drum(time + step * 0.5, "slap", lvl * 0.45, 1.4);
        v.drum(time + step * 0.75, "rim", lvl * 0.35, 1.4);
      }
      if (s === "R")
        [0, 0.25, 0.5, 0.75].forEach((o, k) =>
          v.drum(time + step * o, k % 2 ? "rim" : "slap", lvl * 0.35, 1.5),
        );
      // As the flood rises the rolls fill every beat: tirakita, tirakita.
      if (surge > 0.2 && s !== "R")
        [0.25, 0.5, 0.75].forEach((o) =>
          v.drum(time + step * o, "rim", lvl * 0.3 * surge, 1.5),
        );
    });
  }

  /** The kirtan in Nand's lane: dholak in keherwa, manjira, clapping and voices. */
  private gokul(from: number, to: number, p: number) {
    const v = this.v;
    const level = this.kirtan(p);
    if (level < 0.01) return;
    const matra = 0.21;
    steps(from, to, matra, (time, i) => {
      const s = at(KEHERWA, i);
      const lvl = 0.13 * level * (i % 8 === 0 ? 1.25 : 1);
      if (s === "D" || s === "g") v.drum(time, "bass", lvl, 1.25);
      if (s === "D" || s === "N") v.drum(time, "open", lvl * 0.7, 1.2);
      if (s === "t") v.drum(time, "slap", lvl * 0.55, 1.25);
      if (s === "k") v.drum(time, "rim", lvl * 0.4, 1.25);
      v.manjira(time, 0.016 * level, i % 2 === 0);
      if (i % 4 === 0) v.clap(time, 0.05 * level, 6);
      if (i % 2 === 0) {
        const note = KIRTAN[(i / 2) % KIRTAN.length];
        if (note > -99) {
          v.choir(time, [n(note), n(note - 12)], matra * 1.9, 0.02 * level);
          v.flute(time, n(note + 12), matra * 1.7, 0.022 * level);
        }
      }
    });
  }

  /** Vrindavan: bells before midnight, then the aarti. */
  private temple(from: number, to: number, p: number) {
    const v = this.v;
    const inside = p > cut(MOMENTS.flight1) && p < 0.66;
    if (inside && p < MOMENTS.curtain[0])
      steps(from, to, 3.7, (time) => v.bell(time, n(12), 0.03, 5));
    const level = this.aarti(p);
    if (level < 0.01) return;
    const matra = 0.26;
    steps(from, to, matra, (time, i) => {
      const s = at(KEHERWA, i);
      const lvl = 0.1 * level;
      if (s === "D" || s === "g") v.drum(time, "bass", lvl, 0.8);
      if (s === "D" || s === "N") v.drum(time, "open", lvl * 0.7, 0.85);
      if (s === "t" || s === "k") v.drum(time, "slap", lvl * 0.4, 1.3);
      if (i % 2 === 0) v.clap(time, 0.05 * level, 8);
      v.manjira(time + matra / 2, 0.012 * level);
      if (i % 4 === 0) v.manjira(time, 0.025 * level, true);
      if (i % 8 === 0) v.bell(time, n(0), 0.05 * level, 5);
      if (i % 2 === 0) {
        const note = AARTI[(i / 2) % AARTI.length];
        if (note > -99)
          v.choir(time, [n(note), n(note - 12)], matra * 1.9, 0.024 * level);
      }
    });
    // The small hand bell, rung fast all through the aarti.
    steps(from, to, 0.12, (time, i) =>
      v.bell(time, i % 2 ? n(36) : n(38), 0.008 * level, 0.5),
    );
  }

  /** Dahi Handi: the dhol-tasha pathak and the banjo party, building to the pot. */
  private street(from: number, to: number, p: number) {
    const v = this.v;
    const { level, build, step } = this.pathak(p);
    if (level < 0.01) return;
    const after = p > MOMENTS.smash - 0.002;
    steps(from, to, step, (time, i) => {
      const lvl = 0.17 * level;
      const d = at(DHOL, i);
      if (d === "B" || d === "x")
        v.drum(time, "bass", lvl * (i % 16 === 0 ? 1.25 : 1), 0.8);
      if (d === "o" || d === "x") v.drum(time, "open", lvl * 0.7, 0.9);
      const t = at(TASHA, i);
      // The tashas join as the pyramid rises, and roll through everything at the climb and after.
      if (t !== "." && build > 0.15)
        v.drum(time, "slap", lvl * (t === "T" ? 0.5 : 0.3), 2.2);
      if ((build > 0.85 || after) && i % 2 === 1)
        v.drum(time + step / 2, "rim", lvl * 0.3, 2.4);
      const j = at(JHANJ, i);
      if (j !== ".") v.manjira(time, 0.024 * level, j === "X");
      // The banjo party's tune, over the drums.
      const note = BANJO[i % BANJO.length];
      if (note > -99)
        this.banjo(time, n(note + 12), 0.035 * level * (0.6 + 0.4 * build));
      // "Govinda... ala re!" between phrases.
      if (i % 32 === 28) this.shout(time, step, 0.7 * level);
    });
  }

  // ─── Every frame ─────────────────────────────────────────────────────────

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const rain = storm(p);
    const hush =
      smoothstep(MOMENTS.hush[0], MOMENTS.hush[1] - 0.004, p) *
      (1 - smoothstep(MOMENTS.birth, MOMENTS.birth + 0.003, p));
    this.rain.level(rain * (1 - 0.8 * hush), 0.6);
    this.wind.level(
      (0.25 + 0.75 * rain) * smoothstep(0.0, 0.02, p) * (p < 0.43 ? 1 : 0) +
        this.flight(p) * 0.8 +
        0.25 * smoothstep(0.87, 0.95, p),
    );
    const river =
      smoothstep(0.26, 0.29, p) *
      (1 - smoothstep(0.42, 0.45, p)) *
      (1 +
        smoothstep(MOMENTS.surge[0], MOMENTS.touch, p) *
          (1 - smoothstep(MOMENTS.touch, MOMENTS.part[1], p)));
    this.water.level(river * 0.9 + 0.5 * smoothstep(0.86, 0.9, p));
    const crowd =
      0.45 * smoothstep(0.455, 0.47, p) * (1 - smoothstep(0.53, 0.545, p)) +
      0.4 * smoothstep(0.582, 0.595, p) * (1 - smoothstep(0.65, 0.662, p)) +
      smoothstep(0.678, 0.7, p) * (1 - smoothstep(0.815, 0.835, p));
    this.crowd.level(crowd);

    const glow =
      smoothstep(MOMENTS.birth, MOMENTS.birth + 0.01, p) *
      (1 - smoothstep(0.27, 0.3, p));
    const day =
      smoothstep(0.44, 0.48, p) * (1 - smoothstep(0.54, 0.56, p)) +
      smoothstep(0.86, 0.92, p);
    this.pad.level(
      (0.35 + 0.5 * glow + 0.25 * this.aarti(p) + 0.2 * day) *
        (1 - 0.85 * hush) *
        (1 - 0.6 * this.pathak(p).level),
      hush > 0.5 ? 0.4 : 1.5,
    );
    this.pad.bright(500 + 1600 * glow + 700 * this.aarti(p) + 500 * day);

    // The chord moves with the night: Sa Ma Sa in the storm, Sa komal Ga komal Dha at his birth, a
    // day chord in Gokul, Malkauns again at midnight in Vrindavan, and Sa Pa Ga for the last dawn.
    if (crossed(previous, p, 0.01)) this.pad.chord([n(-12), n(-7), n(0)], 3);
    if (crossed(previous, p, MOMENTS.birth))
      this.pad.chord([n(-12), n(3), n(8)], 0.6);
    if (crossed(previous, p, 0.285)) this.pad.chord([n(-12), n(-7), n(3)], 3);
    if (crossed(previous, p, MOMENTS.door))
      this.pad.chord([n(-12), n(-5), n(4)], 4);
    if (crossed(previous, p, cut(MOMENTS.flight1)))
      this.pad.chord([n(-12), n(-7), n(3)], 3);
    if (crossed(previous, p, cut(MOMENTS.flight2)))
      this.pad.chord([n(-12), n(-5), n(0)], 3);
    if (crossed(previous, p, cut(MOMENTS.flight3)))
      this.pad.chord([n(-12), n(-5), n(4)], 4);

    if (crossed(previous, p, MOMENTS.hush[0]))
      v.flute(now + 0.2, n(12), 5, 0.035, n(10));
    if (crossed(previous, p, MOMENTS.birth)) this.birth(now);
    if (crossed(previous, p, MOMENTS.chains)) this.chains(now);
    if (crossed(previous, p, MOMENTS.doors[0])) this.creak(now);
    if (crossed(previous, p, MOMENTS.lift[1]))
      v.choir(now, [n(-12), n(3), n(8)], 6, 0.02);
    if (crossed(previous, p, MOMENTS.shesh[0])) {
      v.choir(now, [n(-24), n(-12), n(-7)], 8, 0.035);
      v.bell(now + 0.3, n(0), 0.05, 6);
    }
    if (crossed(previous, p, MOMENTS.touch)) {
      v.bell(now, n(24), 0.07, 6);
      v.bell(now + 0.02, n(29), 0.035, 5);
      v.choir(now + 0.1, [n(-12), n(0), n(3), n(8)], 7, 0.04);
    }
    if (crossed(previous, p, MOMENTS.part[0])) {
      v.whoosh(now, 2.2, 0.05, false);
      v.swell(now + 0.3, 0.06, 2);
    }
    if (crossed(previous, p, MOMENTS.door)) {
      v.bell(now + 0.1, n(24), 0.03, 4);
      v.choir(now + 0.2, [n(-12), n(-5), n(4)], 6, 0.02);
    }
    if (crossed(previous, p, MOMENTS.nandotsav[0])) {
      v.clap(now, 0.08, 10);
      this.shankh(now + 0.2, 0.035, n(7));
    }
    for (const w of [MOMENTS.flight1, MOMENTS.flight2, MOMENTS.flight3])
      if (crossed(previous, p, w[0] + 0.004)) v.whoosh(now, 2.5, 0.03, true);
    if (crossed(previous, p, MOMENTS.curtain[0])) this.midnight(now);
    if (crossed(previous, p, MOMENTS.flight2[1] - 0.004))
      v.swell(now, 0.05, 1.5);
    if (crossed(previous, p, MOMENTS.climb[0])) {
      v.swell(now, 0.06, 1.6);
      this.shout(now + 0.2, 0.15, 1);
    }
    if (crossed(previous, p, 0.95)) {
      v.choir(now, [n(-12), n(-5), n(0), n(4)], 10, 0.03);
      v.bell(now + 0.4, n(12), 0.04, 7);
    }
  }

  /** How far up in the cloud the camera is, between places. */
  private flight(p: number) {
    return Math.max(
      ...[MOMENTS.flight1, MOMENTS.flight2, MOMENTS.flight3].map(([a, b]) =>
        p > a && p < b ? Math.sin(((p - a) / (b - a)) * Math.PI) : 0,
      ),
    );
  }

  // ─── The big moments ─────────────────────────────────────────────────────

  /** Midnight: the ghanta, the shankh, the jhanjh rolled faster and faster, and every voice. */
  private birth(now: number) {
    const v = this.v;
    v.bell(now, n(-12), 0.14, 9);
    v.bell(now + 0.01, n(0), 0.08, 7);
    v.swell(now, 0.05, 0.6);
    this.shankh(now + 0.5, 0.055, n(7));
    this.shankh(now + 3.8, 0.045, n(12));
    for (let i = 0; i < 26; i++) {
      const t = now + 0.3 + 3 * (1 - Math.pow(1 - i / 26, 1.6));
      v.manjira(t, 0.012 + 0.03 * (i / 26), i % 4 === 0);
    }
    v.choir(now + 0.4, [n(-12), n(0), n(3), n(8)], 11, 0.05);
    v.choir(now + 2.5, [n(12), n(15)], 8, 0.02);
    for (let i = 0; i < 16; i++)
      v.bell(now + 1.5 + i * 0.18, n(24 + MALKAUNS[i % 5]), 0.012, 1.4);
    v.bell(now + 3.4, n(12), 0.08, 7);
  }

  /** The chains falling open: iron clanking and a rattle on the stone. */
  private chains(now: number) {
    const v = this.v;
    for (let i = 0; i < 7; i++) {
      const t = now + i * 0.07 + Math.random() * 0.03;
      v.bell(t, 520 + Math.random() * 300, 0.02, 0.35);
      v.manjira(t, 0.012);
    }
    v.drum(now + 0.5, "rim", 0.05, 0.6);
  }

  /** The prison doors swinging open by themselves: a long, low creak of iron hinges. */
  private creak(now: number) {
    const { ctx, bus } = this.v;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(52, now);
    osc.frequency.linearRampToValueAtTime(38, now + 2.4);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900;
    band.Q.value = 4;
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 7;
    const depth = ctx.createGain();
    depth.gain.value = 6;
    wobble.connect(depth).connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.4);
    gain.gain.linearRampToValueAtTime(0, now + 2.6);
    osc.connect(band).connect(gain).connect(bus);
    osc.start(now);
    wobble.start(now);
    osc.stop(now + 2.7);
    wobble.stop(now + 2.7);
  }

  /** Midnight in Vrindavan: a swell as the curtain is drawn, the conch three times, the big bell. */
  private midnight(now: number) {
    const v = this.v;
    v.swell(now, 0.05, 1.2);
    this.shankh(now + 1, 0.05, n(7));
    this.shankh(now + 4, 0.045, n(7));
    this.shankh(now + 7, 0.05, n(12));
    v.bell(now + 1.2, n(-12), 0.12, 8);
    v.choir(now + 1.3, [n(-12), n(-7), n(0), n(3)], 9, 0.04);
    for (let i = 0; i < 20; i++)
      v.manjira(now + 1.2 + i * 0.12, 0.02, i % 4 === 0);
  }

  // ─── The reader's touches ────────────────────────────────────────────────

  on(event: string, now: number) {
    const v = this.v;
    if (
      event === "thunder" ||
      event === "thunder-near" ||
      event === "lightning"
    ) {
      if (now - this.lastThunder < 0.25) return;
      this.lastThunder = now;
      this.thunder(
        now + (event === "thunder" ? 0.4 + Math.random() * 0.8 : 0.02),
        event !== "thunder",
      );
    }
    if (event === "swing-bell" || event === "swing-bells") {
      const bells = event === "swing-bells" ? 3 : 1;
      for (let i = 0; i < bells; i++)
        v.bell(
          now + i * 0.09,
          n(24 + MALKAUNS[Math.floor(Math.random() * 5)]),
          0.03,
          2.5,
        );
    }
    if (event === "push") {
      v.whoosh(now, 0.6, 0.015, false);
      v.bell(now + 0.05, n(24), 0.035, 3);
    }
    if (event === "govinda" || event === "add") {
      v.drum(now, "bass", 0.16, 0.8);
      v.drum(now + 0.06, "slap", 0.08, 2.2);
      v.clap(now + 0.02, 0.07, 8);
      if (event === "govinda") this.shout(now + 0.05, 0.14, 0.8);
    }
    if (event === "climb") v.whoosh(now, 1.2, 0.03, true);
    if (event === "smash" && now - this.smashedAt > 2) {
      this.smashedAt = now;
      this.crash(now);
    }
  }

  /** The handi breaking: a crack of clay, the jhanj, the crowd's roar and a flourish on the drums. */
  private crash(now: number) {
    const v = this.v;
    v.crack(now, 0.2);
    v.thump(now + 0.01, 0.12, 700, 0.25);
    v.drum(now, "bass", 0.22, 0.7);
    for (let i = 0; i < 6; i++) v.manjira(now + i * 0.05, 0.04, true);
    v.whoosh(now, 1.5, 0.05, false);
    v.swell(now + 0.05, 0.05, 0.8);
    v.clap(now + 0.1, 0.14, 16);
    v.clap(now + 0.35, 0.1, 16);
    this.shout(now + 0.3, 0.16, 1.2);
    for (let i = 0; i < 12; i++)
      v.drum(
        now + 0.5 + i * 0.07,
        i % 3 ? "slap" : "bass",
        0.1,
        i % 3 ? 2.2 : 0.8,
      );
  }

  // ─── Instruments of this festival ────────────────────────────────────────

  /** Rain on the roofs and the river: bright noise, continuous. */
  private rainBed(): Handle {
    const { ctx, bus } = this.v;
    const src = this.v.noiseSource(ctx.currentTime, 60 * 60 * 6);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1400;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7000;
    const out = ctx.createGain();
    out.gain.value = 0;
    src.connect(hp).connect(lp).connect(out).connect(bus);
    return {
      level(value, glide = 1) {
        out.gain.setTargetAtTime(value * 0.035, ctx.currentTime, glide);
      },
      stop() {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        src.stop(ctx.currentTime + 2);
      },
    };
  }

  /** Thunder: near, a crack and a heavy fall; far, only the roll. */
  private thunder(time: number, near: boolean) {
    const { ctx, bus } = this.v;
    if (near) {
      this.v.thump(time, 0.1, 2400, 0.09);
      this.v.thump(time + 0.02, 0.2, 90, 0.7);
    }
    for (let k = 0; k < 3; k++) {
      const t = time + k * (0.25 + Math.random() * 0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(near ? 420 : 240, t);
      lp.frequency.exponentialRampToValueAtTime(90, t + 3);
      const gain = ctx.createGain();
      const level = (near ? 0.28 : 0.14) / (1 + k * 0.6);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + (near ? 0.05 : 0.35));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      this.v.noiseSource(t, 3.6).connect(lp).connect(gain).connect(bus);
    }
  }

  /** A conch: a buzzing horn tone that bends up into its note and holds. */
  private shankh(time: number, level: number, freq: number) {
    const { ctx, bus } = this.v;
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

  /** The Indian banjo of a wedding band (a keyed bulbul tarang): a bright, twanging pluck. */
  private banjo(time: number, freq: number, level: number) {
    const { ctx, bus } = this.v;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(freq * 6, time);
    band.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.3);
    band.Q.value = 2.5;
    const gain = this.v.envelope(time, 0.002, 0.32, level);
    band.connect(gain).connect(bus);
    [1, 1.006, 2.003].forEach((ratio) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq * ratio;
      osc.connect(band);
      osc.start(time);
      osc.stop(time + 0.4);
    });
  }

  /** The crowd shouting "Go-vin-da... a-la re!" on the pathak's rhythm. */
  private shout(time: number, step: number, level: number) {
    const v = this.v;
    const words: [number, number, number][] = [
      [0, 7, 1],
      [1, 9, 1],
      [2, 7, 2],
      [5, 12, 1.2],
      [6, 9, 1],
      [7, 7, 2.5],
    ];
    for (const [beat, note, length] of words)
      v.choir(
        time + beat * step,
        [n(note), n(note - 12)],
        step * length * 1.2,
        0.04 * level,
      );
    v.clap(time + 7 * step, 0.08 * level, 10);
  }

  /** A bird at first light: two or three quick rising whistles. */
  private bird(time: number, level: number) {
    const { ctx, bus } = this.v;
    const calls = 2 + Math.floor(Math.random() * 3);
    const base = 2400 + Math.random() * 1200;
    for (let i = 0; i < calls; i++) {
      const t = time + i * 0.11;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.07);
      const gain = this.v.envelope(t, 0.005, 0.08, level);
      osc.connect(gain).connect(bus);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  /** A cow's bell as she grazes: a soft, dull clank. */
  private cowBell(time: number) {
    const f = 620 + Math.random() * 80;
    this.v.bell(time, f, 0.012, 0.6);
    this.v.bell(time + 0.18, f * 1.02, 0.008, 0.5);
  }
}
