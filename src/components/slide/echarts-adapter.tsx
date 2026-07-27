// Registers the ECharts adapter with the infographic registry. Import for
// side-effects from any client route that renders MV-VIZ-* variants.

import * as React from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { InfographicAdapter, InfographicKind } from "@/lib/infographics/spec";
import { registerInfographicAdapter } from "@/lib/infographics/registry";

// Lazy: never appears in the SSR module graph.
const EChartsInfographic = React.lazy(() => import("./EChartsInfographic"));

const SUPPORTED: InfographicKind[] = [
  "sankey",
  "chord",
  "beeswarm",
  "bump",
  "market-map",
  "treemap",
  "calendar-heatmap",
  "heatmap",
];

const adapter: InfographicAdapter = {
  id: "echarts",
  supports(kind) {
    return SUPPORTED.includes(kind);
  },
  render(spec, ctx) {
    return (
      <ClientOnly
        fallback={
          <div
            aria-hidden
            style={{
              width: "100%",
              height: ctx.height || 480,
              background:
                spec.theme.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(10,15,28,0.03)",
              borderRadius: 16,
            }}
          />
        }
      >
        <React.Suspense
          fallback={<div aria-hidden style={{ width: "100%", height: ctx.height || 480 }} />}
        >
          <EChartsInfographic spec={spec} ctx={ctx} />
        </React.Suspense>
      </ClientOnly>
    );
  },
};

registerInfographicAdapter(adapter);
export { adapter as EChartsAdapter };
