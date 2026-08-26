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

/** Real-world pillar footprints. Venues ship a mix of thin columns, standard
 * pillars and broad wrap faces, so the sheet geometry is selectable. */
export type PillarSizeId = "thin" | "slim" | "standard" | "wide" | "wrap" | "custom";

export const PILLAR_SIZES: {
  id: PillarSizeId;
  name: string;
  note: string;
  trimW: number;
  trimH: number;
}[] = [
  { id: "thin", name: "Thin column", note: "Narrow structural column or lamp post wrap.", trimW: 300, trimH: 2000 },
  { id: "slim", name: "Slim pillar", note: "Concourse column, single-face graphic.", trimW: 450, trimH: 2000 },
  {
    id: "standard",
    name: "Standard pillar",
    note: "The issued NEXT pillar sheet — matches the City Series artwork.",
    trimW: PILLAR_SPEC.trimW,
    trimH: PILLAR_SPEC.trimH,
  },
  { id: "wide", name: "Wide pillar", note: "Broad column or double-width entrance face.", trimW: 900, trimH: 2200 },
  { id: "wrap", name: "Wrap face", note: "Full column wrap panel, floor to ceiling.", trimW: 1200, trimH: 2600 },
  { id: "custom", name: "Custom size", note: "Type the measured trim of the pillar face.", trimW: 600, trimH: 2000 },
];

export const PILLAR_CUSTOM_SIZE = {
  w: { min: 150, max: 2400, step: 5 },
  h: { min: 500, max: 4000, step: 10 },
};

/** Sub-headline cap height range in mm. */
export const PILLAR_SUB_SIZE = { min: 12, max: 120, step: 2 };

/** Printed QR module block size range in mm (edge length of the code). */
export const PILLAR_QR_SIZE = { min: 60, max: 500, step: 10 };

/** QR caption cap height range in mm. 0 = follow the sub-line size. */
export const PILLAR_CAPTION_SIZE = { min: 8, max: 90, step: 1 };

/** Padding kept between the QR block, its caption and the safe edges (mm). */
export const PILLAR_CAPTION_PAD = { min: 0, max: 80, step: 2 };

/** Caption type treatments available on the QR block. */
export type PillarCaptionFontId = "bold-caps" | "bold" | "regular";

export const PILLAR_CAPTION_FONTS: { id: PillarCaptionFontId; name: string; uppercase: boolean; weight: number; tracking: number }[] = [
  { id: "bold-caps", name: "Geist Bold · caps", uppercase: true, weight: 600, tracking: 0.06 },
  { id: "bold", name: "Geist Bold", uppercase: false, weight: 600, tracking: 0.01 },
  { id: "regular", name: "Geist Regular", uppercase: false, weight: 400, tracking: 0.01 },
];

export type PillarCaptionAlign = "left" | "center" | "right";

/** Module rendering styles for printed QR codes. */
export type PillarQrStyleId = "block" | "rounded" | "dot";
export const PILLAR_QR_STYLES: { id: PillarQrStyleId; label: string; note: string }[] = [
  { id: "block", label: "Block", note: "Classic square modules. Highest scan reliability." },
  { id: "rounded", label: "Rounded", note: "Soft-cornered modules. Scans reliably at level H." },
  { id: "dot", label: "Dot", note: "Circular modules. Keep the block size generous." },
];

/** Minimum luminance contrast between QR ink and its plate. Below this phone
 * cameras struggle, so the editor flags and offers a one-click fix. */
export const PILLAR_QR_MIN_CONTRAST = 3;

export function pillarSize(id: string | undefined) {
  return PILLAR_SIZES.find((s) => s.id === id) ?? PILLAR_SIZES[2]!;
}

