/**
 * Shared PowerPoint image-format compatibility helpers.
 *
 * Only PowerPoint 2019+/M365 decode WebP. Every earlier build (and a number of
 * thumbnailers, plus LibreOffice's older converters) shows a broken-picture
 * placeholder instead. Any WebP bitmap must therefore be re-encoded before it
 * enters the package — on EVERY embed path, not just the main one:
 *
 *   1. pptx-export.ts   → fetchAsDataUrlOnce (logos, media tiles, imagery)
 *   2. pptx-background.ts → fetchDataUrl (pre-encoded backdrop / slide-master
 *      background route, which is where dark-mode backdrops enter)
 *
 * Verified by scripts/verify-feature-compat.mjs.
 */

import { readExportAlphaImages, readExportLegacyImages } from "./export-quality";

/**
 * True when the reviewer asked for maximum compatibility: every embedded
 * bitmap must be JPEG or PNG (see export-quality.ts). WebP is transcoded
 * regardless of this setting.
 */
export function forceLegacyImageFormats(): boolean {
  try {
    return readExportLegacyImages();
  } catch {
    return false;
  }
}

/**
 * True when every bitmap should be normalized by its own alpha channel:
 * transparent → PNG, opaque → JPEG (see export-quality.ts). This is exactly
 * what transcodeToUniversalDataUrl already decides, so enabling it simply means
 * routing *all* bitmaps through the transcoder instead of only risky ones.
 */
export function normalizeImagesByAlpha(): boolean {
  try {
    return readExportAlphaImages();
  } catch {
    return false;
  }
}


/** Formats every PowerPoint version since 2007 decodes natively. */
function isUniversalBitmap(fmt: string): boolean {
  return fmt === "jpeg" || fmt === "png";
}

/** True when a blob/data URL/source URL is a WebP bitmap. */
export function isWebpSource(opts: {
  blobType?: string | null;
  dataUrl?: string | null;
  url?: string | null;
}): boolean {
  return (
    opts.blobType === "image/webp" ||
    /^data:image\/webp/i.test(opts.dataUrl ?? "") ||
    /\.webp(\?|#|$)/i.test(opts.url ?? "")
  );
}

/**
 * Re-encode a bitmap data URL that PowerPoint may not decode (WebP today) into
 * a format every version reads. Photographs go to JPEG to keep the package
 * small; anything with transparency goes to PNG so the alpha survives.
 * Returns null when the browser cannot decode the source (never fatal).
 */
export async function transcodeToUniversalDataUrl(dataUrl: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("bitmap decode failed"));
      el.src = dataUrl;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    // Sample the alpha channel: a single translucent pixel means PNG.
    let hasAlpha = false;
    try {
      const { data } = ctx.getImageData(0, 0, w, h);
      const step = Math.max(4, Math.floor(data.length / 4 / 20000) * 4);
      for (let i = 3; i < data.length; i += step) {
        if (data[i] < 250) {
          hasAlpha = true;
          break;
        }
      }
    } catch {
      hasAlpha = true;
    }
    return hasAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
  } catch (e) {
    console.warn("[pptx] bitmap transcode failed", e);
    return null;
  }
}

/**
 * Convenience wrapper: hand it whatever a fetch produced and get back a data
 * URL that is safe for every PowerPoint version. Non-WebP passes through.
 */
export async function toPowerPointSafeDataUrl(
  dataUrl: string,
  opts: { blobType?: string | null; url?: string | null; label?: string } = {},
): Promise<string> {
  const label = opts.label ?? "image";
  const sourceFormat = formatFromHints({ blobType: opts.blobType, dataUrl, url: opts.url });
  const isWebp = isWebpSource({ blobType: opts.blobType, dataUrl, url: opts.url });
  // "Maximize compatibility" additionally re-encodes GIF/TIFF/AVIF/HEIC and any
  // unrecognized bitmap. SVG is handled upstream (rasterized before it reaches
  // here) because it needs a vector-aware rasterizer.
  const forcedLegacy =
    !isWebp &&
    sourceFormat !== "svg" &&
    !isUniversalBitmap(sourceFormat) &&
    forceLegacyImageFormats();
  if (!isWebp && !forcedLegacy) {
    // Passed through untouched — still logged so the post-export report can list
    // every embedded image type, not just the ones needing a rewrite.
    recordImageEmbed({
      label,
      source: opts.url ?? null,
      sourceFormat,
      embeddedFormat: sourceFormat,
      transcoded: false,
    });
    return dataUrl;
  }
  const transcoded = await transcodeToUniversalDataUrl(dataUrl);
  if (transcoded) {
    recordImageEmbed({
      label,
      source: opts.url ?? null,
      sourceFormat,
      embeddedFormat: formatFromHints({ dataUrl: transcoded }),
      transcoded: true,
    });
    return transcoded;
  }
  console.warn(
    `[pptx] ${label} ${sourceFormat} transcode failed, embedding as-is: ${opts.url ?? "(data url)"}`,
  );
  recordImageEmbed({
    label,
    source: opts.url ?? null,
    sourceFormat,
    embeddedFormat: sourceFormat,
    transcoded: false,
    transcodeFailed: true,
  });
  return dataUrl;
}
