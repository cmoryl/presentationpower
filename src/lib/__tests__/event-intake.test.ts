import { describe, expect, it } from "vitest";
import { EVENT_INTAKE_ITEMS, eventSlug, summarizeIntake, venueResearchQueries } from "@/lib/event-intake";

describe("event intake", () => {
  it("blocks maps until every required item is received", () => {
    const none = summarizeIntake([]);
    expect(none.mapsReady).toBe(false);
    expect(none.blocking).toContain("Floor plans for every level");
    const all = summarizeIntake(
      EVENT_INTAKE_ITEMS.filter((i) => i.required).map((i) => ({ item_key: i.key, status: "received" as const })),
    );
    expect(all.mapsReady).toBe(true);
  });

  it("never counts found-online or picture scans as received", () => {
    const s = summarizeIntake([
      { item_key: "floor_plans", status: "scan" },
      { item_key: "room_list", status: "found_online" },
    ]);
    expect(s.blocking).toEqual(expect.arrayContaining(["Floor plans for every level", "Room list"]));
  });

  it("makes stable slugs and bounded queries", () => {
    expect(eventSlug("NEXT 2027", "San Francisco")).toBe("next-2027-san-francisco");
    expect(venueResearchQueries("InterContinental", "San Francisco")).toHaveLength(2);
  });
});
