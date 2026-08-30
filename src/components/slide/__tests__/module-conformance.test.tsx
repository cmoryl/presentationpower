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
import { findSlideModule, registeredModuleFamilies, registeredModuleIds } from "../module-registry";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

const brand = resolveBrandMode("bm-enterprise");
const brief = resolveDivisionBrief(brand);
const PREVIEW_TITLE = "Preview section title";

const slideFor = (variant: ModuleVariant, mode: "light" | "dark"): DeckSlide =>
  ({
    id: `${variant.id}:${mode}`,
    position: 0,
    sectionId: "SF-01",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedDivisionContent(variant.id, brief, PREVIEW_TITLE, brand),
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
    // Exhaustive check: every variant (except blank canvas) MUST be in the registry.
    // This prevents stealth fallbacks to the legacy switch default branch.
    const unregistered = MODULE_VARIANTS.filter(
      (v) => v.id !== "MV-CANVAS-BLANK" && !findSlideModule(v.id)
    ).map((v) => v.id);

    expect(
      unregistered,
      `The following variants are missing from the module registry: \n${unregistered.join("\n")}`
    ).toEqual([]);

    expect(registeredModuleFamilies()).toContain("family:viz");
    // Timeline modules own the spine/tick furniture that kept regressing on
    // export — the registry must keep claiming them so the legacy switch can
    // never quietly take them back.
    expect(registeredModuleIds()).toContain("MV-TIMELINE-VERTICAL");
  });

  for (const mode of ["light", "dark"] as const) {
    describe(`${mode} face`, () => {
      const failures: string[] = [];
      const empties: string[] = [];
      const leaks: string[] = [];
      const missingTitle: string[] = [];

      for (const variant of MODULE_VARIANTS) {
        if (variant.id === "MV-CANVAS-BLANK") continue;

        let html = "";
        try {
          html = renderVariant(variant, mode);
        } catch (err) {
          failures.push(`${variant.id}: ${(err as Error).message}`);
          continue;
        }

        if (html.replace(/\s+/g, "").length < 40) {
          empties.push(variant.id);
        }

        const text = visibleText(html);
        if (LEAK.test(text)) {
          leaks.push(`${variant.id}: …${text.slice(0, 160)}`);
        }

        // Regression: ensure the module actually rendered the seeded content.
        // If it fell back to a default "unclaimed" branch, or if it has a
        // conditional that accidentally hides the title, this catches it.
        if (!text.includes(PREVIEW_TITLE)) {
          missingTitle.push(variant.id);
        }
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

      it("renders the seeded title (prevents empty content regressions)", () => {
        expect(missingTitle, "Variants that failed to render the preview title").toEqual([]);
      });
    });
  }
});
