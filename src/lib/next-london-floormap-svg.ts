// Top-down map artwork for the London signage kit.
//
// Two products, one geometry source (next-london-floorplan.ts):
//  1. `floorMapSvg` — the whole floor, every asset marked, used on screen and
//     printed as the floor's install plan.
//  2. `assetMapSvg`  — one asset called out on the same plan with its spec
//     block, so a single pillar wrap can be packed with its own location map.
//
// Everything is plain SVG built from the plan metres, so the same string is used
// for the on-screen map, the PNG raster and the PDF page.

import {
  LONDON_ASSET_KIND_LABEL,
  LONDON_FACE_LABEL,
  londonFloorMarkers,
  londonFloorPlan,
  type LondonAssetKind,
  type LondonFloorPlan,
  type LondonMarker,
  type LondonMarkerOverrides,
  type LondonZone,
} from "@/lib/next-london-floorplan";
import { LONDON_VENUE, type LondonFloorId, type LondonPanel } from "@/lib/next-london-signage";

const NAVY = "#03002C";
const BLUE = "#003FC7";
const AQUA = "#A1FBF9";
const LINE = "#C9D5EA";
const PAPER = "#FFFFFF";
const FONT = "Geist, 'Geist Variable', Inter, Helvetica, Arial, sans-serif";

/** Screen pixels per plan metre. */
const PPM = 18;
const PAD = 34;
const HEAD = 74;
const LEGEND = 58;

const ZONE_FILL: Record<LondonZone["kind"], string> = {
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

const KIND_ORDER: LondonAssetKind[] = [
  "pillar",
  "door",
  "wall",
  "banner",
  "set",
  "floor",
  "lift",
  "stair",
  "booth",
  "table",
  "step-repeat",
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type FloorMapSize = { w: number; h: number };

export function floorMapSize(plan: LondonFloorPlan): FloorMapSize {
  return {
    w: Math.round(plan.w * PPM + PAD * 2),
    h: Math.round(plan.h * PPM + PAD * 2 + HEAD + LEGEND),
  };
}

/** Marker glyph — shape carries the asset kind so the map reads without colour. */
function markerGlyph(m: LondonMarker, cx: number, cy: number, active: boolean): string {
  const r = active ? 9 : 6.5;
  const fill = active ? "#EC388A" : BLUE;
  const stroke = active ? "#8f0f47" : NAVY;
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${active ? 2 : 1}"`;
  if (m.kind === "pillar" || m.kind === "table" || m.kind === "booth") {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" ${common} />`;
  }
  if (m.kind === "door" || m.kind === "lift") {
    return `<rect x="${cx - r}" y="${cy - r * 0.55}" width="${r * 2}" height="${r * 1.1}" rx="1.5" ${common} />`;
  }
  if (m.kind === "floor") {
    return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="2" transform="rotate(45 ${cx} ${cy})" ${common} />`;
  }
  const p = `${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}`;
  return `<polygon points="${p}" ${common} />`;
}

function legendRow(kinds: LondonAssetKind[], x: number, y: number, w: number): string {
  const per = Math.max(120, w / Math.max(1, kinds.length));
  return kinds
    .map((k, i) => {
      const cx = x + per * i + 8;
      const glyph = markerGlyph(
        { kind: k } as LondonMarker,
        cx,
        y,
        false,
      );
      return `${glyph}<text x="${cx + 12}" y="${y + 4}" font-family="${FONT}" font-size="11" fill="${NAVY}" opacity="0.72">${esc(
        LONDON_ASSET_KIND_LABEL[k],
      )}</text>`;
    })
    .join("");
}

function planBody(plan: LondonFloorPlan, ox: number, oy: number): string {
  const zones = plan.zones
    .map((z) => {
      const x = ox + z.x * PPM;
      const y = oy + z.y * PPM;
      const w = z.w * PPM;
      const h = z.h * PPM;
      return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${
        ZONE_FILL[z.kind]
      }" stroke="${LINE}" stroke-width="1.25" /><text x="${x + 8}" y="${y + 16}" font-family="${FONT}" font-size="11.5" font-weight="600" fill="${NAVY}" opacity="0.78">${esc(
        z.label,
      )}</text></g>`;
    })
    .join("");

  const entries = plan.entries
    .map((e) => {
      const x = ox + e.x * PPM;
      const y = oy + e.y * PPM;
      return `<g><polygon points="${x},${y - 9} ${x + 7},${y + 3} ${x - 7},${y + 3}" fill="${AQUA}" stroke="${NAVY}" stroke-width="1" /><text x="${x}" y="${
        y + 16
      }" text-anchor="middle" font-family="${FONT}" font-size="10" fill="${NAVY}" opacity="0.7">${esc(e.label)}</text></g>`;
    })
    .join("");

  return `${zones}${entries}`;
}

function scaleBar(x: number, y: number): string {
  const len = 5 * PPM;
  return `<g><line x1="${x}" y1="${y}" x2="${x + len}" y2="${y}" stroke="${NAVY}" stroke-width="1.5" /><line x1="${x}" y1="${
    y - 4
  }" x2="${x}" y2="${y + 4}" stroke="${NAVY}" stroke-width="1.5" /><line x1="${x + len}" y1="${y - 4}" x2="${
    x + len
  }" y2="${y + 4}" stroke="${NAVY}" stroke-width="1.5" /><text x="${x + len + 8}" y="${
    y + 4
  }" font-family="${FONT}" font-size="10.5" fill="${NAVY}" opacity="0.7">5 m (schematic)</text></g>`;
}

function northArrow(x: number, y: number): string {
  return `<g><polygon points="${x},${y - 14} ${x + 6},${y + 4} ${x - 6},${y + 4}" fill="${NAVY}" /><text x="${x}" y="${
    y + 17
  }" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="${NAVY}">N</text></g>`;
}

export type FloorMapOptions = {
  panels?: LondonPanel[];
  overrides?: LondonMarkerOverrides;
  /** Only draw these asset kinds. */
  kinds?: LondonAssetKind[];
  /** Panel id drawn as the active pin. */
  activePanelId?: string;
  /** Print labels next to every marker. */
  labels?: boolean;
};

/** The whole floor with every asset marked. */
export function floorMapSvg(floor: LondonFloorId, opts: FloorMapOptions = {}): string {
  const plan = londonFloorPlan(floor);
  if (!plan) return "";
  const size = floorMapSize(plan);
  const ox = PAD;
  const oy = PAD + HEAD;
  const all = londonFloorMarkers(floor, opts.panels, opts.overrides);
  const markers = opts.kinds?.length ? all.filter((m) => opts.kinds!.includes(m.kind)) : all;

  const pins = markers
    .map((m) => {
      const cx = ox + m.x * PPM;
      const cy = oy + m.y * PPM;
      const active = m.panelId === opts.activePanelId;
      const label = opts.labels
        ? `<text x="${cx + 11}" y="${cy + 3.5}" font-family="${FONT}" font-size="9.5" fill="${NAVY}" opacity="0.8">${esc(
            m.name.length > 34 ? `${m.name.slice(0, 33)}…` : m.name,
          )}</text>`
        : "";
      return `<g data-panel="${esc(m.panelId)}">${markerGlyph(m, cx, cy, active)}${label}</g>`;
    })
    .join("");

  const kinds = KIND_ORDER.filter((k) => markers.some((m) => m.kind === k));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}" role="img" aria-label="${esc(
    `${plan.label} install map — ${LONDON_VENUE.name}`,
  )}">
<rect width="${size.w}" height="${size.h}" fill="${PAPER}" />
<text x="${PAD}" y="${PAD + 4}" font-family="${FONT}" font-size="10.5" letter-spacing="1.6" fill="${BLUE}">TRANSPERFECT NEXT 2026 · LOCATION MAP</text>
<text x="${PAD}" y="${PAD + 30}" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}">${esc(plan.label)}</text>
<text x="${PAD}" y="${PAD + 50}" font-family="${FONT}" font-size="11.5" fill="${NAVY}" opacity="0.7">${esc(
    `${LONDON_VENUE.name} · ${markers.length} asset${markers.length === 1 ? "" : "s"} · ${plan.orientation}`,
  )}</text>
