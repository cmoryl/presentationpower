/**
 * PER-LEVEL / PER-SECTION TEMPLATE LIBRARY.
 *
 * The skin catalog answers "what does this deck LOOK like". The taxonomy answers
 * "what belongs in this section". Neither answers the question a designer asks
 * next: *for this industry, in this section, at this level of the story, which
 * layout treatment do we use?*
 *
 * This module is that answer sheet. Every slide job is classified into one of
 * five reading LEVELS —
 *
 *   headline  — title / divider / manifesto: one idea, largest type, quiet copy
 *   body      — the working slide: pillars, cards, bento, narrative
 *   kpi       — numbers first: metric walls, dashboards, gauges, charts
 *   process   — sequence and mechanism: phases, flows, journeys, cycles
 *   appendix  — reference density: tables, matrices, logo walls, backup detail
 *
 * — and each (industry × section × level) resolves to a fully-specified
 * treatment: the preferred module variant plus alternates, the section scene
 * (backdrop preset), a level-tuned copy of the industry's geometry signature,
 * a type scale and a density budget.
 *
 * Everything is deterministic (industry index + section index seed the picks),
 * so the same request always resolves to the same treatment in the agent, the
 * editor, previews and export.
 */

import { SECTION_FRAMEWORKS, byId, variantsForSection, type ModuleVariant } from "./taxonomy";
import { INDUSTRY_RECIPES, industryRecipeById } from "./design-skins";
import { INDUSTRY_GEOMETRY, packGeometry, type PackGeometry, type ScaffoldFamily } from "./pack-geometry";
import type { StylePack } from "./style-packs";
import type { SkinScene } from "./skin-backgrounds";

/* ------------------------------------------------------------------ levels */

export type TemplateLevel = "headline" | "body" | "kpi" | "process" | "appendix";

export const TEMPLATE_LEVELS: TemplateLevel[] = ["headline", "body", "kpi", "process", "appendix"];

export interface LevelRole {
  label: string;
  purpose: string;
  /** Reading scale in px at the 1920×1080 master. */
  typeScale: { display: number; body: number; figure: number };
  /** How much of the sheet the treatment should occupy, relative to the industry fill. */
  fillBias: number;
  /** Content budget — what fits before the slide should split. */
  density: { blocks: number; bullets: number; wordsPerBlock: number };
  /** Default backdrop preset for the level. */
  scene: SkinScene;
}

export const LEVEL_ROLE: Record<TemplateLevel, LevelRole> = {
  headline: {
    label: "Headline",
    purpose: "One idea at full voice — covers, dividers, manifesto lines, the ask.",
    typeScale: { display: 104, body: 40, figure: 120 },
    fillBias: 0.72,
    density: { blocks: 2, bullets: 3, wordsPerBlock: 14 },
    scene: "cover",
  },
  body: {
    label: "Body",
    purpose: "The working slide — pillars, context cards, bento fields, narrative copy.",
    typeScale: { display: 72, body: 32, figure: 64 },
    fillBias: 1,
    density: { blocks: 4, bullets: 4, wordsPerBlock: 26 },
    scene: "bento",
  },
  kpi: {
    label: "KPI",
    purpose: "Numbers first — metric walls, dashboards, gauges and figures that carry the claim.",
    typeScale: { display: 56, body: 26, figure: 96 },
    fillBias: 0.96,
    density: { blocks: 4, bullets: 3, wordsPerBlock: 12 },
    scene: "stats",
  },
  process: {
    label: "Process",
    purpose: "Sequence and mechanism — phases, flows, journeys, cycles, roadmaps.",
    typeScale: { display: 60, body: 28, figure: 44 },
    fillBias: 1.06,
    density: { blocks: 5, bullets: 3, wordsPerBlock: 18 },
    scene: "timeline",
  },
  appendix: {
    label: "Appendix",
    purpose: "Reference density — comparison tables, matrices, logo walls, backup detail.",
    typeScale: { display: 44, body: 22, figure: 34 },
    fillBias: 1.16,
    density: { blocks: 8, bullets: 6, wordsPerBlock: 16 },
    scene: "chart",
  },
};

