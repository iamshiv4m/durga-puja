import { TAU, mulberry32, rgb } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { GULAL, handprint, puffSprite } from "./colour";
import { holi } from "./content";
import { THALI, drawThali, palashFlower } from "./places";

/** Holi ki shubhkamnayein: gulal bursting over a thali of colour, the greeting and the sender's name. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const ground = ctx.createLinearGradient(0, 0, 0, height);
  ground.addColorStop(0, "#12060e");
  ground.addColorStop(0.5, "#1e0914");
  ground.addColorStop(1, "#14070a");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);
  const random = mulberry32(1303);

  // Clouds of gulal thrown up into the dark, each a colour of its own.
  ctx.globalCompositeOperation = "screen";
  const bursts: [number, number, number][] = [
    [0.22, 0.2, 0],
    [0.5, 0.12, 2],
    [0.8, 0.22, 1],
    [0.36, 0.34, 3],
    [0.66, 0.36, 4],
    [0.1, 0.46, 5],
    [0.92, 0.48, 7],
  ];
  for (const [bx, by, c] of bursts) {
    const sprite = puffSprite(GULAL[c]);
    for (let i = 0; i < 70; i++) {
      const a = random() * TAU;
      const d = Math.pow(random(), 0.7) * 230;
      const r = 50 + random() * 120 * (1 - d / 300);
      ctx.globalAlpha = 0.18 + random() * 0.3;
      ctx.drawImage(sprite, bx * width + Math.cos(a) * d - r, by * height + Math.sin(a) * d * 0.8 - r, r * 2, r * 2);
    }
  }
  // Powder flecks flying off the edges.
  for (let i = 0; i < 700; i++) {
    const [bx, by, c] = bursts[i % bursts.length];
    const a = random() * TAU;
    const d = 150 + random() * 260;
    ctx.globalAlpha = 0.3 + random() * 0.6;
    ctx.fillStyle = rgb(GULAL[c]);
    ctx.fillRect(bx * width + Math.cos(a) * d, by * height + Math.sin(a) * d * 0.8, 2 + random() * 3, 2 + random() * 3);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Handprints, and palash flowers, along the foot of the card.
  for (let i = 0; i < 7; i++) {
    handprint(ctx, 70 + random() * (width - 140), height - 330 + random() * 200, 80 + random() * 30, (random() - 0.5) * 0.9, GULAL[(i * 3) % GULAL.length], 0.35);
  }
  for (let i = 0; i < 60; i++) {
    const side = i % 2 ? 1 : -1;
    const x = width / 2 + side * (180 + random() * 360);
    palashFlower(ctx, x, height - 250 + random() * 150, 16 + random() * 12, random() * TAU, random());
  }
  // The thali of colour.
  ctx.save();
  const scale = 400;
  ctx.translate(width / 2 - THALI.x * scale, height - 190 - THALI.y * scale);
  ctx.scale(scale, scale);
  drawThali(ctx, [GULAL[0], GULAL[1], GULAL[2], GULAL[6], GULAL[3]]);
  ctx.restore();

  // A darker band behind the words, so they read over the colour.
  const band = ctx.createLinearGradient(0, 560, 0, 1000);
  band.addColorStop(0, "rgba(18, 6, 14, 0)");
  band.addColorStop(0.3, "rgba(18, 6, 14, 0.7)");
  band.addColorStop(0.75, "rgba(18, 6, 14, 0.7)");
  band.addColorStop(1, "rgba(18, 6, 14, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 560, width, 440);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let size = 120;
  ctx.font = `${size}px ${fonts.deva}`;
  const room = width * 0.86;
  const measured = ctx.measureText(holi.card.native).width;
  if (measured > room) {
    size = Math.floor((size * room) / measured);
    ctx.font = `${size}px ${fonts.deva}`;
  }
  ctx.fillStyle = "#ffd98a";
  ctx.shadowColor = "rgba(238, 42, 123, 0.55)";
  ctx.shadowBlur = 40;
  ctx.fillText(holi.card.native, width / 2, 760);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(holi.card.english.toLowerCase(), width / 2, 840);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#ee2a7b";
  ctx.fillRect(width / 2 - 36, 876, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, 958);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.55)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 42);
  ctx.letterSpacing = "0px";
}
