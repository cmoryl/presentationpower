// Dashboard family — summary, donut trio, sales chart, gauges, performance,
// report cards, growth columns, breakdown and region stats. Extracted from the
// legacy `VariantRenderer` switch onto the module registry so the free-form
// "aurora" dashboard language (no plates, feathered blooms, hairline rails)
// has exactly one owner.
//
// The chart visuals themselves stay in `VariantRenderer` for now and reach this
// module through the kit primitive slots (`DashMetricViz`, `DashSeriesViz`,
// `SummaryStatCard`) so both the legacy switch and this family draw the same
// geometry.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s, toNums, type Item } from "../module-kit";
import { DashMetricViz, DashSeriesViz, Sparkline, SummaryStatCard } from "../module-primitives";
import { Kicker, StatFigure } from "../primitives";
import { ProgressBar } from "../charts";
import { useSlideInk } from "../SlideChrome";
import { fillPx } from "@/lib/open-space-fill";

/**
 * Percent from an authored field. Accepts numbers and strings the inspector
 * writes ("62", "62%", "62.5 %"); anything unparseable stays 0 rather than
 * NaN, which used to collapse gauges to an empty track.
 */
function pct(raw: unknown): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// Free-form breakdown row. Feathered left-to-right accent gradient with no
// track plate; the highlight row adds a radial halo and an accent stroke tip
// at the value edge.
function FreeformBreakdownRow({
  label,
  value,
  unit,
  delta,
  negative,
  widthPct,
  bloom,
}: {
  label: string;
  value: string;
  unit: string;
  delta: string;
  negative: boolean;
  widthPct: number;
  bloom?: boolean;
}) {
  const ink = useSlideInk();
  const height = bloom ? 68 : 52;
  return (
    <div className="relative py-6" style={{ borderBottom: `1px solid ${ink.hairline}` }}>
      <div className="flex items-baseline justify-between mb-3">
        <div
          className="uppercase"
          style={{
            fontSize: bloom ? 15 : 13,
            letterSpacing: "0.26em",
            color: bloom ? "var(--slide-accent-text)" : ink.strong,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className="tabular-nums"
            style={{
              fontSize: bloom ? 44 : 32,
              fontWeight: 600,
              color: ink.strong,
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {value}
          </span>
          {unit && (
            <span
              style={{
                fontSize: bloom ? 22 : 16,
                color: "var(--slide-accent-text)",
                fontWeight: 500,
              }}
            >
              {unit}
            </span>
          )}
          {delta && (
            <span
              className="uppercase tabular-nums ml-2"
              style={{
                fontSize: fillPx(12, "kicker"),
                letterSpacing: "0.24em",
                color: negative ? "#E53D2E" : "var(--slide-accent-text)",
                fontWeight: 700,
              }}
            >
              {delta}
            </span>
          )}
        </div>
      </div>
      <div className="relative w-full" style={{ height }}>
        {/* Feathered gradient row — the accent bloom itself */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${Math.max(4, Math.min(100, widthPct))}%`,
            background: bloom
              ? "linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 55%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 30%, transparent) 55%, color-mix(in oklab, var(--slide-accent-text) 8%, transparent) 90%, transparent 100%)"
              : "linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 24%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 10%, transparent) 65%, transparent 100%)",
            filter: bloom ? "blur(0.4px)" : "none",
          }}
        />
        {/* Radial halo + accent stroke tip on the highlight row */}
        {bloom && (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: `calc(${Math.max(4, Math.min(100, widthPct))}% - 90px)`,
                top: "50%",
                width: 220,
                height: 220,
                transform: "translateY(-50%)",
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--slide-accent-text) 40%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 12%, transparent) 45%, transparent 75%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            <div
              data-accent-glow
              aria-hidden
              style={{
                position: "absolute",
                left: `calc(${Math.max(4, Math.min(100, widthPct))}% - 1px)`,
                top: 0,
                width: 2,
                height: "100%",
                background: "var(--slide-accent-text)",
                boxShadow:
                  "0 0 14px 2px color-mix(in oklab, var(--slide-accent-text) 55%, transparent)",
                zIndex: 1,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Free-form report item. Reuses the MV-KPI-DASHBOARD language: kicker,
// hero numeral, delta line, no plate/border. Bloom variant adds a radial
// halo behind the numeral to establish primary reading.
function FreeformReportItem({
  brand,
  item,
  bloom,
}: {
  brand: Parameters<typeof Kicker>[0]["brand"];
  item: Item;
  bloom?: boolean;
}) {
  const ink = useSlideInk();
  const delta = s(item.delta);
  const negative = delta.trim().startsWith("-");
  const meta = s(item.meta, negative ? "Reduction" : "Growth");
  return (
    <div className="relative">
      {bloom && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -60,
            top: -20,
            width: 360,
            height: 360,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--slide-accent-text) 32%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 10%, transparent) 45%, transparent 75%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Contrast fix: the negative delta tint used to be the raw brand Red,
            which drops to ~1:1 against a bright aurora plate in dark chrome.
            Route it through ink.onSurface so the "reduction" signal keeps its
            hue but always meets AA against the surface it renders on. */}
        <Kicker brand={brand} color={negative ? ink.onSurface("#E53D2E") : undefined}>
          {meta}
        </Kicker>
        <div
          className="mt-6 tabular-nums"
          style={{
            fontSize: bloom ? 132 : 108,
            fontWeight: 600,
            color: ink.strong,
            letterSpacing: "-0.04em",
            lineHeight: 0.9,
          }}
        >
          {delta || s(item.value)}
        </div>
        <div
          className="mt-6"
          style={{
            fontSize: fillPx(22, "body"),
            color: ink.muted,
            lineHeight: 1.4,
            letterSpacing: "-0.005em",
            maxWidth: 520,
          }}
        >
          {s(item.label)}
        </div>
        {toNums(item.series).length > 0 && (
          <div className="mt-8">
            <Sparkline brand={brand} values={toNums(item.series)} h={72} />
          </div>
        )}
      </div>
    </div>
  );
}

registerSlideModule({
  id: "family:dashboard",
  variantIds: [
    "MV-DASH-SUMMARY",
    "MV-DASH-DONUT-TRIO",
    "MV-DASH-SALES-CHART",
    "MV-DASH-GAUGE-ROW",
    "MV-DASH-PERFORMANCE",
    "MV-DASH-REPORT-CARDS",
    "MV-DASH-GROWTH-COLUMNS",
    "MV-DASH-BREAKDOWN",
    "MV-DASH-REGION-STATS",
  ],
  render: ({ variant, brand, pageNumber, c, dash, ink }) => {
    switch (variant.id) {
      case "MV-DASH-SUMMARY": {
        const primary = obj(c.primary);
        const secondary = obj(c.secondary);
        const balance = obj(c.balance);
        const bItems = arr(balance.items);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="slide-fill-stretch mt-10 grid"
              style={{
                gridTemplateColumns:
                  dash.flow === "bands" || dash.flow === "ribbonBottom" ? "1fr" : dash.columns,
                gap: 56 * dash.gap,
              }}
            >
              <div
                className="flex flex-col justify-center gap-10"
                style={{ order: dash.reverse ? 2 : 1 }}
              >
                <SummaryStatCard
                  brand={brand}
                  label={s(primary.label)}
                  value={s(primary.value)}
                  unit={s(primary.unit)}
                  series={toNums(primary.series)}
                />
                <SummaryStatCard
                  brand={brand}
                  label={s(secondary.label)}
                  value={s(secondary.value)}
                  unit={s(secondary.unit)}
                  series={toNums(secondary.series)}
                />
              </div>
              <div style={{ order: dash.reverse ? 1 : 2 }}>
                <Kicker brand={brand}>Balance</Kicker>
                <div className="mt-8">
                  <StatFigure
                    brand={brand}
                    value={s(balance.value)}
                    unit={s(balance.unit)}
                    label={s(balance.label)}
                    size="xl"
                    icon={s(balance.icon)}
                    iconSize={s(balance.iconSize)}
                  />
                </div>
                <div className="mt-10">
                  {bItems.map((it, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between py-5"
                      style={{
                        borderTop: `1px solid ${ink.hairline}`,
                        borderBottom:
                          i === bItems.length - 1 ? `1px solid ${ink.hairline}` : "none",
                      }}
                    >
                      <div
                        className="uppercase"
                        style={{
                          fontSize: fillPx(18, "body"),
                          letterSpacing: "0.24em",
                          color: "color-mix(in oklab, currentColor 60%, transparent)",
                          fontWeight: 600,
                        }}
                      >
                        {s(it.label)}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: fillPx(32, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(it.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-DONUT-TRIO": {
        // Free-form Aurora v2. Each donut is a hairline track ring + accent
        // arc with soft glow. A feathered radial halo blooms BEHIND the donut
        // so it reads as a floating bloom rather than a puck. Center numeral
        // floats with no plate; label/body sit as free text on the aurora.
        const items = arr(c.items).slice(0, 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div style={{ maxWidth: 900 }}>
              <Kicker brand={brand}>{s(c.kicker, "Portfolio")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(52, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
            </div>
            <div
              className="slide-fill-stretch mt-12 grid"
              style={{
                // The donut trio is always ONE row of three — a look's
                // quadrant flow must never wrap it to 2 + 1.
                gridTemplateColumns: `repeat(${Math.max(1, items.length || 1)}, 1fr)`,
                gap: 64 * dash.gap,
              }}
            >
              {items.map((it, i) => (
                <div
                  key={i}
                  className="flex h-full flex-col items-center justify-evenly gap-3 text-center"
                >
                  <DashMetricViz
                    brand={brand}
                    kind={dash.chart}
                    percent={pct(it.value)}
                    size={280}
                    bloom={i === 0}
                    value={s(it.value)}
                    unit={s(it.unit)}
                  />
                  <div
                    className="mt-8 uppercase"
                    style={{
                      fontSize: fillPx(15, "kicker"),
                      letterSpacing: "0.28em",
                      color: ink.strong,
                      fontWeight: 700,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    className="mt-3"
                    style={{
                      fontSize: fillPx(17, "body"),
                      lineHeight: 1.45,
                      color: ink.muted,
                      maxWidth: 320,
                    }}
                  >
                    {s(it.body)}
                  </div>
                </div>
              ))}
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-SALES-CHART": {
        // Free-form aurora rebuild — no panel, no card, no border around the
        // chart. Feathered accent gradient fill, gently glowing line, thin
        // confident strokes, generous whitespace. Content (kicker, headline,
        // stat) sits directly on the aurora above and below the chart, on
        // the same left-aligned rail so it reads as one composition.
        const series = arr(c.series).map((p) => ({
          label: s(p.label),
          value: Number(p.value) || 0,
        }));
        const stat = obj(c.stat);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex items-start justify-between gap-16">
              <div style={{ maxWidth: 780 }}>
                <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
                <div
                  className="mt-4"
                  style={{
                    fontSize: fillPx(60, "display"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.02,
                  }}
                >
                  {s(c.title, variant.name)}
                </div>
                {s(c.headline) && (
                  <div
                    className="mt-5"
                    style={{
                      fontSize: fillPx(22, "body"),
                      color: ink.muted,
                      letterSpacing: "-0.005em",
                      lineHeight: 1.45,
                      maxWidth: 680,
                    }}
                  >
                    {s(c.headline)}
                  </div>
                )}
              </div>
              {s(stat.value) && (
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
                      {s(stat.value)}
                    </span>
                    {s(stat.unit) && (
                      <span
                        className="font-medium"
                        style={{
                          fontSize: fillPx(36, "figure"),
                          color: "var(--slide-accent-text)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(stat.unit)}
                      </span>
                    )}
                  </div>
                  {s(stat.label) && (
                    <div
                      className="mt-3 uppercase"
                      style={{
                        fontSize: fillPx(13, "kicker"),
                        letterSpacing: "0.3em",
                        color: ink.muted,
                        fontWeight: 600,
                        maxWidth: 260,
                      }}
                    >
                      {s(stat.label)}
                    </div>
                  )}
                  {s(stat.delta) && (
                    <div
                      className="mt-2 uppercase tabular-nums"
                      style={{
                        fontSize: fillPx(14, "kicker"),
                        letterSpacing: "0.24em",
                        color: "var(--slide-accent-text)",
                        fontWeight: 700,
                      }}
                    >
                      ▲ {s(stat.delta)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="slide-fill-stretch mt-12 flex flex-col justify-center">
              <DashSeriesViz brand={brand} kind={dash.chart} series={series} height={560} />
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-GAUGE-ROW": {
        // Free-form Aurora v2. Each gauge = hairline semicircular track +
        // accent-glowing stroke arc. A feathered halo blooms behind the arc
        // terminus so it reads as an accent bloom, not a puck. Central value
        // and label sit as free text — no plates, no dividers between gauges.
        const items = arr(c.items).slice(0, 5);
        const cols = items.length || 1;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div style={{ maxWidth: 900 }}>
              <Kicker brand={brand}>{s(c.kicker, "Signals")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(52, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
            </div>
            <div
              className="slide-fill-stretch mt-10 grid"
              style={{
                gridTemplateColumns:
                  dash.flow === "bands" || dash.flow === "quadrant"
                    ? `repeat(${Math.min(cols, dash.metricColumns)}, 1fr)`
                    : `repeat(${cols}, 1fr)`,
                gap: 32 * dash.gap,
              }}
            >
              {items.map((it, i) => (
                <div key={i} className="flex flex-col items-center justify-center">
                  <DashMetricViz
                    brand={brand}
                    kind={dash.chart}
                    percent={Number(it.value) || 0}
                    size={240}
                    bloom={i === 0}
                    value={s(it.value)}
                    unit={s(it.unit)}
                  />
                  <div
                    className="mt-4 uppercase text-center"
                    style={{
                      fontSize: fillPx(14, "kicker"),
                      letterSpacing: "0.26em",
                      color: ink.strong,
                      fontWeight: 700,
                      maxWidth: 220,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  {s(it.body) && (
                    <div
                      className="mt-2 text-center"
                      style={{
                        fontSize: fillPx(14, "kicker"),
                        lineHeight: 1.4,
                        color: ink.muted,
                        maxWidth: 220,
                      }}
                    >
                      {s(it.body)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-PERFORMANCE": {
        // Free-form Aurora v2 rebuild. Bars sit directly on the aurora — no
        // panel, no axis cage, no gridlines. Feathered accent gradient fill
        // (matches FreeformAreaChart bloom), soft glow + halo on the highlight
        // bar, legend as inline swatch pills on a shared hairline.
        const bars = arr(c.bars).map((b) => ({ label: s(b.label), value: Number(b.value) || 0 }));
        const highlight = s(c.highlight);
        const stat = obj(c.stat);
        const legend = arr(c.legend);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex items-start justify-between gap-16">
              <div style={{ maxWidth: 780 }}>
                <Kicker brand={brand}>{s(c.kicker, "Performance")}</Kicker>
                <div
                  className="mt-4"
                  style={{
                    fontSize: fillPx(60, "display"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.02,
                  }}
                >
                  {s(c.title, variant.name)}
                </div>
                {s(c.headline) && (
                  <div
                    className="mt-5"
                    style={{
                      fontSize: fillPx(22, "body"),
                      color: ink.muted,
                      letterSpacing: "-0.005em",
                      lineHeight: 1.45,
                      maxWidth: 680,
                    }}
                  >
                    {s(c.headline)}
                  </div>
                )}
              </div>
              {s(stat.value) && (
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
                      {s(stat.value)}
                    </span>
                    {s(stat.unit) && (
                      <span
                        className="font-medium"
                        style={{
                          fontSize: fillPx(36, "figure"),
                          color: "var(--slide-accent-text)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(stat.unit)}
                      </span>
                    )}
                  </div>
                  {s(stat.label) && (
                    <div
                      className="mt-3 uppercase"
                      style={{
                        fontSize: fillPx(13, "kicker"),
                        letterSpacing: "0.3em",
                        color: ink.muted,
                        fontWeight: 600,
                        maxWidth: 260,
                      }}
                    >
                      {s(stat.label)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-12">
              <DashSeriesViz
                brand={brand}
                kind={dash.chart}
                series={bars}
                height={520}
                highlight={highlight}
              />
            </div>
            {legend.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-3">
                {legend.map((l, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      data-accent-glow
                      aria-hidden
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background:
                          i === 0
                            ? "var(--slide-accent-text)"
                            : `color-mix(in oklab, var(--slide-accent-text) ${Math.max(20, 55 - i * 12)}%, transparent)`,
                        boxShadow:
                          i === 0
                            ? "0 0 12px 2px color-mix(in oklab, var(--slide-accent-text) 55%, transparent)"
                            : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: fillPx(18, "body"),
                        color: ink.strong,
                        fontWeight: 600,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {s(l.label)}
                    </span>
                    {s(l.value) && (
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: fillPx(18, "body"),
                          color: ink.faint,
                          fontWeight: 500,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {s(l.value)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SlideFrame>
        );
      }

      case "MV-DASH-REPORT-CARDS": {
        // Free-form Aurora v2. No card plate, no border. Two items sit as free
        // typography on the aurora, separated by a single vertical hairline.
        // The first item halos (its numeral carries a radial bloom) so the
        // primary reading dominates. Reuses the MV-KPI-DASHBOARD language.
        const items = arr(c.items).slice(0, 2);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div style={{ maxWidth: 900 }}>
              <Kicker brand={brand}>{s(c.kicker, "Report")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(52, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
            </div>
            <div
              className="slide-fill-stretch mt-14 grid items-center"
              style={{
                gridTemplateColumns:
                  dash.flow === "bands" || dash.flow === "ribbonBottom" ? "1fr" : "1fr 1px 1fr",
                gap: 80 * dash.gap,
              }}
            >
              {items[0] && <FreeformReportItem brand={brand} item={items[0]} bloom />}
              <div style={{ background: ink.hairline }} />
              {items[1] && <FreeformReportItem brand={brand} item={items[1]} />}
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-GROWTH-COLUMNS": {
        // Free-form Aurora v2. Columns sit on a single hairline baseline that
        // spans the whole slide — no plate, no per-column border, no rounded
        // pill. Feathered multi-stop bloom on every column; the last column
        // gets a radial halo behind it + full-strength bloom + soft glow so
        // the "now" reading carries without any label.
        const items = arr(c.items).slice(0, 5);
        const vals = items.map((it) => Number(it.value) || 0);
        const max = Math.max(1, ...vals);
        // Collision fix: cap chart height and add generous bottom padding so
        // the year row + note text clear the SlideFrame footer with margin.
        const CHART_H = 300;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex items-start justify-between gap-16">
              <div style={{ maxWidth: 780 }}>
                <Kicker brand={brand}>{s(c.kicker, "Trajectory")}</Kicker>
                <div
                  className="mt-4"
                  style={{
                    fontSize: fillPx(52, "figure"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.02,
                  }}
                >
                  {s(c.title, variant.name)}
                </div>
                {s(c.headline) && (
                  <div
                    className="mt-5"
                    style={{
                      fontSize: fillPx(20, "body"),
                      color: ink.muted,
                      letterSpacing: "-0.005em",
                      lineHeight: 1.45,
                      maxWidth: 680,
                    }}
                  >
                    {s(c.headline)}
                  </div>
                )}
              </div>
            </div>
            <div
              className="mt-10 grid items-end gap-10"
              style={{
                gridTemplateColumns: `repeat(${items.length || 1}, 1fr)`,
                borderBottom: `1px solid ${ink.hairline}`,
                paddingBottom: 0,
                marginBottom: 96,
              }}
            >
              {items.map((it, i) => {
                const v = Number(it.value) || 0;
                const h = Math.max(48, (v / max) * CHART_H);
                const isLast = i === items.length - 1;
                const bloom = isLast
                  ? `linear-gradient(180deg,
                    color-mix(in oklab, var(--slide-accent-text) 72%, transparent) 0%,
                    color-mix(in oklab, var(--slide-accent-text) 38%, transparent) 35%,
                    color-mix(in oklab, var(--slide-accent-text) 12%, transparent) 70%,
                    color-mix(in oklab, var(--slide-accent-text) 0%, transparent) 100%)`
                  : `linear-gradient(180deg,
                    color-mix(in oklab, var(--slide-accent-text) 30%, transparent) 0%,
                    color-mix(in oklab, var(--slide-accent-text) 14%, transparent) 45%,
                    color-mix(in oklab, var(--slide-accent-text) 4%, transparent) 80%,
                    color-mix(in oklab, var(--slide-accent-text) 0%, transparent) 100%)`;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-end"
                    style={{ position: "relative" }}
                  >
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: fillPx(44, "figure"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.025em",
                        lineHeight: 1,
                      }}
                    >
                      {s(it.value)}
                      <span
                        style={{
                          fontSize: fillPx(22, "body"),
                          color: "var(--slide-accent-text)",
                          marginLeft: 4,
                        }}
                      >
                        {s(it.unit)}
                      </span>
                    </div>
                    <div
                      className="mt-4 w-full"
                      style={{
                        position: "relative",
                        height: h,
                        maxWidth: 220,
                      }}
                    >
                      {/* Feathered column bloom */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: bloom,
                          filter: isLast ? "blur(0.5px)" : "none",
                        }}
                      />
                      {/* Radial halo bloom behind the last column */}
                      {isLast && (
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: -40,
                            width: 260,
                            height: 260,
                            transform: "translateX(-50%)",
                            background:
                              "radial-gradient(circle, color-mix(in oklab, var(--slide-accent-text) 40%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 12%, transparent) 45%, transparent 75%)",
                            pointerEvents: "none",
                            zIndex: -1,
                          }}
                        />
                      )}
                      {/* Thin accent stroke on the top edge of the last column */}
                      {isLast && (
                        <div
                          data-accent-glow
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: 0,
                            height: 2,
                            background: "var(--slide-accent-text)",
                            boxShadow:
                              "0 0 14px 2px color-mix(in oklab, var(--slide-accent-text) 55%, transparent)",
                          }}
                        />
                      )}
                    </div>
                    <div
                      className="mt-4 uppercase"
                      style={{
                        fontSize: fillPx(13, "kicker"),
                        letterSpacing: "0.26em",
                        color: isLast ? "var(--slide-accent-text)" : ink.faint,
                        fontWeight: 700,
                      }}
                    >
                      {s(it.year)}
                    </div>
                    {s(it.note) && (
                      <div
                        className="mt-1 text-center"
                        style={{
                          fontSize: fillPx(13, "kicker"),
                          lineHeight: 1.35,
                          color: ink.muted,
                          maxWidth: 200,
                        }}
                      >
                        {s(it.note)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-BREAKDOWN": {
        // Free-form Aurora v2. Horizontal rows stacked on a single vertical
        // hairline rail on the left. Each row = feathered left-to-right
        // multi-stop accent gradient (no track plate, no rounded pill). Top
        // row is the highlight: halo + accent stroke tip at the value edge.
        const items = arr(c.items).slice(0, 5);
        const rowVals = items.map((it) => Math.max(0, Number(it.percent) || Number(it.value) || 1));
        const max = Math.max(1, ...rowVals);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div style={{ maxWidth: 900 }}>
              <Kicker brand={brand}>{s(c.kicker, "Breakdown")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(52, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
            </div>
            <div
              className="slide-fill-stretch mt-12 flex flex-col justify-between"
              style={{ borderLeft: `1px solid ${ink.hairline}`, paddingLeft: 32 }}
            >
              {items.map((it, i) => {
                const v = rowVals[i];
                const widthPct = (v / max) * 100;
                const isTop = i === 0;
                const delta = s(it.delta);
                const negative = delta.trim().startsWith("-");
                return (
                  <FreeformBreakdownRow
                    key={i}
                    label={s(it.label, "—")}
                    value={s(it.value, `${v.toFixed(1)}%`)}
                    unit={s(it.unit)}
                    delta={delta}
                    negative={negative}
                    widthPct={widthPct}
                    bloom={isTop}
                  />
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-DASH-REGION-STATS": {
        const stat = obj(c.stat);
        const items = arr(c.items).slice(0, 6);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
              <div className="flex min-w-0 flex-col justify-center">
                <StatFigure
                  brand={brand}
                  value={s(stat.value)}
                  unit={s(stat.unit)}
                  label={s(stat.label)}
                  size="xl"
                  icon={s(stat.icon)}
                  iconSize={s(stat.iconSize)}
                />
              </div>
              <div>
                {items.map((it, i) => {
                  const pct = Math.max(0, Math.min(100, Number(it.percent) || 0));
                  const delta = s(it.delta);
                  const negative = delta.trim().startsWith("-");
                  return (
                    <div
                      key={i}
                      className="py-5"
                      style={{
                        borderTop: `1px solid ${ink.hairline}`,
                        borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                      }}
                    >
                      <div className="flex items-baseline justify-between">
                        <div
                          style={{
                            fontSize: fillPx(26, "body"),
                            fontWeight: 600,
                            color: ink.strong,
                          }}
                        >
                          {s(it.label)}
                        </div>
                        <div
                          className="uppercase"
                          style={{
                            fontSize: fillPx(16, "body"),
                            letterSpacing: "0.24em",
                            fontWeight: 600,
                            color: negative ? "#B42318" : "var(--slide-accent-text)",
                          }}
                        >
                          {delta}
                        </div>
                      </div>
                      <div className="mt-3">
                        <ProgressBar brand={brand} percent={pct} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SlideFrame>
        );
      }

      default:
        return null;
    }
  },
});
