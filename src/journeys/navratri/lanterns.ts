// Navadurga: nine paper lanterns strung across the chowk, one for each form of the goddess, each
// painted with her sign. One more is lit each night, or when the reader touches it.
import { TAU, clamp, mix, rgb, type Ctx, type RGB } from "../paint";
import type { Tilt } from "./world";

export type Form = { gu: string; en: string; paper: RGB; sign: string };

export const FORMS: Form[] = [
  { gu: "શૈલપુત્રી", en: "Shailaputri", paper: [206, 44, 40], sign: "trishul" },
  {
    gu: "બ્રહ્મચારિણી",
    en: "Brahmacharini",
    paper: [236, 138, 40],
    sign: "mala",
  },
  { gu: "ચંદ્રઘંટા", en: "Chandraghanta", paper: [236, 190, 60], sign: "bell" },
  { gu: "કૂષ્માંડા", en: "Kushmanda", paper: [248, 164, 50], sign: "sun" },
  { gu: "સ્કંદમાતા", en: "Skandamata", paper: [70, 150, 84], sign: "lotus" },
  { gu: "કાત્યાયની", en: "Katyayani", paper: [214, 70, 44], sign: "sword" },
  { gu: "કાલરાત્રિ", en: "Kalaratri", paper: [46, 46, 96], sign: "vajra" },
  { gu: "મહાગૌરી", en: "Mahagauri", paper: [238, 234, 222], sign: "damaru" },
  {
    gu: "સિદ્ધિદાત્રી",
    en: "Siddhidatri",
    paper: [218, 88, 148],
    sign: "chakra",
  },
];

/** The rope across the chowk, and where on it each lantern hangs. */
export const STRING = {
  z: -1.2,
  from: -9,
  to: 9,
  high: 6.7,
  sag: 1.1,
  drop: 0.45,
};
export const lanternX = (i: number) => -6 + i * 1.5;
export const ropeH = (x: number) => {
  const k = (x - STRING.from) / (STRING.to - STRING.from);
  return STRING.high - STRING.sag * Math.sin(k * Math.PI);
};
/** The lantern's centre, in projected units. */
export function lanternAt(t: Tilt, i: number, sway: number) {
  const x = lanternX(i);
  const h = ropeH(x) - STRING.drop - 0.32;
  return {
    x: x + sway,
    y: STRING.z * t.s - h * t.c,
    hang: STRING.z * t.s - (ropeH(x) - 0.02) * t.c,
  };
}

const W = 0.5;
const H = 0.64;

