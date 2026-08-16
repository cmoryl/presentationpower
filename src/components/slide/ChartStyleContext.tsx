import { chartStyle, type ChartStyle } from "@/lib/chart-styles";
import { useStylePack } from "./StylePackContext";

/**
 * The active chart grammar. Derived from the active style pack, so every
 * alternate look draws its own bars, grids, series and dials without any
 * surface needing to opt in.
 */
export function useChartStyle(): ChartStyle {
  return chartStyle(useStylePack());
}

export type { ChartStyle };
