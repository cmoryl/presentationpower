import { describe, expect, it } from "vitest";

import {
  londonRoomSchedule,
  londonRoomScheduleByFloor,
  londonSharedTimeSlots,
  roomSessionCount,
} from "@/lib/next-london-room-schedule";
import { LONDON_SPACE_USE } from "@/lib/next-london-space-use";

describe("London room schedule", () => {
  it("covers every recorded space and keeps the issued wording", () => {
    const rows = londonRoomSchedule();
    expect(rows).toHaveLength(LONDON_SPACE_USE.length);
    const westminster = rows.find((r) => r.space === "Westminster");
    expect(westminster?.event).toBe("GamesNEXT");
    expect(westminster?.divisionId).toBe("games");
    expect(roomSessionCount(westminster!)).toBeGreaterThan(0);
  });

  it("says plainly when a space has no programme on record", () => {
    const cafe = londonRoomSchedule().find((r) => r.space === "Foyer Café Space");
    expect(cafe?.days).toHaveLength(0);
    expect(cafe?.notes.join(" ")).toMatch(/no session programme/i);
  });

  it("groups spaces under their floor and finds simultaneous rooms", () => {
    const floors = londonRoomScheduleByFloor();
    expect(floors.some((f) => f.sheetId === "second")).toBe(true);
    expect(floors.every((f) => f.entries.length > 0)).toBe(true);

    const shared = londonSharedTimeSlots();
    expect(shared.length).toBeGreaterThan(0);
    for (const slot of shared) expect(slot.rooms.length).toBeGreaterThan(1);
  });
});
