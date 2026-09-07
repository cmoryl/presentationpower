import { describe, expect, it } from "vitest";

import { BESPOKE_UNITS } from "@/lib/next-london-bespoke";
import {
  NATIVE_BESPOKE_TEMPLATES,
  nativeBespokeFaces,
  nativeBespokeTemplate,
} from "@/lib/next-london-bespoke-native";
import {
  LONDON_BESPOKE_PANELS,
  LONDON_PANELS,
  LONDON_STYLES,
  isBespokePanel,
  londonBespokeFacePanel,
  londonBespokeNativeTemplate,
} from "@/lib/next-london-signage";
import { londonBrandingPlan } from "@/lib/next-london-branding";

describe("native Bespoke scenic templates", () => {
  it("transcribes every face from the Bespoke GA pack, unit for unit", () => {
    for (const t of NATIVE_BESPOKE_TEMPLATES) {
      const unit = BESPOKE_UNITS.find((u) => u.id === t.unitId);
      expect(unit, t.unitId).toBeTruthy();
      expect(unit!.name).toBe(t.unitName);
      expect(unit!.floor).toBe(t.floor);
      expect(unit!.room).toBe(t.room);
      const face = unit!.artwork.find((a) => a.label === t.panelLabel);
      expect(face, `${t.unitId} / ${t.panelLabel}`).toBeTruthy();
      expect(face!.wMm).toBe(t.wMm);
      expect(face!.hMm).toBe(t.hMm);
      expect(face!.qty).toBe(t.qty);
    }
  });

  it("never invents a size for a face the GA leaves unpublished", () => {
    for (const unit of BESPOKE_UNITS) {
      for (const face of unit.artwork) {
        if (face.wMm == null || face.hMm == null) {
          expect(nativeBespokeTemplate(unit.id, face.label)).toBeNull();
        }
      }
    }
  });

  it("builds one panel per native face, on an approved plate style", () => {
    expect(LONDON_BESPOKE_PANELS).toHaveLength(nativeBespokeFaces().length);
    for (const panel of LONDON_BESPOKE_PANELS) {
      expect(isBespokePanel(panel)).toBe(true);
      expect(LONDON_STYLES[panel.style]).toBeTruthy();
      expect(panel.bleedW).toBe(panel.trimW + panel.bleedEdge * 2);
      expect(panel.bleedH).toBe(panel.trimH + panel.bleedEdge * 2);
      expect(LONDON_PANELS.some((p) => p.id === panel.id)).toBe(true);
    }
  });

  it("plans editable headline, subhead, body and logo inside the sheet", () => {
    for (const panel of LONDON_BESPOKE_PANELS) {
      const face = londonBespokeNativeTemplate(panel.id)!;
      const plan = londonBrandingPlan(panel);
      expect(plan.copy ?? "").toBe(face.headline);
      expect(plan.sub ?? "").toBe(face.sub);
      expect(plan.bodyLines.join(" ").length > 0).toBe(face.body.length > 0);
      expect(plan.logo.x).toBeGreaterThanOrEqual(0);
      expect(plan.logo.y).toBeGreaterThanOrEqual(0);
      expect(plan.logo.x + plan.logo.w).toBeLessThanOrEqual(panel.bleedW + 0.01);
      expect(plan.logo.y + plan.logo.h).toBeLessThanOrEqual(panel.bleedH + 0.01);
      expect(plan.lockupOn).toBe(true);
    }
  });

  it("finds the panel for a face by unit and label", () => {
    expect(londonBespokeFacePanel("help-desk", "Totem panel")?.trimW).toBe(1532);
    expect(londonBespokeFacePanel("camera-riser", "Riser skirt")).toBeNull();
  });
});
