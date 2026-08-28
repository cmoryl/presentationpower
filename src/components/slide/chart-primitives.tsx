// Shared chart primitives.
//
// The plot field, bar silhouette, series fill/markers, accent gradient defs and
// the donut dial are the only places charts read the per-skin chart grammar
// (src/lib/chart-styles.ts), so every dashboard, graph and gauge re-skins
// together. Extracted from the legacy VariantRenderer so the graph family and
// the renderer share one implementation instead of two.

import { useId } from "react";

import type { BrandMode } from "@/lib/taxonomy";
import { useSlideInk } from "./SlideChrome";
import { chartLabelSize, fillPx } from "@/lib/open-space-fill";
import {
  barOrnament,
  barPath,
  gridBands,
  gridLines,
  markerPath,
  markerSize,
  ringBand,
  type ChartStyle,
} from "@/lib/chart-styles";
import { useChartStyle } from "./ChartStyleContext";



// Shared feathered accent gradient — drawn as a page-integrated free-form
// fill. No panels, no boxes. Every chart references `url(#<id>-airy)`.
export function AiryDefs({ id }: { id: string }) {
  return (
    <defs>
      {/* Highlighted / accented bars: soft accent bloom, top-heavy */}
      <linearGradient id={`${id}-airy`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.55} />
        <stop offset="55%" stopColor="var(--slide-accent-text)" stopOpacity={0.22} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0.04} />
      </linearGradient>
      {/* Frosted glass fill for baseline/neutral bars — mode-aware via accent */}
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.16} />
        <stop offset="60%" stopColor="var(--slide-accent-text)" stopOpacity={0.08} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0.02} />
      </linearGradient>
      {/* Muted glass for tertiary segments */}
      <linearGradient id={`${id}-glass-mute`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.08} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

export type ChartInk = ReturnType<typeof useSlideInk>;

/** Plot field: tint bands, rules, axis ticks and frame, in the pack's language. */
export function ChartField({
  cs,
  ink,
  x0,
  x1,
  top,
  bottom,
  rows = 4,
}: {
  cs: ChartStyle;
  ink: ChartInk;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  rows?: number;
}) {
  const bands = gridBands(cs, top, bottom, rows);
  const lines = gridLines(cs, top, bottom, rows);
  const ticks = cs.grid === "ticks";
  return (
    <g>
      {bands.map((b, i) => (
        <rect
          key={`b${i}`}
          x={x0}
          y={b.y}
          width={x1 - x0}
          height={b.h}
          fill={ink.trackFill}
          opacity={0.5}
        />
      ))}
      {lines.map((l, i) => (
        <line
          key={`l${i}`}
          x1={x0}
          y1={l.y}
          x2={x1}
          y2={l.y}
          stroke={ink.hairline}
          strokeWidth={l.width}
          strokeDasharray={l.dash}
          opacity={l.opacity}
        />
      ))}
      {ticks &&
        [1, 2, 3, 4].map((i) => {
          const y = bottom - ((bottom - top) * i) / 5;
          return (
            <line
              key={`t${i}`}
              x1={x0}
              y1={y}
              x2={x0 + 14}
              y2={y}
              stroke={ink.hairlineStrong}
              strokeWidth={1.4}
            />
          );
        })}
      {cs.grid === "frame" && (
        <rect
          x={x0}
          y={top}
          width={x1 - x0}
          height={bottom - top}
          fill="none"
          stroke={ink.hairline}
          strokeWidth={1}
        />
      )}
      {(cs.axis === "baseline" || cs.axis === "boxed" || cs.axis === "spine") && (
        <line
          x1={x0}
          y1={bottom}
          x2={x1}
          y2={bottom}
          stroke={cs.axis === "spine" ? ink.strong : ink.hairlineStrong}
          strokeWidth={cs.axis === "spine" ? 2.5 : 1}
        />
      )}
      {(cs.axis === "spine" || cs.axis === "boxed") && (
        <line
          x1={x0}
          y1={top}
          x2={x0}
          y2={bottom}
          stroke={ink.hairlineStrong}
          strokeWidth={cs.axis === "spine" ? 2.5 : 1}
        />
      )}
      {cs.axis === "floating" && (
        <line
          x1={x0}
          y1={bottom + 10}
          x2={x1}
          y2={bottom + 10}
          stroke={ink.hairline}
          strokeWidth={1}
          strokeDasharray="3 6"
        />
      )}
    </g>
  );
}

