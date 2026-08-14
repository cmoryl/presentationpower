/**
 * Unit tests for the PPTX image re-encode logic.
 *
 * Covers the three behaviours the export pipeline depends on:
 *   1. alpha detection — a single translucent pixel forces PNG
 *   2. PNG/JPEG selection — opaque bitmaps become JPEG, transparent ones PNG
 *   3. consistent output across input formats — WebP always re-encoded, and the
 *      "legacy"/"alpha" toggles route the remaining formats predictably
 *
 * The transcoder is browser-only (Image + canvas), so we install a minimal fake
 * DOM: an Image that resolves synchronously and a canvas whose getImageData
 * returns pixels we control per test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readExportLegacyImages = vi.fn(() => false);
const readExportAlphaImages = vi.fn(() => false);

vi.mock("./export-quality", () => ({
  readExportLegacyImages: () => readExportLegacyImages(),
  readExportAlphaImages: () => readExportAlphaImages(),
}));

import { getImageEmbedLedger, resetImageEmbedLedger } from "./export-image-report";
import {
  isWebpSource,
  toPowerPointSafeDataUrl,
  transcodeToUniversalDataUrl,
} from "./pptx-image-compat";

/** Pixels the fake canvas hands back. Defaults to a fully opaque 2x2 bitmap. */
let pixels: number[] = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 1, 2, 3, 255];
/** Set to true to make getImageData throw (tainted-canvas path). */
let getImageDataThrows = false;
/** Set to false to make image decoding fail. */
let decodeSucceeds = true;
/** Natural size reported by the fake decoder. */
let naturalSize = { w: 2, h: 2 };
/** Every toDataURL(type) call, in order. */
let encodeCalls: Array<{ type: string; quality?: number }> = [];

function opaquePixels(count = 4): number[] {
  return Array.from({ length: count * 4 }, (_, i) => (i % 4 === 3 ? 255 : 128));
}

function pixelsWithAlphaAt(index: number, alpha: number, count = 4): number[] {
  const out = opaquePixels(count);
  out[index * 4 + 3] = alpha;
  return out;
}

function installFakeDom() {
  class FakeImage {
    crossOrigin = "";
    naturalWidth = 0;
    naturalHeight = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      setTimeout(() => {
        if (!decodeSucceeds) {
          this.onerror?.();
          return;
        }
        this.naturalWidth = naturalSize.w;
        this.naturalHeight = naturalSize.h;
        this.onload?.();
      }, 0);
    }
  }

  const ctx = {
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, _w: number, _h: number) => {
      if (getImageDataThrows) throw new Error("tainted canvas");
      return { data: Uint8ClampedArray.from(pixels) };
    },
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: (kind: string) => (kind === "2d" ? ctx : null),
    toDataURL: (type: string, quality?: number) => {
      encodeCalls.push({ type, quality });
      return `${type === "image/png" ? "data:image/png" : "data:image/jpeg"};base64,ZmFrZQ==`;
    },
  };

  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("document", { createElement: (tag: string) => (tag === "canvas" ? canvas : {}) });
}

