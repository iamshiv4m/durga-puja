import type { Kit } from "../types";
import { paintCard } from "./card";
import { createScene } from "./scene";
import { HoliScore } from "./score";

export const kit: Kit = {
  scene: createScene,
  score: () => new HoliScore(),
  card: paintCard,
};
