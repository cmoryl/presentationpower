// First family extracted onto the module registry: the spec-driven
// `MV-VIZ-*` infographics. It renders through the InfographicSpec pipeline
// rather than bespoke JSX, so it has no dependency on the legacy switch's
// locals — which makes it the safest proof that the seam holds.

import type { DeckSlide } from "@/lib/deck-store";
import { InfographicSlideModule } from "../InfographicSlideModule";
import { registerSlideModule } from "../module-registry";

registerSlideModule({
  id: "family:viz",
  match: (variantId) => variantId.startsWith("MV-VIZ-"),
  render: ({ slide, variant, brand, pageNumber, mode }) => (
    <InfographicSlideModule
      slide={slide as DeckSlide}
      variant={variant}
      brand={brand}
      pageNumber={pageNumber}
      mode={mode}
    />
  ),
});
