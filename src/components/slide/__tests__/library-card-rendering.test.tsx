import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VariantRenderer } from "../VariantRenderer";
import { ScaledSlide } from "../ScaledSlide";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { byId, MODULE_VARIANTS } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

const brand = resolveBrandMode("bm-enterprise");
const brief = resolveDivisionBrief(brand);

describe("library card rendering", () => {
  it("renders a variant inside the library card context (thumbnail + scaled)", () => {
    const variant = MODULE_VARIANTS.find(v => v.id === "MV-VIZ-BARS-VERTICAL")!;
    const content = seedDivisionContent(variant.id, brief, "Library Preview", brand);
    const slide: DeckSlide = {
      id: "test-card",
      position: 0,
      sectionId: "SEC-01",
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content,
      changes: [],
    };

    const html = renderToStaticMarkup(
      <SlideThumbnailContext.Provider value={true}>
        <ScaledSlide>
          <VariantRenderer
            slide={slide}
            variant={variant}
            brand={brand}
            pageNumber={1}
          />
        </ScaledSlide>
      </SlideThumbnailContext.Provider>
    );

    expect(html).toContain("Library Preview");
    // Ensure ScaledSlide wrapper is present (it adds a div with transform or data attribute)
    expect(html).toContain("data-scaled-slide");
  });

  it("survives missing optional props in library view", () => {
    // Gallery cards often render with minimal slide data
    const variant = MODULE_VARIANTS[0]!;
    const slide: any = {
      variantId: variant.id,
      content: {}, // empty content
    };

    expect(() => renderToStaticMarkup(
      <VariantRenderer
        slide={slide}
        variant={variant}
        brand={brand}
        pageNumber={1}
      />
    )).not.toThrow();
  });
});