/** Levels each section framework supports; the first is its primary register. */
export const SECTION_LEVELS: Record<string, TemplateLevel[]> = {
  "SF-01": ["headline", "body"],
  "SF-02": ["headline", "body"],
  "SF-03": ["body", "kpi"],
  "SF-04": ["body", "kpi", "headline"],
  "SF-05": ["headline", "body"],
  "SF-06": ["body", "process"],
  "SF-07": ["body", "process", "kpi", "appendix"],
  "SF-08": ["kpi", "appendix"],
  "SF-09": ["body", "kpi"],
  "SF-10": ["process", "body"],
  "SF-11": ["appendix", "kpi", "body"],
  "SF-12": ["body", "process"],
  "SF-13": ["kpi", "appendix"],
  "SF-14": ["appendix", "body"],
  "SF-15": ["headline", "process"],
  "SF-16": ["headline", "body"],
};

/** Scene overrides where the section's job beats the level default. */
const SECTION_SCENE: Record<string, Partial<Record<TemplateLevel, SkinScene>>> = {
  "SF-01": { headline: "cover", body: "agenda" },
  "SF-02": { headline: "statement", body: "agenda" },
  "SF-05": { headline: "statement", body: "quote" },
  "SF-07": { body: "split" },
  "SF-09": { body: "split" },
  "SF-12": { body: "section", process: "timeline" },
  "SF-15": { headline: "closing", process: "timeline" },
  "SF-16": { headline: "closing", body: "closing" },
};

export function levelsForSection(sectionId: string): TemplateLevel[] {
  return SECTION_LEVELS[sectionId] ?? ["body"];
}

export function primaryLevelForSection(sectionId: string): TemplateLevel {
  return levelsForSection(sectionId)[0] ?? "body";
}

/* --------------------------------------------------------- variant matching */

/** Ordered id prefixes that read as this level. First match wins. */
const LEVEL_VARIANT_PREFIXES: Record<TemplateLevel, string[]> = {
  headline: [
    "MV-ED-HERO",
    "MV-OP-COVER",
    "MV-INS-BIG-IDEA",
    "MV-SPLIT-MANIFESTO",
    "MV-QUOTE-POSTER",
    "MV-ED-KICKER",
    "MV-ED-DIVIDER",
    "MV-OP-DIVIDER",
    "MV-CLOSE-STATEMENT",
    "MV-CLOSE-CTA",
    "MV-INS-CALLOUT",
    "MV-OP-AGENDA",
  ],
  body: [
    "MV-SOL-PILLARS",
    "MV-BENTO",
    "MV-CTX-CARDS",
    "MV-CASE-STORY",
    "MV-CASE-SPREAD",
    "MV-CLIENT-DETAIL",
    "MV-TEAM-BIOS",
    "MV-SOL-ARCHITECTURE",
    "MV-IMG-SPLIT",
    "MV-DEC-CHECKLIST",
    "MV-PRINCIPLES",
    "MV-OP-AGENDA",
    "MV-CLOSE-SPLIT",
  ],
  kpi: [
    "MV-KPI-DASHBOARD",
    "MV-DASH-",
    "MV-STAT-",
    "MV-PROOF-STATS",
    "MV-NUMBERS-TRIPTYCH",
    "MV-GRAPH-",
    "MV-CASE-METRICS",
    "MV-CTX-STAT-GRID",
    "MV-INFO-DONUT",
    "MV-CTX-TREND",
    "MV-QUOTE-METRIC",
    "MV-CLOSE-METRIC-PROMISE",
  ],
  process: [
    "MV-PROC-",
    "MV-JOURNEY-MAP",
    "MV-ROADMAP-QUARTERS",
    "MV-FLYWHEEL",
    "MV-INFO-CIRCULAR-FLOW",
    "MV-INFO-HUB",
    "MV-TIMELINE-VERTICAL",
    "MV-MATURITY-CURVE",
    "MV-HORIZON",
    "MV-FUNNEL",
    "MV-CLOSE-TIMELINE",
    "MV-GOV-RACI",
    "MV-REC-NEXT",
  ],
  appendix: [
    "MV-DEC-COMPARE-TABLE",
    "MV-DEC-MATRIX",
    "MV-MATRIX-2X2",
    "MV-CLIENT-MATRIX",
    "MV-RISK-MITIGATION",
    "MV-COMM-",
    "MV-PROOF-LOGOS",
    "MV-LOGO-WALL",
    "MV-IMG-GRID",
    "MV-SOL-FEATURE-LIST",
    "MV-VIZ-",
    "MV-GRAPH-",
    "MV-CTX-CARDS-4",
    "MV-CLOSE-CHECKLIST",
  ],
};

