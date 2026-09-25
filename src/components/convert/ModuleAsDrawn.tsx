// -----------------------------------------------------------------------------
// ModuleAsDrawn — "Use the module as drawn" in the cross-format adapter.
//
// Places the real module drawing (the same renderer the deck uses) inside the
// target's true-size frame, scaled to fit with the brand margin. This is a
// picture of the module, not rebuilt editable text — exports from this view
// are proofs.
// -----------------------------------------------------------------------------

import { forwardRef } from "react";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import type { DeckSlide } from "@/lib/deck-store";
import { BRAND_MODES, byId, MODULE_VARIANTS } from "@/lib/taxonomy";

export type ModuleAsDrawnProps = {
  variantId: string;
  content: Record<string, unknown>;
  brandId: string;
  mode?: "light" | "dark";
  /** Frame size in CSS px at true size. */
  frameW: number;
  frameH: number;
  /** Displayed width in CSS px. */
  displayWidth: number;
  /** Social frames are found by the export menu through this attribute. */
  social?: boolean;
};

export const ModuleAsDrawn = forwardRef<HTMLDivElement, ModuleAsDrawnProps>(function ModuleAsDrawn(
  { variantId, content, brandId, mode = "light", frameW, frameH, displayWidth, social },
  ref,
) {
  const variant = byId(MODULE_VARIANTS, variantId);
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
  const scale = displayWidth / frameW;
  const pad = Math.round(Math.min(frameW, frameH) * 0.06);
  // Fit the 16:9 stage inside the frame, leaving the margin on every side.
  const innerW = Math.min(frameW - pad * 2, ((frameH - pad * 2) * 16) / 9);
  const slide = {
    id: `convert-${variantId}`,
    position: 0,
    sectionId: "",
    variantId,
    layoutId: variantId,
    content,
    changes: [],
    mode,
  } as unknown as DeckSlide;
  return (
    <div style={{ width: displayWidth, height: Math.round(frameH * scale) }} className="relative overflow-hidden">
      <div
        ref={ref}
        data-print-brief-page="true"
        {...(social ? { "data-kit-asset-frame": "true" } : {})}
        data-module-as-drawn="true"
        style={{
          width: frameW,
          height: frameH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: mode === "dark" ? brand.tokens.primary : "#FFFFFF",
          display: "grid",
          placeItems: "center",
        }}
      >
        {variant ? (
          <div style={{ width: innerW, boxShadow: "0 0 0 1px rgba(3,0,44,0.08)" }}>
            <ScaledSlide>
              <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode={mode} />
            </ScaledSlide>
          </div>
        ) : (
          <p style={{ fontSize: 24, color: "#666666" }}>This module can't be drawn here.</p>
        )}
      </div>
    </div>
  );
});
