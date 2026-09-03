/**
 * LAYOUT ARBITER — "best possible layout", not the most convenient one.
 *
 * Until now layout selection was a lookup: `sectionTemplate()` returned the one
 * curated treatment for an industry × section × level, and whatever it named
 * was what got built. That is convenient, not optimal: it never asked whether
 * the authored content actually fits the variant's capacity, never compared the
 * alternates, and never adjusted the canvas.
 *
 * The arbiter enumerates EVERY legal combination for a slide brief
 * (module variant × permitted layout × reading level), proves feasibility
 * against the variant's own capacity budget and the fill engine's type floors,
 * scores the survivors on six independent axes, and returns a ranked list with
 * human-readable reasons plus a recommended canvas / fill adjustment.
 *
 * Deterministic: same brief in, same ranking out. No I/O, no randomness — so it
 * is safe on the server, in tests and inside the agent tool layer.
 */

import { divisionConformancePreset } from "./division-conformance";
import { divisionDesignSpec } from "./division-design-specs";
import {
  computeFill,
  fillFamilyFor,
  measureLoad,
  type FillFamily,
  type FillScale,
} from "./open-space-fill";
import {
  LEVEL_ROLE,
  inferLevel,
  levelsForSection,
  primaryLevelForSection,
  sectionTemplate,
  type TemplateLevel,
} from "./section-templates";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, type ModuleVariant } from "./taxonomy";

// ── Brief ──────────────────────────────────────────────────────────────────

export type LayoutContent = {
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  /** Repeated blocks: cards, stats, stages, bars, logos… */
  items?: unknown[];
  hasImage?: boolean;
  hasChart?: boolean;
};

export type LayoutBrief = {
  /** Section framework id (SF-01…SF-16). Omitted widens the candidate pool. */
  sectionId?: string | null;
  /** Reading level; omitted is inferred from the copy + section. */
  level?: TemplateLevel | null;
  /** Industry recipe id (R01–R30) for the curated-treatment prior. */
  industryId?: string | null;
  /** Brand scope id (bm-*) so the division's own design spec is honoured. */
  brandModeId?: string | null;
  content: LayoutContent;
  /** Canvas the slide will render on, in any unit. Defaults to 16:9. */
  canvas?: { width: number; height: number };
  /** Variant ids used on neighbouring slides — penalised for rhythm. */
  avoid?: string[];
  /** Caller's current pick, reported back as `incumbent` for comparison. */
  incumbentVariantId?: string | null;
};

// ── Result ─────────────────────────────────────────────────────────────────

export type LayoutScoreBreakdown = {
  /** Content vs the variant's declared capacity budget. */
  capacity: number;
  /** How little the fill engine must shrink type to make it fit. */
  headroom: number;
  /** Module family vs canvas aspect ratio. */
  aspect: number;
  /** Division design spec / conformance ownership. */
  spec: number;
  /** Content signals vs family intent (chart→graph, logos→logo wall…). */
  intent: number;
  /** Curated-treatment prior + neighbour variety. */
  rhythm: number;
};

export type LayoutCandidate = {
  variantId: string;
  familyId: string;
  name: string;
  layoutId: string;
  level: TemplateLevel;
  fillFamily: FillFamily;
  /** 0–1 weighted total. */
  score: number;
  breakdown: LayoutScoreBreakdown;
  /** False when content cannot be made to fit without breaking a hard budget. */
  feasible: boolean;
  /** Why it scored the way it did — surfaced to the agent and the inspector. */
  reasons: string[];
  /** Hard-budget violations; empty when `feasible`. */
  violations: string[];
  /** Fill multipliers this candidate would render with. */
  fill: FillScale & { load: number };
};

export type CanvasRecommendation = {
  /** Aspect the content is happiest on. */
  aspect: "16:9" | "16:10" | "4:3";
  /** Multiplier for the sheet fill (feeds pack geometry / OpenSpaceFill). */
  fillBias: number;
  /** True when the content should be split across more than one slide/page. */
  splitRecommended: boolean;
  /** How many slides/pages the load implies. */
  suggestedSlides: number;
  note: string;
};

