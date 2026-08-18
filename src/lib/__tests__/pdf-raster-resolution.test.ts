import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * A PDF page is 13.333in wide, so an HD (1920px) raster is only ~144 DPI and
 * hairline icon strokes blur into thick smears. Every PDF page must be captured
 * at print resolution or better, regardless of the PNG resolution preference.
 */
const captureSlideAsDataUrl = vi.fn(async () => "data:image/png;base64,AAAA");
const addImage = vi.fn();
const addPage = vi.fn();

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
  getFontEmbedCSS: vi.fn(async () => ""),
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    addImage = addImage;
    addPage = addPage;
    output = () => new Blob();
    save = () => {};
  },
}));

async function loadExporter() {
  const mod = await import("@/lib/slide-image-export");
  // Patch the capture seam: this test is about the resolution decision, not the
  // DOM rasterizer.
  vi.spyOn(mod, "captureSlideAsDataUrl").mockImplementation(
    captureSlideAsDataUrl as never,
  );
  return mod;
}

describe("PDF raster resolution", () => {
  beforeEach(() => {
    captureSlideAsDataUrl.mockClear();
    addImage.mockClear();
    addPage.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("lifts an HD request to print resolution for PDF pages", async () => {
    const mod = await loadExporter();
    const node = { offsetWidth: 1280 } as unknown as HTMLElement;
    await mod.exportSlidesAsImagePdf([{ node, mode: "dark" }], {
      targetWidth: 1920,
      returnBlob: true,
    });
    const width = captureSlideAsDataUrl.mock.calls[0]?.[1]?.targetWidth;
    expect(width).toBeGreaterThanOrEqual(3840);
    // ~288 DPI on a 13.333in page.
    expect((width as number) / 13.333).toBeGreaterThan(200);
  });

  it("honours a larger request as-is", async () => {
    const mod = await loadExporter();
    const node = { offsetWidth: 1280 } as unknown as HTMLElement;
    await mod.exportSlidesAsImagePdf([{ node, mode: "light" }], {
      targetWidth: 5120,
      returnBlob: true,
    });
    expect(captureSlideAsDataUrl.mock.calls[0]?.[1]?.targetWidth).toBe(5120);
  });

  it("never falls back to a low-resolution pixelRatio capture", async () => {
    const mod = await loadExporter();
    const node = { offsetWidth: 1280 } as unknown as HTMLElement;
    await mod.exportSlidesAsImagePdf([{ node, mode: "light" }], {
      pixelRatio: 1,
      returnBlob: true,
    });
    const opts = captureSlideAsDataUrl.mock.calls[0]?.[1];
    expect(opts?.targetWidth).toBeGreaterThanOrEqual(3840);
  });
});
