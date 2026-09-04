import { describe, expect, it } from "vitest";

import {
  LONDON_ASSET_KIND_LABEL,
  LONDON_FLOOR_PLANS,
  londonAssetKind,
  londonFloorMarkers,
  londonFloorPlan,
  londonMapCsv,
  londonMappedFloors,
  londonMarkerFor,
  londonZoneFor,
} from "@/lib/next-london-floorplan";
import { assetMapSvg, floorMapSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const mappedFloors = new Set(LONDON_FLOOR_PLANS.map((p) => p.floor));

describe("london floor plans", () => {
  it("draws a plan for every floor that carries assets", () => {
    const floorsWithPanels = new Set(LONDON_PANELS.map((p) => p.floor));
    for (const floor of floorsWithPanels) expect(mappedFloors.has(floor)).toBe(true);
  });

  it("keeps every zone inside its plan extent", () => {
    for (const plan of LONDON_FLOOR_PLANS) {
      expect(plan.zones.length).toBeGreaterThan(0);
      for (const z of plan.zones) {
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.x + z.w).toBeLessThanOrEqual(plan.w);
        expect(z.y + z.h).toBeLessThanOrEqual(plan.h);
      }
      const ids = plan.zones.map((z) => z.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("pins every asset once, inside the plan, in a real zone", () => {
    const seen = new Set<string>();
    for (const plan of LONDON_FLOOR_PLANS) {
      const markers = londonFloorMarkers(plan.floor);
      for (const m of markers) {
        expect(seen.has(m.panelId)).toBe(false);
        seen.add(m.panelId);
        expect(plan.zones.some((z) => z.id === m.zoneId)).toBe(true);
        expect(m.x).toBeGreaterThanOrEqual(0);
        expect(m.y).toBeGreaterThanOrEqual(0);
        expect(m.x).toBeLessThanOrEqual(plan.w);
        expect(m.y).toBeLessThanOrEqual(plan.h);
      }
    }
    const mappable = LONDON_PANELS.filter((p) => mappedFloors.has(p.floor));
    expect(seen.size).toBe(mappable.length);
  });

  it("routes named rooms to their own zone, not the fallback foyer", () => {
    const gf = londonFloorPlan("GF")!;
    const churchill = LONDON_PANELS.find((p) => p.floor === "GF" && p.room === "CHURCHILL")!;
    expect(londonZoneFor(gf, churchill).id).toBe("gf-churchill");

    // Spelling drift in the schedule (FLEMMING / GEILGUD) must still resolve.
    const fleming = LONDON_PANELS.find((p) => p.room.startsWith("FLEM"))!;
    expect(londonZoneFor(londonFloorPlan(fleming.floor)!, fleming).id).toBe("f3-fleming");
    const gielgud = LONDON_PANELS.find((p) => /G[EI]{2}LGUD/.test(p.room));
    if (gielgud) {
      expect(londonZoneFor(londonFloorPlan(gielgud.floor)!, gielgud).id).toBe("f2-gielgud");
    }
  });

  it("classifies assets by kind and labels every kind", () => {
    for (const panel of LONDON_PANELS) {
      const kind = londonAssetKind(panel);
      expect(LONDON_ASSET_KIND_LABEL[kind]).toBeTruthy();
    }
    const pillar = LONDON_PANELS.find((p) => /PILLAR/i.test(p.name))!;
    expect(londonAssetKind(pillar)).toBe("pillar");
    const door = LONDON_PANELS.find((p) => /DOOR BRANDING/i.test(p.name))!;
    expect(londonAssetKind(door)).toBe("door");
    const booth = LONDON_PANELS.find((p) => p.id.startsWith("ldn-b"))!;
    expect(londonAssetKind(booth)).toBe("booth");
  });

  it("is deterministic and honours a saved correction", () => {
    const a = londonFloorMarkers("GF");
    const b = londonFloorMarkers("GF");
    expect(a.map((m) => `${m.panelId}:${m.x.toFixed(3)}`)).toEqual(
      b.map((m) => `${m.panelId}:${m.x.toFixed(3)}`),
    );

    const target = a[0]!;
    const fixed = londonFloorMarkers("GF", LONDON_PANELS, {
      [target.panelId]: { x: 1.5, y: 2.5 },
    }).find((m) => m.panelId === target.panelId)!;
    expect(fixed.x).toBeCloseTo(1.5);
    expect(fixed.y).toBeCloseTo(2.5);
    expect(fixed.corrected).toBe(true);
  });

  it("counts only floors that have assets", () => {
    for (const f of londonMappedFloors()) expect(f.count).toBeGreaterThan(0);
  });
});

describe("london map artwork", () => {
  it("renders a well-formed svg per floor sized from the plan", () => {
    for (const plan of LONDON_FLOOR_PLANS) {
      const svg = floorMapSvg(plan.floor, { labels: true });
      const size = floorMapSize(plan);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
      expect(svg).toContain(`width="${size.w}"`);
      expect(svg).toContain(plan.label);
      // One marker group per pinned asset.
      const pins = svg.match(/data-panel="/g)?.length ?? 0;
      expect(pins).toBe(londonFloorMarkers(plan.floor).length);
    }
  });

  it("filters by asset kind", () => {
    const pillars = floorMapSvg("GF", { kinds: ["pillar"] });
    const all = floorMapSvg("GF");
    expect((pillars.match(/data-panel="/g) ?? []).length).toBeLessThan(
      (all.match(/data-panel="/g) ?? []).length,
    );
  });

  it("builds an asset card carrying the spec and one active pin", () => {
    const panel = LONDON_PANELS.find((p) => /PILLAR/i.test(p.name))!;
    const svg = assetMapSvg(panel);
    expect(svg).toContain(`${panel.trimW} × ${panel.trimH} mm`);
    expect(svg).toContain("BLEED");
    expect(svg).toContain("#C4306E"); // active pin fill
    expect(londonMarkerFor(panel)).not.toBeNull();
    // Escaped, single-root SVG.
    expect(svg.match(/<svg/g)!.length).toBe(1);
  });

  it("escapes ampersands from room names", () => {
    const svg = floorMapSvg("2F", { labels: true });
    expect(svg).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
  });

  it("writes an install-position row per pinned asset", () => {
    const csv = londonMapCsv();
    const rows = csv.trim().split("\n");
    const pinned = LONDON_FLOOR_PLANS.reduce(
      (n, plan) => n + londonFloorMarkers(plan.floor).length,
      0,
    );
    expect(rows.length).toBe(pinned + 1);
    expect(rows[0]).toContain("Plan X m");
    expect(csv).toContain("Schematic (rule)");
  });
});
