/**
 * Structural + style ops for the two showcase modules:
 *
 *  - MV-SOL-CAP-CARDS   capability cards (photo · label band · bullets)
 *  - MV-SHOW-DEVICE-QUAD device screen beside a benefit quad
 *
 * The renderer, the editor panels and the PowerPoint export all read capacity
 * and defaults from here, so add/remove/reorder can never drift between them.
 */

export type CapCardTone = "ink" | "accent" | "aqua" | "lavender";

export type CapCard = {
  label: string;
  lead: string;
  leadNote: string;
  bullets: string[];
  tone: CapCardTone;
  /** Deterministic imagery seed when no explicit image is chosen. */
  mediaSeed?: string;
  /** Curator-chosen image (upload or pasted URL). */
  mediaUrl?: string;
  /** Private-bucket storage path so the URL can be re-signed. */
  mediaPath?: string;
  mediaFit?: string;
  mediaFocus?: string;
};

export type QuadBenefit = { icon: string; label: string };

export const MIN_CARDS = 2;
export const MAX_CARDS = 4;
export const MAX_CARD_BULLETS = 6;

export const MIN_BENEFITS = 2;
export const MAX_BENEFITS = 6;

export const CAP_CARD_TONES: { id: CapCardTone; label: string }[] = [
  { id: "ink", label: "Deep ink" },
  { id: "accent", label: "Accent blue" },
  { id: "aqua", label: "Aqua" },
  { id: "lavender", label: "Lavender" },
];

const TONES = CAP_CARD_TONES.map((t) => t.id);

function clamp(v: number, min: number, max: number, fb: number) {
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const str = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);

// ── Capability cards ──────────────────────────────────────────────────────

export function readCards(raw: unknown): CapCard[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.slice(0, MAX_CARDS).map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      label: str(o.label),
      lead: str(o.lead),
      leadNote: str(o.leadNote),
      bullets: (Array.isArray(o.bullets) ? o.bullets : [])
        .filter((b): b is string => typeof b === "string")
        .slice(0, MAX_CARD_BULLETS),
      tone: pick(o.tone, TONES, i === 1 ? "accent" : "ink"),
      mediaSeed: typeof o.mediaSeed === "string" ? o.mediaSeed : undefined,
      mediaUrl: typeof o.mediaUrl === "string" ? o.mediaUrl : undefined,
      mediaPath: typeof o.mediaPath === "string" ? o.mediaPath : undefined,
      mediaFit: typeof o.mediaFit === "string" ? o.mediaFit : undefined,
      mediaFocus: typeof o.mediaFocus === "string" ? o.mediaFocus : undefined,
    };
  });
}

export function addCard(cards: CapCard[]): CapCard[] {
  if (cards.length >= MAX_CARDS) return cards;
  return [
    ...cards,
    {
      label: "NEW SECTION",
      lead: "Headline claim:",
      leadNote: "One line of support",
      bullets: ["First proof point", "Second proof point"],
      tone: cards.length % 2 === 1 ? "accent" : "ink",
      mediaSeed: `card-${cards.length + 1}`,
    },
  ];
}

export function removeCard(cards: CapCard[], index: number): CapCard[] {
  if (cards.length <= MIN_CARDS) return cards;
  return cards.filter((_, i) => i !== index);
}

export function moveCard(cards: CapCard[], index: number, delta: number): CapCard[] {
  const to = index + delta;
  if (index < 0 || index >= cards.length || to < 0 || to >= cards.length) return cards;
  const next = cards.slice();
  const [row] = next.splice(index, 1);
  next.splice(to, 0, row);
  return next;
}

export function patchCard(cards: CapCard[], index: number, patch: Partial<CapCard>): CapCard[] {
  return cards.map((c, i) => (i === index ? { ...c, ...patch } : c));
}

export function addBullet(cards: CapCard[], index: number): CapCard[] {
  const card = cards[index];
  if (!card || card.bullets.length >= MAX_CARD_BULLETS) return cards;
  return patchCard(cards, index, { bullets: [...card.bullets, "New point"] });
}

