import { describe, expect, it } from "vitest";

import { londonBrandingPlan } from "@/lib/next-london-branding";
import { DEFAULT_LOGO_PLACEMENT, setLondonLogoPlacement } from "@/lib/next-london-logo-placement";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const panel = LONDON_PANELS.find((p) => !p.id.startsWith("booth"))!;
const base = {
  ...DEFAULT_LOGO_PLACEMENT,
  qr: "https://example.com/agenda",
  qrCaption: "Scan for the agenda",
};

describe("London QR customization", () => {
  it("honours caption size, alignment and font weight", () => {
    const plan = londonBrandingPlan(panel, {
      ...base,
      qrCaptionSize: 40,
      qrCaptionAlign: "right",
      qrCaptionPad: 12,
    });
    expect(plan.qr).not.toBeNull();
    expect(plan.qr!.captionSizeMm).toBe(40);
    expect(plan.qr!.captionAnchor).toBe("end");
    expect(plan.qr!.captionPadMm).toBe(12);
    expect(plan.qr!.captionWeight).toBeGreaterThan(0);
  });

  it("drops the plate when transparent and inverts the inks", () => {
    const clear = londonBrandingPlan(panel, { ...base, qrTransparent: true });
    expect(clear.qr!.plate).toBe(false);
    const inverted = londonBrandingPlan(panel, { ...base, qrInvert: true });
    expect(inverted.qr!.plateInk).toBe("#03002C");
    expect(inverted.qr!.moduleInk).toBe("#FFFFFF");
  });

  it("scales quiet zone and plate radius from the code size", () => {
    const plan = londonBrandingPlan(panel, { ...base, qrQuiet: 0.1, qrRadius: 0.2 });
    expect(plan.qr!.padMm).toBeCloseTo(plan.qr!.size * 0.1, 6);
    expect(plan.qr!.radiusMm).toBeCloseTo(plan.qr!.size * 0.2, 6);
  });

  it("emits an editable QR group in the SVG master, with the plate under designer control", () => {
    setLondonLogoPlacement(panel.id, base);
    const withPlate = buildLondonPanelSvg(panel, { colorSpace: "rgb", vibrance: 1 });
    expect(withPlate).toContain('data-layer="qr"');
    expect(withPlate).toContain('data-qr-plate="on"');

    setLondonLogoPlacement(panel.id, { ...base, qrTransparent: true });
    const clear = buildLondonPanelSvg(panel, { colorSpace: "rgb", vibrance: 1 });
    expect(clear).toContain('data-qr-plate="off"');
  });
});
