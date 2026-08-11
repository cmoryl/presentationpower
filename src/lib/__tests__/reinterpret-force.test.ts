import { describe, it, expect } from "vitest";
import { designReinterpretedDeck } from "@/lib/reinterpret-design";
import type { MappedSlide } from "@/lib/pptx-mapping";

function slide(index: number, bullets: string[]): MappedSlide {
  return {
    sectionId: "sec",
    variantId: "MV-OP-COVER-MEDIA",
    layoutId: "L",
    content: {},
    rationale: "",
    source: { index, title: "The Enrollment Crisis", bullets, notes: "", images: [] },
  } as unknown as MappedSlide;
}

describe("forced layouts", () => {
  const deck = [slide(0, ["Why enrollment stalls", "Study", "Design", "Protocol", "Finalized", "Sites"])];
  it("leaves the cover alone without force", () => {
    const out = designReinterpretedDeck(deck, { preferred: { 0: "MV-PROC-PHASES" } });
    expect(out[0].variantId).toBe("MV-OP-COVER-MEDIA");
  });
  it("applies the picked layout to the cover when forced", () => {
    const out = designReinterpretedDeck(deck, {
      preferred: { 0: "MV-PROC-PHASES" },
      forced: { 0: true },
    });
    expect(out[0].variantId).toBe("MV-PROC-PHASES");
    expect(out[0].rationale).toContain("Forced by reviewer");
  });
});