function candidatesForLevel(sectionId: string, level: TemplateLevel): ModuleVariant[] {
  const permitted = variantsForSection(sectionId);
  const out: ModuleVariant[] = [];
  for (const prefix of LEVEL_VARIANT_PREFIXES[level]) {
    for (const v of permitted) {
      if (v.id.startsWith(prefix) && !out.includes(v)) out.push(v);
    }
  }
  // Never strand a section: fall back to whatever it permits.
  if (!out.length) out.push(...permitted);
  return out;
}

function industryIndex(industryId: string): number {
  const i = INDUSTRY_RECIPES.findIndex((r) => r.id === industryId);
  return i >= 0 ? i : 0;
}

function sectionIndex(sectionId: string): number {
  const i = SECTION_FRAMEWORKS.findIndex((s) => s.id === sectionId);
  return i >= 0 ? i : 0;
}

const LEVEL_OFFSET: Record<TemplateLevel, number> = {
  headline: 0,
  body: 1,
  kpi: 2,
  process: 3,
  appendix: 4,
};

/* ------------------------------------------------------------ geometry tune */

const SCAFFOLD_ROTATION: ScaffoldFamily[] = [
  "margin",
  "column",
  "plinth",
  "banner",
  "quadrant",
  "ledger",
  "split",
  "stack",
  "wedge",
  "frame",
  "gutter",
  "shelf",
  "corner",
  "canyon",
];

function clampFill(v: number): number {
  return Math.max(0.4, Math.min(0.98, Math.round(v * 100) / 100));
}

/**
 * Level register: `body` keeps the industry's own signature so the deck reads as
 * one studio; other levels shift scaffold deterministically within the family
 * rotation so a headline, a KPI wall and an appendix table don't compose the
 * sheet the same way.
 */
function tuneGeometry(base: PackGeometry, level: TemplateLevel, seed: number): PackGeometry {
  const scaffold =
    level === "body"
      ? base.scaffold
      : SCAFFOLD_ROTATION[
          (SCAFFOLD_ROTATION.indexOf(base.scaffold) + LEVEL_OFFSET[level] * 3 + seed) %
            SCAFFOLD_ROTATION.length
        ]!;
  const layout = { ...base.layout };
  if (level === "headline") layout.rule = "none";
  if (level === "kpi") layout.rule = "bar";
  if (level === "process") {
    layout.grid = seed % 2 === 0 ? "stack" : "columns";
    layout.rule = "hairline";
  }
  if (level === "appendix") {
    layout.grid = "columns";
    layout.rule = "dots";
    layout.stats = base.layout.stats === "band" ? "band" : "cards4";
  }
  return {
    ...base,
    scaffold,
    layout,
    fill: clampFill(base.fill * LEVEL_ROLE[level].fillBias),
  };
}

function geometryForIndustry(industryId: string): PackGeometry {
  return (
    INDUSTRY_GEOMETRY[industryId] ??
    packGeometry({ id: `industry-${industryId}`, card: { radius: 12 } } as unknown as StylePack)
  );
}

/* ---------------------------------------------------------------- treatment */

export interface LayoutTreatment {
  id: string;
  industryId: string;
  industryName: string;
  sectionId: string;
  sectionName: string;
  sectionPurpose: string;
  level: TemplateLevel;
  levelLabel: string;
  /** Preferred module variant for this cell. */
  variantId: string;
  variantName: string;
  /** Other permitted variants at the same level, ranked. */
  alternates: string[];
  scene: SkinScene;
  geometry: PackGeometry;
  typeScale: LevelRole["typeScale"];
  density: LevelRole["density"];
  /** One-line art direction for the cell. */
  note: string;
}

export interface TemplateQuery {
  industryId: string;
  sectionId: string;
  level?: TemplateLevel;
}