export function drawRope(g: Ctx, t: Tilt) {
  g.strokeStyle = "rgba(40, 26, 20, 0.9)";
  g.lineWidth = 0.025;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = STRING.from + (i / 40) * (STRING.to - STRING.from);
    const y = STRING.z * t.s - ropeH(x) * t.c;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

/** One lantern, `lit` 0..1, its sign in ink on the paper, glowing through it once lit. */
export function drawLantern(g: Ctx, t: Tilt, i: number, lit: number, sway: number, seconds: number) {
  const form = FORMS[i];
  const at = lanternAt(t, i, sway);
  const c = Math.max(t.c, 0.3);
  const w = W;
  const h = H * c;
  // Its string.
  g.strokeStyle = "rgba(40, 26, 20, 0.9)";
  g.lineWidth = 0.015;
  g.beginPath();
  g.moveTo(at.x - sway, at.hang);
  g.lineTo(at.x, at.y - h / 2);
  g.stroke();
  // The paper drum, lit from within.
  const flick = 0.92 + 0.08 * Math.sin(seconds * 7 + i * 3);
  const paper = mix(mix(form.paper, [20, 14, 20], 0.45), mix(form.paper, [255, 236, 190], 0.45), lit * flick);
  const body = g.createLinearGradient(at.x - w / 2, 0, at.x + w / 2, 0);
  body.addColorStop(0, rgb(mix(paper, [0, 0, 0], 0.35)));
  body.addColorStop(0.45, rgb(paper));
  body.addColorStop(1, rgb(mix(paper, [0, 0, 0], 0.4)));
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(at.x - w * 0.42, at.y - h / 2);
  g.quadraticCurveTo(at.x - w * 0.56, at.y, at.x - w * 0.42, at.y + h / 2);
  g.lineTo(at.x + w * 0.42, at.y + h / 2);
  g.quadraticCurveTo(at.x + w * 0.56, at.y, at.x + w * 0.42, at.y - h / 2);
  g.closePath();
  g.fill();
  // Ribs.
  g.strokeStyle = `rgba(30, 16, 10, ${0.25 + 0.15 * (1 - lit)})`;
  g.lineWidth = 0.008;
  for (const k of [-0.3, 0.3]) {
    g.beginPath();
    g.moveTo(at.x - w * 0.5, at.y + k * h);
    g.lineTo(at.x + w * 0.5, at.y + k * h);
    g.stroke();
  }
  // Caps and a tassel.
  g.fillStyle = "#c89238";
  g.fillRect(at.x - w * 0.44, at.y - h / 2 - 0.04 * c, w * 0.88, 0.05 * c + 0.01);
  g.fillRect(at.x - w * 0.44, at.y + h / 2 - 0.01 * c, w * 0.88, 0.05 * c + 0.01);
  g.strokeStyle = rgb(mix(form.paper, [255, 220, 120], 0.3));
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(at.x, at.y + h / 2 + 0.04 * c);
  g.lineTo(at.x + Math.sin(seconds * 1.5 + i) * 0.02, at.y + h / 2 + 0.3 * c);
  g.stroke();
  // Her sign, in dark ink: a shadow on the paper once the lamp is lit.
  const ink = form.sign === "vajra" ? mix([250, 220, 150], [120, 100, 80], 1 - lit) : mix([60, 20, 14], [40, 14, 10], lit);
  drawSign(g, form.sign, at.x, at.y, Math.min(w, h) * 0.34, rgb(ink, 0.5 + 0.45 * clamp(lit + 0.3)));
}

function drawSign(g: Ctx, sign: string, x: number, y: number, s: number, ink: string) {
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = s * 0.12;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  switch (sign) {
    case "trishul":
      g.moveTo(x, y + s);
      g.lineTo(x, y - s);
      g.moveTo(x - s * 0.55, y - s * 0.75);
      g.quadraticCurveTo(x - s * 0.55, y - s * 0.15, x, y - s * 0.15);
      g.quadraticCurveTo(x + s * 0.55, y - s * 0.15, x + s * 0.55, y - s * 0.75);
      g.moveTo(x - s * 0.7, y + s * 0.7);
      g.lineTo(x, y + s * 0.2);
      g.lineTo(x + s * 0.7, y + s * 0.7);
      g.stroke();
      return;
    case "mala":
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        g.moveTo(x + Math.cos(a) * s * 0.75 + s * 0.12, y + Math.sin(a) * s * 0.75);
        g.arc(x + Math.cos(a) * s * 0.75, y + Math.sin(a) * s * 0.75, s * 0.12, 0, TAU);
      }
      g.fill();
      return;
    case "bell":
      g.moveTo(x - s * 0.6, y + s * 0.6);
      g.quadraticCurveTo(x - s * 0.55, y - s * 0.4, x, y - s * 0.4);
      g.quadraticCurveTo(x + s * 0.55, y - s * 0.4, x + s * 0.6, y + s * 0.6);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(x, y - s * 0.75, s * 0.4, Math.PI * 0.15, Math.PI * 0.85, false);
      g.stroke();
      return;
    case "sun":
      g.arc(x, y, s * 0.45, 0, TAU);
      g.fill();
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        g.moveTo(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62);
        g.lineTo(x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.95);
      }
      g.stroke();
      return;
    case "lotus":
      for (let i = -2; i <= 2; i++) {
        g.moveTo(x, y + s * 0.6);
        g.ellipse(x + i * s * 0.28, y, s * 0.2, s * 0.62, i * 0.38, 0, TAU);
      }
      g.fill();
      return;
    case "sword":
      g.moveTo(x, y + s);
      g.lineTo(x, y + s * 0.5);
      g.moveTo(x - s * 0.4, y + s * 0.5);
      g.lineTo(x + s * 0.4, y + s * 0.5);
      g.stroke();
      g.beginPath();
      g.moveTo(x - s * 0.13, y + s * 0.45);
      g.lineTo(x - s * 0.1, y - s * 0.6);
      g.quadraticCurveTo(x, y - s * 1.05, x + s * 0.2, y - s * 0.8);
      g.lineTo(x + s * 0.13, y + s * 0.45);
      g.fill();
      return;
    case "vajra":
      g.moveTo(x + s * 0.2, y - s);
      g.lineTo(x - s * 0.35, y + s * 0.1);
      g.lineTo(x + s * 0.05, y + s * 0.1);
      g.lineTo(x - s * 0.2, y + s);
      g.lineTo(x + s * 0.4, y - s * 0.15);
      g.lineTo(x, y - s * 0.15);
      g.closePath();
      g.fill();
      return;
    case "damaru":
      g.moveTo(x - s * 0.55, y - s * 0.7);
      g.lineTo(x + s * 0.55, y - s * 0.7);
      g.lineTo(x + s * 0.08, y);
      g.lineTo(x + s * 0.55, y + s * 0.7);
      g.lineTo(x - s * 0.55, y + s * 0.7);
      g.lineTo(x - s * 0.08, y);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + s * 0.6, y + s * 0.1, x + s * 0.8, y - s * 0.3);
      g.stroke();
      return;
    default:
      g.arc(x, y, s * 0.75, 0, TAU);
      g.stroke();
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * s * 0.75, y + Math.sin(a) * s * 0.75);
      }
      g.stroke();
      g.beginPath();
      g.arc(x, y, s * 0.18, 0, TAU);
      g.fill();
  }
}
