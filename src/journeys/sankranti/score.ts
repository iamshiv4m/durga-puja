// Makar Sankranti's score follows the day west with the sun, and the ragas of each hour:
// - dawn at the Sangam: tanpura and a shehnai in Raga Bhairav (komal Re and Dha, swaying in
//   andolan), the river, temple bells, and the shankh as the sun comes up
// - the Bihar morning: a bansuri folk tune and a soft dholak in dadra, sparrows
// - the Pune afternoon: a lavani touch, dholki in fast keherwa, the harmonium (peti), tuntuni
// - Uttarayan: wind and the flutter of paper, then the Gujarati dhol in a garba-like six and a
//   brass band in Bilawal; every cut kite gets its "kai po che!" from the terraces, and a stab
// - sunset: the band falls away, a bansuri in Puriya Dhanashri, the dusk raga
// - night: Yaman on soft bells, crickets, the pop of fireworks, and a bell for every tukkal
// - the close: Ahir Bhairav on the bansuri, the choir, Sa
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { MOMENTS } from "./world";

const SA = 138.59;
const n = (semitones: number) => hz(SA, semitones);
const win = (p: number, a: number, b: number, c: number, d: number) => smoothstep(a, b, p) * (1 - smoothstep(c, d, p));

type Phrase = [number, number][];

/** Raga Bhairav: S r G M P d N. Komal Re (1) and Dha (8) sway slowly. */
const BHAIRAV: Phrase[] = [
  // P d P, M G r S: the descent that is Bhairav's signature.
  [
    [7, 1],
    [8, 2],
    [7, 1],
    [5, 1],
    [4, 1],
    [1, 2.5],
    [0, 3],
  ],
  // S r G M P, d P.
  [
    [0, 1],
    [1, 1.5],
    [4, 1],
    [5, 1],
    [7, 2],
    [8, 2.5],
    [7, 3],
  ],
  // G M d N S', r' S' N d P.
  [
    [4, 1],
    [5, 1],
    [8, 1.5],
    [11, 1],
    [12, 2],
    [13, 2],
    [12, 1],
    [11, 1],
    [8, 2],
    [7, 3],
  ],
  // G M r r S: resting home.
  [
    [7, 1],
    [5, 1],
    [4, 1.5],
    [1, 2.5],
    [4, 1],
    [1, 1.5],
    [0, 4],
  ],
];
const SWAY = new Set([1, 8, 13]);

/** A village tune for the Bihar morning, Khamaj-ish with a flat Ni. */
const FOLK: Phrase[] = [
  [
    [0, 1],
    [4, 1],
    [5, 1],
    [7, 2],
    [9, 1],
    [7, 1],
    [5, 1],
    [4, 2.5],
  ],
  [
    [7, 1],
    [9, 1],
    [10, 1.5],
    [9, 1],
    [7, 2],
    [4, 1],
    [5, 1],
    [4, 1],
    [2, 1],
    [0, 3],
  ],
  [
    [4, 1],
    [4, 1],
    [5, 1],
    [4, 1],
    [2, 1],
    [0, 1.5],
    [-3, 1],
    [0, 3],
  ],
];

/** Puriya Dhanashri, the sunset raga: S r G M# P d N. */
const DHANASHRI: Phrase[] = [
  [
    [-1, 1],
    [1, 1],
    [4, 1.5],
    [6, 2],
    [4, 1],
    [1, 1],
    [0, 3],
  ],
  [
    [4, 1],
    [6, 1],
    [8, 2],
    [7, 1],
    [6, 1],
    [4, 2],
    [6, 1],
    [1, 1.5],
    [0, 4],
  ],
  [
    [7, 1],
    [8, 1],
    [11, 1.5],
    [12, 2.5],
    [11, 1],
    [8, 1],
    [7, 2],
    [6, 1],
    [4, 3],
  ],
];

