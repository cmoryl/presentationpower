// -----------------------------------------------------------------------------
// Raster fallback upscaling for SVG pictures
// -----------------------------------------------------------------------------
// pptxgenjs embeds an SVG picture the way PowerPoint expects: the primary
// `<a:blip>` points at a PNG and an `asvg:svgBlip` extension points at the real
// vector. PowerPoint 2019+/M365 on Windows draws the vector; Mac PowerPoint,
// Google Slides, LibreOffice, most thumbnailers and every "paste as picture"
// path draw the PNG instead.
//
// That PNG is generated at the SVG's INTRINSIC size. Icon glyphs are authored on
// a 24×24 viewBox, so the fallback shipped as a 24×24 bitmap and got scaled up
// ~6× on the slide — the "icons look soft / low quality" report. The vector was
// there; the raster everyone else rendered was tiny.
//
// This pass re-renders each fallback PNG from its own paired SVG at the size the
// picture is actually DRAWN at (drawn inches × the chosen export DPI, reusing the
// same measurement the vector-flatten pass uses). The package structure is
// untouched: same part names, same relationships, same svgBlip — only the bytes
// of the fallback raster change, so vector-capable viewers are unaffected.
//
// Non-fatal by construction: any failure leaves that PNG as-is.
// -----------------------------------------------------------------------------

import type JSZipT from "jszip";
import type { ExportQualityId } from "@/lib/export-quality";
import { measureMediaExtents, rasterTargetPx, relTargets } from "@/lib/pptx-vector-flatten";

/** Long-edge pixels of a PNG, read straight from the IHDR chunk. */
export function pngLongEdge(bytes: Uint8Array): number | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w = view.getUint32(16);
  const h = view.getUint32(20);
  if (!w || !h) return null;
  return Math.max(w, h);
}

async function svgToPngBytes(svg: string, targetPx: number): Promise<Uint8Array | null> {
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
    const scale = targetPx / Math.max(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    console.warn("[pptx-raster-fallback] rasterization failed", e);
    return null;
  }
}

/** `pngPart` → `svgPart` for every picture that carries an svgBlip fallback. */
export async function collectFallbackPairs(zip: JSZipT): Promise<Map<string, string>> {
  const pairs = new Map<string, string>();
  const parts = Object.keys(zip.files).filter((n) =>
    /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/i.test(n),
  );
  for (const part of parts) {
    const dir = part.slice(0, part.lastIndexOf("/"));
    const relsName = `${dir}/_rels/${part.slice(part.lastIndexOf("/") + 1)}.rels`;
    const relsFile = zip.file(relsName);
    if (!relsFile) continue;
    try {
      const rels = relTargets(await relsFile.async("string"), dir);
      const xml = await zip.file(part)!.async("string");
      for (const blip of xml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"[\s\S]*?<\/a:blip>/g)) {
        const svgRef = blip[0].match(/svgBlip[^>]*r:embed="([^"]+)"/);
        if (!svgRef) continue;
        const png = rels.get(blip[1]);
        const svg = rels.get(svgRef[1]);
        if (!png || !svg || !/\.svg$/i.test(svg)) continue;
        pairs.set(png, svg);
      }
    } catch (e) {
      console.warn(`[pptx-raster-fallback] scan skipped ${part}`, e);
    }
  }
  return pairs;
}

/**
 * Re-render every SVG picture's PNG fallback at its drawn resolution.
 * Returns the number of fallback rasters replaced (0 = nothing changed).
 */
export async function upscaleRasterFallbacks(
  zip: JSZipT,
  opts: { quality?: ExportQualityId | null } = {},
): Promise<number> {
  const pairs = await collectFallbackPairs(zip);
  if (!pairs.size) return 0;
  const extents = await measureMediaExtents(zip);
  let replaced = 0;
  for (const [pngPart, svgPart] of pairs) {
    try {
      const pngFile = zip.file(pngPart);
      const svgFile = zip.file(svgPart);
      if (!pngFile || !svgFile) continue;
      // The drawn extent is recorded against the PRIMARY blip's media part, which
      // is this PNG — the svgBlip child is never measured on its own.
      // Supersample: the fallback is what gets scaled when a viewer zooms, prints
      // or renders on a retina display, and at icon scale the plain DPI target
      // (48–60px for a 0.32" glyph) still reads soft. 3× with a 256px floor keeps
      // glyphs crisp for a few KB each.
      const target = Math.min(
        1024,
        Math.max(256, rasterTargetPx(extents.get(pngPart.split("/").pop()!), opts.quality) * 3),
      );

      const current = pngLongEdge(await pngFile.async("uint8array"));
      // Leave anything already at (or above) the drawn resolution alone: a
      // needless re-encode only costs bytes.
      if (current != null && current >= target * 0.9) continue;
      const bytes = await svgToPngBytes(await svgFile.async("string"), target);
      if (!bytes) continue;
      zip.file(pngPart, bytes);
      replaced += 1;
    } catch (e) {
      console.warn(`[pptx-raster-fallback] skipped ${pngPart}`, e);
    }
  }
  return replaced;
}
