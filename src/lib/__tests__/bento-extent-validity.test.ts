/**
 * PowerPoint "found a problem with content" regression — bento mosaics.
 *
 * Dense bento tiles (7–8 cells) are short, and the exporter used to reserve a
 * fixed 1.1in for the copy block. On those tiles the reserve went NEGATIVE, so
 * the slide shipped `<a:ext cy="-163576">`. `<a:ext>` is unsigned in OOXML:
 * PowerPoint rejected the slide, "repaired" the deck and collapsed the offending
 * boxes on top of each other — the broken DataForce layout users reported.
 *
 * This suite pins both halves of the fix: the bento emitter never produces an
 * illegal box, and the terminal hygiene pass clamps any that a future module
 * might introduce.
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { BRAND_MODES, byId, MODULE_VARIANTS } from "@/lib/taxonomy";
import { seedContent, type Deck, type DeckSlide } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { clampShapeExtents } from "@/lib/pptx-terminal-hygiene";

const BENTO_VARIANTS = MODULE_VARIANTS.filter((v) => /BENTO/.test(v.id)).map((v) => v.id);

function bentoDeck(mode: "light" | "dark"): Deck {
  return {
    id: `bento-extents-${mode}`,
    createdAt: new Date(0).toISOString(),
    title: "Bento extent validity",
    briefId: "bento-extents",
    brandModeId: "bm-product",
    archetypeId: "ar-overview",
    context: { stylePackId: "skin-r03" },
    slides: BENTO_VARIANTS.map((variantId, i) => ({
      id: `s-${i}`,
      sectionId: "sec-overview",
      variantId,
      layoutId: "",
      mode,
      content: seedContent(variantId, {} as never, "Overview"),
      notes: "",
    })) as DeckSlide[],
  } as Deck;
}

async function illegalExtents(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const bad: string[] = [];
  for (const name of Object.keys(zip.files)) {
    if (!/\.xml$/.test(name)) continue;
    const xml = await zip.files[name]!.async("string");
    for (const m of xml.matchAll(/<a:(ext|chExt) cx="(-?\d+)" cy="(-?\d+)"/g)) {
      const cx = Number(m[2]);
      const cy = Number(m[3]);
      if (cx === 0 && cy === 0) continue; // empty group placeholder
      if (cx <= 0 || cy <= 0) bad.push(`${name} ${m[0]}`);
    }
  }
  return bad;
}

describe("bento exports carry only legal shape extents", () => {
  for (const mode of ["dark", "light"] as const) {
    it(`emits no negative or zero boxes (${mode})`, async () => {
      const res = await exportDeckToPptx(bentoDeck(mode), byId(BRAND_MODES, "bm-product")!, {
        output: "blob",
        pack: "skin-r03",
        fidelity: "editable",
        embedFonts: false,
        forceMode: mode,
      });
      expect(res.blob).toBeTruthy();
      expect(res.failedSlides).toEqual([]);
      const bad = await illegalExtents(res.blob!);
      expect(bad, bad.join("\n")).toEqual([]);
    }, 300_000);
  }
});

describe("terminal hygiene clamps illegal extents", () => {
  it("repairs a negative height and leaves valid boxes alone", () => {
    const xml =
      '<a:ext cx="2307590" cy="-163576"/><a:ext cx="100" cy="200"/><a:chExt cx="0" cy="0"/>';
    const out = clampShapeExtents(xml);
    expect(out.fixed).toBe(1);
    expect(out.xml).toContain('cx="2307590" cy="9525"');
    expect(out.xml).toContain('<a:ext cx="100" cy="200"/>');
    expect(out.xml).toContain('<a:chExt cx="0" cy="0"/>');
  });
});
