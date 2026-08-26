// Server-only brains behind the AI data-visualisation pass.
//
// Flow for interpret():
//   raw data/text -> model picks kind + encoding + rows + annotations
//   -> coerce into a strict InfographicSpec
//   -> theme it for the surface & mode (contrast-guarded)
//   -> deterministic repair (src/lib/infographics/repair.ts)
//   -> deterministic audit (src/lib/infographics/audit.ts)
// The model never gets to decide colour, alt text or export policy: those are
// brand-governed and resolved in code.

import { callAnthropic, extractJsonObject, getActiveAiProvider } from "@/lib/ai-core";
import { auditVizSpec, type VizSurface } from "@/lib/infographics/audit";
import { repairVizSpec } from "@/lib/infographics/repair";
import { ensureA11y } from "@/lib/infographics/a11y";
import { vizTheme } from "@/lib/infographics/viz-theme";
import { SUPPORTED_VIZ_KINDS } from "@/lib/infographics/variant-kinds";
import { variantsForKind } from "@/lib/infographics/audit-sweep";
import { isInfographicSpec, type InfographicKind, type InfographicRow, type InfographicSpec } from "@/lib/infographics/spec";
import { BRAND_MODES } from "@/lib/taxonomy";
import type {
  CritiqueVizInput,
  InterpretVizInput,
  InterpretVizResult,
  VizCritique,
} from "@/lib/viz-ai.schema";

const KIND_GUIDE = `
single number -> kpi | share of a whole -> donut (<=6 slices) | ranking -> bar
change over time -> line/area | many series over time -> stacked-area
stage drop-off -> funnel | contribution to a total change -> waterfall
two quantitative axes -> market-map | flow between nodes -> sankey
pairwise relationships -> chord | before/after per item -> dumbbell or slope
rank changes -> bump | spread of values -> beeswarm or boxplot
capability profile -> radar | progress to target -> gauge or gauge-grid
grid of period x category -> heatmap | daily activity over a year -> calendar-heatmap
hierarchy of shares -> treemap or sunburst | schedule -> gantt
`.trim();

function systemPrompt(surface: VizSurface): string {
  const budget =
    surface === "social"
      ? "This is a social/feed asset: 3-5 marks maximum, labels <=14 characters, one stated takeaway."
      : surface === "print"
        ? "This is print artwork: attribution is mandatory, series must separate in greyscale, labels <=28 characters."
        : "This is a presentation slide: <=12 categories, labels <=24 characters, the title states the takeaway.";
  return [
    "You are a senior data-visualisation engineer. You turn raw numbers into a single, honest, well-chosen chart specification.",
    "Rules you never break:",
    "1. Never invent, extrapolate or round-trip data that is not present in the input. If a number is missing, leave the row out and say so in caveats.",
    "2. Choose the simplest chart kind that proves the claim. Pie/donut only for true parts of one whole.",
    "3. Values must be plain numbers — no units, currency symbols, commas or percent signs inside values.",
    "4. Titles state the takeaway ('EMEA volume doubled in Q3'), never the chart type ('Bar chart of volume').",
    "5. Do not choose colours, fonts or sizes. Those are brand-governed and applied after you answer.",
    budget,
    "Chart kind guide:",
    KIND_GUIDE,
    `Allowed kinds: ${SUPPORTED_VIZ_KINDS.join(", ")}.`,
    "Answer with ONE JSON object and nothing else:",
    `{
  "kind": "<allowed kind>",
  "title": "takeaway title",
  "subtitle": "optional supporting line",
  "source": "dataset + as-of date if the input states one, else empty string",
  "columns": { "<column key>": "Display name" },
  "encoding": { "x": "...", "y": "...", "label": "...", "value": "...", "series": "...", "source": "...", "target": "...", "y2": "..." },
  "rows": [ { "<column key>": "value" } ],
  "annotations": { "headline": "one-line claim", "summary": "2 sentences max", "callouts": [ { "target": "row label", "text": "why it matters" } ] },
  "insight": "the single sentence a reader should leave with",
  "caveats": ["rounding, exclusions, small samples"],
  "alternates": [ { "kind": "<allowed kind>", "why": "when this framing would be better" } ]
}`,
    "Only include encoding channels the chosen kind actually needs.",
  ].join("\n\n");
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/[\s,%$€£]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}

