import { describe, expect, it } from "vitest";

import { londonBrandingPlan, wrapCopy } from "@/lib/next-london-branding";
import { NATIVE_BOOTH_TEMPLATES, nativeBoothTemplate } from "@/lib/next-london-booth-native";
import {
  buildLondonPanelAi,
  buildLondonPanelAiAsync,
  buildLondonPanelSvg,
  londonAiBytes,
} from "@/lib/next-london-revise";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";
import { auditSvg, gateOnQa } from "@/lib/london-signage-qa";
import {
  LONDON_BOOTH_PANEL_META,
  LONDON_PANELS,
  londonBoothArtworkUrl,
  type LondonPanel,
} from "@/lib/next-london-signage";

const template = NATIVE_BOOTH_TEMPLATES[0]!;

const panel: LondonPanel = LONDON_PANELS.find(
  (p) => LONDON_BOOTH_PANEL_META[p.id]?.booth.id === template.slug,
)!;

describe("native booth template", () => {
  it("resolves a panel for the pilot booth", () => {
    expect(panel).toBeTruthy();
    expect(nativeBoothTemplate(template.slug)).toBe(template);
  });

  it("carries no supplied artwork — the ground is the brand plate", () => {
    expect(londonBoothArtworkUrl(panel.id)).toBeNull();
    expect(panel.ground).toContain("Brand plate");
  });

  it("ships editable headline, subhead, body and logo slots", () => {
    const plan = londonBrandingPlan(panel, DEFAULT_LOGO_PLACEMENT);
    expect(plan.copy).toBe(template.headline);
    expect(plan.sub).toBe(template.sub);
    expect(plan.bodyLines.length).toBeGreaterThan(1);
    expect(plan.bodyLines.join(" ").replace(/\s+/g, " ")).toBe(
      template.body.replace(/\s+/g, " "),
    );
    expect(plan.lockupOn).toBe(true);
  });

  it("honours a typed override and an explicit empty slot", () => {
    const plan = londonBrandingPlan(panel, {
      ...DEFAULT_LOGO_PLACEMENT,
      text: "OUR OWN HEADLINE",
      body: "",
    });
    expect(plan.copy).toBe("OUR OWN HEADLINE");
    expect(plan.bodyLines).toEqual([]);
  });

  it("re-flows the body when the booth is re-issued at another stand size", () => {
    // Copy is measured from the trim box, so a narrower stand wraps into more
    // lines instead of running off the wall.
    const base = londonBrandingPlan(panel, DEFAULT_LOGO_PLACEMENT);
    const narrow = londonBrandingPlan(
      { ...panel, trimW: panel.trimW * 0.4, bleedW: panel.bleedW * 0.4 },
      DEFAULT_LOGO_PLACEMENT,
    );
    expect(narrow.bodyLines.length).toBeGreaterThan(base.bodyLines.length);
    expect(narrow.bodyMeasureMm).toBeLessThan(base.bodyMeasureMm);
  });

  it("wraps to the measure without breaking a word", () => {
    const lines = wrapCopy("alpha beta gamma delta", 40, 0, 200);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe("alpha beta gamma delta");
  });

  it("exports a vector svg master with the body as outlined paths", () => {
    const svg = buildLondonPanelSvg(panel);
    expect(svg).not.toContain("<image");
    expect(svg).toContain("linearGradient");
    expect(svg).toContain('data-layer="body"');
    expect(svg).not.toContain("<text");
    const qa = auditSvg(panel, svg);
    expect(() => gateOnQa(qa)).not.toThrow();
  });

  it("exports an Illustrator master with a live gradient and no raster", async () => {
    const ai = new TextDecoder("latin1").decode(await buildLondonPanelAiAsync(panel));
    expect(ai).toContain("/Sh0 sh");
    expect(ai).not.toContain("/Subtype /Image");
    expect(ai).not.toContain("/ImGround");
    expect(ai).toMatch(/\/ShadingType\s*[23]/);
    // Copy is outlined geometry, never a live /Font resource.
    expect(ai).not.toContain("/Font");
    expect(ai).toContain("/TPOutlined true");
    const sync = new TextDecoder("latin1").decode(londonAiBytes(buildLondonPanelAi(panel)));
    expect(sync).toContain("/Sh0 sh");
  });
});
