import { describe, expect, it } from "vitest";

import {
  CALIFORNIA_KIOSKS,
  CALIFORNIA_KIOSK_BLEED_MM,
  CALIFORNIA_KIOSK_FRONT_TRIM,
  CALIFORNIA_KIOSK_RETURN_TRIM,
  CALIFORNIA_KIOSK_SCREEN_MM,
  californiaKioskSourceBoothId,
  londonWallCropIntoKiosk,
} from "@/lib/next-california-kiosks";
import { nativeBoothTemplate } from "@/lib/next-london-booth-native";
import { LONDON_BOOTHS } from "@/lib/next-london-booths";
import {
  CALIFORNIA_KIOSK_PANELS,
  LONDON_PANELS,
  isBoothPanel,
  londonBoothPanelMeta,
  londonBoothScreenRect,
} from "@/lib/next-london-signage";

import { CALIFORNIA_KIOSK_FINALS } from "@/lib/next-california-kiosk-finals";

describe("California TV kiosks", () => {
  it("carries the 14 London finals, Trial Interactive stays native", () => {
    expect(Object.keys(CALIFORNIA_KIOSK_FINALS)).toHaveLength(14);
    expect(CALIFORNIA_KIOSK_FINALS["ti-tradebooth-a"]).toBeUndefined();
  });

  it("re-lays every current partner booth as three kiosk faces", () => {
    expect(CALIFORNIA_KIOSKS).toHaveLength(LONDON_BOOTHS.length);
    expect(CALIFORNIA_KIOSK_PANELS).toHaveLength(LONDON_BOOTHS.length * 3);
    for (const kiosk of CALIFORNIA_KIOSKS) {
      expect(californiaKioskSourceBoothId(kiosk.id)).toBeTruthy();
      // Partners with a London final carry the re-laid final on every face;
      // the rest stay a native re-lay with no supplied ground.
      const src = californiaKioskSourceBoothId(kiosk.id)!;
      const hasFinal = src in CALIFORNIA_KIOSK_FINALS;
      expect(kiosk.artboards.every((a) => (a.previewUrl !== null) === hasFinal)).toBe(true);
      expect(kiosk.aiUrl !== null).toBe(hasFinal);
      if (hasFinal) expect(kiosk.sourceFile).toMatch(/^rdraft-sf-kiosk-/);
    }
  });

  it("uses the supplied trim sizes and 1/8 in bleed", () => {
    expect(CALIFORNIA_KIOSK_BLEED_MM).toBeCloseTo(3.175, 3);
    const front = CALIFORNIA_KIOSK_PANELS[0]!;
    expect(front.trimW).toBe(CALIFORNIA_KIOSK_FRONT_TRIM.w);
    expect(front.trimH).toBeCloseTo(CALIFORNIA_KIOSK_FRONT_TRIM.h, 3);
    expect(front.bleedW).toBeCloseTo(CALIFORNIA_KIOSK_FRONT_TRIM.w + 3.175 * 2, 2);
    const returnFace = CALIFORNIA_KIOSK_PANELS[1]!;
    expect(returnFace.trimW).toBeCloseTo(CALIFORNIA_KIOSK_RETURN_TRIM.w, 3);
  });

  it("keeps the monitor aperture on the front face only", () => {
    const front = CALIFORNIA_KIOSK_PANELS[0]!;
    const rect = londonBoothScreenRect(front);
    expect(rect).not.toBeNull();
    expect(rect!.w).toBeCloseTo(CALIFORNIA_KIOSK_SCREEN_MM.w, 1);
    expect(rect!.h).toBeCloseTo(CALIFORNIA_KIOSK_SCREEN_MM.h, 1);
    expect(londonBoothScreenRect(CALIFORNIA_KIOSK_PANELS[1]!)).toBeNull();
    expect(londonBoothScreenRect(CALIFORNIA_KIOSK_PANELS[2]!)).toBeNull();
  });

  it("carries the partner's own copy over to the kiosk", () => {
    for (const kiosk of CALIFORNIA_KIOSKS) {
      const template = nativeBoothTemplate(kiosk.id);
      expect(template, kiosk.id).not.toBeNull();
      expect(template!.slug).toBe(californiaKioskSourceBoothId(kiosk.id));
    }
  });

  it("registers kiosk panels as booths without adding them to the London job", () => {
    for (const panel of CALIFORNIA_KIOSK_PANELS) {
      expect(isBoothPanel(panel)).toBe(true);
      expect(londonBoothPanelMeta(panel)).not.toBeNull();
      expect(LONDON_PANELS.some((p) => p.id === panel.id)).toBe(false);
    }
  });

  it("reports the crop a scaled London wall would suffer", () => {
    const crop = londonWallCropIntoKiosk();
    expect(crop.lostWidthPct).toBeGreaterThan(30);
    expect(crop.lostWidthPct).toBeLessThan(45);
  });
});
