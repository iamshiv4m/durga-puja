export type AstraKind =
  | "trishul"
  | "khadga"
  | "chakra"
  | "baan"
  | "shakti"
  | "khetaka"
  | "dhanush"
  | "naagpaash"
  | "ankush"
  | "ghanta";

export type Astra = {
  kind: AstraKind;
  name: string;
  /** The astra's name in Bengali, Devanagari and Gujarati script. */
  native: { bn: string; hi: string; gu: string };
  meaning: string;
  giver: string;
  body: string[];
};

/**
 * The order follows Bengal's Durgā dhyāna: trident, sword, discus, sharp arrow and spear in the
 * right hands; shield, full-drawn bow, noose, goad and bell in the left. Givers follow the
 * Devī Māhātmya (chapter 2) where it names one.
 */
export const ASTRAS: Astra[] = [
  {
    kind: "trishul",
    name: "Triśūla",
    native: { bn: "ত্রিশূল", hi: "त्रिशूल", gu: "ત્રિશૂળ" },
    meaning: "the trident",
    giver: "from Shiva",
    body: [
      "Shiva drew a trident out of his own and placed it in her hand.",
      "It is the weapon that ends the battle: in every Bengali pratima it is the trishul that pierces Mahishasura's chest.",
    ],
  },
  {
    kind: "khadga",
    name: "Khaḍga",
    native: { bn: "খড়্গ", hi: "खड्ग", gu: "ખડ્ગ" },
    meaning: "the sword",
    giver: "from Kāla, Time",
    body: [
      "Time himself gave her a sword, and with it a spotless shield.",
      "Only time cuts through everything; nothing it touches stays whole.",
    ],
  },
  {
    kind: "chakra",
    name: "Cakra",
    native: { bn: "চক্র", hi: "चक्र", gu: "ચક્ર" },
    meaning: "the discus",
    giver: "from Vishnu",
    body: [
      "Vishnu brought forth a discus from his own Sudarshana.",
      "It turns without beginning or end, the wheel of order that keeps the worlds in their places.",
    ],
  },
  {
    kind: "baan",
    name: "Tīkṣṇa Bāṇa",
    native: { bn: "বাণ", hi: "बाण", gu: "બાણ" },
    meaning: "the sharp arrow",
    giver: "from Vāyu, the Wind",
    body: [
      "The Wind gave her quivers that never empty.",
      "An arrow is intention made visible: once loosed, it does not turn back.",
    ],
  },
  {
    kind: "shakti",
    name: "Śakti",
    native: { bn: "শক্তি", hi: "शक्ति", gu: "શક્તિ" },
    meaning: "the spear",
    giver: "from Agni, Fire",
    body: [
      "Agni gave her a spear of his own fire.",
      "It shares her name. The weapon and the one who holds it are the same power.",
    ],
  },
  {
    kind: "khetaka",
    name: "Kheṭaka",
    native: { bn: "ঢাল", hi: "ढाल", gu: "ઢાલ" },
    meaning: "the shield",
    giver: "from Kāla, Time",
    body: [
      "It came with the sword: Time gives both the blow and the shelter from it.",
      "She holds it in her upper left hand, turned toward those who come to her.",
    ],
  },
  {
    kind: "dhanush",
    name: "Pūrṇa Cāpa",
    native: { bn: "ধনুক", hi: "धनुष", gu: "ધનુષ" },
    meaning: "the bow, drawn full",
    giver: "from Vāyu, the Wind",
    body: [
      "The Wind gave the bow along with the arrows, so the string would sing.",
      "The dhyāna calls it pūrṇa, full: drawn to the ear, never half-hearted.",
    ],
  },
  {
    kind: "naagpaash",
    name: "Nāgapāśa",
    native: { bn: "নাগপাশ", hi: "नागपाश", gu: "નાગપાશ" },
    meaning: "the serpent noose",
    giver: "from Varuṇa, lord of the waters",
    body: [
      "Varuna gave her a noose. In Bengal it is shaped as a serpent, and it is the snake that binds Mahishasura's arms.",
      "What it holds cannot slip away, not even by changing shape.",
    ],
  },
  {
    kind: "ankush",
    name: "Aṅkuśa",
    native: { bn: "অঙ্কুশ", hi: "अंकुश", gu: "અંકુશ" },
    meaning: "the goad",
    giver: "the texts differ on its giver",
    body: [
      "The elephant goad does not kill. It steers.",
      "It is the gentlest of her weapons and perhaps the most patient: the one that turns a mind back to the path.",
    ],
  },
  {
    kind: "ghanta",
    name: "Ghaṇṭā",
    native: { bn: "ঘণ্টা", hi: "घंटा", gu: "ઘંટ" },
    meaning: "the bell",
    giver: "from Indra, taken from Airāvata",
    body: [
      "Indra untied the bell from his white elephant Airavata and gave it to her.",
      "Its sound drives away what should not stay. Every aarti begins with it still.",
    ],
  },
];
