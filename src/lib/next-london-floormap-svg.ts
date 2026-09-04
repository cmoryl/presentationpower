// Top-down map artwork for the London signage kit.
//
// Two products, one geometry source (next-london-floorplan.ts):
//  1. `floorMapSvg` — the whole floor, every asset marked, used on screen and
//     printed as the floor's install plan.
//  2. `assetMapSvg`  — one asset called out on the same plan with its spec
//     block, so a single pillar wrap can be packed with its own location map.
//
// Visual language: an architectural directory sheet. Flat walkway ground with a
// quiet metre grid, crisp white room tiles carrying a category bar and a small
// label, assets marked with dropped pins, and a measured chrome band (eyebrow,
// title, scale, north point, legend, credit rule) sized in whole pixels so the
// same string prints identically to SVG, PNG and PDF.

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
import {
  DEFAULT_MAP_DESIGN,
  kindInkFor,
  mapPalette,
  zoneStyleFor,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import { LONDON_VENUE, type LondonFloorId, type LondonPanel } from "@/lib/next-london-signage";

// Live drawing palette. Rendering one sheet is synchronous and single threaded,
// so the design in force is swapped in for the duration of a build and restored
// afterwards — every helper below therefore draws in the requested style without
// threading a palette argument through a dozen signatures.
let DESIGN: MapDesign = DEFAULT_MAP_DESIGN;
let NAVY = "#03002C";
let BLUE = "#003FC7";
let LINE = "#D3DCEA";
let HAIR = "#E4EAF3";
let PAPER = "#FFFFFF";
let WALKWAY = "#EDF1F7";
let GRIDINK = "#FFFFFF";
let TILE = "#FFFFFF";
const FONT = "Geist, 'Geist Variable', Inter, Helvetica, Arial, sans-serif";

/** Screen pixels per plan metre. */
let PPM = 18;
let PAD = 40;
const HEAD = 96;
const LEGEND = 66;
/** Directory footer strip: venue credit line, drawn in the same face as the map. */
const FOOT = 44;

/** Install the design for one synchronous build; call the result to restore. */
function applyDesign(design?: MapDesign): () => void {
  const prev = DESIGN;
  const set = (d: MapDesign) => {
    const pal = mapPalette(d);
    DESIGN = d;
    NAVY = pal.ink;
    BLUE = pal.accent;
    LINE = pal.line;
    HAIR = pal.hair;
    PAPER = pal.paper;
    WALKWAY = pal.walkway;
    GRIDINK = pal.grid;
    TILE = pal.tile;
    PPM = Math.max(6, Math.min(48, d.ppm));
    PAD = Math.max(12, Math.min(120, d.margin));
  };
  set(design ?? DEFAULT_MAP_DESIGN);
  return () => set(prev);
}

export type LondonZoneStyle = { fill: string; accent: string };

/**
 * Directory categories, in the default design. Kept for callers that need the
 * static palette (the interactive map reads the design-aware helpers instead).
 */
export const LONDON_ZONE_STYLE: Record<LondonZone["kind"], LondonZoneStyle> = {
  auditorium: { fill: "#FFFFFF", accent: "#003FC7" },
  room: { fill: "#FFFFFF", accent: "#2C6FD1" },
  foyer: { fill: "#FFFFFF", accent: "#0E7C8C" },
  circulation: { fill: "#E6EBF4", accent: "#A6B1C4" },
  core: { fill: "#DFE5EF", accent: "#6C7B92" },
  hospitality: { fill: "#FFFFFF", accent: "#D2733F" },
  exhibition: { fill: "#FFFFFF", accent: "#6A54C9" },
  terrace: { fill: "#EEF4EF", accent: "#2E8B57" },
  exterior: { fill: "#EDF1F7", accent: "#8593A8" },
};

/** One ink per asset kind so a crowded floor reads at a glance. */
export const LONDON_KIND_INK: Record<LondonAssetKind, string> = {
  wall: "#003FC7",
  banner: "#0E7C8C",
  set: "#5A3FC0",
  floor: "#B27000",
  door: "#C4306E",
  lift: "#7358E0",
  table: "#2E8B57",
  pillar: "#03002C",
  "step-repeat": "#6A54C9",
  stair: "#6C7B92",
  booth: "#2C6FD1",
};

/** Marker ink under the design currently being drawn. */
function inkFor(kind: LondonAssetKind): string {
  return kindInkFor(kind, DESIGN);
}

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

/** Rounded to 2 dp so the emitted markup stays tidy and diffable. */
function n(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export type FloorMapSize = { w: number; h: number };

export function floorMapSize(plan: LondonFloorPlan): FloorMapSize {
  return {
    w: Math.round(plan.w * PPM + PAD * 2),
    h: Math.round(plan.h * PPM + PAD * 2 + HEAD + LEGEND + FOOT),
  };
}

/** Small caps label used across the chrome. */
function eyebrow(x: number, y: number, text: string, fill = BLUE, size = 9): string {
  return `<text x="${n(x)}" y="${n(y)}" font-family="${FONT}" font-size="${size}" font-weight="600" letter-spacing="1.9" fill="${fill}">${esc(
    text.toUpperCase(),
  )}</text>`;
}

/** Directory credit strip — same face and palette as the map, so print stays cohesive. */
function footerStrip(w: number, y: number, right: string, note?: string): string {
  const left = `${LONDON_VENUE.venue} · Job ${LONDON_VENUE.job} · ${LONDON_VENUE.datesLabel}`;
  return `<g><path d="M ${PAD} ${n(y)} H ${n(w - PAD)}" stroke="${LINE}" stroke-width="1" />
<text x="${PAD}" y="${n(y + 18)}" font-family="${FONT}" font-size="9" letter-spacing="0.5" fill="${NAVY}" opacity="0.6">${esc(left)}</text>
<text x="${n(w - PAD)}" y="${n(y + 18)}" text-anchor="end" font-family="${FONT}" font-size="9" font-weight="600" letter-spacing="0.5" fill="${BLUE}" opacity="0.9">${esc(right)}</text>
<text x="${PAD}" y="${n(y + 31)}" font-family="${FONT}" font-size="8" letter-spacing="0.2" fill="${NAVY}" opacity="0.38">${esc(note ?? "Schematic install plan — confirm exact positions on site with the venue production partner.")}</text></g>`;
}

function defs(): string {
  return `<defs>
<filter id="ldn-tile" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="${NAVY}" flood-opacity="0.1" />
</filter>
<filter id="ldn-pin" x="-60%" y="-60%" width="220%" height="220%">
  <feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="${NAVY}" flood-opacity="0.26" />
</filter>
</defs>`;
}

/**
 * Marker glyph. `pin` drops a classic teardrop, `dot` a plain disc and `square`
 * a rounded tile — all sized by the design's pin scale so a dense floor can be
 * calmed down (or a wall-mounted sheet punched up) without touching geometry.
 */
function markerGlyph(
  m: LondonMarker,
  cx: number,
  cy: number,
  active: boolean,
  /** Numbered print pins carry an index number instead of the kind glyph. */
  numbered = false,
): string {
  const ink = active ? "#C4306E" : inkFor(m.kind);
  const scale = Math.max(0.6, Math.min(1.8, DESIGN.pinScale));
  const r = (active ? 9.5 : numbered ? 8.5 : 7.25) * scale;
  const shape = DESIGN.pinShape;
  const tail = r * 1.6;
  const stroke = active ? 1.9 : 1.4;
  const body =
    shape === "pin"
      ? `<path d="M ${n(cx)} ${n(cy + tail)} C ${n(cx - r * 0.75)} ${n(cy + r * 0.7)}, ${n(cx - r)} ${n(cy + r * 0.35)}, ${n(cx - r)} ${n(cy)} ` +
        `A ${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)} C ${n(cx + r)} ${n(cy + r * 0.35)}, ${n(cx + r * 0.75)} ${n(cy + r * 0.7)}, ${n(cx)} ${n(cy + tail)} Z" ` +
        `fill="${ink}" stroke="${PAPER}" stroke-width="${stroke}" filter="url(#ldn-pin)" />`
      : shape === "square"
        ? `<rect x="${n(cx - r)}" y="${n(cy - r)}" width="${n(r * 2)}" height="${n(r * 2)}" rx="${n(r * 0.32)}" fill="${ink}" stroke="${PAPER}" stroke-width="${stroke}" filter="url(#ldn-pin)" />`
        : `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${ink}" stroke="${PAPER}" stroke-width="${stroke}" filter="url(#ldn-pin)" />`;
  // The called-out asset gets a locator ring so a single card reads instantly.
  const ring = active
    ? `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(17 * scale)}" fill="none" stroke="#C4306E" stroke-width="1.25" stroke-dasharray="3 3" opacity="0.85" /><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(24 * scale)}" fill="none" stroke="#C4306E" stroke-width="1" opacity="0.3" />`
    : "";
  if (numbered) return `${ring}${body}`;
  const ir = r * 0.4;
  let core: string;
  if (m.kind === "pillar" || m.kind === "table" || m.kind === "booth") {
    core = `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(ir)}" fill="${PAPER}" />`;
  } else if (m.kind === "door" || m.kind === "lift") {
    core = `<rect x="${n(cx - ir * 1.4)}" y="${n(cy - ir * 0.6)}" width="${n(ir * 2.8)}" height="${n(ir * 1.2)}" rx="0.5" fill="${PAPER}" />`;
  } else if (m.kind === "floor" || m.kind === "step-repeat") {
    core = `<rect x="${n(cx - ir)}" y="${n(cy - ir)}" width="${n(ir * 2)}" height="${n(ir * 2)}" transform="rotate(45 ${n(cx)} ${n(cy)})" fill="${PAPER}" />`;
  } else {
    core = `<polygon points="${n(cx)},${n(cy - ir * 1.2)} ${n(cx + ir * 1.1)},${n(cy + ir * 0.85)} ${n(cx - ir * 1.1)},${n(cy + ir * 0.85)}" fill="${PAPER}" />`;
  }
  return `${ring}${body}${core}`;
}

/** Name label drawn beside a pin, for the "named" label mode. */
function markerLabel(m: LondonMarker, cx: number, cy: number, index = 0): string {
  const scale = Math.max(0.6, Math.min(1.8, DESIGN.pinScale));
  // Alternate above / below the pin so a run of pillars staggers instead of
  // printing one long unreadable line of overlapping names.
  const dy = index % 2 === 0 ? -8 * scale : 15 * scale;
  const name = m.name.length > 26 ? `${m.name.slice(0, 25)}…` : m.name;
  return `<text x="${n(cx + 9 * scale)}" y="${n(cy + dy)}" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="0.2" fill="${NAVY}" opacity="0.78">${esc(
    name,
  )}</text>`;
}

/** Directory index geometry — three columns of numbered entries. */
const INDEX_COLS = 3;
const INDEX_ROW = 14;

function indexHeight(count: number): number {
  if (!count) return 0;
  return 32 + Math.ceil(count / INDEX_COLS) * INDEX_ROW + 12;
}

function indexBlock(markers: LondonMarker[], x: number, y: number, w: number): string {
  if (!markers.length) return "";
  const rows = Math.ceil(markers.length / INDEX_COLS);
  const colW = w / INDEX_COLS;
  const head = `${eyebrow(x, y, "Asset index")}<path d="M ${n(x)} ${n(y + 8)} H ${n(x + w)}" stroke="${HAIR}" stroke-width="1" />`;
  const entries = markers
    .map((m, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const cx = x + col * colW;
      const cy = y + 26 + row * INDEX_ROW;
      const max = Math.floor(colW / 5.2) - 7;
      const name = m.name.length > max ? `${m.name.slice(0, max - 1)}…` : m.name;
      return `<text x="${n(cx + 15)}" y="${n(cy)}" text-anchor="end" font-family="${FONT}" font-size="8.5" font-weight="700" fill="${inkFor(
        m.kind,
      )}">${i + 1}</text><text x="${n(cx + 23)}" y="${n(cy)}" font-family="${FONT}" font-size="8.75" letter-spacing="0.1" fill="${NAVY}" opacity="0.74">${esc(
        name,
      )}</text>`;
    })
    .join("");
  return `<g>${head}${entries}</g>`;
}

/** Legend chips, greedily packed into rows so nothing runs off the sheet. */
function legendRow(kinds: LondonAssetKind[], x: number, y: number, w: number): string {
  const chips = kinds.map((k) => ({
    k,
    label: LONDON_ASSET_KIND_LABEL[k],
    w: LONDON_ASSET_KIND_LABEL[k].length * 5.5 + 34,
  }));
  let cx = x;
  let row = 0;
  const out: string[] = [];
  for (const chip of chips) {
    if (cx > x && cx + chip.w > x + w) {
      row += 1;
      cx = x;
    }
    const cy = y + row * 19;
    out.push(
      `<circle cx="${n(cx + 5)}" cy="${n(cy - 3)}" r="4" fill="${inkFor(chip.k)}" />` +
        `<text x="${n(cx + 15)}" y="${n(cy)}" font-family="${FONT}" font-size="9.5" letter-spacing="0.2" fill="${NAVY}" opacity="0.7">${esc(
          chip.label,
        )}</text>`,
    );
    cx += chip.w;
  }
  return `<g>${out.join("")}</g>`;
}

/** Attendee room key: one chip per named room, inked by its category. */
function roomKeyRooms(plan: LondonFloorPlan): LondonZone[] {
  return plan.zones.filter((z) => z.kind !== "circulation" && z.kind !== "core");
}

/** Extra sheet height the room key needs beyond the single legend row. */
function roomKeyExtraHeight(plan: LondonFloorPlan, w: number): number {
  let rows = 1;
  let cx = 0;
  for (const z of roomKeyRooms(plan)) {
    const cw = z.label.length * 5.5 + 26;
    if (cx + cw > w) {
      rows += 1;
      cx = 0;
    }
    cx += cw + 7;
  }
  return Math.max(0, rows - 1) * 19;
}

function roomKeyRow(plan: LondonFloorPlan, x: number, y: number, w: number): string {
  const rooms = roomKeyRooms(plan);

  const out: string[] = [];
  let cx = x;
  let cy = y;
  for (const z of rooms) {
    const label = z.label.toUpperCase();
    const cw = label.length * 5.5 + 26;
    if (cx + cw > x + w) {
      cx = x;
      cy += 19;
    }
    out.push(
      `<g><rect x="${n(cx)}" y="${n(cy - 10)}" width="${n(cw)}" height="16" rx="8" fill="${PAPER}" stroke="${LINE}" stroke-width="1" />` +
        `<circle cx="${n(cx + 10)}" cy="${n(cy - 2)}" r="3.4" fill="${zoneStyleFor(z.kind, DESIGN).accent}" />` +
        `<text x="${n(cx + 18)}" y="${n(cy + 1.5)}" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="0.7" fill="${NAVY}" opacity="0.8">${esc(
          label,
        )}</text></g>`,
    );
    cx += cw + 7;
  }
  return `<g>${out.join("")}</g>`;
}

function planBody(plan: LondonFloorPlan, ox: number, oy: number, roomsOnly = false): string {
  const pw = plan.w * PPM;
  const ph = plan.h * PPM;
  const ground = `<rect x="${n(ox)}" y="${n(oy)}" width="${n(pw)}" height="${n(ph)}" rx="3" fill="${WALKWAY}" stroke="${LINE}" stroke-width="1" />`;

  // Quiet metre grid: 1 m whisper, 5 m a touch firmer — reads as survey paper.
  const grid: string[] = [];
  const gridOn = DESIGN.grid !== false;
  for (let i = 1; gridOn && i < plan.w; i += 1) {
    const x = ox + i * PPM;
    grid.push(
      `<path d="M ${n(x)} ${n(oy)} V ${n(oy + ph)}" stroke="${GRIDINK}" stroke-opacity="${i % 5 === 0 ? 0.85 : 0.4}" stroke-width="1" />`,
    );
  }
  for (let i = 1; gridOn && i < plan.h; i += 1) {
    const y = oy + i * PPM;
    grid.push(
      `<path d="M ${n(ox)} ${n(y)} H ${n(ox + pw)}" stroke="${GRIDINK}" stroke-opacity="${i % 5 === 0 ? 0.85 : 0.4}" stroke-width="1" />`,
    );
  }

  const roomScale = Math.max(0.7, Math.min(1.8, DESIGN.roomLabelScale));
  const zones = plan.zones
    .map((z) => {
      const style = zoneStyleFor(z.kind, DESIGN);
      const quiet = z.kind === "circulation" || z.kind === "core" || z.kind === "exterior";
      const inset = 1.5;
      const x = ox + z.x * PPM + inset;
      const y = oy + z.y * PPM + inset;
      const w = Math.max(6, z.w * PPM - inset * 2);
      const h = Math.max(6, z.h * PPM - inset * 2);
      const bar = Math.min(4, w * 0.1);
      const tile =
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="3" fill="${style.fill}" stroke="${LINE}" stroke-width="1"${
          quiet ? "" : ' filter="url(#ldn-tile)"'
        } />` +
        `<path d="M ${n(x)} ${n(y + 3)} a 3 3 0 0 1 3 -3 h ${n(bar)} v ${n(h)} h ${n(-bar)} a 3 3 0 0 1 -3 -3 Z" fill="${style.accent}" opacity="${
          quiet ? 0.6 : 0.95
        }" />`;
      // Attendee sheets centre a larger room name in the tile — there are no pins
      // to avoid, so the name can own the space and read from a phone.
      const label = roomsOnly
        ? h > 14 && !quiet
          ? `<text x="${n(x + bar + (w - bar) / 2)}" y="${n(y + h / 2 + 4)}" text-anchor="middle" font-family="${FONT}" font-size="${n(
              (w > 150 ? 12 : w > 96 ? 10.5 : 9) * roomScale,
            )}" font-weight="600" letter-spacing="0.8" fill="${NAVY}">${esc(z.label.toUpperCase())}</text>`
          : h > 12
            ? `<text x="${n(x + bar + 8)}" y="${n(y + h / 2 + 3)}" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="0.7" fill="${NAVY}" opacity="0.55">${esc(
                z.label.toUpperCase(),
              )}</text>`
            : ""
        : h > 20
          ? `<text x="${n(x + bar + 9)}" y="${n(y + h - 7)}" font-family="${FONT}" font-size="${n(9.5 * roomScale)}" font-weight="600" letter-spacing="0.9" fill="${NAVY}" opacity="0.8">${esc(
              z.label.toUpperCase(),
            )}</text>`
          : "";

      const dims =
        !roomsOnly && DESIGN.roomDims !== false && h > 30 && w > z.label.length * 6.2 + 108
          ? `<text x="${n(x + w - 6)}" y="${n(y + h - 7)}" text-anchor="end" font-family="${FONT}" font-size="8.5" letter-spacing="0.2" fill="${NAVY}" opacity="0.34">${z.w.toFixed(
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
      const tw = Math.max(44, e.label.length * 5.6 + 16);
      return `<g><rect x="${n(x - tw / 2)}" y="${n(y - 8)}" width="${n(tw)}" height="16" rx="2" fill="${NAVY}" /><text x="${n(x)}" y="${n(
        y + 3.5,
      )}" text-anchor="middle" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="0.9" fill="${PAPER}">${esc(
        e.label.toUpperCase(),
      )}</text></g>`;
    })
    .join("");

  return `${ground}<g>${grid.join("")}</g>${zones}${entries}`;
}

/** Measured scale bar: four 2.5 m ticks with end figures, cartographic style. */
function scaleBar(x: number, y: number): string {
  const seg = 2.5 * PPM;
  const bars = [0, 1, 2, 3]
    .map(
      (i) =>
        `<rect x="${n(x + i * seg)}" y="${n(y)}" width="${n(seg)}" height="5" fill="${i % 2 ? PAPER : NAVY}" stroke="${NAVY}" stroke-width="0.75" />`,
    )
    .join("");
  const ticks = [0, 2, 4]
    .map(
      (m, i) =>
        `<text x="${n(x + i * seg * 2)}" y="${n(y - 4)}" text-anchor="middle" font-family="${FONT}" font-size="8" fill="${NAVY}" opacity="0.6">${m * 2.5}</text>`,
    )
    .join("");
  return `<g>${bars}${ticks}<text x="${n(x + seg * 4 + 7)}" y="${n(y + 5)}" font-family="${FONT}" font-size="8.5" letter-spacing="0.3" fill="${NAVY}" opacity="0.55">METRES · SCHEMATIC</text></g>`;
}

function northArrow(x: number, y: number): string {
  return `<g><circle cx="${n(x)}" cy="${n(y)}" r="15" fill="${PAPER}" stroke="${LINE}" stroke-width="1" /><polygon points="${n(x)},${n(
    y - 10,
  )} ${n(x + 4.6)},${n(y + 4)} ${n(x)},${n(y + 1.4)} ${n(x - 4.6)},${n(y + 4)}" fill="${NAVY}" /><text x="${n(x)}" y="${n(
    y + 12,
  )}" text-anchor="middle" font-family="${FONT}" font-size="7.5" font-weight="700" letter-spacing="0.6" fill="${NAVY}" opacity="0.75">N</text></g>`;
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
  /**
   * Attendee wayfinding sheet: rooms and entrances only — no signage pins, no
   * asset key, no numbered index.
   */
  roomsOnly?: boolean;
  /** Look, sheet setup, pin treatment and wording. */
  design?: MapDesign;
};

