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
  MsaPartnershipContent,
  CaseStudyContent,
  EBrochureContent,
  PrintHeroMedia,
  PrintSection,
  PrintStatsSection,
  PrintStatsVariant,
  SpotlightContent,
} from "./print-assets.types";

export type PrintTemplateKind =
  | "case-study"
  | "spotlight"
  | "ebrochure"
  | "adaptor-brief"
  | "msa-partnership";

/** Any print content model the capacity analyzer accepts. */
export type PrintAnyContent =
  | CaseStudyContent
  | SpotlightContent
  | EBrochureContent
  | AdaptorBriefContent
  | MsaPartnershipContent;

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
  /** Base module budget for the template (before hero cost is applied). */
  baseBudget: number;
  /** Hero cost delta subtracted from the base budget (0 for no-hero assets). */
  heroCostDelta: number;
  /** Actionable suggestions the UI can offer alongside issue messages. */
  suggestions: CapacitySuggestion[];
  issues: CapacityIssue[];
};

export type CapacitySuggestion =
  | { kind: "reduce-hero"; targetHeightPct: number; frees: number; message: string }
  | {
      kind: "swap-variant";
      moduleIndex: number;
      from: string;
      to: string;
      frees: number;
      message: string;
    }
  | { kind: "drop-item"; moduleIndex: number; frees: number; message: string };

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
  "case-study": { moduleBudget: 5.5, label: "Case Study" },
  spotlight: { moduleBudget: 4.5, label: "Spotlight" },
  ebrochure: { moduleBudget: 4.0, label: "eBrochure" },
  "adaptor-brief": { moduleBudget: 3.5, label: "Adaptor Brief" },
  // Dense fixed page (band + grid + table) leaves little room for modules.
  "msa-partnership": { moduleBudget: 1.5, label: "MSA Partnership" },
};

/* ------------------------------------------------------------------
 * HERO COST MODEL
 *
 * The hero band isn't a single strip — it's a stack of layers, each of
 * which competes with (or gives back) module space:
 *
 *   1. photo layer                — hard pixels (heightPct)
 *   2. accent wash / scrim        — hard pixels (co-located with photo)
 *   3. fade-into-page seam        — feathered, SHARED with the first
 *                                   module → rebated against hardBand
 *   4. hero copy (title/summary)  — must fit inside the band
 *
 * Baseline defaults (heightPct 46, washStrength 1, title+summary) yield
 * a hero cost delta of ZERO so today's constant `moduleBudget` values
 * remain the "typical" effective budget. Growing the hero taller (or
 * dampening the fade seam) subtracts from the effective module budget;
 * shrinking the hero (or removing copy) gives units back.
 * ---------------------------------------------------------------- */

/** Weight units consumed per 1 percentage point of hero height. */
export const HERO_UNITS_PER_PCT = 0.04;
/** Fraction of the hero band that's a shared feathered seam (scaled by washStrength). */
export const HERO_FADE_SEAM_FRAC = 0.15;
/** Copy reserve inside the band. */
export const HERO_COPY_RESERVE_TITLE = 0.2;
export const HERO_COPY_RESERVE_SUMMARY = 0.3;
/** Baseline height % against which hero-cost delta is measured. */
export const HERO_BASELINE_HEIGHT_PCT = 46;
/** Hard clamp on the grip regardless of remaining budget. */
export const HERO_HEIGHT_HARD_MIN = 22;
export const HERO_HEIGHT_HARD_MAX = 72;

type HeroCopy = { hasTitle: boolean; hasSummary: boolean };

function heroCopyOf(content: PrintAnyContent | undefined): HeroCopy {
  if (!content) return { hasTitle: false, hasSummary: false };
  const c = content as { title?: string; summary?: string };
  return {
    hasTitle: !!c.title && c.title.trim().length > 0,
    hasSummary: !!c.summary && c.summary.trim().length > 0,
  };
}

/**
 * Raw hero cost in weight units for a given (heightPct, washStrength, copy)
 * triple. Returns 0 when no hero photo is present — a no-hero asset never
 * shrinks the module budget.
 */
export function heroCostUnits(heroMedia: PrintHeroMedia | undefined, copy: HeroCopy): number {
  if (!heroMedia?.imageUrl) return 0;
  const hp = clampNum(
    heroMedia.heightPct ?? HERO_BASELINE_HEIGHT_PCT,
    HERO_HEIGHT_HARD_MIN,
    HERO_HEIGHT_HARD_MAX,
  );
  const ws = clampNum(heroMedia.washStrength ?? 1, 0, 1);
  const coeff = HERO_UNITS_PER_PCT * (1 - HERO_FADE_SEAM_FRAC * ws);
  const copyReserve =
    (copy.hasTitle ? HERO_COPY_RESERVE_TITLE : 0) +
    (copy.hasSummary ? HERO_COPY_RESERVE_SUMMARY : 0);
  return hp * coeff + copyReserve;
}

