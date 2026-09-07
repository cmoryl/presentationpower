import { describe, expect, it } from "vitest";
import { NATIVE_BOOTH_TEMPLATES } from "@/lib/next-london-booth-native";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";
import { auditSvg, gateOnQa } from "@/lib/london-signage-qa";
import { LONDON_BOOTH_PANEL_META, LONDON_PANELS, londonBoothArtworkUrl } from "@/lib/next-london-signage";
describe("all native booths", () => {
  for (const t of NATIVE_BOOTH_TEMPLATES) {
    it(t.slug, () => {
      const panel = LONDON_PANELS.find((p) => LONDON_BOOTH_PANEL_META[p.id]?.booth.id === t.slug)!;
      expect(panel, t.slug).toBeTruthy();
      expect(londonBoothArtworkUrl(panel.id)).toBeNull();
      const plan = londonBrandingPlan(panel, DEFAULT_LOGO_PLACEMENT);
      expect(plan.copy).toBe(t.headline);
      expect(plan.sub).toBe(t.sub);
      expect(plan.bodyLines.length).toBeGreaterThan(0);
      const svg = buildLondonPanelSvg(panel);
      expect(svg).not.toContain("<image");
      expect(svg).not.toContain("<text");
      expect(svg).toContain("linearGradient");
      expect(() => gateOnQa(auditSvg(panel, svg))).not.toThrow();
    });
  }
});
