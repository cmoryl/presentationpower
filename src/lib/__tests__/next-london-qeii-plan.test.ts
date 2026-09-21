import { describe, expect, it } from "vitest";

import {
  QEII_PLAN_TOKENS,
  qeiiLabelTransform,
  qeiiPlanFilename,
  qeiiPlanInk,
  qeiiPlanState,
  qeiiPlanSvg,
} from "@/lib/next-london-qeii-plan";
import { QEII_FLOOR_VECTORS, qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";

describe("QEII native floor plans", () => {
  it("rebuilds every floor, including the one the design placed as a picture", () => {
    const vector = QEII_FLOOR_VECTORS.filter((f) => f.kind === "vector");
    expect(vector.length).toBe(QEII_FLOOR_VECTORS.length);
    for (const floor of vector) {
      expect(floor.shapes.length).toBeGreaterThan(80);
      expect(floor.w).toBeGreaterThan(100);
      expect(floor.h).toBeGreaterThan(100);
    }
  });

  it("rebuilds the 3rd floor as real geometry, not a picture", () => {
    const third = qeiiPlanState("third");
    expect(third?.rebuilt).toBe(true);
    expect(third?.reason).toBeUndefined();
    expect(qeiiFloorVector("third")!.shapes.length).toBeGreaterThan(80);
    expect(qeiiPlanState("ground")?.rebuilt).toBe(true);
  });

  it("keeps every floor id in step with the issued sheet list", () => {
    const sheetIds = new Set(LONDON_VENUE_SHEETS.map((s) => s.id));
    for (const floor of QEII_FLOOR_VECTORS) {
      expect(sheetIds.has(floor.id)).toBe(true);
    }
  });

  it("carries the issued room names, including the ones printed turned", () => {
    const ground = qeiiFloorVector("ground")!;
    const names = ground.labels.map((l) => l.text);
    expect(names).toContain("Churchill");
    expect(names).toContain("Sanctuary");
    const turned = ground.labels.find((l) => Math.abs(l.angle ?? 0) > 45);
    expect(turned?.text).toBe("ACCESS TO MEWS GOODS LIFT");
    expect(qeiiLabelTransform(turned!)).toContain("rotate(");
  });

  it("leaves the issued inks alone, and maps to approved colours on request", () => {
    expect(qeiiPlanInk("#2a2266", "issued")).toBe("#2a2266");
    expect(qeiiPlanInk("#2a2266", "element")).toBe(QEII_PLAN_TOKENS.ink);
    expect(qeiiPlanInk("#29abe2", "element")).toBe(QEII_PLAN_TOKENS.accent);
    expect(qeiiPlanInk("#ffffff", "element")).toBe(QEII_PLAN_TOKENS.white);
    expect(qeiiPlanInk(undefined, "element")).toBeUndefined();
  });

  it("writes a standalone SVG on a solid token ground, never imported artwork", () => {
    const floor = qeiiFloorVector("sixth")!;
    const svg = qeiiPlanSvg(floor, { face: "element", labelScale: 1.2 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`fill="${QEII_PLAN_TOKENS.surface}"`);
    expect(svg).not.toContain("<image");
    expect(svg).toContain("Mountbatten");
    expect(qeiiPlanFilename(floor, "element")).toBe(
      "TP-NEXT-2026-London-QEII-6th-Floor-element.svg",
    );
  });

  it("can leave the room names off without touching the geometry", () => {
    const floor = qeiiFloorVector("ground")!;
    const svg = qeiiPlanSvg(floor, { showLabels: false });
    expect(svg).not.toContain("<text");
    expect(svg).toContain("<path");
  });
});
