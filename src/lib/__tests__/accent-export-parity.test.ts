/**
 * End-to-end export-parity regression for the per-slide `accentOverride`.
 *
 * This does NOT unit-test the resolver. It runs the real `exportDeckToPptx`
 * pipeline over the NEXT 2026 palette showcase deck, unzips the produced
 * .pptx, and asserts each division's accent hex actually appears in that
 * slide's XML — proving the export honours `content.accentOverride` instead
 * of stamping the deck brand accent on every slide.
 */

import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { buildNextPaletteShowcase, NEXT_PALETTE_DIVISIONS } from "@/lib/next-palette-showcase";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import type { Deck, DeckSlide } from "@/lib/deck-store";

function deckFromShowcase(): Deck {
  const payload = buildNextPaletteShowcase();
  return {
    id: "test-showcase",
    createdAt: new Date(0).toISOString(),
    title: payload.title,
    briefId: "test-brief",
    brandModeId: payload.brandModeId as Deck["brandModeId"],
    archetypeId: payload.archetypeId,
    slides: payload.slides.map((s, i) => ({
      id: `s-${i}`,
      sectionId: s.sectionId,
      variantId: s.variantId,
      layoutId: s.layoutId,
      content: s.content,
      notes: s.notes ?? "",
    })) as DeckSlide[],
  };
}

/** Slide XML files, ordered by their numeric index (slide1.xml, slide2.xml…). */
async function slideXmls(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)![1]);
      const nb = Number(b.match(/slide(\d+)\.xml$/)![1]);
      return na - nb;
    });
  return Promise.all(names.map((n) => zip.files[n].async("string")));
}

describe("accentOverride export parity (real .pptx bytes)", () => {
  it("stamps each division accent on its own slides, not the deck brand accent", async () => {
    const deck = deckFromShowcase();
    const brand = byId(BRAND_MODES, deck.brandModeId)!;
    const brandAccent = brand.tokens.accent.replace("#", "").toUpperCase();

    const res = await exportDeckToPptx(deck, brand, { output: "blob" });
    expect(res.blob).toBeTruthy();
    expect(res.failedSlides).toEqual([]);

    const xmls = await slideXmls(res.blob!);
    expect(xmls.length).toBe(deck.slides.length);

    const report: Array<{ slide: number; division: string; accent: string; found: boolean }> = [];

    // Slide 1 is the cover (master blue). Divisions start at slide 2, two
    // slides each: numbered divider, then the pillars content module.
    NEXT_PALETTE_DIVISIONS.forEach((d, i) => {
      const accent = d.accent.replace("#", "").toUpperCase();
      const dividerIdx = 1 + i * 2; // 0-based
      const contentIdx = dividerIdx + 1;
      [dividerIdx, contentIdx].forEach((idx) => {
        const xml = xmls[idx].toUpperCase();
        const found = xml.includes(accent);
        report.push({ slide: idx + 1, division: d.name, accent, found });
      });
    });

    // eslint-disable-next-line no-console
    console.table(report);

    const missing = report.filter((r) => !r.found);
    expect(
      missing,
      `slides missing their division accent: ${missing
        .map((m) => `#${m.slide} ${m.division} ${m.accent}`)
        .join(", ")}`,
    ).toEqual([]);

    // Non-master-blue divisions must not fall back to the deck brand accent
    // as their only accent colour — i.e. the override really travelled.
    NEXT_PALETTE_DIVISIONS.forEach((d, i) => {
      const accent = d.accent.replace("#", "").toUpperCase();
      if (accent === brandAccent) return;
      const idx = 1 + i * 2;
      expect(xmls[idx].toUpperCase(), `${d.name} divider should carry ${accent}`).toContain(accent);
    });
  }, 120_000);
});
