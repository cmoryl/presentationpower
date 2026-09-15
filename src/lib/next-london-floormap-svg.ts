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
  MAP_BRAND_BAR,
  mapPalette,
  zoneStyleFor,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import { mapLogoRatio, mapLogoSvg } from "@/lib/next-london-floormap-logos";
import { areaIconSvg } from "@/lib/next-london-floormap-icons";
import {
  clampSpan,
  fitInFrame,
  MIN_TYPE_PX,
  packRow,
  textWidth,
  truncateToWidth,
} from "@/lib/next-london-floormap-text";

import {
  isCustomAreaId,
  planWithAreas,
  type LondonCustomArea,
} from "@/lib/next-london-floormap-areas";
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
/** True while an architectural (drafting) sheet is being drawn. */
let ARCH = false;
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
    ARCH = d.sheetStyle === "architectural";
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

/** Venue / event wording — the design may override the registry defaults. */
function venueName(): string {
  return DESIGN.venueName.trim() || LONDON_VENUE.venue;
}
function eventName(): string {
  return DESIGN.eventName.trim() || "TransPerfect NEXT 2026";
}

/** Approved palette strip — brand signature on every sheet. */
function brandBar(x: number, y: number, w: number): string {
  if (DESIGN.brandBar === false) return "";
  const cells = MAP_BRAND_BAR.length;
  const cw = Math.min(26, w / (cells * 4));
  return `<g>${MAP_BRAND_BAR.map(
    (c, i) =>
      `<rect x="${n(x + i * (cw + 3))}" y="${n(y)}" width="${n(cw)}" height="4" rx="1" fill="${c}" />`,
  ).join("")}</g>`;
}

/** Directory credit strip — same face and palette as the map, so print stays cohesive. */
function footerStrip(w: number, y: number, right: string, note?: string): string {
  // Three strings share one strip. The right-hand credit is measured first, the
  // venue line takes what is left with a gutter between them, and the small
  // print gets the full width — so the strip never collides or runs off.
  const frameW = Math.max(80, w - PAD * 2);
  const rightFit = fitInFrame(right, 9, frameW * 0.44, MIN_TYPE_PX, 0.5);
  const leftFit = fitInFrame(
    `${venueName()} · ${eventName()} · Job ${LONDON_VENUE.job} · ${LONDON_VENUE.datesLabel}`,
    9,
    Math.max(0, frameW - rightFit.width - 18),
    MIN_TYPE_PX,
    0.5,
  );
  const noteFit = fitInFrame(
    note ??
      "Schematic install plan — confirm exact positions on site with the venue production partner.",
    8,
    frameW,
    MIN_TYPE_PX,
    0.2,
  );
  return `<g><path d="M ${PAD} ${n(y)} H ${n(w - PAD)}" stroke="${LINE}" stroke-width="1" />
<text x="${PAD}" y="${n(y + 18)}" font-family="${FONT}" font-size="${n(leftFit.size)}" letter-spacing="0.5" fill="${NAVY}" opacity="0.6">${esc(leftFit.text)}</text>
<text x="${n(w - PAD)}" y="${n(y + 18)}" text-anchor="end" font-family="${FONT}" font-size="${n(rightFit.size)}" font-weight="600" letter-spacing="0.5" fill="${BLUE}" opacity="0.9">${esc(rightFit.text)}</text>
<text x="${PAD}" y="${n(y + 31)}" font-family="${FONT}" font-size="${n(noteFit.size)}" letter-spacing="0.2" fill="${NAVY}" opacity="0.38">${esc(noteFit.text)}</text></g>`;
}

