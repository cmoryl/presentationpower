// Shared print-quality QR raster + PNG encoder.
//
// The preview and the press PDF draw the code as vector geometry. PowerPoint and
// Word can only carry a picture, so both take their picture from here — one
// rasteriser, one module geometry, one ink/plate pair. That is what keeps a
// scanned code identical across every export of the same board.
//
// The PNG is written by hand with stored (uncompressed) deflate blocks so the
// encoder runs anywhere — the Cloudflare Worker, the browser, a test — with no
// canvas and no compression dependency.

import { buildPillarQr } from "./pillar-qr";

export type QrModuleStyle = "block" | "rounded" | "dot";

/**
 * Finder patterns, their separators and the timing lines are the geometry a
 * scanner locks onto. Shaped modules (dot, rounded) leave white gaps there and
 * decoding becomes a coin flip — proven with a decoder, not assumed — so those
 * modules always print as solid squares while the data area keeps the style.
 */
export function qrStructuralModule(mx: number, my: number, size: number): boolean {
  const QUIET = 4;
  const n = size - QUIET * 2;
  const x = mx - QUIET;
  const y = my - QUIET;
  if (x < 0 || y < 0 || x >= n || y >= n) return false;
  const inFinder = (fx: number, fy: number) => x >= fx && x < fx + 8 && y >= fy && y < fy + 8;
  if (inFinder(0, 0) || inFinder(n - 8, 0) || inFinder(0, n - 8)) return true;
  // Timing lines run between the finders on row 6 and column 6.
  return x === 6 || y === 6;
}

export type QrRaster = {
  /** Module count per side, including the 4-module quiet zone. */
  modules: number;
  /** Pixels per module. */
  modulePx: number;
  /** Image edge in pixels. */
  width: number;
  /** Row-major ink mask, 1 = ink pixel. */
  ink: Uint8Array;
};

/**
 * Paint the real QR matrix at a chosen pixel density using the same module
 * geometry the vector renderers use, so a decoder sees what a phone sees.
 */
export function qrRaster(
  payload: string,
  opts: { style?: QrModuleStyle; modulePx?: number } = {},
): QrRaster | null {
  const qr = buildPillarQr(payload);
  if (!qr) return null;
  const style = opts.style ?? "block";
  const modulePx = Math.max(2, Math.round(opts.modulePx ?? 8));
  const width = qr.modules ? qr.size * modulePx : 0;
  const ink = new Uint8Array(width * width);
  const r = modulePx / 2;
  for (let my = 0; my < qr.size; my += 1) {
    for (let mx = 0; mx < qr.size; mx += 1) {
      if (!qr.modules[my * qr.size + mx]) continue;
      const ox = mx * modulePx;
      const oy = my * modulePx;
      const solid = style === "block" || qrStructuralModule(mx, my, qr.size);
      if (solid) {
        for (let y = 0; y < modulePx; y += 1) {
          ink.fill(1, (oy + y) * width + ox, (oy + y) * width + ox + modulePx);
        }
        continue;
      }
      if (style === "dot") {
        for (let y = 0; y < modulePx; y += 1) {
          for (let x = 0; x < modulePx; x += 1) {
            const dx = x + 0.5 - r;
            const dy = y + 0.5 - r;
            if (dx * dx + dy * dy <= r * r) ink[(oy + y) * width + ox + x] = 1;
          }
        }
        continue;
      }
      // rounded: the 88% inset square the preview and PDF draw.
      const inset = Math.round(modulePx * 0.06);
      const span = Math.max(1, modulePx - inset * 2);
      for (let y = 0; y < span; y += 1) {
        const row = (oy + inset + y) * width + ox + inset;
        ink.fill(1, row, row + span);
      }
    }
  }
  return { modules: qr.size, modulePx, width, ink };
}

function hexRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return fallback;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function be32(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const name = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
  const body = new Uint8Array(name.length + data.length);
  body.set(name, 0);
  body.set(data, name.length);
  const out = new Uint8Array(8 + data.length + 4);
  out.set(be32(data.length), 0);
  out.set(body, 4);
  out.set(be32(crc32(body)), 8 + data.length);
  return out;
}

/** Zlib stream using stored deflate blocks — no compression library needed. */
function zlibStored(raw: Uint8Array): Uint8Array {
  const MAX = 65535;
  const blocks: Uint8Array[] = [];
  for (let off = 0; off < raw.length || off === 0; off += MAX) {
    const len = Math.min(MAX, raw.length - off);
    const last = off + len >= raw.length ? 1 : 0;
    const head = new Uint8Array([last, len & 255, (len >> 8) & 255, ~len & 255, (~len >> 8) & 255]);
    const block = new Uint8Array(head.length + len);
    block.set(head, 0);
    block.set(raw.subarray(off, off + len), head.length);
    blocks.push(block);
    if (last) break;
  }
  const size = blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(2 + size + 4);
  out.set([0x78, 0x01], 0);
  let at = 2;
  for (const b of blocks) {
    out.set(b, at);
    at += b.length;
  }
  out.set(be32(adler32(raw)), at);
  return out;
}

