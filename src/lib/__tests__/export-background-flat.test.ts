import { describe, expect, it } from "vitest";
import { keepBackgroundPaintOnPlate } from "../export-dom-decompose";
import type { DomShape } from "../export-dom-decompose";

const SPACE = { w: 1920, h: 1080 };

function box(part: Partial<DomShape>): DomShape {
  return {
    kind: "box",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    radiusPx: 0,
    fill: { hex: "112233", alpha: 1 },
    gradient: null,
    line: null,
    shadow: null,
    name: "TP Box",
    ...part,
  } as DomShape;
}

describe("keepBackgroundPaintOnPlate", () => {
  it("keeps ordinary cards native", () => {
    const shapes = [box({ x: 120, y: 200, w: 700, h: 420 })];
    expect(keepBackgroundPaintOnPlate(shapes, SPACE)).toHaveLength(1);
  });

  it("drops full-bleed washes so the background stays flat", () => {
    const shapes = [box({ w: 1920, h: 1080 })];
    expect(keepBackgroundPaintOnPlate(shapes, SPACE)).toHaveLength(0);
  });

  it("drops edge-hugging full-length bands (frames, edge rails)", () => {
    const leftEdge = box({ x: 0, w: 6, h: 1080 });
    const bottomEdge = box({ y: 1077, w: 1920, h: 3 });
    expect(keepBackgroundPaintOnPlate([leftEdge, bottomEdge], SPACE)).toHaveLength(0);
  });

  it("keeps module furniture native: timeline spines, rules and underlines", () => {
    const spine = box({ x: 200, y: 520, w: 1520, h: 4, name: "TP Timeline spine" });
    const tick = box({ x: 480, y: 500, w: 4, h: 44, name: "TP Milestone tick" });
    const dot = box({ x: 476, y: 512, w: 18, h: 18, radiusPx: 9, name: "TP Node" });
    const underline = box({ x: 130, y: 900, w: 320, h: 3, fill: { hex: "003FC7", alpha: 0.4 } });
    const columnRail = box({ x: 400, w: 6, h: 1080, name: "TP Column rule" });
    const kept = keepBackgroundPaintOnPlate([spine, tick, dot, underline, columnRail], SPACE);
    expect(kept).toHaveLength(5);
  });

  it("keeps pictures unless they cover the whole stage", () => {
    const photo = box({ kind: "image", x: 60, y: 60, w: 800, h: 600 });
    const fullBleed = box({ kind: "image", w: 1920, h: 1080 });
    const kept = keepBackgroundPaintOnPlate([photo, fullBleed], SPACE);
    expect(kept).toEqual([photo]);
  });
});
