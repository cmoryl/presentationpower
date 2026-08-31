// Single source of truth for ECharts module registration.
//
// Screen and export used to register their own (different) module lists, so a
// chart kind that only one of them imported rendered on screen and came out
// blank in the .pptx — or logged "[ECharts] Series radar is used but not
// imported" and drew nothing at all in both. Every series type emitted by
// `echarts-options.ts` is registered here once, and both the on-screen renderer
// and the SVG capture path call this.
//
// Browser-only by contract: import it statically from a client-only module, or
// dynamically from anywhere else. It must never enter an SSR module graph.

import * as echarts from "echarts/core";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import {
  BarChart,
  LineChart,
  ScatterChart,
  PieChart,
  HeatmapChart,
  TreemapChart,
  SankeyChart,
  GraphChart,
  RadarChart,
  SunburstChart,
  GaugeChart,
  BoxplotChart,
  CustomChart,
  ThemeRiverChart,
  EffectScatterChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
  VisualMapComponent,
  CalendarComponent,
  PolarComponent,
  RadarComponent,
  SingleAxisComponent,
  GraphicComponent,
  DatasetComponent,
  AriaComponent,
} from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";

let registered = false;

/** Register every chart/component our option builder can emit. Idempotent. */
export function registerEchartsModules(): void {
  if (registered) return;
  registered = true;
  echarts.use([
    CanvasRenderer,
    SVGRenderer,
    // series
    BarChart,
    LineChart,
    ScatterChart,
    EffectScatterChart,
    PieChart,
    HeatmapChart,
    TreemapChart,
    SankeyChart,
    GraphChart,
    RadarChart,
    SunburstChart,
    GaugeChart,
    BoxplotChart,
    CustomChart,
    ThemeRiverChart,
    // coordinate systems + chrome
    GridComponent,
    PolarComponent,
    RadarComponent,
    SingleAxisComponent,
    CalendarComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkAreaComponent,
    MarkPointComponent,
    VisualMapComponent,
    GraphicComponent,
    DatasetComponent,
    AriaComponent,
    LabelLayout,
    UniversalTransition,
  ]);
}

export { echarts };
