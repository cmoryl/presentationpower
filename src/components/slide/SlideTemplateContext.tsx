// Per-slide template treatment, published to the render tree.
//
// `resolveSlideTemplate` merges the section-template library default for a
// slide's (industry × section × level) cell with the slide's own override. The
// numbers it returns are needed in two very different places — the type scale
// feeds the open-space fill pass (VariantRenderer), and the backdrop scene is
// consumed deep inside the chrome (SlideFrame) — so the resolved treatment
// travels as context rather than being threaded through every prop chain.
//
// Always safe to read: with no provider, consumers fall back to their existing
// deterministic behaviour, which is exactly the library default.
import * as React from "react";
import type { ResolvedSlideTemplate } from "@/lib/section-templates";
import type { FillScale } from "@/lib/open-space-fill";

const SlideTemplateContext = React.createContext<ResolvedSlideTemplate | null>(null);

export function SlideTemplateProvider({
  template,
  children,
}: {
  template: ResolvedSlideTemplate | null;
  children: React.ReactNode;
}) {
  return (
    <SlideTemplateContext.Provider value={template}>{children}</SlideTemplateContext.Provider>
  );
}

// Deck-level industry recipe (R01…R30) — the library axis that decides which
// curated cell a slide's section resolves to. Provided once per deck surface so
// the renderer and the inspector agree on the baseline being overridden.
const TemplateIndustryContext = React.createContext<string | null>(null);

export function SlideTemplateIndustryProvider({
  industryId,
  children,
}: {
  industryId?: string | null;
  children: React.ReactNode;
}) {
  return (
    <TemplateIndustryContext.Provider value={industryId ?? null}>
      {children}
    </TemplateIndustryContext.Provider>
  );
}

export function useTemplateIndustry(): string | null {
  return React.useContext(TemplateIndustryContext);
}

/** The active resolved treatment, or null when no deck context supplied one. */
export function useSlideTemplate(): ResolvedSlideTemplate | null {
  return React.useContext(SlideTemplateContext);
}

/**
 * Backdrop scene for the active slide, when the treatment names one. Null means
 * "keep the deterministic seed-derived scene" (the library default path).
 */
export function useSlideTemplateScene() {
  const t = useSlideTemplate();
  if (!t) return null;
  return t.overridden.includes("scene") || t.overridden.includes("level") ? t.scene : null;
}

/**
 * Fill-axis multipliers for a resolved treatment: the author's px type scale
 * expressed as ratios against the library baseline. Only axes the author moved
 * are returned, so an untouched slide passes `null` and the fill pass runs
 * exactly as before.
 */
export function templateFillOverride(
  template: ResolvedSlideTemplate | null,
): Partial<Record<keyof FillScale, number>> | null {
  if (!template || template.overridden.length === 0) return null;
  const out: Partial<Record<keyof FillScale, number>> = {};
  if (template.overridden.includes("display")) out.display = template.typeRatio.display;
  if (template.overridden.includes("body")) {
    out.body = template.typeRatio.body;
    // Kickers and labels are body-family text; move them at half the rate so a
    // body bump doesn't drag eyebrow copy and chart ticks along at full size.
    out.kicker = 1 + (template.typeRatio.body - 1) * 0.5;
    out.label = 1 + (template.typeRatio.body - 1) * 0.35;
  }
  if (template.overridden.includes("figure")) out.figure = template.typeRatio.figure;
  return Object.keys(out).length > 0 ? out : null;
}