/** Baseline hero cost — subtracted so defaults yield delta=0. */
export function heroCostBaseline(): number {
  const coeff = HERO_UNITS_PER_PCT * (1 - HERO_FADE_SEAM_FRAC * 1);
  return HERO_BASELINE_HEIGHT_PCT * coeff + HERO_COPY_RESERVE_TITLE + HERO_COPY_RESERVE_SUMMARY;
}

/**
 * Effective module budget: base budget minus the hero-cost delta from
 * baseline. Never returns below 1.0 — beyond that the page stops being a
 * mixed hero+modules layout and the grip clamp should have already fired.
 */
export function effectiveModuleBudget(
  kind: PrintTemplateKind,
  heroMedia: PrintHeroMedia | undefined,
  copy: HeroCopy,
): number {
  const base = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const delta = heroCostUnits(heroMedia, copy) - (heroMedia?.imageUrl ? heroCostBaseline() : 0);
  return Math.max(1.0, base - delta);
}

function clampNum(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Given current module load, return the maximum heightPct the hero can
 * take without pushing the effective budget below `used`. Falls back to
 * HERO_HEIGHT_HARD_MAX when there's room to spare.
 */
export function maxHeroHeightPct(
  kind: PrintTemplateKind,
  usedModuleUnits: number,
  heroMedia: PrintHeroMedia | undefined,
  copy: HeroCopy,
): number {
  const base = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const ws = clampNum(heroMedia?.washStrength ?? 1, 0, 1);
  const coeff = HERO_UNITS_PER_PCT * (1 - HERO_FADE_SEAM_FRAC * ws);
  const copyReserve =
    (copy.hasTitle ? HERO_COPY_RESERVE_TITLE : 0) +
    (copy.hasSummary ? HERO_COPY_RESERVE_SUMMARY : 0);
  // effective = base - (hp*coeff + copyReserve - baseline) >= used
  // hp <= (base - used + baseline - copyReserve) / coeff
  const hp = (base - usedModuleUnits + heroCostBaseline() - copyReserve) / coeff;
  if (!Number.isFinite(hp)) return HERO_HEIGHT_HARD_MAX;
  return clampNum(Math.floor(hp), HERO_HEIGHT_HARD_MIN, HERO_HEIGHT_HARD_MAX);
}

/* ------------------------------------------------------------------
 * PER-VARIANT WEIGHTS AND CAPS
 * ---------------------------------------------------------------- */

export const PRINT_STATS_VARIANT_LIMITS: Record<
  PrintStatsVariant,
  { weight: number; minItems: number; maxItems: number; labelMax: number; valueMax: number }
> = {
  "kpi-dashboard-portrait": { weight: 2.4, minItems: 3, maxItems: 4, labelMax: 40, valueMax: 8 },
  "stat-callout-row-portrait": { weight: 1.6, minItems: 2, maxItems: 4, labelMax: 32, valueMax: 8 },
  "stat-bento-portrait": { weight: 2.0, minItems: 3, maxItems: 5, labelMax: 44, valueMax: 8 },
};

// Weights for non-stats families. Tuned against portrait renderers so the
// capacity meter and gating stay honest.
export const PRINT_QUOTE_VARIANT_WEIGHTS = {
  "pull-quote-hero": 1.8,
  "quote-attribution-card": 1.4,
  "quote-inline-compact": 0.9,
} as const;

export const PRINT_LOGO_VARIANT_LIMITS = {
  "logo-grid-portrait": { weight: 1.8, maxItems: 9 },
  "logo-row-portrait": { weight: 1.0, maxItems: 6 },
  "logo-wall-portrait": { weight: 2.4, maxItems: 12 },
} as const;

export const PRINT_EXPERTISE_VARIANT_LIMITS = {
  "expertise-icon-strip": { weight: 1.2, maxItems: 6, labelMax: 24 },
  "expertise-checklist": { weight: 1.8, maxItems: 6, labelMax: 90 },
  "expertise-credential-pills": { weight: 0.9, maxItems: 8, labelMax: 32 },
} as const;

export const PRINT_FEATURE_VARIANT_LIMITS = {
  "feature-cards-3col": { weight: 2.4, maxItems: 6, bodyMax: 140 },
  "feature-cards-2col": { weight: 2.0, maxItems: 4, bodyMax: 180 },
  "feature-list-1col": { weight: 2.6, maxItems: 5, bodyMax: 200 },
} as const;

export const PRINT_NARRATIVE_VARIANT_LIMITS = {
  "narrative-tri-card": { weight: 2.4, maxItems: 3, bodyMax: 320 },
  "narrative-numbered-arc": { weight: 2.8, maxItems: 4, bodyMax: 300 },
  "narrative-discover-panel": { weight: 2.2, maxItems: 1, bodyMax: 460 },
} as const;

export const PRINT_TABLE_VARIANT_LIMITS = {
  "table-two-col-list": { weight: 2.0, maxRows: 16 },
  "table-scale-rail": { weight: 1.2, maxRows: 4 },
  "table-spec-rows": { weight: 2.0, maxRows: 10 },
} as const;

export const PRINT_CONTACT_VARIANT_LIMITS = {
  "contact-expert-card": { weight: 1.1, maxRows: 0 },
  "contact-global-panel": { weight: 2.0, maxRows: 6 },
  "contact-cta-band": { weight: 1.2, maxRows: 0 },
} as const;

export const PRINT_HERO_VARIANT_WEIGHTS: Record<string, number> = {
  "hero-photo-band": 3.2,
  "hero-split-photo": 2.6,
  "hero-type-stack": 2.2,
  "hero-accent-band": 2.4,
  "hero-stat-lockup": 3.0,
  "hero-client-lockup": 2.4,
};

export function weightForSection(section: PrintSection): number {
  switch (section.kind) {
    case "hero":
      return PRINT_HERO_VARIANT_WEIGHTS[section.variantId] ?? 2.6;
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
    case "narrative":
      return PRINT_NARRATIVE_VARIANT_LIMITS[section.variantId]?.weight ?? 2.4;
    case "table":
      return PRINT_TABLE_VARIANT_LIMITS[section.variantId]?.weight ?? 2;
    case "contact":
      return PRINT_CONTACT_VARIANT_LIMITS[section.variantId]?.weight ?? 1.2;
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
  spotlight: {
    summary: 220,
    tagline: 90,
    capabilityBody: 220,
    capabilitiesMax: 5,
    statsMax: 4,
  },
  ebrochure: {
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
  "msa-partnership": {
    intro: 200,
    note: 460,
    statsMax: 6,
    solutionsMax: 12,
    solutionLabel: 42,
    scaleMax: 4,
    departmentsMax: 20,
    departmentLabel: 40,
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

export function analyzeSection(section: PrintSection, moduleIndex: number): CapacityIssue[] {
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
  } else if (section.kind === "quote") {
    pushLen(
      issues,
      "Quote text",
      section.text,
      section.variantId === "quote-inline-compact" ? 180 : 340,
      moduleIndex,
    );
    pushLen(issues, "Quote author", section.author, 60, moduleIndex);
  } else if (section.kind === "logo-grid") {
    const cfg = PRINT_LOGO_VARIANT_LIMITS[section.variantId];
    if (cfg && section.items.length > cfg.maxItems) {
      issues.push({
        level: "block",
        code: "logos-overflow",
        message: `${section.variantId} supports up to ${cfg.maxItems} logos — ${section.items.length} will clip.`,
        moduleIndex,
      });
    }
  } else if (section.kind === "expertise") {
    const cfg = PRINT_EXPERTISE_VARIANT_LIMITS[section.variantId];
    if (cfg && section.items.length > cfg.maxItems) {
      issues.push({
        level: "block",
        code: "expertise-overflow",
        message: `${section.variantId} supports up to ${cfg.maxItems} items — ${section.items.length} will clip.`,
        moduleIndex,
      });
    }
    if (cfg)
      section.items.forEach((it, i) =>
        pushLen(issues, `Item ${i + 1} label`, it.label, cfg.labelMax, moduleIndex),
      );
  } else if (section.kind === "feature-list") {
    const cfg = PRINT_FEATURE_VARIANT_LIMITS[section.variantId];
    if (cfg && section.items.length > cfg.maxItems) {
      issues.push({
        level: "block",
        code: "features-overflow",
        message: `${section.variantId} supports up to ${cfg.maxItems} features — ${section.items.length} will clip.`,
        moduleIndex,
      });
    }
    if (cfg)
      section.items.forEach((it, i) =>
        pushLen(issues, `Feature ${i + 1} body`, it.body, cfg.bodyMax, moduleIndex),
      );
  } else if (section.kind === "narrative") {
    const cfg = PRINT_NARRATIVE_VARIANT_LIMITS[section.variantId];
    if (cfg && section.items.length > cfg.maxItems) {
      issues.push({
        level: "block",
        code: "narrative-overflow",
        message: `${section.variantId} supports up to ${cfg.maxItems} blocks — ${section.items.length} will clip.`,
        moduleIndex,
      });
    }
    if (cfg)
      section.items.forEach((it, i) =>
        pushLen(issues, `Block ${i + 1} body`, it.body, cfg.bodyMax, moduleIndex),
      );
  } else if (section.kind === "table") {
    const cfg = PRINT_TABLE_VARIANT_LIMITS[section.variantId];
    if (cfg && section.rows.length > cfg.maxRows) {
      issues.push({
        level: "block",
        code: "table-overflow",
        message: `${section.variantId} supports up to ${cfg.maxRows} rows — ${section.rows.length} will clip.`,
        moduleIndex,
      });
    }
  } else if (section.kind === "contact") {
    const cfg = PRINT_CONTACT_VARIANT_LIMITS[section.variantId];
    const rows = section.rows?.length ?? 0;
    if (cfg && cfg.maxRows > 0 && rows > cfg.maxRows) {
      issues.push({
        level: "block",
        code: "contact-overflow",
        message: `${section.variantId} supports up to ${cfg.maxRows} contact rows — ${rows} will clip.`,
        moduleIndex,
      });
    }
  }
  return issues;
}

function analyzeModules(
  kind: PrintTemplateKind,
  modules: PrintSection[] | undefined,
  effectiveBudget?: number,
): { used: number; issues: CapacityIssue[]; budget: number } {
  const list = modules ?? [];
  const budget = effectiveBudget ?? PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
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
      message: `Shared modules use ${used.toFixed(1)} of ${budget.toFixed(1)} page units — content will overflow the page. Reduce the hero band, remove a module, or pick a lighter variant.`,
    });
  } else if (used > budget * 0.85) {
    issues.push({
      level: "warn",
      code: "modules-near-page-cap",
      message: `Shared modules use ${used.toFixed(1)} of ${budget.toFixed(1)} page units. Layout is tight — verify export.`,
    });
  }
  return { used, issues, budget };
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
  (c.features ?? []).forEach((f, i) => pushLen(issues, `Feature ${i + 1}`, f.body, t.featureBody));
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

function analyzeMsaPartnership(c: MsaPartnershipContent): CapacityIssue[] {
  const t = TEXT_LIMITS["msa-partnership"];
  const issues: CapacityIssue[] = [];
  pushLen(issues, "Positioning line", c.intro, t.intro);
  pushLen(issues, "Partnership paragraph", c.partnershipNote, t.note);
  if ((c.stats?.length ?? 0) > t.statsMax) {
    issues.push({
      level: "block",
      code: "stats-overflow",
      message: `The relationship band fits up to ${t.statsMax} stat cards.`,
    });
  }
  (c.solutions ?? []).forEach((s, i) =>
    pushLen(issues, `Solution ${i + 1}`, s.label, t.solutionLabel),
  );
  if ((c.solutions?.length ?? 0) > t.solutionsMax) {
    issues.push({
      level: "block",
      code: "solutions-overflow",
      message: `The solutions grid fits up to ${t.solutionsMax} tiles.`,
    });
  }
  if ((c.scale?.length ?? 0) > t.scaleMax) {
    issues.push({
      level: "warn",
      code: "scale-overflow",
      message: `The scale rail fits up to ${t.scaleMax} metrics.`,
    });
  }
  (c.departments ?? []).forEach((d, i) =>
    pushLen(issues, `Department ${i + 1}`, d, t.departmentLabel),
  );
  if ((c.departments?.length ?? 0) > t.departmentsMax) {
    issues.push({
      level: "block",
      code: "departments-overflow",
      message: `The departments table fits up to ${t.departmentsMax} rows.`,
    });
  }
  return issues;
}

export function analyzePrintAsset(
  kind: PrintTemplateKind,
  content: PrintAnyContent,
): CapacityReport {
  const base = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const modules = (content as { modules?: PrintSection[] }).modules;
  const heroMedia = (content as { heroMedia?: PrintHeroMedia }).heroMedia;
  const copy = heroCopyOf(content);
  const budget = effectiveModuleBudget(kind, heroMedia, copy);
  const heroCostDelta = base - budget;

  const { used, issues: modIssues } = analyzeModules(kind, modules, budget);

  let bodyIssues: CapacityIssue[] = [];
  if (kind === "case-study") bodyIssues = analyzeCaseStudy(content as CaseStudyContent);
  else if (kind === "spotlight") bodyIssues = analyzeSpotlight(content as SpotlightContent);
  else if (kind === "ebrochure") bodyIssues = analyzeEBrochure(content as EBrochureContent);
  else if (kind === "adaptor-brief") bodyIssues = analyzeAdaptor(content as AdaptorBriefContent);
  else if (kind === "msa-partnership")
    bodyIssues = analyzeMsaPartnership(content as MsaPartnershipContent);

  const issues = [...modIssues, ...bodyIssues];
  const level: CapacityLevel = issues.some((i) => i.level === "block")
    ? "block"
    : issues.some((i) => i.level === "warn")
      ? "warn"
      : "ok";

  const suggestions = buildSuggestions({
    kind,
    modules: modules ?? [],
    used,
    budget,
    heroMedia,
    copy,
  });

  return {
    level,
    fill: budget > 0 ? used / budget : 0,
    used,
    budget,
    baseBudget: base,
    heroCostDelta,
    suggestions,
    issues,
  };
}

/** Lighter stats variant chain, ordered heaviest → lightest. */
const STATS_SWAP_CHAIN: PrintStatsVariant[] = [
  "kpi-dashboard-portrait",
  "stat-bento-portrait",
  "stat-callout-row-portrait",
];

function buildSuggestions(args: {
  kind: PrintTemplateKind;
  modules: PrintSection[];
  used: number;
  budget: number;
  heroMedia: PrintHeroMedia | undefined;
  copy: HeroCopy;
}): CapacitySuggestion[] {
  const { kind, modules, used, budget, heroMedia, copy } = args;
  const suggestions: CapacitySuggestion[] = [];
  if (used <= budget) return suggestions;

  // Suggestion 1: reduce hero band.
  if (heroMedia?.imageUrl) {
    const target = maxHeroHeightPct(kind, used, heroMedia, copy);
    const current = heroMedia.heightPct ?? HERO_BASELINE_HEIGHT_PCT;
    if (target < current) {
      const coeff = HERO_UNITS_PER_PCT * (1 - HERO_FADE_SEAM_FRAC * (heroMedia.washStrength ?? 1));
      const frees = (current - target) * coeff;
      suggestions.push({
        kind: "reduce-hero",
        targetHeightPct: target,
        frees,
        message: `Reduce hero to ${target}% (frees ${frees.toFixed(1)} units)`,
      });
    }
  }

  // Suggestion 2: swap heaviest stats variant to a lighter one.
  modules.forEach((m, i) => {
    if (m.kind !== "stats") return;
    const idx = STATS_SWAP_CHAIN.indexOf(m.variantId);
    if (idx < 0 || idx === STATS_SWAP_CHAIN.length - 1) return;
    const lighter = STATS_SWAP_CHAIN[idx + 1]!;
    const cur = PRINT_STATS_VARIANT_LIMITS[m.variantId]?.weight ?? 2;
    const next = PRINT_STATS_VARIANT_LIMITS[lighter]?.weight ?? 2;
    const frees = cur - next;
    if (frees <= 0) return;
    suggestions.push({
      kind: "swap-variant",
      moduleIndex: i,
      from: m.variantId,
      to: lighter,
      frees,
      message: `Swap module ${i + 1}: ${m.variantId} → ${lighter} (frees ${frees.toFixed(1)} units)`,
    });
  });

  return suggestions;
}

/**
 * Can the user add another module of the given weight without hard-blocking
 * the page? Used to gate the "Add module" button. Accepts optional
 * hero-context so the gate honours the effective (hero-adjusted) budget.
 */
export function canAddModule(
  kind: PrintTemplateKind,
  modules: PrintSection[] | undefined,
  candidateWeight = 2,
  opts?: { heroMedia?: PrintHeroMedia; copy?: HeroCopy },
): { ok: boolean; remaining: number; reason?: string } {
  const budget = opts
    ? effectiveModuleBudget(
        kind,
        opts.heroMedia,
        opts.copy ?? { hasTitle: false, hasSummary: false },
      )
    : PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const used = (modules ?? []).reduce((n, m) => n + weightForSection(m), 0);
  const remaining = budget - used;
  if (used + candidateWeight > budget) {
    return {
      ok: false,
      remaining,
      reason: `No room — ${remaining.toFixed(1)} of ${budget.toFixed(1)} page units left. Reduce the hero band, remove a module, or pick a lighter variant.`,
    };
  }
  return { ok: true, remaining };
}