/** Everything inside the <svg> wrapper, so the asset card can reuse it. */
function floorMapContent(floor: LondonFloorId, opts: FloorMapOptions, size: FloorMapSize): string {
  const plan = londonFloorPlan(floor);
  if (!plan) return "";
  const ox = PAD;
  const oy = PAD + HEAD;
  const roomsOnly = opts.roomsOnly === true;
  const all = roomsOnly ? [] : londonFloorMarkers(floor, opts.panels, opts.overrides);
  const markers = opts.kinds?.length ? all.filter((m) => opts.kinds!.includes(m.kind)) : all;

  // Print sheets number the pins and list them in a directory index instead of
  // printing names on the plan, where a dense pillar run would overlap itself.
  // "named" prints the asset name beside each pin instead — fine on sparse
  // floors, and the designer's call.
  const mode = DESIGN.labelMode;
  const numbered = !roomsOnly && opts.labels === true && mode === "numbered";
  const named = !roomsOnly && mode === "named";
  const indexH = numbered ? indexHeight(markers.length) : 0;

  const pins = markers
    .map((m, i) => {
      const cx = ox + m.x * PPM;
      const cy = oy + m.y * PPM;
      const active = m.panelId === opts.activePanelId;
      const badge = numbered
        ? `<text x="${n(cx)}" y="${n(cy + 3)}" text-anchor="middle" font-family="${FONT}" font-size="8.5" font-weight="700" fill="${PAPER}">${i + 1}</text>`
        : named
          ? markerLabel(m, cx, cy, i)
          : "";
      return `<g data-panel="${esc(m.panelId)}">${markerGlyph(m, cx, cy, active, numbered)}${badge}</g>`;
    })
    .join("");

  const kinds = KIND_ORDER.filter((k) => markers.some((m) => m.kind === k));
  const legendOn = DESIGN.legend !== "none";
  const legendY = size.h - FOOT - indexH - LEGEND;
  const headRule = PAD + HEAD - 18;
  const roomCount = plan.zones.filter((z) => z.kind !== "circulation" && z.kind !== "core").length;
  const eyebrowText =
    DESIGN.eyebrow.trim() ||
    (roomsOnly
      ? "TransPerfect NEXT 2026 · you are here"
      : "TransPerfect NEXT 2026 · venue directory");
  const titleText = DESIGN.title.trim() || plan.label;
  const subtitleText =
    DESIGN.subtitle.trim() ||
    (roomsOnly
      ? `${LONDON_VENUE.venue} · ${roomCount} room${roomCount === 1 ? "" : "s"} and breakout space${roomCount === 1 ? "" : "s"}`
      : `${LONDON_VENUE.venue} · ${plan.w} × ${plan.h} m · ${markers.length} asset${markers.length === 1 ? "" : "s"} scheduled`);
  const legendTitle =
    DESIGN.legendTitle.trim() || (roomsOnly ? "Rooms on this floor" : "Asset key");

  return `${defs()}
<g>
${eyebrow(PAD, PAD + 8, eyebrowText)}
<text x="${PAD}" y="${n(PAD + 38)}" font-family="${FONT}" font-size="24" font-weight="600" letter-spacing="-0.4" fill="${NAVY}">${esc(titleText)}</text>
<text x="${PAD}" y="${n(PAD + 58)}" font-family="${FONT}" font-size="10.5" letter-spacing="0.3" fill="${NAVY}" opacity="0.62">${esc(
    subtitleText,
  )}</text>
${DESIGN.compass === false ? "" : northArrow(size.w - PAD - 15, PAD + 22)}
${DESIGN.compass === false ? "" : scaleBar(size.w - PAD - 30 - 4 * 2.5 * PPM - 92, PAD + 50)}
<path d="M ${PAD} ${n(headRule)} H ${n(size.w - PAD)}" stroke="${LINE}" stroke-width="1" />
</g>
${planBody(plan, ox, oy, roomsOnly)}
${pins}
${legendOn ? eyebrow(PAD, legendY + 16, legendTitle) : ""}
${
  !legendOn
    ? ""
    : roomsOnly
      ? roomKeyRow(plan, PAD, legendY + 38, size.w - PAD * 2)
      : legendRow(kinds, PAD, legendY + 38, size.w - PAD * 2)
}
${numbered ? indexBlock(markers, PAD, size.h - FOOT - indexH + 18, size.w - PAD * 2) : ""}
${
  opts.footerNote === null
    ? ""
    : footerStrip(
        size.w,
        size.h - FOOT + 4,
        opts.footerNote ?? `${titleText} · ${roomsOnly ? "attendee floor guide" : "install plan"}`,
        DESIGN.footerNote.trim() ||
          (roomsOnly
            ? `${LONDON_VENUE.name} · schematic layout for orientation — follow on-site wayfinding and venue staff.`
            : undefined),
      )
}`;
}

