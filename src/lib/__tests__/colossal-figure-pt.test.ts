import { describe, it, expect } from "vitest";
import { colossalFigurePt } from "../export-card-furniture";

describe("colossalFigurePt", () => {
  it("caps short figures at the on-screen 520px (260pt) ceiling", () => {
    expect(colossalFigurePt("7", "", 20)).toBe(260);
  });
  it("shrinks long figures so they fit the column", () => {
    const col = 6.8;
    const pt = colossalFigurePt("1,240,000", "", col);
    expect(pt).toBeLessThan(260);
    expect(pt * 0.6 * 9).toBeLessThanOrEqual(col * 72 * 0.9);
  });
  it("is far larger than the old 56pt stat size for a typical figure", () => {
    expect(colossalFigurePt("42", "%", 6.8)).toBeGreaterThan(150);
  });
});
