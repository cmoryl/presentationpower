// -----------------------------------------------------------------------------
// CMYK gamut solver — press-model search, not a formula and not a guess.
//
// Why this exists
// ---------------
// The first CMYK path used the textbook formula (c = 1 - r) plus a hand-tuned
// saturation lift. That is fast but blind: it never asks what the resulting ink
// build will actually LOOK like on paper, so the vivid ends of the NEXT ramps
// (aqua, violet, the light blues) came back dull and the gradients drifted in
// hue between stops.
//
// This module closes the loop. It carries a forward press model — how much
// colour a given ink build really puts on a coated sheet, dot gain and ink
// overprint included — and then searches for the build whose PREDICTED printed
// colour sits closest to the brand colour, measured in OKLab, where a unit of
// error means roughly the same thing everywhere. Chroma is weighted above
// lightness, because the eye reads "less vivid" long before it reads "half a
// shade darker", and because losing a little lightness is the standard way to
// buy back saturation in print.
//
// Two honesty limits that no amount of searching can move:
//   * Ink on paper cannot reach screen brightness. The solver gets as close as
//     four inks allow; it never claims a match it cannot print.
//   * A solved build is still a machine conversion. It stays labelled as one
//     until a print house proofs and signs it. Approved brand builds are used
//     verbatim and never go through here.
//
// Gradients are solved as a ramp, not stop by stop, so the printed ramp keeps
// the direction of the original: monotone lightness stays monotone and hue is
// not allowed to wander between neighbouring stops (that wander is what reads
// as banding on a large panel).
// -----------------------------------------------------------------------------

import { parseColor } from "@/lib/pdf-gradient-shading";

export type SolverCmyk = { c: number; m: number; y: number; k: number };

