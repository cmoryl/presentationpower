import { describe, expect, it } from "vitest";
import {
  buildProofMetadata,
  CSS_DPI,
  DEFAULT_PROOF_OPTIONS,
  MAX_PROOF_EDGE,
  proofFileBase,
  proofGeometry,
  proofMetadataText,
} from "@/lib/print-proof-export";

const A4_CSS = { w: 8.268 * CSS_DPI, h: 11.693 * CSS_DPI };

describe("print proof geometry", () => {
  it("renders an A4 page at true 300 DPI pixels", () => {
    const geo = proofGeometry(A4_CSS.w, A4_CSS.h, { ...DEFAULT_PROOF_OPTIONS, bleedMm: 0 });
    expect(geo.dpi).toBe(300);
    expect(geo.scale).toBeCloseTo(300 / 96, 5);
    expect(geo.trimPx.width).toBe(2480);
    expect(geo.trimPx.height).toBe(3508);
    expect(geo.sheetPx).toEqual(geo.trimPx);
    expect(geo.cropMarks).toBe(false);
  });

  it("adds bleed on all four edges and enables crop marks only with bleed", () => {
    const geo = proofGeometry(A4_CSS.w, A4_CSS.h, DEFAULT_PROOF_OPTIONS);
    expect(geo.bleedPx).toBe(Math.round((3 / 25.4) * 300));
    expect(geo.sheetPx.width).toBe(geo.trimPx.width + geo.bleedPx * 2);
    expect(geo.sheetPx.height).toBe(geo.trimPx.height + geo.bleedPx * 2);
    expect(geo.cropMarks).toBe(true);

    const noBleed = proofGeometry(A4_CSS.w, A4_CSS.h, {
      ...DEFAULT_PROOF_OPTIONS,
      bleedMm: 0,
      cropMarks: true,
    });
    expect(noBleed.cropMarks).toBe(false);
  });

  it("steps the resolution down rather than exceeding the canvas limit", () => {
    const geo = proofGeometry(60 * CSS_DPI, 40 * CSS_DPI, DEFAULT_PROOF_OPTIONS);
    expect(geo.downscaled).toBe(true);
    expect(geo.dpi).toBeLessThan(300);
    expect(Math.max(geo.sheetPx.width, geo.sheetPx.height)).toBeLessThanOrEqual(MAX_PROOF_EDGE);
    expect(geo.requestedDpi).toBe(300);
  });

  it("writes proof metadata that says it is not a press master", () => {
    const geo = proofGeometry(1080, 1080, DEFAULT_PROOF_OPTIONS);
    const meta = buildProofMetadata("Legal bloom card", geo, DEFAULT_PROOF_OPTIONS, {
      Division: "Legal",
    });
    expect(meta.fidelity).toBe("proof");
    expect(meta.colourSpace).toBe("RGB");
    const text = proofMetadataText(meta);
    expect(text).toContain("PRODUCTION PROOF");
    expect(text).toContain("not a press master");
    expect(text).toContain("300 DPI");
    expect(text).toContain("Legal");
  });

  it("names files with resolution, bleed and marks", () => {
    const geo = proofGeometry(1080, 1080, DEFAULT_PROOF_OPTIONS);
    expect(proofFileBase("Legal Bloom Card", geo, DEFAULT_PROOF_OPTIONS)).toBe(
      "legal-bloom-card-proof-300dpi-bleed3mm-crop",
    );
  });
});
