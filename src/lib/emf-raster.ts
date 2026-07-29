/**
 * EMF/WMF → PNG rasterisation (pure TS, no native deps).
 *
 * PowerPoint frequently stores "pasted picture" layers — full-bleed
 * semi-transparent photo washes, logo lockups — as EMF/WMF metafiles. Browsers
 * cannot render `image/x-emf` or `image/x-wmf`, so those layers silently
 * vanished on import, taking their `a:alphaModFix` transparency with them.
 *
 * Office-generated metafiles are almost always a thin vector wrapper around one
 * embedded raster. We recover that raster from every container variant we've
 * seen in the wild:
 *
 *   1. Classic EMF records carrying a device-independent bitmap (DIB) —
 *      BitBlt, StretchBlt, MaskBlt, PlgBlt, AlphaBlend, TransparentBlt,
 *      SetDIBitsToDevice, StretchDIBits, and the DIB brush creators.
 *   2. WMF (both raw and 22-byte "placeable" headers) — DIBBitBlt,
 *      DIBStretchBlt, StretchDIB, SetDIBToDev, DIBCreatePatternBrush.
 *   3. EMF+ dual-mode streams inside EMR_COMMENT records — EmfPlusObject
 *      image records, including multi-record *continued* objects, in both raw
 *      bitmap and embedded PNG/JPEG form.
 *
 * DIB decoding covers 1/4/8-bit palettised, 16-bit (555 or BI_BITFIELDS),
 * 24-bit and 32-bit (BI_RGB or BI_BITFIELDS with an alpha mask) payloads, plus
 * BI_JPEG / BI_PNG passthrough. Everything is re-encoded as PNG with the alpha
 * channel intact.
 *
 * Anything we cannot decode returns null and the caller keeps its previous
 * behaviour (skip the asset) — this is strictly additive recovery.
 */

/* ------------------------------- EMF records ------------------------------ */

const EMR_BITBLT = 76;
const EMR_STRETCHBLT = 77;
const EMR_MASKBLT = 78;
const EMR_SETDIBITSTODEVICE = 79;
const EMR_PLGBLT = 80;
const EMR_STRETCHDIBITS = 81;
const EMR_CREATEMONOBRUSH = 93;
const EMR_CREATEDIBPATTERNBRUSHPT = 94;
const EMR_ALPHABLEND = 114;
const EMR_TRANSPARENTBLT = 116;
const EMR_COMMENT = 70;

/**
 * Byte offset of the contiguous (offBmi, cbBmi, offBits, cbBits) quad within
 * each record type, per MS-EMF.
 */
const DIB_HEADER_OFFSETS: Record<number, number> = {
  [EMR_BITBLT]: 84,
  [EMR_STRETCHBLT]: 84,
  [EMR_MASKBLT]: 84,
  [EMR_SETDIBITSTODEVICE]: 48,
  [EMR_PLGBLT]: 96,
  [EMR_STRETCHDIBITS]: 48,
  [EMR_CREATEMONOBRUSH]: 16,
  [EMR_CREATEDIBPATTERNBRUSHPT]: 16,
  [EMR_ALPHABLEND]: 84,
  [EMR_TRANSPARENTBLT]: 84,
};

type Dib = { width: number; height: number; rgba: Uint8Array };
type Raster = Dib | { png: Uint8Array };

const MAX_DIM = 8000;

function rasterArea(r: Raster): number {
  return "png" in r ? Math.max(r.png.length, 1) : r.width * r.height;
}

/* --------------------------------- DIBs ---------------------------------- */

/** Build a channel extractor for a BI_BITFIELDS mask. */
function maskChannel(mask: number): (v: number) => number {
  if (!mask) return () => 0;
  let shift = 0;
  let m = mask;
  while ((m & 1) === 0) {
    m >>>= 1;
    shift++;
  }
  let bits = 0;
  while (m & 1) {
    m >>>= 1;
    bits++;
  }
  const max = (1 << bits) - 1;
  return (v: number) => Math.round((((v & mask) >>> shift) * 255) / max);
}

