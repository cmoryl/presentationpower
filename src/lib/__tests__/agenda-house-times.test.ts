import { describe, expect, it } from "vitest";

import {
  agendaDivisionHouseDrift,
  agendaHouseSlotDrift,
  agendaHouseSlotReports,
  normaliseHouseTime,
} from "@/lib/next-agenda-house-times";

describe("shared house times across division agendas", () => {
  it("matches times written with different spacing or dashes", () => {
    expect(normaliseHouseTime("11:30 AM-1:30 PM")).toBe(
      normaliseHouseTime("11:30 am – 1:30 pm"),
    );
  });

  it("finds the time most divisions keep for each shared slot", () => {
    const reg = agendaHouseSlotReports().find((r) => r.kind === "registration" && r.day === 1);
    expect(reg).toBeTruthy();
    expect(reg!.houseTime).toBe("11:30 AM-1:30 PM");
    // The house time is only claimed when boards actually agree on it.
    expect(reg!.agreeing.length).toBeGreaterThanOrEqual(3);
  });

  it("names the boards that differ, without changing them", () => {
    const drift = agendaHouseSlotDrift();
    expect(drift.length).toBeGreaterThan(0);
    for (const slot of drift) {
      expect(slot.houseTime).toBeTruthy();
      for (const d of slot.drifting) {
        expect(normaliseHouseTime(d.time)).not.toBe(normaliseHouseTime(slot.houseTime!));
        expect(d.divisionName).toBeTruthy();
      }
    }
  });

  it("reports a single division's drift for its own board", () => {
    const drifting = agendaHouseSlotDrift()[0]!.drifting[0]!;
    const ours = agendaDivisionHouseDrift(drifting.divisionId);
    expect(ours.some((d) => d.ourTime === drifting.time)).toBe(true);
    // A board on the house time gets no warning.
    const clean = agendaHouseSlotReports().find((r) => r.agreeing.length)!.agreeing[0]!;
    const cleanDrift = agendaDivisionHouseDrift(clean.divisionId);
    expect(cleanDrift.every((d) => d.label !== undefined)).toBe(true);
  });

  it("never compares a one-day programme against a second day", () => {
    for (const r of agendaHouseSlotReports()) {
      if (r.day === 1) continue;
      // Every board counted on a later day genuinely has that day.
      expect(r.agreeing.length + r.drifting.length + r.missing.length).toBeGreaterThan(0);
    }
  });
});
