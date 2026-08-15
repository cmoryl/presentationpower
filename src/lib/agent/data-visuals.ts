// Data & process visualisation intelligence for the in-app agent.
//
// The deck taxonomy already contains ~40 chart modules (MV-VIZ-*, MV-DASH-*,
// MV-KPI-*) and ~15 process modules (MV-PROC-*), but the agent had no way to
// know which one fits a given dataset or story, nor what content shape each
// one expects. These tools expose that as a catalog + a recommender + a
// validator, so the agent can say "this is a flow with weights" and get back
// the right module id AND the exact JSON to hand update_slide_content.

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import { isChartVariant } from "@/lib/export-chart-variants";
import { seedContent, type Brief } from "@/lib/deck-store";
import { vizKindForVariant } from "@/lib/infographics/variant-kinds";

/* --------------------------------------------------------------- data model */

export type VisualFamily = "data" | "process";

/** What the numbers actually look like — drives the recommendation. */
export const DATA_SHAPES = [
  "single-metric",
  "metric-set",
  "share-of-total",
  "ranking",
  "trend-over-time",
  "multi-series-trend",
  "distribution",
  "two-axis-scatter",
  "flow-between-nodes",
  "relationships",
  "rank-over-time",
  "matrix",
  "calendar-activity",
  "before-after",
] as const;
export type DataShape = (typeof DATA_SHAPES)[number];

/** How a process story is shaped. */
export const PROCESS_SHAPES = [
  "linear-steps",
  "phases-over-time",
  "cycle-loop",
  "layered-stack",
  "parallel-lanes",
  "journey",
  "before-after",
] as const;
export type ProcessShape = (typeof PROCESS_SHAPES)[number];

/** Preferred module ids per shape, best first. Unknown ids are filtered out. */
const DATA_PREFERENCE: Record<DataShape, string[]> = {
  "single-metric": ["MV-DASH-SUMMARY", "MV-KPI-DASHBOARD", "MV-DASH-REPORT-CARDS"],
  "metric-set": ["MV-KPI-DASHBOARD", "MV-DASH-REPORT-CARDS", "MV-DASH-GAUGE-ROW"],
  "share-of-total": ["MV-DASH-DONUT-TRIO", "MV-VIZ-TREEMAP", "MV-DASH-BREAKDOWN"],
  ranking: ["MV-DASH-PERFORMANCE", "MV-DASH-GROWTH-COLUMNS", "MV-VIZ-TREEMAP"],
  "trend-over-time": ["MV-DASH-SALES-CHART", "MV-DASH-GROWTH-COLUMNS", "MV-DASH-PERFORMANCE"],
  "multi-series-trend": ["MV-DASH-PERFORMANCE", "MV-DASH-SALES-CHART"],
  distribution: ["MV-VIZ-BEESWARM", "MV-DASH-PERFORMANCE"],
  "two-axis-scatter": ["MV-VIZ-MARKET-MAP"],
  "flow-between-nodes": ["MV-VIZ-SANKEY"],
  relationships: ["MV-VIZ-CHORD", "MV-VIZ-SANKEY"],
  "rank-over-time": ["MV-VIZ-BUMP"],
  matrix: ["MV-VIZ-CALENDAR-HEATMAP", "MV-VIZ-MARKET-MAP"],
  "calendar-activity": ["MV-VIZ-CALENDAR-HEATMAP"],
  "before-after": ["MV-PROC-BEFORE-AFTER", "MV-PROC-BEFORE-AFTER-SPLIT"],
};

const PROCESS_PREFERENCE: Record<ProcessShape, string[]> = {
  "linear-steps": ["MV-PROC-STEP-CHAIN", "MV-PROC-PHASES", "MV-PROC-STEP-SPOTLIGHT"],
  "phases-over-time": ["MV-PROC-TIMELINE", "MV-PROC-TIMELINE-RAIL", "MV-PROC-PHASES"],
  "cycle-loop": ["MV-PROC-PLATFORM-LOOP", "MV-PROC-STAGE-ORBITS", "MV-PROC-ARC-FLOW"],
  "layered-stack": ["MV-PROC-LAYER-STACK", "MV-PROC-PHASES"],
  "parallel-lanes": ["MV-PROC-SWIMLANE-FLOW", "MV-PROC-STEP-CHAIN"],
  journey: ["MV-PROC-JOURNEY-VERTICAL", "MV-PROC-ARC-FLOW", "MV-PROC-TIMELINE-RAIL"],
  "before-after": ["MV-PROC-BEFORE-AFTER-SPLIT", "MV-PROC-BEFORE-AFTER", "MV-PROC-PROOF-PAIRS"],
};

/* ------------------------------------------------------------------ catalog */

