"use client";

import { useEffect, useRef } from "react";
import { lerp, smoothstep } from "@/lib/math";
import { scroll } from "@/lib/scroll";
import { PHASES, timeline } from "@/lib/timeline";

// The inside of Durga's third eye: the fire she opens on Mahishasura. A bindu of flame breathes
// at the centre, rings in the shape of the eye widen from it, and embers stream past as fast
// as the reader scrolls. At the end the flame swells to fill everything, and fades to show
// her again.

const INK = "7, 3, 4";
const PIXEL_RATIO_MAX = 1.5;
const RINGS = 8;
const RING_SECONDS = 11;
const RING_CYCLES_PER_JOURNEY = 1.4;
const EMBERS = 170;
const EMBER_NEAR = 0.08;
const EMBER_DEPTHS_PER_JOURNEY = 2.6;
const EMBER_DRIFT = 0.012;
const BREATH_SECONDS = 5;
/** The eye is an upright almond: narrower than it is tall. */
const ALMOND = 0.56;

const fraction = (v: number) => v - Math.floor(v);

type Ember = { x: number; y: number; seed: number; size: number; hue: number };

function makeEmbers(): Ember[] {
  // Seeded so the pattern is the same on every visit.
  let s = 7;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: EMBERS }, () => {
    const angle = random() * Math.PI * 2;
    const radius = 0.2 + random() * 1.2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, seed: random(), size: 0.5 + random() * 1.3, hue: random() };
  });
}

export function ThirdEyePortal() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const embers = makeEmbers();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let seconds = 0;
    let last = performance.now();
    let frame = 0;
    let shown = -1;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX);
      width = window.innerWidth;
      height = element.clientHeight || window.innerHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (p: number, opacity: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const focal = Math.min(width, height) * 0.5;
      const journey = smoothstep(PHASES.inside[0], PHASES.flash[1], p);
      const swell = smoothstep(PHASES.flash[0], PHASES.flash[1], p);

      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      context.fillStyle = `rgb(${INK})`;
      context.fillRect(0, 0, width, height);

      // The heat of the eye, deep sindoor at the edges and gold near the flame.
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, focal * 1.8);
      glow.addColorStop(0, `rgba(226, 150, 70, ${(0.16 + 0.16 * journey).toFixed(3)})`);
      glow.addColorStop(0.45, `rgba(150, 26, 12, ${(0.16 + 0.12 * journey).toFixed(3)})`);
      glow.addColorStop(1, "rgba(90, 10, 6, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = "lighter";

      // Rings in the shape of the eye, born at the flame and widening with time and scroll.
      const phase = seconds / RING_SECONDS + journey * RING_CYCLES_PER_JOURNEY;
      const ringFade = 1 - smoothstep(0.75, 1, journey);
      context.lineWidth = 1.2;
      context.strokeStyle = "#e0a650";
      for (let i = 0; i < RINGS; i++) {
        const age = fraction(phase + i / RINGS);
        const radius = focal * 1.9 * age * age;
        context.globalAlpha = Math.sin(Math.PI * age) * 0.34 * ringFade;
        context.beginPath();
        context.ellipse(cx, cy, radius * ALMOND, radius, 0, 0, Math.PI * 2);
        context.stroke();
      }

      // Embers streaming towards the reader.
      const travel = journey * EMBER_DEPTHS_PER_JOURNEY + seconds * EMBER_DRIFT;
      for (const ember of embers) {
        const depth = EMBER_NEAR + (1 - EMBER_NEAR) * fraction(ember.seed - travel);
        const near = 1 - depth;
        context.globalAlpha = smoothstep(0, 0.3, near) * (1 - smoothstep(0.78, 0.92, near)) * 0.65;
        context.fillStyle = ember.hue < 0.55 ? "#ffb35c" : ember.hue < 0.85 ? "#ff6a2a" : "#fff0d0";
        context.beginPath();
        context.arc(cx + (ember.x / depth) * focal, cy + (ember.y / depth) * focal, ember.size * (0.6 + near * 1.6), 0, Math.PI * 2);
        context.fill();
      }

      // The flame at the centre: an upright almond that breathes, then swells into light.
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      const breath = 1 + 0.09 * Math.sin((seconds * Math.PI * 2) / BREATH_SECONDS);
      const radius = focal * lerp(0.085, 2.3, swell * swell) * breath;
      const narrow = lerp(ALMOND, 1, swell);
      context.save();
      context.translate(cx, cy);
      context.scale(narrow, 1);
      const flame = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      flame.addColorStop(0, "rgba(255, 249, 232, 1)");
      flame.addColorStop(0.2, "rgba(255, 214, 150, 0.85)");
      flame.addColorStop(0.5, "rgba(230, 110, 40, 0.3)");
      flame.addColorStop(1, "rgba(180, 40, 12, 0)");
      context.fillStyle = flame;
      context.fillRect(-width / narrow, -height, (width * 2) / narrow, height * 2);
      context.restore();

      element.style.opacity = opacity.toFixed(3);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) seconds += dt;
      const p = scroll.smooth;
      const opacity = timeline(p).inside;
      if (opacity > 0.001) draw(p, opacity);
      else if (shown !== 0) element.style.opacity = "0";
      shown = opacity > 0.001 ? 1 : 0;
      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} id="third-eye" aria-hidden="true" />;
}
