import { describe, expect, it } from "vitest";
import { INDUSTRY_RECIPES } from "../design-skins";
import {
  capChartLabel,
  chartLabelStride,
  describeTypography,
  resolveTypography,
  typographyCssVars,
} from "../industry-typography";
import { fillLeading, fillPx } from "../open-space-fill";

describe("per-industry typography constraints", () => {
  it("resolves a constraint for every industry inside the hard guard rails", () => {
    for (const r of INDUSTRY_RECIPES) {
      const t = resolveTypography(r.id);
      expect(t.floorPx.body!).toBeGreaterThanOrEqual(16);
      expect(t.ceilPx.display!).toBeLessThanOrEqual(200);
      expect(t.leading.body!.min).toBeGreaterThanOrEqual(1.2);
      expect(t.leading.body!.max).toBeGreaterThanOrEqual(t.leading.body!.base);
      expect(t.ceilPx.body!).toBeGreaterThan(t.floorPx.body!);
      expect(t.chartLabel.maxPx).toBeGreaterThan(t.chartLabel.minPx);
      expect(t.chartLabel.maxChars).toBeGreaterThanOrEqual(8);
    }
  });

  it("tunes regulated vs consumer registers in opposite directions", () => {
    const pharma = resolveTypography("R09");
    const luxury = resolveTypography("R20");
    expect(pharma.floorPx.body!).toBeGreaterThan(luxury.floorPx.body!);
    expect(luxury.ceilPx.display!).toBeGreaterThan(pharma.ceilPx.display!);
    expect(pharma.leading.body!.base).toBeGreaterThan(luxury.leading.body!.base);
    expect(pharma.chartLabel.maxChars).toBeGreaterThan(luxury.chartLabel.maxChars);
  });

  it("publishes CSS vars the type helpers actually read", () => {
    const vars = typographyCssVars(resolveTypography("R27"));
    expect(vars["--type-floor-body"]).toBe("21px");
    expect(vars["--lead-base-body"]).toBeDefined();
    expect(fillPx(32, "body")).toContain("var(--type-floor-body");
    expect(fillPx(32, "body")).toContain("var(--type-ceil-body");
    expect(fillLeading("body")).toContain("var(--lead-min-body");
  });

  it("caps and thins chart labels per industry", () => {
    const events = resolveTypography("R30");
    expect(capChartLabel("Regulated documentation workflow", events)).toHaveLength(14);
    expect(capChartLabel("Q3", events)).toBe("Q3");
    expect(chartLabelStride(24, events)).toBe(4);
    expect(chartLabelStride(6, resolveTypography("R03"))).toBe(1);
    expect(describeTypography("R09")).toContain("chart labels");
  });
});
