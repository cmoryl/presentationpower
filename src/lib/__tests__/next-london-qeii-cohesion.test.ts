import { describe, expect, it } from "vitest";

import {
  qeiiAllFloors,
  qeiiCohesionNotes,
  qeiiCohesionSummary,
  qeiiFloorProfile,
} from "@/lib/next-london-qeii-cohesion";

describe("QEII floor comparison", () => {
  it("offers every rebuilt floor for the side-by-side view", () => {
    const floors = qeiiAllFloors();
    expect(floors.length).toBeGreaterThanOrEqual(7);
    for (const floor of floors) {
      expect(floor.shapes.length).toBeGreaterThan(20);
      expect(floor.w).toBeGreaterThan(0);
      expect(floor.h).toBeGreaterThan(0);
    }
  });

  it("profiles a floor by how the issued artwork actually draws it", () => {
    const ground = qeiiAllFloors().find((f) => f.id === "ground")!;
    const profile = qeiiFloorProfile(ground);
    expect(profile.marker).toBe("G");
    expect(profile.dark + profile.light + profile.white).toBeCloseTo(1, 5);
    expect(profile.nameShare).toBeGreaterThan(0);
    expect(profile.traced).toBe(false);
  });

  it("names the traced floor and keeps the house norm out of the notes", () => {
    const notes = qeiiCohesionNotes();
    expect(notes.some((n) => n.floorId === "third" && n.note.includes("picture"))).toBe(true);
    // A note per floor would mean the set reads as all-different; it does not.
    expect(notes.filter((n) => n.kind === "differs").length).toBeLessThan(qeiiAllFloors().length);
    expect(qeiiCohesionSummary(notes)).toContain("difference");
  });
});
