// Browser-only ECharts renderer. Must not be statically imported from any
// SSR-reachable module — the entry point is `EChartsInfographic` which is
// lazy-loaded behind <ClientOnly>. See tanstack-execution-model.

import * as React from "react";
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
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  CalendarComponent,
} from "echarts/components";
import type { InfographicSpec, RenderContext } from "@/lib/infographics/spec";
import { buildEchartsBase } from "@/lib/infographics/echarts-theme";
import { buildEchartsOption } from "@/lib/infographics/echarts-options";

echarts.use([
  CanvasRenderer,
  SVGRenderer,
  BarChart,
  LineChart,
  ScatterChart,
  PieChart,
  HeatmapChart,
  TreemapChart,
  SankeyChart,
  GraphChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  CalendarComponent,
]);

type Props = {
  spec: InfographicSpec;
  ctx: RenderContext;
  className?: string;
  style?: React.CSSProperties;
};

function deepMerge<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) {
    const av = out[k];
    const bv = b[k];
    if (
      av &&
      bv &&
      typeof av === "object" &&
      typeof bv === "object" &&
      !Array.isArray(av) &&
      !Array.isArray(bv)
    ) {
      out[k] = deepMerge(av as Record<string, unknown>, bv as Record<string, unknown>);
    } else {
      out[k] = bv;
    }
  }
  return out as T;
}

export default function EChartsInfographic({ spec, ctx, className, style }: Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const instRef = React.useRef<echarts.ECharts | null>(null);

  React.useEffect(() => {
    if (!hostRef.current) return;
    // Use SVG renderer whenever we're capturing (exporting) — vector output
    // survives PPTX/PDF. Canvas is fine for interactive presentation.
    const renderer = ctx.exporting ? "svg" : "canvas";
    const inst = echarts.init(hostRef.current, undefined, { renderer });
    instRef.current = inst;
    const base = buildEchartsBase(spec.theme);
    const specific = buildEchartsOption(spec);
    inst.setOption(deepMerge(base as unknown as Record<string, unknown>, specific));
    const onResize = () => inst.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.dispose();
      instRef.current = null;
    };
    // Full re-init on spec change — cheap for our sizes and avoids stale option shape.
  }, [spec, ctx.exporting]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={spec.accessibility.shortAlt}
      className={className}
      style={{ width: "100%", height: ctx.height || 480, ...style }}
    />
  );
}
