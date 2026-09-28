import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { ChhathScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new ChhathScore(),
  card: paintCard,
};
