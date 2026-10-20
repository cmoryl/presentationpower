import { describe, expect, it } from "vitest";

import {
  EMPTY_QEII_MAP_EDITS,
  qeiiFloorMapEdits,
  qeiiApplyRoomEdit,
  qeiiClearRoomEdit,
  qeiiMapEditsEmpty,
  qeiiRoomOffset,
  sanitizeQeiiMapEdits,
} from "@/lib/qeii-map-edits";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";

describe("live map edits", () => {
  it("defaults San Francisco room names to stacked lines without changing saved choices", () => {
    const defaults = qeiiFloorMapEdits("san-francisco:level-3");
    expect(defaults.rooms['coat room']?.name).toBe("Coat\nRoom");
    expect(defaults.rooms['golden gate']?.name).toBe("Golden\nGate");
    expect(defaults.rooms['grand ballroom']?.name).toBe("Grand\nBallroom");
    const saved = sanitizeQeiiMapEdits({ rooms: { "Coat Room": { name: "Coat Room", scale: 0.7 } } });
    expect(qeiiFloorMapEdits("san-francisco:level-3", saved).rooms['coat room']?.name).toBe("Coat Room");
    expect(qeiiFloorMapEdits("ground").rooms).toEqual({});
  });

  it("turns the long Level 3 foyer name in the shared preview/export layout", () => {
    const floor = { id: "san-francisco:level-3", marker: "3", title: "Level 3", page: 1, kind: "vector" as const, w: 500, h: 300, shapes: [], labels: [{ text: "Grand Ballroom Foyer", x: 250, y: 150, size: 12 }] };
    expect(qeiiPlanLayout(floor).blocks[0]?.angle).toBe(90);
  });

  it("preserves label resizing and rotation through saved edits", () => {
    const edits = sanitizeQeiiMapEdits({ rooms: { "Telegraph Hill": { scale: 0.8, angle: 90 } } });
    expect(edits.rooms['telegraph hill']).toEqual({ scale: 0.8, angle: 90 });
  });

  it("constrains the complete rotated label after a nudge", () => {
    const floor = { id: "san-francisco:level-4", marker: "4", title: "Level 4", page: 1, kind: "vector" as const, w: 200, h: 150, shapes: [], labels: [{ text: "Telegraph Hill", x: 4, y: 75, size: 12 }] };
    const edits = sanitizeQeiiMapEdits({ rooms: { "Telegraph Hill": { scale: 0.8, angle: 90, dx: -400 } } });
    const block = qeiiPlanLayout(floor, { edits }).blocks[0];
    expect(block?.angle).toBe(90);
    expect(block?.box.x0).toBeGreaterThanOrEqual(2);
    expect(block?.box.x1).toBeLessThanOrEqual(198);
    expect(block?.box.y0).toBeGreaterThanOrEqual(2);
    expect(block?.box.y1).toBeLessThanOrEqual(148);
  });

  it("keeps only recognised corrections", () => {
    const edits = sanitizeQeiiMapEdits({
      rooms: { Brunel: { name: "War Room", use: "Registration", dx: 4, dy: -2, junk: 1 } },
      colours: { Brunel: "#e53d2e", Bad: "red" },
      keyLabels: { "#E53D2E": "Registration" },
      other: true,
    });
    expect(edits.rooms['brunel']).toEqual({ name: "War Room", use: "Registration", dx: 4, dy: -2 });
    expect(edits.colours).toEqual({ Brunel: "#E53D2E" });
    expect(edits.keyLabels).toEqual({ "#E53D2E": "Registration" });
    expect(qeiiMapEditsEmpty(EMPTY_QEII_MAP_EDITS)).toBe(true);
  });

  it("drops an edit that puts a room back as issued", () => {
    const one = qeiiApplyRoomEdit(EMPTY_QEII_MAP_EDITS, "Brunel", { name: "War Room" });
    expect(one.rooms['brunel']?.name).toBe("War Room");
    const back = qeiiApplyRoomEdit(one, "Brunel", { name: "Brunel" });
    expect(back.rooms['brunel']).toBeUndefined();
    expect(qeiiClearRoomEdit(one, "brunel ").rooms['brunel']).toBeUndefined();
  });

  it("renames, re-lines and moves a room on the plan without touching the geometry", () => {
    const floor = qeiiFloorVector("ground")!;
    const plain = qeiiPlanLayout(floor, { showUse: true });
    const target = plain.blocks.find((b) => b.room.toLowerCase().includes("brunel"));
    expect(target).toBeTruthy();
    const edits = qeiiApplyRoomEdit(EMPTY_QEII_MAP_EDITS, target!.room, {
      name: "War Room",
      use: "Crew only",
      dx: 6,
      dy: -4,
    });
    const edited = qeiiPlanLayout(floor, { showUse: true, edits });
    const block = edited.blocks.find((b) => b.room === target!.room)!;
    expect(block.lines).toEqual(["War Room"]);
    expect(block.use).toBe("Crew only");
    // The move is honoured, held inside the room it belongs to.
    expect(block.x - target!.x).toBeGreaterThan(0);
    expect(block.x - target!.x).toBeLessThanOrEqual(6);
    expect(Math.round(block.y - target!.y)).toBe(-4);

    expect(qeiiRoomOffset(edits, target!.room)).toEqual({ dx: 6, dy: -4 });
    // The issued artwork is untouched — same shapes, same count of names.
    expect(edited.blocks.length).toBe(plain.blocks.length);
  });
});

import { sanitizeQeiiMapEdits as sanitizeMultiline } from "@/lib/qeii-map-edits";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("multi-line map names", () => {
  i2("keeps up to three typed lines", () => {
    const out = sanitizeMultiline({ rooms: { "Grand Ballroom Foyer": { name: "Grand\nBallroom\nFoyer\nExtra" } } });
    e2(Object.values(out.rooms)[0]?.name).toBe("Grand\nBallroom\nFoyer");
  });
});
