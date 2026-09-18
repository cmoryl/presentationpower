import { describe, it, expect } from "vitest";
import { agendaProgrammeIsStale, agendaDefault } from "@/lib/next-agenda";
describe("stale", () => {
  it("approved defaults are never stale", () => {
    for (const id of ["legal","media","globallink","life-sci","digital","finance","games","learn","experience","data-force"]) {
      expect(agendaProgrammeIsStale(agendaDefault(id)), id).toBe(false);
    }
  });
  it("an old programme is stale", () => {
    expect(agendaProgrammeIsStale({ divisionId: "legal", sessions: [{ time: "9", title: "Multilingual review workflows", detail: "", track: "", muted: false }] })).toBe(true);
  });
});
