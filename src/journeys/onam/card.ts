import { TAU, flame, glow, glowSprite, mulberry32, rgb, type RGB } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { onam } from "./content";
import { FLOWERS, fullPookalam } from "./pookalam";

const GOLD: RGB = [226, 180, 84];

/** A kasavu border round the card: a cream band between lines of gold, as on the set-mundu. */
function kasavu(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const inset = 34;
  ctx.strokeStyle = "rgba(242, 232, 208, 0.9)";
  ctx.lineWidth = 22;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  ctx.strokeStyle = rgb(GOLD);
  for (const [d, w] of [
    [-14, 4],
    [-7, 2],
    [7, 2],
    [14, 4],
  ]) {
    ctx.lineWidth = w;
    ctx.strokeRect(inset + d, inset + d, width - (inset + d) * 2, height - (inset + d) * 2);
  }
  // Little gold diamonds along the band, as woven into a kasavu border.
  ctx.fillStyle = rgb(GOLD);
  const diamond = (x: number, y: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 5, y);
    ctx.fill();
  };
  for (let x = inset + 40; x < width - inset - 20; x += 40) {
    diamond(x, inset);
    diamond(x, height - inset);
  }
  for (let y = inset + 40; y < height - inset - 20; y += 40) {
    diamond(inset, y);
    diamond(width - inset, y);
  }
}

/** Onam greetings: the finished pookalam of Thiruvonam from above, a lamp at its heart, in a kasavu border. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const bg = ctx.createRadialGradient(width / 2, 900, 100, width / 2, 800, 900);
  bg.addColorStop(0, "#5a2a1a");
  bg.addColorStop(0.55, "#2c140e");
  bg.addColorStop(1, "#140806");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Swept earth.
  const random = mulberry32(2024);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = random() < 0.5 ? `rgba(140, 80, 50, ${0.08 + random() * 0.1})` : `rgba(20, 8, 4, ${0.1 + random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, 1 + random() * 2.5, 0, TAU);
    ctx.fill();
  }

  // The pookalam, and loose petals round it.
  const cx = width / 2;
  const cy = 872;
  const r = 336;
  const { canvas, radius } = fullPookalam();
  ctx.fillStyle = "rgba(10, 4, 2, 0.45)";
  ctx.beginPath();
  ctx.arc(cx + 8, cy + 14, r + 6, 0, TAU);
  ctx.fill();
  const scale = r / radius;
  ctx.drawImage(canvas, cx - (canvas.width / 2) * scale, cy - (canvas.height / 2) * scale, canvas.width * scale, canvas.height * scale);
  for (let i = 0; i < 70; i++) {
    const a = random() * TAU;
    const d = r + 20 + random() ** 2 * 170;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    if (y > height - 120 || y < 560 || x < 90 || x > width - 90) continue;
    ctx.fillStyle = rgb(FLOWERS[i % FLOWERS.length]);
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + random() * 5, 3 + random() * 3, random() * TAU, 0, TAU);
    ctx.fill();
  }

  // A lamp burning at its heart.
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 160, 60"), cx, cy - 20, 260, 0.55);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#c8903c";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 30, 14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#8a5a24";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 3, 22, 8, 0, 0, TAU);
  ctx.fill();
  flame(ctx, cx + 4, cy - 4, 54, 0.4, 2);
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 210, 140"), cx + 4, cy - 30, 60, 0.7);
  ctx.globalCompositeOperation = "source-over";

  kasavu(ctx, width, height);

  // The greeting.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = rgb(GOLD);
  ctx.shadowColor = "rgba(255, 150, 50, 0.4)";
  ctx.shadowBlur = 36;
  let size = 128;
  ctx.font = `${size}px ${fonts.deva}`;
  while (ctx.measureText(onam.card.native).width > width - 200 && size > 60) {
    size -= 8;
    ctx.font = `${size}px ${fonts.deva}`;
  }
  ctx.fillText(onam.card.native, width / 2, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(onam.card.english.toLowerCase(), width / 2, 340);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = rgb(GOLD);
  ctx.fillRect(width / 2 - 36, 378, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 48px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, 460);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.6)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 76);
  ctx.letterSpacing = "0px";
}
