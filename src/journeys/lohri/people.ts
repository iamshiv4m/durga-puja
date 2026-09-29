// The people of the village, painted flat like cut paper. Each is drawn in units of the figure's
// height, feet at the origin, facing +x: a body, the clothes of Punjab (pagg, kurta, tehmat,
// salwar-kameez, phulkari, parandi, the winter loi) and whatever is in their hands.
import { TAU, clamp, lerp, mix, rgb, type Ctx, type RGB } from "../paint";

export type Hold =
  | "lantern"
  | "bag"
  | "plate"
  | "sickle"
  | "sheaf"
  | "dhol"
  | "sword"
  | "nishan"
  | "baby"
  | "bucket"
  | "broom"
  | "chimta"
  | "tumbi";

export type Look = {
  h: number;
  skin: RGB;
  woman: boolean;
  /** Kurta or kameez. */
  top: RGB;
  /** Pyjama, tehmat, salwar or ghagra. */
  bottom: RGB;
  lower: "pyjama" | "tehmat" | "salwar" | "ghagra" | "chola" | "shorts";
  head: "pagg" | "turla" | "patka" | "chunni" | "bare" | "dastar";
  /** The turban, or the chunni. */
  wrap: RGB;
  beard?: boolean;
  /** A loi or khes over the shoulders, for the winter night. */
  shawl?: RGB;
  /** A bhangra waistcoat. */
  vest?: RGB;
  phulkari?: boolean;
  parandi?: RGB;
  chooda?: boolean;
  /** A kamarkassa, the sash round the waist of the Panj Pyare. */
  sash?: RGB;
};

/**
 * Arm angles are measured from hanging straight down, positive swinging towards the way the figure
 * faces: 0 is at the side, π/2 straight out in front, π straight up. `lift` raises a knee (0..1),
 * `back` draws the figure seen from behind.
 */
export type Pose = {
  la: number;
  lf: number;
  ra: number;
  rf: number;
  lean?: number;
  bob?: number;
  hold?: Hold;
  lift?: [number, number];
  back?: boolean;
  /** Swings the chunni, the tehmat and the turla, -1..1. */
  swirl?: number;
};

export type Point = { x: number; y: number };
export type Hands = { left: Point; right: Point; tip: Point };

const SHOULDER = { y: -0.79, x: 0.085 };
const UPPER = 0.17;
const FOREARM = 0.16;
const HIP = -0.5;
const HAIR: RGB = [24, 17, 15];

export const SKIN: RGB[] = [
  [198, 142, 100],
  [176, 118, 80],
  [150, 98, 66],
  [212, 162, 120],
  [132, 86, 58],
];

/** Colours of Punjab: turbans and chunnis. */
export const BRIGHT: RGB[] = [
  [232, 128, 24],
  [214, 38, 70],
  [250, 196, 40],
  [34, 108, 180],
  [196, 40, 120],
  [28, 140, 110],
  [240, 90, 40],
  [120, 50, 160],
  [250, 150, 170],
];
export const KESRI: RGB = [236, 132, 22];
export const NAVY: RGB = [22, 38, 96];

type Random = () => number;
const pick = <T>(random: Random, list: T[]) =>
  list[Math.floor(random() * list.length)];

/** A villager: a man in a pagg and kurta, or a woman in salwar-kameez and chunni. */
export function makeLook(
  random: Random,
  woman: boolean,
  h = woman ? 1.55 + random() * 0.08 : 1.66 + random() * 0.1,
): Look {
  const skin = pick(random, SKIN);
  if (woman) {
    return {
      h,
      skin,
      woman,
      top: pick(random, BRIGHT),
      bottom: pick(random, BRIGHT),
      lower: "salwar",
      head: "chunni",
      wrap: pick(random, BRIGHT),
      parandi: random() < 0.5 ? pick(random, BRIGHT) : undefined,
    };
  }
  const light: RGB[] = [
    [240, 236, 226],
    [226, 222, 208],
    [214, 226, 236],
    [236, 226, 200],
  ];
  return {
    h,
    skin,
    woman,
    top: random() < 0.6 ? pick(random, light) : pick(random, BRIGHT),
    bottom: pick(random, light),
    lower: random() < 0.4 ? "tehmat" : "pyjama",
    head: random() < 0.85 ? "pagg" : "bare",
    wrap: pick(random, BRIGHT),
    beard: random() < 0.6,
  };
}

/** A child in a woollen sweater, bundled up for the fog. */
export function makeChild(random: Random, girl: boolean): Look {
  const look = makeLook(random, girl, 0.98 + random() * 0.2);
  look.beard = false;
  look.head = girl
    ? random() < 0.5
      ? "bare"
      : "chunni"
    : random() < 0.6
      ? "patka"
      : "bare";
  look.shawl = random() < 0.5 ? pick(random, BRIGHT) : undefined;
  return look;
}

/** A bhangra dancer: turla on the pagg, embroidered waistcoat, a kurta and a tehmat that swings. */
export function makeDancer(random: Random, i: number): Look {
  const look = makeLook(random, false, 1.7 + random() * 0.08);
  look.head = "turla";
  look.lower = "tehmat";
  look.wrap = BRIGHT[i % BRIGHT.length];
  look.top = mix(BRIGHT[(i + 3) % BRIGHT.length], [255, 255, 255], 0.15);
  look.bottom = BRIGHT[(i + 5) % BRIGHT.length];
  look.vest = [30, 26, 40];
  look.beard = random() < 0.7;
  return look;
}

