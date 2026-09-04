// Custom areas — the spaces a team sections off themselves on a floor sheet.
//
// The venue plans in next-london-floorplan.ts are the building as it exists.
// Real events overlay their own geography on top: a stage footprint inside a
// hall, a coffee run along one wall, a demo bay, a press corner, a storage bay
// behind the set. Those live here as plain rectangles in plan metres, so they
// merge into a plan and print through every sheet, card and PDF exactly like a
// venue room does.

import {
  LONDON_FLOOR_PLANS,
  clamp,
  type LondonFloorPlan,
  type LondonZone,
} from "@/lib/next-london-floorplan";
import type { MapAreaKind } from "@/lib/next-london-floormap-design";
import type { LondonFloorId } from "@/lib/next-london-signage";

export type LondonCustomArea = {
  id: string;
  floor: LondonFloorId;
  label: string;
  kind: MapAreaKind;
  /** Plan rectangle in metres, origin top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Short line printed under the area name on the sheet key. */
  note?: string;
};

/** Smallest area worth drawing, in metres. */
export const MIN_AREA_M = 1.5;

/** Kinds offered in the area picker, in the order they are shown. */
export const AREA_KIND_CHOICES: MapAreaKind[] = [
  "stage",
  "demo",
  "hospitality",
  "catering",
  "meeting",
  "exhibition",
  "media",
  "vip",
  "support",
  "storage",
  "room",
  "foyer",
  "circulation",
];

let seq = 0;

/** A new area, sized and placed inside the given floor without overhanging it. */
export function newLondonArea(
  floor: LondonFloorId,
  kind: MapAreaKind = "stage",
  label = "New area",
): LondonCustomArea {
  const plan = LONDON_FLOOR_PLANS.find((p) => p.floor === floor);
  const pw = plan?.w ?? 30;
  const ph = plan?.h ?? 20;
  const w = Math.max(MIN_AREA_M, Math.min(10, pw * 0.28));
  const h = Math.max(MIN_AREA_M, Math.min(8, ph * 0.28));
  seq += 1;
  return {
    // Stable enough for React keys and local storage without pulling in a uuid.
    id: `area-${Date.now().toString(36)}-${seq}`,
    floor,
    label,
    kind,
    x: Math.round(((pw - w) / 2) * 10) / 10,
    y: Math.round(((ph - h) / 2) * 10) / 10,
    w: Math.round(w * 10) / 10,
    h: Math.round(h * 10) / 10,
  };
}

/** Keep an area inside its floor and above the minimum size. */
export function clampArea(area: LondonCustomArea, plan?: LondonFloorPlan | null): LondonCustomArea {
  const pw = plan?.w ?? 100;
  const ph = plan?.h ?? 100;
  const w = clamp(area.w, MIN_AREA_M, pw);
  const h = clamp(area.h, MIN_AREA_M, ph);
  return {
    ...area,
    w: round1(w),
    h: round1(h),
    x: round1(clamp(area.x, 0, Math.max(0, pw - w))),
    y: round1(clamp(area.y, 0, Math.max(0, ph - h))),
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Areas belonging to one floor, in drawing order. */
export function areasOnFloor(
  areas: readonly LondonCustomArea[] | undefined,
  floor: LondonFloorId,
): LondonCustomArea[] {
  return (areas ?? []).filter((a) => a.floor === floor);
}

/** An area as a plan zone, so every drawing path treats it like a room. */
export function areaAsZone(area: LondonCustomArea): LondonZone {
  return {
    id: area.id,
    label: area.label,
    // Extra kinds only exist on custom areas; the drawing code accepts them and
    // the zone type is narrower, so the cast is contained to this one function.
    kind: area.kind as LondonZone["kind"],
    x: area.x,
    y: area.y,
    w: area.w,
    h: area.h,
    rooms: [],
    ...(area.note ? { note: area.note } : {}),
  };
}

/**
 * Plan with the floor's custom areas merged in on top of the venue rooms. The
 * source plan is never mutated — every caller gets a fresh object.
 */
export function planWithAreas(
  plan: LondonFloorPlan,
  areas?: readonly LondonCustomArea[],
): LondonFloorPlan {
  const mine = areasOnFloor(areas, plan.floor);
  if (!mine.length) return plan;
  return { ...plan, zones: [...plan.zones, ...mine.map((a) => areaAsZone(a))] };
}

/** True when a zone id came from a custom area rather than the venue plan. */
export function isCustomAreaId(id: string): boolean {
  return id.startsWith("area-");
}

/** Areas as CSV, so a production partner can read the sectioning without the app. */
export function londonAreaCsv(areas: readonly LondonCustomArea[]): string {
  const rows = [["floor", "area", "kind", "x_m", "y_m", "width_m", "height_m", "note"]];
  for (const a of areas) {
    rows.push([
      a.floor,
      a.label,
      a.kind,
      a.x.toFixed(1),
      a.y.toFixed(1),
      a.w.toFixed(1),
      a.h.toFixed(1),
      a.note ?? "",
    ]);
  }
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}

/** Parse stored areas defensively — a corrupt entry must not lose the rest. */
export function parseStoredAreas(raw: string): LondonCustomArea[] {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (a): a is LondonCustomArea =>
        !!a &&
        typeof a.id === "string" &&
        typeof a.floor === "string" &&
        typeof a.label === "string" &&
        typeof a.kind === "string" &&
        Number.isFinite(a.x) &&
        Number.isFinite(a.y) &&
        Number.isFinite(a.w) &&
        Number.isFinite(a.h),
    );
  } catch {
    return [];
  }
}
