import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { DiwaliScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new DiwaliScore(),
  card: paintCard,
};
