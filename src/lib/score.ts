// The background score, in Raga Durga (Sa Re Ma Pa Dha, no Ga or Ni), tuned to the shankh's
// Sa (B-flat). A tanpura and a low sub hold the ground; a wordless choir moves slowly
// between chords; a bansuri plays alaap phrases before the dhak starts and after it fades;
// and at the four turning points of the journey everything swells together.
import { lerp, smoothstep } from "./math";
import { timeline } from "./timeline";

const SA = 233.08; // B-flat 3; the recorded shankh is tuned to Ma, a fourth above
const hz = (semitones: number) => SA * Math.pow(2, semitones / 12);

/** The journey's four turning points: her eyes open, the third eye opens, Bisarjan, the last diya. */
export const SWELL_AT = [0.235, 0.66, 0.8, 0.93];

// Choir voicings, in semitones from Sa, cycled every CHORD_SECONDS.
const CHORDS = [
  [-12, -5, 0], // Sa Pa Sa
  [-7, -3, 2], // Ma Dha Re
  [-5, 0, 5], // Pa Sa Ma
  [-10, -3, 0], // Re Dha Sa
];
const CHORD_SECONDS = 8;

// Tanpura: Pa, Sa, Sa, and the low Sa, over and over.
const TANPURA = [-17, -12, -12, -24];
const PLUCK_SECONDS = 1.15;

// Bansuri phrases as [semitones from Sa, beats]; one beat is BEAT seconds.
const BEAT = 0.62;
const FLUTE = 0.09;
const PHRASES = {
  // Rising from Sa to Ma and settling back: the dawn of Mahalaya.
  dawn: [
    [12, 3],
    [14, 1.5],
    [17, 2.5],
    [14, 1],
    [12, 4],
  ],
  // Dha, Sa, Re and down to Pa.
  longing: [
    [9, 2],
    [12, 1.5],
    [14, 1],
    [12, 1],
    [9, 1.5],
    [7, 4],
  ],
  // The farewell: all the way down to Sa.
  farewell: [
    [7, 2],
    [9, 1],
    [12, 3],
    [9, 1],
    [7, 1],
    [5, 1.5],
    [2, 1.5],
    [0, 6],
  ],
} satisfies Record<string, [number, number][]>;

// The bed stays low so the dhak, and each swell, can rise above it.
function choirLevel(p: number) {
  const dawn = 0.05;
  const wake = 0.05 * smoothstep(0.2, 0.3, p);
  const fervour = 0.08 * smoothstep(0.5, 0.56, p) * (1 - 0.5 * smoothstep(0.77, 0.83, p));
  const farewell = 0.04 * smoothstep(0.84, 0.95, p);
  return dawn + wake + fervour + farewell;
}

/** The flute plays where the dhak does not: before Bodhon, and from Bisarjan on. */
const fluteAllowed = (p: number) => p < 0.25 || p > 0.8;

export class Score {
  private readonly ctx: AudioContext;
  private readonly noise: AudioBuffer;
  /** Heard through the river: the underwater filter applies. */
  private readonly muffled: GainNode;
  /** Above the river: the flute and the shimmer stay clear. */
  private readonly clear: GainNode;
  private readonly reverb: ConvolverNode;

  private choir!: GainNode;
  private choirVoices: OscillatorNode[][] = [];
  private tanpura!: GainNode;
  private sub!: GainNode;

  private nextPluck = 0;
  private pluck = 0;
  private nextChord = 0;
  private chord = 0;
  private nextPhrase = 0;
  private phraseIndex = 0;
  private bloom = 0;
  private lastUpdate = 0;

  constructor(ctx: AudioContext, noise: AudioBuffer, muffledOut: AudioNode, clearOut: AudioNode) {
    this.ctx = ctx;
    this.noise = noise;

    // A long, dark hall for the music, longer than the pandal reverb on the drums.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(5.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    this.reverb.connect(wet).connect(muffledOut);

    this.muffled = ctx.createGain();
    this.muffled.connect(muffledOut);
    const muffledSend = ctx.createGain();
    muffledSend.gain.value = 0.5;
    this.muffled.connect(muffledSend).connect(this.reverb);

    this.clear = ctx.createGain();
    this.clear.connect(clearOut);
    const clearReverb = ctx.createConvolver();
    clearReverb.buffer = this.impulse(4.5);
    const clearSend = ctx.createGain();
    clearSend.gain.value = 0.6;
    this.clear.connect(clearSend).connect(clearReverb).connect(clearOut);
  }

  start() {
    const now = this.ctx.currentTime;
    this.startChoir();
    this.startSub();
    this.tanpura = this.ctx.createGain();
    this.tanpura.gain.value = 0.09;
    this.tanpura.connect(this.muffled);
    this.nextPluck = now + 0.3;
    this.nextChord = now + CHORD_SECONDS;
    this.nextPhrase = now + 2.5;
  }

