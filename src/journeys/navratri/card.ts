import { TAU, glow, glowSprite, mix, mulberry32, rgb, type RGB } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { navratri } from "./content";
import { drawGarbo } from "./mandvi";
import { garbaPose, drawDancer, makeLook } from "./people";
import type { Tilt } from "./world";

const MIRROR_BORDER: RGB[] = [
  [178, 22, 42],
  [214, 150, 18],
  [30, 128, 70],
  [40, 46, 130],
  [196, 30, 110],
];

/** Shubh Navratri: the garbo lit in the dark, its light scattered all round, and a ring of garba dancers. */
export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  const random = mulberry32(2610);
  const ground = ctx.createLinearGradient(0, 0, 0, height);
  ground.addColorStop(0, "#0a0718");
  ground.addColorStop(0.45, "#1a0a22");
  ground.addColorStop(1, "#0c0510");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const garboY = 470;

  // The garbo's light, thrown through its holes in rows of little stars all over the dark.
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 150, 60", 256), cx, garboY - 60, 520, 0.35);
  const spark = glowSprite("255, 200, 120");
  for (let ring = 0; ring < 16; ring++) {
    const r = 170 + ring * 34 + ring * ring * 1.6;
    const count = 18 + ring * 5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + ring * 0.21 + (random() - 0.5) * 0.03;
      const x = cx + Math.cos(a) * r;
      const y = garboY - 80 + Math.sin(a) * r * 0.82;
      if (y > 880 || y < 20) continue;
      const s = 7 + random() * 6 - ring * 0.25;
      glow(ctx, spark, x, y, s * 2.2, 0.55 - ring * 0.022);
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // A toran along the top: mango leaves and little embroidered flags with mirrors.
  for (let i = 0; i < 27; i++) {
    const x = (i + 0.5) * (width / 27);
    ctx.fillStyle = i % 2 ? "#2f7028" : "#3f8a32";
    ctx.beginPath();
    ctx.moveTo(x - 16, 18);
    ctx.quadraticCurveTo(x, 110, x + 16, 18);
    ctx.fill();
    if (i % 3 === 1) {
      const c = MIRROR_BORDER[i % MIRROR_BORDER.length];
      ctx.fillStyle = rgb(c);
      ctx.beginPath();
      ctx.moveTo(x - 20, 18);
      ctx.lineTo(x + 20, 18);
      ctx.lineTo(x, 70);
      ctx.fill();
      ctx.fillStyle = "#f4f0e0";
      ctx.beginPath();
      ctx.arc(x, 36, 5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#b8141e";
  ctx.fillRect(0, 10, width, 12);

  // The ring of dancers round the garbo, seen from a little above.
  const t: Tilt = { s: Math.sin(0.42), c: Math.cos(0.42) };
  const scale = 118;
  const floor = 640;
  const dancers: { x: number; z: number; draw: () => void }[] = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + 0.12;
    const r = 2.9;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const woman = i % 3 !== 2;
    const look = makeLook(random, woman, 1.5 + random() * 0.12);
    const facing: 1 | -1 = -Math.sin(a) >= 0 ? 1 : -1;
    const pose = garbaPose(i * 1.7 + 2, facing, 0.9, look.seed, woman);
    const light = Math.max(0.2, 0.9 - ((z + r) / (2 * r)) * 0.2);
    dancers.push({
      x,
      z,
      draw: () => drawDancer(ctx, x, z, t, look, pose, light, 1.3 + i),
    });
  }
  dancers.sort((a, b) => a.z - b.z);
  ctx.save();
  ctx.translate(cx, floor);
  ctx.scale(scale, scale);
  // The chowk under them, lit round the garbo.
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 4.4);
  pool.addColorStop(0, "rgba(160, 96, 60, 0.55)");
  pool.addColorStop(1, "rgba(60, 30, 40, 0)");
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 4.4 * t.s, 0, 0, TAU);
  ctx.fill();
  for (const d of dancers) if (d.z < 0) d.draw();
  // The garbo on its stool.
  ctx.fillStyle = "#6a2a18";
  ctx.fillRect(-0.3, -0.5, 0.6, 0.5);
  ctx.fillStyle = "#e2b046";
  ctx.beginPath();
  ctx.ellipse(0, -0.5, 0.36, 0.36 * t.s, 0, 0, TAU);
  ctx.fill();
  drawGarbo(ctx, 0, -0.5, 1.2, t.c, 1, 2.1, 1.7);
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, glowSprite("255, 190, 110"), 0, -1.1, 1.6, 0.7);
  ctx.globalCompositeOperation = "source-over";
  for (const d of dancers) if (d.z >= 0) d.draw();
  ctx.restore();

  // A darker band behind the words.
  const band = ctx.createLinearGradient(0, 900, 0, height);
  band.addColorStop(0, "rgba(12, 5, 16, 0)");
  band.addColorStop(0.25, "rgba(12, 5, 16, 0.85)");
  band.addColorStop(1, "rgba(12, 5, 16, 0.95)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 900, width, height - 900);

  // A border of mirror work round the card.
  const edge = 26;
  for (let x = edge; x < width - edge / 2; x += edge) {
    for (const y of [height - edge / 2 - 4]) {
      ctx.fillStyle = rgb(MIRROR_BORDER[Math.floor(x / edge) % MIRROR_BORDER.length]);
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x - 9, y);
      ctx.fill();
      ctx.fillStyle = "rgba(250, 246, 232, 0.9)";
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, TAU);
      ctx.fill();
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let size = 124;
  ctx.font = `${size}px ${fonts.deva}`;
  const room = width * 0.86;
  const measured = ctx.measureText(navratri.card.native).width;
  if (measured > room) {
    size = Math.floor((size * room) / measured);
    ctx.font = `${size}px ${fonts.deva}`;
  }
  ctx.fillStyle = "#ffd98a";
  ctx.shadowColor = "rgba(255, 120, 40, 0.6)";
  ctx.shadowBlur = 40;
  ctx.fillText(navratri.card.native, cx, 1050);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(navratri.card.english.toLowerCase(), cx, 1118);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = rgb(mix([214, 40, 60], [255, 200, 90], 0.3));
  ctx.fillRect(cx - 36, 1146, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 48px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, cx, 1216);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.55)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), cx, height - 52);
  ctx.letterSpacing = "0px";
}
