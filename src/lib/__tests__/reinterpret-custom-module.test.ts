import { describe, expect, it } from "vitest";
import {
  applyCustomModuleProposal,
  proposeCustomModule,
} from "@/lib/reinterpret-custom-module";
import { BLANK_VARIANT_ID, canPublish, validateCustomModule } from "@/lib/custom-modules";
import type { MappedSlide } from "@/lib/pptx-mapping";

function mapped(partial: {
  title?: string;
  bullets?: string[];
  images?: string[];
  notes?: string;
}): MappedSlide {
  return {
    sectionId: "SF-02",
    variantId: "MV-OP-DIVIDER",
    layoutId: "LF-01",
    content: {},
    rationale: "",
    source: {
      index: 3,
      title: partial.title ?? "",
      bullets: partial.bullets ?? [],
      images: partial.images ?? [],
      notes: partial.notes ?? "",
    } as MappedSlide["source"],
  };
}

describe("AI-authored custom modules for import gaps", () => {
  it("authors a publishable image-wall module from a title-only slide", () => {
    const p = proposeCustomModule(
      mapped({
        title: "The World Runs on TransPerfect",
        images: Array.from({ length: 9 }, (_, i) => `https://cdn.test/logo-${i}.png`),
      }),
    );
    expect(p.baseVariantId).toBe(BLANK_VARIANT_ID);
    expect(p.canvasBlocks.filter((b) => b.kind === "image")).toHaveLength(9);
    expect(p.canvasBlocks.some((b) => b.kind === "heading")).toBe(true);
    const issues = validateCustomModule({
      name: p.name,
      description: p.description,
      baseVariantId: p.baseVariantId,
      blocks: p.canvasBlocks,
      content: p.content as Record<string, unknown>,
    });
    expect(canPublish(issues)).toBe(true);
  });

  it("keeps every object on the 1920x1080 stage for a copy + imagery slide", () => {
    const p = proposeCustomModule(
      mapped({
        title: "Why localization ops break",
        bullets: ["Fragmented vendors", "No single source of truth", "Manual QA", "Slow cycles"],
        images: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"],
      }),
    );
    for (const b of p.canvasBlocks) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(1920);
      expect(b.y + b.h).toBeLessThanOrEqual(1080);
    }
  });

  it("invents no copy — every string comes from the source slide", () => {
    const src = mapped({ title: "Delivery model", bullets: ["Follow the sun", "24/7 coverage"] });
    const p = proposeCustomModule(src);
    const texts = p.canvasBlocks.map((b) => b.text).filter(Boolean);
    for (const t of texts) {
      expect(["Delivery model", "Follow the sun", "24/7 coverage"]).toContain(t);
    }
  });

  it("applies onto the mapped slide as a blank-base canvas module", () => {
    const src = mapped({ title: "Odd hybrid", bullets: ["One", "Two"] });
    const applied = applyCustomModuleProposal(src, proposeCustomModule(src));
    expect(applied.variantId).toBe(BLANK_VARIANT_ID);
    expect(applied.canvasBlocks.length).toBeGreaterThan(0);
    expect(applied.rationale).toMatch(/AI-authored custom module/);
  });
});
