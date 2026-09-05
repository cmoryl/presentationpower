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
  badge: "square",
  statTile: "tile",
  numberedPoints: true,
  coversLabel: "What it covers",
  density: "comfortable",
};

export const CERT_LIMITS = {
  split: { min: 0.6, max: 1.6, step: 0.02 },
  accentBar: { min: 0, max: 14, step: 1 },
  stagger: { min: 0, max: 80, step: 2 },
  cardRadius: { min: 0, max: 20, step: 1 },
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
