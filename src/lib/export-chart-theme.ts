/**
 * Brand chart theme for PPTX export.
 *
 * Native OOXML charts default to Office's own look: Calibri axis labels, black
 * tick text, heavy gridlines, a plot-area border and a chart-area fill. That is
 * the single biggest reason an exported data slide stops looking like the app.
 * These defaults restate the on-screen chart styling — Geist labels, brand
 * gridlines, no chart/plot chrome, brand series colors — and are merged UNDER
 * each call site's own options, so every existing per-variant override still
 * wins.
 *
 * Values are literal 6-char hex (no `#`), which is what pptxgenjs expects.
 */

import {
  barGapWidthPct,
  gridLineSpec,
  lineDash,
  lineSizePt,
  exportChartStyle,
} from "./export-chart-grammar";

/** Brand blues used for series and text. */
export const CHART_BRAND = {
  blue500: "003FC7",
  blue800: "03002C",
  aqua: "A1FBF9",
  lavender: "C2A3FF",
  darkGray: "666666",
  blueWhite: "E0E8F5",
} as const;

/** Axis/grid chrome differs between the light and dark slide backdrops. */
const CHROME = {
  light: { label: CHART_BRAND.darkGray, grid: CHART_BRAND.blueWhite, axis: "C9D4EC" },
  dark: { label: "B9C6E4", grid: "1E2A55", axis: "2A3766" },
} as const;

export type ChartThemeOpts = {
  dark?: boolean;
  /** Base label size in points; ticks scale down from the axis title size. */
  labelSize?: number;
};

/**
 * Default chart options in brand style. Spread FIRST, then the call site's own
 * options:
 *
 *   { ...chartTheme({ dark }), x, y, w, h, chartColors: [p.accent] }
 */
export function chartTheme(opts: ChartThemeOpts = {}): Record<string, unknown> {
  const c = opts.dark ? CHROME.dark : CHROME.light;
  const size = opts.labelSize ?? 11;
  return {
    // ---- chart + plot chrome: none. The slide backdrop shows through. ----
    fill: "none",
    border: { pt: 0, color: c.grid },
    showTitle: false,
    // ---- typography ----
    catAxisLabelFontFace: "Geist",
    catAxisLabelFontSize: size,
    catAxisLabelColor: c.label,
    valAxisLabelFontFace: "Geist",
    valAxisLabelFontSize: size,
    valAxisLabelColor: c.label,
    dataLabelFontFace: "Geist",
    dataLabelFontSize: size,
    dataLabelColor: c.label,
    legendFontFace: "Geist",
    legendFontSize: size,
    legendColor: c.label,
    // ---- gridlines: horizontal only, ruled the way the pack rules its field ----
    valGridLine: gridLineSpec(c.grid),
    catGridLine: { style: "none" },
    // Office draws tick marks and series markers by default; the app draws
    // neither, so a themed chart must switch them off explicitly or every
    // exported line picks up diamond markers the preview never had.
    catAxisMajorTickMark: "none",
    catAxisMinorTickMark: "none",
    valAxisMajorTickMark: "none",
    valAxisMinorTickMark: "none",
    lineDataSymbol: "none",
    lineDataSymbolSize: 1,
    showLegend: false,
    showValue: false,
    catAxisLineColor: c.axis,
    valAxisLineShow: false,
    // ---- column width + series weight straight from the pack's grammar ----
    barGapWidthPct: barGapWidthPct(),
    lineSize: lineSizePt(),
    lineDash: lineDash(),
    lineSmooth: exportChartStyle().line === "smooth",
  };
}

/**
 * SPARKLINE THEME — the tiny trend graphics inside dashboard/KPI modules.
 *
 * On screen a sparkline is a bare smoothed trend: no axes, no ticks, no
 * gridlines, no markers, no legend. Exported without those suppressions the
 * same graphic came out of Office as a boxed line chart ruled with default
 * gridlines and diamond markers — the single loudest "the graph doesn't match
 * the build" defect. Every chart under ~1in tall goes through here.
 */
export function sparklineTheme(opts: ChartThemeOpts = {}): Record<string, unknown> {
  return {
    ...chartTheme(opts),
    catAxisHidden: true,
    valAxisHidden: true,
    catAxisLineShow: false,
    valAxisLineShow: false,
    catGridLine: { style: "none" },
    valGridLine: { style: "none" },
    showLegend: false,
    showValue: false,
    showLabel: false,
    lineDataSymbol: "none",
    lineSmooth: true,
  };
}

/** A chart this small is a sparkline, whatever the call site called it. */
export function isSparklineBox(w: number, h: number): boolean {
  return h > 0 && h <= 1.05 && w <= 6.5;
}

/**
 * Series colors in brand order: dominant blue, then the two secondary accents.
 * Kept short on purpose — beyond three series the deck should split the chart
 * rather than introduce off-brand hues.
 */
export function chartSeriesColors(accent?: string): string[] {
  return [accent || CHART_BRAND.blue500, CHART_BRAND.blue800, CHART_BRAND.lavender];
}
