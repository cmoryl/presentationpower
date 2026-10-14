import { BRAND } from "@/lib/brand-colors";
// -----------------------------------------------------------------------------
// Icon downloads — SVG + PNG, single glyph or zipped set.
//
// The brand guides publish their approved icon sets as real downloadable files
// so a designer can drop the exact approved glyph into any tool. Both formats
// come from the same source of truth the app renders (the Lucide component in
// `ICON_LIBRARY`), so a downloaded file can never drift from the on-screen mark.
//
// Browser-only: PNG rasterization uses <canvas>, so call these from event
// handlers, never during SSR.
// -----------------------------------------------------------------------------

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { iconByName } from "@/lib/icon-library";
import { flatIcons, type BrandIconSet, type IconSubArea } from "@/lib/brand-icon-sets";

export interface IconRenderOptions {
  /** Nominal artboard size in px (also the PNG pixel size). */
  size?: number;
  /** Stroke colour — an approved hex. */
  color?: string;
  /** Outline weight in the glyph's 24-unit space. */
  strokeWidth?: number;
}

const DEFAULTS = { size: 512, color: BRAND.ink, strokeWidth: 1.75 } as const;

/** Standalone, spec-clean SVG markup for one approved glyph. */
export function iconSvgString(name: string, opts: IconRenderOptions = {}): string | null {
  const Icon = iconByName(name);
  if (!Icon) return null;
  const { size, color, strokeWidth } = { ...DEFAULTS, ...opts };
  const markup = renderToStaticMarkup(
    createElement(
      Icon as never,
      {
        width: size,
        height: size,
        color,
        strokeWidth,
        // Lucide defaults, restated so the file is self-contained.
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
      } as never,
    ),
  );
  const withNs = markup.includes("xmlns=")
    ? markup
    : markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${withNs}\n`;
}

/** Rasterize SVG markup to a PNG blob at `size`×`size`, transparent background. */
export async function iconPngBlob(svg: string, size: number): Promise<Blob> {
  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("icon rasterize failed"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png encode failed");
  return blob;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slugifyIconName(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function colorSlug(hex: string): string {
  return hex.replace("#", "").toLowerCase();
}

export interface IconFileOptions extends IconRenderOptions {
  format: "svg" | "png";
}

/** Filename convention: `search-48-003fc7.svg` — glyph, size, colour. */
export function iconFileName(name: string, opts: IconFileOptions): string {
  const { size, color } = { ...DEFAULTS, ...opts };
  return `${slugifyIconName(name)}-${size}-${colorSlug(color)}.${opts.format}`;
}

/** Download a single approved glyph. */
export async function downloadIcon(name: string, opts: IconFileOptions): Promise<void> {
  const svg = iconSvgString(name, opts);
  if (!svg) throw new Error(`unknown icon: ${name}`);
  const filename = iconFileName(name, opts);
  if (opts.format === "svg") {
    triggerDownload(new Blob([svg], { type: "image/svg+xml" }), filename);
    return;
  }
  triggerDownload(await iconPngBlob(svg, opts.size ?? DEFAULTS.size), filename);
}

export interface IconZipEntry {
  name: string;
  /** Folder inside the zip, e.g. the sub-area name. */
  folder?: string;
}

/**
 * Zip a batch of approved glyphs, with a README that records exactly which
 * guide, sub-area, size and colour the files were generated for.
 */
export async function downloadIconZip(
  entries: IconZipEntry[],
  opts: IconFileOptions & { zipName: string; readme?: string },
): Promise<number> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const size = opts.size ?? DEFAULTS.size;
  let count = 0;
  for (const entry of entries) {
    const svg = iconSvgString(entry.name, opts);
    if (!svg) continue;
    const dir = entry.folder ? `${slugifyIconName(entry.folder)}/` : "";
    const file = `${dir}${iconFileName(entry.name, opts)}`;
    if (opts.format === "svg") {
      zip.file(file, svg);
    } else {
      zip.file(file, await iconPngBlob(svg, size), { binary: true });
    }
    count += 1;
  }
  if (opts.readme) zip.file("README.txt", opts.readme);
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, opts.zipName.endsWith(".zip") ? opts.zipName : `${opts.zipName}.zip`);
  return count;
}

function readme(set: BrandIconSet, opts: IconFileOptions, scope: string): string {
  const { size, color } = { ...DEFAULTS, ...opts };
  return [
    `${set.title} — approved icon set`,
    `Scope: ${scope}`,
    `Format: ${opts.format.toUpperCase()}   Size: ${size}px   Colour: ${color}`,
    "",
    "These glyphs are the approved marks for this brand. Do not restyle, recolour",
    "outside the approved palette, add keylines, or mix in third-party icon sets.",
    "SVGs are single-weight outlines and may be scaled freely; PNGs are exported",
    "with a transparent background at the size named in each filename.",
    "",
    `Generated ${new Date().toISOString().slice(0, 10)} from the TransPerfect brand system.`,
  ].join("\n");
}

/** Download one sub-area of a guide's approved set. */
export function downloadSubArea(
  set: BrandIconSet,
  area: IconSubArea,
  opts: IconFileOptions,
): Promise<number> {
  return downloadIconZip(
    area.icons.map((i) => ({ name: i.name })),
    {
      ...opts,
      zipName: `${set.slug}-${area.id}-icons-${opts.format}-${opts.size ?? DEFAULTS.size}`,
      readme: readme(set, opts, area.name),
    },
  );
}

/** Download every approved glyph for a guide, foldered by sub-area. */
export function downloadFullSet(set: BrandIconSet, opts: IconFileOptions): Promise<number> {
  const entries: IconZipEntry[] = [];
  for (const area of set.subAreas) {
    for (const icon of area.icons) entries.push({ name: icon.name, folder: area.name });
  }
  return downloadIconZip(entries, {
    ...opts,
    zipName: `${set.slug}-approved-icons-${opts.format}-${opts.size ?? DEFAULTS.size}`,
    readme: readme(set, opts, `Full set (${flatIcons(set).length} glyphs)`),
  });
}

// -----------------------------------------------------------------------------
// Canva icon pack — clean, recolourable SVGs foldered `<Set>/<Sub-area>/` for
// bulk upload into Canva Brand Kits. Same glyph source as every other download.
// -----------------------------------------------------------------------------

/** Folder/file-safe name: letters, digits, spaces → hyphens, no punctuation. */
function canvaSlug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Folder name that stays readable in Canva's uploads panel. */
function canvaFolder(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "Icons";
}

/**
 * Canva-ready SVG: `viewBox="0 0 24 24"`, explicit width/height, a single
 * stroke weight in one approved hex on every path (Canva lists that colour as
 * an editable swatch), no React/ARIA/class attributes, no XML prolog.
 */
export function canvaSvgString(name: string, opts: { color?: string; strokeWidth?: number; title?: string } = {}): string | null {
  const raw = iconSvgString(name, { size: 24, color: opts.color ?? DEFAULTS.color, strokeWidth: opts.strokeWidth ?? 2 });
  if (!raw) return null;
  const color = opts.color ?? DEFAULTS.color;
  const body = raw
    .replace(/<\?xml[^>]*>\s*/, "")
    .replace(/\s(class|aria-hidden|data-[\w-]+)="[^"]*"/g, "")
    .replace(/currentColor/g, color)
    .trim();
  const inner = body.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const sw = opts.strokeWidth ?? 2;
  const title = opts.title ? `<title>${opts.title.replace(/[<&>]/g, "")}</title>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">` +
    `${title}${inner}</svg>\n`
  );
}

