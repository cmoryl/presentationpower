// Deterministic data-visualisation correctness auditor.
//
// Every chart in the platform funnels through an `InfographicSpec`, so a single
// auditor can grade *all* of them — presentation modules, print modules and
// social campaign assets — against the same rules. The audit is intentionally
// dependency-free and deterministic: identical spec in, identical findings out,
// so it can run in tests, in the sweep report, at export time, and as an AI
// tool result.
//
// Two rule families:
//   1. Correctness — encoding present, values numeric, part-to-whole sums,
//      funnel monotonicity, gauge ranges, time ordering, truncated baselines.
//   2. Look & feel — palette contrast on the resolved surface, adjacent-series
//      separation, label overflow, alt text, attribution, per-surface caps.

import type { InfographicKind, InfographicRow, InfographicSpec } from "./spec";

export type VizSurface = "presentation" | "print" | "social";
export type VizSeverity = "blocker" | "warning" | "info";

export type VizFinding = {
  code: string;
  severity: VizSeverity;
  /** What is wrong, in plain language. */
  message: string;
  /** The concrete change that clears it. */
  fix: string;
  /** Rule family — drives grouping in the report. */
  group: "data" | "encoding" | "scale" | "color" | "type" | "a11y" | "governance";
};

export type VizAudit = {
  specId: string;
  kind: InfographicKind;
  surface: VizSurface;
  mode: "light" | "dark";
  findings: VizFinding[];
  blockers: number;
  warnings: number;
  infos: number;
  /** 0–100. 100 = clean. Blockers cost most. */
  score: number;
  /** True when nothing blocks publication. */
  publishable: boolean;
};

