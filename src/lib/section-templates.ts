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
import { resolveTypography, type TypographyConstraint } from "./industry-typography";

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
    "MV-CLOSE-DUAL-CTA",
    "MV-CLOSE-THANKS",
    "MV-CLOSE-CONTACT",
    "MV-CLOSE-QNA",
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
  /** Industry typography rules: px floors/ceilings, leading bands, label caps. */
  typography: TypographyConstraint;
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
    typography: resolveTypography(recipe.id),
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
    `type rules body ${t.typography.floorPx.body}–${t.typography.ceilPx.body}px, display ≤${t.typography.ceilPx.display}px, body leading ${t.typography.leading.body?.min}–${t.typography.leading.body?.max}, labels ≤${t.typography.chartLabel.maxChars} chars`,
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

/* ------------------------------------------------- per-slide overrides */

/**
 * PER-SLIDE TEMPLATE OVERRIDE.
 *
 * The library above is the *default* answer for an (industry × section × level)
 * cell. A deck author working one slide often needs a nudge off that default —
 * "this KPI slide is one huge number, give the figure more voice", "read this
 * body slide as a headline", "keep the treatment but drop the chart backdrop".
 *
 * An override records ONLY the fields the author touched. Everything else keeps
 * resolving from the library, so improving a library cell still improves every
 * slide that didn't opt out of it, and a single field can be handed back with
 * one click. Type scales are stored as absolute px at the 1920×1080 master (the
 * same unit as `LevelRole.typeScale`), which is what the inspector shows.
 */
export interface SlideTemplateOverride {
  /** Read this slide at a different level than its section implies. */
  level?: TemplateLevel;
  /** Backdrop preset for the slide (library default comes from section × level). */
  scene?: SkinScene;
  /** Absolute px type scale at the master. Partial — untouched keys inherit. */
  typeScale?: Partial<LevelRole["typeScale"]>;
  /** Content budget the editor warns against. Partial — untouched keys inherit. */
  density?: Partial<LevelRole["density"]>;
  /** Sheet-fill bias multiplier (1 = library default for the level). */
  fillBias?: number;
}

/** Which resolved fields came from the slide rather than the library. */
export type TemplateOverrideField = "level" | "scene" | "display" | "body" | "figure" | "fill" | "density";

export interface ResolvedSlideTemplate {
  /** Library cell the slide resolves to (null when the industry is unknown). */
  treatment: LayoutTreatment | null;
  industryId: string | null;
  level: TemplateLevel;
  levelLabel: string;
  scene: SkinScene;
  typeScale: LevelRole["typeScale"];
  density: LevelRole["density"];
  /** Sheet fill after the level bias and any slide bias. */
  fill: number;
  /** Library values, for "what you're overriding" UI and one-click reset. */
  defaults: {
    level: TemplateLevel;
    scene: SkinScene;
    typeScale: LevelRole["typeScale"];
    density: LevelRole["density"];
    fill: number;
  };
  /**
   * Type-scale ratios vs. the level baseline — fed to the open-space fill pass
   * as axis multipliers, so an override rides the same clamped, readability
   * bounded pipeline as every other size on the slide.
   */
  typeRatio: { display: number; body: number; figure: number };
  overridden: TemplateOverrideField[];
}

const TYPE_RATIO_CAP = { min: 0.6, max: 1.6 } as const;

const ratio = (next: number, base: number) => {
  if (!(base > 0) || !(next > 0)) return 1;
  const r = next / base;
  return Math.round(Math.min(TYPE_RATIO_CAP.max, Math.max(TYPE_RATIO_CAP.min, r)) * 1000) / 1000;
};

/** Clamp an author-entered px size to a sane authoring band per axis. */
export const TEMPLATE_TYPE_RANGE: Record<keyof LevelRole["typeScale"], [number, number]> = {
  display: [32, 168],
  body: [16, 48],
  figure: [40, 240],
};

export function clampTemplateType(axis: keyof LevelRole["typeScale"], px: number): number {
  const [lo, hi] = TEMPLATE_TYPE_RANGE[axis];
  return Math.round(Math.min(hi, Math.max(lo, px)));
}

export interface ResolveSlideTemplateArgs {
  /** The slide: section, variant, title text and its optional override. */
  slide: {
    sectionId?: string | null;
    variantId?: string | null;
    layoutId?: string | null;
    content?: unknown;
    templateOverride?: SlideTemplateOverride | null;
  } | null | undefined;
  /** Deck context — `designRecipeId` names the industry recipe (R01…R30). */
  industryId?: string | null;
}

/**
 * Resolve the effective treatment for one slide: library default for its
 * (industry × section × level) cell, with the slide's override merged on top.
 *
 * Deterministic and dependency-free, so the editor, previews, present/share and
 * the PPTX export stage all read the same numbers.
 */
