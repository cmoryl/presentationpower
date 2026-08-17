// Data visuals for the Open Canvas Studio.
//
// Every chart is built from the studio's own primitives (surface / text / stat)
// so the result drops as ordinary editable layers — no opaque chart object.
// Bars, tracks and plates are sized from real numbers, so a chart never
// fabricates a proportion: the geometry is always derived from the series.

import type { PresetPart } from "./canvas-block-presets";

export type DataPoint = { label: string; value: number };

export type DataVisualType =
  | "column"
  | "bar"
  | "stacked100"
  | "progress"
  | "kpi"
  | "matrix";

export type DataVisualSpec = {
  type: DataVisualType;
  title: string;
  caption?: string;
  unit?: string;
  accent?: string;
  ink?: string;
  points: DataPoint[];
};

export const DATA_VISUAL_TYPES: Array<{ id: DataVisualType; label: string; hint: string }> = [
  { id: "column", label: "Column chart", hint: "Vertical bars sized by value" },
  { id: "bar", label: "Horizontal bars", hint: "Ranked list with value bars" },
  { id: "stacked100", label: "100% share bar", hint: "Composition of a whole" },
  { id: "progress", label: "Progress tracks", hint: "Percentages against a track" },
  { id: "kpi", label: "KPI row", hint: "Numbers as stat blocks" },
  { id: "matrix", label: "Value matrix", hint: "Grid of weighted plates" },
];

const INK = "#03002C";
const ACCENT = "#003FC7";
const TRACK = "#E0E8F5";

/** Tertiary pops used for share/composition series (10% accent rule). */
const SERIES = ["#003FC7", "#A1FBF9", "#C2A3FF", "#FFEB66", "#A6FA87", "#FF9B70"];

const fmt = (v: number, unit?: string) => {
  const n = Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
  return unit ? `${n}${unit.startsWith("%") || unit.length <= 2 ? unit : ` ${unit}`}` : n;
};

function head(title: string, caption: string | undefined, ink: string, accent: string): PresetPart[] {
  const parts: PresetPart[] = [
    {
      type: "text",
      x: 160,
      y: 200,
      w: 1420,
      h: 100,
      props: { text: title, size: 64, weight: 700, align: "left", color: ink },
    },
  ];
  if (caption) {
    parts.push({
      type: "text",
      x: 160,
      y: 310,
      w: 1200,
      h: 56,
      props: {
        text: caption,
        size: 26,
        weight: 600,
        align: "left",
        uppercase: true,
        tracking: 0.16,
        color: accent,
      },
    });
  }
  return parts;
}

/**
 * Build a chart as primitive parts. Values drive geometry directly; a zero or
 * negative max collapses to labels only rather than inventing a scale.
 */
