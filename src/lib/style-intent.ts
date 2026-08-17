/**
 * INTENT-AWARE STYLE RECOMMENDATION — S01–S28 only.
 *
 * OnDeck framework order: intent → audience/context → story architecture →
 * framework/style selection. Never thumbnail-first. So the recommender is not a
 * keyword grep and not a random pick: it is a DETERMINISTIC WEIGHTED SCORE over
 * structured dimensions, and it explains itself.
 *
 * Guarantees:
 *   • The catalog is untouched — no new styles, no renames, no re-ordering.
 *     This module only scores the existing approved 28.
 *   • Industry recipe DNA is the largest single prior; objective, audience and
 *     content mode refine the ranking beneath it.
 *   • Same brief in, same ranking out (ties broken by catalog order).
 *   • Search/filter stays completely separate (see `searchApprovedStyles`).
 */

import { designSkinByName, industryRecipeById, matchRecipes } from "./design-skins";
import { approvedStyles, type ApprovedStyle } from "./approved-visual-styles";

/* ------------------------------------------------------------------ brief -- */

export type DeckObjective =
  | "sales-pitch"
  | "executive-briefing"
  | "product-launch"
  | "research-report"
  | "case-study"
  | "event-keynote"
  | "training"
  | "investor-finance"
  | "internal-update"
  | "proposal-rfp";

export type AudienceType =
  | "executive"
  | "technical"
  | "buyer"
  | "investor"
  | "internal-team"
  | "public-broad"
  | "academic"
  | "creative";

/** Narrative position / the job this slide (or deck) has to do. */
export type SlideJob = "hero" | "content" | "data" | "flow" | "appendix";

export type ContentDensity = "low" | "medium" | "high";
export type DataIntensity = "none" | "some" | "heavy";
/** Imagery availability AND priority in one axis. */
export type ImageryPosture = "none" | "available" | "led";
export type EnergyTone = "calm" | "confident" | "bold";
export type ComplexityLevel = "simple" | "moderate" | "complex";
export type ModePreference = "any" | "light" | "dark";
export type OutputContext = "stage" | "boardroom" | "send-ahead" | "print" | "webinar";

export interface StyleIntentBrief {
  /** Industry recipe id (R01–R30). The strongest prior when present. */
  recipeId?: string | null;
  /** Free text; only used to imply a recipe and as a weak tiebreak. */
  intent?: string;
  objective?: DeckObjective;
  audience?: AudienceType;
  slideJob?: SlideJob;
  density?: ContentDensity;
  data?: DataIntensity;
  imagery?: ImageryPosture;
  energy?: EnergyTone;
  complexity?: ComplexityLevel;
  mode?: ModePreference;
  /** High-contrast / WCAG-critical delivery. */
  highContrast?: boolean;
  output?: OutputContext;
}

export const OBJECTIVE_LABELS: Record<DeckObjective, string> = {
  "sales-pitch": "Sales pitch",
  "executive-briefing": "Executive briefing",
  "product-launch": "Product launch",
  "research-report": "Research / report",
  "case-study": "Case study",
  "event-keynote": "Event / keynote",
  training: "Training",
  "investor-finance": "Investor / finance",
  "internal-update": "Internal update",
  "proposal-rfp": "Proposal / RFP",
};

export const AUDIENCE_LABELS: Record<AudienceType, string> = {
  executive: "Executive / C-suite",
  technical: "Technical / practitioner",
  buyer: "Buyer / procurement",
  investor: "Investor / board",
  "internal-team": "Internal team",
  "public-broad": "Broad public",
  academic: "Academic / research",
  creative: "Creative / brand",
};

export const SLIDE_JOB_LABELS: Record<SlideJob, string> = {
  hero: "Hero / opening",
  content: "Content / argument",
  data: "Data / proof",
  flow: "Process / flow",
  appendix: "Appendix / detail",
};

