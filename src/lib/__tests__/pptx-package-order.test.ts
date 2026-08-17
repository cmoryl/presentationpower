/**
 * Package-ordering gate for the real exported .pptx.
 *
 * "The zip contains the expected parts" passes on packages PowerPoint refuses to
 * open — it happened twice here (THEMED_v3, _v4) and the user-visible failure is
 * a file that won't open (`invalidFileFormat`). These two orderings are
 * empirically derived and contradict the ECMA-376 schema; see the comments in
 * src/lib/pptx-presentation-order.ts.
 *
 *  1. <p:embeddedFontLst> must be the LAST child of <p:presentation>.
 *  2. <p:notesMasterIdLst> must appear AFTER <p:sldIdLst>.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { embedFontsInPptx } from "@/lib/pptx-font-embed";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import type { Deck, DeckSlide } from "@/lib/deck-store";

const brand = byId(BRAND_MODES, "bm-enterprise")!;

function deckOf(): Deck {
  return {
    id: "test-package-order",
    createdAt: new Date(0).toISOString(),
    title: "Package order gate",
    briefId: "test-brief",
    brandModeId: "bm-enterprise",
    archetypeId: "AR-PITCH",
    slides: [
      {
        id: "s-0",
        sectionId: "SF-01",
        variantId: "MV-BENTO-6",
        layoutId: "LF-14",
        content: {
          title: "Program at a glance",
          items: [
            { kind: "stat", value: "62%", unit: "%", label: "Cycle time cut" },
            { kind: "stat", value: "$107K", unit: "USD", label: "Annual saving" },
            { kind: "stat", value: "20", unit: "M words", label: "Volume" },
          ],
        },
        notes: "Speaker notes force a notes master into the package.",
      },
    ] as unknown as DeckSlide[],
  } as Deck;
}

async function presentationXml(embedFonts: boolean): Promise<string> {
  const res = await exportDeckToPptx(deckOf(), brand, { output: "blob", embedFonts });
  expect(res.blob, "export produced no package").toBeTruthy();
  const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
  return await zip.files["ppt/presentation.xml"].async("string");
}

describe("exported package ordering (PowerPoint open gate)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps embeddedFontLst as the last child of p:presentation", async () => {
    // The real font files are not served in the test runner, so the embed pass
    // is re-run over the genuine exported package with stub font bytes.
    const res = await exportDeckToPptx(deckOf(), brand, { output: "blob", embedFonts: false });
    const font = new Uint8Array(64).fill(7);
    vi.stubGlobal("fetch", async () => ({ ok: true, arrayBuffer: async () => font.buffer }));
    const embedded = await embedFontsInPptx(res.blob!, { embedFontData: true });
    const zip = await JSZip.loadAsync(await embedded.arrayBuffer());
    const xml = await zip.files["ppt/presentation.xml"].async("string");
    expect(xml, "font embedding produced no embeddedFontLst").toContain("<p:embeddedFontLst>");
    const body = xml.slice(xml.indexOf("<p:presentation"), xml.lastIndexOf("</p:presentation>"));
    const close = body.indexOf("</p:embeddedFontLst>");
    expect(close).toBeGreaterThan(-1);
    const tail = body.slice(close + "</p:embeddedFontLst>".length);
    // Nothing but whitespace may follow: any sibling after it is the
    // invalidFileFormat repair prompt.
    expect(tail.trim(), `unexpected siblings after embeddedFontLst: ${tail.trim()}`).toBe("");
  });

  it("orders notesMasterIdLst after sldIdLst", async () => {
    const xml = await presentationXml(false);
    const slides = xml.indexOf("<p:sldIdLst");
    expect(slides, "no sldIdLst in presentation.xml").toBeGreaterThan(-1);
    const notes = xml.indexOf("<p:notesMasterIdLst");
    if (notes === -1) return; // no notes master in this package — nothing to order
    expect(notes).toBeGreaterThan(slides);
  });
});
