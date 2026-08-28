// ---------------------------------------------------------------------------
// Module conformance matrix.
//
// Every module in the taxonomy is rendered through the real renderer, in both
// faces, with the same division-seeded content the library preview cards use.
// This is the net that the recurring "one module regressed when another was
// fixed" bugs kept slipping through: previously nothing rendered all 200+
// variants in one pass, so a broken branch only surfaced when a human opened
// that card.
//
// Assertions are deliberately shape-level (never pixel-level), so the matrix
// stays useful while families migrate onto the module registry:
//   1. it renders at all — no throw,
//   2. it emits real markup — not an empty fragment,
//   3. it never leaks placeholder junk — literal `undefined` / `NaN` / `[object
//      Object]` in visible text means a content path is mis-keyed.
// ---------------------------------------------------------------------------

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VariantRenderer } from "../VariantRenderer";
import { registeredModuleFamilies, registeredModuleIds } from "../module-registry";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

const brand = resolveBrandMode("bm-enterprise");
const brief = resolveDivisionBrief(brand);

const slideFor = (variant: ModuleVariant, mode: "light" | "dark"): DeckSlide =>
  ({
    id: `${variant.id}:${mode}`,
    position: 0,
    sectionId: "SF-01",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedDivisionContent(variant.id, brief, "Preview section", brand),
    changes: [],
    mode,
  }) as DeckSlide;

function renderVariant(variant: ModuleVariant, mode: "light" | "dark"): string {
  return renderToStaticMarkup(
    <VariantRenderer
      slide={slideFor(variant, mode)}
      variant={variant}
      brand={brand}
      pageNumber={1}
      mode={mode}
    />,
  );
}

/** Visible text only — attribute values legitimately contain other tokens. */
function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LEAK = /\b(undefined|NaN|\[object Object\])\b/;

