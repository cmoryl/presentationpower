import { describe, expect, it } from "vitest";
import { SKIN_GEOMETRY, SHAPE_LABEL, SCAFFOLD_LABEL } from "../pack-geometry";

const rows = Object.entries(SKIN_GEOMETRY);

describe("catalog geometry is non-repeating", () => {
  it("covers S01–S28", () => {
    expect(rows).toHaveLength(28);
  });

  it("gives every skin its own card shape", () => {
    const shapes = rows.map(([, g]) => g.shape);
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("never repeats a scaffold + device signature", () => {
    const sigs = rows.map(([, g]) => `${g.scaffold}/${g.device}`);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("never repeats a full section-layout combination", () => {
    const combos = rows.map(
      ([, g]) => `${g.layout.cover}/${g.layout.stats}/${g.layout.grid}/${g.layout.rule}`,
    );
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("labels every shape and scaffold it uses", () => {
    for (const [, g] of rows) {
      expect(SHAPE_LABEL[g.shape]).toBeTruthy();
      expect(SCAFFOLD_LABEL[g.scaffold]).toBeTruthy();
      expect(g.fill).toBeGreaterThan(0);
      expect(g.fill).toBeLessThanOrEqual(1);
    }
  });
});
