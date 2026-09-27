import { STORIES } from "@/content/chapters";
import { SCRIPT_CLASS, STYLES, type PaintingStyle } from "@/lib/styles";

// The Bijoya card: her face in the reader's chosen style, the Dashami greeting in the region's
// script, and the reader's name, as a portrait PNG sized for WhatsApp and Instagram.

export const CARD = { width: 1080, height: 1350 };

const GLOW: Record<PaintingStyle, string> = { bengal: "#5c1409", madhubani: "#5a2808", pachedi: "#551009" };
const SCRIPT_FONT = { bangla: "--font-bangla", deva: "--font-deva", gujarati: "--font-gujarati" } as const;

function family(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** Sets `font` at `size`, shrinking it until `text` fits in `max` pixels. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, max: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 12 && ctx.measureText(text).width > max) {
    s -= 2;
    ctx.font = font(s);
  }
}

export async function renderCard(style: PaintingStyle, name: string, link: string): Promise<Blob> {
  const { width, height } = CARD;
  const story = STORIES[style];
  const script = SCRIPT_CLASS[STYLES[style].script];
  const native = family(SCRIPT_FONT[script], "serif");
  const serif = family("--font-serif", "Georgia, serif");
  const sc = family("--font-sc", "Georgia, serif");
  const signed = name.trim() ? `with love, ${name.trim()}` : "";
  await Promise.all([
    document.fonts.load(`96px ${native}`, story.bijoya.native + story.whisper.native),
    document.fonts.load(`italic 40px ${serif}`, signed || "a"),
    document.fonts.load(`30px ${sc}`, story.bijoya.english),
  ]);
  const { drawPainting } = await import("@/components/stage/paintings");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0b0405";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, 470, 40, width / 2, 470, 760);
  glow.addColorStop(0, GLOW[style]);
  glow.addColorStop(1, "rgba(11, 4, 5, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Her crown and face, fading into the dark below the chin.
  const painting = drawPainting(style);
  const unit = painting.width / 1024;
  const face = document.createElement("canvas");
  face.width = 860;
  face.height = 946;
  const f = face.getContext("2d")!;
  f.drawImage(painting, 112 * unit, 0, 800 * unit, 880 * unit, 0, 0, face.width, face.height);
  // Keep only what the stage shows: the pratima is cut out where the painting is under half opaque.
  const pixels = f.getImageData(0, 0, face.width, face.height);
  for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] < 128 ? 0 : 255;
  f.putImageData(pixels, 0, 0);
  const fade = f.createLinearGradient(0, 0, 0, face.height);
  fade.addColorStop(0, "#000");
  fade.addColorStop(0.76, "#000");
  fade.addColorStop(1, "rgba(0, 0, 0, 0)");
  f.globalCompositeOperation = "destination-in";
  f.fillStyle = fade;
  f.fillRect(0, 0, face.width, face.height);
  ctx.drawImage(face, (width - face.width) / 2, 64);

  // A thin gold double border, as on a printed Bijoya card.
  ctx.strokeStyle = "rgba(217, 166, 74, 0.75)";
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, width - 68, height - 68);
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, width - 92, height - 92);
  ctx.fillStyle = "#d9a64a";
  for (const [x, y] of [
    [40, 40],
    [width - 40, 40],
    [40, height - 40],
    [width - 40, height - 40],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const max = width - 180;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#e4b45c";
  fit(ctx, story.bijoya.native, (s) => `${s}px ${native}`, 104, max);
  ctx.fillText(story.bijoya.native, width / 2, 1090);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(242, 233, 214, 0.8)";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
  fit(ctx, story.bijoya.english.toLowerCase(), (s) => `${s}px ${sc}`, 32, max);
  ctx.fillText(story.bijoya.english.toLowerCase(), width / 2, 1148);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  ctx.fillStyle = "rgba(242, 233, 214, 0.62)";
  fit(ctx, story.whisper.native, (s) => `${s}px ${native}`, 36, max);
  ctx.fillText(story.whisper.native, width / 2, 1204);

  if (signed) {
    ctx.fillStyle = "#f2e9d6";
    fit(ctx, signed, (s) => `italic ${s}px ${serif}`, 44, max);
    ctx.fillText(signed, width / 2, 1262);
  }

  ctx.fillStyle = "rgba(217, 166, 74, 0.85)";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  fit(ctx, link, (s) => `${s}px ${sc}`, 22, max);
  ctx.fillText(link, width / 2, 1306);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("could not make the card"))), "image/png"),
  );
}
