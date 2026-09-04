// Map design controls — the one place that decides how a London floor map LOOKS.
//
// The geometry lives in next-london-floorplan.ts and the drawing in
// next-london-floormap-svg.ts. Everything a designer can dial (palette, sheet
// setup, pin treatment, wording) is described here so screen, SVG, PNG and PDF
// all read from the same object and print identically.

import type { LondonAssetKind, LondonZone } from "@/lib/next-london-floorplan";

/**
 * Kinds of space a sheet can mark. The venue plans use the LondonZone kinds; the
 * extras exist for areas a team sections off themselves (a stage, a catering
 * run, a demo bay), each with its own colour and icon.
 */
export type MapAreaKind =
  | LondonZone["kind"]
  | "stage"
  | "catering"
  | "meeting"
  | "demo"
  | "media"
  | "vip"
  | "storage"
  | "support";

export type MapThemeId = "directory" | "blueprint" | "night" | "mono" | "brand";
export type MapPinShape = "pin" | "dot" | "square";
export type MapLabelMode = "numbered" | "named" | "none";
export type MapLegendMode = "key" | "none";
export type MapPaper = "A4" | "A3" | "A2" | "sheet";
export type MapOrientation = "landscape" | "portrait";

export type MapPalette = {
  /** Sheet background. */
  paper: string;
  /** Primary type / structure ink. */
  ink: string;
  /** Accent ink used by the chrome and default markers. */
  accent: string;
  /** Ground between the rooms. */
  walkway: string;
  /** Room tile fill. */
  tile: string;
  /** Hairlines. */
  line: string;
  hair: string;
  /** Quiet zones (circulation, cores). */
  quietFill: string;
  quietAccent: string;
  /** Grid stroke colour. */
  grid: string;
  /** True when the sheet is dark, so pin rings and grids flip. */
  dark: boolean;
};

export type MapDesign = {
  theme: MapThemeId;
  /** Accent override (division / brand colour). Empty = theme accent. */
  accent: string;
  /** Category colour on room tiles; off makes every room a neutral tile. */
  roomTint: boolean;
  /** Metre grid on the ground. */
  grid: boolean;
  /** Screen pixels per plan metre — the drawing scale. */
  ppm: number;
  /** Sheet margin in px. */
  margin: number;
  /** Pin size multiplier. */
  pinScale: number;
  pinShape: MapPinShape;
  labelMode: MapLabelMode;
  legend: MapLegendMode;
  /** Room-name size multiplier. */
  roomLabelScale: number;
  /** Show the w × h m figures inside room tiles. */
  roomDims: boolean;
  /** Show scale bar + north point in the header. */
  compass: boolean;
  /** Category icons on room tiles and in the sheet key. */
  icons: boolean;
  /** PDF page setup. */
  paper: MapPaper;
  orientation: MapOrientation;
  /** PNG raster multiplier. */
  exportScale: number;
  /** Copy overrides — blank means the built-in wording. */
  eyebrow: string;
  title: string;
  subtitle: string;
  legendTitle: string;
  footerNote: string;
  /** Brand lockup printed in the sheet header. */
  logo: MapLogoId;
  /** Lockup height in px. */
  logoScale: number;
  /** Force the lockup to a single ink (reverse / mono usage). */
  logoMono: boolean;
  /** Venue + event wording used by the built-in header and footer. */
  venueName: string;
  eventName: string;
  /** Brand palette strip under the header rule. */
  brandBar: boolean;
};

export const DEFAULT_MAP_DESIGN: MapDesign = {
  theme: "brand",
  accent: "",
  roomTint: true,
  grid: true,
  ppm: 18,
  margin: 40,
  pinScale: 1,
  pinShape: "pin",
  labelMode: "numbered",
  legend: "key",
  roomLabelScale: 1,
  roomDims: true,
  compass: true,
  icons: true,
  paper: "A3",
  orientation: "landscape",
  exportScale: 2.5,
  eyebrow: "",
  title: "",
  subtitle: "",
  legendTitle: "",
  footerNote: "",
  logo: "next",
  logoScale: 26,
  logoMono: false,
  venueName: "",
  eventName: "",
  brandBar: true,
};

/** The approved TransPerfect strip printed under the header rule. */
export const MAP_BRAND_BAR = ["#003FC7", "#A1FBF9", "#C2A3FF", "#FFEB66", "#A6FA87"] as const;

/** Brand accent swatches offered in the design panel. */
export const MAP_ACCENT_SWATCHES: { name: string; hex: string }[] = [
  { name: "Blue 500", hex: "#003FC7" },
  { name: "Blue 800", hex: "#03002C" },
  { name: "Aqua", hex: "#A1FBF9" },
  { name: "Lavender", hex: "#C2A3FF" },
  { name: "Yellow", hex: "#FFEB66" },
  { name: "Green", hex: "#A6FA87" },
  { name: "Peach", hex: "#FF9B70" },
  { name: "Pink", hex: "#EC388A" },
];


