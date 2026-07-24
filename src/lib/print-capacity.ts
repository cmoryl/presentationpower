/**
 * Print template capacity model.
 *
 * Every print template (Case Study, Spotlight, EBrochure, Adaptor Brief) is a
 * SINGLE portrait page with fixed real estate. Shared modules and body content
 * compete for that space. We model per-variant "weight units" (~ vertical
 * inches on an A4 page at standard density) plus text-length ceilings, then
 * compute a health verdict:
 *
 *   ok     — everything fits
 *   warn   — approaching a limit, layout still renders
 *   block  — hard-stop: rendering will overflow the page, exports will clip
 *
 * The same helpers gate the "Add module" button in the editor and drive the
 * inline warning banner. Keep this file pure (no React) so it can be unit
 * tested from Node without a DOM.
 */

import type {
  AdaptorBriefContent,
  CaseStudyContent,
  EBrochureContent,
  PrintSection,
  PrintStatsSection,
  PrintStatsVariant,
  SpotlightContent,
} from "./print-assets.types";

export type PrintTemplateKind =
  | "case-study"
  | "spotlight"
  | "ebrochure"
  | "adaptor-brief";

export type CapacityLevel = "ok" | "warn" | "block";

export type CapacityIssue = {
  level: Exclude<CapacityLevel, "ok">;
  code: string;
  message: string;
  /** Optional index into content.modules[] for module-scoped issues. */
  moduleIndex?: number;
};

export type CapacityReport = {
  level: CapacityLevel;
  /** 0..1 fill against the page module budget. */
  fill: number;
  /** Weight units used / total. */
  used: number;
  budget: number;
  issues: CapacityIssue[];
};

/* ------------------------------------------------------------------
 * PER-TEMPLATE BUDGETS
 *
 * `moduleBudget` is a page-relative weight budget (~ vertical inches of
 * flowable space after hero + body). Values are calibrated against the
 * portrait canvases in src/components/print/*Layout.tsx and updated when
 * new variants are added.
 * ---------------------------------------------------------------- */

export const PRINT_TEMPLATE_BUDGETS: Record<
  PrintTemplateKind,
  { moduleBudget: number; label: string }
> = {
  "case-study":   { moduleBudget: 5.5, label: "Case Study"    },
  "spotlight":    { moduleBudget: 4.5, label: "Spotlight"     },
  "ebrochure":    { moduleBudget: 4.0, label: "eBrochure"     },
  "adaptor-brief":{ moduleBudget: 3.5, label: "Adaptor Brief" },
};

/* ------------------------------------------------------------------
 * PER-VARIANT WEIGHTS AND CAPS
 * ---------------------------------------------------------------- */

export const PRINT_STATS_VARIANT_LIMITS: Record<
  PrintStatsVariant,
  { weight: number; minItems: number; maxItems: number; labelMax: number; valueMax: number }
> = {
  "kpi-dashboard-portrait":   { weight: 2.4, minItems: 3, maxItems: 4, labelMax: 40, valueMax: 8 },
  "stat-callout-row-portrait":{ weight: 1.6, minItems: 2, maxItems: 4, labelMax: 32, valueMax: 8 },
  "stat-bento-portrait":      { weight: 2.0, minItems: 3, maxItems: 5, labelMax: 44, valueMax: 8 },
};

// Weights for non-stats families. Tuned against portrait renderers so the
// capacity meter and gating stay honest.
export const PRINT_QUOTE_VARIANT_WEIGHTS = {
  "pull-quote-hero": 1.8,
  "quote-attribution-card": 1.4,
  "quote-inline-compact": 0.9,
} as const;

export const PRINT_LOGO_VARIANT_LIMITS = {
  "logo-grid-portrait":  { weight: 1.8, maxItems: 9 },
  "logo-row-portrait":   { weight: 1.0, maxItems: 6 },
  "logo-wall-portrait":  { weight: 2.4, maxItems: 12 },
} as const;

export const PRINT_EXPERTISE_VARIANT_LIMITS = {
  "expertise-icon-strip":       { weight: 1.2, maxItems: 6, labelMax: 24 },
  "expertise-checklist":        { weight: 1.8, maxItems: 6, labelMax: 90 },
  "expertise-credential-pills": { weight: 0.9, maxItems: 8, labelMax: 32 },
} as const;

export const PRINT_FEATURE_VARIANT_LIMITS = {
  "feature-cards-3col": { weight: 2.4, maxItems: 6, bodyMax: 140 },
  "feature-cards-2col": { weight: 2.0, maxItems: 4, bodyMax: 180 },
  "feature-list-1col":  { weight: 2.6, maxItems: 5, bodyMax: 200 },
} as const;

export function weightForSection(section: PrintSection): number {
  switch (section.kind) {
    case "stats":
      return PRINT_STATS_VARIANT_LIMITS[section.variantId]?.weight ?? 2;
    case "quote":
      return PRINT_QUOTE_VARIANT_WEIGHTS[section.variantId] ?? 1.4;
    case "logo-grid":
      return PRINT_LOGO_VARIANT_LIMITS[section.variantId]?.weight ?? 1.8;
    case "expertise":
      return PRINT_EXPERTISE_VARIANT_LIMITS[section.variantId]?.weight ?? 1.2;
    case "feature-list":
      return PRINT_FEATURE_VARIANT_LIMITS[section.variantId]?.weight ?? 2.2;
    default:
      return 2;
  }
}

