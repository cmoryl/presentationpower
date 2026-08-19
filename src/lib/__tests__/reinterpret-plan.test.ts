import { describe, expect, it } from "vitest";
import { validateAiPlans, applyApprovedPlans } from "@/lib/reinterpret-plan";
import { DESIGN_CATALOG } from "@/lib/reinterpret-design";
import type { MappedSlide } from "@/lib/pptx-mapping";
import type { ParsedSlide } from "@/lib/pptx-import";

function slide(index: number, title: string, bullets: string[]): MappedSlide {
  return {
    sectionId: "SF-05",
    variantId: "MV-INS-CALLOUT",
    layoutId: "LF-01",
    content: { title },
    rationale: "Narrative callout",
    source: {
      index,
      title,
      bullets,
      notes: "",
      images: [],
      charts: [],
      tables: [],
      diagrams: [],
      imageEmbedIds: [],
      media: [],
      hyperlinks: [],
      comments: [],
      hidden: false,
      hasAnimation: false,
    } as ParsedSlide,
  };
}

const deck = [
  slide(0, "Cover", []),
  slide(1, "Results", ["42% faster onboarding", "3x more trials", "18 markets live"]),
  slide(2, "Roadmap", ["Q1 2026 pilot", "Q2 2026 rollout", "Q3 2026 scale"]),
];

describe("AI reinterpretation plan", () => {
  it("rejects layouts outside the catalog and keeps the slide unusable", () => {
    const [p] = validateAiPlans(deck, [
      { index: 1, variantId: "MV-NOT-REAL", rationale: "x", confidence: 0.9 },
    ]);
    expect(p.usable).toBe(false);
    expect(p.issues).toContain("unknown-variant");
  });

  it("restores source content the planner dropped", () => {
    const [p] = validateAiPlans(deck, [
      {
        index: 1,
        variantId: DESIGN_CATALOG[0].variantId,
        bullets: ["42% faster onboarding"],
        rationale: "stats",
        confidence: 0.9,
      },
    ]);
    expect(p.issues).toContain("content-restored");
    expect(p.bullets?.length).toBe(3);
  });

  it("applies only approved slides and leaves rejected ones on the heuristic design", () => {
    const plans = validateAiPlans(deck, [
      {
        index: 1,
        variantId: "MV-PROOF-STATS-3",
        title: "Measured results",
        rationale: "three stats",
        confidence: 0.9,
      },
      {
        index: 2,
        variantId: "MV-PROC-TIMELINE",
        title: "Rewritten roadmap",
        rationale: "dated",
        confidence: 0.9,
      },
    ]);
    const out = applyApprovedPlans(deck, plans, new Set([1]));
    const approvedSlide = out.find((m) => m.source.index === 1)!;
    expect(approvedSlide.variantId).toBe("MV-PROOF-STATS-3");
    expect(approvedSlide.rationale).toContain("three stats");
    const rejected = out.find((m) => m.source.index === 2)!;
    expect(rejected.source.title).toBe("Roadmap");
    expect(rejected.rationale).not.toContain("dated");
  });
});
