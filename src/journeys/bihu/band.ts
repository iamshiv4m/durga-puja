// The instruments of a Bihu, synthesised on the shared Voices context:
// - the Bihu dhol: a barrel drum slung at the waist, the left head struck with the palm, the right
//   with a bamboo stick (maari)
// - the pepa: a buffalo-horn pipe with a cane reed, nasal and piercing
// - the gogona: a bamboo jaw harp, its buzz shaped by the mouth into a "boing"
// - the toka: a length of bamboo split halfway, clacked against the palm
// - the taal: bell-metal cymbals
// - the xutuli: a little clay whistle the women play
// - and the valley: the koel, the bulbul, cattle bells, the pond and the loom
//
// The players go through `near`, so the band can be pushed far off into the night (`far`).
import type { Voices } from "../voices";

export type Stroke = "dhum" | "dhin" | "ta" | "ka";

export class Band {
  readonly ctx: AudioContext;
  private readonly v: Voices;
  /** The band's own bus: through a lowpass into the room, so it can move away. */
  readonly near: GainNode;
  private readonly distance: BiquadFilterNode;
  private readonly reed: PeriodicWave;
  private readonly buzz: PeriodicWave;

  constructor(v: Voices) {
    this.v = v;
    this.ctx = v.ctx;
    const ctx = v.ctx;
    this.near = ctx.createGain();
    this.distance = ctx.createBiquadFilter();
    this.distance.type = "lowpass";
    this.distance.frequency.value = 16000;
    this.distance.Q.value = 0.5;
    this.near.connect(this.distance).connect(v.bus);
    // A reed: odd harmonics strong, even ones present but weaker, for a nasal, horn-like tone.
    const n = 24;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = (k % 2 ? 1 : 0.45) / Math.pow(k, 0.85);
    this.reed = ctx.createPeriodicWave(real, imag);
    // A thin pulse: every harmonic nearly as loud as the last, the raw buzz of a jaw harp's tongue.
    const buzzImag = new Float32Array(40);
    for (let k = 1; k < 40; k++) buzzImag[k] = 1 / Math.pow(k, 0.35);
    this.buzz = ctx.createPeriodicWave(new Float32Array(40), buzzImag);
  }

  /** 0: the band is right here. 1: it is across the fields. */
  far(amount: number, glide = 1.2) {
    const now = this.ctx.currentTime;
    this.distance.frequency.setTargetAtTime(16000 * Math.pow(700 / 16000, amount), now, glide);
    this.near.gain.setTargetAtTime(1 - 0.55 * amount, now, glide);
  }

  // ─── The dhol ────────────────────────────────────────────────────────────

  /**
   * One stroke of the Bihu dhol:
   * - `dhum`: the palm on the big left head, a deep boom that sags in pitch
   * - `dhin`: the stick on the right head, left to ring
   * - `ta`: the stick on the right head, dampened, a crack
   * - `ka`: a ghost note, the stick barely touching
   */
  dhol(time: number, stroke: Stroke, level = 0.2, pitch = 1) {
    const { ctx } = this;
    const out = this.near;
    if (stroke === "dhum") {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(96 * pitch, time);
      osc.frequency.linearRampToValueAtTime(112 * pitch, time + 0.02);
      osc.frequency.exponentialRampToValueAtTime(56 * pitch, time + 0.42);
      const g = this.env(time, 0.003, 0.55, level);
      osc.connect(g).connect(out);
      osc.start(time);
      osc.stop(time + 0.65);
      // The skin's second mode, for body.
      const body = ctx.createOscillator();
      body.type = "triangle";
      body.frequency.setValueAtTime(168 * pitch, time);
      body.frequency.exponentialRampToValueAtTime(120 * pitch, time + 0.2);
      const bg = this.env(time, 0.002, 0.18, level * 0.35);
      body.connect(bg).connect(out);
      body.start(time);
      body.stop(time + 0.3);
      this.hit(time, level * 0.55, 220, 0.06, 0.8);
      return;
    }
    if (stroke === "dhin") {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(262 * pitch, time);
      osc.frequency.exponentialRampToValueAtTime(236 * pitch, time + 0.25);
      const g = this.env(time, 0.002, 0.32, level * 0.6);
      osc.connect(g).connect(out);
      osc.start(time);
      osc.stop(time + 0.4);
      const ring = ctx.createOscillator();
      ring.frequency.value = 262 * 1.59 * pitch;
      const rg = this.env(time, 0.002, 0.16, level * 0.18);
      ring.connect(rg).connect(out);
      ring.start(time);
      ring.stop(time + 0.22);
      this.hit(time, level * 0.6, 2400, 0.03, 1.4);
      return;
    }
    if (stroke === "ta") {
      this.hit(time, level * 0.95, 2900, 0.055, 1.6);
      this.hit(time, level * 0.4, 900, 0.04, 2);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 340 * pitch;
      const g = this.env(time, 0.001, 0.05, level * 0.3);
      osc.connect(g).connect(out);
      osc.start(time);
      osc.stop(time + 0.08);
      return;
    }
    this.hit(time, level * 0.35, 3600, 0.02, 1.4);
  }

