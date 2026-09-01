// Graph family — extracted from the legacy `VariantRenderer` switch onto the
// module registry. All chart drawing lives in ../charts (built on
// ../chart-primitives), so the on-screen build and the PPTX export share one
// geometry source and re-skin together with the pack's chart grammar.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s } from "../module-kit";
import { fillPx } from "@/lib/open-space-fill";
import { Kicker, StatFigure } from "../primitives";
import {
  AxisBarChart,
  BubbleChart,
  ComboChart,
  ConcentricRings,
  DecadeAreaChart,
  DonutBlock,
  HeatmapChart,
  LineMultiChart,
  ProgressBar,
  StackedAreaChart,
  StackedBarChart,
  Treemap,
  WaterfallChart,
} from "../charts";
import { Donut } from "../chart-primitives";

registerSlideModule({
  id: "family:graph",
  variantIds: [
    "MV-GRAPH-YEAR-SERIES",
    "MV-GRAPH-AXIS-BARS",
    "MV-GRAPH-CATEGORY-BARS",
    "MV-GRAPH-DUAL-DONUT",
    "MV-GRAPH-RINGS",
    "MV-GRAPH-TASK-CARDS",
    "MV-GRAPH-TASK-DIALS",

    "MV-GRAPH-DECADE-AREA",
    "MV-GRAPH-PERCENT-COMPARE",
    "MV-GRAPH-LINE-MULTI",
    "MV-GRAPH-STACKED-BAR",
    "MV-GRAPH-AREA-STACK",
    "MV-GRAPH-WATERFALL",
    "MV-GRAPH-BUBBLE",
    "MV-GRAPH-HEATMAP",
    "MV-GRAPH-TREEMAP",
    "MV-GRAPH-COMBO",
  ],
  render: ({ variant, brand, pageNumber, c, ink }) => {
    switch (variant.id) {
      case "MV-GRAPH-YEAR-SERIES": {
        const items = arr(c.items);
        const vals = items.map((it) => Number(it.value) || 0);
        const max = Math.max(1, ...vals);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10 grid gap-14" style={{ gridTemplateColumns: "1fr 2.4fr" }}>
              <div>
                <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
                <div
                  className="mt-6"
                  style={{
                    fontSize: fillPx(38, "figure"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {s(c.headline)}
                </div>
              </div>
              <div
                className="grid items-end gap-4"
                style={{ gridTemplateColumns: `repeat(${items.length || 1}, 1fr)`, minHeight: 520 }}
              >
                {items.map((it, i) => {
                  const v = Number(it.value) || 0;
                  const h = Math.max(20, (v / max) * 420);
                  const isLast = i === items.length - 1;
                  return (
                    <div key={i} className="flex flex-col items-center justify-end">
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: isLast ? 26 : 18,
                          fontWeight: 600,
                          color: isLast ? ink.strong : ink.muted,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(it.value)}
                        <span
                          style={{ fontSize: isLast ? 14 : 11, color: ink.faint, marginLeft: 2 }}
                        >
                          {s(it.unit)}
                        </span>
                      </div>
                      <div
                        className="mt-3 w-full"
                        style={{
                          height: h,
                          background: isLast ? "var(--slide-accent-text)" : ink.surface,
                          maxWidth: 90,
                        }}
                      />
                      <div
                        className="mt-3 uppercase tabular-nums"
                        style={{
                          fontSize: fillPx(12, "kicker"),
                          letterSpacing: "0.22em",
                          color: ink.faint,
                          fontWeight: 600,
                        }}
                      >
                        {s(it.year)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-1" style={{ height: 1, background: "rgba(10,15,28,0.2)" }} />
          </SlideFrame>
        );
      }

      case "MV-GRAPH-AXIS-BARS": {
        const bars = arr(c.bars).map((b) => ({ label: s(b.label), value: Number(b.value) || 0 }));
        const highlight = s(c.highlight);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-16">
              <AxisBarChart
                brand={brand}
                bars={bars}
                height={520}
                highlight={highlight}
                unit={s(c.unit)}
              />
            </div>
            {s(c.legend) && (
              <div className="mt-6 flex items-center gap-4">
                <div style={{ width: 14, height: 14, background: brand.tokens.accent }} />
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(16, "body"),
                    letterSpacing: "0.24em",
                    color: "color-mix(in oklab, currentColor 65%, transparent)",
                    fontWeight: 600,
                  }}
                >
                  {s(c.legend)}
                </div>
              </div>
            )}
          </SlideFrame>
        );
      }

      case "MV-GRAPH-CATEGORY-BARS": {
        const items = arr(c.items).map((it) => ({
          label: s(it.label),
          value: Number(it.value) || 0,
          unit: s(it.unit),
        }));
        const max = Math.max(1, ...items.map((it) => it.value));
        const stat = obj(c.stat);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
              <div>
                {items.map((it, i) => {
                  const pct = (it.value / max) * 100;
                  const isTop = i === 0;
                  return (
                    <div
                      key={i}
                      className="py-5"
                      style={{
                        borderTop:
                          i === 0
                            ? `2px solid ${brand.tokens.accent}`
                            : `1px solid ${ink.hairline}`,
                        borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                      }}
                    >
                      <div className="flex items-baseline justify-between mb-3">
                        <div
                          className="uppercase"
                          style={{
                            fontSize: fillPx(18, "body"),
                            letterSpacing: "0.24em",
                            color: ink.strong,
                            fontWeight: 600,
                          }}
                        >
                          {it.label}
                        </div>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: fillPx(28, "body"),
                            fontWeight: 600,
                            color: ink.strong,
                          }}
                        >
                          {it.value}
                          <span
                            style={{
                              fontSize: fillPx(16, "body"),
                              color: "var(--slide-accent-text)",
                              marginLeft: 4,
                            }}
                          >
                            {it.unit}
                          </span>
                        </div>
                      </div>
                      <div style={{ position: "relative", height: 4, background: ink.surface }}>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${pct}%`,
                            background: isTop ? "var(--slide-accent-text)" : ink.strong,
                            opacity: isTop ? 1 : 0.55,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="flex flex-col justify-center pt-8"
                style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
              >
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
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-DUAL-DONUT": {
        const items = arr(c.items).slice(0, 2);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
              {items[0] && <DonutBlock brand={brand} item={items[0]} />}
              <div style={{ background: `${ink.hairline}` }} />
              {items[1] && <DonutBlock brand={brand} item={items[1]} />}
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-RINGS": {
        const items = arr(c.items)
          .slice(0, 4)
          .map((it) => ({ label: s(it.label), value: Number(it.value) || 0, body: s(it.body) }));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="mt-10 grid gap-16 items-center"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div className="flex items-center justify-center">
                <ConcentricRings brand={brand} items={items} size={520} />
              </div>
              <div>
                {items.map((it, i) => {
                  const color = i === 0 ? brand.tokens.accent : brand.tokens.primary;
                  const opacity = i === 0 ? 1 : 0.35 + (1 - i / items.length) * 0.5;
                  return (
                    <div
                      key={i}
                      className="py-4 flex items-start gap-5"
                      style={{
                        borderTop: `1px solid ${ink.hairline}`,
                        borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                      }}
                    >
                      <div
                        style={{ width: 16, height: 16, background: color, opacity, marginTop: 8 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="flex items-baseline justify-between">
                          <div
                            style={{
                              fontSize: fillPx(22, "body"),
                              fontWeight: 600,
                              color: ink.strong,
                            }}
                          >
                            {it.label}
                          </div>
                          <div
                            className="tabular-nums"
                            style={{
                              fontSize: fillPx(22, "body"),
                              fontWeight: 600,
                              color: "var(--slide-accent-text)",
                            }}
                          >
                            {it.value}%
                          </div>
                        </div>
                        <div
                          className="mt-2"
                          style={{
                            fontSize: fillPx(16, "body"),
                            color: "color-mix(in oklab, currentColor 65%, transparent)",
                            lineHeight: 1.4,
                          }}
                        >
                          {it.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-TASK-CARDS": {
        const items = arr(c.items).slice(0, 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="slide-fill-stretch mt-12 grid gap-10"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              {items.map((it, i) => {
                const done = Number(it.done) || 0;
                const total = Math.max(1, Number(it.total) || 100);
                const pct = Math.min(100, Math.round((done / total) * 100));
                return (
                  <div
                    key={i}
                    className="flex flex-col pt-8"
                    style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                  >
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(16, "body"),
                        letterSpacing: "0.28em",
                        color: "color-mix(in oklab, currentColor 60%, transparent)",
                        fontWeight: 600,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div className="mt-6 flex items-baseline gap-3">
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: fillPx(88, "display"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        {pct}%
                      </div>
                      <div style={{ fontSize: fillPx(20, "body"), color: ink.faint }}>of 100%</div>
                    </div>
                    <div
                      className="mt-4 tabular-nums"
                      style={{ fontSize: fillPx(16, "body"), color: ink.faint }}
                    >
                      {done.toLocaleString()} / {total.toLocaleString()}
                    </div>
                    <div className="mt-6">
                      <ProgressBar brand={brand} percent={pct} />
                    </div>
                    <div
                      className="mt-6"
                      style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.45 }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      // Same content contract as MV-GRAPH-TASK-CARDS, but each panel carries a
      // dial so the share reads visually before the number is parsed.
      case "MV-GRAPH-TASK-DIALS": {
        const items = arr(c.items).slice(0, 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="slide-fill-stretch mt-10 grid gap-10"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              {items.map((it, i) => {
                const done = Number(it.done) || 0;
                const total = Math.max(1, Number(it.total) || 100);
                const pct = Math.min(100, Math.round((done / total) * 100));
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center pt-8 text-center"
                    style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                  >
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(16, "body"),
                        letterSpacing: "0.28em",
                        color: "color-mix(in oklab, currentColor 60%, transparent)",
                        fontWeight: 600,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div className="mt-8">
                      <Donut brand={brand} percent={pct} size={300} />
                    </div>
                    <div
                      className="mt-6 tabular-nums"
                      style={{ fontSize: fillPx(18, "body"), color: ink.faint }}
                    >
                      {done.toLocaleString()} / {total.toLocaleString()}
                    </div>
                    <div className="mt-4 flex w-full items-center">
                      <ProgressBar brand={brand} percent={pct} />
                    </div>
                    <div
                      className="mt-6"
                      style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.45 }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }



      case "MV-GRAPH-DECADE-AREA": {
        const series = arr(c.series).map((p) => ({
          label: s(p.label),
          value: Number(p.value) || 0,
        }));
        const callout = obj(c.callout);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>{s(c.kicker, "Trajectory")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(44, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  maxWidth: 1500,
                }}
              >
                {s(c.headline, s(c.title))}
              </div>
            </div>
            <div className="mt-12">
              <DecadeAreaChart
                brand={brand}
                series={series}
                height={520}
                calloutLabel={s(callout.year)}
                calloutNote={s(callout.note)}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-PERCENT-COMPARE": {
        const items = arr(c.items).slice(0, 5);
        // Five rows at the loose rhythm overshot the footer; tighten as rows grow.
        const dense = items.length >= 4;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className={dense ? "mt-10" : "mt-14"}>
              {items.map((it, i) => {
                const cur = Math.max(0, Math.min(100, Number(it.current) || 0));
                const bench = Math.max(0, Math.min(100, Number(it.benchmark) || 0));
                return (
                  <div key={i} className={dense ? "py-3" : "py-7"}>
                    <div className="flex items-baseline justify-between gap-8 mb-4">
                      <div
                        style={{
                          fontSize: fillPx(24, "body"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s(it.label)}
                      </div>
                      <div className="flex items-baseline gap-10">
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: fillPx(44, "figure"),
                            fontWeight: 600,
                            color: "var(--slide-accent-text)",
                            letterSpacing: "-0.025em",
                          }}
                        >
                          {cur}%
                        </div>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: fillPx(26, "body"),
                            fontWeight: 500,
                            color: ink.faint,
                          }}
                        >
                          {bench}%
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <div style={{ position: "relative", height: 6 }}>
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: `color-mix(in oklab, ${brand.tokens.accent} 10%, transparent)`,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${cur}%`,
                            background: `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.accent} 55%, transparent), ${brand.tokens.accent})`,
                          }}
                        />
                      </div>
                      <div style={{ position: "relative", height: 3 }}>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${bench}%`,
                            background: `color-mix(in oklab, ${brand.tokens.primary} 35%, transparent)`,
                          }}
                        />
                      </div>
                    </div>
                    {s(it.range) && (
                      <div
                        className="mt-3 uppercase"
                        style={{
                          fontSize: fillPx(14, "kicker"),
                          letterSpacing: "0.24em",
                          color: ink.faint,
                          fontWeight: 600,
                        }}
                      >
                        {s(it.range)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-LINE-MULTI": {
        const series = arr(c.series)
          .slice(0, 3)
          .map((p) => ({
            label: s(p.label),
            points: arr(p.points).map((v: unknown) => Number(v) || 0),
          }));
        const xLabels = arr(obj(c.axis).x).map((v: unknown) => String(v));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(42, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  maxWidth: 1500,
                }}
              >
                {s(c.headline, s(c.title))}
              </div>
            </div>
            <div className="mt-12">
              <LineMultiChart
                brand={brand}
                series={series}
                xLabels={xLabels}
                unit={s(c.unit, "%")}
                height={500}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-STACKED-BAR": {
        const segments = arr(c.segments).map((sg) => ({ label: s(sg.label) }));
        const columns = arr(c.columns).map((col) => ({
          label: s(col.label),
          values: arr(col.values).map((v: unknown) => Number(v) || 0),
        }));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-14">
              <StackedBarChart
                brand={brand}
                segments={segments}
                columns={columns}
                unit={s(c.unit)}
                height={520}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-AREA-STACK": {
        const series = arr(c.series)
          .slice(0, 4)
          .map((p) => ({
            label: s(p.label),
            points: arr(p.points).map((v: unknown) => Number(v) || 0),
          }));
        const xLabels = arr(obj(c.axis).x).map((v: unknown) => String(v));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>{s(c.kicker, "Composition")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(42, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  maxWidth: 1500,
                }}
              >
                {s(c.headline, s(c.title))}
              </div>
            </div>
            <div className="mt-12">
              <StackedAreaChart
                brand={brand}
                series={series}
                xLabels={xLabels}
                unit={s(c.unit)}
                height={500}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-WATERFALL": {
        const steps = arr(c.steps).map((st) => ({
          label: s(st.label),
          value: Number(st.value) || 0,
          kind: s(st.kind, "up") as "start" | "up" | "down" | "end",
        }));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-14">
              <WaterfallChart brand={brand} steps={steps} unit={s(c.unit)} height={540} />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-BUBBLE": {
        const axis = obj(c.axis);
        const items = arr(c.items).map((it) => ({
          label: s(it.label),
          x: Number(it.x) || 0,
          y: Number(it.y) || 0,
          size: Number(it.size) || 20,
        }));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-14">
              <BubbleChart
                brand={brand}
                items={items}
                axisX={s(axis.x, "X")}
                axisY={s(axis.y, "Y")}
                height={560}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-HEATMAP": {
        const rows = arr(c.rows).map((v: unknown) => String(v));
        const cols = arr(c.columns).map((v: unknown) => String(v));
        const cells = arr(c.cells).map((row: unknown) =>
          arr(row).map((v: unknown) => Number(v) || 0),
        );
        const scale = obj(c.scale);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            {/* Grid + legend is tall: keep the mandated title clearance, then
                  reclaim the height from flatter cells (see HeatmapChart) so the
                  legend still lands above the footer band. */}
            <div className="mt-10">
              <HeatmapChart
                brand={brand}
                rows={rows}
                cols={cols}
                cells={cells}
                min={Number(scale.min) || 0}
                max={Number(scale.max) || 100}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-TREEMAP": {
        const items = arr(c.items).map((it) => ({
          label: s(it.label),
          value: Number(it.value) || 0,
          meta: s(it.meta),
        }));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10">
              <Treemap brand={brand} items={items} height={560} />
            </div>
          </SlideFrame>
        );
      }

      case "MV-GRAPH-COMBO": {
        const bars = obj(c.bars);
        const line = obj(c.line);
        const points = arr(c.points).map((p) => ({
          label: s(p.label),
          bar: Number(p.bar) || 0,
          line: Number(p.line) || 0,
        }));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-14">
              <ComboChart
                brand={brand}
                points={points}
                barLabel={s(bars.label, "Volume")}
                barUnit={s(bars.unit)}
                lineLabel={s(line.label, "Rate")}
                lineUnit={s(line.unit, "%")}
                height={540}
              />
            </div>
          </SlideFrame>
        );
      }
      default:
        return null;
    }
  },
});
