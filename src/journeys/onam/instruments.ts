// Kerala's instruments, synthesised on the shared bus (see ../voices.ts):
// - edakka: the hourglass "talking drum" of the temple steps, its pitch bent by squeezing its laces
// - veena: a plucked string (Karplus-Strong), with gamaka slides
// - chenda: the cylinder drum of the melam, its sharp stick crack and the deep valamthala
// - ilathalam: heavy bell-metal cymbals
// - kombu: the curved brass horn, and kuzhal, the shrill double-reed pipe
// - thakil and udukku, for the tigers
// - voices: formant-filtered pulses, for the vanchipattu and the Thiruvathira songs
import type { Voices } from "../voices";

type Vowel = "a" | "o" | "e" | "i" | "u";
const FORMANTS: Record<Vowel, [number, number, number]> = {
  a: [760, 1150, 2600],
  o: [520, 860, 2500],
  e: [480, 1900, 2600],
  i: [300, 2250, 3000],
  u: [340, 780, 2400],
};

export class Kerala {
  readonly v: Voices;
  private readonly ctx: AudioContext;
  private readonly strings = new Map<number, AudioBuffer>();
  /** A little grit and a spread across the stereo field for the melam's many drummers. */
  private readonly drums: AudioNode[];
  private readonly brass: AudioNode;