function canvaReadme(scope: string, count: number, color: string): string {
  return [
    `TransPerfect Element — Canva icon pack`,
    `Scope: ${scope}   Icons: ${count}   Colour: ${color}`,
    "",
    "WHAT'S INSIDE",
    "  <Brand or division>/<Sub-area>/<brand>-<sub-area>-<icon>.svg",
    "  Every file is a single-weight outline on a 24 x 24 grid (viewBox 0 0 24 24),",
    "  drawn in one approved colour, so Canva treats it as an editable graphic.",
    "",
    "UPLOAD TO A CANVA BRAND KIT",
    "  1. Unzip this file.",
    "  2. In Canva open Brand > your Brand Kit > Graphics (or Icons) > Upload.",
    "  3. Drag a whole sub-area folder (or several) into the upload area.",
    "     Keep one Brand Kit folder per division so search stays clean.",
    "  4. Search Canva by the words in the filename, e.g. \"globallink workflow\".",
    "",
    "EDITING IN CANVA",
    "  Select an icon and use the colour swatch to recolour it. Stay inside the",
    "  approved palette; do not add keylines, fills or third-party glyphs, and",
    "  never mix weights in one layout.",
    "",
    `Generated ${new Date().toISOString().slice(0, 10)} from the TransPerfect brand system.`,
  ].join("\n");
}

type CanvaZip = { file: (path: string, data: string) => void };

function addCanvaSet(zip: CanvaZip, set: BrandIconSet, color: string, onlyArea?: IconSubArea): number {
  const brandDir = canvaFolder(set.title);
  const brandSlug = canvaSlug(set.slug);
  let n = 0;
  for (const area of onlyArea ? [onlyArea] : set.subAreas) {
    const areaDir = canvaFolder(area.name);
    const areaSlug = canvaSlug(area.name);
    const used = new Set<string>();
    for (const icon of area.icons) {
      const svg = canvaSvgString(icon.name, { color, title: icon.label });
      if (!svg) continue;
      let base = `${brandSlug}-${areaSlug}-${canvaSlug(icon.label || icon.name)}`;
      if (used.has(base)) base = `${base}-${canvaSlug(icon.name)}`;
      used.add(base);
      zip.file(`${brandDir}/${areaDir}/${base}.svg`, svg);
      n += 1;
    }
  }
  return n;
}

async function canvaZip(
  build: (zip: CanvaZip) => number,
  zipName: string,
  scope: string,
  color: string,
): Promise<number> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const count = build(zip);
  zip.file("README.txt", canvaReadme(scope, count, color));
  triggerDownload(await zip.generateAsync({ type: "blob" }), `${zipName}.zip`);
  return count;
}

/** Canva pack for one set, or one sub-area of it. */
export function downloadCanvaPack(set: BrandIconSet, color: string, area?: IconSubArea): Promise<number> {
  return canvaZip(
    (zip) => addCanvaSet(zip, set, color, area),
    `canva-icons-${canvaSlug(set.slug)}${area ? `-${canvaSlug(area.name)}` : ""}`,
    area ? `${set.title} · ${area.name}` : `${set.title} (all sub-areas)`,
    color,
  );
}

/** Master bundle: every approved set, foldered by brand/division then sub-area. */
export function downloadAllCanvaPacks(sets: BrandIconSet[], color: string): Promise<number> {
  return canvaZip(
    (zip) => sets.reduce((n, s) => n + addCanvaSet(zip, s, color), 0),
    "canva-icons-all-approved-sets",
    `All approved sets (${sets.length})`,
    color,
  );
}
