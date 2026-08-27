import { describe, expect, it } from "vitest";
import { keepBackgroundPaintOnPlate, type DomShape } from "../export-dom-decompose";

const SPACE = { w: 1920, h: 1080 };

function box(partial: Partial<DomShape>): DomShape {
  return {
    kind: "box",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    node: undefined as unknown as Element,
    ...partial,
  } as DomShape;
}

describe("keepBackgroundPaintOnPlate — ghost transparency bars", () => {
  it("flattens tall translucent strips that do not reach both stage edges", () => {
    const bar = box({
      x: 820,
      y: 140,
      w: 120,
      h: 700,
      fill: { hex: "0A0830", alpha: 0.24 } as DomShape["fill"],
    });
    expect(keepBackgroundPaintOnPlate([bar], SPACE)).toHaveLength(0);
  });

  it("keeps a hairline timeline spine native", () => {
    const spine = box({
      x: 200,
      y: 300,
      w: 3,
      h: 620,
      fill: { hex: "FFFFFF", alpha: 0.3 } as DomShape["fill"],
    });
    expect(keepBackgroundPaintOnPlate([spine], SPACE)).toHaveLength(1);
  });

  it("keeps an opaque tall card native", () => {
    const card = box({
      x: 820,
      y: 140,
      w: 160,
      h: 700,
      fill: { hex: "112233", alpha: 1 } as DomShape["fill"],
    });
    expect(keepBackgroundPaintOnPlate([card], SPACE)).toHaveLength(1);
  });
});
