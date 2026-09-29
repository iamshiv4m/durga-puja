// Navratri's score, in a folk Khamaj (Sa Re Ga Ma Pa Dha Ni, the Ni flattened coming down), the
// mode of so many garba of Gujarat. All the tunes here are new, written for this page.
// - morning: a tanpura and a far shehnai, then a slow aarti on the harmonium with the ghanti,
//   manjira and the shankh as the kalash and the akhand jyot are set up
// - dusk: the dhol comes in at a walk under the garbo procession, in the garba's 6/8, twelve
//   pulses to a round of three claps and a turn
// - the nine nights: a bell for each lamp, each a step up the mode; the dhol quickening
// - garba: dhol, claps on the dancers' three claps, manjira, harmonium and the women singing,
//   the shehnai joining as the circle opens out overhead
// - dandiya: faster and faster, the sticks struck on the beat, to a peak and a sudden hush
// - Dussehra: the Ramlila nagara, the shankh as Ram draws his bow, the roar of Ravana burning,
//   crackers and rockets over the crowd
// - home: the aarti again, slowly, on the harmonium and shehnai
import { smoothstep } from "@/lib/math";
import { at, crossed, steps } from "../rhythm";
import type { Score } from "../types";
import { hz, type Handle, type PadHandle, type Voices } from "../voices";
import { beat, heat } from "./clock";
import { Band } from "./instruments";
import { MOMENTS, pulse } from "./world";

const SA = 233.08;
const n = (semitones: number) => hz(SA, semitones);

/** The mode, and the nine lamps' notes climbing it. */
const MODE = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16];
const LAMPS = [0, 2, 4, 5, 7, 9, 11, 12, 14];
const TANPURA = [-5, 0, 0, -12];

/** The aarti, slow, as [semitones, beats]: an original tune in the mode. */
const AARTI: [number, number][][] = [
  [
    [0, 1],
    [2, 1],
    [4, 1],
    [5, 1],
    [4, 1.5],
    [2, 0.5],
    [0, 2],
  ],
  [
    [4, 1],
    [5, 1],
    [7, 1],
    [9, 1],
    [7, 1.5],
    [5, 0.5],
    [4, 2],
  ],
  [
    [7, 1],
    [9, 1],
    [10, 1],
    [9, 1],
    [7, 1],
    [5, 1],
    [4, 1],
    [2, 1],
    [0, 3],
  ],
];
const AARTI_BEAT = 0.62;

/** A shehnai alaap for the dawn and the close. */
const ALAAP: [number, number][][] = [
  [
    [-5, 1.5],
    [-3, 1],
    [0, 2.5],
    [2, 1],
    [0, 3],
  ],
  [
    [4, 1],
    [5, 1],
    [7, 2.5],
    [5, 1],
    [4, 1],
    [2, 1],
    [0, 3],
  ],
];

/**
 * The garba tune, one note to each group of three pulses, four to a round; -1 holds the note.
 * Sa Sa Re Ga, Ma Ga Re -, Ga Ma Pa Pa, Dha Pa Ma Ga; Pa Pa Dha ni, Dha Pa Ma Ga, Ma Ga Re Ga, Re Sa Sa -.
 */
const GARBA = [0, 0, 2, 4, 5, 4, 2, -1, 4, 5, 7, 7, 9, 7, 5, 4, 7, 7, 9, 10, 9, 7, 5, 4, 5, 4, 2, 4, 2, 0, 0, -1];
/** The dandiya tune on the shehnai, one note to each pair of pulses. */
const DANDIYA = [7, 9, 7, 5, 4, 5, 7, -1, 7, 9, 10, 12, 10, 9, 7, -1, 4, 5, 7, 9, 7, 5, 4, 2, 4, 2, 0, 2, 4, -1, 0, -1];

// Twelve pulses of garba: B = bass and open together, O = open, t = the stick on the treble head.
const GARBA_DHOL = "B.tO.tB.tOtt";
// Six pulses of dandiya, the dhol pushing every beat.
const DANDIYA_DHOL = "BtOBtt";

