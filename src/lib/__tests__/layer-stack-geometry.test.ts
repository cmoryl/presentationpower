import { describe, expect, it } from "vitest";

import { rectRadiusAdj, pxToRadiusIn, SLIDE_W_IN, STAGE_W_PX } from "@/lib/export-radius";
import {
  LANE_RADIUS_PX,
  laneCornerRadiusIn,
  laneCornerRadiusPx,
  laneHeightIn,
  laneHeightPx,
  railBoxIn,
  railBoxPx,
} from "@/lib/layer-stack-geometry";

/** Lane counts the MV-PROC-LAYER-STACK variant supports (1–5 lanes). */
const LANE_COUNTS = [1, 2, 3, 4, 5];

/**
 * Slide aspect ratios the exporter has to survive. 16:9 is the shipping deck
 * size; 4:3 and the tall 1:1 case cover legacy/social exports where the
 * content band gets much shorter per lane.
 */
const ASPECTS = [
  { name: "16:9", wIn: 13.333, hIn: 7.5 },
  { name: "4:3", wIn: 10, hIn: 7.5 },
  { name: "1:1", wIn: 7.5, hIn: 7.5 },
];

describe("layer stack lane rounding", () => {
  it("clamps the lane radius to the token, never past a half-height", () => {
    expect(laneCornerRadiusPx(150)).toBe(LANE_RADIUS_PX);
    expect(laneCornerRadiusPx(104)).toBe(LANE_RADIUS_PX);
    // Degenerate/tiny lanes become stadiums rather than over-rounded plates.
    expect(laneCornerRadiusPx(20)).toBe(10);
    expect(laneCornerRadiusPx(0)).toBe(0);
  });

  it("keeps the stage and export lane radius in parity for every lane height", () => {
    for (const laneHPx of [72, 88, 104, 118, 134, 150, 210]) {
      const px = laneCornerRadiusPx(laneHPx);
      const inches = laneCornerRadiusIn(pxToRadiusIn(laneHPx));
      expect(inches).toBeCloseTo(pxToRadiusIn(px), 6);
    }
  });
});

describe("layer stack accent rail", () => {
  it("is a true pill at every supported lane height", () => {
    for (const laneHPx of [40, 72, 104, 118, 134, 150, 240]) {
      const rail = railBoxPx(laneHPx);
      expect(rail.radius).toBeCloseTo(Math.min(rail.width, rail.height) / 2, 6);
      // Never a pinched wedge: the radius can never exceed half the short side.
      expect(rail.radius).toBeLessThanOrEqual(rail.width / 2 + 1e-9);
      // Rail stays inside the lane and inside the lane's rounded corners.
      expect(rail.inset).toBeGreaterThan(0);
      expect(rail.inset * 2 + rail.height).toBeLessThanOrEqual(laneHPx + 1e-9);
      expect(rail.height).toBeGreaterThan(0);
    }
  });

  it("shrinks its inset instead of collapsing on very short lanes", () => {
    const tall = railBoxPx(150);
    const short = railBoxPx(48);
    expect(short.inset).toBeLessThan(tall.inset);
    expect(short.height).toBeGreaterThan(0);
    expect(short.radius).toBeCloseTo(Math.min(short.width, short.height) / 2, 6);
  });

  it("exports a pill adj of 50000 for every lane count and aspect ratio", () => {
    for (const aspect of ASPECTS) {
      for (const count of LANE_COUNTS) {
        const bandTop = 1.9;
        const bandBottom = aspect.hIn - 1.55;
        const gap = 0.14;
        const laneH = laneHeightIn(bandTop, bandBottom, count, gap);
        expect(laneH).toBeGreaterThan(0);

        const rail = railBoxIn(bandTop, laneH);
        const adj = rectRadiusAdj(rail.rectRadius, rail.w, rail.h);
        // pptxgenjs clamps a roundRect adj at 50000 = fully rounded (a pill).
        expect(adj, `${aspect.name} · ${count} lanes`).toBe(50000);

        // Rail never escapes its lane.
        expect(rail.y).toBeGreaterThanOrEqual(bandTop);
        expect(rail.y + rail.h).toBeLessThanOrEqual(bandTop + laneH + 1e-9);

        // Lane plate rounding stays the token unless the lane is short enough
        // that a half-height is smaller — and then it is exactly a half-height.
        const laneRadius = laneCornerRadiusIn(laneH);
        expect(laneRadius).toBeLessThanOrEqual(pxToRadiusIn(LANE_RADIUS_PX) + 1e-9);
        expect(laneRadius).toBeLessThanOrEqual(laneH / 2 + 1e-9);
        expect(rectRadiusAdj(laneRadius, aspect.wIn - 1.2, laneH)).toBeLessThanOrEqual(50000);
      }
    }
  });

  it("matches the stage rail after px→inch conversion", () => {
    for (const count of LANE_COUNTS) {
      const bandHPx = 640;
      const gapPx = count > 4 ? 10 : 14;
      const laneHPx = laneHeightPx(bandHPx, count, gapPx);
      const stage = railBoxPx(laneHPx);
      const exported = railBoxIn(0, pxToRadiusIn(laneHPx));

      expect(exported.w).toBeCloseTo(pxToRadiusIn(stage.width), 6);
      expect(exported.h).toBeCloseTo(pxToRadiusIn(stage.height), 6);
      expect(exported.y).toBeCloseTo(pxToRadiusIn(stage.inset), 6);
      expect(exported.rectRadius).toBeCloseTo(pxToRadiusIn(stage.radius), 6);
    }
  });

  it("uses one px-per-inch scale for the conversion", () => {
    expect(pxToRadiusIn(STAGE_W_PX)).toBeCloseTo(SLIDE_W_IN, 6);
  });
});
