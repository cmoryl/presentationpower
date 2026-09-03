import { describe, expect, it } from "vitest";
import { demoSlideBriefs, planDivisionFit, sectionSequence } from "../division-fit-engine";
import { DIVISION_DESIGN_SPECS, divisionDesignSpec } from "../division-design-specs";
import { NARRATIVE_ARCHETYPES } from "../taxonomy";

const shape = { blocks: 4, copy: "medium" as const, media: true };

describe("division fit engine", () => {
  it("plans every archetype for every brand scope with a feasible winner per slide", () => {
    for (const brandModeId of Object.keys(DIVISION_DESIGN_SPECS)) {
      for (const arch of NARRATIVE_ARCHETYPES) {
        const sections = sectionSequence(arch.id);
        expect(sections.length).toBeGreaterThan(0);
        const plan = planDivisionFit({
          brandModeId,
          slides: demoSlideBriefs(sections, shape),
        });
        expect(plan.slides).toHaveLength(sections.length);
        for (const slide of plan.slides) {
          expect(slide.best).not.toBeNull();
          expect(slide.consideredCount).toBeGreaterThan(0);
          expect(slide.canvas.suggestedSlides).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("wears the division's own approved packs per face", () => {
    const plan = planDivisionFit({
      brandModeId: "bm-product",
      slides: demoSlideBriefs(sectionSequence(NARRATIVE_ARCHETYPES[0]!.id), shape),
    });
    const spec = divisionDesignSpec("bm-product");
    for (const slide of plan.slides) {
      if (slide.face === "dark") expect(slide.packId).toBe(spec.darkPackId);
      else expect(slide.packId).toBe(plan.packId);
    }
  });

  it("uses neighbour context so the rhythm window improves layout variety", () => {
    const sections = sectionSequence(NARRATIVE_ARCHETYPES[0]!.id);
    const slides = demoSlideBriefs(sections, shape);
    const flat = planDivisionFit({ brandModeId: "bm-enterprise", slides, rhythmWindow: 0 });
    const threaded = planDivisionFit({ brandModeId: "bm-enterprise", slides, rhythmWindow: 4 });
    expect(flat.slides[1]!.neighbours).toHaveLength(0);
    expect(threaded.slides[1]!.neighbours.length).toBeGreaterThan(0);
    expect(threaded.variety).toBeGreaterThanOrEqual(flat.variety);
  });

  it("is deterministic", () => {
    const slides = demoSlideBriefs(sectionSequence(NARRATIVE_ARCHETYPES[0]!.id), shape);
    const a = planDivisionFit({ brandModeId: "bm-tp-legal", slides });
    const b = planDivisionFit({ brandModeId: "bm-tp-legal", slides });
    expect(a.slides.map((s) => s.best?.variantId)).toEqual(b.slides.map((s) => s.best?.variantId));
    expect(a.meanScore).toBe(b.meanScore);
  });
});
