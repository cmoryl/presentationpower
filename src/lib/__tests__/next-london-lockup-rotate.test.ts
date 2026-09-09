import { describe, expect, it } from "vitest";

import { londonBrandingPlan } from "@/lib/next-london-branding";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";
import { LONDON_PANELS } from "@/lib/next-london-signage";

// A tall, narrow sheet: the case the turned lockup exists for.
const flag = LONDON_PANELS.find((p) => p.trimH / p.trimW >= 2)!;

describe("turned lockup", () => {
  it("runs the long mark lengthwise and keeps it on the sheet", () => {
    const flat = londonBrandingPlan(flag, { ...DEFAULT_LOGO_PLACEMENT, lockupShape: "side" });
    const turned = londonBrandingPlan(flag, {
      ...DEFAULT_LOGO_PLACEMENT,
      lockupShape: "side",
      lockupRotate: 90,
    });
    expect(flat.logoRotate).toBe(0);
    expect(turned.logoRotate).toBe(90);
    // Turned, the mark is budgeted against the tall edge, so it runs longer.
    expect(turned.logo.w).toBeGreaterThan(flat.logo.w);
    // Rotated footprint stays inside the bleed box.
    const cx = turned.logo.x + turned.logo.w / 2;
    const cy = turned.logo.y + turned.logo.h / 2;
    expect(cx - turned.logo.h / 2).toBeGreaterThanOrEqual(-0.01);
    expect(cx + turned.logo.h / 2).toBeLessThanOrEqual(flag.bleedW + 0.01);
    expect(cy - turned.logo.w / 2).toBeGreaterThanOrEqual(-0.01);
    expect(cy + turned.logo.w / 2).toBeLessThanOrEqual(flag.bleedH + 0.01);
  });

  it("writes the spin into the vector master as a live transform", () => {
    const svg = buildLondonPanelSvg(flag, {
      placement: { ...DEFAULT_LOGO_PLACEMENT, lockupShape: "side", lockupRotate: 270 },
    });
    expect(svg).toContain('data-rotate="270"');
    expect(svg).toMatch(/transform="rotate\(270 /);
    expect(svg).not.toContain("<image");
  });
});
