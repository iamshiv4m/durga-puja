// The painting on the haveli across the chowk, in the manner of a Nathdwara pichhwai: Krishna,
// dark as a rain cloud, reaching to colour Radha's cheek under a kadamb tree, while she aims her
// pichkari back at him. Painted once onto its own canvas; the colour on her cheek is added live.
import { TAU, mix, mulberry32, rgb, type Ctx, type RGB } from "../paint";
import { MURAL } from "./places";

const KRISHNA_SKIN: RGB = [46, 78, 150];
const RADHA_SKIN: RGB = [246, 214, 176];
const GOLD: RGB = [226, 178, 62];

/** Where, inside the painting, Krishna's hand meets Radha's cheek (panel units, top left origin). */
export const CHEEK = { x: 2.27, y: 1.88 };

/**
 * A face in profile looking towards +x: forehead, nose, lips and chin, with a long almond eye.
 * (x, y) is the middle of the head, `s` its height.
 */
function profile(g: Ctx, x: number, y: number, s: number, skin: RGB, facing: 1 | -1, line: RGB) {
  g.save();
  g.translate(x, y);
  g.scale(facing * s, s);
  g.fillStyle = rgb(skin);
  g.beginPath();
  g.moveTo(-0.3, -0.3);
  g.quadraticCurveTo(-0.2, -0.56, 0.08, -0.56);
  g.quadraticCurveTo(0.28, -0.52, 0.32, -0.3);
  g.lineTo(0.34, -0.16);
  g.quadraticCurveTo(0.37, -0.08, 0.47, 0.07);
  g.quadraticCurveTo(0.44, 0.11, 0.36, 0.11);
  g.quadraticCurveTo(0.39, 0.15, 0.365, 0.18);
  g.lineTo(0.335, 0.2);
  g.quadraticCurveTo(0.37, 0.23, 0.345, 0.26);
  g.quadraticCurveTo(0.34, 0.35, 0.26, 0.38);
  g.quadraticCurveTo(0.12, 0.41, 0.06, 0.4);
  g.lineTo(0.08, 0.62);
  g.lineTo(-0.16, 0.62);
  g.quadraticCurveTo(-0.2, 0.4, -0.3, 0.2);
  g.quadraticCurveTo(-0.38, 0, -0.3, -0.3);
  g.closePath();
  g.fill();
  g.strokeStyle = rgb(line, 0.7);
  g.lineWidth = 0.018;
  g.stroke();
  // The eye: long, lotus-shaped, with kohl drawn out towards the ear.
  g.fillStyle = "#f6f0e2";
  g.beginPath();
  g.moveTo(0.02, -0.08);
  g.quadraticCurveTo(0.16, -0.19, 0.3, -0.1);
  g.quadraticCurveTo(0.16, -0.02, 0.02, -0.08);
  g.fill();
  g.fillStyle = "#1a1210";
  g.beginPath();
  g.arc(0.2, -0.105, 0.04, 0, TAU);
  g.fill();
  g.strokeStyle = "#1a1210";
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(-0.04, -0.07);
  g.quadraticCurveTo(0.14, -0.2, 0.31, -0.1);
  g.stroke();
  g.lineWidth = 0.016;
  g.beginPath();
  g.moveTo(0.04, -0.23);
  g.quadraticCurveTo(0.18, -0.3, 0.31, -0.22);
  g.stroke();
  // Lips.
  g.fillStyle = "#c8283a";
  g.beginPath();
  g.ellipse(0.345, 0.2, 0.03, 0.022, 0, 0, TAU);
  g.fill();
  g.restore();
}

