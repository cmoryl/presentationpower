import type { CSSProperties } from "react";

/**
 * Unified surface tokens — the single source of truth for how every module
 * card, tile and panel fades out along its bottom edge, and how tall the
 * accent seam along its top edge is.
 *
 * House rule: module boxes are never closed with a bottom hairline. The frame
 * and the wash both dissolve into the slide ground, so a grid of cards reads
 * as one continuous surface instead of a row of outlined boxes. Every module
 * must pull the fade from here rather than hand-rolling its own stops — that
 * is what keeps a 9-step chain, a bento mosaic and a KPI card cohesive.
 */

/** Height, in px, of the accent seam across the top edge of a module card. */
export const SEAM_HEIGHT_PX = 2;

/** Horizontal inset, in %, for the short "tick" seam used on narrow tiles. */
export const SEAM_TICK_INSET_PCT = 12;

/** Canonical bottom-fade stops, shared by masks and washes. */
export const FADE_STOPS = {
  /** Fully opaque down to this % of the box height. */
  opaqueTo: 48,
  /** Partially faded at this % … */
  softAt: 78,
  /** … to this alpha. */
  softAlpha: 0.35,
  /** Wash top / mid alphas and the % where the wash reaches zero. */
  washTop: 13,
  washMid: 4,
  washMidAt: 46,
  washEndAt: 88,
} as const;

/**
 * The canonical open-bottom gradient mask. Applied to a hairline frame it
 * erases the bottom edge and the lower thirds of the side rails.
 */
export const OPEN_BOTTOM_MASK = `linear-gradient(180deg, #000 0%, #000 ${FADE_STOPS.opaqueTo}%, rgba(0,0,0,${FADE_STOPS.softAlpha}) ${FADE_STOPS.softAt}%, transparent 100%)`;

/** Style fragment that applies {@link OPEN_BOTTOM_MASK} (both properties). */
export function openBottomMaskStyle(): CSSProperties {
  return {
    maskImage: OPEN_BOTTOM_MASK,
    WebkitMaskImage: OPEN_BOTTOM_MASK,
  };
}

/**
 * A hairline frame that fades out along the bottom — the standard module-card
 * frame. `line` is any CSS colour (hex or var).
 */
export function openBottomFrame(line: string, radius: number | string): CSSProperties {
  return {
    borderRadius: typeof radius === "number" ? `${radius}px` : radius,
    border: `1px solid color-mix(in oklab, ${line} 26%, transparent)`,
    borderBottomColor: "transparent",
    ...openBottomMaskStyle(),
  };
}

/**
 * The canonical top-lit card wash: accent tint at the top dissolving to
 * nothing before the bottom edge, so the card melts into the ground.
 */
export function cardWashGradient(line: string): string {
  const { washTop, washMid, washMidAt, washEndAt } = FADE_STOPS;
  return `linear-gradient(180deg, color-mix(in oklab, ${line} ${washTop}%, transparent) 0%, color-mix(in oklab, ${line} ${washMid}%, transparent) ${washMidAt}%, transparent ${washEndAt}%)`;
}
