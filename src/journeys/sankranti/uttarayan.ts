// Uttarayan in the sky: every terrace's kite on its manja, swooping and bobbing; the pech, when
// two strings cross and one kite is cut loose; the reader's own kite, flown by dragging; and
// after dark the tukkal, paper lanterns tied one above another on a kite string, and fireworks.
import { TAU, clamp, glow, glowSprite, lerp, mix, mulberry32, rgb, rise, type Ctx, type RGB } from "../paint";
import type { Emit } from "../types";
import { drawKite, kiteSprites, linesCross, stringPoints, strokeLine, type P } from "./kites";
import { POL, MOMENTS, spanX, type World } from "./world";
import { ROWS, TERRACE, type Anchor } from "./pol";

type Kite = {
  anchor: Anchor;
  sprite: number;
  size: number;
  home: P;
  /** When it goes up, as scroll progress, and when it is reeled in for the night. */
  launch: number;
  reel: number;
  seed: number;
  /** How far up its string it is, 0 on the roof, 1 flying. */
  up: number;
  x: number;
  y: number;
  loose: boolean;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  /** Seconds it has been in a pech with the reader's string; and when it may fly again. */
  pech: number;
  back: number;
  string: P[];
};

type Chain = {
  anchor: P;
  top: P;
  lanterns: number;
  launch: number;
  born: number;
  seed: number;
  colors: RGB[];
  size: number;
};
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: RGB;
};
type Burst = {
  x: number;
  y: number;
  born: number;
  color: RGB;
  n: number;
  seed: number;
  r: number;
};

const PAPER: RGB[] = [
  [255, 90, 50],
  [255, 170, 60],
  [255, 236, 200],
  [255, 120, 90],
];
const FIREWORK: RGB[] = [
  [255, 200, 120],
  [255, 110, 150],
  [140, 220, 255],
  [255, 240, 200],
  [180, 255, 150],
];
const TUKKAL = "255, 130, 60";
const MAX_SPARKS = 200;

export class Uttarayan {
  private readonly kites: Kite[] = [];
  private readonly chains: Chain[] = [];
  private readonly released: Chain[] = [];
  private sparks: Spark[] = [];
  private bursts: Burst[] = [];
  private readonly emit: Emit;
  private readonly me = {
    x: POL + 3.8,
    y: TERRACE - 6,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    up: 0,
    angle: 0,
    flap: 0,
    held: false,
    lastMove: -10,
    string: [] as P[],
  };
  private hand: P = { x: POL + 1.3, y: TERRACE - 0.8 };
  private cutDone = new Set<number>();
  private lastPech = -10;
  private nextBurst = 0;
  private previous = 0;
  private readonly ours: Chain = {
    anchor: { x: 0, y: 0 },
    top: { x: 0, y: 0 },
    lanterns: 5,
    launch: 0,
    born: 0,
    seed: 3,
    colors: [PAPER[0], PAPER[2], PAPER[1], PAPER[0], PAPER[3]],
    size: 0.24,
  };

  constructor(anchors: Anchor[], emit: Emit) {
    this.emit = emit;
    const random = mulberry32(1414);
    anchors.forEach((a, i) => {
      const lift = 0.4 + a.depth * 0.36;
      const home = {
        x: (0.6 + random() * 3.2) * lift + (random() < 0.2 ? -2 : 0),
        y: -(2.2 + random() ** 0.8 * 5.5) * lift,
      };
      this.kites.push({
        anchor: a,
        sprite: i % 28,
        size: 0.12 + a.depth * 0.14,
        home,
        launch: 0.418 + random() * 0.05,
        reel: 0.775 + random() * 0.035,
        seed: random() * 10,
        up: 0,
        x: a.x,
        y: a.y,
        loose: false,
        vx: 0,
        vy: 0,
        spin: 0,
        angle: 0,
        pech: 0,
        back: 0,
        string: [],
      });
    });
    // The tukkal that go up after dark, from the terraces all over the pol.
    const hands = anchors.filter((_, i) => i % 2 === 0);
    hands.forEach((a) => {
      const lift = 0.4 + a.depth * 0.36;
      const colors = Array.from({ length: 6 }, () => PAPER[Math.floor(random() * PAPER.length)]);
      this.chains.push({
        anchor: { x: a.x, y: a.y },
        top: {
          x: a.x + (0.4 + random() * 2.4) * lift,
          y: a.y - (3 + random() * 5) * lift,
        },
        lanterns: 3 + Math.floor(random() * 4),
        launch: 0.785 + random() * 0.09,
        born: 0,
        seed: random() * 10,
        colors,
        size: 0.1 + a.depth * 0.05,
      });
    });
  }

