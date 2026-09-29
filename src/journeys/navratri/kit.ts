import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { NavratriScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new NavratriScore(),
  card: paintCard,
};