/** A woman dancing gidda: kurti, a long ghagra, a phulkari over her head, a parandi down her back. */
export function makeGidda(random: Random, i: number): Look {
  const look = makeLook(random, true);
  look.lower = "ghagra";
  look.top = BRIGHT[(i * 2) % BRIGHT.length];
  look.bottom = BRIGHT[(i * 2 + 3) % BRIGHT.length];
  look.wrap = [176, 30, 40];
  look.phulkari = true;
  look.parandi = BRIGHT[(i + 2) % BRIGHT.length];
  return look;
}

/** One of the Panj Pyare: a kesri chola, a blue kamarkassa, a kesri dastar. */
export function makePyara(skin: RGB): Look {
  return {
    h: 1.72,
    skin,
    woman: false,
    top: KESRI,
    bottom: KESRI,
    lower: "chola",
    head: "dastar",
    wrap: KESRI,
    beard: true,
    sash: NAVY,
  };
}

/** Draws a person standing on (x, y) facing `facing`; returns where the hands are, in world units. */
export function drawPerson(
  ctx: Ctx,
  x: number,
  y: number,
  look: Look,
  pose: Pose,
  facing: 1 | -1 = 1,
): Hands {
  const { h } = look;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const swirl = pose.swirl ?? 0;
  const back = pose.back ?? false;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);

  // A soft shadow under the feet.
  ctx.fillStyle = "rgba(20, 12, 8, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.2, 0.03, 0, 0, TAU);
  ctx.fill();

  if (look.parandi && !back) parandi(ctx, look, bob, lean);
  legs(ctx, look, pose, bob, swirl);

  // Above the waist, leaning from the hip.
  ctx.translate(0, HIP + bob);
  ctx.rotate(lean);
  ctx.translate(0, -HIP);

  if (look.head === "chunni" && !back) chunniBack(ctx, look, swirl);
  if (back && pose.hold === "sword") {
    // Held upright before the chest: from behind, only the blade shows over the shoulder.
    ctx.strokeStyle = "#d8dce4";
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(0.05, -0.7);
    ctx.lineTo(0.05, -1.32);
    ctx.stroke();
  }
  torso(ctx, look, back);
  head(ctx, look, back, swirl);
  if (look.parandi && back) parandi(ctx, look, 0, 0);

  // Things carried in front of the body go on before the arms.
  if (pose.hold === "dhol") dhol(ctx);
  if (pose.hold === "baby") baby(ctx);

  const left = arm(ctx, look, -1, pose.la, pose.lf, back);
  const right = arm(ctx, look, 1, pose.ra, pose.rf, back);
  if (look.shawl && !back) shawl(ctx, look);
  const tip = back ? { x: 0.05, y: -1.32 } : held(ctx, pose.hold, left, right);

  const m = ctx.getTransform();
  ctx.restore();
  const inv = ctx.getTransform().inverse();
  const world = (p: Point) => {
    const s = m.transformPoint(new DOMPoint(p.x, p.y));
    const w = inv.transformPoint(s);
    return { x: w.x, y: w.y };
  };
  return { left: world(left), right: world(right), tip: world(tip) };
}

// ─── Body ───────────────────────────────────────────────────────────────────

