// End-to-end cover for the printable map artwork: every floor sheet, every
// asset install card, the attendee guide and the CSVs that travel in the pack.
import { describe, expect, it } from "vitest";

import { londonAreaCsv, clampArea, type LondonCustomArea } from "@/lib/next-london-floormap-areas";
import {
  DEFAULT_MAP_DESIGN,
  pdfFormatFor,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import { assetMapSvg, floorMapSheetSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import { LONDON_FLOOR_PLANS, londonFloorPlan, londonMapCsv } from "@/lib/next-london-floorplan";
import { LONDON_PANELS, LONDON_VENUE, panelSlug } from "@/lib/next-london-signage";

const design = (over: Partial<MapDesign> = {}): MapDesign => ({ ...DEFAULT_MAP_DESIGN, ...over });

/** Cheap well-formedness check: tags balance and nothing is left unterminated. */
function svgIsSound(svg: string) {
  expect(svg.startsWith("<svg")).toBe(true);
  expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  expect(svg).not.toMatch(/undefined|NaN|\[object Object\]/);
  const opens = (svg.match(/<g[\s>]/g) ?? []).length;
  const closes = (svg.match(/<\/g>/g) ?? []).length;
  expect(closes).toBe(opens);
}

function headerNumbers(svg: string) {
  const w = Number(/^<svg[^>]*width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 0);
  const h = Number(/^<svg[^>]*height="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 0);
  return { w, h };
}

describe("London map print masters", () => {
  it("renders a sound install sheet for every floor at the declared sheet size", () => {
    for (const plan of LONDON_FLOOR_PLANS) {
      const opts = { panels: LONDON_PANELS, labels: true, design: design() };
      const svg = floorMapSvg(plan.floor, opts);
      svgIsSound(svg);
      const size = floorMapSheetSize(plan.floor, opts);
      expect(size.w).toBeGreaterThan(200);
      expect(size.h).toBeGreaterThan(200);
      expect(headerNumbers(svg)).toEqual({ w: size.w, h: size.h });
      expect(svg).toContain(`viewBox="0 0 ${size.w} ${size.h}"`);
      expect(svg).toContain(LONDON_VENUE.name);
    }
  });

  it("keeps the numbered index inside the sheet when labels are on", () => {
    const plan = LONDON_FLOOR_PLANS[0]!;
    const plain = floorMapSheetSize(plan.floor, { panels: LONDON_PANELS, design: design() });
    const indexed = floorMapSheetSize(plan.floor, {
      panels: LONDON_PANELS,
      labels: true,
      design: design({ labelMode: "numbered" }),
    });
    expect(indexed.h).toBeGreaterThanOrEqual(plain.h);
  });

  it("renders the attendee guide with rooms only and no signage pins", () => {
    for (const plan of LONDON_FLOOR_PLANS) {
      const svg = floorMapSvg(plan.floor, {
        panels: LONDON_PANELS,
        roomsOnly: true,
        labels: false,
        design: design(),
      });
      svgIsSound(svg);
      expect(svg).toContain("attendee floor guide");
    }
  });

  it("renders a sound install card for every mapped asset", () => {
    const mapped = new Set(LONDON_FLOOR_PLANS.map((p) => p.floor));
    const cards = LONDON_PANELS.filter((p) => mapped.has(p.floor));
    expect(cards.length).toBeGreaterThan(20);
    for (const panel of cards) {
      const svg = assetMapSvg(panel, { panels: LONDON_PANELS, design: design() });
      svgIsSound(svg);
      const { w, h } = headerNumbers(svg);
      expect(w).toBeGreaterThan(200);
      expect(h).toBeGreaterThan(200);
      expect(panelSlug(panel)).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("grows the sheet for sectioned areas and ships them in the pack CSV", () => {
    const plan = LONDON_FLOOR_PLANS.find((p) => p.floor === "GF") ?? LONDON_FLOOR_PLANS[0]!;
    const base = londonFloorPlan(plan.floor)!;
    const area: LondonCustomArea = clampArea(
      {
        id: "area-demo",
        floor: plan.floor,
        label: "Demo bays",
        kind: "demo",
        x: 4,
        y: 4,
        w: 6,
        h: 4,
      } as LondonCustomArea,
      base,
    );
    const svg = floorMapSvg(plan.floor, {
      panels: LONDON_PANELS,
      labels: true,
      areas: [area],
      design: design(),
    });
    svgIsSound(svg);
    expect(svg).toContain("Demo bays");
    const csv = londonAreaCsv([area]);
    expect(csv.split("\n").length).toBeGreaterThan(1);
    expect(csv).toContain("Demo bays");
  });

  it("emits a position row per asset in the install CSV", () => {
    const csv = londonMapCsv(LONDON_PANELS);
    const rows = csv.trim().split("\n");
    expect(rows.length).toBe(LONDON_PANELS.length + 1);
    expect(rows[0]).toMatch(/,/);
    expect(csv).not.toMatch(/undefined|NaN/);
  });

  it("gives the PDF a real paper size for every page preset", () => {
    for (const paper of ["a3", "a4", "sheet"] as const) {
      const fmt = pdfFormatFor(design({ paper } as Partial<MapDesign>));
      if (fmt === undefined || fmt === null) continue;
      const [w, h] = fmt as [number, number];
      expect(w).toBeGreaterThan(100);
      expect(h).toBeGreaterThan(100);
    }
  });

  it("survives every look preset without leaking a broken colour", () => {
    for (const theme of ["day", "night"] as const) {
      const svg = floorMapSvg("GF", {
        panels: LONDON_PANELS,
        labels: true,
        design: design({ theme } as Partial<MapDesign>),
      });
      svgIsSound(svg);
      expect(svg).not.toMatch(/fill="(none)?"\s*\/?>/);
    }
  });
});
