import { describe, expect, it } from "vitest";

import {
  CELL,
  DIFF_H,
  DIFF_W,
  coverageFromMask,
  diffMask,
  isFullBleed,
  parseObjectRects,
  parseSlideSize,
  type ObjectRect,
} from "../layer-diff";

const EMU = 914400;

function slideXml(objects: Array<{ tag: "p:sp" | "p:pic"; x: number; y: number; w: number; h: number }>) {
  return objects
    .map(
      (o) =>
        `<${o.tag}><p:spPr><a:xfrm><a:off x="${Math.round(o.x * EMU)}" y="${Math.round(
          o.y * EMU,
        )}"/><a:ext cx="${Math.round(o.w * EMU)}" cy="${Math.round(
          o.h * EMU,
        )}"/></a:xfrm></p:spPr></${o.tag}>`,
    )
    .join("");
}

/** Mask with a filled rectangle in normalized coordinates. */
function maskWithRect(x: number, y: number, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(DIFF_W * DIFF_H);
  for (let py = Math.round(y * DIFF_H); py < Math.round((y + h) * DIFF_H); py += 1) {
    for (let px = Math.round(x * DIFF_W); px < Math.round((x + w) * DIFF_W); px += 1) {
      mask[py * DIFF_W + px] = 1;
    }
  }
  return mask;
}

describe("layer-diff geometry parsing", () => {
  it("falls back to a 10in 16:9 slide when sldSz is absent", () => {
    expect(parseSlideSize("<p:presentation/>")).toEqual({ cx: 10 * EMU, cy: 5.625 * EMU });
  });

  it("reads the declared slide size", () => {
    const size = parseSlideSize('<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>');
    expect(size).toEqual({ cx: 12192000, cy: 6858000 });
  });

  it("normalizes shape and picture rects against the slide box", () => {
    const xml = slideXml([
      { tag: "p:pic", x: 0, y: 0, w: 10, h: 5.625 },
      { tag: "p:sp", x: 5, y: 2.8125, w: 2.5, h: 1.40625 },
    ]);
    const rects = parseObjectRects(xml, { cx: 10 * EMU, cy: 5.625 * EMU });
    expect(rects.map((r) => r.kind).sort()).toEqual(["picture", "shape"]);
    const shape = rects.find((r) => r.kind === "shape")!;
    expect(shape.x).toBeCloseTo(0.5, 3);
    expect(shape.y).toBeCloseTo(0.5, 3);
    expect(shape.w).toBeCloseTo(0.25, 3);
  });

  it("recognizes the full-bleed plate", () => {
    const plate: ObjectRect = { kind: "picture", x: 0, y: 0, w: 1, h: 1 };
    const tile: ObjectRect = { kind: "shape", x: 0.1, y: 0.2, w: 0.3, h: 0.2 };
    expect(isFullBleed(plate)).toBe(true);
    expect(isFullBleed(tile)).toBe(false);
  });
});

describe("diffMask", () => {
  it("marks only pixels beyond the noise threshold", () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255, 10, 10, 10, 255]);
    const b = new Uint8ClampedArray([0, 0, 0, 255, 200, 200, 200, 255]);
    expect(Array.from(diffMask(a, b))).toEqual([0, 1]);
  });
});

describe("coverageFromMask", () => {
  const region = { x: 0.2, y: 0.3, w: 0.25, h: 0.2 };

  it("counts a designed region as covered when a native object overlaps it", () => {
    const mask = maskWithRect(region.x, region.y, region.w, region.h);
    const res = coverageFromMask(mask, [
      { kind: "picture", x: 0, y: 0, w: 1, h: 1 },
      { kind: "shape", ...region },
    ]);
    expect(res.contentCells).toBeGreaterThan(0);
    expect(res.uncoveredCells).toBe(0);
    expect(res.gapRatio).toBe(0);
  });

  it("flags a designed region that only the full-bleed plate covers", () => {
    const mask = maskWithRect(region.x, region.y, region.w, region.h);
    const res = coverageFromMask(mask, [{ kind: "picture", x: 0, y: 0, w: 1, h: 1 }]);
    expect(res.contentCells).toBeGreaterThan(0);
    expect(res.uncoveredCells).toBe(res.contentCells);
    expect(res.gapRatio).toBe(1);
  });

  it("ignores specks below the cell fill ratio", () => {
    const mask = new Uint8Array(DIFF_W * DIFF_H);
    mask[10 * DIFF_W + 10] = 1; // one pixel inside an 8x8 cell
    const res = coverageFromMask(mask, [], DIFF_W, DIFF_H, CELL);
    expect(res.contentCells).toBe(0);
    expect(res.gapRatio).toBe(0);
  });
});
