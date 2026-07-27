// Concrete ECharts option builders per chart kind. Kept isomorphic: no
// browser globals, no `echarts` import — the runtime component instantiates
// echarts and merges these options over the base theme.

import type { InfographicSpec } from "./spec";
import { paletteFromTheme, echartsInk } from "./echarts-theme";

function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function str(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}

export function buildEchartsOption(spec: InfographicSpec): Record<string, unknown> {
  switch (spec.kind) {
    case "sankey":
      return sankeyOption(spec);
    case "chord":
      return chordOption(spec);
    case "beeswarm":
      return beeswarmOption(spec);
    case "bump":
      return bumpOption(spec);
    case "market-map":
      return marketMapOption(spec);
    case "treemap":
      return treemapOption(spec);
    case "calendar-heatmap":
      return calendarHeatmapOption(spec);
    default:
      return {};
  }
}

function sankeyOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const rows = spec.data.rows;
  const source = spec.encoding.source ?? "source";
  const target = spec.encoding.target ?? "target";
  const value = spec.encoding.value ?? "value";
  const nodes = new Map<string, { name: string }>();
  const links: Array<{ source: string; target: string; value: number }> = [];
  for (const r of rows) {
    const src = str(r[source]);
    const tgt = str(r[target]);
    const v = n(r[value]);
    if (!src || !tgt) continue;
    if (!nodes.has(src)) nodes.set(src, { name: src });
    if (!nodes.has(tgt)) nodes.set(tgt, { name: tgt });
    links.push({ source: src, target: tgt, value: v });
  }
  return {
    series: [
      {
        type: "sankey",
        data: Array.from(nodes.values()),
        links,
        emphasis: { focus: "adjacency" },
        nodeAlign: "justify",
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.55 },
        label: { color: ink.strong, fontSize: 12 },
        itemStyle: { borderColor: "transparent" },
        color: palette,
      },
    ],
  };
}

function chordOption(spec: InfographicSpec) {
  // ECharts doesn't have first-class chord — use `graph` with circular layout.
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const rows = spec.data.rows;
  const source = spec.encoding.source ?? "source";
  const target = spec.encoding.target ?? "target";
  const value = spec.encoding.value ?? "value";
  const names = new Set<string>();
  rows.forEach((r) => {
    names.add(str(r[source]));
    names.add(str(r[target]));
  });
  const nodes = Array.from(names)
    .filter(Boolean)
    .map((name, i) => ({
      name,
      symbolSize: 26,
      itemStyle: { color: palette[i % palette.length] },
    }));
  const links = rows
    .map((r) => ({
      source: str(r[source]),
      target: str(r[target]),
      value: n(r[value]),
      lineStyle: { width: Math.max(1, Math.log2(n(r[value]) + 1) * 2) },
    }))
    .filter((l) => l.source && l.target);
  return {
    series: [
      {
        type: "graph",
        layout: "circular",
        circular: { rotateLabel: true },
        data: nodes,
        links,
        edgeSymbol: ["none", "none"],
        label: { show: true, position: "right", color: ink.strong },
        lineStyle: { curveness: 0.35, opacity: 0.7, color: "source" },
        emphasis: { focus: "adjacency", lineStyle: { width: 4 } },
      },
    ],
  };
}

function beeswarmOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const value = spec.encoding.value ?? spec.encoding.y ?? "value";
  const category = spec.encoding.category ?? spec.encoding.series ?? "category";
  const label = spec.encoding.label ?? "label";
  const rows = spec.data.rows;
  const cats = Array.from(new Set(rows.map((r) => str(r[category]) || "All")));
  // Deterministic scatter position — jitter y by hash of label so runs match.
  const hash = (t: string) => {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) h = ((h ^ t.charCodeAt(i)) * 16777619) >>> 0;
    return (h % 1000) / 1000;
  };
  return {
    grid: { left: 60, right: 32, top: 40, bottom: 40 },
    xAxis: { type: "value", name: value, nameTextStyle: { color: ink.muted } },
    yAxis: { type: "category", data: cats, axisLabel: { color: ink.muted } },
    series: cats.map((cat, i) => ({
      type: "scatter",
      name: cat,
      symbolSize: 14,
      itemStyle: { color: palette[i % palette.length], opacity: 0.82 },
      data: rows
        .filter((r) => (str(r[category]) || "All") === cat)
        .map((r) => ({
          value: [n(r[value]), i + (hash(str(r[label])) - 0.5) * 0.7],
          name: str(r[label]),
        })),
      emphasis: { scale: 1.5 },
      label: { show: false },
    })),
  };
}

function bumpOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const rows = spec.data.rows;
  const x = spec.encoding.x ?? "period";
  const series = spec.encoding.series ?? "series";
  const value = spec.encoding.value ?? spec.encoding.y ?? "rank";
  const periods = Array.from(new Set(rows.map((r) => str(r[x]))));
  const seriesNames = Array.from(new Set(rows.map((r) => str(r[series]))));
  return {
    xAxis: { type: "category", data: periods, axisLabel: { color: ink.muted } },
    yAxis: { type: "value", inverse: true, name: "Rank", nameTextStyle: { color: ink.muted } },
    legend: { top: 0, textStyle: { color: ink.muted } },
    series: seriesNames.map((name, i) => ({
      type: "line",
      name,
      smooth: true,
      symbol: "circle",
      symbolSize: 12,
      lineStyle: { width: 3, color: palette[i % palette.length] },
      itemStyle: { color: palette[i % palette.length] },
      data: periods.map((p) => {
        const row = rows.find((r) => str(r[x]) === p && str(r[series]) === name);
        return row ? n(row[value]) : null;
      }),
    })),
  };
}

function marketMapOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const x = spec.encoding.x ?? "x";
  const y = spec.encoding.y ?? "y";
  const value = spec.encoding.value ?? "value";
  const label = spec.encoding.label ?? "label";
  const rows = spec.data.rows;
  const category = spec.encoding.category;
  const cats = category ? Array.from(new Set(rows.map((r) => str(r[category]) || "All"))) : ["All"];
  return {
    grid: { left: 60, right: 40, top: 40, bottom: 50 },
    xAxis: {
      type: "value",
      name: x,
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: { color: ink.muted },
      splitLine: { lineStyle: { color: ink.hairline } },
    },
    yAxis: {
      type: "value",
      name: y,
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: { color: ink.muted },
      splitLine: { lineStyle: { color: ink.hairline } },
    },
    series: cats.map((cat, i) => ({
      type: "scatter",
      name: cat,
      symbolSize: (val: number[]) => Math.max(20, Math.min(80, Math.sqrt(val[2] ?? 1) * 8)),
      itemStyle: {
        color: palette[i % palette.length],
        opacity: 0.75,
        borderColor: palette[i % palette.length],
        borderWidth: 1,
      },
      label: {
        show: true,
        position: "right",
        color: ink.strong,
        fontSize: 12,
        formatter: (params: { data: { name?: string } }) => params.data.name ?? "",
      },
      data: rows
        .filter((r) => !category || (str(r[category]) || "All") === cat)
        .map((r) => ({ value: [n(r[x]), n(r[y]), n(r[value]) || 1], name: str(r[label]) })),
    })),
  };
}

function treemapOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const label = spec.encoding.label ?? "label";
  const value = spec.encoding.value ?? "value";
  const category = spec.encoding.category;
  const rows = spec.data.rows;
  const data: Array<{
    name: string;
    value: number;
    children?: unknown[];
    itemStyle?: { color: string };
  }> = [];
  if (category) {
    const groups = new Map<string, Array<{ name: string; value: number }>>();
    for (const r of rows) {
      const cat = str(r[category]) || "Other";
      const arr2 = groups.get(cat) ?? [];
      arr2.push({ name: str(r[label]), value: n(r[value]) });
      groups.set(cat, arr2);
    }
    let i = 0;
    for (const [cat, children] of groups) {
      data.push({
        name: cat,
        value: children.reduce((a, b) => a + b.value, 0),
        children,
        itemStyle: { color: palette[i % palette.length] },
      });
      i++;
    }
  } else {
    rows.forEach((r, i) =>
      data.push({
        name: str(r[label]),
        value: n(r[value]),
        itemStyle: { color: palette[i % palette.length] },
      }),
    );
  }
  return {
    series: [
      {
        type: "treemap",
        data,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: { show: true, formatter: "{b}\n{c}", color: "#fff", fontSize: 14, fontWeight: 500 },
        upperLabel: { show: !!category, color: "#fff", fontSize: 13 },
        itemStyle: { borderColor: "rgba(0,0,0,0.15)", borderWidth: 2, gapWidth: 4 },
      },
    ],
  };
}

function calendarHeatmapOption(spec: InfographicSpec) {
  const ink = echartsInk(spec.theme);
  const dateKey = spec.encoding.x ?? "date";
  const valueKey = spec.encoding.value ?? "value";
  const rows = spec.data.rows;
  const data = rows.map((r) => [str(r[dateKey]), n(r[valueKey])]);
  const values = data.map((d) => d[1] as number).filter((v) => Number.isFinite(v));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const year = data[0]?.[0] ? String(data[0][0]).slice(0, 4) : String(new Date().getFullYear());
  return {
    visualMap: {
      min,
      max,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 8,
      inRange: { color: [spec.theme.surface, spec.theme.accent, spec.theme.primary] },
      textStyle: { color: ink.muted },
    },
    calendar: {
      top: 32,
      left: 40,
      right: 40,
      cellSize: ["auto", 18],
      range: year,
      itemStyle: { color: "transparent", borderColor: ink.hairline, borderWidth: 1 },
      dayLabel: { color: ink.muted, fontSize: 11 },
      monthLabel: { color: ink.muted, fontSize: 11 },
      yearLabel: { show: false },
      splitLine: { show: false },
    },
    series: [{ type: "heatmap", coordinateSystem: "calendar", data }],
  };
}
