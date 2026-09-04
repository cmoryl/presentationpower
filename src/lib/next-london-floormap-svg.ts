// Top-down map artwork for the London signage kit.
//
// Two products, one geometry source (next-london-floorplan.ts):
//  1. `floorMapSvg` — the whole floor, every asset marked, used on screen and
//     printed as the floor's install plan.
//  2. `assetMapSvg`  — one asset called out on the same plan with its spec
//     block, so a single pillar wrap can be packed with its own location map.
//
// Visual language is a mall directory: a walkway ground with white tenant tiles
// floating on it, each tile carrying a coloured category bar and a label chip,
// and assets marked with dropped map pins. Everything is plain SVG built from the
// plan metres, so the same string drives screen, PNG and PDF.

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
const LINE = "#C9D5EA";
const PAPER = "#FFFFFF";
const WALKWAY = "#DCE4F0";
const FONT = "Geist, 'Geist Variable', Inter, Helvetica, Arial, sans-serif";

/** Screen pixels per plan metre. */
const PPM = 18;
const PAD = 34;
const HEAD = 84;
const LEGEND = 62;
/** Directory footer strip: venue credit line, drawn in the same face as the map. */
const FOOT = 40;

export type LondonZoneStyle = { fill: string; accent: string };

/**
 * Directory categories. Tenant-style tiles sit white on the walkway; circulation
 * and structure stay flat so the routes read as negative space.
 */
export const LONDON_ZONE_STYLE: Record<LondonZone["kind"], LondonZoneStyle> = {
  auditorium: { fill: "#FFFFFF", accent: "#003FC7" },
  room: { fill: "#FFFFFF", accent: "#1F7AE0" },
  foyer: { fill: "#FFFFFF", accent: "#0B7285" },
  circulation: { fill: "#E7EDF6", accent: "#9AA7BC" },
  core: { fill: "#E2E8F2", accent: "#5A6B85" },
  hospitality: { fill: "#FFFFFF", accent: "#FF9B70" },
  exhibition: { fill: "#FFFFFF", accent: "#7C5CFF" },
  terrace: { fill: "#EFF5F1", accent: "#0F9D58" },
  exterior: { fill: "#EFF3F9", accent: "#7A8699" },
};

