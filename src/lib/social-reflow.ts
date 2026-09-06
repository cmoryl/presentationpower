/**
 * SOCIAL MODULE RELAYOUT (REFLOW)
 * ---------------------------------------------------------------------------
 * Scaling a module into a social frame is not the same as designing it for
 * that frame. A three-across feature row wants to be a stacked column in a
 * story; a tall bento wants to be a condensed strip in a 1200×628 banner.
 *
 * `social-tall-layouts.ts` handles the curated cases (thin strips that get a
 * designed tall shell). This file generalises that idea to EVERY module in the
 * library: for any variant and any aspect class, pick the sibling variant in
 * the same family whose authored density matches what the shape wants, and
 * re-compose the author's copy onto it. Same family = same section kind = same
 * fields and same export path, so nothing downstream changes.
 *
 * Pure functions. The frame decides when to ask; this file decides what to.
 */

import type { PrintSection } from "@/lib/print-assets.types";
import type { AspectClass } from "@/lib/social-formats";
import {
  PRINT_SECTION_MODULES,
  type PrintModuleDensity,
  type PrintSectionModule,
} from "@/lib/print-library/section-modules";
import { applyTallPlan, isTallAspect, tallPlanFor, type SocialTallPlan } from "@/lib/social-tall-layouts";

export type SocialReflowPlan = SocialTallPlan & {
  /** Which shape asked for the relayout. */
  aspect: AspectClass;
  /** Curated pair (thin strip → tall shell) vs derived from the catalog. */
  source: "curated" | "derived";
};

/** The authored density a given shape reads best at. */
export function preferredDensity(cls: AspectClass): PrintModuleDensity {
  if (isTallAspect(cls)) return "tall";
  if (cls === "landscape-wide") return "compact";
  return "standard";
}

function moduleFor(variantId: string): PrintSectionModule | undefined {
  return PRINT_SECTION_MODULES.find((m) => m.variantId === variantId);
}

function tagOverlap(a: string[], b: string[]): number {
  const set = new Set(a);
  return b.reduce((n, t) => (set.has(t) ? n + 1 : n), 0);
}

/**
 * Best sibling for a shape: same family, wanted density, closest in intent
 * (tag overlap, then catalog order so the choice is stable and deterministic).
 */
function bestSibling(
  from: PrintSectionModule,
  want: PrintModuleDensity,
): PrintSectionModule | undefined {
  const candidates = PRINT_SECTION_MODULES.filter(
    (m) => m.family === from.family && m.density === want && m.variantId !== from.variantId,
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, m) =>
    tagOverlap(from.tags, m.tags) > tagOverlap(from.tags, best.tags) ? m : best,
  );
}

const DENSITY_NOTE: Record<PrintModuleDensity, string> = {
  tall: "restacked as a vertical composition so the copy reads down the frame",
  standard: "re-laid out at standard proportions for this frame",
  compact: "condensed to a banner-height layout",
};

/** The relayout plan for a variant in a given shape, if a better sibling exists. */
export function reflowPlanFor(
  variantId: string | undefined,
  cls: AspectClass,
): SocialReflowPlan | undefined {
  if (!variantId) return undefined;
  if (isTallAspect(cls)) {
    const curated = tallPlanFor(variantId);
    if (curated) return { ...curated, aspect: cls, source: "curated" };
  }
  const from = moduleFor(variantId);
  if (!from) return undefined;
  const want = preferredDensity(cls);
  if (from.density === want) return undefined;
  const to = bestSibling(from, want);
  if (!to) return undefined;
  return {
    from: from.variantId,
    to: to.variantId,
    note: `${from.label} ${DENSITY_NOTE[want]} (${to.label})`,
    aspect: cls,
    source: "derived",
  };
}

export type SocialReflowResult = {
  section: PrintSection;
  plan?: SocialReflowPlan;
};

/**
 * The section a social frame should actually render for a shape. When no better
 * sibling exists the original module is returned untouched — the fit ladders in
 * `social-module-fit.ts` then do the rest.
 */
export function socialReflowSection(section: PrintSection, cls: AspectClass): SocialReflowResult {
  const variantId = (section as unknown as Record<string, unknown>).variantId as string | undefined;
  const plan = reflowPlanFor(variantId, cls);
  if (!plan) return { section };
  return { section: applyTallPlan(section, plan), plan };
}