export const OUTPUT_LABELS: Record<OutputContext, string> = {
  stage: "Stage / large room",
  boardroom: "Boardroom screen",
  "send-ahead": "Sent ahead to read",
  print: "Printed / PDF leave-behind",
  webinar: "Webinar / small screen",
};

/* ------------------------------------------------------------- style traits */

/**
 * Lightweight trait map for the approved 28. Derived from the catalog fields
 * (bestFit, description, density, mode, spec) and then made explicit so the
 * scorer has something structured to reason over.
 *
 *   data / imagery / noise / complexity are 0–1 capacities.
 *   noise = how much visual incident the language brings; low noise wins for
 *   dense, high-data or accessibility-critical stories.
 */
export interface StyleTraits {
  objectives: DeckObjective[];
  audiences: AudienceType[];
  jobs: SlideJob[];
  energy: EnergyTone;
  /** Comfort carrying charts and figures. */
  data: number;
  /** Reliance on / reward for real photography. */
  imagery: number;
  /** Visual incident the background brings. */
  noise: number;
  /** Tolerance for complex, multi-part content. */
  complexity: number;
  outputs: OutputContext[];
  /** Ships a high-contrast pairing comfortably. */
  contrastSafe: boolean;
}

export const STYLE_TRAITS: Record<string, StyleTraits> = {
  S01: { objectives: ["product-launch", "executive-briefing", "case-study"], audiences: ["executive", "buyer", "creative"], jobs: ["hero", "content"], energy: "calm", data: 0.4, imagery: 0.8, noise: 0.2, complexity: 0.4, outputs: ["stage", "boardroom", "send-ahead"], contrastSafe: true },
  S02: { objectives: ["product-launch", "event-keynote", "sales-pitch"], audiences: ["creative", "public-broad", "buyer"], jobs: ["hero", "content"], energy: "bold", data: 0.3, imagery: 0.7, noise: 0.6, complexity: 0.3, outputs: ["stage", "webinar"], contrastSafe: false },
  S03: { objectives: ["sales-pitch", "product-launch", "proposal-rfp"], audiences: ["buyer", "technical", "executive"], jobs: ["hero", "content", "data"], energy: "confident", data: 0.6, imagery: 0.5, noise: 0.5, complexity: 0.6, outputs: ["boardroom", "webinar", "send-ahead"], contrastSafe: true },
  S04: { objectives: ["executive-briefing", "research-report", "proposal-rfp"], audiences: ["technical", "executive"], jobs: ["content", "data", "appendix"], energy: "confident", data: 0.9, imagery: 0.3, noise: 0.3, complexity: 0.9, outputs: ["boardroom", "send-ahead", "webinar"], contrastSafe: true },
  S05: { objectives: ["research-report", "training", "internal-update"], audiences: ["technical", "academic"], jobs: ["content", "data", "appendix"], energy: "calm", data: 0.8, imagery: 0.2, noise: 0.15, complexity: 0.9, outputs: ["send-ahead", "print", "webinar"], contrastSafe: true },
  S06: { objectives: ["executive-briefing", "proposal-rfp", "internal-update"], audiences: ["executive", "buyer", "internal-team"], jobs: ["content", "data", "flow"], energy: "calm", data: 0.9, imagery: 0.3, noise: 0.15, complexity: 0.95, outputs: ["boardroom", "send-ahead", "print"], contrastSafe: true },
  S07: { objectives: ["training", "internal-update", "product-launch"], audiences: ["internal-team", "public-broad", "buyer"], jobs: ["content", "flow"], energy: "calm", data: 0.6, imagery: 0.6, noise: 0.3, complexity: 0.6, outputs: ["webinar", "send-ahead", "boardroom"], contrastSafe: true },
  S08: { objectives: ["product-launch", "event-keynote", "training"], audiences: ["public-broad", "creative", "internal-team"], jobs: ["hero", "content", "flow"], energy: "bold", data: 0.5, imagery: 0.6, noise: 0.7, complexity: 0.4, outputs: ["stage", "webinar"], contrastSafe: true },
  S09: { objectives: ["product-launch", "research-report", "training"], audiences: ["technical"], jobs: ["content", "data", "appendix"], energy: "confident", data: 0.9, imagery: 0.2, noise: 0.35, complexity: 0.95, outputs: ["webinar", "send-ahead"], contrastSafe: true },
  S10: { objectives: ["internal-update", "training", "proposal-rfp"], audiences: ["internal-team", "buyer"], jobs: ["flow", "content"], energy: "confident", data: 0.6, imagery: 0.4, noise: 0.4, complexity: 0.7, outputs: ["webinar", "boardroom"], contrastSafe: true },
  S11: { objectives: ["sales-pitch", "product-launch", "case-study"], audiences: ["buyer", "public-broad"], jobs: ["content", "data"], energy: "confident", data: 0.7, imagery: 0.7, noise: 0.35, complexity: 0.6, outputs: ["boardroom", "webinar", "print"], contrastSafe: true },
  S12: { objectives: ["executive-briefing", "internal-update", "proposal-rfp"], audiences: ["executive", "internal-team", "technical"], jobs: ["data", "flow", "appendix"], energy: "calm", data: 0.95, imagery: 0.2, noise: 0.2, complexity: 0.95, outputs: ["boardroom", "send-ahead", "print"], contrastSafe: true },
  S13: { objectives: ["executive-briefing", "sales-pitch", "internal-update"], audiences: ["executive", "buyer", "internal-team"], jobs: ["content", "data"], energy: "confident", data: 0.85, imagery: 0.5, noise: 0.3, complexity: 0.85, outputs: ["boardroom", "send-ahead", "webinar"], contrastSafe: true },
  S14: { objectives: ["research-report", "executive-briefing", "proposal-rfp"], audiences: ["academic", "executive", "technical"], jobs: ["content", "data", "appendix"], energy: "calm", data: 0.85, imagery: 0.4, noise: 0.1, complexity: 0.9, outputs: ["print", "send-ahead", "boardroom"], contrastSafe: true },
  S15: { objectives: ["research-report", "case-study", "executive-briefing"], audiences: ["academic", "executive", "public-broad"], jobs: ["content", "data", "appendix"], energy: "calm", data: 0.8, imagery: 0.5, noise: 0.2, complexity: 0.85, outputs: ["send-ahead", "print"], contrastSafe: true },
  S16: { objectives: ["product-launch", "event-keynote", "case-study"], audiences: ["creative", "executive", "public-broad"], jobs: ["hero", "content"], energy: "bold", data: 0.25, imagery: 0.95, noise: 0.45, complexity: 0.3, outputs: ["stage", "print"], contrastSafe: false },
  S17: { objectives: ["training", "case-study", "internal-update"], audiences: ["internal-team", "public-broad"], jobs: ["content", "flow"], energy: "calm", data: 0.5, imagery: 0.8, noise: 0.3, complexity: 0.5, outputs: ["webinar", "print", "send-ahead"], contrastSafe: true },
  S18: { objectives: ["event-keynote", "sales-pitch", "product-launch"], audiences: ["public-broad", "creative", "buyer"], jobs: ["hero"], energy: "bold", data: 0.2, imagery: 0.9, noise: 0.8, complexity: 0.25, outputs: ["stage"], contrastSafe: false },
  S19: { objectives: ["research-report", "proposal-rfp", "training"], audiences: ["technical", "academic"], jobs: ["flow", "data", "appendix"], energy: "calm", data: 0.85, imagery: 0.3, noise: 0.25, complexity: 0.95, outputs: ["print", "send-ahead", "boardroom"], contrastSafe: true },
  S20: { objectives: ["investor-finance", "research-report", "executive-briefing"], audiences: ["investor", "executive", "technical"], jobs: ["data", "content"], energy: "confident", data: 1, imagery: 0.2, noise: 0.35, complexity: 0.95, outputs: ["boardroom", "webinar", "send-ahead"], contrastSafe: true },
  S21: { objectives: ["research-report", "case-study", "training"], audiences: ["academic", "public-broad", "internal-team"], jobs: ["content", "flow"], energy: "calm", data: 0.6, imagery: 0.7, noise: 0.45, complexity: 0.6, outputs: ["send-ahead", "webinar", "print"], contrastSafe: true },
  S22: { objectives: ["research-report", "case-study", "proposal-rfp"], audiences: ["academic", "executive", "buyer"], jobs: ["content", "appendix", "data"], energy: "calm", data: 0.7, imagery: 0.5, noise: 0.2, complexity: 0.9, outputs: ["print", "send-ahead"], contrastSafe: true },
  S23: { objectives: ["event-keynote", "product-launch", "case-study"], audiences: ["creative", "public-broad"], jobs: ["hero", "content"], energy: "bold", data: 0.35, imagery: 0.6, noise: 0.85, complexity: 0.35, outputs: ["stage", "webinar"], contrastSafe: true },
  S24: { objectives: ["product-launch", "event-keynote", "investor-finance"], audiences: ["investor", "creative", "technical"], jobs: ["hero", "content"], energy: "bold", data: 0.45, imagery: 0.6, noise: 0.65, complexity: 0.4, outputs: ["stage", "webinar"], contrastSafe: false },
  S25: { objectives: ["event-keynote", "sales-pitch", "product-launch"], audiences: ["public-broad", "creative"], jobs: ["hero"], energy: "bold", data: 0.2, imagery: 0.5, noise: 0.9, complexity: 0.2, outputs: ["stage"], contrastSafe: true },
  S26: { objectives: ["product-launch", "investor-finance", "research-report"], audiences: ["technical", "investor", "executive"], jobs: ["content", "data", "hero"], energy: "confident", data: 0.8, imagery: 0.4, noise: 0.5, complexity: 0.8, outputs: ["boardroom", "stage", "webinar"], contrastSafe: false },
  S27: { objectives: ["executive-briefing", "case-study", "internal-update"], audiences: ["executive", "public-broad", "creative"], jobs: ["hero", "content"], energy: "calm", data: 0.4, imagery: 0.8, noise: 0.4, complexity: 0.4, outputs: ["stage", "boardroom", "send-ahead"], contrastSafe: false },
  S28: { objectives: ["executive-briefing", "internal-update", "research-report"], audiences: ["executive", "internal-team", "technical"], jobs: ["content", "data", "flow"], energy: "confident", data: 0.85, imagery: 0.5, noise: 0.4, complexity: 0.85, outputs: ["boardroom", "send-ahead", "webinar"], contrastSafe: true },
};

