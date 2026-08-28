// Shared client-logo helpers.
//
// Both the legacy `VariantRenderer` switch and the extracted logo-wall family
// (`modules/logos.tsx`) resolve client marks, so the mode picker and the <img>
// wrapper live here — one implementation, no circular import between them.

import * as React from "react";
import { APPROVED_LOGOS } from "@/lib/approved-logos";
import { useResolvedLogoUrl } from "@/lib/slide-media-refresh";
import type { SlideMode } from "./SlideChrome";
import { s } from "./module-kit";

/**
 * Given an item that may carry both `logoUrl` (light/color) and `logoUrlDark`
 * (white), plus a storage `logoPath`, return the URL that matches the current
 * slide mode. Falls back gracefully to whichever URL is present.
 */
export function pickLogoForMode(it: Record<string, unknown>, mode: SlideMode): string {
  const light = s(it.logoUrl ?? it.logo ?? it.primaryUrl);
  const dark = s(it.logoUrlDark ?? it.logoWhite);
  if (mode === "dark") return dark || light;
  // Safety net for legacy/persisted content that stored the WHITE (on-dark)
  // mark in the light slot: a white logo on a white slide is invisible. Swap
  // to the approved colour counterpart when we can recognise the asset.
  if (light && /white|reverse|on-dark/i.test(light)) {
    const match = APPROVED_LOGOS.find((l) => l.white === light);
    if (match?.color) return match.color;
    const guess = light.replace(/white/gi, "color");
    if (APPROVED_LOGOS.some((l) => l.color === guess)) return guess;
  }
  return light || dark;
}

/**
 * Resolves a per-item logo through SlideMediaRefreshProvider so the 1-hour
 * client-logos TTL can't silently break a shipped deck.
 */
export function ClientLogoImg({
  path,
  url,
  alt,
  style,
  className,
}: {
  path?: string;
  url?: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const resolved = useResolvedLogoUrl(path, url);
  if (!resolved) return null;
  // `size-full` first so caller `max-h-*` / `max-w-*` still cap the box.
  // Many client marks are viewBox-only SVGs with no width/height attributes:
  // Chrome gives those no intrinsic size in a shrink-to-fit flex/grid slot, so
  // the image collapses to 0×0 and the wall cell renders empty. An explicit
  // 100% box + object-contain keeps every mark visible and undistorted.
  return (
    <img
      src={resolved}
      alt={alt}
      style={style}
      // `data-logo-tile` lets the Slide Studio map a click on this mark back to
      // the logo cell that produced it (same trick as `data-media-tile`).
      data-logo-tile=""
      className={`size-full object-contain ${className ?? ""}`}
    />
  );
}