  /** Called every scheduler tick; plans the next notes a little ahead of time. */
  schedule(p: number, horizon: number) {
    const ctx = this.ctx;
    while (this.nextPluck < horizon) {
      this.pluckTanpura(this.nextPluck, TANPURA[this.pluck % TANPURA.length]);
      this.pluck++;
      this.nextPluck += PLUCK_SECONDS * (0.97 + Math.random() * 0.06);
    }
    if (this.nextChord < horizon) {
      this.chord = (this.chord + 1) % CHORDS.length;
      this.setChord(CHORDS[this.chord], this.nextChord, 1.2);
      this.nextChord += CHORD_SECONDS;
    }
    if (this.nextPhrase < horizon) {
      if (fluteAllowed(p)) {
        const names: (keyof typeof PHRASES)[] = p < 0.5 ? ["dawn", "longing"] : ["farewell", "longing"];
        const phrase = PHRASES[names[this.phraseIndex % names.length]];
        this.phraseIndex++;
        const length = this.bansuri(this.nextPhrase, phrase);
        this.nextPhrase += length + 5 + Math.random() * 3;
      } else {
        this.nextPhrase = ctx.currentTime + 1;
      }
    }
  }

  /** Levels follow the scroll; `bloom` decays after each swell. */
  update(p: number) {
    const now = this.ctx.currentTime;
    this.bloom *= Math.exp(-Math.max(0, now - this.lastUpdate) / 3.5);
    this.lastUpdate = now;
    const t = timeline(p);
    this.choir.gain.setTargetAtTime(choirLevel(p) + this.bloom * 0.22, now, 0.35);
    this.sub.gain.setTargetAtTime(0.06 + 0.05 * t.third + this.bloom * 0.08, now, 0.5);
    this.tanpura.gain.setTargetAtTime(lerp(0.09, 0.05, smoothstep(0.5, 0.56, p) * (1 - smoothstep(0.77, 0.83, p))), now, 0.5);
  }

  /** The goosebumps: a reverse cymbal rising into a low boom, the choir blooming, a high shimmer. */
  swell(strength = 1) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const peak = now + 2.2;
    this.bloom = strength;
    // Resolve to Sa-Pa-Sa at the peak, whatever chord was playing.
    this.setChord(CHORDS[0], peak - 0.6, 0.5);
    this.chord = 0;
    this.nextChord = peak + CHORD_SECONDS;

    // Reverse cymbal: filtered noise that rises and cuts off at the peak.
    const rise = ctx.createGain();
    rise.gain.setValueAtTime(0.0001, now);
    rise.gain.exponentialRampToValueAtTime(0.4 * strength, peak - 0.05);
    rise.gain.linearRampToValueAtTime(0, peak + 0.05);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.7;
    band.frequency.setValueAtTime(1500, now);
    band.frequency.exponentialRampToValueAtTime(9000, peak);
    this.noiseSource(now, 2.4, band);
    band.connect(rise).connect(this.muffled);

    // A low boom at the peak.
    const boom = ctx.createGain();
    boom.gain.setValueAtTime(0, peak);
    boom.gain.linearRampToValueAtTime(0.7 * strength, peak + 0.02);
    boom.gain.exponentialRampToValueAtTime(0.0001, peak + 3.2);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(hz(-36) * 1.5, peak);
    osc.frequency.exponentialRampToValueAtTime(hz(-36), peak + 0.6);
    osc.connect(boom).connect(this.muffled);
    osc.start(peak);
    osc.stop(peak + 3.4);

