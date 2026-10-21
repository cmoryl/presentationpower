import { describe, expect, it } from "vitest";
import { SJB_COMPONENTS, SJB_MEASUREMENTS, sjbProductionSize } from "./san-juan-logo-construction";

it("preserves every original path across the six source layers", () => {
  expect(SJB_COMPONENTS).toHaveLength(6);
  expect(SJB_COMPONENTS.reduce((sum,p) => sum+p.paths,0)).toBe(293);
  expect(SJB_COMPONENTS.map(p => p.order)).toEqual([1,2,3,4,5,6]);
});
it("scales from badge bounds rather than the square artboard", () => {
  // EPS master bounds (x 33.69895, w 1186.6021, h 1161.699), as issued for the brand kit.
  const size = sjbProductionSize(1186.6021);
  expect(size.height).toBeCloseTo(1161.699,6);
  expect(size.clearSpace).toBeCloseTo(171.7,8);
  expect(size.artboard).toBeCloseTo(1254,0);
  expect(SJB_MEASUREMENTS.bounds.x).toBeCloseTo(33.69895,6);
});
import { SJB_SCENE_ELEMENTS } from "./san-juan-logo-construction";
describe("scene elements", () => {
  it("cover all 109 scene shapes exactly once", () => {
    const all = SJB_SCENE_ELEMENTS.flatMap(e => [...e.paths]);
    expect(all.length).toBe(109);
    expect(new Set(all).size).toBe(109);
    expect(Math.min(...all)).toBe(34);
    expect(Math.max(...all)).toBe(142);
  });
});
