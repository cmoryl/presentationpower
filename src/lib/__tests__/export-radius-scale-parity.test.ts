// Corner rounding must be identical at every export scale and DPI setting.
// ---------------------------------------------------------------------------
// Two independent paths can change a corner between quality settings:
//
//   1. VECTOR (text, shapes, tiles) — pptxgenjs `rectRadius` is in inches, so
//      it is resolution independent. This file proves the exported `adj` guide
//      and painted radius are byte-identical across 144 / 220 / 300 DPI, i.e.
//      the DPI setting can never round a corner differently.
//   2. RASTER (decor plates, style-pack sheets, backdrops) — captured at a
//      pixel ratio derived from the chosen DPI. A 22px stage corner is painted
//      at 22 × ratio raster px, so the backend's whole-pixel snap is the only
//      place the silhouette can move. We diff the corner coverage (alpha) maps
//      pixel-for-pixel on the stage grid at every supported scale.

import { describe, expect, it } from "vitest";
import {
  EXPORT_QUALITIES,
  rasterSize,
  stagePixelRatio,
  STAGE_W,
  STAGE_H,
} from "../export-quality";
import {
  EXPORT_RADIUS_IN,
  PX_PER_IN,
  coverageDiff,
  cornerCoverageMap,
  pillRadiusIn,
  radiusPxAtScale,
  rectRadiusAdj,
  renderedRadiusPx,
  scaleRadiusDriftPx,
} from "../export-radius";
import { CHIP_RADIUS_PX, MEDIA_RADIUS_PX, SUMMARY_BAND } from "../surface-tokens";

const TOKENS = [
  { name: "media", px: MEDIA_RADIUS_PX, inches: EXPORT_RADIUS_IN.media },
  { name: "band", px: SUMMARY_BAND.radius, inches: EXPORT_RADIUS_IN.band },
  { name: "chip", px: CHIP_RADIUS_PX, inches: EXPORT_RADIUS_IN.chip },
];

const SHAPES = [
  { name: "bento cell 3-up", w: 3.9, h: 2.35 },
  { name: "half plate", w: 6.2, h: 4.6 },
  { name: "summary band", w: 10.6, h: 1.1 },
  { name: "logo tile", w: 0.62, h: 0.62 },
  { name: "narrow chip", w: 1.15, h: 0.34 },
];

/** Whole-pixel snapping at a capture scale may not move a corner this far. */
const SCALE_DRIFT_BUDGET_PX = 0.5;
/** Corner silhouette tolerance vs the 1× reference (alpha, 0..1). */
const COVERAGE_MAX_BUDGET = 0.08;
const COVERAGE_MEAN_BUDGET = 0.01;

const SCALES = EXPORT_QUALITIES.map((q) => ({
  id: q.id,
  dpi: q.dpi,
  scale: stagePixelRatio(q.id),
}));

