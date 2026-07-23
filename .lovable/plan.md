# Infographic Platform — Phase 1

Turn our layout-first module system into a **spec-driven infographic platform**: one canonical schema, adapter-based renderers, machine-readable a11y, and a "view/download data" affordance on every chart. Existing bespoke React variants stay — they're wrapped by the new spec, not replaced.

## 1. Canonical `InfographicSpec` schema

New file: `src/lib/infographics/spec.ts`

```ts
type InfographicSpec = {
  id: string;
  kind: "bar" | "line" | "column" | "donut" | "gauge" | "heatmap"
      | "sankey" | "chord" | "beeswarm" | "bump" | "treemap"
      | "waterfall" | "funnel" | "market-map" | "kpi" | "custom";
  data: { rows: Record<string, unknown>[]; source?: string };
  encoding: { x?: string; y?: string; series?: string; value?: string; category?: string };
  annotations?: { callouts?: {target: string; text: string}[]; headline?: string; summary?: string };
  theme: { division?: DivisionId; mode: "light" | "dark"; accent?: string };
  accessibility: { shortAlt: string; longDesc: string; tabOrder?: string[] };
  export: { preferredFormat: "svg" | "png"; rasterFallback?: boolean };
};
```

Ship a `renderInfographic(spec, adapter)` dispatcher and adapter interface:

```ts
interface InfographicAdapter {
  supports(kind: InfographicSpec["kind"]): boolean;
  render(spec: InfographicSpec, ctx: RenderContext): ReactNode;
  toSvg(spec: InfographicSpec): Promise<string>;   // for PPTX/PDF export
  toCsv(spec: InfographicSpec): string;            // for data drawer
  toA11y(spec: InfographicSpec): { shortAlt: string; longDesc: string };
}
```

Three adapters registered:
- **`BespokeReactAdapter`** — wraps existing hero variants (KPI dashboard, stat grids, cover charts). No visual regressions.
- **`EChartsAdapter`** (new) — data-dense/uncommon charts.
- **`CustomD3Adapter`** — reserved for the maturity curve / journey visuals we hand-tuned.

Migrate 5 existing variants as proof: `MV-KPI-DASHBOARD`, `MV-DASH-SALES-CHART`, `MV-DASH-PERFORMANCE`, `MV-DASH-DONUT-TRIO`, `MV-DASH-BREAKDOWN`. Same look, now spec-backed.

## 2. ECharts uncommon-chart pack

Install `echarts` + `echarts-for-react`. New module family `MV-INFO-*`:

- `MV-INFO-SANKEY` — flow / attribution
- `MV-INFO-CHORD` — relationship matrix
- `MV-INFO-BEESWARM` — distribution / benchmark
- `MV-INFO-BUMP` — ranking over time
- `MV-INFO-MARKET-MAP` — 2×2 strategic positioning w/ bubbles
- `MV-INFO-TREEMAP-PRO` — hierarchical breakdown
- `MV-INFO-HEATMAP-CAL` — calendar / cohort heatmap

Each seeded to library with light + dark aurora backdrops, division-locked accents piped through ECharts theme, and free-form v2 treatment (no card containers). SVG-first rendering (`renderer: "svg"`) so PPTX export stays vector.

## 3. Accessibility layer

- Auto-generate `shortAlt` (≤120 chars) and `longDesc` from spec (kind + top-N insights + trend direction).
- Wire into DOM: `<figure role="img" aria-label={shortAlt}>` + `<figcaption class="sr-only">{longDesc}</figcaption>`.
- Wire into PPTX export: `slide.addImage({ altText: shortAlt, ... })` via pptxgenjs alt-text field.
- Wire into PDF export: tagged PDF `/Alt` entry via jsPDF.
- Manual override field in the module editor (Governance tab) so authors can rewrite the auto-alt.

## 4. Data-table drawer

New component `<ChartDataDrawer />`: small "◱ Data" pill in slide chrome corner (visible in edit mode always, in present mode only when the deck flag `showDataAffordance` is on).

- Opens a right-side sheet with a sortable table of `spec.data.rows`.
- "Download CSV" button → uses `adapter.toCsv(spec)`.
- "Copy as markdown table" secondary action.
- No live data bindings in phase 1 — data is still authored in the module.

## 5. Housekeeping & tests

- Register new `MV-INFO-*` variants in the DB seed (Atlas library) with `case-studies.ts` division previews.
- Extend `pptx-export.ts` to route `kind` values through `adapter.toSvg()` before falling back to raster.
- Vitest: schema validation, adapter dispatch, alt-text generation, CSV shape.
- Playwright: one visual snapshot per new `MV-INFO-*` variant in both light and dark for GlobalLink + Corporate.

## Explicitly out of scope (deferred)

- Vega-Lite as a runtime (using it only as design inspiration for the schema).
- Live data connectors / streaming.
- Office.js PowerPoint add-in refresh hooks.
- Google Slides API insertion.
- Yjs/Liveblocks realtime co-editing.
- Highcharts/amCharts enterprise fallback runtimes.

## Technical notes

- ECharts SSR-safe: import dynamically behind `<ClientOnly>` — the module is browser-only, so any static import from an SSR route would break the build.
- Bundle: ECharts tree-shaken via `echarts/core` + explicit chart/component registration, kept off the initial route bundles via `React.lazy`.
- Division theme: single `buildEchartsTheme(division, mode)` helper in `src/lib/infographics/echarts-theme.ts` reads existing division tokens so all charts inherit brand automatically.
- No changes to `client.ts`, `client.server.ts`, `auth-middleware.ts`, `types.ts`, `.env`.

## Deliverables checklist

- [ ] `src/lib/infographics/{spec,registry,adapters/*}.ts`
- [ ] ECharts adapter + theme builder
- [ ] 7 new `MV-INFO-*` variants seeded + rendered
- [ ] 5 existing variants migrated onto spec (visual parity)
- [ ] Auto alt-text + long-desc, wired into DOM + PPTX + PDF export
- [ ] `<ChartDataDrawer />` with CSV export
- [ ] Vitest + Playwright coverage for the above