function legs(ctx: Ctx, look: Look, pose: Pose, bob: number, swirl: number) {
  const lift = pose.lift ?? [0, 0];
  const feet = rgb(mix(look.skin, [40, 24, 16], 0.3));
  // The leg that is lifted: thigh swings forward, shin hangs.
  const leg = (side: -1 | 1, t: number) => {
    const hx = side * 0.04;
    const hy = -0.48 + bob;
    const thigh = t * 1.25;
    // Crouching (bob > 0) bends the knees outwards.
    const kx = hx + Math.sin(thigh) * 0.25 + side * Math.max(0, bob) * 1.2;
    const ky = hy + Math.cos(thigh) * 0.25 - Math.max(0, bob) * 0.4;
    const shin = thigh - t * 1.45;
    const fx = kx + Math.sin(shin) * 0.24;
    const fy = Math.min(-0.005, ky + Math.cos(shin) * 0.24);
    return {
      hx,
      hy,
      kx,
      ky,
      fx: t < 0.01 ? side * 0.055 : fx,
      fy: t < 0.01 ? -0.005 : fy,
    };
  };
  const l = leg(-1, lift[0]);
  const r = leg(1, lift[1]);

  const foot = (p: { fx: number; fy: number }) => {
    ctx.fillStyle = feet;
    ctx.beginPath();
    ctx.ellipse(p.fx + 0.015, p.fy, 0.05, 0.02, 0, 0, TAU);
    ctx.fill();
  };

  if (look.lower === "pyjama" || look.lower === "salwar") {
    // Two legs; the salwar is baggier and gathered at the ankle.
    const width = look.lower === "salwar" ? 0.1 : 0.08;
    ctx.strokeStyle = rgb(look.bottom);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    for (const p of [l, r]) {
      ctx.beginPath();
      ctx.moveTo(p.hx, p.hy);
      ctx.lineTo(p.kx, p.ky);
      ctx.lineTo(p.fx, p.fy - 0.03);
      ctx.stroke();
    }
    foot(l);
    foot(r);
    return;
  }
  if (look.lower === "shorts") {
    // Kabaddi: shorts, and bare legs below.
    ctx.lineCap = "round";
    for (const p of [l, r]) {
      ctx.strokeStyle = rgb(look.bottom);
      ctx.lineWidth = 0.09;
      ctx.beginPath();
      ctx.moveTo(p.hx, p.hy);
      ctx.lineTo(lerp(p.hx, p.kx, 0.7), lerp(p.hy, p.ky, 0.7));
      ctx.stroke();
      ctx.strokeStyle = rgb(look.skin);
      ctx.lineWidth = 0.055;
      ctx.beginPath();
      ctx.moveTo(lerp(p.hx, p.kx, 0.7), lerp(p.hy, p.ky, 0.7));
      ctx.lineTo(p.kx, p.ky);
      ctx.lineTo(p.fx, p.fy - 0.02);
      ctx.stroke();
    }
    foot(l);
    foot(r);
    return;
  }
  if (look.lower === "chola") {
    // The chola falls to the calf over a white kachhera and bare legs.
    ctx.strokeStyle = rgb(mix(look.skin, [0, 0, 0], 0.1));
    ctx.lineWidth = 0.05;
    ctx.lineCap = "round";
    for (const p of [l, r]) {
      ctx.beginPath();
      ctx.moveTo(p.kx, p.ky);
      ctx.lineTo(p.fx, p.fy - 0.02);
      ctx.stroke();
    }
    foot(l);
    foot(r);
    return;
  }
  // Tehmat and ghagra: a skirt of cloth to the ankle that swings with the dance.
  const lifted = Math.max(lift[0], lift[1]);
  const flare = look.lower === "ghagra" ? 0.26 : 0.15;
  const hem = look.lower === "ghagra" ? -0.02 : -0.04;
  const sway = swirl * 0.06;
  ctx.fillStyle = rgb(look.bottom);
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.52 + bob);
  ctx.lineTo(0.08, -0.52 + bob);
  ctx.quadraticCurveTo(
    flare * 0.8,
    -0.28,
    flare + sway + lifted * 0.08,
    hem - lifted * 0.14,
  );
  ctx.quadraticCurveTo(
    sway * 0.5,
    hem + 0.03 - lifted * 0.05,
    -flare + sway,
    hem,
  );
  ctx.quadraticCurveTo(-flare * 0.8, -0.28, -0.08, -0.52 + bob);
  ctx.fill();
  // The border at the hem: gota on a ghagra, a plain stripe on a tehmat.
  ctx.strokeStyle =
    look.lower === "ghagra"
      ? "rgba(250, 206, 90, 0.95)"
      : rgb(mix(look.bottom, [255, 255, 255], 0.45));
  ctx.lineWidth = look.lower === "ghagra" ? 0.03 : 0.018;
  ctx.beginPath();
  ctx.moveTo(flare + sway + lifted * 0.08, hem - lifted * 0.14 - 0.015);
  ctx.quadraticCurveTo(
    sway * 0.5,
    hem + 0.015 - lifted * 0.05,
    -flare + sway,
    hem - 0.015,
  );
  ctx.stroke();
  // A knee raised under the cloth shows its foot.
  for (const p of [l, r]) if (p.fy < -0.03) foot(p);
  if (l.fy >= -0.03) foot({ fx: -0.06, fy: -0.005 });
  if (r.fy >= -0.03) foot({ fx: 0.07, fy: -0.005 });
}

