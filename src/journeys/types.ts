import type { Window4 } from "@/lib/math";
import type { Voices } from "./voices";

// A festival journey is two halves:
// - its content (words, timings, metadata), plain data that the server renders
// - its kit (scene, score and card), browser-only code loaded on the page (./kits.ts)

export type JourneyId = "diwali" | "chhath" | "holi" | "ganesh";

export type JourneyChapter = {
  tithi: string;
  title: string;
  /** The title in Devanagari. */
  native: string;
  body: string;
  /** When the caption fades in and out, as scroll progress. */
  window: Window4;
  side: "left" | "right";
};

export type SoundCredit = { what: string; by: string; source: string; license: string; licenseUrl: string };

export type JourneyContent = {
  id: JourneyId;
  /** URL path of the page, e.g. "/diwali". */
  path: string;
  /** The journey's own name, in the header and on share images. */
  name: string;
  /** The festival's everyday name. */
  festival: string;
  /** The name in Devanagari, over the title. */
  native: string;
  /** BCP 47 code for the Devanagari text (hi, mr, bho, sa). */
  lang: string;
  tagline: string;
  /** Top right corner, in Devanagari. */
  greeting: string;
  pageTitle: string;
  description: string;
  /** The line under the title on share images. */
  share: string;
  keywords: string[];
  /** Height of the scroll journey, in vh. */
  length: number;
  hero: Window4;
  chapters: JourneyChapter[];
  finale: { native: string; english: string; window: Window4 };
  hints: {
    scroll: string;
    /** Shown while the scene can be touched, fading in and out like the captions. */
    touch?: { text: string; window: Window4 }[];
  };
  verse?: { lines: string[]; lang: string; english: string; source: string };
  card: { native: string; english: string };
  returnLink: string;
  /** Read by screen readers after "sound on / off". */
  soundLabel: string;
  credits?: SoundCredit[];
  /** For JSON-LD. */
  about: { name: string; alternateName: string[]; sameAs: string };
  /** Page background behind the scene and after it. */
  ink: string;
};

export type Frame = {
  width: number;
  height: number;
  /** Smoothed scroll progress through the journey, 0..1. */
  p: number;
  /** Seconds since the last frame (0 with reduced motion). */
  dt: number;
  seconds: number;
  reduced: boolean;
  /** Captions run along the bottom (see isPortrait). */
  portrait: boolean;
};

/** Tells the score about something the reader did in the scene, e.g. "light". */
export type Emit = (event: string) => void;

export interface Scene {
  draw(ctx: CanvasRenderingContext2D, frame: Frame): void;
  /** Pointer or touch in canvas pixels. */
  pointer?(x: number, y: number, kind: "down" | "move" | "up", frame: Frame): void;
}

export interface Score {
  /** Called once, when sound is first turned on. */
  start(voices: Voices): void;
  /** Schedule anything that falls in [from, to) on the audio clock, at scroll progress `p`. */
  schedule(from: number, to: number, p: number): void;
  /** Every frame: levels, and one-shot cues as the scroll crosses a point. */
  update(p: number, previous: number, now: number): void;
  /** Something the reader did in the scene. */
  on?(event: string, now: number): void;
}

export type CardSize = { width: number; height: number };

export type Kit = {
  scene: (emit: Emit) => Scene;
  score: () => Score;
  /** Paints the greeting card onto a blank canvas. `fonts` are CSS font-family strings. */
  card: (ctx: CanvasRenderingContext2D, size: CardSize, name: string, link: string, fonts: CardFonts) => void | Promise<void>;
};

export type CardFonts = { serif: string; sc: string; deva: string };
