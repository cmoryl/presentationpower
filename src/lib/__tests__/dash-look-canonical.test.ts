import { describe, it, expect } from "vitest";
import { dashLook } from "@/lib/dash-look";
describe("gauge row canonical", () => {
  it("uses dial under approved brand system", () => {
    expect(dashLook(null, "MV-DASH-GAUGE-ROW").chart).toBe("dial");
    expect(dashLook(null, "MV-DASH-DONUT-TRIO").chart).toBe("ring");
  });
});