export function removeBullet(cards: CapCard[], index: number, bi: number): CapCard[] {
  const card = cards[index];
  if (!card) return cards;
  return patchCard(cards, index, { bullets: card.bullets.filter((_, i) => i !== bi) });
}

export function moveBullet(
  cards: CapCard[],
  index: number,
  bi: number,
  delta: number,
): CapCard[] {
  const card = cards[index];
  if (!card) return cards;
  const to = bi + delta;
  if (bi < 0 || bi >= card.bullets.length || to < 0 || to >= card.bullets.length) return cards;
  const bullets = card.bullets.slice();
  const [row] = bullets.splice(bi, 1);
  bullets.splice(to, 0, row);
  return patchCard(cards, index, { bullets });
}

export function patchBullet(
  cards: CapCard[],
  index: number,
  bi: number,
  value: string,
): CapCard[] {
  const card = cards[index];
  if (!card) return cards;
  return patchCard(cards, index, {
    bullets: card.bullets.map((b, i) => (i === bi ? value : b)),
  });
}

// ── Capability card style ─────────────────────────────────────────────────

export type CapCardStyle = {
  /** Fraction of the card height given to the photograph (0.28–0.62). */
  imageRatio: number;
  cardRadius: number;
  gap: number;
  bandCase: "upper" | "as-typed";
  cardLook: "elevated" | "flat" | "outline";
  bulletMark: "dot" | "dash" | "number";
  leadColor: "tone" | "accent" | "ink";
  showBandRule: boolean;
  density: "comfortable" | "compact";
};

export const DEFAULT_CAP_CARD_STYLE: CapCardStyle = {
  imageRatio: 0.44,
  cardRadius: 14,
  gap: 34,
  bandCase: "upper",
  cardLook: "elevated",
  bulletMark: "dot",
  leadColor: "tone",
  showBandRule: false,
  density: "comfortable",
};

export const CAP_CARD_LIMITS = {
  imageRatio: { min: 0.28, max: 0.62, step: 0.01 },
  cardRadius: { min: 0, max: 28, step: 1 },
  gap: { min: 12, max: 72, step: 2 },
} as const;

export function resolveCapCardStyle(raw: unknown): CapCardStyle {
  const d = DEFAULT_CAP_CARD_STYLE;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...d };
  const o = raw as Record<string, unknown>;
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
  return {
    imageRatio:
      Math.round(
        clamp(
          Number(o.imageRatio),
          CAP_CARD_LIMITS.imageRatio.min,
          CAP_CARD_LIMITS.imageRatio.max,
          d.imageRatio,
        ) * 100,
      ) / 100,
    cardRadius: Math.round(
      clamp(
        Number(o.cardRadius),
        CAP_CARD_LIMITS.cardRadius.min,
        CAP_CARD_LIMITS.cardRadius.max,
        d.cardRadius,
      ),
    ),
    gap: Math.round(
      clamp(Number(o.gap), CAP_CARD_LIMITS.gap.min, CAP_CARD_LIMITS.gap.max, d.gap),
    ),
    bandCase: pick(o.bandCase, ["upper", "as-typed"] as const, d.bandCase),
    cardLook: pick(o.cardLook, ["elevated", "flat", "outline"] as const, d.cardLook),
    bulletMark: pick(o.bulletMark, ["dot", "dash", "number"] as const, d.bulletMark),
    leadColor: pick(o.leadColor, ["tone", "accent", "ink"] as const, d.leadColor),
    showBandRule: bool(o.showBandRule, d.showBandRule),
    density: pick(o.density, ["comfortable", "compact"] as const, d.density),
  };
}

export function patchCapCardStyle(raw: unknown, patch: Partial<CapCardStyle>): CapCardStyle {
  return resolveCapCardStyle({ ...resolveCapCardStyle(raw), ...patch });
}

export function isDefaultCapCardStyle(raw: unknown): boolean {
  const a = resolveCapCardStyle(raw);
  return (Object.keys(DEFAULT_CAP_CARD_STYLE) as (keyof CapCardStyle)[]).every(
    (k) => a[k] === DEFAULT_CAP_CARD_STYLE[k],
  );
}

