import { TAU, glow, glowSprite, mulberry32 } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { ganesh } from "./content";
import { paintEyes, paintMurti, paintOfferings } from "./murti";

/** Ganesh Chaturthi: Bappa before his sunburst, the greeting over him and the sender's name. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const ground = ctx.createLinearGradient(0, 0, 0, height);
  ground.addColorStop(0, "#12060a");
  ground.addColorStop(0.5, "#3a0a14");
  ground.addColorStop(1, "#14060a");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);
  const random = mulberry32(1893);
  ctx.fillStyle = "rgba(240, 190, 90, 0.18)";
  for (let i = 0; i < 220; i++) ctx.fillRect(random() * width, random() * height, 2, 2);

  // Marigolds and mango leaves swagged along the top.
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = t * width;
    const y = 18 + Math.sin(t * Math.PI * 3) ** 2 * 26;
    if (i % 3 === 1) {
      ctx.fillStyle = "#3f8a32";
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.quadraticCurveTo(x, y + 64, x + 9, y);
      ctx.fill();
    } else {
      ctx.fillStyle = i % 2 ? "#e8740e" : "#f7a928";
      ctx.beginPath();
      ctx.arc(x, y + 4, 15, 0, TAU);
      ctx.fill();
    }
  }

  // Bappa, painted at card size, before a sunburst of gold.
  const scale = 262;
  const cx = width / 2;
  const base = height - 150;
  const head = base - 1.55 * scale;
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 150, 60"), cx, head + 120, 620, 0.4);
  ctx.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.translate(cx, head);
  for (let i = 0; i < 32; i++) {
    ctx.rotate(TAU / 32);
    ctx.fillStyle = i % 2 ? "#f2c14e" : "#c8862a";
    ctx.beginPath();
    ctx.moveTo(-24, -296);
    ctx.lineTo(0, -350);
    ctx.lineTo(24, -296);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#e8b440";
  ctx.beginPath();
  ctx.arc(0, 0, 300, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#a8101c";
  ctx.beginPath();
  ctx.arc(0, 0, 272, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(cx, base);
  ctx.scale(scale, scale);
  paintMurti(ctx, "paint");
  paintEyes(ctx, 1);
  paintOfferings(ctx, 1);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f2c653";
  ctx.shadowColor = "rgba(255, 150, 50, 0.45)";
  ctx.shadowBlur = 36;
  const [first, second] = ganesh.card.native.split(" हार्दिक ");
  ctx.font = `92px ${fonts.deva}`;
  ctx.fillText(first, width / 2, 190);
  ctx.fillText(`हार्दिक ${second}`, width / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.78)";
  ctx.font = `32px ${fonts.sc}`;
  ctx.letterSpacing = "9px";
  ctx.fillText(ganesh.card.english.toLowerCase(), width / 2, 370);
  ctx.letterSpacing = "0px";
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 46px ${fonts.serif}`;
    ctx.shadowColor = "rgba(20, 4, 8, 0.9)";
    ctx.shadowBlur = 18;
    ctx.fillText(`with love, ${name}`, width / 2, 432);
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.55)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 48);
  ctx.letterSpacing = "0px";
}
