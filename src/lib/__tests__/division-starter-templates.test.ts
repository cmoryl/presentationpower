import { describe, it, expect } from "vitest";
import { DIVISION_STARTERS } from "@/lib/division-starter-templates";
import { BRAND_MODES, SECTION_FRAMEWORKS, MODULE_VARIANTS, byId } from "@/lib/taxonomy";

describe("division starter templates", () => {
  it("covers every brand mode with authored copy", () => {
    expect(DIVISION_STARTERS).toHaveLength(BRAND_MODES.length);
    for (const s of DIVISION_STARTERS) {
      expect(s.caption.length).toBeGreaterThan(20);
      expect(s.description.length).toBeGreaterThan(60);
      expect(s.contains.length).toBeGreaterThanOrEqual(3);
      expect(s.title).not.toMatch(/placeholder|lorem/i);
    }
  });

  it("builds real, valid slides for every division", () => {
    for (const s of DIVISION_STARTERS) {
      const payload = s.build();
      expect(payload.slides.length).toBeGreaterThanOrEqual(5);
      for (const slide of payload.slides) {
        const section = byId(SECTION_FRAMEWORKS, slide.sectionId);
        const variant = byId(MODULE_VARIANTS, slide.variantId);
        expect(section).toBeTruthy();
        expect(variant).toBeTruthy();
        expect(section!.permittedFamilyIds).toContain(variant!.familyId);
        expect(variant!.permittedLayoutIds).toContain(slide.layoutId);
        expect(Object.keys(slide.content).length).toBeGreaterThan(0);
      }
    }
  });

  it("gives each division a distinct deck title", () => {
    const titles = new Set(DIVISION_STARTERS.map((s) => s.title));
    expect(titles.size).toBe(DIVISION_STARTERS.length);
  });
});
