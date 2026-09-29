// The Onasadya on a banana leaf, seen from above: the leaf laid with its tip to the diner's left,
// and each dish set in its own place as the scroll serves it, the salt and the banana first and the
// payasam last. Drawn in leaf units: the leaf runs x 0..1 from its tip, y 0..ASPECT from the far
// edge to the near one.
import { TAU, clamp, lerp, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import { cached } from "./light";
import { dishAt, MOMENTS } from "./world";

export const ASPECT = 0.48;

type Dish = {
  ml: string;
  en: string;
  x: number;
  y: number;
  ladle: boolean;
  paint: (g: Ctx, random: () => number) => void;
};

/** An irregular blob, for anything heaped or poured. */
function blob(g: Ctx, x: number, y: number, r: number, c: RGB, random: () => number, squash = 0.8, rough = 0.12) {
  const k = [random() * TAU, random() * TAU, random() * TAU];
  g.fillStyle = rgb(mix(c, [30, 20, 10], 0.25), 0.5);
  const path = (dx: number, dy: number, scale: number) => {
    g.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU;
      const rr = r * scale * (1 + rough * (Math.sin(a * 3 + k[0]) * 0.6 + Math.sin(a * 5 + k[1]) * 0.3 + Math.sin(a * 2 + k[2]) * 0.4));
      const px = x + dx + Math.cos(a) * rr;
      const py = y + dy + Math.sin(a) * rr * squash;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.fill();
  };
  path(r * 0.08, r * 0.12, 1.02);
  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.1);
  grad.addColorStop(0, rgb(mix(c, [255, 255, 255], 0.25)));
  grad.addColorStop(0.7, rgb(c));
  grad.addColorStop(1, rgb(mix(c, [40, 20, 10], 0.2)));
  g.fillStyle = grad;
  path(0, 0, 1);
}

/** Bits scattered on a dish: vegetables, grains, coconut. */
function bits(g: Ctx, x: number, y: number, r: number, colours: RGB[], n: number, size: number, random: () => number, long = 1) {
  for (let i = 0; i < n; i++) {
    const a = random() * TAU;
    const d = Math.sqrt(random()) * r;
    g.fillStyle = rgb(colours[i % colours.length]);
    g.beginPath();
    g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, size * long, size, random() * TAU, 0, TAU);
    g.fill();
  }
}

function gloss(g: Ctx, x: number, y: number, r: number) {
  g.fillStyle = "rgba(255, 250, 230, 0.45)";
  g.beginPath();
  g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.25, r * 0.12, -0.5, 0, TAU);
  g.fill();
}

