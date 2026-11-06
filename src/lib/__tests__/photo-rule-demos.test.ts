import { describe, expect, it } from "vitest";
import { inferPhotoRuleDemo } from "@/lib/photo-rule-demos";
import {
  MASTER_TRANSPERFECT_GUIDE,
  BRAND_GUIDES,
} from "@/lib/brand-guides";

describe("inferPhotoRuleDemo", () => {
  it("maps every photography rule in every guide to a demo kind", () => {
    const guides = [MASTER_TRANSPERFECT_GUIDE, ...BRAND_GUIDES];
    for (const guide of guides) {
      const rules = guide.photographyRules;
      if (!rules) continue;
      for (const rule of [...rules.do, ...rules.dont]) {
        expect(inferPhotoRuleDemo(rule), `${guide.slug}: ${rule}`).toBeTruthy();
      }
    }
  });

  it("maps the canonical master rules to their intended visuals", () => {
    expect(
      inferPhotoRuleDemo("Shoot real people at work — collaboration, conversation, hands on screens."),
    ).toBe("real-people");
    expect(
      inferPhotoRuleDemo("Keep lighting soft and directional; shallow depth of field on the subject."),
    ).toBe("soft-light-dof");
    expect(
      inferPhotoRuleDemo("Leave open space on one side so a headline or lockup can sit clear of faces."),
    ).toBe("open-space");
    expect(
      inferPhotoRuleDemo("Blend imagery into brand colour with the soft-transition gradient wash."),
    ).toBe("gradient-wash");
    expect(
      inferPhotoRuleDemo("No stock cliches — handshakes, globes, floating binary, staged boardrooms."),
    ).toBe("stock-cliche");
    expect(
      inferPhotoRuleDemo("Never recolour skin tones or push saturation to match an accent."),
    ).toBe("no-recolor-skin");
    expect(
      inferPhotoRuleDemo("Never set body copy straight onto a busy area of a photo; use a scrim."),
    ).toBe("scrim");
    expect(
      inferPhotoRuleDemo("Never place the logo over a complex part of the image."),
    ).toBe("logo-placement");
  });

  it("maps division-specific rules to their intended visuals", () => {
    expect(
      inferPhotoRuleDemo("No abstract AI stock — glowing brains, robot hands, floating code."),
    ).toBe("no-ai-stock");
    expect(
      inferPhotoRuleDemo("Never mock up UI with off-brand colour; screens use the product palette."),
    ).toBe("off-brand-ui");
    expect(
      inferPhotoRuleDemo("Never crop a product screen so tightly that it stops being legible."),
    ).toBe("illegible-crop");
    expect(
      inferPhotoRuleDemo("No sterile empty labs or gloved hands holding a vial as the only subject."),
    ).toBe("no-sterile-stock");
    expect(
      inferPhotoRuleDemo("Never use Green as a badge that reads as regulatory approval."),
    ).toBe("color-not-approval");
    expect(
      inferPhotoRuleDemo("No synthetic AI imagery — neural swirls, android faces, glowing grids."),
    ).toBe("no-ai-stock");
    expect(
      inferPhotoRuleDemo("Never show real contributor faces or data without recorded consent."),
    ).toBe("consent-privacy");
    expect(
      inferPhotoRuleDemo("Never invent a chart shape that no dataset behind it supports."),
    ).toBe("no-invented-chart");
    expect(
      inferPhotoRuleDemo("Keep dashboards legible; crop to one readable metric rather than many."),
    ).toBe("legible-crop");
  });

  it("falls back to generic-photo for unmatched rules", () => {
    expect(inferPhotoRuleDemo("Some totally unmatched direction line.")).toBe("generic-photo");
  });
});