${northArrow(size.w - PAD - 14, PAD + 24)}
${planBody(plan, ox, oy)}
${pins}
${scaleBar(PAD, size.h - LEGEND + 4)}
${legendRow(kinds, PAD, size.h - LEGEND + 32, size.w - PAD * 2)}
</svg>`;
}

/** Install card for one asset: the plan, its pin, and the spec it prints to. */
export function assetMapSvg(
  panel: LondonPanel,
  opts: { panels?: LondonPanel[]; overrides?: LondonMarkerOverrides } = {},
): string {
  const plan = londonFloorPlan(panel.floor);
  if (!plan) return "";
  const marker =
    londonFloorMarkers(panel.floor, opts.panels, opts.overrides).find((m) => m.panelId === panel.id) ??
    null;
  const size = floorMapSize(plan);
  const specH = 96;
  const w = size.w;
  const h = size.h + specH;
  const zone = marker ? plan.zones.find((z) => z.id === marker.zoneId) : null;

  const body = floorMapSvg(panel.floor, {
    ...opts,
    activePanelId: panel.id,
  })
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/<rect width="\d+" height="\d+" fill="#FFFFFF" \/>/, "");

  const specs: [string, string][] = [
    ["Asset", panel.name],
    ["Floor · zone", `${plan.label} · ${zone?.label ?? "—"}`],
    ["Room on schedule", panel.room],
    ["Trim", `${panel.trimW} × ${panel.trimH} mm`],
    ["Bleed", `${panel.bleedEdge} mm per edge`],
    ["Orientation", marker ? LONDON_FACE_LABEL[marker.face] : "—"],
  ];

  const specBlock = specs
    .map(([k, v], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = PAD + col * ((w - PAD * 2) / 3);
      const y = size.h + 26 + row * 34;
      return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="9.5" letter-spacing="1.2" fill="${NAVY}" opacity="0.55">${esc(
        k.toUpperCase(),
      )}</text><text x="${x}" y="${y + 15}" font-family="${FONT}" font-size="12.5" font-weight="600" fill="${NAVY}">${esc(
        v.length > 42 ? `${v.slice(0, 41)}…` : v,
      )}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(
    `Install location map for ${panel.name}`,
  )}">
<rect width="${w}" height="${h}" fill="${PAPER}" />
${body}
<line x1="${PAD}" y1="${size.h + 2}" x2="${w - PAD}" y2="${size.h + 2}" stroke="${LINE}" stroke-width="1" />
${specBlock}
</svg>`;
}
