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
    // ---- gridlines: horizontal only, hairline, brand tint ----
    valGridLine: { color: c.grid, size: 0.75, style: "solid" },
    catGridLine: { style: "none" },
    catAxisLineColor: c.axis,
    valAxisLineShow: false,
    // ---- bars read as columns with generous air, like the web charts ----
    barGapWidthPct: 55,
  };
}

/**
 * Series colors in brand order: dominant blue, then the two secondary accents.
 * Kept short on purpose — beyond three series the deck should split the chart
 * rather than introduce off-brand hues.
 */
export function chartSeriesColors(accent?: string): string[] {
  return [accent || CHART_BRAND.blue500, CHART_BRAND.blue800, CHART_BRAND.lavender];
}
