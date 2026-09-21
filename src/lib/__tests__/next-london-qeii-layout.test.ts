import { describe, expect, it } from "vitest";

import {
  QEII_LABEL_MAX_SHARE,
  qeiiFontSize,
  qeiiLabelGroups,
  qeiiPlanLayout,
} from "@/lib/next-london-qeii-layout";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";

function boxesOverlap(a: any, b: any, pad = 0) {
  return a.x0 < b.x1 - pad && b.x0 < a.x1 - pad && a.y0 < b.y1 - pad && b.y0 < a.y1 - pad;
}

describe("QEII rebuilt plan layout", () => {
  it("sets every room name inside the plan and under the type ceiling", () => {
    for (const sheet of LONDON_VENUE_SHEETS) {
      const floor = qeiiFloorVector(sheet.id);
      if (!floor || floor.shapes.length < 20) continue;
      const { blocks } = qeiiPlanLayout(floor, { showUse: true, showMarks: true });
      for (const block of blocks) {
        expect(block.size).toBeLessThanOrEqual(floor.w * QEII_LABEL_MAX_SHARE + 0.01);
        expect(block.box.x0).toBeGreaterThanOrEqual(-0.01);
        expect(block.box.x1).toBeLessThanOrEqual(floor.w + 0.01);
        expect(block.box.y1).toBeLessThanOrEqual(floor.h + 0.01);
      }
    }
  });

  it("never lets two blocks sit on top of one another", () => {
    const floor = qeiiFloorVector("fourth")!;
    const { blocks } = qeiiPlanLayout(floor, { showUse: true, showMarks: true });
    for (let i = 0; i < blocks.length; i += 1) {
      for (let j = i + 1; j < blocks.length; j += 1) {
        expect(boxesOverlap(blocks[i]!.box, blocks[j]!.box, 0.01)).toBe(false);
      }
    }
  });

  it("rebuilds names the sheet prints on two lines", () => {
    const fifth = qeiiLabelGroups(qeiiFloorVector("fifth")!).map((g) =>
      g.labels.map((l) => l.text).join(" "),
    );
    expect(fifth.some((n) => n === "Berners- Lee")).toBe(true);
  });

  it("brings the issued cap height down to a readable em size", () => {
    const floor = qeiiFloorVector("fourth")!;
    const westminster = floor.labels.find((l) => l.text === "Westminster")!;
    expect(qeiiFontSize(westminster, floor)).toBeLessThan(westminster.size);
  });

  it("keeps a room name even when its event line will not fit", () => {
    const floor = qeiiFloorVector("fifth")!;
    const { blocks } = qeiiPlanLayout(floor, { showUse: true, showMarks: true });
    const hawking = blocks.find((b) => b.lines.join(" ") === "Hawking");
    expect(hawking).toBeDefined();
    expect(hawking!.lines).toEqual(["Hawking"]);
  });
});

describe("objects and rooms", () => {
  it("never prints a room block across a drawn object or outside the plan", () => {
    for (const floor of QEII_FLOOR_VECTORS.filter((f) => f.kind === "vector")) {
      const objects = qeiiObjectBoxes(floor.shapes, floor.w * floor.h);
      const { blocks } = qeiiPlanLayout(floor, { showUse: true, showMarks: true });
      for (const block of blocks) {
        expect(block.box.x0).toBeGreaterThanOrEqual(0);
        expect(block.box.x1).toBeLessThanOrEqual(floor.w);
        const hits = objects.filter(
          (o) =>
            !(block.x >= o.x0 && block.x <= o.x1 && block.y >= o.y0 && block.y <= o.y1) &&
            block.box.x0 < o.x1 &&
            o.x0 < block.box.x1 &&
            block.box.y0 < o.y1 &&
            o.y0 < block.box.y1,
        );
        expect(hits, `${floor.id} ${block.lines.join(" ")}`).toHaveLength(0);
      }
    }
  });
});
