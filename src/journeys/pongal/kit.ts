import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { PongalScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new PongalScore(),
  card: paintCard,
};
