// Interactive top-down location map for the London signage kit.
//
// The plan is drawn as real DOM so markers stay keyboard reachable, and any
// marker can be dragged to its true position; corrections persist per browser
// and flow straight into the SVG / PNG / PDF / zip downloads.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, RotateCcw } from "lucide-react";

import {
  LONDON_ASSET_KIND_LABEL,
  LONDON_FACE_LABEL,
  clamp,
  londonAssetKind,
  londonFloorMarkers,
  londonFloorPlan,
  type LondonAssetKind,
  type LondonMarker,
  type LondonMarkerOverrides,
} from "@/lib/next-london-floorplan";
import type { LondonFloorId, LondonPanel } from "@/lib/next-london-signage";

const ZONE_FILL: Record<string, string> = {
  auditorium: "#E0E8F5",
  room: "#EEF1F7",
  foyer: "#F5F8FD",
  circulation: "#F7F9FC",
  core: "#DCE4F2",
  hospitality: "#F1F6F6",
  exhibition: "#EAF0FB",
  terrace: "#F2F2F2",
  exterior: "#F4F7FB",
};

export type LondonFloorMapProps = {
  floor: LondonFloorId;
  panels: LondonPanel[];
  overrides: LondonMarkerOverrides;
  onMove: (panelId: string, x: number, y: number) => void;
  onResetOne: (panelId: string) => void;
  kinds: LondonAssetKind[];
  selectedId: string | null;
  onSelect: (panelId: string | null) => void;
  /** Read-only for signed-out viewers. */
  editable: boolean;
};

