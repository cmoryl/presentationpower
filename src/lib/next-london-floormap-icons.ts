// Area icons — one recognisable symbol per kind of space, so a floor sheet reads
// like a mall directory rather than a colour-coded diagram.
//
// Every glyph is drawn on a 24 × 24 grid as stroked path data with no fills, so
// it scales cleanly from a 12 px key chip to a wall-mounted A2 print and inherits
// the sheet's ink. The same table feeds the SVG builder, the interactive map and
// the area editor, so a space is marked identically everywhere.

import type { MapAreaKind } from "@/lib/next-london-floormap-design";

export type AreaIcon = {
  /** Path data on a 0 0 24 24 grid, stroked (never filled). */
  path: string;
  /** Plain-language name of the space, used in pickers and keys. */
  label: string;
};

export const AREA_ICONS: Record<MapAreaKind, AreaIcon> = {
  auditorium: {
    // Raked seating in front of a screen.
    path: "M3 6h18M5 11h14M4 15h16M6 19h12",
    label: "Auditorium",
  },
  room: {
    // Door in a wall.
    path: "M5 3h14v18H5zM14 12h.01M9 3v18",
    label: "Meeting room",
  },
  foyer: {
    // Open concourse with a welcome desk.
    path: "M3 20h18M6 20V9l6-4 6 4v11M9 20v-5h6v5",
    label: "Foyer",
  },
  circulation: {
    // Walkway arrows.
    path: "M4 12h13M13 8l4 4-4 4M4 6h5M4 18h5",
    label: "Walkway",
  },
  core: {
    // Service core: lift shaft and risers.
    path: "M5 3h14v18H5zM12 3v18M8 9l0-2M16 9l0-2",
    label: "Service core",
  },
  hospitality: {
    // Coffee cup.
    path: "M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 9h3a2 2 0 0 1 0 5h-3M4 21h13",
    label: "Coffee & catering",
  },
  exhibition: {
    // Booth stands on a floor plate.
    path: "M3 21h18M6 21V10h5v11M14 21v-7h5v7M6 6h13",
    label: "Exhibition",
  },
  terrace: {
    // Planting and paving.
    path: "M3 21h18M8 21c0-5 2-8 2-8s2 3 2 8M16 21c0-3 1-5 1-5s1 2 1 5M5 15h5",
    label: "Terrace",
  },
  exterior: {
    // Building elevation with sky.
    path: "M3 21h18M6 21V7l6-4 6 4v14M10 12h4M10 16h4",
    label: "Exterior",
  },
  stage: {
    // Stage with truss and spot.
    path: "M3 8h18M12 8v4M9 12h6M4 21h16l-2-6H6z",
    label: "Stage",
  },
  catering: {
    // Cloche.
    path: "M3 17h18M4 14a8 8 0 0 1 16 0zM12 6V4M8 21h8",
    label: "Catering",
  },
  meeting: {
    // Table with two chairs.
    path: "M4 10h16M6 10v7M18 10v7M9 6h6M12 6v4",
    label: "Meeting",
  },
  demo: {
    // Screen on a stand.
    path: "M3 5h18v11H3zM9 20h6M12 16v4",
    label: "Demo area",
  },
  media: {
    // Camera.
    path: "M3 8h11v9H3zM14 12l6-3v9l-6-3M6 8V6h5v2",
    label: "Media / press",
  },
  vip: {
    // Lounge armchair.
    path: "M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 11h16v6H4zM7 17v3M17 17v3",
    label: "VIP lounge",
  },
  storage: {
    // Crate.
    path: "M4 7h16v13H4zM4 12h16M12 7v13M8 4h8",
    label: "Storage",
  },
  support: {
    // Help desk with a headset.
    path: "M5 12a7 7 0 0 1 14 0M5 12v4h3v-4M19 12v4h-3v-4M4 21h16",
    label: "Help desk",
  },
};

/** Icon glyph as an SVG fragment, drawn centred on (cx, cy) at `size` px. */
export function areaIconSvg(
  kind: MapAreaKind,
  cx: number,
  cy: number,
  size: number,
  ink: string,
  opacity = 0.85,
): string {
  const icon = AREA_ICONS[kind] ?? AREA_ICONS.room;
  const k = size / 24;
  const x = cx - size / 2;
  const y = cy - size / 2;
  return (
    `<g transform="translate(${round(x)} ${round(y)}) scale(${round(k, 4)})" fill="none" stroke="${ink}" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">` +
    `<path d="${icon.path}" /></g>`
  );
}

function round(v: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Label for an area kind, for pickers, keys and screen readers. */
export function areaKindLabel(kind: MapAreaKind): string {
  return (AREA_ICONS[kind] ?? AREA_ICONS.room).label;
}