function defs(): string {
  // The 45° hatch stands in for poché on a drafting sheet: circulation, cores
  // and outdoor ground read as "not a room" in one ink, so the plan survives a
  // single-colour print at any size.
  // Only architectural sheets need the hatch, and an unused def would change
  // every directory sheet's output, so it is emitted on demand.
  const hatch = !ARCH
    ? ""
    : `<pattern id="ldn-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <path d="M 0 0 V 6" stroke="${NAVY}" stroke-width="0.7" stroke-opacity="0.34" />
</pattern>`;
  return `<defs>${hatch ? `\n${hatch}` : ""}
<filter id="ldn-tile" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="${NAVY}" flood-opacity="0.1" />
</filter>
<filter id="ldn-pin" x="-60%" y="-60%" width="220%" height="220%">
  <feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="${NAVY}" flood-opacity="0.26" />
</filter>
</defs>`;
}

/**
 * Measured dimension ribbon along the bottom and left of the plan: extension
 * lines, 45° arrow ticks every 5 m and the overall figure — the convention a
 * venue or print vendor reads first on an architectural sheet.
 */
function dimensionRibbon(plan: LondonFloorPlan, ox: number, oy: number): string {
  const pw = plan.w * PPM;
  const ph = plan.h * PPM;
  // Drawn just inside the plan edges rather than out in the margin, so the
  // ribbon never collides with the legend band or run off a tight sheet.
  const off = 13;
  const by = oy + ph - off;
  const lx = ox + off;
  const tick = (x: number, y: number, vertical: boolean) =>
    `<path d="M ${n(x - (vertical ? 3 : 3))} ${n(y - 3)} L ${n(x + 3)} ${n(y + 3)}" stroke="${NAVY}" stroke-width="0.9" opacity="0.75" />`;
  const parts: string[] = [
    `<path d="M ${n(ox)} ${n(by)} H ${n(ox + pw)}" stroke="${NAVY}" stroke-width="0.9" opacity="0.75" />`,
    `<path d="M ${n(lx)} ${n(oy)} V ${n(oy + ph)}" stroke="${NAVY}" stroke-width="0.9" opacity="0.75" />`,
  ];
  for (let m = 0; m <= plan.w; m += 5) {
    const x = ox + m * PPM;
    parts.push(
      `<path d="M ${n(x)} ${n(oy + ph)} V ${n(by - 3)}" stroke="${NAVY}" stroke-width="0.5" opacity="0.3" />`,
      tick(x, by, false),
    );
  }
  for (let m = 0; m <= plan.h; m += 5) {
    const y = oy + m * PPM;
    parts.push(
      `<path d="M ${n(ox)} ${n(y)} H ${n(lx + 3)}" stroke="${NAVY}" stroke-width="0.5" opacity="0.3" />`,
      tick(lx, y, true),
    );
  }
  parts.push(
    `<text x="${n(ox + pw / 2)}" y="${n(by - 5)}" text-anchor="middle" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="0.6" fill="${NAVY}" opacity="0.72">${plan.w.toFixed(
      1,
    )} m</text>`,
    `<text x="${n(lx + 10)}" y="${n(oy + ph / 2)}" text-anchor="middle" transform="rotate(-90 ${n(lx + 10)} ${n(
      oy + ph / 2,
    )})" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="0.6" fill="${NAVY}" opacity="0.72">${plan.h.toFixed(
      1,
    )} m</text>`,
  );
  return `<g>${parts.join("")}</g>`;
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

/**
 * Name label drawn beside a pin, for the "named" label mode. The label is fitted
 * to the space between the pin and the sheet margin: it flips to the left of the
 * pin when the right-hand run is too tight, and trims rather than cross the
 * margin.
 */
function markerLabel(
  m: LondonMarker,
  cx: number,
  cy: number,
  index = 0,
  frame: { left: number; right: number } = { left: PAD, right: Infinity },
): string {
  const scale = Math.max(0.6, Math.min(1.8, DESIGN.pinScale));
  // Alternate above / below the pin so a run of pillars staggers instead of
  // printing one long unreadable line of overlapping names.
  const dy = index % 2 === 0 ? -8 * scale : 15 * scale;
  const name = truncateToWidth(m.name, 8.5, 150, 0.2) || m.name.slice(0, 26);
  const gap = 9 * scale;
  const rightRoom = frame.right - (cx + gap);
  const leftRoom = cx - gap - frame.left;
  const useRight = rightRoom >= leftRoom || rightRoom >= textWidth(name, 8.5, 0.2);
  const fitted = fitInFrame(name, 8.5, Math.max(0, useRight ? rightRoom : leftRoom), 7, 0.2);
  if (!fitted.text) return "";
  return `<text x="${n(useRight ? cx + gap : cx - gap)}" y="${n(cy + dy)}"${
    useRight ? "" : ' text-anchor="end"'
  } font-family="${FONT}" font-size="${n(fitted.size)}" font-weight="600" letter-spacing="0.2" fill="${NAVY}" opacity="0.78">${esc(
    fitted.text,
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
      // Each entry lives in its own column: the name is fitted to the column
      // width less the number gutter, so two columns never run into each other.
      const name = fitInFrame(m.name, 8.75, Math.max(0, colW - 34), MIN_TYPE_PX, 0.1);
      return `<text x="${n(cx + 15)}" y="${n(cy)}" text-anchor="end" font-family="${FONT}" font-size="8.5" font-weight="700" fill="${inkFor(
        m.kind,
      )}">${i + 1}</text><text x="${n(cx + 23)}" y="${n(cy)}" font-family="${FONT}" font-size="${n(name.size)}" letter-spacing="0.1" fill="${NAVY}" opacity="0.74">${esc(
        name.text,
      )}</text>`;
    })
    .join("");
  return `<g>${head}${entries}</g>`;
}

/** Chip band geometry: one row height, shared by the asset key and room key. */
const CHIP_ROW = 19;
/** Gap between room-key chips (the asset key packs flush). */
const ROOM_CHIP_GAP = 7;

/** Measured chip widths for the asset key, in draw order. */
function legendChipWidths(kinds: LondonAssetKind[]): number[] {
  return kinds.map((k) => textWidth(LONDON_ASSET_KIND_LABEL[k], 9.5, 0.2) + 34);
}

/** Measured chip widths for the attendee room key, in draw order. */
function roomChipWidths(rooms: LondonZone[]): number[] {
  return rooms.map(
    (z) => textWidth(z.label.toUpperCase(), 8.5, 0.7) + (DESIGN.icons === false ? 26 : 34),
  );
}

/**
 * Extra height a chip band needs beyond its first row. Measuring and drawing
 * share `packRow`, so a band can never wrap into the strip below it.
 */
function chipExtraHeight(widths: number[], frameW: number, gap: number): number {
  return Math.max(0, packRow(widths, frameW, gap).rows - 1) * CHIP_ROW;
}

/** Legend chips, packed into rows so nothing runs off the sheet. */
function legendRow(kinds: LondonAssetKind[], x: number, y: number, w: number): string {
  const widths = legendChipWidths(kinds);
  const { chips } = packRow(widths, w, 0);
  const out = chips.map(({ index, x: dx, row }) => {
    const k = kinds[index]!;
    const label = fitInFrame(LONDON_ASSET_KIND_LABEL[k], 9.5, Math.max(0, w - 20), MIN_TYPE_PX, 0.2);
    const cx = x + dx;
    const cy = y + row * CHIP_ROW;
    return (
      `<circle cx="${n(cx + 5)}" cy="${n(cy - 3)}" r="4" fill="${inkFor(k)}" />` +
      `<text x="${n(cx + 15)}" y="${n(cy)}" font-family="${FONT}" font-size="${n(label.size)}" letter-spacing="0.2" fill="${NAVY}" opacity="0.7">${esc(
        label.text,
      )}</text>`
    );
  });
  return `<g>${out.join("")}</g>`;
}

/** Extra height the asset key needs beyond its single row. */
function legendExtraHeight(kinds: LondonAssetKind[], w: number): number {
  return chipExtraHeight(legendChipWidths(kinds), w, 0);
}

/** Attendee room key: one chip per named room, inked by its category. */
function roomKeyRooms(plan: LondonFloorPlan): LondonZone[] {
  return plan.zones.filter((z) => z.kind !== "circulation" && z.kind !== "core");
}

/** Extra sheet height the room key needs beyond the single legend row. */
function roomKeyExtraHeight(plan: LondonFloorPlan, w: number): number {
  return chipExtraHeight(roomChipWidths(roomKeyRooms(plan)), w, ROOM_CHIP_GAP);
}

function roomKeyRow(plan: LondonFloorPlan, x: number, y: number, w: number): string {
  const rooms = roomKeyRooms(plan);
  const widths = roomChipWidths(rooms);
  const { chips } = packRow(widths, w, ROOM_CHIP_GAP);
  const out = chips.map(({ index, x: dx, row }) => {
    const z = rooms[index]!;
    const cw = Math.min(widths[index]!, w);
    const cx = x + dx;
    const cy = y + row * CHIP_ROW;
    const textX = cx + (DESIGN.icons === false ? 18 : 22);
    const label = fitInFrame(
      z.label.toUpperCase(),
      8.5,
      Math.max(0, cx + cw - 8 - textX),
      MIN_TYPE_PX,
      0.7,
    );
    return (
      `<g><rect x="${n(cx)}" y="${n(cy - 10)}" width="${n(cw)}" height="16" rx="8" fill="${PAPER}" stroke="${LINE}" stroke-width="1" />` +
      (DESIGN.icons === false
        ? `<circle cx="${n(cx + 10)}" cy="${n(cy - 2)}" r="3.4" fill="${zoneStyleFor(z.kind, DESIGN).accent}" />`
        : areaIconSvg(z.kind, cx + 12, cy - 2, 13, zoneStyleFor(z.kind, DESIGN).accent, 0.95)) +
      `<text x="${n(textX)}" y="${n(cy + 1.5)}" font-family="${FONT}" font-size="${n(label.size)}" font-weight="600" letter-spacing="0.7" fill="${NAVY}" opacity="0.8">${esc(
        label.text,
      )}</text></g>`
    );
  });
  return `<g>${out.join("")}</g>`;
}

function planBody(plan: LondonFloorPlan, ox: number, oy: number, roomsOnly = false): string {
  const pw = plan.w * PPM;
  const ph = plan.h * PPM;
  // Architectural sheets sit on square corners inside a heavy outer wall line —
  // the drafting convention — while directory sheets keep their soft ground.
  const rr = ARCH ? 0 : 3;
  const ground = ARCH
    ? `<rect x="${n(ox)}" y="${n(oy)}" width="${n(pw)}" height="${n(ph)}" fill="${WALKWAY}" stroke="${NAVY}" stroke-width="2.2" stroke-opacity="0.85" />` +
      `<rect x="${n(ox + 3.5)}" y="${n(oy + 3.5)}" width="${n(pw - 7)}" height="${n(ph - 7)}" fill="none" stroke="${NAVY}" stroke-width="0.6" stroke-opacity="0.35" />`
    : `<rect x="${n(ox)}" y="${n(oy)}" width="${n(pw)}" height="${n(ph)}" rx="3" fill="${WALKWAY}" stroke="${LINE}" stroke-width="1" />`;

  // Quiet metre grid: 1 m whisper, 5 m a touch firmer — reads as survey paper.
  const grid: string[] = [];
  const gridOn = DESIGN.grid !== false;
  for (let i = 1; gridOn && i < plan.w; i += 1) {
    const x = ox + i * PPM;
    grid.push(
      `<path d="M ${n(x)} ${n(oy)} V ${n(oy + ph)}" stroke="${ARCH ? NAVY : GRIDINK}" stroke-opacity="${
        ARCH ? (i % 5 === 0 ? 0.24 : 0.1) : i % 5 === 0 ? 0.85 : 0.4
      }" stroke-width="${ARCH && i % 5 === 0 ? 0.8 : 1}" />`,
    );
  }
  for (let i = 1; gridOn && i < plan.h; i += 1) {
    const y = oy + i * PPM;
    grid.push(
      `<path d="M ${n(ox)} ${n(y)} H ${n(ox + pw)}" stroke="${ARCH ? NAVY : GRIDINK}" stroke-opacity="${
        ARCH ? (i % 5 === 0 ? 0.24 : 0.1) : i % 5 === 0 ? 0.85 : 0.4
      }" stroke-width="${ARCH && i % 5 === 0 ? 0.8 : 1}" />`,
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
      const own = isCustomAreaId(z.id);
      // A sectioned area is a translucent wash, not an opaque tile: whatever the
      // venue drew underneath — and any pin inside it — must still read.
      const tile = ARCH
        ? // Drafting sheet: a room is a square, wall-weighted outline; quiet ground
          // (circulation, cores, outside) is hatched instead of tinted, and there
          // are no shadows or rounded corners anywhere.
          (own
            ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${style.accent}" fill-opacity="0.1" />`
            : `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${
                quiet ? PAPER : style.fill
              }" fill-opacity="${quiet ? 0.35 : 1}" stroke="${NAVY}" stroke-width="${
                quiet ? 0.7 : 1.6
              }" stroke-opacity="${quiet ? 0.45 : 0.9}" />` +
              (quiet
                ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#ldn-hatch)" />`
                : "")) +
          `<rect x="${n(x)}" y="${n(y)}" width="${n(bar)}" height="${n(h)}" fill="${style.accent}" opacity="${
            quiet ? 0.5 : 0.9
          }" />`
        : (own
            ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="3" fill="${style.accent}" fill-opacity="0.12" />`
            : `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="3" fill="${style.fill}" stroke="${LINE}" stroke-width="1"${
                quiet ? "" : ' filter="url(#ldn-tile)"'
              } />`) +
          `<path d="M ${n(x)} ${n(y + 3)} a 3 3 0 0 1 3 -3 h ${n(bar)} v ${n(h)} h ${n(-bar)} a 3 3 0 0 1 -3 -3 Z" fill="${style.accent}" opacity="${
            quiet ? 0.6 : 0.95
          }" />`;
      // A narrow tile — a lift core, a stair, a light well — cannot hold its own
      // name at the left edge without the text running off the tile and, at the
      // edge of the plan, off the sheet. When the name is wider than the tile,
      // hang it from the right-hand edge so it grows back across the plan rather
      // than out of it — unless the tile is against the left edge, where that
      // would push the text off the other side, so there it stays left-anchored.
      const planL = ox + 4;
      const nameAt = (
        text: string,
        size: number,
        baseline: number,
        opacity: number,
        weight = 600,
      ) => {
        // House rule: a name is fitted to its own tile first — shrink to the
        // legibility floor, then trim. Only when nothing legible fits inside the
        // tile does it hang from the right-hand edge back across the plan, and
        // never past the plan's left margin.
        const inner = Math.max(0, w - bar - 15);
        const inside = fitInFrame(text, size, inner, MIN_TYPE_PX, 0.9);
        const fit = inside.text
          ? { ...inside, end: false, ax: x + bar + 9 }
          : (() => {
              const room = Math.max(0, x + w - 6 - planL);
              const hung = fitInFrame(text, size, room, MIN_TYPE_PX, 0.9);
              return { ...hung, end: true, ax: x + w - 6 };
            })();
        if (!fit.text) return "";
        return `<text x="${n(fit.ax)}" y="${n(baseline)}"${
          fit.end ? ' text-anchor="end"' : ""
        } font-family="${FONT}" font-size="${n(fit.size)}" font-weight="${weight}" letter-spacing="0.9" fill="${NAVY}" opacity="${opacity}">${esc(
          fit.text,
        )}</text>`;
      };

      // Attendee sheets centre a larger room name in the tile — there are no pins
      // to avoid, so the name can own the space and read from a phone. It is
      // still fitted to the tile so a long room name cannot bleed into its
      // neighbours.
      const centred = fitInFrame(
        z.label.toUpperCase(),
        (w > 150 ? 12 : w > 96 ? 10.5 : 9) * roomScale,
        Math.max(0, w - bar - 12),
        MIN_TYPE_PX,
        0.8,
      );
      const label = roomsOnly
        ? h > 14 && !quiet && centred.text
          ? `<text x="${n(x + bar + (w - bar) / 2)}" y="${n(y + h / 2 + 4)}" text-anchor="middle" font-family="${FONT}" font-size="${n(
              centred.size,
            )}" font-weight="600" letter-spacing="0.8" fill="${NAVY}">${esc(centred.text)}</text>`
          : h > 12
            ? nameAt(z.label.toUpperCase(), 8.5, y + h / 2 + 3, 0.55)
            : ""
        : h > 20
          ? nameAt(z.label.toUpperCase(), 9.5 * roomScale, y + h - 7, 0.8)
          : "";

      const dims =
        !roomsOnly && DESIGN.roomDims !== false && h > 30 && w > z.label.length * 6.2 + 108
          ? `<text x="${n(x + w - 6)}" y="${n(y + h - 7)}" text-anchor="end" font-family="${FONT}" font-size="8.5" letter-spacing="0.2" fill="${NAVY}" opacity="0.34">${z.w.toFixed(
              1,
            )} × ${z.h.toFixed(1)} m</text>`
          : "";

      // Category icon, top-right of the tile: the directory symbol for this kind
      // of space. It sits away from both the label baseline and the pin field.
      const iconSize = Math.min(22, Math.max(12, Math.min(w, h) * 0.3));
      const icon =
        DESIGN.icons !== false && w > iconSize * 2.6 && h > iconSize * 1.7 && !quiet
          ? areaIconSvg(
              z.kind,
              x + w - iconSize / 2 - 7,
              y + iconSize / 2 + 6,
              iconSize,
              style.accent,
              0.8,
            )
          : "";

      // An area the team sectioned off themselves is drawn as a dashed overlay so
      // it never reads as a wall the venue built.
      const custom = own
        ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rr}" fill="none" stroke="${style.accent}" stroke-width="1.4" stroke-dasharray="5 3" opacity="0.9" />`
        : "";

      // Names come back separately so they can be drawn after every tile: a name
      // that has to hang outside its own tile (a lift core against the plan edge)
      // would otherwise be painted over by whichever room is drawn next.
      return { body: `<g>${tile}${custom}${icon}</g>`, text: `<g>${label}${dims}</g>` };
    })
    .reduce((acc, part) => ({ body: acc.body + part.body, text: acc.text + part.text }), {
      body: "",
      text: "",
    });

  const entries = plan.entries
    .map((e) => {
      const x = ox + e.x * PPM;
      const y = oy + e.y * PPM;
      const label = e.label.toUpperCase();
      // An entrance sits on the plan edge, so its tab is centred on the door and
      // then pushed back inside the plan frame rather than hanging off the sheet.
      const tw = Math.min(pw, Math.max(44, textWidth(label, 8.5, 0.9) + 16));
      const bx = clampSpan(x - tw / 2, tw, ox, ox + pw);
      const fitted = fitInFrame(label, 8.5, tw - 12, MIN_TYPE_PX, 0.9);
      return `<g><rect x="${n(bx)}" y="${n(y - 8)}" width="${n(tw)}" height="16" rx="2" fill="${NAVY}" /><text x="${n(bx + tw / 2)}" y="${n(
        y + 3.5,
      )}" text-anchor="middle" font-family="${FONT}" font-size="${n(fitted.size)}" font-weight="600" letter-spacing="0.9" fill="${PAPER}">${esc(
        fitted.text,
      )}</text></g>`;
    })
    .join("");

  const ribbon = ARCH && DESIGN.dimensionRibbon !== false ? dimensionRibbon(plan, ox, oy) : "";
  return `${ground}<g>${grid.join("")}</g>${zones.body}${ribbon}${zones.text}${entries}`;
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
  /** Areas the team sectioned off themselves, merged on top of the venue rooms. */
  areas?: readonly LondonCustomArea[];
  /**
   * Draw this plan instead of the London plan for `floor`. Used by another
   * venue in the same series, which reuses the whole sheet apparatus with its
   * own rooms. Omit for every London sheet.
   */
  plan?: LondonFloorPlan | null;
};

