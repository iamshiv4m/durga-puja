// A wada in Pune on Sankranti afternoon: the chowk open to the sky, teak pillars round the
// raised osari, the tulsi vrindavan in the middle with the sugad set before it, and women in
// black saris at haldi-kunku, a new bride in her first Sankranti's jewellery of sugared sesame.
import { TAU, flame, flicker, lerp, mix, mulberry32, onScreen, type RGB } from "../paint";
import { drawFigure, drawSugad, SKINS, type Look, type Shade } from "./people";
import { WADA, paint, spanX, type World } from "./world";

const X = WADA;
const PLINTH = 2.3;
const FLOOR = 2.95;
const BEAM = -0.9;
const EAVE = -3.1;
const TULSI = { x: X - 0.8, y: 4.3 };
const LAMP = "255, 170, 80";

const BLACK: RGB = [30, 26, 32];

export class Wada {
  private readonly stones: {
    x: number;
    y: number;
    w: number;
    h: number;
    k: number;
  }[] = [];
  private readonly leaves: { x: number; y: number; a: number; s: number }[] = [];

  constructor() {
    const random = mulberry32(1818);
    for (let row = 0; row < 7; row++) {
      const y = FLOOR + row * 0.5 + row * row * 0.06;
      const h = 0.5 + row * 0.12;
      for (let x = X - 14 + random() * 0.8; x < X + 14; x += 0.9 + random() * 0.8)
        this.stones.push({
          x,
          y,
          w: 0.8 + random() * 0.7 + row * 0.1,
          h,
          k: random(),
        });
    }
    for (let i = 0; i < 70; i++) {
      const a = random() * TAU;
      const r = random() ** 0.6;
      this.leaves.push({
        x: Math.cos(a) * r * 0.55,
        y: -Math.abs(Math.sin(a)) * r * 0.75 - random() * 0.2,
        a: random() * TAU,
        s: 0.05 + random() * 0.05,
      });
    }
  }

  draw(w: World) {
    const { v, env } = w;
    const [left, right] = spanX(v, 2);
    if (right < X - 16 || left > X + 16) return;
    const shade: Shade = (c, a = 1) => paint(c, env, 0, a);
    this.building(w, shade);
    this.courtyard(w, shade);
    this.tulsi(w, shade);
    this.women(w, shade);
  }

