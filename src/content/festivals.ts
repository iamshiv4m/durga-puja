import { JOURNEYS } from "@/journeys/content";
import type { JourneyId, Script } from "@/journeys/types";
import { STYLES, STYLE_ORDER } from "@/lib/styles";

export type FestivalArt = "durga" | JourneyId;

export type Festival = {
  id: FestivalArt;
  name: string;
  /** The name in its own script. */
  native: string;
  /** Devanagari (Hindi) if unset. */
  lang?: string;
  script?: Script;
  /** The tithi or month it falls in. */
  tithi: string;
  /** When it falls next, in words. */
  when: string;
  line: string;
  /** Set once the festival's own page is open. */
  path?: string;
  /** The journey's own name, when it has one. */
  journey?: string;
};

/** A festival with its own journey page takes its name, script and path from the journey. */
function journey(
  id: JourneyId,
  tithi: string,
  when: string,
  line: string,
  name = JOURNEYS[id].festival,
): Festival {
  const j = JOURNEYS[id];
  return {
    id,
    name,
    native: j.native,
    lang: j.lang,
    script: j.script,
    tithi,
    when,
    line,
    path: j.path,
    journey: j.name,
  };
}

/** In the order they come round, starting from the one that is open now. */
export const FESTIVALS: Festival[] = [
  {
    id: "durga",
    name: "Durga Puja",
    native: "दुर्गा पूजा",
    tithi: "Ashwin · Mahalaya to Dashami",
    when: "Mahalaya 10 October · Pujo 17–21 October 2026",
    line: "Her eyes painted on Mahalaya, the dhak at Sandhi, and her farewell at the river. As it is kept in Bengal, Bihar and Gujarat.",
    path: STYLES.bengal.path,
    journey: "Trinayanī",
  },
  journey(
    "navratri",
    "Ashwin Shukla Pratipada to Navami",
    "11–19 October 2026 · Dussehra 20 October",
    "Nine nights for the nine forms of the goddess: a lamp in a clay pot, a circle of garba around it, and on the tenth day Ravana burns.",
  ),
  journey(
    "diwali",
    "Kartik Amavasya",
    "8 November 2026",
    "The darkest night of the year, and a lamp in every doorway: for Ram coming home to Ayodhya, and for Lakshmi coming in.",
  ),
  journey(
    "chhath",
    "Kartik Shukla Shashthi",
    "November 2026",
    "Standing in the river at dusk and again at dawn, with a winnowing basket of offerings for the sun.",
  ),
  journey(
    "lohri",
    "Maghi eve · Vaisakh 1",
    "Lohri 13 January · Baisakhi 14 April 2027",
    "A bonfire in the winter night with rewri and peanuts thrown in, then the wheat turning gold and the dhol calling everyone to the fields.",
  ),
  journey(
    "sankranti",
    "The sun enters Makara",
    "14 January 2027",
    "The one festival kept by the sun, not the moon: kites on every roof, til and gur, khichdi, and a dip where the rivers meet.",
  ),
  journey(
    "pongal",
    "Thai 1",
    "13–16 January 2027",
    "Rice and new jaggery boiling over in a clay pot in the sun, a kolam at every door, and a day for the cattle who ploughed the fields.",
  ),
  journey(
    "holi",
    "Phalgun Purnima",
    "March 2027",
    "Holika's fire on the full moon, and colour on everyone the morning after.",
  ),
  journey(
    "bihu",
    "Bohag 1",
    "14 April 2027",
    "The Assamese new year: cattle bathed in the river, a gamosa for everyone you love, and the dhol and pepa under the spring trees.",
  ),
  journey(
    "onam",
    "Chingam · Atham to Thiruvonam",
    "August–September 2027",
    "Ten days of flower carpets for King Mahabali's visit home, the snake boats on the backwaters, and a feast on a banana leaf.",
  ),
  journey(
    "janmashtami",
    "Bhadrapada Krishna Ashtami",
    "August–September 2027",
    "Midnight in a prison in Mathura, a storm over the Yamuna, and a baby carried across it in a basket. Then the pots of butter hung high.",
  ),
  journey(
    "ganesh",
    "Bhadrapada Shukla Chaturthi",
    "September 2027",
    "Ten days of Bappa at home, then the walk to the sea. Ganpati Bappa Morya, pudhchya varshi lavkar ya.",
  ),
];

/** The Durga Puja regions, as doors into the journey from the home page. */
export const DURGA_DOORS = STYLE_ORDER.map((style) => ({
  style,
  region: STYLES[style].region,
  path: STYLES[style].path,
}));
