import { describe, expect, it } from "vitest";

import {
  AGENDA_DIVISIONS,
  AGENDA_EVENT_AREA_IDS,
  agendaDivision,
  agendaProgramme,
} from "@/lib/next-agenda";
import {
  INNOVATION_LOUNGE_PRODUCTS,
  innovationLoungeProduct,
} from "@/lib/next-innovation-lounge";
import { agendaHouseSlotReports } from "@/lib/next-agenda-house-times";

describe("Innovation Lounge agenda", () => {
  it("is offered as its own board, under the TransPerfect NEXT lockup", () => {
    const area = agendaDivision("innovation-lounge");
    expect(area.id).toBe("innovation-lounge");
    expect(area.name).toBe("Innovation Lounge");
    expect(area.reverseUrl || area.whiteUrl).toBeTruthy();
    expect(AGENDA_DIVISIONS.some((d) => d.id === "innovation-lounge")).toBe(true);
  });

  it("carries the issued two-day stage schedule", () => {
    const programme = agendaProgramme("innovation-lounge");
    expect(programme.days).toHaveLength(2);
    const [thu, fri] = programme.days!;
    expect(thu!.sessions[0]!.time).toBe("12:30-12:50 PM");
    expect(thu!.sessions[0]!.title).toBe("Media Creator");
    expect(thu!.sessions).toHaveLength(8);
    expect(fri!.sessions).toHaveLength(8);
    // Blackout and operations windows are kept, in the quieter weight.
    expect(thu!.sessions.filter((s) => s.muted)).toHaveLength(2);
    // Presenter choices are kept exactly as issued.
    expect(thu!.sessions[1]!.detail).toContain("Peter Cselenyi, Nate Fong, or Justyn Vasquez");
  });

  it("matches every demonstration to an approved write-up", () => {
    const programme = agendaProgramme("innovation-lounge");
    const scheduled = (programme.days ?? []).flatMap((d) => d.sessions).filter((s) => !s.muted);
    expect(scheduled.length).toBeGreaterThan(0);
    for (const s of scheduled) {
      expect(innovationLoungeProduct(s.title)).not.toBeNull();
    }
    expect(INNOVATION_LOUNGE_PRODUCTS).toHaveLength(5);
  });

  it("invents nothing for an unknown product", () => {
    expect(innovationLoungeProduct("Stage blackout")).toBeNull();
  });

  it("is left out of the cross-division shared-times comparison", () => {
    expect(AGENDA_EVENT_AREA_IDS).toContain("innovation-lounge");
    for (const r of agendaHouseSlotReports()) {
      const ids = [...r.agreeing, ...r.drifting].map((e) => e.divisionId);
      expect(ids).not.toContain("innovation-lounge");
      expect(r.missing.map((m) => m.divisionId)).not.toContain("innovation-lounge");
    }
  });
});