function coerceRows(raw: unknown, valueKeys: string[]): InfographicRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: InfographicRow[] = [];
  for (const item of raw.slice(0, 400)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row: InfographicRow = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      if (valueKeys.includes(k)) {
        const n = num(v);
        if (n !== null) row[k] = n;
        continue;
      }
      if (typeof v === "number" || typeof v === "string") row[k] = v;
      else {
        const n = num(v);
        if (n !== null) row[k] = n;
      }
    }
    if (Object.keys(row).length > 0) rows.push(row);
  }
  return rows;
}

function coerceEncoding(raw: unknown): InfographicSpec["encoding"] {
  const src = (raw ?? {}) as Record<string, unknown>;
  const keys = [
    "x",
    "y",
    "y2",
    "series",
    "value",
    "label",
    "category",
    "source",
    "target",
  ] as const;
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out as InfographicSpec["encoding"];
}

function brandFor(id: string | undefined) {
  return (
    BRAND_MODES.find((b) => b.id === id) ??
    BRAND_MODES.find((b) => b.id === "bm-enterprise") ??
    BRAND_MODES[0]
  );
}

export async function interpretVizDataOnServer(
  input: InterpretVizInput,
): Promise<InterpretVizResult> {
  if (getActiveAiProvider() === "none") {
    return { ok: false, error: "AI is not configured for this project." };
  }

  const forced =
    input.forceKind && (SUPPORTED_VIZ_KINDS as string[]).includes(input.forceKind)
      ? (input.forceKind as InfographicKind)
      : null;

  const user = [
    input.intent ? `Claim the chart must prove: ${input.intent}` : "No stated claim — infer it.",
    forced ? `Use kind "${forced}" — the user pinned it.` : "",
    `Target surface: ${input.surface}.`,
    "Raw data:",
    "```",
    input.data.slice(0, 18000),
    "```",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await callAnthropic([systemPrompt(input.surface)], user, {
    maxTokens: 4000,
    temperature: 0.1,
  });
  if (!res.ok) {
    return { ok: false, error: `AI request failed (${res.status}). ${res.body.slice(0, 300)}` };
  }

  const parsed = extractJsonObject(res.text) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "The model did not return a usable chart specification." };
  }

  const kindRaw = forced ?? str(parsed.kind, "bar");
  const kind = ((SUPPORTED_VIZ_KINDS as string[]).includes(kindRaw)
    ? kindRaw
    : "bar") as InfographicKind;
  const encoding = coerceEncoding(parsed.encoding);
  const valueKeys = [encoding.value, encoding.y, encoding.y2].filter((k): k is string => !!k);
  const rows = coerceRows(parsed.rows, valueKeys);

  if (rows.length === 0) {
    return { ok: false, error: "No usable rows came back — check the pasted data." };
  }

  const annotationsRaw = (parsed.annotations ?? {}) as Record<string, unknown>;
  const callouts = Array.isArray(annotationsRaw.callouts)
    ? (annotationsRaw.callouts as unknown[])
        .map((c) => {
          const o = (c ?? {}) as Record<string, unknown>;
          return { target: str(o.target), text: str(o.text) };
        })
        .filter((c) => c.text)
        .slice(0, 4)
    : [];

  const columns =
    parsed.columns && typeof parsed.columns === "object" && !Array.isArray(parsed.columns)
      ? Object.fromEntries(
          Object.entries(parsed.columns as Record<string, unknown>).map(([k, v]) => [k, str(v, k)]),
        )
      : undefined;

  const base: InfographicSpec = ensureA11y({
    id: `ai-viz-${Date.now().toString(36)}`,
    kind,
    title: str(parsed.title).slice(0, 160),
    subtitle: str(parsed.subtitle).slice(0, 220),
    data: { rows, source: str(parsed.source) || undefined, columns },
    encoding,
    annotations: {
      headline: str(annotationsRaw.headline).slice(0, 160) || undefined,
      summary: str(annotationsRaw.summary).slice(0, 400) || undefined,
      callouts: callouts.length ? callouts : undefined,
    },
    theme: vizTheme({ brand: brandFor(input.brandModeId), mode: input.mode }),
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg", rasterFallback: true },
  });

  const { spec, notes } = repairVizSpec(base, { surface: input.surface });
  const audit = auditVizSpec(spec, { surface: input.surface });

  const alternates = Array.isArray(parsed.alternates)
    ? (parsed.alternates as unknown[])
        .map((a) => {
          const o = (a ?? {}) as Record<string, unknown>;
          return { kind: str(o.kind), why: str(o.why) };
        })
        .filter((a) => a.kind && (SUPPORTED_VIZ_KINDS as string[]).includes(a.kind))
        .slice(0, 3)
    : [];

  const caveats = Array.isArray(parsed.caveats)
    ? (parsed.caveats as unknown[]).map((c) => str(c)).filter(Boolean).slice(0, 5)
    : [];

  return {
    ok: true,
    spec,
    audit,
    repairs: notes.map((n) => n.detail),
    insight: str(parsed.insight) || spec.annotations?.headline,
    caveats,
    alternates,
    modules: variantsForKind(kind).slice(0, 6),
    surface: input.surface,
  };
}

