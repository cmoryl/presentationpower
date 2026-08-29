// Chart components for the graph family.
//
// Every chart here is presentational: it takes the brand plus plain data and
// draws through the shared primitives in ./chart-primitives, so the on-screen
// build and the PPTX export read the same geometry. Extracted from the legacy
// VariantRenderer switch.

import { Fragment, useId } from "react";

import type { BrandMode } from "@/lib/taxonomy";
import { useSlideInk } from "./SlideChrome";
import { useChartStyle } from "./ChartStyleContext";
import { useChartLabelCap, useChartLabelStride, useOpenSpaceFill } from "./OpenSpaceFill";
import { chartLabelSize, fillPx } from "@/lib/open-space-fill";
import { hexA } from "@/lib/accent-tokens";
import {
  barWidth,
  labelType,
  lineDash,
  lineWeight,
  ringBand,
  seriesPath,
} from "@/lib/chart-styles";
import {
  AiryDefs,
  ChartField,
  Donut,
  SeriesArea,
  SeriesMarkers,
  StyledBar,
  barValueLabel,
} from "./chart-primitives";
import { Kicker } from "./primitives";
import { type Item, s } from "./module-kit";
import { Sparkline } from "./module-primitives";

export function ProgressBar({ brand: _brand, percent }: { brand: BrandMode; percent: number }) {
  const ink = useSlideInk();
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ position: "relative", height: 4, background: ink.trackFill, flex: 1 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${p}%`,
          background: "var(--slide-accent-text)",
        }}
      />
    </div>
  );
}

// ── Graph helpers (Batch 4) ────────────────────────────────────────────
export function AxisBarChart({
  brand: _brand,
  bars,
  height = 480,
  highlight,
  unit,
}: {
  brand: BrandMode;
  bars: { label: string; value: number }[];
  height?: number;
  highlight?: string;
  unit?: string;
  bare?: boolean;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1720;
  const h = height;
  const padL = 90,
    padR = 40,
    padT = 40,
    padB = 60;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(bars.length, 1);
  const barW = barWidth(cs, slot);
  const ticks = 4;
  const hiValue = bars.find((b) => b.label === highlight)?.value;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <AiryDefs id={id} />
      <ChartField
        cs={cs}
        ink={ink}
        x0={padL}
        x1={w - padR}
        top={padT}
        bottom={h - padB}
        rows={ticks}
      />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = padT + (chartH / ticks) * i;
        const val = niceMax * (1 - i / ticks);
        return (
          <text
            key={i}
            x={padL - 14}
            y={y + 5}
            textAnchor="end"
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.faint}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {val.toFixed(0)}
            {unit || ""}
          </text>
        );
      })}
      {bars.map((b, i) => {
        const bh = (b.value / niceMax) * chartH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = h - padB - bh;
        const isHi = highlight ? b.label === highlight : false;
        const vl = barValueLabel(cs, y, bh);
        return (
          <g key={i}>
            <StyledBar
              cs={cs}
              ink={ink}
              x={x}
              y={y}
              w={barW}
              h={bh}
              fill={isHi ? `url(#${id}-airy)` : `url(#${id}-glass)`}
              emphasis={isHi}
            />
            {isHi && hiValue !== undefined && !vl.hide && (
              <text
                x={x + barW / 2}
                y={vl.y}
                textAnchor="middle"
                fontSize={chartLabelSize(22, fillScale)}
                fontWeight={600}
                fill={vl.inside ? ink.strong : ink.text}
                style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
              >
                {b.value}
                {unit || ""}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={h - padB + 30}
              textAnchor="middle"
              fontSize={chartLabelSize(14, fillScale)}
              fill={ink.faint}
              style={{ ...lt, fontVariantNumeric: "tabular-nums" }}
            >
              {capLabel(b.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DonutBlock({ brand, item }: { brand: BrandMode; item: Item }) {
  const ink = useSlideInk();
  return (
    <div className="flex flex-col items-center text-center">
      <Kicker brand={brand}>{s(item.meta, "Snapshot")}</Kicker>
      <div className="mt-6">
        <Donut brand={brand} percent={Number(item.value) || 0} size={340} />
      </div>
      <div
        className="mt-8 uppercase"
        style={{
          fontSize: fillPx(20, "body"),
          letterSpacing: "0.28em",
          color: ink.text,
          fontWeight: 600,
        }}
      >
        {s(item.label)}
      </div>
      <div
        className="mt-4"
        style={{ fontSize: fillPx(20, "body"), lineHeight: 1.45, color: ink.muted, maxWidth: 480 }}
      >
        {s(item.body)}
      </div>
    </div>
  );
}

export function ConcentricRings({
  brand: _brand,
  items,
  size = 480,
}: {
  brand: BrandMode;
  items: { label: string; value: number }[];
  size?: number;
}) {
  const ink = useSlideInk();
  const cs = useChartStyle();
  const stroke = ringBand(cs, size / 2) * 0.55;
  const gap = 8 + cs.ringGap;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {items.map((it, i) => {
        const r = (size - stroke) / 2 - i * (stroke + gap);
        if (r <= 0) return null;
        const circ = 2 * Math.PI * r;
        const dash = (Math.max(0, Math.min(100, it.value)) / 100) * circ;
        const isPrimary = i === 0;
        return (
          <g key={i}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ink.trackFill}
              strokeWidth={cs.grid === "none" ? stroke * 0.4 : stroke}
              opacity={cs.grid === "none" ? 0.6 : 1}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={isPrimary ? "var(--slide-accent-text)" : ink.strong}
              strokeOpacity={isPrimary ? 1 : Math.max(0.35, 0.85 - i * 0.15)}
              strokeWidth={stroke}
              strokeLinecap={cs.ringCap === "round" ? "round" : "butt"}
              strokeDasharray={`${dash} ${circ - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function DecadeAreaChart({
  brand: _brand,
  series,
  height = 480,
  calloutLabel,
  calloutNote,
}: {
  brand: BrandMode;
  series: { label: string; value: number }[];
  height?: number;
  calloutLabel?: string;
  calloutNote?: string;
  bare?: boolean;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1720;
  const h = height;
  const padL = 30,
    padR = 30,
    padT = 40,
    padB = 60;
  const vals = series.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const step = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const pts = series.map((p, i) => ({
    x: padL + i * step,
    y: padT + (h - padT - padB) * (1 - (p.value - min) / range),
  }));
  const linePath = seriesPath(cs, pts);
  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaPath =
    linePath && lastPt && firstPt
      ? `${linePath} L${lastPt.x.toFixed(1)},${h - padB} L${firstPt.x.toFixed(1)},${h - padB} Z`
      : "";
  const highlightIdx = series.findIndex((p) => p.label === calloutLabel);
  const hi = highlightIdx >= 0 ? pts[highlightIdx] : null;
  const showEvery = series.length > 10 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <AiryDefs id={id} />
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} />
      <SeriesArea cs={cs} d={areaPath} id={id} gradient={`url(#${id}-airy)`} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={lineWeight(cs, 2)}
        strokeDasharray={lineDash(cs)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SeriesMarkers cs={cs} pts={pts} />
      {series.map((p, i) =>
        i % showEvery === 0 || i === series.length - 1 ? (
          <text
            key={i}
            x={pts[i]?.x}
            y={h - padB + 30}
            textAnchor="middle"
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.faint}
            style={{ ...lt, fontVariantNumeric: "tabular-nums" }}
          >
            {capLabel(p.label)}
          </text>
        ) : null,
      )}
      {hi && (
        <g>
          <circle cx={hi.x} cy={hi.y} r={4.5} fill="var(--slide-accent-text)" />
          <line
            x1={hi.x}
            y1={hi.y - 12}
            x2={hi.x}
            y2={Math.max(hi.y - 96, 12)}
            stroke={ink.hairlineStrong}
            strokeWidth={1}
          />
          <text
            x={hi.x}
            y={Math.max(hi.y - 108, 20)}
            textAnchor="middle"
            fontSize={chartLabelSize(18, fillScale)}
            fontWeight={600}
            fill={ink.strong}
            style={{ letterSpacing: "-0.01em" }}
          >
            {calloutLabel}
          </text>
          <text
            x={hi.x}
            y={Math.max(hi.y - 84, 44)}
            textAnchor="middle"
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.muted}
          >
            {calloutNote}
          </text>
        </g>
      )}
    </svg>
  );
}

// ── Extended graph helpers ───────────────────────────────────────────────
export function LineMultiChart({
  brand,
  series,
  xLabels,
  unit,
  height = 480,
}: {
  brand: BrandMode;
  series: { label: string; points: number[] }[];
  xLabels: string[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const w = 1720,
    h = height;
  const padL = 90,
    padR = 40,
    padT = 30,
    padB = 80;
  const cols = [brand.tokens.accent, brand.tokens.primary, ink.faint];
  const all = series.flatMap((s) => s.points);
  const max = Math.max(1, ...all);
  const niceMax = Math.ceil(max / 10) * 10 || max;
  const chartH = h - padT - padB;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const step = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const ticks = 4;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        <ChartField
          cs={cs}
          ink={ink}
          x0={padL}
          x1={w - padR}
          top={padT}
          bottom={h - padB}
          rows={ticks}
        />
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + (chartH / ticks) * i;
          const val = niceMax * (1 - i / ticks);
          return (
            <text
              key={i}
              x={padL - 12}
              y={y + 6}
              textAnchor="end"
              fontSize={chartLabelSize(16, fillScale)}
              fill={ink.faint}
            >
              {Math.round(val)}
              {unit || ""}
            </text>
          );
        })}
        {series.map((sr, si) => {
          const pts = sr.points.map((v, i) => ({
            x: padL + i * step,
            y: padT + chartH * (1 - v / niceMax),
          }));
          const d = seriesPath(cs, pts);
          return (
            <g key={si}>
              <path
                d={d}
                fill="none"
                stroke={cols[si] || ink.strong}
                strokeWidth={lineWeight(cs, si === 0 ? 3 : 2)}
                strokeDasharray={si === 0 ? lineDash(cs) : lineDash(cs) || "8 7"}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={si === 0 ? 1 : 0.85}
              />
              <SeriesMarkers
                cs={cs}
                pts={pts}
                color={cols[si] || ink.strong}
                base={si === 0 ? 5 : 4}
              />
            </g>
          );
        })}
        {xLabels.map((lb, i) => (
          <text
            key={i}
            x={padL + i * step}
            y={h - padB + 34}
            textAnchor="middle"
            fontSize={chartLabelSize(16, fillScale)}
            fill={ink.faint}
            style={lt}
          >
            {lb}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6">
        {series.map((sr, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 22,
                height: 3,
                background: cols[i] || ink.strong,
              }}
            />
            <span style={{ fontWeight: 600, color: ink.strong }}>{sr.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedBarChart({
  brand,
  segments,
  columns,
  unit,
  height = 480,
}: {
  brand: BrandMode;
  segments: { label: string }[];
  columns: { label: string; values: number[] }[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1720,
    h = height;
  const padL = 90,
    padR = 40,
    padT = 30,
    padB = 80;
  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(columns.length, 1);
  const barW = barWidth(cs, slot);
  const cols = [brand.tokens.accent, brand.tokens.primary, ink.faint];
  const ticks = 4;
  const segFill = (si: number) =>
    si === 0 ? `url(#${id}-airy)` : si === 1 ? `url(#${id}-glass)` : `url(#${id}-glass-mute)`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        <AiryDefs id={id} />
        <ChartField
          cs={cs}
          ink={ink}
          x0={padL}
          x1={w - padR}
          top={padT}
          bottom={h - padB}
          rows={ticks}
        />
        {columns.map((col, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          let yCursor = h - padB;
          const topIdx = col.values.reduce((acc, v, idx) => (v > 0 ? idx : acc), 0);
          return (
            <g key={i}>
              {col.values.map((v, si) => {
                const bh = (v / niceMax) * chartH;
                yCursor -= bh;
                const y = yCursor;
                if (si === topIdx)
                  return (
                    <StyledBar
                      key={si}
                      cs={cs}
                      ink={ink}
                      x={x}
                      y={y}
                      w={barW}
                      h={bh}
                      fill={segFill(si)}
                      emphasis={si === 0}
                    />
                  );
                return (
                  <rect
                    key={si}
                    x={x}
                    y={y}
                    width={barW}
                    height={bh}
                    fill={segFill(si)}
                    stroke="var(--slide-accent-text)"
                    strokeOpacity={si === 0 ? 0.5 : 0.2}
                    strokeWidth={1}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={h - padB + 32}
                textAnchor="middle"
                fontSize={chartLabelSize(16, fillScale)}
                fill={ink.faint}
                style={lt}
              >
                {col.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-6">
        {segments.map((sg, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                background: cols[i] || ink.strong,
                opacity: i === 0 ? 0.75 : 0.45 - i * 0.1,
                border: `1px solid ${ink.hairlineStrong}`,
              }}
            />
            <span style={{ fontWeight: 600, color: ink.strong }}>{sg.label}</span>
          </div>
        ))}
        {unit && (
          <div style={{ fontSize: fillPx(14, "kicker"), color: ink.faint, marginLeft: "auto" }}>
            Units: {unit}
          </div>
        )}
      </div>
    </div>
  );
}

export function StackedAreaChart({
  brand,
  series,
  xLabels,
  unit,
  height = 480,
}: {
  brand: BrandMode;
  series: { label: string; points: number[] }[];
  xLabels: string[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const w = 1720,
    h = height;
  const padL = 60,
    padR = 40,
    padT = 30,
    padB = 80;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const totals = Array.from({ length: n }, (_, i) =>
    series.reduce((a, s) => a + (s.points[i] || 0), 0),
  );
  const max = Math.max(1, ...totals);
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const step = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const cols = [brand.tokens.accent, brand.tokens.primary, ink.faint, ink.hairlineStrong];
  let stacks = Array(n).fill(0) as number[];
  const layers = series.map((sr, si) => {
    const bottom = stacks.slice();
    const top = stacks.map((v, i) => v + (sr.points[i] || 0));
    stacks = top;
    const topPts = top.map((v, i) => ({
      x: padL + i * step,
      y: padT + chartH * (1 - v / niceMax),
    }));
    const botPts = bottom
      .map((v, i) => ({ x: padL + i * step, y: padT + chartH * (1 - v / niceMax) }))
      .reverse();
    const d = `${seriesPath(cs, topPts)} ${botPts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} Z`;
    return { d, color: cols[si] || ink.strong, si };
  });
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} />
        {layers.map((l) => (
          <path
            key={l.si}
            d={l.d}
            fill={l.color}
            opacity={l.si === 0 ? 0.32 : Math.max(0.08, 0.22 - l.si * 0.05)}
            stroke={l.color}
            strokeOpacity={l.si === 0 ? 0.7 : 0.35}
            strokeWidth={lineWeight(cs, 1.5)}
          />
        ))}
        {xLabels.map((lb, i) => (
          <text
            key={i}
            x={padL + i * step}
            y={h - padB + 34}
            textAnchor="middle"
            fontSize={chartLabelSize(16, fillScale)}
            fill={ink.faint}
            style={lt}
          >
            {lb}
          </text>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-6">
        {series.map((sr, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                background: cols[i] || ink.strong,
                opacity: i === 0 ? 0.95 : 0.7 - i * 0.15,
              }}
            />
            <span style={{ fontWeight: 600, color: ink.strong }}>{sr.label}</span>
          </div>
        ))}
        {unit && (
          <div style={{ fontSize: fillPx(14, "kicker"), color: ink.faint, marginLeft: "auto" }}>
            Units: {unit}
          </div>
        )}
      </div>
    </div>
  );
}

export function WaterfallChart({
  brand: _brand,
  steps,
  unit,
  height = 500,
}: {
  brand: BrandMode;
  steps: { label: string; value: number; kind: "start" | "up" | "down" | "end" }[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const w = 1720,
    h = height;
  const padL = 90,
    padR = 40,
    padT = 40,
    padB = 90;
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(steps.length, 1);
  const barW = barWidth(cs, slot);

  let running = 0;
  const bars = steps.map((st) => {
    if (st.kind === "start" || st.kind === "end") {
      running = st.value;
      return { base: 0, top: st.value, kind: st.kind, label: st.label, value: st.value };
    }
    const base = running;
    running += st.value;
    return {
      base: Math.min(base, running),
      top: Math.max(base, running),
      kind: st.kind,
      label: st.label,
      value: st.value,
    };
  });
  const maxVal = Math.max(1, ...bars.map((b) => b.top));
  const niceMax = Math.ceil(maxVal * 1.1);
  const scale = (v: number) => padT + chartH * (1 - v / niceMax);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} rows={4} />

      {bars.map((b, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const y = scale(b.top);
        const bh = scale(b.base) - scale(b.top);
        // Glass encoding: start/end = strong glass; up = accent bloom; down = muted glass.
        let fillOpacity = 0.22;
        let strokeOpacity = 0.55;
        let fill: string = "var(--slide-accent-text)";
        if (b.kind === "up") {
          fillOpacity = 0.42;
          strokeOpacity = 0.7;
        } else if (b.kind === "down") {
          fillOpacity = 0.12;
          strokeOpacity = 0.3;
          fill = ink.strong;
        }
        const prev = bars[i - 1];
        return (
          <g key={i}>
            {prev && (
              <line
                x1={x - (slot - barW)}
                y1={scale(
                  prev.kind === "start" || prev.kind === "end"
                    ? prev.top
                    : b.kind === "up"
                      ? b.base
                      : b.top,
                )}
                x2={x}
                y2={scale(
                  prev.kind === "start" || prev.kind === "end"
                    ? prev.top
                    : b.kind === "up"
                      ? b.base
                      : b.top,
                )}
                stroke={ink.hairline}
                strokeDasharray="3 3"
              />
            )}
            <g opacity={strokeOpacity < 0.4 ? 0.85 : 1}>
              <StyledBar
                cs={cs}
                ink={ink}
                x={x}
                y={y}
                w={barW}
                h={Math.max(2, bh)}
                fill={fill}
                fillOpacity={fillOpacity}
                emphasis={b.kind === "up" || b.kind === "end"}
              />
            </g>
            <text
              x={x + barW / 2}
              y={y - 12}
              textAnchor="middle"
              fontSize={chartLabelSize(16, fillScale)}
              fontWeight={600}
              fill={b.kind === "down" ? ink.muted : ink.text}
              style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
            >
              {b.kind === "up" ? "+" : b.kind === "down" ? "−" : ""}
              {Math.abs(b.value).toFixed(1)}
              {unit || ""}
            </text>
            <text
              x={x + barW / 2}
              y={h - padB + 30}
              textAnchor="middle"
              fontSize={chartLabelSize(13, fillScale)}
              fill={ink.faint}
              style={lt}
            >
              {capLabel(b.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BubbleChart({
  brand,
  items,
  axisX,
  axisY,
  height = 560,
}: {
  brand: BrandMode;
  items: { label: string; x: number; y: number; size: number }[];
  axisX: string;
  axisY: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const w = 1720,
    h = height;
  const padL = 110,
    padR = 60,
    padT = 40,
    padB = 90;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxSize = Math.max(1, ...items.map((i) => i.size));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={i}
          x1={padL}
          y1={padT + chartH * t}
          x2={w - padR}
          y2={padT + chartH * t}
          stroke={ink.hairline}
          strokeWidth={1}
        />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={`v${i}`}
          x1={padL + chartW * t}
          y1={padT}
          x2={padL + chartW * t}
          y2={h - padB}
          stroke={ink.hairline}
          strokeWidth={1}
        />
      ))}
      <line
        x1={padL}
        y1={h - padB}
        x2={w - padR}
        y2={h - padB}
        stroke={ink.hairlineStrong}
        strokeWidth={1}
      />
      <line
        x1={padL}
        y1={padT}
        x2={padL}
        y2={h - padB}
        stroke={ink.hairlineStrong}
        strokeWidth={1}
      />
      {items.map((it, i) => {
        const cx = padL + (it.x / 100) * chartW;
        const cy = padT + (1 - it.y / 100) * chartH;
        const r = 20 + (it.size / maxSize) * 60;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="var(--slide-accent-text)" opacity={0.28} />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--slide-accent-text)"
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fontSize={chartLabelSize(22, fillScale)}
              fontWeight={700}
              fill={ink.strong}
            >
              {it.label}
            </text>
          </g>
        );
      })}
      <text
        x={w / 2}
        y={h - 24}
        textAnchor="middle"
        fontSize={chartLabelSize(16, fillScale)}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}
      >
        {axisX} →
      </text>
      <text
        x={30}
        y={h / 2}
        textAnchor="middle"
        fontSize={chartLabelSize(16, fillScale)}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}
        transform={`rotate(-90 30 ${h / 2})`}
      >
        {axisY} →
      </text>
    </svg>
  );
}

export function HeatmapChart({
  brand,
  rows,
  cols,
  cells,
  min,
  max,
}: {
  brand: BrandMode;
  rows: string[];
  cols: string[];
  cells: number[][];
  min: number;
  max: number;
}) {
  const ink = useSlideInk();
  const range = Math.max(1, max - min);
  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `160px repeat(${cols.length}, minmax(0, 1fr))`, gap: 4 }}
      >
        <div />
        {cols.map((c, i) => (
          <div
            key={i}
            className="text-center uppercase"
            style={{
              fontSize: fillPx(14, "kicker"),
              letterSpacing: "0.24em",
              color: ink.faint,
              fontWeight: 600,
              paddingBottom: 8,
            }}
          >
            {c}
          </div>
        ))}
        {rows.map((r, ri) => (
          <Fragment key={ri}>
            <div
              className="pr-4 flex items-center justify-end uppercase"
              style={{
                fontSize: fillPx(14, "kicker"),
                letterSpacing: "0.2em",
                color: ink.strong,
                fontWeight: 600,
              }}
            >
              {r}
            </div>
            {cols.map((_, ci) => {
              const v = cells[ri]?.[ci] ?? 0;
              const t = Math.max(0, Math.min(1, (v - min) / range));
              return (
                <div
                  key={ci}
                  style={{
                    aspectRatio: "2.35 / 1",
                    background: brand.tokens.accent,
                    opacity: 0.15 + t * 0.85,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{ fontSize: fillPx(22, "body"), fontWeight: 700, color: ink.strong }}
                  >
                    {v}
                  </span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span
          className="uppercase"
          style={{
            fontSize: fillPx(11, "kicker"),
            letterSpacing: "0.24em",
            color: ink.faint,
            fontWeight: 600,
          }}
        >
          Low
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            background: `linear-gradient(90deg, ${hexA(brand.tokens.accent, 0.133)}, ${brand.tokens.accent})`,
          }}
        />
        <span
          className="uppercase"
          style={{
            fontSize: fillPx(11, "kicker"),
            letterSpacing: "0.24em",
            color: ink.faint,
            fontWeight: 600,
          }}
        >
          High
        </span>
        <span style={{ fontSize: fillPx(12, "kicker"), color: ink.faint }}>
          {min}–{max}
        </span>
      </div>
    </div>
  );
}

export function Treemap({
  brand,
  items,
  height = 560,
}: {
  brand: BrandMode;
  items: { label: string; value: number; meta?: string }[];
  height?: number;
}) {
  const capLabel = useChartLabelCap();
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  // Simple squarified layout: sort desc, slice vertically then horizontally alternately.
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const w = 1720;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    value: number;
    meta?: string;
  }[] = [];
  let x = 0,
    y = 0,
    remW = w,
    remH = height;
  let remainingTotal = total;
  let vertical = true;
  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    const share = it.value / remainingTotal;
    const isLast = i === sorted.length - 1;
    if (isLast) {
      rects.push({ x, y, w: remW, h: remH, label: it.label, value: it.value, meta: it.meta });
      break;
    }
    if (vertical) {
      const rw = remW * share;
      rects.push({ x, y, w: rw, h: remH, label: it.label, value: it.value, meta: it.meta });
      x += rw;
      remW -= rw;
    } else {
      const rh = remH * share;
      rects.push({ x, y, w: remW, h: rh, label: it.label, value: it.value, meta: it.meta });
      y += rh;
      remH -= rh;
    }
    remainingTotal -= it.value;
    vertical = !vertical;
  }
  const cols = [
    brand.tokens.accent,
    brand.tokens.primary,
    ink.muted,
    ink.faint,
    ink.hairlineStrong,
  ];
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      {rects.map((r, i) => (
        <g key={i}>
          <rect
            x={r.x + 4}
            y={r.y + 4}
            width={Math.max(0, r.w - 8)}
            height={Math.max(0, r.h - 8)}
            fill={cols[i] || ink.strong}
            opacity={i === 0 ? 1 : 0.9}
          />
          <text
            x={r.x + 24}
            y={r.y + 42}
            fontSize={r.w > 380 ? 26 : 18}
            fontWeight={700}
            fill={ink.strong}
            style={{ letterSpacing: "-0.01em" }}
          >
            {capLabel(r.label)}
          </text>
          {/* The share sits a full cap-height below the label baseline so the
              two never collide in narrow tiles. */}
          <text
            x={r.x + 24}
            y={r.y + (r.w > 380 ? 98 : 78)}
            fontSize={r.w > 380 ? 40 : 24}
            fontWeight={700}
            fill={ink.strong}
            style={{ letterSpacing: "-0.02em" }}
          >
            {r.value}%
          </text>
          {r.meta && r.w > 260 && r.h > 160 && (
            <text
              x={r.x + 24}
              y={r.y + (r.w > 380 ? 136 : 112)}
              fontSize={chartLabelSize(16, fillScale)}
              fill={ink.muted}
            >
              {r.meta}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function ComboChart({
  brand,
  points,
  barLabel,
  barUnit,
  lineLabel,
  lineUnit,
  height = 520,
}: {
  brand: BrandMode;
  points: { label: string; bar: number; line: number }[];
  barLabel: string;
  barUnit?: string;
  lineLabel: string;
  lineUnit?: string;
  height?: number;
}) {
  const capLabel = useChartLabelCap();
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const w = 1720,
    h = height;
  const padL = 100,
    padR = 100,
    padT = 30,
    padB = 90;
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(points.length, 1);
  const barW = slot * 0.5;
  const barMax = Math.max(1, ...points.map((p) => p.bar));
  const lineMax = Math.max(1, ...points.map((p) => p.line));
  const niceBar = Math.ceil(barMax * 1.15);
  const niceLine = Math.ceil(lineMax * 1.05);
  const pts = points.map(
    (p, i) =>
      [padL + i * slot + slot / 2, padT + chartH * (1 - p.line / niceLine)] as [number, number],
  );
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const ticks = 4;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + (chartH / ticks) * i;
          const bv = niceBar * (1 - i / ticks);
          const lv = niceLine * (1 - i / ticks);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={ink.hairline} strokeWidth={1} />
              <text
                x={padL - 12}
                y={y + 6}
                textAnchor="end"
                fontSize={chartLabelSize(14, fillScale)}
                fill={ink.faint}
              >
                {bv.toFixed(1)}
                {barUnit || ""}
              </text>
              <text
                x={w - padR + 12}
                y={y + 6}
                textAnchor="start"
                fontSize={chartLabelSize(14, fillScale)}
                fill="var(--slide-accent-text)"
              >
                {Math.round(lv)}
                {lineUnit || ""}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const bh = (p.bar / niceBar) * chartH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = h - padB - bh;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={bh}
                rx={3}
                fill="var(--slide-accent-text)"
                fillOpacity={0.18}
                stroke="var(--slide-accent-text)"
                strokeOpacity={0.45}
                strokeWidth={1}
              />
              <text
                x={x + barW / 2}
                y={h - padB + 32}
                textAnchor="middle"
                fontSize={chartLabelSize(16, fillScale)}
                fill={ink.faint}
                style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
              >
                {capLabel(p.label)}
              </text>
            </g>
          );
        })}
        <path
          d={d}
          fill="none"
          stroke="var(--slide-accent-text)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={6} fill="var(--slide-accent-text)" />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6">
        <div
          className="flex items-center gap-2"
          style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
        >
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              background: brand.tokens.primary,
              opacity: 0.85,
            }}
          />
          <span style={{ fontWeight: 600, color: ink.strong }}>{barLabel}</span>
        </div>
        <div
          className="flex items-center gap-2"
          style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
        >
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 3,
              background: brand.tokens.accent,
            }}
          />
          <span style={{ fontWeight: 600, color: ink.strong }}>{lineLabel}</span>
        </div>
      </div>
    </div>
  );
}
