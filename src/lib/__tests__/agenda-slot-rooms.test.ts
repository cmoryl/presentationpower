import { describe, expect, it } from "vitest";

import {
  AGENDA_ROOM_TBC,
  agendaParallelRoomLine,
  agendaSessionRoomLine,
} from "@/lib/next-agenda";
import { LONDON_2026_PROGRAMMES } from "@/lib/next-agenda-london-2026";

describe("rooms on simultaneous sessions", () => {
  it("names the room when one is recorded", () => {
    expect(agendaParallelRoomLine({ room: "MOORE" })).toBe("MOORE");
    expect(agendaSessionRoomLine({ room: "RUTHERFORD" }, true)).toBe("RUTHERFORD");
  });

  it("says the room is still to be confirmed rather than printing a nameless card", () => {
    expect(agendaParallelRoomLine({ room: "" })).toBe(AGENDA_ROOM_TBC);
    expect(agendaSessionRoomLine({ room: "" }, true)).toBe(AGENDA_ROOM_TBC);
  });

  it("leaves an ordinary single-track row without a room line", () => {
    expect(agendaSessionRoomLine({ room: "" }, false)).toBe("");
  });

  it("carries the issued Legal rooms as rooms, not bracketed titles", () => {
    const legal = LONDON_2026_PROGRAMMES["legal"];
    const rows = (legal?.days?.[0]?.sessions ?? legal?.sessions ?? []).filter(
      (s) => (s.parallels ?? []).length > 0,
    );
    const slot = rows.find((s) => s.time.startsWith("2:55"));
    expect(slot?.room).toBe("RUTHERFORD");
    expect(slot?.title).not.toContain("(");
    expect((slot?.parallels ?? []).map((p) => p.room)).toEqual(["MOORE", "WHITTLE"]);
  });
});

describe("normalising a board", () => {
  it("keeps the room on every simultaneous card", async () => {
    const { normalizeAgendaConfig, agendaDefault, agendaParallels } = await import(
      "@/lib/next-agenda"
    );
    const cfg = normalizeAgendaConfig({
      ...agendaDefault("legal"),
      sessions: [
        {
          time: "3:00 PM",
          title: "Slot",
          detail: "",
          track: "",
          muted: false,
          room: "RUTHERFORD",
          parallels: [{ time: "3:00 PM", title: "Track B", detail: "", room: "MOORE" }],
        },
      ],
    } as never);
    expect(agendaParallels(cfg.sessions[0]!)[0]!.room).toBe("MOORE");
    expect(cfg.sessions[0]!.room).toBe("RUTHERFORD");
  });
});
