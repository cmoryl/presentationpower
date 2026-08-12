import { describe, expect, it } from "vitest";
import {
  diffLayerTrees,
  diffSlideTree,
  snapshotFromReports,
  summarizeTreeDiff,
  type LayerTreeSnapshot,
} from "@/lib/layer-tree-diff";
import type { LayerObject, LayerReport } from "@/lib/layer-report";

function obj(over: Partial<LayerObject> & { name: string }): LayerObject {
  return {
    id: over.id ?? "1",
    name: over.name,
    type: over.type ?? "text",
    editable: over.editable ?? true,
    layered: over.layered ?? true,
    rect: over.rect ?? { x: 0.1, y: 0.1, w: 0.4, h: 0.1 },
    text: over.text,
    note: over.note,
  };
}

function report(objects: LayerObject[]): LayerReport {
  return {
    objects,
    counts: { text: 0, image: 0, icon: 0, logo: 0, shape: 0, plate: 0 },
    layeredCount: objects.filter((o) => o.layered).length,
    editableCount: objects.filter((o) => o.editable).length,
    flattened: objects.every((o) => o.type === "plate"),
    problems: [],
  };
}

const PLATE = obj({
  name: "TP Design plate",
  type: "plate",
  editable: false,
  rect: { x: 0, y: 0, w: 1, h: 1 },
});
const TITLE = obj({ name: "Title", text: "Platform architecture" });
const LOGO = obj({
  name: "TP Logo",
  type: "logo",
  rect: { x: 0.86, y: 0.08, w: 0.1, h: 0.02 },
});

function baseline(objects: LayerObject[]): LayerTreeSnapshot {
  return snapshotFromReports("MV-X@base@light", [report(objects)], "MV-X");
}

describe("layer-tree-diff", () => {
  it("reports an identical tree as unchanged", () => {
    const res = diffLayerTrees(baseline([PLATE, TITLE, LOGO]), [report([PLATE, TITLE, LOGO])]);
    expect(res.ok).toBe(true);
    expect(res.totals.unchanged).toBe(3);
    expect(res.totals.removed + res.totals.added + res.totals.changed).toBe(0);
    expect(summarizeTreeDiff(res)).toContain("no regressions");
  });

  it("names the exact element that disappeared", () => {
    const res = diffLayerTrees(baseline([PLATE, TITLE, LOGO]), [report([PLATE, TITLE])]);
    expect(res.ok).toBe(false);
    expect(res.regressions.join(" ")).toMatch(/Logo TP Logo/);
    expect(res.slides[0].objects[0].kind).toBe("removed");
  });

  it("flags an element that stopped being editable", () => {
    const res = diffLayerTrees(baseline([PLATE, TITLE]), [
      report([PLATE, { ...TITLE, editable: false }]),
    ]);
    expect(res.ok).toBe(false);
    expect(res.regressions.join(" ")).toMatch(/now exports as non-editable/);
    expect(res.slides[0].objects[0].changes.map((c) => c.field)).toContain("editable");
  });

  it("flags text collapsing into the design plate", () => {
    const res = diffLayerTrees(baseline([PLATE, TITLE, LOGO]), [
      report([
        PLATE,
        LOGO,
        { ...TITLE, type: "plate", editable: false, text: undefined, name: "TP Design plate" },
      ]),
    ]);
    expect(res.ok).toBe(false);
    // The lost copy is named explicitly rather than folded into a bare count.
    expect(res.regressions.join(" ")).toMatch(/Text "Platform architecture" — Text present/);
  });

  it("treats a fully flattened slide as a regression", () => {
    const res = diffLayerTrees(baseline([PLATE, TITLE, LOGO]), [report([PLATE])]);
    expect(res.ok).toBe(false);
    expect(res.slides[0].flattened).toBe(true);
    expect(res.regressions[0]).toMatch(/slide flattened/);
  });

  it("pairs a nudged element as changed rather than add + remove", () => {
    const moved = { ...TITLE, rect: { ...TITLE.rect, x: TITLE.rect.x + 0.05 } };
    const res = diffLayerTrees(baseline([PLATE, TITLE]), [report([PLATE, moved])]);
    expect(res.totals.removed).toBe(0);
    expect(res.totals.added).toBe(0);
    expect(res.slides[0].objects[0].severity).toBe("warning");
    expect(res.slides[0].objects[0].changes.map((c) => c.field)).toContain("rect");
    // A moved-but-still-editable element is a warning, not a hard regression.
    expect(res.ok).toBe(true);
  });

  it("ignores sub-pixel drift", () => {
    const nudged = { ...TITLE, rect: { ...TITLE.rect, y: TITLE.rect.y + 0.001 } };
    const diff = diffSlideTree([TITLE], [nudged], 0);
    expect(diff.objects[0].kind).toBe("unchanged");
  });

  it("reports a missing slide", () => {
    const snap = snapshotFromReports("k", [report([PLATE, TITLE]), report([PLATE, TITLE])]);
    const res = diffLayerTrees(snap, [report([PLATE, TITLE])]);
    expect(res.ok).toBe(false);
    expect(res.regressions.join(" ")).toMatch(/slide missing from this export/);
  });

  it("reports new objects as informational, not regressions", () => {
    const extra = obj({ name: "Caption", text: "New line", rect: { x: 0.1, y: 0.7, w: 0.3, h: 0.06 } });
    const res = diffLayerTrees(baseline([PLATE, TITLE]), [report([PLATE, TITLE, extra])]);
    expect(res.ok).toBe(true);
    expect(res.totals.added).toBe(1);
  });
});