function familyOf(v: ModuleVariant): VisualFamily | null {
  if (v.id.startsWith("MV-PROC-")) return "process";
  if (v.id.startsWith("MV-VIZ-") || v.id.startsWith("MV-KPI-") || isChartVariant(v)) return "data";
  return null;
}

const DEMO_BRIEF: Brief = {
  id: "sample",
  createdAt: new Date(0).toISOString(),
  prospect: "Acme",
  industry: "Technology",
  meetingObjective: "Program review",
  audience: "Executive team",
  brandModeId: "bm-master" as Brief["brandModeId"],
  archetypeId: "na-01",
  lengthTarget: 12,
  clientFacts: "",
};

/** Real example content for a module, so the agent can mirror the shape. */
function exampleContent(variantId: string): Record<string, unknown> {
  try {
    const content = seedContent(variantId, DEMO_BRIEF, "Proof") as Record<string, unknown>;
    // Long generated arrays (beeswarm/calendar) would flood the context.
    const trimmed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(content)) {
      trimmed[k] = Array.isArray(v) && v.length > 6 ? [...v.slice(0, 4), `…${v.length} rows total`] : v;
    }
    return trimmed;
  } catch {
    return {};
  }
}

export type VisualModuleDigest = {
  module_id: string;
  family: VisualFamily;
  name: string;
  what_it_shows: string;
  chart_kind?: string;
  editable_fields: string[];
  items_path?: string;
  items_min?: number;
  items_max?: number;
  example_content: Record<string, unknown>;
};

export function visualModules(family: VisualFamily | "all" = "all"): VisualModuleDigest[] {
  const out: VisualModuleDigest[] = [];
  for (const v of MODULE_VARIANTS) {
    const fam = familyOf(v);
    if (!fam) continue;
    if (family !== "all" && fam !== family) continue;
    const kind = v.id.startsWith("MV-VIZ-") ? vizKindForVariant(v.id) : undefined;
    out.push({
      module_id: v.id,
      family: fam,
      name: v.name,
      what_it_shows: v.description,
      ...(kind && kind !== "custom" ? { chart_kind: kind } : {}),
      editable_fields: v.editableFields ?? [],
      ...(v.capacity?.items
        ? {
            items_path: v.capacity.items.path,
            items_min: v.capacity.items.min,
            items_max: v.capacity.items.max,
          }
        : {}),
      example_content: exampleContent(v.id),
    });
  }
  return out;
}

function digestFor(moduleId: string): VisualModuleDigest | null {
  return visualModules("all").find((m) => m.module_id === moduleId) ?? null;
}

/* -------------------------------------------------------------- recommender */

export type VisualRecommendation = {
  shape: string;
  recommended: VisualModuleDigest[];
  runners_up: string[];
  warnings: string[];
  how_to_use: string;
};

export function recommendVisual(input: {
  family: VisualFamily;
  shape: string;
  series_count?: number | null;
  points_per_series?: number | null;
  query?: string | null;
}): VisualRecommendation | { error: string } {
  const prefs =
    input.family === "process"
      ? PROCESS_PREFERENCE[input.shape as ProcessShape]
      : DATA_PREFERENCE[input.shape as DataShape];
  if (!prefs) {
    const valid = (input.family === "process" ? PROCESS_SHAPES : DATA_SHAPES).join(", ");
    return { error: `Unknown shape "${input.shape}". Valid shapes for ${input.family}: ${valid}` };
  }

  const digests = prefs.map(digestFor).filter((d): d is VisualModuleDigest => Boolean(d));
  const warnings: string[] = [];
  const points = input.points_per_series ?? null;
  const series = input.series_count ?? null;

  for (const d of digests) {
    if (points != null && d.items_max != null && points > d.items_max)
      warnings.push(
        `${d.name} caps at ${d.items_max} data points — aggregate or bucket the ${points} you have before using it.`,
      );
    if (points != null && d.items_min != null && points < d.items_min)
      warnings.push(`${d.name} needs at least ${d.items_min} data points; you have ${points}.`);
  }
  if (series != null && series > 4)
    warnings.push(
      `${series} series on one slide reads as noise on a projector — keep 3-4 and move the rest to an appendix slide.`,
    );
  if (input.family === "data")
    warnings.push(
      "Never invent figures: use only numbers the user supplied or search_knowledge returned, and mark unknowns as a visible placeholder.",
    );

  // Keyword nudge: surface anything whose description matches the free text.
  const q = (input.query ?? "").toLowerCase().trim();
  const runners = q
    ? visualModules(input.family)
        .filter(
          (m) =>
            !prefs.includes(m.module_id) &&
            q.split(/\s+/).some((w) => w.length > 3 && `${m.name} ${m.what_it_shows}`.toLowerCase().includes(w)),
        )
        .slice(0, 5)
        .map((m) => `${m.module_id} · ${m.name}`)
    : [];

  return {
    shape: input.shape,
    recommended: digests.slice(0, 3),
    runners_up: runners,
    warnings,
    how_to_use:
      "Insert the slide with insert_slide using the top module id, then write the data with update_slide_content using exactly the field names shown in example_content (same keys, same nesting). Pair the slide with a quiet backdrop scene ('chart' or 'stats') in plan_visual_design, and always add a one-line takeaway in the headline/title plus a source attribution.",
  };
}

