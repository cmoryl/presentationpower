import { describe, expect, it } from "vitest";
import {
  agendaMergeSimultaneous,
  agendaParallelRoom,
  agendaSimultaneousGroups,
  agendaTimesOverlap,
} from "../next-agenda";

const row = (time: string, title: string, room = "") => ({
  time,
  title,
  detail: "",
  track: "",
  muted: false,
  room,
});

describe("simultaneous agenda sessions", () => {
  it("treats the same start time as simultaneous", () => {
    expect(agendaTimesOverlap("3:00 PM", "3:00 PM")).toBe(true);
    expect(agendaTimesOverlap("3:00-3:50 PM", "3:20-3:40 PM")).toBe(true);
  });

  it("does not treat back-to-back slots as simultaneous", () => {
    expect(agendaTimesOverlap("3:00-3:50 PM", "3:50-4:20 PM")).toBe(false);
    expect(agendaTimesOverlap("11:30 AM-1:30 PM", "2:00 PM")).toBe(false);
  });

  it("groups overlapping rows and folds them into one slot", () => {
    const sessions = [
      row("2:00 PM", "Opening"),
      row("3:00 PM", "Legal track", "ST JAMES"),
      row("3:00 PM", "Media track", "WESTMINSTER"),
    ];
    const groups = agendaSimultaneousGroups(sessions);
    expect(groups).toEqual([[1, 2]]);

    const merged = agendaMergeSimultaneous(sessions, groups[0]!);
    expect(merged.sessions).toHaveLength(2);
    expect(merged.merged).toBe(1);
    expect(merged.leftInPlace).toBe(0);
    const pars = merged.sessions[1]!.parallels ?? [];
    expect(pars).toHaveLength(1);
    expect(agendaParallelRoom(pars[0]!)).toBe("WESTMINSTER");
  });

  it("reports nothing to merge on a clean programme", () => {
    expect(agendaSimultaneousGroups([row("9:00 AM", "A"), row("10:00 AM", "B")])).toEqual([]);
  });
});