export class NavratriScore implements Score {
  private v!: Voices;
  private band!: Band;
  private pad!: PadHandle;
  private crowd!: Handle;
  private wind!: Handle;
  private fire!: Handle;
  private next = 0;
  private index = 0;
  private aartiPhrase = 0;
  private aartiFree = 0;
  private alaapPhrase = 0;
  private alaapFree = 0;
  private nagara = 0;

  start(voices: Voices) {
    this.v = voices;
    this.band = new Band(voices);
    this.pad = voices.pad([n(-12), n(-5), n(0)], 0.045, 700);
    this.crowd = voices.bed("crowd", 0.03);
    this.wind = voices.bed("wind", 0.02);
    this.fire = this.band.roar();
    beat.ctx = voices.ctx;
  }

  schedule(from: number, to: number, p: number) {
    const v = this.v;
    const drums = this.drums(p);
    // The tanpura, quieter under the dance.
    steps(from, to, 1.2, (time, i) => v.tanpura(time, n(TANPURA[i % 4] - 12), 0.045 * (1 - 0.6 * drums)));

    // Crickets on the quiet evenings.
    const crickets = (p > 0.25 && p < 0.34) || (p > 0.725 && p < 0.77) || p > 0.88;
    if (crickets && Math.random() < (to - from) * 1.3) v.chirp(from + Math.random() * (to - from), 0.007);

    // A far temple bell in the morning.
    if (p < 0.09) steps(from, to, 6.5, (time) => v.bell(time + 0.3, n(12), 0.03, 6));

    // The shehnai's alaap at dawn and again at the close.
    const alaap = p < 0.085 || p > 0.93;
    if (alaap && from >= this.alaapFree) this.alaapFree = this.phrase(from, ALAAP[this.alaapPhrase++ % ALAAP.length], 0.7, "shehnai", 0.022) + 3;

    // The aarti on the harmonium, from the sowing to the lamp, and home again at the end.
    const aarti = (p > 0.09 && p < 0.205) || (p > 0.875 && p < 0.97);
    if (aarti && from >= this.aartiFree) {
      this.aartiFree = this.phrase(from, AARTI[this.aartiPhrase++ % AARTI.length], AARTI_BEAT, "harmonium", 0.028) + 1.2;
    }
    // The aarti proper: the ghanti rung fast, manjira on the beat, a big bell.
    if (p > MOMENTS.aarti[0] && p < MOMENTS.aarti[1]) {
      const bells = smoothstep(MOMENTS.aarti[0], MOMENTS.aarti[0] + 0.01, p) * (1 - smoothstep(MOMENTS.aarti[1] - 0.01, MOMENTS.aarti[1], p));
      steps(from, to, 0.13, (time, i) => v.bell(time, i % 2 ? n(38) : n(40), 0.01 * bells, 0.5));
      steps(from, to, AARTI_BEAT, (time, i) => v.manjira(time, 0.03 * bells, i % 4 === 0));
      steps(from, to, AARTI_BEAT * 4, (time) => v.bell(time, n(0), 0.06 * bells, 5));
    }

    // The garba's pulse runs all the time, so the dhol always comes in on the round.
    if (this.next < from - 0.5 || this.next > to + 1) this.next = from;
    for (let guard = 0; this.next < to && guard < 64; guard++) {
      const period = pulse(p);
      if (drums > 0.01) this.pulse(this.next, this.index, period, p, drums);
      beat.index = this.index;
      beat.time = this.next;
      beat.period = period;
      this.next += period;
      this.index++;
    }

    // Dashami: the Ramlila nagara, slow and heavy, quickening as Ram lifts his bow.
    if (p > 0.73 && p < 0.815) {
      const gap = p < MOMENTS.bow ? 0.9 : 0.42;
      if (this.nagara < from - 1) this.nagara = from;
      for (let guard = 0; this.nagara < to && guard < 16; guard++) {
        const strong = Math.floor(this.nagara / gap) % 4 === 0;
        v.drum(this.nagara, "bass", strong ? 0.2 : 0.12, 0.62);
        if (!strong) v.drum(this.nagara + gap / 2, "rim", 0.04, 0.8);
        this.nagara += gap;
      }
    }

    // The crackers inside Ravana, and far ones all over town after.
    const fire = heat.level;
    if (fire > 0.05 && Math.random() < (to - from) * 10 * fire) v.crack(from + Math.random() * (to - from), 0.02 + Math.random() * 0.05 * fire);
    if (p > 0.8 && p < 0.92 && Math.random() < (to - from) * 1.5) v.crack(from + Math.random() * (to - from), 0.012 + Math.random() * 0.015);
  }