/** Paints the pichhwai at `scale` px per world unit. */
export function paintMural(scale: number) {
  const { w, h } = MURAL;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const g = canvas.getContext("2d")!;
  g.scale(scale, scale);
  const random = mulberry32(5);

  // A maroon border with gold flowers, and inside it a cusped arch.
  g.fillStyle = "#7a1a1e";
  g.fillRect(0, 0, w, h);
  g.fillStyle = rgb(GOLD);
  for (let i = 0; i < 44; i++) {
    const t = i / 44;
    const per = 2 * (w + h);
    let d = t * per;
    let px: number;
    let py: number;
    if (d < w) [px, py] = [d, 0.09];
    else if ((d -= w) < h) [px, py] = [w - 0.09, d];
    else if ((d -= h) < w) [px, py] = [w - d, h - 0.09];
    else [px, py] = [0.09, h - (d - w)];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      g.beginPath();
      g.arc(px + Math.cos(a) * 0.035, py + Math.sin(a) * 0.035, 0.02, 0, TAU);
      g.fill();
    }
  }
  const inner = new Path2D();
  const ix = 0.2;
  const iw = w - 0.4;
  inner.moveTo(ix, h - 0.2);
  inner.lineTo(ix, 0.9);
  // Scalloped arch.
  const scallops = 7;
  for (let i = 0; i < scallops; i++) {
    const t0 = i / scallops;
    const t1 = (i + 1) / scallops;
    const ax = (t: number) => ix + t * iw;
    const ay = (t: number) => 0.9 - Math.sin(t * Math.PI) * 0.65;
    inner.quadraticCurveTo(ax((t0 + t1) / 2), ay((t0 + t1) / 2) - 0.08, ax(t1), ay(t1));
  }
  inner.lineTo(ix + iw, h - 0.2);
  inner.closePath();
  g.save();
  g.lineWidth = 0.06;
  g.strokeStyle = rgb(GOLD);
  g.stroke(inner);
  g.clip(inner);

  // The sky of Phagun, pink with thrown colour, over a warm ivory ground.
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#2a3a6a");
  sky.addColorStop(0.28, "#e8a0a8");
  sky.addColorStop(0.5, "#f4e2c4");
  sky.addColorStop(1, "#efdcba");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // Clouds of gulal in the sky, painted in soft rounds.
  const puffs: [number, number, number, RGB][] = [];
  for (let i = 0; i < 26; i++) puffs.push([0.3 + random() * (w - 0.6), 0.8 + random() * 0.8, 0.12 + random() * 0.2, [[230, 60, 120], [250, 190, 40], [60, 170, 90], [220, 40, 50]][i % 4] as RGB]);
  for (const [px, py, pr, pc] of puffs) {
    const gr = g.createRadialGradient(px, py, 0, px, py, pr);
    gr.addColorStop(0, rgb(pc, 0.55));
    gr.addColorStop(1, rgb(pc, 0));
    g.fillStyle = gr;
    g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  // The kadamb tree between them, with its round golden flowers.
  g.fillStyle = "#5a3a26";
  g.fillRect(w / 2 - 0.07, 1.4, 0.14, 2.2);
  const leaves: [number, number, number][] = [
    [w / 2, 1.05, 0.55],
    [w / 2 - 0.5, 1.3, 0.42],
    [w / 2 + 0.5, 1.3, 0.42],
    [w / 2 - 0.2, 0.8, 0.4],
    [w / 2 + 0.25, 0.85, 0.38],
  ];
  for (const [lx, ly, lr] of leaves) {
    g.fillStyle = "#2e5a32";
    g.beginPath();
    g.arc(lx, ly, lr, 0, TAU);
    g.fill();
  }
  for (let i = 0; i < 160; i++) {
    const [lx, ly, lr] = leaves[i % leaves.length];
    const a = random() * TAU;
    const r = Math.sqrt(random()) * lr * 0.95;
    g.fillStyle = i % 5 === 0 ? "#f2c23a" : rgb(mix([40, 90, 44], [90, 140, 60], random()));
    g.beginPath();
    g.ellipse(lx + Math.cos(a) * r, ly + Math.sin(a) * r, i % 5 === 0 ? 0.035 : 0.05, i % 5 === 0 ? 0.035 : 0.025, a, 0, TAU);
    g.fill();
  }

  // The ground: the banks of the Yamuna, green with little flowers.
  g.fillStyle = "#4a7a3a";
  g.fillRect(0, h - 0.62, w, 0.62);
  g.fillStyle = "#3a6a8a";
  g.fillRect(0, h - 0.34, w, 0.14);
  g.strokeStyle = "rgba(220, 240, 250, 0.6)";
  g.lineWidth = 0.012;
  for (let i = 0; i < 12; i++) {
    const x = 0.2 + i * 0.26;
    g.beginPath();
    g.moveTo(x, h - 0.28);
    g.quadraticCurveTo(x + 0.06, h - 0.3, x + 0.12, h - 0.28);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = ["#f2eee0", "#e04a6a", "#f2c23a"][i % 3];
    g.beginPath();
    g.arc(random() * w, h - 0.6 + random() * 0.24, 0.02, 0, TAU);
    g.fill();
  }

  const feetY = h - 0.42;
  krishna(g, 1.05, feetY);
  radha(g, 2.38, feetY);
  g.restore();

  // Grain and a little wear, so it sits on the wall like paint.
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = 0.08 + random() * 0.22;
    g.fillRect(random() * w, random() * h, 0.01 + random() * 0.02, 0.01 + random() * 0.02);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  return canvas;
}

