// One recipe for drawing an event's saved floor maps (venue floors + the
// event's room colours and label edits). The master map editor and every
// read-only map view use it, so a map looks the same wherever it is shown.

import { eventFloorId } from "@/lib/venue-map-import";
import { trimFloorToContent } from "@/lib/venue-floor-normalise";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "@/lib/next-london-qeii-plan";
import { qeiiFloorMapEdits, type QeiiMapEdits } from "@/lib/qeii-map-edits";
import type { QeiiPlanFace } from "@/lib/next-london-qeii-style";

export type EventMapRow = {
  floor_key: string;
  marker: string;
  title: string;
  position: number;
  source_kind: string;
  source_name: string | null;
  w: number;
  h: number;
  shapes: unknown;
  labels: unknown;
  room_colours: unknown;
  room_uses: unknown;
};

export const eventMapFloor = (eventId: string, r: EventMapRow): QeiiFloorVector => trimFloorToContent({
  id: eventFloorId(eventId, r.floor_key),
  marker: r.marker,
  title: r.title,
  page: r.position + 1,
  kind: "vector",
  w: r.w,
  h: r.h,
  shapes: (r.shapes as QeiiFloorVector["shapes"]) ?? [],
  labels: (r.labels as QeiiFloorVector["labels"]) ?? [],
} as QeiiFloorVector);

export function eventMapSheet(
  eventId: string,
  rows: EventMapRow[],
  names: { plan?: string | null; venue?: string | null; fallback?: string | null },
) {
  return {
    venueName: names.plan || names.venue || names.fallback || "Venue",
    tabs: rows.map((r) => ({ id: eventFloorId(eventId, r.floor_key), label: r.marker })),
    // Division editions carry their division's NEXT lockup (SF = GlobalLink NEXT, LegalNEXT = Legal).
    lockup: /san-francisco|next-sf/i.test(eventId)
      ? "globallink-side-by-side-color.svg"
      : /^legalnext/i.test(eventId)
        ? "legal-side-by-side-color.svg"
        : undefined,
  };
}

/** Saved label edits for a floor, with the shared defaults underneath. */
export const eventMapEdits = (eventId: string, floorKey: string, saved?: QeiiMapEdits) =>
  qeiiFloorMapEdits(eventFloorId(eventId, floorKey), saved);

export function eventMapSvg(
  floor: QeiiFloorVector,
  opts: { face: QeiiPlanFace; roomColours: Record<string, string>; sheet: ReturnType<typeof eventMapSheet>; edits: QeiiMapEdits },
): string {
  return qeiiPlanSvg(floor, { face: opts.face, roomColours: opts.roomColours, sheet: opts.sheet, edits: opts.edits });
}
