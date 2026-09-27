import * as THREE from "three";
import { PRATIMA } from "@/lib/pratima";
import type { PaintingStyle } from "@/lib/styles";
import { STYLES } from "@/lib/styles";
import { drawPainting, paintingHeight } from "./paintings";
import { reliefHeight } from "./paintings/layout";

export type Relief = { texture: THREE.Texture; geometry: THREE.BufferGeometry };

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

function sampleCanvas(source: CanvasImageSource, grid: number) {
  const canvas = document.createElement("canvas");
  canvas.width = grid;
  canvas.height = grid;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, grid, grid);
  return ctx.getImageData(0, 0, grid, grid).data;
}

/** One pass of a 3x3 box blur, so the silhouette edge slopes instead of stepping. */
function soften(heights: Float32Array, grid: number) {
  const out = new Float32Array(heights.length);
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const r = row + dy;
          const c = col + dx;
          if (r < 0 || c < 0 || r >= grid || c >= grid) continue;
          sum += heights[r * grid + c];
          count++;
        }
      }
      out[row * grid + col] = sum / count;
    }
  }
  return out;
}

export async function loadRelief(style: PaintingStyle, grid: number = PRATIMA.grid): Promise<Relief> {
  // Real art, when configured, replaces the Bengal painting; the folk styles stay procedural.
  const useArt = style === "bengal" && Boolean(PRATIMA.albedoUrl);
  let albedo: CanvasImageSource;
  let heights = new Float32Array(grid * grid);

  if (useArt) {
    albedo = await loadImage(PRATIMA.albedoUrl!);
  } else {
    albedo = drawPainting(style);
  }
  const alpha = sampleCanvas(albedo, grid);

  if (useArt && PRATIMA.heightUrl) {
    const depth = sampleCanvas(await loadImage(PRATIMA.heightUrl), grid);
    for (let i = 0; i < grid * grid; i++) heights[i] = (depth[i * 4] / 255) * (alpha[i * 4 + 3] / 255);
  } else {
    const scale = PRATIMA.imageSize / (grid - 1);
    for (let row = 0; row < grid; row++) {
      for (let col = 0; col < grid; col++) {
        const i = row * grid + col;
        heights[i] = paintingHeight(style, col * scale, row * scale) * (alpha[i * 4 + 3] / 255);
      }
    }
  }
  heights = soften(heights, grid);

  // PlaneGeometry lays vertices out row by row from the top-left, matching image pixels.
  const geometry = new THREE.PlaneGeometry(PRATIMA.size, PRATIMA.size, grid - 1, grid - 1);
  const position = geometry.attributes.position;
  const depthScale = PRATIMA.depth * STYLES[style].depth;
  for (let i = 0; i < position.count; i++) position.setZ(i, heights[i] * depthScale);
  geometry.computeVertexNormals();

  const texture =
    albedo instanceof HTMLCanvasElement ? new THREE.CanvasTexture(albedo) : new THREE.Texture(albedo as HTMLImageElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return { texture, geometry };
}

/** Relief height in world units at a painting pixel, for placing things on the surface. */
export function surfaceZ(px: number, py: number) {
  if (PRATIMA.heightUrl) return PRATIMA.depth * 0.7;
  return reliefHeight(px, py) * PRATIMA.depth;
}
