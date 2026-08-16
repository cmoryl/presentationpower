/**
 * PER-INDUSTRY TYPOGRAPHY CONSTRAINTS.
 *
 * `open-space-fill.ts` owns the *global* typographic guarantee: every authored
 * size passes through `fillPx`, which clamps it between a readability floor and
 * a legibility ceiling, and every leading passes through `fillLeading`, which
 * moves against the fill multiplier inside per-role bounds.
 *
 * Those defaults are tuned for a general enterprise deck. Industries do not read
 * the same way:
 *
 *   • Regulated sectors (pharma, legal, insurance, government) put a lot of
 *     qualified copy on the page and are read on paper as often as on a wall —
 *     they need a HIGHER body floor and LOOSER leading, and a lower display
 *     ceiling so a headline never eats the disclosure line under it.
 *   • Consumer and brand sectors (luxury, media, gaming, events) live on the
 *     headline — they want a HIGHER display ceiling, tighter leading, and short
 *     chart labels because their charts are decorative proof, not the argument.
 *   • Data-heavy sectors (AI, fintech, logistics, telecom) run dense charts, so
 *     their chart-label band is widened and the label character cap is raised —
 *     an axis label truncated to 12 characters loses the meaning.
 *
 * This module is the override sheet. Every field is optional and merges over the
 * global defaults, so improving a default still improves every industry that did
 * not opt out of it.
 *
 * Delivery path: the resolved constraint is published by
 * `OpenSpaceFillProvider` as CSS custom properties (`--type-floor-*`,
 * `--type-ceil-*`, `--lead-*`) which `fillPx` / `fillLeading` read with the
 * global default as the `var()` fallback. That means ~400 authored call sites
 * inherit an industry's rules without a single edit, and screen, present, share
 * and the offscreen export stage all resolve the same numbers.
 */

import {
  TYPE_CEIL_PX,
  TYPE_FLOOR_PX,
  leadingBounds,
  type FillScale,
} from "./open-space-fill";

export type TypeAxis = "display" | "body" | "kicker" | "figure" | "label";
export type LeadRole = TypeAxis;

/** Chart / diagram label rules for one industry. */
export interface ChartLabelRule {
  /** Legibility band for chart + diagram labels, in stage px. */
  minPx: number;
  maxPx: number;
  /** Characters a category label may carry before it is elided. */
  maxChars: number;
  /** Category labels a chart may print before it thins them out. */
  maxTicks: number;
}

export interface TypographyConstraint {
  /** Readability floors in stage px, per axis. */
  floorPx: Partial<Record<TypeAxis, number>>;
  /** Legibility ceilings in stage px, per axis. */
  ceilPx: Partial<Record<TypeAxis, number>>;
  /** Leading rules per role: base value plus its clamp band. */
  leading: Partial<Record<LeadRole, { base?: number; min?: number; max?: number }>>;
  chartLabel: ChartLabelRule;
  /** One line of art direction, shown in the inspector and the agent tools. */
  note: string;
}

export type TypographyOverride = {
  floorPx?: Partial<Record<TypeAxis, number>>;
  ceilPx?: Partial<Record<TypeAxis, number>>;
  leading?: Partial<Record<LeadRole, { base?: number; min?: number; max?: number }>>;
  chartLabel?: Partial<ChartLabelRule>;
  note?: string;
};

const TYPE_AXES: TypeAxis[] = ["display", "body", "kicker", "figure", "label"];

/** The global sheet, expressed as a constraint — the base every industry merges over. */
export const DEFAULT_TYPOGRAPHY: TypographyConstraint = {
  floorPx: Object.fromEntries(
    TYPE_AXES.map((a) => [a, TYPE_FLOOR_PX[a as keyof FillScale]]),
  ) as Record<TypeAxis, number>,
  ceilPx: Object.fromEntries(
    TYPE_AXES.map((a) => [a, TYPE_CEIL_PX[a as keyof FillScale]]),
  ) as Record<TypeAxis, number>,
  leading: Object.fromEntries(
    TYPE_AXES.map((a) => {
      const b = leadingBounds(a);
      return [a, { base: b.base, min: b.min, max: b.max }];
    }),
  ) as Record<LeadRole, { base: number; min: number; max: number }>,
  chartLabel: { minPx: 14, maxPx: 28, maxChars: 18, maxTicks: 8 },
  note: "Balanced enterprise reading — general-purpose floors, ceilings and leading.",
};

/* --------------------------------------------------------------- overrides */