describe("module conformance matrix", () => {
  it("covers the whole taxonomy", () => {
    expect(MODULE_VARIANTS.length).toBeGreaterThan(200);
  });

  it("keeps the extracted families registered", () => {
    expect(registeredModuleFamilies()).toContain("family:viz");
    // Timeline modules own the spine/tick furniture that kept regressing on
    // export — the registry must keep claiming them so the legacy switch can
    // never quietly take them back.
    expect(registeredModuleIds()).toContain("MV-TIMELINE-VERTICAL");
    // Bento mosaics: the media cells must keep a single alpha scrim, so all four
    // densities stay under one owner in `modules/bento.tsx`.
    for (const id of ["MV-BENTO-5", "MV-BENTO-6", "MV-BENTO-7", "MV-BENTO-8"]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Quote family: one owner for the oversized mark + accent rule furniture.
    for (const id of ["MV-QUOTE-MULTI", "MV-QUOTE-PORTRAIT", "MV-QUOTE-CARD", "MV-QUOTE-METRIC", "MV-QUOTE-POSTER"]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Logo walls: the mark-resolution rules (and "logo wins over client name")
    // stay under `modules/logos.tsx`.
    for (const id of [
      "MV-PROOF-LOGOS",
      "MV-CASE-LOGO-GRID",
      "MV-PROOF-LOGOS-STRIP",
      "MV-PROOF-LOGOS-MARQUEE",
      "MV-PROOF-LOGOS-FEATURED",
      "MV-PROOF-LOGOS-CATEGORIZED",
      "MV-PROOF-LOGOS-MOSAIC",
    ]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Closing family: the shared `variant="close"` frame + aurora furniture.
    for (const id of [
      "MV-CLOSE-CTA",
      "MV-CLOSE-THANKS",
      "MV-CLOSE-QNA",
      "MV-CLOSE-CONTACT",
      "MV-CLOSE-TIMELINE",
      "MV-CLOSE-DUAL-CTA",
      "MV-CLOSE-METRIC-PROMISE",
    ]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Process family: step rails, chains and spotlights.
    for (const id of [
      "MV-PROC-TIMELINE",
      "MV-PROC-STEP-CHAIN",
      "MV-PROC-PHASES",
      "MV-PROC-STEP-SPOTLIGHT",
      "MV-PROC-STAGE-ORBITS",
      "MV-PROC-BEFORE-AFTER",
      "MV-PROC-ARC-FLOW",
      "MV-PROC-TIMELINE-RAIL",
      "MV-PROC-JOURNEY-VERTICAL",
      "MV-PROC-SWIMLANE-FLOW",
      "MV-PROC-LAYER-STACK",
      "MV-PROC-PROOF-PAIRS",
      "MV-PROC-PLATFORM-LOOP",
      "MV-PROC-BEFORE-AFTER-SPLIT",
    ]) {

      expect(registeredModuleIds()).toContain(id);
    }
    // Image-forward family: media framing, scrims and captions.
    for (const id of [
      "MV-IMG-FULL-BLEED",
      "MV-IMG-SPLIT",
      "MV-IMG-CAPTION",
      "MV-IMG-GRID-3",
      "MV-IMG-GRID-6",
      "MV-IMG-PORTRAIT",
      "MV-IMG-QUOTE-BG",
      "MV-IMG-BEFORE-AFTER",
      "MV-IMG-STAT-CALLOUT",
      "MV-IMG-STRIP",
      "MV-IMG-MATRIX-4",
      "MV-IMG-MATRIX-6",
    ]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Dashboard family: aurora metric decks, gauges and breakdowns.
    for (const id of [
      "MV-DASH-SUMMARY",
      "MV-DASH-DONUT-TRIO",
      "MV-DASH-SALES-CHART",
      "MV-DASH-GAUGE-ROW",
      "MV-DASH-PERFORMANCE",
      "MV-DASH-REPORT-CARDS",
      "MV-DASH-GROWTH-COLUMNS",
      "MV-DASH-BREAKDOWN",
      "MV-DASH-REGION-STATS",
    ]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Opening family: covers, dividers and agendas own the cover chrome.
    for (const id of [
      "MV-OP-COVER",
      "MV-OP-COVER-MEDIA",
      "MV-OP-COVER-MINIMAL",
      "MV-OP-DIVIDER",
      "MV-OP-DIVIDER-NUMBERED",
      "MV-OP-AGENDA",
      "MV-OP-AGENDA-VERTICAL",
      "MV-OP-COVER-EDITORIAL",
      "MV-OP-COVER-SPLIT",
      "MV-OP-COVER-POSTER",
      "MV-OP-COVER-GRID",
      "MV-OP-COVER-DOSSIER",
      "MV-OP-COVER-GRADIENT",
      "MV-OP-COVER-MONOGRAM",
      "MV-OP-COVER-STACKED",
    ]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Stat family: numerals + orbit ring furniture stay under `modules/stat.tsx`.
    for (const id of ["MV-STAT-HERO-NUMBER", "MV-STAT-ORBIT", "MV-STAT-KPI-RAIL", "MV-STAT-PORTRAIT-PROOF"]) {
      expect(registeredModuleIds()).toContain(id);
    }
    // Graph family: charts must keep drawing through `charts.tsx` +

    // `chart-primitives.tsx` so the build and the PPTX export share geometry.
    for (const id of [
      "MV-GRAPH-YEAR-SERIES",
      "MV-GRAPH-AXIS-BARS",
      "MV-GRAPH-CATEGORY-BARS",
      "MV-GRAPH-RINGS",
      "MV-GRAPH-LINE-MULTI",
      "MV-GRAPH-STACKED-BAR",
      "MV-GRAPH-WATERFALL",
      "MV-GRAPH-COMBO",
    ]) {
      expect(registeredModuleIds()).toContain(id);
    }
  });





  for (const mode of ["light", "dark"] as const) {
    describe(`${mode} face`, () => {
      const failures: string[] = [];
      const empties: string[] = [];
      const leaks: string[] = [];

      for (const variant of MODULE_VARIANTS) {
        let html = "";
        try {
          html = renderVariant(variant, mode);
        } catch (err) {
          failures.push(`${variant.id}: ${(err as Error).message}`);
          continue;
        }
        if (html.replace(/\s+/g, "").length < 40) empties.push(variant.id);
        const text = visibleText(html);
        if (LEAK.test(text)) leaks.push(`${variant.id}: …${text.slice(0, 160)}`);
      }

      it("renders every variant without throwing", () => {
        expect(failures).toEqual([]);
      });

      it("emits real markup for every variant", () => {
        expect(empties).toEqual([]);
      });

      it("leaks no placeholder tokens into visible copy", () => {
        expect(leaks).toEqual([]);
      });
    });
  }
});