beforeEach(() => {
  pixels = opaquePixels();
  getImageDataThrows = false;
  decodeSucceeds = true;
  naturalSize = { w: 2, h: 2 };
  encodeCalls = [];
  readExportLegacyImages.mockReturnValue(false);
  readExportAlphaImages.mockReturnValue(false);
  resetImageEmbedLedger();
  installFakeDom();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const WEBP = "data:image/webp;base64,ZmFrZQ==";
const JPEG = "data:image/jpeg;base64,ZmFrZQ==";
const PNG = "data:image/png;base64,ZmFrZQ==";
const GIF = "data:image/gif;base64,ZmFrZQ==";
const SVG = "data:image/svg+xml;base64,ZmFrZQ==";

describe("isWebpSource", () => {
  it("detects WebP from the blob type, data URL and file extension", () => {
    expect(isWebpSource({ blobType: "image/webp" })).toBe(true);
    expect(isWebpSource({ dataUrl: WEBP })).toBe(true);
    expect(isWebpSource({ url: "https://cdn.test/hero.webp" })).toBe(true);
    expect(isWebpSource({ url: "https://cdn.test/hero.WEBP?v=2" })).toBe(true);
    expect(isWebpSource({ url: "https://cdn.test/hero.webp#frag" })).toBe(true);
  });

  it("does not fire on other formats or on 'webp' appearing mid-path", () => {
    expect(isWebpSource({ blobType: "image/jpeg", dataUrl: JPEG })).toBe(false);
    expect(isWebpSource({ url: "https://cdn.test/webp-guide/hero.png" })).toBe(false);
    expect(isWebpSource({})).toBe(false);
  });
});

describe("transcodeToUniversalDataUrl — alpha detection and format choice", () => {
  it("encodes a fully opaque bitmap as JPEG at quality 0.92", async () => {
    pixels = opaquePixels(64);
    const out = await transcodeToUniversalDataUrl(WEBP);
    expect(out).toBe(JPEG);
    expect(encodeCalls).toEqual([{ type: "image/jpeg", quality: 0.92 }]);
  });

  it("encodes as PNG when any pixel is fully transparent", async () => {
    pixels = pixelsWithAlphaAt(0, 0);
    const out = await transcodeToUniversalDataUrl(WEBP);
    expect(out).toBe(PNG);
    expect(encodeCalls).toEqual([{ type: "image/png", quality: undefined }]);
  });

  it("encodes as PNG for partial transparency (alpha below the 250 threshold)", async () => {
    pixels = pixelsWithAlphaAt(2, 200);
    expect(await transcodeToUniversalDataUrl(WEBP)).toBe(PNG);
  });

  it("treats near-opaque alpha (>= 250) as opaque and picks JPEG", async () => {
    pixels = pixelsWithAlphaAt(1, 250);
    expect(await transcodeToUniversalDataUrl(WEBP)).toBe(JPEG);
    pixels = pixelsWithAlphaAt(1, 254);
    encodeCalls = [];
    expect(await transcodeToUniversalDataUrl(WEBP)).toBe(JPEG);
  });

  it("finds alpha in a large bitmap via the stride sampler", async () => {
    // Above ~20k pixels the scan samples every Nth pixel instead of all of them.
    naturalSize = { w: 200, h: 200 };
    pixels = pixelsWithAlphaAt(0, 0, 200 * 200);
    expect(await transcodeToUniversalDataUrl(WEBP)).toBe(PNG);
  });

  it("documents the sampler's limit: alpha only on a skipped pixel reads as opaque", async () => {
    // 40k pixels → stride of 2 pixels, so odd-indexed pixels are not inspected.
    // A single stray translucent pixel there is intentionally tolerated (JPEG)
    // rather than paying a full-buffer scan on every large bitmap.
    naturalSize = { w: 200, h: 200 };
    pixels = pixelsWithAlphaAt(200 * 200 - 1, 0, 200 * 200);
    expect(await transcodeToUniversalDataUrl(WEBP)).toBe(JPEG);
  });

  it("falls back to PNG when the pixel buffer cannot be read", async () => {
    getImageDataThrows = true;
    expect(await transcodeToUniversalDataUrl(WEBP)).toBe(PNG);
  });

  it("returns null instead of throwing when the bitmap cannot be decoded", async () => {
    decodeSucceeds = false;
    expect(await transcodeToUniversalDataUrl(WEBP)).toBeNull();
  });

  it("returns null for a zero-sized bitmap", async () => {
    naturalSize = { w: 0, h: 0 };
    expect(await transcodeToUniversalDataUrl(WEBP)).toBeNull();
  });
});

describe("toPowerPointSafeDataUrl — routing across input formats", () => {
  it("always re-encodes WebP, whatever the toggles say", async () => {
    const out = await toPowerPointSafeDataUrl(WEBP, { blobType: "image/webp", label: "backdrop" });
    expect(out).toBe(JPEG);
    expect(getImageEmbedLedger()).toEqual([
      expect.objectContaining({
        label: "backdrop",
        sourceFormat: "webp",
        embeddedFormat: "jpeg",
        transcoded: true,
      }),
    ]);
  });

  it("passes JPEG and PNG through untouched with the defaults, but still logs them", async () => {
    expect(await toPowerPointSafeDataUrl(JPEG, { blobType: "image/jpeg" })).toBe(JPEG);
    expect(await toPowerPointSafeDataUrl(PNG, { blobType: "image/png" })).toBe(PNG);
    expect(encodeCalls).toHaveLength(0);
    expect(getImageEmbedLedger().map((r) => [r.sourceFormat, r.embeddedFormat, r.transcoded]))
      .toEqual([
        ["jpeg", "jpeg", false],
        ["png", "png", false],
      ]);
  });

  it("passes non-universal formats through unless 'legacy images' is on", async () => {
    expect(await toPowerPointSafeDataUrl(GIF, { blobType: "image/gif" })).toBe(GIF);
    expect(encodeCalls).toHaveLength(0);

    readExportLegacyImages.mockReturnValue(true);
    expect(await toPowerPointSafeDataUrl(GIF, { blobType: "image/gif" })).toBe(JPEG);
    expect(encodeCalls).toHaveLength(1);
  });

  it("never rasterizes SVG, under any toggle", async () => {
    readExportLegacyImages.mockReturnValue(true);
    readExportAlphaImages.mockReturnValue(true);
    expect(await toPowerPointSafeDataUrl(SVG, { blobType: "image/svg+xml" })).toBe(SVG);
    expect(encodeCalls).toHaveLength(0);
  });

  it("normalizes every bitmap by alpha when the alpha toggle is on", async () => {
    readExportAlphaImages.mockReturnValue(true);

    pixels = pixelsWithAlphaAt(0, 0);
    expect(await toPowerPointSafeDataUrl(JPEG, { blobType: "image/jpeg" })).toBe(PNG);

    pixels = opaquePixels();
    expect(await toPowerPointSafeDataUrl(PNG, { blobType: "image/png" })).toBe(JPEG);
  });

  it("produces the same embedded format for every input carrying the same pixels", async () => {
    readExportLegacyImages.mockReturnValue(true);
    readExportAlphaImages.mockReturnValue(true);
    pixels = pixelsWithAlphaAt(3, 10);
    const inputs: Array<[string, string | null]> = [
      [WEBP, "image/webp"],
      [JPEG, "image/jpeg"],
      [PNG, "image/png"],
      [GIF, "image/gif"],
      ["data:image/avif;base64,ZmFrZQ==", "image/avif"],
    ];
    for (const [dataUrl, blobType] of inputs) {
      expect(await toPowerPointSafeDataUrl(dataUrl, { blobType })).toBe(PNG);
    }
    expect(getImageEmbedLedger().every((r) => r.embeddedFormat === "png" && r.transcoded)).toBe(
      true,
    );
  });

  it("embeds the original and flags the failure when transcoding cannot run", async () => {
    decodeSucceeds = true;
    naturalSize = { w: 0, h: 0 }; // decode ok, but unusable → transcode returns null
    const out = await toPowerPointSafeDataUrl(WEBP, { blobType: "image/webp", url: "u/hero.webp" });
    expect(out).toBe(WEBP);
    expect(getImageEmbedLedger()).toEqual([
      expect.objectContaining({
        sourceFormat: "webp",
        embeddedFormat: "webp",
        transcoded: false,
        transcodeFailed: true,
      }),
    ]);
  });
});
