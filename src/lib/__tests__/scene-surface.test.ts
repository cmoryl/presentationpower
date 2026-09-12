import { describe, expect, it } from "vitest";

import { LONDON_SCENES } from "@/lib/next-london-scenes";
import { sceneSurface, surfaceCastScale, surfaceFinishLabel } from "@/lib/scene-surface";

describe("scene surface finishes", () => {
  it("gives every scene in the library a substrate behaviour", () => {
    for (const scene of LONDON_SCENES) {
      const finish = sceneSurface(scene.kind, scene.mount);
      expect(finish.label.length).toBeGreaterThan(3);
      expect(finish.standoffMm).toBeGreaterThanOrEqual(0);
      expect(surfaceFinishLabel(finish)).toContain(finish.label);
    }
  });

  it("never casts a shadow from a print that lies on a horizontal surface", () => {
    for (const kind of ["floor", "table"] as const) {
      expect(surfaceCastScale(sceneSurface(kind))).toBe(0);
    }
  });

  it("keeps an applied film effectively flush and a standoff board proud", () => {
    expect(surfaceCastScale(sceneSurface("door"))).toBeLessThan(0.2);
    expect(surfaceCastScale(sceneSurface("lift"))).toBeLessThan(0.2);
    expect(surfaceCastScale(sceneSurface("wall"))).toBeGreaterThan(0.8);
    expect(surfaceCastScale(sceneSurface("portrait"))).toBeGreaterThan(0.8);
  });

  it("treats a full-bleed wall graphic as an applied film, not a hung board", () => {
    const covered = sceneSurface("wall", "cover");
    expect(covered.contact).toBe("applied");
    expect(surfaceCastScale(covered)).toBeLessThan(0.2);
    expect(sceneSurface("wall", "edge").contact).toBe("standoff");
  });

  it("only drapes textiles and only transmits through glazing", () => {
    expect(sceneSurface("portrait").drape).toBeGreaterThan(0.2);
    expect(sceneSurface("wall").drape).toBe(0);
    expect(sceneSurface("glass").transmit).toBeGreaterThan(0.1);
    expect(sceneSurface("door").transmit).toBe(0);
  });

  it("wears the surfaces that take traffic hardest", () => {
    expect(sceneSurface("floor").wear).toBeGreaterThan(sceneSurface("wall").wear);
    expect(sceneSurface("counter").wear).toBeGreaterThan(sceneSurface("portrait").wear);
  });
});
