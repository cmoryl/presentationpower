import { describe, expect, it } from "vitest";
import { SJB_FAN_TIMELINE, SJB_GAME_SCHEDULE } from "./sjb-game-day";

describe("Bowl schedule timing rules", () => {
  it("uses the announced 8:30 p.m. San Juan kickoff in both timelines", () => {
    for (const entries of [SJB_GAME_SCHEDULE, SJB_FAN_TIMELINE]) {
      expect(entries.find((entry) => entry.id === "kickoff")?.timing).toBe("8:30 p.m. AST · San Juan time");
    }
  });
  it("keeps arrival and pre-game times unconfirmed", () => {
    for (const id of ["arrival", "pregame"]) {
      expect(SJB_FAN_TIMELINE.find((entry) => entry.id === id)?.status).toBe("tbc");
      expect(SJB_FAN_TIMELINE.find((entry) => entry.id === id)?.timing).toBe("Time TBC");
    }
  });
  it("does not assign a clock time to halftime or game end", () => {
    for (const id of ["halftime", "end"]) {
      const entry = SJB_GAME_SCHEDULE.find((item) => item.id === id);
      expect(entry?.status).toBe("tbc");
      expect(entry?.timing).not.toMatch(/\d{1,2}:\d{2}/);
    }
  });
  it("keeps post-game after the final whistle without a clock time", () => {
    expect(SJB_FAN_TIMELINE.find((entry) => entry.id === "postgame")).toMatchObject({ status: "tbc", timing: "Time TBC · after the final whistle" });
  });
});