// Customisation for the credential proof split module (MV-PROOF-CERT-ORBITS).
//
// Stored on the slide content as `certStyle` and merged over the defaults at
// read time, so an untouched slide renders exactly like the shipped design and
// every knob round-trips through the cloud save and the PPTX export.

export type CertCardsSide = "right" | "left";
export type CertCardLook = "elevated" | "flat" | "outline";
export type CertBadgeShape = "square" | "round" | "none";
export type CertStatTile = "tile" | "rule" | "plain";
export type CertDensity = "comfortable" | "compact";
export type CertStatLayout = "row" | "stack";
export type CertStatFigureColor = "accent" | "ink";
export type CertStatLabelCase = "upper" | "normal";
export type CertStatAlign = "left" | "center";
export type CertPointMarker = "number" | "dash" | "dot" | "none";
export type CertLogoTone = "brand" | "mono";
export type CertAccentRole = "mixed" | "strong" | "quiet";
export type CertHeaderAlign = "left" | "center";

export type CertStyle = {
  /** Which column the credential cards sit in. */
  cardsSide: CertCardsSide;
  /** Width weight of the statement column against the cards column (0.6–1.6). */
  split: number;
  /** Tinted band behind the credential cards. */
  band: boolean;
  cardLook: CertCardLook;
  /** Accent edge bar on each card, px (0 = none). */
  accentBar: number;
  /** Staircase indent between cards, px. */
  stagger: number;
  /** Card corner radius, px. */
  cardRadius: number;
  /** Ghost index numeral on each card. */
  showIndex: boolean;
  /** Decorative arcs in the band corner. */
  showArcs: boolean;
  badge: CertBadgeShape;
  statTile: CertStatTile;
  /** Numbered rows in the spec-sheet block. */
  numberedPoints: boolean;
  /** Heading above the spec-sheet block. */
  coversLabel: string;
  density: CertDensity;
  /** Figures side by side or stacked in a column. */
  statLayout: CertStatLayout;
  /** Scale applied to the big figure type (0.7–1.6). */
  statSize: number;
  /** Big figure in the accent colour or the ink colour. */
  statFigureColor: CertStatFigureColor;
  /** Label typography case. */
  statLabelCase: CertStatLabelCase;
  /** Text alignment inside each figure block. */
  statAlign: CertStatAlign;
  /** Row marker for the spec-sheet points (number, dash, dot or none). */
  pointMarker: CertPointMarker;
  /** Credential marks at full brand colour or single-ink mono. */
  logoTone: CertLogoTone;
  /** How loudly the accent runs through the module. */
  accentRole: CertAccentRole;
  /** Scale applied to the credential badge area (0.8–1.4). */
  badgeScale: number;
  /** Alignment of the statement column heading. */
  headerAlign: CertHeaderAlign;
};

export const DEFAULT_CERT_STYLE: CertStyle = {
  cardsSide: "right",
  split: 0.92,
  band: true,
  cardLook: "elevated",
  accentBar: 7,
  stagger: 26,
  cardRadius: 6,
  showIndex: true,
  showArcs: true,
  badge: "none",
  statTile: "tile",
  numberedPoints: true,
  coversLabel: "What it covers",
  density: "comfortable",
  statLayout: "row",
  statSize: 1,
  statFigureColor: "accent",
  statLabelCase: "upper",
  statAlign: "left",
  pointMarker: "number",
  logoTone: "brand",
  accentRole: "mixed",
  badgeScale: 1,
  headerAlign: "left",
};

export const CERT_LIMITS = {
  split: { min: 0.6, max: 1.6, step: 0.02 },
  accentBar: { min: 0, max: 14, step: 1 },
  stagger: { min: 0, max: 80, step: 2 },
  cardRadius: { min: 0, max: 20, step: 1 },
  statSize: { min: 0.7, max: 1.6, step: 0.05 },
  badgeScale: { min: 0.8, max: 1.4, step: 0.05 },
} as const;

export const CERT_CARD_LOOKS: { id: CertCardLook; label: string }[] = [
  { id: "elevated", label: "Raised" },
  { id: "flat", label: "Flat" },
  { id: "outline", label: "Outline" },
];

export const CERT_BADGE_SHAPES: { id: CertBadgeShape; label: string }[] = [
  { id: "square", label: "Square well" },
  { id: "round", label: "Round well" },
  { id: "none", label: "No well" },
];

export const CERT_STAT_TILES: { id: CertStatTile; label: string }[] = [
  { id: "tile", label: "Tinted tile" },
  { id: "rule", label: "Accent rule" },
  { id: "plain", label: "Plain" },
];

export const CERT_STAT_LAYOUTS: { id: CertStatLayout; label: string }[] = [
  { id: "row", label: "Side by side" },
  { id: "stack", label: "Stacked" },
];