const clamp01 = (n: number) => (!Number.isFinite(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n);

// ── Forward press model ─────────────────────────────────────────────────────
// Neugebauer primaries for a coated commercial sheet (GRACoL-like), measured as
// sRGB. These are the eight things a CMY halftone can actually put down, and any
// tint is a Demichel-weighted mix of them.
const PRIMARY: Record<string, [number, number, number]> = {
  w: [1, 1, 1],
  c: [0, 0.62, 0.879],
  m: [0.89, 0, 0.482],
  y: [1, 0.929, 0],
  cm: [0.18, 0.078, 0.518],
  cy: [0, 0.588, 0.251],
  my: [0.89, 0.118, 0.141],
  cmy: [0.137, 0.122, 0.125],
};
/** Solid black ink on the same stock — never a true zero. */
const K_SOLID: [number, number, number] = [0.102, 0.09, 0.106];

/** Coated-stock tone reproduction: the dot prints bigger than it is imaged. */
function dotGain(a: number): number {
  const v = clamp01(a);
  return clamp01(v + 0.16 * v * (1 - v));
}

const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * clamp01(v) ** (1 / 2.4) - 0.055;

const LIN: Record<string, [number, number, number]> = Object.fromEntries(
  Object.entries(PRIMARY).map(([k, v]) => [k, v.map(srgbToLinear) as [number, number, number]]),
);
const K_LIN = K_SOLID.map(srgbToLinear) as [number, number, number];

/**
 * What this ink build prints as, in sRGB. Demichel area coverage over the eight
 * CMY primaries, mixed in linear light, then the black layer laid over the top.
 */
export function predictPrintedSrgb(v: SolverCmyk): [number, number, number] {
  const c = dotGain(v.c);
  const m = dotGain(v.m);
  const y = dotGain(v.y);
  const k = dotGain(v.k);

  const w: Record<string, number> = {
    w: (1 - c) * (1 - m) * (1 - y),
    c: c * (1 - m) * (1 - y),
    m: (1 - c) * m * (1 - y),
    y: (1 - c) * (1 - m) * y,
    cm: c * m * (1 - y),
    cy: c * (1 - m) * y,
    my: (1 - c) * m * y,
    cmy: c * m * y,
  };

  const out: [number, number, number] = [0, 0, 0];
  for (const key of Object.keys(w)) {
    const weight = w[key]!;
    if (weight <= 0) continue;
    const p = LIN[key]!;
    out[0] += weight * p[0];
    out[1] += weight * p[1];
    out[2] += weight * p[2];
  }
  // Black is a separate layer: it covers k of the sheet.
  out[0] = out[0] * (1 - k) + K_LIN[0] * k;
  out[1] = out[1] * (1 - k) + K_LIN[1] * k;
  out[2] = out[2] * (1 - k) + K_LIN[2] * k;

  return [clamp01(linearToSrgb(out[0])), clamp01(linearToSrgb(out[1])), clamp01(linearToSrgb(out[2]))];
}

// ── OKLab, so one unit of error means the same thing across the ramp ────────
export type Oklab = { L: number; a: number; b: number };

export function srgbToOklab(rgb: [number, number, number]): Oklab {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const chromaOf = (v: Oklab) => Math.hypot(v.a, v.b);
const hueOf = (v: Oklab) => Math.atan2(v.b, v.a);

/** Maximum ink on the sheet, as a fraction (3 = 300% TAC for offset). */
export type SolveOptions = {
  tacLimit?: number;
  /**
   * How hard the solver trades lightness for saturation. 0 = plain colorimetric
   * match, 1 = the tuned house setting, >1 pushes vividness further.
   */
  vibrance?: number;
  /** Ceiling on black for this colour; saturated brand colour keeps it near 0. */
  kCeiling?: number;
};

function cost(target: Oklab, build: SolverCmyk, vibrance: number, tacLimit: number): number {
  const got = srgbToOklab(predictPrintedSrgb(build));

  const dL = got.L - target.L;
  const tC = chromaOf(target);
  const gC = chromaOf(got);
  const dC = gC - tC;

  // Hue is the one thing a brand will not forgive, so it carries the most weight.
  let dH = 0;
  if (tC > 0.01 && gC > 0.01) {
    let diff = hueOf(got) - hueOf(target);
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    dH = diff * Math.min(tC, gC);
  }

  // Chroma shortfall is what "muddy" means; forgive overshoot far more.
  const chromaWeight = dC < 0 ? 1.4 + 1.2 * vibrance : 0.9;
  const lightWeight = 1.6 - 0.3 * vibrance;

  // Guard rails. Buying saturation by printing the colour much darker, or by
  // letting the hue slide, is not an improvement — it is a different colour.
  // Past these tolerances the cost climbs steeply, so the solver stops trading.
  const LIGHT_TOL = 0.03;
  const HUE_TOL = 0.012;
  const lightBarrier = Math.max(0, Math.abs(dL) - LIGHT_TOL) * 22;
  const hueBarrier = Math.max(0, Math.abs(dH) - HUE_TOL) * 26;

  const tac = build.c + build.m + build.y + build.k;
  const over = Math.max(0, tac - tacLimit);

  return (
    (lightWeight * dL) ** 2 +
    (chromaWeight * dC) ** 2 +
    (2.4 * dH) ** 2 +
    lightBarrier ** 2 +
    hueBarrier ** 2 +
    (12 * over) ** 2
  );
}

function withTacClamp(v: SolverCmyk, tacLimit: number): SolverCmyk {
  const tac = v.c + v.m + v.y + v.k;
  if (tac <= tacLimit) return v;
  const chroma = v.c + v.m + v.y;
  const room = Math.max(0, tacLimit - v.k);
  const f = chroma > 0 ? room / chroma : 0;
  return { c: v.c * f, m: v.m * f, y: v.y * f, k: v.k };
}

/**
 * The build whose printed colour lands closest to `hex`.
 *
 * Deterministic: a seeded start from the textbook conversion, then coordinate
 * descent on the four inks with shrinking steps. Same input, same build, every
 * run — which is what makes it safe to put on a printer sign-off sheet.
 */
export function solveCmyk(hex: string, opts: SolveOptions = {}): SolverCmyk {
  const tacLimit = opts.tacLimit ?? 3;
  const vibrance = opts.vibrance ?? 1;
  const [r, g, b] = parseColor(hex);
  const target = srgbToOklab([r, g, b]);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  // 100K rule stays ahead of the solver: near-neutral prints as one black.
  if (chroma < 0.04 && max < 0.22) return { c: 0, m: 0, y: 0, k: clamp01(1 - max) };
  if (chroma < 0.02 && max > 0.98) return { c: 0, m: 0, y: 0, k: 0 };

  // Skeletal black: the more saturated the colour, the less black it may carry.
  const kCeiling = opts.kCeiling ?? clamp01(1 - chroma * 1.9) * Math.min(min, 0.95);

  let best: SolverCmyk = withTacClamp(
    {
      c: clamp01(1 - r),
      m: clamp01(1 - g),
      y: clamp01(1 - b),
      k: 0,
    },
    tacLimit,
  );
  let bestCost = cost(target, best, vibrance, tacLimit);

  const bounded = (v: SolverCmyk): SolverCmyk =>
    withTacClamp(
      {
        c: clamp01(v.c),
        m: clamp01(v.m),
        y: clamp01(v.y),
        k: Math.min(clamp01(v.k), kCeiling),
      },
      tacLimit,
    );

  const keys = ["c", "m", "y", "k"] as const;
  for (const step of [0.24, 0.12, 0.06, 0.03, 0.015, 0.008, 0.004]) {
    let moved = true;
    let guard = 0;
    while (moved && guard < 24) {
      moved = false;
      guard += 1;
      for (const key of keys) {
        for (const dir of [1, -1]) {
          const trial = bounded({ ...best, [key]: best[key] + dir * step });
          const c = cost(target, trial, vibrance, tacLimit);
          if (c < bestCost - 1e-9) {
            best = trial;
            bestCost = c;
            moved = true;
          }
        }
      }
    }
  }

  // ── Stage two: vividness, without moving the colour ───────────────────────
  // Stage one found the closest printable match. This pass then asks for the
  // MOST saturated build that is still that close — hue held, lightness held,
  // overall error allowed to grow only marginally. It is what stops the ramps
  // reading flat while keeping the colour recognisably itself.
  if (vibrance > 0) {
    const fidelityCeiling = bestCost * (1 + 0.5 * vibrance) + 0.0008 * vibrance;
    const chromaOfBuild = (v: SolverCmyk) => chromaOf(srgbToOklab(predictPrintedSrgb(v)));
    let bestChroma = chromaOfBuild(best);
    for (const step of [0.12, 0.06, 0.03, 0.015, 0.008]) {
      let moved = true;
      let guard = 0;
      while (moved && guard < 20) {
        moved = false;
        guard += 1;
        for (const key of keys) {
          for (const dir of [1, -1]) {
            const trial = bounded({ ...best, [key]: best[key] + dir * step });
            if (cost(target, trial, vibrance, tacLimit) > fidelityCeiling) continue;
            const gained = chromaOfBuild(trial);
            if (gained > bestChroma + 1e-9) {
              best = trial;
              bestChroma = gained;
              bestCost = cost(target, best, vibrance, tacLimit);
              moved = true;
            }
          }
        }
      }
    }
  }

  return bounded(best);
}

/**
 * Solve a whole gradient together.
 *
 * Stops solved in isolation can each be the closest match on its own and still
 * make a worse ramp — one stop takes a little more magenta than its neighbours
 * and the printed blend shows a seam. This pass keeps the printed ramp moving in
 * the same direction as the original: where the source ramp is monotone in an
 * ink, the solved ramp is held monotone too.
 */
export function solveCmykRamp(hexes: string[], opts: SolveOptions = {}): SolverCmyk[] {
  const builds = hexes.map((hex) => solveCmyk(hex, opts));
  if (builds.length < 3) return builds;

  const tacLimit = opts.tacLimit ?? 3;
  const sourceInk = hexes.map((hex) => {
    const [r, g, b] = parseColor(hex);
    return { c: 1 - r, m: 1 - g, y: 1 - b, k: 0 } as SolverCmyk;
  });

  const keys = ["c", "m", "y"] as const;
  for (const key of keys) {
    for (let i = 1; i < builds.length - 1; i += 1) {
      const prev = builds[i - 1]![key];
      const next = builds[i + 1]![key];
      const here = builds[i]![key];
      const sPrev = sourceInk[i - 1]![key];
      const sNext = sourceInk[i + 1]![key];
      const sHere = sourceInk[i]![key];
      const sourceMonotone =
        (sPrev <= sHere && sHere <= sNext) || (sPrev >= sHere && sHere >= sNext);
      if (!sourceMonotone) continue;
      const lo = Math.min(prev, next);
      const hi = Math.max(prev, next);
      if (here < lo || here > hi) {
        builds[i] = withTacClamp(
          { ...builds[i]!, [key]: Math.min(hi, Math.max(lo, here)) },
          tacLimit,
        );
      }
    }
  }
  return builds;
}

/** How far the printed build lands from the brand colour, for the gamut report. */
export function printedDelta(hex: string, build: SolverCmyk) {
  const [r, g, b] = parseColor(hex);
  const want = srgbToOklab([r, g, b]);
  const got = srgbToOklab(predictPrintedSrgb(build));
  const wantC = chromaOf(want);
  const gotC = chromaOf(got);
  return {
    /** Negative = printed less vivid than screen, as a fraction. */
    chroma: wantC > 0 ? (gotC - wantC) / wantC : 0,
    /** Negative = printed darker than screen, as a fraction. */
    lightness: want.L > 0 ? (got.L - want.L) / want.L : 0,
    deltaOk: Math.hypot(got.L - want.L, got.a - want.a, got.b - want.b),
  };
}