/**
 * Per-industry overrides, keyed by industry recipe id (R01–R30 in
 * `design-skins.ts`). Only the deltas are recorded.
 */
export const INDUSTRY_TYPE_OVERRIDES: Record<string, TypographyOverride> = {
  // Corporate / Enterprise — the reference reading. Slightly calmer display.
  R01: {
    ceilPx: { display: 150 },
    note: "Boardroom reading: calm headline ceiling, standard body floor, charts labelled in full.",
  },
  // Technology / SaaS — product screens and feature copy; body a touch bigger.
  R02: {
    floorPx: { body: 19 },
    ceilPx: { display: 156, figure: 240 },
    leading: { body: { base: 1.42 } },
    chartLabel: { maxChars: 20 },
    note: "Product voice: roomier body copy, generous figures, labels allowed to spell features out.",
  },
  // AI / Data — dense charts are the argument.
  R03: {
    floorPx: { label: 15, body: 19 },
    ceilPx: { label: 30, display: 144 },
    chartLabel: { minPx: 15, maxPx: 30, maxChars: 26, maxTicks: 12 },
    note: "Data-forward: widest chart-label band and tick budget; headline yields to the plot.",
  },
  // Fintech / Payments — numbers first, tight leading on figures.
  R04: {
    floorPx: { figure: 44, label: 15 },
    ceilPx: { figure: 260 },
    leading: { figure: { base: 0.96, min: 0.84 } },
    chartLabel: { minPx: 15, maxChars: 22, maxTicks: 10 },
    note: "Ledger reading: bigger figures set tight, labels legible at dense tick counts.",
  },
  // Banking / Wealth — conservative, print-adjacent.
  R05: {
    floorPx: { body: 20, kicker: 14 },
    ceilPx: { display: 132 },
    leading: { body: { base: 1.46, min: 1.34 } },
    chartLabel: { maxChars: 22 },
    note: "Private-client reading: larger body, looser leading, restrained headline scale.",
  },
  // Insurance — heavy qualified copy.
  R06: {
    floorPx: { body: 20, kicker: 14 },
    ceilPx: { display: 124, body: 44 },
    leading: { body: { base: 1.48, min: 1.36 }, label: { base: 1.24 } },
    chartLabel: { maxChars: 24 },
    note: "Policy reading: disclosure-safe body floor and the loosest body leading in the set.",
  },
  // Cybersecurity — technical labels, dark decks, tight display.
  R07: {
    floorPx: { label: 15, body: 19 },
    leading: { display: { base: 1.02, min: 0.92 } },
    chartLabel: { minPx: 15, maxChars: 24, maxTicks: 10 },
    note: "Ops reading: technical labels kept intact, display set tight and mechanical.",
  },
  // Healthcare — clinical clarity, generous body.
  R08: {
    floorPx: { body: 20 },
    ceilPx: { display: 136 },
    leading: { body: { base: 1.46, min: 1.34 } },
    chartLabel: { maxChars: 22 },
    note: "Clinical clarity: large body copy, unhurried leading, plain-language labels.",
  },
  // Pharma / Life Sciences — the most regulated register.
  R09: {
    floorPx: { body: 21, kicker: 14, label: 15 },
    ceilPx: { display: 120, body: 44 },
    leading: { body: { base: 1.5, min: 1.38 }, label: { base: 1.26 } },
    chartLabel: { minPx: 15, maxChars: 28, maxTicks: 10 },
    note: "Regulated reading: highest body floor, loosest leading, endpoint labels never truncated.",
  },
  // Legal — evidentiary density.
  R10: {
    floorPx: { body: 20, kicker: 14 },
    ceilPx: { display: 116, figure: 200 },
    leading: { body: { base: 1.5, min: 1.38 }, display: { base: 1.1 } },
    chartLabel: { maxChars: 28, maxTicks: 10 },
    note: "Evidentiary reading: quiet display, long citations, nothing elided in a label.",
  },
  // Consulting — structured argument.
  R11: {
    floorPx: { body: 19 },
    ceilPx: { display: 148 },
    leading: { body: { base: 1.42 } },
    chartLabel: { maxChars: 22, maxTicks: 10 },
    note: "Structured argument: standard scale with a wider label budget for exhibits.",
  },
  // Manufacturing — engineered, compact.
  R12: {
    floorPx: { label: 15 },
    ceilPx: { display: 140 },
    leading: { display: { base: 1.04 }, label: { base: 1.18 } },
    chartLabel: { minPx: 15, maxChars: 20, maxTicks: 10 },
    note: "Engineered reading: compact leading, labels sized for line-side legibility.",
  },
  // Energy / Utilities — long horizons, big figures.
  R13: {
    floorPx: { figure: 44 },
    ceilPx: { figure: 250, display: 144 },
    chartLabel: { maxChars: 22, maxTicks: 12 },
    note: "Infrastructure scale: outsized figures and long time-series tick budgets.",
  },
  // Automotive / Mobility — kinetic display.
  R14: {
    ceilPx: { display: 168 },
    leading: { display: { base: 1, min: 0.92 } },
    chartLabel: { maxChars: 16 },
    note: "Kinetic reading: full headline ceiling set very tight; labels stay terse.",
  },
  // Aerospace / Defense — precise, restrained.
  R15: {
    floorPx: { body: 19, label: 15 },
    ceilPx: { display: 132 },
    leading: { display: { base: 1.04 }, body: { base: 1.44 } },
    chartLabel: { minPx: 15, maxChars: 24, maxTicks: 10 },
    note: "Program reading: precise labels, restrained display, briefing-grade body copy.",
  },
  // Telecom — network density.
  R16: {
    floorPx: { label: 15 },
    ceilPx: { label: 30 },
    chartLabel: { minPx: 15, maxPx: 30, maxChars: 22, maxTicks: 12 },
    note: "Network reading: many series per chart, so labels get their own headroom.",
  },
  // Logistics / Supply Chain — flows and nodes.
  R17: {
    floorPx: { label: 15, body: 19 },
    ceilPx: { display: 140 },
    leading: { label: { base: 1.16 } },
    chartLabel: { minPx: 15, maxChars: 22, maxTicks: 12 },
    note: "Flow reading: node labels tight and single-spaced, long routes still spelled out.",
  },
  // Retail / Ecommerce — merchandised, punchy.
  R18: {
    ceilPx: { display: 160, figure: 250 },
    leading: { display: { base: 1.02 } },
    chartLabel: { maxChars: 16, maxTicks: 8 },
    note: "Merchandised reading: punchy display and figures; labels stay short and scannable.",
  },
  // CPG / Food & Beverage — warm, editorial.
  R19: {
    floorPx: { body: 19 },
    ceilPx: { display: 156 },
    leading: { body: { base: 1.44 } },
    chartLabel: { maxChars: 16 },
    note: "Editorial warmth: relaxed body leading with a confident headline ceiling.",
  },
  // Luxury / Fashion / Beauty — the headline is the product.
  R20: {
    floorPx: { kicker: 12 },
    ceilPx: { display: 168, body: 42 },
    leading: { display: { base: 0.98, min: 0.9 }, kicker: { base: 1.3, max: 1.5 } },
    chartLabel: { maxPx: 24, maxChars: 14, maxTicks: 6 },
    note: "Couture reading: largest, tightest display; charts whisper with short small labels.",
  },
  // Media / Entertainment — titling energy.
  R21: {
    ceilPx: { display: 168 },
    leading: { display: { base: 1, min: 0.9 } },
    chartLabel: { maxChars: 16, maxTicks: 8 },
    note: "Titling energy: display runs to the ceiling; supporting labels stay compact.",
  },
  // Gaming / Esports — HUD density with loud headlines.
  R22: {
    floorPx: { label: 14 },
    ceilPx: { display: 168, figure: 250 },
    leading: { display: { base: 1, min: 0.9 }, label: { base: 1.14 } },
    chartLabel: { maxChars: 14, maxTicks: 10 },
    note: "HUD reading: loud display, tight single-spaced labels, stat figures oversized.",
  },
  // Sports / Fitness — scoreboard figures.
  R23: {
    floorPx: { figure: 48 },
    ceilPx: { figure: 260, display: 164 },
    leading: { figure: { base: 0.94, min: 0.84 } },
    chartLabel: { maxChars: 14 },
    note: "Scoreboard reading: the biggest, tightest figures in the set; labels terse.",
  },
  // Travel / Hospitality — invitational.
  R24: {
    floorPx: { body: 19 },
    ceilPx: { display: 160 },
    leading: { body: { base: 1.46 }, display: { base: 1.06 } },
    chartLabel: { maxChars: 18 },
    note: "Invitational reading: airy body copy under a generous headline.",
  },
  // Real Estate / Architecture — drawn, structural.
  R25: {
    floorPx: { kicker: 13, label: 14 },
    ceilPx: { display: 152 },
    leading: { display: { base: 1.04 }, kicker: { base: 1.3, max: 1.5 } },
    chartLabel: { maxChars: 20 },
    note: "Drawing-set reading: annotation-style kickers and labels, structural display.",
  },
  // Education / Research — teachable density.
  R26: {
    floorPx: { body: 20, label: 15 },
    ceilPx: { display: 132, body: 46 },
    leading: { body: { base: 1.48, min: 1.36 } },
    chartLabel: { minPx: 15, maxChars: 26, maxTicks: 12 },
    note: "Teachable reading: large body, loose leading, fully written-out chart labels.",
  },
  // Government / Public Sector — accessibility first.
  R27: {
    floorPx: { body: 21, kicker: 15, label: 16 },
    ceilPx: { display: 120, body: 46 },
    leading: { body: { base: 1.5, min: 1.4 }, label: { base: 1.26 } },
    chartLabel: { minPx: 16, maxChars: 28, maxTicks: 10 },
    note: "Accessibility-first: the highest floors in the set across body, kicker and labels.",
  },
  // Nonprofit / ESG — human, readable.
  R28: {
    floorPx: { body: 20 },
    ceilPx: { display: 140 },
    leading: { body: { base: 1.48, min: 1.36 } },
    chartLabel: { maxChars: 24, maxTicks: 10 },
    note: "Human reading: comfortable body copy and plain-language impact labels.",
  },
  // HR / Talent / Workplace — conversational.
  R29: {
    floorPx: { body: 20 },
    ceilPx: { display: 144 },
    leading: { body: { base: 1.46 }, kicker: { base: 1.28 } },
    chartLabel: { maxChars: 20 },
    note: "Conversational reading: warm body scale, friendly label lengths.",
  },
  // Events / Experiential — signage.
  R30: {
    floorPx: { body: 20, kicker: 14 },
    ceilPx: { display: 168, figure: 250 },
    leading: { display: { base: 0.98, min: 0.9 } },
    chartLabel: { maxPx: 26, maxChars: 14, maxTicks: 6 },
    note: "Signage reading: room-scale display and body, with the shortest label budget.",
  },
};

