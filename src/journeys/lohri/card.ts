import { TAU, glowSprite, mix, mulberry32, rgb, type RGB } from "../paint";
import type { CardFonts, CardSize } from "../types";
import { lohri } from "./content";
import { clump, wheatColour } from "./fields";
import { drawKite, tongue } from "./places";

type Ctx = CanvasRenderingContext2D;

/**
 * Lakh lakh vadhaiyan: the Lohri fire at the foot of the card between two stooks of ripe wheat,
 * sparks going up into the night, a kite, all inside a border of phulkari.
 */
export function paintCard(
  ctx: Ctx,
  { width, height }: CardSize,
  name: string,
  link: string,
  fonts: CardFonts,
) {
  const random = mulberry32(1301);
  const ground = ctx.createLinearGradient(0, 0, 0, height);
  ground.addColorStop(0, "#0b0a1c");
  ground.addColorStop(0.55, "#1c1024");
  ground.addColorStop(0.85, "#3a1a14");
  ground.addColorStop(1, "#1a0c08");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);
  // Everything inside the border.
  ctx.save();
  ctx.beginPath();
  ctx.rect(66, 66, width - 132, height - 132);
  ctx.clip();

  // Stars, and a kite up in them.
  ctx.fillStyle = "#f2e9d6";
  for (let i = 0; i < 180; i++) {
    ctx.globalAlpha = 0.2 + random() * 0.6;
    const s = 1 + random() * 2;
    ctx.fillRect(random() * width, random() ** 1.5 * height * 0.55, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(width * 0.24, 230);
  ctx.scale(90, 90);
  drawKite(ctx, 0, 0, 0.5, [236, 132, 22], 0.6, 1);
  ctx.restore();

  // The glow of the fire over everything low down.
  const fireX = width / 2;
  const fireY = height - 150;
  const glow = (color: string, x: number, y: number, r: number, a: number) => {
    ctx.globalAlpha = a;
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  };
  ctx.globalCompositeOperation = "lighter";
  glow("255, 120, 40", fireX, fireY - 140, 620, 0.45);
  glow("255, 170, 80", fireX, fireY - 90, 260, 0.5);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Two stooks of wheat, one each side of the fire.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(fireX + side * 318, height - 110);
    ctx.scale(218, 218);
    stook(ctx, side, mulberry32(side > 0 ? 7 : 8));
    ctx.restore();
  }

  // The fire: the pile of logs, its tongues, the paathiyan round its foot.
  ctx.save();
  ctx.translate(fireX, fireY);
  ctx.scale(150, 150);
  ctx.fillStyle = "#2a160c";
  ctx.beginPath();
  ctx.moveTo(-1.1, 0.05);
  ctx.lineTo(0, -1.05);
  ctx.lineTo(1.1, 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2a16";
  ctx.lineWidth = 0.07;
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const x = -1 + (i / 8) * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0.05);
    ctx.lineTo(x * 0.1, -1.0);
    ctx.stroke();
  }
  const row = (
    count: number,
    scale: number,
    w: number,
    spread: number,
    seed: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const dx = (t * 2 - 1) * spread;
      const centre = 1 - Math.abs(dx);
      tongue(
        ctx,
        dx,
        -centre * 0.65 + 0.08,
        scale * (0.45 + 0.75 * centre) * (0.8 + 0.3 * Math.sin(seed + i * 2.1)),
        w,
        0.8 + i * 0.37,
        seed + i * 1.7,
        1,
      );
    }
  };
  row(6, 2.6, 0.6, 0.72, 1);
  row(9, 1.7, 0.44, 0.88, 4);
  row(11, 0.75, 0.34, 1.0, 7);
  ctx.fillStyle = "#6a4a30";
  for (let i = 0; i < 11; i++) {
    ctx.beginPath();
    ctx.ellipse(-1.05 + i * 0.21, 0.02, 0.12, 0.08, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Sparks going up.
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 90; i++) {
    const t = random();
    const x =
      fireX + (random() - 0.5) * (80 + t * 520) + Math.sin(t * 9 + i) * 40;
    const y = fireY - 280 - t * 620;
    glow("255, 180, 80", x, y, 6 + random() * 8, (1 - t) * 0.9);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // A darker band behind the words.
  const band = ctx.createLinearGradient(0, 470, 0, 880);
  band.addColorStop(0, "rgba(11, 10, 28, 0)");
  band.addColorStop(0.3, "rgba(11, 10, 28, 0.55)");
  band.addColorStop(0.75, "rgba(11, 10, 28, 0.55)");
  band.addColorStop(1, "rgba(11, 10, 28, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 470, width, 410);
  ctx.restore();

  phulkari(ctx, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let size = 124;
  ctx.font = `${size}px ${fonts.deva}`;
  const room = width * 0.8;
  const measured = ctx.measureText(lohri.card.native).width;
  if (measured > room) {
    size = Math.floor((size * room) / measured);
    ctx.font = `${size}px ${fonts.deva}`;
  }
  ctx.fillStyle = "#ffd98a";
  ctx.shadowColor = "rgba(255, 120, 40, 0.6)";
  ctx.shadowBlur = 40;
  ctx.fillText(lohri.card.native, width / 2, 660);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.82)";
  ctx.font = `34px ${fonts.sc}`;
  ctx.letterSpacing = "10px";
  ctx.fillText(lohri.card.english.toLowerCase(), width / 2, 738);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#f29a2a";
  ctx.fillRect(width / 2 - 36, 772, 72, 2);
  if (name) {
    ctx.fillStyle = "#f2e9d6";
    ctx.font = `italic 300 50px ${fonts.serif}`;
    ctx.fillText(`with love, ${name}`, width / 2, 850, width - 220);
  }
  ctx.fillStyle = "rgba(242, 233, 214, 0.6)";
  ctx.font = `24px ${fonts.sc}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(link.toLowerCase(), width / 2, height - 84);
  ctx.letterSpacing = "0px";
}

/** A stook of ripe wheat, `side` saying which way it leans out. */
function stook(ctx: Ctx, side: number, random: () => number) {
  const colour = wheatColour(1);
  for (let i = 0; i < 26; i++) {
    const t = i / 25 - 0.5;
    ctx.save();
    ctx.rotate(t * 0.5 + side * 0.08);
    clump(ctx, t * 0.3, 0, 1.3 + random() * 0.3, 3, colour, random, 0);
    ctx.restore();
  }
  ctx.fillStyle = rgb(mix(colour.stalk, [80, 50, 20], 0.5));
  ctx.fillRect(-0.28, -0.5, 0.56, 0.06);
}

/**
 * A border of phulkari: on a madder-red ground, darned in gold and orange silk, the bagh's
 * diamonds, each with a smaller one inside and a spark at its heart.
 */
function phulkari(ctx: Ctx, width: number, height: number) {
  const inset = 26;
  const band = 40;
  const red: RGB = [128, 22, 30];
  ctx.fillStyle = rgb(red);
  ctx.fillRect(inset, inset, width - inset * 2, band);
  ctx.fillRect(inset, height - inset - band, width - inset * 2, band);
  ctx.fillRect(inset, inset, band, height - inset * 2);
  ctx.fillRect(width - inset - band, inset, band, height - inset * 2);
  const motif = (cx: number, cy: number, k: number) => {
    const r = band * 0.42;
    ctx.fillStyle = k % 2 ? "#f2b02a" : "#f6d060";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = k % 3 === 0 ? "#e8641c" : rgb(red);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.55, cy);
    ctx.lineTo(cx, cy + r * 0.55);
    ctx.lineTo(cx - r * 0.55, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff4d8";
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  };
  let k = 0;
  for (let x = inset + band / 2; x < width - inset; x += band) {
    motif(x, inset + band / 2, k);
    motif(x, height - inset - band / 2, k + 1);
    k++;
  }
  for (let y = inset + band * 1.5; y < height - inset - band; y += band) {
    motif(inset + band / 2, y, k);
    motif(width - inset - band / 2, y, k + 1);
    k++;
  }
  // Fine gold lines either side of the border.
  ctx.strokeStyle = "rgba(246, 208, 96, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    inset - 6,
    inset - 6,
    width - (inset - 6) * 2,
    height - (inset - 6) * 2,
  );
  ctx.strokeRect(
    inset + band + 6,
    inset + band + 6,
    width - (inset + band + 6) * 2,
    height - (inset + band + 6) * 2,
  );
}
