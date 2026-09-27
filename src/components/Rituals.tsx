"use client";

import { useEffect, useRef } from "react";
import { smoothstep } from "@/lib/math";
import { isPortrait } from "@/lib/screen";
import { scroll } from "@/lib/scroll";
import { getState } from "@/lib/store";
import { timeline, type Timeline } from "@/lib/timeline";

// One ritual for each region, drawn in 2D over the stage.
// Bengal: the reader takes up a dhunuchi for the arati, and its smoke follows the pointer.
// Bihar: Pat Khulna. The curtain is drawn across her at night and pulled back at dawn.
// Gujarat: the garba circle turns round the garbo, and on Navami the sticks come out for dandiya.

const PIXEL_RATIO_MAX = 1.5;
const TAU = Math.PI * 2;

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type Ctx = CanvasRenderingContext2D;
type Size = { width: number; height: number; seconds: number };

// ─── Bengal: dhunuchi ─────────────────────────────────────────────────────────

type Puff = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; seed: number };
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number };

function puffSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 128;
  const ctx = sprite.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(240, 232, 222, 1)");
  g.addColorStop(0.45, "rgba(225, 214, 204, 0.55)");
  g.addColorStop(1, "rgba(210, 200, 190, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return sprite;
}

class Dhunuchi {
  private pointer = { x: 0, y: 0, at: -Infinity };
  private pos = { x: 0, y: 0 };
  private vel = { x: 0, y: 0 };
  private placed = false;
  private puffs: Puff[] = [];
  private sparks: Spark[] = [];
  private emit = 0;
  private sprite = puffSprite();
  private count = 0;

  point(x: number, y: number, seconds: number) {
    this.pointer = { x, y, at: seconds };
  }

  clear() {
    this.puffs.length = 0;
    this.sparks.length = 0;
    this.placed = false;
  }

  draw(ctx: Ctx, { width, height, seconds }: Size, dt: number, presence: number) {
    const unit = Math.min(width, height);
    // With no hand on it, it swings by itself in the dancer's figure of eight.
    const idle = seconds - this.pointer.at > 2.5;
    const portrait = isPortrait(width, height);
    const s = seconds * 0.9;
    const auto = {
      x: width * (portrait ? 0.5 : 0.7) + Math.sin(s) * unit * 0.2,
      y: height * (portrait ? 0.42 : 0.64) + Math.sin(s * 2) * unit * 0.07 + (1 - presence) * unit * 0.3,
    };
    const target = idle ? auto : { x: this.pointer.x, y: this.pointer.y + unit * 0.06 };
    if (!this.placed) {
      this.pos = { ...auto };
      this.placed = true;
    }
    const follow = 1 - Math.exp(-dt * (idle ? 3 : 9));
    const nx = this.pos.x + (target.x - this.pos.x) * follow;
    const ny = this.pos.y + (target.y - this.pos.y) * follow;
    this.vel = { x: (nx - this.pos.x) / Math.max(dt, 1e-3), y: (ny - this.pos.y) / Math.max(dt, 1e-3) };
    this.pos = { x: nx, y: ny };
    const speed = Math.hypot(this.vel.x, this.vel.y);
    const tilt = Math.max(-0.5, Math.min(0.5, -this.vel.x / (unit * 4)));
    const bowl = unit * 0.056;
    const mouth = { x: this.pos.x + Math.sin(tilt) * bowl * 1.2, y: this.pos.y - Math.cos(tilt) * bowl * 1.2 };

    // Smoke: thick and white, as from burning coconut husk and dhuno resin.
    this.emit += dt * 40 * presence;
    while (this.emit >= 1) {
      this.emit -= 1;
      const seed = hash(this.count++);
      this.puffs.push({
        x: mouth.x + (seed - 0.5) * bowl,
        y: mouth.y,
        vx: -this.vel.x * 0.12 + (seed - 0.5) * unit * 0.08,
        vy: -unit * (0.16 + seed * 0.08) - this.vel.y * 0.1,
        age: 0,
        life: 3.2 + seed * 1.6,
        size: unit * (0.03 + seed * 0.02),
        seed,
      });
    }
    const sparkRate = Math.min(1, speed / (unit * 2)) * 60 * dt * presence;
    for (let k = 0; k < sparkRate + (hash(this.count + 1) < 0.08 ? 1 : 0); k++) {
      const seed = hash(this.count++ * 3.1);
      this.sparks.push({
        x: mouth.x + (seed - 0.5) * bowl,
        y: mouth.y,
        vx: -this.vel.x * 0.25 + (seed - 0.5) * unit * 0.3,
        vy: -unit * (0.2 + hash(this.count) * 0.3),
        age: 0,
        life: 0.6 + seed * 0.8,
      });
    }

    ctx.globalCompositeOperation = "screen";
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      if (p.age > p.life) {
        this.puffs.splice(i, 1);
        continue;
      }
      const k = p.age / p.life;
      p.vx += Math.sin(p.age * 1.7 + p.seed * 20) * unit * 0.05 * dt;
      p.vx *= 1 - dt * 0.4;
      p.vy *= 1 - dt * 0.25;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const r = p.size * (0.6 + k * 5);
      ctx.globalAlpha = 0.11 * smoothstep(0, 0.22, k) * Math.pow(1 - k, 1.3) * presence;
      ctx.drawImage(this.sprite, p.x - r, p.y - r, r * 2, r * 2);
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.age += dt;
      if (p.age > p.life) {
        this.sparks.splice(i, 1);
        continue;
      }
      p.vy += unit * 0.1 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = (1 - p.age / p.life) * presence;
      ctx.fillStyle = p.age < p.life * 0.3 ? "#ffe2a0" : "#ff7a2a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, unit * 0.0025 + 0.6, 0, TAU);
      ctx.fill();
    }

