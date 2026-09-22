import { describe, expect, it } from "vitest";

import { NEXT_CITY_SERIES } from "@/lib/next-event";
import { SF_READINESS, SF_READY, SF_VENUE, SF_WAITING, sfLocationStack } from "@/lib/next-sf-event";

describe("NEXT San Francisco", () => {
  it("carries the issued lines exactly", () => {
    expect(SF_VENUE.locationLine).toBe("SAN FRANCISCO | OCTOBER 27-28, 2026");
    expect(SF_VENUE.venue).toBe("InterContinental San Francisco");
    expect(SF_VENUE.startDate).toBe("2026-10-27");
    expect(SF_VENUE.endDate).toBe("2026-10-28");
    expect(sfLocationStack()).toEqual([
      "SAN FRANCISCO | OCTOBER 27-28, 2026",
      "INTERCONTINENTAL SAN FRANCISCO",
    ]);
  });

  it("states no address, plan or programme", () => {
    const blob = JSON.stringify(SF_READINESS);
    expect(blob).not.toMatch(/\b\d{2,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd)\b/i);
    expect(SF_WAITING.map((r) => r.id).sort()).toEqual(["floorplan", "survey"]);
    for (const item of SF_WAITING) expect(item.blockedOn).toBeTruthy();
  });

  it("every ready item points at a real surface", () => {
    expect(SF_READY.length).toBeGreaterThan(0);
    for (const item of SF_READY) expect(item.to).toMatch(/^\/events\/next\//);
  });

  it("is a confirmed City Series stop", () => {
    const stop = NEXT_CITY_SERIES.stops.find((s) => s.id === "san-francisco");
    expect(stop?.status).toBe("confirmed");
    expect(stop?.venue).toBe("InterContinental San Francisco");
  });
});