/** Resolved sheet geometry for a pillar config, in mm. */
export function pillarGeometry(config: { sizeId?: string; trimW?: number; trimH?: number }) {
  const preset = pillarSize(config.sizeId);
  const custom = preset.id === "custom";
  const clamp = (v: number | undefined, fb: number, r: { min: number; max: number }) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(r.max, Math.max(r.min, n)) : fb;
  };
  const trimW = custom ? clamp(config.trimW, preset.trimW, PILLAR_CUSTOM_SIZE.w) : preset.trimW;
  const trimH = custom ? clamp(config.trimH, preset.trimH, PILLAR_CUSTOM_SIZE.h) : preset.trimH;
  const bleedEdge = PILLAR_SPEC.bleedEdge;
  // Narrow columns cannot carry the full 60 mm inset and still hold copy.
  const safeInset = Math.max(18, Math.min(PILLAR_SPEC.safeInset, trimW * 0.1));
  return {
    trimW,
    trimH,
    bleedEdge,
    bleedW: trimW + bleedEdge * 2,
    bleedH: trimH + bleedEdge * 2,
    safeInset,
    rasterPpi: PILLAR_SPEC.rasterPpi,
    colorMode: PILLAR_SPEC.colorMode,
    exportPreset: PILLAR_SPEC.exportPreset,
    sizeName: preset.name,
  };
}

export const PILLAR_DIVISIONS = CITY_BADGE_DIVISIONS;
export const pillarDivision = cityBadgeDivision;


import type { PillarArrowStyleId } from "./pillar-arrows";

export type PillarKindId = "welcome" | "registration" | "logo" | "directional";

export type PillarKind = {
  id: PillarKindId;
  name: string;
  note: string;
  defaultStyle: string;
  headline: string;
  /** Default headline cap height in mm on the trim sheet. */
  headlineSize: number;
};

export const PILLAR_KINDS: PillarKind[] = [
  {
    id: "welcome",
    name: "Welcome",
    note: "Entrance pillar. Sets the room at arrival — lockup high, single welcome line, nothing else.",
    defaultStyle: "01-beam-violet-aqua",
    headline: "WELCOME",
    headlineSize: 104,
  },
  {
    id: "registration",
    name: "Registration",
    note: "Check-in pillar. Reads from across the concourse and pairs with the desk fronts.",
    defaultStyle: "04-horizon",
    headline: "REGISTRATION",
    headlineSize: 78,
  },
  {
    id: "logo",
    name: "General logo",
    note: "Brand-only pillar for repeats down a corridor or either side of a stage.",
    defaultStyle: "01-beam-violet-aqua",
    headline: "",
    headlineSize: 104,
  },
  {
    id: "directional",
    name: "Directional",
    note: "Wayfinding pillar. One destination, one arrow — nothing else competes with it.",
    defaultStyle: "03-wash-diagonal",
    headline: "MAIN STAGE",
    headlineSize: 90,
  },
];

/** Approved headline size range in mm (cap height on the trim sheet). */
export const PILLAR_HEADLINE_SIZE = { min: 40, max: 220, step: 2 };

/** Division lockup scale range, 1 = the approved default width (58% of trim). */
export const PILLAR_LOCKUP_SCALE = { min: 0.5, max: 1.6, step: 0.05 };

/** Extra downward nudge for the headline block, in mm. Never negative, so the
 * copy can drop lower down the column but can never ride up into the lockup. */
export const PILLAR_HEADLINE_OFFSET = { min: 0, max: 900, step: 10 };


/** Approved ink options for pillar copy. */
export const PILLAR_TEXT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "white", label: "White", hex: "#FFFFFF" },
  { id: "blue-800", label: "Blue 800", hex: "#03002C" },
  { id: "blue-500", label: "Blue 500", hex: "#003FC7" },
  { id: "blue-white", label: "Blue White", hex: "#E0E8F5" },
  { id: "aqua", label: "Aqua", hex: "#A1FBF9" },
  { id: "lavender", label: "Lavender", hex: "#C2A3FF" },
  { id: "yellow", label: "Yellow", hex: "#FFEB66" },
];


export function pillarKind(id: string | undefined): PillarKind {
  return PILLAR_KINDS.find((k) => k.id === id) ?? PILLAR_KINDS[0]!;
}

export { PILLAR_ARROW_STYLES, pillarArrowStyle, pillarArrowPath } from "./pillar-arrows";
export type { PillarArrowStyleId } from "./pillar-arrows";

/** General logo pillars drop the lockup a quarter of the way down the column so
 * the mark sits below eye-line clutter and leaves room for a URL / socials. */