    // Glow of the embers on the air round the pot.
    const glow = ctx.createRadialGradient(mouth.x, mouth.y, 0, mouth.x, mouth.y, bowl * 3.4);
    const flicker = 0.8 + 0.2 * Math.sin(seconds * 13) * Math.sin(seconds * 7.3);
    glow.addColorStop(0, `rgba(255, 150, 60, ${0.55 * flicker})`);
    glow.addColorStop(1, "rgba(255, 80, 20, 0)");
    ctx.globalAlpha = presence;
    ctx.fillStyle = glow;
    ctx.fillRect(mouth.x - bowl * 3.4, mouth.y - bowl * 3.4, bowl * 6.8, bowl * 6.8);

    // The dhunuchi itself: a terracotta bowl on a waisted stem, painted with bands.
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(tilt);
    ctx.globalAlpha = presence;
    const b = bowl;
    const clay = ctx.createLinearGradient(-b * 1.3, 0, b * 1.3, 0);
    clay.addColorStop(0, "#3d140a");
    clay.addColorStop(0.35, "#a4471f");
    clay.addColorStop(0.6, "#c7632e");
    clay.addColorStop(1, "#4a180b");
    // Base and stem, which the hand holds.
    ctx.fillStyle = clay;
    ctx.beginPath();
    ctx.moveTo(-b * 0.28, -b * 0.1);
    ctx.quadraticCurveTo(-b * 0.12, b * 0.7, -b * 0.62, b * 1.3);
    ctx.lineTo(b * 0.62, b * 1.3);
    ctx.quadraticCurveTo(b * 0.12, b * 0.7, b * 0.28, -b * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, b * 1.3, b * 0.62, b * 0.14, 0, 0, TAU);
    ctx.fill();
    // Bowl.
    ctx.beginPath();
    ctx.moveTo(-b * 1.25, -b * 1.2);
    ctx.bezierCurveTo(-b * 1.1, -b * 0.2, -b * 0.5, b * 0.05, 0, b * 0.05);
    ctx.bezierCurveTo(b * 0.5, b * 0.05, b * 1.1, -b * 0.2, b * 1.25, -b * 1.2);
    ctx.closePath();
    ctx.fill();
    // Painted bands: white and red, as the potters do them.
    ctx.lineWidth = b * 0.07;
    ctx.strokeStyle = "rgba(245, 230, 210, 0.85)";
    ctx.beginPath();
    ctx.moveTo(-b * 1.12, -b * 0.8);
    ctx.quadraticCurveTo(0, -b * 0.35, b * 1.12, -b * 0.8);
    ctx.stroke();
    ctx.strokeStyle = "rgba(190, 30, 25, 0.9)";
    ctx.beginPath();
    ctx.moveTo(-b * 0.92, -b * 0.5);
    ctx.quadraticCurveTo(0, -b * 0.1, b * 0.92, -b * 0.5);
    ctx.stroke();
    ctx.fillStyle = "rgba(245, 230, 210, 0.85)";
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * b * 0.26, -b * 0.62 + Math.abs(i) * -b * 0.03, b * 0.045, 0, TAU);
      ctx.fill();
    }
    // Rim and the burning husk inside.
    ctx.fillStyle = "#2a0d06";
    ctx.beginPath();
    ctx.ellipse(0, -b * 1.2, b * 1.25, b * 0.24, 0, 0, TAU);
    ctx.fill();
    const ember = ctx.createRadialGradient(0, -b * 1.22, 0, 0, -b * 1.22, b * 1.1);
    ember.addColorStop(0, `rgba(255, 230, 150, ${flicker})`);
    ember.addColorStop(0.4, "rgba(255, 110, 30, 0.95)");
    ember.addColorStop(1, "rgba(120, 20, 5, 0.9)");
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.ellipse(0, -b * 1.2, b * 1.08, b * 0.17, 0, 0, TAU);
    ctx.fill();
    // Tongues of flame.
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * b * 0.36;
      const h = b * (0.45 + 0.35 * Math.abs(Math.sin(seconds * (6 + i) + i * 2)));
      const f = ctx.createLinearGradient(0, -b * 1.2, 0, -b * 1.2 - h);
      f.addColorStop(0, "rgba(255, 170, 60, 0.9)");
      f.addColorStop(1, "rgba(255, 90, 20, 0)");
      ctx.fillStyle = f;
      ctx.beginPath();
      ctx.moveTo(x - b * 0.18, -b * 1.18);
      ctx.quadraticCurveTo(x - b * 0.05 + tilt * b, -b * 1.2 - h * 0.6, x + tilt * b * 1.5, -b * 1.2 - h);
      ctx.quadraticCurveTo(x + b * 0.05 + tilt * b, -b * 1.2 - h * 0.6, x + b * 0.18, -b * 1.18);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

