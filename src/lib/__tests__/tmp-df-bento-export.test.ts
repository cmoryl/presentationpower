import { describe, it } from "vitest";
import JSZip from "jszip";
import { byId, BRAND_MODES } from "@/lib/taxonomy";
import { seedContent, type Deck, type DeckSlide } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";

describe("tmp: bento-8 text boxes", () => {
  it("dumps", async () => {
    const deck = {
      id: "tmp-df",
      createdAt: new Date(0).toISOString(),
      title: "df",
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
    const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
    const xml = await zip.files["ppt/slides/slide1.xml"]!.async("string");
    for (const m of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)) {
      const s = m[0];
      if (!s.includes("<a:t>")) continue;
      const name = /name="([^"]*)"/.exec(s)?.[1];
      const off = /<a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"/.exec(s);
      const text = [...s.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).join("|");
      console.log(name, off?.slice(1).join(","), JSON.stringify(text).slice(0, 60));
    }
  }, 180_000);
});
