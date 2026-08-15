// Browser-only ECharts SVG capture for the PPTX/PDF export pipelines.
//
// Spins up an off-DOM host, mounts an ECharts instance in SVG mode,
// applies the InfographicSpec's option, extracts the serialized SVG,
// and disposes. Result is a self-contained SVG string that pptxgenjs
// can embed as a vector image via addImage({ data: "data:image/svg+xml;..." }).
//
// Kept isomorphic-safe: the `echarts` import happens inside the function,
// so this module can be imported from the pptx-export module graph
// without dragging echarts into any SSR path.

import type { InfographicSpec } from "./spec";
import { buildEchartsBase } from "./echarts-theme";
import { buildEchartsOption } from "./echarts-options";

type Size = { width: number; height: number };

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

/** Render a spec to a standalone SVG string. Throws when called outside the browser. */
export async function renderSpecToSvg(
  spec: InfographicSpec,
  size: Size = { width: 1600, height: 900 },
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("renderSpecToSvg is browser-only");
  }
  // Dynamic import so echarts doesn't enter the SSR module graph via this file.
  const echarts = await import("echarts/core");
  const [{ SVGRenderer }, chartsMod, componentsMod] = await Promise.all([
    import("echarts/renderers"),
    import("echarts/charts"),
    import("echarts/components"),
  ]);
  echarts.use([
    SVGRenderer,
    chartsMod.BarChart,
    chartsMod.LineChart,
    chartsMod.ScatterChart,
    chartsMod.PieChart,
    chartsMod.HeatmapChart,
    chartsMod.TreemapChart,
    chartsMod.SankeyChart,
    chartsMod.GraphChart,
    componentsMod.GridComponent,
    componentsMod.TooltipComponent,
    componentsMod.LegendComponent,
    componentsMod.TitleComponent,
    componentsMod.VisualMapComponent,
    componentsMod.CalendarComponent,
    componentsMod.MarkLineComponent,
    componentsMod.MarkAreaComponent,
  ]);

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-99999px;top:-99999px;width:${size.width}px;height:${size.height}px;pointer-events:none;`;
  document.body.appendChild(host);
  try {
    const inst = echarts.init(host, undefined, {
      renderer: "svg",
      width: size.width,
      height: size.height,
    });
    const option = deepMerge(
      buildEchartsBase(spec.theme, ctx.fill ?? 1) as unknown as Record<string, unknown>,
      buildEchartsOption(spec),
    );
    inst.setOption(option);
    // Force a synchronous layout pass. `renderToSVGString` isn't available on
    // the core build; we serialize the mounted <svg> instead.
    const svg = host.querySelector("svg");
    let out = "";
    if (svg) {
      // Ensure width/height attributes exist so pptxgenjs sizes it correctly.
      if (!svg.getAttribute("width")) svg.setAttribute("width", String(size.width));
      if (!svg.getAttribute("height")) svg.setAttribute("height", String(size.height));
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const { resolveSvgMarkupVars } = await import("../export-svg-vars");
      out = resolveSvgMarkupVars(new XMLSerializer().serializeToString(svg), svg);

    }
    inst.dispose();
    return out;
  } finally {
    host.remove();
  }
}

/** Wrap an SVG string as a base64 data URL (pptxgenjs accepts SVG via data URL). */
export function svgToDataUrl(svg: string): string {
  if (typeof btoa === "undefined") throw new Error("btoa unavailable");
  // Use unescape/encodeURIComponent trick for unicode-safe base64.
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}