/** One ink per asset kind so a crowded floor reads at a glance. */
export const LONDON_KIND_INK: Record<LondonAssetKind, string> = {
  wall: "#003FC7",
  banner: "#0B7285",
  set: "#5A3FC0",
  floor: "#C77C00",
  door: "#EC388A",
  lift: "#8A6BFF",
  table: "#0F9D58",
  pillar: "#03002C",
  "step-repeat": "#7C5CFF",
  stair: "#7A8699",
  booth: "#1F7AE0",
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
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type FloorMapSize = { w: number; h: number };

export function floorMapSize(plan: LondonFloorPlan): FloorMapSize {
  return {
    w: Math.round(plan.w * PPM + PAD * 2),
    h: Math.round(plan.h * PPM + PAD * 2 + HEAD + LEGEND + FOOT),
  };
}

/** Directory credit strip — same face and palette as the map, so print stays cohesive. */
function footerStrip(w: number, y: number, right: string): string {
  const left = `${LONDON_VENUE.venue} · Job ${LONDON_VENUE.job} · ${LONDON_VENUE.datesLabel}`;
  return `<g><path d="M ${PAD - 6} ${y} H ${w - PAD + 6}" stroke="${LINE}" stroke-width="1" />
<text x="${PAD - 2}" y="${y + 17}" font-family="${FONT}" font-size="9.5" letter-spacing="0.6" fill="${NAVY}" opacity="0.62">${esc(left)}</text>
<text x="${w - PAD + 2}" y="${y + 17}" text-anchor="end" font-family="${FONT}" font-size="9.5" letter-spacing="0.6" fill="${BLUE}" opacity="0.85">${esc(right)}</text>
<text x="${PAD - 2}" y="${y + 30}" font-family="${FONT}" font-size="8.5" fill="${NAVY}" opacity="0.42">Schematic install plan — confirm exact positions on site with the venue production partner.</text></g>`;
}

function defs(): string {
  return `<defs>
<filter id="ldn-tile" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="1.4" stdDeviation="1.8" flood-color="${NAVY}" flood-opacity="0.16" />
</filter>
<filter id="ldn-pin" x="-60%" y="-60%" width="220%" height="220%">
  <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="${NAVY}" flood-opacity="0.34" />
</filter>
<pattern id="ldn-walk" width="9" height="9" patternUnits="userSpaceOnUse">
  <rect width="9" height="9" fill="${WALKWAY}" />
  <path d="M0 9 L9 0" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1" />
</pattern>
</defs>`;
}

/** Marker glyph — a dropped map pin, shaped by asset kind inside the head. */
function markerGlyph(
  m: LondonMarker,
  cx: number,
  cy: number,
  active: boolean,
  /** Numbered print pins carry an index number instead of the kind glyph. */
  numbered = false,
): string {
  const ink = active ? "#EC388A" : (LONDON_KIND_INK[m.kind] ?? BLUE);
  const r = active ? 9.5 : numbered ? 8.5 : 7.5;
  const tail = r * 1.65;
  const body =
    `<path d="M ${cx} ${cy + tail} C ${cx - r * 0.75} ${cy + r * 0.7}, ${cx - r} ${cy + r * 0.35}, ${cx - r} ${cy} ` +
    `A ${r} ${r} 0 1 1 ${cx + r} ${cy} C ${cx + r} ${cy + r * 0.35}, ${cx + r * 0.75} ${cy + r * 0.7}, ${cx} ${cy + tail} Z" ` +
    `fill="${ink}" stroke="${PAPER}" stroke-width="${active ? 2 : 1.5}" filter="url(#ldn-pin)" />`;
  if (numbered) return body;
  const ir = r * 0.42;
  let core: string;
  if (m.kind === "pillar" || m.kind === "table" || m.kind === "booth") {
    core = `<circle cx="${cx}" cy="${cy}" r="${ir}" fill="${PAPER}" />`;
  } else if (m.kind === "door" || m.kind === "lift") {
    core = `<rect x="${cx - ir * 1.4}" y="${cy - ir * 0.6}" width="${ir * 2.8}" height="${ir * 1.2}" rx="0.6" fill="${PAPER}" />`;
  } else if (m.kind === "floor" || m.kind === "step-repeat") {
    core = `<rect x="${cx - ir}" y="${cy - ir}" width="${ir * 2}" height="${ir * 2}" transform="rotate(45 ${cx} ${cy})" fill="${PAPER}" />`;
  } else {
    core = `<polygon points="${cx},${cy - ir * 1.2} ${cx + ir * 1.1},${cy + ir * 0.85} ${cx - ir * 1.1},${cy + ir * 0.85}" fill="${PAPER}" />`;
  }
  return `${body}${core}`;
}

/** Directory index geometry — three columns of numbered entries. */
const INDEX_COLS = 3;
const INDEX_ROW = 14;

function indexHeight(count: number): number {
  if (!count) return 0;
  return 30 + Math.ceil(count / INDEX_COLS) * INDEX_ROW + 10;
}

function indexBlock(markers: LondonMarker[], x: number, y: number, w: number): string {
  if (!markers.length) return "";
  const rows = Math.ceil(markers.length / INDEX_COLS);
  const colW = w / INDEX_COLS;
  const head = `<text x="${x - 2}" y="${y}" font-family="${FONT}" font-size="9.5" letter-spacing="1.4" font-weight="700" fill="${BLUE}">ASSET INDEX</text>`;
  const entries = markers
    .map((m, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const cx = x - 2 + col * colW;
      const cy = y + 20 + row * INDEX_ROW;
      const max = Math.floor(colW / 5.3) - 6;
      const name = m.name.length > max ? `${m.name.slice(0, max - 1)}…` : m.name;
      return `<text x="${cx}" y="${cy}" font-family="${FONT}" font-size="9" font-weight="700" fill="${
        LONDON_KIND_INK[m.kind] ?? BLUE
      }">${i + 1}</text><text x="${cx + 18}" y="${cy}" font-family="${FONT}" font-size="9" fill="${NAVY}" opacity="0.78">${esc(
        name,
      )}</text>`;
    })
    .join("");
  return `<g>${head}${entries}</g>`;
}

function legendRow(kinds: LondonAssetKind[], x: number, y: number, w: number): string {
  const per = Math.max(120, w / Math.max(1, kinds.length));
  return kinds
    .map((k, i) => {
      const cx = x + per * i + 8;
      const glyph = markerGlyph({ kind: k } as LondonMarker, cx, y - 2, false);
      return `${glyph}<text x="${cx + 13}" y="${y + 4}" font-family="${FONT}" font-size="11" fill="${NAVY}" opacity="0.72">${esc(
        LONDON_ASSET_KIND_LABEL[k],
      )}</text>`;
    })
    .join("");
}

function planBody(plan: LondonFloorPlan, ox: number, oy: number): string {
  const ground = `<rect x="${ox - 6}" y="${oy - 6}" width="${plan.w * PPM + 12}" height="${
    plan.h * PPM + 12
  }" rx="12" fill="url(#ldn-walk)" stroke="${LINE}" stroke-width="1.25" />`;

  const zones = plan.zones
    .map((z) => {
      const style = LONDON_ZONE_STYLE[z.kind];
      const inset = 1.6;
      const x = ox + z.x * PPM + inset;
      const y = oy + z.y * PPM + inset;
      const w = Math.max(6, z.w * PPM - inset * 2);
      const h = Math.max(6, z.h * PPM - inset * 2);
      const bar = Math.min(5, w * 0.12);
      const tile =
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${style.fill}" stroke="${LINE}" stroke-width="1" filter="url(#ldn-tile)" />` +
        `<path d="M ${x} ${y + 7} a 7 7 0 0 1 7 -7 h ${bar} v ${h} h -${bar} a 7 7 0 0 1 -7 -7 Z" fill="${style.accent}" opacity="0.9" />`;
      const label =
        h > 22
          ? `<text x="${x + bar + 14}" y="${y + 17}" font-family="${FONT}" font-size="10.5" font-weight="700" letter-spacing="1" fill="${NAVY}" opacity="0.85">${esc(
              z.label.toUpperCase(),
            )}</text>`
          : "";

      const dims =
        h > 40 && w > 96
          ? `<text x="${x + w - 7}" y="${y + h - 7}" text-anchor="end" font-family="${FONT}" font-size="9" fill="${NAVY}" opacity="0.4">${z.w.toFixed(
              1,
            )} × ${z.h.toFixed(1)} m</text>`
          : "";
      return `<g>${tile}${label}${dims}</g>`;
    })
    .join("");

  const entries = plan.entries
    .map((e) => {
      const x = ox + e.x * PPM;
      const y = oy + e.y * PPM;
      const tw = Math.max(46, esc(e.label).length * 6 + 16);
      return `<g><rect x="${x - tw / 2}" y="${y - 9}" width="${tw}" height="18" rx="9" fill="${NAVY}" /><text x="${x}" y="${
        y + 4
      }" text-anchor="middle" font-family="${FONT}" font-size="9.5" font-weight="700" letter-spacing="0.8" fill="${PAPER}">${esc(
        e.label.toUpperCase(),
      )}</text></g>`;
    })
    .join("");

  return `${ground}${zones}${entries}`;
}

function scaleBar(x: number, y: number): string {
  const len = 5 * PPM;
  const half = len / 2;
  return `<g><rect x="${x}" y="${y - 4}" width="${half}" height="7" fill="${NAVY}" /><rect x="${
    x + half
  }" y="${y - 4}" width="${half}" height="7" fill="${PAPER}" stroke="${NAVY}" stroke-width="1" /><text x="${
    x + len + 8
  }" y="${y + 4}" font-family="${FONT}" font-size="10.5" fill="${NAVY}" opacity="0.7">5 m (schematic)</text></g>`;
}

function northArrow(x: number, y: number): string {
  return `<g><circle cx="${x}" cy="${y}" r="16" fill="${PAPER}" stroke="${LINE}" stroke-width="1.25" /><polygon points="${x},${
    y - 11
  } ${x + 5.5},${y + 4} ${x},${y + 1} ${x - 5.5},${y + 4}" fill="${NAVY}" /><text x="${x}" y="${
    y + 13
  }" text-anchor="middle" font-family="${FONT}" font-size="8" font-weight="700" letter-spacing="0.6" fill="${NAVY}">N</text></g>`;
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
  /** Right-hand credit in the footer strip; pass null to suppress the strip. */
  footerNote?: string | null;
};

/** Everything inside the <svg> wrapper, so the asset card can reuse it. */
function floorMapContent(floor: LondonFloorId, opts: FloorMapOptions, size: FloorMapSize): string {
  const plan = londonFloorPlan(floor);
  if (!plan) return "";
  const ox = PAD;
  const oy = PAD + HEAD;
  const all = londonFloorMarkers(floor, opts.panels, opts.overrides);
  const markers = opts.kinds?.length ? all.filter((m) => opts.kinds!.includes(m.kind)) : all;

  // Print sheets number the pins and list them in a directory index instead of
  // printing names on the plan, where a dense pillar run would overlap itself.
  const numbered = opts.labels === true;
  const indexH = numbered ? indexHeight(markers.length) : 0;

  const pins = markers
    .map((m, i) => {
      const cx = ox + m.x * PPM;
      const cy = oy + m.y * PPM;
      const active = m.panelId === opts.activePanelId;
      const badge = numbered
        ? `<text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="${FONT}" font-size="8.5" font-weight="700" fill="${PAPER}">${i + 1}</text>`
        : "";
      return `<g data-panel="${esc(m.panelId)}">${markerGlyph(m, cx, cy, active, numbered)}${badge}</g>`;
    })
    .join("");

  const kinds = KIND_ORDER.filter((k) => markers.some((m) => m.kind === k));
  const legendY = size.h - FOOT - indexH - LEGEND;

  return `${defs()}
<g>
<rect x="${PAD - 6}" y="${PAD - 18}" width="${size.w - (PAD - 6) * 2}" height="${HEAD - 4}" rx="12" fill="#F5F8FD" stroke="${LINE}" stroke-width="1" />
<text x="${PAD + 8}" y="${PAD + 2}" font-family="${FONT}" font-size="10" letter-spacing="1.8" font-weight="700" fill="${BLUE}">TRANSPERFECT NEXT 2026 · DIRECTORY</text>
<text x="${PAD + 8}" y="${PAD + 30}" font-family="${FONT}" font-size="23" font-weight="700" fill="${NAVY}">${esc(plan.label)}</text>
<text x="${PAD + 8}" y="${PAD + 50}" font-family="${FONT}" font-size="11.5" fill="${NAVY}" opacity="0.7">${esc(
    `${LONDON_VENUE.name} · ${markers.length} asset${markers.length === 1 ? "" : "s"} · ${plan.orientation}`,
  )}</text>
${northArrow(size.w - PAD - 8, PAD + 22)}
</g>
${planBody(plan, ox, oy)}
${pins}
${scaleBar(PAD, legendY + 6)}
${legendRow(kinds, PAD, legendY + 34, size.w - PAD * 2)}
${numbered ? indexBlock(markers, PAD, size.h - FOOT - indexH + 14, size.w - PAD * 2) : ""}
${
  opts.footerNote === null
    ? ""
    : footerStrip(size.w, size.h - FOOT + 2, opts.footerNote ?? `${plan.label} · install plan`)
}`;
}

/**
 * Sheet size for a floor. Print sheets (`labels: true`) grow by the numbered
 * asset index, so exports must size the raster from here, not from the plan.
 */
export function floorMapSheetSize(floor: LondonFloorId, opts: FloorMapOptions = {}): FloorMapSize {
  const plan = londonFloorPlan(floor);
  if (!plan) return { w: 0, h: 0 };
  const size = floorMapSize(plan);
  if (opts.labels !== true) return size;
  const all = londonFloorMarkers(floor, opts.panels, opts.overrides);
  const markers = opts.kinds?.length ? all.filter((m) => opts.kinds!.includes(m.kind)) : all;
  return { w: size.w, h: size.h + indexHeight(markers.length) };
}

/** The whole floor with every asset marked. */
export function floorMapSvg(floor: LondonFloorId, opts: FloorMapOptions = {}): string {
  const plan = londonFloorPlan(floor);
  if (!plan) return "";
  const size = floorMapSheetSize(floor, opts);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}" role="img" aria-label="${esc(
    `${plan.label} install map — ${LONDON_VENUE.name}`,
  )}">
<rect width="${size.w}" height="${size.h}" fill="${PAPER}" />
${floorMapContent(floor, opts, size)}
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
    londonFloorMarkers(panel.floor, opts.panels, opts.overrides).find(
      (m) => m.panelId === panel.id,
    ) ?? null;
  const size = floorMapSize(plan);
  const specH = 106;
  const w = size.w;
  /** Map block ends where the (suppressed) floor footer would have started. */
  const base = size.h - FOOT;
  const h = base + specH + FOOT;
  const zone = marker ? plan.zones.find((z) => z.id === marker.zoneId) : null;

  const body = floorMapContent(
    panel.floor,
    { ...opts, activePanelId: panel.id, footerNote: null },
    size,
  );

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
      const x = PAD + 10 + col * ((w - PAD * 2 - 20) / 3);
      const y = base + 30 + row * 34;
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
<rect x="${PAD - 6}" y="${base + 6}" width="${w - (PAD - 6) * 2}" height="${specH - 16}" rx="12" fill="#F5F8FD" stroke="${LINE}" stroke-width="1" />
${specBlock}
${footerStrip(w, base + specH, `Install card · ${panel.name}`)}
</svg>`;
}