  constructor(v: Voices) {
    this.v = v;
    this.ctx = v.ctx;
    const shaper = (drive: number) => {
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
      }
      const node = this.ctx.createWaveShaper();
      node.curve = curve;
      return node;
    };
    this.drums = [-0.65, -0.25, 0.2, 0.6].map((pan) => {
      const input = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      input.connect(shaper(2.2)).connect(panner).connect(v.bus);
      return input;
    });
    const brass = this.ctx.createGain();
    brass.connect(shaper(3)).connect(v.bus);
    this.brass = brass;
  }

  private drumOut(lane: number) {
    return this.drums[((lane % 4) + 4) % 4];
  }

  private osc(type: OscillatorType, freq: number, time: number, stop: number) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    o.start(time);
    o.stop(stop);
    return o;
  }

  private noise(time: number, duration: number, type: BiquadFilterType, freq: number, q: number, out: AudioNode) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    this.v.noiseSource(time, duration).connect(filter).connect(out);
  }

  // ─── Drums ─────────────────────────────────────────────────────────────────

  /**
   * The edakka: a singing tone that slides from `freq` toward `to` as the player squeezes the
   * laces, over a soft stick tap.
   */
  edakka(time: number, freq: number, level = 0.08, to = freq, ring = 0.5) {
    const gain = this.v.envelope(time, 0.004, ring, level);
    gain.connect(this.v.bus);
    [1, 2.01].forEach((mult, i) => {
      const o = this.osc(i ? "triangle" : "sine", freq * mult, time, time + ring + 0.1);
      if (to !== freq) o.frequency.exponentialRampToValueAtTime(to * mult, time + ring * 0.7);
      const g = this.ctx.createGain();
      g.gain.value = i ? 0.18 : 1;
      o.connect(g).connect(gain);
    });
    this.v.thump(time, level * 0.35, 2200, 0.018);
  }

  /** One stroke of a chenda: `tha`, the stick's crack on the left head; `valam`, the deep right head. */
  chenda(time: number, stroke: "tha" | "ghost" | "valam", level = 0.1, lane = 0) {
    const out = this.drumOut(lane);
    if (stroke === "valam") {
      const gain = this.v.envelope(time, 0.003, 0.26, level);
      gain.connect(out);
      const o = this.osc("sine", 150, time, time + 0.35);
      o.frequency.exponentialRampToValueAtTime(92, time + 0.18);
      o.connect(gain);
      const body = this.v.envelope(time, 0.001, 0.09, level * 0.55);
      body.connect(out);
      this.noise(time, 0.12, "lowpass", 700, 0.8, body);
      return;
    }
    const l = stroke === "ghost" ? level * 0.35 : level;
    const crack = this.v.envelope(time, 0.0008, 0.055, l);
    crack.connect(out);
    this.noise(time, 0.08, "bandpass", 1650 + Math.random() * 300, 1.1, crack);
    const tick = this.v.envelope(time, 0.0005, 0.018, l * 0.6);
    tick.connect(out);
    this.noise(time, 0.03, "highpass", 5200, 0.7, tick);
    const skin = this.v.envelope(time, 0.001, 0.07, l * 0.4);
    skin.connect(out);
    const o = this.osc("triangle", 330, time, time + 0.12);
    o.frequency.exponentialRampToValueAtTime(250, time + 0.06);
    o.connect(skin);
  }

  /** The thakil: `thom`, the big left head struck by hand; `ta`, the stick; `kit`, a thumb-cap click. */
  thakil(time: number, stroke: "thom" | "ta" | "kit", level = 0.12) {
    if (stroke === "thom") {
      this.v.drum(time, "bass", level * 1.2, 0.85);
      return;
    }
    if (stroke === "ta") {
      this.v.drum(time, "open", level * 0.7, 1.35);
      this.v.thump(time, level * 0.9, 3000, 0.045);
      return;
    }
    this.v.thump(time, level * 0.5, 4600, 0.02);
  }

  /** The udukku: a small hourglass drum whose squeezed skin bends up, `bend` semitones. */
  udukku(time: number, level = 0.07, bend = 5) {
    const freq = 240 + Math.random() * 12;
    const gain = this.v.envelope(time, 0.003, 0.2, level);
    gain.connect(this.v.bus);
    const o = this.osc("sine", freq, time, time + 0.3);
    o.frequency.exponentialRampToValueAtTime(freq * Math.pow(2, bend / 12), time + 0.12);
    o.connect(gain);
    this.v.thump(time, level * 0.4, 1600, 0.025);
  }

  /** Ilathalam: a pair of heavy bell-metal cymbals, clapped shut (`open` false) or left to ring. */
  ilathalam(time: number, level = 0.04, open = false, lane = 0) {
    const out = this.drumOut(lane + 1);
    const ring = open ? 1.3 : 0.22;
    [1180, 1735, 2620, 3530, 4890].forEach((f, i) => {
      const o = this.osc(i % 2 ? "triangle" : "sine", f * (1 + (Math.random() - 0.5) * 0.004), time, time + ring + 0.1);
      const g = this.v.envelope(time, 0.001, ring / (1 + i * 0.3), (level * 0.45) / (1 + i * 0.5));
      o.connect(g).connect(out);
    });
    const clash = this.v.envelope(time, 0.001, open ? 0.35 : 0.07, level * 0.8);
    clash.connect(out);
    this.noise(time, open ? 0.4 : 0.1, "highpass", 3200, 0.6, clash);
  }

  // ─── Wind ──────────────────────────────────────────────────────────────────

  /** The kombu: a brassy call that scoops up into its note, holds, and falls away at the end. */
  kombu(time: number, freq: number, duration: number, level = 0.05) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.1);
    gain.gain.setValueAtTime(level, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(3800, time + 0.18);
    filter.frequency.setValueAtTime(3000, time + duration);
    filter.frequency.exponentialRampToValueAtTime(500, time + duration + 0.3);
    filter.connect(gain).connect(this.brass);
    [1, 1.004, 0.5].forEach((mult, i) => {
      const o = this.osc("sawtooth", freq * mult * 0.78, time, time + duration + 0.4);
      o.frequency.exponentialRampToValueAtTime(freq * mult, time + 0.16);
      o.frequency.setValueAtTime(freq * mult, time + duration);
      o.frequency.exponentialRampToValueAtTime(freq * mult * 0.86, time + duration + 0.3);
      const g = this.ctx.createGain();
      g.gain.value = i === 2 ? 0.35 : 0.5;
      o.connect(g).connect(filter);
    });
  }

  /** The kuzhal: a shrill, nasal double reed, sliding from `from` if given, with a quick vibrato. */
  kuzhal(time: number, freq: number, duration: number, level = 0.04, from?: number) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.05);
    gain.gain.setValueAtTime(level, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.12);
    const shape = this.ctx.createGain();
    [
      [1150, 3, 1],
      [2700, 4, 0.55],
      [520, 2, 0.4],
    ].forEach(([f, q, l]) => {
      const band = this.ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = f;
      band.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.value = l * 2.4;
      shape.connect(band).connect(g).connect(gain);
    });
    gain.connect(this.v.bus);
    const vibrato = this.osc("sine", 5.6, time, time + duration + 0.2);
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(freq * 0.01, time + Math.min(0.4, duration * 0.6));
    vibrato.connect(depth);
    [
      ["sawtooth", 1, 0.7],
      ["square", 1.003, 0.3],
    ].forEach(([type, mult, l]) => {
      const o = this.osc(type as OscillatorType, (from ?? freq) * (mult as number), time, time + duration + 0.2);
      if (from) o.frequency.exponentialRampToValueAtTime(freq * (mult as number), time + Math.min(0.14, duration * 0.4));
      depth.connect(o.frequency);
      const g = this.ctx.createGain();
      g.gain.value = l as number;
      o.connect(g).connect(shape);
    });
  }

  // ─── Strings ───────────────────────────────────────────────────────────────

  private string(freq: number) {
    const key = Math.round(freq * 4);
    let buffer = this.strings.get(key);
    if (buffer) return buffer;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * 2.6);
    buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / freq));
    const ring = new Float32Array(period);
    let last = 0;
    for (let i = 0; i < period; i++) {
      // A plucked, slightly softened burst.
      last = last * 0.4 + (Math.random() * 2 - 1) * 0.6;
      ring[i] = last;
    }
    // The string loses about half its ring each second, whatever its pitch.
    const damp = Math.pow(0.45, 1 / freq);
    let at = 0;
    for (let i = 0; i < length; i++) {
      const next = (at + 1) % period;
      const value = ring[at];
      data[i] = value;
      ring[at] = (value + ring[next]) * 0.5 * damp;
      at = next;
    }
    this.strings.set(key, buffer);
    return buffer;
  }

  /** A veena string plucked at `freq`, gliding in from `from` if given (a gamaka). */
  veena(time: number, freq: number, level = 0.08, from?: number, glide = 0.12) {
    const buffer = this.string(freq);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const rate = this.ctx.sampleRate;
    const actual = rate / (Math.max(2, Math.round(rate / freq)) + 0.5);
    const tune = freq / actual;
    src.playbackRate.setValueAtTime(from ? tune * (from / freq) : tune, time);
    if (from) src.playbackRate.exponentialRampToValueAtTime(tune, time + glide);
    const body = this.ctx.createBiquadFilter();
    body.type = "peaking";
    body.frequency.value = 900;
    body.gain.value = 5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.setTargetAtTime(0, time + 1.6, 0.4);
    src.connect(body).connect(gain).connect(this.v.bus);
    src.start(time);
    src.stop(time + 2.6);
  }

  // ─── Voices ────────────────────────────────────────────────────────────────

  /**
   * A sung syllable: `voices` detuned throats through the vowel's formants, with a consonant's
   * breath at the front if `hard`. Short and accented for the rowers' chant, long for a song.
   */
  sing(time: number, freq: number, duration: number, vowel: Vowel, level = 0.04, voices = 2, hard = false, from?: number) {
    const gain = this.ctx.createGain();
    const attack = hard ? 0.015 : 0.06;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + attack);
    gain.gain.setTargetAtTime(level * 0.7, time + attack, duration * 0.4);
    gain.gain.setValueAtTime(level * 0.6, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.12);
    gain.connect(this.v.bus);
    const formants = FORMANTS[vowel].map((f, i) => {
      const band = this.ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = f;
      band.Q.value = [6, 8, 10][i];
      const g = this.ctx.createGain();
      g.gain.value = [1.6, 0.9, 0.4][i];
      band.connect(g).connect(gain);
      return band;
    });
    const vibrato = this.osc("sine", 5 + Math.random(), time, time + duration + 0.2);
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(duration > 0.5 ? freq * 0.012 : 0, time + Math.min(0.5, duration));
    vibrato.connect(depth);
    for (let i = 0; i < voices; i++) {
      const detune = voices > 1 ? (i / (voices - 1) - 0.5) * 22 : 0;
      const o = this.osc("sawtooth", from ?? freq, time, time + duration + 0.2);
      if (from) o.frequency.exponentialRampToValueAtTime(freq, time + Math.min(0.15, duration * 0.5));
      o.detune.value = detune + (Math.random() - 0.5) * 6;
      depth.connect(o.frequency);
      formants.forEach((f) => o.connect(f));
    }
    if (hard) {
      const breath = this.v.envelope(time - 0.01, 0.002, 0.03, level * 1.4);
      breath.connect(this.v.bus);
      this.noise(time - 0.01, 0.05, "bandpass", 4200, 1.2, breath);
    }
  }

  // ─── Water and beasts ──────────────────────────────────────────────────────

  /** Oars biting the water, `oars` of them at once. */
  splash(time: number, level = 0.05) {
    const hiss = this.v.envelope(time, 0.004, 0.16, level);
    hiss.connect(this.v.bus);
    this.noise(time, 0.22, "bandpass", 1900, 0.7, hiss);
    const thunk = this.v.envelope(time, 0.002, 0.12, level * 0.8);
    thunk.connect(this.v.bus);
    this.noise(time, 0.16, "lowpass", 380, 0.8, thunk);
  }

  /** A tiger's roar: a low, rough, rattling growl that swells and dies away. */
  growl(time: number, level = 0.06) {
    const duration = 0.9 + Math.random() * 0.3;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(380, time);
    filter.frequency.linearRampToValueAtTime(1100, time + 0.25);
    filter.frequency.exponentialRampToValueAtTime(260, time + duration);
    filter.connect(gain).connect(this.v.bus);
    const rattle = this.osc("square", 26 + Math.random() * 6, time, time + duration);
    const am = this.ctx.createGain();
    am.gain.value = 0.5;
    const depth = this.ctx.createGain();
    depth.gain.value = 0.5;
    rattle.connect(depth).connect(am.gain);
    const o = this.osc("sawtooth", 92, time, time + duration);
    o.frequency.linearRampToValueAtTime(118, time + 0.25);
    o.frequency.exponentialRampToValueAtTime(70, time + duration);
    o.connect(am).connect(filter);
    this.noise(time, duration, "lowpass", 600, 0.7, am);
  }

  /** The bells on a tiger's belt. */
  jingle(time: number, level = 0.02) {
    for (let i = 0; i < 3; i++) this.v.bell(time + i * 0.03 + Math.random() * 0.02, 3800 + Math.random() * 900, level, 0.25);
  }
}
