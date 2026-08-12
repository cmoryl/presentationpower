// -----------------------------------------------------------------------------
// Vector → raster flattening for exports (the "prefer vector" preference)
// -----------------------------------------------------------------------------
// `getPreferVector()` used to be honoured in ONE place: `fetchAsDataUrl`, which
// covers logos and backdrops. Inline icon glyphs went through
// `iconGlyphDataUrl` and always shipped SVG, so with the toggle OFF a deck
// exported rasterized logos next to vector icons — and PowerPoint 2016 and
// Google Slides render embedded SVG inconsistently, which is exactly what the
// toggle exists to avoid.
//
// The glyph resolver is synchronous (it is called from inside the sync module
// renderers) while rasterization needs an <img> decode, so the flattening is
// done on the finished bytes instead: every `ppt/media/*.svg` is decoded,
// painted to a canvas and swapped for a PNG, with the part name rewritten in
// every relationship file that referenced it.
//
// Non-fatal by construction, like the other zip passes: any failure leaves the
// blob untouched, and a single un-rasterizable glyph keeps its SVG.
// -----------------------------------------------------------------------------

import type JSZipT from "jszip";

/** Icons and small marks; big enough that a 24px glyph stays crisp on a slide. */
const RASTER_PX = 512;

async function svgToPngBytes(svg: string): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;
  try {
    const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("SVG decode failed"));
      el.src = url;
    });
    const w = img.naturalWidth || 24;
    const h = img.naturalHeight || 24;
    const scale = RASTER_PX / Math.max(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (e) {
    console.warn("[pptx-vector-flatten] rasterization failed", e);
    return null;
  }
}

/**
 * Replace every embedded SVG in the package with a PNG of the same picture.
 * Returns the number of media parts converted (0 = nothing changed).
 */
export async function flattenVectorMedia(zip: JSZipT): Promise<number> {
  const svgParts = Object.keys(zip.files).filter((n) => /^ppt\/media\/[^/]+\.svg$/i.test(n));
  if (!svgParts.length) return 0;

  const renamed = new Map<string, string>();
  for (const part of svgParts) {
    try {
      const svg = await zip.file(part)!.async("string");
      const png = await svgToPngBytes(svg);
      if (!png) continue;
      const target = part.replace(/\.svg$/i, ".png");
      zip.file(target, png);
      zip.remove(part);
      renamed.set(part.split("/").pop()!, target.split("/").pop()!);
    } catch (e) {
      console.warn(`[pptx-vector-flatten] skipped ${part}`, e);
    }
  }
  if (!renamed.size) return 0;

  // Rewrite every reference to the old file names (slide/master/layout rels)
  // and make sure the package declares the png default extension.
  for (const name of Object.keys(zip.files)) {
    if (!/\.(rels|xml)$/i.test(name)) continue;
    if (/^ppt\/media\//.test(name)) continue;
    try {
      const xml = await zip.file(name)!.async("string");
      let out = xml;
      for (const [from, to] of renamed) out = out.split(from).join(to);
      if (name === "[Content_Types].xml" && !/Extension="png"/i.test(out)) {
        out = out.replace(
          /<Types([^>]*)>/,
          `<Types$1><Default Extension="png" ContentType="image/png"/>`,
        );
      }
      if (out !== xml) zip.file(name, out);
    } catch (e) {
      console.warn(`[pptx-vector-flatten] rel rewrite skipped ${name}`, e);
    }
  }
  return renamed.size;
}
