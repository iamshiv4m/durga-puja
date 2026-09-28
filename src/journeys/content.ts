import { chhath } from "./chhath/content";
import { diwali } from "./diwali/content";
import { ganesh } from "./ganesh/content";
import { holi } from "./holi/content";
import type { JourneyContent, JourneyId } from "./types";

export const JOURNEYS: Record<JourneyId, JourneyContent> = { diwali, chhath, holi, ganesh };
