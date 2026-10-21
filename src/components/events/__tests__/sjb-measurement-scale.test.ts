import { describe, expect, it } from "vitest";
import { scaleSjb } from "../SjbMeasurementSheets";

describe("San Juan Bowl measurement scale", () => {
  it("1 px is 0.0843 mm on a 100 mm-wide logo (sheet 9)", () => {
    expect(scaleSjb(1, 100)).toBeCloseTo(0.0843, 4);
  });
  it("full art width scales to the logo width", () => {
    expect(scaleSjb(1186.602, 2400)).toBeCloseTo(2400, 6);
  });
});
