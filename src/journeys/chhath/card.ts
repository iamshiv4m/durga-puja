import { glow, glowSprite, mix, mulberry32, rgb, type RGB } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { chhath } from "./content";
import { drawDiya, drawPerson, type Env, type Person } from "./pieces";

const DUSK: Env = { amb: 0.1, tint: [255, 160, 100], night: [20, 10, 22] };

/** Lines of the greeting: one if it fits at a good size, otherwise split at the middle space. */
function greetingLines(ctx: CanvasRenderingContext2D, text: string, font: string, width: number) {
  for (const size of [120, 108, 96]) {
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
  return { lines: [words.slice(0, best).join(" "), words.slice(best).join(" ")], size: 120 };
}

/** Chhath greetings: a vrati holding up the soop to the setting sun over the river. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const horizon = 1010;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#0c0818");
  sky.addColorStop(0.45, "#2a1636");
  sky.addColorStop(0.8, "#a0402e");
  sky.addColorStop(1, "#f08a3c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);
  const random = mulberry32(1311);
  ctx.fillStyle = "#f2e9d6";
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.15 + random() * 0.5;
    ctx.fillRect(random() * width, random() * 520, 1 + random() * 1.5, 1 + random() * 1.5);
  }
  ctx.globalAlpha = 1;

  // The sun, half down behind the far bank.
  const sun = { x: 600, y: horizon - 80, r: 130 };
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 150, 70"), sun.x, sun.y, sun.r * 7, 0.55);
  glow(ctx, glowSprite("255, 190, 110"), sun.x, sun.y, sun.r * 2.6, 0.6);
  ctx.globalCompositeOperation = "source-over";
  const disc = ctx.createRadialGradient(sun.x, sun.y - 30, 0, sun.x, sun.y, sun.r);
  disc.addColorStop(0, "#fff2c8");
  disc.addColorStop(0.75, "#ffb257");
  disc.addColorStop(1, "#ff7a36");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
  ctx.fill();

  // The far bank: a low line of trees and a palm or two.
  ctx.fillStyle = "#2a1420";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  let x = 0;
  while (x < width) {
    const w = 60 + random() * 120;
    ctx.quadraticCurveTo(x + w / 2, horizon - 30 - random() * 30, x + w, horizon - 8 - random() * 10);
    x += w;
  }
  ctx.lineTo(width, horizon);
  ctx.fill();
  ctx.strokeStyle = "#2a1420";
  ctx.lineWidth = 5;
  for (const px of [180, 900]) {
    ctx.beginPath();
    ctx.moveTo(px, horizon - 10);
    ctx.lineTo(px + 6, horizon - 110);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(px + 6, horizon - 110);
      ctx.lineTo(px + 6 + Math.cos(a) * 44, horizon - 106 + Math.sin(a) * 26);
      ctx.stroke();
    }
  }

  // The river, and the sun's road across it.
  const water = ctx.createLinearGradient(0, horizon, 0, height);
  water.addColorStop(0, "#c8643a");
  water.addColorStop(0.3, "#5a2a3a");
  water.addColorStop(1, "#140a18");
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, width, height - horizon);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ffc27a";
  for (let i = 0; i < 90; i++) {
    const t = random() ** 1.6;
    const y = horizon + 4 + t * (height - horizon);
    const spread = 40 + t * 380;
    ctx.globalAlpha = (0.2 + random() * 0.6) * (1 - t * 0.6);
    const w = 10 + t * 70 * random();
    ctx.fillRect(sun.x + (random() - 0.5) * spread - w / 2, y, w, 2 + t * 4);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // A few lamps afloat.
  const lamps: [number, number, number][] = [[140, 1180, 30], [860, 1120, 26], [980, 1230, 34], [300, 1290, 38]];
  ctx.globalCompositeOperation = "lighter";
  for (const [lx, ly, s] of lamps) glow(ctx, glowSprite("255, 160, 60"), lx, ly - s * 0.4, s * 5, 0.5);
  ctx.globalCompositeOperation = "source-over";
  for (const [lx, ly, s] of lamps) drawDiya(ctx, lx, ly, s, 1, 0.6, lx, DUSK);

  // The vrati, waist deep, holding the soop up against the sun.
  const vrati: Person = { kind: "vrati", cloth: [242, 178, 18], border: [210, 30, 30], pose: 1, facing: 1 };
  const glows: [number, number][] = [];
  drawPerson(ctx, vrati, 360, 1215, 440, DUSK, 1, 0.06, 1, 0.4, 1, (lx, ly) => glows.push([lx, ly]));
  ctx.globalCompositeOperation = "lighter";
  for (const [gx, gy] of glows) glow(ctx, glowSprite("255, 160, 60"), gx, gy, 110, 0.7);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(255, 220, 170, 0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(360, 1217, 120, 20, 0, 0, Math.PI * 2);
  ctx.stroke();

  // The greeting.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const gold: RGB = [238, 186, 90];
  ctx.fillStyle = rgb(gold);
  ctx.shadowColor = "rgba(255, 150, 50, 0.45)";
  ctx.shadowBlur = 40;
  const { lines, size } = greetingLines(ctx, chhath.card.native, fonts.deva, width - 140);
  ctx.font = `${size}px ${fonts.deva}`;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, 250 + i * size * 1.18));
  const below = 250 + (lines.length - 1) * size * 1.18;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.78)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(chhath.card.english.toLowerCase(), width / 2, below + 96);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = rgb(mix(gold, [255, 255, 255], 0.1));
  ctx.fillRect(width / 2 - 36, below + 136, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, below + 230);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.55)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 56);
  ctx.letterSpacing = "0px";
}
