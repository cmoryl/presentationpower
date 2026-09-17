import { describe, expect, it } from "vitest";
import { scoreSlideEditability } from "../export-editability";
import type { LayerObject, LayerReport } from "../layer-report";

function obj(p: Partial<LayerObject>): LayerObject {
  return {
    id: "1",
    name: "TP Shape",
    type: "shape",
    editable: true,
    layered: true,
    rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.2 },
    ...p,
  } as LayerObject;
}

function report(objects: LayerObject[]): LayerReport {
  const counts = {
    text: 0,
    image: 0,
    icon: 0,
    logo: 0,
    shape: 0,
    chart: 0,
    plate: 0,
  } as LayerReport["counts"];
  for (const o of objects) counts[o.type] += 1;
  return {
    objects,
    counts,
    layeredCount: objects.length,
    editableCount: objects.filter((o) => o.editable).length,
    flattened: objects.every((o) => o.type === "plate"),
    problems: [],
  };
}

const plate = obj({
  id: "p",
  name: "TP Design plate",
  type: "plate",
  editable: false,
  rect: { x: 0, y: 0, w: 1, h: 1 },
});

describe("scoreSlideEditability", () => {
  it("grades a plate-free slide native", () => {
    const s = scoreSlideEditability(
      report([obj({ type: "text" }), obj({ type: "icon" }), obj({})]),
    );
    expect(s.grade).toBe("native");
    expect(s.plates).toBe(0);
    expect(s.score).toBe(1);
    expect(s.issues).toEqual([]);
  });

  it("grades a plate with cards, icons and copy on top layered", () => {
    const s = scoreSlideEditability(
      report([plate, obj({ type: "text" }), obj({ type: "icon" }), obj({})]),
    );
    expect(s.grade).toBe("layered");
    expect(s.graphic).toBe(2);
    expect(s.score).toBeLessThan(1);
  });

  it("flags a plate carrying the graphic with only copy above it", () => {
    const s = scoreSlideEditability(report([plate, obj({ type: "text" })]));
    expect(s.grade).toBe("thin");
    expect(s.issues[0]).toMatch(/baked into the plate/);
  });

  it("flags a single flattened picture", () => {
    const s = scoreSlideEditability(report([plate]));
    expect(s.grade).toBe("flat");
    expect(s.score).toBe(0);
  });

  it("flags stacked plates", () => {
    const s = scoreSlideEditability(report([plate, { ...plate, id: "p2" }, obj({ type: "text" })]));
    expect(s.issues.some((i) => /plates stacked/.test(i))).toBe(true);
  });
});
