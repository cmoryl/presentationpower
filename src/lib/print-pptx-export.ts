// -----------------------------------------------------------------------------
// Print pages -> PowerPoint
//
// A print piece (proposal, brochure, case study) is authored at a fixed page
// geometry, so the honest PPTX is one slide per page sized to the trim, with the
// rendered page placed edge to edge. Uses the same capture engine as the PDF
// exporter, so authoring chrome (guides, resize rails, edit outlines) is
// suppressed and cross-origin imagery is inlined before rasterization.
// -----------------------------------------------------------------------------

import { captureSlideAsDataUrl } from "./slide-image-export";
import { withExportChrome } from "./export-chrome-suppress";
import { PRINT_PAGE_PRESETS, resolvePrintPixelWidth } from "./print-asset-export";
import type { PrintMode, PrintPageSize } from "./print-assets.types";

export type PrintPptxOptions = {
  /** Trim size key; falls back to Letter when unknown. */
  pageSize?: PrintPageSize | string;
  custom?: { widthIn: number; heightIn: number };
  mode?: PrintMode;
  /** Raster DPI target for each page image (clamped to canvas limits). */
  dpi?: number;
  filename?: string;
  title?: string;
};

function trimOf(opts: PrintPptxOptions): { widthIn: number; heightIn: number } {
  if (opts.custom?.widthIn && opts.custom?.heightIn) return opts.custom;
  const presets = PRINT_PAGE_PRESETS as Record<string, { widthIn: number; heightIn: number }>;
  const preset = presets[String(opts.pageSize ?? "Letter")];
  if (preset) return { widthIn: preset.widthIn, heightIn: preset.heightIn };
  return { widthIn: 8.5, heightIn: 11 };
}

export async function exportPrintPagesAsPptx(
  nodes: HTMLElement | HTMLElement[],
  opts: PrintPptxOptions = {},
): Promise<void> {
  const pages = (Array.isArray(nodes) ? nodes : [nodes]).filter(Boolean);
  if (pages.length === 0) throw new Error("exportPrintPagesAsPptx: no pages provided.");

  const { widthIn, heightIn } = trimOf(opts);
  const dpi = opts.dpi ?? 200;
  const resolved = resolvePrintPixelWidth(widthIn, heightIn, dpi);

  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PRINT_PAGE", width: widthIn, height: heightIn });
  pptx.layout = "PRINT_PAGE";
  if (opts.title) pptx.title = opts.title;

  for (const node of pages) {
    const dataUrl = await withExportChrome(() =>
      captureSlideAsDataUrl(node, {
        mode: opts.mode ?? "light",
        targetWidth: resolved.widthPx,
      }),
    );
    const slide = pptx.addSlide();
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: widthIn, h: heightIn });
  }

  await pptx.writeFile({ fileName: opts.filename ?? "print-asset.pptx" });
}
