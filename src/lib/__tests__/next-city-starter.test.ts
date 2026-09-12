import { describe, expect, it } from "vitest";

import { LONDON_PANELS } from "@/lib/next-london-signage";
import { NEXT_VENUE_TEMPLATES } from "@/lib/next-venue-templates";
import {
  DEFAULT_CITY_BRIEF,
  cityPrefix,
  cityStarter,
  cityStarterCsv,
} from "@/lib/next-city-starter";

const brief = { ...DEFAULT_CITY_BRIEF, city: "Singapore", venue: "Expo", dates: "12–13 May 2027" };

describe("next city starter", () => {
  it("covers every London family exactly once", () => {
    const starter = cityStarter(brief, LONDON_PANELS);
    expect(starter.items).toHaveLength(NEXT_VENUE_TEMPLATES.length);
    expect(new Set(starter.items.map((i) => i.family.id)).size).toBe(NEXT_VENUE_TEMPLATES.length);
    expect(new Set(starter.items.map((i) => i.ref)).size).toBe(starter.items.length);
  });

  it("carries sizes only from families London actually built", () => {
    const starter = cityStarter(brief, LONDON_PANELS);
    for (const item of starter.items) {
      if (item.sizeSource === "carried") {
        expect(item.trimW).toBeGreaterThan(0);
        expect(item.trimH).toBeGreaterThan(0);
        expect(item.sizeNote).toContain("Carried from the London build");
      } else {
        expect(item.trimW).toBeNull();
        expect(item.bleedEdge).toBeNull();
      }
    }
    // Every carried size traces to a real London trim on that family.
    const flag = starter.items.find((i) => i.family.id === "vt-exterior-flag")!;
    const londonFlags = LONDON_PANELS.filter((p) =>
      flag.family.londonPanels.includes(p.id),
    );
    expect(londonFlags.length).toBeGreaterThan(0);
    expect(flag.trimW).toBeGreaterThanOrEqual(Math.min(...londonFlags.map((p) => p.trimW)));
    expect(flag.trimW).toBeLessThanOrEqual(Math.max(...londonFlags.map((p) => p.trimW)));
  });

  it("invents nothing when the brief is empty", () => {
    const empty = cityStarter({ ...DEFAULT_CITY_BRIEF, floors: 0, breakoutRooms: 0 }, []);
    expect(empty.carried).toBe(0);
    expect(empty.gaps).toHaveLength(NEXT_VENUE_TEMPLATES.length);
    for (const item of empty.items) expect(item.qty).toBeGreaterThanOrEqual(1);
  });

  it("scales quantities with the venue", () => {
    const small = cityStarter({ ...brief, floors: 1, breakoutRooms: 2, lifts: 1 }, LONDON_PANELS);
    const big = cityStarter({ ...brief, floors: 6, breakoutRooms: 20, lifts: 4 }, LONDON_PANELS);
    expect(big.pieces).toBeGreaterThan(small.pieces);
  });

  it("makes a schedule prefix from any city name", () => {
    expect(cityPrefix("Singapore")).toBe("SIN");
    expect(cityPrefix("São Paulo")).toBe("SOP");
    expect(cityPrefix("")).toBe("NXT");
  });

  it("writes a CSV a printer can read, with the survey caveat", () => {
    const csv = cityStarterCsv(cityStarter(brief, LONDON_PANELS));
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Singapore");
    expect(csv).toContain("to be replaced by survey");
    expect(lines[2]!.split(",")[0]).toBe("Ref");
    // One row per family, plus two comment lines and a header.
    expect(lines).toHaveLength(NEXT_VENUE_TEMPLATES.length + 3);
  });
});