function krishna(g: Ctx, x: number, feet: number) {
  const line: RGB = [20, 20, 40];
  // Legs under the jama, with anklets.
  g.fillStyle = rgb(KRISHNA_SKIN);
  g.fillRect(x - 0.12, feet - 0.35, 0.08, 0.33);
  g.fillRect(x + 0.04, feet - 0.35, 0.08, 0.33);
  g.beginPath();
  g.ellipse(x - 0.06, feet - 0.01, 0.1, 0.03, 0, 0, TAU);
  g.ellipse(x + 0.12, feet - 0.01, 0.1, 0.03, 0, 0, TAU);
  g.fill();
  g.fillStyle = rgb(GOLD);
  g.fillRect(x - 0.13, feet - 0.1, 0.1, 0.025);
  g.fillRect(x + 0.03, feet - 0.1, 0.1, 0.025);
  // The yellow jama, flaring from the waist, with a red patka hanging in front.
  const waist = feet - 1.35;
  g.fillStyle = "#f2c22e";
  g.beginPath();
  g.moveTo(x - 0.17, waist);
  g.lineTo(x + 0.17, waist);
  g.quadraticCurveTo(x + 0.4, feet - 0.7, x + 0.55, feet - 0.32);
  g.quadraticCurveTo(x, feet - 0.24, x - 0.55, feet - 0.32);
  g.quadraticCurveTo(x - 0.4, feet - 0.7, x - 0.17, waist);
  g.fill();
  g.strokeStyle = "rgba(190, 120, 20, 0.6)";
  g.lineWidth = 0.014;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(x + i * 0.03, waist + 0.05);
    g.quadraticCurveTo(x + i * 0.1, feet - 0.7, x + i * 0.16, feet - 0.3);
    g.stroke();
  }
  g.fillStyle = rgb(GOLD);
  g.beginPath();
  g.moveTo(x - 0.55, feet - 0.32);
  g.quadraticCurveTo(x, feet - 0.24, x + 0.55, feet - 0.32);
  g.lineTo(x + 0.53, feet - 0.28);
  g.quadraticCurveTo(x, feet - 0.19, x - 0.53, feet - 0.28);
  g.fill();
  // Splashes of Radha's colour on his jama.
  g.fillStyle = "rgba(226, 50, 110, 0.75)";
  for (const [sx, sy, sr] of [
    [0.22, -0.8, 0.07],
    [0.3, -0.6, 0.05],
    [0.12, -1.0, 0.045],
    [0.36, -0.45, 0.04],
  ]) {
    g.beginPath();
    g.arc(x + sx, feet + sy, sr, 0, TAU);
    g.fill();
  }
  g.fillStyle = "#c8283a";
  g.beginPath();
  g.moveTo(x + 0.05, waist);
  g.lineTo(x + 0.14, waist);
  g.lineTo(x + 0.16, feet - 0.5);
  g.lineTo(x + 0.08, feet - 0.48);
  g.closePath();
  g.fill();
  // Torso in the jama's bodice, and a long garland of forest flowers.
  const shoulders = feet - 1.95;
  g.fillStyle = "#f2c22e";
  g.beginPath();
  g.moveTo(x - 0.2, shoulders);
  g.lineTo(x + 0.18, shoulders);
  g.lineTo(x + 0.16, waist + 0.02);
  g.lineTo(x - 0.17, waist + 0.02);
  g.closePath();
  g.fill();
  g.fillStyle = rgb(GOLD);
  g.fillRect(x - 0.18, waist - 0.04, 0.35, 0.06);
  g.fillStyle = rgb(KRISHNA_SKIN);
  g.fillRect(x - 0.05, shoulders - 0.12, 0.11, 0.14);
  // Far arm, holding a small bowl of gulal at his waist.
  g.strokeStyle = rgb(KRISHNA_SKIN);
  g.lineCap = "round";
  g.lineWidth = 0.08;
  g.beginPath();
  g.moveTo(x - 0.16, shoulders + 0.06);
  g.lineTo(x - 0.26, shoulders + 0.4);
  g.lineTo(x - 0.08, waist + 0.05);
  g.stroke();
  g.fillStyle = rgb(GOLD);
  g.beginPath();
  g.ellipse(x - 0.06, waist + 0.03, 0.14, 0.05, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = "#e0306e";
  g.beginPath();
  g.ellipse(x - 0.06, waist + 0.02, 0.12, 0.05, 0, Math.PI, 0);
  g.fill();
  // The vanamala.
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const gx = x + Math.sin(t * Math.PI) * 0.18 - 0.02;
    const gy = shoulders + t * 1.3;
    g.fillStyle = i % 3 === 0 ? "#c8283a" : i % 3 === 1 ? "#f4f0e2" : "#4a8a3a";
    g.beginPath();
    g.arc(gx, gy, 0.028, 0, TAU);
    g.fill();
  }
  // Head in profile, looking at her.
  const head = { x: x + 0.02, y: shoulders - 0.3 };
  profile(g, head.x, head.y, 0.42, KRISHNA_SKIN, 1, line);
  // Locks falling behind his ear, a jewelled crown, and the peacock feather set in it, leaning back.
  g.fillStyle = "#12121e";
  g.beginPath();
  g.ellipse(head.x - 0.1, head.y + 0.1, 0.06, 0.16, 0.25, 0, TAU);
  g.fill();
  g.fillStyle = rgb(GOLD);
  g.beginPath();
  g.moveTo(head.x - 0.13, head.y - 0.13);
  g.lineTo(head.x + 0.12, head.y - 0.17);
  g.lineTo(head.x + 0.1, head.y - 0.24);
  g.quadraticCurveTo(head.x + 0.02, head.y - 0.44, head.x - 0.07, head.y - 0.46);
  g.quadraticCurveTo(head.x - 0.1, head.y - 0.3, head.x - 0.14, head.y - 0.2);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(150, 90, 20, 0.8)";
  g.lineWidth = 0.012;
  g.stroke();
  g.fillStyle = "#c8283a";
  g.beginPath();
  g.arc(head.x - 0.01, head.y - 0.24, 0.03, 0, TAU);
  g.fill();
  g.fillStyle = "#f4f0e2";
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(head.x - 0.11 + i * 0.055, head.y - 0.145 - i * 0.008, 0.012, 0, TAU);
    g.fill();
  }
  g.strokeStyle = "#3a5a2a";
  g.lineWidth = 0.014;
  g.beginPath();
  g.moveTo(head.x - 0.06, head.y - 0.44);
  g.quadraticCurveTo(head.x - 0.14, head.y - 0.56, head.x - 0.24, head.y - 0.6);
  g.stroke();
  g.fillStyle = "#2a7a6a";
  g.beginPath();
  g.ellipse(head.x - 0.27, head.y - 0.62, 0.08, 0.05, -0.5, 0, TAU);
  g.fill();
  g.fillStyle = rgb(GOLD);
  g.beginPath();
  g.ellipse(head.x - 0.27, head.y - 0.62, 0.05, 0.032, -0.5, 0, TAU);
  g.fill();
  g.fillStyle = "#1a4aa0";
  g.beginPath();
  g.ellipse(head.x - 0.27, head.y - 0.62, 0.028, 0.02, -0.5, 0, TAU);
  g.fill();
  // A pearl at his ear, and the tilak.
  g.fillStyle = "#f4f0e2";
  g.beginPath();
  g.arc(head.x - 0.03, head.y + 0.08, 0.025, 0, TAU);
  g.fill();
  g.strokeStyle = "#f4f0e2";
  g.lineWidth = 0.014;
  g.beginPath();
  g.moveTo(head.x + 0.115, head.y - 0.19);
  g.lineTo(head.x + 0.12, head.y - 0.12);
  g.stroke();
  // His near arm, reaching to her cheek with colour on his fingers.
  g.strokeStyle = rgb(KRISHNA_SKIN);
  g.lineWidth = 0.085;
  g.beginPath();
  g.moveTo(x + 0.12, shoulders + 0.08);
  g.quadraticCurveTo(x + 0.55, shoulders + 0.3, CHEEK.x - 0.12, CHEEK.y + 0.06);
  g.stroke();
  g.fillStyle = rgb(KRISHNA_SKIN);
  g.beginPath();
  g.ellipse(CHEEK.x - 0.08, CHEEK.y + 0.02, 0.07, 0.045, -0.5, 0, TAU);
  g.fill();
  g.fillStyle = rgb(GOLD);
  g.fillRect(CHEEK.x - 0.36, CHEEK.y + 0.07, 0.05, 0.05);
}

