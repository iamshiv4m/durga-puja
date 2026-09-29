// Bihu's score, in the pentatonic mode of the bihugeet (Sa Re Ga Pa Dha), every tune our own:
// - Chot: wind, the koel and the bulbul, a baanhi (bamboo flute) melody, and far off at the
//   namghar the young trying out a dhol and a pepa
// - a short night of crickets, the namghar's evening taal and bell
// - Goru Bihu: the pond, cow bells, a cow lowing, the boys' toka, the flute again at dawn
// - Manuh Bihu: the loom knocking, a morning tune, a bell and voices as the gamosa is given
// - Husori: the dhol at a walk, taal and toka, clapping, the men singing and shouting "hoi!"
// - Bihu naach: two dhols at a gallop, the pepa soaring over them, gogona, toka, taal; faster at
//   the climax
// - Mukoli Bihu: crickets, a soft gogona, the dhol far off across the fields, and the flute
import { lerp, smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { Band, type Stroke } from "./band";
import { HUSORI_BEAT, MOMENTS, NAACH_BEAT } from "./layout";

const SA = 293.66;
const n = (semitones: number) => hz(SA, semitones);
const rise = (p: number, a: number, b: number) => smoothstep(a, b, p);

// The mode, in semitones from Sa, over three octaves.
const MODE = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

type Note = [number, number];
/** A pepa note: semitones, beats, a grace note to flick in from, and whether to shake it. */
type Call = [number, number, number?, boolean?];

/** Baanhi tunes for the spring and the morning, as [semitones, beats]. */
const SPRING: Note[][] = [
  [
    [7, 1],
    [9, 0.5],
    [12, 1.5],
    [9, 0.5],
    [7, 0.5],
    [4, 2],
  ],
  [
    [4, 0.5],
    [7, 0.5],
    [9, 1],
    [7, 0.5],
    [4, 0.5],
    [2, 1],
    [0, 2],
  ],
  [
    [12, 1.5],
    [14, 0.5],
    [12, 0.5],
    [9, 0.5],
    [7, 1],
    [9, 0.5],
    [7, 0.5],
    [4, 2],
  ],
  [
    [2, 0.5],
    [4, 0.5],
    [7, 1],
    [4, 0.5],
    [2, 0.5],
    [0, 1],
    [-3, 0.5],
    [0, 2.5],
  ],
];

/** Slow phrases for the night. */
const NIGHT: Note[][] = [
  [
    [0, 2],
    [2, 1],
    [4, 3],
    [2, 1],
    [0, 3],
  ],
  [
    [7, 2],
    [9, 1],
    [7, 1],
    [4, 2],
    [2, 1],
    [4, 3],
  ],
  [
    [-3, 1],
    [0, 1],
    [2, 2],
    [4, 1],
    [2, 1],
    [0, 4],
  ],
];

/** The husori's song, line and answer, sung by the men in unison. */
const SONG: Note[][] = [
  [
    [7, 1],
    [7, 0.5],
    [9, 0.5],
    [12, 1],
    [9, 1],
    [7, 1],
    [4, 1],
    [7, 2],
  ],
  [
    [4, 1],
    [7, 0.5],
    [4, 0.5],
    [2, 1],
    [0, 1],
    [2, 1],
    [4, 1],
    [0, 2],
  ],
  [
    [9, 1],
    [12, 1],
    [14, 1],
    [12, 0.5],
    [9, 0.5],
    [7, 2],
    [9, 1],
    [7, 1],
  ],
  [
    [4, 0.5],
    [2, 0.5],
    [0, 1],
    [2, 1],
    [4, 1],
    [7, 1],
    [4, 1],
    [0, 2],
  ],
];

/** The pepa: a long high call, a quick run down, and the soaring climax. */
const PEPA: Call[][] = [
  [
    [24, 0.5, 26],
    [21, 0.5],
    [24, 3, undefined, true],
    [21, 0.5],
    [19, 0.5],
    [16, 1],
    [19, 2, undefined, true],
  ],
  [
    [16, 0.5, 19],
    [19, 0.5],
    [21, 0.5],
    [19, 0.5],
    [16, 0.5],
    [14, 0.5],
    [12, 1],
    [14, 0.5, 16],
    [16, 0.5],
    [12, 2, undefined, true],
  ],
  [
    [19, 1, 21],
    [21, 0.5],
    [19, 0.5],
    [16, 1],
    [14, 0.5],
    [16, 0.5],
    [19, 1],
    [16, 0.5],
    [14, 0.5],
    [12, 2, undefined, true],
  ],
];
const SOAR: Call[][] = [
  [
    [24, 0.5, 26],
    [26, 0.5],
    [28, 2, undefined, true],
    [26, 0.5],
    [24, 0.5],
    [21, 1],
    [24, 3, undefined, true],
  ],
  [
    [21, 0.5, 24],
    [24, 0.5],
    [26, 0.5],
    [28, 0.5],
    [26, 0.5],
    [24, 0.5],
    [21, 1],
    [19, 0.5, 21],
    [21, 0.5],
    [24, 2, undefined, true],
  ],
];

// The dhol on a triplet grid, twelve steps to four beats:
// D = dhum, the palm on the bass head; d = dhin, the stick left to ring; t = ta, the stick
// damped; k = a ghost stroke; B = dhum and ta together.
const WALK = "D.tD.td.tDkt";
const GALLOP = ["D.tDktd.tDkt", "D.tDktd.tDkt", "DktDktdktBkt", "tktdktBktBtt"];
const ANSWER = "..d..dk.d.kd";

const STROKES: Record<string, Stroke[]> = { D: ["dhum"], d: ["dhin"], t: ["ta"], k: ["ka"], B: ["dhum", "ta"] };

export class BihuScore implements Score {
  private v!: Voices;
  private near!: Band;
  private far!: Band;
  private pad!: PadHandle;
  private wind!: Handle;
  private water!: Handle;
  private crowd!: Handle;
  private tune = 0;
  private tuneFree = 0;
  private song = 0;
  private songFree = 0;
  private call = 0;
  private callFree = 0;
  private nextCow = 0;

  start(voices: Voices) {
    this.v = voices;
    this.near = new Band(voices);
    this.far = new Band(voices);
    this.far.far(0.85, 0.01);
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.035, 650);
    this.wind = voices.bed("wind", 0.03);
    this.water = voices.bed("water", 0.035);
    this.crowd = voices.bed("crowd", 0.024);
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const span = to - from;
    const when = () => from + Math.random() * span;
    const spring = p < 0.205;
    const shortNight = p >= 0.2 && p < 0.235;
    const goru = p >= 0.235 && p < 0.35;
    const manuh = p >= 0.35 && p < 0.47;
    const husori = rise(p, 0.465, 0.5) * (1 - rise(p, 0.58, 0.592));
    const naach = rise(p, 0.635, 0.66) * (1 - rise(p, 0.778, 0.8));
    const night = p >= 0.79;

    // The valley's birds by day, crickets by night.
    if ((spring && p > 0.02) || goru) {
      if (Math.random() < span / 7) this.near.koel(when(), goru ? 0.012 : 0.018, 3 + Math.floor(Math.random() * 3));
      if (Math.random() < span / 3.5) this.near.bulbul(when(), 0.008);
    }
    if (manuh && Math.random() < span / 5) this.near.bulbul(when(), 0.006);
    if ((shortNight || night) && Math.random() < span * 1.4) v.chirp(when(), 0.007);

    // The baanhi: spring, dawn, morning, and slow at night.
    const flute = (spring && p > 0.015) || (goru && p > 0.25) || (manuh && p < 0.46) || p > 0.83;
    if (flute && from >= this.tuneFree) {
      const slow = p > 0.83;
      const lines = slow ? NIGHT : SPRING;
      const beat = slow ? 0.55 : manuh ? 0.42 : 0.5;
      const phrase = lines[this.tune++ % lines.length];
      let time = from;
      let last: number | undefined;
      const level = goru ? 0.035 : slow ? 0.04 : 0.045;
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 12);
        this.v.flute(time, freq, beats * beat * 0.95, level, slow ? last : undefined);
        last = freq;
        time += beats * beat;
      }
      this.tuneFree = time + (slow ? 3 + Math.random() * 2 : 1.2 + Math.random() * 1.5);
    }

    // Chot: far off at the namghar, a dhol and a pepa trying out the first songs.
    if (p > 0.09 && p < 0.21) {
      const drive = rise(p, 0.09, 0.12) * (1 - rise(p, 0.19, 0.21));
      steps(from, to, 0.7 / 3, (time, i) => this.dhol(this.far, time, at(WALK, i), 0.16 * drive));
      if (Math.random() < span / 9) this.pepaPhrase(this.far, when(), PEPA[Math.floor(Math.random() * PEPA.length)], 0.7, 0.03 * drive);
    }

    // Goru Bihu: cow bells, a cow lowing, and the boys' toka.
    if (goru) {
      const drive = rise(p, 0.24, 0.26) * (1 - rise(p, 0.33, 0.35));
      if (Math.random() < span / 0.9) this.near.cowbell(when(), 0.014 * drive, 0.9 + Math.random() * 0.4);
      if (from > this.nextCow && drive > 0.3) {
        this.near.moo(from + 0.2, 0.022 * drive);
        this.nextCow = from + 7 + Math.random() * 6;
      }
      steps(from, to, 0.25, (time, i) => {
        if ("x.x.xx.x..x.xx.x"[i % 16] === "x") this.near.toka(time, 0.022 * drive);
      });
    }

    // Manuh Bihu: the loom, the xutuli.
    if (manuh) {
      const drive = rise(p, 0.355, 0.37) * (1 - rise(p, 0.46, 0.49));
      steps(from, to, 1 / 1.1, (time) => this.near.loom(time, 0.03 * drive));
      if (Math.random() < span / 6) this.near.xutuli(when(), n(MODE[10 + Math.floor(Math.random() * 5)] + 12), 0.25, 0.01 * drive);
    }

    // Husori: the dhol at a walk, the taal on the beat, toka between, hands clapping.
    if (husori > 0.001) {
      const step = HUSORI_BEAT / 3;
      steps(from, to, step, (time, i) => {
        this.dhol(this.near, time, at(WALK, i), 0.17 * husori);
        if (i % 3 === 0) this.near.taal(time, 0.02 * husori, i % 12 === 0);
        if (i % 3 === 2) this.near.toka(time, 0.02 * husori);
        if (i % 6 === 3) v.clap(time, 0.05 * husori, 6);
      });
      if (from >= this.songFree) {
        const start = Math.ceil(from / HUSORI_BEAT) * HUSORI_BEAT;
        const line = SONG[this.song++ % SONG.length];
        let time = start;
        for (const [semi, beats] of line) {
          v.choir(time, [n(semi - 12)], beats * HUSORI_BEAT * 1.05, 0.03 * husori);
          time += beats * HUSORI_BEAT;
        }
        if (this.song % 2 === 0) this.near.shout(time - HUSORI_BEAT * 0.5, 0.035 * husori, 6);
        this.songFree = time;
      }
      if (Math.random() < span / 10)
        this.pepaPhrase(this.near, when(), PEPA[Math.floor(Math.random() * PEPA.length)], HUSORI_BEAT, 0.022 * husori);
    }

    // Bihu naach: two dhols at a gallop, faster at the climax.
    if (naach > 0.001) {
      const climax = rise(p, MOMENTS.climax[0], MOMENTS.climax[0] + 0.02) * (1 - rise(p, MOMENTS.climax[1], MOMENTS.climax[1] + 0.02));
      const beat = climax > 0.5 ? NAACH_BEAT * 0.86 : NAACH_BEAT;
      const step = beat / 3;
      steps(from, to, step, (time, i) => {
        const bar = Math.floor(i / 12);
        const pattern = GALLOP[bar % GALLOP.length];
        this.dhol(this.near, time, at(pattern, i), 0.2 * naach * (i % 12 === 0 ? 1.15 : 1));
        const answer = at(ANSWER, i);
        if (answer !== ".") this.dhol(this.near, time + 0.004, answer, 0.11 * naach, 1.12);
        if (i % 3 === 0) this.near.taal(time, 0.018 * naach, i % 12 === 0);
        if (i % 3 === 2) this.near.toka(time, 0.022 * naach);
        if (i % 6 === 3) this.near.gogona(time, n(i % 12 === 3 ? -24 : -17), beat * 0.9, 0.035 * naach, "boing");
        if (climax > 0.5 && i % 24 === 21) this.near.shout(time, 0.035 * naach, 7);
      });
      if (from >= this.callFree) {
        const start = Math.ceil(from / beat) * beat;
        const lines = climax > 0.3 ? SOAR : PEPA;
        const end = this.pepaPhrase(this.near, start, lines[this.call++ % lines.length], beat, lerp(0.034, 0.042, climax) * naach);
        this.callFree = end + beat * (climax > 0.3 ? 0.5 : 2);
      }
    }

    // Mukoli Bihu: the dhol across the fields, a soft gogona close by, fireflies.
    if (night) {
      const drive = rise(p, 0.8, 0.83) * (1 - rise(p, 0.96, 1));
      steps(from, to, 0.42 / 3, (time, i) => this.dhol(this.far, time, at(GALLOP[0], i), 0.14 * drive));
      steps(from, to, 0.84, (time, i) => {
        if (i % 4 !== 3) this.near.gogona(time, n(i % 4 === 1 ? -17 : -24), 0.8, 0.02 * drive, i % 2 ? "up" : "boing");
      });
      if (Math.random() < span / 2.5) v.bell(when(), n(MODE[13 + Math.floor(Math.random() * 5)] + 12), 0.005, 1.8);
    }
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const naach = rise(p, 0.635, 0.66) * (1 - rise(p, 0.778, 0.8));
    const husori = rise(p, 0.465, 0.5) * (1 - rise(p, 0.6, 0.625));
    const dark = Math.max(rise(p, 0.2, 0.214) * (1 - rise(p, 0.226, 0.25)), rise(p, 0.79, 0.83));
    this.pad.level(0.55 + 0.25 * rise(p, 0.1, 0.2) - 0.35 * naach + 0.3 * rise(p, 0.86, 0.95));
    this.pad.bright(560 + 700 * (1 - dark) * rise(p, 0.3, 0.4) + 800 * naach);
    this.wind.level(0.8 * (1 - rise(p, 0.2, 0.24)) + 0.4 * rise(p, 0.82, 0.9));
    this.water.level(rise(p, 0.225, 0.25) * (1 - rise(p, 0.33, 0.36)));
    this.crowd.level(0.35 * husori + naach * 1.1);

    // The pad follows the day: Sa Pa, then Ga for the morning, Re Pa Dha for the dance, and back.
    if (crossed(previous, p, 0.235)) this.pad.chord([n(-12), n(-5), n(4)], 3);
    if (crossed(previous, p, 0.46)) this.pad.chord([n(-10), n(-5), n(2)], 3);
    if (crossed(previous, p, 0.64)) this.pad.chord([n(-12), n(-5), n(4)], 2);
    if (crossed(previous, p, 0.8)) this.pad.chord([n(-15), n(-8), n(0)], 4);
    if (crossed(previous, p, 0.9)) this.pad.chord([n(-12), n(-5), n(0)], 4);

    if (crossed(previous, p, MOMENTS.spring[0] + 0.01)) this.near.koel(now + 0.2, 0.022, 5);
    if (crossed(previous, p, MOMENTS.dusk[0] + 0.01)) {
      // Evening prayers in the namghar: the big taal and a bell.
      for (let i = 0; i < 6; i++) this.far.taal(now + i * 0.42, 0.05, i === 0 || i === 5);
      v.bell(now + 0.1, n(-5), 0.05, 5);
    }
    if (crossed(previous, p, MOMENTS.dawn[0] + 0.01)) {
      for (let i = 0; i < 4; i++) this.near.bulbul(now + i * 0.5, 0.012);
      this.near.koel(now + 1.5, 0.02, 4);
    }
    if (crossed(previous, p, MOMENTS.gamosa[0])) {
      v.bell(now + 0.05, n(12), 0.05, 4);
      v.choir(now + 0.2, [n(-12), n(-5), n(4)], 6, 0.03);
    }
    if (crossed(previous, p, MOMENTS.second[0] + 0.012)) v.bell(now + 0.05, n(16), 0.035, 3.5);
    if (crossed(previous, p, MOMENTS.arrive[0])) {
      this.near.shout(now + 0.1, 0.05, 7);
      for (let i = 0; i < 8; i++) this.near.dhol(now + 0.4 + i * 0.07, i % 2 ? "ta" : "dhin", 0.08 + i * 0.015);
    }
    if (crossed(previous, p, MOMENTS.bless[0])) {
      // The husori stand and bless the house, all together.
      this.near.taal(now, 0.05, true);
      v.choir(now + 0.1, [n(-12), n(-5), n(0)], 3, 0.045);
      v.choir(now + 3, [n(-12), n(-8), n(-5), n(0)], 5, 0.045);
      this.near.shout(now + 7.6, 0.05, 8);
    }
    if (crossed(previous, p, MOMENTS.naach[0])) {
      v.swell(now, 0.06, 2);
      this.near.shout(now + 1.9, 0.05, 8);
    }
    if (crossed(previous, p, MOMENTS.climax[0])) {
      v.swell(now, 0.08, 1.6);
      this.near.shout(now + 1.5, 0.06, 9);
      this.callFree = 0;
    }
    if (crossed(previous, p, MOMENTS.night[0] + 0.01)) this.near.gogona(now + 0.2, n(-24), 1.6, 0.04, "boing");
    if (crossed(previous, p, MOMENTS.finale[0])) {
      v.choir(now + 0.3, [n(-12), n(-5), n(0), n(4)], 9, 0.035);
      v.bell(now + 0.2, n(0), 0.06, 7);
    }
  }

  on(event: string, now: number) {
    const v = this.v;
    const note = () => n(MODE[10 + Math.floor(Math.random() * 6)] + 12);
    if (event === "kopou") {
      this.near.xutuli(now, note(), 0.3, 0.018);
      for (let i = 0; i < 3; i++) v.bell(now + 0.08 + i * 0.11, note(), 0.012, 1.5);
    }
    if (event === "splash") {
      this.near.splash(now, 0.07);
      this.near.cowbell(now + 0.15, 0.02, 0.9 + Math.random() * 0.3);
      if (Math.random() < 0.35) this.near.moo(now + 0.5, 0.025);
    }
    if (event === "gamosa") v.whoosh(now, 0.8, 0.03, true);
    if (event === "hoi") {
      this.near.shout(now, 0.045, 6);
      this.near.taal(now + 0.05, 0.035, true);
    }
    if (event === "dhol") {
      // In time: on the next step of the gallop.
      const step = NAACH_BEAT / 3;
      const time = Math.ceil(now / step) * step;
      this.near.dhol(time, "dhum", 0.32);
      this.near.dhol(time + step, "ta", 0.2);
      this.near.dhol(time + step * 2, "dhin", 0.16);
      this.near.pepa(time, n(24), 0.3, 0.03, { grace: n(26) });
    }
    if (event === "jonaki") {
      for (let i = 0; i < 4; i++) v.bell(now + i * 0.09, n(MODE[12 + i] + 12), 0.01, 2);
      this.near.gogona(now, n(-17), 0.7, 0.025, "up");
    }
  }

  private dhol(band: Band, time: number, stroke: string, level: number, pitch = 1) {
    for (const s of STROKES[stroke] ?? []) band.dhol(time, s, s === "ka" ? level * 0.6 : level, pitch);
  }

  /** Plays a pepa phrase from `time`; returns when it ends. */
  private pepaPhrase(band: Band, time: number, phrase: Call[], beat: number, level: number) {
    let t = time;
    for (const [semi, beats, grace, shake] of phrase) {
      const duration = beats * beat;
      band.pepa(t, n(semi), duration * 0.96, level, {
        grace: grace !== undefined ? n(grace) : undefined,
        shake: shake ? 0.018 : undefined,
      });
      t += duration;
    }
    return t;
  }
}
