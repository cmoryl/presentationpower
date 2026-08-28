// Locations family — MV-LOC-WORLD-PINS / WORLD-STATS / REGION-FOCUS /
// HUB-SPOKE. Extracted from the legacy `VariantRenderer` switch onto the module
// registry together with its pin/metric coercion helpers, so the map geometry,
// region rails and role legends have exactly one owner.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, arr, s } from "../module-kit";
import { Kicker } from "../primitives";
import { fillPx } from "@/lib/open-space-fill";
import type { SlideMode } from "../SlideChrome";
import type { BrandMode } from "@/lib/taxonomy";
import { exportMapNodeAsPng } from "@/lib/map-png-export";

void React;


// ────────────────────────────────────────────────────────────────────────────
// Locations family — MV-LOC-* renderer
// ────────────────────────────────────────────────────────────────────────────
import {
  WorldMap as LocWorldMap,
  getDivisionLocationSet as locGetDivisionSet,
  regionCounts as locRegionCounts,
  REGION_LABELS as LOC_REGION_LABELS,
  formatMetricValue as locFormatMetric,
  type LocationPin as LocPin,
  type LocationMetric as LocMetric,
  type RegionKey as LocRegionKey,
} from "@/lib/location-maps";

function coercePin(raw: Record<string, unknown>, i: number): LocPin | null {
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const region = (raw.region as string)?.toUpperCase();
  const validRegion = ["AMER", "EMEA", "APAC", "LATAM", "MEA"].includes(region)
    ? (region as LocPin["region"])
    : lon < -30
      ? lat > 15
        ? "AMER"
        : "LATAM"
      : lon < 60
        ? lat < 12
          ? "MEA"
          : "EMEA"
        : "APAC";
  const role = raw.role as string as LocPin["role"] | undefined;
  let values: Record<string, number> | undefined;
  if (raw.values && typeof raw.values === "object") {
    values = {};
    for (const [k, v] of Object.entries(raw.values as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) values[k] = n;
    }
    if (Object.keys(values).length === 0) values = undefined;
  }
  return {
    id: String(raw.id ?? `pin-${i}`),
    city: String(raw.city ?? "Location"),
    country: (raw.country as string) || undefined,
    region: validRegion,
    lat,
    lon,
    role: role || "office",
    label: (raw.label as string) || undefined,
    values,
  };
}

function coerceMetrics(raw: unknown): LocMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m: Record<string, unknown>): LocMetric | null => {
      if (!m || typeof m !== "object") return null;
      const id = String(m.id ?? "").trim();
      const label = String(m.label ?? "").trim();
      if (!id || !label) return null;
      return {
        id,
        label,
        unit: m.unit ? String(m.unit) : undefined,
        format: (m.format as LocMetric["format"]) || "number",
        precision: Number.isFinite(Number(m.precision)) ? Number(m.precision) : 0,
      };
    })
    .filter((x): x is LocMetric => !!x);
}

// Region-metric row — same shape the KPI/graph modules read from `c.items`
// (MV-DASH-REGION-STATS et al.): { label, value, unit, percent, delta }.
// For location slides we allow an optional `region` code so a row can bind
// to a specific pin region, and we source them from `c.regionMetrics` so we
// don't collide with `c.items` (which is the pin array on MV-LOC-*).
type RegionMetricRow = {
  region?: LocPin["region"];
  label: string;
  value?: string;
  unit?: string;
  percent?: number;
  delta?: string;
};

function readRegionMetrics(c: Record<string, unknown>): RegionMetricRow[] {
  const raw = Array.isArray(c.regionMetrics) ? (c.regionMetrics as unknown[]) : [];
  const REGION_KEYS: LocPin["region"][] = ["AMER", "EMEA", "APAC", "LATAM", "MEA"];
  const out: RegionMetricRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    if (!label) continue;
    const regionRaw = typeof rec.region === "string" ? rec.region.toUpperCase() : "";
    const region = (REGION_KEYS as string[]).includes(regionRaw)
      ? (regionRaw as LocPin["region"])
      : undefined;
    const percentNum = Number(rec.percent);
    out.push({
      region,
      label,
      value: rec.value != null && rec.value !== "" ? String(rec.value) : undefined,
      unit: typeof rec.unit === "string" && rec.unit ? rec.unit : undefined,
      percent: Number.isFinite(percentNum) ? Math.max(0, Math.min(100, percentNum)) : undefined,
      delta: typeof rec.delta === "string" && rec.delta ? rec.delta : undefined,
    });
  }
  return out;
}

