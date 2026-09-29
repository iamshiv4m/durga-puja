import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { OnamScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new OnamScore(),
  card: paintCard,
};