export function buildDataVisual(spec: DataVisualSpec): PresetPart[] {
  const ink = spec.ink ?? INK;
  const accent = spec.accent ?? ACCENT;
  const unit = spec.unit;
  const points = spec.points.filter((p) => Number.isFinite(p.value)).slice(0, 8);
  if (points.length === 0) return head(spec.title, spec.caption, ink, accent);
  const max = Math.max(...points.map((p) => Math.abs(p.value)));
  const parts = head(spec.title, spec.caption, ink, accent);
  const top = spec.caption ? 400 : 360;

  const label = (x: number, y: number, w: number, text: string, align: "left" | "center" = "left") => ({
    type: "text" as const,
    x,
    y,
    w,
    h: 56,
    props: { text, size: 26, weight: 500, align, color: ink },
  });

  switch (spec.type) {
    case "column": {
      const plotH = 900 - top;
      const gap = 32;
      const w = Math.floor((1600 - gap * (points.length - 1)) / points.length);
      points.forEach((p, i) => {
        const frac = max > 0 ? Math.max(0.04, Math.abs(p.value) / max) : 0.04;
        const h = Math.round(plotH * frac);
        const x = 160 + i * (w + gap);
        parts.push({
          type: "surface",
          x,
          y: top + (plotH - h),
          w,
          h,
          props: { fill: i === 0 ? accent : TRACK, radius: 16, opacity: 1 },
        });
        parts.push({
          type: "text",
          x,
          y: top + (plotH - h) - 62,
          w,
          h: 56,
          props: { text: fmt(p.value, unit), size: 34, weight: 700, align: "center", color: ink },
        });
        parts.push(label(x, 915, w, p.label, "center"));
      });
      return parts;
    }
    case "bar": {
      const rowH = 78;
      const gap = 22;
      points.forEach((p, i) => {
        const y = top + i * (rowH + gap);
        const frac = max > 0 ? Math.max(0.03, Math.abs(p.value) / max) : 0.03;
        parts.push(label(160, y + 8, 420, p.label));
        parts.push({
          type: "surface",
          x: 600,
          y,
          w: 1000,
          h: rowH,
          props: { fill: TRACK, radius: 14, opacity: 1 },
        });
        parts.push({
          type: "surface",
          x: 600,
          y,
          w: Math.round(1000 * frac),
          h: rowH,
          props: { fill: i === 0 ? accent : ink, radius: 14, opacity: i === 0 ? 1 : 0.75 },
        });
        parts.push({
          type: "text",
          x: 1630,
          y: y + 8,
          w: 200,
          h: 56,
          props: { text: fmt(p.value, unit), size: 32, weight: 700, align: "left", color: ink },
        });
      });
      return parts;
    }
    case "stacked100": {
      const total = points.reduce((s, p) => s + Math.max(0, p.value), 0);
      if (total <= 0) return parts;
      let x = 160;
      const barW = 1600;
      points.forEach((p, i) => {
        const w = Math.max(24, Math.round((Math.max(0, p.value) / total) * barW));
        parts.push({
          type: "surface",
          x,
          y: top,
          w: Math.min(w, 160 + barW - x),
          h: 180,
          props: { fill: SERIES[i % SERIES.length], radius: i === 0 ? 20 : 0, opacity: 1 },
        });
        x += w;
      });
      // Legend under the bar, one row per slice.
      points.forEach((p, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const lx = 160 + col * 820;
        const ly = top + 240 + row * 84;
        parts.push({
          type: "surface",
          x: lx,
          y: ly + 12,
          w: 36,
          h: 36,
          props: { fill: SERIES[i % SERIES.length], radius: 10, opacity: 1 },
        });
        parts.push({
          type: "text",
          x: lx + 56,
          y: ly,
          w: 700,
          h: 60,
          props: {
            text: `${p.label} — ${Math.round((Math.max(0, p.value) / total) * 100)}%`,
            size: 30,
            weight: 500,
            align: "left",
            color: ink,
          },
        });
      });
      return parts;
    }
    case "progress": {
      points.forEach((p, i) => {
        const y = top + i * 132;
        // Progress is only honest against 100; clamp rather than rescale.
        const frac = Math.max(0.02, Math.min(1, Math.abs(p.value) / 100));
        parts.push(label(160, y, 1100, p.label));
        parts.push({
          type: "text",
          x: 1500,
          y,
          w: 260,
          h: 56,
          props: { text: `${Math.round(p.value)}%`, size: 34, weight: 700, align: "right", color: ink },
        });
        parts.push({
          type: "surface",
          x: 160,
          y: y + 66,
          w: 1600,
          h: 28,
          props: { fill: TRACK, radius: 14, opacity: 1 },
        });
        parts.push({
          type: "surface",
          x: 160,
          y: y + 66,
          w: Math.round(1600 * frac),
          h: 28,
          props: { fill: i === 0 ? accent : ink, radius: 14, opacity: i === 0 ? 1 : 0.8 },
        });
      });
      return parts;
    }
    case "kpi": {
      const n = Math.min(points.length, 4);
      const gap = 40;
      const w = Math.floor((1600 - gap * (n - 1)) / n);
      points.slice(0, n).forEach((p, i) => {
        parts.push({
          type: "stat",
          x: 160 + i * (w + gap),
          y: top,
          w,
          h: 280,
          props: { value: fmt(p.value, unit), label: p.label, surface: "plate", accent },
        });
      });
      return parts;
    }
    case "matrix": {
      const cols = points.length > 4 ? 3 : 2;
      const gap = 32;
      const w = Math.floor((1600 - gap * (cols - 1)) / cols);
      const h = 210;
      points.forEach((p, i) => {
        const cx = 160 + (i % cols) * (w + gap);
        const cy = top + Math.floor(i / cols) * (h + gap);
        const frac = max > 0 ? Math.abs(p.value) / max : 0;
        parts.push({
          type: "surface",
          x: cx,
          y: cy,
          w,
          h,
          props: { fill: frac > 0.66 ? accent : frac > 0.33 ? TRACK : "#F2F2F2", radius: 24, opacity: 1 },
        });
        parts.push({
          type: "text",
          x: cx + 32,
          y: cy + 30,
          w: w - 64,
          h: 80,
          props: {
            text: fmt(p.value, unit),
            size: 52,
            weight: 700,
            align: "left",
            color: frac > 0.66 ? "#FFFFFF" : ink,
          },
        });
        parts.push({
          type: "text",
          x: cx + 32,
          y: cy + 120,
          w: w - 64,
          h: 60,
          props: {
            text: p.label,
            size: 26,
            weight: 500,
            align: "left",
            color: frac > 0.66 ? "#FFFFFF" : ink,
          },
        });
      });
      return parts;
    }
  }
}

