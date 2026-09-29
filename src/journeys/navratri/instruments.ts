// Navratri's own instruments, built on the shared voices' audio context and bus: the harmonium
// that leads every garba mandal, the shehnai, the dandiya sticks, the shankh, and the roar of
// Ravana burning.
import type { Handle, Voices } from "../voices";

export class Band {
  constructor(private readonly v: Voices) {}

  /**
   * A harmonium: two reeds a few cents apart for its beating tremolo, one an octave down in the
   * chords, through the box's woody filter, with a little breath from the bellows.
   */
  harmonium(time: number, freqs: number[], duration: number, level = 0.03) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.035);
    gain.gain.setValueAtTime(level, time + Math.max(0.04, duration - 0.06));
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.09);
    const box = ctx.createBiquadFilter();
    box.type = "lowpass";
    box.frequency.value = 2600;
    box.Q.value = 0.6;
    const body = ctx.createBiquadFilter();
    body.type = "peaking";
    body.frequency.value = 900;
    body.gain.value = 5;
    box.connect(body).connect(gain).connect(bus);
    for (const f of freqs) {
      for (const [type, cents, part] of [
        ["sawtooth", -4, 0.5],
        ["square", 5, 0.32],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = f;
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = part / Math.sqrt(freqs.length);
        osc.connect(g).connect(box);
        osc.start(time);
        osc.stop(time + duration + 0.12);
      }
    }
    const air = ctx.createBiquadFilter();
    air.type = "bandpass";
    air.frequency.value = 1800;
    air.Q.value = 0.8;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.05;
    this.v
      .noiseSource(time, duration + 0.1)
      .connect(air)
      .connect(airGain)
      .connect(gain);
  }

  /**
   * A shehnai: a bright double reed, nasal through its formants, sliding in from `from` (meend)
   * and shaking a little once the note settles.
   */
  shehnai(time: number, freq: number, duration: number, level = 0.03, from?: number) {
    const { ctx, bus } = this.v;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.05);
    gain.gain.setValueAtTime(level, time + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.12);
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(gain).connect(bus);
    const formants = [
      [1150, 5, 1],
      [2500, 6, 0.55],
      [3600, 8, 0.2],
    ].map(([f, q, g]) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = f;
      filter.Q.value = q;
      const fg = ctx.createGain();
      fg.gain.value = g * 3;
      filter.connect(fg).connect(out);
      return filter;
    });
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(from ?? freq, time);
    if (from) osc.frequency.exponentialRampToValueAtTime(freq, time + Math.min(0.18, duration * 0.4));
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 6.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(freq * 0.009, time + Math.min(0.6, duration * 0.6));
    vibrato.connect(depth).connect(osc.frequency);
    formants.forEach((filter) => osc.connect(filter));
    const dry = ctx.createGain();
    dry.gain.value = 0.18;
    osc.connect(dry).connect(out);
    osc.start(time);
    osc.stop(time + duration + 0.2);
    vibrato.start(time);
    vibrato.stop(time + duration + 0.2);
  }

  /** Two painted dandiya struck together: a hard wooden tok. */
  dandiya(time: number, level = 0.06, pitch = 1) {
    const { ctx, bus } = this.v;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1650 * pitch, time);
    osc.frequency.exponentialRampToValueAtTime(1250 * pitch, time + 0.05);
    const g = this.v.envelope(time, 0.001, 0.05, level);
    osc.connect(g).connect(bus);
    osc.start(time);
    osc.stop(time + 0.09);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400 * pitch;
    band.Q.value = 6;
    const ng = this.v.envelope(time, 0.001, 0.03, level * 1.4);
    this.v.noiseSource(time, 0.06).connect(band).connect(ng).connect(bus);
  }

  /** The shankh: a buzzing horn that bends up into its note, holds, and falls away. */
  shankh(time: number, freq: number, level = 0.05, hold = 2.2) {
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
      osc.frequency.exponentialRampToValueAtTime(freq * mult * 0.97, time + hold + 0.8);
      const g = ctx.createGain();
      g.gain.value = [1, 0.4, 0.2][i];
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(time + hold + 0.9);
    });
  }

  /** A hand-held ghanti rung fast in the aarti. */
  ghanti(time: number, duration: number, freq: number, level = 0.012) {
    for (let t = 0; t < duration; t += 0.13) this.v.bell(time + t + Math.random() * 0.02, freq * (t % 0.26 < 0.13 ? 1 : 1.06), level, 0.5);
  }

  /** The dhol's rolling flam into the sam: a burst of quick treble strokes rising to a bass. */
  roll(time: number, span: number, level = 0.12) {
    const n = Math.max(3, Math.round(span / 0.045));
    for (let i = 0; i < n; i++) this.v.drum(time + (i / n) * span, "slap", level * (0.4 + (0.6 * i) / n), 1.5);
    this.v.drum(time + span, "bass", level * 1.4, 0.9);
  }

  /** The fire: a deep rushing roar with crackle in it, held by a level handle. */
  roar(): Handle {
    const { ctx, bus } = this.v;
    const src = this.v.noiseSource(ctx.currentTime, 60 * 60 * 3);
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 380;
    low.Q.value = 0.9;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const depth = ctx.createGain();
    depth.gain.value = 140;
    lfo.connect(depth).connect(low.frequency);
    const out = ctx.createGain();
    out.gain.value = 0;
    src.connect(low).connect(out).connect(bus);
    lfo.start();
    return {
      level(value, glide = 0.8) {
        out.gain.setTargetAtTime(value * 0.12, ctx.currentTime, glide);
        low.frequency.setTargetAtTime(300 + 500 * value, ctx.currentTime, glide);
      },
      stop() {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        src.stop(ctx.currentTime + 2);
        lfo.stop(ctx.currentTime + 2);
      },
    };
  }
}
