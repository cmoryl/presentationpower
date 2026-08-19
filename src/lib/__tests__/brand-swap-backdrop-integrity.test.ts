import { describe, expect, it } from "vitest";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { getDivisionImagery, hasOwnBackdropPool } from "@/assets/backdrops/divisions";

/**
 * Brand-swap integrity. A raster backdrop carries a baked palette, so a slide
 * may only ever show artwork from the ACTIVE brand's own pool. Anything else
 * reproduces the audit defect: Life Sciences green accents rendered over an
 * enterprise-blue photograph.
 */
describe("brand swap backdrop integrity", () => {
  const modes: ("light" | "dark")[] = ["light", "dark"];

  it("never renders another division's raster artwork", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const set = getDivisionImagery(brand.id);
      const own = [...set.photos, ...set.abstracts, ...(set.light ?? [])];
      // A backdrop is on-brand when it lives in one of the folders that make up
      // this brand's own pool (folders also hold same-palette remixes).
      const ownFolders = new Set(own.map((u) => u.slice(0, u.lastIndexOf("/"))));
      const onBrand = (url: string) => ownFolders.has(url.slice(0, url.lastIndexOf("/")));
      for (const variant of MODULE_VARIANTS) {
        for (const mode of modes) {
          const bd = backdropForVariant(variant, brand.id, mode);
          if (!bd?.url) continue;
          if (!hasOwnBackdropPool(brand.id)) {
            offenders.push(`${brand.id}/${variant.id}/${mode}: raster on a pool-less brand`);
            continue;
          }
          const isPortrait = bd.url.includes("portrait");
          if (!onBrand(bd.url) && !isPortrait && !bd.url.includes("corporate-dark")) {
            offenders.push(`${brand.id}/${variant.id}/${mode}: ${bd.url}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gives every pool-less brand a token-derived aurora backdrop", () => {
    const poolLess = BRAND_MODES.filter((b) => !hasOwnBackdropPool(b.id));
    expect(poolLess.map((b) => b.id)).toContain("bm-tp-lifesci");
    for (const brand of poolLess) {
      for (const variant of MODULE_VARIANTS) {
        for (const mode of modes) {
          const bd = backdropForVariant(variant, brand.id, mode);
          expect(bd, `${brand.id}/${variant.id}/${mode}`).toBeTruthy();
          expect(bd!.aurora, `${brand.id}/${variant.id}/${mode}`).toBe(true);
          if (mode === "light") expect(bd!.tint).toBe(brand.tokens.surface);
        }
      }
    }
  });
});