export const PILLAR_LOGO_DROP = 0.25;

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
  arrow: PillarArrow;
  /** Arrow silhouette for directional pillars. */
  arrowStyle: PillarArrowStyleId;
  /** Optional URL printed under the lockup on a general logo pillar. */
  logoUrl: string;
  /** Optional social handles / hashtag line under the logo pillar URL. */
  logoSocial: string;
  showLockup: boolean;
  /** Approved gradient face: full-saturation dark, or the light tint. */
  face: PillarFaceId;
  /** Run the headline up the column so long words get the full pillar height. */
  verticalHeadline: boolean;
  /** Headline cap height in mm on the trim sheet. */
  headlineSize: number;
  /** Headline ink. Empty string = the face default ink. */
  headlineColor: string;
  /** Division lockup scale, 1 = the approved default width. */
  lockupScale: number;
  /** Extra downward offset for the headline block in mm (never negative). */
  headlineOffset: number;
  /** Pillar footprint preset. */
  sizeId: PillarSizeId;
  /** Measured trim width/height in mm, used when sizeId is "custom". */
  trimW: number;
  trimH: number;
  /** Optional supporting line under the headline. */
  subheadline: string;
  /** Sub-headline cap height in mm. */
  subheadlineSize: number;
  /** Printed QR payload (URL or text). Empty = no QR on the sign. */
  qrData: string;
  /** QR block edge length in mm on the trim sheet. */
  qrSize: number;
  /** Optional caption printed under the QR block. */
  qrCaption: string;
  /** Caption type treatment. */
  qrCaptionFont: PillarCaptionFontId;
  /** Caption cap height in mm. 0 = derive from the sub-line size. */
  qrCaptionSize: number;
  /** Caption alignment relative to the QR block. */
  qrCaptionAlign: PillarCaptionAlign;
  /** Padding between the code, its caption and the safe edges (mm). */
  qrCaptionPad: number;
  /** QR module shape. */
  qrStyle: PillarQrStyleId;
  /** QR ink hex. Empty = the approved default (Blue 800). */
  qrForeground: string;
  /** QR plate hex. Empty = white. */
  qrBackground: string;
  /** Drop the plate entirely and print just the code modules over the gradient. */
  qrTransparent: boolean;
  /** Placed QR block position in mm from the trim top-left. null = default flow. */
  qrOffsetX: number | null;
  qrOffsetY: number | null;
  /** Event this live pillar file belongs to (free text label). */
  eventLabel: string;
};

export function pillarDefault(kindId: PillarKindId = "welcome", divisionId = "city-series"): PillarConfig {
  const kind = pillarKind(kindId);
  return {
    kind: kind.id,
    divisionId: pillarDivision(divisionId).id,
    styleId: kind.defaultStyle,
    headline: kind.headline,
    arrow: "right",
    arrowStyle: "solid",
    logoUrl: "",
    logoSocial: "",
    showLockup: true,
    face: "dark",
    verticalHeadline: true,
    headlineSize: kind.headlineSize,
    headlineColor: "",
    lockupScale: 1,
    headlineOffset: 0,
    sizeId: "standard",
    trimW: PILLAR_SPEC.trimW,
    trimH: PILLAR_SPEC.trimH,
    subheadline: "",
    subheadlineSize: 34,
    qrData: "",
    qrSize: 180,
    qrCaption: "",
    qrCaptionFont: "bold-caps",
    qrCaptionSize: 0,
    qrCaptionAlign: "center",
    qrCaptionPad: 14,
    qrStyle: "block",
    qrForeground: "",
    qrBackground: "",
    qrTransparent: false,
    qrOffsetX: null,
    qrOffsetY: null,
    eventLabel: "",
  };
}

/** Clamp the sub-headline size into the approved range. */
export function pillarSubSize(config: PillarConfig): number {
  const raw = Number(config.subheadlineSize);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 34;
  return Math.min(PILLAR_SUB_SIZE.max, Math.max(PILLAR_SUB_SIZE.min, value));
}

/** Clamp the printed QR size into the approved range. */
export function pillarQrSize(config: PillarConfig): number {
  const raw = Number(config.qrSize);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 180;
  return Math.min(PILLAR_QR_SIZE.max, Math.max(PILLAR_QR_SIZE.min, value));
}

