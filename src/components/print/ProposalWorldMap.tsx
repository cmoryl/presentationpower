/**
 * Editable vector world map for the Solution Proposal "Global locations" page.
 *
 * The source template shipped the map as a flat SVG image, so office dots could
 * not be authored. Here the artwork is split in two: the landmass paths are
 * static, and every office dot is data (`WorldMapPin[]`) rendered as a real
 * vector circle. In the editor the map becomes a canvas — click empty ocean or
 * land to drop a pin, click a pin to remove it — and the whole thing stays
 * vector for PDF/print output.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  WORLD_MAP_LAND,
  WORLD_MAP_PINS,
  WORLD_MAP_VIEW,
  type WorldMapPin,
  type WorldMapPinKind,
} from "@/lib/print-library/world-map-vector";

const TEAL = "#3BBEB6";
const SERVICE = "#139DD8";

export function pinFill(kind: WorldMapPinKind) {
  return kind === "prod" ? TEAL : SERVICE;
}

export function defaultWorldMapPins(): WorldMapPin[] {
  return WORLD_MAP_PINS;
}

/**
 * Export-safe pin zone.
 *
 * A dot dropped at the very edge of the map box gets cut in half in PDF/PPTX
 * output, and the page header's hairline rule sits just above the map, so the
 * top edge needs extra clearance. Both limits live here in map user units and
 * are enforced on every add and drag.
 */
const PIN_INSET = 6; // keeps the whole dot (r ~2.6) inside the frame
const TOP_CLEARANCE = 12; // breathing room under the page header rule

export function clampPinPoint(x: number, y: number) {
  const nx = Math.min(
    WORLD_MAP_VIEW.x + WORLD_MAP_VIEW.w - PIN_INSET,
    Math.max(WORLD_MAP_VIEW.x + PIN_INSET, x),
  );
  const ny = Math.min(
    WORLD_MAP_VIEW.y + WORLD_MAP_VIEW.h - PIN_INSET,
    Math.max(WORLD_MAP_VIEW.y + TOP_CLEARANCE, y),
  );
  return { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 };
}