/** Everything inside the <svg> wrapper, so the asset card can reuse it. */
function floorMapContent(floor: LondonFloorId, opts: FloorMapOptions, size: FloorMapSize): string {
  const base = opts.plan ?? londonFloorPlan(floor);
  if (!base) return "";
  const plan = planWithAreas(base, opts.areas);

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
  const frameW = size.w - PAD * 2;
  // A wrapping key needs its own height, or its second row prints over the index
  // and the footer. The reserve comes from the same packing the drawing uses.
  const legendExtra = !legendOn
    ? 0
    : roomsOnly
      ? roomKeyExtraHeight(plan, frameW)
      : legendExtraHeight(kinds, frameW);
  const legendY = size.h - FOOT - indexH - LEGEND - legendExtra;
  const headRule = PAD + HEAD - 18;
  const roomCount = plan.zones.filter((z) => z.kind !== "circulation" && z.kind !== "core").length;
  const eyebrowText =
    DESIGN.eyebrow.trim() ||
    (roomsOnly ? `${eventName()} · you are here` : `${eventName()} · venue directory`);
  const titleText = DESIGN.title.trim() || plan.label;
  const subtitleText =
    DESIGN.subtitle.trim() ||
    (roomsOnly
      ? `${venueName()} · ${roomCount} room${roomCount === 1 ? "" : "s"} and breakout space${roomCount === 1 ? "" : "s"}`
      : `${venueName()} · ${plan.w} × ${plan.h} m · ${markers.length} asset${markers.length === 1 ? "" : "s"} scheduled`);
  const legendTitle =
    DESIGN.legendTitle.trim() || (roomsOnly ? "Rooms on this floor" : "Asset key");

  const logoH = Math.max(12, Math.min(46, DESIGN.logoScale || 26));
  const logoW = mapLogoRatio(DESIGN.logo) * logoH;
  const logo =
    DESIGN.logo === "none"
      ? ""
      : mapLogoSvg(
          DESIGN.logo,
          size.w - PAD - logoW,
          PAD - 6,
          logoH,
          DESIGN.logoMono ? NAVY : undefined,
        );
  // The compass cluster drops below the lockup so the two never collide, and is
  // held above the header rule so the scale bar cannot cross into the plan.
  const compassY = Math.min(
    DESIGN.logo === "none" ? PAD + 22 : PAD - 6 + logoH + 22,
    headRule - 34,
  );
  // The scale bar keeps its right-hand alignment but never starts left of the margin.
  const scaleX = Math.max(PAD, size.w - PAD - 30 - 4 * 2.5 * PPM - 92);
  // Header copy owns the space up to the lockup / compass cluster and no further.
  const chromeLeft = Math.min(
    DESIGN.logo === "none" ? size.w - PAD : size.w - PAD - logoW,
    DESIGN.compass === false ? size.w - PAD : scaleX,
  );
  const headW = Math.max(120, chromeLeft - PAD - 14);
  const eyebrowFit = fitInFrame(eyebrowText.toUpperCase(), 9, headW, MIN_TYPE_PX, 1.9);
  const titleFit = fitInFrame(titleText, 24, headW, 13, -0.4);
  const subFit = fitInFrame(subtitleText, 10.5, headW, MIN_TYPE_PX, 0.3);
  const legendTitleFit = fitInFrame(legendTitle.toUpperCase(), 9, frameW, MIN_TYPE_PX, 1.9);

  return `${defs()}
<g>
${logo}
${eyebrow(PAD, PAD + 8, eyebrowFit.text, BLUE, eyebrowFit.size)}
<text x="${PAD}" y="${n(PAD + 38)}" font-family="${FONT}" font-size="${n(titleFit.size)}" font-weight="600" letter-spacing="-0.4" fill="${NAVY}">${esc(titleFit.text)}</text>
<text x="${PAD}" y="${n(PAD + 58)}" font-family="${FONT}" font-size="${n(subFit.size)}" letter-spacing="0.3" fill="${NAVY}" opacity="0.62">${esc(
    subFit.text,
  )}</text>
${DESIGN.compass === false ? "" : northArrow(size.w - PAD - 15, compassY)}
${DESIGN.compass === false ? "" : scaleBar(scaleX, compassY + 28)}
<path d="M ${PAD} ${n(headRule)} H ${n(size.w - PAD)}" stroke="${LINE}" stroke-width="1" />
${brandBar(PAD, headRule + 5, size.w - PAD * 2)}
</g>

${planBody(plan, ox, oy, roomsOnly)}
${pins}
${legendOn ? eyebrow(PAD, legendY + 16, legendTitleFit.text, BLUE, legendTitleFit.size) : ""}
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
            ? `${venueName()} · schematic layout for orientation — follow on-site wayfinding and venue staff.`
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
    const base = opts.plan ?? londonFloorPlan(floor);
    if (!base) return { w: 0, h: 0 };
    const plan = planWithAreas(base, opts.areas);
    const size = floorMapSize(plan);
    const frameW = size.w - PAD * 2;
    const legendOn = DESIGN.legend !== "none";
    if (opts.roomsOnly === true) {
      return { w: size.w, h: size.h + (legendOn ? roomKeyExtraHeight(plan, frameW) : 0) };
    }
    const all = londonFloorMarkers(floor, opts.panels, opts.overrides);
    const markers = opts.kinds?.length ? all.filter((m) => opts.kinds!.includes(m.kind)) : all;
    const kinds = KIND_ORDER.filter((k) => markers.some((m) => m.kind === k));
    // Both wrapping bands are reserved here, so nothing on the sheet is drawn
    // into space the sheet does not have.
    const extra = legendOn ? legendExtraHeight(kinds, frameW) : 0;
    const index =
      opts.labels === true && DESIGN.labelMode === "numbered" ? indexHeight(markers.length) : 0;
    return { w: size.w, h: size.h + extra + index };
  } finally {
    restore();
  }
}

/** The whole floor with every asset marked. */
export function floorMapSvg(floor: LondonFloorId, opts: FloorMapOptions = {}): string {
  const restore = applyDesign(opts.design);
  try {
    const plan = opts.plan ?? londonFloorPlan(floor);
    if (!plan) return "";
    const size = floorMapSheetSize(floor, opts);
    // The sheet's venue wording comes from the design (venueName), so another
    // venue's sheet titles itself correctly without touching this renderer.
    const venue = DESIGN.venueName.trim() || LONDON_VENUE.name;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}" role="img" aria-label="${esc(
      opts.roomsOnly === true
        ? `${plan.label} attendee floor guide — ${venue}`
        : `${plan.label} install map — ${venue}`,
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
    // Size from the sheet, not the bare plan: when the card carries the numbered
    // asset index the index needs its own band, or it prints over the plan.
    const mapOpts = { ...opts, activePanelId: panel.id, footerNote: null } as const;
    const size = floorMapSheetSize(panel.floor, mapOpts);
    const specH = 112;
    const w = size.w;
    /** Map block ends where the (suppressed) floor footer would have started. */
    const base = size.h - FOOT;
    const h = base + specH + FOOT;
    const zone = marker ? plan.zones.find((z) => z.id === marker.zoneId) : null;

    const body = floorMapContent(panel.floor, mapOpts, size);

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
        // Each spec sits in its own column, label and value both fitted to it, so
        // a long asset name cannot run into the column beside it.
        const keyFit = fitInFrame(k.toUpperCase(), 8.5, Math.max(0, colW - 14), MIN_TYPE_PX, 1.9);
        const valFit = fitInFrame(v, 12, Math.max(0, colW - 14), MIN_TYPE_PX, -0.1);
        return `${eyebrow(x, y, keyFit.text, "#6C7B92", keyFit.size)}<text x="${n(x)}" y="${n(y + 16)}" font-family="${FONT}" font-size="${n(
          valFit.size,
        )}" font-weight="600" letter-spacing="-0.1" fill="${NAVY}">${esc(valFit.text)}</text>`;
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
