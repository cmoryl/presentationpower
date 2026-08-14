import { describe, it, expect } from "vitest";
import { planDeck } from "./deck-originate";
import {
  BRAND_MODES,
  MODULE_VARIANTS,
  NARRATIVE_ARCHETYPES,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
} from "./taxonomy";

const brandModeId = BRAND_MODES[0].id;
const archetype = NARRATIVE_ARCHETYPES[0];

describe("planDeck — archetype expansion", () => {
  it("expands the section recipe in order, one slide per section", () => {
    const res = planDeck({ brand_mode_id: brandModeId, archetype_id: archetype.id });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.slides.map((s) => s.sectionId)).toEqual(archetype.sectionRecipe);
    expect(res.value.slides.map((s) => s.position)).toEqual(
      archetype.sectionRecipe.map((_, i) => i),
    );
  });

  it("picks a permitted variant with a permitted layout for every slide", () => {
    const res = planDeck({ brand_mode_id: brandModeId, archetype_id: archetype.id });
    if (!res.ok) throw new Error(res.error);
    for (const slide of res.value.slides) {
      const permitted = variantsForSection(slide.sectionId).map((v) => v.id);
      expect(permitted).toContain(slide.variantId);
      const variant = byId(MODULE_VARIANTS, slide.variantId)!;
      expect(variant.permittedLayoutIds).toContain(slide.layoutId);
    }
  });

  it("titles the deck from the client name and archetype", () => {
    const res = planDeck({
      brand_mode_id: brandModeId,
      archetype_id: archetype.id,
      client_name: "Acme",
    });
    if (!res.ok) throw new Error(res.error);
    expect(res.value.title).toBe(`Acme — ${archetype.name}`);
  });

  it("restricts the recipe to requested sections, keeping recipe order", () => {
    const keep = archetype.sectionRecipe.slice(0, 2).reverse();
    const res = planDeck({
      brand_mode_id: brandModeId,
      archetype_id: archetype.id,
      section_framework_ids: keep,
    });
    if (!res.ok) throw new Error(res.error);
    expect(res.value.slides.map((s) => s.sectionId)).toEqual(archetype.sectionRecipe.slice(0, 2));
  });

  it("honours an explicit ordered slide list over the archetype", () => {
    const [a, b] = archetype.sectionRecipe;
    const res = planDeck({
      brand_mode_id: brandModeId,
      slides: [{ section_id: b }, { section_id: a }],
    });
    if (!res.ok) throw new Error(res.error);
    expect(res.value.slides.map((s) => s.sectionId)).toEqual([b, a]);
  });
});

describe("planDeck — rejections", () => {
  it("rejects an unknown brand mode", () => {
    const res = planDeck({ brand_mode_id: "bm-nope", archetype_id: archetype.id });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/Unknown brand_mode_id bm-nope/);
  });

  it("rejects an unknown archetype", () => {
    const res = planDeck({ brand_mode_id: brandModeId, archetype_id: "NA-nope" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/Unknown archetype_id/);
  });

  it("rejects a variant whose family the section does not permit, naming both", () => {
    const section = SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.length)!;
    const outsider = MODULE_VARIANTS.find(
      (v) => !section.permittedFamilyIds.includes(v.familyId),
    )!;
    const res = planDeck({
      brand_mode_id: brandModeId,
      slides: [{ section_id: section.id, variant_id: outsider.id }],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain(outsider.id);
    expect(res.error).toContain(outsider.familyId);
    expect(res.error).toContain(section.id);
    expect(res.error).toContain(section.name);
  });

  it("rejects an unknown section and an unknown variant", () => {
    expect(planDeck({ brand_mode_id: brandModeId, slides: [{ section_id: "SF-999" }] })).toMatchObject(
      { ok: false },
    );
    const res = planDeck({
      brand_mode_id: brandModeId,
      slides: [{ section_id: SECTION_FRAMEWORKS[0].id, variant_id: "MV-NOPE" }],
    });
    if (res.ok) throw new Error("expected failure");
    expect(res.error).toMatch(/Unknown variant_id MV-NOPE/);
  });

  it("requires either an archetype or a slide list", () => {
    const res = planDeck({ brand_mode_id: brandModeId });
    if (res.ok) throw new Error("expected failure");
    expect(res.error).toMatch(/archetype_id or an explicit slides list/);
  });
});
