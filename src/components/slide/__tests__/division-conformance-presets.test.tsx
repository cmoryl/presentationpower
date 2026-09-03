// ---------------------------------------------------------------------------
// PER-DIVISION CONFORMANCE PRESETS
//
// The module conformance matrix proves every variant renders for the master
// brand. This suite proves the same modules render to each DIVISION's own spec:
// the preset's look, both faces, and the palette rule for that scope (approved
// enterprise palette for TransPerfect divisions, own identity for the product
// and co-brand scopes).
// ---------------------------------------------------------------------------

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VariantRenderer } from "../VariantRenderer";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import {
  conformanceSampleIds,
  conformanceSpecIssues,
  divisionConformancePresets,
  registryOwnedVariantIds,
  UNSPECIFIED_VARIANT_IDS,
} from "@/lib/division-conformance";
import { MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

const LEAK = /\b(undefined|NaN|\[object Object\])\b/;

const variantById = new Map(MODULE_VARIANTS.map((v) => [v.id, v]));

function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function render(variant: ModuleVariant, brandModeId: string, mode: "light" | "dark"): string {
  const brand = resolveBrandMode(brandModeId);
  const brief = resolveDivisionBrief(brand);
  const slide = {
    id: `${variant.id}:${brandModeId}:${mode}`,
    position: 0,
    sectionId: "SF-01",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedDivisionContent(variant.id, brief, "Preview section", brand),
    changes: [],
    mode,
  } as DeckSlide;
  return renderToStaticMarkup(
    <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode={mode} />,
  );
}

const presets = divisionConformancePresets();

describe("per-division conformance presets", () => {
  it("derives one preset per brand scope from the module registry", () => {
    expect(presets.length).toBeGreaterThanOrEqual(10);
    // Every variant except the deliberately spec-free blank canvas has an owner.
    expect(registryOwnedVariantIds().length).toBe(
      MODULE_VARIANTS.length - UNSPECIFIED_VARIANT_IDS.length,
    );
    for (const p of presets) expect(p.moduleIds.length).toBeGreaterThan(200);
  });

  it("holds every division to its own design spec", () => {
    const issues = presets.flatMap(conformanceSpecIssues);
    expect(issues).toEqual([]);
  });

  it("keeps TransPerfect divisions on the approved enterprise palette", () => {
    for (const p of presets.filter((x) => x.enterprisePalette)) {
      expect(p.tokens.accent.toUpperCase()).toBe("#003FC7");
      expect(p.tokens.primary.toUpperCase()).toBe("#03002C");
    }
    // Product / co-brand identities keep their own accents.
    const df = presets.find((p) => p.brandModeId === "bm-product")!;
    expect(df.enterprisePalette).toBe(false);
  });

  for (const preset of presets) {
    describe(`${preset.name} (${preset.brandModeId})`, () => {
      const sample = conformanceSampleIds(preset);

      it("samples the required families", () => {
        expect(sample.length).toBe(4);
      });

      for (const id of sample) {
        for (const mode of preset.faces) {
          it(`renders ${id} in ${mode}`, () => {
            const variant = variantById.get(id)!;
            const html = render(variant, preset.brandModeId, mode);
            expect(html.length).toBeGreaterThan(200);
            expect(LEAK.test(visibleText(html))).toBe(false);
          });
        }
      }
    });
  }
});
