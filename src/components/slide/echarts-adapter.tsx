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
  "waterfall",
  "radar",
  "stacked-area",
  "dumbbell",
  "radial-bar",
  "sunburst",
  "gantt",
  "slope",
  "gauge-grid",
  "boxplot",
];

/**
 * A failed chart chunk (network hiccup in a preview iframe, HMR miss) used to
 * leave the Suspense fallback in place forever — an empty rectangle that reads
 * as "the module didn't render". This boundary shows the chart's alt text and
 * a retry instead, and never lets one card blank out the slide.
 */
class ChartBoundary extends React.Component<
  { label: string; mode: "light" | "dark"; height: number; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const dark = this.props.mode === "dark";
    return (
      <div
        role="img"
        aria-label={this.props.label}
        style={{
          width: "100%",
          minHeight: this.props.height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
          border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(3,0,44,0.12)",
          background: dark ? "rgba(255,255,255,0.04)" : "rgba(3,0,44,0.03)",
          color: dark ? "rgba(255,255,255,0.72)" : "rgba(3,0,44,0.66)",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <span>{this.props.label}</span>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          style={{
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid currentColor",
          }}
        >
          Reload chart
        </button>
      </div>
    );
  }
}

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
        <ChartBoundary
          label={spec.accessibility.shortAlt || spec.title || "Chart"}
          mode={spec.theme.mode === "dark" ? "dark" : "light"}
          height={ctx.height || 480}
        >
          <React.Suspense
            fallback={<div aria-hidden style={{ width: "100%", height: ctx.height || 480 }} />}
          >
            <EChartsInfographic spec={spec} ctx={ctx} />
          </React.Suspense>
        </ChartBoundary>
      </ClientOnly>
    );
  },
};

registerInfographicAdapter(adapter);
export { adapter as EChartsAdapter };
