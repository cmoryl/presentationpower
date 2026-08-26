// -----------------------------------------------------------------------------
// TransPerfect NEXT — master pillar signs.
//
// One press-ready pillar family, built on the same live gradient treatments as
// the NEXT 2026 London signage kit, available for every NEXT division area:
// only the approved division lockup and the copy change, never the palette or
// the geometry.
//
// Sign kinds: WELCOME · REGISTRATION · LOGO (general) · DIRECTIONAL.
// -----------------------------------------------------------------------------

import { LONDON_STYLES } from "@/lib/next-london-signage";
import { CITY_BADGE_DIVISIONS, cityBadgeDivision } from "@/lib/next-city-badge";

/** Geometry taken from the issued City Series pillar artwork (1692 × 5616 pt). */
export const PILLAR_SPEC = {
  trimW: 596.9,
  trimH: 1981.0,
  bleedEdge: 25.0,
  get bleedW() {
    return this.trimW + this.bleedEdge * 2;
  },
  get bleedH() {
    return this.trimH + this.bleedEdge * 2;
  },
  /** Safe area inset from trim, in mm. */
  safeInset: 60,
  rasterPpi: 36,
  colorMode: "CMYK (offset + digital)",
  exportPreset: "PDF/X-4",
} as const;

export const PILLAR_DIVISIONS = CITY_BADGE_DIVISIONS;
export const pillarDivision = cityBadgeDivision;

export type PillarKindId = "welcome" | "registration" | "logo" | "directional";

export type PillarKind = {
  id: PillarKindId;
  name: string;
  note: string;
  defaultStyle: string;
  headline: string;
  subline: string;
  detail: string;
};

export const PILLAR_KINDS: PillarKind[] = [
  {
    id: "welcome",
    name: "Welcome",
    note: "Entrance pillar. Sets the room at arrival — lockup high, single welcome line, event detail at the foot.",
    defaultStyle: "01-beam-violet-aqua",
    headline: "WELCOME",
    subline: "TransPerfect NEXT 2026",
    detail: "Doors 08:30 · Keynote 09:30",
  },
  {
    id: "registration",
    name: "Registration",
    note: "Check-in pillar. Reads from across the concourse and pairs with the desk fronts.",
    defaultStyle: "04-horizon",
    headline: "REGISTRATION",
    subline: "Badge collection & check-in",
    detail: "Have your QR ready",
  },
  {
    id: "logo",
    name: "General logo",
    note: "Brand-only pillar for repeats down a corridor or either side of a stage.",
    defaultStyle: "08-halo",
    headline: "",
    subline: "",
    detail: "",
  },
  {
    id: "directional",
    name: "Directional",
    note: "Wayfinding pillar. One destination, one arrow — nothing else competes with it.",
    defaultStyle: "03-wash-diagonal",
    headline: "MAIN STAGE",
    subline: "Keynotes & plenaries",
    detail: "Level 2",
  },
];

export function pillarKind(id: string | undefined): PillarKind {
  return PILLAR_KINDS.find((k) => k.id === id) ?? PILLAR_KINDS[0]!;
}

export type PillarArrow = "left" | "right" | "up" | "down";

export const PILLAR_ARROWS: { id: PillarArrow; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "up", label: "Straight ahead" },
  { id: "down", label: "Down / lower level" },
];

export const PILLAR_STYLE_IDS = Object.keys(LONDON_STYLES);

/** Approved pillar faces: the issued gradient ground, or its light tint. */
export type PillarFaceId = "dark" | "light";

export const PILLAR_FACES: { id: PillarFaceId; name: string; note: string }[] = [
  {
    id: "dark",
    name: "Dark face",
    note: "The issued gradient ground at full saturation, white lockup and white copy. Default for entrances, stage wings and low-light halls.",
  },
  {
    id: "light",
    name: "Light face",
    note: "The same gradient tinted back toward blue-white, with the colour lockup and Blue 800 copy. For bright concourses, daylight atria and print economy.",
  },
];