  // ─── The pepa ────────────────────────────────────────────────────────────

  /**
   * One note on the pepa. `grace` flicks in from a neighbouring note first, the way the players
   * ornament almost every note; `from` slides up into it; `shake` is the fast wavering of a long
   * held call.
   */
  pepa(time: number, freq: number, duration: number, level = 0.05, opts: { from?: number; grace?: number; shake?: number } = {}) {
    const { ctx } = this;
    const end = time + duration;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.018);
    gain.gain.setValueAtTime(level, Math.max(time + 0.02, end - 0.04));
    gain.gain.linearRampToValueAtTime(0, end + 0.06);
    // The horn: a nasal band, a bright peak above it, and no low end at all.
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = Math.min(2400, freq * 2.2);
    band.Q.value = 1.1;
    const peak = ctx.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = 3100;
    peak.Q.value = 2;
    peak.gain.value = 9;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 420;
    band.connect(peak).connect(high).connect(gain).connect(this.near);

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.reed);
    const f = osc.frequency;
    if (opts.grace) {
      f.setValueAtTime(opts.grace, time);
      f.setValueAtTime(freq, time + 0.045);
    } else if (opts.from) {
      f.setValueAtTime(opts.from, time);
      f.exponentialRampToValueAtTime(freq, time + Math.min(0.12, duration * 0.4));
    } else f.setValueAtTime(freq, time);
    // The player's breath gives out a little at the end of the note: it falls.
    if (duration > 0.2) {
      f.setValueAtTime(freq, end - 0.05);
      f.exponentialRampToValueAtTime(freq * 0.965, end + 0.06);
    }
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = opts.shake ? 7.5 : 6.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(freq * (opts.shake ?? 0.008), time + Math.min(0.5, duration * 0.6));
    vibrato.connect(depth).connect(f);
    const pre = ctx.createGain();
    pre.gain.value = 0.9;
    osc.connect(pre).connect(band);
    // A second reed a hair off, which is what makes it buzz.
    const twin = ctx.createOscillator();
    twin.type = "sawtooth";
    twin.detune.value = 7;
    twin.frequency.setValueAtTime(opts.grace ?? opts.from ?? freq, time);
    twin.frequency.setValueAtTime(freq, time + 0.05);
    depth.connect(twin.frequency);
    const tg = ctx.createGain();
    tg.gain.value = 0.22;
    twin.connect(tg).connect(band);
    // Breath through the reed.
    const air = ctx.createBiquadFilter();
    air.type = "bandpass";
    air.frequency.value = 3800;
    air.Q.value = 1.5;
    const ag = ctx.createGain();
    ag.gain.value = 0.12;
    this.v
      .noiseSource(time, duration + 0.1)
      .connect(air)
      .connect(ag)
      .connect(gain);
    for (const node of [osc, twin, vibrato]) {
      node.start(time);
      node.stop(end + 0.1);
    }
  }

  // ─── The gogona ──────────────────────────────────────────────────────────

  /**
   * One twang of the gogona: the bamboo tongue's buzz at `freq`, with the mouth sweeping a
   * resonance up through its overtones and back ("boing"), or only down, or only up.
   */
  gogona(time: number, freq: number, duration = 0.5, level = 0.05, sweep: "boing" | "up" | "down" = "boing") {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.buzz);
    osc.frequency.value = freq;
    const mouth = ctx.createBiquadFilter();
    mouth.type = "bandpass";
    mouth.Q.value = 16;
    const m = mouth.frequency;
    const lo = freq * 3;
    const hi = freq * 11;
    if (sweep === "boing") {
      m.setValueAtTime(lo, time);
      m.exponentialRampToValueAtTime(hi, time + duration * 0.25);
      m.exponentialRampToValueAtTime(freq * 4, time + duration * 0.9);
    } else if (sweep === "up") {
      m.setValueAtTime(lo, time);
      m.exponentialRampToValueAtTime(hi, time + duration * 0.8);
    } else {
      m.setValueAtTime(hi, time);
      m.exponentialRampToValueAtTime(lo, time + duration * 0.8);
    }
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 4200;
    const g = this.env(time, 0.003, duration, level);
    // The dry fundamental hums under the resonance.
    const hum = ctx.createGain();
    hum.gain.value = 0.18;
    osc.connect(mouth).connect(lowpass).connect(g).connect(this.near);
    osc.connect(hum).connect(lowpass);
    osc.start(time);
    osc.stop(time + duration + 0.1);
    // The tongue flicked by the finger.
    this.hit(time, level * 0.5, 2200, 0.012, 3);
  }

  // ─── Bamboo, metal and clay ──────────────────────────────────────────────

  /** The toka: two halves of split bamboo clacking, a hair apart. */
  toka(time: number, level = 0.06) {
    for (const [dt, share] of [
      [0, 1],
      [0.011, 0.6],
    ]) {
      const at = time + dt;
      this.hit(at, level * share, 1350, 0.035, 3.5);
      const wood = this.ctx.createOscillator();
      wood.frequency.value = 820 + Math.random() * 30;
      const g = this.env(at, 0.001, 0.045, level * share * 0.5);
      wood.connect(g).connect(this.near);
      wood.start(at);
      wood.stop(at + 0.07);
    }
  }

  /** The taal: a pair of bell-metal cymbals, clapped shut or left to ring. */
  taal(time: number, level = 0.04, open = false) {
    const ring = open ? 1.1 : 0.16;
    [620, 1340, 2110, 2890, 3970].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
      const g = this.env(time, 0.001, ring / (1 + i * 0.35), level * (0.5 / (1 + i * 0.5)));
      osc.connect(g).connect(this.near);
      osc.start(time);
      osc.stop(time + ring + 0.1);
    });
    this.hit(time, level * 0.7, 6800, open ? 0.35 : 0.06, 0.8);
  }

  /** The xutuli: a clay whistle, warbling. */
  xutuli(time: number, freq: number, duration = 0.3, level = 0.02) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const trill = ctx.createOscillator();
    trill.frequency.value = 11;
    const depth = ctx.createGain();
    depth.gain.value = freq * 0.025;
    trill.connect(depth).connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.03);
    gain.gain.setValueAtTime(level, time + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.04);
    osc.connect(gain).connect(this.near);
    for (const node of [osc, trill]) {
      node.start(time);
      node.stop(time + duration + 0.1);
    }
  }

  /** The beater of a loom, knocking the weft home. */
  loom(time: number, level = 0.03) {
    this.hit(time, level, 700, 0.05, 2.5);
    this.hit(time + 0.012, level * 0.5, 1500, 0.03, 3);
  }

  // ─── The valley ──────────────────────────────────────────────────────────

  /** The kuli, the Asian koel: "ku-ooo", again and again, each call a little higher. */
  koel(time: number, level = 0.02, calls = 4) {
    const { ctx } = this;
    for (let i = 0; i < calls; i++) {
      const k = 1 + i * 0.045;
      const at = time + i * 0.62;
      const syllables: [number, number, number, number][] = [
        [0, 0.16, 640 * k, 690 * k],
        [0.2, 0.3, 800 * k, 930 * k],
      ];
      for (const [dt, len, f0, f1] of syllables) {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(f0, at + dt);
        osc.frequency.exponentialRampToValueAtTime(f1, at + dt + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at + dt);
        g.gain.linearRampToValueAtTime(level * (0.7 + i * 0.1), at + dt + 0.05);
        g.gain.linearRampToValueAtTime(0, at + dt + len);
        osc.connect(g).connect(this.v.bus);
        osc.start(at + dt);
        osc.stop(at + dt + len + 0.02);
      }
    }
  }

  /** A bulbul's quick bright phrase. */
  bulbul(time: number, level = 0.01) {
    const { ctx } = this;
    const notes = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++) {
      const at = time + i * (0.09 + Math.random() * 0.05);
      const f = 1900 + Math.random() * 1400;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(f, at);
      osc.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.25 : 0.8), at + 0.07);
      const g = this.env(at, 0.005, 0.07, level);
      osc.connect(g).connect(this.v.bus);
      osc.start(at);
      osc.stop(at + 0.1);
    }
  }

  /** A brass bell on a cow's neck, knocked as she moves her head. */
  cowbell(time: number, level = 0.02, pitch = 1) {
    [1, 2.32, 3.86, 5.4].forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      osc.frequency.value = 520 * pitch * ratio;
      const g = this.env(time, 0.002, 0.5 / (1 + i * 0.6), level / (1 + i));
      osc.connect(g).connect(this.v.bus);
      osc.start(time);
      osc.stop(time + 0.6);
    });
    this.hit(time, level * 0.4, 1800, 0.02, 2);
  }

  /** A cow, low and mild. */
  moo(time: number, level = 0.03) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(128, time);
    osc.frequency.linearRampToValueAtTime(148, time + 0.35);
    osc.frequency.linearRampToValueAtTime(112, time + 1.3);
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.Q.value = 3;
    formant.frequency.setValueAtTime(420, time);
    formant.frequency.linearRampToValueAtTime(760, time + 0.5);
    formant.frequency.linearRampToValueAtTime(380, time + 1.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(level, time + 0.25);
    g.gain.setValueAtTime(level, time + 0.9);
    g.gain.linearRampToValueAtTime(0, time + 1.35);
    osc.connect(formant).connect(g).connect(this.v.bus);
    osc.start(time);
    osc.stop(time + 1.4);
  }

  /** Water thrown from the hands, and what it stirs in the pond. */
  splash(time: number, level = 0.05) {
    this.hit(time, level, 1400, 0.28, 0.7);
    this.hit(time + 0.03, level * 0.6, 3200, 0.18, 0.8);
    for (let i = 0; i < 4; i++) {
      const at = time + 0.05 + Math.random() * 0.3;
      const osc = this.ctx.createOscillator();
      const f = 380 + Math.random() * 420;
      osc.frequency.setValueAtTime(f, at);
      osc.frequency.exponentialRampToValueAtTime(f * 2.6, at + 0.05);
      const g = this.env(at, 0.002, 0.06, level * 0.3);
      osc.connect(g).connect(this.v.bus);
      osc.start(at);
      osc.stop(at + 0.08);
    }
  }

  /** Men's voices shouting together, "hoi!", the way a husori or a dance is cheered. */
  shout(time: number, level = 0.04, voices = 5) {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.05);
    gain.gain.setValueAtTime(level, time + 0.22);
    gain.gain.linearRampToValueAtTime(0, time + 0.42);
    gain.connect(this.near);
    const formants = [
      [520, 300, 1],
      [900, 2200, 0.5],
    ].map(([a, b, share]) => {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 5;
      f.frequency.setValueAtTime(a, time);
      f.frequency.linearRampToValueAtTime(b, time + 0.35);
      const g = ctx.createGain();
      g.gain.value = share;
      f.connect(g).connect(gain);
      return f;
    });
    for (let i = 0; i < voices; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const f = 170 + Math.random() * 70;
      const at = time + Math.random() * 0.03;
      osc.frequency.setValueAtTime(f, at);
      osc.frequency.linearRampToValueAtTime(f * 1.18, at + 0.12);
      osc.frequency.linearRampToValueAtTime(f * 0.95, at + 0.4);
      formants.forEach((filter) => osc.connect(filter));
      osc.start(at);
      osc.stop(at + 0.45);
    }
  }

  // ─── Plumbing ────────────────────────────────────────────────────────────

  /** A burst of band-passed noise: the body of every hit. */
  private hit(time: number, level: number, freq: number, decay: number, q: number) {
    const band = this.ctx.createBiquadFilter();
    band.type = freq < 400 ? "lowpass" : "bandpass";
    band.frequency.value = freq;
    band.Q.value = q;
    const g = this.env(time, 0.001, decay, level);
    this.v
      .noiseSource(time, decay + 0.05)
      .connect(band)
      .connect(g)
      .connect(this.near);
  }

  private env(time: number, attack: number, decay: number, level: number) {
    return this.v.envelope(time, attack, decay, level);
  }
}
