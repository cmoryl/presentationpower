// Logo aspect contract: an embedded client logo must land at its exact native
// ratio in the .pptx, never stretched to the placeholder box.
import { describe, expect, it } from "vitest";

import type { DomShape } from "../export-dom-decompose";
import { placeDomShapes } from "../export-dom-place";
import { PX_PER_IN as PX } from "../export-radius";

function imageShape(over: Partial<DomShape>): DomShape {
  return {
    kind: "image",
    x: 0,
    y: 0,
    w: 400,
    h: 200,
    radiusPx: 0,
    fill: null,
    gradient: null,
    line: null,
    shadow: null,
    src: "data:image/png;base64,AAAA",
    fit: "contain",
    rotationDeg: 0,
    name: "TP Client logo",
    ...over,
  } as DomShape;
}

function fakeSlide() {
  const images: Array<Record<string, unknown>> = [];
  return {
    images,
    addImage: (o: Record<string, unknown>) => images.push(o),
    addShape: () => {},
    addText: () => {},
  };
}

describe("client logo aspect ratio in PPTX exports", () => {
  it("centers a wide logo inside its box at the native ratio", () => {
    const slide = fakeSlide();
    // 600×120 artwork (5:1) inside a 400×200 px box (2:1).
    placeDomShapes(slide as never, [imageShape({ natW: 600, natH: 120 })]);
    const img = slide.images[0];
    const ratio = (img.w as number) / (img.h as number);
    expect(ratio).toBeCloseTo(5, 3);
    expect(img.w).toBeCloseTo(400 / PX, 4); // fits width
    // vertically centered inside the 200px box
    expect(img.y as number).toBeGreaterThan(0);
    expect(img.sizing).toBeUndefined();
  });

  it("centers a tall logo inside its box at the native ratio", () => {
    const slide = fakeSlide();
    placeDomShapes(slide as never, [imageShape({ natW: 100, natH: 400 })]);
    const img = slide.images[0];
    expect((img.w as number) / (img.h as number)).toBeCloseTo(0.25, 3);
    expect(img.h).toBeCloseTo(200 / PX, 4); // fits height
    expect(img.x as number).toBeGreaterThan(0);
  });

  it("keeps the full box for cover artwork", () => {
    const slide = fakeSlide();
    placeDomShapes(slide as never, [imageShape({ fit: "cover", natW: 600, natH: 120 })]);
    const img = slide.images[0];
    expect(img.w).toBeCloseTo(400 / PX, 4);
    expect(img.h).toBeCloseTo(200 / PX, 4);
  });

  it("falls back to the box when the artwork size is unknown", () => {
    const slide = fakeSlide();
    placeDomShapes(slide as never, [imageShape({})]);
    const img = slide.images[0];
    expect(img.w).toBeCloseTo(400 / PX, 4);
    expect(img.sizing).toBeDefined();
  });
});
