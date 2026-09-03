import { describe, expect, it } from "vitest";

import { centeredOffset, centeredPosition, isCentered } from "@/lib/center-tools";

describe("center tools", () => {
  it("centres a box on each axis", () => {
    const box = { x: 0, y: 0, w: 100, h: 50 };
    const frame = { w: 500, h: 250 };
    expect(centeredPosition(box, frame, "h")).toEqual({ x: 200, y: 0 });
    expect(centeredPosition(box, frame, "v")).toEqual({ x: 0, y: 100 });
    expect(centeredPosition(box, frame, "both")).toEqual({ x: 200, y: 100 });
  });

  it("returns the offset that centres a nudge-model object", () => {
    // Object sits 40mm left of centre; the nudge is a fraction of a 400mm span.
    const box = { x: 160, y: 0, w: 100, h: 50 };
    const next = centeredOffset({ dx: 0.1, dy: 0 }, box, { w: 520, h: 200 }, "h", {
      x: 400,
      y: 400,
    });
    expect(next.dx).toBeCloseTo(0.1 + (210 - 160) / 400, 6);
    expect(next.dy).toBe(0);
  });

  it("reports centred boxes", () => {
    const frame = { w: 200, h: 100 };
    expect(isCentered({ x: 50, y: 25, w: 100, h: 50 }, frame, "both")).toBe(true);
    expect(isCentered({ x: 0, y: 25, w: 100, h: 50 }, frame, "h")).toBe(false);
  });
});
