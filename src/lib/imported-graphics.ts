// Graphical intelligence for the imported-deck staging area.
//
// An imported .pptx carries charts, tables and SmartArt as structured OOXML.
// The ingest step persists that structure on `slides[].assets`, but the staging
// conversion used to hand the mapper an empty graphics set, so every chart and
// table collapsed into a text callout. This module:
//
//  1. rehydrates the stored assets back into the parser's shapes so
//     `mapParsedSlide` re-authors them onto native data/process modules, and
//  2. classifies the *remaining* visual signal — a picture of a chart, an
//     infographic, or figures that only live in the copy — so the AI reader
//     knows which slides still need a visual built for them.

import type { ParsedChart, ParsedChartSeries, ParsedDiagram, ParsedTable } from "./pptx-import";

/** Chart/table/diagram metadata as persisted by buildSlideAssets(). */
export type StoredSlideAssets = {
  charts?: Array<{
    kind?: string;
    title?: string;
    categories?: string[];
    series?: Array<{ label?: string; values?: number[]; color?: string; pointColors?: string[] }>;
    seriesLabels?: string[];
    unit?: string;
    stacked?: boolean;
    legend?: { visible: boolean; position?: "r" | "l" | "t" | "b" | "tr" };
    axis?: { category?: string; value?: string };
    numberFormat?: string;
    font?: { family?: string; color?: string };
  }>;
  tables?: Array<{ header?: string[]; rows?: string[][]; rowCount?: number; colCount?: number }>;
  diagrams?: Array<{
    kind?: string;
    layoutHint?: string;
    nodes?: Array<{ text?: string; level?: number; color?: string }>;
    nodeCount?: number;
  }>;
  images?: unknown[];
  shapes?: unknown[];
};

const CHART_KINDS = new Set([
  "bar",
  "column",
  "line",
  "area",
  "pie",
  "doughnut",
  "scatter",
  "radar",
  "other",
]);

function chartKind(k: string | undefined): ParsedChart["kind"] {
  return CHART_KINDS.has(k ?? "") ? (k as ParsedChart["kind"]) : "other";
}

function numeric(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((v) => Number.isFinite(v)) as number[];
}

/** True when a rehydrated chart still carries plottable numbers. */
export function chartHasValues(c: ParsedChart): boolean {
  return c.series.some((s) => s.values.length > 0 && s.values.some((v) => v !== 0));
}

/**
 * Stored assets → parser shapes. Charts with no surviving values are dropped:
 * a module fed an empty series renders an empty frame, which is worse than the
 * text fallback (and is exactly what the visual reader is for).
 */
export function rehydrateStoredGraphics(assets: StoredSlideAssets | null | undefined): {
  charts: ParsedChart[];
  tables: ParsedTable[];
  diagrams: ParsedDiagram[];
} {
  const a = assets ?? {};

  const charts: ParsedChart[] = (a.charts ?? [])
    .map((c) => {
      const series: ParsedChartSeries[] = (c.series ?? []).map((s, i) => ({
        label: (s.label ?? c.seriesLabels?.[i] ?? `Series ${i + 1}`).trim(),
        values: numeric(s.values),
        color: s.color,
        pointColors: s.pointColors?.length ? s.pointColors : undefined,
      }));
      return {
        kind: chartKind(c.kind),
        title: c.title,
        categories: (c.categories ?? []).map((x) => String(x ?? "")),
        series,
        stacked: c.stacked,
        legend: c.legend,
        axis: c.axis,
        numberFormat: c.numberFormat,
        unit: c.unit,
        font: c.font,
      } satisfies ParsedChart;
    })
    .filter(chartHasValues);

  const tables: ParsedTable[] = (a.tables ?? [])
    .map((t) => ({
      header: (t.header ?? []).map((x) => String(x ?? "")),
      rows: (t.rows ?? []).map((r) => (r ?? []).map((x) => String(x ?? ""))),
    }))
    .filter((t) => t.rows.length > 0 || t.header.length > 0);

  const diagrams: ParsedDiagram[] = (a.diagrams ?? [])
    .map(
      (d) =>
        ({
          kind: d.kind === "shape-group" ? "shape-group" : "smartart",
          nodes: (d.nodes ?? [])
            .map((n) => ({ text: (n.text ?? "").trim(), level: n.level ?? 0, color: n.color }))
            .filter((n) => n.text.length > 0),
          layoutHint: d.layoutHint,
        }) as unknown as ParsedDiagram,
    )
    .filter((d) => (d as unknown as { nodes: unknown[] }).nodes.length > 0);

  return { charts, tables, diagrams };
}

// ── Visual signal classification ─────────────────────────────────────────

