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

const DEFAULTS = { size: 512, color: "#03002C", strokeWidth: 1.75 } as const;

/** Standalone, spec-clean SVG markup for one approved glyph. */
export function iconSvgString(name: string, opts: IconRenderOptions = {}): string | null {
  const Icon = iconByName(name);
  if (!Icon) return null;
  const { size, color, strokeWidth } = { ...DEFAULTS, ...opts };
  const markup = renderToStaticMarkup(
    createElement(Icon as never, {
      width: size,
      height: size,
      color,
      strokeWidth,
      // Lucide defaults, restated so the file is self-contained.
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    } as never),
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
