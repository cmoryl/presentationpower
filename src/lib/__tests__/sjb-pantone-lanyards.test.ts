import { describe, expect, it } from "vitest";
import { SJB_COLORS, SJB_COLOR_NOTES } from "../san-juan-bowl";
import { SJB_SEPARATION_NOTES } from "../sjb-colour-separations";
import { SJB_LANYARD_COLOURWAYS, SJB_LANYARD_FILES } from "../sjb-lanyards";

const pms = (id: string) => SJB_COLORS.find((c) => c.id === id);
describe("Bowl Pantone references", () => {
  it("uses the supplied nearest coated matches", () => {
    expect(pms("navy")?.pantone).toBe("PANTONE 532 C");
    expect(pms("navy")?.pantoneAlternates).toEqual(["Black 6 C"]);
    expect(pms("sky")?.pantone).toBe("PANTONE 2995 C");
    expect(pms("gold")?.pantoneAlternates).toEqual(["108 C", "115 C"]);
    expect(pms("white")?.pantone).toBeNull();
  });
  it("drops the old vendor-matched note", () => {
    for (const n of [...SJB_COLOR_NOTES, ...SJB_SEPARATION_NOTES]) expect(n).not.toMatch(/matched by the print vendor/);
  });
});
describe("Bowl lanyards", () => {
  it("has five colourways and keeps red out of the Bowl palette", () => {
    expect(SJB_LANYARD_COLOURWAYS).toHaveLength(5);
    expect(SJB_COLORS.some((c) => String(c.hex) === "#E03C31")).toBe(false);
    expect(SJB_LANYARD_COLOURWAYS.find((w) => w.id === "red")?.material.hex).toBe("#E03C31");
  });
  it("has no print file until one is supplied", () => {
    expect(SJB_LANYARD_FILES.pdf).toBeUndefined();
  });
});