    // Shimmer: Sa, Pa and Sa two octaves up, fading in and ringing out into the hall.
    for (const [semi, level] of [
      [24, 0.05],
      [31, 0.035],
      [36, 0.025],
    ]) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, peak - 0.3);
      g.gain.linearRampToValueAtTime(level * strength, peak + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, peak + 7);
      const s = ctx.createOscillator();
      s.frequency.value = hz(semi);
      const t = ctx.createOscillator();
      t.frequency.value = 0.3 + Math.random() * 0.4;
      const tg = ctx.createGain();
      tg.gain.value = level * 0.4 * strength;
      t.connect(tg).connect(g.gain);
      s.connect(g).connect(this.clear);
      s.start(peak - 0.3);
      t.start(peak - 0.3);
      s.stop(peak + 7.2);
      t.stop(peak + 7.2);
    }
  }

  // ─── Voices ─────────────────────────────────────────────────────────────────

  private startSub() {
    const ctx = this.ctx;
    this.sub = ctx.createGain();
    this.sub.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.frequency.value = hz(-24);
    const fifth = ctx.createOscillator();
    fifth.frequency.value = hz(-17);
    const fifthGain = ctx.createGain();
    fifthGain.gain.value = 0.35;
    osc.connect(this.sub);
    fifth.connect(fifthGain).connect(this.sub);
    this.sub.connect(this.muffled);
    osc.start();
    fifth.start();
  }

  /** A wordless "aah": pairs of detuned saws through the formants of an open vowel. */
  private startChoir() {
    const ctx = this.ctx;
    this.choir = ctx.createGain();
    this.choir.gain.value = 0;
    const mix = ctx.createGain();
    mix.gain.value = 0.16;
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 3400;
    for (const [frequency, q, level] of [
      [780, 7, 1],
      [1180, 9, 0.55],
      [2800, 11, 0.22],
    ]) {
      const formant = ctx.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.value = frequency;
      formant.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = level * 4;
      mix.connect(formant).connect(g).connect(soften);
    }
    soften.connect(this.choir).connect(this.muffled);

    // A slow, shared vibrato so the voices breathe together.
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 4.8;
    const depth = ctx.createGain();
    depth.gain.value = 6;
    vibrato.connect(depth);
    vibrato.start();

    this.choirVoices = CHORDS[0].map((semi) =>
      [-9, 0, 8].map((cents) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = hz(semi);
        osc.detune.value = cents;
        depth.connect(osc.detune);
        osc.connect(mix);
        osc.start();
        return osc;
      }),
    );

    // A little breath through the same vowel.
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    breath.loop = true;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.05;
    breath.connect(breathGain).connect(mix);
    breath.start();
  }

  private setChord(chord: number[], time: number, glide: number) {
    this.choirVoices.forEach((voice, i) =>
      voice.forEach((osc) => osc.frequency.setTargetAtTime(hz(chord[i]), time, glide / 3)),
    );
  }

  private pluckTanpura(time: number, semi: number) {
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.5, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 4.2);
    // The jawari's buzz: a bright tone that closes slowly, with a shimmer of detuning.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(3200, time);
    filter.frequency.exponentialRampToValueAtTime(520, time + 2.4);
    filter.connect(env).connect(this.tanpura);
    for (const cents of [-4, 5]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = hz(semi);
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + 4.3);
    }
    setTimeout(() => env.disconnect(), (time - ctx.currentTime + 4.6) * 1000);
  }

  /** One breath of bansuri: meend (glides) between notes, vibrato that blooms on long notes. */
  private bansuri(time: number, phrase: [number, number][]) {
    const ctx = this.ctx;
    const length = phrase.reduce((sum, [, beats]) => sum + beats * BEAT, 0);
    const end = time + length;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, time);
    out.gain.linearRampToValueAtTime(FLUTE, time + 0.25);
    out.gain.setValueAtTime(FLUTE, end - 1.2);
    out.gain.exponentialRampToValueAtTime(0.0001, end + 0.4);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2800;
    tone.connect(out).connect(this.clear);

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    overtone.type = "triangle";
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = 0.12;
    osc.connect(tone);
    overtone.connect(overtoneGain).connect(tone);

    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.value = 0;
    vibrato.connect(depth);
    depth.connect(osc.detune);
    depth.connect(overtone.detune);

    let at = time;
    phrase.forEach(([semi, beats], i) => {
      const duration = beats * BEAT;
      const f = hz(semi);
      if (i === 0) {
        osc.frequency.setValueAtTime(f, at);
        overtone.frequency.setValueAtTime(f * 2, at);
      } else {
        osc.frequency.setTargetAtTime(f, at, 0.045);
        overtone.frequency.setTargetAtTime(f * 2, at, 0.045);
        // A small dip in breath at each new note.
        out.gain.setTargetAtTime(FLUTE * 0.7, at - 0.03, 0.02);
        out.gain.setTargetAtTime(FLUTE, at + 0.05, 0.06);
      }
      depth.gain.setTargetAtTime(0, at, 0.02);
      if (duration > 1) depth.gain.setTargetAtTime(14, at + 0.45, 0.35);
      at += duration;
    });

    for (const node of [osc, overtone, vibrato]) {
      node.start(time);
      node.stop(end + 0.5);
    }

    // Breath noise, strongest at the start of the phrase.
    const breath = ctx.createGain();
    breath.gain.setValueAtTime(0, time);
    breath.gain.linearRampToValueAtTime(0.03, time + 0.08);
    breath.gain.exponentialRampToValueAtTime(0.006, time + 0.6);
    breath.gain.setValueAtTime(0.006, end - 0.5);
    breath.gain.exponentialRampToValueAtTime(0.0001, end + 0.3);
    const breathTone = ctx.createBiquadFilter();
    breathTone.type = "bandpass";
    breathTone.frequency.value = 2400;
    breathTone.Q.value = 0.8;
    this.noiseSource(time, length + 0.5, breathTone);
    breathTone.connect(breath).connect(this.clear);

    return length;
  }

  private noiseSource(time: number, duration: number, destination: AudioNode) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    source.connect(destination);
    source.start(time, Math.random() * 0.5);
    source.stop(time + duration);
  }

  private impulse(seconds: number) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      // Early reflections thin, the tail dense and dark.
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.6 + white * 0.4;
        data[i] = last * Math.pow(1 - i / length, 2.4);
      }
    }
    return buffer;
  }
}
