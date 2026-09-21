import { describe, expect, it } from "vitest";
import {
  REFIT_FLOOR_PX,
  REFIT_MIN_LEADING,
  expansionRisk,
  expectedExpansion,
  overflowRatio,
  refitPlan,
} from "@/lib/text-refit";

describe("refitPlan", () => {
  it("leaves copy that fits untouched", () => {
    const plan = refitPlan({ fontPx: 48, lineHeight: 1.2, overflowRatio: 1 });
    expect(plan.scale).toBe(1);
    expect(plan.fontPx).toBe(48);
    expect(plan.letterSpacingEm).toBe(0);
    expect(plan.clipped).toBe(false);
  });

  it("shrinks overflowing copy and tightens leading inside the band", () => {
    const plan = refitPlan({ fontPx: 60, lineHeight: 1.3, overflowRatio: 1.44 });
    expect(plan.fontPx).toBeLessThan(60);
    expect(plan.fontPx).toBeGreaterThan(40);
    expect(plan.lineHeight!).toBeLessThan(1.3);
    expect(plan.lineHeight!).toBeGreaterThanOrEqual(REFIT_MIN_LEADING);
    expect(plan.letterSpacingEm).toBeLessThanOrEqual(0);
    expect(plan.clipped).toBe(false);
  });

  it("never goes below the legibility floor and reports honest overflow", () => {
    const plan = refitPlan({ fontPx: 12, overflowRatio: 4, minScale: 0.3 });
    expect(plan.fontPx).toBeGreaterThanOrEqual(REFIT_FLOOR_PX);
    expect(plan.clipped).toBe(true);
  });

  it("never shrinks past the surface minimum scale", () => {
    const plan = refitPlan({ fontPx: 100, overflowRatio: 9, minScale: 0.7 });
    expect(plan.scale).toBeGreaterThanOrEqual(0.69);
    expect(plan.clipped).toBe(true);
  });
});

describe("language expansion", () => {
  it("knows the long languages", () => {
    expect(expectedExpansion("de")).toBeGreaterThan(1.3);
    expect(expectedExpansion("fr-FR")).toBeCloseTo(1.25);
    expect(expectedExpansion("es")).toBeCloseTo(1.25);
    expect(expectedExpansion("ja")).toBeLessThan(1);
    expect(expectedExpansion(null)).toBe(1);
  });

  it("flags copy that will run past its cap once translated", () => {
    const risk = expansionRisk("A ninety character English headline about localisation", "de", 60);
    expect(risk.expandedChars).toBeGreaterThan(risk.chars);
    expect(risk.overCap).toBe(true);
    expect(expansionRisk("Short line", "de", 60).overCap).toBe(false);
  });
});

describe("overflowRatio", () => {
  it("returns 1 when the copy fits", () => {
    expect(overflowRatio({ contentW: 100, contentH: 40, boxW: 200, boxH: 80 })).toBe(1);
  });

  it("measures the worst axis", () => {
    expect(overflowRatio({ contentW: 100, contentH: 160, boxW: 200, boxH: 80 })).toBeGreaterThan(1.9);
    expect(
      overflowRatio({ contentW: 400, contentH: 40, boxW: 200, boxH: 80, wraps: false }),
    ).toBeGreaterThan(1.9);
  });
});
