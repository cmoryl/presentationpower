// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { eventFloorId, importSvgFloor, parseTransform, transformPath } from "@/lib/venue-map-import";
import { qeiiColourPaint, qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
import { qeiiPlanSvg } from "@/lib/next-london-qeii-plan";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <style>.room{fill:#251b5b;stroke:#fff;stroke-width:2}</style>
  <g transform="translate(100 50)">
    <rect class="room" x="0" y="0" width="120" height="80"/>
    <rect class="room" x="140" y="0" width="100" height="80"/>
    <text x="60" y="44" font-size="10" text-anchor="middle">Ballroom A</text>
    <text x="190" y="44" font-size="10" text-anchor="middle">Ballroom B</text>
  </g>
  <image href="x.png" width="10" height="10"/>
</svg>`;

describe("venue floor import", () => {
  it("flattens transforms into absolute path data", () => {
    const m = parseTransform("translate(10 20) scale(2)");
    expect(transformPath("m 1 1 h 2 v 2 z", m).d).toBe("M 12 22 L 16 22 L 16 26 Z");
  });

  it("reads rooms and live names from a venue SVG", () => {
    const { floor, notes } = importSvgFloor(SVG, { id: eventFloorId("sf", "3"), marker: "3", title: "Third floor" });
    expect(floor.kind).toBe("vector");
    expect(floor.shapes).toHaveLength(2);
    expect(floor.labels.map((l) => l.text)).toEqual(["Ballroom A", "Ballroom B"]);
    expect(floor.shapes[0].d.startsWith("M 6 6")).toBe(true);
    expect(notes.some((n) => n.includes("picture"))).toBe(true);

    // The London engine matches names to rooms and colours them on this floor too.
    const rooms = qeiiRoomShapes(floor).map((r) => r.room).sort();
    expect(rooms).toEqual(["Ballroom A", "Ballroom B"]);
    const paint = qeiiColourPaint(floor, { "Ballroom A": "#003FC7" });
    expect([...paint.fills.values()]).toContain("#003FC7");
    expect(qeiiPlanSvg(floor, { roomColours: { "Ballroom A": "#003FC7" } })).toContain("#003FC7");
  });

  it("reports a picture-only file instead of faking a plan", () => {
    const { floor, notes } = importSvgFloor(
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="scan.jpg"/></svg>`,
      { id: "x:1", marker: "1", title: "One" },
    );
    expect(floor.kind).toBe("artwork");
    expect(notes[0]).toMatch(/picture/);
  });
});
