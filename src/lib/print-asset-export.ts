/**
 * Print asset PDF export.
 *
 * Rasterizes one or more print-asset canvas nodes into a PDF at a chosen
 * page size (A4 / Letter / Square / Custom) with optional bleed and crop
 * marks. Uses the same `captureSlideAsDataUrl` engine as slide export so
 * aurora layers, glass, and fonts render consistently.
 *
 * Quality is expressed as an effective DPI over the full page area
 * (trim + bleed). We derive the raster width from `(trim + bleed) * dpi`
 * so the bleed area is captured at the same resolution as the trim.
 */

import { jsPDF } from "jspdf";
import {
  captureSlideAsDataUrl,
  type ExportProgressCallback,
  type SlideExportMode,
} from "./slide-image-export";
import { fetchIccProfile, wrapPdfAsX4, type IccProfileKey } from "./pdf-x4";
import {
  captureVectorText,
  enableHideTextForCapture,
  overlayVectorText,
  type VectorTextCapture,
} from "./print-vector-text";

export type PrintPageSizeKey = "A4" | "Letter" | "Square" | "Custom";
export type PrintExportQuality = "300dpi" | "600dpi";

/**
 * Two distinct output artifacts:
 *   • "digital"  — 150 DPI JPEG, no bleed, no crop marks, no X-4 metadata.
 *                  Suitable for email / on-screen. Small file.
 *   • "press-x4" — 300/600 DPI PNG, bleed + crop marks, TrimBox/BleedBox,
 *                  OutputIntent, XMP. Conformant PDF/X-4. Large file.
 *   • "press"    — legacy raw jsPDF output (no X-4 wrap). Retained so the
 *                  existing default behavior is not disturbed.
 */
export type PrintExportFormat = "digital" | "press" | "press-x4";

/** Digital output uses one fixed DPI — 150 is standard for on-screen
 *  legibility on both retina (~144 CSS DPI) and standard displays, and it
 *  keeps a 10-page Letter export in the low single-digit MB range. */
export const DIGITAL_EXPORT_DPI = 150;
/** Digital JPEG quality (0..1). 0.85 hides all artefacts on aurora blooms
 *  while still shrinking a page by ~10× vs. PNG. */
export const DIGITAL_JPEG_QUALITY = 0.85;

/** Trim size in inches (page area before bleed). */
export interface PrintPageDimensions {
  widthIn: number;
  heightIn: number;
}

/** Named preset trim sizes in inches. */
export const PRINT_PAGE_PRESETS: Record<
  Exclude<PrintPageSizeKey, "Custom">,
  PrintPageDimensions
> = {
  A4: { widthIn: 8.2677, heightIn: 11.6929 }, // 210 × 297 mm
  Letter: { widthIn: 8.5, heightIn: 11 },
  Square: { widthIn: 8.5, heightIn: 8.5 },
};

/** Numeric DPI for each press quality preset. */
export const PRINT_EXPORT_DPI: Record<PrintExportQuality, number> = {
  "300dpi": 300,
  "600dpi": 600,
};

/**
 * Browser canvas ceilings. Chrome/Firefox cap a single canvas at ~16384
 * pixels per side; total pixel budgets vary but stay comfortably above
 * 200 megapixels on modern hardware. We clamp against both so a large
 * custom trim at 600 DPI degrades gracefully instead of producing a blank
 * export.
 */
const MAX_CANVAS_SIDE_PX = 16384;
const MAX_CANVAS_PIXELS = 200_000_000;

export interface PrintExportQualityClampInfo {
  requestedDpi: number;
  effectiveDpi: number;
  requestedWidthPx: number;
  effectiveWidthPx: number;
  reason: string;
}

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
  /**
   * Output quality. Default "300dpi" (print standard). "600dpi" targets
   * archival / large-format output. Raster width is derived from the
   * selected DPI over the full (trim + bleed) area.
   */
  quality?: PrintExportQuality;
  /** Output family. Defaults to "press" for back-compat with prior calls. */
  format?: PrintExportFormat;
  /** ICC output-intent profile — required when `format === "press-x4"`. */
  iccProfile?: IccProfileKey;
  filename?: string;
  onProgress?: ExportProgressCallback;
  /** Fires when the requested DPI cannot be honored (canvas ceiling reached). */
  onQualityClamp?: (info: PrintExportQualityClampInfo) => void;
  /**
   * Enable vector-text overlay (two-pass render): hide DOM text during
   * raster capture, then draw the same visual lines with embedded Geist
   * on top. Text becomes selectable, searchable, and press-sharp.
   *
   * Defaults to ON for `press` and `press-x4` (print-asset routes only),
   * OFF for `digital`. Pass `false` to force raster-only.
   */
  vectorText?: boolean;
  /** Fires once the vector-text overlay has been drawn (diagnostics). */
  onVectorTextReport?: (report: VectorTextReport) => void;
}