  /** How much of the dance music is playing. */
  private drums(p: number) {
    return smoothstep(0.208, 0.235, p) * (1 - smoothstep(MOMENTS.hush - 0.004, MOMENTS.hush, p));
  }

  /** Plays a phrase from `time`; returns when it ends. */
  private phrase(time: number, notes: [number, number][], beatLength: number, voice: "harmonium" | "shehnai", level: number) {
    let t = time;
    let last: number | undefined;
    for (const [semi, beats] of notes) {
      const d = beats * beatLength;
      if (voice === "harmonium") {
        this.band.harmonium(t, [n(semi), n(semi - 12)], d * 0.96, level);
        if (beats >= 2) this.band.harmonium(t, [n(-12), n(-5)], d, level * 0.35);
      } else {
        const f = n(semi + 12);
        this.band.shehnai(t, f, d, level, last);
        last = f;
      }
      t += d;
    }
    return t;
  }

  /** One pulse of the garba or the dandiya. */
  private pulse(time: number, i: number, period: number, p: number, drums: number) {
    const v = this.v;
    const band = this.band;
    const dandiya = p > 0.6;
    // The walk to the chowk, then each night louder.
    const level = drums * (p < 0.3 ? 0.5 : p < 0.46 ? 0.72 : 1);
    const k = i % 12;

    if (!dandiya) {
      const stroke = at(GARBA_DHOL, i);
      const accent = k === 0 ? 1.25 : 1;
      if (stroke === "B") {
        v.drum(time, "bass", 0.17 * level * accent, 0.95);
        v.drum(time, "open", 0.1 * level, 1.05);
      }
      if (stroke === "O") v.drum(time, "open", 0.12 * level, 1.05);
      if (stroke === "t") v.drum(time, "slap", 0.075 * level, 1.5);
      // The three claps, with everyone in the circle.
      if (p > 0.3 && (k === 2 || k === 5 || k === 8)) v.clap(time, 0.11 * level * (p > 0.46 ? 1 : 0.55), 6);
      if (k % 3 === 0) v.manjira(time, 0.022 * level, k === 0);
      // The tune, one note to each three pulses: harmonium from the first night, voices at the garba.
      if (p > 0.3 && k % 3 === 0) {
        const note = GARBA[Math.floor(i / 3) % GARBA.length];
        if (note >= 0) {
          const hold = GARBA[(Math.floor(i / 3) + 1) % GARBA.length] < 0 ? 2 : 1;
          const d = period * 3 * hold * 0.92;
          band.harmonium(time, [n(note), n(note - 12)], d, 0.022 * level);
          const sing = smoothstep(0.44, 0.49, p);
          if (sing > 0.01) v.choir(time, [n(note), n(note + 12)], d * 1.1, 0.014 * sing * level);
          const reed = smoothstep(0.52, 0.56, p);
          if (reed > 0.01) band.shehnai(time, n(note + 12), d, 0.016 * reed * level);
        }
      }
      // The procession: a shehnai calling over the walk.
      if (p < 0.3 && k === 0 && Math.floor(i / 12) % 2 === 0) {
        const notes: [number, number][] = [
          [7, 1],
          [9, 0.5],
          [7, 0.5],
          [5, 1],
          [4, 1],
        ];
        this.phrase(time, notes, period * 3, "shehnai", 0.018 * level);
      }
      // A roll into each fourth round.
      if (p > 0.46 && i % 48 === 44) band.roll(time, period * 3.5, 0.09 * level);
      return;
    }

    // Dandiya: the sticks on 0, 2 and 4, the dhol on every pulse.
    const d6 = i % 6;
    const stroke = at(DANDIYA_DHOL, i);
    const drive = 0.9 + 0.3 * smoothstep(0.62, MOMENTS.peak, p);
    if (stroke === "B") {
      v.drum(time, "bass", 0.17 * level * drive, 0.95);
      v.drum(time, "open", 0.1 * level, 1.05);
    }
    if (stroke === "O") v.drum(time, "open", 0.12 * level * drive, 1.05);
    if (stroke === "t") v.drum(time, "slap", 0.08 * level * drive, 1.5);
    if (d6 % 2 === 0) {
      band.dandiya(time, 0.05 * level, 1 + (d6 === 0 ? 0 : 0.08));
      band.dandiya(time + 0.012, 0.035 * level, 0.93);
    }
    if (d6 === 0 || d6 === 3) v.manjira(time, 0.02 * level, d6 === 0);
    if (i % 2 === 0) {
      const note = DANDIYA[Math.floor(i / 2) % DANDIYA.length];
      if (note >= 0) {
        const hold = DANDIYA[(Math.floor(i / 2) + 1) % DANDIYA.length] < 0 ? 2 : 1;
        band.shehnai(time, n(note + 12), period * 2 * hold * 0.9, 0.022 * level);
        if (i % 6 === 0) band.harmonium(time, [n(note), n(-12)], period * 5.5, 0.016 * level);
      }
    }
    if (p > MOMENTS.peak - 0.02 && i % 24 === 20) band.roll(time, period * 3.5, 0.1 * level);
  }

