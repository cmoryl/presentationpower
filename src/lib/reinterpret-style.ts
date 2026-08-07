// Deck-wide reinterpretation controls: design style + typography / colour locks.
//
// The design pass picks the best layout per slide from content signals. These
// controls sit on top of it so a reviewer can steer the whole deck at once:
//
//  · design style — biases the chooser toward one visual language (editorial,
//    KPI, funnel/process, cards, imagery) without ever forcing a layout whose
//    deterministic builder rejects the slide's copy;
//  · typography rhythm — one clamp for headline and bullet length across every
//    slide, so headings share a type scale instead of drifting per slide;
//  · colour lock — a single accent applied as `content.accentOverride` plus a
//    uniform light/dark slide mode, on every slide of the deck.
//
// Pure module: no network, no React. Used by the review dialog and testable.

import type { MappedSlide } from "./pptx-mapping";

// ── design styles ────────────────────────────────────────────────────────

export type DesignStyle = {
  id: string;
  label: string;
  description: string;
  /** Variant ids this style favours. Empty = no bias (balanced). */
  variantIds: string[];
};

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Let each slide's content pick its own strongest layout.",
    variantIds: [],
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Magazine spreads, manifestos, poster dividers and big ideas.",
    variantIds: [
      "MV-EDITORIAL-SPREAD",
      "MV-SPLIT-MANIFESTO",
      "MV-DEFINITION",
      "MV-INS-SO-WHAT",
      "MV-INS-BIG-IDEA",
      "MV-ED-DIVIDER-XL",
      "MV-ED-KICKER-POSTER",
      "MV-ED-HERO-ORB",
    ],
  },
  {
    id: "kpi",
    label: "KPI / data",
    description: "Stat walls, dashboards and charts wherever figures exist.",
    variantIds: [
      "MV-KPI-DASHBOARD",
      "MV-NUMBERS-TRIPTYCH",
      "MV-PROOF-STATS-3",
      "MV-PROOF-STATS-4",
      "MV-CTX-STAT-GRID",
      "MV-INFO-DONUT",
    ],
  },
  {
    id: "funnel",
    label: "Funnel / process",
    description: "Funnels, phases, timelines, journeys and architectures.",
    variantIds: [
      "MV-FUNNEL",
      "MV-PROC-PHASES",
      "MV-PROC-TIMELINE",
      "MV-TIMELINE-VERTICAL",
      "MV-JOURNEY-MAP",
      "MV-MATURITY-CURVE",
      "MV-HORIZON",
      "MV-SOL-ARCHITECTURE",
      "MV-INFO-PYRAMID",
    ],
  },
  {
    id: "cards",
    label: "Cards / grid",
    description: "Bento grids, card sets and structured lists.",
    variantIds: [
      "MV-BENTO-5",
      "MV-CTX-CARDS-3",
      "MV-CTX-CARDS-4",
      "MV-SOL-FEATURE-LIST",
      "MV-DEC-CHECKLIST",
      "MV-PRINCIPLES",
      "MV-CTX-CHALLENGE-STACK",
    ],
  },
];

export function designStyle(id: string | undefined): DesignStyle {
  return DESIGN_STYLES.find((s) => s.id === id) ?? DESIGN_STYLES[0];
}

// ── typography rhythm ────────────────────────────────────────────────────

export type TypeRhythm = {
  id: string;
  label: string;
  description: string;
  titleChars: number;
  bulletChars: number;
  maxBullets: number;
};

export const TYPE_RHYTHMS: TypeRhythm[] = [
  {
    id: "free",
    label: "Per slide",
    description: "Keep each slide's own copy length.",
    titleChars: 0,
    bulletChars: 0,
    maxBullets: 0,
  },
  {
    id: "compact",
    label: "Compact",
    description: "Short headlines, tight bullets — dense, uniform pages.",
    titleChars: 48,
    bulletChars: 90,
    maxBullets: 5,
  },
  {
    id: "standard",
    label: "Standard",
    description: "Our default deck rhythm across every slide.",
    titleChars: 68,
    bulletChars: 140,
    maxBullets: 6,
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Longer headlines and fuller body copy on every slide.",
    titleChars: 96,
    bulletChars: 220,
    maxBullets: 4,
  },
];

export function typeRhythm(id: string | undefined): TypeRhythm {
  return TYPE_RHYTHMS.find((r) => r.id === id) ?? TYPE_RHYTHMS[0];
}

/** Trim to a character budget on a word boundary, without a trailing ellipsis. */
function clampText(v: string, max: number): string {
  const t = v.trim();
  if (max <= 0 || t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:—–-]+$/, "");
}

/**
 * Apply one typographic rhythm to the *source* copy of every slide, before the
 * design pass runs — so layouts are chosen and built from uniform copy lengths
 * rather than clamped after the fact.
 */
export function applyTypeRhythm(mapped: MappedSlide[], rhythmId: string | undefined): MappedSlide[] {
  const r = typeRhythm(rhythmId);
  if (r.titleChars === 0) return mapped;
  return mapped.map((m) => ({
    ...m,
    source: {
      ...m.source,
      title: clampText(m.source.title ?? "", r.titleChars),
      bullets: (m.source.bullets ?? [])
        .filter(Boolean)
        .slice(0, r.maxBullets)
        .map((b) => clampText(b, r.bulletChars)),
    },
  }));
}

// ── colour lock ──────────────────────────────────────────────────────────

export type ColorLock = {
  /** `#rrggbb` accent applied to every slide, or undefined for brand default. */
  accent?: string;
  /** Uniform slide mode, or undefined to leave each slide as designed. */
  mode?: "light" | "dark";
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Stamp one accent + slide mode across every designed slide. */
export function applyColorLock(mapped: MappedSlide[], lock: ColorLock): MappedSlide[] {
  const accent = lock.accent && HEX_RE.test(lock.accent) ? lock.accent.toLowerCase() : undefined;
  if (!accent && !lock.mode) return mapped;
  return mapped.map((m) => ({
    ...m,
    content: {
      ...m.content,
      ...(accent ? { accentOverride: accent } : {}),
      ...(lock.mode ? { slideMode: lock.mode } : {}),
    },
  }));
}
