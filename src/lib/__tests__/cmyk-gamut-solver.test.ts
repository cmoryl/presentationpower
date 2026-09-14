// The print-colour solver's contract. These are the rules a printer relies on,
// so they are locked here rather than left to tuning.
import { describe, expect, it } from "vitest";

import {
  predictPrintedSrgb,
  printedDelta,
  solveCmyk,
  solveCmykRamp,
  srgbToOklab,
} from "@/lib/cmyk-gamut-solver";
import { CMYK_TAC_LIMIT, londonCmykBuild, londonCmykRamp } from "@/lib/next-london-cmyk";
import { parseColor } from "@/lib/pdf-gradient-shading";

/** The old formula-only conversion, as the baseline the solver has to beat. */
function formulaOnly(input: string) {
  let [r, g, b] = parseColor(input);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const sat = chroma / (max || 1);
  const mid = (max + min) / 2;
  const sc = (v: number) => Math.max(0, Math.min(1, mid + (v - mid) * (1 + 0.1 * (1 - sat))));
  r = sc(r);
  g = sc(g);
  b = sc(b);
  const c0 = 1 - r;
  const m0 = 1 - g;
  const y0 = 1 - b;
  const cn = Math.max(r, g, b) - Math.min(r, g, b);
  const k = Math.min(c0, m0, y0) * Math.max(0, 1 - cn * 1.8);
  const d = 1 - k;
  return d <= 1e-4
    ? { c: 0, m: 0, y: 0, k: 1 }
    : { c: (c0 - k) / d, m: (m0 - k) / d, y: (y0 - k) / d, k };
}

/** The NEXT ramp colours the formula flattened worst. */
const RAMP_COLOURS = [
  "#9A70F8",
  "#B4B0FB",
  "#8BC6EA",
  "#7C4EF4",
  "#8FA6FF",
  "#D9CDFB",
  "#D0C2F9",
  "#E2E2FC",
  "#7BCD3A",
];

const chromaOf = (hex: string) => {
  const lab = srgbToOklab(parseColor(hex) as [number, number, number]);
  return Math.hypot(lab.a, lab.b);
};

describe("cmyk gamut solver", () => {
  it("prints these colours more vividly than the formula, on average", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const before = mean(RAMP_COLOURS.map((h) => printedDelta(h, formulaOnly(h)).chroma));
    const after = mean(RAMP_COLOURS.map((h) => printedDelta(h, solveCmyk(h)).chroma));
    // Both are negative (ink cannot reach screen); the solver must lose less.
    expect(after).toBeGreaterThan(before + 0.05);
  });

  it("gets closer to the brand colour overall, not just more saturated", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const before = mean(RAMP_COLOURS.map((h) => printedDelta(h, formulaOnly(h)).deltaOk));
    const after = mean(RAMP_COLOURS.map((h) => printedDelta(h, solveCmyk(h)).deltaOk));
    expect(after).toBeLessThan(before);
  });

  it("never buys saturation by shifting hue or crushing lightness", () => {
    for (const hex of RAMP_COLOURS) {
      const d = printedDelta(hex, solveCmyk(hex));
      expect(Math.abs(d.lightness)).toBeLessThan(0.18);
      const want = srgbToOklab(parseColor(hex) as [number, number, number]);
      const got = srgbToOklab(predictPrintedSrgb(solveCmyk(hex)));
      const hue = (v: { a: number; b: number }) => Math.atan2(v.b, v.a);
      let diff = hue(got) - hue(want);
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      expect(Math.abs(diff)).toBeLessThan(0.25);
    }
  });

  it("holds the offset ink limit and keeps black off saturated colour", () => {
    for (const hex of [...RAMP_COLOURS, "#A1FBF9", "#EC388A", "#123456", "#7BCD3A"]) {
      const b = solveCmyk(hex);
      expect(b.c + b.m + b.y + b.k).toBeLessThanOrEqual(CMYK_TAC_LIMIT + 1e-6);
      if (chromaOf(hex) > 0.12) expect(b.k).toBeLessThan(0.12);
    }
    // Near-neutral dark still prints as one black, never a four-colour build.
    const black = solveCmyk("#0A0A0A");
    expect(black.c + black.m + black.y).toBe(0);
    expect(black.k).toBeGreaterThan(0.9);
  });

  it("is deterministic, so a signed-off build never drifts", () => {
    for (const hex of RAMP_COLOURS) {
      expect(solveCmyk(hex)).toEqual(solveCmyk(hex));
    }
  });

  it("solves a gradient as one ramp so it cannot seam between stops", () => {
    const ramp = solveCmykRamp(["#9A70F8", "#B4B0FB", "#8BC6EA"]);
    expect(ramp).toHaveLength(3);
    for (const key of ["c", "m", "y"] as const) {
      const mid = ramp[1]![key];
      const lo = Math.min(ramp[0]![key], ramp[2]![key]);
      const hi = Math.max(ramp[0]![key], ramp[2]![key]);
      // Source ramp is monotone in every chromatic ink, so the solved one is too.
      expect(mid).toBeGreaterThanOrEqual(lo - 1e-6);
      expect(mid).toBeLessThanOrEqual(hi + 1e-6);
    }
  });

  it("still hands approved brand builds through untouched", () => {
    const approved = londonCmykBuild("#003FC7");
    expect(approved.approved).toBe(true);
    expect(Math.round(approved.c * 100)).toBe(100);
    expect(Math.round(approved.m * 100)).toBe(83);

    const ramp = londonCmykRamp(["#003FC7", "#9A70F8", "#FFFFFF"]);
    expect(ramp[0]!.approved).toBe(true);
    expect(ramp[2]!.approved).toBe(true);
    expect(ramp[1]!.approved).toBe(false);
  });

  it("reports the honest loss rather than claiming a match", () => {
    for (const hex of RAMP_COLOURS) {
      // Ink cannot reach screen brightness: the report must never say it did.
      expect(printedDelta(hex, solveCmyk(hex)).chroma).toBeLessThan(0.5);
    }
  });
});
