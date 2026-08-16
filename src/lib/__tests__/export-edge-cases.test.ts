/**
 * EXPORT EDGE CASES
 * =================
 *
 * The happy-path export gates (verify-exports, format-verify, placement sweep)
 * all run with an authored industry look, assets that load, and imagery at sane
 * pixel densities. Field defects came from the opposite: grounds COMPOSED from
 * two looks, assets that never arrive, and bitmaps at absurd DPI.
 *
 * These are pure-function guards over the three helpers those paths depend on:
 *   * template-background.composeOverrideLayers → blended industry grounds
 *   * export-image-aspect.aspectFrame           → unusual DPI geometry
 *   * pptx-image-compat                          → missing/unknown assets
 *
 * The rendered-artifact counterpart lives in tests/e2e/export-edge-cases.spec.ts.
 */
import { describe, expect, it } from "vitest";

import {
  composeOverrideLayers,
  defaultOverride,
  isNeutralOverride,
  withAlpha,
} from "../template-background";
import {
  aspectFrame,
  getImageAspect,
  measureImageAspect,
  setImageAspect,
} from "../export-image-aspect";
import { isWebpSource, transcodeToUniversalDataUrl } from "../pptx-image-compat";

const GROUND = [
  "radial-gradient(circle at 20% 10%, #A1FBF9 0%, transparent 60%)",
  "linear-gradient(180deg, #E0E8F5 0%, #FFFFFF 100%)",
];

describe("blended industry backgrounds", () => {
  it("keeps every authored layer when a second look's tint is mixed in", () => {
    const out = composeOverrideLayers(
      GROUND,
      { ...defaultOverride("S01", "signal"), tint: "#EC388A", tintStrength: 0.22 },
      "#FFFFFF",
    );
    // Tint rides in FRONT of the authored geometry, which survives intact.
    expect(out[0]).toContain("rgba");
    for (const layer of GROUND) expect(out).toContain(layer);
  });

  it("deepens by re-striking the same geometry above intensity 1", () => {
    const out = composeOverrideLayers(
      GROUND,
      { ...defaultOverride("S02", "atlas"), intensity: 1.6 },
      "#FFFFFF",
    );
    for (const layer of GROUND) {
      expect(out.filter((l) => l === layer).length, `layer not doubled: ${layer}`).toBe(2);
    }
  });

  it("veils rather than deletes geometry below intensity 1", () => {
    const out = composeOverrideLayers(
      GROUND,
      { ...defaultOverride("S03", "atlas"), intensity: 0.25 },
      "#0B1020",
    );
    expect(out.some((l) => l.includes("rgba(11, 16, 32, 0.75"))).toBe(true);
    for (const layer of GROUND) expect(out).toContain(layer);
  });

  it("clamps absurd intensity and tint strength instead of producing invalid CSS", () => {
    const out = composeOverrideLayers(
      GROUND,
      {
        ...defaultOverride("S04", "atlas"),
        intensity: 99,
        tint: "#FFEB66",
        tintStrength: 12,
      },
      "#FFFFFF",
    );
    // tintStrength is capped at 0.85 — never a fully opaque wash that would
    // erase the industry ground in the exported raster.
    expect(out[0]).toContain("0.85");
    for (const l of out) {
      expect(l, `NaN leaked into a background layer: ${l}`).not.toMatch(/NaN|undefined/);
    }
    // Doubling is bounded: authored layers appear at most twice.
    for (const layer of GROUND) {
      expect(out.filter((l) => l === layer).length).toBeLessThanOrEqual(2);
    }
  });

  it("blends a custom industry photo BEHIND the composed geometry", () => {
    const out = composeOverrideLayers(
      GROUND,
      { ...defaultOverride("S05", "atlas"), imageUrl: "https://cdn.example/steel.jpg" },
      "#FFFFFF",
    );
    expect(out[out.length - 1]).toContain("steel.jpg");
    expect(out[out.length - 1]).toContain("cover");
  });

  it("treats an all-default override as neutral so authored packs are untouched", () => {
    expect(isNeutralOverride(defaultOverride("S06", "atlas"))).toBe(true);
    expect(
      isNeutralOverride({ ...defaultOverride("S06", "atlas"), tint: "#000", tintStrength: 0.4 }),
    ).toBe(false);
  });

  it("never emits a malformed rgba() for odd colour input", () => {
    for (const c of ["#FFF", "#003FC7", "rgb(1,2,3)", "", "not-a-colour"]) {
      const layer = withAlpha(c, 0.4);
      expect(layer, `bad alpha colour for ${c}`).not.toMatch(/NaN/);
      expect(typeof layer).toBe("string");
      expect(layer.length).toBeGreaterThan(0);
    }
  });
});

