import { describe, it, expect } from "vitest";
import { SJB_SEPARATIONS, SJB_SEPARATION_SOURCE, SJB_SEPARATION_PACK, SJB_SEPARATION_MASTER } from "../sjb-colour-separations";
import { SJB_COLORS } from "../san-juan-bowl";

const plate = (id: string) => SJB_SEPARATIONS.find((p) => p.id === id);

describe("San Juan Bowl colour separations", () => {
  it("splits the badge into the four supplied inks", () => {
    expect(SJB_SEPARATIONS.map((p) => p.id)).toEqual(["navy", "sky", "gold", "white"]);
  });

  it("keeps the shape count measured from the supplied master", () => {
    expect(plate("navy")?.shapes).toBe(58);
    expect(plate("sky")?.shapes).toBe(144);
    expect(plate("gold")?.shapes).toBe(8);
    expect(plate("white")?.shapes).toBe(50);
    expect(SJB_SEPARATIONS.reduce((n, p) => n + p.shapes, 0)).toBe(SJB_SEPARATION_SOURCE.keptShapes);
  });

  it("reads every ink code from the Bowl palette instead of retyping it", () => {
    for (const p of SJB_SEPARATIONS) {
      const color = SJB_COLORS.find((c) => c.id === p.id);
      expect(p.hex).toBe(color?.hex);
      expect(p.cmyk).toBe(color?.cmyk);
      expect(p.rgb).toBe(color?.rgb);
    }
  });

  it("shows white ink on the dark ground only", () => {
    expect(plate("white")?.ground).toBe("dark");
    expect(plate("navy")?.ground).toBe("light");
    expect(plate("sky")?.ground).toBe("light");
    expect(plate("gold")?.ground).toBe("light");
  });

  it("records the unpainted contours left out of the plates", () => {
    expect(SJB_SEPARATION_SOURCE.totalShapes).toBe(293);
    expect(SJB_SEPARATION_SOURCE.unpaintedShapes).toBe(33);
    expect(SJB_SEPARATION_SOURCE.totalShapes - SJB_SEPARATION_SOURCE.keptShapes).toBe(33);
  });

  it("serves the plate pack and the master reference", () => {
    expect(SJB_SEPARATION_PACK).toMatch(/^\/__l5e\/assets-v1\/.+\.(zip|ZIP)$/);
    expect(SJB_SEPARATION_MASTER).toMatch(/^\/__l5e\/assets-v1\/.+\.svg$/);
    for (const p of SJB_SEPARATIONS) {
      expect(p.svg).toMatch(/^\/__l5e\/assets-v1\/.+\.svg$/);
      expect(p.png).toMatch(/^\/__l5e\/assets-v1\/.+\.png$/);
    }
  });
});