  /** Where the reader's kite flies; the flyer's hand is passed in each frame. */
  setHand(hand: P) {
    this.hand = hand;
  }

  /** Drag: the kite follows. */
  steer(x: number, y: number, seconds: number, held: boolean) {
    const m = this.me;
    m.held = held;
    if (!held) return;
    m.tx = clamp(x, this.hand.x - 9, this.hand.x + 11);
    m.ty = clamp(y, this.hand.y - 11, TERRACE - 2.2);
    m.lastMove = seconds;
  }

  /** A touch after dark: a new chain of tukkal goes up from the nearest terrace towards it. */
  release(x: number, y: number, seconds: number) {
    const from = {
      x: clamp(x, this.hand.x - 6, this.hand.x + 6) - 1.2,
      y: TERRACE - 0.9,
    };
    const random = mulberry32(Math.floor(seconds * 1000));
    this.released.push({
      anchor: from,
      top: { x, y: Math.min(y, TERRACE - 3) - 0.8 },
      lanterns: 4 + Math.floor(random() * 3),
      launch: 0,
      born: seconds,
      seed: random() * 10,
      colors: Array.from({ length: 7 }, () => PAPER[Math.floor(random() * PAPER.length)]),
      size: 0.2,
    });
    if (this.released.length > 10) this.released.shift();
  }

  private dark = 0;
  private active = false;

  /** Moves every kite for this frame. */
  update(w: World) {
    const { v, p, dt, seconds, reduced, env } = w;
    const [left, right] = spanX(v, 6);
    this.active = right > POL - 60 && left < POL + 60;
    if (!this.active) return;
    const sunset = rise(p, 0.66, 0.74) * (1 - rise(p, 0.79, 0.83));
    this.dark = clamp(clamp(1.05 - env.amb * 1.15) * 0.85 + sunset * 0.45);
    const pech = rise(p, MOMENTS.pech[0] - 0.01, MOMENTS.pech[0] + 0.01) * (1 - rise(p, MOMENTS.pech[1], MOMENTS.pech[1] + 0.02));
    const wind = Math.sin(seconds * 0.23) * 0.5 + 0.5;
    for (const k of this.kites) {
      const flying = p > k.launch && p < k.reel;
      const target = flying ? 1 : 0;
      if (reduced) k.up = target;
      else k.up += (target - k.up) * (1 - Math.exp(-dt * (target ? 0.9 : 1.6)));
      if (k.loose) {
        k.vx += (0.7 + wind * 0.5 - k.vx) * dt * 0.5;
        k.vy += (0.5 - k.vy) * dt * 0.4;
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        k.angle += k.spin * dt;
        if (seconds > k.back) {
          // Someone downwind has it now; a fresh kite goes up from the same roof.
          k.loose = false;
          k.up = 0;
          k.pech = 0;
        }
        continue;
      }
      if (k.up < 0.01) {
        k.string.length = 0;
        continue;
      }
      const s = 0.4 + k.anchor.depth * 0.36;
      // Bobbing, a slow drift, and in the pech hours big swoops across the sky.
      const swoop = pech * Math.sin(seconds * 0.35 + k.seed * 3) * 1.6 * s;
      const hx = k.anchor.x + k.home.x + Math.sin(seconds * 0.5 + k.seed) * 0.25 * s + swoop + wind * 0.4 * s;
      const hy = k.anchor.y + k.home.y + Math.sin(seconds * 0.8 + k.seed * 2) * 0.18 * s + Math.abs(swoop) * 0.2;
      const nx = lerp(k.anchor.x, hx, k.up);
      const ny = lerp(k.anchor.y, hy, k.up);
      k.vx = dt > 0 ? (nx - k.x) / dt : 0;
      k.x = nx;
      k.y = ny;
      k.angle = clamp(k.vx * 0.3, -0.7, 0.7) + Math.sin(seconds * 2.1 + k.seed) * 0.08;
      stringPoints(k.anchor, k, 0.12, 0.3, 8, k.string);
    }
  }

