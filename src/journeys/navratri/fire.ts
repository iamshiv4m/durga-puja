// Fire and fireworks for Dussehra, and sparks for the dandiya: particles that live in the world's
// ground-and-height space, so they sit right however the camera tilts.
import { TAU, glow, glowSprite, type Ctx } from "../paint";
import type { Tilt } from "./world";

type Kind = "flame" | "ember" | "spark" | "flash" | "smoke" | "rocket";

type Particle = {
  kind: Kind;
  x: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
  vh: number;
  age: number;
  life: number;
  size: number;
  color: string;
  /** Rockets burst into this colour. */
  burst?: string;
};

const MAX = 1400;
const FIRE = "255, 130, 40";
const HOT = "255, 214, 140";
const SMOKE = "36, 28, 34";

export const FIREWORK_COLOURS = ["255, 90, 70", "255, 210, 90", "120, 230, 140", "120, 170, 255", "255, 120, 220", "255, 250, 230"];

export class Particles {
  private list: Particle[] = [];
  /** Called when a rocket bursts, so the score can crack. */
  onBurst: (() => void) | null = null;

  get count() {
    return this.list.length;
  }

  private add(p: Particle) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  flame(x: number, z: number, h: number, size: number) {
    this.add({ kind: "flame", x, z, h, vx: (Math.random() - 0.5) * 0.6, vz: 0, vh: 1.6 + Math.random() * 2.2, age: 0, life: 0.5 + Math.random() * 0.7, size, color: FIRE });
  }

  ember(x: number, z: number, h: number) {
    this.add({ kind: "ember", x, z, h, vx: (Math.random() - 0.5) * 2.5, vz: (Math.random() - 0.5) * 1, vh: 2 + Math.random() * 5, age: 0, life: 1.2 + Math.random() * 2, size: 0.05, color: HOT });
  }

  smoke(x: number, z: number, h: number) {
    this.add({ kind: "smoke", x, z, h, vx: 0.3 + Math.random() * 0.4, vz: 0, vh: 1 + Math.random() * 0.8, age: 0, life: 4 + Math.random() * 3, size: 1 + Math.random(), color: SMOKE });
  }

  flash(x: number, z: number, h: number) {
    this.add({ kind: "flash", x, z, h, vx: 0, vz: 0, vh: 0, age: 0, life: 0.14, size: 1.2 + Math.random(), color: "255, 250, 230" });
    for (let i = 0; i < 10; i++) this.ember(x, z, h);
  }

  rocket(x: number, z: number, h: number, color: string) {
    this.add({ kind: "rocket", x, z, h, vx: (Math.random() - 0.5) * 2, vz: 0, vh: 13 + Math.random() * 5, age: 0, life: 0.9 + Math.random() * 0.4, size: 0.1, color: HOT, burst: color });
  }

  /** A ring of sparks thrown out from a point, for fireworks and struck sticks. */
  burst(x: number, z: number, h: number, color: string, count: number, speed: number, life = 1.6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const b = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.7 + Math.random() * 0.3);
      this.add({
        kind: "spark",
        x,
        z,
        h,
        vx: Math.cos(a) * Math.sin(b) * s,
        vz: Math.sin(a) * Math.sin(b) * s * 0.4,
        vh: Math.cos(b) * s,
        age: 0,
        life: life * (0.6 + Math.random() * 0.4),
        size: 0.06,
        color,
      });
    }
  }

  update(dt: number) {
    const next: Particle[] = [];
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) {
        if (p.kind === "rocket" && p.burst) {
          this.burst(p.x, p.z, p.h, p.burst, 60, 5.5);
          this.onBurst?.();
        }
        continue;
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.h += p.vh * dt;
      if (p.kind === "spark" || p.kind === "ember") {
        p.vh -= 3.2 * dt;
        p.vx *= 1 - 1.2 * dt;
        p.vz *= 1 - 1.2 * dt;
      } else if (p.kind === "rocket") {
        p.vh -= 6 * dt;
      } else if (p.kind === "smoke") {
        p.size += dt * 0.9;
        p.vh *= 1 - 0.15 * dt;
      }
      next.push(p);
    }
    this.list = next;
  }

  /** The smoke, drawn over the world in ordinary paint. */
  drawSmoke(g: Ctx, t: Tilt) {
    const sprite = glowSprite(SMOKE);
    for (const p of this.list) {
      if (p.kind !== "smoke") continue;
      const k = p.age / p.life;
      const alpha = Math.sin(k * Math.PI) * 0.55;
      glow(g, sprite, p.x, p.z * t.s - p.h * t.c, p.size, alpha);
    }
  }

  /** Everything that gives light, drawn in the "lighter" pass. */
  drawLight(g: Ctx, t: Tilt) {
    for (const p of this.list) {
      if (p.kind === "smoke") continue;
      const k = p.age / p.life;
      const x = p.x;
      const y = p.z * t.s - p.h * t.c;
      if (p.kind === "flame") {
        const size = p.size * (1 - k * 0.6);
        glow(g, glowSprite(FIRE), x, y, size * 1.6, 0.55 * (1 - k));
        glow(g, glowSprite(HOT), x, y, size * 0.6, 0.7 * (1 - k));
      } else if (p.kind === "flash") {
        glow(g, glowSprite(p.color), x, y, p.size * 2.5, 1 - k);
      } else if (p.kind === "rocket") {
        glow(g, glowSprite(HOT), x, y, 0.5, 0.9);
        glow(g, glowSprite(FIRE), x, y + 0.3, 0.35, 0.6);
      } else {
        const alpha = (1 - k) * (p.kind === "spark" ? 1 : 0.8);
        glow(g, glowSprite(p.color), x, y, p.kind === "spark" ? 0.35 : 0.22, alpha * 0.8);
        g.globalAlpha = alpha;
        g.fillStyle = `rgba(${p.color}, 1)`;
        g.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
        g.globalAlpha = 1;
      }
    }
  }

  clear() {
    this.list = [];
  }
}
