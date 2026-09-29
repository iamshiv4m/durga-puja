import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { LohriScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new LohriScore(),
  card: paintCard,
};
