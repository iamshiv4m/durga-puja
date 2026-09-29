import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { SankrantiScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new SankrantiScore(),
  card: paintCard,
};
