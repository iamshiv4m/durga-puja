import type { JourneyId, Kit } from "./types";

/** Each journey's browser-only code, loaded only on its own page. */
export const KITS: Record<JourneyId, () => Promise<Kit>> = {
  diwali: () => import("./diwali/kit").then((m) => m.kit),
  chhath: () => import("./chhath/kit").then((m) => m.kit),
  holi: () => import("./holi/kit").then((m) => m.kit),
  ganesh: () => import("./ganesh/kit").then((m) => m.kit),
  janmashtami: () => import("./janmashtami/kit").then((m) => m.kit),
  navratri: () => import("./navratri/kit").then((m) => m.kit),
  onam: () => import("./onam/kit").then((m) => m.kit),
  pongal: () => import("./pongal/kit").then((m) => m.kit),
  lohri: () => import("./lohri/kit").then((m) => m.kit),
  bihu: () => import("./bihu/kit").then((m) => m.kit),
  sankranti: () => import("./sankranti/kit").then((m) => m.kit),
};
