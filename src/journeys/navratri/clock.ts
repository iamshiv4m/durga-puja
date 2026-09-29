// The garba's pulse, shared by the score and the scene: while the sound is on, the score says
// where its dhol is, so the dancers clap and turn on its beats; with the sound off, the scene
// keeps its own time.

export const beat = {
  /** The score's audio clock, once it has started. */
  ctx: null as AudioContext | null,
  /** The most recently scheduled pulse: its index from the start, and when it falls. */
  index: 0,
  time: 0,
  period: 0.27,
  /** performance.now() when the score last heard from the page; stale means the sound is off. */
  seen: -1e9,
};

/** The pulse the dhol is on right now, counting fractions, or null if the sound is off. */
export function heardPulse() {
  const ctx = beat.ctx;
  if (!ctx || ctx.state !== "running" || performance.now() - beat.seen > 250) return null;
  const latency = (ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
  return beat.index + (ctx.currentTime - latency - beat.time) / beat.period;
}

/** How fiercely Ravana is burning, 0..1, set by the scene for the score's roar and crackers. */
export const heat = { level: 0 };
