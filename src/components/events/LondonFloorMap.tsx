// Interactive top-down location map for the London signage kit.
//
// The plan is drawn as real DOM so markers stay keyboard reachable, and any
// marker can be dragged to its true position; corrections persist per browser
// and flow straight into the SVG / PNG / PDF / zip downloads.
//
// Survey furniture (metre grid, scale bar, north arrow, kind legend) matches the
// exported plans so what the crew reads on screen is what prints.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass, Crosshair, Minus, Plus, RotateCcw, Scan } from "lucide-react";

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
import {
  DEFAULT_MAP_DESIGN,
  kindInkFor,
  mapPalette,
  zoneStyleFor,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import { AREA_ICONS, areaKindLabel } from "@/lib/next-london-floormap-icons";
import {
  MIN_AREA_M,
  clampArea,
  isCustomAreaId,
  planWithAreas,
  type LondonCustomArea,
} from "@/lib/next-london-floormap-areas";
import type { LondonFloorId, LondonPanel } from "@/lib/next-london-signage";

const MIN_Z = 1;
const MAX_Z = 6;

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
  /** Attendee view: rooms and breakouts only, no signage pins. */
  roomsOnly?: boolean;
  /** Live design — the editor previews exactly what will export. */
  design?: MapDesign;
  /** Areas the team sectioned off themselves on this floor. */
  areas?: readonly LondonCustomArea[];
  /** Called while an area is dragged or resized on the plan. */
  onAreaChange?: (area: LondonCustomArea) => void;
  selectedAreaId?: string | null;
  onSelectArea?: (id: string | null) => void;
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
  roomsOnly = false,
  design = DEFAULT_MAP_DESIGN,
  areas,
  onAreaChange,
  selectedAreaId = null,
  onSelectArea,
}: LondonFloorMapProps) {
  const palette = mapPalette(design);
  const KIND_INK = (k: LondonAssetKind) => kindInkFor(k, design);
  const base = londonFloorPlan(floor);
  // The sectioned areas draw exactly as the export does: merged on top of the
  // venue rooms, so the screen is a true preview of the sheet.
  const plan = useMemo(() => (base ? planWithAreas(base, areas) : null), [base, areas]);
  const areaDrag = useRef<{
    area: LondonCustomArea;
    mode: "move" | "resize";
    px: number;
    py: number;
  } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const panRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const markers = useMemo(() => {
    if (roomsOnly) return [];
    const all = londonFloorMarkers(floor, panels, overrides);
    return kinds.length ? all.filter((m) => kinds.includes(m.kind)) : all;
  }, [floor, panels, overrides, kinds, roomsOnly]);

  // Reset the view whenever the floor changes so a new plan opens fully framed.
  useEffect(() => setView({ z: 1, x: 0, y: 0 }), [floor]);

  /** Client point → plan metres, read off the transformed stage so zoom/pan are already applied. */
  const toPlan = useCallback(
    (clientX: number, clientY: number) => {
      const el = stageRef.current;
      if (!el || !plan) return null;
      const r = el.getBoundingClientRect();
      return {
        x: clamp(((clientX - r.left) / r.width) * plan.w, 0, plan.w),
        y: clamp(((clientY - r.top) / r.height) * plan.h, 0, plan.h),
      };
    },
    [plan],
  );

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    setView((v) => {
      const z = clamp(next, MIN_Z, MAX_Z);
      const k = z / v.z;
      return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  // Wheel zoom needs a non-passive listener; React's onWheel cannot preventDefault.
  const zoomRef = useRef(zoomAt);
  zoomRef.current = zoomAt;
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const r = el.getBoundingClientRect();
      setView((v) => {
        const z = clamp(v.z * Math.exp(-dy * 0.0018), MIN_Z, MAX_Z);
        const k = z / v.z;
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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

  // Dragging an area body moves it; dragging its corner handle resizes it.
  useEffect(() => {
    if (!onAreaChange) return;
    const move = (e: PointerEvent) => {
      const s = areaDrag.current;
      const p = s ? toPlan(e.clientX, e.clientY) : null;
      if (!s || !p) return;
      if (s.mode === "move") {
        onAreaChange(
          clampArea({ ...s.area, x: p.x - (s.px - s.area.x), y: p.y - (s.py - s.area.y) }, plan),
        );
      } else {
        onAreaChange(
          clampArea(
            {
              ...s.area,
              w: Math.max(MIN_AREA_M, p.x - s.area.x),
              h: Math.max(MIN_AREA_M, p.y - s.area.y),
            },
            plan,
          ),
        );
      }
    };
    const up = () => (areaDrag.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onAreaChange, plan, toPlan]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = panRef.current;
      if (!s) return;
      setView((v) => ({ ...v, x: s.ox + (e.clientX - s.px), y: s.oy + (e.clientY - s.py) }));
    };
    const up = () => (panRef.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  if (!plan) {
    return (
      <p className="rounded-xl border border-black/10 bg-white p-5 text-[13px] text-[#03002C]/70">
        No plan drawn for this floor yet.
      </p>
    );
  }

  const nudge = (m: LondonMarker, dx: number, dy: number) =>
    onMove(m.panelId, clamp(m.x + dx, 0, plan.w), clamp(m.y + dy, 0, plan.h));

  const kindsPresent = [...new Set(markers.map((m) => m.kind))];
  const zoomed = view.z > 1.001 || view.x !== 0 || view.y !== 0;
  const centerZoom = (dir: 1 | -1) => {
    const r = frameRef.current?.getBoundingClientRect();
    zoomAt(view.z * (dir === 1 ? 1.4 : 1 / 1.4), (r?.width ?? 0) / 2, (r?.height ?? 0) / 2);
  };

  return (
    <div className="min-w-0">
      <div
        ref={frameRef}
        className="relative w-full touch-none overflow-hidden rounded-2xl border border-[#03002C]/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
        style={{
          aspectRatio: `${plan.w} / ${plan.h}`,
          backgroundColor: palette.walkway,
          // The paper hatch only reads on a light ground; on a dark theme it
          // turns to noise, so the dark palettes get a flat walkway.
          backgroundImage: palette.dark
            ? undefined
            : "repeating-linear-gradient(135deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 9px)",
        }}
        role="group"
        aria-label={`${plan.label} top-down install map`}
        onPointerDown={(ev) => {
          if (ev.target !== ev.currentTarget && !(ev.target as HTMLElement).dataset.planSurface)
            return;
          onSelect(null);
          panRef.current = { px: ev.clientX, py: ev.clientY, ox: view.x, oy: view.y };
        }}
      >
        <div
          ref={stageRef}
          data-plan-surface="1"
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
        >
          {/* Metre grid: whisper-quiet under the tiles, 5 m lines a touch stronger. */}
          <svg
            data-plan-surface="1"
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${plan.w} ${plan.h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {Array.from({ length: Math.floor(plan.w) + 1 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={i}
                y1={0}
                x2={i}
                y2={plan.h}
                stroke={palette.grid}
                strokeOpacity={design.grid === false ? 0 : i % 5 === 0 ? 0.55 : 0.22}
                strokeWidth={i % 5 === 0 ? 0.06 : 0.03}
              />
            ))}
            {Array.from({ length: Math.floor(plan.h) + 1 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i}
                x2={plan.w}
                y2={i}
                stroke={palette.grid}
                strokeOpacity={design.grid === false ? 0 : i % 5 === 0 ? 0.55 : 0.22}
                strokeWidth={i % 5 === 0 ? 0.06 : 0.03}
              />
            ))}
          </svg>

          {plan.zones.map((z) => {
            const style = zoneStyleFor(z.kind, design);
            const quiet = z.kind === "circulation" || z.kind === "core" || z.kind === "exterior";
            return (
              <div
                key={z.id}
                data-plan-surface="1"
                className={`absolute overflow-hidden rounded-[3px] border border-[#D3DCEA] ${
                  quiet
                    ? ""
                    : "shadow-[0_1px_2px_rgba(3,0,44,0.10),0_6px_14px_-6px_rgba(3,0,44,0.25)]"
                }`}
                style={{
                  left: `${(z.x / plan.w) * 100}%`,
                  top: `${(z.y / plan.h) * 100}%`,
                  width: `${(z.w / plan.w) * 100}%`,
                  height: `${(z.h / plan.h) * 100}%`,
                  background: style.fill,
                }}
              >
                {/* Category bar — the mall-directory colour key for this space. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-[5px]"
                  style={{ background: style.accent, opacity: 0.9 }}
                />
                <span className="absolute left-2.5 top-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#03002C]/80">
                  {z.label}
                </span>
                <span className="absolute bottom-0.5 right-1.5 font-mono text-[8.5px] tabular-nums text-[#03002C]/35">
                  {z.w.toFixed(1)} × {z.h.toFixed(1)} m
                </span>
              </div>
            );
          })}

          {plan.entries.map((e) => (
            <span
              key={e.label}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#03002C] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-sm"
              style={{ left: `${(e.x / plan.w) * 100}%`, top: `${(e.y / plan.h) * 100}%` }}
            >
              {e.label}
            </span>
          ))}

          {markers.map((m) => {
            const active = m.panelId === selectedId;
            const ink = active ? "#C4306E" : m.corrected ? "#0F9D58" : KIND_INK(m.kind);
            return (
              <button
                key={m.panelId}
                type="button"
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  onSelect(m.panelId);
                  if (!editable) return;
                  ev.preventDefault();
                  setDragId(m.panelId);
                }}
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
                title={`${m.name} — ${LONDON_ASSET_KIND_LABEL[m.kind]} · ${LONDON_FACE_LABEL[m.face]} · x ${m.x.toFixed(1)} m / y ${m.y.toFixed(1)} m`}
                aria-label={`${m.name}, ${LONDON_ASSET_KIND_LABEL[m.kind]}, ${LONDON_FACE_LABEL[m.face]}${
                  m.corrected ? ", position confirmed" : ""
                }`}
                className={`absolute outline-offset-2 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003FC7] ${
                  active ? "z-20" : "z-10 hover:scale-110"
                } ${editable ? "cursor-grab" : "cursor-pointer"}`}
                style={{
                  left: `${(m.x / plan.w) * 100}%`,
                  top: `${(m.y / plan.h) * 100}%`,
                  // Pins keep their on-screen size as the plan scales up, and hang
                  // from their tip like a directory drop pin.
                  // Pins near the top edge flip so the head stays inside the plan.
                  transform: `translate(-50%, ${m.y < 1.4 ? "0%" : "-100%"}) rotate(${m.y < 1.4 ? 180 : 0}deg) scale(${(active ? 1.18 : 1) / view.z})`,
                }}
              >
                <span
                  className="relative block drop-shadow-[0_2px_2px_rgba(3,0,44,0.35)]"
                  style={{ width: 16, height: 22 }}
                >
                  <span
                    className="absolute left-0 top-0 block h-4 w-4 rounded-full border-[1.5px] border-white"
                    style={{ background: ink }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-[11px] block h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[1px] border-b-[1.5px] border-r-[1.5px] border-white"
                    style={{ background: ink }}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-[8px] block -translate-x-1/2 -translate-y-1/2 bg-white ${glyphClass(m.kind)}`}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* North arrow + scale bar: fixed to the frame, unaffected by zoom. */}
        <div className="pointer-events-none absolute right-2 top-2 z-30 flex flex-col items-center rounded-md border border-[#03002C]/12 bg-white/90 px-1.5 py-1 text-[#03002C]">
          <Compass className="h-3.5 w-3.5" />
          <span className="font-mono text-[9px] font-semibold tracking-[0.1em]">N</span>
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-md border border-[#03002C]/12 bg-white/90 px-2 py-1">
          <div
            className="h-1.5 border border-[#03002C]/70 bg-[linear-gradient(90deg,#03002C_0_50%,transparent_50%_100%)]"
            style={{ width: `${(5 / plan.w) * 100 * view.z}%`, minWidth: 26 }}
          />
          <span className="mt-0.5 block font-mono text-[9px] tabular-nums text-[#03002C]/70">
            5 m
          </span>
        </div>

        {/* Zoom controls */}
        <div className="pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1">
          {[
            { k: "in", icon: Plus, label: "Zoom in", act: () => centerZoom(1) },
            { k: "out", icon: Minus, label: "Zoom out", act: () => centerZoom(-1) },
            {
              k: "fit",
              icon: Scan,
              label: "Fit plan to frame",
              act: () => setView({ z: 1, x: 0, y: 0 }),
            },
          ].map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={c.act}
              aria-label={c.label}
              title={c.label}
              className="pointer-events-auto rounded-md border border-[#03002C]/15 bg-white/90 p-1 text-[#03002C] hover:bg-white"
            >
              <c.icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <span className="rounded-md border border-[#03002C]/12 bg-white/90 px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums text-[#03002C]/70">
            {view.z.toFixed(1)}×
          </span>
        </div>

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
                        {LONDON_ASSET_KIND_LABEL[m.kind]} · {m.room} · {LONDON_FACE_LABEL[m.face]} ·
                        x {m.x.toFixed(1)} m / y {m.y.toFixed(1)} m
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
                      Drag the pin, or use the arrow keys (hold Shift for a 1 m step). Scroll to
                      zoom, drag the plan to pan.
                    </p>
                  ) : null}
                </div>
              );
            })()
          : null}
      </div>

      {/* Legend — same pin vocabulary as the printed directory plans. */}
      <ul className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-xl border border-[#C9D5EA] bg-[#F5F8FD] px-3 py-2">
        {kindsPresent.map((k) => (
          <li key={k} className="flex items-center gap-1.5 text-[11px] text-[#03002C]/75">
            <span className="relative block h-4 w-3">
              <span
                className="absolute left-0 top-0 block h-3 w-3 rounded-full border border-white"
                style={{ background: KIND_INK(k) }}
              />
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-[8px] block h-2 w-2 -translate-x-1/2 rotate-45 rounded-[1px]"
                style={{ background: KIND_INK(k) }}
              />
            </span>
            {LONDON_ASSET_KIND_LABEL[k]}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-[11px] text-[#03002C]/75">
          <span className="block h-3 w-3 rounded-full border border-white bg-[#0F9D58]" />
          Position confirmed
        </li>
        {zoomed ? (
          <li className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-[#03002C]/50">
            View {view.z.toFixed(1)}× — press fit to reframe
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Small white mark inside a pin head, one shape per asset kind. */
function glyphClass(kind: LondonAssetKind): string {
  if (kind === "pillar" || kind === "table" || kind === "booth") return "h-1.5 w-1.5 rounded-full";
  if (kind === "door" || kind === "lift") return "h-1 w-2.5 rounded-[1px]";
  if (kind === "floor" || kind === "step-repeat") return "h-1.5 w-1.5 rotate-45 rounded-[1px]";
  return "h-1.5 w-1.5 [clip-path:polygon(50%_0,100%_100%,0_100%)]";
}

/** Kind chips used above the map. */
export function londonKindsPresent(
  panels: LondonPanel[],
  floor?: LondonFloorId,
): LondonAssetKind[] {
  const set = new Set<LondonAssetKind>();
  for (const p of panels) {
    if (floor && p.floor !== floor) continue;
    set.add(londonAssetKind(p));
  }
  return [...set];
}