/* ---------------------------------------------------------------- resolver */

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Absolute guard rails. An industry may TUNE the reading, never break it: no
 * industry can push body type under 16px or leading under 1.2 on paragraphs.
 */
const AXIS_LIMIT: Record<TypeAxis, { floor: [number, number]; ceil: [number, number] }> = {
  display: { floor: [24, 60], ceil: [96, 200] },
  body: { floor: [16, 24], ceil: [34, 56] },
  kicker: { floor: [11, 18], ceil: [22, 36] },
  figure: { floor: [32, 64], ceil: [140, 280] },
  label: { floor: [12, 18], ceil: [22, 34] },
};

const LEAD_LIMIT: Record<LeadRole, { base: [number, number]; min: [number, number]; max: [number, number] }> = {
  display: { base: [0.94, 1.2], min: [0.88, 1.1], max: [1.05, 1.3] },
  body: { base: [1.3, 1.6], min: [1.2, 1.45], max: [1.4, 1.75] },
  kicker: { base: [1.1, 1.45], min: [1.05, 1.3], max: [1.25, 1.6] },
  figure: { base: [0.9, 1.15], min: [0.8, 1.05], max: [1, 1.25] },
  label: { base: [1.08, 1.35], min: [1.02, 1.25], max: [1.2, 1.45] },
};

