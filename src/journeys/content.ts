import { bihu } from "./bihu/content";
import { chhath } from "./chhath/content";
import { diwali } from "./diwali/content";
import { ganesh } from "./ganesh/content";
import { holi } from "./holi/content";
import { janmashtami } from "./janmashtami/content";
import { lohri } from "./lohri/content";
import { navratri } from "./navratri/content";
import { onam } from "./onam/content";
import { pongal } from "./pongal/content";
import { sankranti } from "./sankranti/content";
import type { JourneyContent, JourneyId } from "./types";

export const JOURNEYS: Record<JourneyId, JourneyContent> = {
  diwali,
  chhath,
  holi,
  ganesh,
  janmashtami,
  navratri,
  onam,
  pongal,
  lohri,
  bihu,
  sankranti,
};