  update(p: number, previous: number, now: number) {
    const v = this.v;
    beat.seen = performance.now();
    const drums = this.drums(p);
    const garba = smoothstep(0.3, 0.46, p) * (1 - smoothstep(MOMENTS.hush - 0.004, MOMENTS.hush, p));
    const maidan = smoothstep(0.74, 0.79, p) * (1 - smoothstep(0.87, 0.91, p));
    const fire = heat.level;
    this.crowd.level(0.15 * drums + 0.75 * garba + 0.7 * maidan + 0.6 * fire);
    this.wind.level(0.8 * (1 - smoothstep(0.06, 0.1, p)) + 0.6 * smoothstep(0.72, 0.76, p) * (1 - smoothstep(0.78, 0.8, p)) + 0.5 * smoothstep(0.93, 0.98, p));
    this.fire.level(fire);
    const warm = smoothstep(0.1, 0.16, p) * (1 - smoothstep(0.2, 0.24, p));
    this.pad.level(0.55 + 0.3 * warm + 0.25 * garba - 0.35 * drums * smoothstep(0.6, 0.65, p) + 0.3 * smoothstep(0.86, 0.9, p));
    this.pad.bright(600 + 900 * garba + 700 * fire);

    // The pad's chord moves with the story: Sa Pa; Ga Pa for the aarti; Ma for the nine nights;
    // Sa Ga Pa for the dance; a darker flat Ni at Dashami's dusk; Sa Pa home.
    if (crossed(previous, p, MOMENTS.kalash)) this.pad.chord([n(-12), n(-8), n(-5)], 3);
    if (crossed(previous, p, MOMENTS.lamps[0])) this.pad.chord([n(-7), n(-3), n(0)], 3);
    if (crossed(previous, p, 0.47)) this.pad.chord([n(-12), n(-8), n(-5), n(0)], 3);
    if (crossed(previous, p, MOMENTS.hush)) this.pad.chord([n(-12), n(-5), n(-2)], 4);
    if (crossed(previous, p, MOMENTS.home[0])) this.pad.chord([n(-12), n(-5), n(0)], 4);

    // Ghatasthapana, one step at a time.
    if (crossed(previous, p, MOMENTS.soil)) v.bell(now + 0.05, n(12), 0.035, 3);
    if (crossed(previous, p, MOMENTS.sow)) for (let i = 0; i < 6; i++) v.manjira(now + i * 0.09, 0.008);
    if (crossed(previous, p, MOMENTS.kalash)) {
      v.bell(now + 0.05, n(0), 0.07, 5);
      v.choir(now + 0.1, [n(-12), n(0)], 6, 0.016);
    }
    if (crossed(previous, p, MOMENTS.coconut)) v.bell(now + 0.05, n(19), 0.04, 3);
    if (crossed(previous, p, MOMENTS.jyot)) {
      v.bell(now + 0.05, n(24), 0.04, 4);
      v.choir(now + 0.2, [n(-12), n(-5), n(0)], 7, 0.02);
    }
    if (crossed(previous, p, MOMENTS.aarti[0])) {
      this.band.shankh(now + 0.1, n(7), 0.045, 2.4);
      this.band.shankh(now + 3.4, n(7), 0.035, 1.8);
    }
    // The garbo set down before Amba.
    if (crossed(previous, p, MOMENTS.placed)) {
      v.swell(now, 0.05, 2);
      v.bell(now + 1.9, n(0), 0.08, 6);
      v.choir(now + 2, [n(-12), n(-5), n(0), n(4)], 7, 0.025);
    }
    // Rising overhead into the rings.
    if (crossed(previous, p, MOMENTS.overhead[0])) v.swell(now, 0.06, 3);
    if (crossed(previous, p, MOMENTS.dandiya[0])) {
      this.band.roll(now + 0.05, 0.6, 0.12);
      v.crack(now + 0.65, 0.04);
    }
    // The peak of the last night, then the hush.
    if (crossed(previous, p, MOMENTS.peak)) {
      v.swell(now, 0.07, 2.2);
      v.choir(now + 1.8, [n(-12), n(0), n(4), n(7)], 5, 0.03);
    }
    if (crossed(previous, p, MOMENTS.hush)) {
      v.bell(now + 0.15, n(0), 0.08, 7);
      v.manjira(now + 0.15, 0.03, true);
    }
    // Ram draws his bow: the shankh twice.
    if (crossed(previous, p, MOMENTS.bow)) {
      this.band.shankh(now + 0.05, n(7), 0.05, 2.6);
      this.band.shankh(now + 3.2, n(12), 0.04, 2);
    }
    if (crossed(previous, p, MOMENTS.home[0])) v.bell(now + 0.3, n(12), 0.05, 6);
    if (crossed(previous, p, 0.92)) v.choir(now, [n(-12), n(-5), n(0)], 9, 0.02);
  }