export function resolveSlideTemplate(args: ResolveSlideTemplateArgs): ResolvedSlideTemplate {
  const slide = args.slide ?? null;
  const ov = slide?.templateOverride ?? null;
  const sectionId = slide?.sectionId ?? undefined;

  const title = (() => {
    const c = slide?.content as Record<string, unknown> | undefined;
    const parts = [c?.["title"], c?.["headline"], c?.["kicker"], slide?.variantId];
    return parts.filter((p): p is string => typeof p === "string").join(" ");
  })();

  const defaultLevel = inferLevel(title, sectionId);
  const level = ov?.level ?? defaultLevel;

  const industryId = args.industryId ?? null;
  const libDefault = industryId && sectionId
    ? sectionTemplate({ industryId, sectionId, level: defaultLevel })
    : null;
  const treatment = industryId && sectionId
    ? sectionTemplate({ industryId, sectionId, level })
    : null;

  const role = LEVEL_ROLE[level];
  const defaults = {
    level: defaultLevel,
    scene: libDefault?.scene ?? LEVEL_ROLE[defaultLevel].scene,
    typeScale: treatment?.typeScale ?? role.typeScale,
    density: treatment?.density ?? role.density,
    fill: treatment?.geometry.fill ?? clampFill(LEVEL_ROLE[defaultLevel].fillBias),
  };

  const baseTypeScale = treatment?.typeScale ?? role.typeScale;
  const typeScale: LevelRole["typeScale"] = {
    display: clampTemplateType("display", ov?.typeScale?.display ?? baseTypeScale.display),
    body: clampTemplateType("body", ov?.typeScale?.body ?? baseTypeScale.body),
    figure: clampTemplateType("figure", ov?.typeScale?.figure ?? baseTypeScale.figure),
  };

  const baseDensity = treatment?.density ?? role.density;
  const density: LevelRole["density"] = {
    blocks: Math.max(1, Math.round(ov?.density?.blocks ?? baseDensity.blocks)),
    bullets: Math.max(1, Math.round(ov?.density?.bullets ?? baseDensity.bullets)),
    wordsPerBlock: Math.max(4, Math.round(ov?.density?.wordsPerBlock ?? baseDensity.wordsPerBlock)),
  };

  const baseFill = treatment?.geometry.fill ?? clampFill(role.fillBias);
  const fill = clampFill(baseFill * (ov?.fillBias ?? 1));

  const overridden: TemplateOverrideField[] = [];
  if (ov?.level && ov.level !== defaultLevel) overridden.push("level");
  if (ov?.scene && ov.scene !== defaults.scene) overridden.push("scene");
  if (typeof ov?.typeScale?.display === "number" && typeScale.display !== baseTypeScale.display)
    overridden.push("display");
  if (typeof ov?.typeScale?.body === "number" && typeScale.body !== baseTypeScale.body)
    overridden.push("body");
  if (typeof ov?.typeScale?.figure === "number" && typeScale.figure !== baseTypeScale.figure)
    overridden.push("figure");
  if (typeof ov?.fillBias === "number" && ov.fillBias !== 1) overridden.push("fill");
  if (ov?.density && Object.keys(ov.density).length > 0) overridden.push("density");

  return {
    treatment,
    industryId,
    level,
    levelLabel: role.label,
    scene: ov?.scene ?? treatment?.scene ?? role.scene,
    typeScale,
    density,
    fill,
    defaults,
    typeRatio: {
      display: ratio(typeScale.display, baseTypeScale.display),
      body: ratio(typeScale.body, baseTypeScale.body),
      figure: ratio(typeScale.figure, baseTypeScale.figure),
    },
    overridden,
  };
}

/** True when the slide carries any live override. */
export function hasTemplateOverride(ov: SlideTemplateOverride | null | undefined): boolean {
  if (!ov) return false;
  return Boolean(
    ov.level ||
      ov.scene ||
      typeof ov.fillBias === "number" ||
      (ov.typeScale && Object.keys(ov.typeScale).length) ||
      (ov.density && Object.keys(ov.density).length),
  );
}

/** Merge a patch into an override, dropping keys set back to undefined/null. */
export function mergeTemplateOverride(
  current: SlideTemplateOverride | null | undefined,
  patch: SlideTemplateOverride | null,
): SlideTemplateOverride | null {
  if (patch === null) return null;
  const next: SlideTemplateOverride = { ...(current ?? {}) };
  if ("level" in patch) patch.level ? (next.level = patch.level) : delete next.level;
  if ("scene" in patch) patch.scene ? (next.scene = patch.scene) : delete next.scene;
  if ("fillBias" in patch)
    typeof patch.fillBias === "number" ? (next.fillBias = patch.fillBias) : delete next.fillBias;
  if ("typeScale" in patch) {
    const merged = { ...(next.typeScale ?? {}), ...(patch.typeScale ?? {}) };
    for (const k of Object.keys(merged) as Array<keyof LevelRole["typeScale"]>) {
      if (typeof merged[k] !== "number") delete merged[k];
    }
    Object.keys(merged).length ? (next.typeScale = merged) : delete next.typeScale;
  }
  if ("density" in patch) {
    const merged = { ...(next.density ?? {}), ...(patch.density ?? {}) };
    for (const k of Object.keys(merged) as Array<keyof LevelRole["density"]>) {
      if (typeof merged[k] !== "number") delete merged[k];
    }
    Object.keys(merged).length ? (next.density = merged) : delete next.density;
  }
  return hasTemplateOverride(next) ? next : null;
}
