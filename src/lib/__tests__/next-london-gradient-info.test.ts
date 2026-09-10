import { describe, expect, it } from "vitest";

import { LONDON_DIVISION_ACCENTS, isLondonDoorItem } from "@/lib/next-london-division";
import {
  londonAxisAngle,
  londonDivisionGrounds,
  londonGroundInfo,
  londonHouseGrounds,
  londonTintVariants,
} from "@/lib/next-london-gradient-info";
import { LONDON_PANELS, LONDON_STYLES } from "@/lib/next-london-signage";

const divisions = londonDivisionGrounds(LONDON_PANELS, (p) =>
  isLondonDoorItem(p.room, p.name),
);

describe("London gradient grounds reference", () => {
  it("lists the house treatments actually in use", () => {
    const house = londonHouseGrounds(LONDON_PANELS);
    expect(house.length).toBeGreaterThan(3);
    for (const g of house) {
      expect(g.kind).toBe("house");
      expect(LONDON_STYLES[g.styleId]).toBeDefined();
      expect(g.colors.length).toBeGreaterThanOrEqual(2);
      expect(g.panels.length).toBeGreaterThan(0);
    }
  });

  it("lists division-specific grounds with their accent and tint recipe", () => {
    expect(divisions.length).toBeGreaterThan(0);
    for (const g of divisions) {
      expect(g.kind).toBe("division");
      expect(g.accent).not.toBeNull();
      expect(Object.values(LONDON_DIVISION_ACCENTS).map((a) => a.hex)).toContain(g.accent!.hex);
      expect(g.tint).not.toBeNull();
      expect(g.tint!.weight).toBeGreaterThan(0);
    }
  });

  it("reports every stop with position, hex, rgb, hsl and luminance", () => {
    const g = londonGroundInfo("01-beam-violet-aqua", null, []);
    expect(g.colors.map((c) => c.hex)).toEqual(["#7C4EF4", "#8FA6FF", "#7FE3E8"]);
    expect(g.colors.map((c) => c.position)).toEqual([0, 50, 100]);
    expect(g.colors[0]!.rgb).toBe("rgb(124 78 244)");
    expect(g.colors[0]!.hsl).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
    expect(g.colors[2]!.luminance).toBeGreaterThan(g.colors[0]!.luminance);
    expect(g.css).toContain("#7C4EF4 0%");
  });

  it("keeps the dark head of a division ramp untouched", () => {
    const base = LONDON_STYLES["08-chevron-sweep"]!.stops;
    const g = londonGroundInfo("08-chevron-sweep", "lifesci", []);
    expect(g.colors[0]!.hex).toBe(base[0]!.toUpperCase());
    expect(g.colors[g.colors.length - 1]!.hex).not.toBe(base[base.length - 1]!.toUpperCase());
  });

  it("offers every approved tint strength for a division ground", () => {
    const g = londonGroundInfo("03-wash-diagonal", "globallink", []);
    const variants = londonTintVariants(g);
    expect(variants.length).toBeGreaterThanOrEqual(7);
    expect(new Set(variants.map((v) => v.css)).size).toBe(variants.length);
    expect(londonTintVariants(londonGroundInfo("03-wash-diagonal", null, []))).toEqual([]);
  });

  it("reports the gradient axis as a CSS angle", () => {
    expect(londonAxisAngle({ x1: 0, y1: 1, x2: 0, y2: 0 })).toBe(0);
    expect(londonAxisAngle({ x1: 0.5, y1: 0, x2: 0.5, y2: 1 })).toBe(180);
    expect(londonAxisAngle({ x1: 0, y1: 0, x2: 1, y2: 1 })).toBe(135);
  });
});
