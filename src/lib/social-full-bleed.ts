/**
 * SOCIAL FULL-BLEED PORTRAIT LAYOUTS
 * ---------------------------------------------------------------------------
 * Two library modules are photographic/hardware-led rather than typographic:
 * the Photo Fade hero and the Desktop Monitor showcase. Both are authored for
 * a printed sheet, where the picture feathers into the page stock and the
 * monitor sits centred inside the type area. Dropped into a square, portrait
 * or story frame they read as a small object floating on paper — the relief /
 * growth / air ladders can only scale them, never re-compose them.
 *
 * This file gives each one a designed FULL-BLEED portrait composition:
 *
 *   photo   the photograph leaves the type area entirely and covers the frame
 *           edge to edge, with a ground-up scrim; the module's own band is
 *           collapsed and its copy is anchored in the lower zone, over the
 *           picture, where a story post expects it.
 *
 *   device  the chassis is over-scanned past the safe rect so the screen
 *           breaks both side edges on a brand ground, headline above and
 *           caption below, dead-centred in the frame.
 *
 * Pure geometry + a section transform. The frame decides when to ask; nothing
 * here mutates the print modules, so landscape/banner and print output are
 * untouched.
 */

import type { PrintSection } from "@/lib/print-assets.types";
import type { AspectClass, SocialFormat } from "@/lib/social-formats";
import { isTallAspect } from "@/lib/social-tall-layouts";

export type SocialFullBleedKind = "photo" | "device";

export type SocialFullBleedPlan = {
  /** Variant this composition belongs to. */
  variantId: string;
  kind: SocialFullBleedKind;
  /**
   * Share of frame height the module's copy zone occupies (photo kind), or the
   * share of frame height the composition may use (device kind).
   */
  contentPct: number;
  /** Horizontal over-scan of the content box, as a multiple of frame width. */
  overscan: number;
  /** Why, in the studio's own words. */
  note: string;
};

export const SOCIAL_FULL_BLEED_PLANS: SocialFullBleedPlan[] = [
  {
    variantId: "hero-photo-fade",
    kind: "photo",
    contentPct: 0.46,
    overscan: 1,
    note: "Photo fade opener re-composed full-bleed: picture covers the frame, title anchored in the lower scrim",
  },
  {
    variantId: "device-monitor-showcase",
    kind: "device",
    contentPct: 0.86,
    overscan: 1.16,
    note: "Monitor over-scanned past the trim on a brand ground so the screen breaks both edges",
  },
];

export function fullBleedPlanFor(
  variantId: string | undefined,
  cls: AspectClass,
): SocialFullBleedPlan | undefined {
  if (!variantId || !isTallAspect(cls)) return undefined;
  return SOCIAL_FULL_BLEED_PLANS.find((p) => p.variantId === variantId);
}

export type SocialFullBleedGeometry = {
  kind: SocialFullBleedKind;
  /** Content box, in frame px — the module is scaled into this. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Where the ground-up scrim starts, as a share of frame height (photo). */
  scrimStart: number;
  /** Composed height for the fill reading — a full-bleed frame is always full. */
  composedHeight: number;
};

/**
 * Content box for a full-bleed composition. `safe` is the platform-safe rect;
 * the plate itself always covers the whole frame.
 */
export function fullBleedGeometry(
  format: SocialFormat,
  plan: SocialFullBleedPlan,
  safe: { left: number; top: number; width: number; height: number },
): SocialFullBleedGeometry {
  const width = Math.round(Math.min(format.width * plan.overscan, format.width * 1.3));
  const left = Math.round((format.width - width) / 2);
  if (plan.kind === "photo") {
    const height = Math.round(format.height * plan.contentPct);
    // Copy sits above the brand lockup, not on it.
    const lockup = Math.round(safe.left * 1.9);
    return {
      kind: plan.kind,
      left: Math.max(left, safe.left),
      top: format.height - lockup - height,
      width: Math.min(width, safe.width),
      height,
      scrimStart: 0.3,
      composedHeight: format.height,
    };
  }
  const height = Math.round(format.height * plan.contentPct);
  return {
    kind: plan.kind,
    left,
    top: Math.round((format.height - height) / 2),
    width,
    height,
    scrimStart: 0.55,
    composedHeight: format.height,
  };
}

type Loose = Record<string, unknown>;

/**
 * The section a full-bleed composition renders. The photo kind collapses the
 * module's own photo band (the plate behind it now carries the picture) and
 * reverses its type onto the scrim; the device kind is unchanged.
 */
export function fullBleedSection(section: PrintSection, plan: SocialFullBleedPlan): PrintSection {
  if (plan.kind !== "photo") return section;
  const src = section as unknown as Loose;
  return { ...src, heightPct: 2 } as unknown as PrintSection;
}

/** Ink the composition's copy must use (photo kind always reverses out). */
export function fullBleedMode(
  plan: SocialFullBleedPlan,
  mode: "light" | "dark",
): "light" | "dark" {
  return plan.kind === "photo" ? "dark" : mode;
}