function torso(ctx: Ctx, look: Look, back: boolean) {
  ctx.fillStyle = rgb(look.top);
  ctx.beginPath();
  if (look.lower === "chola") {
    // A long chola to the knee, flaring a little.
    ctx.moveTo(-0.095, -0.8);
    ctx.lineTo(0.095, -0.8);
    ctx.lineTo(0.15, -0.24);
    ctx.quadraticCurveTo(0, -0.21, -0.15, -0.24);
  } else if (look.woman) {
    // The kameez, to the knee, or a short kurti over a ghagra.
    const low = look.lower === "ghagra" ? -0.5 : -0.3;
    ctx.moveTo(-0.082, -0.8);
    ctx.lineTo(0.082, -0.8);
    ctx.lineTo(0.12, low);
    ctx.quadraticCurveTo(0, low + 0.02, -0.12, low);
  } else {
    ctx.moveTo(-0.09, -0.8);
    ctx.lineTo(0.09, -0.8);
    ctx.lineTo(0.12, -0.3);
    ctx.quadraticCurveTo(0, -0.28, -0.12, -0.3);
  }
  ctx.closePath();
  ctx.fill();
  // A darker side for shape.
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.beginPath();
  ctx.moveTo(-0.09, -0.8);
  ctx.lineTo(-0.03, -0.8);
  ctx.lineTo(-0.05, -0.3);
  ctx.lineTo(-0.12, -0.3);
  ctx.closePath();
  ctx.fill();
  if (look.vest) {
    ctx.fillStyle = rgb(look.vest);
    ctx.beginPath();
    ctx.moveTo(-0.09, -0.79);
    ctx.lineTo(0.05, -0.79);
    ctx.lineTo(0.02, -0.6);
    ctx.lineTo(0.1, -0.46);
    ctx.lineTo(-0.1, -0.46);
    ctx.closePath();
    ctx.fill();
    // Mirror-work down the front.
    ctx.fillStyle = "rgba(250, 210, 110, 0.9)";
    for (let i = 0; i < 4; i++)
      ctx.fillRect(0.02 + i * 0.012, -0.72 + i * 0.06, 0.014, 0.014);
  }
  if (look.sash) {
    // The kamarkassa at the waist, its ends hanging behind.
    ctx.fillStyle = rgb(look.sash);
    ctx.fillRect(-0.11, -0.54, 0.22, 0.05);
    if (back) {
      ctx.beginPath();
      ctx.moveTo(-0.02, -0.52);
      ctx.lineTo(0.02, -0.52);
      ctx.lineTo(0.04, -0.33);
      ctx.lineTo(-0.04, -0.34);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (look.woman && look.lower !== "ghagra") {
    // A border of embroidery at the kameez hem.
    ctx.strokeStyle = rgb(mix(look.top, [255, 230, 150], 0.55));
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(-0.115, -0.315);
    ctx.quadraticCurveTo(0, -0.295, 0.115, -0.315);
    ctx.stroke();
  }
  // Neck.
  ctx.fillStyle = rgb(look.skin);
  ctx.fillRect(-0.022, -0.86, 0.044, 0.07);
}

function head(ctx: Ctx, look: Look, back: boolean, swirl: number) {
  if (back && look.head === "chunni") {
    // From behind: the chunni over the head and falling down the back.
    ctx.fillStyle = rgb(look.wrap);
    ctx.beginPath();
    ctx.ellipse(0, -0.9, 0.068, 0.078, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.07, -0.9);
    ctx.quadraticCurveTo(-0.13, -0.7, -0.12, -0.5);
    ctx.lineTo(0.12, -0.5);
    ctx.quadraticCurveTo(0.13, -0.7, 0.07, -0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(-0.02, -0.82, 0.04, 0.32);
    return;
  }
  ctx.fillStyle = rgb(look.skin);
  ctx.beginPath();
  ctx.ellipse(0.004, -0.895, 0.058, 0.068, 0, 0, TAU);
  ctx.fill();
  // The ear, a hint of the jaw.
  if (!back) {
    ctx.fillStyle = rgb(mix(look.skin, [80, 40, 20], 0.18));
    ctx.beginPath();
    ctx.ellipse(-0.012, -0.89, 0.012, 0.018, 0, 0, TAU);
    ctx.fill();
  }
  if (look.beard && !back) {
    ctx.fillStyle = rgb(HAIR);
    ctx.beginPath();
    ctx.moveTo(-0.03, -0.905);
    ctx.quadraticCurveTo(-0.05, -0.83, 0.0, -0.8);
    ctx.quadraticCurveTo(0.05, -0.8, 0.066, -0.86);
    ctx.lineTo(0.05, -0.87);
    ctx.quadraticCurveTo(0.02, -0.855, 0.0, -0.88);
    ctx.closePath();
    ctx.fill();
  }
  const wrap = rgb(look.wrap);
  const fold = rgb(mix(look.wrap, [0, 0, 0], 0.22));
  switch (look.head) {
    case "pagg":
    case "turla":
    case "dastar": {
      // A Punjabi pagg: tied in layers, peaked a little over the brow.
      ctx.fillStyle = wrap;
      ctx.beginPath();
      ctx.moveTo(-0.066, -0.895);
      ctx.quadraticCurveTo(-0.08, -0.975, -0.03, -1.0);
      ctx.quadraticCurveTo(0.03, -1.02, 0.058, -0.99);
      ctx.quadraticCurveTo(0.075, -0.95, 0.066, -0.925);
      ctx.quadraticCurveTo(0.0, -0.91, -0.066, -0.895);
      ctx.fill();
      ctx.strokeStyle = fold;
      ctx.lineWidth = 0.008;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-0.064, -0.91 - i * 0.022);
        ctx.quadraticCurveTo(0.0, -0.93 - i * 0.025, 0.064, -0.94 - i * 0.02);
        ctx.stroke();
      }
      if (back) {
        // From behind: the layers crossing at the nape.
        ctx.beginPath();
        ctx.moveTo(-0.05, -0.9);
        ctx.lineTo(0.03, -0.99);
        ctx.moveTo(0.05, -0.9);
        ctx.lineTo(-0.03, -0.99);
        ctx.stroke();
      }
      if (look.head === "turla") {
        // The turla, a starched fan standing up from the pagg, and the larh down the back.
        ctx.fillStyle = rgb(mix(look.wrap, [255, 255, 255], 0.2));
        ctx.beginPath();
        ctx.moveTo(-0.02, -0.995);
        ctx.lineTo(-0.075 + swirl * 0.01, -1.085);
        ctx.quadraticCurveTo(-0.02, -1.11, 0.03 + swirl * 0.01, -1.08);
        ctx.lineTo(0.01, -0.995);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = fold;
        ctx.lineWidth = 0.005;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-0.005, -1.0);
          ctx.lineTo(-0.07 + i * 0.03, -1.08);
          ctx.stroke();
        }
        ctx.fillStyle = wrap;
        ctx.beginPath();
        ctx.moveTo(-0.06, -0.93);
        ctx.quadraticCurveTo(
          -0.12 - swirl * 0.05,
          -0.8,
          -0.09 - swirl * 0.08,
          -0.66,
        );
        ctx.lineTo(-0.06 - swirl * 0.08, -0.67);
        ctx.quadraticCurveTo(-0.08, -0.8, -0.04, -0.92);
        ctx.fill();
      }
      break;
    }
    case "patka": {
      ctx.fillStyle = wrap;
      ctx.beginPath();
      ctx.ellipse(0, -0.93, 0.062, 0.045, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -0.975, 0.025, 0, TAU);
      ctx.fill();
      break;
    }
    case "chunni": {
      // The chunni over the hair, framing the face.
      ctx.fillStyle = rgb(HAIR);
      ctx.beginPath();
      ctx.ellipse(0, -0.915, 0.06, 0.052, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = wrap;
      ctx.beginPath();
      ctx.moveTo(-0.075, -0.84);
      ctx.quadraticCurveTo(-0.085, -0.97, 0.0, -0.975);
      ctx.quadraticCurveTo(0.06, -0.975, 0.07, -0.93);
      ctx.lineTo(0.04, -0.94);
      ctx.quadraticCurveTo(-0.02, -0.94, -0.03, -0.86);
      ctx.closePath();
      ctx.fill();
      if (look.phulkari) phulkariDots(ctx, -0.06, -0.96, 0.1, 0.1);
      break;
    }
    default: {
      ctx.fillStyle = rgb(HAIR);
      ctx.beginPath();
      ctx.ellipse(0, -0.915, 0.061, 0.052, 0, Math.PI, 0);
      ctx.fill();
      if (look.woman) {
        ctx.beginPath();
        ctx.arc(-0.055, -0.9, 0.028, 0, TAU);
        ctx.fill();
      }
    }
  }
}

