/**
 * Auto-hero fallback for print templates that don't have a curated
 * `content.heroMedia`. Both Spotlight and Adaptor Brief now render with an
 * image-based hero band by default; when a user hasn't picked a specific
 * photo, we auto-select a deterministic image from the active division's
 * curated photography pool (see src/assets/backdrops/divisions).
 *
 * Deterministic per (brandId, seed) so previews and exports match.
 */

import type { PrintHeroMedia } from "@/lib/print-assets.types";
import { getDivisionImagery } from "@/assets/backdrops/divisions";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Deterministic image URL from a division's PHOTO pool (not abstracts —
 * hero surfaces should feel human/editorial). Falls back to the enterprise
 * set when a brand id is unknown, matching getDivisionImagery's behavior.
 */
export function pickDivisionHeroPhoto(brandId: string, seedStr: string): string {
  const set = getDivisionImagery(brandId);
  const pool = set.photos.length > 0 ? set.photos : set.abstracts;
  return pool[hashSeed(seedStr) % pool.length];
}

/**
 * Synthesize a `PrintHeroMedia` config from a division photo when the
 * template content has no heroMedia. Tuned to feel like a soft editorial
 * band: accent wash + bottom scrim so hero copy stays legible against any
 * photograph in the pool.
 */
export function autoHeroMedia(
  brandId: string,
  seedStr: string,
  mode: "light" | "dark",
): PrintHeroMedia {
  return {
    imageUrl: pickDivisionHeroPhoto(brandId, seedStr),
    aspect: "fill",
    heightPct: 46,
    // Bump light-mode wash so the accent color owns the photo instead of the
    // photo owning the accent — critical for divisions whose photo pool skews
    // warm (Legal, Digital), where dark hero copy was fighting the image.
    overlayOpacity: mode === "dark" ? 0.6 : 0.58,
    washStrength: 1,
    // Light mode uses "both" so the eyebrow (top-left) and the CTA seam
    // (bottom) both sit on a pageBg-anchored gradient; dark mode keeps a
    // single bottom scrim to preserve the editorial photo above the copy.
    scrim: mode === "dark" ? "bottom" : "both",
    scrimOpacity: mode === "dark" ? 0.55 : 0.62,
    autoScrim: true,
    autoScrimThreshold: 0.55,
    blendMode: "normal",
  };
}