/** The resolved constraint for an industry — defaults with its override merged. */
export function resolveTypography(industryId?: string | null): TypographyConstraint {
  const ov = (industryId && INDUSTRY_TYPE_OVERRIDES[industryId]) || null;
  const floorPx = {} as Record<TypeAxis, number>;
  const ceilPx = {} as Record<TypeAxis, number>;
  const leading = {} as Record<LeadRole, { base: number; min: number; max: number }>;

  for (const axis of TYPE_AXES) {
    const lim = AXIS_LIMIT[axis];
    const dFloor = DEFAULT_TYPOGRAPHY.floorPx[axis] ?? 0;
    const dCeil = DEFAULT_TYPOGRAPHY.ceilPx[axis] ?? 0;
    floorPx[axis] = clampNum(ov?.floorPx?.[axis] ?? dFloor, lim.floor[0], lim.floor[1]);
    ceilPx[axis] = clampNum(ov?.ceilPx?.[axis] ?? dCeil, lim.ceil[0], lim.ceil[1]);
    if (ceilPx[axis] < floorPx[axis] * 1.2) ceilPx[axis] = floorPx[axis] * 1.2;

    const dLead = DEFAULT_TYPOGRAPHY.leading[axis]!;
    const oLead = ov?.leading?.[axis];
    const ll = LEAD_LIMIT[axis];
    const base = clampNum(oLead?.base ?? dLead.base!, ll.base[0], ll.base[1]);
    const min = Math.min(base, clampNum(oLead?.min ?? dLead.min!, ll.min[0], ll.min[1]));
    const max = Math.max(base, clampNum(oLead?.max ?? dLead.max!, ll.max[0], ll.max[1]));
    leading[axis] = { base, min, max };
  }

  const dChart = DEFAULT_TYPOGRAPHY.chartLabel;
  const chartLabel: ChartLabelRule = {
    minPx: clampNum(ov?.chartLabel?.minPx ?? dChart.minPx, 10, 20),
    maxPx: clampNum(ov?.chartLabel?.maxPx ?? dChart.maxPx, 20, 36),
    maxChars: Math.round(clampNum(ov?.chartLabel?.maxChars ?? dChart.maxChars, 8, 40)),
    maxTicks: Math.round(clampNum(ov?.chartLabel?.maxTicks ?? dChart.maxTicks, 4, 16)),
  };
  if (chartLabel.maxPx < chartLabel.minPx + 4) chartLabel.maxPx = chartLabel.minPx + 4;

  return {
    floorPx,
    ceilPx,
    leading,
    chartLabel,
    note: ov?.note ?? DEFAULT_TYPOGRAPHY.note,
  };
}

