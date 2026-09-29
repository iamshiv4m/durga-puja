// How the people of the Bihu hold themselves: standing, walking, clapping, bowing with a gamosa,
// and playing each instrument of the band in time. All in figure units (see people.ts): 1 is the
// person's height, y is up the body as negative, x points the way they face.
import { lerp } from "../paint";
import type { Pose } from "./people";

const beatPhase = (t: number) => t - Math.floor(t);

export function stand(sway = 0): Pose {
  return { sway, crouch: 0, lean: 0, bow: 0, left: { x: -0.14, y: -0.47 }, right: { x: 0.14, y: -0.47 } };
}

/** Walking, `t` in steps. */
export function walk(t: number): Pose {
  const s = Math.sin(t * Math.PI);
  return {
    sway: s * 0.006,
    crouch: 0.01,
    lean: 0.01,
    bow: 0.05,
    left: { x: -0.13 + s * 0.05, y: -0.48 },
    right: { x: 0.13 + s * 0.05, y: -0.48 },
    lift: s,
  };
}

/** Hands clapping, on every beat. */
export function clap(t: number, sway = 0): Pose {
  const open = Math.pow(Math.abs(Math.sin(t * Math.PI)), 0.6);
  return {
    sway: Math.sin(t * Math.PI * 0.5) * 0.02 + sway,
    crouch: 0.01 + 0.015 * (1 - open),
    lean: 0,
    bow: 0.1,
    left: { x: -0.025 - open * 0.09, y: -0.72 },
    right: { x: 0.025 + open * 0.09, y: -0.72 },
    lift: Math.sin(t * Math.PI * 0.5) * 0.5,
  };
}

/** The Bihu dhol: the palm on the left head, the stick in the right hand, the knees bouncing. */
export function dhol(t: number, energy: number): Pose {
  const hit = Math.pow(1 - beatPhase(t * 2), 3);
  const bounce = Math.abs(Math.sin(t * Math.PI));
  const sway = Math.sin(t * Math.PI * 0.5) * 0.02 * energy;
  const crouch = 0.02 + 0.05 * energy * bounce;
  const y = -0.5 + crouch;
  return {
    sway,
    crouch,
    lean: 0.01,
    bow: 0.35 - 0.3 * energy * bounce,
    left: { x: -0.22 + sway * 0.4, y: y + 0.02 - 0.05 * Math.pow(1 - beatPhase(t + 0.5), 4) },
    right: { x: 0.24 + sway * 0.4, y: y - 0.14 + 0.1 * hit },
    hold: "dhol",
    lift: Math.sin(t * Math.PI) * energy,
  };
}

/** The pepa, raised to the sky on the long notes. */
export function pepa(t: number, energy: number): Pose {
  const up = 0.5 + 0.5 * Math.sin(t * 0.4);
  const bow = lerp(-0.1, -0.7, up * energy);
  const lift = bow * -0.035;
  return {
    sway: Math.sin(t * Math.PI * 0.5) * 0.015 * energy,
    crouch: 0.02 + 0.02 * Math.abs(Math.sin(t * Math.PI)) * energy,
    lean: -0.01,
    bow,
    left: { x: 0.075, y: -0.86 - lift },
    right: { x: 0.15, y: -0.92 - lift * 1.4 },
    hold: "pepa",
  };
}

export function taal(t: number, energy: number): Pose {
  const open = Math.pow(Math.abs(Math.sin(t * Math.PI)), 0.5);
  return {
    sway: Math.sin(t * Math.PI * 0.5) * 0.02 * energy,
    crouch: 0.015 + 0.02 * (1 - open) * energy,
    lean: 0,
    bow: 0.15,
    left: { x: -0.02 - open * 0.08, y: -0.68 },
    right: { x: 0.02 + open * 0.08, y: -0.68 },
    hold: "taal",
    lift: Math.sin(t * Math.PI * 0.5) * 0.6 * energy,
  };
}

export function gogona(t: number): Pose {
  const flick = Math.pow(1 - beatPhase(t), 2);
  return {
    sway: Math.sin(t * Math.PI * 0.5) * 0.015,
    crouch: 0.02,
    lean: 0,
    bow: 0.05,
    left: { x: 0.02, y: -0.84 },
    right: { x: 0.12, y: -0.8 + flick * 0.04 },
    hold: "gogona",
  };
}

export function toka(t: number): Pose {
  const clack = Math.pow(1 - beatPhase(t), 3);
  return {
    sway: Math.sin(t * Math.PI * 0.5) * 0.02,
    crouch: 0.02,
    lean: 0,
    bow: 0.1,
    left: { x: 0.02 + (1 - clack) * 0.06, y: -0.7 },
    right: { x: 0.16, y: -0.66 },
    hold: "toka",
  };
}

/** A man dancing with his arms thrown out and a knee up, the way the dhol players leap. */
export function leap(t: number, energy: number, seed: number): Pose {
  const beat = t * Math.PI;
  const up = Math.max(0, Math.sin(beat + seed));
  return {
    sway: Math.sin(beat * 0.5 + seed) * 0.03 * energy,
    crouch: 0.03 + 0.07 * energy * (1 - up),
    lean: Math.sin(beat * 0.5) * 0.02,
    bow: -0.2 * up,
    left: { x: -0.3, y: lerp(-0.8, -1.08, up * energy) },
    right: { x: 0.3, y: lerp(-1.08, -0.8, up * energy) },
    lift: Math.sin(beat) * energy * 1.5,
  };
}

/** Holding something out on both hands: a gamosa, or the xorai. */
export function offer(hold: "gamosa" | "xorai", reach: number, bow: number): Pose {
  const x = lerp(0.04, 0.16, reach);
  return {
    sway: 0,
    crouch: 0.04 * bow,
    lean: 0.03 * bow,
    bow: bow * 0.9,
    left: { x: x - 0.09, y: -0.57 },
    right: { x: x + 0.09, y: -0.57 },
    hold,
  };
}

/** Seated on a low pira, the hands in the lap, or one raised in blessing to `to`. */
export function seated(bless: number, to = { x: 0.24, y: -0.72 }): Pose {
  return {
    sway: 0,
    crouch: 0,
    lean: 0,
    bow: 0.15,
    seated: 0.22,
    left: { x: -0.03, y: -0.34 },
    right: { x: lerp(0.03, to.x, bless), y: lerp(-0.33, to.y, bless) },
  };
}
