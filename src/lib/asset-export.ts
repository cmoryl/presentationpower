// -----------------------------------------------------------------------------
// Universal asset export.
//
// Decks and print assets each grew their own exporter. Social posts, event
// collateral and any other DOM-rendered asset now share this one: capture a
// node at its NATIVE pixel size (ignoring the preview transform), then emit
// PNG / JPG / WebP / PDF, or bundle a set as a zip.
//
// Every function returns a Blob so callers — and the export audit — can verify
// the bytes instead of trusting a download click.
// -----------------------------------------------------------------------------

import JSZip from "jszip";
import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";
import { exportNodeFilter, withExportChrome } from "@/lib/export-chrome-suppress";
import { getCachedFontEmbedCSS } from "@/lib/slide-image-export";

export type AssetImageFormat = "png" | "jpg" | "webp";

export const ASSET_IMAGE_MIME: Record<AssetImageFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export type AssetCaptureTarget = {
  /** The node to rasterize. May be visually scaled by a preview transform. */
  node: HTMLElement;
  /** Native asset width in px (e.g. 1080 for an IG square). */
  width: number;
  /** Native asset height in px. */
  height: number;
  /** Used for filenames and zip entries. */
  label?: string;
};

export type AssetImageOptions = {
  format?: AssetImageFormat;
  /** Multiplier over the native size. 1 = exact platform pixels. */
  scale?: number;
  /** JPEG/WebP quality, 0–1. Defaults to 0.92. */
  quality?: number;
  /** Flat backdrop painted under transparent pixels (jpg always needs one). */
  background?: string;
};

const MAX_CANVAS_EDGE = 8192;

function safeScale(width: number, height: number, scale: number): number {
  const longest = Math.max(width, height) * scale;
  if (longest <= MAX_CANVAS_EDGE) return scale;
  return Math.max(0.25, MAX_CANVAS_EDGE / Math.max(width, height));
}

/**
 * Rasterize a preview node at its true asset size. The preview wrapper scales
 * the frame with a CSS transform; we neutralize it during capture so the output
 * is pixel-exact rather than a blown-up thumbnail.
 */
export async function captureAssetCanvas(
  target: AssetCaptureTarget,
  opts: AssetImageOptions = {},
): Promise<HTMLCanvasElement> {
  const { node, width, height } = target;
  if (!node) throw new Error("captureAssetCanvas: node is required");
  if (!(width > 0 && height > 0)) throw new Error("captureAssetCanvas: native size is required");

  const scale = safeScale(width, height, opts.scale && opts.scale > 0 ? opts.scale : 1);
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* best effort */
    }
  }
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(async (img) => {
      if (typeof img.decode === "function") {
        try {
          await img.decode();
          return;
        } catch {
          /* fall through */
        }
      }
      if (!(img.complete && img.naturalWidth > 0)) {
        await new Promise<void>((r) => {
          img.addEventListener("load", () => r(), { once: true });
          img.addEventListener("error", () => r(), { once: true });
        });
      }
    }),
  );

  const fontEmbedCSS = await getCachedFontEmbedCSS(node).catch(() => "");
  return withExportChrome(() =>
    toCanvas(node, {
      width,
      height,
      // `pixelRatio` is what actually re-renders the DOM at a larger size;
      // canvasWidth/Height alone only resize the canvas and leave the artwork
      // drawn 1:1 in the top-left corner.
      pixelRatio: scale,
      cacheBust: false,
      filter: exportNodeFilter,
      fontEmbedCSS,
      backgroundColor: opts.background,
      style: {
        transform: "none",
        transformOrigin: "top left",
        margin: "0",
        width: `${width}px`,
        height: `${height}px`,
      },
    }),
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: AssetImageFormat,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error(`canvas.toBlob returned null (${format})`)),
      ASSET_IMAGE_MIME[format],
      format === "png" ? undefined : quality,
    );
  });
}

/** Capture one asset node as an image blob at `scale`× its native size. */
export async function exportAssetImage(
  target: AssetCaptureTarget,
  opts: AssetImageOptions = {},
): Promise<Blob> {
  const format = opts.format ?? "png";
  // JPEG has no alpha: give it an explicit page white unless the caller chose.
  const background = opts.background ?? (format === "jpg" ? "#ffffff" : undefined);
  const canvas = await captureAssetCanvas(target, { ...opts, background });
  const blob = await canvasToBlob(canvas, format, opts.quality ?? 0.92);
  if (blob.size === 0) throw new Error("exportAssetImage produced an empty blob");
  return blob;
}

/**
 * One PDF page per asset, each page sized to that asset's own aspect (in
 * inches at 96 CSS px/in) so nothing is letterboxed or stretched.
 */
export async function exportAssetsPdf(
  targets: AssetCaptureTarget[],
  opts: AssetImageOptions & { onProgress?: (done: number, total: number) => void } = {},
): Promise<Blob> {
  if (targets.length === 0) throw new Error("exportAssetsPdf: no assets provided");
  let pdf: jsPDF | null = null;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const wIn = t.width / 96;
    const hIn = t.height / 96;
    const orientation = wIn >= hIn ? "landscape" : "portrait";
    const canvas = await captureAssetCanvas(t, {
      ...opts,
      background: opts.background ?? "#ffffff",
    });
    const dataUrl = canvas.toDataURL("image/jpeg", opts.quality ?? 0.92);
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: "in", format: [wIn, hIn], compress: true });
    } else {
      pdf.addPage([wIn, hIn], orientation);
    }
    pdf.addImage(dataUrl, "JPEG", 0, 0, wIn, hIn, undefined, "FAST");
    opts.onProgress?.(i + 1, targets.length);
  }
  return pdf!.output("blob");
}

export function assetFileSlug(label: string | undefined, fallback = "asset"): string {
  return (
    (label ?? fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || fallback
  );
}

/** Bundle a set of assets as images inside a zip, with a manifest. */
export async function exportAssetsZip(
  targets: AssetCaptureTarget[],
  opts: AssetImageOptions & {
    bundleName?: string;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<Blob> {
  if (targets.length === 0) throw new Error("exportAssetsZip: no assets provided");
  const format = opts.format ?? "png";
  const bundle = assetFileSlug(opts.bundleName, "assets");
  const zip = new JSZip();
  const folder = zip.folder(bundle)!;
  const manifest: Array<Record<string, unknown>> = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const blob = await exportAssetImage(t, opts);
    const name = `${String(i + 1).padStart(2, "0")}-${assetFileSlug(t.label, "asset")}-${t.width}x${t.height}.${format}`;
    folder.file(name, blob);
    manifest.push({
      file: name,
      label: t.label ?? null,
      width: t.width,
      height: t.height,
      bytes: blob.size,
    });
    opts.onProgress?.(i + 1, targets.length);
  }
  folder.file(
    "manifest.json",
    JSON.stringify(
      { bundle, exportedAt: new Date().toISOString(), format, assets: manifest },
      null,
      2,
    ),
  );
  return zip.generateAsync({ type: "blob" });
}

/** Hand a blob to the browser as a download. */
export function downloadAssetBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
