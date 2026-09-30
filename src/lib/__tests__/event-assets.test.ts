import { describe, expect, it } from "vitest";
import { agendaDaysFromSessions, assetGates, blankSession, cleanSessions, sessionFlags } from "@/lib/event-assets";

const s = (p: Partial<ReturnType<typeof blankSession>>) => ({ ...blankSession("Tuesday, October 27, 2026"), ...p });

describe("event assets", () => {
  it("flags blanks and titles missing from the source, never fills them", () => {
    const f = sessionFlags(s({ start: "1:00 PM", title: "Made up talk" }), "Opening Remarks 12:30 PM");
    expect(f).toContain("Room to be confirmed");
    expect(f.some((x) => x.includes("not found"))).toBe(true);
    expect(sessionFlags(s({ start: "12:30 PM", title: "Opening Remarks", room: "Ballroom" }), "12:30 PM Opening Remarks")).toEqual([]);
  });
  it("cleans imported rows to strings", () => {
    expect(cleanSessions([{ title: " A ", start: 9, kind: "break" }])[0]).toMatchObject({ title: "A", start: "9", kind: "break", room: "" });
  });
  it("groups same-start sessions into parallel cards and filters by division", () => {
    const days = agendaDaysFromSessions([
      s({ start: "1:50 PM", end: "2:15 PM", title: "A", speakers: "X, TP" }),
      s({ start: "1:50 PM", end: "2:45 PM", title: "B", room: "Room 2", division: "legal" }),
      s({ start: "3:00 PM", title: "C", division: "media" }),
      s({ day: "Wednesday", start: "9:00 AM", title: "D", kind: "break" }),
    ], "legal");
    expect(days).toHaveLength(2);
    expect(days[0]!.meta).toBe("TUESDAY, OCTOBER 27, 2026");
    expect(days[0]!.sessions).toHaveLength(1);
    expect(days[0]!.sessions[0]!.parallels?.[0]).toMatchObject({ title: "B", room: "Room 2", time: "1:50 PM-2:45 PM" });
    expect(days[1]!.sessions[0]!.muted).toBe(true);
  });
  it("status: pending until published, ready once sessions all have rooms", () => {
    expect(assetGates({ agenda: null, rooms: null, floors: 0 }).every((g) => g.gate === "pending")).toBe(true);
    const g = assetGates({ agenda: { version: 2, sessions: [s({ start: "1", title: "A", room: "R" })] }, rooms: { version: 1, rooms: [{ name: "R", level: "", capacity: "" }] }, floors: 2 });
    expect(g.every((x) => x.gate === "ready")).toBe(true);
    expect(assetGates({ agenda: { version: 1, sessions: [s({ start: "1", title: "A" })] }, rooms: null, floors: 0 }).find((x) => x.id === "agendas")!.gate).toBe("pending");
  });
});
