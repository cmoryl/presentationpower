import { describe, expect, it } from "vitest";
import { pdfPageTargetWidth } from "@/lib/slide-image-export";

/**
 * A PDF page is 13.333in wide, so an HD (1920px) raster is only ~144 DPI and
 * hairline icon strokes blur into thick light smears on a dark plate — the
 * "icons render with outlines" report. Every PDF page must be captured at print
 * resolution or better, regardless of the PNG resolution preference.
 */
const PAGE_WIDTH_IN = 13.333;
const dpi = (px: number) => px / PAGE_WIDTH_IN;

describe("PDF page raster resolution", () => {
  it("lifts an HD request to print resolution", () => {
    expect(pdfPageTargetWidth(1920)).toBeGreaterThanOrEqual(3840);
    expect(dpi(pdfPageTargetWidth(1920))).toBeGreaterThan(200);
  });

  it("keeps 4K exactly as requested", () => {
    expect(pdfPageTargetWidth(3840)).toBe(3840);
  });

  it("honours a larger-than-4K request", () => {
    expect(pdfPageTargetWidth(5120)).toBe(5120);
  });

  it("floors an unset or nonsense request", () => {
    expect(dpi(pdfPageTargetWidth(undefined))).toBeGreaterThan(200);
    expect(dpi(pdfPageTargetWidth(0))).toBeGreaterThan(200);
    expect(dpi(pdfPageTargetWidth(-100))).toBeGreaterThan(200);
  });
});
