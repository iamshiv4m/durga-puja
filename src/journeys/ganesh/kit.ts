import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { GaneshScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new GaneshScore(),
  card: paintCard,
};