  /** The kites flown from one row of roofs: strings, then the kites over them. */
  fleet(w: World, row: number) {
    if (!this.active) return;
    const { ctx, v, seconds } = w;
    const depth = ROWS[row];
    const [left, right] = spanX(v, 1);
    const sprites = kiteSprites();
    const dark = this.dark;
    ctx.lineCap = "round";
    ctx.strokeStyle = rgb(mix([250, 240, 240], [40, 30, 40], dark), 0.3 + row * 0.04);
    ctx.lineWidth = (0.7 + row * 0.15) / v.scale;
    ctx.beginPath();
    for (const k of this.kites) {
      if (k.anchor.depth !== depth || k.loose || k.string.length < 2) continue;
      if (Math.min(k.x, k.anchor.x) > right || Math.max(k.x, k.anchor.x) < left) continue;
      ctx.moveTo(k.string[0].x, k.string[0].y);
      for (let i = 1; i < k.string.length; i++) ctx.lineTo(k.string[i].x, k.string[i].y);
    }
    ctx.stroke();
    for (const k of this.kites) {
      if (k.anchor.depth !== depth || k.loose || k.up < 0.02) continue;
      if (k.x < left || k.x > right) continue;
      drawKite(ctx, sprites[k.sprite], k.x, k.y, k.size * (0.6 + 0.4 * k.up), k.angle, dark, 1, Math.sin(seconds * 9 + k.seed) * 0.4 + 0.4);
    }
  }

  /** The reader's kite from our terrace, the loose kites drifting, and the pech. */
  mine(w: World, flying: boolean, steerable: boolean) {
    if (!this.active) {
      this.previous = w.p;
      return;
    }
    const { ctx, v, p, dt, seconds, reduced } = w;
    const sprites = kiteSprites();
    const dark = this.dark;

    // Loose kites, trailing their cut strings, over everything.
    ctx.strokeStyle = rgb(mix([250, 240, 240], [40, 30, 40], dark), 0.4);
    ctx.lineWidth = 0.9 / v.scale;
    ctx.beginPath();
    for (const k of this.kites) {
      if (!k.loose) continue;
      ctx.moveTo(k.x, k.y);
      ctx.bezierCurveTo(k.x - 0.4, k.y + 0.8, k.x + 0.3, k.y + 1.4, k.x - 0.2 + Math.sin(seconds * 2 + k.seed) * 0.3, k.y + 2.2);
    }
    ctx.stroke();
    for (const k of this.kites) if (k.loose) drawKite(ctx, sprites[k.sprite], k.x, k.y, k.size, k.angle, dark, 1, 0.3);

    const m = this.me;
    const target = flying ? 1 : 0;
    if (reduced) m.up = target;
    else m.up += (target - m.up) * (1 - Math.exp(-dt * 1.2));
    if (m.up > 0.01) {
      if (!m.held || seconds - m.lastMove > 4) {
        // Left alone, it rides the wind in a lazy figure of eight.
        m.tx = this.hand.x + 2.8 + Math.sin(seconds * 0.4) * 1.6;
        m.ty = this.hand.y - 5.6 + Math.sin(seconds * 0.8) * 0.7;
      }
      const tx = lerp(this.hand.x, m.tx, m.up);
      const ty = lerp(this.hand.y, m.ty, m.up);
      const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      const nx = m.x + (tx - m.x) * k;
      const ny = m.y + (ty - m.y) * k;
      m.vx = dt > 0 ? (nx - m.x) / dt : 0;
      m.vy = dt > 0 ? (ny - m.y) / dt : 0;
      m.x = nx;
      m.y = ny;
      m.angle += (clamp(m.vx * 0.12, -0.8, 0.8) + Math.sin(seconds * 2.6) * 0.06 - m.angle) * (reduced ? 1 : Math.min(1, dt * 6));
      m.flap = clamp(Math.hypot(m.vx, m.vy) * 0.08) * (0.5 + 0.5 * Math.sin(seconds * 30));
      stringPoints(this.hand, m, 0.1 + 0.08 * (1 - clamp(Math.hypot(m.vx, m.vy) * 0.2)), 0.25, 14, m.string);
      ctx.strokeStyle = rgb(mix([255, 110, 150], [60, 30, 50], dark * 0.8), 0.85);
      ctx.lineWidth = 1.5 / v.scale;
      strokeLine(ctx, m.string);
      drawKite(ctx, sprites[3], m.x, m.y, 0.95, m.angle, dark * 0.9, 1, m.flap);
      if (steerable && !reduced) this.contact(w);
    } else {
      m.x = this.hand.x;
      m.y = this.hand.y;
      m.string.length = 0;
    }

    if (!reduced) this.cuts(w);
    this.glints(ctx, w);
    this.previous = p;
  }