  on(event: string, now: number) {
    const v = this.v;
    if (event.startsWith("lamp:")) {
      const i = Number(event.slice(5)) || 0;
      v.bell(now, n(LAMPS[i % LAMPS.length] + 24), 0.05, 3.5);
      v.bell(now + 0.01, n(LAMPS[i % LAMPS.length] + 12), 0.025, 3);
      return;
    }
    // Claps and sticks land on the next pulse of the dhol, so the reader plays in time.
    const onBeat = () => (beat.period ? beat.time + Math.ceil((now - beat.time) / beat.period) * beat.period : now);
    if (event === "join") {
      v.clap(onBeat(), 0.1, 3);
      v.bell(onBeat(), n(MODE[Math.floor(Math.random() * 5)] + 24), 0.02, 1.5);
    }
    if (event === "strike") {
      const t = onBeat();
      this.band.dandiya(t, 0.09, 1.05);
      this.band.dandiya(t + 0.01, 0.05, 0.9);
    }
    if (event === "loose") {
      this.band.shankh(now, n(12), 0.03, 0.8);
      v.whoosh(now + 0.05, 0.9, 0.06, true);
    }
    if (event === "hit") {
      v.crack(now, 0.2);
      v.drum(now, "bass", 0.3, 0.55);
      v.swell(now, 0.08, 1.2);
    }
    if (event === "crack") v.crack(now + Math.random() * 0.03, 0.05 + Math.random() * 0.08);
    if (event === "rocket") v.whoosh(now, 0.9, 0.018, true);
    if (event === "burst") {
      v.crack(now, 0.07 + Math.random() * 0.05);
      v.bell(now + 0.02, n(MODE[Math.floor(Math.random() * MODE.length)] + 24), 0.012, 1.5);
    }
  }
}
