import { describe, expect, it } from "vitest";

import { chosenTemplate, copyChoices, fillSignFromEvent, roomSchedule, signFileBase, sizeMatches, templatesForSpot, type EventFacts, type SignSpot, type SignTemplate } from "@/lib/sign-set";

const tpl: SignTemplate = {
  id: "t1", name: "Room sign", kind: "room_sign", layout_id: "legalnext-stairs", w_in: 33.2, h_in: 8.1,
  edits: { texts: { t0: { size: 40 } } }, fields: { t0: "room_name", t1: "room_sessions", t2: "event_dates" }, status: "approved",
};
const spot: SignSpot = { id: "s1", label: "Sutter door", kind: "room_sign", floor_key: "level-5", room: "Sutter", w_in: 33.2, h_in: 8.1, sides: 1 };
const facts: EventFacts = {
  eventName: "NEXT 2026 San Francisco", dates: "October 27–28, 2026", venue: "InterContinental San Francisco", city: "San Francisco", mapUrl: "",
  rooms: [{ name: "Sutter", level: "5", capacity: "60" }],
  sessions: [
    { day: "Tue", start: "10:00 AM", end: "10:30 AM", title: "Opening", speakers: "", room: "Sutter", division: "", kind: "session" },
    { day: "Tue", start: "11:00 AM", end: "", title: "Elsewhere", speakers: "", room: "Nob", division: "", kind: "session" },
  ],
};

describe("sign set", () => {
  it("fills linked lines from published facts", () => {
    const f = fillSignFromEvent(tpl, spot, facts);
    expect(f.status).toBe("ready");
    expect(f.edits.texts?.t0).toMatchObject({ text: "Sutter", size: 40, hidden: false });
    expect(f.values.t1).toBe("10:00 AM–10:30 AM  Opening");
    expect(f.values.t2).toBe("October 27–28, 2026");
  });

  it("hides and flags missing facts instead of keeping old wording", () => {
    const f = fillSignFromEvent(tpl, spot, { ...facts, rooms: null, sessions: null });
    expect(f.status).toBe("needs_text");
    expect(f.edits.texts?.t0).toMatchObject({ text: "", hidden: true });
    expect(f.missing).toContain("No room list published");
    expect(f.missing).toContain("No agenda published");
  });

  it("flags a room that isn't on the published list", () => {
    const f = fillSignFromEvent(tpl, { ...spot, room: "Ballroom Z" }, facts);
    expect(f.missing.some((m) => m.includes("Ballroom Z"))).toBe(true);
  });

  it("needs measuring when the spot has no size, and never stretches to a different size", () => {
    expect(fillSignFromEvent(tpl, { ...spot, w_in: null }, facts).status).toBe("needs_measuring");
    expect(fillSignFromEvent(tpl, { ...spot, w_in: 40 }, facts).status).toBe("size_mismatch");
    expect(sizeMatches(tpl, { w_in: 33.4, h_in: 8.0 })).toBe(true);
    expect(sizeMatches(tpl, { w_in: 33.5, h_in: 8.1 })).toBe(false);
  });

  it("offers only approved templates that fit, same kind first", () => {
    const wall = { ...tpl, id: "t2", kind: "wall" as const };
    const draft = { ...tpl, id: "t3", status: "draft" as const };
    expect(templatesForSpot(spot, [wall, draft, tpl]).map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(chosenTemplate(spot, { room_sign: "t3" }, [draft])).toBeNull();
  });

  it("copies only approved template choices", () => {
    expect(copyChoices({ room_sign: "t1", wall: "gone" }, [tpl])).toEqual({ room_sign: "t1" });
  });

  it("groups a multi-day room schedule by day", () => {
    const s = roomSchedule("Sutter", [
      { ...facts.sessions![0]!, day: "Tue" },
      { ...facts.sessions![0]!, day: "Wed", title: "Day two" },
    ]);
    expect(s.split("\n")).toEqual(["Tue", "10:00 AM–10:30 AM  Opening", "Wed", "10:00 AM–10:30 AM  Day two"]);
  });

  it("names files as drafts", () => {
    expect(signFileBase("san-francisco", "Sutter door (L5)")).toBe("rdraft-san-francisco-sutter-door-l5");
  });
});
