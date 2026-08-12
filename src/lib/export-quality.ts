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

/** Raster plate dimensions for a full-bleed slide background at this quality. */
export function rasterSize(
  quality: ExportQualityId | ExportQuality | null | undefined,
  aspect = SLIDE_IN_W / SLIDE_IN_H,
): { width: number; height: number; dpi: number } {
  const q = typeof quality === "object" && quality ? quality : exportQualityById(quality ?? null);
  const width = Math.min(MAX_PX_W, Math.round(SLIDE_IN_W * q.dpi));
  const height = Math.round(width / aspect);
  return { width, height, dpi: q.dpi };
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