/** Parse "Label, 42" / "Label: 42" / tab-separated lines into points. */
export function parseSeries(raw: string): DataPoint[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.split(/[\t,:;|]+/);
      const value = Number(String(m[m.length - 1] ?? "").replace(/[^0-9.\-]/g, ""));
      const label = m.slice(0, -1).join(" ").trim() || line;
      return { label, value: Number.isFinite(value) ? value : 0 };
    });
}

export const SAMPLE_SERIES: Record<DataVisualType, DataVisualSpec> = {
  column: {
    type: "column",
    title: "Volume by quarter",
    caption: "Words translated (M)",
    points: [
      { label: "Q1", value: 42 },
      { label: "Q2", value: 55 },
      { label: "Q3", value: 61 },
      { label: "Q4", value: 78 },
    ],
  },
  bar: {
    type: "bar",
    title: "Top markets by spend",
    caption: "Indexed to leader",
    points: [
      { label: "United States", value: 100 },
      { label: "Germany", value: 74 },
      { label: "Japan", value: 61 },
      { label: "Brazil", value: 38 },
    ],
  },
  stacked100: {
    type: "stacked100",
    title: "Where the effort goes",
    caption: "Share of programme hours",
    points: [
      { label: "Translation", value: 46 },
      { label: "Review", value: 24 },
      { label: "Engineering", value: 18 },
      { label: "Programme mgmt", value: 12 },
    ],
  },
  progress: {
    type: "progress",
    title: "Coverage against target",
    caption: "Percent complete",
    points: [
      { label: "Locale readiness", value: 92 },
      { label: "Glossary coverage", value: 78 },
      { label: "Automation", value: 54 },
    ],
  },
  kpi: {
    type: "kpi",
    title: "Programme at a glance",
    caption: "Trailing twelve months",
    unit: "",
    points: [
      { label: "On-time delivery", value: 99 },
      { label: "Languages live", value: 84 },
      { label: "Cost per word saved", value: 21 },
    ],
  },
  matrix: {
    type: "matrix",
    title: "Readiness by region",
    caption: "Weighted score",
    points: [
      { label: "EMEA", value: 88 },
      { label: "Americas", value: 74 },
      { label: "APAC", value: 63 },
      { label: "Japan", value: 52 },
    ],
  },
};
