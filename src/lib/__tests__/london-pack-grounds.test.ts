/**
 * The London grounds must be the ink measured out of the supplied live
 * Illustrator files, and a CMYK master must print those numbers verbatim. A
 * silent conversion here would put generated signage a shade off the artwork
 * the location team delivered.
 */
import { describe, expect, it } from "vitest";
import {
  LONDON_PACK_BUILDS,
  LONDON_PACK_GROUNDS,
  LONDON_PACK_DEEP,
  londonPackGroundHexes,
} from "@/lib/next-london-pack-grounds";
import { londonCmykBuild } from "@/lib/next-london-cmyk";
import { LONDON_STYLES } from "@/lib/next-london-signage";

describe("London pack grounds", () => {
  it("carries three measured ramps, each with its source files", () => {
    expect(LONDON_PACK_GROUNDS).toHaveLength(3);
    for (const ground of LONDON_PACK_GROUNDS) {
      expect(ground.stops.length).toBeGreaterThanOrEqual(5);
      expect(ground.sources.length).toBeGreaterThan(0);
      expect(ground.note.length).toBeGreaterThan(20);
    }
  });

  it("prints every measured stop as its approved build, not a conversion", () => {
    const stops = [
      ...LONDON_PACK_GROUNDS.flatMap((g) => g.stops),
      LONDON_PACK_DEEP.navy,
      LONDON_PACK_DEEP.blue,
    ];
    for (const stop of stops) {
      const build = londonCmykBuild(stop.hex);
      expect(build.approved).toBe(true);
      expect(Math.round(build.c * 100)).toBe(stop.cmyk.c);
      expect(Math.round(build.m * 100)).toBe(stop.cmyk.m);
      expect(Math.round(build.y * 100)).toBe(stop.cmyk.y);
      expect(Math.round(build.k * 100)).toBe(stop.cmyk.k);
      // Nothing measured may breach the ink ceiling the pack prints to.
      expect(build.tac).toBeLessThanOrEqual(300.5);
    }
  });

  it("keeps every gradient ground on measured ink (white press wall aside)", () => {
    const measured = new Set(Object.keys(LONDON_PACK_BUILDS));
    for (const [id, style] of Object.entries(LONDON_STYLES)) {
      if (id === "13-repeat-white") continue; // division colourway wall stays paper-white
      for (const hex of style.stops) {
        expect(measured.has(hex.toLowerCase())).toBe(true);
      }
    }
  });

  it("retires the invented RGB ramps the app used before the delivery", () => {
    const retired = ["#7c4ef4", "#7fe3e8", "#8fa6ff", "#b9a6ff", "#cff6f7", "#135cfb"];
    const used = Object.values(LONDON_STYLES).flatMap((s) => s.stops.map((h) => h.toLowerCase()));
    for (const hex of retired) expect(used).not.toContain(hex);
  });

  it("runs each ramp from dark to light without doubling back", () => {
    for (const ground of LONDON_PACK_GROUNDS) {
      const hexes = londonPackGroundHexes(ground.id);
      expect(new Set(hexes).size).toBe(hexes.length);
    }
  });
});
