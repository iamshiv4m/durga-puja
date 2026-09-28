import type { Kit } from "../types";

// Placeholder until the Makar Sankranti scene, score and card are written.
export const kit: Kit = {
  scene: () => ({
    draw(ctx, { width, height }) {
      ctx.fillStyle = "#05070c";
      ctx.fillRect(0, 0, width, height);
    },
  }),
  score: () => ({ start() {}, schedule() {}, update() {} }),
  card: (ctx, { width, height }) => {
    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, width, height);
  },
};
