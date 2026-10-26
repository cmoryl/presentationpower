import { describe, expect, it } from "vitest";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { builtInEvent, readinessProgress } from "@/lib/event-registry";

describe("San Juan Bowl official announcement", () => {
  it("uses the announced inaugural date in the event directory", () => {
    expect(SJB_EVENT.datesLabel).toBe("December 16, 2026");
    expect(builtInEvent("san-juan-bowl")?.dates).toBe("December 16, 2026");
  });
  it("uses the announced Hiram Bithorn venue in San Juan", () => {
    expect(SJB_EVENT.venue).toBe("Hiram Bithorn Stadium");
    expect(SJB_EVENT.city).toBe("San Juan, Puerto Rico");
  });
  it("preserves the announcement's kickoff time zones", () => {
    expect(SJB_EVENT.kickoffLabel).toBe("7:30 p.m. ET / 6:30 p.m. CT");
  });
  it("names conferences rather than inventing participating teams", () => {
    expect(SJB_EVENT.matchupLabel).toBe("ACC vs. Sun Belt Conference");
  });
  it("marks venue and dates ready with the supplied official source", () => {
    const items = builtInEvent("san-juan-bowl")?.readiness ?? [];
    const facts = items.find((item) => item.label === "Venue and dates");
    expect(facts?.state).toBe("ready");
    expect(facts?.blockedOn).toBeUndefined();
    expect(facts?.source?.url).toBe("https://sunbeltsports.org/news/2026/10/22/football-sun-belt-conference-announces-historic-primary-agreement-with-transperfect-san-juan-bowl.aspx");
    expect(readinessProgress(items)).toEqual({ ready: 2, total: 4 });
  });
});