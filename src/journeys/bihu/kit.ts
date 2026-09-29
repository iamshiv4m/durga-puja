import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { BihuScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new BihuScore(),
  card: paintCard,
};
