// Demo datasets for every MV-VIZ-* chart kind.
//
// The public module library, the blank-slide editor and the export smoke tests
// all render viz variants before a user has supplied data. Without rows the
// ECharts adapter draws an empty canvas, so the card looks broken. These
// datasets are deterministic, on-topic for the localization business, and
// shaped to match the encoding each option builder expects.

import type { InfographicEncoding, InfographicKind, InfographicRow } from "./spec";

export type SampleDataset = {
  rows: InfographicRow[];
  encoding: InfographicEncoding;
  columns?: Record<string, string>;
  source?: string;
};

const LOCALES = ["EN→DE", "EN→FR", "EN→JA", "EN→ES", "EN→ZH", "EN→PT"];

function calendarRows(): InfographicRow[] {
  // One deterministic year of throughput, weekdays busier than weekends.
  const year = 2026;
  const rows: InfographicRow[] = [];
  const start = Date.UTC(year, 0, 1);
  for (let i = 0; i < 364; i += 1) {
    const d = new Date(start + i * 86400000);
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const wave = Math.sin(i / 26) * 0.5 + 0.5;
    const value = Math.round((weekend ? 6 : 34) + wave * (weekend ? 8 : 46) + ((i * 37) % 11));
    rows.push({ date: d.toISOString().slice(0, 10), value });
  }
  return rows;
}

