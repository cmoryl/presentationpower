import { describe, expect, it } from "vitest";
import { auditDeckGeometry, geometryRepairWarnings } from "../canvas-repair-report";

describe("export geometry validation", () => {
  it("reports nothing for healthy geometry", () => {
    const report = auditDeckGeometry([
      { title: "A", canvasBlocks: [{ x: 100, y: 100, w: 800, h: 400 }] },
    ]);
    expect(report.repaired).toBe(false);
    expect(report.blocksChecked).toBe(1);
    expect(report.summary).toBeNull();
    expect(geometryRepairWarnings(report)).toEqual([]);
  });

  it("flags blocks measured on an unscaled stage", () => {
    const report = auditDeckGeometry([
      { title: "Cover", canvasBlocks: [{ x: 300, y: 300, w: 5760, h: 3240, id: "b1" }] },
      { title: "Ok", canvasBlocks: [{ x: 10, y: 10, w: 200, h: 100 }] },
    ]);
    expect(report.repaired).toBe(true);
    expect(report.blocksRepaired).toBe(1);
    expect(report.slidesAffected).toBe(1);
    expect(report.changes[0].to.w).toBeLessThan(1920);
    expect(geometryRepairWarnings(report).length).toBeGreaterThan(1);
  });
});