const FALLBACK_TRAITS: StyleTraits = {
  objectives: ["executive-briefing"],
  audiences: ["executive"],
  jobs: ["content"],
  energy: "confident",
  data: 0.5,
  imagery: 0.5,
  noise: 0.4,
  complexity: 0.6,
  outputs: ["boardroom"],
  contrastSafe: true,
};

export function styleTraits(code: string): StyleTraits {
  return STYLE_TRAITS[code.toUpperCase()] ?? FALLBACK_TRAITS;
}

/* ------------------------------------------------------------------ scoring */

const WEIGHT = {
  dna: 100, // industry recipe DNA — the largest base boost, by design
  bestFit: 34, // catalog best-fit / keyword overlap with the sector
  objective: 30,
  audience: 22,
  job: 16,
  data: 22,
  density: 16,
  imagery: 14,
  energy: 12,
  complexity: 12,
  mode: 12,
  contrast: 20,
  output: 10,
} as const;

const DENSITY_VALUE: Record<string, number> = { low: 0.25, medium: 0.55, high: 0.9 };
const DATA_VALUE: Record<DataIntensity, number> = { none: 0.1, some: 0.5, heavy: 0.95 };
const IMAGERY_VALUE: Record<ImageryPosture, number> = { none: 0.05, available: 0.55, led: 0.95 };
const COMPLEXITY_VALUE: Record<ComplexityLevel, number> = { simple: 0.2, moderate: 0.55, complex: 0.95 };
const ENERGY_VALUE: Record<EnergyTone, number> = { calm: 0.15, confident: 0.55, bold: 0.95 };

