// -----------------------------------------------------------------------------
// Export quality (DPI / raster resolution)
//
// Everything vector in a PPTX export (text, shapes, icons) is resolution
// independent, but the two things we CANNOT express in OOXML — style-pack
// sheets and CSS gradient/pattern backgrounds — have to be rasterized. Those
// rasters were hard-coded at 1920×1080 (and 1600×900 for CSS backgrounds),
// which is only ~144 DPI on a 13.333×7.5in slide: fine on screen, visibly soft
// when the deck is projected, printed, or zoomed in PowerPoint.
//
// This module makes that resolution a user-facing setting. The chosen DPI maps
// to a pixel width for the background plate; text and figures stay vector at
// every setting, so higher DPI costs file size, not editability.
// -----------------------------------------------------------------------------

/** PPTX widescreen slide is 13.333in × 7.5in. */
export const SLIDE_IN_W = 13.333;
export const SLIDE_IN_H = 7.5;

export type ExportQualityId = "standard" | "high" | "ultra";

export type ExportQuality = {
  id: ExportQualityId;
  label: string;
  /** Dots per inch of the rasterized background plate. */
  dpi: number;
  /** Short user-facing rationale. */
  note: string;
};

export const EXPORT_QUALITIES: ExportQuality[] = [
  {
    id: "standard",
    label: "Standard · 144 DPI",
    dpi: 144,
    note: "Smallest file. Fine for screen-shared review decks.",
  },
  {
    id: "high",
    label: "High · 220 DPI",
    dpi: 220,
    note: "Crisper gradients on projectors and large displays.",
  },
  {
    id: "ultra",
    label: "Ultra · 300 DPI",
    dpi: 300,
    note: "Print-grade backgrounds. Largest file.",
  },
];

export const DEFAULT_EXPORT_QUALITY: ExportQualityId = "high";

export function exportQualityById(id: string | null | undefined): ExportQuality {
  return (
    EXPORT_QUALITIES.find((q) => q.id === id) ??
    EXPORT_QUALITIES.find((q) => q.id === DEFAULT_EXPORT_QUALITY)!
  );
}

/** Hard ceiling so an ultra export can never blow up browser canvas limits. */
const MAX_PX_W = 4096;

/**
 * The on-screen slide box every module is composed against. All plates are
 * derived from this so the raster and the vector layer share one aspect ratio
 * and nothing is letterboxed, stretched, or cropped in PowerPoint.
 */
export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Raster plate dimensions for a full-bleed slide background at this quality. */
export function rasterSize(
  quality: ExportQualityId | ExportQuality | null | undefined,
  aspect = STAGE_W / STAGE_H,
): { width: number; height: number; dpi: number } {
  const q = typeof quality === "object" && quality ? quality : exportQualityById(quality ?? null);
  // Snap to an even multiple of the stage so width/height stay exactly in the
  // stage aspect after rounding — a 1px drift here shows up as a hairline of
  // slide colour along one edge of the background image.
  const target = Math.min(MAX_PX_W, Math.round(SLIDE_IN_W * q.dpi));
  // Quantise the capture scale to half steps. Every design corner radius
  // (22 / 18 / 12px) is even, so a 0.5-step scale always lands the corner on a
  // whole raster pixel; an arbitrary ratio like 1.5276 snaps 22px to 34px and
  // the plate corner comes back 0.26px wider than the vector tile above it,
  // which reads as a seam at the corner. See export-radius parity test.
  const raw = Math.max(0.25, target / STAGE_W);
  const ratio = Math.max(0.5, Math.floor(raw * 2) / 2);
  const width = Math.round(STAGE_W * ratio);
  const height = Math.round(width / aspect);

  return { width, height, dpi: q.dpi };
}

/** Capture scale (device-pixel-ratio equivalent) for the stage at this quality. */
export function stagePixelRatio(quality: ExportQualityId | null | undefined): number {
  return Math.max(1, rasterSize(quality).width / STAGE_W);
}


const STORE_KEY = "tp:export-quality";

/** Persisted preference — read lazily so SSR never touches localStorage. */
export function readExportQuality(): ExportQualityId {
  if (typeof window === "undefined") return DEFAULT_EXPORT_QUALITY;
  try {
    return exportQualityById(window.localStorage.getItem(STORE_KEY)).id;
  } catch {
    return DEFAULT_EXPORT_QUALITY;
  }
}

export function writeExportQuality(id: ExportQualityId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, id);
  } catch {
    /* storage blocked — the setting just won't persist */
  }
}

// -----------------------------------------------------------------------------
// Export fidelity
//
// Three ways to put a module into PowerPoint:
//
//  · "layered"  — DEFAULT. The design's *decor* planes (ground, scaffold, motif,
//                 grain, pack sheet, backdrop photography) are rasterized at the
//                 chosen DPI and placed as the slide's background image, while
//                 every piece of content — titles, body copy, stats, tiles,
//                 shapes, icons, logos, footer — is emitted as NATIVE, editable
//                 PowerPoint objects on top. The deck looks like the build and
//                 every word stays selectable and restylable in PowerPoint.
//  · "exact"    — one full-bleed raster per slide, straight from the live
//                 renderer. Pixel-faithful, but flat: nothing is editable and
//                 text is carried only in speaker notes.
//  · "editable" — pure OOXML reconstruction with no raster plate at all; the
//                 smallest file, but CSS-only decor is approximated.
//
// Editable, layered output is the product, so "layered" is the default.
// -----------------------------------------------------------------------------

export type ExportFidelityId = "layered" | "exact" | "editable";

export const EXPORT_FIDELITIES: Array<{
  id: ExportFidelityId;
  label: string;
  note: string;
}> = [
  {
    id: "layered",
    label: "Layered · editable",
    note: "Design-accurate decor plate + native editable text, shapes, icons and logos.",
  },
  {
    id: "editable",
    label: "Editable only",
    note: "Pure PowerPoint objects, no raster plate. Smallest file; decor is approximated.",
  },
  {
    id: "exact",
    label: "Design-exact (flat)",
    note: "One pixel-faithful image per slide. Nothing is editable; text in speaker notes.",
  },
];

export const DEFAULT_EXPORT_FIDELITY: ExportFidelityId = "layered";

// v2: the default moved from flat "exact" plates to layered editable output,
// so the key is bumped to retire stale saved preferences.
const FIDELITY_KEY = "tp:export-fidelity:v2";

export function exportFidelityById(id: string | null | undefined): ExportFidelityId {
  return id === "editable" || id === "exact" ? id : "layered";
}

export function readExportFidelity(): ExportFidelityId {
  if (typeof window === "undefined") return DEFAULT_EXPORT_FIDELITY;
  try {
    return exportFidelityById(window.localStorage.getItem(FIDELITY_KEY));
  } catch {
    return DEFAULT_EXPORT_FIDELITY;
  }
}

export function writeExportFidelity(id: ExportFidelityId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIDELITY_KEY, id);
  } catch {
    /* storage blocked — the setting just won't persist */
  }
}
