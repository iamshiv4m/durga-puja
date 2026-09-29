import {
  TAU,
  glow,
  glowSprite,
  mix,
  mulberry32,
  rgb,
  type RGB,
} from "../paint";
import type { CardFonts, CardSize } from "../types";
import { pongal } from "./content";
import { makeKolam, strokeKolam } from "./kolam";
import type { Env } from "./people";
import {
  drawCane,
  drawHearth,
  drawKuthuvilakku,
  drawPot,
  gopuramPath,
  palmPath,
} from "./things";

const MORNING: Env = { amb: 0.8, tint: [255, 206, 150], night: [20, 10, 22] };

/** Lines of the greeting: one if it fits at a good size, otherwise split at the middle space. */
function greetingLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  width: number,
) {
  for (const size of [112, 100, 92]) {
    ctx.font = `${size}px ${font}`;
    if (ctx.measureText(text).width <= width) return { lines: [text], size };
  }
  const words = text.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(
      words.slice(0, i).join(" ").length - words.slice(i).join(" ").length,
    );
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  const lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  let size = 104;
  ctx.font = `${size}px ${font}`;
  while (
    size > 60 &&
    Math.max(...lines.map((l) => ctx.measureText(l).width)) > width
  ) {
    size -= 4;
    ctx.font = `${size}px ${font}`;
  }
  return { lines, size };
}

