// Client-side thumbnail + standardized aspect ratio generator.
// Runs in the browser via <canvas>; keeps the Worker runtime free of
// sharp/canvas dependencies. Returns base64 JPEG payloads that plug directly
// into the same upload envelope as the original file.

export type VariantPreset = "thumb" | "square" | "portrait" | "landscape";

export type VariantSpec = {
  preset: VariantPreset;
  // target canvas dimensions in px (aspect ratio + cap)
  width: number;
  height: number;
  quality: number; // 0..1 jpeg quality
};

export const VARIANT_PRESETS: VariantSpec[] = [
  { preset: "thumb", width: 480, height: 600, quality: 0.82 }, // 4:5 grid
  { preset: "square", width: 800, height: 800, quality: 0.85 }, // 1:1
  { preset: "portrait", width: 960, height: 1280, quality: 0.88 }, // 3:4 hero
  { preset: "landscape", width: 1600, height: 900, quality: 0.86 }, // 16:9 slide
];

export type GeneratedVariant = {
  preset: VariantPreset;
  filename: string;
  contentType: "image/jpeg";
  data: string; // data: URL
  width: number;
  height: number;
  bytes: number;
};

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// center-crop to the target aspect, then downscale to (targetW,targetH).
function drawCoverCrop(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): HTMLCanvasElement {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const srcAspect = sw / sh;
  const dstAspect = targetW / targetH;

  let cropW = sw;
  let cropH = sh;
  if (srcAspect > dstAspect) {
    cropW = Math.round(sh * dstAspect);
  } else {
    cropH = Math.round(sw / dstAspect);
  }
  const sx = Math.round((sw - cropW) / 2);
  const sy = Math.round((sh - cropH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToDataURL(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

function b64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  // 4 base64 chars => 3 bytes
  const padding = (b64.match(/=+$/)?.[0]?.length ?? 0);
  return Math.floor((b64.length * 3) / 4) - padding;
}

/**
 * Generate the full variant set for an uploaded image.
 * SVGs and non-raster types are skipped (returns empty array) so callers
 * can fall back to the original.
 */
export async function generateImageVariants(file: File): Promise<GeneratedVariant[]> {
  if (!file.type.startsWith("image/")) return [];
  if (file.type === "image/svg+xml") return []; // vectors don't need raster crops
  if (typeof document === "undefined") return []; // SSR guard

  let img: HTMLImageElement;
  try {
    img = await loadBitmap(file);
  } catch {
    return [];
  }

  const base = file.name.replace(/\.[^.]+$/, "");
  const out: GeneratedVariant[] = [];
  for (const spec of VARIANT_PRESETS) {
    // Skip presets larger than the source in both dimensions to avoid upscaling.
    const w = Math.min(spec.width, img.naturalWidth || spec.width);
    const h = Math.min(spec.height, img.naturalHeight || spec.height);
    const scale = Math.min(w / spec.width, h / spec.height);
    const outW = Math.max(64, Math.round(spec.width * scale));
    const outH = Math.max(64, Math.round(spec.height * scale));
    try {
      const canvas = drawCoverCrop(img, outW, outH);
      const dataUrl = canvasToDataURL(canvas, spec.quality);
      out.push({
        preset: spec.preset,
        filename: `${base}.${spec.preset}.jpg`,
        contentType: "image/jpeg",
        data: dataUrl,
        width: outW,
        height: outH,
        bytes: b64Bytes(dataUrl),
      });
    } catch {
      /* skip this preset on failure */
    }
  }
  return out;
}

export function pickVariantUrl(
  variantUrls: Partial<Record<VariantPreset, string | null>> | null | undefined,
  preferred: VariantPreset[],
  fallback: string | null | undefined,
): string | null {
  if (variantUrls) {
    for (const p of preferred) {
      const url = variantUrls[p];
      if (url) return url;
    }
  }
  return fallback ?? null;
}