export function ProposalWorldMap({
  pins,
  editable = false,
  onChange,
}: {
  pins?: WorldMapPin[];
  editable?: boolean;
  onChange?: (next: WorldMapPin[]) => void;
}) {
  const list = pins?.length ? pins : WORLD_MAP_PINS;
  const [kind, setKind] = useState<WorldMapPinKind>("prod");

  // Zoom/pan is a pure view-box transform: the map element keeps the exact same
  // box on the page, so page layout and print geometry never change.
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({
    x: WORLD_MAP_VIEW.x + WORLD_MAP_VIEW.w / 2,
    y: WORLD_MAP_VIEW.y + WORLD_MAP_VIEW.h / 2,
  });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragMoved = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Pin drag: index of the dot being repositioned + whether it actually moved
  // (a click without movement still means "delete this pin").
  const pinDrag = useRef<{ index: number; moved: boolean } | null>(null);
  const pinDragStart = useRef<WorldMapPin[] | null>(null);
  const [activePin, setActivePin] = useState<number | null>(null);

  // Undo/redo history for pin edits. Each committed edit (add, delete, or a
  // finished drag) pushes the previous pin array; intermediate drag frames are
  // deliberately not recorded so one drag = one undo step.
  const [past, setPast] = useState<WorldMapPin[][]>([]);
  const [future, setFuture] = useState<WorldMapPin[][]>([]);

  const commit = (next: WorldMapPin[], previous: WorldMapPin[] = list) => {
    if (!onChange) return;
    setPast((p) => [...p, previous].slice(-50));
    setFuture([]);
    onChange(next);
  };

  const undo = useCallback(() => {
    if (!onChange || !past.length) return;
    const prev = past[past.length - 1]!;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [list, ...f].slice(0, 50));
    onChange(prev);
  }, [list, onChange, past]);

  const redo = useCallback(() => {
    if (!onChange || !future.length) return;
    const next = future[0]!;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, list].slice(-50));
    onChange(next);
  }, [future, list, onChange]);

  useEffect(() => {
    if (!editable || !onChange) return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, onChange, redo, undo]);


  const w = WORLD_MAP_VIEW.w / zoom;
  const h = WORLD_MAP_VIEW.h / zoom;
  const clampCenter = (cx: number, cy: number, vw: number, vh: number) => ({
    x: Math.min(
      WORLD_MAP_VIEW.x + WORLD_MAP_VIEW.w - vw / 2,
      Math.max(WORLD_MAP_VIEW.x + vw / 2, cx),
    ),
    y: Math.min(
      WORLD_MAP_VIEW.y + WORLD_MAP_VIEW.h - vh / 2,
      Math.max(WORLD_MAP_VIEW.y + vh / 2, cy),
    ),
  });
  const safeCenter = clampCenter(center.x, center.y, w, h);
  const view = { x: safeCenter.x - w / 2, y: safeCenter.y - h / 2, w, h };

  const setZoomLevel = (next: number) => {
    const z = Math.min(6, Math.max(1, Math.round(next * 100) / 100));
    setZoom(z);
    setCenter((c) =>
      clampCenter(c.x, c.y, WORLD_MAP_VIEW.w / z, WORLD_MAP_VIEW.h / z),
    );
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (zoom <= 1) return;
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const toMapPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return clampPinPoint(
      view.x + ((clientX - rect.left) / rect.width) * view.w,
      view.y + ((clientY - rect.top) / rect.height) * view.h,
    );
  };


  const startPinDrag = (index: number) => (event: React.PointerEvent<SVGCircleElement>) => {
    if (!editable || !onChange) return;
    event.stopPropagation();
    pinDrag.current = { index, moved: false };
    pinDragStart.current = list;
    setActivePin(index);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const p = pinDrag.current;
    if (p && onChange) {
      const point = toMapPoint(event.clientX, event.clientY);
      if (!point) return;
      p.moved = true;
      onChange(
        list.map((pin, index) =>
          index === p.index ? { ...pin, x: point.x, y: point.y } : pin,
        ),
      );
      return;
    }
    const d = drag.current;
    if (!d) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = ((event.clientX - d.x) / rect.width) * view.w;
    const dy = ((event.clientY - d.y) / rect.height) * view.h;
    if (Math.abs(event.clientX - d.x) > 2 || Math.abs(event.clientY - d.y) > 2) d.moved = true;
    drag.current = { x: event.clientX, y: event.clientY, moved: d.moved };
    setCenter((c) => clampCenter(c.x - dx, c.y - dy, view.w, view.h));
  };

  const onPointerUp = () => {
    if (pinDrag.current) {
      const { moved } = pinDrag.current;
      dragMoved.current = moved;
      if (moved && pinDragStart.current) {
        setPast((p) => [...p, pinDragStart.current!].slice(-50));
        setFuture([]);
      }
      pinDrag.current = null;
      pinDragStart.current = null;
      setActivePin(null);
      return;
    }
    dragMoved.current = Boolean(drag.current?.moved);
    drag.current = null;
  };

  const addPin = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!editable || !onChange) return;
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }

    const point = toMapPoint(event.clientX, event.clientY);
    if (!point) return;
    commit([
      ...list,
      {
        id: `pin-${Date.now().toString(36)}`,
        x: point.x,
        y: point.y,
        r: 2.6,
        kind,
      },
    ]);

  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="World map of TransPerfect office locations"
        onClick={addPin}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          display: "block",
          touchAction: "none",
          cursor: activePin !== null ? "grabbing" : zoom > 1 ? "grab" : editable ? "crosshair" : "default",
        }}
      >
        {WORLD_MAP_LAND.map((path, i) => (
          <path key={`land-${i}`} d={path.d} fill="#FFFFFF" opacity={path.opacity} />
        ))}
        {/* Authoring-only guide: the export-safe pin zone. Never captured. */}
        {editable && onChange ? (
          <g data-export-ignore="true" fill="none" stroke="#A1FBF9" strokeDasharray="3 3">
            <rect
              x={WORLD_MAP_VIEW.x + PIN_INSET}
              y={WORLD_MAP_VIEW.y + TOP_CLEARANCE}
              width={WORLD_MAP_VIEW.w - PIN_INSET * 2}
              height={WORLD_MAP_VIEW.h - TOP_CLEARANCE - PIN_INSET}
              strokeWidth={0.6}
              opacity={activePin !== null ? 0.5 : 0.22}
            />
          </g>
        ) : null}


        {list.map((pin, i) => (
          <circle
            key={pin.id ?? `pin-${i}`}
            cx={pin.x}
            cy={pin.y}
            r={(pin.r ?? 2.3) * (activePin === i ? 1.35 : 1)}
            fill={pinFill(pin.kind)}
            stroke="#FFFFFF"
            strokeWidth={activePin === i ? 0.5 : 0.2}
            style={{ cursor: editable ? (activePin === i ? "grabbing" : "grab") : "default" }}
            onPointerDown={editable && onChange ? startPinDrag(i) : undefined}
            onClick={
              editable && onChange
                ? (event) => {
                    event.stopPropagation();
                    if (dragMoved.current) {
                      dragMoved.current = false;
                      return;
                    }
                    commit(list.filter((_, index) => index !== i));
                  }
                : undefined
            }
          >
            {pin.name ? <title>{pin.name}</title> : null}
          </circle>

        ))}
      </svg>

      {editable && onChange ? (
        <div
          data-export-ignore="true"
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            padding: 4,
            boxShadow: "0 1px 4px rgba(3,0,44,0.25)",
          }}
        >
          <button
            type="button"
            aria-label="Undo pin change"
            title="Undo pin change (⌘Z)"
            onClick={undo}
            disabled={!past.length}
            style={{ ...zoomBtn(!past.length), width: "auto", padding: "0 8px", fontSize: 10 }}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            aria-label="Redo pin change"
            title="Redo pin change (⇧⌘Z)"
            onClick={redo}
            disabled={!future.length}
            style={{ ...zoomBtn(!future.length), width: "auto", padding: "0 8px", fontSize: 10 }}
          >
            Redo ↷
          </button>
        </div>
      ) : null}


      {/* Zoom is an authoring aid only — never shown on a read-only page. */}
      {editable ? (
      <div
        data-export-ignore="true"
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          display: "flex",
          alignItems: "center",
          gap: 4,
          borderRadius: 999,
          background: "rgba(255,255,255,0.92)",
          padding: 4,
          boxShadow: "0 1px 4px rgba(3,0,44,0.25)",
        }}
      >
        <button
          type="button"
          aria-label="Zoom out map"
          onClick={() => setZoomLevel(zoom / 1.4)}
          disabled={zoom <= 1}
          style={zoomBtn(zoom <= 1)}
        >
          −
        </button>
        <span
          style={{ minWidth: 34, textAlign: "center", fontSize: 10, fontWeight: 700, color: "#03002C" }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in map"
          onClick={() => setZoomLevel(zoom * 1.4)}
          disabled={zoom >= 6}
          style={zoomBtn(zoom >= 6)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Reset map zoom"
          onClick={() => {
            setZoom(1);
            setCenter({
              x: WORLD_MAP_VIEW.x + WORLD_MAP_VIEW.w / 2,
              y: WORLD_MAP_VIEW.y + WORLD_MAP_VIEW.h / 2,
            });
          }}
          disabled={zoom === 1}
          style={{ ...zoomBtn(zoom === 1), width: "auto", padding: "0 8px", fontSize: 10 }}
        >
          Reset
        </button>
      </div>

      {editable && onChange ? (
        <div
          data-export-ignore="true"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            padding: "4px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "#03002C",
            boxShadow: "0 1px 4px rgba(3,0,44,0.25)",
          }}
        >
          <span>Add:</span>
          {(["prod", "service"] as WorldMapPinKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 999,
                border: `1px solid ${kind === k ? "#003FC7" : "rgba(3,0,44,0.2)"}`,
                background: kind === k ? "rgba(0,63,199,0.08)" : "transparent",
                padding: "2px 6px",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: pinFill(k),
                  display: "inline-block",
                }}
              />
              {k === "prod" ? "Service & production" : "Client service"}
            </button>
          ))}
          <span style={{ opacity: 0.6, fontWeight: 500 }}>· drag a dot to move, click to delete</span>
        </div>
      ) : null}
    </div>
  );
}

function zoomBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "1px solid rgba(3,0,44,0.18)",
    background: disabled ? "rgba(3,0,44,0.04)" : "#FFFFFF",
    color: "#03002C",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
  };
}
