// Perspective mounting for in-situ scene plates.
//
// A contain-fitted axis-aligned rectangle is the single biggest reason a print
// reads as "pasted on": the photographed surface recedes, but the artwork does
// not. Every plate whose surface is seen at an angle (a floor graphic on
// carpet, a wall run receding down a foyer, a stage fascia, a table top) now
// carries a measured QUAD — the four corners of the printed face as they appear
// in the photograph — and the artwork is warped onto it with a real projective
// transform, so its horizon matches the room's.
//
// Nothing here changes print geometry: the artwork box is still cut at the
// item's true trim ratio inside the measured face. This module only maps that
// face-space rectangle onto the photographed surface.

export interface ScenePoint {
  x: number;
  y: number;
}

/** Face corners in plate fractions, clockwise from top-left. */
export type SceneQuad = readonly [ScenePoint, ScenePoint, ScenePoint, ScenePoint];

export interface QuadRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The identity quad of a face rectangle (no perspective). */
export function quadFromRect(rect: QuadRect): SceneQuad {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ];
}

/** Bounding rectangle of a quad, in the same units. */
export function quadBounds(quad: SceneQuad): QuadRect {
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * How far a quad departs from its own bounding rectangle, as a fraction of the
 * bounding box. Below ~0.4% the warp is invisible and we skip it, so a frontal
 * wall keeps a pixel-exact, unresampled print.
 */
export function quadSkew(quad: SceneQuad): number {
  const b = quadBounds(quad);
  if (!(b.w > 0) || !(b.h > 0)) return 0;
  const rect = quadFromRect(b);
  let worst = 0;
  for (let i = 0; i < 4; i += 1) {
    worst = Math.max(
      worst,
      Math.abs(quad[i]!.x - rect[i]!.x) / b.w,
      Math.abs(quad[i]!.y - rect[i]!.y) / b.h,
    );
  }
  return worst;
}

export const QUAD_SKEW_FLOOR = 0.004;

export function isQuadSkewed(quad: SceneQuad | undefined): boolean {
  return !!quad && quadSkew(quad) > QUAD_SKEW_FLOOR;
}

/**
 * Express a plate-space quad in the local coordinates of a face rectangle,
 * scaled to a rendered pixel size. The returned points are what the transform
 * has to hit.
 */
export function quadInFaceSpace(
  quad: SceneQuad,
  face: QuadRect,
  size: { w: number; h: number },
): SceneQuad {
  const fw = face.w || 1;
  const fh = face.h || 1;
  return quad.map((p) => ({
    x: ((p.x - face.x) / fw) * size.w,
    y: ((p.y - face.y) / fh) * size.h,
  })) as unknown as SceneQuad;
}

/** Solve a dense linear system by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(m[pivot]![col]!) < 1e-12) return null;
    if (pivot !== col) {
      const tmp = m[pivot]!;
      m[pivot] = m[col]!;
      m[col] = tmp;
    }
    const p = m[col]!;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const row = m[r]!;
      const f = row[col]! / p[col]!;
      if (f === 0) continue;
      for (let c = col; c <= n; c += 1) row[c] = row[c]! - f * p[c]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

export interface Homography {
  /** x' = (a·x + b·y + c) / (g·x + h·y + 1) */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
}

/**
 * Projective transform mapping the pixel rectangle (0,0)-(w,h) onto `target`
 * (clockwise from top-left, same pixel space).
 */
export function rectToQuadHomography(
  size: { w: number; h: number },
  target: SceneQuad,
): Homography | null {
  const w = size.w;
  const h = size.h;
  if (!(w > 0) || !(h > 0)) return null;
  const src: ScenePoint[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const rows: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const s = src[i]!;
    const t = target[i]!;
    rows.push([s.x, s.y, 1, 0, 0, 0, -s.x * t.x, -s.y * t.x]);
    rhs.push(t.x);
    rows.push([0, 0, 0, s.x, s.y, 1, -s.x * t.y, -s.y * t.y]);
    rhs.push(t.y);
  }
  const sol = solve(rows, rhs);
  if (!sol || sol.some((v) => !Number.isFinite(v))) return null;
  const [a, b, c, d, e, f, g, hh] = sol as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return { a, b, c, d, e, f, g, h: hh };
}

/** Apply a homography to a point. */
export function applyHomography(m: Homography, p: ScenePoint): ScenePoint {
  const denom = m.g * p.x + m.h * p.y + 1;
  return {
    x: (m.a * p.x + m.b * p.y + m.c) / denom,
    y: (m.d * p.x + m.e * p.y + m.f) / denom,
  };
}

/** CSS `matrix3d(...)` (column-major) for a homography. */
export function homographyToMatrix3d(m: Homography): string {
  const v = [
    m.a, m.d, 0, m.g,
    m.b, m.e, 0, m.h,
    0, 0, 1, 0,
    m.c, m.f, 0, 1,
  ];
  return `matrix3d(${v.map((n) => Number(n.toFixed(6))).join(",")})`;
}

/**
 * Ready-to-use CSS transform for warping a rendered face box onto a measured
 * quad, or null when the surface is frontal (or the quad is degenerate) and the
 * print should stay unresampled.
 */
export function faceQuadTransform(
  quad: SceneQuad | undefined,
  face: QuadRect,
  size: { w: number; h: number },
): string | null {
  if (!isQuadSkewed(quad) || !(size.w > 0) || !(size.h > 0)) return null;
  const local = quadInFaceSpace(quad!, face, size);
  const m = rectToQuadHomography(size, local);
  return m ? homographyToMatrix3d(m) : null;
}

/**
 * Mean foreshortening of a quad against its bounding box — 1 = frontal. Used to
 * decide how much surface texture and how strong a contact shadow the print
 * needs: a heavily raked surface takes more.
 */
export function quadForeshortening(quad: SceneQuad): number {
  const b = quadBounds(quad);
  if (!(b.w > 0) || !(b.h > 0)) return 1;
  const top = Math.hypot(quad[1]!.x - quad[0]!.x, quad[1]!.y - quad[0]!.y);
  const bottom = Math.hypot(quad[2]!.x - quad[3]!.x, quad[2]!.y - quad[3]!.y);
  const left = Math.hypot(quad[3]!.x - quad[0]!.x, quad[3]!.y - quad[0]!.y);
  const right = Math.hypot(quad[2]!.x - quad[1]!.x, quad[2]!.y - quad[1]!.y);
  const hRatio = top > 0 && bottom > 0 ? Math.min(top, bottom) / Math.max(top, bottom) : 1;
  const vRatio = left > 0 && right > 0 ? Math.min(left, right) / Math.max(left, right) : 1;
  return Math.min(hRatio, vRatio);
}
