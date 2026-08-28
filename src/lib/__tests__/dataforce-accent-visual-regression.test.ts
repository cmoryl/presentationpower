/**
 * DATAFORCE GREEN ACCENT — PREVIEW ↔ EXPORT VISUAL REGRESSION
 *
 * The AI · Data Signature look (R03) is DataForce's own template, so:
 *   - structure (rules, bands, box tops, numerals) leads in DataForce Green
 *   - icons/glyphs stay DataForce Blue
 *   - the legacy generic "AI blue" accent must never come back
 *
 * The module preview renderer and the PPTX exporter resolve their accents
 * through the SAME two helpers (`packToneBrand` + `lookGlyphColor`). This suite
 * pins both seams and then proves the promise on real exported .pptx bytes, so
 * a drift on either side fails loudly instead of showing up as a green preview
 * with a blue export.
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { packToneBrand, stylePackById } from "@/lib/style-packs";
import { lookBrandModeId, lookGlyphColor } from "@/lib/look-brand";
import { BRAND_MODES, byId, MODULE_VARIANTS } from "@/lib/taxonomy";
import { seedContent, type Deck, type DeckSlide } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";

const DF_GREEN = "7BCD3A";
const DF_BLUE = "139DD8";
/** The generic AI accent R03 used before the DataForce hand-off. */
const LEGACY_BLUE = "49A8FF";

const PACK_ID = "skin-r03";

/** Modules that paint accent structure and icon glyphs — the pipeline's blast radius. */
const SAMPLE_VARIANT_COUNT = 3;

function pack() {
  const p = stylePackById(PACK_ID);
  expect(p, `missing style pack ${PACK_ID}`).toBeTruthy();
  return p!;
}

function hex(v: string) {
  return v.replace(/^#/, "").toUpperCase();
}

describe("DataForce accent pipeline — preview side", () => {
  it("R03 is owned by DataForce", () => {
    expect(lookBrandModeId(PACK_ID)).toBe("bm-product");
    expect(lookBrandModeId("tpl-r03")).toBe("bm-product");
  });

  it("leads in DataForce Green from every brand scope, never the legacy blue", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const toned = packToneBrand(brand, pack());
      if (hex(toned.tokens.primary) !== DF_GREEN)
        offenders.push(`${brand.id}: primary ${toned.tokens.primary}`);
      if (hex(toned.tokens.accent) !== DF_GREEN)
        offenders.push(`${brand.id}: accent ${toned.tokens.accent}`);
      if ([toned.tokens.primary, toned.tokens.accent].some((c) => hex(c) === LEGACY_BLUE))
        offenders.push(`${brand.id}: legacy blue returned`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("keeps glyphs in DataForce Blue", () => {
    expect(hex(lookGlyphColor(PACK_ID)!)).toBe(DF_BLUE);
    expect(hex(lookGlyphColor("tpl-r03")!)).toBe(DF_BLUE);
    // Other looks follow their own accent — no global blue override.
    expect(lookGlyphColor("skin-s01")).toBeNull();
  });

  it("does not repaint any other look's accent", () => {
    const s01 = stylePackById("skin-s01")!;
    const toned = packToneBrand(byId(BRAND_MODES, "bm-enterprise")!, s01);
    expect(hex(toned.tokens.primary)).not.toBe(DF_GREEN);
  });
});

describe("DataForce accent pipeline — exported .pptx bytes", () => {
  const variants = MODULE_VARIANTS.slice(0, SAMPLE_VARIANT_COUNT);

  function deckFor(brandModeId: string): Deck {
    return {
      id: `df-accent-${brandModeId}`,
      createdAt: new Date(0).toISOString(),
      title: "DataForce accent regression",
      briefId: "df-accent-brief",
      brandModeId: brandModeId as Deck["brandModeId"],
      archetypeId: "ar-overview",
      context: { stylePackId: PACK_ID },
      slides: variants.map((v, i) => ({
        id: `s-${i}`,
        sectionId: "sec-overview",
        variantId: v.id,
        layoutId: "",
        content: seedContent(v.id, {} as never, "Overview"),
        notes: "",
      })) as DeckSlide[],
    } as Deck;
  }

  async function slideXml(blob: Blob): Promise<string> {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const parts = await Promise.all(names.map((n) => zip.files[n]!.async("string")));
    return parts.join("\n").toUpperCase();
  }

  // Both scopes must export identically: the look owns the accent, not the
  // active brand picker.
  for (const brandModeId of ["bm-product", "bm-enterprise"]) {
    it(`exports DataForce Green structure and no legacy blue (scope ${brandModeId})`, async () => {
      const deck = deckFor(brandModeId);
      const brand = byId(BRAND_MODES, brandModeId)!;
      const res = await exportDeckToPptx(deck, brand, {
        output: "blob",
        pack: PACK_ID,
        fidelity: "editable",
        embedFonts: false,
      });
      expect(res.blob, "exporter produced no bytes").toBeTruthy();
      expect(res.failedSlides).toEqual([]);

      const xml = await slideXml(res.blob!);
      expect(xml.includes(DF_GREEN), "DataForce Green missing from exported slides").toBe(true);
      expect(xml.includes(LEGACY_BLUE), "legacy AI blue leaked back into the export").toBe(false);
    }, 120_000);
  }
});
