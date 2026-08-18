// Visual regression guard for the MV-PROC-LAYER-STACK left accent rail.
// ---------------------------------------------------------------------
// The rail is a 5px vertical bar sitting inside an 18px-rounded lane. When it
// inherited the lane radius it rendered as a *pinched wedge* at both ends — a
// visible defect on every layer-stack slide. This suite locks the rendered
// geometry (stage px + exported inches + the raw OOXML `adj` PowerPoint reads)
// for the key slide variants: every supported lane count, and the aspect ratios
// the exporter ships. A snapshot diff here means the rail's silhouette changed.

import { describe, expect, it } from "vitest";

import { rectRadiusAdj } from "@/lib/export-radius";
import {
  RAIL_W_PX,
  laneCornerRadiusIn,
  laneCornerRadiusPx,
  laneHeightIn,
  laneLadderPx,
  railBoxIn,
  railBoxPx,
} from "@/lib/layer-stack-geometry";

/** Lane counts the variant renders (1–5 lanes). */
const LANE_COUNTS = [1, 2, 3, 4, 5];

/** Exported content band (inches) per shipping slide aspect ratio. */
const ASPECTS = [
  { name: "16:9", bandTop: 2.05, bandBottom: 6.35 },
  { name: "4:3", bandTop: 2.05, bandBottom: 6.1 },
  { name: "1:1", bandTop: 2.2, bandBottom: 6.6 },
];

/** PowerPoint's roundRect `adj` maxes out at 50000 — a true pill. */
const PILL_ADJ = 50000;

function railDescriptor(laneHPx: number) {
  const rail = railBoxPx(laneHPx);
  return {
    laneRadiusPx: laneCornerRadiusPx(laneHPx),
    railInsetPx: round(rail.inset),
    railWidthPx: rail.width,
    railHeightPx: round(rail.height),
    railRadiusPx: round(rail.radius),
    // The silhouette test: radius === half the short side => rounded ends, no pinch.
    isPill: Math.abs(rail.radius - Math.min(rail.width, rail.height) / 2) < 1e-9,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

describe("layer stack accent rail — visual regression", () => {
  it("locks the rendered rail silhouette for every lane count", () => {
    const rendered = LANE_COUNTS.map((count) => {
      const { height, gap } = laneLadderPx(count);
      return { count, laneHeightPx: height, laneGapPx: gap, ...railDescriptor(height) };
    });

    for (const row of rendered) {
      expect(row.isPill, `lane count ${row.count} rail must be a pill`).toBe(true);
      // Rail stays fully inside the lane, clear of the lane's rounded corners.
      expect(row.railInsetPx).toBeGreaterThan(0);
      expect(row.railInsetPx * 2 + row.railHeightPx).toBeLessThanOrEqual(row.laneHeightPx + 1e-9);
      // A hairline bar can never carry the lane's plate radius again.
      expect(row.railRadiusPx).toBeLessThanOrEqual(RAIL_W_PX / 2 + 1e-9);
      expect(row.railRadiusPx).toBeLessThan(row.laneRadiusPx);
    }

    expect(rendered).toMatchSnapshot();
  });

  it("locks the exported rail silhouette across slide aspect ratios", () => {
    const exported = ASPECTS.flatMap((aspect) =>
      LANE_COUNTS.map((count) => {
        const { gap } = laneLadderPx(count);
        const gapIn = gap / 144;
        const laneHIn = laneHeightIn(aspect.bandTop, aspect.bandBottom, count, gapIn);
        const rail = railBoxIn(aspect.bandTop, laneHIn);
        const adj = rectRadiusAdj(rail.rectRadius, rail.w, rail.h);
        return {
          aspect: aspect.name,
          count,
          laneRadiusIn: round(laneCornerRadiusIn(laneHIn)),
          railWIn: round(rail.w),
          railHIn: round(rail.h),
          railRadiusIn: round(rail.rectRadius),
          adj,
        };
      }),
    );

    for (const row of exported) {
      // PowerPoint renders a stadium only at the clamped max adjustment.
      expect(row.adj, `${row.aspect} / ${row.count} lanes`).toBe(PILL_ADJ);
      expect(row.railRadiusIn).toBeCloseTo(Math.min(row.railWIn, row.railHIn) / 2, 2);
      expect(row.railRadiusIn).toBeLessThan(row.laneRadiusIn);
      expect(row.railHIn).toBeGreaterThan(0);
    }

    expect(exported).toMatchSnapshot();
  });

  it("keeps stage and export rails in parity (no surface-specific pinch)", () => {
    for (const count of LANE_COUNTS) {
      const { height, gap } = laneLadderPx(count);
      const gapIn = gap / 144;
      const laneHIn = laneHeightIn(0, (height * 5) / 144 + gapIn * 4, 5, gapIn);
      const stage = railBoxPx(height);
      const exported = railBoxIn(0, laneHIn);
      // Both surfaces derive the pill from the same short side.
      expect(exported.rectRadius).toBeCloseTo(Math.min(exported.w, exported.h) / 2, 6);
      expect(stage.radius).toBeCloseTo(Math.min(stage.width, stage.height) / 2, 6);
    }
  });
});
