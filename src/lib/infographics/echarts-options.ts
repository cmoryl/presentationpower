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
    case "waterfall":
      return waterfallOption(spec);
    case "radar":
      return radarOption(spec);
    case "stacked-area":
      return stackedAreaOption(spec);
    case "dumbbell":
      return dumbbellOption(spec);
    case "radial-bar":
      return radialBarOption(spec);
    case "sunburst":
      return sunburstOption(spec);
    case "gantt":
      return ganttOption(spec);
    case "slope":
      return slopeOption(spec);
    case "gauge-grid":
      return gaugeGridOption(spec);
    case "boxplot":
      return boxplotOption(spec);
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
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.62 },
        label: { color: ink.strong, fontSize: 14 },
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
      symbolSize: 30,
      itemStyle: { color: palette[i % palette.length] },
    }));
  const links = rows
    .map((r) => ({
      source: str(r[source]),
      target: str(r[target]),
      value: n(r[value]),
      lineStyle: { width: Math.max(1.5, Math.log2(n(r[value]) + 1) * 2.2) },
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
        label: { show: true, position: "right", color: ink.strong, fontSize: 14 },
        lineStyle: { curveness: 0.35, opacity: 0.8, color: "source" },
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
      symbolSize: 18,
      itemStyle: { color: palette[i % palette.length], opacity: 0.92 },
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
      symbolSize: 16,
      lineStyle: { width: 4, color: palette[i % palette.length] },
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

// ── Second-wave builders ──────────────────────────────────────────────────
// Every builder below is pure: rows in, ECharts option out. Colours come from
// the slide's own brand tokens so a chart re-inks with the look, and axis /
// label ink uses the shared muted-hairline scale rather than hard-coded grey.

/** Shared cartesian frame so the wave-two charts sit on one visual baseline. */
function grid(bottom = 40) {
  return { top: 28, left: 56, right: 32, bottom, containLabel: true };
}
function catAxis(ink: ReturnType<typeof echartsInk>, data: string[]) {
  return {
    type: "category",
    data,
    axisLine: { lineStyle: { color: ink.hairline } },
    axisTick: { show: false },
    axisLabel: { color: ink.muted, fontSize: 12 },
  };
}
function valAxis(ink: ReturnType<typeof echartsInk>, name?: string) {
  return {
    type: "value",
    name,
    nameTextStyle: { color: ink.muted, fontSize: 11 },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: ink.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: ink.hairline } },
  };
}

/** Waterfall — running total with rise/fall bars over an invisible base. */
function waterfallOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.x ?? spec.encoding.label ?? "label";
  const valueKey = spec.encoding.value ?? spec.encoding.y ?? "value";
  const labels: string[] = [];
  const base: number[] = [];
  const rise: Array<number | string> = [];
  const fall: Array<number | string> = [];
  let running = 0;
  spec.data.rows.forEach((r, i) => {
    const v = n(r[valueKey]);
    const isTotal = String(r.type ?? "").toLowerCase() === "total";
    labels.push(str(r[labelKey], `#${i + 1}`));
    if (isTotal) {
      base.push(0);
      rise.push(v);
      fall.push("-");
      running = v;
      return;
    }
    if (v >= 0) {
      base.push(running);
      rise.push(v);
      fall.push("-");
    } else {
      base.push(running + v);
      rise.push("-");
      fall.push(-v);
    }
    running += v;
  });
  return {
    grid: grid(),
    xAxis: catAxis(ink, labels),
    yAxis: valAxis(ink, spec.data.columns?.[valueKey]),
    series: [
      {
        type: "bar",
        stack: "wf",
        itemStyle: { color: "transparent" },
        emphasis: { itemStyle: { color: "transparent" } },
        data: base,
        silent: true,
      },
      {
        name: "Increase",
        type: "bar",
        stack: "wf",
        data: rise,
        itemStyle: { color: palette[0], borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: ink.muted, fontSize: 11 },
      },
      {
        name: "Decrease",
        type: "bar",
        stack: "wf",
        data: fall,
        itemStyle: { color: palette[4] ?? palette[1], borderRadius: [0, 0, 4, 4] },
        label: { show: true, position: "bottom", color: ink.muted, fontSize: 11 },
      },
    ],
  };
}

