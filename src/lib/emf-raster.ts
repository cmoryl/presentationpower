/**
 * EMF/WMF → PNG rasterisation (pure TS, no native deps).
 *
 * PowerPoint frequently stores "pasted picture" layers — full-bleed
 * semi-transparent photo washes, logo lockups — as EMF metafiles. Browsers
 * cannot render `image/x-emf`, so those layers silently vanished on import,
 * taking their `a:alphaModFix` transparency with them.
 *
 * Office-generated EMFs are almost always a thin vector wrapper around one
 * embedded device-independent bitmap (DIB). We walk the EMF record list, pull
 * the largest embedded DIB, decode it (24/32-bit, top-down or bottom-up), and
 * re-encode as a PNG with its alpha channel intact.
 *
 * Anything we cannot decode returns null and the caller keeps its previous
 * behaviour (skip the asset) — this is strictly additive recovery.
 */

const EMR_BITBLT = 76;
const EMR_STRETCHBLT = 77;
const EMR_SETDIBITSTODEVICE = 79;
const EMR_STRETCHDIBITS = 81;

/** Byte offset of (offBmi, cbBmi, offBits, cbBits) within each record type. */
const DIB_HEADER_OFFSETS: Record<number, number> = {
  [EMR_BITBLT]: 84,
  [EMR_STRETCHBLT]: 84,
  [EMR_SETDIBITSTODEVICE]: 48,
  [EMR_STRETCHDIBITS]: 48,
};

type Dib = { width: number; height: number; rgba: Uint8Array };

function decodeDib(buf: Uint8Array, bmiOff: number, bitsOff: number, bitsLen: number): Dib | null {
  if (bmiOff + 40 > buf.length || bitsOff + 1 > buf.length) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const headerSize = dv.getUint32(bmiOff, true);
  if (headerSize < 40) return null; // BITMAPCOREHEADER / unsupported
  const width = dv.getInt32(bmiOff + 4, true);
  const rawHeight = dv.getInt32(bmiOff + 8, true);
  const bitCount = dv.getUint16(bmiOff + 14, true);
  const compression = dv.getUint32(bmiOff + 16, true);
  const topDown = rawHeight < 0;
  const height = Math.abs(rawHeight);
  if (width <= 0 || height <= 0 || width > 8000 || height > 8000) return null;
  // BI_RGB (0) and BI_BITFIELDS (3) only — no RLE/JPEG/PNG payloads.
  if (compression !== 0 && compression !== 3) return null;
  if (bitCount !== 24 && bitCount !== 32) return null;

  const stride = (((width * bitCount) / 8 + 3) & ~3) >>> 0;
  if (bitsOff + stride * height > buf.length && bitsLen < stride * height) return null;

  const rgba = new Uint8Array(width * height * 4);
  const bytesPerPx = bitCount / 8;
  let sawAlpha = false;
  for (let y = 0; y < height; y++) {
    const srcRow = bitsOff + (topDown ? y : height - 1 - y) * stride;
    if (srcRow + stride > buf.length) break;
    let d = y * width * 4;
    for (let x = 0; x < width; x++) {
      const s = srcRow + x * bytesPerPx;
      rgba[d] = buf[s + 2];
      rgba[d + 1] = buf[s + 1];
      rgba[d + 2] = buf[s];
      const a = bitCount === 32 ? buf[s + 3] : 255;
      if (a !== 0) sawAlpha = true;
      rgba[d + 3] = a;
      d += 4;
    }
  }
  // Many 32-bit Office DIBs leave the alpha byte zeroed (it is padding, not
  // transparency). A fully-transparent image is never the intent — treat it
  // as opaque rather than rendering nothing.
  if (!sawAlpha) for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width, height, rgba };
}

/** Scan EMF records for embedded DIBs and return the largest decodable one. */
function largestEmbeddedDib(buf: Uint8Array): Dib | null {
  if (buf.length < 88) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let best: Dib | null = null;
  let bestArea = 0;
  let off = 0;
  let guard = 0;
  while (off + 8 <= buf.length && guard++ < 100_000) {
    const type = dv.getUint32(off, true);
    const size = dv.getUint32(off + 4, true);
    if (size < 8 || off + size > buf.length) break;
    const headerAt = DIB_HEADER_OFFSETS[type];
    if (headerAt !== undefined && size >= headerAt + 16) {
      const offBmi = dv.getUint32(off + headerAt, true);
      const offBits = dv.getUint32(off + headerAt + 8, true);
      const cbBits = dv.getUint32(off + headerAt + 12, true);
      if (offBmi > 0 && offBits > 0 && cbBits > 0) {
        const dib = decodeDib(buf, off + offBmi, off + offBits, cbBits);
        const area = dib ? dib.width * dib.height : 0;
        if (dib && area > bestArea) {
          best = dib;
          bestArea = area;
        }
      }
    }
    off += size;
  }
  return best;
}


/* --------------------------- EMF+ (dual-mode) ---------------------------- */

