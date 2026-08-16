import { describe, expect, it } from "vitest";
import {
  clampTemplateType,
  mergeTemplateOverride,
  resolveSlideTemplate,
  TEMPLATE_TYPE_RANGE,
} from "../section-templates";

const slide = (over?: Record<string, unknown>) => ({
  sectionId: "challenge",
  variantId: "BENTO-5",
  content: { title: "Why global launches slip" },
  ...over,
});

describe("resolveSlideTemplate", () => {
  it("falls back to the library default with no override", () => {
    const t = resolveSlideTemplate({ slide: slide(), industryId: "R01" });
    expect(t.overridden).toEqual([]);
    expect(t.level).toBe(t.defaults.level);
    expect(t.scene).toBe(t.defaults.scene);
    expect(t.typeScale).toEqual(t.defaults.typeScale);
    expect(t.typeRatio).toEqual({ display: 1, body: 1, figure: 1 });
  });

  it("applies a level override and reports it", () => {
    const t = resolveSlideTemplate({
      slide: slide({ templateOverride: { level: "appendix" } }),
      industryId: "R01",
    });
    expect(t.level).toBe("appendix");
    expect(t.overridden).toContain("level");
    expect(t.defaults.level).not.toBe("appendix");
  });

  it("turns a px type override into a capped ratio", () => {
    const base = resolveSlideTemplate({ slide: slide(), industryId: "R01" });
    const bumped = resolveSlideTemplate({
      slide: slide({ templateOverride: { typeScale: { display: base.typeScale.display + 20 } } }),
      industryId: "R01",
    });
    expect(bumped.typeScale.display).toBe(base.typeScale.display + 20);
    expect(bumped.typeRatio.display).toBeGreaterThan(1);
    expect(bumped.typeRatio.display).toBeLessThanOrEqual(1.6);
    expect(bumped.overridden).toContain("display");
    // untouched axes stay at library values
    expect(bumped.typeScale.body).toBe(base.typeScale.body);
    expect(bumped.typeRatio.body).toBe(1);
  });

  it("clamps absurd author input into the authoring band", () => {
    const t = resolveSlideTemplate({
      slide: slide({ templateOverride: { typeScale: { body: 900, display: 2 } } }),
      industryId: "R01",
    });
    expect(t.typeScale.body).toBe(TEMPLATE_TYPE_RANGE.body[1]);
    expect(t.typeScale.display).toBe(TEMPLATE_TYPE_RANGE.display[0]);
    expect(clampTemplateType("figure", 10_000)).toBe(TEMPLATE_TYPE_RANGE.figure[1]);
  });

  it("scales sheet fill by the bias and keeps it clamped", () => {
    const base = resolveSlideTemplate({ slide: slide(), industryId: "R01" });
    const up = resolveSlideTemplate({
      slide: slide({ templateOverride: { fillBias: 1.15 } }),
      industryId: "R01",
    });
    expect(up.fill).toBeGreaterThanOrEqual(base.fill);
    expect(up.fill).toBeLessThanOrEqual(1.3);
    expect(up.overridden).toContain("fill");
  });

  it("resolves without an industry", () => {
    const t = resolveSlideTemplate({ slide: slide(), industryId: null });
    expect(t.treatment).toBeNull();
    expect(t.typeScale.display).toBeGreaterThan(0);
  });
});

describe("mergeTemplateOverride", () => {
  it("merges partial type scales instead of replacing them", () => {
    const a = mergeTemplateOverride(null, { typeScale: { display: 90 } });
    const b = mergeTemplateOverride(a, { typeScale: { body: 24 } });
    expect(b?.typeScale).toEqual({ display: 90, body: 24 });
  });

  it("clears everything on a null patch and drops empty overrides", () => {
    const a = mergeTemplateOverride({ level: "kpi" }, null);
    expect(a).toBeNull();
    const b = mergeTemplateOverride({ level: "kpi" }, { level: undefined });
    expect(b).toBeNull();
  });
});