// ─── Bihar: Pat Khulna ───────────────────────────────────────────────────────

const PAT_FOLDS = 9;

/** A Madhubani fish, double-outlined and hatched, facing right. The pair of fish is a blessing. */
function drawFish(ctx: Ctx, x: number, y: number, length: number, flip: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -length : length, length);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.bezierCurveTo(0.3, -0.26, -0.2, -0.26, -0.34, 0);
    ctx.bezierCurveTo(-0.2, 0.26, 0.3, 0.26, 0.5, 0);
    ctx.closePath();
  };
  ctx.lineJoin = "round";
  ctx.fillStyle = "#f3b73a";
  body();
  ctx.fill();
  ctx.strokeStyle = "#1a0b06";
  ctx.lineWidth = 0.035;
  body();
  ctx.stroke();
  ctx.save();
  ctx.scale(0.86, 0.78);
  ctx.translate(0.02, 0);
  body();
  ctx.restore();
  ctx.lineWidth = 0.018;
  ctx.stroke();
  // Scales in rows of arcs.
  ctx.lineWidth = 0.014;
  for (let row = -1; row <= 1; row++) {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-0.1 + i * 0.1, row * 0.075, 0.045, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  }
  // Tail.
  ctx.fillStyle = "#1f8a4c";
  ctx.beginPath();
  ctx.moveTo(-0.32, 0);
  ctx.lineTo(-0.52, -0.18);
  ctx.quadraticCurveTo(-0.46, 0, -0.52, 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 0.025;
  ctx.stroke();
  // Eye.
  ctx.fillStyle = "#fff4dc";
  ctx.beginPath();
  ctx.arc(0.34, -0.04, 0.05, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1a0b06";
  ctx.beginPath();
  ctx.arc(0.35, -0.04, 0.02, 0, TAU);
  ctx.fill();
  ctx.restore();
}

class Pat {
  private last = 1;
  private lag = 0;

  draw(ctx: Ctx, { width, height, seconds }: Size, dt: number, t: Timeline) {
    const closed = 1 - t.pat;
    // The cloth's lower edge trails behind the rod as it is pulled.
    const velocity = (closed - this.last) / Math.max(dt, 1e-3);
    this.last = closed;
    this.lag += (velocity - this.lag) * (1 - Math.exp(-dt * 4));
    if (closed < 0.001) return;

    const half = width / 2;
    const portrait = isPortrait(width, height);
    const rod = Math.max(10, height * 0.018);
    const top = rod * 1.6;
    const unit = Math.min(width, height);
    for (const side of [-1, 1] as const) {
      // Inner edge, from the middle of the screen when closed to past the outer edge when open.
      const inner = (edge: number) => half + side * (half * (1 - closed) * 1.08 + edge);
      const sway = (y: number) => {
        const k = (y - top) / (height - top);
        return side * (-this.lag * half * 0.18 * k * k + Math.sin(seconds * 0.8 + k * 3) * unit * 0.004 * k);
      };
      const outer = side < 0 ? -20 : width + 20;
      const x0 = inner(0);
      const span = Math.abs(outer - x0);

      // Red cotton in folds: the same number of folds however far it is drawn, so it bunches up.
      const cloth = ctx.createLinearGradient(x0, 0, outer, 0);
      const stops = PAT_FOLDS * 4;
      for (let i = 0; i <= stops; i++) {
        const shade = 0.72 + 0.28 * Math.cos((i / stops) * PAT_FOLDS * TAU);
        const bunched = 1 - 0.25 * t.pat;
        const r = Math.round(176 * shade * bunched);
        const g = Math.round(22 * shade * bunched);
        const b = Math.round(26 * shade * bunched);
        cloth.addColorStop(i / stops, `rgb(${r}, ${g}, ${b})`);
      }
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(outer, top);
        ctx.lineTo(x0, top);
        for (let y = top; y <= height + 10; y += 24) ctx.lineTo(inner(0) + sway(y), y);
        ctx.lineTo(outer, height + 10);
        ctx.closePath();
      };
      ctx.globalAlpha = 1;
      ctx.fillStyle = cloth;
      path();
      ctx.fill();

      // Madhubani border down the leading edge: yellow between double black lines, with triangles.
      const band = Math.max(18, unit * 0.04);
      const edgeX = (y: number, off: number) => inner(off) + sway(y);
      ctx.fillStyle = "#e9a82d";
      ctx.beginPath();
      ctx.moveTo(edgeX(top, 0), top);
      for (let y = top; y <= height + 10; y += 24) ctx.lineTo(edgeX(y, 0), y);
      for (let y = height + 10; y >= top; y -= 24) ctx.lineTo(edgeX(y, band), y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1a0b06";
      for (const [off, lw] of [
        [1.5, 2.4],
        [5, 1.1],
        [band - 5, 1.1],
        [band - 1.5, 2.4],
      ] as const) {
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let y = top; y <= height + 10; y += 24) {
          const x = edgeX(y, off);
          if (y === top) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const step = band * 0.9;
      ctx.fillStyle = "#b3161c";
      for (let y = top + step * 0.5; y < height; y += step) {
        const a = edgeX(y, 7);
        const c = edgeX(y, band - 7);
        ctx.beginPath();
        ctx.moveTo(a, y - step * 0.32);
        ctx.lineTo(c, y);
        ctx.lineTo(a, y + step * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // The pair of fish, one on each half, meeting in the middle when the curtain is shut.
      if (span > unit * 0.25) {
        const fishY = height * (portrait ? 0.36 : 0.3);
        const length = Math.min(unit * 0.28, span * 0.6);
        drawFish(ctx, inner(band + length * 0.62) + sway(fishY), fishY, length, side > 0);
      }
      // A row of white dots along the top, as on a painted wall; on a phone it would crowd the header.
      ctx.fillStyle = "rgba(255, 244, 220, 0.9)";
      for (let x = Math.min(x0, outer) + 12; !portrait && x < Math.max(x0, outer) - 6; x += 16) {
        ctx.beginPath();
        ctx.arc(x, top + 10, 2.2, 0, TAU);
        ctx.fill();
      }
    }

    // Dawn through the gap as it opens.
    const opening = smoothstep(0.02, 0.4, t.pat) * (t.pat < 1 ? 1 : 0) * smoothstep(0.37, 0.4, scroll.smooth);
    if (opening > 0.001) {
      const gap = half * (1 - closed) * 1.08;
      const g = ctx.createLinearGradient(half - gap - unit * 0.1, 0, half + gap + unit * 0.1, 0);
      g.addColorStop(0, "rgba(255, 200, 120, 0)");
      g.addColorStop(0.5, `rgba(255, 220, 160, ${0.28 * Math.sin(Math.PI * t.pat)})`);
      g.addColorStop(1, "rgba(255, 200, 120, 0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
    }

    // The rod it hangs from, with brass finials.
    ctx.globalAlpha = smoothstep(0, 0.3, closed);
    const brass = ctx.createLinearGradient(0, top - rod, 0, top);
    brass.addColorStop(0, "#f6d27a");
    brass.addColorStop(0.5, "#b07a22");
    brass.addColorStop(1, "#5a3a0c");
    ctx.fillStyle = brass;
    ctx.fillRect(0, top - rod, width, rod);
    ctx.fillStyle = "#f3cf73";
    for (let x = 12; x < width; x += Math.max(36, width / 30)) {
      ctx.beginPath();
      ctx.arc(x, top - rod * 0.5, rod * 0.38, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Gujarat: garba ──────────────────────────────────────────────────────────

const CHANIYA = ["#8a1030", "#1d5c3a", "#b0461a", "#3a1f70", "#a01470", "#0f4c6e", "#9a6b10"];

function drawDancer(
  ctx: Ctx,
  x: number,
  y: number,
  h: number,
  facing: number,
  beat: number,
  dandiya: number,
  colour: string,
  light: number,
  seconds: number,
  seed: number,
) {
  // The step: three claps and a turn. `beat` counts claps; each clap lifts the arms and the heel.
  const phase = beat % 1;
  const lift = Math.pow(Math.sin(Math.PI * phase), 2);
  const bob = -lift * h * 0.025;
  const flare = 0.5 + 0.5 * Math.sin(beat * Math.PI * 0.66 + seed * 6);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(h * facing, h);
  const lean = 0.05 * Math.sin(beat * Math.PI * 0.66 + seed * 6);

  // Chaniya: a wide skirt that swings out with the turn, sewn with mirrors.
  const hem = 0.22 + flare * 0.08;
  const swing = lean * 0.6;
  const skirt = ctx.createLinearGradient(-hem, 0, hem, 0);
  skirt.addColorStop(0, "#0b0305");
  skirt.addColorStop(0.5 - 0.3 * light, colour);
  skirt.addColorStop(1, "#0b0305");
  ctx.fillStyle = skirt;
  ctx.beginPath();
  ctx.moveTo(-0.05 + lean, -0.58);
  ctx.quadraticCurveTo(-0.12 + swing, -0.3, -hem + swing, -0.05);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    ctx.lineTo(-hem + swing + u * hem * 2, -0.05 + Math.sin(u * Math.PI * 5 + seconds * 3 + seed * 9) * 0.012);
  }
  ctx.quadraticCurveTo(0.12 + swing, -0.3, 0.05 + lean, -0.58);
  ctx.closePath();
  ctx.fill();
  // Border at the hem.
  ctx.strokeStyle = "rgba(230, 170, 60, 0.7)";
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  ctx.moveTo(-hem + swing + 0.01, -0.07);
  ctx.lineTo(hem + swing - 0.01, -0.07);
  ctx.stroke();

  // Legs and feet under the hem.
  ctx.fillStyle = "#0b0305";
  ctx.fillRect(-0.06 + swing * 0.5, -0.06, 0.035, 0.06 - lift * 0.02);
  ctx.fillRect(0.03 + swing * 0.5, -0.06, 0.035, 0.06);

  // Choli and body.
  ctx.fillStyle = "#130508";
  ctx.beginPath();
  ctx.moveTo(-0.075 + lean, -0.8);
  ctx.quadraticCurveTo(-0.07 + lean, -0.66, -0.05 + lean, -0.57);
  ctx.lineTo(0.05 + lean, -0.57);
  ctx.quadraticCurveTo(0.07 + lean, -0.66, 0.075 + lean, -0.8);
  ctx.closePath();
  ctx.fill();
  // Head, with the hair in a bun.
  ctx.beginPath();
  ctx.arc(lean * 1.1, -0.87, 0.058, 0, TAU);
  ctx.arc(lean * 1.1 - 0.05, -0.88, 0.032, 0, TAU);
  ctx.fill();
  // Odhni: the veil falling down the back, in the skirt's colour.
  ctx.strokeStyle = colour;
  ctx.globalAlpha *= 0.85;
  ctx.lineWidth = 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(lean - 0.02, -0.9);
  ctx.quadraticCurveTo(-0.14 + lean - flare * 0.05, -0.72, -0.1 + swing - flare * 0.06, -0.48);
  ctx.stroke();
  ctx.globalAlpha /= 0.85;

  // Arms: in garba, down at the side and up to clap; in dandiya, a stick in each hand.
  ctx.strokeStyle = "#130508";
  ctx.lineWidth = 0.032;
  const up = dandiya > 0.5 ? 0.35 + 0.65 * lift : lift;
  const hands: [number, number][] = [];
  for (const arm of [-1, 1]) {
    const sx = arm * 0.07 + lean;
    const sy = -0.79;
    const reach = arm * (0.16 - up * 0.1);
    const elbow: [number, number] = [sx + arm * 0.09, sy + 0.12 - up * 0.2];
    const hand: [number, number] = [sx + reach, sy + 0.2 - up * 0.42];
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(...elbow);
    ctx.lineTo(...hand);
    ctx.stroke();
    hands.push(hand);
  }
  if (dandiya > 0.01) {
    ctx.globalAlpha *= dandiya;
    ctx.strokeStyle = "#e8b14a";
    ctx.lineWidth = 0.016;
    for (const [hx, hy] of hands) {
      ctx.beginPath();
      ctx.moveTo(hx, hy + 0.04);
      ctx.lineTo(hx + (hx > lean ? 0.05 : -0.05), hy - 0.17);
      ctx.stroke();
    }
    ctx.globalAlpha /= dandiya;
  }

  // Mirror-work glinting in the lamplight.
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const tw = Math.sin(seconds * (3 + hash(seed * 50 + i) * 4) + i * 7);
    if (tw < 0.55) continue;
    const u = hash(seed * 31 + i);
    const v = hash(seed * 17 + i * 3);
    const gx = (-hem + swing) * (0.3 + v * 0.7) + u * hem * 2 * (0.3 + v * 0.7);
    const gy = -0.5 + v * 0.42;
    ctx.fillStyle = `rgba(255, 240, 200, ${(tw - 0.55) * 2 * light})`;
    ctx.beginPath();
    ctx.arc(gx, gy, 0.012, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // Where they clap, or the sticks meet, a spark.
  const hit = Math.max(0, 1 - Math.abs(phase - 0.5) * 8);
  if (hit > 0 && dandiya > 0.5) {
    ctx.globalCompositeOperation = "lighter";
    const cx = (hands[0][0] + hands[1][0]) / 2;
    const cy = Math.min(hands[0][1], hands[1][1]) - 0.15;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.07);
    g.addColorStop(0, `rgba(255, 245, 210, ${hit})`);
    g.addColorStop(1, "rgba(255, 180, 80, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - 0.07, cy - 0.07, 0.14, 0.14);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}

/** The garbo: a clay pot pierced all over, with a lamp burning inside. */
function drawGarbo(ctx: Ctx, x: number, y: number, r: number, seconds: number) {
  const flicker = 0.85 + 0.15 * Math.sin(seconds * 11) * Math.sin(seconds * 6.1);
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(x, y - r, 0, x, y - r, r * 7);
  glow.addColorStop(0, `rgba(255, 170, 70, ${0.45 * flicker})`);
  glow.addColorStop(1, "rgba(255, 90, 20, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 7, y - r * 8, r * 14, r * 14);
  ctx.globalCompositeOperation = "source-over";

  const clay = ctx.createRadialGradient(x - r * 0.3, y - r * 1.2, r * 0.1, x, y - r, r * 1.2);
  clay.addColorStop(0, "#c8622a");
  clay.addColorStop(1, "#4a1a0a");
  ctx.fillStyle = clay;
  ctx.beginPath();
  ctx.ellipse(x, y - r, r, r * 0.92, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - r * 0.38, y - r * 2.05, r * 0.76, r * 0.3);
  // Painted bands.
  ctx.strokeStyle = "rgba(245, 225, 190, 0.8)";
  ctx.lineWidth = r * 0.06;
  for (const k of [-0.45, 0.35]) {
    ctx.beginPath();
    ctx.ellipse(x, y - r + k * r, r * Math.sqrt(1 - k * k) * 0.98, r * 0.12, 0, 0, Math.PI);
    ctx.stroke();
  }
  // The holes, lit from inside.
  ctx.globalCompositeOperation = "lighter";
  for (let row = 0; row < 3; row++) {
    const ky = -0.25 + row * 0.3;
    const n = 7 - Math.abs(row - 1) * 2;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5;
      const hx = x + u * r * 1.6 * Math.sqrt(1 - ky * ky);
      const hy = y - r + ky * r;
      const fade = 1 - Math.abs(u) * 1.3;
      ctx.fillStyle = `rgba(255, 210, 120, ${fade * flicker})`;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.07, 0, TAU);
      ctx.fill();
    }
  }
  // The flame at the mouth.
  const f = ctx.createLinearGradient(x, y - r * 2, x, y - r * 2.9);
  f.addColorStop(0, "rgba(255, 220, 140, 1)");
  f.addColorStop(1, "rgba(255, 110, 30, 0)");
  ctx.fillStyle = f;
  const fh = r * (0.7 + 0.2 * flicker);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.16, y - r * 2.02);
  ctx.quadraticCurveTo(x - r * 0.1, y - r * 2 - fh * 0.6, x + Math.sin(seconds * 3) * r * 0.05, y - r * 2 - fh);
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 2 - fh * 0.6, x + r * 0.16, y - r * 2.02);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

class Garba {
  private angle = 0;
  private beat = 0;

  draw(ctx: Ctx, size: Size, dt: number, presence: number, p: number) {
    const { width, height, seconds } = size;
    const portrait = isPortrait(width, height);
    // The circle quickens over the nine nights, and on Navami the sticks come out.
    const quicken = smoothstep(0.4, 0.66, p);
    this.angle += dt * (0.16 + 0.14 * quicken);
    this.beat += dt * (1.3 + 0.6 * quicken);
    const dandiya = smoothstep(0.6, 0.64, p) * (1 - smoothstep(0.73, 0.76, p));
    const count = portrait ? 9 : 14;
    const cx = width / 2;
    // On a phone the captions fill the bottom, so the circle dances round the foot of the cloth instead.
    const ground = height * (portrait ? 0.56 : 0.9);
    const rx = width * (portrait ? 0.44 : 0.4);
    const ry = rx * 0.2;
    const tall = Math.min(height * (portrait ? 0.11 : 0.2), width * 0.24);
    const rise = (1 - presence) * tall * 0.9;

    const dancers = Array.from({ length: count }, (_, i) => {
      const a = this.angle + (i / count) * TAU;
      return { i, a, depth: Math.sin(a) };
    }).sort((u, v) => u.depth - v.depth);

    ctx.globalAlpha = presence;
    // Warm light on the ground inside the circle.
    const floor = ctx.createRadialGradient(cx, ground, 0, cx, ground, rx * 1.1);
    floor.addColorStop(0, "rgba(255, 140, 50, 0.28)");
    floor.addColorStop(1, "rgba(255, 90, 20, 0)");
    ctx.save();
    ctx.translate(cx, ground);
    ctx.scale(1, 0.2);
    ctx.translate(-cx, -ground);
    ctx.fillStyle = floor;
    ctx.fillRect(cx - rx * 1.2, ground - rx * 1.2, rx * 2.4, rx * 2.4);
    ctx.restore();

    const place = (d: (typeof dancers)[number]) => {
      const scale = 0.68 + 0.42 * (d.depth + 1) * 0.5;
      const x = cx + Math.cos(d.a) * rx;
      const y = ground + d.depth * ry + rise;
      // Facing the way the circle turns; lit from the garbo on the side facing in.
      const facing = d.depth >= 0 ? -1 : 1;
      const light = 0.35 + 0.65 * (1 - Math.abs(Math.cos(d.a))) * (d.depth < 0 ? 1 : 0.5);
      const beat = this.beat + (d.i % 2) * 0.08;
      drawDancer(ctx, x, y, tall * scale, facing, beat, dandiya, CHANIYA[d.i % CHANIYA.length], light, seconds, d.i + 1);
    };
    dancers.filter((d) => d.depth < 0).forEach(place);
    drawGarbo(ctx, cx, ground + rise, tall * 0.17, seconds);
    dancers.filter((d) => d.depth >= 0).forEach(place);
    ctx.globalAlpha = 1;
  }
}

// ─── The overlay ─────────────────────────────────────────────────────────────

export function Rituals() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dhunuchi = new Dhunuchi();
    const pat = new Pat();
    const garba = new Garba();
    const size: Size = { width: 0, height: 0, seconds: 0 };
    let last = performance.now();
    let frame = 0;
    let drawn = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX);
      size.width = window.innerWidth;
      size.height = element.clientHeight || window.innerHeight;
      element.width = Math.round(size.width * ratio);
      element.height = Math.round(size.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const point = (x: number, y: number) => {
      const rect = element.getBoundingClientRect();
      dhunuchi.point(x - rect.left, y - rect.top, size.seconds);
    };
    const pointer = (event: PointerEvent) => point(event.clientX, event.clientY);
    const touch = (event: TouchEvent) => event.touches[0] && point(event.touches[0].clientX, event.touches[0].clientY);

    const tick = (now: number) => {
      const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      size.seconds += dt;
      const p = scroll.smooth;
      const t = timeline(p);
      const style = getState().style;
      const presence =
        style === "bengal" ? t.dhunuchi : style === "madhubani" ? 1 - t.pat : style === "pachedi" ? t.garba * (1 - t.dive) : 0;
      if (presence > 0.001) {
        context.clearRect(0, 0, size.width, size.height);
        if (style === "bengal") dhunuchi.draw(context, size, dt, presence);
        else if (style === "madhubani") pat.draw(context, size, dt, t);
        else garba.draw(context, size, dt, presence, p);
        drawn = true;
      } else {
        if (style === "madhubani") pat.draw(context, size, dt, t);
        if (drawn) {
          context.clearRect(0, 0, size.width, size.height);
          dhunuchi.clear();
          drawn = false;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointer);
    window.addEventListener("pointerdown", pointer);
    window.addEventListener("touchmove", touch, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("pointerdown", pointer);
      window.removeEventListener("touchmove", touch);
    };
  }, []);

  return <canvas ref={canvas} id="ritual" aria-hidden="true" />;
}
