/**
 * PRINT STYLE PRESETS — swap looks without rebuilding a layout
 * ---------------------------------------------------------------------------
 * Three independent axes every print surface exposes:
 *
 *   1. hero lockup   → `variantId` (which opening composition is used)
 *   2. title style   → the title-block half of `PrintHeroTitleType`
 *   3. body style    → the summary/body half of `PrintHeroTitleType`
 *   4. masthead rule → `PrintHeroRule`
 *
 * Presets only touch the keys they own, so switching the title style never
 * clobbers an authored body size (and vice versa) and content is untouched.
 * Both the document masthead (`content.heroRule` / `content.heroTitleType`)
 * and the modular hero sections (`section.rule` / `section.titleType`) read
 * the same contract, so a preset applies identically on every surface.
 */

import type { PrintHeroRule, PrintHeroTitleType } from "@/lib/print-assets.types";

/** Keys owned by the title axis. */
const TITLE_KEYS = [
  "titlePx",
  "titleWeight",
  "titleTracking",
  "titleLeading",
  "titleCase",
  "eyebrowPx",
  "eyebrowTracking",
] as const satisfies readonly (keyof PrintHeroTitleType)[];

/** Keys owned by the body axis. */
const BODY_KEYS = [
  "summaryPx",
  "summaryLeading",
] as const satisfies readonly (keyof PrintHeroTitleType)[];

export type PrintTitleStylePreset = {
  id: string;
  label: string;
  desc: string;
  type: Pick<PrintHeroTitleType, (typeof TITLE_KEYS)[number]>;
};

export type PrintBodyStylePreset = {
  id: string;
  label: string;
  desc: string;
  type: Pick<PrintHeroTitleType, (typeof BODY_KEYS)[number]>;
};

export type PrintRuleStylePreset = {
  id: string;
  label: string;
  desc: string;
  rule: PrintHeroRule;
};

/** Title-block looks. Sizes are template px, tracking is thousandths of an em. */
export const PRINT_TITLE_STYLE_PRESETS: PrintTitleStylePreset[] = [
  {
    id: "title-editorial",
    label: "Editorial",
    desc: "System default — 30px, tight tracking, sentence case.",
    type: {
      titlePx: 30,
      titleWeight: 700,
      titleTracking: -20,
      titleLeading: 106,
      titleCase: "none",
      eyebrowPx: 9.5,
      eyebrowTracking: 200,
    },
  },
  {
    id: "title-display",
    label: "Display",
    desc: "Oversized 40px statement title for photo and cover openers.",
    type: {
      titlePx: 40,
      titleWeight: 700,
      titleTracking: -32,
      titleLeading: 100,
      titleCase: "none",
      eyebrowPx: 10,
      eyebrowTracking: 200,
    },
  },
  {
    id: "title-compact",
    label: "Compact",
    desc: "22px title for dense pages carrying long copy or many modules.",
    type: {
      titlePx: 22,
      titleWeight: 600,
      titleTracking: -12,
      titleLeading: 112,
      titleCase: "none",
      eyebrowPx: 9,
      eyebrowTracking: 180,
    },
  },
  {
    id: "title-caps-rail",
    label: "Caps rail",
    desc: "Uppercase 24px title with wide eyebrow tracking — brief / spec pages.",
    type: {
      titlePx: 24,
      titleWeight: 700,
      titleTracking: 10,
      titleLeading: 112,
      titleCase: "upper",
      eyebrowPx: 9,
      eyebrowTracking: 260,
    },
  },
  {
    id: "title-quiet",
    label: "Quiet",
    desc: "Light 28px title with open leading for report-style openers.",
    type: {
      titlePx: 28,
      titleWeight: 500,
      titleTracking: -8,
      titleLeading: 118,
      titleCase: "none",
      eyebrowPx: 9.5,
      eyebrowTracking: 220,
    },
  },
];

/** Body / summary looks. */
export const PRINT_BODY_STYLE_PRESETS: PrintBodyStylePreset[] = [
  {
    id: "body-standard",
    label: "Standard",
    desc: "12px at 140% — the house body setting.",
    type: { summaryPx: 12, summaryLeading: 140 },
  },
  {
    id: "body-open",
    label: "Open",
    desc: "13px at 152% for short summaries that should breathe.",
    type: { summaryPx: 13, summaryLeading: 152 },
  },
  {
    id: "body-dense",
    label: "Dense",
    desc: "10.5px at 132% when copy has to fit a tight page.",
    type: { summaryPx: 10.5, summaryLeading: 132 },
  },
  {
    id: "body-lede",
    label: "Lede",
    desc: "15px at 144% — magazine-style standfirst under the title.",
    type: { summaryPx: 15, summaryLeading: 144 },
  },
];

