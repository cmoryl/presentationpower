import { describe, expect, it } from "vitest";
import { bentoSiblingFor, toBentoValueClose } from "../style-variant-swaps";
import { designStyle } from "../reinterpret-style";
import { designReinterpretedDeck } from "../reinterpret-design";
import type { MappedSlide } from "../pptx-mapping";

const beforeAfter = {
  title: "The shift",
  before: { label: "Without a platform", items: [{ label: "Silos", body: "Handoffs." }] },
  after: {
    label: "With TransPerfect",
    items: [
      { label: "One platform", body: "Integrated workflows." },
      { label: "More completed", body: "Less drop-off." },
      { label: "Real-time visibility", body: "Faster decisions." },
      { label: "Lower cost", body: "Automation at scale." },
    ],
  },
  hub: { title: "One platform", lines: ["One workflow.", "One source of truth."] },
  summary: { lead: "This transforms", emphasis: "the whole program." },
};

const cards = new Set(designStyle("cards").variantIds);

describe("bento sibling mapping", () => {
  it("maps before/after and split closers only under the bento style", () => {
    expect(bentoSiblingFor("MV-PROC-BEFORE-AFTER-SPLIT", cards)).toBe("MV-BENTO-VALUE-CLOSE");
    expect(bentoSiblingFor("MV-CLOSE-DUAL-CTA", cards)).toBe("MV-BENTO-VALUE-CLOSE");
    expect(bentoSiblingFor("MV-PROC-BEFORE-AFTER-SPLIT", null)).toBeNull();
    expect(bentoSiblingFor("MV-PROC-BEFORE-AFTER-SPLIT", new Set(designStyle("kpi").variantIds)))
      .toBeNull();
    expect(bentoSiblingFor("MV-KPI-DASHBOARD", cards)).toBeNull();
  });

  it("carries the authored copy into the bento shape", () => {
    const out = toBentoValueClose(beforeAfter)!;
    expect(out.title).toBe("The shift");
    expect((out.items as unknown[]).length).toBe(4);
    expect(out.itemsLabel).toBe("With TransPerfect");
    expect(out.promise).toEqual({ lead: "This transforms", emphasis: "the whole program." });
    expect((out.close as Record<string, string>).lead).toBe("This transforms");
  });

  it("leaves thin slides alone", () => {
    expect(toBentoValueClose({ title: "x", after: { items: [{ label: "a" }] } })).toBeNull();
  });
});

describe("design pass swap", () => {
  const slide: MappedSlide = {
    sectionId: "SF-09",
    variantId: "MV-PROC-BEFORE-AFTER-SPLIT",
    layoutId: "L-DEFAULT",
    content: beforeAfter,
    rationale: "mapped",
    source: { index: 0, title: "The shift", bullets: [], notes: "", images: [] } as never,
  };

  it("swaps under the bento style and keeps the layout otherwise", () => {
    const [swapped] = designReinterpretedDeck([slide], {
      styleVariantIds: designStyle("cards").variantIds,
    });
    expect(swapped.variantId).toBe("MV-BENTO-VALUE-CLOSE");

    const [kept] = designReinterpretedDeck([slide], {
      styleVariantIds: designStyle("kpi").variantIds,
    });
    expect(kept.variantId).toBe("MV-PROC-BEFORE-AFTER-SPLIT");
  });

  it("never overrides an explicit pick", () => {
    const [kept] = designReinterpretedDeck([slide], {
      styleVariantIds: designStyle("cards").variantIds,
      preferred: { 0: "MV-PROC-BEFORE-AFTER-SPLIT" },
    });
    expect(kept.variantId).toBe("MV-PROC-BEFORE-AFTER-SPLIT");
  });
});