/**
 * Decode a DIB at `bmiOff`. When `bitsOffIn` is null the pixel data is assumed
 * to be packed directly after the header + masks + palette (the WMF layout).
 */
function decodeDib(
  buf: Uint8Array,
  bmiOff: number,
  bitsOffIn: number | null,
  bitsLen: number,
  limit: number = buf.length,
): Raster | null {
  if (bmiOff < 0 || bmiOff + 40 > limit) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const headerSize = dv.getUint32(bmiOff, true);
  if (headerSize < 40 || headerSize > 256) return null; // BITMAPCOREHEADER / junk
  const width = dv.getInt32(bmiOff + 4, true);
  const rawHeight = dv.getInt32(bmiOff + 8, true);
  const bitCount = dv.getUint16(bmiOff + 14, true);
  const compression = dv.getUint32(bmiOff + 16, true);
  const sizeImage = dv.getUint32(bmiOff + 20, true);
  const clrUsed = dv.getUint32(bmiOff + 32, true);
  const topDown = rawHeight < 0;
  const height = Math.abs(rawHeight);
  if (width <= 0 || height <= 0 || width > MAX_DIM || height > MAX_DIM) return null;

  // BI_JPEG (4) / BI_PNG (5): the payload is already a browser-native image.
  if (compression === 4 || compression === 5) {
    const off = bitsOffIn ?? bmiOff + headerSize;
    const len = bitsLen || sizeImage;
    if (len > 8 && off + len <= limit) return { png: buf.slice(off, off + len) };
    return null;
  }
  if (compression !== 0 && compression !== 3) return null; // RLE unsupported
  if (![1, 4, 8, 16, 24, 32].includes(bitCount)) return null;

  // Optional BI_BITFIELDS masks live either inside a V4/V5 header or in three
  // (sometimes four) DWORDs immediately after a 40-byte header.
  let extra = 0;
  let rMask = 0;
  let gMask = 0;
  let bMask = 0;
  let aMask = 0;
  if (compression === 3 && (bitCount === 16 || bitCount === 32)) {
    const at = bmiOff + 40;
    if (at + 12 > limit) return null;
    rMask = dv.getUint32(at, true);
    gMask = dv.getUint32(at + 4, true);
    bMask = dv.getUint32(at + 8, true);
    if (headerSize >= 56) aMask = dv.getUint32(bmiOff + 52, true);
    else extra = 12;
  } else if (bitCount === 16) {
    rMask = 0x7c00;
    gMask = 0x03e0;
    bMask = 0x001f;
  }

  const paletteOff = bmiOff + headerSize + extra;
  let paletteCount = 0;
  if (bitCount <= 8) {
    paletteCount = clrUsed > 0 ? Math.min(clrUsed, 256) : 1 << bitCount;
    extra += paletteCount * 4;
    if (paletteOff + paletteCount * 4 > limit) return null;
  }

  const bitsOff = bitsOffIn ?? bmiOff + headerSize + extra;
  const stride = (((width * bitCount + 31) >>> 5) * 4) >>> 0;
  if (bitsOff < 0 || bitsOff >= limit) return null;
  const available = limit - bitsOff;
  if (available < stride * height && (bitsLen === 0 || bitsLen < stride)) return null;

  const rgba = new Uint8Array(width * height * 4);
  const getR = maskChannel(rMask);
  const getG = maskChannel(gMask);
  const getB = maskChannel(bMask);
  const getA = aMask ? maskChannel(aMask) : null;
  let sawAlpha = false;
  let hasAlphaChannel = bitCount === 32 && (compression === 0 || !!aMask);

  for (let y = 0; y < height; y++) {
    const srcRow = bitsOff + (topDown ? y : height - 1 - y) * stride;
    if (srcRow + stride > limit) break;
    let d = y * width * 4;
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;
      if (bitCount <= 8) {
        const bitAt = x * bitCount;
        const byte = buf[srcRow + (bitAt >>> 3)];
        const idx =
          bitCount === 8
            ? byte
            : (byte >>> (8 - bitCount - (bitAt & 7))) & ((1 << bitCount) - 1);
        const p = paletteOff + Math.min(idx, Math.max(paletteCount - 1, 0)) * 4;
        b = buf[p];
        g = buf[p + 1];
        r = buf[p + 2];
      } else if (bitCount === 16) {
        const v = buf[srcRow + x * 2] | (buf[srcRow + x * 2 + 1] << 8);
        r = getR(v);
        g = getG(v);
        b = getB(v);
      } else if (bitCount === 24) {
        const s = srcRow + x * 3;
        b = buf[s];
        g = buf[s + 1];
        r = buf[s + 2];
      } else {
        const s = srcRow + x * 4;
        if (compression === 3 && (rMask || gMask || bMask)) {
          const v =
            (buf[s] | (buf[s + 1] << 8) | (buf[s + 2] << 16) | (buf[s + 3] << 24)) >>> 0;
          r = getR(v);
          g = getG(v);
          b = getB(v);
          a = getA ? getA(v) : 255;
        } else {
          b = buf[s];
          g = buf[s + 1];
          r = buf[s + 2];
          a = buf[s + 3];
        }
      }
      if (hasAlphaChannel && a !== 0) sawAlpha = true;
      rgba[d] = r;
      rgba[d + 1] = g;
      rgba[d + 2] = b;
      rgba[d + 3] = hasAlphaChannel ? a : 255;
      d += 4;
    }
  }
  // Many 32-bit Office DIBs leave the alpha byte zeroed (it is padding, not
  // transparency). A fully-transparent image is never the intent — treat it
  // as opaque rather than rendering nothing.
  if (hasAlphaChannel && !sawAlpha) for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width, height, rgba };
}