/** Radar — multi-axis capability profile, one polygon per series. */
function radarOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const axisKey = spec.encoding.x ?? spec.encoding.label ?? "axis";
  const seriesKey = spec.encoding.series ?? "series";
  const valueKey = spec.encoding.value ?? spec.encoding.y ?? "value";
  const axes: string[] = [];
  const bySeries = new Map<string, Map<string, number>>();
  for (const r of spec.data.rows) {
    const axis = str(r[axisKey]);
    const name = str(r[seriesKey], "Series");
    if (!axis) continue;
    if (!axes.includes(axis)) axes.push(axis);
    const m = bySeries.get(name) ?? new Map<string, number>();
    m.set(axis, n(r[valueKey]));
    bySeries.set(name, m);
  }
  const max = Math.max(1, ...[...bySeries.values()].flatMap((m) => [...m.values()]));
  return {
    legend: { bottom: 0, textStyle: { color: ink.muted, fontSize: 12 }, icon: "circle" },
    radar: {
      indicator: axes.map((name) => ({ name, max: Math.ceil(max * 1.1) })),
      radius: "64%",
      center: ["50%", "48%"],
      axisName: { color: ink.muted, fontSize: 12 },
      splitLine: { lineStyle: { color: ink.hairline } },
      splitArea: { areaStyle: { color: ["transparent"] } },
      axisLine: { lineStyle: { color: ink.hairline } },
    },
    series: [
      {
        type: "radar",
        symbolSize: 6,
        data: [...bySeries.entries()].map(([name, m], i) => ({
          name,
          value: axes.map((a) => m.get(a) ?? 0),
          lineStyle: { width: 2, color: palette[i % palette.length] },
          itemStyle: { color: palette[i % palette.length] },
          areaStyle: { color: palette[i % palette.length], opacity: 0.16 },
        })),
      },
    ],
  };
}

/** Stacked area — composition over time. */
function stackedAreaOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const xKey = spec.encoding.x ?? "period";
  const seriesKey = spec.encoding.series ?? "series";
  const valueKey = spec.encoding.value ?? spec.encoding.y ?? "value";
  const periods: string[] = [];
  const bySeries = new Map<string, Map<string, number>>();
  for (const r of spec.data.rows) {
    const x = str(r[xKey]);
    const name = str(r[seriesKey], "Series");
    if (!x) continue;
    if (!periods.includes(x)) periods.push(x);
    const m = bySeries.get(name) ?? new Map<string, number>();
    m.set(x, n(r[valueKey]));
    bySeries.set(name, m);
  }
  return {
    legend: { bottom: 0, textStyle: { color: ink.muted, fontSize: 12 }, icon: "roundRect" },
    grid: grid(52),
    xAxis: { ...catAxis(ink, periods), boundaryGap: false },
    yAxis: valAxis(ink, spec.data.columns?.[valueKey]),
    series: [...bySeries.entries()].map(([name, m], i) => ({
      name,
      type: "line",
      stack: "total",
      smooth: 0.35,
      showSymbol: false,
      lineStyle: { width: 2, color: palette[i % palette.length] },
      areaStyle: { color: palette[i % palette.length], opacity: 0.5 },
      data: periods.map((p) => m.get(p) ?? 0),
    })),
  };
}

/** Dumbbell — before/after gap per category. */
function dumbbellOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.label ?? spec.encoding.x ?? "label";
  const aKey = spec.encoding.value ?? "before";
  const bKey = spec.encoding.y2 ?? spec.encoding.y ?? "after";
  const labels = spec.data.rows.map((r, i) => str(r[labelKey], `#${i + 1}`));
  const a = spec.data.rows.map((r) => n(r[aKey]));
  const b = spec.data.rows.map((r) => n(r[bKey]));
  return {
    legend: { bottom: 0, textStyle: { color: ink.muted, fontSize: 12 }, icon: "circle" },
    grid: grid(52),
    xAxis: valAxis(ink, spec.data.columns?.[bKey]),
    yAxis: { ...catAxis(ink, labels), inverse: true },
    series: [
      {
        name: "Gap",
        type: "bar",
        barWidth: 3,
        stack: "gap",
        itemStyle: { color: "transparent" },
        silent: true,
        data: a.map((v, i) => Math.min(v, b[i] ?? v)),
      },
      {
        name: "Change",
        type: "bar",
        barWidth: 3,
        stack: "gap",
        itemStyle: { color: ink.faint, borderRadius: 2 },
        data: a.map((v, i) => Math.abs((b[i] ?? v) - v)),
      },
      {
        name: spec.data.columns?.[aKey] ?? "Before",
        type: "scatter",
        symbolSize: 14,
        itemStyle: { color: palette[1] ?? palette[0] },
        data: a.map((v, i) => [v, i]),
      },
      {
        name: spec.data.columns?.[bKey] ?? "After",
        type: "scatter",
        symbolSize: 14,
        itemStyle: { color: palette[0] },
        label: {
          show: true,
          position: "right",
          color: ink.muted,
          fontSize: 11,
          formatter: "{@[0]}",
        },
        data: b.map((v, i) => [v, i]),
      },
    ],
  };
}

