// A sikku kolam, worked out the way it is drawn: a grid of dots (pulli), and one line of rice flour
// that loops round every dot without touching any, crossing itself between them.
//
// It is a mirror curve. Each dot sits in its own square cell; the line runs on the diagonals from
// the middle of one cell side to the next, round the dot, and straight on through the middle of a
// shared side into the next cell, unless that side holds a "mirror", where it turns back round its
// own dot. The edge of the grid is a mirror all the way round. Where the mirrors are decides how
// many separate lines there are; the scene looks for a symmetric set that gives just one.
//
// Coordinates are doubled so that everything is an integer: dots at even (X, Y); the middles of
// the sides between them have one odd coordinate.
import { mulberry32 } from "@/lib/math";

export type Piece =
  | {
      kind: "line";
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      length: number;
    }
  | {
      kind: "arc";
      cx: number;
      cy: number;
      r: number;
      a0: number;
      a1: number;
      length: number;
    };

export type Loop = { pieces: Piece[]; length: number };

export type Kolam = {
  /** Dots, in dot units (the spacing between dots is 1). */
  dots: { x: number; y: number }[];
  /** Mirror side-middles, in doubled coordinates, as "X,Y". */
  mirrors: Set<string>;
  loops: Loop[];
  length: number;
  radius: number;
};

const key = (x: number, y: number) => `${x},${y}`;
const R = Math.SQRT1_2 / 2;

/** The dots of a diamond, rows of 1, 3, 5 ... 5, 3, 1, `size` from the middle to the tip. */
export function diamond(size: number) {
  const cells = new Set<string>();
  for (let i = -size; i <= size; i++)
    for (let j = -size; j <= size; j++)
      if (Math.abs(i) + Math.abs(j) <= size) cells.add(key(i, j));
  return cells;
}

/** The side-middles between two dots of `cells`, grouped into sets that turn into each other a quarter turn at a time. */
function orbits(cells: Set<string>, mirrored = false) {
  const seen = new Set<string>();
  const groups: [number, number][][] = [];
  for (const c of cells) {
    const [i, j] = c.split(",").map(Number);
    for (const [di, dj] of [
      [1, 0],
      [0, 1],
    ]) {
      if (!cells.has(key(i + di, j + dj))) continue;
      const X = 2 * i + di;
      const Y = 2 * j + dj;
      if (seen.has(key(X, Y))) continue;
      // A quarter turn (and if `mirrored`, a reflection across the diagonal), so the kolam is the same four (or eight) ways.
      const group: [number, number][] = [];
      let x = X;
      let y = Y;
      for (let r = 0; r < 4; r++) {
        for (const [a, b] of mirrored
          ? [
              [x, y],
              [y, x],
            ]
          : [[x, y]]) {
          if (!seen.has(key(a, b))) {
            seen.add(key(a, b));
            group.push([a, b]);
          }
        }
        [x, y] = [-y, x];
      }
      groups.push(group);
    }
  }
  return groups;
}

/** Follows the line from side-middle to side-middle until every stretch of it has been drawn. */
export function trace(cells: Set<string>, mirrors: Set<string>): Loop[] {
  const inside = (i: number, j: number) => cells.has(key(i, j));
  const turns = (X: number, Y: number) => {
    if (mirrors.has(key(X, Y))) return true;
    // A side on the edge of the grid.
    if (X % 2 !== 0)
      return !inside((X - 1) / 2, Y / 2) || !inside((X + 1) / 2, Y / 2);
    return !inside(X / 2, (Y - 1) / 2) || !inside(X / 2, (Y + 1) / 2);
  };
  const done = new Set<string>();
  const loops: Loop[] = [];
  const starts: [number, number, number, number][] = [];
  for (const c of cells) {
    const [i, j] = c.split(",").map(Number);
    // Each cell's four stretches, from its west side-middle and its east one.
    starts.push(
      [2 * i - 1, 2 * j, 1, -1],
      [2 * i - 1, 2 * j, 1, 1],
      [2 * i + 1, 2 * j, -1, -1],
      [2 * i + 1, 2 * j, -1, 1],
    );
  }
  starts.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [sx, sy, sdx, sdy] of starts) {
    if (done.has(key(2 * sx + sdx, 2 * sy + sdy))) continue;
    const points: {
      x: number;
      y: number;
      turn: boolean;
      cx: number;
      cy: number;
    }[] = [];
    let X = sx;
    let Y = sy;
    let dx = sdx;
    let dy = sdy;
    let guard = 0;
    while (guard++ < 20000) {
      done.add(key(2 * X + dx, 2 * Y + dy));
      const nx = X + dx;
      const ny = Y + dy;
      // The dot of the cell this stretch runs through.
      const cx = X % 2 !== 0 ? nx : X;
      const cy = X % 2 !== 0 ? Y : ny;
      let turn = false;
      if (turns(nx, ny)) {
        turn = true;
        if (nx % 2 !== 0) dx = -dx;
        else dy = -dy;
      }
      points.push({ x: nx, y: ny, turn, cx, cy });
      X = nx;
      Y = ny;
      if (X === sx && Y === sy && dx === sdx && dy === sdy) break;
    }
    loops.push(toPieces(points));
  }
  return loops;
}

/**
 * Turns the side-middles a loop passes into pieces to draw: a straight run through each crossing
 * and a quarter circle round the dot at each turn, each from the middle of one stretch to the next.
 */
