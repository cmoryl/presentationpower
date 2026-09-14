import { describe, expect, it } from "vitest";

import {
  BOOKLET_SIZES,
  bookletAgendaSizeId,
  bookletDefault,
  bookletPageCount,
  bookletPagePlan,
  bookletSlug,
} from "@/lib/next-booklet";
import { agendaGeometry, agendaSizePreset } from "@/lib/next-agenda";

describe("booklet page plan", () => {
  it("prints cover, agenda days, maps and charts in that order", () => {
    const config = {
      ...bookletDefault({ title: "NEXT 2026 London" }),
      mapFloors: ["GF", "3F"] as const,
      charts: [{ id: "c1", kind: "column" as const, title: "Attendance", subtitle: "" }],
    };
    const plan = bookletPagePlan({ ...config, mapFloors: [...config.mapFloors] }, 3);
    expect(plan.map((p) => p.kind)).toEqual([
      "cover",
      "agenda",
      "agenda",
      "agenda",
      "map",
      "map",
      "chart",
    ]);
    expect(bookletPageCount({ ...config, mapFloors: [...config.mapFloors] }, 3)).toBe(7);
  });

  it("drops the sections the operator turned off", () => {
    const config = {
      ...bookletDefault(),
      includeCover: false,
      includeAgenda: false,
      includeMap: false,
    };
    expect(bookletPagePlan(config, 4)).toEqual([]);
  });

  it("names the file from the cover title and the stock", () => {
    expect(bookletSlug({ ...bookletDefault({ title: "NEXT 2026 London" }), sizeId: "us-letter" })).toBe(
      "next-booklet-next-2026-london-us-letter",
    );
  });
});

describe("booklet stock", () => {
  it("offers A4 and US Letter, both real print trims", () => {
    expect(BOOKLET_SIZES.map((s) => s.id)).toEqual(["a4", "us-letter"]);
    for (const size of BOOKLET_SIZES) {
      const preset = agendaSizePreset(size.agendaSizeId);
      expect(preset.id).toBe(size.agendaSizeId);
      expect(preset.medium).toBe("print");
    }
  });

  it("US Letter is 216 × 279 mm, not a scaled A4", () => {
    const geo = agendaGeometry({ sizeId: bookletAgendaSizeId("us-letter") });
    expect(geo.trimW).toBe(216);
    expect(geo.trimH).toBe(279);
    const a4 = agendaGeometry({ sizeId: bookletAgendaSizeId("a4") });
    expect(a4.trimW).toBe(210);
    expect(a4.trimH).toBe(297);
  });
});
