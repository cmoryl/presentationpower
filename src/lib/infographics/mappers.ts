import type { InfographicRow } from "./spec";
// Adapters from the existing MV-* variant content shape into a canonical
// InfographicSpec. These let the ChartDataDrawer + a11y helpers work on
// legacy variants without touching pixels — the visual is still the
// existing bespoke React path.

import type { InfographicSpec, InfographicMode } from "./spec";

type Ctx = {
  variantId: string;
  content: Record<string, unknown>;
  mode: InfographicMode;
  accent: string;
  primary: string;
  ink: string;
  surface: string;
  divisionId?: string;
};

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}
function s(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}
function n(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function baseTheme(c: Ctx) {
  return {
    divisionId: c.divisionId,
    mode: c.mode,
    accent: c.accent,
    primary: c.primary,
    ink: c.ink,
    surface: c.surface,
  } as const;
}

/** MV-KPI-DASHBOARD -> kpi InfographicSpec. */
export function specFromKpiDashboard(c: Ctx): InfographicSpec {
  const items = arr(c.content.items);
  return {
    id: `${c.variantId}-spec`,
    kind: "kpi",
    title: s(c.content.title),
    data: {
      rows: items.map((it) => ({
        label: s(it.label),
        value: n(it.value) ?? s(it.value),
        unit: s(it.unit),
        delta: s(it.delta),
        trend: s(it.trend),
      })),
      columns: {
        label: "Metric",
        value: "Value",
        unit: "Unit",
        delta: "Δ vs baseline",
        trend: "Trend",
      },
    },
    encoding: { label: "label", value: "value" },
    theme: baseTheme(c),
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg", rasterFallback: true },
  };
}

/**
 * MV-DASH-* line/column/donut/breakdown -> generic time-series or
 * categorical spec. Enough to power the data drawer + alt-text for the
 * existing bespoke variants without changing their render.
 */
export function specFromDashChart(c: Ctx, kind: InfographicSpec["kind"] = "line"): InfographicSpec {
  const items = arr(c.content.items);
  const series = arr(c.content.series);
  const rows: InfographicRow[] =
    series.length > 0
      ? series.map((row) => {
          const flat: InfographicRow = { period: s(row.period ?? row.label ?? row.name) };
          for (const [k, v] of Object.entries(row)) {
            if (k !== "period" && k !== "label" && k !== "name") flat[k] = n(v) ?? s(v);
          }
          return flat;
        })
      : items.map(
          (it): InfographicRow => ({
            label: s(it.label ?? it.category ?? it.name),
            value: n(it.value) ?? s(it.value),
            note: s(it.note),
          }),
        );

  return {
    id: `${c.variantId}-spec`,
    kind,
    title: s(c.content.title),
    subtitle: s(c.content.subtitle),
    data: { rows, source: s(c.content.source) || undefined },
    encoding:
      series.length > 0 ? { x: "period", value: "value" } : { label: "label", value: "value" },
    theme: baseTheme(c),
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg", rasterFallback: true },
  };
}
