/**
 * Unit contract for the chart style visual-regression metrics used by
 * scripts/chart-style-regression.mjs. The runner needs LibreOffice, Playwright
 * and a dev server; the maths does not — so the maths is proven here with
 * synthetic rasters that reproduce each real failure class we have shipped:
 * a fill exported in the wrong colour, a stroke exported too heavy, a gradient
 * exported flat, and a gauge track dropped entirely.
 */
import { describe, expect, it } from "vitest";

import {
  chartMask,
  compareStyle,
  dominantHue,
  flagStyle,
  hsl,
  styleDescriptor,
} from "../../../scripts/lib/chart-style-metrics.mjs";

const W = 120;
const H = 120;

type Raster = { width: number; height: number; data: Uint8Array };

function blank(r = 255, g = 255, b = 255): Raster {
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width: W, height: H, data };
}

function paint(
  png: Raster,
  box: { x0: number; y0: number; x1: number; y1: number },
  color: (x: number, y: number) => [number, number, number],
) {
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) {
      const [r, g, b] = color(x, y);
      const p = (y * W + x) * 4;
      png.data[p] = r;
      png.data[p + 1] = g;
      png.data[p + 2] = b;
      png.data[p + 3] = 255;
    }
  }
}

const FULL_MASK = new Uint8Array(W * H).fill(1);
const LIMITS = {
  minFill: 0.9,
  maxStroke: 0.08,
  maxGradient: 0.1,
  maxTrack: 0.08,
  maxHueShift: 18,
};

/**
 * The runner never measures the whole frame — it masks to the exporter's own
 * graphic rects, so the fixtures do the same for the gauge cases.
 */
const GAUGE_RECT = { x: 10 / W, y: 40 / H, w: 100 / W, h: 40 / H };
const GAUGE_MASK = chartMask(W, H, [GAUGE_RECT], [], 0, 0).mask;

/** Solid brand-blue bar with a pale tint track beside it — a typical gauge. */
function gaugeReference() {
  const png = blank();
  paint(png, { x0: 10, y0: 40, x1: 60, y1: 80 }, () => [0, 63, 199]); // filled arc
  paint(png, { x0: 60, y0: 40, x1: 110, y1: 80 }, () => [214, 224, 245]); // track tint
  return png;
}

function compare(reference: Raster, exported: Raster, mask = FULL_MASK) {
  const hue = dominantHue(reference, mask);
  return compareStyle(styleDescriptor(reference, mask, hue), styleDescriptor(exported, mask, hue));
}

describe("chart style metrics", () => {
  it("reports a clean pass when the export matches the preview", () => {
    const metrics = compare(gaugeReference(), gaugeReference(), GAUGE_MASK);
    expect(metrics.fillScore).toBe(1);
    expect(metrics.strokeDelta).toBe(0);
    expect(metrics.gradientDelta).toBe(0);
    expect(metrics.trackDelta).toBe(0);
    expect(flagStyle(metrics, LIMITS)).toEqual([]);
  });

  it("flags a fill exported in the wrong colour", () => {
    const exported = blank();
    paint(exported, { x0: 10, y0: 40, x1: 60, y1: 80 }, () => [200, 40, 40]); // red, not blue
    paint(exported, { x0: 60, y0: 40, x1: 110, y1: 80 }, () => [214, 224, 245]);
    const metrics = compare(gaugeReference(), exported, GAUGE_MASK);
    expect(metrics.fillScore).toBeLessThan(LIMITS.minFill);
    expect(metrics.hueShift).toBeGreaterThan(LIMITS.maxHueShift);
    expect(flagStyle(metrics, LIMITS).join(" ")).toMatch(/fill|hue/);
  });

  it("flags a track that the export dropped", () => {
    const exported = blank();
    paint(exported, { x0: 10, y0: 40, x1: 60, y1: 80 }, () => [0, 63, 199]);
    // track region left white — the classic "gauge remainder lost on export"
    const metrics = compare(gaugeReference(), exported, GAUGE_MASK);
    expect(metrics.referenceTrack).toBeGreaterThan(0.1);
    expect(metrics.exportTrack).toBeLessThan(0.02);
    expect(metrics.trackDelta).toBeGreaterThan(LIMITS.maxTrack);
    expect(flagStyle(metrics, LIMITS).join(" ")).toContain("track styling");
  });

  it("flags a gradient exported as a flat fill", () => {
    const ramp = blank();
    paint(ramp, { x0: 0, y0: 0, x1: W, y1: H }, (x) => {
      const t = x / W;
      return [Math.round(20 + t * 120), Math.round(60 + t * 90), 220];
    });
    const flat = blank();
    paint(flat, { x0: 0, y0: 0, x1: W, y1: H }, () => [80, 105, 220]);
    const metrics = compare(ramp, flat);
    expect(metrics.referenceGradient).toBeGreaterThan(0.5);
    expect(metrics.exportGradient).toBe(0);
    expect(metrics.gradientDelta).toBeGreaterThan(LIMITS.maxGradient);
    expect(flagStyle(metrics, LIMITS).join(" ")).toContain("gradient ramp");
  });

  it("flags strokes exported far heavier than the preview", () => {
    const thin = blank();
    for (let y = 10; y < 110; y += 20) paint(thin, { x0: 10, y0: y, x1: 110, y1: y + 1 }, () => [0, 0, 0]);
    const thick = blank();
    for (let y = 10; y < 110; y += 20) paint(thick, { x0: 10, y0: y, x1: 110, y1: y + 8 }, () => [0, 0, 0]);
    const metrics = compare(thin, thick);
    expect(metrics.exportStroke).toBeGreaterThan(metrics.referenceStroke ?? 0);
    expect(metrics.strokeDelta).toBeGreaterThan(LIMITS.maxStroke);
    expect(flagStyle(metrics, LIMITS).join(" ")).toContain("stroke ink");
  });

  it("masks text rects out of the compared chart region", () => {
    const { mask, count } = chartMask(
      100,
      100,
      [{ x: 0, y: 0, w: 1, h: 1 }],
      [{ x: 0, y: 0, w: 0.5, h: 1 }],
      0,
      0,
    );
    expect(count).toBe(5000);
    expect(mask[0]).toBe(0); // inside the text rect
    expect(mask[99]).toBe(1); // right half survives
  });

  it("treats desaturated pixels as achromatic so tints never set the accent hue", () => {
    expect(hsl(255, 255, 255).s).toBe(0);
    expect(dominantHue(blank(), FULL_MASK)).toBeNull();
  });
});