/** Caption type treatment for the QR block. */
export function pillarCaptionFont(config: PillarConfig) {
  return (
    PILLAR_CAPTION_FONTS.find((f) => f.id === config.qrCaptionFont) ?? PILLAR_CAPTION_FONTS[0]!
  );
}

/** Caption cap height in mm. 0 / unset follows the sub-line size. */
export function pillarCaptionSize(config: PillarConfig): number {
  const raw = Number(config.qrCaptionSize);
  if (!Number.isFinite(raw) || raw <= 0) return Math.max(10, pillarSubSize(config) * 0.55);
  return Math.min(PILLAR_CAPTION_SIZE.max, Math.max(PILLAR_CAPTION_SIZE.min, raw));
}

export function pillarCaptionAlign(config: PillarConfig): PillarCaptionAlign {
  return config.qrCaptionAlign === "left" || config.qrCaptionAlign === "right"
    ? config.qrCaptionAlign
    : "center";
}

/** Padding kept between the code, its caption and the safe edges (mm). */
export function pillarCaptionPad(config: PillarConfig): number {
  const raw = Number(config.qrCaptionPad);
  const value = Number.isFinite(raw) && raw >= 0 ? raw : 14;
  return Math.min(PILLAR_CAPTION_PAD.max, Math.max(PILLAR_CAPTION_PAD.min, value));
}

/**
 * Resolved geometry of the QR block (code + caption) in mm from the trim
 * top-left. Positions are always clamped inside the safe area so a dragged QR
 * can never leave printable copy outside the safe margin.
 */
export function pillarQrPlacement(config: PillarConfig) {
  const geo = pillarGeometry(config);
  const edge = Math.min(pillarQrSize(config), geo.trimW - geo.safeInset * 2);
  const caption = (config.qrCaption ?? "").trim();
  const captionSize = pillarCaptionSize(config);
  const captionPad = pillarCaptionPad(config);
  const captionAlign = pillarCaptionAlign(config);
  const captionBlock = caption ? captionPad + captionSize * 1.25 : 0;
  const blockH = edge + captionBlock;
  // The caption padding also holds the whole block off the safe edges, so a
  // formatted caption never crowds the trim.
  const inset = geo.safeInset + (caption ? captionPad : 0);
  const minX = inset;
  const maxX = Math.max(minX, geo.trimW - inset - edge);
  const minY = inset;
  const maxY = Math.max(minY, geo.trimH - inset - blockH);
  const defaultX = (geo.trimW - edge) / 2;
  const defaultY = maxY;
  const rawX = Number(config.qrOffsetX);
  const rawY = Number(config.qrOffsetY);
  const placed =
    config.qrOffsetX !== null &&
    config.qrOffsetY !== null &&
    Number.isFinite(rawX) &&
    Number.isFinite(rawY);
  const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
  return {
    edge,
    caption,
    captionSize,
    captionBlock,
    captionPad,
    captionAlign,
    captionFont: pillarCaptionFont(config),
    blockH,
    placed,
    x: clamp(placed ? rawX : defaultX, minX, maxX),
    y: clamp(placed ? rawY : defaultY, minY, maxY),
    minX,
    maxX,
    minY,
    maxY,
    defaultX,
    defaultY,
    centerX: geo.trimW / 2,
    centerY: geo.trimH / 2,
  };
}

/** Resolve the QR module shape. */
export function pillarQrStyle(config: PillarConfig): PillarQrStyleId {
  return PILLAR_QR_STYLES.some((s) => s.id === config.qrStyle) ? config.qrStyle : "block";
}

