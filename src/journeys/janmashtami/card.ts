import {
  TAU,
  glow,
  glowSprite,
  lerp,
  mulberry32,
  rgb,
  type RGB,
} from "../paint";
import type { CardFonts, CardSize } from "../types";
import { janmashtami } from "./content";
import { DIVINE, VASUDEVA } from "./fort";
import { drawHoods, drawPerson } from "./people";
import { SERPENT_LIGHT } from "./river";
import { drawBasket } from "./scene";

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
  return {
    lines: [words.slice(0, best).join(" "), words.slice(best).join(" ")],
    size: 104,
  };
}

/** Janmashtami greetings: Vasudeva in the flooded Yamuna at midnight, the child's basket on his head under Sheshnaag's hoods. */
export function paintCard(
  ctx: CanvasRenderingContext2D,
  { width, height }: CardSize,
  name: string,
  link: string,
  fonts: CardFonts,
) {
  const random = mulberry32(808);
  const horizon = 900;

  // The storm sky, and the half moon of Ashtami, lit on its left as it wanes, breaking through.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#04060e");
  sky.addColorStop(0.55, "#0e1224");
  sky.addColorStop(1, "#1e2236");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);
  const moon = { x: 860, y: 610, r: 44 };
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("150, 160, 210"), moon.x, moon.y, 420, 0.35);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#e8e4d4";
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(232, 228, 212, 0.035)";
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  // Monsoon cloud in heavy bands, lit from below by the moon and the light on the river.
  for (let i = 0; i < 70; i++) {
    const x = random() * width;
    const band = random();
    const y = lerp(80, 700, band) + (x > 700 && band > 0.7 ? -120 : 0);
    const r = 70 + random() * 140;
    const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    const lit = 0.3 + 0.7 * band;
    g.addColorStop(
      0,
      `rgba(${Math.round(60 + 40 * lit)}, ${Math.round(64 + 40 * lit)}, ${Math.round(92 + 40 * lit)}, 0.55)`,
    );
    g.addColorStop(1, "rgba(14, 16, 30, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Lightning, far off over Mathura.
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("150, 170, 255"), 190, 560, 380, 0.4);
  ctx.strokeStyle = "rgba(230, 236, 255, 0.95)";
  ctx.lineJoin = "round";
  const bolt = (
    x: number,
    y: number,
    len: number,
    w: number,
    depth: number,
  ) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x;
    let py = y;
    for (let i = 0, guard = 0; i < len && guard < 40; i++, guard++) {
      px += (random() - 0.5) * 70;
      py += 28 + random() * 20;
      ctx.lineTo(px, py);
      if (depth > 0 && random() < 0.18) {
        ctx.stroke();
        bolt(px, py, 4, w * 0.5, depth - 1);
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(px, py);
      }
    }
    ctx.stroke();
  };
  bolt(250, 330, 15, 3.5, 2);
  ctx.globalCompositeOperation = "source-over";

  // Mathura's walls and domes on the far bank, dark against the storm.
  ctx.fillStyle = "#0a0c16";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(0, horizon - 70);
  const skyline: [number, number, number][] = [
    [40, 70, 0],
    [120, 110, 1],
    [210, 80, 0],
    [290, 140, 1],
    [380, 90, 0],
    [460, 60, 0],
  ];
  for (const [x, h, dome] of skyline) {
    ctx.lineTo(x, horizon - h);
    if (dome) ctx.arc(x + 30, horizon - h, 30, Math.PI, 0);
    ctx.lineTo(x + 70, horizon - h);
  }
  ctx.lineTo(560, horizon - 30);
  ctx.quadraticCurveTo(820, horizon - 50, width, horizon - 24);
  ctx.lineTo(width, horizon);
  ctx.fill();

  // The Yamuna in flood.
  const water = ctx.createLinearGradient(0, horizon, 0, height);
  water.addColorStop(0, "#1c3440");
  water.addColorStop(0.35, "#10222c");
  water.addColorStop(1, "#060c14");
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, width, height - horizon);
  ctx.strokeStyle = "rgba(110, 150, 160, 0.28)";
  for (let r = 0; r < 9; r++) {
    const y = horizon + 20 + r * r * 6 + r * 14;
    ctx.lineWidth = 1.5 + r * 0.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 12) {
      const wy =
        y -
        Math.abs(Math.sin(x * (0.012 - r * 0.0006) + r * 2.1)) * (5 + r * 3);
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  // Vasudeva, waist deep, the basket on his head; Sheshnaag risen behind him, hoods spread over it.
  const S = 240;
  const cx = 560;
  const feet = 1330;
  const surface = -0.8;
  const head = { x: 0.01, y: -VASUDEVA.h };
  const neck = { x: head.x - 0.06, y: head.y - 0.15 };
  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(S, S);
  ctx.lineCap = "round";
  for (const [dx, r] of [
    [-1.55, 0.3],
    [-2.25, 0.22],
  ]) {
    ctx.fillStyle = "#17343c";
    ctx.beginPath();
    ctx.ellipse(dx, surface + 0.06, r * 1.4, r, 0, Math.PI, 0);
    ctx.fill();
  }
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-1.1, surface + 0.1);
    ctx.bezierCurveTo(-0.9, -2.2, -0.5, -1.2, neck.x, neck.y + 0.35);
  };
  ctx.strokeStyle = "#163038";
  ctx.lineWidth = 0.34;
  body();
  ctx.stroke();
  ctx.strokeStyle = "#2b5a62";
  ctx.lineWidth = 0.2;
  body();
  ctx.stroke();
  ctx.strokeStyle = "rgba(220, 200, 130, 0.55)";
  ctx.lineWidth = 0.1;
  ctx.setLineDash([0.05, 0.09]);
  body();
  ctx.stroke();
  ctx.setLineDash([]);
  drawHoods(ctx, neck.x, neck.y + 0.35, 0.95, 1, 0.6);
  drawPerson(
    ctx,
    0,
    0,
    VASUDEVA,
    { la: 2.85, lf: 3.3, ra: 2.75, rf: 3.8, nod: -0.05 },
    1,
  );
  drawBasket(ctx, head.x, head.y, 0.62, 1, 1);

  // The river over his legs, and foam where it swirls round him.
  const front = ctx.createLinearGradient(0, surface - 0.1, 0, 0.3);
  front.addColorStop(0, "rgba(40, 76, 88, 0.86)");
  front.addColorStop(0.25, "rgba(26, 52, 64, 0.97)");
  front.addColorStop(1, "#0a1620");
  ctx.fillStyle = front;
  const wave = (x: number) =>
    surface + Math.sin(x * 3.2 + 1) * 0.04 - Math.exp(-x * x * 6) * 0.08;
  ctx.beginPath();
  ctx.moveTo(-cx / S - 0.1, 0.4);
  for (let x = -cx / S - 0.1; x <= (width - cx) / S + 0.1; x += 0.05)
    ctx.lineTo(x, wave(x));
  ctx.lineTo((width - cx) / S + 0.1, 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(200, 225, 230, 0.6)";
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let x = -cx / S - 0.1; x <= (width - cx) / S + 0.1; x += 0.05)
    ctx.lineTo(x, wave(x));
  ctx.stroke();
  ctx.fillStyle = "rgba(220, 235, 240, 0.6)";
  for (let i = 0; i < 26; i++) {
    const x = (random() - 0.5) * 1.3;
    ctx.beginPath();
    ctx.arc(
      x,
      wave(x) + 0.02 + random() * 0.05,
      0.012 + random() * 0.025,
      0,
      TAU,
    );
    ctx.fill();
  }

  // The light of the child, and Sheshnaag's glow.
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite(SERPENT_LIGHT), neck.x, neck.y - 0.6, 2.6, 0.35);
  glow(ctx, glowSprite(DIVINE), head.x, head.y - 0.25, 1, 0.6);
  glow(ctx, glowSprite(DIVINE), head.x, head.y - 0.2, 4, 0.22);
  glow(ctx, glowSprite(DIVINE), 0, surface, 2.2, 0.25);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  // Rain, slanting across everything.
  ctx.strokeStyle = "rgba(190, 200, 230, 0.22)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 420; i++) {
    const x = random() * (width + 200) - 100;
    const y = random() * height;
    const l = 20 + random() * 36;
    ctx.moveTo(x, y);
    ctx.lineTo(x - l * 0.22, y + l);
  }
  ctx.stroke();

  // Dark at the top for the words.
  const shade = ctx.createLinearGradient(0, 0, 0, 560);
  shade.addColorStop(0, "rgba(3, 4, 10, 0.75)");
  shade.addColorStop(1, "rgba(3, 4, 10, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, 560);

  // The greeting.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const gold: RGB = [240, 196, 110];
  ctx.fillStyle = rgb(gold);
  ctx.shadowColor = "rgba(255, 190, 90, 0.45)";
  ctx.shadowBlur = 40;
  const { lines, size } = greetingLines(
    ctx,
    janmashtami.card.native,
    fonts.deva,
    width - 140,
  );
  ctx.font = `${size}px ${fonts.deva}`;
  lines.forEach((line, i) =>
    ctx.fillText(line, width / 2, 200 + i * size * 1.2),
  );
  const below = 200 + (lines.length - 1) * size * 1.2;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(janmashtami.card.english.toLowerCase(), width / 2, below + 86);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = rgb(gold);
  ctx.fillRect(width / 2 - 36, below + 122, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, below + 204);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.55)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 40);
  ctx.letterSpacing = "0px";
}
