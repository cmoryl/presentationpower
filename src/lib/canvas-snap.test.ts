import { describe, expect, it } from "vitest";
import {
  boundsOf,
  buildSnapTargets,
  rectsIntersect,
  snapMove,
  snapResize,
  STAGE_W,
  clampToStage,
} from "@/lib/canvas-snap";

describe("canvas snapping", () => {
  it("snaps a near-center box to the slide center", () => {
    const r = snapMove({ x: 456, y: 400, w: 1000, h: 200 }, [], { enabled: true });
    expect(r.box.x + r.box.w / 2).toBe(STAGE_W / 2);
    expect(r.guides.some((g) => g.axis === "x" && g.kind === "center")).toBe(true);
  });

  it("snaps to a sibling left edge", () => {
    const r = snapMove({ x: 304, y: 700, w: 200, h: 100 }, [{ x: 300, y: 100, w: 400, h: 200 }], {
      enabled: true,
    });
    expect(r.box.x).toBe(300);
  });

  it("falls back to the grid when nothing is near", () => {
    const r = snapMove({ x: 787, y: 333, w: 100, h: 100 }, [], { enabled: true });
    expect(r.box.x % 20).toBe(0);
  });

  it("does not move anything when snapping is off", () => {
    const r = snapMove({ x: 457, y: 401, w: 100, h: 100 }, [], { enabled: false });
    expect(r.box).toEqual({ x: 457, y: 401, w: 100, h: 100 });
    expect(r.guides).toHaveLength(0);
  });

  it("resizes only the handled edges and respects a minimum size", () => {
    const r = snapResize({ x: 400, y: 400, w: 200, h: 200 }, "se", -500, -500, [], {
      enabled: false,
    });
    expect(r.box.x).toBe(400);
    expect(r.box.w).toBe(40);
    expect(r.box.h).toBe(24);
  });

  it("computes selection bounds and hit tests", () => {
    const b = boundsOf([
      { x: 100, y: 100, w: 100, h: 100 },
      { x: 400, y: 300, w: 100, h: 100 },
    ]);
    expect(b).toEqual({ x: 100, y: 100, w: 400, h: 300 });
    expect(rectsIntersect(b, { x: 380, y: 280, w: 10, h: 10 })).toBe(true);
    expect(rectsIntersect(b, { x: 900, y: 900, w: 10, h: 10 })).toBe(false);
  });

  it("allows deliberate half-bleed off the stage", () => {
    const c = clampToStage({ x: -900, y: 0, w: 400, h: 200 });
    expect(c.x).toBe(-200);
  });
});

describe("precomputed snap targets", () => {
  const others = [{ x: 400, y: 200, w: 200, h: 100 }];
  it("matches on-the-fly target building for moves", () => {
    const box = { x: 396, y: 640, w: 100, h: 50 };
    const a = snapMove(box, others, { enabled: true });
    const b = snapMove(box, [], { enabled: true, targets: buildSnapTargets(others) });
    expect(b).toEqual(a);
  });
  it("matches on-the-fly target building for resizes", () => {
    const start = { x: 100, y: 100, w: 200, h: 100 };
    const a = snapResize(start, "e", 296, 0, others, { enabled: true });
    const b = snapResize(start, "e", 296, 0, [], {
      enabled: true,
      targets: buildSnapTargets(others),
    });
    expect(b).toEqual(a);
  });
});