/** Ahir Bhairav for the close: S r G M P D n. */
const AHIR: Phrase[] = [
  [
    [0, 1],
    [1, 1],
    [4, 1.5],
    [5, 1],
    [7, 2],
    [9, 1],
    [10, 1.5],
    [9, 1],
    [7, 3],
  ],
  [
    [12, 1.5],
    [10, 1],
    [9, 1],
    [7, 2],
    [5, 1],
    [4, 1],
    [1, 2],
    [0, 5],
  ],
];

/** Yaman, for the night's bells: N R G M# P D N S'. */
const YAMAN = [-1, 2, 4, 6, 7, 9, 11, 12, 14, 16];

// The lavani on the peti: sixteen half-beats of a tune in Khamaj, "." a rest, "-" held.
const LAVANI: (number | null)[] = [7, 9, 10, 9, 7, null, 5, 4, 5, 7, 4, 2, 0, null, 2, 4, 7, 7, 9, 7, 5, 4, 5, null, 4, 2, 4, 5, 4, 2, 0, null];
// Dholki in keherwa, doubled: D bass and open, d bass alone, t slap, k rim, n open.
const DHOLKI = "D.kt.dnkD.kt.dnt";

// The Gujarati dhol in a garba-like six, two strokes a beat.
const DHOL = "B.tb.tB.ttot";
/** The band tune, major scale degrees (0 = Sa), one per beat of the six; -1 a rest. */
const BAND = [0, 2, 4, 4, 3, 2, 1, 3, 5, 5, 4, 3, 2, 4, 7, 6, 5, 4, 3, 2, 1, 2, 0, -1, 4, 4, 5, 4, 3, 2, 1, 1, 2, 1, 0, -1];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const deg = (d: number) => MAJOR[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

const DHOL_STEP = 0.16;
const LAVANI_STEP = 0.1;
const FOLK_BEAT = 0.55;
const RAGA_BEAT = 0.62;

export class SankrantiScore implements Score {
  private v!: Voices;
  private pad!: PadHandle;
  private water!: Handle;
  private wind!: Handle;
  private crowd!: Handle;
  private flutter!: { level(value: number): void };
  private lead = 0;
  private leadFree = 0;
  private bellFree = 0;
  private yaman = 3;

  start(voices: Voices) {
    this.v = voices;
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.045, 700);
    this.water = voices.bed("water", 0.05);
    this.wind = voices.bed("wind", 0.05);
    this.crowd = voices.bed("crowd", 0.03);
    this.flutter = this.flutterBed();
  }

  // ─── Where the music is, at scroll progress p ─────────────────────────────

  private dawn = (p: number) => win(p, 0.055, 0.075, 0.16, 0.19);
  private bihar = (p: number) => win(p, 0.19, 0.21, 0.29, 0.315);
  private lavani = (p: number) => win(p, 0.318, 0.335, 0.415, 0.435);
  private kites = (p: number) => win(p, 0.45, 0.47, 0.545, 0.565);
  private band = (p: number) => win(p, 0.56, 0.575, 0.675, 0.705);
  private dusk = (p: number) => win(p, 0.69, 0.71, 0.775, 0.8);
  private night = (p: number) => win(p, 0.79, 0.81, 0.9, 0.93);
  private close = (p: number) => smoothstep(0.91, 0.935, p);

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const band = this.band(p);
    const kites = this.kites(p);
    const lavani = this.lavani(p);
    const bihar = this.bihar(p);

    // The tanpura under everything but the band.
    const drone = 0.045 * (1 - 0.75 * band) * (1 - 0.4 * lavani);
    steps(from, to, 1.25, (time, i) => v.tanpura(time, n([-5, 0, 0, -12][i % 4]), drone));

    // Before dawn and at dawn: a far temple bell now and then.
    if (p < 0.19 && from >= this.bellFree && Math.random() < 0.5) {
      v.bell(from + 0.05, n(24 + [0, 7, 12][Math.floor(Math.random() * 3)]), 0.018, 5);
      this.bellFree = from + 3 + Math.random() * 4;
    }

    // Sparrows in the Bihar morning; crickets at night.
    if (bihar > 0.2 && Math.random() < (to - from) * 3 * bihar) this.sparrow(from + Math.random() * (to - from), 0.012);
    const crickets = this.night(p) + this.close(p) * 0.6;
    if (crickets > 0.1 && Math.random() < (to - from) * 1.2 * crickets) v.chirp(from + Math.random() * (to - from), 0.007);

    // The lead voice for each hour: shehnai, bansuri or peti.
    this.leadLine(from, p);

    // Bihar: a soft dholak in dadra and a manjira.
    if (bihar > 0.02) {
      steps(from, to, 0.3, (time, i) => {
        const s = at("DKNDTN", i);
        const level = 0.08 * bihar;
        if (s === "D") v.drum(time, "bass", level, 1.3);
        if (s === "D" || s === "N") v.drum(time, "open", level * 0.7, 1.2);
        if (s === "T") v.drum(time, "slap", level * 0.5, 1.2);
        if (s === "K") v.drum(time, "rim", level * 0.35, 1.2);
        if (i % 6 === 0) v.manjira(time, 0.012 * bihar, true);
      });
    }

    // Pune: the lavani, dholki and peti and the tuntuni's one string.
    if (lavani > 0.02) {
      steps(from, to, LAVANI_STEP, (time, i) => {
        const s = at(DHOLKI, i);
        const level = 0.14 * lavani * (i % 16 === 0 ? 1.2 : 1);
        if (s === "D" || s === "d") v.drum(time, "bass", level, 1.5);
        if (s === "D" || s === "n") v.drum(time, "open", level * 0.7, 1.45);
        if (s === "t") v.drum(time, "slap", level * 0.55, 1.5);
        if (s === "k") v.drum(time, "rim", level * 0.4, 1.6);
        if (i % 4 === 0) v.manjira(time, 0.01 * lavani, i % 8 === 0);
        if (i % 2 === 0) {
          const note = LAVANI[(i / 2) % LAVANI.length];
          if (note !== null) this.peti(time, [n(note + 12), n(note)], LAVANI_STEP * 1.8, 0.022 * lavani);
        }
        if (i % 4 === 2) this.pluck(time, n(i % 8 === 2 ? 12 : 7), 0.02 * lavani);
      });
    }

    // Uttarayan: the dhol arrives with the kites and the band with the pech.
    const dhol = Math.max(kites * 0.4, band, this.dusk(p) * 0.2);
    if (dhol > 0.02) {
      steps(from, to, DHOL_STEP, (time, i) => {
        const s = at(DHOL, i);
        const level = (0.15 + 0.07 * band) * dhol;
        if (s === "B") v.drum(time, "bass", level * 1.1, 0.9);
        if (s === "b") v.drum(time, "bass", level * 0.6, 0.95);
        if (s === "t") v.drum(time, "slap", level * 0.5, 1.1);
        if (s === "o") v.drum(time, "open", level * 0.7, 1.0);
        // The tasha's roll and a jhanj on every beat when the band plays.
        if (band > 0.3 && i % 2 === 1 && Math.random() < 0.5) v.drum(time, "rim", 0.05 * band, 1.8);
        if (i % 2 === 0) v.manjira(time, 0.014 * dhol, i % 6 === 0);
        if (band > 0.4 && i % 6 === 0) v.clap(time, 0.05 * band, 6);
        if (i % 2 === 0) {
          const d = BAND[(i / 2) % BAND.length];
          if (d >= 0 && band > 0.02) this.brass(time, [n(deg(d) + 12), n(deg(d - 2) + 12)], DHOL_STEP * 1.8, 0.05 * band);
          // The band's euphonium under it, on the first and fourth beats.
          if (band > 0.02 && i % 6 === 0) {
            const root = BAND[(Math.floor(i / 12) * 6) % BAND.length];
            this.brass(time, [n(deg(Math.max(0, root) % 7 >= 3 ? 4 : 0) - 12)], DHOL_STEP * 2.6, 0.05 * band);
          }
          // The kites' own light tune before the band, on a bansuri.
          if (d >= 0 && kites > 0.02 && i % 4 === 0) v.flute(time, n(deg(d) + 24), DHOL_STEP * 3, 0.03 * kites * (1 - band));
        }
      });
    }

    // Night: Yaman on soft bells, rising and falling.
    const night = this.night(p);
    if (night > 0.02) {
      steps(from, to, 0.62, (time, i) => {
        if (i % 8 === 7 || Math.random() < 0.15) return;
        this.yaman = Math.max(0, Math.min(YAMAN.length - 1, this.yaman + (Math.random() < 0.55 ? 1 : -1) * (Math.random() < 0.2 ? 2 : 1)));
        v.bell(time, n(YAMAN[this.yaman] + 24), 0.02 * night, 3.5);
      });
    }
  }

  /** One phrase at a time for the hour's lead instrument, with space between. */
  private leadLine(from: number, p: number) {
    if (from < this.leadFree) return;
    const v = this.v;
    let time = from;
    let last: number | undefined;
    if (this.dawn(p) > 0.3) {
      const phrase = BHAIRAV[this.lead++ % BHAIRAV.length];
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 12);
        this.shehnai(time, freq, beats * RAGA_BEAT, 0.032 * this.dawn(p), last, SWAY.has(semi));
        last = freq;
        time += beats * RAGA_BEAT;
      }
      this.leadFree = time + 2 + Math.random() * 2;
    } else if (this.bihar(p) > 0.3) {
      const phrase = FOLK[this.lead++ % FOLK.length];
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 24);
        v.flute(time, freq, beats * FOLK_BEAT, 0.045 * this.bihar(p), last);
        last = freq;
        time += beats * FOLK_BEAT;
      }
      this.leadFree = time + 1.5 + Math.random() * 2;
    } else if (this.dusk(p) > 0.3) {
      const phrase = DHANASHRI[this.lead++ % DHANASHRI.length];
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 24);
        v.flute(time, freq, beats * RAGA_BEAT, 0.045 * this.dusk(p), last);
        last = freq;
        time += beats * RAGA_BEAT;
      }
      this.leadFree = time + 2 + Math.random() * 2;
    } else if (this.close(p) > 0.3) {
      const phrase = AHIR[this.lead++ % AHIR.length];
      for (const [semi, beats] of phrase) {
        const freq = n(semi + 24);
        v.flute(time, freq, beats * RAGA_BEAT * 1.2, 0.04 * this.close(p), last);
        last = freq;
        time += beats * RAGA_BEAT * 1.2;
      }
      this.leadFree = time + 3 + Math.random() * 3;
    }
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    const kites = this.kites(p);
    const band = this.band(p);
    const dusk = this.dusk(p);
    const night = this.night(p);
    const sky = win(p, 0.17, 0.19, 0.2, 0.22) + win(p, 0.3, 0.31, 0.32, 0.335) + win(p, 0.42, 0.435, 0.45, 0.47);
    this.water.level(1 - smoothstep(0.16, 0.21, p));
    this.wind.level(0.15 + 0.85 * Math.max(sky, kites * 0.55, band * 0.4, dusk * 0.6) + 0.25 * night);
    this.crowd.level(kites * 0.3 + band * 1.3 + dusk * 0.35 + night * 0.25);
    this.flutter.level(Math.max(kites, band, dusk * 0.6));
    this.pad.level(0.5 + 0.3 * band + 0.2 * this.close(p) - 0.2 * this.lavani(p));
    this.pad.bright(600 + 1200 * band + 400 * kites);

    // The chord follows the hour.
    const chord = (point: number, notes: number[]) => {
      if (crossed(previous, p, point)) this.pad.chord(notes.map(n), 3);
    };
    chord(0.18, [-12, -5, 4]);
    chord(0.31, [-7, 0, 4]);
    chord(0.435, [-12, -5, 4]);
    chord(0.69, [-12, -6, 1]);
    chord(0.79, [-12, -5, -1]);
    chord(0.9, [-12, -5, 0]);

    if (crossed(previous, p, 0.03)) v.bell(now + 0.1, n(24), 0.03, 6);
    if (crossed(previous, p, MOMENTS.sunrise)) this.sunrise(now);
    if (crossed(previous, p, MOMENTS.village[0])) v.bell(now + 0.05, n(28), 0.025, 3);
    if (crossed(previous, p, MOMENTS.wada[0])) {
      v.bell(now + 0.05, n(24), 0.035, 4);
      v.bell(now + 0.4, n(31), 0.02, 3);
    }
    if (crossed(previous, p, 0.44)) {
      v.swell(now, 0.05, 2.5);
      this.flap(now + 0.5, 1.2, 0.03);
    }
    if (crossed(previous, p, MOMENTS.pech[0])) {
      v.swell(now, 0.07, 2);
      v.choir(now + 1.6, [n(0), n(4), n(7)], 5, 0.02);
      this.shout(now + 1.9, 0.05);
    }
    MOMENTS.cuts.forEach((cut) => {
      if (crossed(previous, p, cut)) this.kaiPoChe(now, 0.9);
    });
    if (crossed(previous, p, MOMENTS.sundown)) {
      v.bell(now + 0.05, n(12), 0.05, 7);
      v.choir(now + 0.2, [n(-12), n(-6), n(1)], 7, 0.02);
    }
    if (crossed(previous, p, MOMENTS.night[0])) for (let i = 0; i < 6; i++) v.bell(now + 0.2 + i * 0.3, n(YAMAN[2 + i] + 24), 0.02, 3);
    if (crossed(previous, p, 0.915)) {
      v.choir(now, [n(-12), n(-5), n(0), n(4)], 9, 0.03);
      v.bell(now + 0.5, n(12), 0.05, 7);
    }
  }

  on(event: string, now: number) {
    const v = this.v;
    const bhairav = [0, 1, 4, 5, 7, 8, 11, 12];
    if (event === "ripple") this.drop(now, 0.03);
    if (event === "arghya") {
      this.drop(now, 0.03);
      v.bell(now + 0.02, n(bhairav[Math.floor(Math.random() * bhairav.length)] + 24), 0.035, 3);
    }
    if (event === "tug") this.flap(now, 0.35, 0.03);
    if (event === "pech") this.saw(now, 0.6, 0.02);
    if (event === "cut") {
      // On the dhol's next stroke, so it lands in time.
      const time = Math.ceil(now / DHOL_STEP) * DHOL_STEP;
      this.kaiPoChe(time, 1);
    }
    if (event === "tukkal") {
      v.bell(now + 0.02, n(YAMAN[3 + Math.floor(Math.random() * 6)] + 24), 0.035, 3);
      v.whoosh(now, 2.2, 0.008, true);
    }
    if (event === "burst") {
      v.crack(now + 0.05, 0.03 + Math.random() * 0.02);
      for (let i = 0; i < 6; i++) v.thump(now + 0.25 + Math.random() * 0.6, 0.006, 4000 + Math.random() * 3000, 0.03);
    }
  }

  // ─── Cues ─────────────────────────────────────────────────────────────────

  /** The sun clears the far bank: a swell, two blasts of the shankh, the bells. */
  private sunrise(now: number) {
    const v = this.v;
    v.swell(now, 0.05, 2.5);
    this.shankh(now + 1.1, 0.045);
    this.shankh(now + 4.3, 0.035);
    v.choir(now + 1.4, [n(-12), n(-5), n(0)], 8, 0.022);
    for (let i = 0; i < 16; i++) v.bell(now + 1.5 + i * 0.19, i % 2 ? n(31) : n(33), 0.008, 0.6);
    v.bell(now + 1.5, n(12), 0.06, 6);
  }

  /** A kite is cut: the band's stab, the whole terrace shouting, claps and a cymbal. */
  private kaiPoChe(time: number, level: number) {
    const v = this.v;
    this.brass(time, [n(12), n(16), n(19), n(24)], 0.35, 0.04 * level);
    this.brass(time + DHOL_STEP * 2, [n(14), n(17), n(21), n(26)], 0.55, 0.035 * level);
    this.shout(time + 0.05, 0.06 * level);
    v.clap(time + 0.4, 0.07 * level, 8);
    v.clap(time + 0.56, 0.06 * level, 8);
    v.manjira(time, 0.03 * level, true);
    v.drum(time, "bass", 0.2 * level, 0.85);
  }

  // ─── Instruments of this festival, on the shared bus ─────────────────────

  /**
   * A shehnai: a double reed, bright and nasal, sliding (meend) in from the last note; notes that
   * `sway` get the slow andolan of Bhairav's komal Re and Dha.
   */
  private shehnai(time: number, freq: number, duration: number, level: number, from?: number, sway = false) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.06);
    gain.gain.setValueAtTime(level, time + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.12);
    const nasal = ctx.createBiquadFilter();
    nasal.type = "peaking";
    nasal.frequency.value = 1500;
    nasal.Q.value = 1.4;
    nasal.gain.value = 9;
    const body = ctx.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = 1100;
    body.Q.value = 0.6;
    const low = ctx.createBiquadFilter();
    low.type = "highpass";
    low.frequency.value = 280;
    body.connect(nasal).connect(low).connect(gain).connect(bus);
    const vib = ctx.createOscillator();
    vib.frequency.value = sway ? 1.6 : 5.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(freq * (sway ? 0.018 : 0.007), time + Math.min(0.6, duration * 0.6));
    vib.connect(depth);
    const slide = Math.min(0.18, duration * 0.3);
    [
      { type: "sawtooth" as const, detune: 0, level: 0.7 },
      { type: "square" as const, detune: 4, level: 0.35 },
    ].forEach((part) => {
      const osc = ctx.createOscillator();
      osc.type = part.type;
      osc.detune.value = part.detune;
      osc.frequency.setValueAtTime(from ?? freq * 0.985, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + (from ? slide : 0.05));
      depth.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.value = part.level;
      osc.connect(g).connect(body);
      osc.start(time);
      osc.stop(time + duration + 0.2);
    });
    vib.start(time);
    vib.stop(time + duration + 0.2);
  }

  /** The harmonium (peti): two reeds a little apart, the bellows breathing. */
  private peti(time: number, freqs: number[], duration: number, level: number) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.025);
    gain.gain.setValueAtTime(level * 0.85, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.06);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.connect(gain).connect(bus);
    freqs.forEach((f) =>
      [-5, 5].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = f;
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = 0.5 / freqs.length;
        osc.connect(g).connect(filter);
        osc.start(time);
        osc.stop(time + duration + 0.1);
      }),
    );
  }

  /** The tuntuni: a single plucked string on a small drum, twanging. */
  private pluck(time: number, freq: number, level: number) {
    const { ctx, bus } = this.v;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq * 1.01, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 8;
    filter.frequency.setValueAtTime(freq * 10, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.4);
    const gain = this.v.envelope(time, 0.003, 0.5, level);
    osc.connect(filter).connect(gain).connect(bus);
    osc.start(time);
    osc.stop(time + 0.6);
  }

  /** A brass band section: trumpets and a clarinet, each note blown open with a scoop. */
  private brass(time: number, freqs: number[], duration: number, level: number) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.03);
    gain.gain.setValueAtTime(level * 0.8, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(3200, time + 0.06);
    filter.frequency.exponentialRampToValueAtTime(1600, time + duration);
    filter.connect(gain).connect(bus);
    freqs.forEach((f) =>
      [-8, 7].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.detune.value = cents;
        osc.frequency.setValueAtTime(f * 0.97, time);
        osc.frequency.exponentialRampToValueAtTime(f, time + 0.05);
        const g = ctx.createGain();
        g.gain.value = 0.5 / freqs.length;
        osc.connect(g).connect(filter);
        osc.start(time);
        osc.stop(time + duration + 0.12);
      }),
    );
  }

  /**
   * "Kai po che!" from a terrace: a few voices shouting the three syllables, each through its
   * own vowel: kaa-i rising, po short, che falling away.
   */
  private shout(time: number, level: number) {
    const { ctx, bus } = this.v;
    const syllables = [
      { at: 0, dur: 0.34, f1: [850, 420], f2: [1250, 2100], rise: 1.25 },
      { at: 0.36, dur: 0.12, f1: [520, 500], f2: [900, 880], rise: 1 },
      { at: 0.5, dur: 0.34, f1: [480, 430], f2: [2000, 1900], rise: 0.8 },
    ];
    for (let voice = 0; voice < 6; voice++) {
      const base = (voice % 2 ? 230 : 330) * (0.9 + Math.random() * 0.25);
      const lag = Math.random() * 0.06;
      for (const s of syllables) {
        const t = time + lag + s.at;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(level / 3, t + 0.03);
        gain.gain.setValueAtTime(level / 3, t + s.dur * 0.7);
        gain.gain.linearRampToValueAtTime(0, t + s.dur);
        gain.connect(bus);
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * s.rise, t + s.dur);
        [0, 1].forEach((k) => {
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.Q.value = 6;
          const band = k === 0 ? s.f1 : s.f2;
          f.frequency.setValueAtTime(band[0], t);
          f.frequency.linearRampToValueAtTime(band[1], t + s.dur);
          const g = ctx.createGain();
          g.gain.value = k === 0 ? 1 : 0.6;
          osc.connect(f).connect(g).connect(gain);
        });
        osc.start(t);
        osc.stop(t + s.dur + 0.05);
      }
      // The "k" and "ch": a click of breath.
      this.v.thump(time + lag, level * 0.3, 3000, 0.03);
      this.v.thump(time + lag + 0.5, level * 0.3, 4500, 0.05);
    }
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

  /** The rattle of a paper kite in the wind. */
  private flap(time: number, duration: number, level: number) {
    const { ctx, bus } = this.v;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800 + Math.random() * 800;
    band.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 16 + Math.random() * 8;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(level, time + 0.05);
    depth.gain.linearRampToValueAtTime(0, time + duration);
    lfo.connect(depth).connect(gain.gain);
    this.v
      .noiseSource(time, duration + 0.1)
      .connect(band)
      .connect(gain)
      .connect(bus);
    lfo.start(time);
    lfo.stop(time + duration + 0.1);
  }

  /** A continuous flutter of many kites far off, for the kite hours. */
  private flutterBed() {
    const { ctx, bus } = this.v;
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = src.buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2200;
    band.Q.value = 0.8;
    const trem = ctx.createGain();
    trem.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 13;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);
    const out = ctx.createGain();
    out.gain.value = 0;
    src.connect(band).connect(trem).connect(out).connect(bus);
    src.start();
    lfo.start();
    return {
      level(value: number) {
        out.gain.setTargetAtTime(value * 0.012, ctx.currentTime, 0.8);
      },
    };
  }

  /** Glass on glass: two manja strings sawing at each other. */
  private saw(time: number, duration: number, level: number) {
    const { ctx, bus } = this.v;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(3500, time);
    band.frequency.linearRampToValueAtTime(5200, time + duration);
    band.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(level, time);
    depth.gain.linearRampToValueAtTime(0, time + duration);
    lfo.connect(depth).connect(gain.gain);
    this.v
      .noiseSource(time, duration + 0.05)
      .connect(band)
      .connect(gain)
      .connect(bus);
    lfo.start(time);
    lfo.stop(time + duration + 0.05);
  }

  /** A sparrow's cheep: two quick falling blips. */
  private sparrow(time: number, level: number) {
    const { ctx, bus } = this.v;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const t = time + i * 0.09;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(4200 + Math.random() * 600, t);
      osc.frequency.exponentialRampToValueAtTime(2800, t + 0.05);
      const gain = this.v.envelope(t, 0.003, 0.05, level);
      osc.connect(gain).connect(bus);
      osc.start(t);
      osc.stop(t + 0.08);
    }
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
}
