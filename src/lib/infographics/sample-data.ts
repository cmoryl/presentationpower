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
