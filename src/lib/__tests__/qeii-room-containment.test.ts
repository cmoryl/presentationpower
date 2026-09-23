import { describe, expect, it } from "vitest";

import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiDefaultRoomColours, qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
import { qeiiInRing, qeiiRings } from "@/lib/next-london-qeii-geometry";

/**
 * Room colours must stay inside each room's own walls. Every coloured room gets
 * its own cut outline, and known hallway/corridor points must never be inside it.
 */
const OUTSIDE: Record<string, Record<string, [number, number][]>> = {
  ground: { Churchill: [[268, 335], [263, 72]] },
  fourth: { "St. James": [[78, 87]], Westminster: [[303, 56]], Wordsworth: [[400, 296]] },
};

const inCell = (d: string, x: number, y: number) =>
  qeiiRings(d).filter((r) => qeiiInRing(r, x, y)).length % 2 === 1;

describe("QEII room colours stay inside their rooms", () => {
  for (const id of ["ground", "second", "third", "fourth", "fifth", "sixth"]) {
    it(`${id}: every default-coloured room fills its own outline`, () => {
      const floor = qeiiPlanState(id)!.floor;
      const colours = qeiiDefaultRoomColours(floor);
      const rooms = qeiiRoomShapes(floor);
      for (const [room, hex] of Object.entries(colours)) {
        if (!hex || room.startsWith("gradient-to:")) continue;
        const entry = rooms.find((r) => r.room === room);
        if (!entry) continue;
        // A room whose label sits in open floor (no walls) is allowed to stay a tag.
        if (!entry.cell) continue;
        expect(inCell(entry.cell, entry.x, entry.y), `${room} holds its label`).toBe(true);
      }
      for (const [room, pts] of Object.entries(OUTSIDE[id] ?? {})) {
        const cell = rooms.find((r) => r.room === room)?.cell;
        expect(cell, `${room} has its own outline`).toBeTruthy();
        for (const [x, y] of pts)
          expect(inCell(cell!, x, y), `${room} colour leaks to ${x},${y}`).toBe(false);
      }
    });
  }
});