export type QrPng = { bytes: Uint8Array; width: number; height: number; raster: QrRaster };

/** Base64 data URL of the encoded code, for exports that can only carry images. */
export function qrPngDataUrl(png: QrPng): string {
  let bin = "";
  for (let i = 0; i < png.bytes.length; i += 1) bin += String.fromCharCode(png.bytes[i]);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).Buffer.from(png.bytes).toString("base64");
  return `data:image/png;base64,${b64}`;
}

/**
 * Encode the code as an RGB PNG at print density. `ground` is painted behind
 * the modules — a transparent code still needs its worst-case plate colour
 * baked in, which is what the editor's contrast readout already judges.
 */
export function qrPng(
  payload: string,
  opts: {
    ink?: string;
    ground?: string;
    style?: QrModuleStyle;
    modulePx?: number;
    /** Drop the plate and let whatever sits behind show through (RGBA output). */
    transparent?: boolean;
  } = {},
): QrPng | null {
  const raster = qrRaster(payload, { style: opts.style, modulePx: opts.modulePx });
  if (!raster) return null;
  const ink = hexRgb(opts.ink ?? "#03002C", [3, 0, 44]);
  const ground = hexRgb(opts.ground ?? "#FFFFFF", [255, 255, 255]);
  const w = raster.width;
  const alpha = opts.transparent === true;
  const bpp = alpha ? 4 : 3;
  const raw = new Uint8Array((w * bpp + 1) * w);
  let at = 0;
  for (let y = 0; y < w; y += 1) {
    raw[at] = 0; // no filter
    at += 1;
    for (let x = 0; x < w; x += 1) {
      const on = raster.ink[y * w + x] === 1;
      const c = on ? ink : ground;
      raw[at] = c[0];
      raw[at + 1] = c[1];
      raw[at + 2] = c[2];
      if (alpha) raw[at + 3] = on ? 255 : 0;
      at += bpp;
    }
  }
  const ihdr = new Uint8Array(13);
  ihdr.set(be32(w), 0);
  ihdr.set(be32(w), 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // truecolour (+ alpha)
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibStored(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    bytes.set(p, off);
    off += p.length;
  }
  return { bytes, width: w, height: w, raster };
}

/** Pixels per module needed to hold a target dpi at a printed edge size. */
export function qrModulePxForPrint(payload: string, edgeMm: number, dpi = 300): number {
  const qr = buildPillarQr(payload);
  if (!qr) return 8;
  const targetPx = (Math.max(1, edgeMm) / 25.4) * dpi;
  return Math.max(4, Math.min(24, Math.ceil(targetPx / qr.size)));
}

/**
 * Module styles proven to decode across the whole density range the exports can
 * emit. Round dots leave diagonal white gaps between adjacent dark modules and
 * failed decoding at several densities in testing, so they are flagged rather
 * than quietly shipped to press.
 */
export const QR_SCAN_VERIFIED_STYLES: QrModuleStyle[] = ["block", "rounded"];

export type QrPrintQuality = {
  modules: number;
  /** Printed module size in mm, quiet zone included in the module count. */
  moduleMm: number;
  quietMm: number;
  ok: boolean;
  notes: string[];
};

/**
 * Physical scannability of a printed code. Under 0.6mm per module a phone camera
 * starts guessing; shaped modules (dot, rounded) lose ink area, so they need
 * more room than plain squares.
 */
export function qrPrintQuality(
  payload: string,
  edgeMm: number,
  style: QrModuleStyle = "block",
): QrPrintQuality | null {
  const qr = buildPillarQr(payload);
  if (!qr) return null;
  const moduleMm = edgeMm / qr.size;
  const floor = style === "block" ? 0.6 : 0.8;
  const notes: string[] = [];
  if (!QR_SCAN_VERIFIED_STYLES.includes(style)) {
    notes.push(
      "Round dot modules did not decode reliably in our scan tests — use square or rounded modules for anything going to print.",
    );
  }
  if (moduleMm < floor) {
    notes.push(
      `Each module prints at ${moduleMm.toFixed(2)}mm — ${style === "block" ? "squares" : `${style} modules`} need ${floor}mm. Enlarge the code or shorten the link.`,
    );
  }
  return {
    modules: qr.size,
    moduleMm,
    quietMm: moduleMm * 4,
    ok: notes.length === 0,
    notes,
  };
}
