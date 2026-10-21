// Read-only view of one event floor exactly as the master map editor draws it
// (same floors, room colours, label edits and looks). Editing happens only in
// the master editor at /events/next/maps/$eventId.

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import { listEventMapFloors } from "@/lib/event-maps.functions";
import { listVenueMapEdits } from "@/lib/qeii-map-edits.functions";
import { eventMapEdits, eventMapFloor, eventMapSheet, eventMapSvg, type EventMapRow } from "@/lib/event-floor-plan";
import { QEII_MAP_LOOKS, QEII_MAP_LOOK_ORDER, type QeiiPlanFace } from "@/lib/next-london-qeii-style";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";

export interface EventMapViewProps {
  eventId: string;
  /** Floor tab marker to show, e.g. "3". */
  marker: string;
  /** Shown when the event has no saved map for that floor. */
  fallback?: React.ReactNode;
}

export function EventMapView({ eventId, marker, fallback }: EventMapViewProps) {
  const list = useServerFn(listEventMapFloors);
  const listEdits = useServerFn(listVenueMapEdits);
  const q = useQuery({ queryKey: ["event-map-floors", eventId], queryFn: () => list({ data: { eventId } }) });
  const scope = `event-${eventId}`;
  const e = useQuery({ queryKey: ["map-label-edits", scope], queryFn: () => listEdits({ data: { venueSlug: scope } }) });
  const [face, setFace] = useState<QeiiPlanFace>("signage");

  const rows = (q.data?.floors ?? []) as EventMapRow[];
  const row = rows.find((r) => r.marker === marker);
  const svg = useMemo(() => {
    if (!row) return "";
    const plan = q.data?.plan;
    const sheet = eventMapSheet(eventId, rows, { plan: plan?.venue, venue: q.data?.venue?.name, fallback: plan?.name });
    const edits = eventMapEdits(eventId, row.floor_key, e.data?.floors.find((f) => f.floorId === row.floor_key)?.edits);
    return eventMapSvg(eventMapFloor(eventId, row), {
      face, sheet, edits, roomColours: (row.room_colours as Record<string, string>) ?? {},
    });
  }, [row, rows, q.data, e.data, eventId, face]);
  if (q.isLoading) return <p className="p-4 text-[13px] text-[#666666]">Loading the map…</p>;
  if (!row) return <>{fallback}</>;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label htmlFor={`look-${eventId}`} className="text-[12px] font-semibold text-[#03002C]">Look</label>
        <select id={`look-${eventId}`} value={face} onChange={(ev) => setFace(ev.target.value as QeiiPlanFace)}
          className="rounded-md border border-[#03002C]/20 px-2 py-1 text-[13px] text-[#03002C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
          {QEII_MAP_LOOK_ORDER.map((id) => <option key={id} value={id}>{QEII_MAP_LOOKS[id].name}</option>)}
        </select>
        <Link to="/events/next/maps/$eventId" params={{ eventId }}
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#003FC7] hover:underline">
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit in map editor
        </Link>
      </div>
      <PlanZoomFrame key={`${marker}-${face}`} label={row.title}>
        {/* Same inline drawing as the editor, so linked logos resolve. */}
        <div role="img" aria-label={`${row.title} map`} className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      </PlanZoomFrame>
    </div>
  );
}
