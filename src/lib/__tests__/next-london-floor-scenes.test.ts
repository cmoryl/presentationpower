import { describe, expect, it } from "vitest";

import {
  LONDON_SCENES,
  isFloorScene,
  scenesForFloor,
  scenesForPanel,
} from "@/lib/next-london-scenes";
import { LONDON_FLOORS, LONDON_PANELS } from "@/lib/next-london-signage";
import { londonFloorPlan, londonZoneFor } from "@/lib/next-london-floorplan";

describe("floor render scenes", () => {
  it("gives every mapped floor its own plate", () => {
    for (const floor of LONDON_FLOORS) {
      if (!londonFloorPlan(floor.id)) continue;
      expect(scenesForFloor(floor.id).length, floor.id).toBeGreaterThan(0);
    }
  });

  it("keeps every face inside its plate", () => {
    for (const s of LONDON_SCENES) {
      expect(s.face.x).toBeGreaterThanOrEqual(0);
      expect(s.face.y).toBeGreaterThanOrEqual(0);
      expect(s.face.x + s.face.w).toBeLessThanOrEqual(1);
      expect(s.face.y + s.face.h).toBeLessThanOrEqual(1);
    }
  });

  it("never offers a floor plate from another floor first", () => {
    for (const panel of LONDON_PANELS) {
      const first = scenesForPanel(panel)[0]!;
      if (!isFloorScene(first)) continue;
      expect(first.floors, `${panel.id} → ${first.id}`).toContain(panel.floor);
    }
  });
});

describe("map areas", () => {
  it("places every scheduled item in a room area that names it", () => {
    const loose = LONDON_PANELS.filter((p) => {
      const plan = londonFloorPlan(p.floor);
      if (!plan) return false;
      const zone = londonZoneFor(plan, p);
      // Booth rooms read "<VENDOR> BOOTH" and land in the exhibition area.
      if (/booth/i.test(p.room)) return zone.kind !== "exhibition";
      const room = p.room.toUpperCase().replace(/[^A-Z& ]/g, " ").replace(/\s+/g, " ").trim();
      return !zone.rooms.some((r) => room.includes(r.toUpperCase()) || r.toUpperCase().includes(room));
    });
    expect(loose.map((p) => `${p.id} ${p.room}`)).toEqual([]);
  });
});
