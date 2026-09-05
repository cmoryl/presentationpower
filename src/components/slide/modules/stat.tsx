// Typographic statistics family — extracted from the legacy `VariantRenderer`
// switch onto the module registry. Numbers are treated as layout here: the
// numeral is the primary shape and supporting type is positioned against its
// optical box. One owner for every MV-STAT-* treatment.

import { Fragment } from "react";

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s } from "../module-kit";
import { MediaTile, Sparkline } from "../module-primitives";
import { AccentRule } from "../Connectors";
import { OrbitDisc } from "../OrbitDisc";
import { AccentTick, EDITORIAL_SERIF, moduleCardSurface } from "../flagship";
import { DisplayTitle, Kicker, StatFigure, SupportingText } from "../primitives";
import {
  isStatArrangement,
  planStatArrangement,
  statArrangementGridStyle,
  statCellStyle,
} from "@/lib/stat-arrangements";
import { fillPx, statPx, STAT_FIT_STYLE } from "@/lib/open-space-fill";
import { hexA } from "@/lib/accent-tokens";
import {
  ORBIT_CX,
  ORBIT_CY,
  ORBIT_MAX_SEGMENTS,
  ORBIT_R,
  ORBIT_VB_PAD,
  ORBIT_VB_W,
  layoutOrbitLabels,
  orbitLegendDensity,
  orbitSegmentAlpha,
} from "@/lib/orbit-label-layout";

