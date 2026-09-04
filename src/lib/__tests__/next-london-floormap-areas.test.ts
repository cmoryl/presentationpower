import { describe, expect, it } from "vitest";

import {
  AREA_KIND_CHOICES,
  MIN_AREA_M,
  areaAsZone,
  clampArea,
  isCustomAreaId,
  londonAreaCsv,
  newLondonArea,
  parseStoredAreas,
  planWithAreas,
  type LondonCustomArea,
} from "@/lib/next-london-floormap-areas";
import { AREA_ICONS, areaIconSvg, areaKindLabel } from "@/lib/next-london-floormap-icons";
import { DEFAULT_MAP_DESIGN, zoneStyleFor } from "@/lib/next-london-floormap-design";
import { floorMapSheetSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import { londonFloorPlan } from "@/lib/next-london-floorplan";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const plan = londonFloorPlan("GF")!;
const stage = (over: Partial<LondonCustomArea> = {}): LondonCustomArea => ({
  ...newLondonArea("GF", "stage", "Main stage"),
  ...over,
});

describe("area icons", () => {
  it("gives every kind of space its own symbol and name", () => {
    const kinds = Object.keys(AREA_ICONS);
    const paths = new Set(Object.values(AREA_ICONS).map((i) => i.path));
    expect(kinds.length).toBeGreaterThanOrEqual(17);
    expect(paths.size).toBe(kinds.length);
    for (const [kind, icon] of Object.entries(AREA_ICONS)) {
      expect(icon.path.startsWith("M")).toBe(true);
      expect(icon.label.length).toBeGreaterThan(2);
      expect(areaKindLabel(kind as keyof typeof AREA_ICONS)).toBe(icon.label);
    }
  });

  it("renders a stroked glyph with no fill so it inherits the sheet ink", () => {
    const svg = areaIconSvg("hospitality", 100, 50, 16, "#003FC7");
    expect(svg).toContain('stroke="#003FC7"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain(AREA_ICONS.hospitality.path);
  });

  it("marks the venue rooms with icons on the sheet, and drops them on request", () => {
    const withIcons = floorMapSvg("GF", { panels: LONDON_PANELS, labels: true });
    expect(withIcons).toContain(AREA_ICONS.auditorium.path);
    const without = floorMapSvg("GF", {
      panels: LONDON_PANELS,
      labels: true,
      design: { ...DEFAULT_MAP_DESIGN, icons: false },
    });
    expect(without).not.toContain(AREA_ICONS.auditorium.path);
  });
});

describe("custom areas", () => {
  it("drops a new area inside the floor at a sensible size", () => {
    const a = newLondonArea("GF", "demo");
    expect(a.floor).toBe("GF");
    expect(isCustomAreaId(a.id)).toBe(true);
    expect(a.w).toBeGreaterThanOrEqual(MIN_AREA_M);
    expect(a.x + a.w).toBeLessThanOrEqual(plan.w);
    expect(a.y + a.h).toBeLessThanOrEqual(plan.h);
  });

  it("keeps an area inside the plan and above the minimum size", () => {
    const off = clampArea(stage({ x: 999, y: -40, w: 0.2, h: 500 }), plan);
    expect(off.x + off.w).toBeLessThanOrEqual(plan.w + 0.001);
    expect(off.y).toBe(0);
    expect(off.w).toBeGreaterThanOrEqual(MIN_AREA_M);
    expect(off.h).toBeLessThanOrEqual(plan.h);
  });

  it("merges areas into a plan without mutating the venue rooms", () => {
    const merged = planWithAreas(plan, [stage()]);
    expect(merged.zones.length).toBe(plan.zones.length + 1);
    expect(plan.zones.some((z) => z.label === "Main stage")).toBe(false);
    expect(planWithAreas(plan, [])).toBe(plan);
    // An area on another floor never leaks onto this one.
    expect(planWithAreas(plan, [stage({ floor: "3F" })]).zones.length).toBe(plan.zones.length);
    expect(areaAsZone(stage()).rooms).toEqual([]);
  });

  it("draws sectioned areas on the sheet, dashed and with their own symbol", () => {
    const svg = floorMapSvg("GF", { panels: LONDON_PANELS, labels: true, areas: [stage()] });
    expect(svg).toContain("MAIN STAGE");
    expect(svg).toContain('stroke-dasharray="5 3"');
    expect(svg).toContain(AREA_ICONS.stage.path);
    expect(zoneStyleFor("stage", DEFAULT_MAP_DESIGN).accent).not.toBe(
      zoneStyleFor("storage", DEFAULT_MAP_DESIGN).accent,
    );
  });

  it("names areas in the attendee room key and grows the sheet for them", () => {
    const opts = { panels: LONDON_PANELS, roomsOnly: true, labels: false } as const;
    const bare = floorMapSheetSize("GF", opts);
    const withArea = floorMapSvg("GF", { ...opts, areas: [stage({ label: "Coffee terrace" })] });
    expect(withArea).toContain("COFFEE TERRACE");
    expect(floorMapSheetSize("GF", { ...opts, areas: [stage()] }).h).toBeGreaterThanOrEqual(bare.h);
  });

  it("offers a usable set of kinds and exports them as csv", () => {
    expect(AREA_KIND_CHOICES).toContain("stage");
    expect(AREA_KIND_CHOICES).toContain("hospitality");
    expect(new Set(AREA_KIND_CHOICES).size).toBe(AREA_KIND_CHOICES.length);
    const csv = londonAreaCsv([stage({ label: 'Stage, "A"', note: "Truss overhead" })]);
    expect(csv.split("\n")[0]).toContain("width_m");
    expect(csv).toContain('"Stage, ""A"""');
    expect(csv).toContain("Truss overhead");
  });

  it("survives corrupt stored areas", () => {
    expect(parseStoredAreas("not json")).toEqual([]);
    expect(parseStoredAreas(JSON.stringify({}))).toEqual([]);
    const mixed = JSON.stringify([stage(), { id: "area-x" }, null]);
    expect(parseStoredAreas(mixed)).toHaveLength(1);
  });
});