const CRITIQUE_SYSTEM = [
  "You are a senior data-visualisation engineer reviewing one chart before it ships.",
  "You receive the chart specification and a deterministic audit already run against it.",
  "Judge three things: does the chart kind prove the stated claim, is the encoding honest (baseline, ordering, part-to-whole, outliers), and does the copy state a takeaway.",
  "Never invent data. Never comment on colour or font choices — those are brand-governed.",
  "Answer with ONE JSON object and nothing else:",
  `{
  "verdict": "two sentences maximum",
  "actions": [ { "severity": "blocker" | "warning" | "polish", "action": "one concrete edit" } ],
  "suggested": { "title": "...", "subtitle": "...", "headline": "...", "shortAlt": "..." }
}`,
  "Order actions most important first, at most six. Suggested copy must be usable verbatim.",
].join("\n\n");

export async function critiqueVizSpecOnServer(input: CritiqueVizInput): Promise<VizCritique> {
  if (!isInfographicSpec(input.spec)) {
    return { ok: false, error: "That is not a valid chart specification." };
  }
  const spec = input.spec as InfographicSpec;
  const audit = auditVizSpec(spec, { surface: input.surface });

  if (getActiveAiProvider() === "none") {
    // The deterministic audit still stands on its own.
    return {
      ok: true,
      audit,
      verdict: audit.publishable
        ? "No blocking defects found by the rule engine. AI review is unavailable."
        : "Rule engine found blocking defects. AI review is unavailable.",
      actions: audit.findings.map((f) => ({
        severity: f.severity === "info" ? ("polish" as const) : f.severity,
        action: f.fix,
      })),
    };
  }

  const trimmedRows = spec.data.rows.slice(0, 60);
  const user = [
    input.context ? `Surrounding context: ${input.context}` : "",
    `Surface: ${input.surface}`,
    "Chart specification (rows may be truncated):",
    JSON.stringify(
      {
        kind: spec.kind,
        title: spec.title,
        subtitle: spec.subtitle,
        encoding: spec.encoding,
        source: spec.data.source,
        rowCount: spec.data.rows.length,
        rows: trimmedRows,
        annotations: spec.annotations,
      },
      null,
      1,
    ).slice(0, 12000),
    "Deterministic audit findings:",
    JSON.stringify(
      audit.findings.map((f) => ({ code: f.code, severity: f.severity, message: f.message })),
      null,
      1,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await callAnthropic([CRITIQUE_SYSTEM], user, { maxTokens: 1800, temperature: 0.2 });
  if (!res.ok) {
    return { ok: false, audit, error: `AI review failed (${res.status}).` };
  }
  const parsed = (extractJsonObject(res.text) ?? {}) as Record<string, unknown>;
  const actions = Array.isArray(parsed.actions)
    ? (parsed.actions as unknown[])
        .map((a) => {
          const o = (a ?? {}) as Record<string, unknown>;
          const sev = str(o.severity, "polish");
          return {
            severity: (sev === "blocker" || sev === "warning" ? sev : "polish") as
              | "blocker"
              | "warning"
              | "polish",
            action: str(o.action),
          };
        })
        .filter((a) => a.action)
        .slice(0, 6)
    : [];
  const sug = (parsed.suggested ?? {}) as Record<string, unknown>;

  return {
    ok: true,
    audit,
    verdict: str(parsed.verdict).slice(0, 400),
    actions,
    suggested: {
      title: str(sug.title) || undefined,
      subtitle: str(sug.subtitle) || undefined,
      headline: str(sug.headline) || undefined,
      shortAlt: str(sug.shortAlt) || undefined,
    },
  };
}
