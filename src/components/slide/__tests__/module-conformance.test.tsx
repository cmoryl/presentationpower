import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VariantRenderer } from "../VariantRenderer";
import { findSlideModule, registeredModuleIds } from "../module-registry";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

// Families register themselves on import in VariantRenderer, 
// but for the test we ensure the side-effect barrel is loaded.
import "../modules/register-all";

const brand = resolveBrandMode("bm-enterprise");
const brief = resolveDivisionBrief(brand);
const PREVIEW_TOKEN = "PREVIEW_TOKEN";

const slideFor = (variant: ModuleVariant, mode: "light" | "dark"): DeckSlide => {
  const content = seedDivisionContent(variant.id, brief, PREVIEW_TOKEN, brand);
  
  // Regression guard: map variants require bounds or they throw during render.
  if (variant.id.startsWith("MV-LOC-")) {
    content.latMin = content.latMin ?? 0;
    content.latMax = content.latMax ?? 10;
    content.lngMin = content.lngMin ?? 0;
    content.lngMax = content.lngMax ?? 10;
  }

  return {
    id: `${variant.id}:${mode}`,
    position: 0,
    sectionId: "SF-01",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content,
    changes: [],
    mode,
  } as DeckSlide;
};

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

  it("claims every variant in the registry (except blank canvas)", () => {
    const unregistered = MODULE_VARIANTS.filter(
      (v) => v.id !== "MV-CANVAS-BLANK" && !findSlideModule(v.id)
    ).map((v) => v.id);

    expect(unregistered, "All functional variants must be registered to avoid legacy fallbacks").toEqual([]);
  });

  for (const mode of ["light", "dark"] as const) {
    describe(`${mode} face`, () => {
      const failures: string[] = [];
      const empties: string[] = [];
      const leaks: string[] = [];

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