/**
 * CSS custom properties for a resolved constraint. `fillPx` and `fillLeading`
 * read these with the global default as the `var()` fallback, so any subtree
 * that carries these vars types itself by its industry's rules.
 */
export function typographyCssVars(t: TypographyConstraint): Record<string, string> {
  const out: Record<string, string> = {};
  for (const axis of TYPE_AXES) {
    out[`--type-floor-${axis}`] = `${t.floorPx[axis]}px`;
    out[`--type-ceil-${axis}`] = `${t.ceilPx[axis]}px`;
    const l = t.leading[axis]!;
    out[`--lead-base-${axis}`] = String(l.base);
    out[`--lead-min-${axis}`] = String(l.min);
    out[`--lead-max-${axis}`] = String(l.max);
  }
  out["--chart-label-min"] = `${t.chartLabel.minPx}px`;
  out["--chart-label-max"] = `${t.chartLabel.maxPx}px`;
  return out;
}

/** Elide a chart / diagram category label to the industry's character cap. */
export function capChartLabel(
  label: string | null | undefined,
  t: TypographyConstraint | null | undefined,
): string {
  const s = (label ?? "").toString();
  const cap = t?.chartLabel.maxChars ?? DEFAULT_TYPOGRAPHY.chartLabel.maxChars;
  if (s.length <= cap) return s;
  return `${s.slice(0, Math.max(1, cap - 1)).trimEnd()}…`;
}

/**
 * How often a chart may print a category label given how many it has.
 * `1` = every label; `n` = every nth (plus the last), which is what the chart
 * primitives already do with their own `showEvery`.
 */
export function chartLabelStride(
  count: number,
  t: TypographyConstraint | null | undefined,
): number {
  const cap = t?.chartLabel.maxTicks ?? DEFAULT_TYPOGRAPHY.chartLabel.maxTicks;
  if (count <= cap) return 1;
  return Math.ceil(count / cap);
}

/** Model/UI-readable summary of an industry's typography rules. */
export function describeTypography(industryId?: string | null): string {
  const t = resolveTypography(industryId);
  const axis = (a: TypeAxis) => `${a} ${t.floorPx[a]}–${t.ceilPx[a]}px`;
  return [
    industryId ?? "default",
    TYPE_AXES.map(axis).join(" · "),
    `body leading ${t.leading.body!.min}–${t.leading.body!.max} (base ${t.leading.body!.base})`,
    `display leading ${t.leading.display!.min}–${t.leading.display!.max}`,
    `chart labels ${t.chartLabel.minPx}–${t.chartLabel.maxPx}px, ≤${t.chartLabel.maxChars} chars, ≤${t.chartLabel.maxTicks} ticks`,
    t.note,
  ].join(" — ");
}

/** Industries that tune the defaults (used by the inspector and docs). */
export function industriesWithTypeOverrides(): string[] {
  return Object.keys(INDUSTRY_TYPE_OVERRIDES);
}
