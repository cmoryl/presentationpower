import { describe, expect, it } from "vitest";

import { dropGhostPaint, isGhostPaint, type DomShape } from "../export-dom-decompose";

const SPACE = { w: 1920, h: 1080 };

function shape(over: Partial<DomShape>): DomShape {
  return {
    kind: "rect",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    radiusPx: 0,
    fill: { hex: "FFFFFF", alpha: 1 },
    gradient: null,
    line: null,
    shadow: null,
    name: "TP Shape",
    rotationDeg: 0,
    ...over,
  } as DomShape;
}

describe("clear-box guard", () => {
  it("drops a stage-spanning translucent column rail", () => {
    const rail = shape({ x: 400, y: 0, w: 120, h: 1080, fill: { hex: "FFFFFF", alpha: 0.08 } });
    expect(isGhostPaint(rail, SPACE)).toBe(true);
  });

  it("drops a large see-through wash over a dark module", () => {
    const wash = shape({ w: 1400, h: 700, fill: { hex: "03002C", alpha: 0.12 } });
    expect(isGhostPaint(wash, SPACE)).toBe(true);
  });

  it("drops an effectively unpainted box at any size", () => {
    expect(isGhostPaint(shape({ w: 300, h: 200, fill: { hex: "FFFFFF", alpha: 0.02 } }), SPACE)).toBe(
      true,
    );
  });

  it("keeps a glass card: translucent but stroked", () => {
    const card = shape({
      kind: "roundRect",
      w: 620,
      h: 520,
      fill: { hex: "FFFFFF", alpha: 0.08 },
      line: { hex: "FFFFFF", alpha: 0.2, widthPx: 1 },
    });
    expect(isGhostPaint(card, SPACE)).toBe(false);
  });

  it("keeps a gradient-to-zero module box", () => {
    const box = shape({
      kind: "roundRect",
      w: 600,
      h: 480,
      fill: null,
      gradient: {
        angleDeg: 180,
        stops: [
          { color: { hex: "003FC7", alpha: 0.34 }, pos: 0 },
          { color: { hex: "003FC7", alpha: 0 }, pos: 100 },
        ],
      },
    });
    expect(isGhostPaint(box, SPACE)).toBe(false);
  });

  it("keeps timeline furniture (spine, tick, connector)", () => {
    const spine = shape({ x: 200, y: 300, w: 4, h: 520, fill: { hex: "FFFFFF", alpha: 0.1 } });
    expect(isGhostPaint(spine, SPACE)).toBe(false);
  });

  it("keeps pictures", () => {
    const pic = shape({ kind: "image", src: "data:image/png;base64,x", w: 1920, h: 1080, fill: null });
    expect(isGhostPaint(pic, SPACE)).toBe(false);
  });

  it("filters a mixed list down to real objects", () => {
    const ghost = shape({ x: 0, y: 0, w: 200, h: 900, fill: { hex: "000000", alpha: 0.06 } });
    const real = shape({ w: 400, h: 300, fill: { hex: "003FC7", alpha: 1 } });
    expect(dropGhostPaint([ghost, real], SPACE)).toEqual([real]);
  });
});