/** Pongal greetings: the new pot boiling over at sunrise under the sugarcane, a kolam before it. */
export function paintCard(
  ctx: CanvasRenderingContext2D,
  { width, height }: CardSize,
  name: string,
  link: string,
  fonts: CardFonts,
) {
  const horizon = 800;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#1a1c3c");
  sky.addColorStop(0.45, "#5a4a78");
  sky.addColorStop(0.8, "#e0906a");
  sky.addColorStop(1, "#ffcf8a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);
  const random = mulberry32(1401);
  ctx.fillStyle = "#f2e9d6";
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.1 + random() * 0.4;
    ctx.fillRect(
      random() * width,
      random() * 360,
      1 + random() * 1.5,
      1 + random() * 1.5,
    );
  }
  ctx.globalAlpha = 1;

  // The sun coming up behind the pot.
  const sun = { x: width / 2, y: horizon - 70, r: 120 };
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 170, 90"), sun.x, sun.y, sun.r * 7, 0.55);
  glow(ctx, glowSprite("255, 210, 140"), sun.x, sun.y, sun.r * 2.6, 0.6);
  ctx.globalCompositeOperation = "source-over";
  const disc = ctx.createRadialGradient(
    sun.x,
    sun.y - 30,
    0,
    sun.x,
    sun.y,
    sun.r,
  );
  disc.addColorStop(0, "#fff4d0");
  disc.addColorStop(0.75, "#ffc46a");
  disc.addColorStop(1, "#ff9a4a");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, TAU);
  ctx.fill();

  // The far tree line, palms, and a gopuram, flat against the light.
  ctx.save();
  ctx.translate(0, horizon);
  ctx.scale(100, 100);
  ctx.fillStyle = "#6a3e4a";
  ctx.fill(gopuramPath(1.9, 0, 2.3));
  ctx.fillStyle = "#4a2a3a";
  for (const [x, h, palmyra] of [
    [0.6, 1.8, 0],
    [2.9, 1.3, 1],
    [8.3, 2.1, 0],
    [9.5, 1.5, 0],
    [7.4, 1.2, 1],
  ] as const) {
    ctx.fill(palmPath(x, 0, h, 0.03, palmyra === 1, x * 10));
  }
  ctx.beginPath();
  ctx.rect(0, -0.04, 10.8, 0.06);
  let x = 0;
  while (x < 10.8) {
    const w = 0.2 + random() * 0.5;
    ctx.moveTo(x + w / 2, -0.04);
    ctx.ellipse(
      x + w / 2,
      -0.04,
      w / 2,
      0.08 + random() * 0.1,
      0,
      Math.PI,
      TAU,
    );
    x += w * 0.8;
  }
  ctx.fill();
  ctx.restore();

  // The yard: earth, and the long light across it.
  const earth = ctx.createLinearGradient(0, horizon, 0, height);
  earth.addColorStop(0, "#b07a58");
  earth.addColorStop(0.35, "#8a5a40");
  earth.addColorStop(1, "#40241c");
  ctx.fillStyle = earth;
  ctx.fillRect(0, horizon, width, height - horizon);

  // The kolam in front, seen low across the ground.
  const kolam = makeKolam(5, 23, 0.45);
  const path = new Path2D();
  strokeKolam(path, kolam, kolam.length + 1);
  ctx.save();
  ctx.translate(width / 2, 1150);
  ctx.scale(58, 58 * 0.4);
  ctx.fillStyle = "rgba(50, 30, 20, 0.35)";
  ctx.beginPath();
  ctx.arc(0, 0, 7.4, 0, TAU);
  ctx.fill();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(250, 244, 230, 0.3)";
  ctx.lineWidth = 0.2;
  ctx.stroke(path);
  ctx.strokeStyle = "rgba(252, 248, 238, 0.95)";
  ctx.lineWidth = 0.1;
  ctx.stroke(path);
  ctx.fillStyle = "rgba(252, 248, 238, 0.95)";
  for (const d of kolam.dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 0.08, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#f6c21e";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.32, 0.2, a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Sugarcane stood either side and tied at the top, the hearth, and the pot boiling over.
  const pot = { x: width / 2, y: 1040, size: 255 };
  const lights: [number, number, number, number][] = [];
  const light = (lx: number, ly: number, r: number, a: number) =>
    lights.push([lx, ly, r, a]);
  for (const side of [-1, 1])
    drawCane(
      ctx,
      pot.x + side * 300,
      pot.y + 20,
      pot.x + side * 28,
      740,
      24,
      MORNING,
      0.1,
      true,
      side > 0 ? 3 : 4,
      side * 0.1,
    );
  ctx.strokeStyle = "#f0c840";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(pot.x - 46, 812);
  ctx.lineTo(pot.x + 46, 803);
  ctx.stroke();
  drawHearth(ctx, pot.x, pot.y, pot.size, 1, 0.3, MORNING, 0.2, light);
  drawPot(
    ctx,
    pot.x,
    pot.y - 0.25 * pot.size,
    pot.size,
    { boil: 1, spill: 0.9 },
    0.4,
    MORNING,
    0.3,
    7,
  );
  // Brass lamps either side.
  for (const lx of [175, width - 175])
    drawKuthuvilakku(ctx, lx, 1080, 280, 1, 0.5, MORNING, 0.2, light);
  ctx.globalCompositeOperation = "lighter";
  for (const [lx, ly, r, a] of lights)
    glow(ctx, glowSprite("255, 160, 60"), lx, ly, r, a);
  ctx.globalCompositeOperation = "source-over";

  // Steam curling up off the pot.
  for (let i = 0; i < 5; i++) {
    const sx = pot.x - 40 + i * 20 + (random() - 0.5) * 20;
    const sy = pot.y - 0.25 * pot.size - pot.size - 60 - i * 34;
    const r = 50 + i * 16;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, "rgba(255, 250, 240, 0.22)");
    g.addColorStop(1, "rgba(255, 250, 240, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }

  // The greeting.
  const top = ctx.createLinearGradient(0, 0, 0, 560);
  top.addColorStop(0, "rgba(14, 12, 34, 0.55)");
  top.addColorStop(1, "rgba(14, 12, 34, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, 560);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const gold: RGB = [246, 196, 100];
  ctx.fillStyle = rgb(gold);
  ctx.shadowColor = "rgba(255, 150, 50, 0.5)";
  ctx.shadowBlur = 40;
  const { lines, size } = greetingLines(
    ctx,
    pongal.card.native,
    fonts.deva,
    width - 160,
  );
  ctx.font = `${size}px ${fonts.deva}`;
  lines.forEach((line, i) =>
    ctx.fillText(line, width / 2, 190 + i * size * 1.3),
  );
  const below = 190 + (lines.length - 1) * size * 1.3;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(246, 238, 220, 0.85)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(pongal.card.english.toLowerCase(), width / 2, below + 90);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = rgb(mix(gold, [255, 255, 255], 0.1));
  ctx.fillRect(width / 2 - 36, below + 126, 72, 2);
  if (name) {
    ctx.fillStyle = "#f6eedc";
    ctx.shadowColor = "rgba(20, 10, 30, 0.6)";
    ctx.shadowBlur = 18;
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, below + 204);
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "rgba(246, 238, 220, 0.6)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 44);
  ctx.letterSpacing = "0px";
}
