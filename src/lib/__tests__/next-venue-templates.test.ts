import { describe, expect, it } from "vitest";

import {
  NEXT_VENUE_TEMPLATES,
  venueTemplate,
  venueTemplateFor,
} from "@/lib/next-venue-templates";
import { LONDON_PANELS } from "@/lib/next-london-signage";

describe("NEXT venue template families", () => {
  it("has unique ids and at least one London reference sign each", () => {
    const ids = NEXT_VENUE_TEMPLATES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const family of NEXT_VENUE_TEMPLATES) {
      expect(family.londonPanels.length).toBeGreaterThan(0);
      expect(family.slots.length).toBeGreaterThan(0);
      expect(venueTemplate(family.id)).toBe(family);
    }
  });

  it("only references London signs that exist", () => {
    const known = new Set(LONDON_PANELS.map((p) => p.id));
    for (const family of NEXT_VENUE_TEMPLATES) {
      for (const panelId of family.londonPanels) expect(known.has(panelId)).toBe(true);
    }
  });

  it("never assigns one sign to two families", () => {
    const seen = new Set<string>();
    for (const family of NEXT_VENUE_TEMPLATES) {
      for (const panelId of family.londonPanels) {
        expect(seen.has(panelId)).toBe(false);
        seen.add(panelId);
        expect(venueTemplateFor(panelId)).toBe(family);
      }
    }
  });
});