/** QR ink: the approved Blue 800 unless the user picked another ink. */
export function pillarQrForeground(config: PillarConfig): string {
  const v = (config.qrForeground ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : "#03002C";
}

/** QR plate: white unless the user picked another colour. */
export function pillarQrBackground(config: PillarConfig): string {
  const v = (config.qrBackground ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : "#FFFFFF";
}

/** WCAG relative-luminance contrast between two hex colours (1–21). */
export function pillarContrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const chan = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0]! + 0.7152 * chan[1]! + 0.0722 * chan[2]!;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** True when the plate is dropped and the code prints straight on the gradient. */
export function pillarQrTransparent(config: PillarConfig): boolean {
  return config.qrTransparent === true;
}

/**
 * Colour the code actually sits on: the plate, or — when the plate is dropped —
 * the lightest gradient stop of the active face, which is the worst case the
 * modules have to survive.
 */
export function pillarQrPlateColor(config: PillarConfig): string {
  if (!pillarQrTransparent(config)) return pillarQrBackground(config);
  const stops = pillarStops(config.styleId, pillarFace(config.face).id);
  let best = stops[0] ?? "#003FC7";
  let bestRatio = -1;
  for (const s of stops) {
    const r = pillarContrastRatio(pillarQrForeground(config), s);
    if (r > bestRatio) continue;
    bestRatio = r;
    best = s;
  }
  return best.toUpperCase();
}

/** True when the QR pairing is contrasty enough to scan reliably. */
export function pillarQrScanSafe(config: PillarConfig): boolean {
  return pillarContrastRatio(pillarQrForeground(config), pillarQrPlateColor(config)) >= PILLAR_QR_MIN_CONTRAST;
}


/** Clamp a headline size into the approved range. */
export function pillarHeadlineSize(config: PillarConfig): number {
  const raw = Number(config.headlineSize);
  const fallback = pillarKind(config.kind).headlineSize;
  const value = Number.isFinite(raw) && raw > 0 ? raw : fallback;
  return Math.min(PILLAR_HEADLINE_SIZE.max, Math.max(PILLAR_HEADLINE_SIZE.min, value));
}

/** Clamp the division lockup scale into the approved range. */
export function pillarLockupScale(config: PillarConfig): number {
  const raw = Number(config.lockupScale);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.min(PILLAR_LOCKUP_SCALE.max, Math.max(PILLAR_LOCKUP_SCALE.min, value));
}


/** Clamp the headline downward offset into the approved range. */
export function pillarHeadlineOffset(config: PillarConfig): number {
  const raw = Number(config.headlineOffset);
  const value = Number.isFinite(raw) ? raw : 0;
  return Math.min(PILLAR_HEADLINE_OFFSET.max, Math.max(PILLAR_HEADLINE_OFFSET.min, value));
}

/** Resolve the headline ink, falling back to the face default. */
export function pillarHeadlineInk(config: PillarConfig): string {
  const hex = (config.headlineColor || "").trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : pillarInk(config.face ?? "dark");
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
    headlineSize: config.headlineSize === from.headlineSize ? to.headlineSize : config.headlineSize,
  };
}


export function pillarName(config: PillarConfig): string {
  const g = pillarGeometry(config);
  return `${pillarDivision(config.divisionId).name} · ${pillarKind(config.kind).name} pillar · ${pillarFace(config.face).name.toLowerCase()} · ${Math.round(g.trimW)}×${Math.round(g.trimH)} mm`;
}

export function pillarSlug(config: PillarConfig): string {
  const g = pillarGeometry(config);
  return `${config.divisionId}-${config.kind}-${config.face ?? "dark"}-${Math.round(g.trimW)}x${Math.round(g.trimH)}-${config.styleId}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A LondonPanel-shaped record so the pillar can reuse the venue vector/AI generators. */
export function pillarPanelSpec(config: PillarConfig) {
  const g = pillarGeometry(config);
  return {
    id: `pillar-${pillarSlug(config)}`,
    floor: "GF" as const,
    room: pillarDivision(config.divisionId).name.toUpperCase(),
    proof: "NEXT master pillar",
    page: 1,
    name: pillarName(config),
    ground: "Pillar column",
    style: config.styleId,
    trimW: g.trimW,
    trimH: g.trimH,
    bleedW: g.bleedW,
    bleedH: g.bleedH,
    bleedEdge: g.bleedEdge,
    rasterPx: `${Math.round((g.bleedW / 25.4) * g.rasterPpi)}x${Math.round((g.bleedH / 25.4) * g.rasterPpi)}`,
    rasterPpi: g.rasterPpi,
    bandMm: 2.12,
    rasterMb: 4.2,
  };

}