export type VisualSignalKind =
  /** Structured chart/table/SmartArt with values — convertible with no AI. */
  | "structured"
  /** A chart/table existed but its values did not survive the source file. */
  | "stripped"
  /** Picture of a chart, dashboard or infographic — needs the AI to read it. */
  | "image-graphic"
  /** Figures live only in the copy; a visual can be built from them. */
  | "stat-copy"
  /** Nothing visual about this slide. */
  | "none";

export type VisualSignal = {
  slideIndex: number;
  kind: VisualSignalKind;
  /** Human-readable reason shown in the staging panel. */
  reason: string;
  /** Figures spotted in the copy, e.g. ["99.98%", "$284K", "3.2x"]. */
  figures: string[];
  chartCount: number;
  tableCount: number;
  diagramCount: number;
  imageCount: number;
  /** True when the AI reader can add value (image-graphic, stripped, stat-copy). */
  needsAi: boolean;
};

/** Numbers worth plotting: percentages, currency, multiples, counts with units. */
const FIGURE_RE =
  /(?:[$€£¥]\s?\d[\d,.]*\s?(?:[kmbt]|bn|mm)?\b|\d[\d,.]*\s?%|\d[\d,.]*\s?(?:pts?|bps|x|×|k|m|bn|hrs?|hours?|days?|weeks?|months?|years?|languages?|markets?|countries?|users?|clients?)\b|\b\d{2,}(?:[.,]\d+)?\b)/gi;

export function extractFigures(text: string[]): string[] {
  const seen = new Set<string>();
  for (const t of text) {
    for (const m of (t ?? "").matchAll(FIGURE_RE)) {
      const v = m[0].trim();
      if (v && !seen.has(v)) seen.add(v);
      if (seen.size >= 12) return [...seen];
    }
  }
  return [...seen];
}

const GRAPHIC_WORD_RE =
  /\b(chart|graph|dashboard|infographic|diagram|funnel|pipeline|roadmap|timeline|matrix|quadrant|heatmap|kpis?|metrics?|scorecard|breakdown|trend|growth|split|share|index|benchmark)\b/i;

export type SignalSlide = {
  index: number;
  title?: string;
  bullets?: string[];
  notes?: string;
  imageCount?: number;
  assets?: StoredSlideAssets | null;
};

/**
 * Classify what visual work a staged slide needs. Order matters: real data
 * beats a picture, a picture beats copy-only figures.
 */
export function classifyVisualSignal(slide: SignalSlide): VisualSignal {
  const assets = slide.assets ?? {};
  const { charts, tables, diagrams } = rehydrateStoredGraphics(assets);
  const storedCharts = (assets.charts ?? []).length;
  const text = [slide.title ?? "", ...(slide.bullets ?? []), slide.notes ?? ""];
  const figures = extractFigures(text);
  const imageCount = slide.imageCount ?? (assets.images ?? []).length;
  const base = {
    slideIndex: slide.index,
    figures,
    chartCount: charts.length,
    tableCount: tables.length,
    diagramCount: diagrams.length,
    imageCount,
  };

  if (charts.length || tables.length || diagrams.length) {
    const parts = [
      charts.length ? `${charts.length} chart${charts.length === 1 ? "" : "s"} with data` : "",
      tables.length ? `${tables.length} table${tables.length === 1 ? "" : "s"}` : "",
      diagrams.length ? `${diagrams.length} diagram${diagrams.length === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    return {
      ...base,
      kind: "structured",
      reason: `${parts.join(" · ")} — converts straight onto a native module.`,
      needsAi: false,
    };
  }

  if (storedCharts > 0) {
    return {
      ...base,
      kind: "stripped",
      reason: "The source chart carried no readable values — the AI can read the rendered chart.",
      needsAi: true,
    };
  }

  const graphicWords = text.some((t) => GRAPHIC_WORD_RE.test(t ?? ""));
  if (imageCount > 0 && (graphicWords || figures.length >= 2)) {
    return {
      ...base,
      kind: "image-graphic",
      reason: "This slide's data lives inside a picture — the AI can read it into a live chart.",
      needsAi: true,
    };
  }

  if (figures.length >= 2) {
    return {
      ...base,
      kind: "stat-copy",
      reason: `${figures.length} figures sit in the copy — they can be built into a visual.`,
      needsAi: true,
    };
  }

  return { ...base, kind: "none", reason: "No data or graphic on this slide.", needsAi: false };
}

export function summarizeVisualSignals(slides: SignalSlide[]): {
  signals: VisualSignal[];
  structured: number;
  needsAi: number;
} {
  const signals = slides.map(classifyVisualSignal);
  return {
    signals,
    structured: signals.filter((s) => s.kind === "structured").length,
    needsAi: signals.filter((s) => s.needsAi).length,
  };
}
