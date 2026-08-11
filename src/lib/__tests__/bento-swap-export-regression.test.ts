/**
 * Export regression for the bento sibling swap.
 *
 * Every before/after and close-slide variant that maps onto
 * MV-BENTO-VALUE-CLOSE must, once swapped, export through the *same* PPTX
 * renderer and produce the *same* slide geometry and text as a slide that was
 * authored as MV-BENTO-VALUE-CLOSE in the first place. If the exporter ever
 * loses the bento case (or a translated field stops reaching the renderer),
 * the swapped slides silently degrade in PowerPoint even though they look
 * right on screen — this test fails first.
 *
 * It runs the real `exportDeckToPptx`, unzips the .pptx, and compares
 * normalised slide XML across all affected source types, in both modes.
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { BENTO_SIBLINGS, toBentoValueClose } from "@/lib/style-variant-swaps";
import { designReinterpretedDeck } from "@/lib/reinterpret-design";
import { designStyle } from "@/lib/reinterpret-style";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import type { Deck, DeckSlide } from "@/lib/deck-store";
import type { MappedSlide } from "@/lib/pptx-mapping";

const cardsIds = designStyle("cards").variantIds;
const sourceIds = Object.keys(BENTO_SIBLINGS);
const brand = byId(BRAND_MODES, "tp")!;

/** Authored copy rich enough to fill the bento sibling. */
const content = {
  title: "The shift",
  kicker: "Why now",
  before: { label: "Today", items: [{ label: "Silos", body: "Handoffs everywhere." }] },
  after: {
    label: "With TransPerfect",
    items: [
      { label: "One platform", body: "Integrated workflows.", icon: "Layers3" },
      { label: "More completed", body: "Less drop-off.", icon: "TrendingUp" },
      { label: "Real-time visibility", body: "Faster decisions.", icon: "Eye" },
      { label: "Lower cost", body: "Automation at scale.", icon: "Coins" },
    ],
  },
  hub: { title: "One platform", lines: ["One workflow.", "One source of truth."] },
  summary: { lead: "This transforms", emphasis: "the whole program." },
  cta: { title: "Next step", body: "Pilot in one market." },
};

const mapped = (variantId: string): MappedSlide =>
  ({
    sectionId: "SF-09",
    variantId,
    layoutId: "L-DEFAULT",
    content,
    rationale: "mapped",
    source: { index: 0, title: "The shift", bullets: [], notes: "", images: [] },
  }) as never;

function deckOf(slide: { variantId: string; content: unknown }): Deck {
  return {
    id: "test-bento-swap",
    createdAt: new Date(0).toISOString(),
    title: "Bento swap export",
    briefId: "test-brief",
    brandModeId: "tp",
    archetypeId: "AR-PITCH",
    slides: [
      {
        id: "s-0",
        sectionId: "SF-09",
        variantId: slide.variantId,
        layoutId: "L-DEFAULT",
        content: slide.content,
        notes: "",
      },
    ] as DeckSlide[],
  } as Deck;
}

async function slideXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const name = Object.keys(zip.files).find((n) => /^ppt\/slides\/slide1\.xml$/.test(n))!;
  return zip.files[name].async("string");
}

/** Strip volatile ids/timestamps so two renders of the same slide compare equal. */
const normalise = (xml: string) =>
  xml
    .replace(/id="\d+"/g, 'id="N"')
    .replace(/name="[^"]*?\d+"/g, 'name="N"')
    .replace(/r:embed="rId\d+"/g, 'r:embed="rId"')
    .replace(/\s+/g, " ")
    .trim();

async function exportedXml(
  variantId: string,
  slideContent: unknown,
  mode: "light" | "dark",
): Promise<string> {
  const res = await exportDeckToPptx(deckOf({ variantId, content: slideContent }), brand, {
    output: "blob",
    forceMode: mode,
  });
  expect(res.failedSlides, `${variantId} (${mode}) failed to export`).toEqual([]);
  expect(res.blob).toBeTruthy();
  return normalise(await slideXml(res.blob!));
}

describe("bento swap PPTX export regression", () => {
  const modes: Array<"light" | "dark"> = ["light", "dark"];

  for (const mode of modes) {
    it(`swapped slides render identically to an authored bento close (${mode})`, async () => {
      // Reference: a slide authored directly as MV-BENTO-VALUE-CLOSE from the
      // same translated copy.
      const translated = toBentoValueClose(content)!;
      const reference = await exportedXml("MV-BENTO-VALUE-CLOSE", translated, mode);

      // Sanity: the reference actually rendered the bento (title + all cells).
      expect(reference).toContain("The shift");
      for (const cell of ["One platform", "More completed", "Real-time visibility", "Lower cost"]) {
        expect(reference, `reference missing cell ${cell}`).toContain(cell);
      }
      expect(reference).toContain("Next step");

      const drift: string[] = [];
      for (const id of sourceIds) {
        const [swapped] = designReinterpretedDeck([mapped(id)], { styleVariantIds: cardsIds });
        expect(swapped.variantId, `${id} did not swap`).toBe(BENTO_SIBLINGS[id]);
        const xml = await exportedXml(swapped.variantId, swapped.content, mode);
        if (xml !== reference) drift.push(id);
      }
      expect(drift, `swapped sources whose export drifted from the authored bento: ${drift.join(", ")}`).toEqual([]);
    }, 120_000);
  }

  it("un-swapped sources still export on their own renderer", async () => {
    // Guard the other half of the contract: under a non-bento style the source
    // layouts must keep exporting (no silent reliance on the bento path).
    for (const id of sourceIds) {
      const [kept] = designReinterpretedDeck([mapped(id)], {
        styleVariantIds: designStyle("kpi").variantIds,
      });
      expect(kept.variantId).toBe(id);
      const xml = await exportedXml(kept.variantId, kept.content, "light");
      expect(xml, `${id} exported an empty slide`).toContain("The shift");
    }
  }, 120_000);
});
