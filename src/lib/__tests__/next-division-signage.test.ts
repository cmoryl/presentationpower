import { describe, expect, it } from "vitest";
import { writeFileSync } from "fs";
import {
  DIVISION_SIGN_DIVISIONS,
  DIVISION_SIGN_TEMPLATES,
  divisionSigns,
  divisionSignArtOptions,
} from "@/lib/next-division-signage";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { auditSvg } from "@/lib/london-signage-qa";
import { londonBrandingPlan, londonPanelFamily } from "@/lib/next-london-branding";
import { LONDON_VENUE_ITEM_PANELS } from "@/lib/next-london-signage";

describe("division signage templates", () => {
  it("builds every template from a real London item at its issued size", () => {
    for (const t of DIVISION_SIGN_TEMPLATES) {
      expect(LONDON_VENUE_ITEM_PANELS.some((p) => p.id === t.source)).toBe(true);
    }
    for (const d of DIVISION_SIGN_DIVISIONS) {
      const signs = divisionSigns(d);
      expect(signs).toHaveLength(DIVISION_SIGN_TEMPLATES.length);
      for (const s of signs) {
        const src = LONDON_VENUE_ITEM_PANELS.find((p) => s.panel.id.endsWith(p.id.replace("ldn-", "")))!;
        expect([s.panel.trimW, s.panel.trimH, s.panel.bleedEdge]).toEqual([src.trimW, src.trimH, src.bleedEdge]);
      }
    }
  });

  it("brands each sign for its own division with the white lockup and passes print QA", () => {
    for (const d of DIVISION_SIGN_DIVISIONS) {
      for (const s of divisionSigns(d)) {
        expect(londonPanelFamily(s.panel)).toBe(d);
        const plan = londonBrandingPlan(s.panel);
        expect(plan.familyId).toBe(d);
        expect(plan.copy ?? "").not.toMatch(/NEXTBREW/);
        const svg = buildLondonPanelSvg(s.panel, divisionSignArtOptions(s));
        const qa = auditSvg(s.panel, svg);
        expect(qa.status, `${s.panel.id}: ${JSON.stringify(qa).slice(0, 400)}`).not.toBe("fail");
        if (process.env["DUMP_DIV_SIGNS"] && (d === "legal" || d === "media")) {
          writeFileSync(`/tmp/${s.panel.id}.svg`, svg);
        }
      }
    }
  });

  it("offers nothing for an unknown division and leaves London items untouched", () => {
    expect(divisionSigns("nope")).toEqual([]);
    const door = LONDON_VENUE_ITEM_PANELS.find((p) => p.id === "ldn-v18")!;
    expect(londonPanelFamily(door)).toBe("digital");
  });
});
