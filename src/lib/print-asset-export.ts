/**
 * Print asset PDF export.
 *
 * Rasterizes a print-asset canvas node into a PDF at a chosen page size
 * (A4 / Letter / Square / Custom) with optional bleed and crop marks.
 * Uses the same `captureSlideAsDataUrl` engine as slide export so aurora
 * layers, glass, and fonts render consistently.
 */

import { jsPDF } from "jspdf";
import {
  captureSlideAsDataUrl,
  type ExportProgressCallback,
  type SlideExportMode,
} from "./slide-image-export";

export type PrintPageSizeKey = "A4" | "Letter" | "Square" | "Custom";

/** Trim size in inches (page area before bleed). */
export interface PrintPageDimensions {
  widthIn: number;
  heightIn: number;
}

/** Named preset trim sizes in inches. */
export const PRINT_PAGE_PRESETS: Record<Exclude<PrintPageSizeKey, "Custom">, PrintPageDimensions> = {
  A4: { widthIn: 8.2677, heightIn: 11.6929 }, // 210 × 297 mm
  Letter: { widthIn: 8.5, heightIn: 11 },
  Square: { widthIn: 8.5, heightIn: 8.5 },
};

export interface PrintExportOptions {
  /** Page size preset or "Custom" to use `custom`. */
  pageSize: PrintPageSizeKey;
  /** Required when `pageSize === "Custom"`. Trim dimensions in inches. */
  custom?: PrintPageDimensions;
  /** Bleed in inches added to every edge. Common values: 0, 0.125, 0.25. */
  bleedIn?: number;
  /** Draw crop marks in the bleed area (only used when bleedIn > 0). */
  cropMarks?: boolean;
  /** Light or dark background handling when neutralizing glass. */
  mode?: SlideExportMode;
  /** Rendered raster width in pixels (drives fidelity). Default 2400. */
  targetPixelWidth?: number;
  filename?: string;
  onProgress?: ExportProgressCallback;
}

function resolveTrim(opts: PrintExportOptions): PrintPageDimensions {
  if (opts.pageSize === "Custom") {
    if (!opts.custom) throw new Error("Custom page size requires `custom` dimensions.");
    return opts.custom;
  }
  return PRINT_PAGE_PRESETS[opts.pageSize];
}

/** Draw standard crop marks at each corner in the bleed margin. */
function drawCropMarks(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  bleed: number,
): void {
  if (bleed <= 0) return;
  const markLen = Math.min(0.25, bleed * 0.9); // inches
  const gap = 0.05; // gap from trim so marks sit in the bleed
  pdf.setLineWidth(0.005);
  pdf.setDrawColor(0, 0, 0);

  const trims = [
    { x: bleed, y: bleed },
    { x: pageWidth - bleed, y: bleed },
    { x: bleed, y: pageHeight - bleed },
    { x: pageWidth - bleed, y: pageHeight - bleed },
  ];
  for (const p of trims) {
    // horizontal marks
    const hx1 = p.x < pageWidth / 2 ? p.x - gap - markLen : p.x + gap;
    const hx2 = p.x < pageWidth / 2 ? p.x - gap : p.x + gap + markLen;
    pdf.line(hx1, p.y, hx2, p.y);
    // vertical marks
    const vy1 = p.y < pageHeight / 2 ? p.y - gap - markLen : p.y + gap;
    const vy2 = p.y < pageHeight / 2 ? p.y - gap : p.y + gap + markLen;
    pdf.line(p.x, vy1, p.x, vy2);
  }
}

/**
 * Rasterize a print-asset canvas node into a single-page PDF at the chosen
 * trim size + bleed. The rendered artwork fills the entire page (trim + bleed)
 * so any full-bleed aurora/photo extends into the bleed area.
 */
export async function exportPrintAssetAsPdf(
  node: HTMLElement,
  opts: PrintExportOptions,
): Promise<void> {
  const trim = resolveTrim(opts);
  const bleed = Math.max(0, opts.bleedIn ?? 0);
  const pageWidth = trim.widthIn + bleed * 2;
  const pageHeight = trim.heightIn + bleed * 2;

  const dataUrl = await captureSlideAsDataUrl(node, {
    mode: opts.mode ?? "light",
    targetWidth: opts.targetPixelWidth ?? 2400,
    onProgress: opts.onProgress,
  });

  const orientation = pageWidth >= pageHeight ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "in",
    format: [pageWidth, pageHeight],
    compress: true,
  });

  // Fill the entire page (including bleed) with the raster.
  pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, pageHeight, undefined, "SLOW");

  if (opts.cropMarks && bleed > 0) {
    drawCropMarks(pdf, pageWidth, pageHeight, bleed);
  }

  const filename =
    opts.filename ??
    `print-asset-${opts.pageSize.toLowerCase()}-${Date.now()}.pdf`;
  pdf.save(filename);
}
