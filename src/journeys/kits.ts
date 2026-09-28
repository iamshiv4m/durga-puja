import type { JourneyId, Kit } from "./types";

/** Each journey's browser-only code, loaded only on its own page. */
export const KITS: Record<JourneyId, () => Promise<Kit>> = {
  diwali: () => import("./diwali/kit").then((m) => m.kit),
  chhath: () => import("./chhath/kit").then((m) => m.kit),
  holi: () => import("./holi/kit").then((m) => m.kit),
  ganesh: () => import("./ganesh/kit").then((m) => m.kit),
};
