import type { CardFonts, CardSize } from "../types";

export function paintCard(ctx: CanvasRenderingContext2D, { width, height }: CardSize, name: string, link: string, fonts: CardFonts) {
  ctx.fillStyle = "#04060c";
  ctx.fillRect(0, 0, width, height);
  void name;
  void link;
  void fonts;
}