/** The chunni's fall behind the shoulders, lifted by the dance. */
function chunniBack(ctx: Ctx, look: Look, swirl: number) {
  ctx.fillStyle = rgb(mix(look.wrap, [0, 0, 0], 0.15));
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.93);
  ctx.quadraticCurveTo(
    -0.16 - swirl * 0.12,
    -0.75,
    -0.15 - swirl * 0.2,
    -0.46 + Math.abs(swirl) * 0.06,
  );
  ctx.lineTo(0.02 - swirl * 0.1, -0.5);
  ctx.quadraticCurveTo(-0.02, -0.7, 0.03, -0.86);
  ctx.closePath();
  ctx.fill();
  if (look.phulkari) phulkariDots(ctx, -0.15 - swirl * 0.15, -0.8, 0.13, 0.3);
}

/** Phulkari: darning-stitch flowers of gold and orange silk on a red ground. */
function phulkariDots(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(252, 196, 60, 0.9)";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      const px = x + ((i + (j % 2) * 0.5) / 4) * w;
      const py = y + (j / 5) * h;
      ctx.beginPath();
      ctx.moveTo(px, py - 0.012);
      ctx.lineTo(px + 0.009, py);
      ctx.lineTo(px, py + 0.012);
      ctx.lineTo(px - 0.009, py);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function parandi(ctx: Ctx, look: Look, bob: number, lean: number) {
  // A plait down the back ending in a silk parandi with tassels.
  const topX = -0.05;
  const topY = -0.9;
  const endX = -0.075 - lean * 0.3;
  const endY = -0.42 + bob;
  ctx.strokeStyle = rgb(HAIR);
  ctx.lineWidth = 0.022;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.quadraticCurveTo(-0.1, -0.7, endX, endY);
  ctx.stroke();
  ctx.fillStyle = rgb(look.parandi!);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(
      endX + (i - 1) * 0.02,
      endY + 0.03 + (i % 2) * 0.015,
      0.016,
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.fillStyle = "rgba(250, 206, 90, 0.95)";
  ctx.fillRect(endX - 0.015, endY - 0.01, 0.03, 0.015);
}

function shawl(ctx: Ctx, look: Look) {
  // A loi, a woollen shawl, wrapped over the shoulders and arms.
  ctx.fillStyle = rgb(look.shawl!);
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.8);
  ctx.quadraticCurveTo(0, -0.84, 0.12, -0.8);
  ctx.lineTo(0.15, -0.5);
  ctx.quadraticCurveTo(0, -0.46, -0.15, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(mix(look.shawl!, [255, 255, 255], 0.4));
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.53);
  ctx.quadraticCurveTo(0, -0.49, 0.14, -0.53);
  ctx.stroke();
}

function arm(
  ctx: Ctx,
  look: Look,
  side: -1 | 1,
  upper: number,
  fore: number,
  back = false,
) {
  const sx = side * SHOULDER.x;
  const sy = SHOULDER.y;
  const ex = sx + Math.sin(upper) * UPPER;
  const ey = sy + Math.cos(upper) * UPPER;
  const hx = ex + Math.sin(fore) * FOREARM;
  const hy = ey + Math.cos(fore) * FOREARM;
  ctx.lineCap = "round";
  if (back) {
    // From behind the hands are out of sight in front of the body: only the upper arm shows.
    ctx.strokeStyle = rgb(look.top);
    ctx.lineWidth = 0.058;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + side * 0.03, sy + UPPER * 0.95);
    ctx.stroke();
    return { x: hx, y: hy, angle: fore };
  }
  // Kurtas and kameez have full sleeves; a kurti over a ghagra, three-quarter.
  ctx.strokeStyle = rgb(look.shawl ?? look.top);
  ctx.lineWidth = 0.055;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const sleeve = look.lower === "ghagra" ? 0.3 : 0.75;
  ctx.strokeStyle = rgb(look.shawl ?? look.top);
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(lerp(ex, hx, sleeve), lerp(ey, hy, sleeve));
  ctx.stroke();
  ctx.strokeStyle = rgb(look.skin);
  ctx.lineWidth = 0.038;
  ctx.beginPath();
  ctx.moveTo(lerp(ex, hx, sleeve), lerp(ey, hy, sleeve));
  ctx.lineTo(hx, hy);
  ctx.stroke();
  if (look.chooda) {
    // The bride's chooda: red and ivory bangles up the forearm.
    for (let i = 0; i < 5; i++) {
      const t = 0.35 + i * 0.12;
      ctx.strokeStyle =
        i % 2 ? "rgba(246, 236, 214, 1)" : "rgba(200, 20, 40, 1)";
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(lerp(ex, hx, t), lerp(ey, hy, t));
      ctx.lineTo(lerp(ex, hx, t + 0.06), lerp(ey, hy, t + 0.06));
      ctx.stroke();
    }
  } else if (look.woman) {
    ctx.strokeStyle = "rgba(230, 180, 60, 0.95)";
    ctx.lineWidth = 0.046;
    ctx.beginPath();
    ctx.moveTo(lerp(ex, hx, 0.78), lerp(ey, hy, 0.78));
    ctx.lineTo(lerp(ex, hx, 0.84), lerp(ey, hy, 0.84));
    ctx.stroke();
  } else if (look.sash || look.beard) {
    // A steel kara on the wrist.
    ctx.strokeStyle = "rgba(210, 214, 220, 0.95)";
    ctx.lineWidth = 0.044;
    ctx.beginPath();
    ctx.moveTo(lerp(ex, hx, 0.8), lerp(ey, hy, 0.8));
    ctx.lineTo(lerp(ex, hx, 0.85), lerp(ey, hy, 0.85));
    ctx.stroke();
  }
  ctx.fillStyle = rgb(look.skin);
  ctx.beginPath();
  ctx.arc(hx, hy, 0.026, 0, TAU);
  ctx.fill();
  return { x: hx, y: hy, angle: fore };
}

