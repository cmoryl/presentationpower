// Canonical page-format registry for the print system.
//
// WHY: page geometry used to be re-derived with ad-hoc ternaries in half a
// dozen places (`pageAspect`, the asset canvas, aurora projection, the export
// panel), so adding a format meant hunting them down and hero mastheads —
// which bleed to the trim and size their band off the page height — laid out
// wrong on anything that wasn't Letter/A4.
//
// Everything about a format lives here: trim size, aspect, the margin ladder
// (in real inches so a half-sheet doesn't inherit a full-sheet margin), and
// the masthead band height that reads correctly at that proportion.

import { PAGE_W } from "@/components/print/print-primitives";
import type { PrintDensity, PrintPageSize } from "./print-assets.types";

export type PrintMarginPreset = "tight" | "standard" | "wide";

export type PrintPagePreset = {
  key: PrintPageSize;
  label: string;
  /** Short "8.5 × 11 in" style dimension note for pickers. */
  dims: string;
  widthIn: number;
  heightIn: number;
  /** Base side margin at standard density, in inches. */
  sideMarginIn: number;
  /** Base top margin at standard density, in inches. */
  topMarginIn: number;
  /**
   * Default hero masthead band height as a percentage of page height. Tall
   * portrait sheets can carry a deep photo band; half-sheets and squares
   * would be swallowed by one, so they open shallower.
   */
  heroBandPct: number;
  /** Grouping for the picker: full sheet vs. half sheet vs. square. */
  group: "full" | "half" | "square";
};

export const PRINT_PAGE_PRESETS_FULL: Record<PrintPageSize, PrintPagePreset> = {
  Letter: {
    key: "Letter",
    label: "US Letter",
    dims: "8.5 × 11 in",
    widthIn: 8.5,
    heightIn: 11,
    sideMarginIn: 0.55,
    topMarginIn: 0.45,
    heroBandPct: 46,
    group: "full",
  },
  A4: {
    key: "A4",
    label: "A4",
    dims: "210 × 297 mm",
    widthIn: 8.2677,
    heightIn: 11.6929,
    sideMarginIn: 0.55,
    topMarginIn: 0.45,
    heroBandPct: 47,
    group: "full",
  },
  HalfLetter: {
    key: "HalfLetter",
    label: "Half-sheet (US)",
    dims: "5.5 × 8.5 in",
    widthIn: 5.5,
    heightIn: 8.5,
    sideMarginIn: 0.4,
    topMarginIn: 0.34,
    heroBandPct: 38,
    group: "half",
  },
  A5: {
    key: "A5",
    label: "Half-sheet (A5)",
    dims: "148 × 210 mm",
    widthIn: 5.8268,
    heightIn: 8.2677,
    sideMarginIn: 0.4,
    topMarginIn: 0.34,
    heroBandPct: 39,
    group: "half",
  },
  Square: {
    key: "Square",
    label: "Square",
    dims: "8.5 × 8.5 in",
    widthIn: 8.5,
    heightIn: 8.5,
    sideMarginIn: 0.55,
    topMarginIn: 0.45,
    heroBandPct: 40,
    group: "square",
  },
};

export const PRINT_PAGE_SIZE_ORDER: PrintPageSize[] = [
  "Letter",
  "A4",
  "HalfLetter",
  "A5",
  "Square",
];

export const PRINT_MARGIN_PRESETS: Record<
  PrintMarginPreset,
  { label: string; factor: number; note: string }
> = {
  tight: { label: "Tight", factor: 0.72, note: "Editorial — copy runs close to the trim." },
  standard: { label: "Standard", factor: 1, note: "Document default for the format." },
  wide: { label: "Wide", factor: 1.32, note: "Generous white frame around the type block." },
};

export function pagePreset(size: PrintPageSize | undefined): PrintPagePreset {
  return PRINT_PAGE_PRESETS_FULL[size ?? "Letter"] ?? PRINT_PAGE_PRESETS_FULL.Letter;
}

/** Aspect ratio string for a page's trim, e.g. "8.5 / 11". */
export function pageAspectRatio(size: PrintPageSize | undefined): string {
  const p = pagePreset(size);
  return `${p.widthIn} / ${p.heightIn}`;
}

const densityFactor = (d: PrintDensity | undefined): number =>
  d === "compact" ? 0.82 : d === "airy" ? 1.18 : 1;

/**
 * Side margin in template pixels (the 816px authoring canvas). Because every
 * print unit is `cqw` against that canvas, converting the format's real inch
 * margin through its own width keeps the printed margin honest: 0.4in on a
 * half-sheet stays 0.4in instead of scaling down with the sheet.
 */
export function pageSideMarginPx(
  size: PrintPageSize | undefined,
  density?: PrintDensity,
  margin?: PrintMarginPreset,
): number {
  const p = pagePreset(size);
  const inches =
    p.sideMarginIn * densityFactor(density) * PRINT_MARGIN_PRESETS[margin ?? "standard"].factor;
  return Math.round((inches / p.widthIn) * PAGE_W);
}

/** Top margin in template pixels for a format. `variance` keeps the
 *  per-template personality (Spotlight opens tight, brochures breathe). */
export function pageTopMarginPx(
  size: PrintPageSize | undefined,
  density?: PrintDensity,
  margin?: PrintMarginPreset,
  variance = 0,
): number {
  const p = pagePreset(size);
  const inches =
    p.topMarginIn * densityFactor(density) * PRINT_MARGIN_PRESETS[margin ?? "standard"].factor;
  return Math.round((inches / p.widthIn) * PAGE_W) + variance;
}

/**
 * Page height in template pixels — the vertical extent of the 816px-wide
 * canvas for this format. Hero mastheads size their band off this, which is
 * why a half-sheet masthead used to be far too deep (it assumed Letter's
 * 1056px page).
 */
export function pageHeightPx(size: PrintPageSize | undefined): number {
  const p = pagePreset(size);
  return Math.round((p.heightIn / p.widthIn) * PAGE_W);
}

/** Default masthead band height (% of page height) for a format. */
export function heroBandPct(size: PrintPageSize | undefined): number {
  return pagePreset(size).heroBandPct;
}

/** Aurora orb frame, re-projected from the native 1280×720 landscape space. */
export function pageAuroraFrame(size: PrintPageSize | undefined): { w: number; h: number } {
  const p = pagePreset(size);
  return { w: Math.round((1280 * p.widthIn) / p.heightIn), h: 1280 };
}
