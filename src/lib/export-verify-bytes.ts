// -----------------------------------------------------------------------------
// Export byte verification.
//
// Every export path in the app ultimately hands the user bytes. This module is
// the single place that answers "are those bytes actually the file we claim?".
// It is DOM-free on purpose so unit tests, the audit route and headless runs
// share one implementation.
// -----------------------------------------------------------------------------

export type ExportKind = "png" | "jpg" | "webp" | "pdf" | "zip" | "pptx" | "svg" | "html";

export type ByteVerdict = {
  ok: boolean;
  kind: ExportKind;
  bytes: number;
  /** Human-readable detail — magic bytes found, page/part counts, or the fault. */
  detail: string;
  problems: string[];
};

const MIN_BYTES: Record<ExportKind, number> = {
  png: 512,
  jpg: 512,
  webp: 256,
  pdf: 1024,
  zip: 128,
  pptx: 4096,
  svg: 40,
  html: 256,
};

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  for (let i = 0; i < sig.length; i++) if (bytes[offset + i] !== sig[i]) return false;
  return true;
}

function ascii(bytes: Uint8Array, start: number, len: number): string {
  let out = "";
  for (let i = start; i < Math.min(bytes.length, start + len); i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/** PNG IHDR width/height (big-endian, bytes 16..23). */
export function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return null;
  const read = (o: number) =>
    (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];
  const width = read(16) >>> 0;
  const height = read(20) >>> 0;
  if (!width || !height) return null;
  return { width, height };
}

/** Count `/Type /Page` objects — cheap page count for jsPDF/pdf-lib output. */
export function pdfPageCount(bytes: Uint8Array): number {
  const text = ascii(bytes, 0, bytes.length);
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

/**
 * Verify a blob/byte payload against the file type the exporter promised.
 * Container-level only (magic bytes, trailers, minimum size, embedded part
 * names) — deep OOXML checks live in `pptx-package-validate`.
 */
export function verifyExportBytes(
  input: Uint8Array | ArrayBuffer,
  kind: ExportKind,
  expect: { minBytes?: number; width?: number; height?: number; pages?: number } = {},
): ByteVerdict {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const problems: string[] = [];
  const details: string[] = [];
  const floor = expect.minBytes ?? MIN_BYTES[kind];
  if (bytes.byteLength < floor) {
    problems.push(`only ${bytes.byteLength} bytes (expected ≥ ${floor})`);
  }

  switch (kind) {
    case "png": {
      if (!startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        problems.push("missing PNG signature");
        break;
      }
      const dim = pngDimensions(bytes);
      if (!dim) problems.push("unreadable PNG IHDR");
      else {
        details.push(`${dim.width}×${dim.height}`);
        // Rasterizers occasionally round a subpixel; allow 2px of slack.
        if (expect.width && Math.abs(dim.width - expect.width) > 2) {
          problems.push(`width ${dim.width} ≠ expected ${expect.width}`);
        }
        if (expect.height && Math.abs(dim.height - expect.height) > 2) {
          problems.push(`height ${dim.height} ≠ expected ${expect.height}`);
        }
      }
      break;
    }
    case "jpg":
      if (!startsWith(bytes, [0xff, 0xd8, 0xff])) problems.push("missing JPEG SOI marker");
      else details.push("JFIF/SOI ok");
      break;
    case "webp":
      if (!(startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && ascii(bytes, 8, 4) === "WEBP")) {
        problems.push("missing RIFF/WEBP header");
      } else details.push("RIFF·WEBP ok");
      break;
    case "pdf": {
      if (ascii(bytes, 0, 5) !== "%PDF-") {
        problems.push("missing %PDF- header");
        break;
      }
      details.push(ascii(bytes, 0, 8).trim());
      const tail = ascii(bytes, Math.max(0, bytes.length - 2048), 2048);
      if (!tail.includes("%%EOF")) problems.push("missing %%EOF trailer");
      const pages = pdfPageCount(bytes);
      if (pages > 0) details.push(`${pages} page${pages === 1 ? "" : "s"}`);
      if (expect.pages && pages > 0 && pages !== expect.pages) {
        problems.push(`${pages} pages ≠ expected ${expect.pages}`);
      }
      break;
    }
    case "zip":
    case "pptx": {
      if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        problems.push("missing ZIP local-header signature");
        break;
      }
      details.push("PK zip ok");
      if (kind === "pptx") {
        const text = ascii(bytes, 0, bytes.length);
        for (const part of ["[Content_Types].xml", "ppt/presentation.xml"]) {
          if (!text.includes(part)) problems.push(`missing part name ${part}`);
        }
        const slides = (text.match(/ppt\/slides\/slide\d+\.xml/g) ?? []).length;
        if (slides === 0) problems.push("no slide parts in package");
        else details.push(`${slides} slide entries`);
      }
      break;
    }
    case "svg": {
      const head = ascii(bytes, 0, 512).toLowerCase();
      if (!head.includes("<svg")) problems.push("no <svg> root element");
      else details.push("svg root ok");
      break;
    }
    case "html": {
      const head = ascii(bytes, 0, 1024).toLowerCase();
      if (!head.includes("<!doctype html") && !head.includes("<html")) {
        problems.push("no <html> document root");
      } else details.push("html root ok");
      break;
    }
  }

  return {
    ok: problems.length === 0,
    kind,
    bytes: bytes.byteLength,
    detail: details.join(" · ") || (problems[0] ?? "—"),
    problems,
  };
}

/** Blob-flavoured wrapper for the browser paths. */
export async function verifyExportBlob(
  blob: Blob,
  kind: ExportKind,
  expect?: Parameters<typeof verifyExportBytes>[2],
): Promise<ByteVerdict> {
  const buf = await blob.arrayBuffer();
  return verifyExportBytes(buf, kind, expect);
}
