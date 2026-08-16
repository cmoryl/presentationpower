// -----------------------------------------------------------------------------
// SCENE SLIDE STAGE — a real, fully-populated deck slide for one look × section.
//
// The look catalog grid uses cheap abstract tiles (<LookPreviewTile />) because
// it paints eleven sections per look. When an admin enlarges a section they
// expect the finished article: the actual module rendered by the deck engine,
// dressed in the look, with seeded headlines, stats, charts, quotes and logos.
//
// This renders exactly what the deck editor / present / export pipeline draws:
// VariantRenderer inside a 1920×1080 ScaledSlide, wrapped in the look's pack
// context, so the enlarged preview is a true representation of the slide.
// -----------------------------------------------------------------------------

import { useMemo } from "react";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { packToneBrand, type StylePack } from "@/lib/style-packs";
import {
  BRAND_MODES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  type ModuleVariant,
} from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import type { SkinScene } from "@/lib/skin-backgrounds";

/** The module each section of a look is judged on, in scene order. */
export const SCENE_VARIANT: Record<SkinScene, string> = {
  cover: "MV-OP-COVER",
  agenda: "MV-OP-AGENDA",
  statement: "MV-INS-BIG-IDEA",
  stats: "MV-PROOF-STATS-4",
  split: "MV-IMG-SPLIT",
  bento: "MV-BENTO-5",
  chart: "MV-GRAPH-CATEGORY-BARS",
  quote: "MV-INS-QUOTE",
  timeline: "MV-PROC-TIMELINE",
  closing: "MV-CLOSE-CTA",
  section: "MV-OP-DIVIDER-NUMBERED",
};

function sectionForVariant(v: ModuleVariant): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? "SF-01";
}

export function SceneSlideStage({
  pack,
  scene,
  pageNumber = 1,
  className = "",
}: {
  pack: StylePack;
  scene: string;
  pageNumber?: number;
  className?: string;
}) {
  const brand = BRAND_MODES.find((b) => b.id === "bm-enterprise") ?? BRAND_MODES[0]!;
  const variantId = SCENE_VARIANT[scene as SkinScene] ?? SCENE_VARIANT.cover;
  const variant = byId(MODULE_VARIANTS, variantId) as ModuleVariant | undefined;
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);

  const slide = useMemo(() => {
    if (!variant) return null;
    return {
      id: `${pack.id}:${scene}`,
      position: pageNumber - 1,
      sectionId: sectionForVariant(variant),
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      // Ground seed carries the section so the look paints this scene's backdrop.
      groundSeed: `scene:${scene}`,
      content: seedDivisionContent(variant.id, brief, scene, brand),
      changes: [],
    };
  }, [pack.id, scene, variant, brief, brand, pageNumber]);

  if (!variant || !slide) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl ${className}`}
      style={{ background: pack.tokens.surface }}
      data-scene={scene}
      data-variant-id={variant.id}
    >
      <ScaledSlide>
        <StylePackProvider pack={pack}>
          <StylePackVars pack={pack} className="h-full w-full">
            <SlideBackdropContext.Provider value={null}>
              <VariantRenderer
                slide={slide as never}
                variant={variant}
                brand={packToneBrand(brand, pack)}
                pageNumber={pageNumber}
                mode={pack.mode}
              />
            </SlideBackdropContext.Provider>
          </StylePackVars>
        </StylePackProvider>
      </ScaledSlide>
    </div>
  );
}