const LIGHT_TINT = 0.68;
const LIGHT_BASE = [247, 249, 252] as const;

function tint(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out = rgb.map((c, i) => Math.round(c + (LIGHT_BASE[i]! - c) * amount));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function pillarStops(styleId: string, face: PillarFaceId = "dark"): string[] {
  const stops = LONDON_STYLES[styleId]?.stops ?? LONDON_STYLES["01-beam-violet-aqua"]!.stops;
  return face === "light" ? stops.map((s) => tint(s, LIGHT_TINT)) : stops;
}

/** Copy / lockup ink for a face. */
export function pillarInk(face: PillarFaceId): string {
  return face === "light" ? "#03002C" : "#FFFFFF";
}

export function pillarFace(id: string | undefined) {
  return PILLAR_FACES.find((f) => f.id === id) ?? PILLAR_FACES[0]!;
}

export function pillarStyleLabel(styleId: string): string {
  return LONDON_STYLES[styleId]?.label ?? styleId;
}

export type PillarConfig = {
  kind: PillarKindId;
  divisionId: string;
  styleId: string;
  headline: string;
  subline: string;
  detail: string;
  arrow: PillarArrow;
  showLockup: boolean;
  /** Approved gradient face: full-saturation dark, or the light tint. */
  face: PillarFaceId;
  /** Run the headline up the column so long words get the full pillar height. */
  verticalHeadline: boolean;
};

export function pillarDefault(kindId: PillarKindId = "welcome", divisionId = "city-series"): PillarConfig {
  const kind = pillarKind(kindId);
  return {
    kind: kind.id,
    divisionId: pillarDivision(divisionId).id,
    styleId: kind.defaultStyle,
    headline: kind.headline,
    subline: kind.subline,
    detail: kind.detail,
    arrow: "right",
    showLockup: true,
    face: "dark",
    verticalHeadline: false,
  };
}

/** Swap the sign kind while keeping any copy the operator has already typed. */
export function withPillarKind(config: PillarConfig, kindId: PillarKindId): PillarConfig {
  const from = pillarKind(config.kind);
  const to = pillarKind(kindId);
  const keep = (current: string, previousDefault: string, nextDefault: string) =>
    current.trim() === previousDefault.trim() ? nextDefault : current;
  return {
    ...config,
    kind: to.id,
    styleId: config.styleId === from.defaultStyle ? to.defaultStyle : config.styleId,
    headline: keep(config.headline, from.headline, to.headline),
    subline: keep(config.subline, from.subline, to.subline),
    detail: keep(config.detail, from.detail, to.detail),
  };
}

export function pillarName(config: PillarConfig): string {
  return `${pillarDivision(config.divisionId).name} · ${pillarKind(config.kind).name} pillar · ${pillarFace(config.face).name.toLowerCase()}`;
}

export function pillarSlug(config: PillarConfig): string {
  return `${config.divisionId}-${config.kind}-${config.face ?? "dark"}-${config.styleId}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A LondonPanel-shaped record so the pillar can reuse the venue vector/AI generators. */
export function pillarPanelSpec(config: PillarConfig) {
  return {
    id: `pillar-${pillarSlug(config)}`,
    floor: "GF" as const,
    room: pillarDivision(config.divisionId).name.toUpperCase(),
    proof: "NEXT master pillar",
    page: 1,
    name: pillarName(config),
    ground: "Pillar column",
    style: config.styleId,
    trimW: PILLAR_SPEC.trimW,
    trimH: PILLAR_SPEC.trimH,
    bleedW: PILLAR_SPEC.bleedW,
    bleedH: PILLAR_SPEC.bleedH,
    bleedEdge: PILLAR_SPEC.bleedEdge,
    rasterPx: "846x2812",
    rasterPpi: PILLAR_SPEC.rasterPpi,
    bandMm: 2.12,
    rasterMb: 4.2,
  };
}
