import { TAU, glow, glowSprite, mulberry32, rgb, type Ctx } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { PETAL_COLOURS } from "./air";
import { bihu } from "./content";
import { drawDhol, drawXorai } from "./people";
import { orchidLeaves, raceme, stamp } from "./places";

const RED = "rgb(190, 30, 38)";
const WHITE = "rgb(248, 244, 234)";

/** A gamosa laid across the card: white cotton, red borders, and a band of red woven flowers. */
function gamosa(ctx: Ctx, top: number, bottom: number, width: number) {
  const random = mulberry32(88);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, top, width, bottom - top);
  // The weave, faintly.
  ctx.fillStyle = "rgba(200, 190, 170, 0.25)";
  for (let y = top; y < bottom; y += 4) ctx.fillRect(0, y, width, 1);
  for (let i = 0; i < 400; i++) ctx.fillRect(random() * width, top + random() * (bottom - top), 1 + random() * 3, 1);
  // Borders along both edges.
  for (const [y, h] of [
    [top + 10, 8],
    [top + 24, 3],
    [bottom - 18, 8],
    [bottom - 27, 3],
  ]) {
    ctx.fillStyle = RED;
    ctx.fillRect(0, y, width, h);
  }
  // The phool: a row of woven lozenges with little birds of red between them.
  const mid = (top + bottom) / 2;
  const size = (bottom - top) * 0.2;
  ctx.fillStyle = RED;
  for (let x = size; x < width + size; x += size * 2.6) {
    ctx.beginPath();
    ctx.moveTo(x, mid - size);
    ctx.lineTo(x + size * 0.8, mid);
    ctx.lineTo(x, mid + size);
    ctx.lineTo(x - size * 0.8, mid);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(x, mid - size * 0.5);
    ctx.lineTo(x + size * 0.4, mid);
    ctx.lineTo(x, mid + size * 0.5);
    ctx.lineTo(x - size * 0.4, mid);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.fillRect(x - size * 0.12, mid - size * 0.12, size * 0.24, size * 0.24);
    const bx = x + size * 1.3;
    for (const dy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(bx - size * 0.35, mid + dy * size * 0.55);
      ctx.lineTo(bx, mid + dy * size * 0.3);
      ctx.lineTo(bx + size * 0.35, mid + dy * size * 0.55);
      ctx.lineTo(bx, mid + dy * size * 0.75);
      ctx.fill();
    }
  }
}

/** Rongali Bihur xubhessa: kopou hanging from a branch, a gamosa, the xorai and the dhol, and the greeting. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const ground = ctx.createLinearGradient(0, 0, 0, height);
  ground.addColorStop(0, "#081410");
  ground.addColorStop(0.55, "#0f2014");
  ground.addColorStop(1, "#0a150c");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);
  const random = mulberry32(1404);

  // Muga gold light behind the words.
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("226, 170, 80"), width / 2, 620, 620, 0.35);
  // Fireflies.
  const fly = glowSprite("190, 255, 120", 64);
  for (let i = 0; i < 46; i++) {
    const x = random() * width;
    const y = 380 + random() * 560;
    if (Math.abs(y - 640) < 120 && Math.abs(x - width / 2) < 380) continue;
    glow(ctx, fly, x, y, 14 + random() * 14, 0.3 + random() * 0.5);
    ctx.fillStyle = "rgba(236, 255, 190, 0.9)";
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  ctx.globalCompositeOperation = "source-over";

  // The branch across the top, and the kopou hanging from it in long pink tails.
  ctx.strokeStyle = "rgb(70, 48, 34)";
  ctx.lineCap = "round";
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(-40, 120);
  ctx.bezierCurveTo(260, 40, 620, 170, width + 40, 70);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(300, 92);
  ctx.quadraticCurveTo(380, 30, 470, 10);
  ctx.moveTo(760, 108);
  ctx.quadraticCurveTo(840, 170, 930, 190);
  ctx.stroke();
  for (let i = 0; i < 70; i++) {
    const x = random() * width;
    const y = 30 + random() * 150;
    ctx.fillStyle = rgb(
      [
        [34, 66, 36],
        [52, 96, 46],
        [80, 124, 58],
      ][i % 3] as [number, number, number],
    );
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + random() * 20, 10, random() * TAU, 0, TAU);
    ctx.fill();
  }
  const leaves = orchidLeaves();
  const hang: [number, number, number, number][] = [
    [120, 120, 1, 0.08],
    [230, 96, 0, -0.05],
    [330, 98, 2, 0.1],
    [470, 118, 1, -0.02],
    [610, 130, 0, 0.06],
    [720, 118, 2, -0.08],
    [850, 98, 1, 0.04],
    [960, 82, 0, -0.06],
  ];
  for (const [x, y, variant, lean] of hang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(330, 330);
    ctx.rotate(lean);
    stamp(ctx, leaves, 0, 0.02, 0.8);
    stamp(ctx, raceme(variant), 0, 0, 1 + (variant % 2) * 0.15);
    ctx.restore();
  }

  // The gamosa across the foot of the card, the xorai with tamul-paan on it, and the dhol.
  gamosa(ctx, 1030, 1250, width);
  ctx.save();
  ctx.translate(250, 1050);
  ctx.rotate(-0.12);
  ctx.scale(700, 700);
  drawDhol(ctx, 0, 0, 0.44, 0.105);
  ctx.restore();
  ctx.save();
  ctx.translate(width - 230, 1148);
  ctx.scale(560, 560);
  drawXorai(ctx, 0, 0, 0.5, true);
  ctx.restore();
  // Kopou petals fallen on it.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgb(PETAL_COLOURS[i % PETAL_COLOURS.length]);
    ctx.beginPath();
    ctx.ellipse(random() * width, 1000 + random() * 250, 6 + random() * 4, 4, random() * TAU, 0, TAU);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let size = 118;
  ctx.font = `${size}px ${fonts.deva}`;
  const room = width * 0.86;
  const measured = ctx.measureText(bihu.card.native).width;
  if (measured > room) {
    size = Math.floor((size * room) / measured);
    ctx.font = `${size}px ${fonts.deva}`;
  }
  ctx.fillStyle = "#f0c870";
  ctx.shadowColor = "rgba(226, 150, 60, 0.5)";
  ctx.shadowBlur = 40;
  ctx.fillText(bihu.card.native, width / 2, 640);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(bihu.card.english.toLowerCase(), width / 2, 730);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = RED;
  ctx.fillRect(width / 2 - 36, 768, 72, 3);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, 860);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.55)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 42);
  ctx.letterSpacing = "0px";
}
