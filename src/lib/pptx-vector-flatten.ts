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
// SIZING (fix, follow-up to the surface/icon parity pass): the first cut used a
// flat 512px ceiling, which is right for a 24px glyph and destroys anything
// larger — an aurora backdrop or a wide logo lockup came back crushed. The
// raster is now sized to the box the picture is actually DRAWN at: every
// slide / layout / master is scanned for `<p:pic>` extents, the relationship id
// is resolved to its media part, and the largest placement wins. Target pixels
// = drawn inches × the export DPI already chosen in `export-quality.ts`, with a
// hard ceiling so an ultra export cannot blow past canvas limits. A media part
// with no resolvable placement (rare: unused media) falls back to the icon-scale
// default rather than being upscaled blindly.
//
// Non-fatal by construction, like the other zip passes: any failure leaves the
// blob untouched, and a single un-rasterizable glyph keeps its SVG.
// -----------------------------------------------------------------------------

import type JSZipT from "jszip";
import { exportQualityById, type ExportQualityId } from "@/lib/export-quality";

/** EMU per inch (OOXML). */
const EMU_PER_IN = 914400;

/** Fallback for media with no resolvable placement — icon scale, as before. */
const FALLBACK_PX = 512;

/** Ceiling per axis; matches the background-plate cap in export-quality. */
const MAX_PX = 4096;

/** Never rasterize below this: a 12px mark still needs enough pixels to read. */
const MIN_PX = 64;

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
    canvas.width = Math.min(MAX_PX, Math.max(1, Math.round(w * scale)));
    canvas.height = Math.min(MAX_PX, Math.max(1, Math.round(h * scale)));
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

/** `rIdN` → `ppt/media/imageN.svg` for one drawing part's `.rels`. */
function relTargets(relsXml: string, partDir: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml))) {
    const target = m[2];
    if (/^https?:/i.test(target)) continue;
    // Targets are relative to the part's folder ("../media/image3.svg").
    const segs = `${partDir}/${target}`.split("/");
    const norm: string[] = [];
    for (const s of segs) {
      if (s === "." || s === "") continue;
      if (s === "..") norm.pop();
      else norm.push(s);
    }
    out.set(m[1], norm.join("/"));
  }
  return out;
}

/**
 * Largest DRAWN size, in inches, for every media part referenced by a picture
 * anywhere in the package. Reads `<p:pic>` blocks (including group children,
 * whose `a:ext` is in the same local units) from slides, layouts and masters.
 */
export async function measureMediaExtents(zip: JSZipT): Promise<Map<string, number>> {
  const drawn = new Map<string, number>();
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
      const picRe = /<p:pic\b[\s\S]*?<\/p:pic>/g;
      let pic: RegExpExecArray | null;
      while ((pic = picRe.exec(xml))) {
        const body = pic[0];
        const ext = body.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (!ext) continue;
        const inches = Math.max(Number(ext[1]), Number(ext[2])) / EMU_PER_IN;
        if (!Number.isFinite(inches) || inches <= 0) continue;
        const embeds = body.matchAll(/r:embed="([^"]+)"/g);
        for (const e of embeds) {
          const target = rels.get(e[1]);
          if (!target) continue;
          const key = target.split("/").pop()!;
          drawn.set(key, Math.max(drawn.get(key) ?? 0, inches));
        }
      }
    } catch (e) {
      console.warn(`[pptx-vector-flatten] extent scan skipped ${part}`, e);
    }
  }
  return drawn;
}

/** Target long-edge pixels for a media part drawn at `inches` under `quality`. */
export function rasterTargetPx(inches: number | undefined, quality?: ExportQualityId | null): number {
  if (!inches || !Number.isFinite(inches) || inches <= 0) return FALLBACK_PX;
  const dpi = exportQualityById(quality ?? null).dpi;
  return Math.min(MAX_PX, Math.max(MIN_PX, Math.round(inches * dpi)));
}

/**
 * Replace every embedded SVG in the package with a PNG of the same picture,
 * rasterized at the resolution its drawn box actually needs.
 * Returns the number of media parts converted (0 = nothing changed).
 */
export async function flattenVectorMedia(
  zip: JSZipT,
  opts: { quality?: ExportQualityId | null } = {},
): Promise<number> {
  const svgParts = Object.keys(zip.files).filter((n) => /^ppt\/media\/[^/]+\.svg$/i.test(n));
  if (!svgParts.length) return 0;

  const extents = await measureMediaExtents(zip);

  const renamed = new Map<string, string>();
  for (const part of svgParts) {
    try {
      const svg = await zip.file(part)!.async("string");
      const base = part.split("/").pop()!;
      const png = await svgToPngBytes(svg, rasterTargetPx(extents.get(base), opts.quality));
      if (!png) continue;
      const target = part.replace(/\.svg$/i, ".png");
      zip.file(target, png);
      zip.remove(part);
      renamed.set(base, target.split("/").pop()!);
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
