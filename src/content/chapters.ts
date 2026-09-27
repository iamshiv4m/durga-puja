import type { Window4 } from "@/lib/math";
import type { PaintingStyle } from "@/lib/styles";

/** When each caption fades in and out; shared by every region so the scene stays in step. */
export const HERO_WINDOW: Window4 = [0, 0, 0.05, 0.09];
export const CHAPTER_WINDOWS: Window4[] = [
  [0.11, 0.13, 0.22, 0.25],
  [0.26, 0.28, 0.34, 0.37],
  [0.38, 0.4, 0.47, 0.5],
  [0.51, 0.53, 0.6, 0.63],
  [0.64, 0.66, 0.705, 0.725],
  [0.78, 0.8, 0.86, 0.89],
];
export const CHAPTER_SIDES: ("left" | "right")[] = ["right", "left", "right", "left", "left", "right"];
export const WHISPER_WINDOW: Window4 = [0.9, 0.92, 0.975, 0.998];
/** Inside the third eye, between the dive and the flash. */
export const MANTRA_WINDOW: Window4 = [0.736, 0.744, 0.752, 0.76];
export const MANTRA = { sanskrit: "ॐ दुं दुर्गायै नमः", english: "om dum durgāyai namaḥ" };
export const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

export const TITLE = "Trinayanī";

export type Chapter = { title: string; native: string; tithi: string; body: string };

export type Story = {
  /** "Trinayani" in the region's script. */
  native: string;
  tagline: string;
  greeting: string;
  chapters: Chapter[];
  whisper: { native: string; english: string };
  /** The Dashami greeting on the card the reader can make and send. */
  bijoya: { native: string; english: string };
  /** The line under the title on share images. */
  share: string;
  returnLink: string;
};

export const STORIES: Record<PaintingStyle, Story> = {
  bengal: {
    native: "ত্রিনয়নী",
    tagline: "she who sees with three eyes",
    greeting: "জয় মা দুর্গা",
    chapters: [
      {
        title: "Chokkhu Daan",
        native: "চক্ষুদান",
        tithi: "Mahalaya",
        body: "The artisan paints her eyes last, at dawn on Mahalaya. Until then she is only clay.",
      },
      {
        title: "Bodhon",
        native: "বোধন",
        tithi: "Shashthi",
        body: "Under a bel tree at dusk, the conch is blown and she is woken.",
      },
      {
        title: "Dashabhuja",
        native: "দশভুজা",
        tithi: "Saptami",
        body: "Ten arms, and in each a gift. Every god gave her what he held.",
      },
      {
        title: "Sandhi",
        native: "সন্ধিপূজা",
        tithi: "Ashtami → Navami",
        body: "Forty-eight minutes where one day meets the next. A hundred and eight lamps, lit one by one.",
      },
      {
        title: "Mahishāsuramardinī",
        native: "মহিষাসুরমর্দিনী",
        tithi: "Navami",
        body: "The buffalo-demon changed his shape again and again. Her third eye saw through every one.",
      },
      {
        title: "Bisarjan",
        native: "বিসর্জন",
        tithi: "Dashami",
        body: "Sindoor on her forehead, sweets at her lips, and then the river takes her home.",
      },
    ],
    whisper: { native: "আসছে বছর আবার হবে", english: "she will come again next year" },
    bijoya: { native: "শুভ বিজয়া", english: "Shubho Bijoya" },
    share: "The five days of Durga Puja, from Chokkhu Daan to Bisarjan.",
    returnLink: "return to Mahalaya",
  },

  madhubani: {
    native: "त्रिनयनी",
    tagline: "she who sees with three eyes",
    greeting: "जय माँ दुर्गा",
    chapters: [
      {
        title: "Kalash Sthapana",
        native: "कलश स्थापना",
        tithi: "Pratipada",
        body: "A pot of water, mango leaves and a coconut, and barley sown in the earth beside it. For nine days she lives here first.",
      },
      {
        title: "Bel Nimantran",
        native: "बेल निमंत्रण",
        tithi: "Shashthi",
        body: "At dusk the family goes to a bel tree and asks her, with folded hands, to come and stay.",
      },
      {
        title: "Pat Khulna",
        native: "पट खुलना",
        tithi: "Saptami",
        body: "At dawn the curtain is drawn back, and the whole town comes to see her for the first time.",
      },
      {
        title: "Sandhi",
        native: "संधि पूजा",
        tithi: "Ashtami → Navami",
        body: "Forty-eight minutes where one day meets the next. A hundred and eight lamps, lit one by one.",
      },
      {
        title: "Kanya Pujan",
        native: "कन्या पूजन",
        tithi: "Navami",
        body: "Nine young girls are fed and honoured as her nine forms. Mahishasura changes his shape once more; her third eye sees through him.",
      },
      {
        title: "Visarjan",
        native: "विसर्जन",
        tithi: "Dashami",
        body: "Drums, “Jai Mata Di”, and a procession to the Ganga. The river takes her home.",
      },
    ],
    whisper: { native: "माँ, अगले बरस फिर आना", english: "come again next year, Maa" },
    bijoya: { native: "शुभ विजयादशमी", english: "Shubh Vijayadashami" },
    share: "Durga Puja in Bihar, from Kalash Sthapana to Visarjan.",
    returnLink: "return to Pratipada",
  },

  pachedi: {
    native: "ત્રિનયની",
    tagline: "she who sees with three eyes",
    greeting: "જય અંબે",
    chapters: [
      {
        title: "Ghatasthapana",
        native: "ઘટસ્થાપના",
        tithi: "The first night",
        body: "A clay garbo, pierced all over, is set down with a lamp inside it. The pot is the womb; the flame is the Mother.",
      },
      {
        title: "Garba",
        native: "ગરબા",
        tithi: "The nine nights",
        body: "Around the garbo the circle turns and claps. It has no first dancer and no last.",
      },
      {
        title: "Amba",
        native: "અંબા",
        tithi: "Mataji",
        body: "Amba Maa on her lion, and in every hand a gift of the gods.",
      },
      {
        title: "Aatham",
        native: "આઠમ",
        tithi: "The eighth night",
        body: "The havan fire is lit, and lamps are set around the garbo until no dark is left.",
      },
      {
        title: "Dandiya Raas",
        native: "દાંડિયા રાસ",
        tithi: "Navami",
        body: "Sticks struck in pairs, for the Mother's sword against Mahishasura. Her third eye sees through every disguise.",
      },
      {
        title: "Dashera",
        native: "દશેરા",
        tithi: "Dashami",
        body: "The last circle closes, and what was set down on the first night is given to the water.",
      },
    ],
    whisper: { native: "આવતા વર્ષે ફરી આવજો, મા", english: "come again next year, Maa" },
    bijoya: { native: "શુભ દશેરા", english: "Shubh Dashera" },
    share: "Navratri in Gujarat, from Ghatasthapana to Dashera.",
    returnLink: "return to the first night",
  },
};

export const VERSES = [
  {
    sanskrit: "या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता ।\nनमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः ॥",
    english:
      "To the Goddess who dwells in every being as power: salutations to her, salutations to her, salutations to her, again and again.",
    source: "Devī Māhātmya, chapter 5",
  },
  {
    sanskrit: "सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके ।\nशरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते ॥",
    english:
      "Auspiciousness of all that is auspicious, gracious one who fulfils every aim, refuge, three-eyed Gaurī, Nārāyaṇī: salutations to you.",
    source: "Devī Māhātmya 11.10",
  },
];