export function sectionTemplate(query: TemplateQuery): LayoutTreatment | null {
  const recipe = industryRecipeById(query.industryId);
  const section = byId(SECTION_FRAMEWORKS, query.sectionId);
  if (!recipe || !section) return null;

  const levels = levelsForSection(section.id);
  const level = query.level && levels.includes(query.level) ? query.level : (levels[0] as TemplateLevel);

  const candidates = candidatesForLevel(section.id, level);
  const seed = industryIndex(recipe.id) + sectionIndex(section.id) * 2 + LEVEL_OFFSET[level] * 5;
  const pick = candidates[seed % candidates.length]!;
  const alternates = candidates
    .filter((v) => v.id !== pick.id)
    .slice(0, 3)
    .map((v) => v.id);

  const role = LEVEL_ROLE[level];
  const scene = SECTION_SCENE[section.id]?.[level] ?? role.scene;
  const geometry = tuneGeometry(geometryForIndustry(recipe.id), level, seed);

  return {
    id: `${recipe.id}-${section.id}-${level}`,
    industryId: recipe.id,
    industryName: recipe.name,
    sectionId: section.id,
    sectionName: section.name,
    sectionPurpose: section.purpose,
    level,
    levelLabel: role.label,
    variantId: pick.id,
    variantName: pick.name,
    alternates,
    scene,
    geometry,
    typeScale: role.typeScale,
    density: role.density,
    note: `${role.label} register for ${section.name.toLowerCase()} — ${geometry.scaffold} scaffold, ${geometry.layout.grid} field, ${Math.round(geometry.fill * 100)}% sheet fill, ${scene} backdrop.`,
  };
}

/** Every section × level treatment for one industry, in deck order. */
export function templateLibraryForIndustry(industryId: string): LayoutTreatment[] {
  const out: LayoutTreatment[] = [];
  for (const section of SECTION_FRAMEWORKS) {
    for (const level of levelsForSection(section.id)) {
      const t = sectionTemplate({ industryId, sectionId: section.id, level });
      if (t) out.push(t);
    }
  }
  return out;
}

/** All treatments for one level across every section of an industry. */
export function templatesForLevel(industryId: string, level: TemplateLevel): LayoutTreatment[] {
  return templateLibraryForIndustry(industryId).filter((t) => t.level === level);
}

/** Compact model/UI-readable line for a treatment. */
export function describeTreatment(t: LayoutTreatment): string {
  return [
    `${t.sectionId} ${t.sectionName} · ${t.levelLabel}`,
    `variant ${t.variantId} (alt: ${t.alternates.join(", ") || "none"})`,
    `scene ${t.scene}`,
    `geometry ${t.geometry.shape}/${t.geometry.scaffold}/${t.geometry.device} · fill ${t.geometry.fill}`,
    `type ${t.typeScale.display}/${t.typeScale.body}/${t.typeScale.figure}px`,
    `budget ${t.density.blocks} blocks · ${t.density.bullets} bullets · ~${t.density.wordsPerBlock} words`,
  ].join(" — ");
}

/** Infer a level from free text about the slide's job. */
export function inferLevel(text: string, sectionId?: string): TemplateLevel {
  const t = text.toLowerCase();
  if (/\b(appendix|backup|table|matrix|reference|detail sheet|glossary)\b/.test(t)) return "appendix";
  if (/\b(kpi|metric|number|figure|dashboard|%|growth|revenue|roi|stat)/.test(t)) return "kpi";
  if (/\b(process|phase|step|flow|journey|timeline|roadmap|cycle|workflow|sequence)\b/.test(t))
    return "process";
  if (/\b(cover|title|divider|manifesto|big idea|thank you|closing|call to action|cta)\b/.test(t))
    return "headline";
  if (sectionId) {
    const levels = levelsForSection(sectionId);
    return levels.includes("body") ? "body" : (levels[0] as TemplateLevel);
  }
  return "body";
}

/** Total number of curated cells in the library. */
export function templateLibrarySize(): number {
  const perIndustry = SECTION_FRAMEWORKS.reduce((n, s) => n + levelsForSection(s.id).length, 0);
  return perIndustry * INDUSTRY_RECIPES.length;
}