/** 1 when the two capacities match, falling to 0 as they diverge. */
function fit(need: number, have: number): number {
  return Math.max(0, 1 - Math.abs(need - have));
}

export interface StyleRecommendation {
  style: ApprovedStyle;
  score: number;
  /** Human-readable sentence for the card / agent reply. */
  reason: string;
  /** Ordered factor contributions, strongest first (for debugging + tooltips). */
  factors: { label: string; points: number }[];
}

export interface StyleRecommendationResult {
  primary: StyleRecommendation[];
  alternates: StyleRecommendation[];
  /** One sentence describing the brief the ranking was computed from. */
  briefSummary: string;
}

function briefWords(brief: StyleIntentBrief): string[] {
  const recipe = industryRecipeById(brief.recipeId);
  return `${brief.intent ?? ""} ${recipe?.name ?? ""} ${recipe?.summary ?? ""} ${(recipe?.keywords ?? []).join(" ")}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);
}

/** Deterministic weighted ranking of the approved 28 for a structured brief. */
export function rankApprovedStyles(brief: StyleIntentBrief): StyleRecommendation[] {
  const styles = approvedStyles();
  const recipe =
    industryRecipeById(brief.recipeId) ?? (brief.intent ? matchRecipes(brief.intent, 1)[0] ?? null : null);

  const dnaCodes = new Set(
    (recipe?.dna ?? []).map((n) => designSkinByName(n)?.code).filter((c): c is string => Boolean(c)),
  );
  const words = briefWords(brief);

  const scored = styles.map((style, index) => {
    const t = styleTraits(style.code);
    const factors: { label: string; points: number }[] = [];
    const add = (label: string, points: number) => {
      if (points > 0.5) factors.push({ label, points });
    };

    // 1. Industry DNA — strongest prior.
    if (dnaCodes.has(style.code)) add(`built for ${recipe?.name ?? "this sector"}`, WEIGHT.dna);
    else if (words.length) {
      const hay = `${style.chips.join(" ")} ${style.description} ${style.name}`.toLowerCase();
      const hits = words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);
      if (hits) add(`sector fit (${style.chips.slice(0, 2).join(", ").toLowerCase()})`, Math.min(1, hits / 3) * WEIGHT.bestFit);
    }

    // 2. Objective / audience / narrative job.
    if (brief.objective && t.objectives.includes(brief.objective))
      add(`${OBJECTIVE_LABELS[brief.objective].toLowerCase()} objective`, WEIGHT.objective);
    if (brief.audience && t.audiences.includes(brief.audience))
      add(`${AUDIENCE_LABELS[brief.audience].toLowerCase()} audience`, WEIGHT.audience);
    if (brief.slideJob && t.jobs.includes(brief.slideJob))
      add(`${SLIDE_JOB_LABELS[brief.slideJob].toLowerCase()} slides`, WEIGHT.job);

    // 3. Content mode: data, density, imagery, complexity.
    if (brief.data) {
      const need = DATA_VALUE[brief.data];
      add(need > 0.6 ? "high-data story" : "light on data", fit(need, t.data) * WEIGHT.data);
    }
    if (brief.density) {
      const need = DENSITY_VALUE[brief.density];
      const have = DENSITY_VALUE[(style.density || "medium").toLowerCase()] ?? 0.55;
      add(`${brief.density} content density`, fit(need, have) * WEIGHT.density);
      // Dense stories punish visual noise.
      if (need > 0.7) add("low visual noise", (1 - t.noise) * WEIGHT.density * 0.6);
    }
    if (brief.imagery) {
      const need = IMAGERY_VALUE[brief.imagery];
      add(brief.imagery === "led" ? "imagery-led" : brief.imagery === "none" ? "no photography needed" : "some imagery", fit(need, t.imagery) * WEIGHT.imagery);
    }
    if (brief.complexity)
      add(`${brief.complexity} narrative`, fit(COMPLEXITY_VALUE[brief.complexity], t.complexity) * WEIGHT.complexity);
    if (brief.energy)
      add(`${brief.energy} energy`, fit(ENERGY_VALUE[brief.energy], ENERGY_VALUE[t.energy]) * WEIGHT.energy);

    // 4. Delivery: mode, accessibility, output context.
    if (brief.mode && brief.mode !== "any" && style.nativeMode === brief.mode)
      add(`native ${brief.mode} mode`, WEIGHT.mode);
    if (brief.highContrast) {
      add("accessible contrast", (t.contrastSafe ? 1 : 0.25) * WEIGHT.contrast);
      add("quiet background", (1 - t.noise) * WEIGHT.contrast * 0.5);
    }
    if (brief.output && t.outputs.includes(brief.output))
      add(`${OUTPUT_LABELS[brief.output].toLowerCase()} delivery`, WEIGHT.output);

    const score = factors.reduce((n, f) => n + f.points, 0);
    factors.sort((a, b) => b.points - a.points);
    return { style, score, factors, index };
  });

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index));

  return scored.map(({ style, score, factors }) => ({
    style,
    score: Math.round(score * 10) / 10,
    factors,
    reason: reasonFor(style, factors, brief),
  }));
}

function reasonFor(
  style: ApprovedStyle,
  factors: { label: string; points: number }[],
  brief: StyleIntentBrief,
): string {
  const top = factors.slice(0, 3).map((f) => f.label);
  if (!top.length)
    return `${style.name} is the catalog default for this brief — best fit ${style.chips.slice(0, 2).join(", ").toLowerCase()}.`;
  const tail = top.length > 1 ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}` : top[0];
  const mode = brief.mode && brief.mode !== "any" ? ` Renders natively in ${style.nativeMode} mode.` : "";
  return `Recommended because this is a ${tail} story.${mode}`;
}

