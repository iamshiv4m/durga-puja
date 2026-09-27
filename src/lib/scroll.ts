import { clamp } from "./math";

type Listener = (progress: number) => void;

/** Shared scroll state, read every frame by both the DOM captions and the WebGL stage. */
export const scroll = { raw: 0, smooth: 0 };

const listeners = new Set<Listener>();

export function onScrollFrame(listener: Listener) {
  listeners.add(listener);
  listener(scroll.smooth);
  return () => {
    listeners.delete(listener);
  };
}

/** Tracks progress through `journey` (0 at its top, 1 when its bottom meets the viewport's). */
export function trackScroll(journey: HTMLElement) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame = 0;
  let last = performance.now();

  const measure = () => {
    const rect = journey.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    scroll.raw = travel > 0 ? clamp(-rect.top / travel) : 0;
  };

  measure();
  scroll.smooth = scroll.raw;

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    measure();
    const follow = reduced ? 1 : 1 - Math.exp(-dt * 5);
    scroll.smooth += (scroll.raw - scroll.smooth) * follow;
    if (Math.abs(scroll.raw - scroll.smooth) < 1e-5) scroll.smooth = scroll.raw;
    listeners.forEach((listener) => listener(scroll.smooth));
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
