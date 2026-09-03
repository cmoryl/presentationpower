/**
 * PRINT CARD SURFACE — the presentation deck's fade-out box, on paper
 * ---------------------------------------------------------------------------
 * The deck's module boxes (see `moduleCardSurface` in components/slide/flagship)
 * are not closed panels: an accent tint sits at the TOP of the box, dissolves
 * to nothing before the bottom edge, and the hairline frame never closes along
 * the bottom, so a grid of cards reads as one continuous surface. Print used to
 * ship the opposite grammar — a fully-outlined frosted plate with an even fill
 * and a drop shadow — so the same content read as two different design systems
 * across a deck and a printed leave-behind.
 *
 * This module is the one recipe both print chokepoints now use
 * (`print-primitives.glass` for template cards and `sections/shared.sectionGlass`
 * for modular sections), expressed in raster-safe CSS only: stacked background
 * layers plus a border whose bottom edge is transparent. No `mask-image`, no
 * `backdrop-filter` dependency for legibility — both survive PDF/PPTX capture.
 */

import type { CSSProperties } from "react";
import { accentTokens } from "@/lib/accent-tokens";
import { FADE_STOPS, SEAM_HEIGHT_PX } from "@/lib/surface-tokens";

/** Page px → container unit, matching print-primitives/sections `cq`. */
const PAGE_W = 816;
const cq = (px: number) =>
  `calc(${((px * 100) / PAGE_W).toFixed(3)}cqw * var(--print-fit-scale, 1))`;

export type PrintCardSurfaceOptions = {
  /** Draw the accent seam across the top edge. Default true. */
  seam?: boolean;
  /** 0.5..1.5 — scales the tint strength. Default 1. */
  intensity?: number;
  /** Keep the frosted blur (screen preview). Default true. */
  blur?: boolean;
};

/** Top-lit accent wash that reaches zero before the bottom edge. */
function fadeWash(accent: string, mode: "light" | "dark", intensity: number): string {
  const t = accentTokens(accent, mode);
  const { washMidAt, washEndAt } = FADE_STOPS;
  if (mode === "dark") {
    return [
      `linear-gradient(180deg,`,
      `color-mix(in srgb, ${accent} ${(FADE_STOPS.washTop * intensity).toFixed(1)}%, transparent) 0%,`,
      `color-mix(in srgb, ${accent} ${(FADE_STOPS.washMid * intensity).toFixed(1)}%, transparent) ${washMidAt}%,`,
      `transparent ${washEndAt}%)`,
    ].join(" ");
  }
  // Light pages: the deck's outline-free accent→paper→nothing panel gradient.
  void t;
  return [
    `linear-gradient(180deg,`,
    `color-mix(in srgb, ${accent} ${(20 * intensity).toFixed(1)}%, transparent) 0%,`,
    `color-mix(in srgb, ${accent} ${(9 * intensity).toFixed(1)}%, transparent) 34%,`,
    `rgba(255,255,255,0.55) 74%,`,
    `rgba(255,255,255,0) 100%)`,
  ].join(" ");
}

/**
 * The canonical print card/panel surface: accent-lit at the top, faded out at
 * the bottom, no closing hairline. Spread it onto any print panel or card.
 */
export function printCardSurface(
  mode: "light" | "dark",
  accent: string,
  opts: PrintCardSurfaceOptions = {},
): CSSProperties {
  const { seam = true, intensity = 1, blur = true } = opts;
  const t = accentTokens(accent, mode);
  const wash = fadeWash(accent, mode, intensity);
  const layers = seam ? [t.seam, wash] : [wash];
  const sizes = seam ? [`100% ${cq(SEAM_HEIGHT_PX)}`, "100% 100%"] : ["100% 100%"];
  const positions = seam ? ["top left", "top left"] : ["top left"];

  const base: CSSProperties = {
    backgroundColor: mode === "dark" ? "rgba(10, 8, 36, 0.22)" : "transparent",
    backgroundImage: layers.join(", "),
    backgroundSize: sizes.join(", "),
    backgroundPosition: positions.join(", "),
    backgroundRepeat: "no-repeat",
    ...(blur
      ? { backdropFilter: mode === "dark" ? "blur(14px) saturate(140%)" : "blur(6px)" }
      : {}),
  };

  if (mode === "dark") {
    return {
      ...base,
      // Frame that never closes along the bottom — the card melts into the page.
      border: `1px solid ${t.ring}`,
      borderBottomColor: "transparent",
      boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.08)${t.glow ? `, ${t.glow}` : ""}`,
    };
  }
  return {
    ...base,
    // Light pages are outline-free, exactly like the deck's light module boxes.
    border: "none",
    boxShadow: "none",
  };
}
