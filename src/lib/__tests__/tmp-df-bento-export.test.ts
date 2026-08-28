import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { byId, BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { seedContent, type Deck, type DeckSlide } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";

const BENTO = MODULE_VARIANTS.filter((v) => /BENTO/.test(v.id)).map((v) => v.id);

describe("tmp: dataforce bento export", () => {
  it("emits no invalid extents", async () => {
    const deck = {
      id: "tmp-df",
      createdAt: new Date(0).toISOString(),
      title: "df",
      briefId: "tmp",
      brandModeId: "bm-product",
      archetypeId: "ar-overview",
      context: { stylePackId: "skin-r03" },
      slides: BENTO.map((id, i) => ({
        id: `s-${i}`,
        sectionId: "sec-overview",
        variantId: id,
        layoutId: "",
        mode: "dark",
        content: seedContent(id, {} as never, "Overview"),
        notes: "",
      })) as DeckSlide[],
    } as Deck;
    const res = await exportDeckToPptx(deck, byId(BRAND_MODES, "bm-product")!, {
      output: "blob",
      pack: "skin-r03",
      fidelity: "editable",
      embedFonts: false,
      forceMode: "dark",
    });
    const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
    const bad: string[] = [];
    for (const name of Object.keys(zip.files)) {
      if (!/\.xml$/.test(name)) continue;
      const xml = await zip.files[name]!.async("string");
      for (const m of xml.matchAll(/<a:(?:ch)?Ext? cx="(-?\d+)" cy="(-?\d+)"/g)) {
        const cx = Number(m[1]);
        const cy = Number(m[2]);
        if ((cx < 0 || cy < 0) && !(cx === 0 && cy === 0)) bad.push(`${name} ${m[0]}`);
      }
      for (const m of xml.matchAll(/<a:(ext|chExt) cx="(-?\d+)" cy="(-?\d+)"/g)) {
        const cx = Number(m[2]);
        const cy = Number(m[3]);
        if ((cx <= 0 || cy <= 0) && !(cx === 0 && cy === 0)) bad.push(`${name} ${m[0]}`);
      }
    }
    console.log("variants", BENTO.length, "warnings", res.warnings);
    expect(bad, bad.join("\n")).toEqual([]);
  }, 300_000);
});
