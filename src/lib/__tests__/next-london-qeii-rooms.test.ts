import { describe, expect, it } from "vitest";

import {
  QEII_ROOM_PALETTE,
  qeiiColourByDivision,
  qeiiColourByFunction,
  qeiiColourKey,
  qeiiColourPaint,
  qeiiRoomShapes,
  qeiiRoomTextInk,
  qeiiSharedShapeNotes,
} from "@/lib/next-london-qeii-rooms";
import { qeiiPlanSvg, qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { EMPTY_QEII_MAP_EDITS, qeiiApplyRoomEdit, sanitizeQeiiMapEdits } from "@/lib/qeii-map-edits";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";

describe("QEII room colours", () => {
  it("finds the drawn shape each room name sits inside", () => {
    const floor = qeiiFloorVector("sixth")!;
    const rooms = qeiiRoomShapes(floor);
    expect(rooms.some((r) => r.room === "Mountbatten")).toBe(true);
  });

  it("fills a room drawn on its own and cuts one sharing a shape", () => {
    const floor = qeiiFloorVector("fourth")!;
    const paint = qeiiColourPaint(floor, { Westminster: "#FFEB66", Abbey: "#A1FBF9" });
    expect(paint.fills.size).toBe(1); // Westminster has its own shape
    // Abbey shares a block with Moore and Rutherford, but the issued walls close it,
    // so it is filled with its own cut outline rather than tagged.
    const abbey = paint.cells.find((c) => c.room === "Abbey");
    expect(abbey?.hex).toBe("#A1FBF9");
    expect(abbey?.d.length ?? 0).toBeGreaterThan(20);
    expect(paint.tags.get("Abbey")).toBeUndefined();
    expect(qeiiSharedShapeNotes(floor).some((n) => n.includes("Abbey"))).toBe(false);
  });

  it("keeps cut rooms as named live paths even before a colour is applied", () => {
    const floor = qeiiFloorVector("fourth")!;
    const paint = qeiiColourPaint(floor, {});
    expect(paint.cells.some((c) => c.room === "Abbey" && c.hex === undefined)).toBe(true);
    const svg = qeiiPlanSvg(floor, { showKey: false });
    expect(svg).toContain('data-room="Abbey"');
    expect(svg).toContain('id="room-abbey"');
  });

  it("closes longer issued wall runs without inventing a divider", () => {
    const floor = qeiiFloorVector("fourth")!;
    const rooms = qeiiRoomShapes(floor);
    expect(rooms.find((r) => r.room === "Moore")?.cell).toBeTruthy();
    expect(rooms.find((r) => r.room === "Rutherford")?.cell).toBeTruthy();
  });

  it("never paints a room the issued walls leave open", () => {
    const floor = qeiiFloorVector("third")!;
    const paint = qeiiColourPaint(floor, { Whittle: "#FFEB66" });
    // The third-floor hall is drawn as one space with no wall between the rooms.
    expect(paint.tags.get("Whittle")).toBe("#FFEB66");
    expect(paint.cells.some((c) => c.room === "Whittle")).toBe(false);
    expect(qeiiSharedShapeNotes(floor).some((n) => n.includes("Whittle"))).toBe(true);
  });


  it("offers approved colours only", () => {
    const approved = ["#003FC7", "#03002C", "#A1FBF9", "#C2A3FF", "#FFEB66", "#A6FA87", "#FF9B70", "#EC388A", "#E53D2E"];
    for (const swatch of QEII_ROOM_PALETTE) expect(approved).toContain(swatch.hex);
  });

  it("keeps room type readable over any fill", () => {
    expect(qeiiRoomTextInk("#FFEB66")).toBe("#03002C");
    expect(qeiiRoomTextInk("#003FC7")).toBe("#FFFFFF");
  });

  it("names a key row from the recorded function when every room shares one", () => {
    const floor = qeiiFloorVector("fourth")!;
    const colours = qeiiColourByFunction(floor);
    const key = qeiiColourKey(floor, colours);
    const plenary = key.find((r) => r.hex === "#003FC7");
    expect(plenary?.label).toBe("Plenary");
    expect(plenary?.rooms).toContain("Westminster");
  });

  it("prints the colours and the key into the editable download", () => {
    const floor = qeiiFloorVector("fourth")!;
    const svg = qeiiPlanSvg(floor, {
      roomColours: { Westminster: "#FFEB66" },
      keyLabels: { "#FFEB66": "Games track" },
    });
    expect(svg).toContain("#FFEB66");
    expect(svg).toContain("Games track");
  });
});

describe("division accent colouring", () => {
  it("fills each division's rooms with that division's approved accent", () => {
    const floor = qeiiFloorVector("fourth")!;
    const colours = qeiiColourByDivision(floor);
    const westminster = Object.entries(colours).find(([room]) => room.includes("Westminster"));
    expect(westminster).toBeTruthy();
    const games = NEXT_DIVISIONS.find((d) => d.id === "games")!.accent;
    expect(westminster![1]).toBe(games);
    // A house space with no division recorded is never given a colour.
    expect(colours["Courtyard"]).toBeUndefined();
  });
});

describe("hand-picked division logos", () => {
  it("prints the chosen lockups, or none, in place of the schedule's reading", () => {
    const floor = qeiiPlanState("fourth")!.floor;
    const issued = qeiiPlanLayout(floor, { showUse: true, showMarks: true });
    const abbey = issued.blocks.find((b) => b.room === "Abbey")!;
    expect(abbey.marks.map((m) => m.divisionId)).toEqual(["globallink"]);

    const swapped = qeiiPlanLayout(floor, {
      showUse: true,
      showMarks: true,
      edits: qeiiApplyRoomEdit(EMPTY_QEII_MAP_EDITS, "Abbey", { marks: ["legal"] }),
    });
    expect(
      swapped.blocks.find((b) => b.room === "Abbey")!.marks.map((m) => m.divisionId),
    ).toEqual(["legal"]);

    const none = qeiiPlanLayout(floor, {
      showUse: true,
      showMarks: true,
      edits: qeiiApplyRoomEdit(EMPTY_QEII_MAP_EDITS, "Abbey", { marks: [] }),
    });
    expect(none.blocks.find((b) => b.room === "Abbey")!.marks).toEqual([]);
  });

  it("drops an unapproved division id rather than drawing something else", () => {
    const edits = sanitizeQeiiMapEdits({ rooms: { abbey: { marks: ["learn", "not-a-division"] } } });
    expect(edits.rooms["abbey"]!.marks).toEqual(["learn"]);
  });
});
