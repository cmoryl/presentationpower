// TransPerfect NEXT — CALIFORNIA PARTNER KIOSKS (TV kiosk template).
//
// The California stand build replaces the London trade-booth walls with a tall,
// narrow TV KIOSK, supplied as a three-artboard Illustrator template
// (`TVKioskTemplate.ai`):
//
//   • page 1 — FRONT face, trimming 45 × 96 in (1143 × 2438.4 mm), with a
//     TV keep-clear aperture measured out of the supplied artboard;
//   • pages 2 and 3 — the two 4 × 96 in (101.6 × 2438.4 mm) RETURN strips,
//     which carry no screen and stay fully live.
//
// Both sheets carry 1/8 in (3.175 mm) bleed per edge, which is the supplied
// media page; the file also draws a 1/16 in intermediate box, which is a bleed
// guide rather than a second trim.
//
// WHY THESE ARE RE-LAID, NOT SCALED
// The London masters are 1830 × 2440 mm — aspect 0.750. The kiosk front is
// aspect 0.469. Scaling a London wall to fill the kiosk loses ~38 % of its
// width, which cuts through the lockup and the headline on every stand. So each
// California kiosk is REBUILT from the partner's native template (brand plate
// plus editable headline, subhead, body, lockup and QR laid out from the trim
// box) at kiosk size. The supplied London artwork is still available on the
// London kit; it is simply not the source for these boards.
//
// This module holds data and pure geometry only and imports nothing from the
// signage graph, so the signage builder can consult it while building panels.

import kioskTemplate from "@/assets/california-kiosks/tv-kiosk-template.ai?url";
import {
  CALIFORNIA_KIOSK_BLEED_MM,
  CALIFORNIA_KIOSK_FRONT_TRIM,
  CALIFORNIA_KIOSK_RETURN_TRIM,
} from "@/lib/next-california-kiosk-geometry";
import {
  LONDON_BOOTHS,
  type LondonBoothArtboard,
  type LondonBoothSpec,
} from "@/lib/next-london-booths";
import { KIOSK_LIVE_LAYOUTS, kioskLiveFileBase } from "@/lib/next-california-kiosk-live";

export {
  CALIFORNIA_KIOSK_BLEED_MM,
  CALIFORNIA_KIOSK_FRONT_TRIM,
  CALIFORNIA_KIOSK_RETURN_TRIM,
  CALIFORNIA_KIOSK_SCREEN_FRACTION,
  CALIFORNIA_KIOSK_SCREEN_MM,
} from "@/lib/next-california-kiosk-geometry";

/** The supplied kiosk template, as issued. */
export const CALIFORNIA_KIOSK_TEMPLATE = {
  file: "TVKioskTemplate.ai",
  url: kioskTemplate,
  pages: 3,
  note:
    "Supplied TV kiosk template: front face plus two return strips, 1/8 in bleed per edge. " +
    "The TV keep-clear rectangle is measured out of the front artboard.",
} as const;


/** Suffix that turns a London booth id into its California kiosk id. */
export const CALIFORNIA_KIOSK_SUFFIX = "-cal-kiosk";

/** The London booth a kiosk id was re-laid from. */
export function californiaKioskSourceBoothId(id: string | null | undefined): string | null {
  if (!id || !id.endsWith(CALIFORNIA_KIOSK_SUFFIX)) return null;
  return id.slice(0, -CALIFORNIA_KIOSK_SUFFIX.length);
}

/** True for a California kiosk booth id. */
export function isCaliforniaKioskId(id: string | null | undefined): boolean {
  return !!californiaKioskSourceBoothId(id);
}

function kioskArtboards(): LondonBoothArtboard[] {
  return [
    {
      kind: "main",
      label: "Kiosk front · 45 × 96 in",
      page: 1,
      trimW: CALIFORNIA_KIOSK_FRONT_TRIM.w,
      trimH: CALIFORNIA_KIOSK_FRONT_TRIM.h,
      bleedMm: CALIFORNIA_KIOSK_BLEED_MM,
      // Native re-lay: no supplied raster ground, so the app paints the plate
      // and every mark stays editable.
      previewUrl: null,
    },
    {
      kind: "return-l",
      label: "Left return · 4 × 96 in",
      page: 2,
      trimW: CALIFORNIA_KIOSK_RETURN_TRIM.w,
      trimH: CALIFORNIA_KIOSK_RETURN_TRIM.h,
      bleedMm: CALIFORNIA_KIOSK_BLEED_MM,
      previewUrl: null,
    },
    {
      kind: "return-r",
      label: "Right return · 4 × 96 in",
      page: 3,
      trimW: CALIFORNIA_KIOSK_RETURN_TRIM.w,
      trimH: CALIFORNIA_KIOSK_RETURN_TRIM.h,
      bleedMm: CALIFORNIA_KIOSK_BLEED_MM,
      previewUrl: null,
    },
  ];
}

/**
 * Every current partner booth, re-laid as a California TV kiosk. Order follows
 * the London booth list so the two locations read in the same sequence.
 */
export const CALIFORNIA_KIOSKS: LondonBoothSpec[] = LONDON_BOOTHS.map((booth) => ({
  id: `${booth.id}${CALIFORNIA_KIOSK_SUFFIX}`,
  // Shell per artboard is resolved by the signage builder: the front carries the
  // TV aperture, the returns do not.
  shellId: "tv-kiosk",
  vendor: booth.vendor,
  // Partners whose live London file was supplied are rebuilt piece by piece
  // (live text, layered vector art) — see next-california-kiosk-live.ts. The
  // rest keep the app-built native re-lay. Always rdraft- until published.
  sourceFile: KIOSK_LIVE_LAYOUTS[booth.id]
    ? `${kioskLiveFileBase(booth.id)}.ai`
    : CALIFORNIA_KIOSK_TEMPLATE.file,
  aiUrl: null,
  style: booth.style,
  artboards: kioskArtboards(),
}));

/** How much of a London wall would be lost if it were scaled to the kiosk. */
export function londonWallCropIntoKiosk(): { scale: number; lostWidthPct: number } {
  const scale = CALIFORNIA_KIOSK_FRONT_TRIM.h / 2440;
  const scaledWidth = 1830 * scale;
  return {
    scale: Math.round(scale * 1000) / 1000,
    lostWidthPct:
      Math.round(((scaledWidth - CALIFORNIA_KIOSK_FRONT_TRIM.w) / scaledWidth) * 1000) / 10,
  };
}