export interface VectorTextReport {
  enabled: boolean;
  linesDrawn: number;
  trackedLinesLines: number;
  fontResources: string[];
  rasterBytes: number;
  finalBytes: number;
  skippedClamped: number;
}

function resolveTrim(opts: PrintExportOptions): PrintPageDimensions {
  if (opts.pageSize === "Custom") {
    if (!opts.custom) throw new Error("Custom page size requires `custom` dimensions.");
    return opts.custom;
  }
  return PRINT_PAGE_PRESETS[opts.pageSize];
}

/** Draw standard crop marks at each corner in the bleed margin. */
function drawCropMarks(pdf: jsPDF, pageWidth: number, pageHeight: number, bleed: number): void {
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
 * Resolve the effective raster width for a page, clamping against browser
 * canvas ceilings. Returns the effective width and (if clamped) the
 * effective DPI it produced.
 */
export function resolvePrintPixelWidth(
  pageWidthIn: number,
  pageHeightIn: number,
  requestedDpi: number,
): { widthPx: number; dpi: number; clamped: boolean; reason: string } {
  const requestedWidthPx = Math.ceil(pageWidthIn * requestedDpi);
  const requestedHeightPx = Math.ceil(pageHeightIn * requestedDpi);
  let widthPx = requestedWidthPx;
  let clamped = false;
  let reason = "";

  // Per-side cap.
  const longestSide = Math.max(requestedWidthPx, requestedHeightPx);
  if (longestSide > MAX_CANVAS_SIDE_PX) {
    const scale = MAX_CANVAS_SIDE_PX / longestSide;
    widthPx = Math.floor(requestedWidthPx * scale);
    clamped = true;
    reason = `Canvas side ceiling (${MAX_CANVAS_SIDE_PX}px)`;
  }

  // Total pixel budget.
  const projectedHeight = Math.ceil((widthPx / pageWidthIn) * pageHeightIn);
  const totalPx = widthPx * projectedHeight;
  if (totalPx > MAX_CANVAS_PIXELS) {
    const scale = Math.sqrt(MAX_CANVAS_PIXELS / totalPx);
    widthPx = Math.floor(widthPx * scale);
    clamped = true;
    reason = reason
      ? `${reason} + pixel budget (${MAX_CANVAS_PIXELS.toLocaleString()}px²)`
      : `Canvas pixel budget (${MAX_CANVAS_PIXELS.toLocaleString()}px²)`;
  }

  const dpi = widthPx / pageWidthIn;
  return { widthPx, dpi, clamped, reason };
}

/**
 * Rasterize one or more print-asset canvas nodes into a PDF at the chosen
 * trim size + bleed. Every page uses the same page geometry and receives
 * its own capture; bleed and crop marks are applied per-page.
 *
 * Accepts a single node (single-page export — identical behavior to the
 * previous one-shot API) or an ordered array for multi-page documents.
 */
export async function exportPrintAssetAsPdf(
  nodes: HTMLElement | HTMLElement[],
  opts: PrintExportOptions,
): Promise<void> {
  const pages = Array.isArray(nodes) ? nodes : [nodes];
  if (pages.length === 0) throw new Error("exportPrintAssetAsPdf: no pages provided.");

  const format: PrintExportFormat = opts.format ?? "press";
  const isDigital = format === "digital";

  const trim = resolveTrim(opts);
  // Digital output has no bleed and no crop marks by definition.
  const bleed = isDigital ? 0 : Math.max(0, opts.bleedIn ?? 0);
  const cropMarks = isDigital ? false : !!opts.cropMarks;
  const pageWidth = trim.widthIn + bleed * 2;
  const pageHeight = trim.heightIn + bleed * 2;

  // Digital uses a fixed 150 DPI + JPEG. Press uses the caller's quality.
  const quality: PrintExportQuality = opts.quality ?? "300dpi";
  const requestedDpi = isDigital ? DIGITAL_EXPORT_DPI : PRINT_EXPORT_DPI[quality];
  const requestedWidthPx = Math.ceil(pageWidth * requestedDpi);
  const resolved = resolvePrintPixelWidth(pageWidth, pageHeight, requestedDpi);
  if (resolved.clamped) {
    const info: PrintExportQualityClampInfo = {
      requestedDpi,
      effectiveDpi: Math.round(resolved.dpi),
      requestedWidthPx,
      effectiveWidthPx: resolved.widthPx,
      reason: resolved.reason,
    };
    console.warn(
      `[print-asset-export] Requested ${requestedDpi} DPI would exceed browser canvas limits ` +
        `(${resolved.reason}). Clamped to ~${info.effectiveDpi} DPI (${resolved.widthPx}px wide).`,
    );
    opts.onQualityClamp?.(info);
  }

  const orientation: "landscape" | "portrait" = pageWidth >= pageHeight ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "in",
    format: [pageWidth, pageHeight],
    compress: true,
  });

  // Vector text is a print-asset-only feature; digital output stays raster.
  const vectorText = opts.vectorText ?? !isDigital;
  const captures: VectorTextCapture[] = [];

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([pageWidth, pageHeight], orientation);
    const pageNode = pages[i]!;

    // PASS A — raster with text hidden (vector) or full raster (digital).
    let restoreHide: (() => void) | null = null;
    if (vectorText) {
      // Snapshot vector-text positions BEFORE hiding text so line breaks are
      // still real. captureSlideAsDataUrl's font/image waits will run again,
      // but by then layout has been settled by React and this outer await
      // above ensures fonts are ready.
      try {
        if (typeof document !== "undefined" && document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        /* best effort */
      }
      captures.push(captureVectorText(pageNode));
      restoreHide = enableHideTextForCapture(pageNode);
    }
    try {
      const pngDataUrl = await captureSlideAsDataUrl(pageNode, {
        mode: opts.mode ?? "light",
        targetWidth: resolved.widthPx,
        onProgress: opts.onProgress,
      });
      if (isDigital) {
        const jpegDataUrl = await pngDataUrlToJpeg(
          pngDataUrl,
          opts.mode ?? "light",
          DIGITAL_JPEG_QUALITY,
        );
        pdf.addImage(jpegDataUrl, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      } else {
        pdf.addImage(pngDataUrl, "PNG", 0, 0, pageWidth, pageHeight, undefined, "SLOW");
      }
      if (cropMarks && bleed > 0) {
        drawCropMarks(pdf, pageWidth, pageHeight, bleed);
      }
    } finally {
      restoreHide?.();
    }
  }

  const filename =
    opts.filename ?? `print-asset-${opts.pageSize.toLowerCase()}-${format}-${Date.now()}.pdf`;

  // Serialize raster PDF once so we can chain vector overlay → X-4 wrap.
  const rasterBytesArr = new Uint8Array(pdf.output("arraybuffer"));

  // PASS B — vector-text overlay.
  let workingBytes: Uint8Array = rasterBytesArr;
  const vectorReport: VectorTextReport = {
    enabled: vectorText,
    linesDrawn: 0,
    trackedLinesLines: 0,
    fontResources: [],
    rasterBytes: rasterBytesArr.byteLength,
    finalBytes: rasterBytesArr.byteLength,
    skippedClamped: captures.reduce((n, c) => n + c.stats.skippedClamped, 0),
  };
  if (vectorText && captures.length > 0) {
    try {
      const overlay = await overlayVectorText(workingBytes, {
        pageWidthIn: pageWidth,
        pageHeightIn: pageHeight,
        bleedIn: bleed,
        captures,
      });
      workingBytes = overlay.bytes;
      vectorReport.linesDrawn = overlay.stats.linesDrawn;
      vectorReport.trackedLinesLines = overlay.stats.trackedLines;
      vectorReport.fontResources = overlay.fontResources;
      vectorReport.finalBytes = workingBytes.byteLength;
      console.info(
        `[print-asset-export] Vector-text overlay: ${overlay.stats.linesDrawn} lines ` +
          `(${overlay.stats.trackedLines} tracked), fonts=[${overlay.fontResources.join(", ")}], ` +
          `rasterBytes=${rasterBytesArr.byteLength}, finalBytes=${workingBytes.byteLength}`,
      );
    } catch (err) {
      console.warn("[print-asset-export] Vector overlay failed, shipping raster-only.", err);
      vectorReport.enabled = false;
    }
  }
  opts.onVectorTextReport?.(vectorReport);

  if (format === "press-x4") {
    if (!opts.iccProfile) {
      throw new Error("press-x4 export requires an `iccProfile` option.");
    }
    const iccBytes = await fetchIccProfile(opts.iccProfile);
    const x4Bytes = await wrapPdfAsX4(workingBytes, {
      trimSize: { widthIn: trim.widthIn, heightIn: trim.heightIn },
      bleedIn: bleed,
      iccProfileBytes: iccBytes,
      iccProfileName: opts.iccProfile,
      title: opts.filename,
    });
    triggerBlobDownload(x4Bytes, filename, "application/pdf");
  } else {
    // press / digital paths — ship the overlaid bytes so vector text
    // survives on non-X4 exports too. Digital bypasses overlay above so
    // `workingBytes === rasterBytesArr` in that case.
    triggerBlobDownload(workingBytes, filename, "application/pdf");
  }
}

/** Convert a PNG data URL to a JPEG data URL with a mode-appropriate flat
 *  background so transparent pixels don't come out black. Runs in-browser. */
async function pngDataUrlToJpeg(
  pngDataUrl: string,
  mode: SlideExportMode,
  quality: number,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = pngDataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for JPEG conversion.");
  ctx.fillStyle = mode === "dark" ? "#03002C" : "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

function triggerBlobDownload(bytes: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