/** Concatenate the EMF+ byte stream carried inside EMR_COMMENT records. */
function readEmfPlusStream(buf: Uint8Array): Uint8Array | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const parts: Uint8Array[] = [];
  let off = 0;
  let guard = 0;
  while (off + 8 <= buf.length && guard++ < 100_000) {
    const type = dv.getUint32(off, true);
    const size = dv.getUint32(off + 4, true);
    if (size < 8 || off + size > buf.length) break;
    if (type === 70 && size >= 16) {
      const dataSize = dv.getUint32(off + 8, true);
      const ident = dv.getUint32(off + 12, true);
      if (ident === 0x2b464d45 && dataSize >= 4) parts.push(buf.subarray(off + 16, off + 12 + dataSize));
    }
    off += size;
  }
  if (!parts.length) return null;
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Decode the largest EmfPlusObject image (raw ARGB bitmap) in the stream. */
function largestEmfPlusBitmap(buf: Uint8Array): Dib | { png: Uint8Array } | null {
  const stream = readEmfPlusStream(buf);
  if (!stream) return null;
  const dv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  let best: Dib | { png: Uint8Array } | null = null;
  let bestArea = 0;
  let off = 0;
  let guard = 0;
  while (off + 12 <= stream.length && guard++ < 100_000) {
    const type = dv.getUint16(off, true);
    const flags = dv.getUint16(off + 2, true);
    const size = dv.getUint32(off + 4, true);
    const dataSize = dv.getUint32(off + 8, true);
    if (size < 12 || off + size > stream.length) break;
    // 0x4008 = EmfPlusObject; object type 5 (Image) lives in the high flag byte.
    if (type === 0x4008 && ((flags >> 8) & 0xff) === 5 && dataSize >= 28) {
      const d = off + 12;
      const imgType = dv.getUint32(d + 4, true);
      if (imgType === 1) {
        const width = dv.getUint32(d + 8, true);
        const height = dv.getUint32(d + 12, true);
        const stride = dv.getInt32(d + 16, true);
        const pixelFormat = dv.getUint32(d + 20, true);
        const bitmapType = dv.getUint32(d + 24, true);
        const bitsAt = d + 28;
        if (bitmapType === 1) {
          // Already a compressed image (PNG/JPEG) — hand the bytes straight back.
          const png = stream.subarray(bitsAt, off + 12 + dataSize);
          const area = width * height || png.length;
          if (png.length > 8 && area > bestArea) {
            best = { png };
            bestArea = area;
          }
        } else if (width > 0 && height > 0 && width <= 8000 && height <= 8000) {
          const bpp = (pixelFormat >> 8) & 0xff;
          if ((bpp === 32 || bpp === 24) && Math.abs(stride) * height <= stream.length - bitsAt) {
            const rgba = new Uint8Array(width * height * 4);
            const bytesPerPx = bpp / 8;
            const premultiplied = (pixelFormat & 0x8000) !== 0;
            let sawAlpha = false;
            for (let y = 0; y < height; y++) {
              const srcRow = bitsAt + (stride < 0 ? (height - 1 - y) * -stride : y * stride);
              let o2 = y * width * 4;
              for (let x = 0; x < width; x++) {
                const s2 = srcRow + x * bytesPerPx;
                let r = stream[s2 + 2];
                let g = stream[s2 + 1];
                let b = stream[s2];
                const a = bpp === 32 ? stream[s2 + 3] : 255;
                if (premultiplied && a > 0 && a < 255) {
                  r = Math.min(255, Math.round((r * 255) / a));
                  g = Math.min(255, Math.round((g * 255) / a));
                  b = Math.min(255, Math.round((b * 255) / a));
                }
                if (a !== 0) sawAlpha = true;
                rgba[o2] = r;
                rgba[o2 + 1] = g;
                rgba[o2 + 2] = b;
                rgba[o2 + 3] = a;
                o2 += 4;
              }
            }
            if (!sawAlpha) for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
            const area = width * height;
            if (area > bestArea) {
              best = { width, height, rgba };
              bestArea = area;
            }
          }
        }
      }
    }
    off += size;
  }
  return best;
}

/* ---------------------------------- PNG ---------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length + 12);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(out.length - 4, crc32(out.subarray(4, out.length - 4)));
  return out;
}

async function zlibDeflate(raw: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate"); // zlib wrapper, per spec
  const stream = new Blob([raw as unknown as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodePng(dib: Dib): Promise<Uint8Array> {
  const { width, height, rgba } = dib;
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const deflated = await zlibDeflate(raw);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflated),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    png.set(p, at);
    at += p.length;
  }
  return png;
}

/**
 * Convert an EMF/WMF metafile to PNG bytes, or null when no embedded raster
 * can be recovered. Caller keeps the original bytes on null.
 */
export async function emfToPngBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const dib = largestEmbeddedDib(bytes);
    if (dib) return await encodePng(dib);
    const plus = largestEmfPlusBitmap(bytes);
    if (!plus) return null;
    if ("png" in plus) return plus.png;
    return await encodePng(plus);
  } catch {
    return null;
  }
}

export const __testables = { largestEmbeddedDib, decodeDib, largestEmfPlusBitmap };
