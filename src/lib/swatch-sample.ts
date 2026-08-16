/**
 * SWATCH SAMPLING — read brand colours out of an uploaded file, in the browser.
 *
 * The intake wizard needs real colours before it can derive a look, and the
 * files it gets are whatever the brand team had: a palette screenshot, an SVG
 * logo, a JSON token dump, a photograph. Two readers cover all of it:
 *
 *   * TEXT (json / txt / md / svg) — hex literals in document order. A token
 *     file already lists the palette in intent order, so that order is kept.
 *   * BITMAP (png / jpg / webp) — the image is drawn small and its pixels are
 *     bucketed in a coarse RGB grid; the busiest buckets win. Near-duplicate
 *     buckets are merged so a photograph does not return six shades of the same
 *     sky.
 *
 * Browser-only (canvas + FileReader): import it from event handlers and effects,
 * never from module scope of an SSR route.
 */

import { normalizeHex, saturation, luminance, hexToRgb, rgbToHex } from "./template-intake";

const HEX_LITERAL = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;

/** Hex literals from a text-ish file, de-duplicated, in document order. */
export function swatchesFromText(text: string, limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.match(HEX_LITERAL) ?? []) {
    const hex = normalizeHex(raw);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= limit) break;
  }
  return out;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(new Error("Could not read that file."));
    fr.readAsText(file);
  });
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(new Error("Could not read that file."));
    fr.readAsDataURL(file);
  });
}

export interface DecodedImage {
  width: number;
  height: number;
  swatches: string[];
}

function distance(a: string, b: string): number {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 999;
  return Math.abs(ra.r - rb.r) + Math.abs(ra.g - rb.g) + Math.abs(ra.b - rb.b);
}

/**
 * Dominant colours of a bitmap, most-used first, with the most colourful
 * survivor promoted so a brand accent is never buried under grey.
 */
export async function swatchesFromImage(
  src: string,
  limit = 8,
): Promise<DecodedImage> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("That image could not be decoded."));
    img.src = src;
  });

  const W = 96;
  const H = Math.max(1, Math.round((img.naturalHeight / Math.max(1, img.naturalWidth)) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { width: img.naturalWidth, height: img.naturalHeight, swatches: [] };
  ctx.drawImage(img, 0, 0, W, H);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    // Tainted canvas (cross-origin without CORS): no sampling, no crash.
    return { width: img.naturalWidth, height: img.naturalHeight, swatches: [] };
  }

  // Coarse 16-level-per-channel buckets: enough to separate brand colours,
  // coarse enough that photographic noise collapses.
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 128) continue; // transparent logo padding
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.n += 1;
      cur.r += r;
      cur.g += g;
      cur.b += b;
    } else {
      buckets.set(key, { n: 1, r, g, b });
    }
  }

  const ranked = [...buckets.values()]
    .sort((x, y) => y.n - x.n)
    .map((v) => rgbToHex({ r: v.r / v.n, g: v.g / v.n, b: v.b / v.n }));

  // Merge near-identical entries so the list is genuinely distinct colours.
  const picked: string[] = [];
  for (const hex of ranked) {
    if (picked.some((p) => distance(p, hex) < 40)) continue;
    picked.push(hex);
    if (picked.length >= limit * 2) break;
  }

  // Promote the most colourful mid-tone: on a photograph the top buckets are
  // usually sky or paper, and the accent is what a look actually needs.
  const accent = [...picked]
    .filter((h) => luminance(h) > 0.05 && luminance(h) < 0.9)
    .sort((a, b) => saturation(b) - saturation(a))[0];
  const ordered = accent ? [accent, ...picked.filter((h) => h !== accent)] : picked;

  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    swatches: ordered.slice(0, limit),
  };
}

export interface SampledFile {
  dataUrl: string;
  swatches: string[];
  width: number | null;
  height: number | null;
}

/**
 * One call for the wizard: read the file, sample what can be sampled, and hand
 * back the payload the upload server function expects. Unsampleable types
 * (pdf, pptx, zip) come back with an empty swatch list, which is not an error.
 */
export async function sampleUpload(file: File): Promise<SampledFile> {
  const name = file.name.toLowerCase();
  const dataUrl = await readAsDataUrl(file);

  if (/\.(json|txt|md)$/.test(name)) {
    return { dataUrl, swatches: swatchesFromText(await readAsText(file)), width: null, height: null };
  }

  if (name.endsWith(".svg")) {
    // An SVG carries its palette as literals, which is more faithful than
    // rasterizing it — and it avoids the tainted-canvas path entirely.
    const text = await readAsText(file);
    const fromText = swatchesFromText(text);
    if (fromText.length) return { dataUrl, swatches: fromText, width: null, height: null };
  }

  if (/\.(png|jpe?g|webp|avif|gif|svg)$/.test(name)) {
    try {
      const decoded = await swatchesFromImage(dataUrl);
      return {
        dataUrl,
        swatches: decoded.swatches,
        width: decoded.width || null,
        height: decoded.height || null,
      };
    } catch {
      return { dataUrl, swatches: [], width: null, height: null };
    }
  }

  return { dataUrl, swatches: [], width: null, height: null };
}
