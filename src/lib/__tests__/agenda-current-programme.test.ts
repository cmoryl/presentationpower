import { describe, expect, it } from "vitest";

import {
  agendaDefault,
  agendaFileIsLive,
  agendaMissingApprovedSessions,
  agendaProgrammeIsCurrent,
} from "../next-agenda";

describe("approved agenda programme coverage", () => {
  it("accepts a board carrying the whole approved London programme", () => {
    for (const id of ["legal", "globallink", "media", "finance", "life-sci"]) {
      const config = agendaDefault(id);
      expect(agendaMissingApprovedSessions(config)).toEqual([]);
      expect(agendaProgrammeIsCurrent(config)).toBe(true);
    }
  });

  it("rejects a partial copy of the approved programme", () => {
    const config = agendaDefault("legal");
    const days = (config.days ?? []).map((d) => ({ ...d, sessions: d.sessions.slice(0, 2) }));
    const partial = { ...config, days, sessions: config.sessions.slice(0, 2) };
    expect(agendaProgrammeIsCurrent(partial)).toBe(false);
    expect(agendaMissingApprovedSessions(partial).length).toBeGreaterThan(0);
  });

  it("rejects a board built off an unrelated older programme", () => {
    const config = agendaDefault("legal");
    const older = {
      ...config,
      days: undefined,
      sessions: [
        { time: "09:00", title: "Old opening plenary", detail: "", track: "", muted: false },
        { time: "10:00", title: "Old client panel", detail: "", track: "", muted: false },
      ],
    };
    expect(agendaProgrammeIsCurrent(older)).toBe(false);
  });

  it("keeps an edited board live even when a session is renamed or dropped", () => {
    const config = agendaDefault("legal");
    const days = (config.days ?? []).map((d) => ({
      ...d,
      sessions: d.sessions
        .slice(0, Math.max(1, d.sessions.length - 1))
        .map((s, i) => (i === 0 ? { ...s, title: "Our own opening" } : s)),
    }));
    const edited = { ...config, days, sessions: days[0]?.sessions ?? config.sessions };
    expect(agendaProgrammeIsCurrent(edited)).toBe(false);
    expect(agendaFileIsLive(edited)).toBe(true);
  });

  it("withholds a board built off an unrelated older programme", () => {
    const config = agendaDefault("legal");
    const older = {
      ...config,
      days: undefined,
      sessions: [
        { time: "09:00", title: "Old opening plenary", detail: "", track: "", muted: false },
      ],
    };
    expect(agendaFileIsLive(older)).toBe(false);
  });
});