describe("unusual image DPI", () => {
  const BOX = { x: 1.25, y: 0.75, w: 4, h: 2.25 };

  /** Every extreme density must land inside the box at its own ratio. */
  const DENSITIES: Array<[number, number]> = [
    [1, 1], // tracking pixel
    [1200, 3], // hairline wordmark strip
    [9, 4000], // vertical rule
    [16, 9],
    [5000, 5000], // print-DPI square
    [2401, 1279], // non-integer ratio
  ];

  for (const [w, h] of DENSITIES) {
    it(`fits a ${w}×${h} source without stretching`, () => {
      const src = `dpi://${w}x${h}`;
      setImageAspect(src, w, h);
      const ratio = getImageAspect(src)!;
      expect(ratio).toBeCloseTo(w / h, 6);

      const f = aspectFrame(ratio, "contain", BOX.x, BOX.y, BOX.w, BOX.h);
      expect(f.exact).toBe(true);
      for (const n of [f.x, f.y, f.w, f.h]) {
        expect(Number.isFinite(n), `non-finite geometry for ${w}×${h}`).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
      }
      // Ratio preserved to within a rounding hair.
      expect(Math.abs(f.w / f.h - ratio) / ratio).toBeLessThan(0.001);
      // Contained: never larger than the placeholder, always centered in it.
      expect(f.w).toBeLessThanOrEqual(BOX.w + 1e-9);
      expect(f.h).toBeLessThanOrEqual(BOX.h + 1e-9);
      expect(f.x + f.w).toBeLessThanOrEqual(BOX.x + BOX.w + 1e-9);
      expect(f.y + f.h).toBeLessThanOrEqual(BOX.y + BOX.h + 1e-9);
      expect(f.x + f.w / 2).toBeCloseTo(BOX.x + BOX.w / 2, 6);
      expect(f.y + f.h / 2).toBeCloseTo(BOX.y + BOX.h / 2, 6);
    });
  }

  it("rejects degenerate intrinsic sizes instead of caching a bad ratio", () => {
    for (const [w, h] of [
      [0, 100],
      [100, 0],
      [-5, 10],
      [Number.NaN, 10],
      [10, Number.POSITIVE_INFINITY],
    ] as Array<[number, number]>) {
      const src = `bad://${w}x${h}`;
      setImageAspect(src, w, h);
      expect(getImageAspect(src), `${w}×${h} should stay unmeasured`).toBeUndefined();
    }
  });

  it("falls back to the placeholder box when the ratio is unknown", () => {
    const f = aspectFrame(undefined, "contain", 1, 1, 4, 3);
    expect(f).toEqual({ x: 1, y: 1, w: 4, h: 3, exact: false });
  });

  it("keeps the box for cover/fill crops at any density", () => {
    for (const fit of ["cover", "fill"] as const) {
      const f = aspectFrame(400, fit, 0, 0, 13.333, 7.5);
      expect(f.w).toBe(13.333);
      expect(f.h).toBe(7.5);
      expect(f.exact).toBe(false);
    }
  });

  it("never divides by a zero-sized placeholder", () => {
    for (const [w, h] of [
      [0, 3],
      [4, 0],
    ] as Array<[number, number]>) {
      const f = aspectFrame(1.5, "contain", 1, 1, w, h);
      expect(Number.isFinite(f.w) && Number.isFinite(f.h)).toBe(true);
      expect(f.exact).toBe(false);
    }
  });
});

describe("missing assets fallback", () => {
  it("leaves an unmeasurable asset unmeasured rather than throwing", async () => {
    await expect(measureImageAspect("https://example.invalid/missing.png")).resolves.toBeUndefined();
    expect(getImageAspect("https://example.invalid/missing.png")).toBeUndefined();
    await expect(measureImageAspect(null)).resolves.toBeUndefined();
    await expect(measureImageAspect("")).resolves.toBeUndefined();
  });

  it("returns null (never throws) when a bitmap cannot be decoded", async () => {
    await expect(transcodeToUniversalDataUrl("data:image/webp;base64,zz")).resolves.toBeNull();
    await expect(transcodeToUniversalDataUrl("")).resolves.toBeNull();
  });

  it("does not mistake a missing/odd source for WebP", () => {
    expect(isWebpSource({ url: null, dataUrl: null, blobType: null })).toBe(false);
    expect(isWebpSource({ url: "/logo.svg" })).toBe(false);
    expect(isWebpSource({ url: "/photo.WEBP?v=2" })).toBe(true);
    expect(isWebpSource({ blobType: "image/webp" })).toBe(true);
  });
});
