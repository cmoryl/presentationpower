/**
 * Post-export image compatibility report.
 *
 * Two sources of truth are combined:
 *
 *  1. The transcode ledger — every embed path records what it received and what
 *     it actually embedded (see pptx-image-compat.ts). This is the only place
 *     that knows an asset ARRIVED as WebP and had to be re-encoded.
 *  2. The produced .pptx package — every `ppt/media/*` entry is classified by
 *     magic bytes (never by extension), so a WebP saved as `.png` is caught.
 *
 * WebP is only decoded by PowerPoint 2019+/M365; AVIF/HEIC by nothing. Anything
 * in those formats surviving into the package is flagged.
 */

export type ImageFormat = "webp" | "jpeg" | "png" | "gif" | "bmp" | "tiff" | "svg" | "avif" | "heic" | "unknown";

export type ImageEmbedRecord = {
  label: string;
  source?: string | null;
  sourceFormat: ImageFormat;
  embeddedFormat: ImageFormat;
  transcoded: boolean;
  /** Set when a transcode was needed but the browser could not re-encode it. */
  transcodeFailed?: boolean;
};

export type ImageCompatEntry = {
  path: string;
  format: ImageFormat;
  bytes: number;
  /** True when this format is unreadable in one or more supported PowerPoint versions. */
  risky: boolean;
};

export type ImageCompatReport = {
  /** Media entries found inside the exported package. */
  entries: ImageCompatEntry[];
  /** Count per detected format, e.g. { jpeg: 12, png: 4 }. */
  formatCounts: Record<string, number>;
  /** Embeds that were re-encoded for older PowerPoint versions. */
  transcoded: ImageEmbedRecord[];
  /** Embeds where a needed transcode failed (still embedded as-is). */
  failedTranscodes: ImageEmbedRecord[];
  /** Package entries still in a format older PowerPoint cannot decode. */
  risky: ImageCompatEntry[];
  totalBytes: number;
  ok: boolean;
};

/** Formats PowerPoint 2007–2016 cannot decode. */
const RISKY: ImageFormat[] = ["webp", "avif", "heic", "unknown"];

// ---------------------------------------------------------------------------
// Transcode ledger
// ---------------------------------------------------------------------------

let ledger: ImageEmbedRecord[] = [];

/** Clear the ledger at the start of an export run. */
export function resetImageEmbedLedger(): void {
  ledger = [];
}

export function recordImageEmbed(record: ImageEmbedRecord): void {
  ledger.push(record);
  if (ledger.length > 2000) ledger.shift();
}

export function getImageEmbedLedger(): ImageEmbedRecord[] {
  return [...ledger];
}

// ---------------------------------------------------------------------------
// Byte sniffing
// ---------------------------------------------------------------------------

export function sniffImageFormat(bytes: Uint8Array): ImageFormat {
  const b = bytes;
  if (b.length < 12) return "unknown";
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...Array.from(b.subarray(start, start + len)));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && ascii(1, 3) === "PNG") return "png";
  if (ascii(0, 3) === "GIF") return "gif";
  if (ascii(0, 2) === "BM") return "bmp";
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) return "tiff";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4).toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("hevc")) return "heic";
  }
  const head = ascii(0, Math.min(400, b.length));
  if (/<svg[\s>]/i.test(head) || /<\?xml/.test(head)) return "svg";
  return "unknown";
}

/** Classify a data URL / blob mime / source URL without decoding pixels. */
export function formatFromHints(opts: {
  blobType?: string | null;
  dataUrl?: string | null;
  url?: string | null;
}): ImageFormat {
  const mime = (opts.blobType ?? "").toLowerCase();
  const dataMime = /^data:([^;,]+)/i.exec(opts.dataUrl ?? "")?.[1]?.toLowerCase() ?? "";
  // Never sniff a data URL's payload: base64 bodies routinely contain the
  // letters "svg"/"gif"/"png" by chance, which used to misclassify a
  // transparent PNG as SVG and skip its re-encode entirely.
  const rawUrl = opts.url ?? "";
  const urlHint = /^data:/i.test(rawUrl)
    ? (/^data:([^;,]+)/i.exec(rawUrl)?.[1] ?? "")
    : rawUrl;
  const src = `${mime} ${dataMime} ${urlHint}`.toLowerCase();
  if (src.includes("webp")) return "webp";
  if (src.includes("svg")) return "svg";
  if (src.includes("jpeg") || src.includes("jpg")) return "jpeg";
  if (src.includes("png")) return "png";
  if (src.includes("avif")) return "avif";
  if (src.includes("heic") || src.includes("heif")) return "heic";
  if (src.includes("gif")) return "gif";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/** Audit a produced .pptx blob and combine it with the transcode ledger. */
export async function buildImageCompatReport(blob: Blob): Promise<ImageCompatReport> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(blob);
  const entries: ImageCompatEntry[] = [];

  const files = Object.keys(zip.files).filter((p) => /^ppt\/media\//i.test(p));
  for (const path of files) {
    const file = zip.files[path];
    if (!file || file.dir) continue;
    const data = await file.async("uint8array");
    const format = sniffImageFormat(data);
    entries.push({
      path,
      format,
      bytes: data.byteLength,
      risky: RISKY.includes(format),
    });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

  const formatCounts: Record<string, number> = {};
  for (const e of entries) formatCounts[e.format] = (formatCounts[e.format] ?? 0) + 1;

  const led = getImageEmbedLedger();
  const transcoded = led.filter((r) => r.transcoded);
  const failedTranscodes = led.filter((r) => r.transcodeFailed);
  const risky = entries.filter((e) => e.risky);

  return {
    entries,
    formatCounts,
    transcoded,
    failedTranscodes,
    risky,
    totalBytes: entries.reduce((s, e) => s + e.bytes, 0),
    ok: risky.length === 0 && failedTranscodes.length === 0,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
