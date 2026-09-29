// What the scene and the score share, so the painted drummers, dancers and rowers keep time with
// what you hear. The score writes the audio clock here every frame while the sound is on; the
// scene reads it, and runs its own clock when the sound is off.
import { smoothstep } from "@/lib/math";
import { MOMENTS } from "./world";

const clock = { audio: 0, perf: 0 };

export function tickClock(audio: number) {
  clock.audio = audio;
  clock.perf = performance.now();
}

/** The audio clock now, or null if the sound is off. */
export function audioNow(): number | null {
  const since = performance.now() - clock.perf;
  if (since > 300) return null;
  return clock.audio + since / 1000;
}

/** Pulikali: sixteen steps to the bar of thakil and udukku. */
export const PULI_STEP = 0.16;
/** Thiruvathira: one beat of the song, clapped. */
export const CLAP_BEAT = 0.46;

/** The boat song: the time of each stroke, as scheduled, and the reader's push on the oars. */
export type Beat = { t: number; n: number };
export const rowing = { boost: 0, strokes: [] as Beat[] };

/** Seconds between strokes: quicker as the boats race, quicker still when the reader urges them on. */
export function strokePeriod(p: number, boost: number) {
  const race = smoothstep(MOMENTS.river[0], MOMENTS.river[1], p);
  return Math.max(0.36, 1.0 - 0.34 * race - 0.22 * boost);
}

/** The panchari melam's beat, from its slow first kalam to its fastest. */
export function melamBeat(p: number) {
  const t = smoothstep(MOMENTS.melam[0], MOMENTS.melam[1] - 0.004, p);
  // Kalams halve the beat; within each, a gentle push.
  const stages = [0.44, 0.34, 0.26, 0.2, 0.155];
  const k = Math.min(stages.length - 1, Math.floor(t * stages.length));
  return stages[k] * (1 - 0.06 * ((t * stages.length) % 1));
}

export const melam = { beats: [] as Beat[] };

/** Where we are between the last scheduled beat and the next (0..1), and which beat it is. */
export function phaseOf(beats: Beat[], now: number, period: number) {
  let last = -1;
  for (let i = beats.length - 1; i >= 0; i--) {
    if (beats[i].t <= now) {
      last = i;
      break;
    }
  }
  if (last < 0 || now - beats[last].t > period * 2) return null;
  const next = beats[last + 1]?.t ?? beats[last].t + period;
  return {
    phase: Math.min(1, (now - beats[last].t) / Math.max(0.05, next - beats[last].t)),
    n: beats[last].n,
  };
}

/** Keeps the last few beats. */
export function remember(beats: Beat[], beat: Beat) {
  beats.push(beat);
  if (beats.length > 12) beats.splice(0, beats.length - 12);
}