/** A single column drawn in the pack's bar language, with its ornaments. */
export function StyledBar({
  cs,
  ink,
  x,
  y,
  w,
  h,
  fill,
  fillOpacity,
  accent,
  emphasis = false,
}: {
  cs: ChartStyle;
  ink: ChartInk;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  /** Optional opacity for solid-colour fills (waterfall encodes state this way). */
  fillOpacity?: number;
  accent?: string;
  emphasis?: boolean;
}) {
  const orn = barOrnament(cs, x, y, w, h);
  const outline = cs.bar === "ghost";
  const stroke = accent ?? "var(--slide-accent-text)";
  const maskId = useId().replace(/:/g, "");
  return (
    <g>
      {orn.cut && (
        <defs>
          <mask id={`${maskId}-cut`} maskUnits="userSpaceOnUse">
            <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="#fff" />
            <rect
              x={orn.cut.x - 2}
              y={orn.cut.y}
              width={orn.cut.w + 4}
              height={orn.cut.h}
              fill="#000"
            />
          </mask>
        </defs>
      )}
      {orn.drop && (
        <rect
          x={orn.drop.x}
          y={orn.drop.y}
          width={orn.drop.w}
          height={orn.drop.h}
          fill={ink.trackFill}
          opacity={0.7}
        />
      )}
      <path
        d={barPath(cs, x, y, w, h)}
        fill={outline ? (emphasis ? fill : "transparent") : fill}
        fillOpacity={outline ? 0.35 : (fillOpacity ?? 1)}
        stroke={outline ? stroke : undefined}
        strokeWidth={outline ? 1.6 : undefined}
        mask={orn.cut ? `url(#${maskId}-cut)` : undefined}
      />

      {orn.cap && (
        <rect x={orn.cap.x} y={orn.cap.y} width={orn.cap.w} height={orn.cap.h} fill={stroke} />
      )}
      {emphasis && !outline && cs.bar !== "pin" && (
        <rect x={x} y={y} width={w} height={2} fill={stroke} />
      )}
    </g>
  );
}

/** Where the value label sits for this language, relative to the column top. */
export function barValueLabel(
  cs: ChartStyle,
  y: number,
  h: number,
): { y: number; hide: boolean; inside: boolean } {
  if (cs.valueLabel === "none") return { y, hide: true, inside: false };
  if (cs.valueLabel === "inside" && h > 60) return { y: y + 34, hide: false, inside: true };
  if (cs.valueLabel === "end") return { y: y - 22, hide: false, inside: false };
  return { y: y - 12, hide: false, inside: false };
}

/**
 * Area fill under a series, in the pack's language: airy gradient, flat wash,
 * diagonal hatch, halftone dot screen, or nothing at all.
 */
export function SeriesArea({
  cs,
  d,
  id,
  gradient,
}: {
  cs: ChartStyle;
  d: string;
  id: string;
  /** Existing gradient url for the "gradient" language. */
  gradient: string;
}) {
  if (!d || cs.area === "none") return null;
  if (cs.area === "gradient") return <path d={d} fill={gradient} />;
  if (cs.area === "flat") return <path d={d} fill="var(--slide-accent-text)" fillOpacity={0.16} />;
  const pid = `${id}-${cs.area}`;
  return (
    <>
      <defs>
        {cs.area === "hatch" ? (
          <pattern
            id={pid}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(38)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="var(--slide-accent-text)"
              strokeWidth="2.2"
              strokeOpacity={0.34}
            />
          </pattern>
        ) : (
          <pattern id={pid} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.7" fill="var(--slide-accent-text)" fillOpacity={0.38} />
          </pattern>
        )}
      </defs>
      <path d={d} fill={`url(#${pid})`} />
    </>
  );
}


/** Series markers in the pack's marker language. */
export function SeriesMarkers({
  cs,
  pts,
  color = "var(--slide-accent-text)",
  base = 5,
}: {
  cs: ChartStyle;
  pts: { x: number; y: number }[];
  color?: string;
  base?: number;
}) {
  const size = markerSize(cs, base);
  if (!size) return null;
  const hollow = cs.marker === "hollow";
  const line = cs.marker === "tick";
  return (
    <g>
      {pts.map((p, i) => (
        <path
          key={i}
          d={markerPath(cs, p.x, p.y, size)}
          fill={hollow || line ? "none" : color}
          stroke={hollow || line ? color : undefined}
          strokeWidth={hollow || line ? 2 : undefined}
        />
      ))}
    </g>
  );
}

export function Donut({
  brand: _brand,
  percent,
  size = 260,
}: {
  brand: BrandMode;
  percent: number;
  size?: number;
}) {
  const ink = useSlideInk();
  const cs = useChartStyle();
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = ringBand(cs, size / 2);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  // Segmented dials: the pack's ringGap breaks the arc into ticks of band.
  const segmented = cs.ringGap > 0;
  const segLen = Math.max(6, circ / 28);
  const gapLen = (cs.ringGap / 360) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <clipPath id={`${id}-arc`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r + stroke}
            fill="none"
            stroke="#fff"
            strokeWidth={stroke * 2}
            strokeDasharray={`${dash} ${circ - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </clipPath>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ink.trackFill}
        strokeWidth={cs.grid === "none" ? Math.max(1.5, stroke * 0.35) : stroke}
        opacity={cs.grid === "none" ? 0.7 : 1}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={stroke}
        strokeLinecap={cs.ringCap === "round" ? "round" : "butt"}
        strokeDasharray={segmented ? `${segLen} ${gapLen}` : `${dash} ${circ - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        clipPath={segmented ? `url(#${id}-arc)` : undefined}
      />

      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.32}
        fontWeight={600}
        fill={ink.text}
        style={{ letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(p)}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.19}
        textAnchor="middle"
        fontSize={size * 0.075}
        fontWeight={500}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em" }}
      >
        %
      </text>
    </svg>
  );
}