/** Radial bar — progress rings, one arc per item. */
function radialBarOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.label ?? spec.encoding.x ?? "label";
  const valueKey = spec.encoding.value ?? spec.encoding.y ?? "value";
  const rows = spec.data.rows.slice(0, 6);
  const labels = rows.map((r, i) => str(r[labelKey], `#${i + 1}`));
  const max = Math.max(100, ...rows.map((r) => n(r[valueKey])));
  return {
    angleAxis: {
      max,
      startAngle: 90,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    radiusAxis: {
      type: "category",
      data: labels,
      z: 10,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 12 },
    },
    polar: { center: ["50%", "52%"], radius: ["26%", "88%"] },
    series: [
      {
        type: "bar",
        coordinateSystem: "polar",
        roundCap: true,
        barWidth: 14,
        showBackground: true,
        backgroundStyle: { color: ink.hairline },
        data: rows.map((r, i) => ({
          value: n(r[valueKey]),
          itemStyle: { color: palette[i % palette.length] },
        })),
        label: {
          show: true,
          position: "middle",
          formatter: "{c}",
          color: ink.strong,
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };
}

/** Sunburst — two-level hierarchy of share. */
function sunburstOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.label ?? "label";
  const valueKey = spec.encoding.value ?? "value";
  const catKey = spec.encoding.category;
  type Node = { name: string; value?: number; children?: Node[]; itemStyle?: { color: string } };
  let data: Node[] = [];
  if (catKey) {
    const groups = new Map<string, Node[]>();
    for (const r of spec.data.rows) {
      const cat = str(r[catKey], "Other");
      const arr = groups.get(cat) ?? [];
      arr.push({ name: str(r[labelKey]), value: n(r[valueKey]) });
      groups.set(cat, arr);
    }
    data = [...groups.entries()].map(([name, children], i) => ({
      name,
      children,
      itemStyle: { color: palette[i % palette.length] },
    }));
  } else {
    data = spec.data.rows.map((r, i) => ({
      name: str(r[labelKey]),
      value: n(r[valueKey]),
      itemStyle: { color: palette[i % palette.length] },
    }));
  }
  return {
    series: [
      {
        type: "sunburst",
        radius: ["18%", "92%"],
        center: ["50%", "50%"],
        data,
        sort: undefined,
        emphasis: { focus: "ancestor" },
        itemStyle: { borderColor: spec.theme.surface, borderWidth: 2 },
        label: { color: "#fff", fontSize: 12, minAngle: 12 },
        levels: [
          {},
          { r0: "18%", r: "52%", label: { rotate: "tangential", fontWeight: 600 } },
          { r0: "52%", r: "92%", label: { align: "right" } },
        ],
        tooltip: { textStyle: { color: ink.strong } },
      },
    ],
  };
}

/** Gantt — schedule bars per workstream on a numeric timeline. */
function ganttOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.label ?? "task";
  const startKey = spec.encoding.value ?? "start";
  const endKey = spec.encoding.y2 ?? "end";
  const catKey = spec.encoding.category;
  const rows = spec.data.rows;
  const labels = rows.map((r, i) => str(r[labelKey], `#${i + 1}`));
  const cats = [...new Set(rows.map((r) => (catKey ? str(r[catKey], "Track") : "Track")))];
  return {
    grid: grid(),
    xAxis: valAxis(ink, spec.data.columns?.[startKey] ?? "Weeks"),
    yAxis: { ...catAxis(ink, labels), inverse: true },
    series: [
      {
        type: "bar",
        stack: "gantt",
        itemStyle: { color: "transparent" },
        silent: true,
        data: rows.map((r) => n(r[startKey])),
      },
      {
        type: "bar",
        stack: "gantt",
        barWidth: 16,
        data: rows.map((r, i) => ({
          value: Math.max(0.25, n(r[endKey]) - n(r[startKey])),
          itemStyle: {
            color: palette[(catKey ? cats.indexOf(str(r[catKey], "Track")) : i) % palette.length],
            borderRadius: 8,
          },
        })),
        label: {
          show: true,
          position: "insideLeft",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          formatter: (p: { dataIndex: number }) =>
            catKey ? str(rows[p.dataIndex]?.[catKey], "") : "",
        },
      },
    ],
  };
}