function readHeroStat(
  c: Record<string, unknown>,
): { value: string; unit?: string; label?: string } | null {
  const stat = c.stat;
  if (!stat || typeof stat !== "object") return null;
  const rec = stat as Record<string, unknown>;
  const value = rec.value != null && rec.value !== "" ? String(rec.value) : "";
  if (!value) return null;
  return {
    value,
    unit: typeof rec.unit === "string" && rec.unit ? rec.unit : undefined,
    label: typeof rec.label === "string" && rec.label ? rec.label : undefined,
  };
}

type LocationsInk = {
  strong: string;
  body: string;
  muted: string;
  faint: string;
  axis: string;
  divider: string;
  hairline: string;
  hairlineStrong: string;
  surface: string;
  surfaceRing: string;
  ringOnDark: string;
  onSurface: (hex: string) => string;
  accentText: string;
};

function renderLocationsVariant(
  variantId: string,
  brand: { id: string; tokens: { accent: string; primary: string } } & Record<string, unknown>,
  mode: SlideMode,
  ink: LocationsInk,
  c: Record<string, unknown>,
  pageNumber?: number,
): React.ReactElement {
  const seeded = locGetDivisionSet(brand.id);
  const rawItems = Array.isArray(c.items) ? (c.items as Record<string, unknown>[]) : [];
  const pins: LocPin[] =
    rawItems.length > 0 ? rawItems.map(coercePin).filter((x): x is LocPin => !!x) : seeded.pins;

  const title = (c.title as string) || seeded.headline;
  const subtitle = (c.subtitle as string) || seeded.subhead || "";
  const narrative = (c.narrative as string) || "";
  const region = ((c.region as string) || "world") as LocRegionKey;
  const accent = brand.tokens.accent;
  const primary = brand.tokens.primary;
  const isDark = mode === "dark";
  const counts = locRegionCounts(pins);
  const totalCities = pins.length;
  const totalRegions = (Object.keys(counts) as LocPin["region"][]).filter(
    (k) => counts[k] > 0,
  ).length;

  // KPI/graph-style region metric fields — same shape MV-DASH-REGION-STATS
  // reads from `c.items` and `c.stat`. We keep MV-LOC-* `c.items` as the pin
  // array and expose the metrics via `c.regionMetrics` + `c.stat`.
  const regionMetrics = readRegionMetrics(c);
  const heroStat = readHeroStat(c);
  const hasRegionMetrics = regionMetrics.length > 0;

  // Compact metric list — mirrors the MV-DASH-REGION-STATS visual grammar
  // (label · delta on top, progress bar below). Renders inside any panel.
  const RegionMetricList = ({
    rows,
    maxRows = 6,
  }: {
    rows: RegionMetricRow[];
    maxRows?: number;
  }) => {
    const shown = rows.slice(0, maxRows);
    return (
      <div>
        {shown.map((it, i) => {
          const pct = typeof it.percent === "number" ? it.percent : 0;
          const delta = it.delta ?? "";
          const negative = delta.trim().startsWith("-");
          return (
            <div
              key={`${it.label}-${i}`}
              className="py-4"
              style={{
                borderTop: `1px solid ${ink.hairline}`,
                borderBottom: i === shown.length - 1 ? `1px solid ${ink.hairline}` : "none",
              }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <div
                  style={{
                    fontSize: fillPx(18, "body"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {it.label}
                </div>
                <div className="flex items-baseline gap-3">
                  {it.value && (
                    <div
                      className="tabular-nums"
                      style={{ fontSize: fillPx(18, "body"), fontWeight: 600, color: ink.strong }}
                    >
                      {it.value}
                      {it.unit && (
                        <span
                          style={{
                            fontSize: fillPx(12, "kicker"),
                            color: ink.muted,
                            marginLeft: 3,
                          }}
                        >
                          {it.unit}
                        </span>
                      )}
                    </div>
                  )}
                  {delta && (
                    <div
                      className="uppercase tabular-nums"
                      style={{
                        fontSize: fillPx(12, "kicker"),
                        letterSpacing: "0.24em",
                        fontWeight: 700,
                        color: negative ? "#B42318" : "var(--slide-accent-text)",
                      }}
                    >
                      {delta}
                    </div>
                  )}
                </div>
              </div>
              {typeof it.percent === "number" && (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full"
                  style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)" }}
                >
                  <div
                    style={{ width: `${pct}%`, height: "100%", background: accent, opacity: 0.8 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Free-form region rail — hairline row of region ticks with a share meter
  // under each so the footprint reads as an infographic, not a count list.
  const RegionRail = () => {
    const keys = Object.keys(LOC_REGION_LABELS) as LocPin["region"][];
    const activeKeys = keys.filter((k) => (counts[k] ?? 0) > 0);
    const railTotal = keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
    const railMax = Math.max(1, ...keys.map((k) => counts[k] ?? 0));
    return (
      <div className="mt-8 flex items-stretch" style={{ borderTop: `1px solid ${ink.hairline}` }}>
        {keys.map((k, i) => {
          const n = counts[k] ?? 0;
          const active = n > 0;
          const share = railTotal > 0 ? Math.round((n / railTotal) * 100) : 0;
          return (
            <div
              key={k}
              className="flex-1 pt-5 pr-6"
              style={{
                opacity: active ? 1 : 0.32,
                borderLeft: i === 0 ? undefined : `1px solid ${ink.hairline}`,
                paddingLeft: i === 0 ? 0 : 24,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: active ? accent : ink.muted,
                    boxShadow: active ? `0 0 0 3px ${accent}22` : undefined,
                    display: "inline-block",
                  }}
                />
                <div
                  style={{
                    color: active ? "var(--slide-accent-text)" : ink.muted,
                    fontSize: fillPx(11, "kicker"),
                    letterSpacing: "0.28em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {k}
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <div
                  className="tabular-nums"
                  style={{
                    color: ink.strong,
                    fontSize: fillPx(44, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    lineHeight: 0.95,
                  }}
                >
                  {n}
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    color: ink.muted,
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.16em",
                    fontWeight: 600,
                  }}
                >
                  {share}%
                </div>
              </div>
              <div style={{ color: ink.muted, fontSize: 12.5, marginTop: 2 }}>
                {LOC_REGION_LABELS[k]}
              </div>
              <div
                className="mt-3 h-[3px] overflow-hidden rounded-full"
                style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)" }}
              >
                <div
                  style={{
                    width: `${Math.round(((counts[k] ?? 0) / railMax) * 100)}%`,
                    height: "100%",
                    background: accent,
                    opacity: active ? 0.9 : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
        {activeKeys.length === 0 && (
          <div className="pt-5" style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>
            No regional coverage yet.
          </div>
        )}
      </div>
    );
  };

  // Role legend — tiny key for the pin tiers drawn on the map.
  const RoleLegend = () => {
    const tiers: { key: NonNullable<LocPin["role"]>; label: string; r: number }[] = [
      { key: "HQ", label: "Headquarters", r: 6 },
      { key: "hub", label: "Regional hub", r: 5 },
      { key: "office", label: "Office", r: 3.5 },
      { key: "delivery", label: "Delivery centre", r: 3.5 },
      { key: "partner", label: "Partner", r: 3.5 },
    ];
    const present = tiers.filter((t) => pins.some((p) => (p.role ?? "office") === t.key));
    if (present.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        {present.map((t) => (
          <div key={t.key} className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: t.r * 2,
                height: t.r * 2,
                borderRadius: 999,
                background: accent,
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.85)" : "rgba(3,0,44,0.85)"}`,
                display: "inline-block",
              }}
            />
            <span
              style={{
                color: ink.muted,
                fontSize: fillPx(11, "kicker"),
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {t.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Shared header — free-form Aurora v2. Left rail: kicker + 60px title +
  // muted headline. Right rail: hero stat (total cities) + delta-style meta.
  const Header = ({ compact = false }: { compact?: boolean } = {}) => (
    <div className="flex items-start justify-between gap-16">
      <div style={{ maxWidth: 900 }}>
        <Kicker brand={brand as never}>
          {s(c.kicker) || `${totalRegions} regions · global footprint`}
        </Kicker>
        <div
          className="mt-4"
          style={{
            fontSize: compact ? 52 : 60,
            fontWeight: 600,
            color: ink.strong,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="mt-5"
            style={{
              fontSize: fillPx(22, "body"),
              color: ink.muted,
              letterSpacing: "-0.005em",
              lineHeight: 1.45,
              maxWidth: 780,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end text-right" style={{ minWidth: 220 }}>
        <div className="flex items-baseline gap-2">
          <span
            className="tabular-nums font-semibold"
            style={{
              fontSize: fillPx(104, "display"),
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: ink.strong,
            }}
          >
            {heroStat?.value ?? totalCities}
          </span>
          {heroStat?.unit && (
            <span
              className="tabular-nums"
              style={{ fontSize: fillPx(28, "body"), color: ink.muted, fontWeight: 600 }}
            >
              {heroStat.unit}
            </span>
          )}
        </div>
        <div
          className="mt-3 uppercase"
          style={{
            fontSize: fillPx(13, "kicker"),
            letterSpacing: "0.3em",
            color: ink.muted,
            fontWeight: 600,
          }}
        >
          {heroStat?.label ?? "Cities live"}
        </div>
        <div
          className="mt-2 uppercase tabular-nums"
          style={{
            fontSize: fillPx(14, "kicker"),
            letterSpacing: "0.24em",
            color: "var(--slide-accent-text)",
            fontWeight: 700,
          }}
        >
          ● {totalRegions} regions
        </div>
      </div>
    </div>
  );

  if (variantId === "MV-LOC-WORLD-PINS") {
    // Free-form Aurora v2 — halftone map bleeds onto the aurora, framed by
    // corner registration ticks and a role legend. RegionRail sits below.
    const tick = ink.hairline;
    const Corner = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => {
      const v: React.CSSProperties = { position: "absolute", width: 18, height: 18 };
      if (pos === "tl")
        Object.assign(v, {
          top: 0,
          left: 0,
          borderTop: `1px solid ${tick}`,
          borderLeft: `1px solid ${tick}`,
        });
      if (pos === "tr")
        Object.assign(v, {
          top: 0,
          right: 0,
          borderTop: `1px solid ${tick}`,
          borderRight: `1px solid ${tick}`,
        });
      if (pos === "bl")
        Object.assign(v, {
          bottom: 0,
          left: 0,
          borderBottom: `1px solid ${tick}`,
          borderLeft: `1px solid ${tick}`,
        });
      if (pos === "br")
        Object.assign(v, {
          bottom: 0,
          right: 0,
          borderBottom: `1px solid ${tick}`,
          borderRight: `1px solid ${tick}`,
        });
      return <span aria-hidden style={v} />;
    };
    return (
      <SlideFrame brand={brand as never} pageNumber={pageNumber}>
        <div className="relative flex h-full flex-col">
          <Header />
          <div className="relative mt-8 flex-1 overflow-hidden">
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            <div className="absolute inset-0 px-1 py-1">
              <LocWorldMap
                pins={pins}
                region="world"
                mode={mode}
                accent={accent}
                primary={primary}
                showLabels
                ariaLabel={`${title} — world map`}
              />
            </div>
          </div>
          <div className="mt-5">
            <RoleLegend />
          </div>
          <RegionRail />
        </div>
      </SlideFrame>
    );
  }

  if (variantId === "MV-LOC-WORLD-STATS") {
    const metrics = coerceMetrics(c.metrics);
    const activeMetricId = (c.activeMetricId as string) || metrics[0]?.id;
    const activeMetric = metrics.find((m) => m.id === activeMetricId);
    const usingMetric = !!activeMetric;

    // Optional region filter — array of region keys. Empty/missing = all.
    const REGION_KEY_SET: LocPin["region"][] = ["AMER", "EMEA", "APAC", "LATAM", "MEA"];
    const rawFilter = Array.isArray(c.regionFilter) ? (c.regionFilter as unknown[]) : [];
    const filterSet = new Set(
      rawFilter.filter(
        (r): r is LocPin["region"] =>
          typeof r === "string" && REGION_KEY_SET.includes(r as LocPin["region"]),
      ),
    );
    // Optional role exclusions — hide pins whose role is in this list.
    const ROLE_KEY_SET: NonNullable<LocPin["role"]>[] = [
      "HQ",
      "hub",
      "office",
      "delivery",
      "partner",
    ];
    const rawExcludeRoles = Array.isArray(c.excludeRoles) ? (c.excludeRoles as unknown[]) : [];
    const excludeRoleSet = new Set(
      rawExcludeRoles.filter(
        (r): r is NonNullable<LocPin["role"]> =>
          typeof r === "string" && ROLE_KEY_SET.includes(r as NonNullable<LocPin["role"]>),
      ),
    );
    const roleFilterActive = excludeRoleSet.size > 0;
    const regionFilteredPins =
      filterSet.size > 0 && filterSet.size < REGION_KEY_SET.length
        ? pins.filter((p) => filterSet.has(p.region))
        : pins;
    const filteredPins = roleFilterActive
      ? regionFilteredPins.filter(
          (p) => !excludeRoleSet.has((p.role ?? "office") as NonNullable<LocPin["role"]>),
        )
      : regionFilteredPins;
    const filteredCities = filteredPins.length;
    const filteredRegions = (Object.keys(LOC_REGION_LABELS) as LocPin["region"][]).filter((k) =>
      filteredPins.some((p) => p.region === k),
    ).length;
    const filterActive = filteredPins.length !== pins.length;

    // Aggregate active metric per region + global (over filtered pins).
    const metricByRegion: Partial<Record<LocPin["region"], number>> = {};
    let metricTotal = 0;
    let metricCoverage = 0; // pins with a value
    if (usingMetric) {
      for (const p of filteredPins) {
        const v = p.values?.[activeMetric!.id];
        if (Number.isFinite(v)) {
          metricByRegion[p.region] = (metricByRegion[p.region] ?? 0) + (v as number);
          metricTotal += v as number;
          metricCoverage += 1;
        }
      }
    }

    const TOP_N_OPTIONS = [5, 10, 25] as const;
    const rawTopN = Number(c.topN);
    const topN = (TOP_N_OPTIONS as readonly number[]).includes(rawTopN) ? rawTopN : 5;
    const SCALE_MODES = ["absolute", "region-percent", "global-percent"] as const;
    const rawScaleMode = typeof c.scaleMode === "string" ? c.scaleMode : "absolute";
    const scaleMode: (typeof SCALE_MODES)[number] = (SCALE_MODES as readonly string[]).includes(
      rawScaleMode,
    )
      ? (rawScaleMode as (typeof SCALE_MODES)[number])
      : "absolute";
    const topPins = usingMetric
      ? [...filteredPins]
          .filter((p) => Number.isFinite(p.values?.[activeMetric!.id]))
          .sort(
            (a, b) =>
              (b.values![activeMetric!.id] as number) - (a.values![activeMetric!.id] as number),
          )
          .slice(0, topN)
      : [];

    return (
      <SlideFrame brand={brand as never} pageNumber={pageNumber}>
        <div className="relative flex h-full gap-12">
          <div className="flex flex-1 flex-col">
            <Header compact />
            {filterActive && (
              <div
                className="mt-4 flex flex-wrap items-center gap-2"
                style={{
                  color: ink.muted,
                  fontSize: fillPx(11, "kicker"),
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--slide-accent-text)" }}>
                  Region filter
                </span>
                {(Object.keys(LOC_REGION_LABELS) as LocPin["region"][])
                  .filter((k) => filterSet.has(k))
                  .map((k) => <span key={k}>{LOC_REGION_LABELS[k]}</span>)
                  .reduce<React.ReactNode[]>((acc, node, i, arr) => {
                    acc.push(node);
                    if (i < arr.length - 1)
                      acc.push(
                        <span key={`sep-${i}`} style={{ opacity: 0.4 }}>
                          ·
                        </span>,
                      );
                    return acc;
                  }, [])}
              </div>
            )}
            <div
              data-map-export-root="world-stats"
              className="relative mt-8 flex-1 overflow-hidden"
            >
              <LocWorldMap
                pins={filteredPins}
                region="world"
                mode={mode}
                accent={accent}
                primary={primary}
                showLabels={false}
                metric={activeMetric}
                metricId={activeMetric?.id}
                scaleMode={scaleMode}
                ariaLabel={`${title} — world map${activeMetric ? ` visualizing ${activeMetric.label}${scaleMode === "region-percent" ? " (% of region)" : scaleMode === "global-percent" ? " (% of global)" : ""}` : ""}${filterActive ? ` filtered to ${filteredRegions} regions` : ""}`}
              />
              <button
                type="button"
                onClick={(e) => {
                  const root = e.currentTarget.closest(
                    '[data-map-export-root="world-stats"]',
                  ) as HTMLElement | null;
                  if (root)
                    void exportMapNodeAsPng(
                      root,
                      `${(title || "world-stats").toString().toLowerCase().replace(/\s+/g, "-")}.png`,
                      isDark ? "#03002C" : "#ffffff",
                    );
                }}
                aria-label="Export map as PNG"
                className="absolute right-0 top-0 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition hover:scale-[1.03]"
                style={{ color: ink.muted, letterSpacing: "0.24em" }}
              >
                Export PNG ↗
              </button>
            </div>
          </div>
          <div className="flex w-[520px] flex-col justify-end">
            <div className="pl-8" style={{ borderLeft: `1px solid ${ink.hairline}` }}>
              <div className="flex items-baseline justify-between">
                <div
                  style={{
                    color: "var(--slide-accent-text)",
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.3em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {usingMetric ? activeMetric!.label : "Global footprint"}
                </div>
                {usingMetric && metricCoverage < filteredPins.length && (
                  <div
                    style={{
                      color: ink.muted,
                      fontSize: fillPx(10, "kicker"),
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {metricCoverage}/{filteredPins.length} pins
                  </div>
                )}
              </div>

              {usingMetric ? (
                <>
                  <div className="mt-4">
                    <div
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(68, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {locFormatMetric(metricTotal, activeMetric)}
                    </div>
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>
                      {activeMetric!.label} · {filteredCities} cities across {filteredRegions}{" "}
                      regions{filterActive ? ` (of ${totalCities}/${totalRegions})` : ""}
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    {(Object.keys(LOC_REGION_LABELS) as LocPin["region"][])
                      .filter((k) => filteredPins.some((p) => p.region === k))
                      .map((k) => {
                        const val = metricByRegion[k] ?? 0;
                        const pct = metricTotal > 0 ? Math.round((val / metricTotal) * 100) : 0;
                        return (
                          <div key={k}>
                            <div className="flex items-baseline justify-between">
                              <div
                                style={{
                                  color: ink.strong,
                                  fontSize: fillPx(13, "kicker"),
                                  fontWeight: 600,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                }}
                              >
                                {LOC_REGION_LABELS[k]}
                              </div>
                              <div style={{ color: ink.muted, fontSize: fillPx(12, "kicker") }}>
                                {locFormatMetric(val, activeMetric)} · {pct}%
                              </div>
                            </div>
                            <div
                              className="mt-1 h-1.5 overflow-hidden rounded-full"
                              style={{
                                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: accent,
                                  opacity: 0.8,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {topPins.length > 0 && (
                    <div className="mt-6 border-t pt-4" style={{ borderColor: ink.hairline }}>
                      <div
                        style={{
                          color: ink.muted,
                          fontSize: fillPx(10, "kicker"),
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        Top {topN} locations
                        {roleFilterActive
                          ? ` · excl. ${Array.from(excludeRoleSet).join(", ")}`
                          : ""}
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {topPins.map((p) => {
                          const raw = p.values![activeMetric!.id];
                          let pctForPin: number | null = null;
                          if (scaleMode === "global-percent" && metricTotal > 0) {
                            pctForPin = (raw / metricTotal) * 100;
                          } else if (scaleMode === "region-percent") {
                            const regionSum = metricByRegion[p.region] ?? 0;
                            if (regionSum > 0) pctForPin = (raw / regionSum) * 100;
                          }
                          return (
                            <div key={p.id} className="flex items-baseline justify-between">
                              <div style={{ color: ink.strong, fontSize: fillPx(14, "kicker") }}>
                                {p.label || p.city}
                              </div>
                              <div
                                style={{
                                  color: ink.accentText,
                                  fontSize: fillPx(14, "kicker"),
                                  fontWeight: 600,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {pctForPin != null
                                  ? `${pctForPin.toFixed(1)}%`
                                  : locFormatMetric(raw, activeMetric)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : hasRegionMetrics ? (
                <div className="mt-4">
                  <RegionMetricList rows={regionMetrics} maxRows={6} />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-y-6">
                  <div>
                    <div
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(56, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {totalCities}
                    </div>
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>
                      Cities
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(56, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {totalRegions}
                    </div>
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>
                      Regions
                    </div>
                  </div>
                  {(Object.keys(LOC_REGION_LABELS) as LocPin["region"][])
                    .filter((k) => counts[k] > 0)
                    .map((k) => (
                      <div key={k}>
                        <div
                          style={{
                            color: ink.strong,
                            fontSize: fillPx(32, "figure"),
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            lineHeight: 1,
                          }}
                        >
                          {counts[k]}
                        </div>
                        <div
                          style={{
                            color: ink.muted,
                            fontSize: fillPx(12, "kicker"),
                            marginTop: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.18em",
                          }}
                        >
                          {LOC_REGION_LABELS[k]}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {narrative && (
                <div
                  className="mt-6 border-t pt-4"
                  style={{
                    borderColor: ink.hairline,
                    color: ink.muted,
                    fontSize: fillPx(15, "kicker"),
                    lineHeight: 1.45,
                  }}
                >
                  {narrative}
                </div>
              )}
            </div>
          </div>
        </div>
      </SlideFrame>
    );
  }

  if (variantId === "MV-LOC-REGION-FOCUS") {
    const regionCount = pins.filter(
      (p) => region === "world" || p.region === region || (region === "MEA" && p.region === "MEA"),
    ).length;
    return (
      <SlideFrame brand={brand as never} pageNumber={pageNumber}>
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-12">
            <Header compact />
            <div className="flex flex-col items-end text-right" style={{ minWidth: 180 }}>
              <span
                className="tabular-nums font-semibold"
                style={{
                  fontSize: fillPx(88, "display"),
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: ink.strong,
                }}
              >
                {regionCount}
              </span>
              <div
                className="mt-3 uppercase"
                style={{
                  fontSize: fillPx(12, "kicker"),
                  letterSpacing: "0.3em",
                  color: "var(--slide-accent-text)",
                  fontWeight: 700,
                }}
              >
                {region === "world" ? "Worldwide" : LOC_REGION_LABELS[region as LocPin["region"]]}
              </div>
            </div>
          </div>
          {hasRegionMetrics ? (
            <div className="mt-10 grid flex-1 gap-12" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
              <div className="relative overflow-hidden">
                <LocWorldMap
                  pins={pins}
                  region={region}
                  mode={mode}
                  accent={accent}
                  primary={primary}
                  showLabels
                  ariaLabel={`${title} — ${region === "world" ? "world" : LOC_REGION_LABELS[region as LocPin["region"]]} map`}
                />
              </div>
              <div className="pl-8" style={{ borderLeft: `1px solid ${ink.hairline}` }}>
                <div
                  style={{
                    color: "var(--slide-accent-text)",
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.3em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Region metrics
                </div>
                <div className="mt-4">
                  <RegionMetricList rows={regionMetrics} maxRows={6} />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mt-10 flex-1 overflow-hidden">
              <LocWorldMap
                pins={pins}
                region={region}
                mode={mode}
                accent={accent}
                primary={primary}
                showLabels
                ariaLabel={`${title} — ${region === "world" ? "world" : LOC_REGION_LABELS[region as LocPin["region"]]} map`}
              />
            </div>
          )}
          {narrative && (
            <div
              className="mt-8 pt-6"
              style={{
                borderTop: `1px solid ${ink.hairline}`,
                color: ink.muted,
                fontSize: fillPx(18, "body"),
                lineHeight: 1.45,
                maxWidth: 1400,
              }}
            >
              {narrative}
            </div>
          )}
        </div>
      </SlideFrame>
    );
  }

  // MV-LOC-HUB-SPOKE — free-form Aurora v2. Map bleeds onto the aurora, the
  // legend sits on a shared hairline as tiny inline swatch pills.
  return (
    <SlideFrame brand={brand as never} pageNumber={pageNumber}>
      <div className="relative flex h-full flex-col">
        <Header />
        <div className="relative mt-10 flex-1 overflow-hidden">
          <LocWorldMap
            pins={pins}
            region="world"
            mode={mode}
            accent={accent}
            primary={primary}
            showLabels
            showSpokes
            ariaLabel={`${title} — hub and spoke network map`}
          />
        </div>
        {hasRegionMetrics && (
          <div
            className="mt-8 grid gap-8 pt-5"
            style={{
              borderTop: `1px solid ${ink.hairline}`,
              gridTemplateColumns: `repeat(${Math.min(regionMetrics.length, 5)}, minmax(0, 1fr))`,
            }}
          >
            {regionMetrics.slice(0, 5).map((it, i) => {
              const delta = it.delta ?? "";
              const negative = delta.trim().startsWith("-");
              return (
                <div key={`${it.label}-${i}`}>
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(11, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 700,
                      color: "var(--slide-accent-text)",
                    }}
                  >
                    {it.region ?? it.label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <div
                      className="tabular-nums"
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(36, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 0.95,
                      }}
                    >
                      {it.value ?? (typeof it.percent === "number" ? `${it.percent}%` : "")}
                    </div>
                    {it.unit && (
                      <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>
                        {it.unit}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>
                      {it.label}
                    </div>
                    {delta && (
                      <div
                        className="uppercase tabular-nums"
                        style={{
                          fontSize: fillPx(11, "kicker"),
                          letterSpacing: "0.22em",
                          fontWeight: 700,
                          color: negative ? "#B42318" : "var(--slide-accent-text)",
                        }}
                      >
                        {delta}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div
          className="mt-8 flex items-center gap-10 pt-5"
          style={{
            borderTop: `1px solid ${ink.hairline}`,
            color: ink.muted,
            fontSize: fillPx(14, "kicker"),
            letterSpacing: "0.02em",
          }}
        >
          <span className="inline-flex items-center gap-3">
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 18px ${accent}`,
              }}
            />
            <span
              style={{
                color: ink.strong,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: fillPx(12, "kicker"),
              }}
            >
              HQ / Hub
            </span>
          </span>
          <span className="inline-flex items-center gap-3">
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: 999,
                background: accent,
                opacity: 0.75,
              }}
            />
            <span
              style={{
                color: ink.strong,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: fillPx(12, "kicker"),
              }}
            >
              Delivery office
            </span>
          </span>
          <span className="inline-flex items-center gap-3">
            <span
              style={{
                display: "inline-block",
                width: 28,
                height: 2,
                background: accent,
                opacity: 0.55,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                color: ink.strong,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: fillPx(12, "kicker"),
              }}
            >
              Follow-the-sun route
            </span>
          </span>
        </div>
      </div>
    </SlideFrame>
  );
}

registerSlideModule({
  id: "family:locations",
  variantIds: [
    "MV-LOC-WORLD-PINS",
    "MV-LOC-WORLD-STATS",
    "MV-LOC-REGION-FOCUS",
    "MV-LOC-HUB-SPOKE",
  ],
  render: ({ variant, brand, mode, ink, c, pageNumber }) =>
    renderLocationsVariant(variant.id, brand, mode, ink, c, pageNumber),
});
