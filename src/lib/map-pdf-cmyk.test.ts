import { describe, expect, it } from "vitest";
import { mapPrintBuild } from "@/lib/map-pdf-cmyk";

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

describe("map CMYK PDF builds", () => {
  it("uses the approved Blue 500 build verbatim", () => {
    expect(mapPrintBuild(...rgb("#003FC7"))).toEqual({ c: 1, m: 0.83, y: 0, k: 0.06 });
  });
  it("prints a 50% tint of an approved colour as half the same inks", () => {
    // halfway from Aqua #A1FBF9 to white
    const b = mapPrintBuild(...rgb("#D0FDFC"))!;
    expect(b.c).toBeCloseTo(0.165, 1);
    expect(b.m).toBe(0);
  });
  it("prints neutral grey walls on black only", () => {
    expect(mapPrintBuild(...rgb("#666666"))).toEqual({ c: 0, m: 0, y: 0, k: 0.6 });
  });
  it("refuses a colour with no signed-off build", () => {
    expect(mapPrintBuild(...rgb("#1B3E6F"))).toBeNull();
  });
});
