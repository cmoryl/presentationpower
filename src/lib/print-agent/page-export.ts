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
  const safe =
    base
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase() || "print-page";
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

/**
 * Off-screen export staging fails silently when the page never painted (a
 * layout that threw mid-render, or content that hydrated after capture). Assert
 * the node is real and carries artwork so the export toast can name the reason
 * instead of writing a blank file or dying inside the rasterizer.
 */
export function assertPrintPageReady(node: HTMLElement | null | undefined): HTMLElement {
  if (!node) throw new Error("The page could not be rendered for export.");
  const rect = node.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8)
    throw new Error("The page rendered with no size — reopen the piece and try the export again.");
  const hasText = (node.textContent ?? "").trim().length > 0;
  const hasArt = node.querySelector("img, svg, canvas, video") !== null;
  if (!hasText && !hasArt)
    throw new Error(
      "This page has no renderable content yet — add or fix its content, then export again.",
    );
  return node;
}

/**
 * Wait until the staged page is actually paintable: fonts loaded, images
 * decoded (bounded), then two frames of layout. Replaces a fixed short delay,
 * which truncated heavy pages with hero imagery.
 */
export async function waitForPrintPageReady(node: HTMLElement, timeoutMs = 6000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const remaining = () => Math.max(0, deadline - Date.now());
  const cap = <T>(p: Promise<T>) =>
    Promise.race([p, new Promise<void>((r) => setTimeout(r, remaining()))]);

  if (typeof document !== "undefined" && document.fonts) await cap(document.fonts.ready);

  const images = Array.from(node.querySelectorAll("img"));
  await cap(
    Promise.all(
      images.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const done = () => resolve();
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
      ),
    ),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60)));
  });
}

/**
 * Full staging gate for an off-screen export: wait for the page node to mount
 * and take real layout size, wait for fonts/images, then assert it carries
 * renderable content. Returns the node to capture.
 */
export async function stagePrintPageForExport(
  container: HTMLElement | null | undefined,
  opts: { timeoutMs?: number; onProgress?: (message: string) => void } = {},
): Promise<HTMLElement> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const deadline = Date.now() + timeoutMs;
  if (!container) throw new Error("The page could not be rendered for export.");

  let node: HTMLElement | null = null;
  while (Date.now() < deadline) {
    node = container.querySelector<HTMLElement>("[data-print-page]") ?? null;
    const rect = node?.getBoundingClientRect();
    if (rect && rect.width >= 8 && rect.height >= 8) break;
    await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 16)));
  }
  opts.onProgress?.("Preparing the page at trim size…");
  const ready = assertPrintPageReady(node);
  await waitForPrintPageReady(ready, Math.max(1000, deadline - Date.now()));
  return assertPrintPageReady(ready);
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
