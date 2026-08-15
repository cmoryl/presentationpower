// Universal InfographicSpec — the canonical data contract behind every chart
// module. One schema, many renderer adapters (bespoke React, ECharts, D3).
// See src/lib/infographics/registry.ts for the adapter dispatcher and
// src/lib/infographics/a11y.ts for the auto alt-text/long-desc generator.

import type { ReactNode } from "react";

/** Chart primitives our library understands. */
export type InfographicKind =
  | "kpi"
  | "bar"
  | "column"
  | "line"
  | "area"
  | "donut"
  | "gauge"
  | "heatmap"
  | "treemap"
  | "sankey"
  | "chord"
  | "beeswarm"
  | "bump"
  | "market-map"
  | "waterfall"
  | "funnel"
  | "calendar-heatmap"
  | "custom";

export type InfographicMode = "light" | "dark";

/** A single row of tabular data. All spec.data.rows share a shape per chart. */
export type InfographicRow = Record<string, string | number | null | undefined>;

/** Data-encoding contract — which columns map to which visual channels. */
export type InfographicEncoding = {
  /** Categorical/ordinal axis (usually column name for x). */
  x?: string;
  /** Quantitative axis (usually column name for y / value). */
  y?: string;
  /** Series/grouping column (for multi-series charts). */
  series?: string;
  /** For sankey/chord: source column. */
  source?: string;
  /** For sankey/chord: target column. */
  target?: string;
  /** For sankey/chord/bubble: value/weight column. */
  value?: string;
  /** For scatter/bubble/market-map: second quantitative axis. */
  y2?: string;
  /** Category column (for treemap parent grouping, chord groupings). */
  category?: string;
  /** Label column (short display label per row). */
  label?: string;
};

export type InfographicAnnotation = {
  headline?: string;
  summary?: string;
  callouts?: Array<{ target: string; text: string }>;
};

export type InfographicTheme = {
  divisionId?: string;
  mode: InfographicMode;
  accent: string;
  primary: string;
  ink: string;
  surface: string;
  /** Extended palette (optional) — used by sankey/chord/treemap. */
  palette?: string[];
  /** Type family for chart labels; follows the active look when one is set. */
  fontFamily?: string;
};

export type InfographicAccessibility = {
  /** Concise (<=120 chars) alternative text. Read by screen readers first. */
  shortAlt: string;
  /** Long-form description. Read on demand or embedded in figcaption. */
  longDesc: string;
  /** Optional custom tab order for interactive elements. */
  tabOrder?: string[];
};

export type InfographicExportPolicy = {
  /** Preferred export representation for PPTX/PDF. */
  preferredFormat: "svg" | "png";
  /** Whether we permit rasterization if SVG capture fails. */
  rasterFallback?: boolean;
};

/** The canonical spec. Every renderable chart maps to one of these. */
export type InfographicSpec = {
  id: string;
  kind: InfographicKind;
  title?: string;
  subtitle?: string;
  data: {
    rows: InfographicRow[];
    /** Optional data-source attribution. */
    source?: string;
    /** Column display names (falls back to key when missing). */
    columns?: Record<string, string>;
  };
  encoding: InfographicEncoding;
  annotations?: InfographicAnnotation;
  theme: InfographicTheme;
  accessibility: InfographicAccessibility;
  export: InfographicExportPolicy;
};

/** Runtime context passed to adapter.render() calls. */
export type RenderContext = {
  width: number;
  height: number;
  /** True for library previews (small tile). */
  compact?: boolean;
  /** True while capturing for export — disables animation, ensures SVG. */
  exporting?: boolean;
  /**
   * Open-space auto-fill multiplier (see lib/open-space-fill.ts). >1 grows the
   * plot area and label type so a chart fills an under-filled slide.
   */
  fill?: number;
};

/** Every renderer adapter (bespoke, ECharts, D3) implements this. */
export interface InfographicAdapter {
  readonly id: string;
  supports(kind: InfographicKind): boolean;
  render(spec: InfographicSpec, ctx: RenderContext): ReactNode;
  /** Serialize the chart to an SVG string (for vector PPTX/PDF export). */
  toSvg?(spec: InfographicSpec, ctx: RenderContext): Promise<string>;
}

/** Narrow runtime validator — cheap, no dependency. */
export function isInfographicSpec(v: unknown): v is InfographicSpec {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.kind !== "string") return false;
  if (!r.data || typeof r.data !== "object") return false;
  const d = r.data as Record<string, unknown>;
  if (!Array.isArray(d.rows)) return false;
  if (!r.theme || typeof r.theme !== "object") return false;
  if (!r.accessibility || typeof r.accessibility !== "object") return false;
  return true;
}
