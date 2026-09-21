import { describe, expect, it } from "vitest";

import {
  AGENDA_DIVISIONS,
  agendaBandPalette,
  agendaContrastRatio,
  agendaDivisionDayAccent,
} from "@/lib/next-agenda";
import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";

describe("division accents on agenda days and times", () => {
  it("gives each division its own day bar in its own accent", () => {
    for (const div of NEXT_DIVISIONS) {
      const p = agendaBandPalette({ bandTreatment: "lavender", divisionId: div.id });
      expect(p.dayBar).toBe(div.accent);
    }
  });

  it("puts an ink on the day bar that clears AA", () => {
    for (const div of NEXT_DIVISIONS) {
      const p = agendaBandPalette({ bandTreatment: "lavender", divisionId: div.id });
      expect(agendaContrastRatio(p.dayBarInk, p.dayBar)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("only takes the accent for the time rail where it reads on both band fills", () => {
    for (const div of AGENDA_DIVISIONS) {
      const p = agendaBandPalette({ bandTreatment: "lavender", divisionId: div.id });
      const accent = agendaDivisionDayAccent(div.id)!;
      if (p.rail === accent.hex) {
        expect(agendaContrastRatio(p.rail, p.fillA)).toBeGreaterThanOrEqual(3);
        expect(agendaContrastRatio(p.rail, p.fillB)).toBeGreaterThanOrEqual(3);
      } else {
        // Held back honestly rather than printed too faint to see.
        expect(p.rail).toBe("#003FC7");
      }
    }
  });

  it("leaves the ground, the band fills and the copy enterprise", () => {
    const house = agendaBandPalette({ bandTreatment: "lavender" });
    const legal = agendaBandPalette({ bandTreatment: "lavender", divisionId: "legal" });
    expect(legal.fillA).toBe(house.fillA);
    expect(legal.fillB).toBe(house.fillB);
    expect(legal.ink).toBe(house.ink);
    expect(legal.footerBand).toBe(house.footerBand);
  });

  it("gives the Innovation Lounge the master NEXT accent", () => {
    const master = NEXT_DIVISIONS.find((d) => d.id === "transperfect")!.accent;
    expect(agendaDivisionDayAccent("innovation-lounge")?.hex).toBe(master);
  });

  it("falls back to the house blue when no division is named", () => {
    expect(agendaDivisionDayAccent(undefined)).toBeNull();
    expect(agendaBandPalette({ bandTreatment: "lavender" }).dayBar).toBe("#003FC7");
  });
});
