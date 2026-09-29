import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { JanmashtamiScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new JanmashtamiScore(),
  card: paintCard,
};
