import { JourneyPage } from "@/components/journey/JourneyPage";
import { JOURNEYS } from "@/journeys/content";
import { journeyMetadata } from "@/lib/site";

export const metadata = journeyMetadata(JOURNEYS.pongal);

export default function Page() {
  return <JourneyPage id="pongal" />;
}
