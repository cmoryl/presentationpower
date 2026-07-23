/**
 * Slide Image Export — rasterize a live slide preview to PNG or image-PDF
 * using html-to-image. Companion to `pptx-export.ts`; use this when fidelity
 * matters more than editability (client review copies, share cards, single
 * module snapshots straight from the Library).
 */
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type SlideExportMode = "light" | "dark";

export interface SlideCaptureOptions {
  mode: SlideExportMode;
  filename?: string;
  /** Device pixel ratio multiplier (default 2 → retina). */
  pixelRatio?: number;
  /** Optional CORS-safe cache buster for cross-origin images. */
  cacheBust?: boolean;
}

const MODE_BG: Record<SlideExportMode, string> = {
  light: "#F2F2F2",
  dark: "#03002C",
};

/**
 * Waits for web fonts + all <img> descendants so the raster snapshot doesn't
 * flash unstyled text or missing hero imagery.
 */
async function waitForNodeReady(node: HTMLElement): Promise<void> {
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    /* font loading is best-effort */
  }
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }),
  );
  // Give any late layout/aurora blur a paint to settle.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/**
 * Rasterize a slide DOM node to a PNG data URL. The node must be attached
 * to the document (visible) so styles resolve.
 */
export async function captureSlideAsDataUrl(
  node: HTMLElement,
  opts: SlideCaptureOptions,
): Promise<string> {
  await waitForNodeReady(node);
  const dataUrl = await toPng(node, {
    pixelRatio: opts.pixelRatio ?? 2,
    cacheBust: opts.cacheBust ?? true,
    backgroundColor: MODE_BG[opts.mode],
    // filter external stylesheets/nodes that break serialization
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      if (el.dataset?.exportIgnore === "true") return false;
      return true;
    },
  });
  return dataUrl;
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Rasterize a slide node and trigger a browser download as PNG.
 */
export async function exportSlideAsPng(
  node: HTMLElement,
  opts: SlideCaptureOptions,
): Promise<void> {
  const dataUrl = await captureSlideAsDataUrl(node, opts);
  const filename = opts.filename ?? `slide-${opts.mode}.png`;
  triggerDownload(dataUrl, filename);
}

/**
 * Rasterize one or many slide nodes into a 16:9 landscape PDF (one node per
 * page). Uses a fixed 13.333 × 7.5 inch page — the standard PPTX widescreen
 * size — so the output matches PowerPoint's aspect ratio.
 */
export async function exportSlidesAsImagePdf(
  nodes: Array<{ node: HTMLElement; mode: SlideExportMode }>,
  opts: { filename?: string; pixelRatio?: number } = {},
): Promise<void> {
  if (nodes.length === 0) return;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [13.333, 7.5],
    compress: true,
  });
  for (let i = 0; i < nodes.length; i++) {
    const { node, mode } = nodes[i];
    const dataUrl = await captureSlideAsDataUrl(node, {
      mode,
      pixelRatio: opts.pixelRatio ?? 2,
    });
    if (i > 0) pdf.addPage([13.333, 7.5], "landscape");
    pdf.addImage(dataUrl, "PNG", 0, 0, 13.333, 7.5, undefined, "FAST");
  }
  const filename = opts.filename ?? `slides-${Date.now()}.pdf`;
  pdf.save(filename);
}