describe("corner rounding parity across export scales and DPI", () => {
  it("exposes a capture scale ≥ 1 for every supported quality", () => {
    expect(SCALES.length).toBe(EXPORT_QUALITIES.length);
    for (const s of SCALES) {
      expect(s.scale, `${s.id} scale`).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(s.scale)).toBe(true);
    }
    // Higher DPI must never capture smaller than lower DPI.
    const ordered = [...SCALES].sort((a, b) => a.dpi - b.dpi).map((s) => s.scale);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThanOrEqual(ordered[i - 1]);
    }
  });

  it("keeps every raster plate exactly on the stage aspect at every DPI", () => {
    const aspect = STAGE_W / STAGE_H;
    for (const q of EXPORT_QUALITIES) {
      const { width, height } = rasterSize(q.id);
      expect(
        Math.abs(width / height - aspect),
        `${q.id} plate ${width}×${height} is off-aspect (would letterbox or crop corners)`,
      ).toBeLessThanOrEqual(0.002);
    }
  });

  it("emits an identical vector radius at every DPI setting (resolution independent)", () => {
    for (const t of TOKENS) {
      for (const s of SHAPES) {
        const perQuality = SCALES.map(() => ({
          adj: rectRadiusAdj(t.inches, s.w, s.h),
          px: renderedRadiusPx(t.inches, s.w, s.h),
        }));
        const first = perQuality[0];
        for (const got of perQuality) {
          expect(got.adj, `${t.name} on ${s.name}: adj changed with DPI`).toBe(first.adj);
          expect(got.px, `${t.name} on ${s.name}: painted radius changed with DPI`).toBe(
            first.px,
          );
        }
      }
    }
  });

  it("keeps pills fully rounded at every DPI", () => {
    for (const h of [0.34, 0.62, 1.1]) {
      for (const _ of SCALES) {
        expect(rectRadiusAdj(pillRadiusIn(h), 4.6, h)).toBe(50000);
      }
    }
  });

  it("keeps raster corners within a sub-pixel budget at every capture scale", () => {
    for (const t of TOKENS) {
      for (const s of SCALES) {
        const drift = scaleRadiusDriftPx(t.px, s.scale);
        expect(
          drift,
          `${t.name} corner drifts ${drift.toFixed(3)}px at ${s.dpi} DPI (scale ${s.scale.toFixed(3)})`,
        ).toBeLessThanOrEqual(SCALE_DRIFT_BUDGET_PX);
        // The radius must also grow with the plate, never stay at stage px.
        expect(radiusPxAtScale(t.px, s.scale)).toBeCloseTo(t.px * s.scale, 9);
      }
    }
  });

  it("pixel-diffs the corner silhouette at every scale against the 1× reference", () => {
    for (const t of TOKENS) {
      const reference = cornerCoverageMap(t.px, 1);
      for (const s of SCALES) {
        const got = cornerCoverageMap(t.px, s.scale);
        const { max, mean } = coverageDiff(reference, got);
        expect(
          max,
          `${t.name} corner shifts (max Δalpha ${max.toFixed(4)}) at ${s.dpi} DPI`,
        ).toBeLessThanOrEqual(COVERAGE_MAX_BUDGET);
        expect(
          mean,
          `${t.name} corner shape differs (mean Δalpha ${mean.toFixed(4)}) at ${s.dpi} DPI`,
        ).toBeLessThanOrEqual(COVERAGE_MEAN_BUDGET);
      }
    }
  });

  it("agrees between the raster corner and the vector corner it sits behind", () => {
    // A layered slide paints the plate corner (raster) under the tile corner
    // (vector). If those disagree by more than a sub-pixel, a light seam or a
    // dark bite appears at the corner in PowerPoint.
    for (const t of TOKENS) {
      const vectorPx = renderedRadiusPx(t.inches, 3.9, 2.35);
      for (const s of SCALES) {
        const rasterPx = Math.round(radiusPxAtScale(t.px, s.scale)) / s.scale;
        expect(
          Math.abs(rasterPx - vectorPx),
          `${t.name}: raster/vector corner mismatch at ${s.dpi} DPI`,
        ).toBeLessThanOrEqual(SCALE_DRIFT_BUDGET_PX);
      }
    }
  });

  it("snapshots the per-DPI rounding fingerprint", () => {
    expect(
      SCALES.map((s) => ({
        quality: s.id,
        dpi: s.dpi,
        plate: rasterSize(s.id),
        scale: Number(s.scale.toFixed(6)),
        pxPerIn: Number(PX_PER_IN.toFixed(4)),
        corners: TOKENS.map((t) => ({
          token: t.name,
          stagePx: t.px,
          rasterPx: Number(radiusPxAtScale(t.px, s.scale).toFixed(3)),
          snappedBackPx: Number((Math.round(radiusPxAtScale(t.px, s.scale)) / s.scale).toFixed(4)),
          vectorAdj: rectRadiusAdj(t.inches, 3.9, 2.35),
        })),
      })),
    ).toMatchSnapshot();
  });
});
