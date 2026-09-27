// The puja's sounds. The dhak and shankh are real recordings from Wikimedia Commons, used
// under their open licences (public/sound/CREDITS.md, built by tools/make_sounds.py). The
// kansar, ghanta, Gujarat's garba dhol and clapping, and the background score are
// synthesised with the Web Audio API. If a recording fails to load, a synthesised
// stand-in plays instead.
import { lerp, smoothstep } from "./math";
import { SWELL_AT, Score } from "./score";
import type { PaintingStyle } from "./styles";
import { timeline } from "./timeline";

type Loop = { url: string; start: number; length: number };

export const SOUND = {
  /** The slow dhak of Bodhon, and of her leaving. Plays from `start` for `length` seconds, then loops. */
  dhakCalm: { url: "/sound/dhak-calm.m4a", start: 1, length: 13.03 } as Loop | null,
  /** The fast dhak of the arati, from Sandhi to the third eye. */
  dhakArati: { url: "/sound/dhak-arati.m4a", start: 1, length: 12.01 } as Loop | null,
  shankhUrl: "/sound/shankh.m4a" as string | null,
  /** The recorded conch sounds D; this lifts it a semitone to Ma, a fourth above the score's Sa. */
  shankhRate: 1.0565,
};

/** The shankh is blown as the scroll crosses these points: Bodhon, Sandhi, the third eye, Bisarjan. */
const SHANKH_AT = [0.27, 0.53, 0.66, 0.8];
// Her third eye's fire strikes Mahishasura's shadow.
const FIRE_AT = 0.69;
/** A last bell as the single diya is left floating on the river. */
const FAREWELL_AT = 0.93;

// One bar of sixteenth notes. B = bayan (the deep head), t = the thin kathi stick on the
// treble head, k = a rim click, . = rest.
const CALM = "B..t..t.B.t..t..";
const ARATI = "BtktBttkBkttBtkt";

// Garba, in twelve triplet steps to the bar: the dhol's lilting "dha-ge-na", and the circle
// clapping three times (tran taali) on the first half of each bar.
const GARBA_CALM = "B.tB.tB..B.t";
const GARBA_FAST = "B.tBttB.tBtk";
const GARBA_CLAPS = [0, 3, 6];

/** Gains for the recordings, set so they sit with the score like the synthesised versions did. */
const DHAK_LEVEL = 0.7;
const SHANKH_LEVEL = 0.6;

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

function dhakLevel(p: number) {
  const wake = smoothstep(0.26, 0.3, p) * 0.55;
  const fervour = smoothstep(0.51, 0.55, p) * 0.45;
  const leave = 1 - smoothstep(0.84, 0.92, p);
  return (wake + fervour * (1 - smoothstep(0.76, 0.8, p) * 0.4)) * leave;
}

/** How far the recorded dhak has moved from the slow rhythm to the arati. */
function aratiMix(p: number) {
  return smoothstep(0.51, 0.55, p) * (1 - smoothstep(0.76, 0.8, p));
}

function dhakTempo(p: number) {
  if (p < 0.51) return 96;
  if (p < 0.77) return lerp(96, 132, smoothstep(0.51, 0.56, p));
  return lerp(132, 84, smoothstep(0.77, 0.84, p));
}

class PujaAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bus!: GainNode;
  private underwater!: BiquadFilterNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private samples: { calm?: AudioBuffer; arati?: AudioBuffer; shankh?: AudioBuffer } = {};
  private dhak: { calm: AudioBufferSourceNode; arati: AudioBufferSourceNode; calmGain: GainNode; aratiGain: GainNode } | null =
    null;
  private output!: GainNode;
  private clear!: GainNode;
  private score: Score | null = null;
  private style: PaintingStyle = "bengal";
  private swelled = new Set<number>();

  private enabled = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private progress = 0;
  private lastProgress = 0;
  private fired = new Set<number>();

  get isEnabled() {
    return this.enabled;
  }

  async enable() {
    if (!this.ctx) await this.init();
    const ctx = this.ctx!;
    await ctx.resume();
    this.enabled = true;
    this.output.gain.cancelScheduledValues(ctx.currentTime);
    this.output.gain.setTargetAtTime(0.6, ctx.currentTime, 0.3);
    this.nextTime = ctx.currentTime + 0.05;
    this.lastProgress = this.progress;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.startDhak();
    if (!this.score) {
      this.score = new Score(ctx, this.noise, this.master, this.clear);
      this.score.start();
    }
    // A single stroke of the bell, so turning sound on is always heard.
    this.bell(ctx.currentTime + 0.08, 0.35);
  }

  disable() {
    this.enabled = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    if (!ctx) return;
    this.output.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => {
      if (!this.enabled) void ctx.suspend();
    }, 600);
  }

  /** Called every frame with the smoothed scroll progress. */
  update(p: number) {
    this.progress = p;
    const ctx = this.ctx;
    if (!ctx || !this.enabled) {
      this.lastProgress = p;
      return;
    }
    for (const at of SHANKH_AT) {
      if (this.lastProgress < at && p >= at && !this.fired.has(at)) {
        this.fired.add(at);
        this.shankh(ctx.currentTime + 0.05);
      }
      // Scrolling well back re-arms the conch, so it sounds again on the way forward.
      if (p < at - 0.03) this.fired.delete(at);
    }
    if (this.lastProgress < FIRE_AT && p >= FIRE_AT && p < FIRE_AT + 0.02) this.fire(ctx.currentTime + 0.02);
    if (this.lastProgress < FAREWELL_AT && p >= FAREWELL_AT) this.bell(ctx.currentTime + 0.05, 0.4);
    SWELL_AT.forEach((at, i) => {
      if (this.lastProgress < at && p >= at && !this.swelled.has(at)) {
        this.swelled.add(at);
        this.score?.swell(i === SWELL_AT.length - 1 ? 0.6 : 1);
      }
      if (p < at - 0.03) this.swelled.delete(at);
    });
    this.lastProgress = p;
    this.score?.update(p);

    // As the river closes over her, everything is heard from underwater.
    // Inside the third eye the puja outside is heard only faintly, until the flash.
    const { water, inside, flash } = timeline(p);
    const cutoff = lerp(16000, 320, Math.max(smoothstep(0.3, 0.8, water), inside * (1 - flash) * 0.8));
    this.underwater.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.15);
    if (this.dhak) {
      const level = this.style === "pachedi" ? 0 : dhakLevel(p) * DHAK_LEVEL;
      const mix = aratiMix(p);
      this.dhak.calmGain.gain.setTargetAtTime(level * (1 - mix), ctx.currentTime, 0.25);
      this.dhak.aratiGain.gain.setTargetAtTime(level * mix * 1.2, ctx.currentTime, 0.25);
      // The drummers tire as she is carried to the river.
      this.dhak.calm.playbackRate.setTargetAtTime(lerp(1, 0.93, smoothstep(0.78, 0.86, p)), ctx.currentTime, 0.3);
    }
  }

  /** Bengal and Bihar keep the dhak; Gujarat's circle dances to the garba dhol and claps. */
  setStyle(style: PaintingStyle) {
    this.style = style;
  }

  /** A temple hand bell, rung twice. */
  ghanta() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime + 0.02;
    this.bell(t, 0.5);
    this.bell(t + 0.2, 0.32);
  }

  pause() {
    if (this.ctx && this.enabled) void this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.enabled) {
      void this.ctx.resume();
      this.nextTime = this.ctx.currentTime + 0.05;
    }
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  private async init() {
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 1;
    // The on/off volume, after everything else.
    this.output = ctx.createGain();
    this.output.gain.value = 0;
    this.underwater = ctx.createBiquadFilter();
    this.underwater.type = "lowpass";
    this.underwater.frequency.value = 16000;
    this.underwater.Q.value = 0.8;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    // A brick-wall stage after the glue compressor so dhak transients never clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    this.master.connect(this.underwater).connect(compressor).connect(limiter).connect(this.output).connect(ctx.destination);
    // Parts of the score that stay above the water skip the underwater filter.
    this.clear = ctx.createGain();
    this.clear.connect(compressor);

    // Everything plays into `bus`; part of it is sent through a pandal-sized reverb.
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.32;
    this.bus.connect(this.reverbSend).connect(reverb).connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // The recordings load in the background; the synthesised stand-ins play until they arrive.
    if (SOUND.shankhUrl) void this.load(SOUND.shankhUrl).then((b) => (this.samples.shankh = b));
    if (SOUND.dhakCalm && SOUND.dhakArati) {
      void Promise.all([this.load(SOUND.dhakCalm.url), this.load(SOUND.dhakArati.url)]).then(([calm, arati]) => {
        if (!calm || !arati) return;
        this.samples.calm = calm;
        this.samples.arati = arati;
        if (this.enabled) this.startDhak();
      });
    }

    document.addEventListener("visibilitychange", () => (document.hidden ? this.pause() : this.resume()));
  }

  private async load(url: string) {
    try {
      const response = await fetch(url);
      return await this.ctx!.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      console.error(`Could not load ${url}`, error);
      return undefined;
    }
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    return buffer;
  }

  /** Starts both recorded dhak loops, silent; `update` fades between them with the scroll. */
  private startDhak() {
    const { calm, arati } = this.samples;
    if (this.dhak || !calm || !arati || !SOUND.dhakCalm || !SOUND.dhakArati) return;
    const ctx = this.ctx!;
    const play = (buffer: AudioBuffer, loop: Loop) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = loop.start;
      source.loopEnd = loop.start + loop.length;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain).connect(this.bus);
      source.start(ctx.currentTime + 0.05, loop.start);
      return { source, gain };
    };
    const c = play(calm, SOUND.dhakCalm);
    const a = play(arati, SOUND.dhakArati);
    this.dhak = { calm: c.source, arati: a.source, calmGain: c.gain, aratiGain: a.gain };
  }

  // ─── The rhythm ───────────────────────────────────────────────────────────

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    this.score?.schedule(this.progress, ctx.currentTime + LOOKAHEAD + 0.3);
    const garba = this.style === "pachedi";
    if (this.dhak && !garba) return;
    const steps = garba ? 12 : 16;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.02;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      if (garba) this.playGarbaStep(this.step % steps, this.nextTime);
      else this.playStep(this.step % steps, this.nextTime);
      this.nextTime += 60 / dhakTempo(this.progress) / (garba ? 3 : 4);
      this.step = (this.step + 1) % steps;
    }
  }

  private playStep(step: number, time: number) {
    const level = dhakLevel(this.progress);
    if (level < 0.01) return;
    const arati = this.progress >= 0.53 && this.progress < 0.77;
    const stroke = (arati ? ARATI : CALM)[step];
    const accent = step % 4 === 0 ? 1 : 0.72;
    const human = time + (Math.random() - 0.5) * 0.008;
    const velocity = level * accent * (0.85 + Math.random() * 0.15);

    if (stroke === "B") this.bayan(human, velocity);
    if (stroke === "t") this.kathi(human, velocity * 0.8);
    if (stroke === "k") this.rim(human, velocity * 0.6);
    // The kansar, a brass plate struck alongside the dhak once the arati begins.
    if (arati ? step % 2 === 0 : step % 8 === 4) this.kansar(human, level * (arati ? 0.4 : 0.18));
  }

  private playGarbaStep(step: number, time: number) {
    const level = dhakLevel(this.progress);
    if (level < 0.01) return;
    const fast = this.progress >= 0.53 && this.progress < 0.77;
    const stroke = (fast ? GARBA_FAST : GARBA_CALM)[step];
    const accent = step % 3 === 0 ? 1 : 0.7;
    const human = time + (Math.random() - 0.5) * 0.01;
    const velocity = level * accent * (0.85 + Math.random() * 0.15);

    if (stroke === "B") this.bayan(human, velocity * 0.9);
    if (stroke === "t") this.kathi(human, velocity * 0.7);
    if (stroke === "k") this.rim(human, velocity * 0.5);
    if (GARBA_CLAPS.includes(step)) this.claps(human, level * (fast ? 0.9 : 0.6));
    // Manjira, the small hand cymbals, on every beat once the circle speeds up.
    if (fast ? step % 3 === 0 : step === 9) this.kansar(human, level * (fast ? 0.3 : 0.15), 1.5);
  }

  /** A circle of dancers clapping: several hands, never quite together. */
  private claps(time: number, velocity: number) {
    const ctx = this.ctx!;
    for (let hand = 0; hand < 6; hand++) {
      const t = time + Math.random() * 0.025;
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      const env = this.out(t, 0.2);
      env.disconnect();
      env.connect(pan).connect(this.bus);
      setTimeout(() => pan.disconnect(), (t - ctx.currentTime + 0.8) * 1000);
      env.gain.setValueAtTime(0.22 * velocity, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + Math.random() * 0.04);
      this.noiseBurst(t, 0.14, "bandpass", 1100 + Math.random() * 700, 1.4, env);
    }
  }

  private out(time: number, duration: number) {
    const gain = this.ctx!.createGain();
    gain.gain.value = 0;
    gain.connect(this.bus);
    setTimeout(() => gain.disconnect(), (time - this.ctx!.currentTime + duration + 0.5) * 1000);
    return gain;
  }

  private noiseBurst(time: number, duration: number, type: BiquadFilterType, frequency: number, q: number, destination: AudioNode) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    source.connect(filter).connect(destination);
    source.start(time, Math.random() * 0.8, duration);
  }

  /** The deep left head: a pitch-dropping boom with a slap of skin. */
  private bayan(time: number, velocity: number) {
    const ctx = this.ctx!;
    const env = this.out(time, 0.6);
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.9 * velocity, time + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(62, time + 0.14);
    osc.connect(env);
    osc.start(time);
    osc.stop(time + 0.55);

    const slap = this.out(time, 0.1);
    slap.gain.setValueAtTime(0.35 * velocity, time);
    slap.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    this.noiseBurst(time, 0.08, "bandpass", 800, 1.2, slap);
  }

  /** The thin bamboo stick on the treble head: bright, dry and quick. */
  private kathi(time: number, velocity: number) {
    const ctx = this.ctx!;
    const env = this.out(time, 0.2);
    env.gain.setValueAtTime(0.5 * velocity, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, time);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.1);
    osc.connect(env);
    osc.start(time);
    osc.stop(time + 0.15);

    const crack = this.out(time, 0.08);
    crack.gain.setValueAtTime(0.45 * velocity, time);
    crack.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    this.noiseBurst(time, 0.06, "bandpass", 3000, 1.6, crack);
  }

  private rim(time: number, velocity: number) {
    const env = this.out(time, 0.05);
    env.gain.setValueAtTime(0.5 * velocity, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
    this.noiseBurst(time, 0.03, "highpass", 4200, 0.8, env);
  }

  private kansar(time: number, velocity: number, pitch = 1) {
    const ctx = this.ctx!;
    const env = this.out(time, 0.4);
    env.gain.setValueAtTime(0.18 * velocity, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    for (const ratio of [1, 1.47, 2.09, 2.56]) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 1260 * ratio * pitch;
      osc.connect(env);
      osc.start(time);
      osc.stop(time + 0.3);
    }
    const shimmer = this.out(time, 0.3);
    shimmer.gain.setValueAtTime(0.3 * velocity, time);
    shimmer.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    this.noiseBurst(time, 0.25, "highpass", 6500, 0.7, shimmer);
  }

  /** A rush of fire and a low blow as the shadow burns. */
  private fire(time: number) {
    const ctx = this.ctx!;
    const rush = this.out(time, 1.8);
    rush.gain.setValueAtTime(0, time);
    rush.gain.linearRampToValueAtTime(0.5, time + 0.12);
    rush.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(300, time);
    filter.frequency.exponentialRampToValueAtTime(2400, time + 0.25);
    filter.frequency.exponentialRampToValueAtTime(500, time + 1.6);
    source.connect(filter).connect(rush);
    source.start(time, Math.random() * 0.5);
    source.stop(time + 1.7);

    const blow = this.out(time, 1.2);
    blow.gain.setValueAtTime(0, time + 0.18);
    blow.gain.linearRampToValueAtTime(0.8, time + 0.2);
    blow.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(90, time + 0.18);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.9);
    osc.connect(blow);
    osc.start(time + 0.18);
    osc.stop(time + 1.15);
  }

  // ─── Shankh and ghanta ────────────────────────────────────────────────────

  private shankh(time: number) {
    const ctx = this.ctx!;
    if (this.samples.shankh) {
      const source = ctx.createBufferSource();
      source.buffer = this.samples.shankh;
      source.playbackRate.value = SOUND.shankhRate;
      const gain = this.out(time, this.samples.shankh.duration / SOUND.shankhRate);
      gain.gain.value = SHANKH_LEVEL;
      source.connect(gain);
      source.start(time);
      return;
    }

    const duration = 3.6;
    const end = time + duration;
    const f = 233;
    const env = this.out(time, duration);
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.32, time + 0.45);
    env.gain.linearRampToValueAtTime(0.27, end - 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    // The conch's throat: a buzzing source shaped by two resonances.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    const body = ctx.createBiquadFilter();
    body.type = "peaking";
    body.frequency.value = 720;
    body.Q.value = 2.5;
    body.gain.value = 9;
    const horn = ctx.createBiquadFilter();
    horn.type = "peaking";
    horn.frequency.value = 1500;
    horn.Q.value = 3;
    horn.gain.value = 6;
    tone.connect(body).connect(horn).connect(env);

    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(9, time + 1.4);
    vibrato.connect(depth);
    vibrato.start(time);
    vibrato.stop(end);

    for (const [type, ratio, level] of [
      ["sawtooth", 1, 0.5],
      ["sawtooth", 1.004, 0.35],
      ["square", 2, 0.08],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f * ratio;
      // It starts a little flat as the breath catches, and cracks upward at the very end.
      osc.detune.setValueAtTime(-70, time);
      osc.detune.linearRampToValueAtTime(0, time + 0.5);
      osc.detune.setValueAtTime(0, end - 0.5);
      osc.detune.linearRampToValueAtTime(90, end);
      depth.connect(osc.detune);
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(tone);
      osc.start(time);
      osc.stop(end + 0.05);
    }

    const breath = this.out(time, duration);
    breath.gain.setValueAtTime(0, time);
    breath.gain.linearRampToValueAtTime(0.05, time + 0.2);
    breath.gain.linearRampToValueAtTime(0.02, end - 0.4);
    breath.gain.exponentialRampToValueAtTime(0.0001, end);
    this.noiseBurst(time, duration, "bandpass", 1800, 0.9, breath);
  }

  private bell(time: number, velocity: number) {
    const ctx = this.ctx!;
    const partials = [
      [1, 1, 2.4],
      [2.0, 0.35, 1.6],
      [2.76, 0.55, 1.3],
      [5.4, 0.25, 0.7],
      [8.93, 0.14, 0.4],
    ];
    for (const [ratio, level, decay] of partials) {
      const env = this.out(time, decay);
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.16 * level * velocity, time + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      const osc = ctx.createOscillator();
      osc.frequency.value = 880 * ratio * (1 + (Math.random() - 0.5) * 0.002);
      osc.connect(env);
      osc.start(time);
      osc.stop(time + decay + 0.05);
    }
    const strike = this.out(time, 0.05);
    strike.gain.setValueAtTime(0.1 * velocity, time);
    strike.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    this.noiseBurst(time, 0.03, "highpass", 5000, 0.7, strike);
  }
}

export const audio = new PujaAudio();