export function LondonFloorMap({
  floor,
  panels,
  overrides,
  onMove,
  onResetOne,
  kinds,
  selectedId,
  onSelect,
  editable,
}: LondonFloorMapProps) {
  const plan = londonFloorPlan(floor);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const markers = useMemo(() => {
    const all = londonFloorMarkers(floor, panels, overrides);
    return kinds.length ? all.filter((m) => kinds.includes(m.kind)) : all;
  }, [floor, panels, overrides, kinds]);

  const toPlan = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el || !plan) return null;
      const r = el.getBoundingClientRect();
      return {
        x: clamp(((clientX - r.left) / r.width) * plan.w, 0, plan.w),
        y: clamp(((clientY - r.top) / r.height) * plan.h, 0, plan.h),
      };
    },
    [plan],
  );

  useEffect(() => {
    if (!dragId) return;
    const move = (e: PointerEvent) => {
      const p = toPlan(e.clientX, e.clientY);
      if (p) onMove(dragId, p.x, p.y);
    };
    const up = () => setDragId(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragId, onMove, toPlan]);

  if (!plan) {
    return (
      <p className="rounded-xl border border-black/10 bg-white p-5 text-[13px] text-[#03002C]/70">
        No plan drawn for this floor yet.
      </p>
    );
  }

  const nudge = (m: LondonMarker, dx: number, dy: number) =>
    onMove(m.panelId, clamp(m.x + dx, 0, plan.w), clamp(m.y + dy, 0, plan.h));

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl border border-black/10 bg-white"
      style={{ aspectRatio: `${plan.w} / ${plan.h}` }}
      role="group"
      aria-label={`${plan.label} top-down install map`}
    >
      {plan.zones.map((z) => (
        <div
          key={z.id}
          className="absolute rounded-[5px] border border-[#C9D5EA]"
          style={{
            left: `${(z.x / plan.w) * 100}%`,
            top: `${(z.y / plan.h) * 100}%`,
            width: `${(z.w / plan.w) * 100}%`,
            height: `${(z.h / plan.h) * 100}%`,
            background: ZONE_FILL[z.kind] ?? "#F5F8FD",
          }}
        >
          <span className="absolute left-1.5 top-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#03002C]/60">
            {z.label}
          </span>
        </div>
      ))}

      {plan.entries.map((e) => (
        <span
          key={e.label}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A1FBF9] px-2 py-0.5 text-[9.5px] font-semibold text-[#03002C]"
          style={{ left: `${(e.x / plan.w) * 100}%`, top: `${(e.y / plan.h) * 100}%` }}
        >
          {e.label}
        </span>
      ))}

      {markers.map((m) => {
        const active = m.panelId === selectedId;
        return (
          <button
            key={m.panelId}
            type="button"
            onPointerDown={(ev) => {
              if (!editable) return;
              ev.preventDefault();
              onSelect(m.panelId);
              setDragId(m.panelId);
            }}
            onClick={() => onSelect(active ? null : m.panelId)}
            onKeyDown={(ev) => {
              if (!editable) return;
              const step = ev.shiftKey ? 1 : 0.25;
              if (ev.key === "ArrowLeft") nudge(m, -step, 0);
              else if (ev.key === "ArrowRight") nudge(m, step, 0);
              else if (ev.key === "ArrowUp") nudge(m, 0, -step);
              else if (ev.key === "ArrowDown") nudge(m, 0, step);
              else return;
              ev.preventDefault();
            }}
            title={`${m.name} — ${LONDON_ASSET_KIND_LABEL[m.kind]}`}
            aria-label={`${m.name}, ${LONDON_ASSET_KIND_LABEL[m.kind]}, ${LONDON_FACE_LABEL[m.face]}${
              m.corrected ? ", position confirmed" : ""
            }`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-offset-2 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003FC7] ${
              active ? "z-20 scale-125" : "z-10 hover:scale-110"
            } ${editable ? "cursor-grab" : "cursor-pointer"}`}
            style={{ left: `${(m.x / plan.w) * 100}%`, top: `${(m.y / plan.h) * 100}%` }}
          >
            <span
              className={`block h-3.5 w-3.5 border ${shapeClass(m.kind)} ${
                active
                  ? "border-[#8f0f47] bg-[#EC388A]"
                  : m.corrected
                    ? "border-[#03002C] bg-[#A6FA87]"
                    : "border-[#03002C] bg-[#003FC7]"
              }`}
            />
          </button>
        );
      })}

      {selectedId
        ? (() => {
            const m = markers.find((x) => x.panelId === selectedId);
            if (!m) return null;
            return (
              <div className="absolute bottom-2 left-2 right-2 z-30 rounded-lg border border-[#03002C]/15 bg-white/95 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-[#03002C]">{m.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#03002C]/70">
                      {LONDON_ASSET_KIND_LABEL[m.kind]} · {m.room} ·{" "}
                      {LONDON_FACE_LABEL[m.face]} · x {m.x.toFixed(1)} m / y {m.y.toFixed(1)} m
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E0E8F5] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#03002C]/70">
                      <Crosshair className="h-3 w-3" />
                      {m.corrected ? "confirmed" : "schematic"}
                    </span>
                    {editable && m.corrected ? (
                      <button
                        type="button"
                        onClick={() => onResetOne(m.panelId)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/20 px-2 py-0.5 text-[11px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    ) : null}
                  </div>
                </div>
                {editable ? (
                  <p className="mt-1.5 text-[11px] text-[#03002C]/55">
                    Drag the pin, or use the arrow keys (hold Shift for a 1 m step).
                  </p>
                ) : null}
              </div>
            );
          })()
        : null}
    </div>
  );
}

function shapeClass(kind: LondonAssetKind): string {
  if (kind === "pillar" || kind === "table" || kind === "booth") return "rounded-full";
  if (kind === "door" || kind === "lift") return "rounded-[2px] !h-2 !w-5";
  if (kind === "floor") return "rotate-45 rounded-[2px]";
  return "rounded-[2px] [clip-path:polygon(50%_0,100%_100%,0_100%)]";
}

/** Kind chips used above the map. */
export function londonKindsPresent(panels: LondonPanel[], floor?: LondonFloorId): LondonAssetKind[] {
  const set = new Set<LondonAssetKind>();
  for (const p of panels) {
    if (floor && p.floor !== floor) continue;
    set.add(londonAssetKind(p));
  }
  return [...set];
}