// ─── Things in hand ─────────────────────────────────────────────────────────

function dhol(ctx: Ctx) {
  // Slung from the shoulder, lying across the body: the bass head (dagga side) to the front.
  ctx.strokeStyle = "rgba(90, 40, 20, 0.95)";
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.79);
  ctx.lineTo(0.0, -0.58);
  ctx.stroke();
  const cx = 0.03;
  const cy = -0.5;
  const hw = 0.19;
  const hh = 0.11;
  const shell = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
  shell.addColorStop(0, "#d8743a");
  shell.addColorStop(0.45, "#a23c1a");
  shell.addColorStop(1, "#5a1c0c");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - hh * 0.92);
  ctx.quadraticCurveTo(cx, cy - hh * 1.2, cx + hw, cy - hh * 0.92);
  ctx.lineTo(cx + hw, cy + hh * 0.92);
  ctx.quadraticCurveTo(cx, cy + hh * 1.2, cx - hw, cy + hh * 0.92);
  ctx.closePath();
  ctx.fill();
  // The rope lacing, zigzagging from rim to rim.
  ctx.strokeStyle = "rgba(250, 214, 130, 0.9)";
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const x = i % 2 ? cx + hw - 0.02 : cx - hw + 0.02;
    const y = cy - hh * 0.85 + (i / 10) * hh * 1.7;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // The two heads, edge-on, with their rims.
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#efe0bc";
    ctx.beginPath();
    ctx.ellipse(cx + side * hw, cy, 0.03, hh, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#3a1a0c";
    ctx.lineWidth = 0.01;
    ctx.stroke();
  }
  // Phumman, woollen tassels, hanging from its belly.
  ctx.fillStyle = "#e0243c";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(cx - 0.12 + i * 0.08, cy + hh + 0.02, 0.016, 0, TAU);
    ctx.fill();
  }
}

