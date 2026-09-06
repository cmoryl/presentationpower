import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CityBadge } from "@/components/next/CityBadge";
import { CITY_BADGE_DEFAULT } from "@/lib/next-city-badge";

describe("CityBadge", () => {
  it("marks the guides svg as export-ignored so it is not rasterised into the press PDF", () => {
    const html = renderToStaticMarkup(<CityBadge config={CITY_BADGE_DEFAULT} guides={true} />);
    expect(html).toContain('data-bleed-guide="true"');
    expect(html).toContain('data-export-ignore="true"');
  });
});