/**
 * Sheet size for a floor. Print sheets (`labels: true`) grow by the numbered
 * asset index, so exports must size the raster from here, not from the plan.
 */
export function floorMapSheetSize(floor: LondonFloorId, opts: FloorMapOptions = {}): FloorMapSize {
  const restore = applyDesign(opts.design);
  try {
    const plan = londonFloorPlan(floor);
    if (!plan) return { w: 0, h: 0 };
    const size = floorMapSize(plan);
    if (opts.roomsOnly === true) {
      return { w: size.w, h: size.h + roomKeyExtraHeight(plan, size.w - PAD * 2) };
    }
    if (opts.labels !== true || DESIGN.labelMode !== "numbered") return size;
    const all = londonFloorMarkers(floor, opts.panels, opts.overrides);
    const markers = opts.kinds?.length ? all.filter((m) => opts.kinds!.includes(m.kind)) : all;
    return { w: size.w, h: size.h + indexHeight(markers.length) };
  } finally {
    restore();
  }
}

/** The whole floor with every asset marked. */
export function floorMapSvg(floor: LondonFloorId, opts: FloorMapOptions = {}): string {
  const restore = applyDesign(opts.design);
  try {
    const plan = londonFloorPlan(floor);
    if (!plan) return "";
    const size = floorMapSheetSize(floor, opts);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}" role="img" aria-label="${esc(
      opts.roomsOnly === true
        ? `${plan.label} attendee floor guide — ${LONDON_VENUE.name}`
        : `${plan.label} install map — ${LONDON_VENUE.name}`,
    )}">
<rect width="${size.w}" height="${size.h}" fill="${PAPER}" />
${floorMapContent(floor, opts, size)}
</svg>`;
  } finally {
    restore();
  }
}

/** Install card for one asset: the plan, its pin, and the spec it prints to. */
export function assetMapSvg(
  panel: LondonPanel,
  opts: { panels?: LondonPanel[]; overrides?: LondonMarkerOverrides; design?: MapDesign } = {},
): string {
  const restore = applyDesign(opts.design);
  try {
    const plan = londonFloorPlan(panel.floor);
    if (!plan) return "";
    const marker =
      londonFloorMarkers(panel.floor, opts.panels, opts.overrides).find(
        (m) => m.panelId === panel.id,
      ) ?? null;
    const size = floorMapSize(plan);
    const specH = 112;
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

    const colW = (w - PAD * 2) / 3;
    const specBlock = specs
      .map(([k, v], i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = PAD + col * colW;
        const y = base + 34 + row * 36;
        return `${eyebrow(x, y, k, "#6C7B92", 8.5)}<text x="${n(x)}" y="${n(y + 16)}" font-family="${FONT}" font-size="12" font-weight="600" letter-spacing="-0.1" fill="${NAVY}">${esc(
          v.length > 42 ? `${v.slice(0, 41)}…` : v,
        )}</text>`;
      })
      .join("");
    const specOpacity = `<g opacity="0.55">${eyebrow(PAD, base + 12, "Install specification", BLUE, 9)}</g>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(
      `Install location map for ${panel.name}`,
    )}">
<rect width="${w}" height="${h}" fill="${PAPER}" />
${body}
<path d="M ${PAD} ${n(base + 1)} H ${n(w - PAD)}" stroke="${LINE}" stroke-width="1" />
${specOpacity}
${specBlock}
${footerStrip(w, base + specH, `Install card · ${panel.name}`)}
</svg>`;
  } finally {
    restore();
  }
}