  /** The reader's string against every other: contact saws, and a held pech cuts. */
  private contact(w: World) {
    const { dt, seconds } = w;
    const m = this.me;
    if (m.string.length < 2) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    for (const pt of m.string) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
    }
    for (const k of this.kites) {
      if (k.loose || k.up < 0.8 || k.string.length < 2) continue;
      if (Math.max(k.x, k.anchor.x) < minX || Math.min(k.x, k.anchor.x) > maxX || k.anchor.y < minY) {
        k.pech = Math.max(0, k.pech - dt);
        continue;
      }
      const hit = linesCross(m.string, k.string);
      if (!hit) {
        k.pech = Math.max(0, k.pech - dt);
        continue;
      }
      if (k.pech === 0 && seconds - this.lastPech > 0.5) {
        this.emit("pech");
        this.lastPech = seconds;
      }
      k.pech += Math.max(dt, 1 / 60);
      if (Math.random() < 0.5) this.spark(hit.at.x, hit.at.y, 2, [255, 250, 230]);
      if (k.pech > 0.5) {
        this.cut(k, hit.at, seconds);
        this.emit("cut");
      }
    }
  }

  private cut(k: Kite, at: P, seconds: number) {
    k.loose = true;
    k.vx = 0.4;
    k.vy = -0.2;
    k.spin = (Math.random() - 0.5) * 3;
    k.back = seconds + 9 + Math.random() * 5;
    k.pech = 0;
    this.spark(at.x, at.y, 16, [255, 244, 210]);
  }

  /** The pech the whole pol sees: at each of these moments one kite over the old city is cut. */
  private cuts(w: World) {
    const { p, v, seconds } = w;
    MOMENTS.cuts.forEach((point, i) => {
      if (this.previous < point && p >= point && p - point < 0.03 && !this.cutDone.has(i)) {
        this.cutDone.add(i);
        const [left, right] = spanX(v, -1);
        const candidates = this.kites.filter((k) => !k.loose && k.up > 0.9 && k.x > left && k.x < right && k.anchor.depth > 1);
        let chosen: Kite | null = null;
        let at: P | null = null;
        for (let a = 0; a < candidates.length && !chosen; a++) {
          for (let b = a + 1; b < candidates.length; b++) {
            const hit = linesCross(candidates[a].string, candidates[b].string);
            if (hit) {
              chosen = candidates[(a + b + i) % 2 ? a : b];
              at = hit.at;
              break;
            }
          }
        }
        if (!chosen && candidates.length) {
          chosen = candidates.reduce((best, k) => (Math.abs(k.x - v.x) < Math.abs(best.x - v.x) ? k : best));
          const s = chosen.string;
          at = s[Math.floor(s.length * 0.7)] ?? { x: chosen.x, y: chosen.y };
        }
        if (chosen && at) this.cut(chosen, at, seconds);
      }
      // Scrolled back past it: let it happen again.
      if (p < point - 0.01) this.cutDone.delete(i);
    });
  }

  private spark(x: number, y: number, n: number, color: RGB) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = 0.4 + Math.random() * 1.8;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        age: 0,
        life: 0.3 + Math.random() * 0.5,
        color,
      });
    }
    if (this.sparks.length > MAX_SPARKS) this.sparks.splice(0, this.sparks.length - MAX_SPARKS);
  }

  private glints(ctx: Ctx, w: World) {
    const { dt, v } = w;
    if (!this.sparks.length) return;
    ctx.globalCompositeOperation = "lighter";
    const size = 2.2 / v.scale;
    for (const s of this.sparks) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += dt * 1.5;
      const a = 1 - s.age / s.life;
      if (a <= 0) continue;
      ctx.fillStyle = rgb(s.color, a);
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    }
    ctx.globalCompositeOperation = "source-over";
    this.sparks = this.sparks.filter((s) => s.age < s.life);
  }

  /** After dark: chains of tukkal, and the fireworks over the old city. */
  night(w: World) {
    const { ctx, v, p, seconds, reduced } = w;
    const [left, right] = spanX(v, 6);
    if (right < POL - 60 || left > POL + 60) return;
    const dark = rise(p, 0.76, 0.8);
    if (dark < 0.01) return;
    const all = [
      ...this.chains.map((c) => ({
        c,
        up: rise(p, c.launch, c.launch + 0.035),
      })),
      ...this.released.map((c) => ({
        c,
        up: reduced ? 1 : clamp((seconds - c.born) / 7),
      })),
    ];
    // The reader's own kite carries a chain after dark too.
    const m = this.me;
    ctx.lineWidth = 0.8 / v.scale;
    for (const { c, up } of all) {
      if (up < 0.01) continue;
      const e = 1 - (1 - up) * (1 - up);
      const top = {
        x: lerp(c.anchor.x, c.top.x, e) + Math.sin(seconds * 0.3 + c.seed) * 0.2,
        y: lerp(c.anchor.y, c.top.y, e) + Math.sin(seconds * 0.5 + c.seed) * 0.12,
      };
      if (Math.max(top.x, c.anchor.x) < left || Math.min(top.x, c.anchor.x) > right) continue;
      const a = c.anchor;
      const cx = lerp(a.x, top.x, 0.6);
      const cy = lerp(a.y, top.y, 0.5) + 0.3;
      ctx.strokeStyle = "rgba(200, 180, 190, 0.18)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, top.x, top.y);
      ctx.stroke();
      const along = (t: number) => ({
        x: (1 - t) * (1 - t) * a.x + 2 * t * (1 - t) * cx + t * t * top.x,
        y: (1 - t) * (1 - t) * a.y + 2 * t * (1 - t) * cy + t * t * top.y,
      });
      this.lanterns(w, c, along, top, up, true);
    }
    if (m.up > 0.02 && m.string.length > 2) {
      const path = m.string;
      const along = (t: number) => {
        const f = t * (path.length - 1);
        const i = Math.min(path.length - 2, Math.floor(f));
        return {
          x: lerp(path[i].x, path[i + 1].x, f - i),
          y: lerp(path[i].y, path[i + 1].y, f - i),
        };
      };
      this.lanterns(w, this.ours, along, m, m.up * rise(p, 0.79, 0.82), false);
    }

    // Fireworks, now and then, over the walled city.
    const fire = rise(p, 0.8, 0.83) * (1 - rise(p, 0.97, 1));
    if (fire > 0.05 && !reduced && seconds > this.nextBurst) {
      this.nextBurst = seconds + 0.8 + Math.random() * 1.8;
      const x = lerp(left + 4, right - 4, Math.random());
      this.bursts.push({
        x,
        y: -2.5 - Math.random() * 4,
        born: seconds,
        color: FIREWORK[Math.floor(Math.random() * FIREWORK.length)],
        n: 36,
        seed: Math.random() * 10,
        r: 1 + Math.random() * 1.2,
      });
      this.emit("burst");
    }
    this.bursts = this.bursts.filter((b) => seconds - b.born < 2.4);
    if (this.bursts.length) {
      ctx.globalCompositeOperation = "lighter";
      for (const b of this.bursts) {
        const t = seconds - b.born;
        const a = Math.max(0, 1 - t / 2.4);
        const reach = b.r * (1 - Math.exp(-t * 3));
        ctx.fillStyle = rgb(b.color, a);
        const size = 2.4 / v.scale;
        for (let i = 0; i < b.n; i++) {
          const ang = (i / b.n) * TAU + b.seed;
          const px = b.x + Math.cos(ang) * reach;
          const py = b.y + Math.sin(ang) * reach + t * t * 0.25;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
          ctx.fillRect(px - Math.cos(ang) * reach * 0.12 - size / 4, py - Math.sin(ang) * reach * 0.12 - size / 4, size / 2, size / 2);
        }
        glow(ctx, glowSprite(`${b.color[0]}, ${b.color[1]}, ${b.color[2]}`), b.x, b.y, b.r * 2.2, 0.25 * a);
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /** The lanterns on one string: small paper cylinders, one above another below the kite. */
  private lanterns(w: World, c: Chain, along: (t: number) => P, top: P, up: number, kite: boolean) {
    const { ctx, seconds, lights } = w;
    if (up < 0.01) return;
    if (kite) {
      // The dark kite that carries them.
      ctx.fillStyle = "rgba(20, 16, 28, 0.9)";
      const ks = c.size * 1.5;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y - ks);
      ctx.lineTo(top.x + ks * 0.8, top.y);
      ctx.lineTo(top.x, top.y + ks);
      ctx.lineTo(top.x - ks * 0.8, top.y);
      ctx.closePath();
      ctx.fill();
    }
    const s = c.size;
    const sprites = lanternSprites();
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < c.lanterns; i++) {
      const t = 0.88 - i * 0.075;
      const on = along(t);
      // Each hangs on its own short thread below the string.
      const x = on.x + Math.sin(seconds * 1.3 + c.seed + i) * s * 0.25;
      const y = on.y + s * 1.2;
      const f = 0.85 + 0.15 * Math.sin(seconds * 9 + i * 2.1 + c.seed);
      ctx.globalAlpha = clamp(up * f);
      ctx.drawImage(sprites[PAPER.indexOf(c.colors[i % c.colors.length])], x - s * 0.8, y - s, s * 1.6, s * 2);
      cx += x;
      cy += y;
    }
    ctx.globalAlpha = 1;
    // One warm haze round the whole chain, rather than one per lamp.
    lights.push({ x: cx / c.lanterns, y: cy / c.lanterns, r: s * (4 + c.lanterns * 1.2), a: 0.3 * up, color: TUKKAL });
  }
}

let lanternCache: HTMLCanvasElement[] | null = null;

/** A tukkal, lit from inside, in each paper colour: painted once. */
function lanternSprites() {
  if (lanternCache) return lanternCache;
  lanternCache = PAPER.map((paper) => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 40;
    const g = c.getContext("2d")!;
    const halo = g.createRadialGradient(16, 20, 2, 16, 20, 16);
    halo.addColorStop(0, rgb(mix(paper, [255, 220, 160], 0.5), 0.5));
    halo.addColorStop(1, rgb(paper, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, 32, 40);
    const body = g.createLinearGradient(6, 0, 26, 0);
    body.addColorStop(0, rgb(mix(paper, [80, 20, 10], 0.4)));
    body.addColorStop(0.5, rgb(mix(paper, [255, 250, 220], 0.5)));
    body.addColorStop(1, rgb(mix(paper, [80, 20, 10], 0.4)));
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(16, 20, 10, 14, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(40, 20, 16, 0.75)";
    g.fillRect(8, 5, 16, 2.5);
    g.fillRect(8, 33, 16, 2.5);
    return c;
  });
  return lanternCache;
}
