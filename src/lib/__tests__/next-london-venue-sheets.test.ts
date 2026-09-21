import { describe, expect, it } from "vitest";

import {
  LONDON_VENUE_SHEETS,
  VENUE_SHEET_PDF,
  searchVenueRooms,
  venueRoomDirectory,
  venueSheet,
  venueSheetFilename,
} from "@/lib/next-london-venue-sheets";

describe("London venue floor sheets", () => {
  it("carries every issued page once, in page order", () => {
    expect(LONDON_VENUE_SHEETS.length).toBe(VENUE_SHEET_PDF.pages);
    expect(LONDON_VENUE_SHEETS.map((s) => s.page)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(LONDON_VENUE_SHEETS.map((s) => s.id)).size).toBe(LONDON_VENUE_SHEETS.length);
  });

  it("points every sheet at real artwork with a real size", () => {
    for (const s of LONDON_VENUE_SHEETS) {
      expect(s.url, s.id).toMatch(/^\/__l5e\/assets-v1\//);
      expect(s.w).toBeGreaterThan(400);
      expect(s.h).toBeGreaterThan(400);
      expect(s.title.length).toBeGreaterThan(3);
    }
    expect(VENUE_SHEET_PDF.url).toMatch(/^\/__l5e\/assets-v1\//);
  });

  it("names the rooms printed on the sheets", () => {
    expect(venueSheet("ground")!.rooms).toContain("Churchill");
    expect(venueSheet("second")!.rooms).toEqual(
      expect.arrayContaining(["Victoria", "Albert"]),
    );
    expect(venueSheet("fourth")!.rooms).toContain("Westminster");
    expect(venueSheet("sixth")!.rooms).toEqual(["Mountbatten"]);
  });

  it("keeps the Mountbatten capacities as issued", () => {
    const sheet = venueSheet("sixth-mountbatten")!;
    expect(sheet.kind).toBe("room");
    expect(sheet.capacities).toEqual([
      { label: "Theatre", value: "410" },
      { label: "Dinners", value: "384" },
      { label: "Cabaret", value: "161" },
      { label: "Area m²", value: "351" },
    ]);
    expect(sheet.note).toContain("Houses of Parliament");
  });

  it("builds an alphabetical directory of floor spaces only", () => {
    const rows = venueRoomDirectory();
    const names = rows.map((r) => r.room);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(rows.some((r) => r.room === "Fleming" && r.marker === "3")).toBe(true);
    expect(rows.some((r) => r.sheetId === "sixth-mountbatten")).toBe(false);
  });

  it("finds a room by name or by floor", () => {
    expect(searchVenueRooms("fleming").map((r) => r.room)).toEqual(["Fleming"]);
    expect(searchVenueRooms("4th Floor").every((r) => r.marker === "4")).toBe(true);
    expect(searchVenueRooms("  ").length).toBe(venueRoomDirectory().length);
    expect(searchVenueRooms("no such room")).toEqual([]);
  });

  it("names downloads after the venue and the sheet", () => {
    expect(venueSheetFilename(venueSheet("ground")!)).toBe(
      "TP-NEXT-2026-London-QEII-ground-floor.png",
    );
  });
});