// ── Device quad ───────────────────────────────────────────────────────────

export function readBenefits(raw: unknown): QuadBenefit[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.slice(0, MAX_BENEFITS).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return { icon: str(o.icon), label: str(o.label) };
  });
}

export function addBenefit(rows: QuadBenefit[]): QuadBenefit[] {
  if (rows.length >= MAX_BENEFITS) return rows;
  return [...rows, { icon: "Sparkles", label: "New benefit" }];
}

export function removeBenefit(rows: QuadBenefit[], index: number): QuadBenefit[] {
  if (rows.length <= MIN_BENEFITS) return rows;
  return rows.filter((_, i) => i !== index);
}

export function moveBenefit(rows: QuadBenefit[], index: number, delta: number): QuadBenefit[] {
  const to = index + delta;
  if (index < 0 || index >= rows.length || to < 0 || to >= rows.length) return rows;
  const next = rows.slice();
  const [row] = next.splice(index, 1);
  next.splice(to, 0, row);
  return next;
}

export function patchBenefit(
  rows: QuadBenefit[],
  index: number,
  patch: Partial<QuadBenefit>,
): QuadBenefit[] {
  return rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
}

export type QuadStyle = {
  /** Device column share of the split (0.7–1.8 against a 1fr copy column). */
  split: number;
  columns: 1 | 2;
  tileLook: "tile" | "outline" | "bare";
  tileRadius: number;
  iconScale: number;
  labelAlign: "left" | "center";
  deviceSide: "left" | "right";
  showTitleRule: boolean;
};

export const DEFAULT_QUAD_STYLE: QuadStyle = {
  split: 1.15,
  columns: 2,
  tileLook: "outline",
  tileRadius: 16,
  iconScale: 1,
  labelAlign: "center",
  deviceSide: "left",
  showTitleRule: false,
};

export const QUAD_LIMITS = {
  split: { min: 0.7, max: 1.8, step: 0.05 },
  tileRadius: { min: 0, max: 28, step: 1 },
  iconScale: { min: 0.7, max: 1.6, step: 0.05 },
} as const;

export function resolveQuadStyle(raw: unknown): QuadStyle {
  const d = DEFAULT_QUAD_STYLE;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...d };
  const o = raw as Record<string, unknown>;
  return {
    split:
      Math.round(
        clamp(Number(o.split), QUAD_LIMITS.split.min, QUAD_LIMITS.split.max, d.split) * 20,
      ) / 20,
    columns: Number(o.columns) === 1 ? 1 : 2,
    tileLook: pick(o.tileLook, ["tile", "outline", "bare"] as const, d.tileLook),
    tileRadius: Math.round(
      clamp(
        Number(o.tileRadius),
        QUAD_LIMITS.tileRadius.min,
        QUAD_LIMITS.tileRadius.max,
        d.tileRadius,
      ),
    ),
    iconScale:
      Math.round(
        clamp(
          Number(o.iconScale),
          QUAD_LIMITS.iconScale.min,
          QUAD_LIMITS.iconScale.max,
          d.iconScale,
        ) * 20,
      ) / 20,
    labelAlign: pick(o.labelAlign, ["left", "center"] as const, d.labelAlign),
    deviceSide: pick(o.deviceSide, ["left", "right"] as const, d.deviceSide),
    showTitleRule: typeof o.showTitleRule === "boolean" ? o.showTitleRule : d.showTitleRule,
  };
}

export function patchQuadStyle(raw: unknown, patch: Partial<QuadStyle>): QuadStyle {
  return resolveQuadStyle({ ...resolveQuadStyle(raw), ...patch });
}

export function isDefaultQuadStyle(raw: unknown): boolean {
  const a = resolveQuadStyle(raw);
  return (Object.keys(DEFAULT_QUAD_STYLE) as (keyof QuadStyle)[]).every(
    (k) => a[k] === DEFAULT_QUAD_STYLE[k],
  );
}
