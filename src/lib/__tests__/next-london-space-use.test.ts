import { describe, expect, it } from "vitest";

import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";
import {
  LONDON_SPACE_USE,
  spaceFunctionMissing,
  spaceUseLine,
  spaceUsesForRoom,
  spaceUsesOnFloor,
} from "@/lib/next-london-space-use";

describe("NEXT 2026 London event space use", () => {
  it("holds every space on the issued schedule", () => {
    expect(LONDON_SPACE_USE.length).toBe(24);
  });

  it("pins every space to a real floor sheet", () => {
    const ids = new Set(LONDON_VENUE_SHEETS.map((s) => s.id));
    for (const use of LONDON_SPACE_USE) {
      expect(ids.has(use.sheetId)).toBe(true);
      expect(use.event.length).toBeGreaterThan(0);
    }
  });

  it("names the rooms each entry covers, including shared rooms", () => {
    expect(spaceUsesForRoom("Olivier", "second")[0]?.event).toBe("MediaNEXT");
    expect(spaceUsesForRoom("Burton", "second")[0]?.event).toBe("MediaNEXT");
    const fleming = spaceUsesForRoom("Fleming", "third").map((u) => u.event);
    expect(fleming).toEqual(["GlobalLink NEXT", "TransPerfect NEXT"]);
  });

  it("writes one plain line per room, both uses where a room has two", () => {
    expect(spaceUseLine("Westminster", "fourth")).toBe("Plenary · GamesNEXT");
    expect(spaceUseLine("Whittle", "third")).toBe(
      "Plenary · LegalNEXT / Keynote Room · TransPerfect NEXT",
    );
    expect(spaceUseLine("Gielgud", "second")).toBe("DigitalNEXT");
    expect(spaceUseLine("Nightingale", "ground")).toBeUndefined();
  });

  it("keeps the blank functions blank instead of inventing one", () => {
    const gielgud = spaceUsesForRoom("Gielgud")[0]!;
    expect(spaceFunctionMissing(gielgud)).toBe(true);
    expect(spaceFunctionMissing(spaceUsesForRoom("Mountbatten")[0]!)).toBe(false);
  });

  it("lists a floor's spaces in the order the schedule gives them", () => {
    expect(spaceUsesOnFloor("fifth").map((u) => u.space)).toEqual([
      "Cambridge",
      "Darwin",
      "Hawking",
      "Windsor",
    ]);
    expect(spaceUsesOnFloor("sixth").map((u) => u.event)).toEqual(["LifeSciNEXT"]);
  });
});
