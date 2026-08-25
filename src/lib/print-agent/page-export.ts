// Print-ready export helpers for the Print Agent chat.
//
// The agent's export step hands a single, already-rendered print page node to
// these functions and gets back real deliverables:
//   • PDF — press output at 300 DPI with bleed + crop marks and vector text
//           (same engine the asset editor uses, so parity is guaranteed).
//   • PNG — flattened raster at print resolution for placement / review.
//   • SVG — a page-sized vector container (inches) with the page raster placed
//           at full bleed, for teams whose workflow expects an SVG wrapper.
import {
  PRINT_PAGE_PRESETS,
  exportPrintAssetAsPdf,
  resolvePrintPixelWidth,
  type PrintPageDimensions,
  type PrintPageSizeKey,
} from "@/lib/print-asset-export";
import { captureSlideAsDataUrl, type SlideExportMode } from "@/lib/slide-image-export";

export type PrintPageExportFormat = "pdf" | "png" | "svg";

export const PRINT_PAGE_EXPORT_FORMATS: PrintPageExportFormat[] = ["pdf", "png", "svg"];

export type PrintPageExportOptions = {
  /** Trim size of the page being exported. */
  pageSize: PrintPageSizeKey;
  custom?: PrintPageDimensions;
  mode?: SlideExportMode;
  /** Bleed in inches (PDF only). Defaults to 0.125in press standard. */
  bleedIn?: number;
  /** Base filename without extension. */
  baseName: string;
  onProgress?: (p: { progress: number; message: string }) => void;
};

const PRINT_DPI = 300;

export function printPageTrim(
  pageSize: PrintPageSizeKey,
  custom?: PrintPageDimensions,
): PrintPageDimensions {
  if (pageSize === "Custom") return custom ?? PRINT_PAGE_PRESETS.Letter;
  return PRINT_PAGE_PRESETS[pageSize] ?? PRINT_PAGE_PRESETS.Letter;
}

export function printPageFilename(base: string, format: PrintPageExportFormat): string {
  const safe = base.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "print-page";
  return `${safe}.${format}`;
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Rasterize the page at print resolution and return a PNG data URL. */
async function rasterizePage(
  node: HTMLElement,
  opts: PrintPageExportOptions,
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
  const trim = printPageTrim(opts.pageSize, opts.custom);
  const resolved = resolvePrintPixelWidth(trim.widthIn, trim.heightIn, PRINT_DPI);
  const dataUrl = await captureSlideAsDataUrl(node, {
    mode: opts.mode ?? "light",
    targetWidth: resolved.widthPx,
    onProgress: (p) =>
      opts.onProgress?.({
        progress: Math.max(0, Math.min(0.9, p.progress ?? 0)),
        message: p.message ?? "Rendering the page…",
      }),
  });
  return {
    dataUrl,
    widthPx: resolved.widthPx,
    heightPx: Math.round((resolved.widthPx / trim.widthIn) * trim.heightIn),
  };
}

/** Press-ready PDF: 300 DPI, bleed + crop marks, vector text overlay. */
export async function downloadPrintPagePdf(
  node: HTMLElement,
  opts: PrintPageExportOptions,
): Promise<void> {
  const bleedIn = opts.bleedIn ?? 0.125;
  await exportPrintAssetAsPdf(node, {
    pageSize: opts.pageSize,
    ...(opts.custom ? { custom: opts.custom } : {}),
    bleedIn,
    cropMarks: bleedIn > 0,
    mode: opts.mode ?? "light",
    quality: "300dpi",
    format: "press",
    filename: printPageFilename(opts.baseName, "pdf"),
    onProgress: (p) =>
      opts.onProgress?.({ progress: p.progress ?? 0, message: p.message ?? "Building the PDF…" }),
  });
}

/** Flattened PNG at 300 DPI over the trim box. */
export async function downloadPrintPagePng(
  node: HTMLElement,
  opts: PrintPageExportOptions,
): Promise<void> {
  const { dataUrl } = await rasterizePage(node, opts);
  triggerDownload(dataUrl, printPageFilename(opts.baseName, "png"));
  opts.onProgress?.({ progress: 1, message: "PNG saved" });
}

/**
 * SVG wrapper sized in inches with the page raster placed edge to edge. The
 * artwork itself is a raster (print layouts are CSS-composited, not vector
 * primitives), so this is a placement container — use the PDF for press.
 */
export async function downloadPrintPageSvg(
  node: HTMLElement,
  opts: PrintPageExportOptions,
): Promise<void> {
  const trim = printPageTrim(opts.pageSize, opts.custom);
  const { dataUrl, widthPx, heightPx } = await rasterizePage(node, opts);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${trim.widthIn}in" height="${trim.heightIn}in" ` +
    `viewBox="0 0 ${widthPx} ${heightPx}">` +
    `<title>${opts.baseName.replace(/[<>&]/g, " ")}</title>` +
    `<image x="0" y="0" width="${widthPx}" height="${heightPx}" ` +
    `preserveAspectRatio="none" xlink:href="${dataUrl}"/>` +
    `</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    triggerDownload(url, printPageFilename(opts.baseName, "svg"));
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  opts.onProgress?.({ progress: 1, message: "SVG saved" });
}

export async function downloadPrintPageAsset(
  format: PrintPageExportFormat,
  node: HTMLElement,
  opts: PrintPageExportOptions,
): Promise<void> {
  if (format === "pdf") return downloadPrintPagePdf(node, opts);
  if (format === "png") return downloadPrintPagePng(node, opts);
  return downloadPrintPageSvg(node, opts);
}