registerSlideModule({
  id: "family:stat",
  variantIds: [
    "MV-STAT-HERO-NUMBER",
    "MV-STAT-TYPE-WALL",
    "MV-STAT-KPI-RAIL",
    "MV-STAT-TICKER-STRIP",
    "MV-STAT-SPARK-HERO",
    "MV-STAT-GAUGE-STACK",
    "MV-STAT-ORBIT",
    "MV-STAT-ACTUAL-TARGET",
    "MV-STAT-EDITORIAL-DASH",
    "MV-STAT-MOSAIC",
    "MV-STAT-IMAGE-TYPE",
    "MV-STAT-PHOTO-TRIO",
    "MV-STAT-PHOTO-BAND",
    "MV-STAT-PORTRAIT-PROOF",
  ],
  render: ({ variant, brand, pageNumber, c, ink, isDark, mode }) => {
    void mode;
    switch (variant.id) {
      case "MV-STAT-HERO-NUMBER": {
        const stat = obj(c.stat);
        const items = arr(c.items).slice(0, 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex h-full flex-col justify-center">
              <Kicker brand={brand}>{s(c.kicker, "The number that matters")}</Kicker>
              <div
                className="mt-8 grid items-end gap-20"
                style={{ gridTemplateColumns: "1.35fr 1fr" }}
              >
                <div className="min-w-0">
                  <StatFigure
                    brand={brand}
                    value={s(stat.value, "68")}
                    unit={s(stat.unit, "%")}
                    size="monumental"
                    shape="auto"
                    icon={s(stat.icon)}
                    iconSize={s(stat.iconSize)}
                  />
                  <div
                    className="mt-8"
                    style={{
                      fontSize: fillPx(40, "figure"),
                      lineHeight: 1.16,
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                      maxWidth: 900,
                    }}
                  >
                    {s(stat.label)}
                  </div>
                </div>
                <div className="min-w-0 pb-6">
                  {s(c.narrative) && (
                    <SupportingText size="lg" maxWidthPx={640}>
                      <span style={{ color: ink.body }}>{s(c.narrative)}</span>
                    </SupportingText>
                  )}
                  {items.length > 0 && (
                    <div className="mt-12">
                      {items.map((it, i) => (
                        <div
                          key={i}
                          className="flex items-baseline justify-between py-5"
                          style={{ borderTop: `1px solid ${ink.hairline}` }}
                        >
                          <div
                            className="uppercase"
                            style={{
                              fontSize: fillPx(18, "body"),
                              letterSpacing: "0.24em",
                              fontWeight: 600,
                              color: ink.muted,
                            }}
                          >
                            {s(it.label)}
                          </div>
                          <div
                            className="tabular-nums"
                            style={{
                              fontSize: fillPx(42, "figure"),
                              fontWeight: 600,
                              letterSpacing: "-0.03em",
                              color: ink.strong,
                            }}
                          >
                            {s(it.value)}
                          </div>
                        </div>
                      ))}
                      <div style={{ borderTop: `1px solid ${ink.hairline}` }} />
                    </div>
                  )}
                  {s(c.source) && (
                    <div
                      className="mt-6 uppercase"
                      style={{
                        fontSize: fillPx(15, "kicker"),
                        letterSpacing: "0.26em",
                        color: ink.faint,
                      }}
                    >
                      Source · {s(c.source)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-TYPE-WALL": {
        const items = arr(c.items).slice(0, 9);
        const cols = items.length <= 4 ? 2 : 3;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div
              className="mt-10 grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                columnGap: 72,
              }}
            >
              {items.map((it, i) => {
                // Graded sizes give the wall its rhythm — every third figure
                // steps up so the grid never reads as a table of equals.
                const emphasis = i % 3 === 0;
                return (
                  <div
                    key={i}
                    className="min-w-0 py-8"
                    style={{ borderTop: `1px solid ${i < cols ? "transparent" : ink.hairline}` }}
                  >
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: statPx(emphasis ? 116 : 86, it.value, { budget: 5 }),
                        lineHeight: 0.94,
                        fontWeight: 600,
                        letterSpacing: "-0.04em",
                        color: emphasis ? ink.strong : ink.body,
                        ...STAT_FIT_STYLE,
                      }}
                    >
                      {s(it.value)}
                      {s(it.unit) && (
                        <span
                          className="align-top font-medium"
                          style={{
                            fontSize: emphasis ? 40 : 30,
                            marginLeft: 6,
                            color: "var(--slide-accent-text)",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {s(it.unit)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-5 uppercase"
                      style={{
                        fontSize: fillPx(17, "body"),
                        letterSpacing: "0.24em",
                        fontWeight: 600,
                        color: ink.muted,
                        lineHeight: 1.3,
                        maxWidth: 380,
                      }}
                    >
                      {s(it.label)}
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-KPI-RAIL": {
        const items = arr(c.items).slice(0, 5);
        // The set's composition is authored on the slide, so the rail can become
        // a hero-led pair, a stepped staircase or an asymmetric bento without a
        // different module. `even` reproduces the classic single ruled rail.
        const plan = planStatArrangement(
          isStatArrangement(c.statArrangement) ? c.statArrangement : "even",
          items.length,
          { maxCols: 5 },
        );
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div className="slide-fill-stretch mt-14" style={statArrangementGridStyle(plan)}>
              {items.map((it, i) => {
                const delta = s(it.delta);
                const negative = delta.trim().startsWith("-");
                const cellPlan = plan.cells[i];
                return (
                  <div
                    key={i}
                    className="slide-fill-center min-w-0 px-10 first:pl-0 last:pr-0"
                    style={{
                      ...statCellStyle(cellPlan),
                      borderLeft: cellPlan.leadingRule ? `1px solid ${ink.hairline}` : "none",
                    }}
                  >

                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: statPx(104, it.value, { budget: 5 }),
                        lineHeight: 0.94,
                        fontWeight: 600,
                        letterSpacing: "-0.045em",
                        color: ink.strong,
                        ...STAT_FIT_STYLE,
                      }}
                    >
                      {s(it.value)}
                    </div>

                    {s(it.unit) && (
                      <div
                        className="mt-3 font-medium"
                        style={{
                          fontSize: fillPx(26, "body"),
                          letterSpacing: "-0.01em",
                          color: "var(--slide-accent-text)",
                        }}
                      >
                        {s(it.unit)}
                      </div>
                    )}
                    <div
                      className="mt-6"
                      style={{
                        height: 3,
                        width: 64,
                        background: `linear-gradient(90deg, ${hexA(brand.tokens.accent, 1)} 0%, ${hexA(brand.tokens.accent, 0.12)} 100%)`,
                      }}
                    />
                    <div
                      className="mt-6 uppercase"
                      style={{
                        fontSize: fillPx(17, "body"),
                        letterSpacing: "0.24em",
                        fontWeight: 600,
                        color: ink.muted,
                        lineHeight: 1.35,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    {delta && (
                      <div
                        className="mt-4 tabular-nums"
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: negative ? "#B42318" : "var(--slide-accent-text)",
                        }}
                      >
                        {delta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-TICKER-STRIP": {
        // One continuous strip: figures divided by hairlines, deltas beneath.
        const items = arr(c.items).slice(0, 6);
        const plan = planStatArrangement("ticker", items.length, { maxCols: 6 });
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div className="slide-fill-stretch mt-16" style={statArrangementGridStyle(plan)}>
              {items.map((it, i) => {
                const cellPlan = plan.cells[i];
                const delta = s(it.delta);
                const negative = delta.trim().startsWith("-");
                return (
                  <div
                    key={i}
                    className="slide-fill-center min-w-0 px-9 first:pl-0 last:pr-0"
                    style={{
                      ...statCellStyle(cellPlan),
                      borderLeft: cellPlan.leadingRule ? `1px solid ${ink.hairline}` : "none",
                    }}
                  >
                    <StatFigure
                      brand={brand}
                      value={s(it.value)}
                      unit={s(it.unit)}
                      label={s(it.label)}
                      size="lg"
                      align="start"
                      emphasis={cellPlan.emphasis}
                      revealIndex={i}
                    />
                    {delta && (
                      <div
                        className="mt-4 tabular-nums"
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: negative ? "#B42318" : "var(--slide-accent-text)",
                        }}
                      >
                        {delta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-SPARK-HERO": {
        // A monumental figure sitting on its own trend line, satellites beneath.
        const stat = obj(c.stat);
        const items = arr(c.items).slice(0, 3);
        const series = arr(c.series)
          .map((p) => Number(obj(p).value ?? p))
          .filter((n) => Number.isFinite(n));
        const trend = series.length >= 2 ? series : [12, 18, 16, 27, 31, 44, 58, 71];
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div className="mt-12 grid min-h-0 flex-1 items-center gap-16" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
              <div className="min-w-0">
                <StatFigure
                  brand={brand}
                  value={s(stat.value, "71")}
                  unit={s(stat.unit, "%")}
                  label={s(stat.label)}
                  size="monumental"
                  align="start"
                  emphasis="monumental"
                  shape="area"
                  series={trend}
                />
              </div>
              <div className="flex min-w-0 flex-col" style={{ gap: 28 }}>
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="min-w-0"
                    style={{ borderTop: `1px solid ${ink.hairline}`, paddingTop: 18 }}
                  >
                    <StatFigure
                      brand={brand}
                      value={s(it.value)}
                      unit={s(it.unit)}
                      label={s(it.label)}
                      size="sm"
                      align="start"
                      emphasis="quiet"
                      revealIndex={i + 1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-GAUGE-STACK": {
        // Percentage ratios read fastest as arcs — one per row, evenly bedded.
        const items = arr(c.items).slice(0, 4);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div
              className="slide-fill-stretch mt-14 grid items-center"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
                columnGap: 56,
              }}
            >
              {items.map((it, i) => {
                const pct = Number(String(s(it.value)).replace(/[^0-9.\-]/g, ""));
                return (
                  <div key={i} className="slide-fill-center min-w-0">
                    <StatFigure
                      brand={brand}
                      value={s(it.value)}
                      unit={s(it.unit, "%")}
                      label={s(it.label)}
                      size="lg"
                      align="center"
                      shape="arc"
                      progress={Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : 0.7}
                      revealIndex={i}
                    />
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }



      case "MV-STAT-ORBIT": {
        const stat = obj(c.stat);
        const items = arr(c.items).slice(0, ORBIT_MAX_SEGMENTS);
        const legend = orbitLegendDensity(items.length);
        const total = items.reduce((n, it) => n + (Number(it.value) || 0), 0) || 1;
        // Ring geometry + label placement/wrapping come from the shared layout
        // module (src/lib/orbit-label-layout.ts) so the clipping regression suite
        // measures exactly what this renderer draws.
        const R = ORBIT_R;
        const CX = ORBIT_CX;
        const CY = ORBIT_CY;
        const VB_PAD = ORBIT_VB_PAD;
        const VB_W = ORBIT_VB_W;
        const DISPLAY_W = 780;
        const SVG_SCALE = DISPLAY_W / VB_W;
        const circumference = 2 * Math.PI * R;
        const laidOut = layoutOrbitLabels(
          items.map((it) => ({ label: s(it.label), value: Number(it.value) || 0 })),
        );
        let acc = 0;
        const segs = laidOut.map((lab) => {
          const share = (Number(items[lab.index]?.value) || 0) / total;
          const start = acc;
          acc += share;
          return {
            i: lab.index,
            lines: lab.lines,
            pct: lab.pct,
            dash: share * circumference,
            offset: start * circumference,
            lx: lab.x,
            ly: lab.y,
            lineYs: lab.lineYs,
            fontScale: lab.fontScale,
            anchor: lab.anchor,
          };
        });

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div
              className="mt-10 grid items-center gap-16"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div className="relative flex justify-center">
                <svg
                  viewBox={`${-VB_PAD} 0 ${VB_W} 640`}
                  style={{ width: DISPLAY_W, maxWidth: "100%", overflow: "visible" }}
                >
                  <circle
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={hexA(brand.tokens.accent, isDark ? 0.16 : 0.1)}
                    strokeWidth={26}
                  />
                  {segs.map((seg) => (
                    <circle
                      key={seg.i}
                      cx={CX}
                      cy={CY}
                      r={R}
                      fill="none"
                      stroke={hexA(brand.tokens.accent, orbitSegmentAlpha(seg.i, segs.length))}
                      strokeWidth={26}
                      strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                      strokeDashoffset={-seg.offset}
                      transform={`rotate(-90 ${CX} ${CY})`}
                      strokeLinecap="butt"
                    />
                  ))}
                  {segs.map((seg) => (
                    <g key={`l${seg.i}`}>
                      <text
                        x={seg.lx}
                        y={seg.ly}
                        textAnchor={seg.anchor}
                        style={{
                          fontSize: fillPx(28, "figure"),
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          fill: ink.strong,
                        }}
                      >
                        {seg.pct}%
                      </text>
                      {seg.lines.map((line, li) => (
                        <text
                          key={li}
                          x={seg.lx}
                          y={seg.lineYs[li] ?? seg.ly + 24}
                          textAnchor={seg.anchor}
                          style={{
                            fontSize: fillPx(Math.round(15 * seg.fontScale), "body"),
                            letterSpacing: "0.14em",
                            fontWeight: 600,
                            fill: ink.muted,
                          }}
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  ))}
                </svg>
                {/* Total sits in the house circle, centred on the ring. */}
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <OrbitDisc
                    size={Math.round(300 * SVG_SCALE)}
                    accent={brand.tokens.accent}
                    cool={brand.tokens.primary}
                    isDark={isDark}
                    rings={false}
                  >
                    <div
                      className="tabular-nums leading-none"
                      style={{
                        fontSize: fillPx(Math.round(92 * SVG_SCALE), "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.04em",
                        color: ink.strong,
                      }}
                    >
                      {s(stat.value, "24.1")}
                      <span
                        style={{
                          fontSize: fillPx(Math.round(38 * SVG_SCALE), "figure"),
                          color: ink.muted,
                        }}
                      >
                        {s(stat.unit)}
                      </span>
                    </div>
                    <div
                      className="mt-2"
                      style={{
                        fontSize: fillPx(13, "body"),
                        letterSpacing: "0.24em",
                        fontWeight: 600,
                        color: ink.faint,
                      }}
                    >
                      TOTAL
                    </div>
                  </OrbitDisc>
                </div>
              </div>

              <div className="min-w-0">
                {s(stat.label) && (
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      lineHeight: 1.2,
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                      maxWidth: 640,
                    }}
                  >
                    {s(stat.label)}
                  </div>
                )}
                <div className="mt-10">
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between"
                      style={{
                        borderTop: `1px solid ${ink.hairline}`,
                        paddingTop: legend.rowPadY,
                        paddingBottom: legend.rowPadY,
                      }}
                    >
                      <div
                        style={{
                          fontSize: fillPx(legend.labelFs, "body"),
                          fontWeight: 600,
                          color: ink.body,
                        }}
                      >
                        {s(it.label)}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: fillPx(legend.valueFs, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                        }}
                      >
                        {Math.round(((Number(it.value) || 0) / total) * 100)}%
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${ink.hairline}` }} />
                </div>
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-ACTUAL-TARGET": {
        const beats = [
          { key: "actual", data: obj(c.actual), fallbackLabel: "Actual" },
          { key: "target", data: obj(c.target), fallbackLabel: "Target" },
          { key: "delta", data: obj(c.delta), fallbackLabel: "Delta" },
        ];
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div className="mt-14 flex items-start">
              {beats.map((beat, i) => {
                const isDelta = beat.key === "delta";
                return (
                  <Fragment key={beat.key}>
                    {i > 0 && (
                      <div
                        aria-hidden
                        className="flex flex-shrink-0 items-center px-8"
                        style={{ height: 200 }}
                      >
                        <span
                          style={{
                            fontSize: fillPx(64, "display"),
                            fontWeight: 400,
                            color: hexA(brand.tokens.accent, 0.55),
                            lineHeight: 1,
                          }}
                        >
                          →
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="uppercase"
                        style={{
                          fontSize: fillPx(18, "body"),
                          letterSpacing: "0.26em",
                          fontWeight: 700,
                          color: isDelta ? "var(--slide-accent-text)" : ink.muted,
                        }}
                      >
                        {beat.fallbackLabel}
                      </div>
                      <div
                        className="mt-6 tabular-nums"
                        style={{
                          fontSize: statPx(isDelta ? 168 : 148, beat.data.value, { budget: 4 }),
                          lineHeight: 0.92,
                          fontWeight: 600,
                          letterSpacing: "-0.05em",
                          color: isDelta ? "var(--slide-accent-text)" : ink.strong,
                          ...STAT_FIT_STYLE,
                        }}
                      >
                        {s(beat.data.value, "—")}
                        {s(beat.data.unit) && (
                          <span
                            className="align-top font-medium"
                            style={{ fontSize: isDelta ? 58 : 50, marginLeft: 6, color: ink.muted }}
                          >
                            {s(beat.data.unit)}
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-8"
                        style={{
                          height: isDelta ? 4 : 2,
                          width: "100%",
                          background: isDelta
                            ? `linear-gradient(90deg, ${hexA(brand.tokens.accent, 1)} 0%, ${hexA(brand.tokens.accent, 0.1)} 100%)`
                            : ink.hairline,
                        }}
                      />
                      <div
                        className="mt-6"
                        style={{
                          fontSize: fillPx(24, "body"),
                          lineHeight: 1.35,
                          color: ink.body,
                          maxWidth: 420,
                        }}
                      >
                        {s(beat.data.label)}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
            {s(c.narrative) && (
              <div className="mt-16">
                <SupportingText size="lg" maxWidthPx={1280}>
                  <span style={{ color: ink.body }}>{s(c.narrative)}</span>
                </SupportingText>
              </div>
            )}
          </SlideFrame>
        );
      }

      case "MV-STAT-EDITORIAL-DASH": {
        const items = arr(c.items).slice(0, 4);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex items-end justify-between gap-16">
              <div className="min-w-0">
                <Kicker brand={brand}>{s(c.kicker, "Performance ledger")}</Kicker>
                <DisplayTitle size="section" color={ink.strong} className="mt-5">
                  {s(c.title, variant.name)}
                </DisplayTitle>
              </div>
              {s(c.standfirst) && (
                <div
                  className="min-w-0 pb-2"
                  style={{
                    fontSize: fillPx(24, "body"),
                    lineHeight: 1.42,
                    color: ink.body,
                    maxWidth: 620,
                    fontFamily: EDITORIAL_SERIF,
                  }}
                >
                  {s(c.standfirst)}
                </div>
              )}
            </div>
            <div
              className="mt-8"
              style={{ height: 3, width: "100%", background: ink.hairlineStrong }}
            />
            <div
              className="mt-2 grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
                columnGap: 56,
              }}
            >
              {items.map((it, i) => {
                const vals = (Array.isArray(it.series) ? (it.series as unknown[]) : []).map(
                  (v) => Number(v) || 0,
                );
                return (
                  <div
                    key={i}
                    className="min-w-0 pt-10"
                    style={{
                      borderLeft: i === 0 ? "none" : `1px solid ${ink.hairline}`,
                      paddingLeft: i === 0 ? 0 : 40,
                    }}
                  >
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(16, "body"),
                        letterSpacing: "0.26em",
                        fontWeight: 700,
                        color: "var(--slide-accent-text)",
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div
                      className="mt-6 tabular-nums"
                      style={{
                        fontSize: statPx(100, it.value, { budget: 5 }),
                        lineHeight: 0.94,
                        fontWeight: 600,
                        letterSpacing: "-0.045em",
                        color: ink.strong,
                        ...STAT_FIT_STYLE,
                      }}
                    >
                      {s(it.value)}
                    </div>
                    {s(it.unit) && (
                      <div
                        className="mt-3 font-medium"
                        style={{
                          fontSize: fillPx(24, "body"),
                          color: ink.muted,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s(it.unit)}
                      </div>
                    )}
                    {vals.length > 1 && (
                      <div className="mt-8">
                        <Sparkline brand={brand} values={vals} w={360} h={78} />
                      </div>
                    )}
                    {s(it.body) && (
                      <div
                        className="mt-6"
                        style={{
                          fontSize: fillPx(22, "body"),
                          lineHeight: 1.42,
                          color: ink.body,
                          fontFamily: EDITORIAL_SERIF,
                        }}
                      >
                        {s(it.body)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-MOSAIC": {
        const items = arr(c.items).slice(0, 6);
        const [lead, ...rest] = items;
        // Asymmetry is authored, not random: one dominant figure holds the left
        // two-thirds while satellites step down in weight across an uneven grid.
        const spans = ["span 2", "span 1", "span 1", "span 2", "span 1"];
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div className="mt-10 grid gap-12" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
              <div className="min-w-0 p-12" style={moduleCardSurface(brand.tokens.accent, mode)}>
                <AccentTick accent={brand.tokens.accent} />
                <StatFigure
                  brand={brand}
                  value={s(lead?.value, "68")}
                  unit={s(lead?.unit, "%")}
                  label={s(lead?.label)}
                  size="xl"
                  shape="auto"
                  progress={(Number(lead?.percent) || 68) / 100}
                  icon={s(lead?.icon)}
                  iconSize={s(lead?.iconSize)}
                />
              </div>
              <div
                className="grid gap-8"
                style={{
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gridAutoRows: "minmax(0, 1fr)",
                }}
              >
                {rest.map((it, i) => (
                  <div
                    key={i}
                    className="relative min-w-0 overflow-hidden p-8"
                    style={{
                      ...moduleCardSurface(brand.tokens.accent, mode),
                      gridColumn: spans[i % spans.length],
                    }}
                  >
                    <AccentTick accent={brand.tokens.accent} />
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: statPx(spans[i % spans.length] === "span 2" ? 84 : 64, it.value, {
                          budget: 6,
                        }),
                        lineHeight: 0.94,
                        fontWeight: 600,
                        letterSpacing: "-0.04em",
                        color: ink.strong,
                        ...STAT_FIT_STYLE,
                      }}
                    >
                      {s(it.value)}
                      {s(it.unit) && (
                        <span
                          className="align-top font-medium"
                          style={{
                            fontSize: fillPx(28, "body"),
                            marginLeft: 4,
                            color: "var(--slide-accent-text)",
                          }}
                        >
                          {s(it.unit)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-4 uppercase"
                      style={{
                        fontSize: fillPx(15, "kicker"),
                        letterSpacing: "0.22em",
                        fontWeight: 600,
                        color: ink.muted,
                        lineHeight: 1.3,
                      }}
                    >
                      {s(it.label)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-IMAGE-TYPE": {
        const stat = obj(c.stat);
        const items = arr(c.items).slice(0, 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(stat.label, "stat-image-type"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              className="absolute inset-y-0 right-0 h-full w-[52%] rounded-none"
            />
            <div
              aria-hidden
              className="absolute inset-y-0"
              style={{
                left: "42%",
                width: "22%",
                background: `linear-gradient(90deg, ${brand.tokens.primary} 0%, ${brand.tokens.primary}99 45%, ${brand.tokens.primary}00 100%)`,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-y-0 left-0"
              style={{ width: "44%", background: brand.tokens.primary }}
            />
            <div
              data-on-media
              className="relative flex h-full flex-col justify-center text-white"
              style={{ width: "56%" }}
            >
              <Kicker brand={brand} color="rgba(255,255,255,0.72)">
                {s(c.kicker, "Field evidence")}
              </Kicker>
              <div
                className="mt-6 tabular-nums"
                style={{
                  fontSize: fillPx(300, "display"),
                  lineHeight: 0.82,
                  fontWeight: 700,
                  letterSpacing: "-0.05em",
                  color: "var(--slide-accent-text)",
                }}
              >
                {s(stat.value, "41")}
                <span style={{ fontSize: fillPx(140, "display"), marginLeft: 8 }}>
                  {s(stat.unit, "%")}
                </span>
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(40, "figure"),
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  maxWidth: 860,
                }}
              >
                {s(stat.label)}
              </div>
              {s(c.narrative) && (
                <SupportingText size="md" opacity={0.86} maxWidthPx={780} className="mt-6">
                  {s(c.narrative)}
                </SupportingText>
              )}
              {items.length > 0 && (
                <div className="mt-10 flex gap-16">
                  {items.map((it, i) => (
                    <div key={i}>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: fillPx(46, "figure"),
                          fontWeight: 600,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {s(it.value)}
                      </div>
                      <div
                        className="mt-2 uppercase"
                        style={{
                          fontSize: fillPx(15, "kicker"),
                          letterSpacing: "0.24em",
                          opacity: 0.78,
                        }}
                      >
                        {s(it.label)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SlideFrame>
        );
      }

      // ── Stat + imagery: figures composed with photography ───────────────

      case "MV-STAT-PHOTO-TRIO": {
        const items = arr(c.items).slice(0, 3);
        const cols = Math.max(2, items.length || 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div
              className="mt-10 grid gap-8"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, height: 610 }}
            >
              {items.map((it, i) => (
                <div key={i} className="relative min-w-0 overflow-hidden rounded-[22px]">
                  <MediaTile
                    brand={brand}
                    seed={s(it.mediaSeed, s(it.label, `stat-photo-${i}`))}
                    overrideUrl={s(it.mediaUrl)}
                    fit={s(it.mediaFit) || undefined}
                    focus={s(it.mediaFocus) || undefined}
                    mediaPath={s(it.mediaPath)}
                    className="absolute inset-0 h-full w-full rounded-[22px]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{
                      background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0)} 85%)`,
                    }}
                  />
                  <div
                    data-on-media
                    className="relative flex h-full flex-col justify-end p-10 text-white"
                  >
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: fillPx(120, "display"),
                        lineHeight: 0.86,
                        fontWeight: 700,
                        letterSpacing: "-0.045em",
                        color: "#FFFFFF",
                      }}
                    >
                      {s(it.value)}
                      {s(it.unit) && (
                        <span
                          className="align-top font-medium"
                          style={{
                            fontSize: fillPx(44, "figure"),
                            marginLeft: 6,
                            color: "var(--slide-accent-text)",
                          }}
                        >
                          {s(it.unit)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-5 uppercase"
                      style={{
                        fontSize: fillPx(16, "body"),
                        letterSpacing: "0.22em",
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    {s(it.body) && (
                      <div
                        className="mt-4"
                        style={{
                          fontSize: fillPx(19, "body"),
                          lineHeight: 1.45,
                          opacity: 0.88,
                          maxWidth: 380,
                        }}
                      >
                        {s(it.body)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-PHOTO-BAND": {
        const items = arr(c.items).slice(0, 4);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            {s(c.narrative) && (
              <SupportingText size="md" maxWidthPx={860} className="mt-6">
                {s(c.narrative)}
              </SupportingText>
            )}
            <div className="relative mt-10 overflow-hidden rounded-[22px]" style={{ height: 470 }}>
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, s(c.title, "stat-photo-band"))}
                overrideUrl={s(c.mediaUrl)}
                fit={s(c.mediaFit) || undefined}
                focus={s(c.mediaFocus) || undefined}
                zoom={Number(c.mediaZoom) || undefined}
                mediaPath={s(c.mediaPath)}
                className="absolute inset-0 h-full w-full rounded-[22px]"
              />
              <div
                data-on-media
                className="relative grid h-full items-end text-white"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(2, items.length)}, minmax(0, 1fr))`,
                }}
              >
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="px-10 pb-12"
                    style={{
                      borderLeft:
                        i === 0 ? undefined : `1px solid ${hexA(brand.tokens.accent, 0.42)}`,
                    }}
                  >
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: statPx(96, it.value, { budget: 5 }),
                        lineHeight: 0.94,
                        fontWeight: 700,
                        letterSpacing: "-0.045em",
                        ...STAT_FIT_STYLE,
                      }}
                    >
                      {s(it.value)}
                      {s(it.unit) && (
                        <span
                          className="align-top font-medium"
                          style={{
                            fontSize: fillPx(36, "figure"),
                            marginLeft: 4,
                            color: "var(--slide-accent-text)",
                          }}
                        >
                          {s(it.unit)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-4 uppercase"
                      style={{
                        fontSize: fillPx(15, "kicker"),
                        letterSpacing: "0.22em",
                        fontWeight: 600,
                        opacity: 0.9,
                        lineHeight: 1.3,
                      }}
                    >
                      {s(it.label)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-STAT-PORTRAIT-PROOF": {
        const items = arr(c.items).slice(0, 3);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div
              className="mt-10 grid items-stretch gap-14"
              style={{ gridTemplateColumns: "420px 1fr", height: 600 }}
            >
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, s(c.attribution, "portrait-proof"))}
                overrideUrl={s(c.mediaUrl)}
                fit={s(c.mediaFit) || undefined}
                focus={s(c.mediaFocus) || undefined}
                zoom={Number(c.mediaZoom) || undefined}
                mediaPath={s(c.mediaPath)}
                pool="portrait"
                portrait
                className="h-full w-full rounded-[22px]"
              />
              <div className="flex min-w-0 flex-col justify-start pt-2">
                <div
                  style={{
                    fontSize: fillPx(40, "figure"),
                    lineHeight: 1.24,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                    maxWidth: 820,
                  }}
                >
                  “{s(c.quote)}”
                </div>
                <div className="mt-8">
                  <div style={{ fontSize: fillPx(22, "body"), fontWeight: 600, color: ink.strong }}>
                    {s(c.attribution)}
                  </div>
                  {s(c.role) && (
                    <div
                      className="mt-2 uppercase"
                      style={{
                        fontSize: fillPx(14, "kicker"),
                        letterSpacing: "0.24em",
                        fontWeight: 600,
                        color: ink.muted,
                      }}
                    >
                      {s(c.role)}
                    </div>
                  )}
                </div>
                <AccentRule accent={brand.tokens.accent} cap fade className="mt-8" />
                <div
                  className="mt-8 grid gap-10"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
                  }}
                >
                  {items.map((it, i) => (
                    <StatFigure
                      key={i}
                      brand={brand}
                      value={s(it.value)}
                      unit={s(it.unit)}
                      label={s(it.label)}
                      size="md"
                      icon={s(it.icon)}
                      iconSize={s(it.iconSize)}
                    />
                  ))}
                </div>
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
