// Instruments for the festival journeys, synthesised with the Web Audio API. Each journey's
// score (`Score` in ./types.ts) plays these at times it schedules ahead of the clock.
//
// Everything goes through one bus into a shared room reverb, so the instruments sit together.

export const hz = (sa: number, semitones: number) => sa * Math.pow(2, semitones / 12);

export type Handle = { level(value: number, glide?: number): void; stop(): void };
export type PadHandle = Handle & { chord(next: number[], glide?: number): void; bright(value: number, glide?: number): void };

export class Voices {
  readonly ctx: AudioContext;
  /** Dry signal, also sent to the reverb. */
  readonly bus: GainNode;
  private readonly noise: AudioBuffer;

  constructor(ctx: AudioContext, out: AudioNode, room = 3.2) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    const send = ctx.createGain();
    send.gain.value = 0.32;
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(room);
    this.bus.connect(out);
    this.bus.connect(send).connect(reverb).connect(out);
    this.noise = this.makeNoise(2);
  }

  // ─── Strings, voices and flute ───────────────────────────────────────────

  /** One pluck of a tanpura string, with the buzzing jawari bridge. */
  tanpura(time: number, freq: number, level = 0.05) {
    const { ctx } = this;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(freq * 14, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.2, time + 2.8);
    const gain = this.envelope(time, 0.006, 3.6, level);
    filter.connect(gain).connect(this.bus);
    [1, 1.003].forEach((ratio) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq * ratio;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + 3.8);
    });
  }

  /** A held chord of soft detuned voices; returns a handle to move its level, chord and brightness. */
  pad(freqs: number[], level = 0.03, brightness = 900): PadHandle {
    const { ctx } = this;
    const out = ctx.createGain();
    out.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = brightness;
    filter.Q.value = 0.7;
    filter.connect(out).connect(this.bus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const depth = ctx.createGain();
    depth.gain.value = brightness * 0.25;
    lfo.connect(depth).connect(filter.frequency);
    lfo.start();
    const oscs = freqs.flatMap((f) =>
      [-6, 6].map((cents) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = f;
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = 1 / (freqs.length * 2);
        osc.connect(g).connect(filter);
        osc.start();
        return osc;
      }),
    );
    return {
      level(value, glide = 1.5) {
        out.gain.setTargetAtTime(value * level, ctx.currentTime, glide);
      },
      chord(next, glide = 2) {
        next.forEach((f, i) => {
          oscs[i * 2]?.frequency.setTargetAtTime(f, ctx.currentTime, glide);
          oscs[i * 2 + 1]?.frequency.setTargetAtTime(f, ctx.currentTime, glide);
        });
      },
      bright(value, glide = 1.5) {
        filter.frequency.setTargetAtTime(value, ctx.currentTime, glide);
      },
      stop() {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        const end = ctx.currentTime + 2;
        oscs.forEach((o) => o.stop(end));
        lfo.stop(end);
      },
    };
  }

  /** A breathy bansuri note, sliding in from `from` if given, with vibrato once it settles. */
  flute(time: number, freq: number, duration: number, level = 0.07, from?: number) {
    const { ctx } = this;
    const slide = Math.min(0.25, duration * 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.08);
    gain.gain.setValueAtTime(level, time + duration * 0.75);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.25);
    gain.connect(this.bus);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.setValueAtTime(0, time);
    vibratoDepth.gain.linearRampToValueAtTime(freq * 0.012, time + Math.min(0.9, duration * 0.7));
    vibrato.connect(vibratoDepth);
    [
      { type: "sine" as const, mult: 1, level: 1 },
      { type: "triangle" as const, mult: 2, level: 0.12 },
    ].forEach((part) => {
      const osc = ctx.createOscillator();
      osc.type = part.type;
      osc.frequency.setValueAtTime((from ?? freq) * part.mult, time);
      if (from) osc.frequency.exponentialRampToValueAtTime(freq * part.mult, time + slide);
      vibratoDepth.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.value = part.level;
      osc.connect(g).connect(gain);
      osc.start(time);
      osc.stop(time + duration + 0.4);
    });
    vibrato.start(time);
    vibrato.stop(time + duration + 0.4);
    // Breath: a little band of noise around the note.
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq * 2;
    band.Q.value = 2;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.05;
    this.noiseSource(time, duration + 0.3).connect(band).connect(breathGain).connect(gain);
  }

  /** A sung "aa", for swells: formant-filtered saws that rise and fall over `duration`. */
  choir(time: number, freqs: number[], duration: number, level = 0.04) {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + duration * 0.35);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    gain.connect(this.bus);
    const formants = [700, 1150, 2700].map((f, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = f;
      filter.Q.value = 8;
      const g = ctx.createGain();
      g.gain.value = [1, 0.5, 0.2][i];
      filter.connect(g).connect(gain);
      return filter;
    });
    freqs.forEach((f) =>
      [-9, 0, 9].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = f;
        osc.detune.value = cents;
        formants.forEach((filter) => osc.connect(filter));
        osc.start(time);
        osc.stop(time + duration + 0.1);
      }),
    );
  }

  // ─── Metal ───────────────────────────────────────────────────────────────

  /** A temple bell (ghanta): inharmonic partials, long ring. */
  bell(time: number, freq = 880, level = 0.12, ring = 4) {
    [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      osc.frequency.value = freq * ratio;
      const gain = this.envelope(time, 0.002, ring / (1 + i * 0.8), level / (1 + i * 1.4));
      osc.connect(gain).connect(this.bus);
      osc.start(time);
      osc.stop(time + ring + 0.2);
    });
  }

  /** Manjira or jhanj: a bright metallic tick, or left `open` to ring. */
  manjira(time: number, level = 0.05, open = false) {
    const { ctx } = this;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const gain = this.envelope(time, 0.001, open ? 0.5 : 0.08, level);
    this.noiseSource(time, open ? 0.6 : 0.12).connect(hp).connect(gain).connect(this.bus);
    [3150, 4720].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      const g = this.envelope(time, 0.001, open ? 0.7 : 0.1, level * 0.25);
      osc.connect(g).connect(this.bus);
      osc.start(time);
      osc.stop(time + 0.8);
    });
  }

  // ─── Drums ───────────────────────────────────────────────────────────────

  /**
   * One stroke of a barrel drum (dhol, dholak, tasha); `pitch` scales it for smaller drums.
   * - `bass`: the deep head, a falling boom
   * - `open`: the treble head left to ring
   * - `slap`: the treble head struck with the stick
   * - `rim`: a dry click
   */
  drum(time: number, stroke: "bass" | "open" | "slap" | "rim", level = 0.2, pitch = 1) {
    const { ctx } = this;
    if (stroke === "bass" || stroke === "open") {
      const bass = stroke === "bass";
      const osc = ctx.createOscillator();
      osc.type = bass ? "sine" : "triangle";
      osc.frequency.setValueAtTime((bass ? 120 : 330) * pitch, time);
      osc.frequency.exponentialRampToValueAtTime((bass ? 52 : 290) * pitch, time + (bass ? 0.35 : 0.25));
      const gain = this.envelope(time, 0.003, bass ? 0.55 : 0.3, level * (bass ? 1 : 0.7));
      osc.connect(gain).connect(this.bus);
      osc.start(time);
      osc.stop(time + 0.7);
      this.thump(time, level * (bass ? 0.5 : 0.35), bass ? 180 : 1800 * pitch);
      return;
    }
    const slap = stroke === "slap";
    this.thump(time, level * (slap ? 0.9 : 0.5), (slap ? 2600 : 4200) * pitch, slap ? 0.07 : 0.025);
  }

  /** Hands clapping, a few at a time so it sounds like a crowd. */
  clap(time: number, level = 0.08, hands = 4) {
    for (let i = 0; i < hands; i++) {
      this.thump(time + Math.random() * 0.018, level / Math.sqrt(hands), 1400 + Math.random() * 700, 0.05);
    }
  }

  // ─── Fire, air and water ─────────────────────────────────────────────────

  /** A firecracker: a sharp crack over a low thump. */
  crack(time: number, level = 0.15) {
    this.thump(time, level, 3000, 0.05);
    this.thump(time, level * 0.8, 160, 0.18);
  }

  /** A rocket or anar hiss, rising (or falling) in pitch over `duration`. */
  whoosh(time: number, duration: number, level = 0.04, rising = true) {
    const { ctx } = this;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 3;
    band.frequency.setValueAtTime(rising ? 700 : 3500, time);
    band.frequency.exponentialRampToValueAtTime(rising ? 5000 : 900, time + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    this.noiseSource(time, duration).connect(band).connect(gain).connect(this.bus);
  }

  /** A slow rise of noise with a low boom under it, for the journey's big moments. */
  swell(time: number, level = 0.08, duration = 3) {
    this.whoosh(time, duration, level * 0.5, true);
    const osc = this.ctx.createOscillator();
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 2.5);
    osc.connect(gain).connect(this.bus);
    osc.start(time);
    osc.stop(time + duration + 2.6);
  }

  /** A continuous bed of filtered noise (river, wind, a crowd far off); returns a level handle. */
  bed(kind: "water" | "wind" | "crowd", level = 0.03): Handle {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = kind === "wind" ? "bandpass" : "lowpass";
    filter.frequency.value = kind === "water" ? 700 : kind === "wind" ? 400 : 1200;
    filter.Q.value = kind === "wind" ? 0.8 : 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = kind === "water" ? 0.25 : 0.07;
    const depth = ctx.createGain();
    depth.gain.value = filter.frequency.value * 0.4;
    lfo.connect(depth).connect(filter.frequency);
    const out = ctx.createGain();
    out.gain.value = 0;
    src.connect(filter).connect(out).connect(this.bus);
    src.start();
    lfo.start();
    return {
      level(value, glide = 1) {
        out.gain.setTargetAtTime(value * level, ctx.currentTime, glide);
      },
      stop() {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        src.stop(ctx.currentTime + 2);
        lfo.stop(ctx.currentTime + 2);
      },
    };
  }

  /** A cricket's chirp, for a night outdoors. */
  chirp(time: number, level = 0.012) {
    for (let i = 0; i < 3; i++) {
      const at = time + i * 0.05;
      const osc = this.ctx.createOscillator();
      osc.frequency.value = 4400 + Math.random() * 300;
      const gain = this.envelope(at, 0.004, 0.03, level);
      osc.connect(gain).connect(this.bus);
      osc.start(at);
      osc.stop(at + 0.06);
    }
  }

  // ─── Plumbing ────────────────────────────────────────────────────────────

  /** A burst of filtered noise: the body of every hit. */
  thump(time: number, level: number, freq: number, decay = 0.12) {
    const band = this.ctx.createBiquadFilter();
    band.type = freq < 400 ? "lowpass" : "bandpass";
    band.frequency.value = freq;
    band.Q.value = 1.2;
    const gain = this.envelope(time, 0.001, decay, level);
    this.noiseSource(time, decay + 0.05).connect(band).connect(gain).connect(this.bus);
  }

  noiseSource(time: number, duration: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(time, Math.random() * 1.5);
    src.stop(time + duration);
    return src;
  }

  /** A gain that rises over `attack` and dies away exponentially over `decay`. */
  envelope(time: number, attack: number, decay: number, level: number) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(level, 0.0002), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    return gain;
  }

  private makeNoise(seconds: number) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private impulse(seconds: number) {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(2, rate * seconds, rate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3.2);
    }
    return buffer;
  }
}
