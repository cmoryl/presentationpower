// LOGO CLAMP REGRESSION
// Container-scaled surfaces (card previews, thumbnails, print pages) must emit
// a legibility-safe ceiling on the lockup so artwork can never grow past a
// share of the card. Unscaled surfaces keep raw pixel sizing.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES } from "@/lib/taxonomy";

const brand = BRAND_MODES[0]!;
const cq = (px: number) => `calc(${((px / 850) * 100).toFixed(3)}cqw)`;

describe("BrandLockup responsive clamps", () => {
  it("clamps container-scaled lockups with min()/cqw", () => {
    const html = renderToStaticMarkup(
      <BrandLockup brand={brand} color="#03002C" size="lg" unit={cq} />,
    );
    expect(html).toContain("min(");
    expect(html).toContain("cqw");
  });

  it("honours an explicit cap override", () => {
    const html = renderToStaticMarkup(
      <BrandLockup
        brand={brand}
        color="#03002C"
        size="xl"
        unit={cq}
        cap={{ widthPct: 30, heightPct: 7 }}
      />,
    );
    expect(html).toContain("7cqw");
    expect(html).toContain("30cqw");
  });

  it("opts out when cap is false", () => {
    const html = renderToStaticMarkup(
      <BrandLockup brand={brand} color="#03002C" size="lg" unit={cq} cap={false} />,
    );
    expect(html).not.toContain("min(");
  });

  it("leaves unscaled (pixel) surfaces untouched", () => {
    const html = renderToStaticMarkup(<BrandLockup brand={brand} color="#03002C" size="lg" />);
    expect(html).not.toContain("cqw");
  });
});
