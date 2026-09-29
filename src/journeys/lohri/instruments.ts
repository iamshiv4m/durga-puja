// Punjab's instruments, built on the shared voices' clock and bus: the tumbi's one twanging string,
// the algoza's paired flutes (one holding the drone), the harmonium of the gurdwara, the nagara,
// the chimta's jingling tongs, and voices calling "hoy!" and "balle!".
import type { Handle, Voices } from "../voices";

/** One pluck of the tumbi: a bright, nasal single string, snapping sharp and falling into tune. */
export function tumbi(v: Voices, time: number, freq: number, level = 0.05) {
  const { ctx, bus } = v;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 280;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 4;
  lp.frequency.setValueAtTime(7000, time);
  lp.frequency.exponentialRampToValueAtTime(1600, time + 0.22);
  const gain = v.envelope(time, 0.002, 0.42, level);
  hp.connect(lp).connect(gain).connect(bus);
  [
    { type: "sawtooth" as const, mult: 1, level: 1 },
    { type: "square" as const, mult: 2, level: 0.25 },
  ].forEach((part) => {
    const osc = ctx.createOscillator();
    osc.type = part.type;
    osc.frequency.setValueAtTime(freq * part.mult * 1.015, time);
    osc.frequency.exponentialRampToValueAtTime(freq * part.mult, time + 0.045);
    const g = ctx.createGain();
    g.gain.value = part.level;
    osc.connect(g).connect(hp);
    osc.start(time);
    osc.stop(time + 0.5);
  });
  v.thump(time, level * 0.4, 3200, 0.015);
}

/** The algoza's second pipe: a breathy held note under the tune, with its level on a handle. */
export function drone(v: Voices, freqs: number[], level = 0.03): Handle {
  const { ctx, bus } = v;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(bus);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.6;
  const depth = ctx.createGain();
  depth.gain.value = 1.2;
  lfo.connect(depth);
  lfo.start();
  const oscs = freqs.flatMap((f) =>
    [
      { type: "triangle" as const, mult: 1, level: 1 },
      { type: "sine" as const, mult: 2, level: 0.18 },
    ].map((part) => {
      const osc = ctx.createOscillator();
      osc.type = part.type;
      osc.frequency.value = f * part.mult;
      depth.connect(osc.detune);
      const g = ctx.createGain();
      g.gain.value = part.level / freqs.length;
      osc.connect(g).connect(out);
      osc.start();
      return osc;
    }),
  );
  // Breath through the pipe.
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freqs[0] * 3;
  band.Q.value = 3;
  const breath = ctx.createGain();
  breath.gain.value = 0.05;
  noise.connect(band).connect(breath).connect(out);
  noise.start();
  return {
    level(value, glide = 1.5) {
      out.gain.setTargetAtTime(value * level, ctx.currentTime, glide);
    },
    stop() {
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      const end = ctx.currentTime + 2;
      oscs.forEach((o) => o.stop(end));
      lfo.stop(end);
      noise.stop(end);
    },
  };
}

/** A harmonium's reeds, held as a chord: its bellows breathing, its level on a handle. */
export function harmonium(
  v: Voices,
  freqs: number[],
  level = 0.03,
): Handle & { chord(next: number[], glide?: number): void } {
  const { ctx, bus } = v;
  const out = ctx.createGain();
  out.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1900;
  filter.Q.value = 0.8;
  const breathing = ctx.createGain();
  breathing.gain.value = 1;
  filter.connect(breathing).connect(out).connect(bus);
  const bellows = ctx.createOscillator();
  bellows.frequency.value = 0.35;
  const swell = ctx.createGain();
  swell.gain.value = 0.15;
  bellows.connect(swell).connect(breathing.gain);
  bellows.start();
  const oscs = freqs.map((f) => {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 8;
    const g = ctx.createGain();
    g.gain.value = 0.5 / freqs.length;
    osc.connect(g).connect(filter);
    osc.start();
    return osc;
  });
  return {
    level(value, glide = 1.5) {
      out.gain.setTargetAtTime(value * level, ctx.currentTime, glide);
    },
    chord(next, glide = 0.4) {
      next.forEach((f, i) =>
        oscs[i]?.frequency.setTargetAtTime(f, ctx.currentTime, glide),
      );
    },
    stop() {
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      const end = ctx.currentTime + 2;
      oscs.forEach((o) => o.stop(end));
      bellows.stop(end);
    },
  };
}

