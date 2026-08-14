import { describe, expect, it } from "vitest";
import {
  TOOLBAR_SCALE_STEPS,
  nextToolbarScale,
  normalizeToolbarScale,
} from "./use-toolbar-scale";

describe("toolbar scale setting", () => {
  it("reads the persisted string form back as a step", () => {
    expect(normalizeToolbarScale("1.3")).toBe(1.3);
    expect(normalizeToolbarScale(1.5)).toBe(1.5);
  });

  it("falls back to 100% for missing or corrupt values", () => {
    for (const bad of [null, undefined, "", "big", "9.5", 1.07, {}]) {
      expect(normalizeToolbarScale(bad)).toBe(1);
    }
  });

  it("cycles through every step and wraps back to 100%", () => {
    let v: number = 1;
    for (const step of TOOLBAR_SCALE_STEPS.slice(1)) {
      v = nextToolbarScale(v);
      expect(v).toBe(step);
    }
    expect(nextToolbarScale(v)).toBe(1);
  });

  it("offers a meaningful readability range without breaking the layout", () => {
    expect(TOOLBAR_SCALE_STEPS[0]).toBe(1);
    expect(TOOLBAR_SCALE_STEPS.at(-1)).toBe(1.5);
  });
});