function baby(ctx: Ctx) {
  // A baby wrapped in a red shawl, held to the chest.
  ctx.fillStyle = "#b8182e";
  ctx.beginPath();
  ctx.ellipse(0.1, -0.64, 0.11, 0.06, -0.25, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(250, 200, 80, 0.9)";
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.ellipse(0.1, -0.64, 0.09, 0.045, -0.25, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#d4a07a";
  ctx.beginPath();
  ctx.arc(0.19, -0.68, 0.035, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.ellipse(0.19, -0.705, 0.038, 0.02, 0, Math.PI, 0);
  ctx.fill();
}

function held(
  ctx: Ctx,
  hold: Hold | undefined,
  left: { x: number; y: number; angle: number },
  right: { x: number; y: number; angle: number },
): Point {
  const along = (d: number) => ({
    x: right.x + Math.sin(right.angle) * d,
    y: right.y + Math.cos(right.angle) * d,
  });
  ctx.lineCap = "round";
  switch (hold) {
    case "dhol": {
      // The dagga, a thick stick curved at the end, and the tilli, a thin cane.
      ctx.strokeStyle = "#5a3418";
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.quadraticCurveTo(
        right.x + Math.sin(right.angle) * 0.12,
        right.y + Math.cos(right.angle) * 0.12,
        right.x + Math.sin(right.angle + 0.8) * 0.2,
        right.y + Math.cos(right.angle + 0.8) * 0.2,
      );
      ctx.stroke();
      ctx.strokeStyle = "#c8a870";
      ctx.lineWidth = 0.01;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(
        left.x + Math.sin(left.angle) * 0.24,
        left.y + Math.cos(left.angle) * 0.24,
      );
      ctx.stroke();
      return right;
    }
    case "lantern": {
      // A hurricane lantern hanging from the hand; its glow is added with the light.
      ctx.strokeStyle = "#3a3024";
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.lineTo(right.x, right.y + 0.04);
      ctx.stroke();
      ctx.fillStyle = "#6a1e18";
      ctx.fillRect(right.x - 0.035, right.y + 0.04, 0.07, 0.02);
      ctx.fillStyle = "rgba(255, 214, 140, 0.95)";
      ctx.beginPath();
      ctx.ellipse(right.x, right.y + 0.1, 0.035, 0.045, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#6a1e18";
      ctx.fillRect(right.x - 0.045, right.y + 0.14, 0.09, 0.03);
      return { x: right.x, y: right.y + 0.1 };
    }
    case "bag": {
      ctx.fillStyle = "#d8c29a";
      ctx.beginPath();
      ctx.moveTo(right.x - 0.02, right.y);
      ctx.lineTo(right.x + 0.03, right.y);
      ctx.lineTo(right.x + 0.07, right.y + 0.16);
      ctx.quadraticCurveTo(
        right.x,
        right.y + 0.19,
        right.x - 0.07,
        right.y + 0.16,
      );
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#a0302a";
      ctx.lineWidth = 0.01;
      ctx.beginPath();
      ctx.moveTo(right.x - 0.06, right.y + 0.11);
      ctx.lineTo(right.x + 0.06, right.y + 0.11);
      ctx.stroke();
      return right;
    }
    case "plate": {
      // A thali of rewri, gur and popcorn.
      const cx = (left.x + right.x) / 2;
      const cy = Math.min(left.y, right.y) - 0.01;
      ctx.fillStyle = "#c9a24a";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 0.12, 0.028, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f4ecd8";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(
          cx - 0.07 + i * 0.028,
          cy - 0.022 - (i % 2) * 0.01,
          0.014,
          0,
          TAU,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#8a4a1c";
      ctx.beginPath();
      ctx.arc(cx + 0.02, cy - 0.03, 0.02, 0, TAU);
      ctx.fill();
      return { x: cx, y: cy - 0.03 };
    }
    case "sickle": {
      // The daatri: a short wooden handle and a thin curved serrated blade.
      const a = along(0.07);
      ctx.strokeStyle = "#7a4a22";
      ctx.lineWidth = 0.028;
      ctx.beginPath();
      ctx.moveTo(
        right.x - Math.sin(right.angle) * 0.02,
        right.y - Math.cos(right.angle) * 0.02,
      );
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.strokeStyle = "#c8ccd0";
      ctx.lineWidth = 0.014;
      const n = { x: Math.cos(right.angle), y: -Math.sin(right.angle) };
      const d = { x: Math.sin(right.angle), y: Math.cos(right.angle) };
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(
        a.x + d.x * 0.1 + n.x * 0.02,
        a.y + d.y * 0.1 + n.y * 0.02,
        a.x + d.x * 0.16 + n.x * 0.14,
        a.y + d.y * 0.16 + n.y * 0.14,
        a.x + d.x * 0.05 + n.x * 0.19,
        a.y + d.y * 0.05 + n.y * 0.19,
      );
      ctx.stroke();
      return {
        x: a.x + d.x * 0.14 + n.x * 0.1,
        y: a.y + d.y * 0.14 + n.y * 0.1,
      };
    }
    case "sheaf": {
      // A sheaf of wheat held against the hip, its ears fanning out.
      const cx = right.x;
      const cy = right.y;
      ctx.strokeStyle = "#caa24a";
      ctx.lineWidth = 0.01;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 0.004, cy + 0.12);
        ctx.lineTo(cx + i * 0.03, cy - 0.2);
        ctx.stroke();
      }
      ctx.strokeStyle = "#e8c060";
      ctx.lineWidth = 0.026;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 0.03, cy - 0.2);
        ctx.lineTo(cx + i * 0.036, cy - 0.27);
        ctx.stroke();
      }
      ctx.fillStyle = "#8a5a2a";
      ctx.fillRect(cx - 0.03, cy - 0.01, 0.06, 0.02);
      return { x: cx, y: cy - 0.24 };
    }
    case "sword": {
      // The Sri Sahib, held upright before the chest; from behind only the tip shows over the head.
      const cx = (left.x + right.x) / 2;
      const cy = (left.y + right.y) / 2;
      ctx.strokeStyle = "#d8dce4";
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - 0.5);
      ctx.stroke();
      ctx.strokeStyle = "#c8a040";
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(cx - 0.04, cy - 0.02);
      ctx.lineTo(cx + 0.04, cy - 0.02);
      ctx.stroke();
      return { x: cx, y: cy - 0.5 };
    }
    case "nishan": {
      // A Nishan Sahib carried on its pole, the flag drawn by the scene at the tip.
      ctx.strokeStyle = "#e8e2d4";
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y + 0.25);
      ctx.lineTo(right.x, right.y - 1.1);
      ctx.stroke();
      return { x: right.x, y: right.y - 1.1 };
    }
    case "bucket": {
      // A steel balti of dal, for serving langar.
      ctx.fillStyle = "#b8bcc4";
      ctx.beginPath();
      ctx.moveTo(right.x - 0.06, right.y + 0.03);
      ctx.lineTo(right.x + 0.06, right.y + 0.03);
      ctx.lineTo(right.x + 0.05, right.y + 0.14);
      ctx.lineTo(right.x - 0.05, right.y + 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8a8e96";
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.arc(right.x, right.y + 0.03, 0.06, Math.PI, 0);
      ctx.stroke();
      return right;
    }
    case "broom": {
      // A sevadar sweeping the road before the procession.
      const a = along(0.3);
      ctx.strokeStyle = "#8a6a3a";
      ctx.lineWidth = 0.016;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.strokeStyle = "#c8a860";
      ctx.lineWidth = 0.008;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + i * 0.02 + 0.03, a.y + 0.12);
        ctx.stroke();
      }
      return a;
    }
    case "chimta": {
      // The chimta: long iron tongs hung with brass jingles.
      const a = along(0.36);
      const b = along(-0.08);
      ctx.strokeStyle = "#50504c";
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.fillStyle = "#e0b850";
      for (let i = 1; i < 6; i++) {
        const c = along(-0.08 + i * 0.07);
        ctx.beginPath();
        ctx.arc(c.x + 0.015, c.y, 0.012, 0, TAU);
        ctx.fill();
      }
      return a;
    }
    case "tumbi": {
      // The tumbi: a small gourd on a bamboo neck with a single string.
      const a = along(-0.32);
      ctx.strokeStyle = "#a07a40";
      ctx.lineWidth = 0.016;
      ctx.beginPath();
      ctx.moveTo(right.x, right.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();
      ctx.fillStyle = "#c88a3a";
      ctx.beginPath();
      ctx.arc(right.x, right.y + 0.01, 0.045, 0, TAU);
      ctx.fill();
      return a;
    }
    default:
      return { x: right.x, y: right.y };
  }
}

