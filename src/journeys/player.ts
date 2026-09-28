import type { Score } from "./types";
import { Voices } from "./voices";

const LOOKAHEAD = 0.15;
const TICK_MS = 25;

/** Runs one journey's score: the audio context, the scheduler clock and the mute. */
export class Player {
  private ctx: AudioContext | null = null;
  private output!: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private scheduled = 0;
  private progress = 0;
  private previous = 0;
  private enabled = false;
  private started = false;

  constructor(private readonly score: Score) {}

  async enable() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.output = ctx.createGain();
      this.output.gain.value = 0;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 6;
      this.output.connect(limiter).connect(ctx.destination);
    }
    const ctx = this.ctx;
    await ctx.resume();
    if (!this.started) {
      this.score.start(new Voices(ctx, this.output));
      this.started = true;
    }
    this.enabled = true;
    this.output.gain.cancelScheduledValues(ctx.currentTime);
    this.output.gain.setTargetAtTime(0.8, ctx.currentTime, 0.3);
    this.scheduled = ctx.currentTime + 0.05;
    this.previous = this.progress;
    this.timer ??= setInterval(() => this.tick(), TICK_MS);
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

  /** Every frame, with the smoothed scroll progress. */
  update(p: number) {
    this.progress = p;
    if (this.ctx && this.enabled) this.score.update(p, this.previous, this.ctx.currentTime);
    this.previous = p;
  }

  on(event: string) {
    if (this.ctx && this.enabled) this.score.on?.(event, this.ctx.currentTime + 0.01);
  }

  destroy() {
    this.disable();
    void this.ctx?.close();
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    if (this.scheduled < ctx.currentTime) this.scheduled = ctx.currentTime;
    if (horizon > this.scheduled) {
      this.score.schedule(this.scheduled, horizon, this.progress);
      this.scheduled = horizon;
    }
  }
}
