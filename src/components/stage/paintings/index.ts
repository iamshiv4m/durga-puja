import type { PaintingStyle } from "@/lib/styles";
import { drawBengal } from "./bengal";
import { reliefHeight } from "./layout";
import { drawMadhubani } from "./madhubani";
import { drawPachedi, pachediMask } from "./pachedi";

export function drawPainting(style: PaintingStyle): HTMLCanvasElement {
  if (style === "madhubani") return drawMadhubani();
  if (style === "pachedi") return drawPachedi();
  return drawBengal();
}

/** Relief height (0..1) at a painting pixel for a style. */
export function paintingHeight(style: PaintingStyle, x: number, y: number) {
  const h = reliefHeight(x, y);
  return style === "pachedi" ? h * pachediMask(x, y) : h;
}
