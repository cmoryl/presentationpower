import { describe, expect, it } from "vitest";

import {
  CARRIED_FROM_LONDON_CAVEAT,
  londonVenuePlan,
  planCaveat,
  scrubCarriedProvenance,
  venuePlanFromLondon,
} from "../venue-plan";

describe("venue provenance never carries to another city", () => {
  it("strips London's traced-from line and caveat when saved under another slug", () => {
    const typedOver = { ...londonVenuePlan(), slug: "chicago2027", name: "NEXT 2027 Chicago", city: "Chicago" };
    const clean = scrubCarriedProvenance(typedOver);
    expect(clean.surveySource).toBe("");
    expect(clean.surveyed).toBe(false);
    expect(clean.surveyDate).toBeNull();
    expect(clean.caveat).toBe(CARRIED_FROM_LONDON_CAVEAT);
    expect(planCaveat(clean)).toContain("NOT TO SCALE");
  });

  it("leaves London's own record alone", () => {
    const london = londonVenuePlan();
    expect(scrubCarriedProvenance(london)).toEqual(london);
  });

  it("keeps a venue's own stated provenance", () => {
    const own = {
      ...venuePlanFromLondon("berlin2028", "NEXT 2028 Berlin"),
      surveyed: true,
      surveySource: "Messe Berlin CAD, hall 4",
      surveyDate: "2028-01-12",
      caveat: "Truss positions confirmed on site.",
    };
    expect(scrubCarriedProvenance(own)).toEqual(own);
  });
});