export const DISHES: Dish[] = [
  {
    ml: "ഉപ്പ്",
    en: "salt",
    x: 0.09,
    y: 0.25,
    ladle: false,
    paint: (g, r) => {
      blob(g, 0.09, 0.25, 0.012, [246, 244, 236], r, 0.8, 0.2);
      bits(
        g,
        0.09,
        0.25,
        0.01,
        [
          [255, 255, 255],
          [220, 218, 210],
        ],
        14,
        0.0018,
        r,
      );
    },
  },
  {
    ml: "പഴം",
    en: "a small banana",
    x: 0.16,
    y: 0.37,
    ladle: false,
    paint: (g) => {
      g.save();
      g.translate(0.16, 0.37);
      g.rotate(-0.35);
      g.fillStyle = "rgba(60, 40, 10, 0.4)";
      g.beginPath();
      g.ellipse(0.004, 0.006, 0.055, 0.014, 0, 0, TAU);
      g.fill();
      const grad = g.createLinearGradient(0, -0.014, 0, 0.014);
      grad.addColorStop(0, "#f7dc5a");
      grad.addColorStop(0.6, "#e8c23a");
      grad.addColorStop(1, "#b89020");
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(-0.055, 0.002);
      g.quadraticCurveTo(0, -0.03, 0.055, -0.002);
      g.quadraticCurveTo(0, 0.02, -0.055, 0.002);
      g.fill();
      g.fillStyle = "#4a3418";
      g.beginPath();
      g.arc(-0.055, 0.002, 0.004, 0, TAU);
      g.arc(0.056, -0.002, 0.005, 0, TAU);
      g.fill();
      g.restore();
    },
  },
  {
    ml: "ഉപ്പേരി",
    en: "banana chips in coconut oil",
    x: 0.18,
    y: 0.12,
    ladle: false,
    paint: (g, r) => {
      for (let i = 0; i < 11; i++) {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * 0.028;
        const x = 0.18 + Math.cos(a) * d;
        const y = 0.12 + Math.sin(a) * d * 0.8;
        g.fillStyle = "rgba(80, 60, 10, 0.35)";
        g.beginPath();
        g.ellipse(x + 0.002, y + 0.003, 0.012, 0.011, 0, 0, TAU);
        g.fill();
        g.fillStyle = rgb(mix([250, 214, 70], [236, 180, 40], r()));
        g.beginPath();
        g.ellipse(x, y, 0.012, 0.011, r(), 0, TAU);
        g.fill();
        g.fillStyle = "rgba(255, 244, 180, 0.7)";
        g.beginPath();
        g.arc(x, y, 0.005, 0, TAU);
        g.fill();
      }
    },
  },
  {
    ml: "ശർക്കരവരട്ടി",
    en: "sharkara varatti, chips in jaggery",
    x: 0.255,
    y: 0.085,
    ladle: false,
    paint: (g, r) => {
      for (let i = 0; i < 10; i++) {
        const x = 0.255 + (r() - 0.5) * 0.045;
        const y = 0.085 + (r() - 0.5) * 0.03;
        g.fillStyle = rgb(mix([150, 84, 30], [200, 130, 50], r()));
        g.beginPath();
        g.moveTo(x - 0.01, y);
        g.lineTo(x, y - 0.008);
        g.lineTo(x + 0.011, y + 0.002);
        g.lineTo(x + 0.002, y + 0.009);
        g.closePath();
        g.fill();
      }
      gloss(g, 0.255, 0.085, 0.02);
    },
  },
  {
    ml: "പുളിയിഞ്ചി",
    en: "puli inji, ginger in tamarind",
    x: 0.325,
    y: 0.065,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.325, 0.065, 0.017, [104, 46, 22], r, 0.8, 0.15);
      gloss(g, 0.325, 0.065, 0.017);
    },
  },
  {
    ml: "മാങ്ങ അച്ചാർ",
    en: "mango pickle",
    x: 0.385,
    y: 0.058,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.385, 0.058, 0.016, [178, 40, 20], r, 0.8, 0.2);
      bits(
        g,
        0.385,
        0.058,
        0.012,
        [
          [226, 120, 40],
          [240, 160, 60],
          [200, 70, 26],
        ],
        7,
        0.0055,
        r,
        1.2,
      );
      gloss(g, 0.385, 0.058, 0.016);
    },
  },
  {
    ml: "നാരങ്ങ അച്ചാർ",
    en: "lime pickle",
    x: 0.44,
    y: 0.055,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.44, 0.055, 0.016, [122, 44, 26], r, 0.8, 0.2);
      bits(
        g,
        0.44,
        0.055,
        0.011,
        [
          [190, 150, 60],
          [150, 100, 40],
        ],
        6,
        0.006,
        r,
        1.4,
      );
      gloss(g, 0.44, 0.055, 0.016);
    },
  },
  {
    ml: "കിച്ചടി",
    en: "kichadi, cucumber in curd",
    x: 0.5,
    y: 0.055,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.5, 0.055, 0.02, [240, 232, 206], r);
      bits(
        g,
        0.5,
        0.055,
        0.015,
        [
          [130, 170, 70],
          [100, 140, 50],
          [60, 40, 30],
        ],
        12,
        0.003,
        r,
        1.5,
      );
    },
  },
  {
    ml: "പച്ചടി",
    en: "pachadi, sweet pineapple in curd",
    x: 0.56,
    y: 0.058,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.56, 0.058, 0.02, [244, 206, 110], r);
      bits(
        g,
        0.56,
        0.058,
        0.014,
        [
          [250, 196, 50],
          [240, 170, 40],
          [210, 40, 60],
        ],
        11,
        0.0045,
        r,
        1.2,
      );
    },
  },
  {
    ml: "തോരൻ",
    en: "thoran, cabbage with grated coconut",
    x: 0.625,
    y: 0.065,
    ladle: false,
    paint: (g, r) => {
      blob(g, 0.625, 0.065, 0.022, [200, 214, 120], r, 0.8, 0.22);
      bits(
        g,
        0.625,
        0.065,
        0.018,
        [
          [250, 248, 236],
          [150, 190, 70],
          [240, 200, 60],
          [40, 30, 20],
        ],
        40,
        0.0022,
        r,
        1.6,
      );
    },
  },
  {
    ml: "അവിയൽ",
    en: "avial, vegetables in coconut and curd",
    x: 0.695,
    y: 0.072,
    ladle: false,
    paint: (g, r) => {
      blob(g, 0.695, 0.072, 0.024, [236, 222, 170], r, 0.8, 0.18);
      bits(
        g,
        0.695,
        0.072,
        0.019,
        [
          [236, 120, 40],
          [110, 160, 60],
          [240, 230, 190],
          [180, 150, 90],
          [90, 130, 50],
        ],
        26,
        0.0028,
        r,
        3,
      );
    },
  },
  {
    ml: "ഓലൻ",
    en: "olan, ash gourd in coconut milk",
    x: 0.765,
    y: 0.08,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.765, 0.08, 0.022, [244, 240, 224], r, 0.8, 0.1);
      bits(
        g,
        0.765,
        0.08,
        0.016,
        [
          [210, 226, 190],
          [150, 70, 50],
          [120, 160, 90],
        ],
        12,
        0.0045,
        r,
        1.3,
      );
      gloss(g, 0.765, 0.08, 0.022);
    },
  },
  {
    ml: "കാളൻ",
    en: "kalan, yam in thick sour curd",
    x: 0.835,
    y: 0.092,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.835, 0.092, 0.022, [236, 196, 70], r, 0.8, 0.1);
      bits(
        g,
        0.835,
        0.092,
        0.015,
        [
          [210, 170, 90],
          [60, 40, 20],
        ],
        8,
        0.004,
        r,
      );
      gloss(g, 0.835, 0.092, 0.022);
    },
  },
  {
    ml: "എരിശ്ശേരി",
    en: "erissery, pumpkin and beans",
    x: 0.9,
    y: 0.12,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.9, 0.12, 0.022, [226, 130, 40], r, 0.8, 0.15);
      bits(
        g,
        0.9,
        0.12,
        0.016,
        [
          [240, 170, 70],
          [120, 60, 30],
          [250, 240, 220],
        ],
        14,
        0.004,
        r,
      );
    },
  },
  {
    ml: "കൂട്ടുകറി",
    en: "kootu curry, chickpeas and plantain",
    x: 0.91,
    y: 0.2,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.91, 0.2, 0.022, [150, 96, 44], r, 0.8, 0.15);
      bits(
        g,
        0.91,
        0.2,
        0.016,
        [
          [210, 170, 100],
          [236, 210, 150],
          [90, 60, 30],
        ],
        14,
        0.0045,
        r,
      );
    },
  },
  {
    ml: "പപ്പടം",
    en: "pappadam",
    x: 0.3,
    y: 0.34,
    ladle: false,
    paint: (g, r) => {
      g.fillStyle = "rgba(90, 70, 30, 0.35)";
      g.beginPath();
      g.arc(0.303, 0.345, 0.045, 0, TAU);
      g.fill();
      g.fillStyle = "#f2dfae";
      g.beginPath();
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * TAU;
        const rr = 0.045 * (1 + Math.sin(a * 7) * 0.02 + (r() - 0.5) * 0.03);
        if (i === 0) g.moveTo(0.3 + Math.cos(a) * rr, 0.34 + Math.sin(a) * rr);
        else g.lineTo(0.3 + Math.cos(a) * rr, 0.34 + Math.sin(a) * rr);
      }
      g.fill();
      for (let i = 0; i < 22; i++) {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * 0.038;
        g.fillStyle = r() < 0.5 ? "rgba(255, 250, 220, 0.8)" : "rgba(200, 160, 90, 0.5)";
        g.beginPath();
        g.arc(0.3 + Math.cos(a) * d, 0.34 + Math.sin(a) * d, 0.002 + r() * 0.004, 0, TAU);
        g.fill();
      }
    },
  },
  {
    ml: "ചോറ്",
    en: "rice, the red matta of Kerala",
    x: 0.55,
    y: 0.3,
    ladle: false,
    paint: (g, r) => {
      blob(g, 0.55, 0.3, 0.075, [236, 214, 200], r, 0.72, 0.08);
      bits(
        g,
        0.55,
        0.3,
        0.07,
        [
          [250, 236, 226],
          [220, 170, 150],
          [236, 206, 190],
          [200, 150, 130],
        ],
        170,
        0.0038,
        r,
        1.9,
      );
    },
  },
  {
    ml: "പരിപ്പ്, നെയ്യ്",
    en: "parippu, with a spoon of ghee",
    x: 0.5,
    y: 0.28,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.5, 0.28, 0.028, [240, 196, 50], r, 0.75, 0.12);
      g.fillStyle = "rgba(255, 240, 170, 0.8)";
      g.beginPath();
      g.ellipse(0.495, 0.275, 0.012, 0.007, 0.3, 0, TAU);
      g.fill();
    },
  },
  {
    ml: "സാമ്പാർ",
    en: "sambar",
    x: 0.585,
    y: 0.31,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.585, 0.31, 0.034, [200, 90, 36], r, 0.75, 0.12);
      bits(
        g,
        0.585,
        0.31,
        0.026,
        [
          [236, 150, 60],
          [120, 160, 60],
          [250, 220, 180],
          [160, 50, 30],
        ],
        14,
        0.005,
        r,
        1.4,
      );
      gloss(g, 0.585, 0.31, 0.034);
    },
  },
  {
    ml: "അടപ്രഥമൻ",
    en: "ada pradhaman, the payasam",
    x: 0.82,
    y: 0.32,
    ladle: true,
    paint: (g, r) => {
      blob(g, 0.82, 0.32, 0.04, [176, 112, 56], r, 0.75, 0.08);
      bits(
        g,
        0.82,
        0.32,
        0.032,
        [
          [236, 214, 170],
          [220, 190, 140],
        ],
        18,
        0.005,
        r,
        1.8,
      );
      bits(g, 0.82, 0.32, 0.03, [[240, 220, 170]], 5, 0.0055, r, 1.5);
      gloss(g, 0.82, 0.32, 0.04);
    },
  },
];