/** Top 3 primary + 3 alternates, with reasons. */
export function recommendStylesForBrief(
  brief: StyleIntentBrief,
  opts: { primary?: number; alternates?: number } = {},
): StyleRecommendationResult {
  const primaryCount = opts.primary ?? 3;
  const alternateCount = opts.alternates ?? 3;
  const ranked = rankApprovedStyles(brief);
  return {
    primary: ranked.slice(0, primaryCount),
    alternates: ranked.slice(primaryCount, primaryCount + alternateCount),
    briefSummary: summarizeBrief(brief),
  };
}

export function summarizeBrief(brief: StyleIntentBrief): string {
  const recipe = industryRecipeById(brief.recipeId);
  const parts = [
    recipe?.name,
    brief.objective ? OBJECTIVE_LABELS[brief.objective] : null,
    brief.audience ? AUDIENCE_LABELS[brief.audience] : null,
    brief.slideJob ? SLIDE_JOB_LABELS[brief.slideJob] : null,
    brief.data && brief.data !== "none" ? `${brief.data} data` : null,
    brief.density ? `${brief.density} density` : null,
    brief.imagery === "led" ? "imagery-led" : null,
    brief.energy ? `${brief.energy} tone` : null,
    brief.output ? OUTPUT_LABELS[brief.output] : null,
    brief.highContrast ? "high contrast required" : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No brief yet — showing the curated catalog order.";
}