/** Masthead rule looks. */
export const PRINT_RULE_STYLE_PRESETS: PrintRuleStylePreset[] = [
  {
    id: "rule-accent-bar",
    label: "Accent bar",
    desc: "4px accent rule over the title, closing hairline on.",
    rule: { weight: 4, gap: 16, hairline: true },
  },
  {
    id: "rule-hairline",
    label: "Hairline",
    desc: "1px accent rule, tighter air — quieter openers.",
    rule: { weight: 1, gap: 12, hairline: true },
  },
  {
    id: "rule-heavy",
    label: "Heavy",
    desc: "8px accent slab for cover-weight mastheads.",
    rule: { weight: 8, gap: 20, hairline: false },
  },
  {
    id: "rule-none",
    label: "No rule",
    desc: "Type only — no rule and no closing hairline.",
    rule: { weight: 0, gap: 10, hairline: false },
  },
];

const near = (a: number | undefined, b: number | undefined) =>
  a === undefined || b === undefined ? a === b : Math.abs(a - b) < 0.51;

/** Which title preset the current type spec matches (undefined = custom). */
export function matchTitleStylePreset(type: PrintHeroTitleType | undefined): string | undefined {
  if (!type) return undefined;
  return PRINT_TITLE_STYLE_PRESETS.find(
    (p) =>
      near(type.titlePx, p.type.titlePx) &&
      type.titleWeight === p.type.titleWeight &&
      near(type.titleTracking, p.type.titleTracking) &&
      near(type.titleLeading, p.type.titleLeading) &&
      (type.titleCase ?? "none") === (p.type.titleCase ?? "none"),
  )?.id;
}

/** Which body preset the current type spec matches (undefined = custom). */
export function matchBodyStylePreset(type: PrintHeroTitleType | undefined): string | undefined {
  if (!type) return undefined;
  return PRINT_BODY_STYLE_PRESETS.find(
    (p) =>
      near(type.summaryPx, p.type.summaryPx) && near(type.summaryLeading, p.type.summaryLeading),
  )?.id;
}

/** Which rule preset the current rule matches (undefined = custom). */
export function matchRuleStylePreset(rule: PrintHeroRule | undefined): string | undefined {
  if (!rule) return undefined;
  return PRINT_RULE_STYLE_PRESETS.find(
    (p) =>
      near(rule.weight, p.rule.weight) &&
      near(rule.gap, p.rule.gap) &&
      (rule.hairline ?? true) === (p.rule.hairline ?? true),
  )?.id;
}

/** Merge a title preset over the current spec, preserving body keys. */
export function applyTitleStylePreset(
  current: PrintHeroTitleType | undefined,
  presetId: string,
): PrintHeroTitleType {
  const preset = PRINT_TITLE_STYLE_PRESETS.find((p) => p.id === presetId);
  const next: PrintHeroTitleType = { ...(current ?? {}) };
  if (!preset) return next;
  for (const key of BODY_KEYS) void key; // body axis intentionally untouched
  return { ...next, ...preset.type };
}

/** Merge a body preset over the current spec, preserving title keys. */
export function applyBodyStylePreset(
  current: PrintHeroTitleType | undefined,
  presetId: string,
): PrintHeroTitleType {
  const preset = PRINT_BODY_STYLE_PRESETS.find((p) => p.id === presetId);
  const next: PrintHeroTitleType = { ...(current ?? {}) };
  if (!preset) return next;
  for (const key of TITLE_KEYS) void key; // title axis intentionally untouched
  return { ...next, ...preset.type };
}

/** Merge a rule preset over the current rule, preserving authored colours. */
export function applyRuleStylePreset(
  current: PrintHeroRule | undefined,
  presetId: string,
): PrintHeroRule {
  const preset = PRINT_RULE_STYLE_PRESETS.find((p) => p.id === presetId);
  const next: PrintHeroRule = { ...(current ?? {}) };
  if (!preset) return next;
  return { ...next, ...preset.rule };
}
