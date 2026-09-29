// The instruments of a Tamil festival morning, synthesised on the shared Voices bus:
// - the nadaswaram, a long double-reed horn, loud and bright, bending between notes (gamaka)
// - the ottu, its drone reed, holding Sa
// - the thavil, the barrel drum it always plays with: a stick on the right head, and fingers in
//   hard caps on the bass head
// - the parai, the frame drum beaten with two sticks, for the Bhogi fire
// - the veena, plucked, sliding between notes
// - the kulavai, the women's high trilling call; and a crowd shouting "Pongalo Pongal!"
// - the shankh, brass cattle bells and their jingles, milk bubbling, crows
import type { Handle, Voices } from "../voices";

export class Mangala {
  constructor(private readonly v: Voices) {}

  /** A reed filter: the nadaswaram's nasal, buzzing brightness. */
  private reed(into: AudioNode) {
    const { ctx } = this.v;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 260;
    const nose = ctx.createBiquadFilter();
    nose.type = "peaking";
    nose.frequency.value = 1350;
    nose.Q.value = 1.3;
    nose.gain.value = 9;
    const top = ctx.createBiquadFilter();
    top.type = "lowpass";
    top.frequency.value = 3800;
    high.connect(nose).connect(top).connect(into);
    return high;
  }

  /** One nadaswaram note, sliding up or down into it from `from`, with a shake once it settles. */
  nadaswaram(
    time: number,
    freq: number,
    duration: number,
    level = 0.05,
    from?: number,
  ) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.035);
    gain.gain.setValueAtTime(level, time + Math.max(0.05, duration * 0.86));
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.09);
    gain.connect(bus);
    const input = this.reed(gain);
    const end = time + duration + 0.15;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.6;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    if (duration > 0.4) {
      depth.gain.setValueAtTime(0, time + 0.18);
      depth.gain.linearRampToValueAtTime(
        freq * 0.011,
        time + Math.min(0.7, duration * 0.7),
      );
    }
    vibrato.connect(depth);
    vibrato.start(time);
    vibrato.stop(end);
    const slide = Math.min(0.13, duration * 0.35);
    [
      { type: "sawtooth" as const, ratio: 1, level: 0.7 },
      { type: "square" as const, ratio: 1.004, level: 0.28 },
    ].forEach((part) => {
      const osc = ctx.createOscillator();
      osc.type = part.type;
      osc.frequency.setValueAtTime((from ?? freq) * part.ratio, time);
      if (from)
        osc.frequency.exponentialRampToValueAtTime(
          freq * part.ratio,
          time + slide,
        );
      depth.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.value = part.level;
      osc.connect(g).connect(input);
      osc.start(time);
      osc.stop(end);
    });
    // Breath through the reed.
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400;
    band.Q.value = 1.5;
    const breath = ctx.createGain();
    breath.gain.value = 0.18;
    this.v
      .noiseSource(time, duration + 0.1)
      .connect(band)
      .connect(breath)
      .connect(gain);
  }

  /** The ottu: a drone reed holding Sa (and its octave) under the nadaswaram. */
  ottu(freq: number, level = 0.02): Handle {
    const { ctx, bus } = this.v;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(bus);
    const input = this.reed(out);
    const oscs = [
      [freq, 0.6],
      [freq * 1.003, 0.4],
      [freq * 2, 0.18],
    ].map(([f, l]) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = l;
      osc.connect(g).connect(input);
      osc.start();
      return osc;
    });
    return {
      level(value, glide = 1.2) {
        out.gain.setTargetAtTime(value * level, ctx.currentTime, glide);
      },
      stop() {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        oscs.forEach((o) => o.stop(ctx.currentTime + 2));
      },
    };
  }

  /**
   * One stroke of the thavil:
   * - `tha`: the stick on the right head, a hard ringing crack
   * - `dhom`: capped fingers on the left head, a deep boom
   * - `ki`: a light tap
   */
  thavil(time: number, stroke: "tha" | "dhom" | "ki", level = 0.15) {
    const { ctx, bus } = this.v;
    if (stroke === "dhom") {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(118, time);
      osc.frequency.exponentialRampToValueAtTime(64, time + 0.3);
      const g = this.v.envelope(time, 0.003, 0.42, level);
      osc.connect(g).connect(bus);
      osc.start(time);
      osc.stop(time + 0.55);
      // The cap on the finger clacks as it lands.
      this.v.thump(time, level * 0.35, 2200, 0.02);
      this.v.thump(time, level * 0.5, 160, 0.12);
      return;
    }
    if (stroke === "tha") {
      this.v.thump(time, level * 0.9, 3200, 0.045);
      [420, 868].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = i ? "triangle" : "sine";
        osc.frequency.setValueAtTime(f * 1.04, time);
        osc.frequency.exponentialRampToValueAtTime(f, time + 0.04);
        const g = this.v.envelope(
          time,
          0.001,
          i ? 0.08 : 0.16,
          level * (i ? 0.25 : 0.5),
        );
        osc.connect(g).connect(bus);
        osc.start(time);
        osc.stop(time + 0.25);
      });
      return;
    }
    this.v.thump(time, level * 0.45, 4200, 0.025);
  }

  /** One stroke of the parai: `boom` with the long stick, `slap` with the short one. */
  parai(time: number, stroke: "boom" | "slap", level = 0.16) {
    const { ctx, bus } = this.v;
    if (stroke === "boom") {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(92, time + 0.18);
      const g = this.v.envelope(time, 0.002, 0.26, level);
      osc.connect(g).connect(bus);
      osc.start(time);
      osc.stop(time + 0.35);
      // The skin rattles: a buzz of low noise.
      this.v.thump(time, level * 0.8, 700, 0.14);
      return;
    }
    this.v.thump(time, level, 1900, 0.06);
    this.v.thump(time, level * 0.4, 5200, 0.02);
  }

  /** One pluck of a veena string, sliding (meend) from `from` if given. */
  veena(time: number, freq: number, level = 0.05, from?: number, ring = 2.4) {
    const { ctx, bus } = this.v;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(freq * 9, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.6, time + 0.9);
    const gain = this.v.envelope(time, 0.004, ring, level);
    filter.connect(gain).connect(bus);
    [
      { ratio: 1, type: "sawtooth" as const, level: 0.6 },
      { ratio: 1.002, type: "sawtooth" as const, level: 0.4 },
      { ratio: 0.5, type: "sine" as const, level: 0.35 },
    ].forEach((part) => {
      const osc = ctx.createOscillator();
      osc.type = part.type;
      const f = freq * part.ratio;
      osc.frequency.setValueAtTime(from ? from * part.ratio : f, time);
      if (from) {
        osc.frequency.setValueAtTime(from * part.ratio, time + 0.06);
        osc.frequency.exponentialRampToValueAtTime(f, time + 0.26);
      }
      const g = ctx.createGain();
      g.gain.value = part.level;
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(time + ring + 0.2);
    });
  }

  /** The kulavai: a woman's high call, the tongue trilling fast. */
  kulavai(time: number, duration: number, freq = 1150, level = 0.03) {
    const { ctx, bus } = this.v;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, time);
    out.gain.linearRampToValueAtTime(level, time + 0.15);
    out.gain.setValueAtTime(level, time + duration - 0.3);
    out.gain.linearRampToValueAtTime(0, time + duration);
    out.connect(bus);
    const trill = ctx.createOscillator();
    trill.frequency.value = 7 + Math.random() * 1.5;
    const pitch = ctx.createGain();
    pitch.gain.value = freq * 0.07;
    const wobble = ctx.createGain();
    wobble.gain.value = 0.5;
    const body = ctx.createGain();
    body.gain.value = 0.5;
    trill.connect(pitch);
    trill.connect(wobble).connect(body.gain);
    body.connect(out);
    [1, 2].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq * mult * 0.96, time);
      osc.frequency.linearRampToValueAtTime(freq * mult, time + 0.3);
      osc.frequency.setValueAtTime(freq * mult, time + duration - 0.4);
      osc.frequency.linearRampToValueAtTime(
        freq * mult * 1.08,
        time + duration,
      );
      pitch.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.value = i ? 0.15 : 1;
      osc.connect(g).connect(body);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
    trill.start(time);
    trill.stop(time + duration + 0.05);
  }

  /** A crowd shouting "Pon-ga-lo Pon-gal!", the syllables on a rising, then falling shout. */
  shout(time: number, level = 0.05) {
    const syllables: [number, number, number, "o" | "a"][] = [
      [0, 0.17, 0, "o"],
      [0.19, 0.15, 2, "a"],
      [0.36, 0.34, 4, "o"],
      [0.82, 0.17, 2, "o"],
      [1.01, 0.5, 5, "a"],
    ];
    for (const [at, duration, semi, vowel] of syllables)
      this.syllable(time + at, duration, semi, vowel, level);
  }

  private syllable(
    time: number,
    duration: number,
    semi: number,
    vowel: "o" | "a",
    level: number,
  ) {
    const { ctx, bus } = this.v;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, time);
    out.gain.linearRampToValueAtTime(level, time + 0.03);
    out.gain.setValueAtTime(level, time + duration * 0.7);
    out.gain.linearRampToValueAtTime(0, time + duration + 0.08);
    out.connect(bus);
    const formants: [number, number][] =
      vowel === "o"
        ? [
            [480, 1],
            [860, 0.5],
            [2500, 0.12],
          ]
        : [
            [760, 1],
            [1220, 0.55],
            [2650, 0.14],
          ];
    const filters = formants.map(([f, g]) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = f;
      filter.Q.value = 4;
      const gain = ctx.createGain();
      gain.gain.value = g;
      filter.connect(gain).connect(out);
      return filter;
    });
    const up = Math.pow(2, semi / 12);
    for (let i = 0; i < 9; i++) {
      const base =
        (i % 3 === 0 ? 240 : 140) * up * (0.94 + Math.random() * 0.12);
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const at = time + Math.random() * 0.03;
      osc.frequency.setValueAtTime(base * 1.04, at);
      osc.frequency.exponentialRampToValueAtTime(base * 0.95, at + duration);
      filters.forEach((filter) => osc.connect(filter));
      osc.start(at);
      osc.stop(at + duration + 0.12);
    }
    // The consonant: a puff of breath at the front of it.
    this.v.thump(time, level * 1.4, 1600, 0.04);
  }

  /** The shankh: a buzzing horn that bends up into its note and holds. */
  conch(time: number, freq: number, level = 0.05, hold = 2.2) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.35);
    gain.gain.setValueAtTime(level, time + hold);
    gain.gain.linearRampToValueAtTime(0, time + hold + 0.8);
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
      osc.frequency.setValueAtTime(freq * mult, time + hold + 0.1);
      osc.frequency.exponentialRampToValueAtTime(
        freq * mult * 0.97,
        time + hold + 0.8,
      );
      const g = ctx.createGain();
      g.gain.value = [1, 0.4, 0.2][i];
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(time + hold + 0.9);
    });
  }

  /** The big brass bell at a bullock's neck, and the little ones jingling on its halter. */
  cattleBell(time: number, freq: number, level = 0.06, jingles = 8) {
    this.v.bell(time, freq, level, 2.6);
    this.v.bell(time + 0.01, freq * 1.5, level * 0.3, 1.2);
    for (let i = 0; i < jingles; i++)
      this.jingle(
        time + 0.04 + i * (0.045 + Math.random() * 0.04),
        level * 0.35,
      );
  }

  /** One of the small bells (salangai) on a string, shaken. */
  jingle(time: number, level = 0.015) {
    const { ctx, bus } = this.v;
    const f = 3400 + Math.random() * 1600;
    [1, 1.51].forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = f * ratio;
      const g = this.v.envelope(
        time,
        0.001,
        i ? 0.08 : 0.18,
        level * (i ? 0.4 : 1),
      );
      osc.connect(g).connect(bus);
      osc.start(time);
      osc.stop(time + 0.25);
    });
  }

  /** A bubble breaking in the boiling milk. */
  bubble(time: number, level = 0.02) {
    const { ctx, bus } = this.v;
    const osc = ctx.createOscillator();
    const f = 160 + Math.random() * 320;
    osc.frequency.setValueAtTime(f, time);
    osc.frequency.exponentialRampToValueAtTime(f * 2.2, time + 0.05);
    const g = this.v.envelope(time, 0.004, 0.07, level);
    osc.connect(g).connect(bus);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  /** A fire crackling: a dry click, sometimes a pop. */
  crackle(time: number, level = 0.02) {
    this.v.thump(time, level, 2500 + Math.random() * 3000, 0.012);
    if (Math.random() < 0.25) this.v.thump(time + 0.01, level * 0.8, 300, 0.05);
  }

  /** A crow's "kaa". */
  caw(time: number, level = 0.03) {
    const { ctx, bus } = this.v;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1300;
    band.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(level, time + 0.03);
    g.gain.linearRampToValueAtTime(level * 0.6, time + 0.2);
    g.gain.linearRampToValueAtTime(0, time + 0.3);
    band.connect(g).connect(bus);
    [1, 1.01].forEach((ratio) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(640 * ratio, time);
      osc.frequency.exponentialRampToValueAtTime(470 * ratio, time + 0.28);
      osc.connect(band);
      osc.start(time);
      osc.stop(time + 0.32);
    });
  }

  /** A bird at first light: a quick rising whistle, twice. */
  tweet(time: number, level = 0.012) {
    const { ctx, bus } = this.v;
    const base = 2600 + Math.random() * 900;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const at = time + i * 0.12;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(base, at);
      osc.frequency.exponentialRampToValueAtTime(base * 1.45, at + 0.07);
      const g = this.v.envelope(at, 0.006, 0.07, level);
      osc.connect(g).connect(bus);
      osc.start(at);
      osc.stop(at + 0.1);
    }
  }
}