/** The leaf itself: waxy green, paler at the cut, with its fine parallel veins. */
function paintLeaf(g: Ctx) {
  const top = (u: number) => 0.24 - 0.235 * Math.pow(Math.sin((Math.min(u, 0.42) / 0.42) * Math.PI * 0.5), 0.8);
  const bottom = (u: number) => 0.26 + 0.215 * Math.pow(Math.sin((Math.min(u, 0.34) / 0.34) * Math.PI * 0.5), 0.9);
  const shape = () => {
    g.beginPath();
    g.moveTo(0, 0.25);
    for (let i = 1; i <= 40; i++) g.lineTo(i / 40, top(i / 40) + Math.sin(i * 2.7) * 0.002);
    g.lineTo(1, bottom(1));
    for (let i = 40; i >= 0; i--) g.lineTo(i / 40, bottom(i / 40));
    g.closePath();
  };
  g.fillStyle = "rgba(20, 30, 10, 0.35)";
  g.save();
  g.translate(0.006, 0.01);
  shape();
  g.fill();
  g.restore();
  const grad = g.createLinearGradient(0, 0, 0, ASPECT);
  grad.addColorStop(0, "#5f9a34");
  grad.addColorStop(0.5, "#4f8a2a");
  grad.addColorStop(1, "#3f7a22");
  g.fillStyle = grad;
  shape();
  g.fill();
  g.save();
  shape();
  g.clip();
  // Veins, running from the midrib side up toward the tip.
  g.strokeStyle = "rgba(190, 230, 140, 0.18)";
  g.lineWidth = 0.0016;
  for (let i = -20; i < 110; i++) {
    const x = i / 100;
    g.beginPath();
    g.moveTo(x, ASPECT);
    g.lineTo(x - 0.1, 0);
    g.stroke();
  }
  // Sheen and a paler strip where the midrib was cut away.
  const sheen = g.createLinearGradient(0, 0, 1, ASPECT);
  sheen.addColorStop(0, "rgba(255, 255, 230, 0)");
  sheen.addColorStop(0.45, "rgba(255, 255, 230, 0.12)");
  sheen.addColorStop(0.6, "rgba(255, 255, 230, 0)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, 1, ASPECT);
  g.fillStyle = "rgba(210, 230, 150, 0.35)";
  g.fillRect(0, ASPECT - 0.02, 1, 0.03);
  g.restore();
}

const PX = 1400;

/** The empty leaf, and the same leaf with the whole feast on it, for the other diners. */
function leafCanvas(full: boolean) {
  return cached(full ? "onam-leaf-full" : "onam-leaf", PX, PX * ASPECT, (g) => {
    g.scale(PX, PX);
    paintLeaf(g);
    if (full) DISHES.forEach((dish, i) => dish.paint(g, mulberry32(40 + i)));
  });
}

/** Paints the leaves ahead of time, so the hall does not wait for them. */
export function warmLeaves() {
  leafCanvas(false);
  leafCanvas(true);
}

/** Draws a leaf of length `length` centred on (x, y), squashed by `tilt`; `served` dishes on it. */
export function drawLeaf(ctx: Ctx, x: number, y: number, length: number, tilt: number, p: number, hero: boolean, alpha = 1) {
  ctx.save();
  ctx.translate(x - length / 2, y - (length * ASPECT * tilt) / 2);
  ctx.scale(length, length * tilt);
  ctx.globalAlpha = alpha;
  if (!hero) {
    ctx.drawImage(leafCanvas(p > MOMENTS.dishes[0] + 0.01), 0, 0, 1, ASPECT);
    ctx.restore();
    return;
  }
  ctx.drawImage(leafCanvas(false), 0, 0, 1, ASPECT);
  DISHES.forEach((dish, i) => {
    const t = clamp((p - dishAt(i)) / 0.0016);
    if (t <= 0) return;
    ctx.save();
    const s = lerp(1.35, 1, t * t);
    ctx.globalAlpha = alpha * clamp(t * 1.6);
    ctx.translate(dish.x, dish.y);
    ctx.scale(s, s);
    ctx.translate(-dish.x, -dish.y);
    dish.paint(ctx, mulberry32(40 + i));
    ctx.restore();
  });
  // The server's coconut-shell ladle, or a hand, coming in from the far side for each dish.
  for (let i = 0; i < DISHES.length; i++) {
    const t = (p - dishAt(i) + 0.0013) / 0.0028;
    if (t <= 0 || t >= 1) continue;
    const dish = DISHES[i];
    const reach = Math.sin(t * Math.PI);
    const hx = dish.x + 0.03;
    const hy = lerp(-0.2, dish.y - 0.03, reach);
    ctx.globalAlpha = alpha * clamp(reach * 3);
    // A bare forearm reaching in from the far side, a hand holding a coconut-shell ladle or the food.
    const elbow = { x: hx + 0.1, y: -0.34 };
    const wrist = { x: hx + 0.018, y: hy - 0.02 };
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const arm = ctx.createLinearGradient(elbow.x - nx * 0.02, elbow.y - ny * 0.02, elbow.x + nx * 0.02, elbow.y + ny * 0.02);
    arm.addColorStop(0, "#8a5634");
    arm.addColorStop(0.5, "#b07a52");
    arm.addColorStop(1, "#7a4a2c");
    ctx.fillStyle = arm;
    ctx.beginPath();
    ctx.moveTo(elbow.x - nx * 0.024, elbow.y - ny * 0.024);
    ctx.lineTo(wrist.x - nx * 0.015, wrist.y - ny * 0.015);
    ctx.lineTo(wrist.x + nx * 0.015, wrist.y + ny * 0.015);
    ctx.lineTo(elbow.x + nx * 0.024, elbow.y + ny * 0.024);
    ctx.closePath();
    ctx.fill();
    if (dish.ladle) {
      ctx.strokeStyle = "#6a4424";
      ctx.lineWidth = 0.006;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(wrist.x + 0.01, wrist.y);
      ctx.lineTo(hx - 0.022, hy + 0.022);
      ctx.stroke();
      ctx.fillStyle = "#3e2614";
      ctx.beginPath();
      ctx.ellipse(hx - 0.032, hy + 0.03, 0.022, 0.016, 0.4 + (1 - reach) * 0.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 230, 190, 0.25)";
      ctx.beginPath();
      ctx.ellipse(hx - 0.036, hy + 0.026, 0.01, 0.005, 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#a86e46";
    ctx.beginPath();
    ctx.ellipse(wrist.x - 0.002, wrist.y + 0.006, 0.019, 0.015, angle, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The dish just served, to name on screen, and how clearly to show it. */
export function servedLabel(p: number) {
  let latest = -1;
  for (let i = 0; i < DISHES.length; i++) if (p >= dishAt(i)) latest = i;
  if (latest < 0) return null;
  const t = p - dishAt(latest);
  const hold = latest === DISHES.length - 1 ? 0.012 : MOMENTS.dishes[1];
  return {
    dish: DISHES[latest],
    alpha: clamp(t / 0.0009) * (1 - clamp((t - hold) / 0.0012)),
  };
}
