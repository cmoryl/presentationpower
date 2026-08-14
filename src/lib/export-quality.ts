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
    label: "High · 216 DPI",
    dpi: 216,
    note: "Crisper gradients on projectors and large displays.",
  },
  {
    id: "ultra",
    label: "Ultra · 288 DPI",
    dpi: 288,
    note: "Print-grade backgrounds (2× stage). Largest file.",
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

// -----------------------------------------------------------------------------
// Backdrop plates (EXPORT SPEC #3)
//
// The aurora / mesh-gradient backdrop is the one thing we deliberately ship as
// a flat raster: OOXML has no mesh gradient, so every reconstruction attempt
// produced hard-edged artifacts. It therefore gets its own fixed size instead
// of the DPI-derived plate size — 2560×1440 is the screen-deck target (16:9 at
// 2x), and it is EXACTLY the slide aspect, which is what removes the stretch
// artifacts that came from scaling a mismatched source to fit.
// -----------------------------------------------------------------------------
export const BACKDROP_W = 2560;
export const BACKDROP_H = 1440;

/** Backdrop raster size — always exactly 16:9, never scaled to fit. */
export function backdropRasterSize(quality?: ExportQualityId | null): {
  width: number;
  height: number;
} {
  // Print-grade decks get 4K; both options keep the exact 16:9 ratio.
  if (exportQualityById(quality ?? null).id === "ultra") return { width: 3840, height: 2160 };
  return { width: BACKDROP_W, height: BACKDROP_H };
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
//  · "editable" — DEFAULT. Pure OOXML reconstruction: every card, chip, rule,
//                 icon, photo, logo and text run is its own native PowerPoint
//                 object with real gradient fills, strokes and shadows, sitting
//                 on a separate full-bleed background object. Everything is
//                 clickable, movable, restylable and deletable.
//  · "layered"  — CSS-exclusive decor planes are rasterized into one plate and
//                 text is emitted natively on top. Pixel-closer to the web
//                 render, but the plate fuses background + cards + icons into a
//                 single picture, so only text is editable.
//  · "exact"    — one full-bleed raster per slide, straight from the live
//                 renderer. Pixel-faithful, but flat: nothing is editable and
//                 text is carried only in speaker notes.
//
// Independently editable objects are the product, so "editable" is the default.
// -----------------------------------------------------------------------------

export type ExportFidelityId = "layered" | "exact" | "editable";

export const EXPORT_FIDELITIES: Array<{
  id: ExportFidelityId;
  label: string;
  note: string;
}> = [
  {
    id: "editable",
    label: "Editable · native objects",
    note: "Every box, icon, photo, logo and text run is its own PowerPoint object. Default.",
  },
  {
    id: "layered",
    label: "Layered · decor plate",
    note: "Rasterized decor plate + native text. Closest to the web render; only text is editable.",
  },
  {
    id: "exact",
    label: "Design-exact (flat)",
    note: "One pixel-faithful image per slide. Nothing is editable; text in speaker notes.",
  },
];

export const DEFAULT_EXPORT_FIDELITY: ExportFidelityId = "editable";

// v3: the default moved from the fused "layered" decor plate to fully native
// "editable" objects, so the key is bumped to retire stale saved preferences.
const FIDELITY_KEY = "tp:export-fidelity:v3";

export function exportFidelityById(id: string | null | undefined): ExportFidelityId {
  return id === "layered" || id === "exact" ? id : "editable";
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

// -----------------------------------------------------------------------------
// Font embedding
//
// PowerPoint renders a deck with the fonts installed on the OPENING machine.
// Geist (the brand face) is a web font, so on a colleague's laptop PowerPoint
// silently substitutes Calibri/Arial: line breaks move, headlines rewrap and
// slides no longer match what was designed here.
//
// With embedding ON the actual Geist font files (regular / bold / italic /
// bold-italic) are packed inside the .pptx, so the deck looks identical
// everywhere — at the cost of roughly 0.5-1 MB of file size. With it OFF the
// file is smaller and the text is still fully editable, but typography falls
// back to whatever the viewer has installed.
//
// ON by default: brand-accurate typography matters more than a megabyte.
// -----------------------------------------------------------------------------

const FONT_EMBED_KEY = "tp:export-embed-fonts:v1";

export const DEFAULT_EXPORT_EMBED_FONTS = true;

/** User-facing explanation shown next to the toggle. */
export const EXPORT_FONT_EMBED_EXPLAINER =
  "Packs the brand font (Geist) inside the .pptx so the deck looks exactly the same on any computer, even without the font installed. Adds about 1 MB. Turn it off for a smaller file — PowerPoint will then substitute a system font and text may rewrap.";

export function readExportEmbedFonts(): boolean {
  if (typeof window === "undefined") return DEFAULT_EXPORT_EMBED_FONTS;
  try {
    const raw = window.localStorage.getItem(FONT_EMBED_KEY);
    return raw == null ? DEFAULT_EXPORT_EMBED_FONTS : raw === "1";
  } catch {
    return DEFAULT_EXPORT_EMBED_FONTS;
  }
}

export function writeExportEmbedFonts(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FONT_EMBED_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked — the setting just won't persist */
  }
}

// -----------------------------------------------------------------------------
// Legacy image compatibility — force every embedded bitmap to JPEG/PNG.
//
// WebP is always transcoded (PowerPoint < 2019 cannot decode it). This option
// goes further: SVG is rasterized instead of passed through as a vector, and
// any other exotic bitmap (GIF/TIFF/AVIF/HEIC) is re-encoded, so the package
// contains nothing but JPEG and PNG. Slightly larger files and non-crisp icon
// scaling, in exchange for opening identically in PowerPoint 2007 onward,
// Google Slides, Keynote and thumbnailers.
// -----------------------------------------------------------------------------

const LEGACY_IMAGES_KEY = "tp:export-legacy-images:v1";

export const DEFAULT_EXPORT_LEGACY_IMAGES = false;

/** User-facing explanation shown next to the toggle. */
export const EXPORT_LEGACY_IMAGES_EXPLAINER =
  "Re-encodes every picture in the file as JPEG or PNG only (SVG icons and logos are rasterized). Use it when the deck will be opened in PowerPoint 2016 or older, Google Slides or Keynote. Files get a little bigger and vector art no longer scales perfectly crisp.";

export function readExportLegacyImages(): boolean {
  if (typeof window === "undefined") return DEFAULT_EXPORT_LEGACY_IMAGES;
  try {
    const raw = window.localStorage.getItem(LEGACY_IMAGES_KEY);
    return raw == null ? DEFAULT_EXPORT_LEGACY_IMAGES : raw === "1";
  } catch {
    return DEFAULT_EXPORT_LEGACY_IMAGES;
  }
}

export function writeExportLegacyImages(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEGACY_IMAGES_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked — the setting just won't persist */
  }
}

// -----------------------------------------------------------------------------
// Debug object tree — emits a sidecar JSON manifest plus a debug .pptx whose
// speaker notes list every object (type, editable, layered, rect). Off by
// default; persisted per reviewer so a debugging session survives reloads.
// -----------------------------------------------------------------------------

const DEBUG_TREE_KEY = "tp:export-debug-tree:v1";

export function readExportDebugTree(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEBUG_TREE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeExportDebugTree(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEBUG_TREE_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked — the setting just won't persist */
  }
}

// -----------------------------------------------------------------------------
// Alpha-aware image encoding — transparent → PNG, opaque → JPEG.
//
// Source imagery arrives in a mix of formats (PNG photographs, JPEG cutouts
// that lost their alpha, WebP, oversized PNG gradients). PowerPoint decodes all
// of them, but the mix is inconsistent: an opaque PNG photo bloats the package,
// and a JPEG that should have had alpha shows a white box behind a cutout.
//
// With this option ON every embedded bitmap is re-encoded by what it actually
// contains: any image with translucent pixels becomes PNG (alpha preserved),
// everything else becomes JPEG at high quality. One predictable rule, so
// visuals stay consistent across slides and across PowerPoint versions.
// -----------------------------------------------------------------------------

const ALPHA_IMAGES_KEY = "tp:export-alpha-images:v1";

export const DEFAULT_EXPORT_ALPHA_IMAGES = false;

/** User-facing explanation shown next to the toggle. */
export const EXPORT_ALPHA_IMAGES_EXPLAINER =
  "Re-encodes every picture by what it contains: images with transparency become PNG (so cutouts and logos keep clean edges), everything else becomes JPEG (so photos stay small). Keeps picture quality and file size consistent from slide to slide.";

export function readExportAlphaImages(): boolean {
  if (typeof window === "undefined") return DEFAULT_EXPORT_ALPHA_IMAGES;
  try {
    const raw = window.localStorage.getItem(ALPHA_IMAGES_KEY);
    return raw == null ? DEFAULT_EXPORT_ALPHA_IMAGES : raw === "1";
  } catch {
    return DEFAULT_EXPORT_ALPHA_IMAGES;
  }
}

export function writeExportAlphaImages(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALPHA_IMAGES_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked — the setting just won't persist */
  }
}
