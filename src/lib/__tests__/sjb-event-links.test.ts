import { describe, expect, it } from "vitest";
import { builtInEvent, SJB_EVENT_AREAS } from "../event-registry";

describe("Bowl event isolation", () => {
  it("does not offer NEXT destinations in any Bowl home area", () => {
    const links = SJB_EVENT_AREAS.flatMap((area) => area.tools.map((tool) => tool.link.to));
    expect(links.filter((to) => to?.startsWith("/events/next"))).toEqual([]);
  });

  it("does not offer NEXT destinations in Bowl tabs or readiness links", () => {
    const bowl = builtInEvent("san-juan-bowl");
    expect(bowl).toBeDefined();
    const links = [
      ...(bowl?.tabs.flatMap((tab) => tab.tools.map((tool) => tool.link.to)) ?? []),
      ...(bowl?.readiness?.flatMap((item) => item.link ? [item.link.to] : []) ?? []),
    ];
    expect(links.filter((to) => to?.startsWith("/events/next"))).toEqual([]);
  });

  it("keeps unbuilt Bowl signs, badges and pillars unavailable", () => {
    expect(SJB_EVENT_AREAS.find((area) => area.id === "production")?.tools).toEqual([]);
    expect(builtInEvent("san-juan-bowl")?.tabs.find((tab) => tab.id === "badges")?.tools).toEqual([]);
    expect(builtInEvent("san-juan-bowl")?.tabs.find((tab) => tab.id === "signage")?.tools.map((tool) => tool.link.to)).toEqual([
      "/events/san-juan-bowl/billboards", "/share/san-juan-bowl/billboards",
    ]);
  });
});