// -----------------------------------------------------------------------------
// Live-file packages (.zip) for the cross-format adapter.
//
// A designer's package (Illustrator / InDesign "Package…" output, or any zip
// of live files) is opened in the browser. Every piece inside is listed and
// classified; the user picks one and it goes through every size like a single
// upload. Native InDesign (.indd) is a closed format and is listed as skipped;
// IDML (InDesign's open export) is read here, client-side, from its Stories.
// Fonts and linked images are counted as package support files, never guessed at.
// -----------------------------------------------------------------------------

import JSZip from "jszip";
import type { AdaptContent } from "@/lib/cross-format-adapt";
import { uploadKindOf, uploadKindLabel } from "@/lib/convert-upload";

/** Zips can be big (linked images); only the chosen piece is sent on. */
export const CONVERT_ZIP_MAX_BYTES = 500 * 1024 * 1024;

export type ZipPieceStatus = "ready" | "skipped";

export interface ZipPiece {
  path: string;
  name: string;
  folder: string;
  size: number;
  kind: "pdf" | "svg" | "office" | "idml" | "indd" | "other";
  label: string;
  status: ZipPieceStatus;
  note?: string;
}

export interface ZipInventory {
  pieces: ZipPiece[];
  fonts: number;
  links: number;
  ignored: number;
}

const FONT_EXT = new Set(["otf", "ttf", "woff", "woff2", "pfb", "pfm", "afm", "ttc", "dfont"]);
const LINK_EXT = new Set(["png", "jpg", "jpeg", "tif", "tiff", "psd", "eps", "gif", "webp", "bmp", "heic"]);

export function isZipName(name: string): boolean {
  return /\.zip$/i.test(name);
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Classify one zip entry path (pure — tested). */
export function classifyZipEntry(path: string, size: number): ZipPiece | "font" | "link" | null {
  const parts = path.split("/");
  const name = parts[parts.length - 1] ?? path;
  if (!name || name.startsWith(".") || path.startsWith("__MACOSX/") || /(^|\/)Thumbs\.db$/i.test(path)) return null;
  const folder = parts.slice(0, -1).join("/");
  const ext = extOf(name);
  if (FONT_EXT.has(ext) || /(^|\/)(document )?fonts\//i.test(path)) return "font";
  if (ext === "idml") return { path, name, folder, size, kind: "idml", label: "InDesign (IDML)", status: "ready" };
  if (ext === "indd" || ext === "indt") {
    return {
      path, name, folder, size, kind: "indd", label: "InDesign file", status: "skipped",
      note: "Native InDesign can't be read — include an IDML (File → Save As → IDML) or a PDF of it.",
    };
  }
  const k = uploadKindOf(name);
  if (k) return { path, name, folder, size, kind: k, label: uploadKindLabel(name), status: "ready" };
  if (LINK_EXT.has(ext)) return "link";
  return null;
}

export async function readZipInventory(file: File): Promise<{ zip: JSZip; inventory: ZipInventory }> {
  const zip = await JSZip.loadAsync(file);
  const inventory: ZipInventory = { pieces: [], fonts: 0, links: 0, ignored: 0 };
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    // JSZip keeps the uncompressed size on the internal record.
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    const c = classifyZipEntry(path, size);
    if (c === "font") inventory.fonts++;
    else if (c === "link") inventory.links++;
    else if (c) inventory.pieces.push(c);
    else inventory.ignored++;
  });
  // Ready pieces first, then by folder/name.
  inventory.pieces.sort((a, b) =>
    a.status === b.status ? a.path.localeCompare(b.path) : a.status === "ready" ? -1 : 1,
  );
  return { zip, inventory };
}

export async function zipEntryAsFile(zip: JSZip, piece: ZipPiece): Promise<File> {
  const entry = zip.file(piece.path);
  if (!entry) throw new Error(`${piece.name} is missing from the zip.`);
  const blob = await entry.async("blob");
  return new File([blob], piece.name, { type: blob.type });
}

/** Pull the visible text runs out of IDML Story XML, in story order (pure — tested). */
export function linesFromIdmlStories(storyXml: string[]): string[] {
  const lines: string[] = [];
  for (const xml of storyXml) {
    // Each ParagraphStyleRange is a paragraph; <Content> holds its runs; <Br/> breaks.
    for (const para of xml.split(/<\/ParagraphStyleRange>|<Br\s*\/>/)) {
      const runs = [...para.matchAll(/<Content>([\s\S]*?)<\/Content>/g)].map((m) => decodeXml(m[1]));
      const t = runs.join("").replace(/\s+/g, " ").trim();
      if (t) lines.push(t);
    }
  }
  return lines;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Read an IDML file into the adapter's neutral payload. Uses only words in the file. */
export async function contentFromIdml(file: Blob): Promise<AdaptContent | null> {
  const idml = await JSZip.loadAsync(file);
  const stories = Object.keys(idml.files).filter((p) => /^Stories\/.*\.xml$/i.test(p)).sort();
  const xml = await Promise.all(stories.map((p) => idml.file(p)!.async("string")));
  const lines = linesFromIdmlStories(xml);
  if (!lines.length) return null;
  const [headline, body, ...rest] = lines;
  return { headline, body: body || undefined, points: rest.length ? rest.slice(0, 8) : undefined };
}
