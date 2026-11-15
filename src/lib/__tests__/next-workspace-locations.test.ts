import { describe, expect, it } from "vitest";
import { isNextLocationPage, nextWorkspaceLocations, nextWorkspacePageFor } from "../next-workspace";

describe("NEXT location navigation", () => {
  it("groups London and San Francisco pages under locations", () => {
    const locations = nextWorkspaceLocations();
    expect(locations.map((l) => l.group.id)).toEqual(["london", "san-francisco"]);
    expect(locations[0]?.pages.map((p) => p.to)).toContain("/events/next/london/booklet");
    expect(locations[1]?.pages.map((p) => p.to)).toContain("/events/next/california");
  });
  it("recognises city pages and venue records without moving shared signage", () => {
    for (const path of ["/events/next/locations", "/events/next/venues", "/events/next/london/maps", "/events/next/london/booklet", "/events/next/california"]) {
      expect(isNextLocationPage(nextWorkspacePageFor(path))).toBe(true);
    }
    expect(isNextLocationPage(nextWorkspacePageFor("/events/next/pillars"))).toBe(false);
  });
});