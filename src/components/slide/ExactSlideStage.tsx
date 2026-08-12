// -----------------------------------------------------------------------------
// ExactSlideStage — the canonical, unscaled 1920×1080 render of one module.
//
// This is the single source of truth for "what the slide looks like". The app's
// on-screen cards wrap the same tree in <ScaledSlide> (which only adds a CSS
// transform); the PPTX design-exact exporter mounts THIS component offscreen at
// full size and rasterizes it. Because both paths render the same element tree
// with the same providers, an export can never drift from the build.
// -----------------------------------------------------------------------------

import type { CSSProperties } from "react";

import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { packToneBrand, type StylePack } from "@/lib/style-packs";
import { STAGE_H, STAGE_W } from "@/lib/export-quality";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";

export interface ExactSlideStageProps {
  slide: unknown;
  variant: ModuleVariant;
  brand: BrandMode;
  mode: "light" | "dark";
  pack?: StylePack | null;
  pageNumber?: number;
  /**
   * Layered export: paint ONLY the decor planes (ground, scaffold, motif, grain,
   * pack sheet, backdrop) and hide the content, logo and footer planes, which
   * the PPTX exporter emits as native editable objects on top of this plate.
   */
  decorOnly?: boolean;
}

export function ExactSlideStage({
  slide,
  variant,
  brand,
  mode,
  pack = null,
  pageNumber = 1,
  decorOnly = false,
}: ExactSlideStageProps) {
  // A pack owns its mode — the look IS light or dark.
  const effMode = pack ? pack.mode : mode;
  const surface = pack
    ? pack.tokens.surface
    : effMode === "dark"
      ? "#03002C"
      : "#F2F2F2";

  return (
    <div
      data-exact-slide-stage=""
      data-decor-only={decorOnly ? "" : undefined}
      data-variant-id={variant.id}
      style={
        {
          position: "relative",
          width: STAGE_W,
          height: STAGE_H,
          overflow: "hidden",
          background: surface,
          textAlign: "left",
          // Downstream CSS keys size compensation off this; at export we are
          // always at 1:1 so the scale is exactly 1.
          "--slide-scale": 1,
        } as CSSProperties
      }
    >
      <div data-slide-stage="" style={{ position: "absolute", inset: 0 }}>
        <StylePackProvider pack={pack ?? null}>
          <StylePackVars pack={pack ?? null} className="h-full w-full">
            <SlideBackdropContext.Provider
              value={pack ? null : backdropForVariant(variant, brand.id, effMode)}
            >
              <VariantRenderer
                slide={slide as never}
                variant={variant}
                brand={packToneBrand(brand, pack)}
                pageNumber={pageNumber}
                mode={effMode}
              />
            </SlideBackdropContext.Provider>
          </StylePackVars>
        </StylePackProvider>
      </div>
    </div>
  );
}