  private building(w: World, shade: Shade) {
    const { ctx, v, env, seconds, lights } = w;
    const l = X - 16;
    const r = X + 16;
    // In the shade of the osari: the back wall, lime-washed, and the doors into the house.
    const inner = (c: RGB, a = 1) => paint(mix(c, [60, 50, 60], 0.35), env, 0, a);
    ctx.fillStyle = inner([226, 212, 186]);
    ctx.fillRect(l, BEAM, r - l, PLINTH - BEAM);
    ctx.fillStyle = inner([180, 110, 60]);
    ctx.fillRect(l, PLINTH - 0.5, r - l, 0.5);
    for (const dx of [-7.5, -0.8, 5.9]) {
      const dxx = X + dx;
      ctx.fillStyle = inner([100, 60, 34]);
      ctx.fillRect(dxx - 0.6, -0.3, 1.2, PLINTH + 0.3);
      ctx.fillStyle = inner([60, 34, 20]);
      ctx.fillRect(dxx - 0.5, -0.2, 0.48, PLINTH + 0.2);
      ctx.fillRect(dxx + 0.02, -0.2, 0.48, PLINTH + 0.2);
      ctx.fillStyle = inner([214, 170, 80]);
      for (let i = 0; i < 4; i++) {
        for (const side of [-0.26, 0.26]) {
          ctx.beginPath();
          ctx.arc(dxx + side, 0.2 + i * 0.5, 0.035, 0, TAU);
          ctx.fill();
        }
      }
      // A toran of mango leaves and marigolds over the door.
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const tx = lerp(dxx - 0.6, dxx + 0.6, t);
        const ty = -0.28 + Math.sin(t * Math.PI) * 0.08;
        ctx.fillStyle = shade(i % 2 ? [60, 120, 40] : [240, 140, 20]);
        ctx.beginPath();
        if (i % 2) ctx.ellipse(tx, ty + 0.1, 0.035, 0.1, 0, 0, TAU);
        else ctx.arc(tx, ty + 0.03, 0.06, 0, TAU);
        ctx.fill();
      }
    }
    // Niches with lamps.
    for (const nx of [-4.2, 2.6, 9.3]) {
      ctx.fillStyle = inner([90, 70, 60]);
      ctx.beginPath();
      ctx.moveTo(X + nx - 0.22, 1.0);
      ctx.lineTo(X + nx - 0.22, 0.65);
      ctx.quadraticCurveTo(X + nx, 0.45, X + nx + 0.22, 0.65);
      ctx.lineTo(X + nx + 0.22, 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade([180, 100, 50]);
      ctx.fillRect(X + nx - 0.08, 0.93, 0.16, 0.05);
      ctx.save();
      flame(ctx, X + nx, 0.93, 0.14, seconds, nx);
      ctx.restore();
      lights.push({
        x: X + nx,
        y: 0.85,
        r: 0.6,
        a: 0.35 * flicker(seconds, nx),
        color: LAMP,
      });
    }
    // The plinth of the osari, in dressed stone.
    ctx.fillStyle = shade([150, 136, 118]);
    ctx.fillRect(l, PLINTH, r - l, FLOOR - PLINTH);
    ctx.fillStyle = shade([188, 174, 150]);
    ctx.fillRect(l, PLINTH, r - l, 0.07);
    ctx.strokeStyle = shade([100, 90, 80], 0.5);
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    for (let x = l; x < r; x += 0.9) {
      ctx.moveTo(x, PLINTH + 0.07);
      ctx.lineTo(x, FLOOR);
    }
    ctx.stroke();
    // Steps down into the chowk.
    ctx.fillStyle = shade([170, 156, 134]);
    ctx.fillRect(X - 1.5, FLOOR - 0.3, 1.4, 0.3);
    ctx.fillStyle = shade([196, 182, 158]);
    ctx.fillRect(X - 1.5, FLOOR - 0.3, 1.4, 0.05);

    // The upper storey: a gallery of turned wooden railings and shuttered windows.
    const wall = ctx.createLinearGradient(0, EAVE, 0, BEAM);
    wall.addColorStop(0, shade([200, 180, 150]));
    wall.addColorStop(1, shade([226, 210, 180]));
    ctx.fillStyle = wall;
    ctx.fillRect(l, EAVE, r - l, BEAM - EAVE);
    for (let x = X - 15; x < X + 15; x += 2.2) {
      ctx.fillStyle = shade([92, 56, 32]);
      ctx.fillRect(x, EAVE + 0.5, 1.0, 1.0);
      ctx.fillStyle = shade([40, 26, 20]);
      ctx.fillRect(x + 0.08, EAVE + 0.58, 0.84, 0.84);
      ctx.fillStyle = shade([120, 76, 44]);
      ctx.fillRect(x + 0.08, EAVE + 0.58, 0.34, 0.84);
      ctx.fillRect(x + 0.58, EAVE + 0.58, 0.34, 0.84);
    }
    ctx.fillStyle = shade([96, 58, 34]);
    ctx.fillRect(l, BEAM - 0.62, r - l, 0.06);
    ctx.fillRect(l, BEAM - 0.1, r - l, 0.1);
    ctx.fillStyle = shade([120, 76, 44]);
    for (let x = l; x < r; x += 0.16) ctx.fillRect(x, BEAM - 0.56, 0.06, 0.46);
    // The roof: Mangalore tiles, and the eave's shadow on the wall.
    ctx.fillStyle = shade([168, 74, 44]);
    ctx.beginPath();
    ctx.moveTo(l, EAVE + 0.1);
    ctx.lineTo(l, EAVE - 1.2);
    ctx.lineTo(r, EAVE - 1.2);
    ctx.lineTo(r, EAVE + 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade([120, 46, 28], 0.8);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
      ctx.moveTo(l, EAVE + 0.1 - i * 0.26);
      ctx.lineTo(r, EAVE + 0.1 - i * 0.26);
    }
    for (let x = l; x < r; x += 0.3) {
      ctx.moveTo(x, EAVE + 0.1);
      ctx.lineTo(x, EAVE - 1.2);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(30, 14, 10, 0.25)";
    ctx.fillRect(l, EAVE + 0.1, r - l, 0.3);

    // Teak pillars on stone bases, their brackets carved as lotus buds.
    for (let i = 0; i < 17; i++) {
      const px = X - 15.2 + i * 1.9;
      if (!onScreen(v, px, 0.7, 3)) continue;
      const wood = ctx.createLinearGradient(px - 0.12, 0, px + 0.12, 0);
      wood.addColorStop(0, shade([70, 42, 26]));
      wood.addColorStop(0.5, shade([120, 76, 44]));
      wood.addColorStop(1, shade([60, 36, 22]));
      ctx.fillStyle = wood;
      ctx.fillRect(px - 0.11, BEAM, 0.22, PLINTH - BEAM);
      ctx.fillStyle = shade([160, 148, 128]);
      ctx.beginPath();
      ctx.moveTo(px - 0.2, PLINTH);
      ctx.lineTo(px - 0.2, PLINTH - 0.14);
      ctx.quadraticCurveTo(px - 0.24, PLINTH - 0.3, px - 0.12, PLINTH - 0.38);
      ctx.lineTo(px + 0.12, PLINTH - 0.38);
      ctx.quadraticCurveTo(px + 0.24, PLINTH - 0.3, px + 0.2, PLINTH - 0.14);
      ctx.lineTo(px + 0.2, PLINTH);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade([96, 58, 34]);
      ctx.fillRect(px - 0.16, BEAM + 0.1, 0.32, 0.1);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px + side * 0.11, BEAM + 0.5);
        ctx.quadraticCurveTo(px + side * 0.14, BEAM + 0.14, px + side * 0.55, BEAM + 0.02);
        ctx.lineTo(px + side * 0.55, BEAM + 0.12);
        ctx.quadraticCurveTo(px + side * 0.22, BEAM + 0.2, px + side * 0.11, BEAM + 0.5);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + side * 0.5, BEAM + 0.18, 0.05, 0, TAU);
        ctx.fill();
      }
    }
    // A jhopala, the wooden swing, hung in the osari; Aaji on it in her nauvari.
    const sx = X - 10.6;
    const swing = Math.sin(seconds * 0.9) * 0.18;
    ctx.strokeStyle = shade([60, 50, 44]);
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(sx - 0.7, BEAM);
    ctx.lineTo(sx - 0.7 + swing, 1.5);
    ctx.moveTo(sx + 0.7, BEAM);
    ctx.lineTo(sx + 0.7 + swing, 1.5);
    ctx.stroke();
    drawFigure(
      ctx,
      sx + swing - 0.1,
      1.46,
      {
        h: 1.8,
        skin: SKINS[2],
        top: [40, 30, 36],
        bottom: [52, 26, 40],
        border: [60, 140, 60],
        dress: "sari",
        head: "bun",
        jewel: "nath",
        bindi: true,
      },
      { la: 0.5, lf: 1.1, ra: 0.6, rf: 1.2, sit: true },
      shade,
      1,
    );
    ctx.fillStyle = shade([110, 70, 40]);
    ctx.fillRect(sx - 0.8 + swing, 1.48, 1.6, 0.1);
  }

  private courtyard(w: World, shade: Shade) {
    const { ctx, v, env } = w;
    const bottom = v.y + v.height / 2 / v.scale + 2;
    const g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 5);
    g.addColorStop(0, paint([130, 120, 108], env));
    g.addColorStop(0.2, paint([168, 156, 138], env));
    g.addColorStop(1, paint([140, 128, 112], env));
    ctx.fillStyle = g;
    ctx.fillRect(X - 16, FLOOR, 32, bottom - FLOOR);
    ctx.strokeStyle = shade([96, 88, 80], 0.45);
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    for (const s of this.stones) {
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.w, s.y);
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.h);
    }
    ctx.stroke();
    // The afternoon sun across half the chowk; the osari's shadow on the rest.
    ctx.fillStyle = "rgba(40, 30, 50, 0.18)";
    ctx.beginPath();
    ctx.moveTo(X - 16, FLOOR);
    ctx.lineTo(X + 16, FLOOR);
    ctx.lineTo(X + 16, FLOOR + 0.5);
    ctx.lineTo(X - 16, FLOOR + 1.6);
    ctx.closePath();
    ctx.fill();

    // A rangoli before the tulsi: rings of dots and petals in white, red, yellow and green.
    const rx = TULSI.x;
    const ry = TULSI.y + 1.35;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.scale(1, 0.32);
    const rings: [number, RGB, number][] = [
      [1.35, [246, 242, 232], 32],
      [1.05, [220, 40, 50], 16],
      [0.75, [250, 190, 30], 12],
      [0.45, [40, 150, 70], 8],
    ];
    for (const [rad, c, n] of rings) {
      ctx.fillStyle = shade(c);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * rad, Math.sin(a) * rad, rad * 0.16, rad * 0.07, a, 0, TAU);
        ctx.fill();
      }
    }
    ctx.strokeStyle = shade([246, 242, 232]);
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.arc(0, 0, 1.55, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = shade([246, 242, 232]);
    ctx.beginPath();
    ctx.arc(0, 0, 0.18, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private tulsi(w: World, shade: Shade) {
    const { ctx, v, seconds, lights } = w;
    const { x, y } = TULSI;
    if (!onScreen(v, x, y - 1.5, 3)) return;
    ctx.fillStyle = "rgba(30, 20, 30, 0.25)";
    ctx.beginPath();
    ctx.ellipse(x - 0.4, y + 0.04, 0.9, 0.12, 0, 0, TAU);
    ctx.fill();
    // The vrindavan: a lime-washed pedestal, bordered in geru red, horned at the corners.
    const H = 1.35;
    ctx.fillStyle = shade([240, 232, 214]);
    ctx.fillRect(x - 0.5, y - H, 1.0, H);
    ctx.fillStyle = shade([180, 70, 44]);
    ctx.fillRect(x - 0.5, y - H, 1.0, 0.1);
    ctx.fillRect(x - 0.5, y - 0.12, 1.0, 0.12);
    ctx.fillRect(x - 0.5, y - H, 0.07, H);
    ctx.fillRect(x + 0.43, y - H, 0.07, H);
    ctx.fillStyle = shade([240, 232, 214]);
    ctx.fillRect(x - 0.58, y - H - 0.12, 1.16, 0.14);
    for (const cx of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(x + cx - 0.1, y - H - 0.12);
      ctx.quadraticCurveTo(x + cx, y - H - 0.4, x + cx + 0.1 * Math.sign(cx), y - H - 0.45);
      ctx.lineTo(x + cx + 0.1, y - H - 0.12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = shade([150, 60, 40]);
    ctx.beginPath();
    ctx.moveTo(x - 0.18, y - 0.4);
    ctx.lineTo(x - 0.18, y - 0.72);
    ctx.quadraticCurveTo(x, y - 0.9, x + 0.18, y - 0.72);
    ctx.lineTo(x + 0.18, y - 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade([220, 150, 60]);
    ctx.fillRect(x - 0.08, y - 0.46, 0.16, 0.05);
    flame(ctx, x, y - 0.46, 0.15, seconds, 9);
    lights.push({
      x,
      y: y - 0.55,
      r: 0.6,
      a: 0.35 * flicker(seconds, 9),
      color: LAMP,
    });
    // Haldi-kunku marks on the front, and a swastik in kumkum.
    ctx.fillStyle = shade([240, 190, 30]);
    ctx.beginPath();
    ctx.arc(x - 0.3, y - 1.05, 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade([200, 20, 40]);
    ctx.beginPath();
    ctx.arc(x + 0.3, y - 1.05, 0.05, 0, TAU);
    ctx.fill();
    // The tulsi, bushy, with its purple spikes.
    const top = y - H - 0.12;
    for (const lf of this.leaves) {
      const sway = Math.sin(seconds * 1.1 + lf.a) * 0.02;
      ctx.fillStyle = shade(lf.a > 4 ? [60, 110, 50] : [40, 90, 40]);
      ctx.beginPath();
      ctx.ellipse(x + lf.x + sway, top + lf.y, lf.s, lf.s * 0.55, lf.a, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = shade([120, 70, 110]);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const tx = x - 0.4 + i * 0.13;
      ctx.moveTo(tx, top - 0.5 + Math.abs(i - 3) * 0.08);
      ctx.lineTo(tx + 0.02, top - 0.72 + Math.abs(i - 3) * 0.08);
    }
    ctx.stroke();
    // The sugad on a low wooden paat before her, five pots for the five that are given.
    ctx.fillStyle = shade([120, 76, 44]);
    ctx.fillRect(x - 1.0, y + 0.45, 2.0, 0.1);
    ctx.fillStyle = shade([90, 54, 30]);
    ctx.fillRect(x - 0.95, y + 0.55, 0.08, 0.12);
    ctx.fillRect(x + 0.87, y + 0.55, 0.08, 0.12);
    for (let i = 0; i < 5; i++) drawSugad(ctx, x - 0.76 + i * 0.38, y + 0.45, 0.3, shade);
  }

  private women(w: World, shade: Shade) {
    const { ctx, v, seconds, shadow } = w;
    if (!onScreen(v, X - 3, 4, 8)) return;
    const shadowAt = (x: number, y: number, rx: number) => {
      ctx.fillStyle = "rgba(30, 20, 30, 0.25)";
      ctx.beginPath();
      ctx.ellipse(x + shadow * rx * 0.8, y + 0.03, rx * 1.4, rx * 0.18, 0, 0, TAU);
      ctx.fill();
    };
    const woman = (border: RGB, extra: Partial<Look> = {}): Look => ({
      h: 2.15,
      skin: SKINS[0],
      top: BLACK,
      bottom: BLACK,
      border,
      dress: "sari",
      head: "bun",
      jewel: "nath",
      bindi: true,
      ...extra,
    });
    // The hostess with her tabak of tilgul, and her guest touching kumkum to her forehead.
    const hx = X - 4.8;
    const hy = 5.3;
    const gx = X - 3.85;
    const reach = 0.5 + 0.5 * Math.sin(seconds * 0.8);
    shadowAt(hx, hy, 0.4);
    shadowAt(gx, hy + 0.05, 0.4);
    drawFigure(ctx, hx, hy, woman([200, 150, 40]), { la: 1.25, lf: 1.6, ra: 1.1, rf: 1.5, hold: "tabak" }, shade, 1);
    drawFigure(
      ctx,
      gx,
      hy + 0.05,
      woman([160, 30, 60], { skin: SKINS[3], head: "pallu" }),
      {
        la: 0.2,
        lf: 0.4,
        ra: lerp(1.3, 1.95, reach),
        rf: lerp(1.5, 1.9, reach),
      },
      shade,
      -1,
    );
    // The new bride in a chandrakala, black with silver moons, in her halwa jewellery.
    const bx = X + 1.5;
    const by = 5.55;
    shadowAt(bx, by, 0.4);
    drawFigure(
      ctx,
      bx,
      by,
      woman([220, 190, 90], {
        skin: SKINS[3],
        jewel: "halwa",
        motif: [230, 230, 236],
      }),
      { la: 0.25, lf: 1.0, ra: 0.9, rf: 2.3, hold: "sugad" },
      shade,
      -1,
    );
    // A little girl in a black parkar-polka, with her own sugar crown and necklace.
    const cx = X + 2.7;
    const cy = 5.75;
    shadowAt(cx, cy, 0.25);
    drawFigure(
      ctx,
      cx,
      cy,
      {
        h: 1.25,
        skin: SKINS[0],
        top: BLACK,
        bottom: BLACK,
        border: [230, 180, 40],
        dress: "frock",
        head: "bun",
        jewel: "halwa",
        bindi: true,
      },
      { la: 0.3, lf: 0.6, ra: 0.5 + reach * 0.3, rf: 1.2 },
      shade,
      -1,
    );
    // A guest coming in at the door with her own sugad.
    const ax = X + 5.2;
    shadowAt(ax, 4.6, 0.35);
    drawFigure(ctx, ax, 4.6, woman([40, 120, 70], { skin: SKINS[1], head: "pallu", h: 2.0 }), { la: 0.2, lf: 0.3, ra: 1.0, rf: 1.6, hold: "sugad" }, shade, -1);
  }
}