function radha(g: Ctx, x: number, feet: number) {
  const line: RGB = [120, 70, 50];
  // The lehenga, red with a gold hem, flaring to the ground.
  const waist = feet - 1.3;
  g.fillStyle = "#c21e32";
  g.beginPath();
  g.moveTo(x - 0.17, waist);
  g.lineTo(x + 0.17, waist);
  g.quadraticCurveTo(x + 0.45, feet - 0.5, x + 0.6, feet);
  g.quadraticCurveTo(x, feet + 0.06, x - 0.6, feet);
  g.quadraticCurveTo(x - 0.45, feet - 0.5, x - 0.17, waist);
  g.fill();
  g.strokeStyle = "rgba(120, 10, 20, 0.6)";
  g.lineWidth = 0.014;
  for (let i = -4; i <= 4; i++) {
    g.beginPath();
    g.moveTo(x + i * 0.035, waist + 0.05);
    g.quadraticCurveTo(x + i * 0.1, feet - 0.5, x + i * 0.14, feet);
    g.stroke();
  }
  g.fillStyle = rgb(GOLD);
  g.beginPath();
  g.moveTo(x - 0.6, feet);
  g.quadraticCurveTo(x, feet + 0.06, x + 0.6, feet);
  g.lineTo(x + 0.57, feet - 0.07);
  g.quadraticCurveTo(x, feet - 0.01, x - 0.57, feet - 0.07);
  g.fill();
  // Saffron from his bowl, thrown across her skirt.
  g.fillStyle = "rgba(250, 190, 40, 0.75)";
  for (const [sx, sy, sr] of [
    [-0.25, -0.6, 0.06],
    [-0.35, -0.35, 0.05],
    [-0.1, -0.8, 0.045],
  ]) {
    g.beginPath();
    g.arc(x + sx, feet + sy, sr, 0, TAU);
    g.fill();
  }
  // Choli and bare waist.
  const shoulders = feet - 1.85;
  g.fillStyle = rgb(RADHA_SKIN);
  g.fillRect(x - 0.15, waist - 0.14, 0.3, 0.16);
  g.fillStyle = "#2a7a4a";
  g.beginPath();
  g.moveTo(x - 0.18, shoulders);
  g.lineTo(x + 0.16, shoulders);
  g.lineTo(x + 0.15, waist - 0.14);
  g.lineTo(x - 0.16, waist - 0.14);
  g.closePath();
  g.fill();
  g.fillStyle = rgb(RADHA_SKIN);
  g.fillRect(x - 0.05, shoulders - 0.12, 0.1, 0.14);
  // Her odhni, sheer orange, over her head and down her back to the ground.
  const head = { x: x - 0.02, y: shoulders - 0.3 };
  g.fillStyle = "rgba(240, 120, 40, 0.8)";
  g.beginPath();
  g.moveTo(head.x - 0.2, head.y - 0.24);
  g.quadraticCurveTo(head.x + 0.05, head.y - 0.38, head.x + 0.22, head.y - 0.18);
  g.quadraticCurveTo(head.x + 0.35, head.y + 0.3, x + 0.3, waist + 0.1);
  g.quadraticCurveTo(x + 0.5, feet - 0.4, x + 0.62, feet - 0.02);
  g.lineTo(x + 0.3, feet - 0.1);
  g.quadraticCurveTo(x + 0.2, waist, head.x + 0.05, head.y + 0.2);
  g.closePath();
  g.fill();
  profile(g, head.x, head.y, 0.4, RADHA_SKIN, -1, line);
  // Hair under the odhni, a braid down her back, a nath and a tika.
  g.fillStyle = "#16100e";
  g.beginPath();
  g.ellipse(head.x + 0.05, head.y - 0.12, 0.1, 0.1, 0, Math.PI * 0.9, Math.PI * 2.1);
  g.fill();
  g.strokeStyle = "#16100e";
  g.lineWidth = 0.05;
  g.beginPath();
  g.moveTo(head.x + 0.1, head.y + 0.08);
  g.quadraticCurveTo(head.x + 0.2, shoulders + 0.4, head.x + 0.12, waist - 0.1);
  g.stroke();
  g.strokeStyle = rgb(GOLD);
  g.lineWidth = 0.012;
  g.beginPath();
  g.arc(head.x - 0.15, head.y + 0.06, 0.04, 0, TAU);
  g.stroke();
  g.fillStyle = "#c8283a";
  g.beginPath();
  g.arc(head.x - 0.08, head.y - 0.19, 0.02, 0, TAU);
  g.fill();
  // The odhni's edge over the top of her head.
  g.fillStyle = "rgba(240, 120, 40, 0.85)";
  g.beginPath();
  g.moveTo(head.x - 0.2, head.y - 0.24);
  g.quadraticCurveTo(head.x + 0.05, head.y - 0.36, head.x + 0.22, head.y - 0.18);
  g.lineTo(head.x + 0.18, head.y - 0.1);
  g.quadraticCurveTo(head.x, head.y - 0.26, head.x - 0.17, head.y - 0.18);
  g.closePath();
  g.fill();
  g.strokeStyle = rgb(GOLD);
  g.lineWidth = 0.014;
  g.stroke();
  // Her arms: one lifting the odhni to her face, one aiming a pichkari at him.
  g.strokeStyle = rgb(RADHA_SKIN);
  g.lineCap = "round";
  g.lineWidth = 0.07;
  g.beginPath();
  g.moveTo(x - 0.12, shoulders + 0.06);
  g.lineTo(x - 0.28, shoulders + 0.42);
  g.lineTo(x - 0.62, shoulders + 0.3);
  g.stroke();
  g.strokeStyle = "#c21e32";
  g.lineWidth = 0.05;
  g.beginPath();
  g.moveTo(x - 0.24, shoulders + 0.36);
  g.lineTo(x - 0.3, shoulders + 0.4);
  g.stroke();
  // The pichkari: a brass tube, and a thread of yellow water towards him.
  g.save();
  g.translate(x - 0.62, shoulders + 0.3);
  g.rotate(Math.PI + 0.25);
  g.fillStyle = rgb(GOLD);
  g.fillRect(-0.05, -0.03, 0.34, 0.06);
  g.fillRect(0.29, -0.012, 0.1, 0.024);
  g.restore();
  g.strokeStyle = "rgba(250, 196, 40, 0.8)";
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(x - 1.0, shoulders + 0.21);
  g.quadraticCurveTo(x - 1.2, shoulders + 0.2, x - 1.3, shoulders + 0.55);
  g.stroke();
  // Bangles.
  g.strokeStyle = "#c8283a";
  g.lineWidth = 0.03;
  g.beginPath();
  g.moveTo(x - 0.5, shoulders + 0.33);
  g.lineTo(x - 0.52, shoulders + 0.37);
  g.stroke();
}

/** The painting on the wall, with colour spreading on Radha's cheek as `cheek` goes 0 to 1. */
export function drawMural(ctx: Ctx, mural: HTMLCanvasElement, cheek: number) {
  const { x, y, w, h } = MURAL;
  ctx.fillStyle = "rgba(60, 30, 20, 0.2)";
  ctx.fillRect(x + 0.06, y + 0.08, w, h);
  ctx.drawImage(mural, x, y, w, h);
  if (cheek > 0.01) {
    const cx = x + CHEEK.x + 0.02;
    const cy = y + CHEEK.y;
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.09 + cheek * 0.05);
    gr.addColorStop(0, `rgba(236, 40, 110, ${0.85 * cheek})`);
    gr.addColorStop(1, "rgba(236, 40, 110, 0)");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.15, 0, TAU);
    ctx.fill();
  }
}