/** Slope — two-point comparison lines (start vs end state). */
function slopeOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const seriesKey = spec.encoding.series ?? spec.encoding.label ?? "series";
  const aKey = spec.encoding.value ?? "before";
  const bKey = spec.encoding.y2 ?? spec.encoding.y ?? "after";
  const left = spec.data.columns?.[aKey] ?? "Before";
  const right = spec.data.columns?.[bKey] ?? "After";
  return {
    grid: { top: 32, left: 96, right: 96, bottom: 40 },
    xAxis: { ...catAxis(ink, [left, right]), boundaryGap: false },
    yAxis: { ...valAxis(ink), splitLine: { show: false } },
    series: spec.data.rows.map((r, i) => ({
      name: str(r[seriesKey], `#${i + 1}`),
      type: "line",
      symbolSize: 10,
      lineStyle: { width: 2.5, color: palette[i % palette.length] },
      itemStyle: { color: palette[i % palette.length] },
      data: [n(r[aKey]), n(r[bKey])],
      endLabel: {
        show: true,
        color: ink.strong,
        fontSize: 12,
        fontWeight: 600,
        formatter: "{a} · {c}",
      },
      labelLayout: { moveOverlap: "shiftY" },
    })),
  };
}

/** Gauge grid — up to four scoreboard dials. */
function gaugeGridOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.label ?? "label";
  const valueKey = spec.encoding.value ?? spec.encoding.y ?? "value";
  const rows = spec.data.rows.slice(0, 4);
  const span = 100 / Math.max(1, rows.length);
  return {
    series: rows.map((r, i) => ({
      type: "gauge",
      center: [`${span * i + span / 2}%`, "56%"],
      radius: rows.length > 2 ? "40%" : "64%",
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: Math.max(100, n(r.max)),
      progress: {
        show: true,
        width: 12,
        roundCap: true,
        itemStyle: { color: palette[i % palette.length] },
      },
      axisLine: { lineStyle: { width: 12, color: [[1, ink.hairline]] } },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: {
        show: true,
        offsetCenter: [0, "78%"],
        color: ink.muted,
        fontSize: 12,
        width: 140,
        overflow: "break",
      },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, "6%"],
        color: ink.strong,
        fontSize: 26,
        fontWeight: 700,
        formatter: (v: number) => `${Math.round(v)}${str(r.unit, "")}`,
      },
      data: [{ value: n(r[valueKey]), name: str(r[labelKey], `#${i + 1}`) }],
    })),
  };
}

/** Boxplot — spread per category from min/q1/median/q3/max columns. */
function boxplotOption(spec: InfographicSpec) {
  const palette = paletteFromTheme(spec.theme);
  const ink = echartsInk(spec.theme);
  const labelKey = spec.encoding.x ?? spec.encoding.label ?? "label";
  const labels = spec.data.rows.map((r, i) => str(r[labelKey], `#${i + 1}`));
  const boxes = spec.data.rows.map((r) => [n(r.min), n(r.q1), n(r.median), n(r.q3), n(r.max)]);
  return {
    grid: grid(),
    xAxis: catAxis(ink, labels),
    yAxis: valAxis(ink, spec.data.columns?.median),
    series: [
      {
        type: "boxplot",
        data: boxes,
        itemStyle: {
          color: hexish(palette[0]),
          borderColor: palette[1] ?? palette[0],
          borderWidth: 2,
        },
        boxWidth: [18, 44],
      },
    ],
  };
}

/** Boxes read better as a tinted fill than a solid brand block. */
function hexish(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},0.28)`;
}
