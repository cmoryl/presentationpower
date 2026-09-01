// -----------------------------------------------------------------------------
// REAL POWERPOINT CHARTS FOR MV-VIZ-*
//
// The VIZ family used to export as a vector plate (an SVG picture of the
// ECharts render). Pixel-faithful, but a picture: a reviewer could not click a
// bar, retype a number or re-colour a series in PowerPoint.
//
// This module turns an InfographicSpec into a *chart plan* — chart type, series,
// categories, colour roles and the fractional box each chart occupies — for the
// kinds where PowerPoint has a genuine native equivalent. `pptx-export` walks
// the plan and calls `slide.addChart(...)`, so the exported object is a real
// chart part with an embedded worksheet: editable data, editable styling.
//
// Kinds WITHOUT a native PowerPoint equivalent (sankey, chord, treemap,
// sunburst, calendar heatmap, market map, beeswarm, dumbbell, gantt, boxplot,
// radial bar) stay on the design-exact vector plate — PowerPoint has no chart
// type that can draw them, and faking them with a bar chart would be a
// different graphic, not the build's.
// -----------------------------------------------------------------------------
import type { InfographicKind, InfographicRow, InfographicSpec } from "./spec";

/** Palette slot the exporter resolves to a concrete hex. */
export type VizColorRole =
  | "primary"
  | "accent"
  | "series"
  | "series2"
  | "series3"
  | "track"
  | "surface";

/**
 * Series colour ramp. Series 3+ used to all resolve to one muted grey, so a
 * four-channel stacked area exported with two indistinguishable bands. The ramp
 * cycles brand-derived roles instead.
 */
const SERIES_RAMP: VizColorRole[] = ["primary", "accent", "series", "series2", "series3"];

function seriesColor(i: number): VizColorRole {
  return SERIES_RAMP[i % SERIES_RAMP.length]!;
}

export type VizChartType = "bar" | "line" | "area" | "radar" | "doughnut";

export type VizNativeChart = {
  type: VizChartType;
  /** pptxgenjs series list: one entry per series, shared category labels. */
  data: Array<{ name: string; labels: string[]; values: number[] }>;
  /** Per-series colour roles, index-aligned with `data`. */
  colors: VizColorRole[];
  /** Fractional box inside the chart area (0..1 of width/height). */
  box: { x: number; y: number; w: number; h: number };
  stacked?: boolean;
  barDir?: "col" | "bar";
  holeSize?: number;
  showValue?: boolean;
  /** Draw the value axis high-to-low (rank charts read 1 at the top). */
  invertValueAxis?: boolean;
  /** Caption drawn under the chart (used by the gauge grid). */
  caption?: string;
  /** Big value drawn in the ring centre (gauge grid). */
  centerValue?: string;
  /** Hide the value axis (waterfall/gauge read from labels). */
  hideValAxis?: boolean;
};

export type VizNativeChartPlan = {
  kind: InfographicKind;
  charts: VizNativeChart[];
  /** Series names in draw order — the exporter renders a native legend. */
  legend: string[];
};

/** Kinds PowerPoint can draw as a real, editable chart. */
export const NATIVE_VIZ_KINDS: InfographicKind[] = [
  "waterfall",
  "stacked-area",
  "radar",
  "slope",
  "bump",
  "gauge-grid",
];

export function vizKindIsNativeChart(kind: InfographicKind | undefined | null): boolean {
  return !!kind && NATIVE_VIZ_KINDS.includes(kind);
}

/** MV-VIZ-* variant ids whose export is a real PowerPoint chart. */
export const NATIVE_VIZ_VARIANT_IDS: readonly string[] = [
  "MV-VIZ-WATERFALL",
  "MV-VIZ-STACKED-AREA",
  "MV-VIZ-RADAR",
  "MV-VIZ-SLOPE",
  "MV-VIZ-BUMP",
  "MV-VIZ-GAUGE-GRID",
];

const numOf = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const strOf = (v: unknown): string => (v == null ? "" : String(v));

function firstKey(rows: InfographicRow[], pred: (v: unknown) => boolean): string | undefined {
  const row = rows[0];
  if (!row) return undefined;
  return Object.keys(row).find((k) => pred(row[k]));
}

/** Resolve the category / value / series columns, falling back to row shape. */
function columns(spec: InfographicSpec) {
  const rows = spec.data.rows ?? [];
  const enc = spec.encoding ?? {};
  const x =
    enc.x ??
    enc.label ??
    enc.category ??
    firstKey(rows, (v) => typeof v === "string") ??
    "label";
  const y = enc.y ?? enc.value ?? firstKey(rows, (v) => typeof v === "number") ?? "value";
  const series = enc.series;
  return { rows, x, y, series };
}

/** Group rows into series → ordered category/value pairs. */
function seriesFromRows(spec: InfographicSpec) {
  const { rows, x, y, series } = columns(spec);
  const labels: string[] = [];
  for (const r of rows) {
    const l = strOf(r[x]);
    if (l && !labels.includes(l)) labels.push(l);
  }
  if (!series) {
    return {
      labels,
      series: [
        {
          name: spec.data.columns?.[y] ?? y,
          labels,
          values: labels.map((l) => numOf(rows.find((r) => strOf(r[x]) === l)?.[y])),
        },
      ],
    };
  }
  const names: string[] = [];
  for (const r of rows) {
    const n = strOf(r[series]);
    if (n && !names.includes(n)) names.push(n);
  }
  return {
    labels,
    series: names.map((n) => ({
      name: n,
      labels,
      values: labels.map((l) =>
        numOf(rows.find((r) => strOf(r[x]) === l && strOf(r[series]) === n)?.[y]),
      ),
    })),
  };
}

