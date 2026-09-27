import { clamp, smoothstep } from "./math";

/**
 * Every scroll-driven change in the scene, as a fraction of the journey (0..1).
 * Caption windows in `content/chapters.ts` are tuned to line up with these.
 */
export const PHASES = {
  reveal: [0.0, 0.1], // the pratima emerges from the dark
  eyes: [0.13, 0.23], // Chokkhu Daan: left eye, right eye, then the third
  warm: [0.26, 0.33], // Bodhon: the lamps are lit
  garba: [0.25, 0.29], // Gujarat: the circle of dancers forms round the garbo
  garbaOut: [0.74, 0.79],
  patClose: [0.325, 0.365], // Bihar: the curtain is drawn across her before Saptami
  patOpen: [0.392, 0.45], // Pat khulna: and drawn back at dawn
  astras: [0.37, 0.45], // the ten astras arrive
  astrasOut: [0.84, 0.9],
  diyas: [0.52, 0.61], // Sandhi Puja: 108 lamps
  dhunuchi: [0.505, 0.53], // Bengal: the reader takes up a dhunuchi for the arati
  dhunuchiOut: [0.615, 0.64],
  mahisha: [0.636, 0.652], // Mahishasura's shadow rises beside her
  shapes: [0.645, 0.686], // buffalo, lion, man with a sword, elephant, buffalo again
  burn: [0.686, 0.703], // her third eye opens on him and he burns away
  third: [0.65, 0.72], // she sees through Mahishasura's disguises
  dive: [0.7, 0.738], // the camera goes into her third eye
  inside: [0.722, 0.742], // the inside of the eye covers the screen
  flash: [0.748, 0.768], // its fire swells to fill everything
  emerge: [0.768, 0.79], // and fades to show her again
  thirdOut: [0.76, 0.82],
  sindoor: [0.78, 0.82], // Sindoor Khela
  water: [0.8, 0.94], // Bisarjan
  dissolve: [0.86, 0.95],
} as const;

type Phase = readonly [number, number];
const at = (p: number, [a, b]: Phase) => smoothstep(a, b, p);

export function timeline(p: number) {
  return {
    reveal: at(p, PHASES.reveal),
    eyes: clamp((p - PHASES.eyes[0]) / (PHASES.eyes[1] - PHASES.eyes[0])),
    warm: at(p, PHASES.warm),
    astras: clamp((p - PHASES.astras[0]) / (PHASES.astras[1] - PHASES.astras[0])),
    astrasOut: at(p, PHASES.astrasOut),
    diyas: clamp((p - PHASES.diyas[0]) / (PHASES.diyas[1] - PHASES.diyas[0])),
    garba: at(p, PHASES.garba) * (1 - at(p, PHASES.garbaOut)),
    /** 1 while the curtain is gathered at the sides, 0 while it is drawn across her. */
    pat: clamp(1 - at(p, PHASES.patClose) + at(p, PHASES.patOpen)),
    dhunuchi: at(p, PHASES.dhunuchi) * (1 - at(p, PHASES.dhunuchiOut)),
    mahisha: at(p, PHASES.mahisha),
    shapes: clamp((p - PHASES.shapes[0]) / (PHASES.shapes[1] - PHASES.shapes[0])),
    burn: clamp((p - PHASES.burn[0]) / (PHASES.burn[1] - PHASES.burn[0])),
    third: at(p, PHASES.third) * (1 - 0.75 * at(p, PHASES.thirdOut)),
    dive: at(p, PHASES.dive) * (1 - at(p, PHASES.emerge)),
    inside: at(p, PHASES.inside) * (1 - at(p, PHASES.emerge)),
    flash: at(p, PHASES.flash),
    sindoor: at(p, PHASES.sindoor),
    water: at(p, PHASES.water),
    dissolve: at(p, PHASES.dissolve),
  };
}

export type Timeline = ReturnType<typeof timeline>;

/** World height of the river surface during Bisarjan; it rises past the top of the crown. */
export function waterLevel(t: Timeline) {
  return -7.5 + t.water * 12.5;
}
