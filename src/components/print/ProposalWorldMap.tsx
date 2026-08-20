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

import { useState } from "react";
import {
  WORLD_MAP_LAND,
  WORLD_MAP_PINS,
  WORLD_MAP_VIEWBOX,
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

  const addPin = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!editable || !onChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_MAP_VIEWBOX;
    const y = ((event.clientY - rect.top) / rect.height) * WORLD_MAP_VIEWBOX;
    onChange([
      ...list,
      {
        id: `pin-${Date.now().toString(36)}`,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        r: 2.6,
        kind,
      },
    ]);
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg
        viewBox={`0 0 ${WORLD_MAP_VIEWBOX} ${WORLD_MAP_VIEWBOX}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="World map of TransPerfect office locations"
        onClick={addPin}
        style={{ display: "block", cursor: editable ? "crosshair" : "default" }}
      >
        {WORLD_MAP_LAND.map((path, i) => (
          <path key={`land-${i}`} d={path.d} fill="#FFFFFF" opacity={path.opacity} />
        ))}
        {list.map((pin, i) => (
          <circle
            key={pin.id ?? `pin-${i}`}
            cx={pin.x}
            cy={pin.y}
            r={pin.r ?? 2.3}
            fill={pinFill(pin.kind)}
            stroke="#FFFFFF"
            strokeWidth={0.2}
            style={{ cursor: editable ? "pointer" : "default" }}
            onClick={
              editable && onChange
                ? (event) => {
                    event.stopPropagation();
                    onChange(list.filter((_, index) => index !== i));
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
          data-export-ignore-chrome
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
          <span style={{ opacity: 0.6, fontWeight: 500 }}>· click a dot to delete</span>
        </div>
      ) : null}
    </div>
  );
}
