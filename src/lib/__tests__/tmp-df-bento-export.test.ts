import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { byId, BRAND_MODES } from "@/lib/taxonomy";
import { seedContent, type Deck, type DeckSlide } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";

describe("tmp: dataforce bento-8 dark export", () => {
  it("writes bytes", async () => {
    const deck = {
      id: "tmp-df",
      createdAt: new Date(0).toISOString(),
      title: "QQQQBento_8_cell_DataForce",
      briefId: "tmp",
      brandModeId: "bm-product",
      archetypeId: "ar-overview",
      context: { stylePackId: "skin-r03" },
      slides: [
        {
          id: "s-1",
          sectionId: "sec-overview",
          variantId: "MV-BENTO-8",
          layoutId: "",
          mode: "dark",
          content: seedContent("MV-BENTO-8", {} as never, "Overview"),
          notes: "",
        },
      ] as DeckSlide[],
    } as Deck;
    const res = await exportDeckToPptx(deck, byId(BRAND_MODES, "bm-product")!, {
      output: "blob",
      pack: "skin-r03",
      fidelity: "editable",
      embedFonts: false,
      forceMode: "dark",
    });
    expect(res.blob).toBeTruthy();
    writeFileSync("/tmp/df-bento8.pptx", Buffer.from(await res.blob!.arrayBuffer()));
    console.log("warnings", res.warnings, "failed", res.failedSlides);
  }, 180_000);
});