function toPieces(
  points: { x: number; y: number; turn: boolean; cx: number; cy: number }[],
): Loop {
  const n = points.length;
  const pieces: Piece[] = [];
  let length = 0;
  for (let k = 0; k < n; k++) {
    const prev = points[(k - 1 + n) % n];
    const here = points[k];
    const next = points[(k + 1) % n];
    const ax = (prev.x + here.x) / 4;
    const ay = (prev.y + here.y) / 4;
    const bx = (here.x + next.x) / 4;
    const by = (here.y + next.y) / 4;
    if (!here.turn) {
      const l = Math.hypot(bx - ax, by - ay);
      pieces.push({ kind: "line", x0: ax, y0: ay, x1: bx, y1: by, length: l });
      length += l;
    } else {
      const cx = here.cx / 2;
      const cy = here.cy / 2;
      const a0 = Math.atan2(ay - cy, ax - cx);
      let a1 = Math.atan2(by - cy, bx - cx);
      // The short way round: always a quarter turn.
      while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
      while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
      const l = Math.abs(a1 - a0) * R;
      pieces.push({ kind: "arc", cx, cy, r: R, a0, a1, length: l });
      length += l;
    }
  }
  return { pieces, length };
}

/** Looks for a set of mirrors, the same all eight ways round, that makes the whole kolam one line. */
export function makeKolam(size: number, seed: number, density = 0.42): Kolam {
  const cells = diamond(size);
  const groups = orbits(cells);
  const random = mulberry32(seed);
  // Of the sets that make one line, the one with nearest `density` of the sides turned.
  const target = density * groups.length;
  let best: { mirrors: Set<string>; loops: Loop[]; score: number } | null =
    null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const mirrors = new Set<string>();
    let turned = 0;
    for (const g of groups) {
      if (random() >= density) continue;
      turned++;
      for (const [x, y] of g) mirrors.add(key(x, y));
    }
    const loops = trace(cells, mirrors);
    const score = loops.length * 100 + Math.abs(turned - target);
    if (!best || score < best.score) best = { mirrors, loops, score };
    if (score < 100.5) break;
  }
  const dots = [...cells].map((c) => {
    const [x, y] = c.split(",").map(Number);
    return { x, y };
  });
  // Nearest the middle first, the way the pulli are set out.
  dots.sort(
    (a, b) =>
      Math.abs(a.x) + Math.abs(a.y) - (Math.abs(b.x) + Math.abs(b.y)) ||
      Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x),
  );
  const loops = best!.loops;
  return {
    dots,
    mirrors: best!.mirrors,
    loops,
    length: loops.reduce((s, l) => s + l.length, 0),
    radius: size + 0.5,
  };
}

/** Moves the mirrors at the side-middle nearest (x, y) (in dot units), all eight ways round; returns where they are. */
export function twist(kolam: Kolam, size: number, x: number, y: number) {
  const cells = diamond(size);
  const X = Math.round(x * 2);
  const Y = Math.round(y * 2);
  // Only a side-middle between two dots, with exactly one odd coordinate.
  let bx = X;
  let by = Y;
  if ((X + Y) % 2 === 0) {
    const fx = x * 2 - X;
    const fy = y * 2 - Y;
    if (Math.abs(fx) > Math.abs(fy)) bx += Math.sign(fx) || 1;
    else by += Math.sign(fy) || 1;
  }
  const between =
    bx % 2 !== 0
      ? cells.has(key((bx - 1) / 2, by / 2)) &&
        cells.has(key((bx + 1) / 2, by / 2))
      : cells.has(key(bx / 2, (by - 1) / 2)) &&
        cells.has(key(bx / 2, (by + 1) / 2));
  if (!between) return null;
  const group = orbits(cells).find((g) =>
    g.some(([a, b]) => a === bx && b === by),
  );
  if (!group) return null;
  const on = kolam.mirrors.has(key(bx, by));
  for (const [a, b] of group) {
    if (on) kolam.mirrors.delete(key(a, b));
    else kolam.mirrors.add(key(a, b));
  }
  kolam.loops = trace(cells, kolam.mirrors);
  kolam.length = kolam.loops.reduce((s, l) => s + l.length, 0);
  return group.map(([a, b]) => ({ x: a / 2, y: b / 2 }));
}

type Path = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(
    x: number,
    y: number,
    r: number,
    a0: number,
    a1: number,
    ccw?: boolean,
  ): void;
};

/**
 * Adds the first `drawn` (0..kolam.length) of the line to `path`, in dot units; returns where the
 * line has got to, the hand's place.
 */
export function strokeKolam(path: Path, kolam: Kolam, drawn: number) {
  let left = drawn;
  let tip = { x: 0, y: 0 };
  for (const loop of kolam.loops) {
    if (left <= 0) break;
    let first = true;
    for (const piece of loop.pieces) {
      if (left <= 0) break;
      const t = Math.min(1, left / piece.length);
      left -= piece.length;
      if (piece.kind === "line") {
        if (first) path.moveTo(piece.x0, piece.y0);
        tip = {
          x: piece.x0 + (piece.x1 - piece.x0) * t,
          y: piece.y0 + (piece.y1 - piece.y0) * t,
        };
        path.lineTo(tip.x, tip.y);
      } else {
        const a = piece.a0 + (piece.a1 - piece.a0) * t;
        if (first)
          path.moveTo(
            piece.cx + Math.cos(piece.a0) * piece.r,
            piece.cy + Math.sin(piece.a0) * piece.r,
          );
        path.arc(piece.cx, piece.cy, piece.r, piece.a0, a, piece.a1 < piece.a0);
        tip = {
          x: piece.cx + Math.cos(a) * piece.r,
          y: piece.cy + Math.sin(a) * piece.r,
        };
      }
      first = false;
    }
  }
  return tip;
}
