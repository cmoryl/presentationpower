// CMYK copy of a vector map PDF, built only from signed-off print builds.
//
// Every colour on a map must be one of: a brand colour with an approved build,
// a tint of one (same inks, scaled toward paper white), or a neutral grey (black
// only). Anything else stops the download and is named — nothing is converted
// silently. Placed pictures (e.g. a raster lockup) cannot be re-inked here and
// are reported so the file is never mistaken for an all-CMYK master.

import { BRAND } from "@/lib/brand-colors";
import { londonCmykBuild, type Cmyk } from "@/lib/next-london-cmyk";

const TOL = 0.025;

const CANDIDATES = Array.from(
  new Set(
    [BRAND.blue, BRAND.ink, BRAND.aqua, BRAND.lavender, BRAND.yellow, BRAND.green, BRAND.peach, BRAND.pink, BRAND.red]
      .map((h) => h.toLowerCase()),
  ),
);

const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const hexOf = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** Print build for one screen colour (channels 0–1), or null when none is approved. */
export function mapPrintBuild(r: number, g: number, b: number): Cmyk | null {
  // Neutral greys and black print on the black plate only.
  if (Math.abs(r - g) < 0.02 && Math.abs(g - b) < 0.02) {
    const k = 1 - (r + g + b) / 3;
    return { c: 0, m: 0, y: 0, k: Math.round(k * 1000) / 1000 };
  }
  for (const hex of CANDIDATES) {
    const build = londonCmykBuild(hex);
    if (!build.approved) continue;
    const [hr, hg, hb] = rgbOf(hex);
    // rgb = white + (brand − white)·a ; solve a from the channel with most travel.
    const d = [1 - hr, 1 - hg, 1 - hb];
    const i = d.indexOf(Math.max(...d));
    if (d[i]! < 0.05) continue;
    const a = (1 - [r, g, b][i]!) / d[i]!;
    if (a < 0 || a > 1 + TOL) continue;
    const fits = [r, g, b].every((v, j) => Math.abs(1 - d[j]! * a - v) <= TOL);
    if (!fits) continue;
    const t = Math.min(1, a);
    const s = (v: number) => Math.round(v * t * 1000) / 1000;
    return { c: s(build.c), m: s(build.m), y: s(build.y), k: s(build.k) };
  }
  return null;
}

/**
 * Patch a jsPDF document so every flat colour svg2pdf sets is written as an
 * approved CMYK build. Returns the list of colours with no approved build.
 */
export function inkJsPdfInCmyk(doc: {
  setFillColor: (...a: unknown[]) => unknown;
  setDrawColor: (...a: unknown[]) => unknown;
  setTextColor: (...a: unknown[]) => unknown;
}): Set<string> {
  const missing = new Set<string>();
  for (const name of ["setFillColor", "setDrawColor", "setTextColor"] as const) {
    const orig = doc[name].bind(doc);
    doc[name] = (...a: unknown[]) => {
      if (a.length === 3 && a.every((v) => typeof v === "number")) {
        const [r, g, b] = (a as number[]).map((v) => v / 255) as [number, number, number];
        const build = mapPrintBuild(r, g, b);
        if (!build) {
          missing.add(hexOf(r, g, b));
          return orig(...a);
        }
        return orig(build.c, build.m, build.y, build.k);
      }
      return orig(...a);
    };
  }
  return missing;
}

/**
 * Re-ink the sampled RGB gradients of a finished PDF into CMYK, sample by
 * sample, and report placed pictures. Throws naming any colour with no build.
 */
export async function cmykGradientsAndReport(
  bytes: ArrayBuffer,
  missing: Set<string>,
): Promise<{ pdf: Uint8Array; rgbImages: number }> {
  const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray, PDFNumber } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes);
  const ctx = pdf.context;
  let rgbImages = 0;
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFDict ? obj : obj instanceof PDFRawStream ? obj.dict : null;
    if (!dict) continue;
    if (dict.get(PDFName.of("Subtype"))?.toString() === "/Image") {
      rgbImages += 1;
      continue;
    }
    if (dict.get(PDFName.of("ShadingType")) == null) continue;
    if (dict.get(PDFName.of("ColorSpace"))?.toString() !== "/DeviceRGB") continue;
    const fnRef = dict.get(PDFName.of("Function"));
    const fn = fnRef ? ctx.lookup(fnRef) : null;
    if (!(fn instanceof PDFRawStream) || fn.dict.get(PDFName.of("FunctionType"))?.toString() !== "0") {
      throw new Error("a colour fade in the map could not be read for print.");
    }
    if (fn.dict.get(PDFName.of("Filter"))) throw new Error("a colour fade in the map is compressed and could not be re-inked.");
    const src = fn.contents;
    const out = new Uint8Array((src.length / 3) * 4);
    for (let i = 0, o = 0; i + 2 < src.length; i += 3, o += 4) {
      const [r, g, b] = [src[i]! / 255, src[i + 1]! / 255, src[i + 2]! / 255];
      const build = mapPrintBuild(r, g, b);
      if (!build) {
        missing.add(hexOf(r, g, b));
        continue;
      }
      out.set([build.c, build.m, build.y, build.k].map((v) => Math.round(v * 255)), o);
    }
    const unit = () => PDFArray.withContext(ctx);
    const range = unit();
    for (let i = 0; i < 4; i++) range.push(PDFNumber.of(0)), range.push(PDFNumber.of(1));
    const decode = unit();
    for (let i = 0; i < 4; i++) decode.push(PDFNumber.of(0)), decode.push(PDFNumber.of(1));
    const fd = fn.dict.clone(ctx);
    fd.set(PDFName.of("Range"), range);
    fd.set(PDFName.of("Decode"), decode);
    fd.delete(PDFName.of("Length"));
    ctx.assign(fnRef as never, ctx.stream(out, Object.fromEntries([]) as never) as never);
    const ns = ctx.lookup(fnRef as never) as InstanceType<typeof PDFRawStream>;
    for (const [k, v] of fd.entries()) if (k.toString() !== "/Length") ns.dict.set(k, v);
    dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceCMYK"));
  }
  if (missing.size) {
    throw new Error(
      `these map colours have no approved print build: ${[...missing].slice(0, 8).join(", ")}. Use colours from the room palette, or ask design for a signed-off build.`,
    );
  }
  return { pdf: await pdf.save({ useObjectStreams: false }), rgbImages };
}
