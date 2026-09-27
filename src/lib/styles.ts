export type PaintingStyle = "bengal" | "madhubani" | "pachedi";

export type StyleInfo = {
  region: string;
  /** URL path of this region's page. */
  path: string;
  /** Page and share title. */
  title: string;
  name: string;
  native: string;
  /** Script of `native`, for picking the right font. */
  script: "bn" | "hi" | "gu";
  note: string;
  /** Relief depth relative to `PRATIMA.depth`: sculpted clay, a painted mud wall, a cloth. */
  depth: number;
  /** How much the surface sways like hanging cloth. */
  sway: number;
  /** Colour of the eyes before they are painted: bare clay, mud wall or undyed cotton. */
  bare: [number, number, number];
};

export const STYLE_ORDER: PaintingStyle[] = ["bengal", "madhubani", "pachedi"];

export const STYLES: Record<PaintingStyle, StyleInfo> = {
  bengal: {
    region: "Bengal",
    path: "/durga-puja",
    title: "Trinayanī — the eyes of Durga",
    name: "Kumartuli pratima",
    native: "কুমোরটুলি",
    script: "bn",
    note: "Clay, shola and gold, shaped by the potters of Kumartuli.",
    depth: 1,
    sway: 0,
    bare: [0.34, 0.22, 0.13],
  },
  madhubani: {
    region: "Bihar",
    path: "/durga-puja/bihar",
    title: "Trinayanī — Durga Puja in Bihar",
    name: "Madhubani",
    native: "मधुबनी",
    script: "hi",
    note: "Double outlines, flat colour and not one empty space, as painted on the mud walls of Mithila in Bihar.",
    depth: 0.5,
    sway: 0,
    bare: [0.46, 0.33, 0.2],
  },
  pachedi: {
    region: "Gujarat",
    path: "/durga-puja/gujarat",
    title: "Trinayanī — Navratri in Gujarat",
    name: "Mata ni Pachedi",
    native: "માતા ની પછેડી",
    script: "gu",
    note: "The Mother's cloth: red, black and white, painted by the Devipujak community of Ahmedabad.",
    depth: 0.2,
    sway: 1,
    bare: [0.66, 0.6, 0.5],
  },
};

/** The region pages under /durga-puja, other than Bengal at /durga-puja itself, by URL slug. */
export const REGION_SLUGS: Record<string, PaintingStyle> = { bihar: "madhubani", gujarat: "pachedi" };

export const SCRIPT_CLASS = { bn: "bangla", hi: "deva", gu: "gujarati" } as const;
