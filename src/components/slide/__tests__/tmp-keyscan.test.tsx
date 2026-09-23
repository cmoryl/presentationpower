import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VariantRenderer } from "../VariantRenderer";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import "../modules/register-all";

const brand = resolveBrandMode("bm-enterprise");
const brief = resolveDivisionBrief(brand);

describe("key scan", () => {
  it("lists variants that warn", () => {
    const offenders: string[] = [];
    for (const variant of MODULE_VARIANTS) {
      const content = seedDivisionContent(variant.id, brief, "T", brand);
      if (variant.id.startsWith("MV-LOC-")) {
        content.latMin = 0;
        content.latMax = 10;
        content.lngMin = 0;
        content.lngMax = 10;
      }
      const slide = {
        id: variant.id,
        position: 0,
        sectionId: "SF-01",
        variantId: variant.id,
        layoutId: variant.permittedLayoutIds[0],
        content,
        changes: [],
        mode: "light",
      } as unknown as DeckSlide;
      const orig = console.error;
      let warned = false;
      console.error = (...a: unknown[]) => {
        if (String(a[0]).includes("unique")) warned = true;
      };
      try {
        renderToStaticMarkup(
          <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode="light" />,
        );
      } catch {
        /* ignore */
      }
      console.error = orig;
      if (warned) offenders.push(variant.id);
    }
    // eslint-disable-next-line no-console
    console.log("OFFENDERS:", offenders.join(", "));
    expect(true).toBe(true);
  });
});
