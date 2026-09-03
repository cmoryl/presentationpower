// TransPerfect NEXT 2026 — London SUPPLIED ARTWORK (vendor booth grounds).
//
// Vendor booths ship their own Illustrator front wall. The app paints a CDN
// proof of that artboard as the panel ground, and — critically — the `.ai`
// master we hand back has to carry that artwork too. Before this module the
// booth `.ai` was rebuilt from the house spec (gradient + generated lockup),
// so a booth downloaded as a generic branded panel instead of the vendor's
// wall. Here we fetch the proof once, read its true pixel size, and hand the
// bytes to the PDF writer as an embedded image XObject.
//
// JPEG bytes pass into PDF untouched (`/DCTDecode`), which is why the proofs
// are JPEG: no re-encoding, no quality loss, no giant flate stream.

export type LondonGroundImage = {
  url: string;
  bytes: Uint8Array;
  /** Pixel dimensions read from the file header. */
  width: number;
  height: number;
  /** PDF image filter for these bytes. */
  filter: "DCTDecode" | "FlateDecode";
  /** Colour components per sample (3 = RGB, 1 = grey, 4 = CMYK). */
  components: number;
};

const cache = new Map<string, Promise<LondonGroundImage | null>>();

/** JPEG SOFn frame header → intrinsic pixel size + component count. */
function readJpeg(bytes: Uint8Array): { w: number; h: number; comps: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1]!;
    // Standalone markers carry no length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    // SOF0/1/2/9/10 — baseline and progressive frames all state size here.
    if ([0xc0, 0xc1, 0xc2, 0xc9, 0xca].includes(marker)) {
      return {
        h: (bytes[i + 5]! << 8) | bytes[i + 6]!,
        w: (bytes[i + 7]! << 8) | bytes[i + 8]!,
        comps: bytes[i + 9]!,
      };
    }
    i += 2 + len;
  }
  return null;
}

/** PNG IHDR → intrinsic pixel size. */
function readPng(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const read32 = (at: number) =>
    (bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!;
  return { w: read32(16), h: read32(20) };
}

/**
 * Fetch a supplied-artwork proof and describe it well enough to embed in a PDF.
 * Results are cached per URL for the session — a booth pack rebuilds many times
 * and the proofs are immutable CDN assets.
 */
export function loadLondonGroundImage(url: string): Promise<LondonGroundImage | null> {
  const hit = cache.get(url);
  if (hit) return hit;
  const job = (async (): Promise<LondonGroundImage | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      const jpeg = readJpeg(bytes);
      if (jpeg && jpeg.w > 0 && jpeg.h > 0) {
        return {
          url,
          bytes,
          width: jpeg.w,
          height: jpeg.h,
          filter: "DCTDecode",
          components: jpeg.comps === 1 || jpeg.comps === 4 ? jpeg.comps : 3,
        };
      }
      const png = readPng(bytes);
      // PNG proofs are not embeddable as-is (PDF needs the raw scanlines, not
      // the PNG container), so they stay a linked preview only.
      if (png) return null;
      return null;
    } catch {
      return null;
    }
  })();
  cache.set(url, job);
  return job;
}

/** Effective print resolution of an image placed across `mm` millimetres. */
export function artworkPpi(pixels: number, mm: number): number {
  if (!(pixels > 0) || !(mm > 0)) return 0;
  return Math.round(pixels / (mm / 25.4));
}

/** Large-format verdict for a supplied artwork proof at its printed size. */
export function artworkPpiVerdict(ppi: number): {
  label: string;
  tone: "ok" | "warn" | "bad";
} {
  // Large-format viewing distances: 36 ppi is the practical floor for a booth
  // wall, 72 ppi is comfortable, below 24 ppi will read soft up close.
  if (ppi >= 72) return { label: "Press ready", tone: "ok" };
  if (ppi >= 36) return { label: "Large-format OK", tone: "ok" };
  if (ppi >= 24) return { label: "Soft up close", tone: "warn" };
  return { label: "Too low — request vector", tone: "bad" };
}
