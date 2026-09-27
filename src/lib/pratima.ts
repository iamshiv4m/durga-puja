/**
 * Everything that depends on the particular Durga painting lives here.
 *
 * With `albedoUrl` / `heightUrl` left as null the stage draws the procedural paintings in
 * `components/stage/paintings`. Real art replaces the Bengal style only.
 * To use real art, run `tools/make_relief.py` on a painting and point these at its output:
 *   albedoUrl: "/pratima/albedo.png"  (RGBA, the figure cut out on transparent alpha)
 *   heightUrl: "/pratima/height.png"  (greyscale depth, white = nearest)
 * then re-measure the eye / sindoor regions below in the painting's pixel coordinates.
 */
export const PRATIMA = {
  albedoUrl: null as string | null,
  heightUrl: null as string | null,

  /** Pixel size of the (square) painting that the regions below are measured in. */
  imageSize: 1024,
  /** World units spanned by the painting, centred on the origin, +y up, facing +z. */
  size: 10,
  /** Vertices per side of the relief mesh. */
  grid: 320,
  /** World depth for height 1. */
  depth: 3.4,

  /** Ellipses in painting pixels: centre x/y, radius x/y. */
  eyes: {
    left: { x: 400, y: 462, rx: 102, ry: 44 },
    right: { x: 624, y: 462, rx: 102, ry: 44 },
    third: { x: 512, y: 392, rx: 18, ry: 40 },
  },
  /** Where sindoor is smeared at Dashami: across the forehead, around (not over) the third eye. */
  sindoor: { x: 512, y: 404, rx: 92, ry: 52 },
} as const;

export type Ellipse = { x: number; y: number; rx: number; ry: number };

/** Painting pixels to UV (v up). */
export function ellipseUv(e: Ellipse): [number, number, number, number] {
  const s = PRATIMA.imageSize;
  return [e.x / s, 1 - e.y / s, e.rx / s, e.ry / s];
}

/** Painting pixels to world x/y on the relief plane. */
export function pixelToWorld(px: number, py: number): [number, number] {
  const s = PRATIMA.imageSize;
  return [(px / s - 0.5) * PRATIMA.size, (0.5 - py / s) * PRATIMA.size];
}