const FULL = { x: 0, y: 0, w: 1, h: 1 } as const;

/**
 * Build the native-chart plan for a spec, or `null` when this kind has no
 * faithful PowerPoint chart type (caller keeps the vector plate).
 */
export function vizNativeChartPlan(spec: InfographicSpec): VizNativeChartPlan | null {
  if (!vizKindIsNativeChart(spec.kind)) return null;
  const rows = spec.data.rows ?? [];
  if (rows.length === 0) return null;

  switch (spec.kind) {
    case "waterfall": {
      // Two stacked series: an invisible riser that lifts each delta bar to its
      // running total, then the delta itself. Editing either column in the
      // embedded sheet re-draws the bridge, exactly like a hand-built one.
      const { labels, series } = seriesFromRows(spec);
      const deltas = series[0]?.values ?? [];
      const base: number[] = [];
      const span: number[] = [];
      let run = 0;
      deltas.forEach((d, i) => {
        const isTotal = i === 0 || i === deltas.length - 1;
        if (isTotal) {
          base.push(0);
          span.push(Math.abs(d) || run);
          run = Math.abs(d) || run;
        } else {
          const next = run + d;
          base.push(Math.min(run, next));
          span.push(Math.abs(d));
          run = next;
        }
      });
      return {
        kind: spec.kind,
        legend: [],
        charts: [
          {
            type: "bar",
            barDir: "col",
            stacked: true,
            box: FULL,
            colors: ["surface", "primary"],
            data: [
              { name: "Base", labels, values: base },
              { name: spec.data.columns?.["value"] ?? "Change", labels, values: span },
            ],
          },
        ],
      };
    }

    case "stacked-area": {
      const { labels, series } = seriesFromRows(spec);
      return {
        kind: spec.kind,
        legend: series.map((s) => s.name),
        charts: [
          {
            type: "area",
            stacked: true,
            box: FULL,
            colors: series.map((_, i) => seriesColor(i)),
            data: series.map((s) => ({ ...s, labels })),
          },
        ],
      };
    }

    case "radar": {
      const { labels, series } = seriesFromRows(spec);
      return {
        kind: spec.kind,
        legend: series.length > 1 ? series.map((s) => s.name) : [],
        charts: [
          {
            type: "radar",
            box: FULL,
            colors: series.map((_, i) => seriesColor(i)),
            data: series.map((s) => ({ ...s, labels })),
          },
        ],
      };
    }

    case "slope":
    case "bump": {
      // Slope specs encode the two endpoints as columns on one row
      // (`value` -> `y2`), so the categories are the two periods and each row
      // becomes its own series line.
      const enc = spec.encoding ?? {};
      if (enc.y2 && (enc.value || enc.y)) {
        const startKey = (enc.value ?? enc.y)!;
        const endKey = enc.y2;
        const nameKey = enc.series ?? enc.label ?? enc.x ?? "label";
        const labels = [
          spec.data.columns?.[startKey] ?? startKey,
          spec.data.columns?.[endKey] ?? endKey,
        ];
        const lines = rows.map((r) => ({
          name: strOf(r[nameKey]) || "Series",
          labels,
          values: [numOf(r[startKey]), numOf(r[endKey])],
        }));
        return {
          kind: spec.kind,
          legend: lines.map((l) => l.name),
          charts: [
            {
              type: "line",
              box: FULL,
              invertValueAxis: spec.kind === "bump",
              colors: lines.map((_, i) => seriesColor(i)),
              data: lines,
            },
          ],
        };
      }
      const { labels, series } = seriesFromRows(spec);
      return {
        kind: spec.kind,
        legend: series.map((s) => s.name),
        charts: [
          {
            type: "line",
            box: FULL,
            invertValueAxis: spec.kind === "bump",

            colors: series.map((_, i) => seriesColor(i)),
            data: series.map((s) => ({ ...s, labels })),
          },
        ],
      };
    }

    case "gauge-grid": {
      // One real doughnut per gauge, laid out on the same grid the build uses:
      // up to four across, rows below. The ring value stays editable.
      const { rows: r, x, y } = columns(spec);
      const gauges = r.slice(0, 8).map((row) => ({
        label: strOf(row[x]),
        value: Math.max(0, Math.min(100, numOf(row[y]))),
      }));
      const cols = Math.min(4, Math.max(1, gauges.length));
      const rowsCount = Math.ceil(gauges.length / cols);
      const cw = 1 / cols;
      const ch = 1 / rowsCount;
      return {
        kind: spec.kind,
        legend: [],
        charts: gauges.map((g, i) => ({
          type: "doughnut" as const,
          holeSize: 68,
          box: {
            x: (i % cols) * cw + cw * 0.08,
            y: Math.floor(i / cols) * ch + ch * 0.04,
            w: cw * 0.84,
            h: ch * 0.74,
          },
          colors: ["primary", "track"],
          caption: g.label,
          centerValue: `${Math.round(g.value)}%`,
          data: [
            {
              name: g.label || "Gauge",
              labels: [g.label || "Value", "Remainder"],
              values: [g.value, Math.max(0, 100 - g.value)],
            },
          ],
        })),
      };
    }

    default:
      return null;
  }
}
