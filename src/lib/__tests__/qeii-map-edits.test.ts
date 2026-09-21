import { describe, expect, it } from "vitest";

import {
  EMPTY_QEII_MAP_EDITS,
  qeiiApplyRoomEdit,
  qeiiClearRoomEdit,
  qeiiMapEditsEmpty,
  qeiiRoomOffset,
  sanitizeQeiiMapEdits,
} from "@/lib/qeii-map-edits";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";

describe("live map edits", () => {
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
    expect(Math.round(block.x - target!.x)).toBe(6);
    expect(Math.round(block.y - target!.y)).toBe(-4);
    expect(qeiiRoomOffset(edits, target!.room)).toEqual({ dx: 6, dy: -4 });
    // The issued artwork is untouched — same shapes, same count of names.
    expect(edited.blocks.length).toBe(plain.blocks.length);
  });
});