export const CERT_STAT_FIGURE_COLORS: { id: CertStatFigureColor; label: string }[] = [
  { id: "accent", label: "Accent" },
  { id: "ink", label: "Ink" },
];

export const CERT_STAT_LABEL_CASES: { id: CertStatLabelCase; label: string }[] = [
  { id: "upper", label: "Uppercase" },
  { id: "normal", label: "As typed" },
];

export const CERT_STAT_ALIGNS: { id: CertStatAlign; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Centred" },
];

export const CERT_POINT_MARKERS: { id: CertPointMarker; label: string }[] = [
  { id: "number", label: "Numbered" },
  { id: "dash", label: "Dash" },
  { id: "dot", label: "Dot" },
  { id: "none", label: "No marker" },
];

export const CERT_LOGO_TONES: { id: CertLogoTone; label: string }[] = [
  { id: "brand", label: "Brand colour" },
  { id: "mono", label: "Single ink" },
];

export const CERT_ACCENT_ROLES: { id: CertAccentRole; label: string }[] = [
  { id: "mixed", label: "Balanced" },
  { id: "strong", label: "Strong" },
  { id: "quiet", label: "Quiet" },
];

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Merge a stored blob over the defaults; always returns a complete style. */
export function resolveCertStyle(raw: unknown): CertStyle {
  const d = DEFAULT_CERT_STYLE;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...d };
  const o = raw as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    cardsSide: pick(o.cardsSide, ["right", "left"] as const, d.cardsSide),
    split: clamp(Number(o.split), CERT_LIMITS.split.min, CERT_LIMITS.split.max, d.split),
    band: bool(o.band, d.band),
    cardLook: pick(o.cardLook, ["elevated", "flat", "outline"] as const, d.cardLook),
    accentBar: Math.round(
      clamp(Number(o.accentBar), CERT_LIMITS.accentBar.min, CERT_LIMITS.accentBar.max, d.accentBar),
    ),
    stagger: Math.round(
      clamp(Number(o.stagger), CERT_LIMITS.stagger.min, CERT_LIMITS.stagger.max, d.stagger),
    ),
    cardRadius: Math.round(
      clamp(
        Number(o.cardRadius),
        CERT_LIMITS.cardRadius.min,
        CERT_LIMITS.cardRadius.max,
        d.cardRadius,
      ),
    ),
    showIndex: bool(o.showIndex, d.showIndex),
    showArcs: bool(o.showArcs, d.showArcs),
    badge: pick(o.badge, ["square", "round", "none"] as const, d.badge),
    statTile: pick(o.statTile, ["tile", "rule", "plain"] as const, d.statTile),
    numberedPoints: bool(o.numberedPoints, d.numberedPoints),
    coversLabel: typeof o.coversLabel === "string" ? o.coversLabel : d.coversLabel,
    density: pick(o.density, ["comfortable", "compact"] as const, d.density),
    statLayout: pick(o.statLayout, ["row", "stack"] as const, d.statLayout),
    statSize:
      Math.round(
        clamp(Number(o.statSize), CERT_LIMITS.statSize.min, CERT_LIMITS.statSize.max, d.statSize) *
          20,
      ) / 20,
    statFigureColor: pick(o.statFigureColor, ["accent", "ink"] as const, d.statFigureColor),
    statLabelCase: pick(o.statLabelCase, ["upper", "normal"] as const, d.statLabelCase),
    statAlign: pick(o.statAlign, ["left", "center"] as const, d.statAlign),
    pointMarker: pick(o.pointMarker, ["number", "dash", "dot", "none"] as const, d.pointMarker),
    logoTone: pick(o.logoTone, ["brand", "mono"] as const, d.logoTone),
    accentRole: pick(o.accentRole, ["mixed", "strong", "quiet"] as const, d.accentRole),
    badgeScale:
      Math.round(
        clamp(
          Number(o.badgeScale),
          CERT_LIMITS.badgeScale.min,
          CERT_LIMITS.badgeScale.max,
          d.badgeScale,
        ) * 20,
      ) / 20,
    headerAlign: pick(o.headerAlign, ["left", "center"] as const, d.headerAlign),
  };
}

/** Apply a partial change on top of the resolved style. */
export function patchCertStyle(raw: unknown, patch: Partial<CertStyle>): CertStyle {
  return resolveCertStyle({ ...resolveCertStyle(raw), ...patch });
}

export function isDefaultCertStyle(style: CertStyle): boolean {
  return (Object.keys(DEFAULT_CERT_STYLE) as (keyof CertStyle)[]).every(
    (k) => style[k] === DEFAULT_CERT_STYLE[k],
  );
}

export function resetCertStyle(): CertStyle {
  return { ...DEFAULT_CERT_STYLE };
}