/* ------------------------------------------------------------------ helpers */

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t.replace(/[\s,%$€£]/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function vizContrast(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Required encoding channels per chart kind, as *one-of* groups: each group is
 * satisfied when any channel in it is mapped. This mirrors what the ECharts
 * option builders actually read (a category axis may arrive as `x` or `label`,
 * a measure as `value` or `y`).
 */
type Channel = keyof InfographicSpec["encoding"];
const REQUIRED_ENCODING: Partial<Record<InfographicKind, Channel[][]>> = {
  bar: [
    ["x", "label"],
    ["y", "value"],
  ],
  column: [
    ["x", "label"],
    ["y", "value"],
  ],
  line: [
    ["x", "label"],
    ["y", "value"],
  ],
  area: [
    ["x", "label"],
    ["y", "value"],
  ],
  "stacked-area": [["x"], ["value", "y"], ["series"]],
  bump: [["x"], ["value", "y"], ["series"]],
  radar: [
    ["x", "label"],
    ["value", "y"],
  ],
  donut: [
    ["label", "x"],
    ["value", "y"],
  ],
  treemap: [["label"], ["value"]],
  sunburst: [["label"], ["value"]],
  funnel: [
    ["label", "x"],
    ["value", "y"],
  ],
  waterfall: [
    ["x", "label"],
    ["value", "y"],
  ],
  "radial-bar": [["label"], ["value"]],
  gauge: [["value", "y"]],
  "gauge-grid": [["label"], ["value"]],
  sankey: [["source"], ["target"], ["value"]],
  chord: [["source"], ["target"], ["value"]],
  heatmap: [["x"], ["value"]],
  "calendar-heatmap": [["value"]],
  "market-map": [["x"], ["y", "y2"], ["label"]],
  dumbbell: [["label", "series"], ["value"], ["y2"]],
  slope: [["label", "series"], ["value"], ["y2"]],
  gantt: [["label"], ["value"], ["y2"]],
  beeswarm: [["value"]],
  boxplot: [["x", "label"]],
};

/** Categorical cap per kind — above this the chart stops being readable. */
const CATEGORY_CAP: Partial<Record<InfographicKind, number>> = {
  donut: 6,
  funnel: 6,
  radar: 8,
  "radial-bar": 8,
  "gauge-grid": 6,
  treemap: 14,
  sunburst: 14,
  bar: 14,
  column: 14,
  waterfall: 12,
  dumbbell: 12,
  slope: 12,
  boxplot: 10,
};

/**
 * Kinds that are legitimately dense — a calendar heatmap *is* 364 marks, a
 * sankey *is* many nodes. Category caps don't apply; instead we note when such
 * a chart is aimed at a feed-sized surface.
 */
const DENSE_KINDS = new Set<InfographicKind>([
  "calendar-heatmap",
  "heatmap",
  "beeswarm",
  "sankey",
  "chord",
  "bump",
  "gantt",
  "market-map",
  "boxplot",
  "stacked-area",
  "line",
  "area",
]);

/** Chart kinds where every value must be a non-negative share of a whole. */
const PART_TO_WHOLE = new Set<InfographicKind>([
  "donut",
  "treemap",
  "sunburst",
  "funnel",
  "radial-bar",
]);

const TIME_ORDERED = new Set<InfographicKind>(["line", "area", "stacked-area", "bump"]);

/** Per-surface presentation budgets. */
const SURFACE_LIMITS: Record<
  VizSurface,
  { categories: number; labelChars: number; titleChars: number; requireSource: boolean }
> = {
  presentation: { categories: 12, labelChars: 24, titleChars: 90, requireSource: false },
  print: { categories: 14, labelChars: 28, titleChars: 110, requireSource: true },
  social: { categories: 5, labelChars: 14, titleChars: 60, requireSource: false },
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Best-effort ordinal for a period label so we can check chronology. */
function periodOrdinal(raw: unknown): number | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(v);
  if (iso) return Number(iso[1]) * 372 + Number(iso[2]) * 31 + Number(iso[3] ?? 1);
  const quarter = /^q([1-4])[\s-]*(\d{2,4})?$/.exec(v);
  if (quarter) return (Number(quarter[2] ?? 0) || 0) * 372 + Number(quarter[1]) * 93;
  const monthIdx = MONTHS.findIndex((m) => v.startsWith(m));
  if (monthIdx >= 0) {
    const year = /(\d{4})/.exec(v);
    return (year ? Number(year[1]) : 0) * 372 + (monthIdx + 1) * 31;
  }
  const year = /^(\d{4})$/.exec(v);
  if (year) return Number(year[1]) * 372;
  return null;
}

function decimals(v: number): number {
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function valueKeyOf(spec: InfographicSpec): string | undefined {
  const e = spec.encoding;
  return e.value ?? e.y ?? undefined;
}

function labelKeyOf(spec: InfographicSpec): string | undefined {
  const e = spec.encoding;
  return e.label ?? e.x ?? e.category ?? undefined;
}

function numericValues(rows: InfographicRow[], key: string | undefined): number[] {
  if (!key) return [];
  return rows.map((r) => num(r[key])).filter((n): n is number => n !== null);
}

/* -------------------------------------------------------------------- audit */

export type AuditOptions = {
  surface?: VizSurface;
  /** Treat "Sample dataset" attribution as a finding (default true). */
  flagSampleData?: boolean;
};

/** Grade one spec. Pure function — safe in tests, tools and render paths. */
export function auditVizSpec(spec: InfographicSpec, opts: AuditOptions = {}): VizAudit {
  const surface = opts.surface ?? "presentation";
  const limits = SURFACE_LIMITS[surface];
  const out: VizFinding[] = [];
  const add = (f: VizFinding) => out.push(f);

  const rows = spec.data?.rows ?? [];
  const valueKey = valueKeyOf(spec);
  const labelKey = labelKeyOf(spec);
  const seriesKey = spec.encoding.series;

  /* ---------------------------------------------------------------- data */

  if (rows.length === 0) {
    add({
      code: "VIZ-NO-DATA",
      severity: "blocker",
      group: "data",
      message: "The chart has no rows, so it renders as an empty plot.",
      fix: "Attach a dataset, or drop in the sample dataset for this chart kind.",
    });
  }

  const required = REQUIRED_ENCODING[spec.kind] ?? [];
  const unsatisfied = required.filter((group) => !group.some((ch) => spec.encoding[ch]));
  if (unsatisfied.length > 0) {
    const names = unsatisfied.map((g) => g.join(" or "));
    add({
      code: "VIZ-ENCODING-MISSING",
      severity: "blocker",
      group: "encoding",
      message: `A ${spec.kind} chart needs the ${names.join(", ")} channel${
        unsatisfied.length > 1 ? "s" : ""
      } mapped to a column.`,
      fix: `Set encoding.${unsatisfied[0][0]} to the matching column name in data.rows.`,
    });
  }

  const presentKeys = new Set(rows.flatMap((r) => Object.keys(r)));
  for (const [channel, key] of Object.entries(spec.encoding)) {
    if (!key || rows.length === 0) continue;
    if (!presentKeys.has(key)) {
      add({
        code: "VIZ-ENCODING-ORPHAN",
        severity: "blocker",
        group: "encoding",
        message: `encoding.${channel} points at "${key}", which no row contains.`,
        fix: `Rename the column or repoint encoding.${channel} at an existing key.`,
      });
    }
  }

  const values = numericValues(rows, valueKey);
  if (valueKey && rows.length > 0) {
    const badCells = rows.filter((r) => r[valueKey] !== undefined && num(r[valueKey]) === null);
    if (badCells.length > 0) {
      add({
        code: "VIZ-NON-NUMERIC",
        severity: "blocker",
        group: "data",
        message: `${badCells.length} of ${rows.length} rows carry a non-numeric value in "${valueKey}".`,
        fix: "Strip units and separators from the value column — keep numbers plain.",
      });
    }
    const nullCells = rows.filter((r) => r[valueKey] === null || r[valueKey] === undefined);
    if (nullCells.length > 0) {
      add({
        code: "VIZ-NULL-GAPS",
        severity: "warning",
        group: "data",
        message: `${nullCells.length} rows have no value — the series will break at those points.`,
        fix: "Fill the gaps, or remove the rows and note the exclusion in the source line.",
      });
    }
  }

  if (labelKey && rows.length > 0) {
    const labels = rows.map((r) => String(r[labelKey] ?? "").trim());
    const blank = labels.filter((l) => !l).length;
    if (blank > 0) {
      add({
        code: "VIZ-LABEL-BLANK",
        severity: "warning",
        group: "data",
        message: `${blank} rows have an empty label.`,
        fix: "Give every category a short, human label — never leave one blank.",
      });
    }
    if (!seriesKey && !DENSE_KINDS.has(spec.kind)) {
      const seen = new Set<string>();
      const dupes = new Set<string>();
      for (const l of labels) {
        if (!l) continue;
        if (seen.has(l)) dupes.add(l);
        seen.add(l);
      }
      if (dupes.size > 0) {
        add({
          code: "VIZ-DUP-LABELS",
          severity: "warning",
          group: "data",
          message: `Repeated categories (${[...dupes].slice(0, 3).join(", ")}) will stack silently.`,
          fix: "Aggregate duplicates before charting, or add a series column to split them.",
        });
      }
    }

    const longest = labels.reduce((a, b) => (b.length > a.length ? b : a), "");
    if (longest.length > limits.labelChars) {
      add({
        code: "VIZ-LABEL-OVERFLOW",
        severity: "warning",
        group: "type",
        message: `"${longest.slice(0, 28)}…" is ${longest.length} chars — over the ${
          limits.labelChars
        }-char budget for ${surface}.`,
        fix: `Shorten labels to ≤${limits.labelChars} chars, or switch to a horizontal bar layout.`,
      });
    }
  }

  /* --------------------------------------------------------------- scale */

  const distinctCategories = labelKey
    ? new Set(rows.map((r) => String(r[labelKey] ?? ""))).size
    : rows.length;
  const dense = DENSE_KINDS.has(spec.kind);
  const kindCap = CATEGORY_CAP[spec.kind];
  const cap = Math.min(kindCap ?? limits.categories, limits.categories);
  if (!dense && distinctCategories > cap) {
    add({
      code: "VIZ-TOO-MANY-CATEGORIES",
      severity: distinctCategories > cap * 1.5 ? "blocker" : "warning",
      group: "scale",
      message: `${distinctCategories} categories in a ${spec.kind} on ${surface} — legible ceiling is ${cap}.`,
      fix: `Keep the top ${cap - 1} and roll the rest into "Other", or move to a ranked bar chart.`,
    });
  }
  if (dense && surface === "social" && distinctCategories > 8) {
    add({
      code: "VIZ-DENSE-ON-SOCIAL",
      severity: "warning",
      group: "scale",
      message: `A ${spec.kind} with ${distinctCategories} marks won't read at feed size.`,
      fix: "Publish a simplified cut for social and keep the dense version for the deck or print sheet.",
    });
  }

  if (PART_TO_WHOLE.has(spec.kind) && distinctCategories === 1) {
    add({
      code: "VIZ-SINGLE-SLICE",
      severity: "warning",
      group: "scale",
      message: "A part-to-whole chart with one category shows no comparison.",
      fix: "Use a KPI stat module instead, or add the remaining share.",
    });
  }
  if (TIME_ORDERED.has(spec.kind) && rows.length > 0 && rows.length < 3) {
    add({
      code: "VIZ-TREND-TOO-SHORT",
      severity: "warning",
      group: "scale",
      message: `A trend line drawn from ${rows.length} point${rows.length === 1 ? "" : "s"} implies a pattern that isn't there.`,
      fix: "Show 4+ periods, or present the change as a before/after pair.",
    });
  }

  if (PART_TO_WHOLE.has(spec.kind) && values.some((v) => v < 0)) {
    add({
      code: "VIZ-NEGATIVE-SHARE",
      severity: "blocker",
      group: "scale",
      message: `Negative values cannot be drawn as a share of a whole in a ${spec.kind}.`,
      fix: "Move to a column or waterfall chart, which can render below the baseline.",
    });
  }

  const unitIsPercent =
    /%|percent|share|rate/i.test(spec.data?.columns?.[valueKey ?? ""] ?? "") ||
    /%|percent|share/i.test(valueKey ?? "");
  // Only a flat pie/donut has to total 100: funnel stages are conversion rates,
  // radial bars are progress-to-target, and treemap/sunburst rows include
  // parents as well as children.
  if (spec.kind === "donut" && unitIsPercent && values.length > 1) {
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 1.5) {
      add({
        code: "VIZ-PART-WHOLE-SUM",
        severity: "warning",
        group: "scale",
        message: `Percentage slices total ${sum.toFixed(1)}%, not 100%.`,
        fix: "Normalise the shares, or add an explicit remainder / rounding note.",
      });
    }
  }

  if (spec.kind === "funnel" && values.length > 1) {
    const drops = values.slice(1).filter((v, i) => v > values[i]);
    if (drops.length > 0) {
      add({
        code: "VIZ-FUNNEL-NOT-MONOTONIC",
        severity: "warning",
        group: "scale",
        message: "A funnel stage grows relative to the one above it, which reads as an error.",
        fix: "Order stages by descending volume, or use a column chart for non-nested stages.",
      });
    }
  }

  if ((spec.kind === "gauge" || spec.kind === "gauge-grid") && values.length > 0) {
    const bad = values.filter((v) => v < 0 || v > 100);
    if (bad.length > 0) {
      add({
        code: "VIZ-GAUGE-RANGE",
        severity: "blocker",
        group: "scale",
        message: `Gauge values must sit in 0–100; found ${bad[0]}.`,
        fix: "Convert the metric to a percentage of target before charting it.",
      });
    }
  }

  if (TIME_ORDERED.has(spec.kind) && spec.encoding.x && rows.length > 2) {
    const ordinals = rows
      .map((r) => periodOrdinal(r[spec.encoding.x as string]))
      .filter((n): n is number => n !== null);
    if (ordinals.length === rows.length) {
      const sorted = ordinals.every((v, i) => i === 0 || v >= ordinals[i - 1]);
      if (!sorted) {
        add({
          code: "VIZ-TIME-UNSORTED",
          severity: "blocker",
          group: "data",
          message: "Time periods are out of order, so the line back-tracks across the axis.",
          fix: "Sort rows chronologically before rendering.",
        });
      }
    }
  }

  if (values.length > 2) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const med = median(values);
    if (med > 0 && max / Math.max(med, 0.0001) > 20) {
      add({
        code: "VIZ-OUTLIER-DOMINANCE",
        severity: "info",
        group: "scale",
        message: `The largest value is ${(max / med).toFixed(0)}× the median, flattening every other bar.`,
        fix: "Split the outlier out, use a log scale, or annotate it and clip the axis honestly.",
      });
    }
    if ((spec.kind === "bar" || spec.kind === "column") && min > 0 && min / max > 0.85) {
      add({
        code: "VIZ-BASELINE-SENSITIVE",
        severity: "info",
        group: "scale",
        message: "Values are within 15% of each other — a truncated axis would exaggerate the gap.",
        fix: "Keep the zero baseline and label the deltas, rather than zooming the axis.",
      });
    }
    const dp = new Set(values.map(decimals));
    if (dp.size > 2) {
      add({
        code: "VIZ-PRECISION-DRIFT",
        severity: "info",
        group: "type",
        message: "Values are rounded to a mix of decimal places, which reads as sloppy data.",
        fix: "Round the whole series to one consistent precision.",
      });
    }
  }

  /* --------------------------------------------------------------- color */

  const theme = spec.theme;
  const palette = (theme?.palette?.length ? theme.palette : [theme?.accent, theme?.primary]).filter(
    (c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c),
  );
  const surfaceHex = /^#[0-9a-f]{6}$/i.test(theme?.surface ?? "") ? theme.surface : "#FFFFFF";

  const weak = palette.filter((c) => vizContrast(c, surfaceHex) < 3);
  if (weak.length > 0) {
    add({
      code: "VIZ-SERIES-CONTRAST",
      severity: "blocker",
      group: "color",
      message: `${weak.length} palette colour${weak.length > 1 ? "s" : ""} fall below 3:1 against the ${
        theme?.mode ?? "light"
      } surface (${weak[0]} on ${surfaceHex}).`,
      fix: "Run the palette through ensureVizContrast for this surface before rendering.",
    });
  }
  if (theme?.ink && vizContrast(theme.ink, surfaceHex) < 4.5) {
    add({
      code: "VIZ-INK-CONTRAST",
      severity: "blocker",
      group: "a11y",
      message: `Label ink ${theme.ink} is under 4.5:1 on ${surfaceHex}.`,
      fix: "Use the mode's approved ink token rather than a tinted variant.",
    });
  }

  const seriesCount = seriesKey
    ? new Set(rows.map((r) => String(r[seriesKey] ?? ""))).size
    : PART_TO_WHOLE.has(spec.kind) || spec.kind === "sankey" || spec.kind === "chord"
      ? distinctCategories
      : 1;
  if (seriesCount > palette.length) {
    add({
      code: "VIZ-PALETTE-SHORT",
      severity: "warning",
      group: "color",
      message: `${seriesCount} series share a ${palette.length}-colour palette, so colours repeat.`,
      fix: "Extend the palette, or reduce the series count to the palette length.",
    });
  }
  for (let i = 1; i < Math.min(palette.length, seriesCount); i += 1) {
    if (vizContrast(palette[i], palette[i - 1]) < 1.25) {
      add({
        code: "VIZ-ADJACENT-SERIES",
        severity: "warning",
        group: "color",
        message: `Adjacent series colours ${palette[i - 1]} and ${palette[i]} are near-identical.`,
        fix: "Reorder the palette so neighbouring series separate, or vary the mark shape too.",
      });
      break;
    }
  }
  if (surface === "print" && palette.length > 0 && seriesCount > 1) {
    const lums = palette.slice(0, seriesCount).map(relLuminance);
    const spread = Math.max(...lums) - Math.min(...lums);
    if (spread < 0.12) {
      add({
        code: "VIZ-PRINT-GREYSCALE",
        severity: "warning",
        group: "color",
        message: "Series separate by hue only — they collapse together in greyscale print.",
        fix: "Vary lightness across the series, or add pattern/label encoding for print.",
      });
    }
  }

  /* ---------------------------------------------------- a11y & governance */

  const alt = spec.accessibility?.shortAlt ?? "";
  if (!alt.trim()) {
    add({
      code: "VIZ-ALT-MISSING",
      severity: "blocker",
      group: "a11y",
      message: "No short alt text, so the chart is invisible to screen readers and exports.",
      fix: "Call ensureA11y(spec) — it generates alt text and a long description from the data.",
    });
  } else if (alt.length > 140) {
    add({
      code: "VIZ-ALT-TOO-LONG",
      severity: "warning",
      group: "a11y",
      message: `Short alt is ${alt.length} chars; screen readers truncate past ~120.`,
      fix: "Move the detail into accessibility.longDesc and keep shortAlt to one sentence.",
    });
  }
  if (!spec.accessibility?.longDesc?.trim()) {
    add({
      code: "VIZ-LONGDESC-MISSING",
      severity: "warning",
      group: "a11y",
      message: "No long description, so the data has no non-visual equivalent.",
      fix: "Generate one with ensureA11y, or write the trend out in a sentence or two.",
    });
  }

  const title = spec.title?.trim() ?? "";
  if (!title) {
    add({
      code: "VIZ-TITLE-MISSING",
      severity: "warning",
      group: "governance",
      message: "The chart has no title, so the reader has to infer the claim.",
      fix: "Write a title that states the takeaway, not the chart type.",
    });
  } else if (title.length > limits.titleChars) {
    add({
      code: "VIZ-TITLE-OVERFLOW",
      severity: "warning",
      group: "type",
      message: `Title is ${title.length} chars — over the ${limits.titleChars}-char budget for ${surface}.`,
      fix: `Trim the title to ≤${limits.titleChars} chars and move nuance into the subtitle.`,
    });
  }

  const source = spec.data?.source?.trim() ?? "";
  if (!source && limits.requireSource) {
    add({
      code: "VIZ-SOURCE-MISSING",
      severity: "blocker",
      group: "governance",
      message: "Print artwork must carry a data source line.",
      fix: "Set data.source to the dataset and as-of date before sending to press.",
    });
  } else if (!source) {
    add({
      code: "VIZ-SOURCE-MISSING",
      severity: "warning",
      group: "governance",
      message: "No data attribution, so the number can't be defended in the room.",
      fix: "Set data.source to the dataset name and as-of date.",
    });
  }
  if ((opts.flagSampleData ?? true) && /sample dataset|replace with|lorem/i.test(source)) {
    add({
      code: "VIZ-SAMPLE-DATA",
      severity: "info",
      group: "governance",
      message: "Still carrying placeholder sample data.",
      fix: "Swap in the client's real numbers before this leaves the building.",
    });
  }

  if (surface === "social") {
    if (!spec.annotations?.headline?.trim()) {
      add({
        code: "VIZ-SOCIAL-NO-HEADLINE",
        severity: "warning",
        group: "governance",
        message: "A social chart scrolls past without a stated takeaway.",
        fix: "Set annotations.headline to the one-line claim the chart proves.",
      });
    }
    if (rows.length > 0 && distinctCategories > 5) {
      // already reported by the category cap; keep the surface note actionable
      add({
        code: "VIZ-SOCIAL-SIMPLIFY",
        severity: "info",
        group: "scale",
        message: "Feed-sized charts land best at 3–5 marks.",
        fix: "Cut to the marks that carry the claim; keep the full series for the deck version.",
      });
    }
  }
  if (surface === "print" && spec.export?.preferredFormat !== "svg") {
    add({
      code: "VIZ-PRINT-RASTER",
      severity: "warning",
      group: "governance",
      message: "Print export is set to raster, so the chart will soften at press sizes.",
      fix: 'Set export.preferredFormat to "svg" and keep raster only as a fallback.',
    });
  }

  const blockers = out.filter((f) => f.severity === "blocker").length;
  const warnings = out.filter((f) => f.severity === "warning").length;
  const infos = out.filter((f) => f.severity === "info").length;

  return {
    specId: spec.id,
    kind: spec.kind,
    surface,
    mode: spec.theme?.mode ?? "light",
    findings: out,
    blockers,
    warnings,
    infos,
    score: Math.max(0, 100 - blockers * 25 - warnings * 8 - infos * 2),
    publishable: blockers === 0,
  };
}

/** Compact one-line summary — used in agent tool results and toasts. */
export function summarizeVizAudit(audit: VizAudit): string {
  if (audit.findings.length === 0) return `Clean · ${audit.kind} on ${audit.surface} · score 100`;
  return `${audit.kind} on ${audit.surface} · score ${audit.score} · ${audit.blockers} blocker${
    audit.blockers === 1 ? "" : "s"
  }, ${audit.warnings} warning${audit.warnings === 1 ? "" : "s"}, ${audit.infos} note${
    audit.infos === 1 ? "" : "s"
  }`;
}