/** One note on the harmonium's keys: reedy, with a soft attack as the air takes. */
export function reed(
  v: Voices,
  time: number,
  freq: number,
  duration: number,
  level = 0.04,
) {
  const { ctx, bus } = v;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(level, time + 0.05);
  gain.gain.setValueAtTime(level, time + duration);
  gain.gain.linearRampToValueAtTime(0, time + duration + 0.15);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  filter.connect(gain).connect(bus);
  [
    { type: "square" as const, mult: 1, level: 0.6, detune: -4 },
    { type: "sawtooth" as const, mult: 1, level: 0.35, detune: 5 },
    { type: "square" as const, mult: 2, level: 0.12, detune: 0 },
  ].forEach((part) => {
    const osc = ctx.createOscillator();
    osc.type = part.type;
    osc.frequency.value = freq * part.mult;
    osc.detune.value = part.detune;
    const g = ctx.createGain();
    g.gain.value = part.level;
    osc.connect(g).connect(filter);
    osc.start(time);
    osc.stop(time + duration + 0.2);
  });
}

/** The nagara, the great kettledrum: a deep, slow boom. */
export function nagara(v: Voices, time: number, level = 0.2, small = false) {
  const { ctx, bus } = v;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(small ? 110 : 82, time);
  osc.frequency.exponentialRampToValueAtTime(small ? 70 : 44, time + 0.6);
  const gain = v.envelope(time, 0.004, small ? 0.6 : 1.4, level);
  osc.connect(gain).connect(bus);
  osc.start(time);
  osc.stop(time + 1.6);
  v.thump(time, level * 0.6, 140, small ? 0.2 : 0.35);
  v.thump(time, level * 0.15, 900, 0.04);
}

/** The chimta: iron tongs clapped together, their brass jingles rattling after. */
export function chimta(v: Voices, time: number, level = 0.04) {
  v.manjira(time, level, false);
  v.manjira(time + 0.014, level * 0.5, false);
  v.manjira(time + 0.03, level * 0.3, false);
  v.thump(time, level * 0.5, 2200, 0.03);
}

/** Voices calling out together, "hoy!" or "balle!": a quick shout that jumps up and falls. */
export function shout(
  v: Voices,
  time: number,
  level = 0.05,
  pitch = 1,
  voices = 6,
) {
  const { ctx, bus } = v;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(level, time + 0.03);
  gain.gain.setValueAtTime(level, time + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
  gain.connect(bus);
  const formants = [
    [720, 1],
    [1180, 0.6],
    [2600, 0.25],
  ].map(([f, amount]) => {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = f * pitch;
    band.Q.value = 6;
    const g = ctx.createGain();
    g.gain.value = amount;
    band.connect(g).connect(gain);
    return band;
  });
  for (let i = 0; i < voices; i++) {
    const at = time + Math.random() * 0.03;
    const base = (170 + Math.random() * 110) * pitch;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(base * 0.9, at);
    osc.frequency.linearRampToValueAtTime(base * 1.25, at + 0.08);
    osc.frequency.exponentialRampToValueAtTime(base * 0.8, at + 0.4);
    formants.forEach((band) => osc.connect(band));
    osc.start(at);
    osc.stop(at + 0.45);
  }
  v.thump(time, level * 0.4, 1500, 0.1);
}

/** Popcorn bursting in the heat: a few sharp little pops. */
export function pops(v: Voices, time: number, count = 5, level = 0.03) {
  for (let i = 0; i < count; i++)
    v.thump(
      time + 0.3 + Math.random() * 0.9,
      level * (0.5 + Math.random() * 0.5),
      2200 + Math.random() * 1800,
      0.02,
    );
}
