import { flicker, glow, glowSprite, mulberry32 } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { diwali } from "./content";
import { drawDiya, paintRangoli } from "./scene";

/** Shubh Deepavali: a row of lamps over a rangoli, the greeting and the sender's name. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#05030a");
  sky.addColorStop(0.55, "#120812");
  sky.addColorStop(1, "#1c0e0a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const random = mulberry32(2026);
  ctx.fillStyle = "#f2e9d6";
  for (let i = 0; i < 140; i++) {
    ctx.globalAlpha = 0.2 + random() * 0.6;
    ctx.fillRect(random() * width, random() * height * 0.45, 1 + random() * 1.5, 1 + random() * 1.5);
  }
  ctx.globalAlpha = 1;

  // The rangoli on the floor, seen from above the door.
  const rangoli = document.createElement("canvas");
  rangoli.width = rangoli.height = 900;
  paintRangoli(rangoli.getContext("2d")!, 900);
  ctx.save();
  ctx.translate(width / 2, height - 250);
  ctx.scale(1, 0.5);
  ctx.globalAlpha = 0.95;
  ctx.drawImage(rangoli, -450, -450, 900, 900);
  ctx.restore();

  // Seven lamps in an arc behind it.
  const sprite = glowSprite("255, 160, 60");
  const lamps = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return { x: 150 + t * (width - 300), y: 820 - Math.sin(t * Math.PI) * 60, seed: i * 1.7 };
  });
  ctx.globalCompositeOperation = "lighter";
  for (const l of lamps) glow(ctx, sprite, l.x + 30, l.y - 40, 260, 0.45 * flicker(0.4, l.seed));
  ctx.globalCompositeOperation = "source-over";
  for (const l of lamps) drawDiya(ctx, l.x, l.y, 110, 1, 0.4, l.seed, 0.2);
  ctx.globalCompositeOperation = "lighter";
  for (const l of lamps) glow(ctx, sprite, l.x + 48, l.y - 30, 60, 0.9);
  ctx.globalCompositeOperation = "source-over";

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e9b85a";
  ctx.shadowColor = "rgba(255, 150, 50, 0.45)";
  ctx.shadowBlur = 40;
  ctx.font = `140px ${fonts.deva}`;
  ctx.fillText(diwali.card.native, width / 2, 330);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.75)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(diwali.card.english.toLowerCase(), width / 2, 420);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#e9b85a";
  ctx.fillRect(width / 2 - 36, 460, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, 560);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.5)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 56);
  ctx.letterSpacing = "0px";
}
