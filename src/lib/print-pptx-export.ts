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

  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PRINT_PAGE", width: widthIn, height: heightIn });
  pptx.layout = "PRINT_PAGE";
  if (opts.title) pptx.title = opts.title;

  const slideRatio = widthIn / heightIn;

  for (const node of pages) {
    // Capture at the page's own aspect ratio, then letterbox it into the slide.
    // Stretching the raster to the trim box was what skewed type and artwork.
    const rect = node.getBoundingClientRect();
    const nodeRatio = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : slideRatio;
    const resolved = resolvePrintPixelWidth(widthIn, heightIn, dpi);
    const png = await withExportChrome(() =>
      captureSlideAsDataUrl(node, {
        mode: opts.mode ?? "light",
        targetWidth: resolved.widthPx,
      }),
    );
    // Page rasters are photographic (gradients, imagery, maps): PNG runs 2-4MB
    // each and a 20-page proposal produced a ~50MB file PowerPoint struggles to
    // open and re-render. Re-encode to high-quality JPEG on an opaque white
    // canvas — same pixels, ~10x smaller, no transparency to lose.
    const dataUrl = await toJpeg(png, 0.92);

    let w = widthIn;
    let h = widthIn / nodeRatio;
    if (h > heightIn) {
      h = heightIn;
      w = heightIn * nodeRatio;
    }
    const x = (widthIn - w) / 2;
    const y = (heightIn - h) / 2;

    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addImage({ data: dataUrl, x, y, w, h });
  }



  // pptxgenjs emits <p:notesMasterIdLst> after <p:sldIdLst>, which violates the
  // PresentationML sequence (masters -> notes master -> slides -> sizes). Repair
  // the order before writing so the file passes strict OOXML validation.
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  const fileName = opts.filename ?? "print-asset.pptx";
  const fixed = await reorderPresentationXml(blob);
  triggerDownload(fixed, fileName);
}

async function reorderPresentationXml(blob: Blob): Promise<Blob> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const entry = zip.file("ppt/presentation.xml");
    if (!entry) return blob;
    const xml = await entry.async("string");
    const notes = xml.match(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/);
    if (!notes || xml.indexOf(notes[0]) < xml.indexOf("<p:sldIdLst>")) return blob;
    const next = xml
      .replace(notes[0], "")
      .replace("<p:sldIdLst>", `${notes[0]}<p:sldIdLst>`);
    zip.file("ppt/presentation.xml", next);
    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  } catch {
    return blob;
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