/* ------------------------------------------------------------------
 * BODY-CONTENT CEILINGS PER TEMPLATE
 *
 * Text-length caps mirror how much copy each block can hold at standard
 * density before the layout starts to squeeze. Numbers were tuned against
 * the real portrait renderers.
 * ---------------------------------------------------------------- */

const TEXT_LIMITS = {
  "case-study": {
    summary: 220,
    challengeBody: 520,
    solutionBody: 520,
    resultBody: 520,
    quoteText: 340,
    statsMax: 5,
  },
  "spotlight": {
    summary: 220,
    tagline: 90,
    capabilityBody: 220,
    capabilitiesMax: 5,
    statsMax: 4,
  },
  "ebrochure": {
    summary: 220,
    sectionBody: 380,
    bulletMax: 120,
    bulletsPerSection: 4,
    statsMax: 5,
  },
  "adaptor-brief": {
    summary: 200,
    featureBody: 140,
    featuresMax: 6,
    knowHowMax: 5,
    knowHowLine: 90,
  },
} as const;

/* ------------------------------------------------------------------
 * ANALYSIS
 * ---------------------------------------------------------------- */

function pushLen(
  issues: CapacityIssue[],
  label: string,
  value: string | undefined | null,
  max: number,
  moduleIndex?: number,
) {
  if (!value) return;
  const len = value.length;
  if (len > max) {
    issues.push({
      level: "block",
      code: "text-overflow",
      message: `${label} is ${len} chars — hard cap is ${max}. Layout will clip.`,
      ...(moduleIndex !== undefined ? { moduleIndex } : {}),
    });
  } else if (len > max * 0.88) {
    issues.push({
      level: "warn",
      code: "text-approaching-limit",
      message: `${label} is nearing the ${max}-char limit (${len}).`,
      ...(moduleIndex !== undefined ? { moduleIndex } : {}),
    });
  }
}

export function analyzeSection(
  section: PrintSection,
  moduleIndex: number,
): CapacityIssue[] {
  const issues: CapacityIssue[] = [];
  if (section.kind === "stats") {
    const cfg = PRINT_STATS_VARIANT_LIMITS[section.variantId];
    if (!cfg) return issues;
    const s = section as PrintStatsSection;
    if (s.items.length < cfg.minItems) {
      issues.push({
        level: "warn",
        code: "stats-underfilled",
        message: `${s.variantId} needs at least ${cfg.minItems} items (has ${s.items.length}).`,
        moduleIndex,
      });
    }
    if (s.items.length > cfg.maxItems) {
      issues.push({
        level: "block",
        code: "stats-overflow",
        message: `${s.variantId} supports up to ${cfg.maxItems} items — ${s.items.length} will clip.`,
        moduleIndex,
      });
    }
    s.items.forEach((it, i) => {
      pushLen(issues, `Stat ${i + 1} label`, it.label, cfg.labelMax, moduleIndex);
      pushLen(issues, `Stat ${i + 1} value`, it.value, cfg.valueMax, moduleIndex);
    });
    pushLen(issues, "Stats title", s.title, 60, moduleIndex);
    pushLen(issues, "Stats eyebrow", s.eyebrow, 48, moduleIndex);
  }
  return issues;
}

function analyzeModules(
  kind: PrintTemplateKind,
  modules: PrintSection[] | undefined,
): { used: number; issues: CapacityIssue[] } {
  const list = modules ?? [];
  const budget = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  let used = 0;
  const issues: CapacityIssue[] = [];
  list.forEach((m, i) => {
    used += weightForSection(m);
    issues.push(...analyzeSection(m, i));
  });
  if (used > budget) {
    issues.push({
      level: "block",
      code: "modules-page-overflow",
      message: `Shared modules use ${used.toFixed(1)} of ${budget.toFixed(1)} page units — content will overflow the page. Remove or swap for a smaller variant.`,
    });
  } else if (used > budget * 0.85) {
    issues.push({
      level: "warn",
      code: "modules-near-page-cap",
      message: `Shared modules use ${used.toFixed(1)} of ${budget.toFixed(1)} page units. Layout is tight — verify export.`,
    });
  }
  return { used, issues };
}

function analyzeCaseStudy(c: CaseStudyContent): CapacityIssue[] {
  const t = TEXT_LIMITS["case-study"];
  const issues: CapacityIssue[] = [];
  pushLen(issues, "Summary", c.summary, t.summary);
  pushLen(issues, "Challenge body", c.challenge?.body, t.challengeBody);
  pushLen(issues, "Solution body", c.solution?.body, t.solutionBody);
  pushLen(issues, "Result body", c.result?.body, t.resultBody);
  pushLen(issues, "Pull quote", c.quote?.text, t.quoteText);
  if (c.stats && c.stats.length > t.statsMax) {
    issues.push({
      level: "block",
      code: "hero-stats-overflow",
      message: `Hero stats row supports up to ${t.statsMax} tiles (${c.stats.length} configured).`,
    });
  }
  return issues;
}

