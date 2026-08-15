import { describe, expect, it } from "vitest";
import { INDUSTRY_RECIPES } from "../design-skins";
import { SECTION_FRAMEWORKS, variantsForSection } from "../taxonomy";
import {
  TEMPLATE_LEVELS,
  inferLevel,
  levelsForSection,
  primaryLevelForSection,
  sectionTemplate,
  templateLibraryForIndustry,
  templateLibrarySize,
} from "../section-templates";

describe("section template library", () => {
  it("declares levels for every section framework", () => {
    for (const s of SECTION_FRAMEWORKS) {
      const levels = levelsForSection(s.id);
      expect(levels.length).toBeGreaterThan(0);
      for (const l of levels) expect(TEMPLATE_LEVELS).toContain(l);
    }
  });

  it("resolves every industry × section × level cell", () => {
    for (const r of INDUSTRY_RECIPES) {
      for (const s of SECTION_FRAMEWORKS) {
        for (const level of levelsForSection(s.id)) {
          const t = sectionTemplate({ industryId: r.id, sectionId: s.id, level });
          expect(t, `${r.id}/${s.id}/${level}`).toBeTruthy();
          expect(t!.level).toBe(level);
          expect(t!.geometry.fill).toBeGreaterThan(0.39);
          expect(t!.geometry.fill).toBeLessThanOrEqual(0.98);
        }
      }
    }
  });

  it("only picks module variants permitted for the section", () => {
    for (const r of INDUSTRY_RECIPES) {
      for (const s of SECTION_FRAMEWORKS) {
        const allowed = new Set(variantsForSection(s.id).map((v) => v.id));
        for (const level of levelsForSection(s.id)) {
          const t = sectionTemplate({ industryId: r.id, sectionId: s.id, level })!;
          expect(allowed.has(t.variantId), `${r.id}/${s.id}/${level} → ${t.variantId}`).toBe(true);
          for (const alt of t.alternates) expect(allowed.has(alt)).toBe(true);
        }
      }
    }
  });

  it("gives distinct treatments to distinct levels of one section", () => {
    for (const r of INDUSTRY_RECIPES.slice(0, 8)) {
      for (const s of SECTION_FRAMEWORKS) {
        const levels = levelsForSection(s.id);
        if (levels.length < 2) continue;
        const sigs = levels.map((level) => {
          const t = sectionTemplate({ industryId: r.id, sectionId: s.id, level })!;
          return `${t.variantId}|${t.scene}|${t.geometry.scaffold}|${t.geometry.layout.grid}`;
        });
        expect(new Set(sigs).size, `${r.id}/${s.id}`).toBe(sigs.length);
      }
    }
  });

  it("varies the picked variant across industries for the same cell", () => {
    for (const s of SECTION_FRAMEWORKS) {
      const level = primaryLevelForSection(s.id);
      const picks = new Set(
        INDUSTRY_RECIPES.map((r) => sectionTemplate({ industryId: r.id, sectionId: s.id, level })!.variantId),
      );
      const pool = Math.min(6, variantsForSection(s.id).length);
      expect(picks.size, `${s.id}/${level}`).toBeGreaterThanOrEqual(Math.min(pool, 3));
    }
  });

  it("is deterministic", () => {
    const a = sectionTemplate({ industryId: "R07", sectionId: "SF-08", level: "kpi" });
    const b = sectionTemplate({ industryId: "R07", sectionId: "SF-08", level: "kpi" });
    expect(a).toEqual(b);
  });

  it("returns null for unknown ids", () => {
    expect(sectionTemplate({ industryId: "R99", sectionId: "SF-01" })).toBeNull();
    expect(sectionTemplate({ industryId: "R01", sectionId: "SF-99" })).toBeNull();
  });

  it("builds a full library sheet per industry", () => {
    const rows = templateLibraryForIndustry("R03");
    expect(rows.length).toBe(templateLibrarySize() / INDUSTRY_RECIPES.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it("infers levels from slide jobs", () => {
    expect(inferLevel("Revenue growth KPIs by region")).toBe("kpi");
    expect(inferLevel("Four-phase onboarding process")).toBe("process");
    expect(inferLevel("Appendix: full comparison table")).toBe("appendix");
    expect(inferLevel("Cover slide for the pitch")).toBe("headline");
    expect(inferLevel("Our three capability pillars", "SF-06")).toBe("body");
  });
});