const THEMES: Record<MapThemeId, MapPalette> = {
  directory: {
    paper: "#FFFFFF",
    ink: "#03002C",
    accent: "#003FC7",
    walkway: "#EDF1F7",
    tile: "#FFFFFF",
    line: "#D3DCEA",
    hair: "#E4EAF3",
    quietFill: "#E6EBF4",
    quietAccent: "#A6B1C4",
    grid: "#FFFFFF",
    dark: false,
  },
  blueprint: {
    paper: "#F4F7FC",
    ink: "#0B2050",
    accent: "#1D4ED8",
    walkway: "#DCE6F6",
    tile: "#FBFDFF",
    line: "#B9CAE4",
    hair: "#CBD8EC",
    quietFill: "#CFDCF0",
    quietAccent: "#8CA3C6",
    grid: "#FFFFFF",
    dark: false,
  },
  night: {
    paper: "#03002C",
    ink: "#EEF2FA",
    accent: "#A1FBF9",
    walkway: "#0B1043",
    tile: "#141A55",
    line: "#2A3277",
    hair: "#232B67",
    quietFill: "#0A0F3B",
    quietAccent: "#4A5490",
    grid: "#3B4494",
    dark: true,
  },
  mono: {
    paper: "#FFFFFF",
    ink: "#1A1A1A",
    accent: "#1A1A1A",
    walkway: "#F0F0F0",
    tile: "#FFFFFF",
    line: "#CFCFCF",
    hair: "#E2E2E2",
    quietFill: "#E7E7E7",
    quietAccent: "#9C9C9C",
    grid: "#FFFFFF",
    dark: false,
  },
  brand: {
    paper: "#FFFFFF",
    ink: "#03002C",
    accent: "#003FC7",
    walkway: "#E0E8F5",
    tile: "#FFFFFF",
    line: "#C6D4EA",
    hair: "#DEE7F5",
    quietFill: "#D8E2F2",
    quietAccent: "#8FA2C0",
    grid: "#FFFFFF",
    dark: false,
  },
};

export const MAP_THEME_LABEL: Record<MapThemeId, string> = {
  directory: "Directory",
  blueprint: "Blueprint",
  night: "Night",
  mono: "Mono",
  brand: "Brand blue",
};

/** Resolve a design into the palette the drawing code uses. */
export function mapPalette(design: MapDesign): MapPalette {
  const base = THEMES[design.theme] ?? THEMES.directory;
  const accent = /^#[0-9a-f]{6}$/i.test(design.accent) ? design.accent : base.accent;
  return { ...base, accent };
}

const ZONE_ACCENT: Record<MapAreaKind, string> = {
  auditorium: "#003FC7",
  room: "#2C6FD1",
  foyer: "#0E7C8C",
  circulation: "#A6B1C4",
  core: "#6C7B92",
  hospitality: "#D2733F",
  exhibition: "#6A54C9",
  terrace: "#2E8B57",
  exterior: "#8593A8",
  stage: "#EC388A",
  catering: "#D2733F",
  meeting: "#2C6FD1",
  demo: "#0E7C8C",
  media: "#5A3FC0",
  vip: "#B27000",
  storage: "#6C7B92",
  support: "#2E8B57",
};

const KIND_INK: Record<LondonAssetKind, string> = {
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

/** Room tile fill + category bar for a zone, under the current design. */
export function zoneStyleFor(
  kind: MapAreaKind,
  design: MapDesign,
  pal: MapPalette = mapPalette(design),
): { fill: string; accent: string } {
  const quiet = kind === "circulation" || kind === "core";
  if (quiet) return { fill: pal.quietFill, accent: pal.quietAccent };
  const flat = design.theme === "mono" || design.theme === "night" || !design.roomTint;
  return {
    fill: kind === "exterior" || kind === "terrace" ? pal.walkway : pal.tile,
    accent: flat ? pal.accent : (ZONE_ACCENT[kind] ?? pal.accent),
  };
}

/** Marker ink for an asset kind under the current design. */
export function kindInkFor(
  kind: LondonAssetKind,
  design: MapDesign,
  pal: MapPalette = mapPalette(design),
): string {
  if (design.theme === "mono") return pal.ink;
  if (design.theme === "night") return pal.accent;
  return KIND_INK[kind] ?? pal.accent;
}

/** jsPDF page format for the chosen paper. `sheet` means "fit the artwork". */
export function pdfFormatFor(design: MapDesign): "a4" | "a3" | "a2" | null {
  if (design.paper === "sheet") return null;
  return design.paper.toLowerCase() as "a4" | "a3" | "a2";
}
