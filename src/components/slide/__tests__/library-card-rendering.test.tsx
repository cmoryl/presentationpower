import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VariantRenderer } from "../VariantRenderer";
import { ScaledSlide } from "../ScaledSlide";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import "../modules/register-all";

const brand = resolveBrandMode("bm-enterprise");
const brief = resolveDivisionBrief(brand);

describe("library card rendering", () => {
  it("renders a variant inside the library card context (thumbnail + scaled)", () => {
    // Use a standard bar chart that definitely renders content
    const variant = MODULE_VARIANTS.find((v) => v.id === "MV-GRAPH-CATEGORY-BARS")!;
    const content = seedDivisionContent(variant.id, brief, "Audit", brand);
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
          <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} />
        </ScaledSlide>
      </SlideThumbnailContext.Provider>,
    );

    // Verify seeded content made it to the output. The third argument to
    // seedDivisionContent is a section name, not a marker injected into copy,
    // so assert against real seeded strings instead of a sentinel token.
    const seededText = [content.title, content.headline, content.kicker].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 3,
    );
    expect(seededText.length).toBeGreaterThan(0);
    for (const text of seededText) expect(html).toContain(text);
    // Verify ScaledSlide wrappers are present
    expect(html).toContain("data-slide-stage");
  });

  it("survives missing optional props in library view", () => {
    const variant = MODULE_VARIANTS[0]!;
    const slide = {
      variantId: variant.id,
      content: {},
    } as unknown as DeckSlide;

    expect(() =>
      renderToStaticMarkup(
        <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} />,
      ),
    ).not.toThrow();
  });
});
