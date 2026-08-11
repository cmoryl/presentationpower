// Coverage audit for the bento sibling swap.
//
// Verifies that *every* before/after and close-slide variant declared in
// BENTO_SIBLINGS resolves to a real MV-BENTO module under the bento/cards
// style, that unmapped families are untouched, and that manual overrides
// (deck-level, per-slide, and pinned picks) win in the mixed cases.
import { describe, expect, it } from "vitest";
import { BENTO_SIBLINGS, bentoSiblingFor, toBentoValueClose } from "../style-variant-swaps";
import { designStyle } from "../reinterpret-style";
import { designReinterpretedDeck } from "../reinterpret-design";
import { MODULE_VARIANTS } from "../taxonomy";
import type { MappedSlide } from "../pptx-mapping";

const cardsIds = designStyle("cards").variantIds;
const cards = new Set(cardsIds);
const kpi = new Set(designStyle("kpi").variantIds);

/** Bento-shaped copy rich enough to fill the sibling (>= 3 cells). */
const richContent = {
  title: "The shift",
  before: { label: "Today", items: [{ label: "Silos", body: "Handoffs." }] },
  after: {
    label: "With TransPerfect",
    items: [
      { label: "One platform", body: "Integrated workflows.", icon: "Layers3" },
      { label: "More completed", body: "Less drop-off." },
      { label: "Real-time visibility", body: "Faster decisions." },
    ],
  },
  hub: { title: "One platform", lines: ["One workflow.", "One source of truth."] },
  summary: { lead: "This transforms", emphasis: "the whole program." },
  cta: { title: "Next step", body: "Pilot in one market." },
};

const slideOf = (variantId: string, index = 0): MappedSlide =>
  ({
    sectionId: "SF-09",
    variantId,
    layoutId: "L-DEFAULT",
    content: richContent,
    rationale: "mapped",
    source: { index, title: "The shift", bullets: [], notes: "", images: [] },
  }) as never;

const mappedIds = Object.keys(BENTO_SIBLINGS);

describe("bento swap coverage", () => {
  it("declares a mapping for every before/after and close family in the table", () => {
    expect(mappedIds.length).toBeGreaterThanOrEqual(7);
    for (const id of mappedIds) {
      // source and target must both be real registered modules
      expect(MODULE_VARIANTS.some((v) => v.id === id), `source ${id} missing`).toBe(true);
      const target = BENTO_SIBLINGS[id];
      expect(target.startsWith("MV-BENTO-"), `${id} → ${target} is not a bento module`).toBe(true);
      expect(MODULE_VARIANTS.some((v) => v.id === target), `target ${target} missing`).toBe(true);
    }
  });

  it("the bento style actually favours the swap target", () => {
    for (const id of mappedIds) expect(cards.has(BENTO_SIBLINGS[id])).toBe(true);
  });

  it.each(mappedIds)("%s swaps to its bento sibling under the bento style", (id) => {
    expect(bentoSiblingFor(id, cards)).toBe(BENTO_SIBLINGS[id]);
    const [out] = designReinterpretedDeck([slideOf(id)], { styleVariantIds: cardsIds });
    expect(out.variantId).toBe(BENTO_SIBLINGS[id]);
    // copy survives the translation
    expect(out.content.title).toBe("The shift");
    expect((out.content as { items: unknown[] }).items.length).toBe(3);
    expect(out.rationale).toContain(`${id} → ${BENTO_SIBLINGS[id]}`);
  });

  it.each(mappedIds)("%s keeps its layout under a non-bento style", (id) => {
    expect(bentoSiblingFor(id, kpi)).toBeNull();
    const [out] = designReinterpretedDeck([slideOf(id)], {
      styleVariantIds: designStyle("kpi").variantIds,
    });
    expect(out.variantId).toBe(id);
  });

  it("leaves unmapped families alone even under the bento style", () => {
    for (const id of ["MV-IMG-BEFORE-AFTER", "MV-CLOSE-CTA", "MV-CLOSE-THANKS", "MV-KPI-DASHBOARD"]) {
      expect(bentoSiblingFor(id, cards)).toBeNull();
    }
  });

  it("keeps the original layout when the copy cannot fill the bento", () => {
    const thin = {
      ...slideOf("MV-CLOSE-SPLIT"),
      content: { title: "Thin", after: { items: [{ label: "only one" }] } },
    } as MappedSlide;
    expect(toBentoValueClose(thin.content)).toBeNull();
    const [out] = designReinterpretedDeck([thin], { styleVariantIds: cardsIds });
    expect(out.variantId).toBe("MV-CLOSE-SPLIT");
  });
});

describe("bento swap with mixed manual overrides", () => {
  it("respects a pinned pick on one slide while swapping its neighbours", () => {
    const slides = [
      slideOf("MV-PROC-BEFORE-AFTER-SPLIT", 0),
      slideOf("MV-CLOSE-DUAL-CTA", 1),
      slideOf("MV-CLOSE-STATEMENT", 2),
    ];
    const out = designReinterpretedDeck(slides, {
      styleVariantIds: cardsIds,
      preferred: { 1: "MV-CLOSE-DUAL-CTA" },
    });
    expect(out.map((m) => m.variantId)).toEqual([
      "MV-BENTO-VALUE-CLOSE",
      "MV-CLOSE-DUAL-CTA",
      "MV-BENTO-VALUE-CLOSE",
    ]);
  });

  it("per-slide style overrides beat the deck style in both directions", () => {
    // deck is non-bento, one slide is switched to the bento language
    const upgraded = designReinterpretedDeck(
      [slideOf("MV-CLOSE-SPLIT", 0), slideOf("MV-CLOSE-SPLIT", 1)],
      {
        styleVariantIds: designStyle("kpi").variantIds,
        styleVariantIdsByIndex: { 1: cardsIds },
      },
    );
    expect(upgraded.map((m) => m.variantId)).toEqual(["MV-CLOSE-SPLIT", "MV-BENTO-VALUE-CLOSE"]);

    // deck is bento, one slide is pulled back to another language
    const downgraded = designReinterpretedDeck(
      [slideOf("MV-CLOSE-SPLIT", 0), slideOf("MV-CLOSE-SPLIT", 1)],
      {
        styleVariantIds: cardsIds,
        styleVariantIdsByIndex: { 1: designStyle("kpi").variantIds },
      },
    );
    expect(downgraded.map((m) => m.variantId)).toEqual([
      "MV-BENTO-VALUE-CLOSE",
      "MV-CLOSE-SPLIT",
    ]);
  });
});
