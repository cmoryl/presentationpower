// -----------------------------------------------------------------------------
// SECTION MOTION GROUNDS — the video treatments a section background can use.
//
// A section can keep its authored CSS ground, swap in a still picture, or run an
// approved brand clip behind the module. The three treatments below mirror the
// module video variants a deck can actually render (see variant-media.ts and
// video-slide-examples.ts), so what an admin picks here maps 1:1 to a real
// slide variant downstream:
//
//   cover        → MV-OP-COVER-MEDIA     (title over motion, bottom scrim)
//   full-bleed   → MV-IMG-FULL-BLEED     (edge-to-edge motion, light scrim)
//   quote-motion → MV-IMG-QUOTE-BG       (heavy scrim so a quote stays legible)
//
// Clips come from the brand motion library, so only approved assets — today the
// DataForce hero loop — are selectable.
// -----------------------------------------------------------------------------

import { BRAND_VIDEOS, type BrandVideo } from "./brand-videos";
import type { TemplateBackgroundOverride } from "./template-registry";

export type MotionVariant = NonNullable<TemplateBackgroundOverride["videoVariant"]>;

export type MotionTreatment = {
  id: MotionVariant;
  label: string;
  hint: string;
  /** Module variant this treatment maps to when the section renders a slide. */
  variantId: string;
  /** Scrim painted over the clip, front → back CSS layer order. */
  scrim: string;
};

export const MOTION_TREATMENTS: MotionTreatment[] = [
  {
    id: "cover",
    label: "Cover",
    hint: "Title over motion with a bottom scrim",
    variantId: "MV-OP-COVER-MEDIA",
    scrim: "linear-gradient(to top, rgba(3,0,44,0.78) 0%, rgba(3,0,44,0.18) 55%, transparent 100%)",
  },
  {
    id: "full-bleed",
    label: "Full-bleed",
    hint: "Edge-to-edge motion, barely veiled",
    variantId: "MV-IMG-FULL-BLEED",
    scrim: "linear-gradient(180deg, rgba(3,0,44,0.22) 0%, rgba(3,0,44,0.34) 100%)",
  },
  {
    id: "quote-motion",
    label: "Quote over motion",
    hint: "Heavier scrim so a quote stays legible",
    variantId: "MV-IMG-QUOTE-BG",
    scrim: "linear-gradient(180deg, rgba(3,0,44,0.62) 0%, rgba(3,0,44,0.72) 100%)",
  },
];

export function motionTreatment(id: string | null | undefined): MotionTreatment | null {
  if (!id) return null;
  return MOTION_TREATMENTS.find((t) => t.id === id) ?? null;
}

/** Every approved clip an admin may put behind a section. */
export function selectableMotionClips(): BrandVideo[] {
  return BRAND_VIDEOS;
}

export function motionClipByUrl(url: string | null | undefined): BrandVideo | null {
  if (!url) return null;
  return BRAND_VIDEOS.find((v) => v.url === url) ?? null;
}

/** True when the override runs a clip behind the section. */
export function hasMotionGround(o: TemplateBackgroundOverride | null | undefined): boolean {
  return !!o?.videoUrl && !!o.videoVariant;
}
