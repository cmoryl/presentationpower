import { describe, expect, it } from "vitest";

import {
  ARROW_BLEED_IN,
  ARROW_FACES,
  ARROW_FLOOR_LISTING,
  ARROW_FOOT_LINE,
  NEXT_DIRECTIONAL_ARROW,
  arrowPrintedAreaSqFt,
} from "@/lib/next-directional-arrow";

describe("GlobalLinkNEXT 3D directional arrow", () => {
  it("carries the three supplied faces at their labelled trims", () => {
    expect(ARROW_FACES.map((f) => [f.page, f.trimWIn, f.trimHIn])).toEqual([
      [1, 36, 24],
      [2, 54, 72],
      [3, 24, 40.25],
    ]);
    for (const f of ARROW_FACES) {
      expect(f.bleedIn).toBe(ARROW_BLEED_IN);
      expect(f.proofUrl).toMatch(/^\/__l5e\/assets-v1\//);
      expect(f.sizeLabel).toContain('"');
    }
  });

  it("keeps the issued floor listing word for word", () => {
    expect(ARROW_FLOOR_LISTING.map((g) => g.floor)).toEqual([
      "THIRD FLOOR:",
      "FOURTH FLOOR:",
      "FIFTH FLOOR:",
    ]);
    expect(ARROW_FLOOR_LISTING[0]!.rooms).toEqual([
      "Registration",
      "Grand Ballroom",
      "NEXTMart",
      "Discovery Rooms",
      "Union Square",
      "Yerba Buena",
    ]);
    expect(ARROW_FLOOR_LISTING[2]!.rooms).toEqual(["Sutter"]);
    expect(ARROW_FOOT_LINE).toBe("BEYOND INTELLIGENCE");
  });

  it("publishes the live file and both example PDFs", () => {
    const f = NEXT_DIRECTIONAL_ARROW.files;
    expect(f.live.filename).toMatch(/\.ai$/);
    for (const entry of [f.live, f.facePdf, f.noGuidesPdf]) {
      expect(entry.url).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });

  it("reports the printed area across all three faces", () => {
    expect(arrowPrintedAreaSqFt()).toBeCloseTo(6 + 27 + 6.7, 1);
  });
});