const DATASETS: Partial<Record<InfographicKind, SampleDataset>> = {
  sankey: {
    encoding: { source: "source", target: "target", value: "value" },
    columns: { source: "From", target: "To", value: "Words (M)" },
    source: "Sample dataset · replace with client volumes",
    rows: [
      { source: "Product content", target: "Translation", value: 42 },
      { source: "Product content", target: "MT + review", value: 28 },
      { source: "Support content", target: "MT + review", value: 36 },
      { source: "Marketing", target: "Transcreation", value: 18 },
      { source: "Translation", target: "In-market review", value: 34 },
      { source: "MT + review", target: "In-market review", value: 48 },
      { source: "Transcreation", target: "In-market review", value: 14 },
      { source: "In-market review", target: "Published", value: 88 },
    ],
  },
  chord: {
    encoding: { source: "source", target: "target", value: "value" },
    columns: { source: "Region", target: "Region", value: "Shared projects" },
    source: "Sample dataset · replace with program data",
    rows: [
      { source: "NA", target: "EMEA", value: 128 },
      { source: "NA", target: "APAC", value: 86 },
      { source: "EMEA", target: "APAC", value: 74 },
      { source: "EMEA", target: "LATAM", value: 52 },
      { source: "APAC", target: "LATAM", value: 31 },
      { source: "NA", target: "LATAM", value: 64 },
    ],
  },
  beeswarm: {
    encoding: { value: "turnaround", category: "workstream", label: "label" },
    columns: { turnaround: "Turnaround (hrs)", workstream: "Workstream", label: "Locale" },
    source: "Sample dataset · replace with SLA telemetry",
    rows: LOCALES.flatMap((label, i) => [
      { label, workstream: "Product UI", turnaround: 12 + ((i * 7) % 16) },
      { label, workstream: "Support", turnaround: 6 + ((i * 5) % 11) },
      { label, workstream: "Marketing", turnaround: 24 + ((i * 11) % 30) },
    ]),
  },
  bump: {
    encoding: { x: "period", series: "series", value: "rank" },
    columns: { period: "Quarter", series: "Locale", rank: "Rank by volume" },
    source: "Sample dataset · replace with volume history",
    rows: ["Q1", "Q2", "Q3", "Q4"].flatMap((period, q) =>
      ["German", "Japanese", "French", "Spanish", "Simplified Chinese"].map((series, s) => ({
        period,
        series,
        rank: 1 + ((s + q * (s + 1)) % 5),
      })),
    ),
  },
  "market-map": {
    encoding: { x: "reach", y: "readiness", value: "spend", label: "label", category: "tier" },
    columns: {
      reach: "Market reach",
      readiness: "Localization readiness",
      spend: "Annual spend ($k)",
      label: "Market",
      tier: "Tier",
    },
    source: "Sample dataset · replace with market model",
    rows: [
      { label: "Germany", tier: "Tier 1", reach: 82, readiness: 88, spend: 640 },
      { label: "Japan", tier: "Tier 1", reach: 74, readiness: 71, spend: 580 },
      { label: "France", tier: "Tier 1", reach: 68, readiness: 79, spend: 410 },
      { label: "Brazil", tier: "Tier 2", reach: 58, readiness: 46, spend: 260 },
      { label: "Korea", tier: "Tier 2", reach: 52, readiness: 62, spend: 230 },
      { label: "Poland", tier: "Tier 3", reach: 34, readiness: 55, spend: 120 },
      { label: "UAE", tier: "Tier 3", reach: 29, readiness: 38, spend: 95 },
    ],
  },
  treemap: {
    encoding: { label: "label", value: "value", category: "category" },
    columns: { label: "Content type", value: "Words (M)", category: "Business unit" },
    source: "Sample dataset · replace with content inventory",
    rows: [
      { category: "Product", label: "UI strings", value: 38 },
      { category: "Product", label: "Release notes", value: 14 },
      { category: "Product", label: "In-app help", value: 21 },
      { category: "Support", label: "Knowledge base", value: 44 },
      { category: "Support", label: "Chat macros", value: 12 },
      { category: "Marketing", label: "Campaigns", value: 18 },
      { category: "Marketing", label: "Website", value: 26 },
      { category: "Legal", label: "Contracts", value: 9 },
    ],
  },
  "calendar-heatmap": {
    encoding: { x: "date", value: "value" },
    columns: { date: "Date", value: "Jobs delivered" },
    source: "Sample dataset · replace with delivery log",
    rows: calendarRows(),
  },
  waterfall: {
    encoding: { x: "label", value: "value" },
    columns: { label: "Driver", value: "Cost per 1k words ($)" },
    source: "Sample dataset · replace with program economics",
    rows: [
      { label: "Legacy cost", value: 220, type: "total" },
      { label: "TM leverage", value: -34 },
      { label: "MT + review", value: -46 },
      { label: "Vendor consolidation", value: -18 },
      { label: "New locales", value: 12 },
      { label: "Element run-rate", value: 134, type: "total" },
    ],
  },
  radar: {
    encoding: { x: "axis", series: "series", value: "value" },
    columns: { axis: "Capability", series: "Programme", value: "Maturity (0–100)" },
    source: "Sample dataset · replace with maturity assessment",
    rows: ["Automation", "Quality", "Speed", "Coverage", "Governance", "Cost control"].flatMap(
      (axis, i) => [
        { axis, series: "Today", value: 44 + ((i * 9) % 22) },
        { axis, series: "With Element", value: 74 + ((i * 5) % 20) },
      ],
    ),
  },
  "stacked-area": {
    encoding: { x: "period", series: "channel", value: "value" },
    columns: { period: "Quarter", channel: "Channel", value: "Words (M)" },
    source: "Sample dataset · replace with volume history",
    rows: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"].flatMap((period, q) =>
      ["Product", "Support", "Marketing", "Legal"].map((channel, c) => ({
        period,
        channel,
        value: 6 + c * 3 + q * (c === 0 ? 3 : 1.4),
      })),
    ),
  },
  dumbbell: {
    encoding: { label: "label", value: "before", y2: "after" },
    columns: { label: "Workstream", before: "Before", after: "With Element" },
    source: "Sample dataset · replace with cycle-time audit",
    rows: [
      { label: "Product UI", before: 21, after: 6 },
      { label: "Support centre", before: 14, after: 4 },
      { label: "Campaigns", before: 32, after: 11 },
      { label: "Regulated docs", before: 45, after: 22 },
      { label: "Video + subtitles", before: 38, after: 13 },
    ],
  },
  "radial-bar": {
    encoding: { label: "label", value: "value" },
    columns: { label: "Programme", value: "% complete" },
    source: "Sample dataset · replace with rollout tracker",
    rows: [
      { label: "Locale onboarding", value: 92 },
      { label: "TM migration", value: 78 },
      { label: "MT tuning", value: 64 },
      { label: "Reviewer network", value: 51 },
      { label: "Governance", value: 38 },
    ],
  },
  sunburst: {
    encoding: { label: "label", value: "value", category: "category" },
    columns: { label: "Content type", value: "Share", category: "Business unit" },
    source: "Sample dataset · replace with content inventory",
    rows: [
      { category: "Product", label: "UI strings", value: 32 },
      { category: "Product", label: "Help centre", value: 18 },
      { category: "Growth", label: "Campaigns", value: 22 },
      { category: "Growth", label: "Website", value: 16 },
      { category: "Regulated", label: "Labelling", value: 14 },
      { category: "Regulated", label: "Contracts", value: 9 },
    ],
  },
  gantt: {
    encoding: { label: "task", value: "start", y2: "end", category: "track" },
    columns: { task: "Workstream", start: "Week", end: "Week", track: "Track" },
    source: "Sample dataset · replace with rollout plan",
    rows: [
      { task: "Discovery + audit", track: "Setup", start: 0, end: 3 },
      { task: "TM + glossary migration", track: "Setup", start: 2, end: 6 },
      { task: "Connector build", track: "Build", start: 4, end: 9 },
      { task: "MT tuning", track: "Build", start: 6, end: 11 },
      { task: "Pilot locales", track: "Launch", start: 9, end: 13 },
      { task: "Full rollout", track: "Launch", start: 12, end: 18 },
    ],
  },
  slope: {
    encoding: { series: "label", value: "before", y2: "after" },
    columns: { label: "Metric", before: "FY25", after: "FY26" },
    source: "Sample dataset · replace with programme scorecard",
    rows: [
      { label: "On-time delivery", before: 78, after: 96 },
      { label: "First-pass quality", before: 84, after: 95 },
      { label: "Reuse rate", before: 41, after: 68 },
      { label: "Cost per 1k words", before: 92, after: 56 },
    ],
  },
  "gauge-grid": {
    encoding: { label: "label", value: "value" },
    columns: { label: "KPI", value: "Score" },
    source: "Sample dataset · replace with live scorecard",
    rows: [
      { label: "On-time delivery", value: 96, unit: "%" },
      { label: "Quality (LQA)", value: 94, unit: "%" },
      { label: "Automation coverage", value: 81, unit: "%" },
      { label: "Reviewer satisfaction", value: 88, unit: "%" },
    ],
  },
  boxplot: {
    encoding: { x: "label" },
    columns: { label: "Workstream", median: "Turnaround (hrs)" },
    source: "Sample dataset · replace with SLA telemetry",
    rows: [
      { label: "Product UI", min: 3, q1: 5, median: 7, q3: 10, max: 16 },
      { label: "Support", min: 2, q1: 3, median: 5, q3: 7, max: 12 },
      { label: "Marketing", min: 6, q1: 11, median: 16, q3: 22, max: 34 },
      { label: "Regulated", min: 12, q1: 18, median: 24, q3: 33, max: 48 },
    ],
  },
  heatmap: {
    encoding: { x: "period", series: "locale", value: "value" },
    columns: { period: "Month", locale: "Locale", value: "Quality score" },
    source: "Sample dataset · replace with QA scores",
    rows: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].flatMap((period, m) =>
      LOCALES.map((locale, i) => ({ period, locale, value: 86 + ((i * 3 + m * 5) % 13) })),
    ),
  },
};

/** Deterministic demo dataset for a chart kind, or null when none is defined. */
export function sampleDatasetFor(kind: InfographicKind): SampleDataset | null {
  return DATASETS[kind] ?? null;
}
