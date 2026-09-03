import { describe, expect, it } from "vitest";
import { collapseMediaOverlays, isModuleFurniture, type DomShape } from "../export-dom-decompose";

function shape(p: Partial<DomShape>): DomShape {
  return {
    kind: "rect",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    radiusPx: 0,
    fill: null,
    gradient: null,
    line: null,
    shadow: null,
    rotationDeg: 0,
    name: "TP Shape",
    ...p,
  } as DomShape;
}

describe("isModuleFurniture", () => {
  it("recognises spines, connectors and ticks", () => {
    expect(isModuleFurniture(shape({ w: 900, h: 1 }))).toBe(true); // timeline spine
    expect(isModuleFurniture(shape({ w: 2, h: 60 }))).toBe(true); // milestone tick
    expect(isModuleFurniture(shape({ w: 240, h: 10 }))).toBe(true); // accent rule
  });

  it("does not treat cards or pictures as furniture", () => {
    expect(isModuleFurniture(shape({ w: 320, h: 180 }))).toBe(false);
    expect(isModuleFurniture(shape({ kind: "image", w: 900, h: 2, src: "x" }))).toBe(false);
  });
});

describe("collapseMediaOverlays keeps furniture editable", () => {
  const media = shape({
    kind: "image",
    x: 0,
    y: 0,
    w: 900,
    h: 500,
    src: "data:,x",
    name: "TP Image",
  });

  it("merges scrims but never the connector crossing the picture", () => {
    const scrimA = shape({ x: 0, y: 0, w: 900, h: 500, fill: { hex: "000000", alpha: 0.3 } });
    const scrimB = shape({ x: 0, y: 250, w: 900, h: 250, fill: { hex: "000000", alpha: 0.35 } });
    const spine = shape({
      x: 40,
      y: 300,
      w: 820,
      h: 2,
      fill: { hex: "003FC7", alpha: 0.5 },
      name: "TP Rule",
    });
    const out = collapseMediaOverlays([media, scrimA, scrimB, spine]);
    expect(out).toContain(media);
    expect(out).toContain(spine);
    expect(out).not.toContain(scrimA);
    expect(out).not.toContain(scrimB);
    expect(out.filter((s) => s.name.endsWith("overlay"))).toHaveLength(1);
  });
});
