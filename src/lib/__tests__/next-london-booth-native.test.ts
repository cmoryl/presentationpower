// Supplied booth wall + EDITABLE COPY LAYER.
//
// The 15 partner booths ship the vendor's own Illustrator wall, and that wall
// stays the ground. What we own is the layer above it — headline, subhead, body
// and lockup — which is editable per booth, derived from the trim box (so a
// re-issue at another stand size re-lays it) and exported as outlined vector.
import { describe, expect, it } from "vitest";

import { londonBrandingPlan, wrapCopy } from "@/lib/next-london-branding";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";
import { auditSvg, gateOnQa } from "@/lib/london-signage-qa";
import {
  LONDON_BOOTH_PANELS,
  londonBoothArtworkUrl,
  londonBoothNativeTemplate,
} from "@/lib/next-london-signage";

const panel = LONDON_BOOTH_PANELS[0]!;

describe("booth wall with an editable copy layer", () => {
  it("keeps the vendor's supplied artwork as the ground", () => {
    expect(londonBoothArtworkUrl(panel.id)).toBeTruthy();
    expect(panel.ground).toBe("Supplied booth artwork");
    // A supplied wall is never treated as an app-built plate.
    expect(londonBoothNativeTemplate(panel.id)).toBeNull();
  });

  it("starts with no baked-on copy so the wall reads as delivered", () => {
    const plan = londonBrandingPlan(panel, DEFAULT_LOGO_PLACEMENT);
    expect(plan.bodyLines).toEqual([]);
  });

  it("accepts an editable headline, subhead and body on top", () => {
    const plan = londonBrandingPlan(panel, {
      ...DEFAULT_LOGO_PLACEMENT,
      text: "OUR OWN HEADLINE",
      sub: "SECOND LINE",
      body: "Translation, review and publication in one governed workflow for every market.",
    });
    expect(plan.copy).toBe("OUR OWN HEADLINE");
    expect(plan.sub).toBe("SECOND LINE");
    expect(plan.bodyLines.length).toBeGreaterThan(0);
  });

  it("re-flows the copy when the booth is re-issued at another stand size", () => {
    const place = {
      ...DEFAULT_LOGO_PLACEMENT,
      body: "Translation, review and publication in one governed workflow for every market.",
    };
    const base = londonBrandingPlan(panel, place);
    const narrow = londonBrandingPlan(
      { ...panel, trimW: panel.trimW * 0.4, bleedW: panel.bleedW * 0.4 },
      place,
    );
    expect(narrow.bodyLines.length).toBeGreaterThan(base.bodyLines.length);
    expect(narrow.bodyMeasureMm).toBeLessThan(base.bodyMeasureMm);
  });

  it("wraps to the measure without breaking a word", () => {
    const lines = wrapCopy("alpha beta gamma delta", 40, 0, 200);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe("alpha beta gamma delta");
  });

  it("exports the copy layer as outlined paths that pass the print gate", () => {
    const svg = buildLondonPanelSvg(panel);
    expect(svg).not.toContain("<text");
    expect(() => gateOnQa(auditSvg(panel, svg))).not.toThrow();
  });
});