// ─── Poses ──────────────────────────────────────────────────────────────────

/** Bhangra: both arms thrown up, shoulders bouncing, a knee lifted on the beat. */
export function bhangraPose(beat: number, seed: number, energy: number): Pose {
  const phase = beat * Math.PI + seed;
  const up = 0.5 + 0.5 * Math.sin(phase);
  const kick = Math.max(0, Math.sin(phase * 0.5 + seed));
  const alt = Math.sin(phase * 0.5 + seed) > 0;
  return {
    la: lerp(0.4, 2.9, energy * (0.7 + 0.3 * up)),
    lf: lerp(0.3, 2.7, energy),
    ra: lerp(0.4, 2.6, energy * (0.6 + 0.4 * (1 - up))),
    rf: lerp(0.6, 2.9, energy),
    lean: 0.06 * Math.sin(phase * 0.5 + seed) * energy,
    bob: -0.025 * up * energy,
    lift: alt ? [0, kick * energy * 0.8] : [kick * energy * 0.6, 0],
    swirl: Math.sin(phase * 0.5 + seed) * energy,
  };
}

/** Gidda: clapping hands before the chest, turning, the chunni flying. */
export function giddaPose(
  beat: number,
  seed: number,
  energy: number,
  centre = false,
): Pose {
  const phase = beat * Math.PI * 2 + seed;
  const clap = Math.pow(0.5 + 0.5 * Math.cos(phase), 3);
  if (centre) {
    // The one in the middle dances with her arms out, turning.
    return {
      la: lerp(1.2, 2.2, 0.5 + 0.5 * Math.sin(phase * 0.5)),
      lf: 2.4,
      ra: lerp(1.2, 2.2, 0.5 - 0.5 * Math.sin(phase * 0.5)),
      rf: 2.2,
      bob: -0.02 * Math.abs(Math.sin(phase * 0.5)),
      lean: 0.08 * Math.sin(phase * 0.25),
      swirl: Math.sin(phase * 0.5) * energy,
    };
  }
  return {
    la: lerp(0.9, 1.25, clap),
    lf: lerp(1.6, 2.35, clap) * energy + (1 - energy) * 0.3,
    ra: lerp(0.9, 1.25, clap),
    rf: lerp(1.6, 2.35, clap) * energy + (1 - energy) * 0.3,
    bob: -0.012 * clap * energy,
    lean: 0.04 * Math.sin(phase * 0.5),
    swirl: 0.4 * Math.sin(phase * 0.5) * energy,
  };
}

export const STILL: Pose = { la: 0.1, lf: 0.15, ra: -0.1, rf: 0.1 };

/** Someone sitting cross-legged on the floor, for the langar pangat. */
export function drawSeated(
  ctx: Ctx,
  x: number,
  y: number,
  look: Look,
  eating: number,
  facing: 1 | -1 = 1,
) {
  const h = look.h;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  ctx.fillStyle = "rgba(20, 12, 8, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.24, 0.035, 0, 0, TAU);
  ctx.fill();
  // Crossed legs, then the body raised on them.
  ctx.fillStyle = rgb(look.bottom);
  ctx.beginPath();
  ctx.ellipse(0, -0.05, 0.2, 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.translate(0, 0.44);
  if (look.head === "chunni") chunniBack(ctx, look, 0);
  torso(ctx, { ...look, lower: look.woman ? "ghagra" : "pyjama" }, false);
  head(ctx, look, false, 0);
  const lift = clamp(eating);
  arm(ctx, look, -1, 0.5, 1.2);
  arm(ctx, look, 1, lerp(0.5, 1.1, lift), lerp(1.2, 2.8, lift));
  ctx.restore();
}