/* ---------------------------------------------------------------- validator */

export function validateVisualContent(
  moduleId: string,
  content: Record<string, unknown>,
): { ok: boolean; problems: string[]; notes: string[] } {
  const d = digestFor(moduleId);
  if (!d) return { ok: false, problems: [`${moduleId} is not a data or process module.`], notes: [] };

  const problems: string[] = [];
  const notes: string[] = [];
  const example = d.example_content;

  const rowsKey = d.items_path?.split(".")[0];
  if (rowsKey) {
    const rows = content[rowsKey];
    if (!Array.isArray(rows)) problems.push(`Missing "${rowsKey}" array — this module plots its data from it.`);
    else {
      if (d.items_min != null && rows.length < d.items_min)
        problems.push(`"${rowsKey}" has ${rows.length} entries; at least ${d.items_min} are needed.`);
      if (d.items_max != null && rows.length > d.items_max)
        problems.push(`"${rowsKey}" has ${rows.length} entries; the layout holds ${d.items_max}.`);
      const first = rows[0];
      const exFirst = Array.isArray(example[rowsKey]) ? (example[rowsKey] as unknown[])[0] : null;
      if (first && exFirst && typeof first === "object" && typeof exFirst === "object") {
        const want = Object.keys(exFirst as object);
        const got = Object.keys(first as object);
        const missing = want.filter((k) => !got.includes(k));
        if (missing.length) notes.push(`Row keys usually include: ${want.join(", ")} (missing: ${missing.join(", ")}).`);
      }
    }
  }

  if (d.module_id.startsWith("MV-VIZ-") && !content.encoding)
    problems.push('Spec-driven charts need an "encoding" object mapping row keys to channels, e.g. { source, target, value }.');
  if (!content.title) notes.push("Add a title that states the takeaway, not the metric name.");
  if (d.family === "data" && !content.source)
    notes.push('Add a "source" string so the figure is defensible in the room.');

  return { ok: problems.length === 0, problems, notes };
}

/* -------------------------------------------------------------------- tools */

export function buildDataVisualToolSet(): ToolSet {
  return {
    list_visual_modules: tool({
      description:
        "List the deck's data-visualisation modules (charts, KPI boards, flow/relationship diagrams) and process-visual modules (steps, timelines, cycles, swimlanes, layer stacks) with what each shows, its editable fields, its data-point limits and a real example of the content JSON it expects.",
      inputSchema: z.object({
        family: z.enum(["data", "process", "all"]).nullable().describe("Which family to list; null = all"),
        query: z.string().nullable().describe("Optional keyword filter over name and description"),
      }),
      execute: async ({ family, query }) => {
        let mods = visualModules(family ?? "all");
        const q = (query ?? "").toLowerCase().trim();
        if (q) mods = mods.filter((m) => `${m.module_id} ${m.name} ${m.what_it_shows}`.toLowerCase().includes(q));
        return { count: mods.length, modules: mods.slice(0, 40) };
      },
    }),

    plan_data_visual: tool({
      description:
        "Choose how to visualise a dataset or a process. Describe the shape of what you have (a trend, a share of total, a flow between nodes, linear steps, a cycle…) and get back the best modules, their exact content shape, and warnings about data-point limits. Call this before inserting any chart or process slide.",
      inputSchema: z.object({
        family: z.enum(["data", "process"]).describe("'data' for numbers, 'process' for how something works"),
        shape: z
          .string()
          .describe(
            `Shape of the story. Data: ${DATA_SHAPES.join(" | ")}. Process: ${PROCESS_SHAPES.join(" | ")}`,
          ),
        intent: z.string().nullable().describe("One line on the point the slide must make"),
        series_count: z.number().int().nullable().describe("How many series/lines/categories, if known"),
        points_per_series: z.number().int().nullable().describe("How many data points or steps, if known"),
      }),
      execute: async ({ family, shape, intent, series_count, points_per_series }) =>
        recommendVisual({ family, shape, series_count, points_per_series, query: intent }),
    }),

    validate_visual_content: tool({
      description:
        "Check the content JSON you are about to write into a chart or process slide against that module's expected shape and data-point limits. Fix any reported problems before calling update_slide_content.",
      inputSchema: z.object({
        module_id: z.string().describe("The module id of the slide"),
        content: z.record(z.string(), z.unknown()).describe("The content object you intend to write"),
      }),
      execute: async ({ module_id, content }) => validateVisualContent(module_id, content),
    }),
  };
}
