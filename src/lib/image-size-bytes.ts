/**
 * Dependency-free intrinsic-size reader for image bytes.
 *
 * The browser export path measures imagery with `new Image()`. The headless
 * (MCP) export has no decoder at all, and exact logo ratios are non-negotiable
 * — a stretched client logo is a hard defect. Parsing the container header is
 * enough: every format we embed states its pixel size in the first few bytes.
 */

export type PixelSize = { width: number; height: number };

function u16(b: Uint8Array, i: number, le = false): number {
  return le ? b[i]! | (b[i + 1]! << 8) : (b[i]! << 8) | b[i + 1]!;
}

function u32(b: Uint8Array, i: number, le = false): number {
  return le
    ? (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0
    : ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
}

function ascii(b: Uint8Array, i: number, len: number): string {
  let s = "";
  for (let k = 0; k < len; k += 1) s += String.fromCharCode(b[i + k] ?? 0);
  return s;
}

function png(b: Uint8Array): PixelSize | null {
  if (b.length < 24) return null;
  if (!(b[0] === 0x89 && ascii(b, 1, 3) === "PNG")) return null;
  return { width: u32(b, 16), height: u32(b, 20) };
}

function gif(b: Uint8Array): PixelSize | null {
  if (b.length < 10 || ascii(b, 0, 3) !== "GIF") return null;
  return { width: u16(b, 6, true), height: u16(b, 8, true) };
}

function jpeg(b: Uint8Array): PixelSize | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1]!;
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = u16(b, i + 2);
    // SOF0..SOF15 except the DHT/JPG/DAC slots hold the frame dimensions.
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { width: u16(b, i + 7), height: u16(b, i + 5) };
    i += 2 + Math.max(len, 2);
  }
  return null;
}

function webp(b: Uint8Array): PixelSize | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const fourcc = ascii(b, 12, 4);
  if (fourcc === "VP8X") {
    const w = (b[24]! | (b[25]! << 8) | (b[26]! << 16)) + 1;
    const h = (b[27]! | (b[28]! << 8) | (b[29]! << 16)) + 1;
    return { width: w, height: h };
  }
  if (fourcc === "VP8 ") {
    // Lossy: 3-byte frame tag, 3-byte start code, then 16-bit w/h (14 bits used).
    return { width: u16(b, 26, true) & 0x3fff, height: u16(b, 28, true) & 0x3fff };
  }
  if (fourcc === "VP8L") {
    const bits = u32(b, 21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function svg(text: string): PixelSize | null {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return null;
  const num = (attr: string) => {
    const m = new RegExp(`${attr}\\s*=\\s*["']([0-9.]+)`, "i").exec(tag);
    const v = m ? Number.parseFloat(m[1]!) : NaN;
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const w = num("width");
  const h = num("height");
  if (w && h) return { width: w, height: h };
  const vb = /viewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i.exec(tag);
  if (vb) {
    const vw = Number.parseFloat(vb[1]!);
    const vh = Number.parseFloat(vb[2]!);
    if (vw > 0 && vh > 0) return { width: vw, height: vh };
  }
  return null;
}

/** Intrinsic pixel size from raw bytes, or null when the format is unknown. */
export function imageSizeFromBytes(bytes: Uint8Array): PixelSize | null {
  const found = png(bytes) ?? gif(bytes) ?? webp(bytes) ?? jpeg(bytes);
  if (found && found.width > 0 && found.height > 0) return found;
  // SVG has no binary header; sniff the opening tag from the leading bytes.
  const head = ascii(bytes, 0, Math.min(bytes.length, 4096));
  return /<svg/i.test(head) ? svg(head) : null;
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Intrinsic pixel size for a data URL (base64 or url-encoded SVG). */
export function imageSizeFromDataUrl(dataUrl: string): PixelSize | null {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/is.exec(dataUrl);
  if (!m) return null;
  const [, mime, isB64, payload] = m;
  if (isB64) {
    const bytes = base64ToBytes(payload!.replace(/\s+/g, ""));
    return bytes ? imageSizeFromBytes(bytes) : null;
  }
  const text = decodeURIComponent(payload!);
  return /svg/i.test(mime ?? "") || /<svg/i.test(text) ? svg(text) : null;
}
