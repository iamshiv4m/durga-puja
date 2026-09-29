import { glow, glowSprite, mix, mulberry32, rgb, type RGB } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { sankranti } from "./content";
import { drawKite, kiteSprites, stringPoints, strokeLine } from "./kites";

/** Lines of the greeting: one if it fits at a good size, otherwise split at the middle space. */
function greetingLines(ctx: CanvasRenderingContext2D, text: string, font: string, width: number) {
  for (const size of [112, 100, 90]) {
    ctx.font = `${size}px ${font}`;
    if (ctx.measureText(text).width <= width) return { lines: [text], size };
  }
  const words = text.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return {
    lines: [words.slice(0, best).join(" "), words.slice(best).join(" ")],
    size: 108,
  };
}

/** Sankranti greetings: kites over the pols of Ahmedabad as the sun goes down on Uttarayan. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const horizon = 1120;
  const random = mulberry32(1401);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#141433");
  sky.addColorStop(0.38, "#3c2c5c");
  sky.addColorStop(0.72, "#c05a4a");
  sky.addColorStop(1, "#ffab5c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f2e9d6";
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.12 + random() * 0.4;
    ctx.fillRect(random() * width, random() * 380, 1 + random() * 1.5, 1 + random() * 1.5);
  }
  ctx.globalAlpha = 1;

  // The sun, low, going into Makara.
  const sun = { x: 700, y: horizon - 150, r: 120 };
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 140, 70"), sun.x, sun.y, sun.r * 7, 0.5);
  glow(ctx, glowSprite("255, 190, 110"), sun.x, sun.y, sun.r * 2.6, 0.55);
  ctx.globalCompositeOperation = "source-over";
  const disc = ctx.createRadialGradient(sun.x, sun.y - 30, 0, sun.x, sun.y, sun.r);
  disc.addColorStop(0, "#fff0c4");
  disc.addColorStop(0.75, "#ffae58");
  disc.addColorStop(1, "#ff7436");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
  ctx.fill();

  // The old city against it: roofs, a pair of minarets, a dome, a temple's flag.
  const far: RGB = [70, 34, 52];
  const near: RGB = [34, 18, 32];
  const roofs = (color: RGB, base: number, low: number, high: number, seed: number) => {
    const r = mulberry32(seed);
    ctx.fillStyle = rgb(color);
    ctx.beginPath();
    ctx.moveTo(0, height);
    let x = -20;
    while (x < width + 20) {
      const w = 50 + r() * 110;
      const top = base - low - r() * (high - low);
      ctx.lineTo(x, top);
      ctx.lineTo(x + w, top);
      if (r() < 0.35) {
        // A water tank on the terrace.
        ctx.lineTo(x + w - 10, top);
        ctx.lineTo(x + w - 10, top - 22);
        ctx.lineTo(x + w - 40, top - 22);
        ctx.lineTo(x + w - 40, top);
        ctx.lineTo(x + w, top);
      }
      x += w;
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = rgb(far);
  for (const mx of [240, 300]) {
    ctx.fillRect(mx - 8, horizon - 250, 16, 250);
    ctx.fillRect(mx - 14, horizon - 150, 28, 8);
    ctx.fillRect(mx - 12, horizon - 212, 24, 7);
    ctx.beginPath();
    ctx.moveTo(mx - 10, horizon - 250);
    ctx.quadraticCurveTo(mx, horizon - 282, mx + 10, horizon - 250);
    ctx.fill();
  }
  ctx.fillRect(870, horizon - 84, 140, 84);
  ctx.beginPath();
  ctx.moveTo(880, horizon - 80);
  ctx.bezierCurveTo(880, horizon - 150, 930, horizon - 160, 940, horizon - 190);
  ctx.bezierCurveTo(950, horizon - 160, 1000, horizon - 150, 1000, horizon - 80);
  ctx.fill();
  roofs(far, horizon, 40, 110, 7);
  roofs(mix(far, near, 0.5), horizon + 90, 60, 150, 8);

  // Kites everywhere, and their strings down to the roofs.
  const sprites = kiteSprites();
  const kites: {
    x: number;
    y: number;
    s: number;
    a: number;
    hand: { x: number; y: number };
  }[] = [];
  for (let i = 0; i < 34; i++) {
    const x = 40 + random() * (width - 80);
    const y = 560 + random() * 420;
    if (Math.hypot(x - sun.x, y - sun.y) < sun.r + 30) continue;
    const s = 26 + random() * 46 * ((y - 520) / 460);
    kites.push({
      x,
      y,
      s,
      a: (random() - 0.5) * 0.6,
      hand: { x: x - 60 - random() * 200, y: horizon + 40 + random() * 120 },
    });
  }
  kites.push({ x: 820, y: 700, s: 120, a: 0.2, hand: { x: 382, y: 1070 } });
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(255, 230, 220, 0.3)";
  for (const k of kites) strokeLine(ctx, stringPoints(k.hand, k, 0.1, 0.2, 12));
  kites.forEach((k, i) => {
    const backlit = Math.max(0, 1 - Math.hypot(k.x - sun.x, k.y - sun.y) / 520);
    drawKite(ctx, sprites[i % sprites.length], k.x, k.y, k.s, k.a, 0.15 + backlit * 0.6);
  });

  // A few tukkal already going up, as the light goes.
  const lamps: [number, number][] = [
    [140, 820],
    [168, 870],
    [196, 920],
    [990, 860],
    [1010, 905],
  ];
  ctx.globalCompositeOperation = "lighter";
  for (const [lx, ly] of lamps) glow(ctx, glowSprite("255, 140, 60"), lx, ly, 70, 0.5);
  ctx.globalCompositeOperation = "source-over";
  for (const [lx, ly] of lamps) {
    const g = ctx.createLinearGradient(lx - 10, 0, lx + 10, 0);
    g.addColorStop(0, "#c8502c");
    g.addColorStop(0.5, "#ffe0a8");
    g.addColorStop(1, "#c8502c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Our terrace in front: the parapet and the flyer, his string rising to the big kite.
  roofs(near, height + 60, 150, 200, 9);
  ctx.fillStyle = rgb(near);
  ctx.fillRect(0, 1250, width, height - 1250);
  const fx = 380;
  const fy = 1250;
  ctx.beginPath();
  ctx.ellipse(fx, fy - 128, 16, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fx - 26, fy - 104);
  ctx.lineTo(fx + 24, fy - 104);
  ctx.lineTo(fx + 30, fy - 30);
  ctx.lineTo(fx - 30, fy - 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(near);
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fx + 18, fy - 98);
  ctx.lineTo(fx + 22, fy - 146);
  ctx.lineTo(fx + 2, fy - 20 - 160);
  ctx.moveTo(fx - 18, fy - 96);
  ctx.lineTo(fx - 40, fy - 60);
  ctx.lineTo(fx - 12, fy - 40);
  ctx.stroke();

  // The greeting.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const gold: RGB = [242, 190, 96];
  ctx.fillStyle = rgb(gold);
  ctx.shadowColor = "rgba(255, 150, 60, 0.45)";
  ctx.shadowBlur = 40;
  const { lines, size } = greetingLines(ctx, sankranti.card.native, fonts.deva, width - 140);
  ctx.font = `${size}px ${fonts.deva}`;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, 210 + i * size * 1.2));
  const below = 210 + (lines.length - 1) * size * 1.2;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(sankranti.card.english.toLowerCase(), width / 2, below + 92);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = rgb(mix(gold, [255, 255, 255], 0.1));
  ctx.fillRect(width / 2 - 36, below + 130, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, below + 216);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.6)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 48);
  ctx.letterSpacing = "0px";
}
