import { JOURNEYS } from "@/journeys/content";
import { STYLES, STYLE_ORDER } from "@/lib/styles";

export type FestivalArt = "durga" | "diwali" | "chhath" | "holi" | "ganesh";

export type Festival = {
  id: FestivalArt;
  name: string;
  /** The name in Devanagari. */
  native: string;
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
  {
    id: "diwali",
    name: "Diwali",
    native: "दीपावली",
    tithi: "Kartik Amavasya",
    when: "8 November 2026",
    line: "The darkest night of the year, and a lamp in every doorway: for Ram coming home to Ayodhya, and for Lakshmi coming in.",
    path: JOURNEYS.diwali.path,
    journey: JOURNEYS.diwali.name,
  },
  {
    id: "chhath",
    name: "Chhath",
    native: "छठ पूजा",
    tithi: "Kartik Shukla Shashthi",
    when: "November 2026",
    line: "Standing in the river at dusk and again at dawn, with a winnowing basket of offerings for the sun.",
    path: JOURNEYS.chhath.path,
    journey: JOURNEYS.chhath.name,
  },
  {
    id: "holi",
    name: "Holi",
    native: "होली",
    tithi: "Phalgun Purnima",
    when: "March 2027",
    line: "Holika's fire on the full moon, and colour on everyone the morning after.",
    path: JOURNEYS.holi.path,
    journey: JOURNEYS.holi.name,
  },
  {
    id: "ganesh",
    name: "Ganesh Chaturthi",
    native: "गणेश चतुर्थी",
    tithi: "Bhadrapada Shukla Chaturthi",
    when: "September 2027",
    line: "Ten days of Bappa at home, then the walk to the sea. Ganpati Bappa Morya, pudhchya varshi lavkar ya.",
    path: JOURNEYS.ganesh.path,
    journey: JOURNEYS.ganesh.name,
  },
];

/** The Durga Puja regions, as doors into the journey from the home page. */
export const DURGA_DOORS = STYLE_ORDER.map((style) => ({
  style,
  region: STYLES[style].region,
  path: STYLES[style].path,
}));