function analyzeSpotlight(c: SpotlightContent): CapacityIssue[] {
  const t = TEXT_LIMITS["spotlight"];
  const issues: CapacityIssue[] = [];
  pushLen(issues, "Summary", c.summary, t.summary);
  pushLen(issues, "Tagline", c.tagline, t.tagline);
  (c.capabilities ?? []).forEach((cap, i) =>
    pushLen(issues, `Capability ${i + 1}`, cap.body, t.capabilityBody),
  );
  if ((c.capabilities?.length ?? 0) > t.capabilitiesMax) {
    issues.push({
      level: "block",
      code: "capabilities-overflow",
      message: `Spotlight supports up to ${t.capabilitiesMax} capabilities.`,
    });
  }
  if ((c.stats?.length ?? 0) > t.statsMax) {
    issues.push({
      level: "block",
      code: "hero-stats-overflow",
      message: `Spotlight stats row supports up to ${t.statsMax} tiles.`,
    });
  }
  return issues;
}

function analyzeEBrochure(c: EBrochureContent): CapacityIssue[] {
  const t = TEXT_LIMITS["ebrochure"];
  const issues: CapacityIssue[] = [];
  pushLen(issues, "Summary", c.summary, t.summary);
  (c.sections ?? []).forEach((s, i) => {
    pushLen(issues, `Section ${i + 1} body`, s.body, t.sectionBody);
    if (s.bullets && s.bullets.length > t.bulletsPerSection) {
      issues.push({
        level: "block",
        code: "bullets-overflow",
        message: `Section ${i + 1} has ${s.bullets.length} bullets — max ${t.bulletsPerSection}.`,
      });
    }
    (s.bullets ?? []).forEach((b, j) =>
      pushLen(issues, `Section ${i + 1} bullet ${j + 1}`, b, t.bulletMax),
    );
  });
  if ((c.stats?.length ?? 0) > t.statsMax) {
    issues.push({
      level: "block",
      code: "hero-stats-overflow",
      message: `eBrochure stats row supports up to ${t.statsMax} tiles.`,
    });
  }
  return issues;
}

function analyzeAdaptor(c: AdaptorBriefContent): CapacityIssue[] {
  const t = TEXT_LIMITS["adaptor-brief"];
  const issues: CapacityIssue[] = [];
  pushLen(issues, "Summary", c.summary, t.summary);
  (c.features ?? []).forEach((f, i) =>
    pushLen(issues, `Feature ${i + 1}`, f.body, t.featureBody),
  );
  if ((c.features?.length ?? 0) > t.featuresMax) {
    issues.push({
      level: "block",
      code: "features-overflow",
      message: `Adaptor brief supports exactly ${t.featuresMax} features.`,
    });
  }
  (c.knowHow ?? []).forEach((k, i) => pushLen(issues, `Know-how ${i + 1}`, k, t.knowHowLine));
  if ((c.knowHow?.length ?? 0) > t.knowHowMax) {
    issues.push({
      level: "block",
      code: "knowhow-overflow",
      message: `"We know how" strip supports up to ${t.knowHowMax} lines.`,
    });
  }
  return issues;
}

export function analyzePrintAsset(
  kind: PrintTemplateKind,
  content:
    | CaseStudyContent
    | SpotlightContent
    | EBrochureContent
    | AdaptorBriefContent,
): CapacityReport {
  const budget = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const modules = (content as { modules?: PrintSection[] }).modules;
  const { used, issues: modIssues } = analyzeModules(kind, modules);

  let bodyIssues: CapacityIssue[] = [];
  if (kind === "case-study")   bodyIssues = analyzeCaseStudy(content as CaseStudyContent);
  else if (kind === "spotlight")     bodyIssues = analyzeSpotlight(content as SpotlightContent);
  else if (kind === "ebrochure")     bodyIssues = analyzeEBrochure(content as EBrochureContent);
  else if (kind === "adaptor-brief") bodyIssues = analyzeAdaptor(content as AdaptorBriefContent);

  const issues = [...modIssues, ...bodyIssues];
  const level: CapacityLevel = issues.some((i) => i.level === "block")
    ? "block"
    : issues.some((i) => i.level === "warn")
      ? "warn"
      : "ok";

  return { level, fill: budget > 0 ? used / budget : 0, used, budget, issues };
}

/**
 * Can the user add another module of the given weight without hard-blocking
 * the page? Used to gate the "Add module" button.
 */
export function canAddModule(
  kind: PrintTemplateKind,
  modules: PrintSection[] | undefined,
  candidateWeight = 2,
): { ok: boolean; remaining: number; reason?: string } {
  const budget = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const used = (modules ?? []).reduce((n, m) => n + weightForSection(m), 0);
  const remaining = budget - used;
  if (used + candidateWeight > budget) {
    return {
      ok: false,
      remaining,
      reason: `No room — ${remaining.toFixed(1)} of ${budget.toFixed(1)} page units left. Remove a module or pick a lighter variant.`,
    };
  }
  return { ok: true, remaining };
}