export type LayoutDecision = {
  brief: {
    sectionId: string | null;
    level: TemplateLevel;
    industryId: string | null;
    brandModeId: string | null;
    canvas: { width: number; height: number; ratio: number };
  };
  load: ReturnType<typeof measureLoad>;
  /** Every legal combination considered, ranked best-first. */
  candidates: LayoutCandidate[];
  /** Highest-scoring feasible candidate, or the least-bad one if none fit. */
  best: LayoutCandidate | null;
  /** The curated lookup's answer, for comparison. */
  curatedVariantId: string | null;
  /** The caller's pick, if any, with its rank in this ranking. */
  incumbent: { variantId: string; rank: number; score: number } | null;
  canvas: CanvasRecommendation;
  /** Plain-language summary of the decision. */
  rationale: string;
  /** Combinations enumerated before feasibility pruning. */
  consideredCount: number;
};

// ── Weights ────────────────────────────────────────────────────────────────

const WEIGHTS: Record<keyof LayoutScoreBreakdown, number> = {
  capacity: 0.3,
  headroom: 0.2,
  aspect: 0.1,
  spec: 0.12,
  intent: 0.18,
  rhythm: 0.1,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function words(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function contentChars(c: LayoutContent): { title: number; body: number } {
  const title = (c.title ?? "").length;
  const body =
    (c.subtitle ?? "").length +
    (c.body ?? "").length +
    (c.bullets ?? []).reduce((n, b) => n + String(b ?? "").length, 0);
  return { title, body };
}

function itemBudget(variant: ModuleVariant): { min: number; max: number } | null {
  const items = variant.capacity?.items;
  if (!items) return null;
  return { min: items.min, max: items.max };
}

/** Ratio → nearest supported aspect. */
function aspectName(ratio: number): CanvasRecommendation["aspect"] {
  const options: [CanvasRecommendation["aspect"], number][] = [
    ["16:9", 16 / 9],
    ["16:10", 16 / 10],
    ["4:3", 4 / 3],
  ];
  return options.reduce((best, o) =>
    Math.abs(o[1] - ratio) < Math.abs(best[1] - ratio) ? o : best,
  )[0];
}

/** 1 at the target, decaying linearly to 0 at `tolerance` away. */
function nearness(value: number, target: number, tolerance: number): number {
  if (tolerance <= 0) return value === target ? 1 : 0;
  return Math.max(0, 1 - Math.abs(value - target) / tolerance);
}

function variantsForSection(sectionId: string | null): ModuleVariant[] {
  if (!sectionId) return MODULE_VARIANTS;
  const section = SECTION_FRAMEWORKS.find((s) => s.id === sectionId);
  if (!section) return MODULE_VARIANTS;
  const allowed = new Set(section.permittedFamilyIds);
  const scoped = MODULE_VARIANTS.filter((v) => allowed.has(v.familyId));
  return scoped.length ? scoped : MODULE_VARIANTS;
}

// ── Axis scoring ───────────────────────────────────────────────────────────

function scoreCapacity(
  variant: ModuleVariant,
  content: LayoutContent,
): { score: number; violations: string[]; reasons: string[] } {
  const violations: string[] = [];
  const reasons: string[] = [];
  const { title, body } = contentChars(content);
  const cap = variant.capacity ?? { fields: {} };
  const titleBudget = cap.titleChars ?? 90;
  const bodyBudget = cap.bodyChars ?? 320;
  const items = content.items?.length ?? content.bullets?.length ?? 0;
  const budget = itemBudget(variant);

  let score = 1;

  const titleRatio = titleBudget > 0 ? title / titleBudget : 0;
  if (titleRatio > 1.6) violations.push(`title is ${Math.round(titleRatio * 100)}% of budget`);
  else if (titleRatio > 1) {
    score -= Math.min(0.35, (titleRatio - 1) * 0.6);
    reasons.push("headline runs long — copy-fit will shrink it");
  }

  const bodyRatio = bodyBudget > 0 ? body / bodyBudget : 0;
  if (bodyRatio > 1.8) violations.push(`body copy is ${Math.round(bodyRatio * 100)}% of budget`);
  else if (bodyRatio > 1) score -= Math.min(0.35, (bodyRatio - 1) * 0.5);

  if (budget) {
    if (items > budget.max)
      violations.push(`${items} items exceeds the ${budget.max}-item ceiling`);
    else if (items && items < budget.min)
      violations.push(`${items} items is under the ${budget.min}-item floor`);
    else if (items) {
      // Sitting mid-range beats hugging the ceiling.
      const span = Math.max(1, budget.max - budget.min);
      const sweet = budget.min + span * 0.6;
      score -= Math.min(0.2, (Math.abs(items - sweet) / span) * 0.25);
      reasons.push(`${items} items sit inside the ${budget.min}–${budget.max} budget`);
    }
  } else if (items > 0 && !(content.bullets?.length && !content.items?.length)) {
    score -= 0.12;
    reasons.push("variant has no repeated-item slot for this content");
  }

  return { score: Math.max(0, score), violations, reasons };
}

function scoreHeadroom(fill: FillScale & { load: number }): { score: number; reason: string } {
  // Any axis pinned at its floor means content is being squeezed.
  const axes: (keyof FillScale)[] = ["display", "body", "figure", "block", "gap", "plate"];
  const squeeze = axes.reduce((worst, key) => Math.min(worst, fill[key]), 2);
  const overflow = Math.max(0, fill.load - 1);
  const score = Math.max(0, Math.min(1, 1 - overflow * 0.8 - Math.max(0, 1 - squeeze) * 0.9));
  const reason =
    overflow > 0.15
      ? `page runs ${Math.round(overflow * 100)}% over a comfortable sheet`
      : fill.load < 0.55
        ? "sparse page — type and figures can grow into the open space"
        : "content sits at a comfortable sheet density";
  return { score, reason };
}

function scoreAspect(family: FillFamily, ratio: number, items: number): number {
  switch (family) {
    case "cover":
    case "statement":
      // Wide canvases flatter a single full-voice idea.
      return nearness(ratio, 16 / 9, 0.85);
    case "grid":
      // Dense grids want vertical room once past four cells.
      return items > 4 ? nearness(ratio, 1.45, 0.8) : nearness(ratio, 1.6, 0.9);
    case "chart":
      return nearness(ratio, 1.7, 0.9);
    case "stats":
      return items > 4 ? nearness(ratio, 1.5, 0.85) : nearness(ratio, 1.72, 0.9);
    default:
      return nearness(ratio, 1.6, 1);
  }
}

function scoreIntent(
  variant: ModuleVariant,
  level: TemplateLevel,
  content: LayoutContent,
  family: FillFamily,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0.5;
  const id = variant.id.toUpperCase();

  const levelFamily: Record<TemplateLevel, FillFamily[]> = {
    headline: ["cover", "statement"],
    body: ["content", "grid"],
    kpi: ["stats", "chart"],
    process: ["content", "grid"],
    appendix: ["grid", "chart"],
  };
  if (levelFamily[level].includes(family)) {
    score += 0.3;
    reasons.push(`${LEVEL_ROLE[level].label} register matches a ${family} module`);
  } else {
    score -= 0.12;
  }

  if (content.hasChart) {
    if (/CHART|GRAPH|DASH|TREND|PLOT|FUNNEL|GAUGE/.test(id)) {
      score += 0.25;
      reasons.push("carries a chart slot for the supplied series");
    } else score -= 0.2;
  }
  if (content.hasImage) {
    if (/MEDIA|IMAGE|PHOTO|HERO|SPLIT|BENTO/.test(id)) {
      score += 0.15;
      reasons.push("has a real image plane rather than a decorative plate");
    } else score -= 0.12;
  }
  if (/PROC|TIMELINE|FLOW|PHASE|ROADMAP|JOURNEY/.test(id) && level === "process") {
    score += 0.15;
    reasons.push("sequence module for sequence content");
  }
  if (words(content.body) > 90 && family === "statement") score -= 0.2;

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

function scoreSpec(
  variant: ModuleVariant,
  brandModeId: string | null,
  ownedIds: Set<string> | null,
  specPackNote: string | null,
): { score: number; reasons: string[] } {
  if (!brandModeId || !ownedIds) return { score: 0.6, reasons: [] };
  if (ownedIds.has(variant.id)) {
    return {
      score: 1,
      reasons: [
        specPackNote
          ? `owned by this division's spec (${specPackNote})`
          : "in the division conformance set",
      ],
    };
  }
  return { score: 0.35, reasons: ["outside this division's conformance set"] };
}

// ── Main entry ─────────────────────────────────────────────────────────────

export function arbitrateLayout(brief: LayoutBrief): LayoutDecision {
  const sectionId = brief.sectionId ?? null;
  const canvas = brief.canvas ?? { width: 16, height: 9 };
  const ratio = canvas.height > 0 ? canvas.width / canvas.height : 16 / 9;
  const level: TemplateLevel =
    brief.level ??
    (sectionId
      ? brief.content.title || brief.content.body
        ? inferLevel(`${brief.content.title ?? ""} ${brief.content.body ?? ""}`, sectionId)
        : primaryLevelForSection(sectionId)
      : inferLevel(`${brief.content.title ?? ""} ${brief.content.body ?? ""}`));

  const load = measureLoad(brief.content);
  const avoid = new Set(brief.avoid ?? []);
  const items = brief.content.items?.length ?? brief.content.bullets?.length ?? 0;

  const curated =
    brief.industryId && sectionId
      ? sectionTemplate({ industryId: brief.industryId, sectionId, level })
      : null;
  const curatedVariantId = curated?.variantId ?? null;
  const curatedAlternates = new Set(curated?.alternates ?? []);

  let ownedIds: Set<string> | null = null;
  let specPackNote: string | null = null;
  if (brief.brandModeId) {
    try {
      const preset = divisionConformancePreset(brief.brandModeId);
      ownedIds = new Set(preset.moduleIds ?? []);
      const spec = divisionDesignSpec(brief.brandModeId);
      specPackNote = spec ? `${spec.packId} / ${spec.darkPackId}` : null;
    } catch {
      ownedIds = null;
    }
  }

  const levels = sectionId ? levelsForSection(sectionId) : [level];
  const levelPool = levels.includes(level) ? levels : [level, ...levels];

  const candidates: LayoutCandidate[] = [];
  let considered = 0;

  for (const variant of variantsForSection(sectionId)) {
    const layoutIds = variant.permittedLayoutIds?.length ? variant.permittedLayoutIds : ["LF-01"];
    const family = fillFamilyFor(variant.id);
    const cap = scoreCapacity(variant, brief.content);

    for (const candidateLevel of levelPool) {
      const bias = LEVEL_ROLE[candidateLevel].fillBias;
      const fill = computeFill({
        content: brief.content,
        variantId: variant.id,
        density: Math.min(1, Math.max(0, bias * 0.6)),
      });
      const head = scoreHeadroom(fill);
      const aspect = scoreAspect(family, ratio, items);
      const intent = scoreIntent(variant, candidateLevel, brief.content, family);
      const spec = scoreSpec(variant, brief.brandModeId ?? null, ownedIds, specPackNote);

      let rhythm = 0.5;
      const reasons = [...cap.reasons, head.reason, ...intent.reasons, ...spec.reasons];
      if (curatedVariantId === variant.id) {
        rhythm += 0.35;
        reasons.push("curated treatment for this industry + section");
      }
      if (curatedAlternates.has(variant.id)) {
        rhythm += 0.15;
        reasons.push("ranked alternate for this industry + section");
      }
      if (avoid.has(variant.id)) {
        rhythm -= 0.4;
        reasons.push("used on a neighbouring slide — repeating it flattens the rhythm");
      }
      if (candidateLevel !== level) rhythm -= 0.15;
      rhythm = Math.max(0, Math.min(1, rhythm));

      for (const layoutId of layoutIds) {
        considered += 1;
        const breakdown: LayoutScoreBreakdown = {
          capacity: cap.score,
          headroom: head.score,
          aspect,
          spec: spec.score,
          intent: intent.score,
          rhythm,
        };
        const score = (Object.keys(WEIGHTS) as (keyof LayoutScoreBreakdown)[]).reduce(
          (sum, key) => sum + breakdown[key] * WEIGHTS[key],
          0,
        );
        candidates.push({
          variantId: variant.id,
          familyId: variant.familyId,
          name: variant.name,
          layoutId,
          level: candidateLevel,
          fillFamily: family,
          score: Math.round(score * 1000) / 1000,
          breakdown,
          feasible: cap.violations.length === 0,
          reasons: reasons.filter(Boolean),
          violations: cap.violations,
          fill,
        });
      }
    }
  }

  candidates.sort(
    (a, b) =>
      Number(b.feasible) - Number(a.feasible) ||
      b.score - a.score ||
      a.variantId.localeCompare(b.variantId),
  );

  const best = candidates[0] ?? null;
  const incumbentIndex = brief.incumbentVariantId
    ? candidates.findIndex((c) => c.variantId === brief.incumbentVariantId)
    : -1;

  return {
    brief: {
      sectionId,
      level,
      industryId: brief.industryId ?? null,
      brandModeId: brief.brandModeId ?? null,
      canvas: { ...canvas, ratio: Math.round(ratio * 1000) / 1000 },
    },
    load,
    candidates: candidates.slice(0, 24),
    best,
    curatedVariantId,
    incumbent:
      incumbentIndex >= 0 && candidates[incumbentIndex]
        ? {
            variantId: candidates[incumbentIndex].variantId,
            rank: incumbentIndex + 1,
            score: candidates[incumbentIndex].score,
          }
        : null,
    canvas: recommendCanvas(brief, level, ratio),
    rationale: explainDecision(best, curatedVariantId, considered),
    consideredCount: considered,
  };
}

/** Canvas + split guidance for the authored load. */
export function recommendCanvas(
  brief: LayoutBrief,
  level: TemplateLevel,
  ratio: number,
): CanvasRecommendation {
  const load = measureLoad(brief.content);
  const role = LEVEL_ROLE[level];
  const blocks = brief.content.items?.length ?? brief.content.bullets?.length ?? 0;
  const overBlocks = blocks > role.density.blocks;
  const suggested = Math.max(
    1,
    Math.ceil(load.load / 1.15),
    overBlocks ? Math.ceil(blocks / role.density.blocks) : 1,
  );

  const aspect: CanvasRecommendation["aspect"] =
    load.load > 1.15 || overBlocks ? (ratio > 1.6 ? "16:10" : "4:3") : aspectName(ratio);

  return {
    aspect,
    fillBias:
      Math.round(Math.min(1.2, Math.max(0.7, role.fillBias * (1 + (1 - load.load) * 0.12))) * 100) /
      100,
    splitRecommended: suggested > 1,
    suggestedSlides: suggested,
    note:
      suggested > 1
        ? `Content exceeds one ${role.label.toLowerCase()} sheet (${blocks} blocks vs a ${role.density.blocks}-block budget) — split across ${suggested} slides rather than shrinking type.`
        : `Content fits one ${role.label.toLowerCase()} sheet on a ${aspect} canvas.`,
  };
}

function explainDecision(
  best: LayoutCandidate | null,
  curatedVariantId: string | null,
  considered: number,
): string {
  if (!best) return "No legal module variant for this brief.";
  const head = `${considered} legal combinations considered; ${best.variantId} (${best.name}) scored ${best.score.toFixed(3)}`;
  const versus =
    curatedVariantId && curatedVariantId !== best.variantId
      ? ` — beating the curated default ${curatedVariantId}`
      : curatedVariantId
        ? " — the curated default also wins on merit"
        : "";
  const why = best.reasons.slice(0, 3).join("; ");
  return `${head}${versus}. ${why}.`;
}

/** Convenience: just the winning variant id. */
export function bestLayoutVariant(brief: LayoutBrief): string | null {
  return arbitrateLayout(brief).best?.variantId ?? null;
}

/** Feasibility probe — does this exact variant hold this content? */
export function layoutFits(
  variantId: string,
  brief: LayoutBrief,
): { fits: boolean; violations: string[] } {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  if (!variant) return { fits: false, violations: [`unknown variant ${variantId}`] };
  const cap = scoreCapacity(variant, brief.content);
  return { fits: cap.violations.length === 0, violations: cap.violations };
}