/** Scan EMF records for embedded DIBs and return the largest decodable one. */
function largestEmbeddedDib(buf: Uint8Array): Raster | null {
  if (buf.length < 88) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let best: Raster | null = null;
  let bestArea = 0;
  let off = 0;
  let guard = 0;
  while (off + 8 <= buf.length && guard++ < 200_000) {
    const type = dv.getUint32(off, true);
    const size = dv.getUint32(off + 4, true);
    if (size < 8 || off + size > buf.length) break;
    const headerAt = DIB_HEADER_OFFSETS[type];
    if (headerAt !== undefined && size >= headerAt + 16) {
      const offBmi = dv.getUint32(off + headerAt, true);
      const offBits = dv.getUint32(off + headerAt + 8, true);
      const cbBits = dv.getUint32(off + headerAt + 12, true);
      if (offBmi > 0 && offBits > 0 && cbBits > 0) {
        const dib = decodeDib(buf, off + offBmi, off + offBits, cbBits, Math.min(off + size, buf.length));
        const area = dib ? rasterArea(dib) : 0;
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

/* ---------------------------------- WMF ---------------------------------- */

const WMF_PLACEABLE_KEY = 0x9ac6cdd7;

/** Offset (bytes) of the packed DIB within each WMF record's parameters. */
const WMF_DIB_PARAM_OFFSETS: Record<number, number> = {
  0x0940: 16, // META_DIBBITBLT
  0x0b41: 20, // META_DIBSTRETCHBLT
  0x0d33: 18, // META_SETDIBTODEV
  0x0f43: 22, // META_STRETCHDIB
  0x0142: 4, // META_DIBCREATEPATTERNBRUSH
};

function isWmf(buf: Uint8Array, dv: DataView): boolean {
  if (buf.length < 22) return false;
  if (dv.getUint32(0, true) === WMF_PLACEABLE_KEY) return true;
  const type = dv.getUint16(0, true);
  const headerWords = dv.getUint16(2, true);
  return (type === 1 || type === 2) && headerWords === 9;
}

/** Walk WMF records and return the largest decodable packed DIB. */
function largestWmfDib(buf: Uint8Array): Raster | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (!isWmf(buf, dv)) return null;
  let off = dv.getUint32(0, true) === WMF_PLACEABLE_KEY ? 22 : 0;
  if (off + 18 > buf.length) return null;
  off += 18; // standard META_HEADER
  let best: Raster | null = null;
  let bestArea = 0;
  let guard = 0;
  while (off + 6 <= buf.length && guard++ < 200_000) {
    const sizeWords = dv.getUint32(off, true);
    const fn = dv.getUint16(off + 4, true);
    const sizeBytes = sizeWords * 2;
    if (sizeWords < 3 || off + sizeBytes > buf.length) break;
    const paramOff = WMF_DIB_PARAM_OFFSETS[fn];
    if (paramOff !== undefined && sizeBytes > paramOff + 46) {
      const dib = decodeDib(buf, off + 6 + paramOff, null, 0, off + sizeBytes);
      const area = dib ? rasterArea(dib) : 0;
      if (dib && area > bestArea) {
        best = dib;
        bestArea = area;
      }
    }
    if (fn === 0) break; // META_EOF
    off += sizeBytes;
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
  while (off + 8 <= buf.length && guard++ < 200_000) {
    const type = dv.getUint32(off, true);
    const size = dv.getUint32(off + 4, true);
    if (size < 8 || off + size > buf.length) break;
    if (type === EMR_COMMENT && size >= 16) {
      const dataSize = dv.getUint32(off + 8, true);
      const ident = dv.getUint32(off + 12, true);
      // 'EMF+' identifier — the remainder of the comment is EMF+ record data.
      if (ident === 0x2b464d45 && dataSize >= 4) {
        const end = Math.min(off + 12 + dataSize, off + size, buf.length);
        if (end > off + 16) parts.push(buf.subarray(off + 16, end));
      }
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

/** Decode an assembled EmfPlusImage object payload (Version, Type, ...). */
function decodeEmfPlusImage(data: Uint8Array): Raster | null {
  if (data.length < 28) return null;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const imgType = dv.getUint32(4, true);
  if (imgType !== 1) return null; // 2 = metafile; nothing raster to recover
  const width = dv.getUint32(8, true);
  const height = dv.getUint32(12, true);
  const stride = dv.getInt32(16, true);
  const pixelFormat = dv.getUint32(20, true);
  const bitmapType = dv.getUint32(24, true);
  const bitsAt = 28;

  if (bitmapType === 1) {
    // Already a compressed image (PNG/JPEG) — hand the bytes straight back.
    const png = data.subarray(bitsAt);
    return png.length > 8 ? { png: png.slice() } : null;
  }
  if (width === 0 || height === 0 || width > MAX_DIM || height > MAX_DIM) return null;

  const bpp = (pixelFormat >> 8) & 0xff;
  if (![16, 24, 32].includes(bpp)) return null;
  const absStride = Math.abs(stride) || Math.ceil((width * bpp) / 8 / 4) * 4;
  if (absStride * height > data.length - bitsAt) return null;

  const rgba = new Uint8Array(width * height * 4);
  const bytesPerPx = bpp / 8;
  const hasAlpha = bpp === 32 && (pixelFormat & 0x40000) !== 0;
  const premultiplied = (pixelFormat & 0x8000) !== 0;
  let sawAlpha = false;
  for (let y = 0; y < height; y++) {
    const srcRow = bitsAt + (stride < 0 ? (height - 1 - y) * absStride : y * absStride);
    let o = y * width * 4;
    for (let x = 0; x < width; x++) {
      const s = srcRow + x * bytesPerPx;
      let r: number;
      let g: number;
      let b: number;
      let a = 255;
      if (bpp === 16) {
        const v = data[s] | (data[s + 1] << 8);
        r = Math.round((((v >>> 10) & 0x1f) * 255) / 31);
        g = Math.round((((v >>> 5) & 0x1f) * 255) / 31);
        b = Math.round(((v & 0x1f) * 255) / 31);
      } else {
        r = data[s + 2];
        g = data[s + 1];
        b = data[s];
        if (bpp === 32) a = hasAlpha ? data[s + 3] : 255;
      }
      if (hasAlpha && premultiplied && a > 0 && a < 255) {
        r = Math.min(255, Math.round((r * 255) / a));
        g = Math.min(255, Math.round((g * 255) / a));
        b = Math.min(255, Math.round((b * 255) / a));
      }
      if (a !== 0) sawAlpha = true;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = a;
      o += 4;
    }
  }
  if (!sawAlpha) for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width, height, rgba };
}

/**
 * Decode the largest EmfPlusObject image in the stream, reassembling
 * *continued* objects that Office splits across many records.
 */
function largestEmfPlusBitmap(buf: Uint8Array): Raster | null {
  const stream = readEmfPlusStream(buf);
  if (!stream) return null;
  const dv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);

  // objectId → accumulated payload fragments
  const pending = new Map<number, Uint8Array[]>();
  const complete: Uint8Array[] = [];

  let off = 0;
  let guard = 0;
  while (off + 12 <= stream.length && guard++ < 200_000) {
    const type = dv.getUint16(off, true);
    const flags = dv.getUint16(off + 2, true);
    const size = dv.getUint32(off + 4, true);
    const dataSize = dv.getUint32(off + 8, true);
    if (size < 12 || off + size > stream.length) break;
    // 0x4008 = EmfPlusObject; object type 5 (Image) lives in bits 8..14.
    if (type === 0x4008 && ((flags >> 8) & 0x7f) === 5 && dataSize >= 8) {
      const objectId = flags & 0xff;
      const continued = (flags & 0x8000) !== 0;
      const end = Math.min(off + 12 + dataSize, off + size, stream.length);
      if (continued) {
        // Each fragment is prefixed with TotalObjectSize (4 bytes).
        const frag = stream.subarray(off + 16, end);
        const list = pending.get(objectId) ?? [];
        list.push(frag);
        pending.set(objectId, list);
      } else {
        const tail = stream.subarray(off + 12, end);
        const list = pending.get(objectId);
        if (list?.length) {
          pending.delete(objectId);
          const total = list.reduce((n, p) => n + p.length, 0) + tail.length;
          const joined = new Uint8Array(total);
          let at = 0;
          for (const p of [...list, tail]) {
            joined.set(p, at);
            at += p.length;
          }
          complete.push(joined);
        } else {
          complete.push(tail);
        }
      }
    }
    off += size;
  }
  // Any fragments never terminated by a final record: assemble what we have.
  for (const list of pending.values()) {
    const total = list.reduce((n, p) => n + p.length, 0);
    if (!total) continue;
    const joined = new Uint8Array(total);
    let at = 0;
    for (const p of list) {
      joined.set(p, at);
      at += p.length;
    }
    complete.push(joined);
  }

  let best: Raster | null = null;
  let bestArea = 0;
  for (const payload of complete) {
    const raster = decodeEmfPlusImage(payload);
    if (!raster) continue;
    const area = rasterArea(raster);
    if (area > bestArea) {
      best = raster;
      bestArea = area;
    }
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

async function toPng(raster: Raster): Promise<Uint8Array> {
  return "png" in raster ? raster.png : await encodePng(raster);
}

/**
 * Convert an EMF/WMF metafile to PNG (or passthrough JPEG/PNG) bytes, or null
 * when no embedded raster can be recovered. Caller keeps the original bytes on
 * null. Picks the largest raster across all container variants.
 */
export async function emfToPngBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const candidates: Raster[] = [];
    const wmf = largestWmfDib(bytes);
    if (wmf) candidates.push(wmf);
    if (!wmf) {
      const dib = largestEmbeddedDib(bytes);
      if (dib) candidates.push(dib);
      const plus = largestEmfPlusBitmap(bytes);
      if (plus) candidates.push(plus);
    }
    if (!candidates.length) return null;
    const best = candidates.reduce((a, b) => (rasterArea(b) > rasterArea(a) ? b : a));
    return await toPng(best);
  } catch {
    return null;
  }
}

export const __testables = {
  largestEmbeddedDib,
  decodeDib,
  largestEmfPlusBitmap,
  largestWmfDib,
  decodeEmfPlusImage,
  isWmf,
};
