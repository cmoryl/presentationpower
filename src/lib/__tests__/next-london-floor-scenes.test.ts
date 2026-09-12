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

describe("purpose-built surface scenes", () => {
  const pick = (id: string) => {
    const panel = LONDON_PANELS.find((p) => p.id === id);
    expect(panel, id).toBeTruthy();
    return scenesForPanel(panel!)[0]!;
  };

  it("previews floor graphics on the floor, not a wall", () => {
    expect(pick("ldn-v03").kind).toBe("floor");
    expect(pick("ldn-s04").kind).toBe("floor");
  });

  it("previews lift wraps on lift doors", () => {
    expect(pick("ldn-v04").id).toBe("surface-lift-doors");
    expect(pick("ldn-v05").id).toBe("surface-lift-doors");
  });

  it("previews stair glazing on balustrade glass", () => {
    for (const id of ["ldn-v34", "ldn-v35", "ldn-v36"]) {
      expect(pick(id).id, id).toBe("surface-stair-glass");
    }
  });

  it("previews table tops on a table", () => {
    for (const id of ["ldn-v09", "ldn-v10", "ldn-v11", "ldn-v12"]) {
      expect(pick(id).id, id).toBe("surface-tabletop");
    }
  });

  it("keeps step-and-repeat walls on wall surfaces", () => {
    for (const id of ["ldn-v42", "ldn-v43", "ldn-v44", "ldn-v70", "ldn-v72"]) {
      expect(["wall", "exterior"], id).toContain(pick(id).kind);
    }
  });

  it("never offers a specialised surface first to an ordinary wall panel", () => {
    const wall = LONDON_PANELS.find((p) => p.id === "ldn-v42")!;
    expect(scenesForPanel(wall)[0]!.kind).not.toBe("table");
  });
});
