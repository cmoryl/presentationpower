// Infographic kit — solid colour blocks, donut gauges and labelled bars used
// by the stat/KPI modules. Every graphic is data-true: rings fill exactly to a
// stated percentage, bars are scaled against the largest figure in their own
// group. Nothing here invents a trend or a series.

import type { CSSProperties, ReactNode } from "react";
import { fillPx } from "@/lib/open-space-fill";

/** Approved brand fills (enterprise palette: primary, secondary accents, ink). */
export const INFO_FILL = {
  blue: { bg: "#003FC7", fg: "#FFFFFF", track: "rgba(255,255,255,0.22)", ring: "#A1FBF9" },
  navy: { bg: "#03002C", fg: "#FFFFFF", track: "rgba(255,255,255,0.16)", ring: "#C2A3FF" },
  aqua: { bg: "#A1FBF9", fg: "#03002C", track: "rgba(3,0,44,0.12)", ring: "#003FC7" },
  lavender: { bg: "#C2A3FF", fg: "#03002C", track: "rgba(3,0,44,0.12)", ring: "#03002C" },
} as const;
export type InfoFill = keyof typeof INFO_FILL;

export function pctOf(value: string, unit?: string): number | null {
  const raw = `${value}${unit ?? ""}`;
  if (!/%/.test(raw)) return null;
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

export function numOf(value: string): number {
  const raw = value.replace(/,/g, "").trim();
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return /k\b|k\+?$/i.test(raw) ? n * 1000 : n;
}

export function Donut({
  pct,
  size,
  stroke,
  color,
  track,
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  track: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export function Figure({
  value,
  unit,
  px,
  color,
  unitColor,
  style,
}: {
  value: string;
  unit?: string;
  px: number;
  color: string;
  unitColor?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="tabular-nums"
      style={{
        fontSize: fillPx(px, "display"),
        fontWeight: 800,
        lineHeight: 0.92,
        letterSpacing: "-0.04em",
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {value}
      {unit && <span style={{ fontSize: "0.62em", color: unitColor ?? color, marginLeft: "0.03em" }}>{unit}</span>}
    </div>
  );
}

/** Solid colour block — the core infographic tile. */
export function FillTile({
  fill,
  className,
  style,
  children,
}: {
  fill: InfoFill;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const f = INFO_FILL[fill];
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] ${className ?? ""}`}
      style={{ background: f.bg, color: f.fg, minWidth: 0, ...style }}
    >
      {children}
    </div>
  );
}

/** 10×10 waffle: exactly `pct` cells filled. */
export function Waffle({ pct, cell, gap, on, off }: { pct: number; cell: number; gap: number; on: string; off: string }) {
  const n = Math.round(pct);
  return (
    <div aria-hidden className="grid shrink-0" style={{ gridTemplateColumns: `repeat(10, ${cell}px)`, gap }}>
      {Array.from({ length: 100 }).map((_, i) => (
        <span key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.28, background: i < n ? on : off }} />
      ))}
    </div>
  );
}

/** Semi-circle gauge filled exactly to `pct`. */
export function Gauge({ pct, width, stroke, color, track, children }: { pct: number; width: number; stroke: number; color: string; track: string; children?: ReactNode }) {
  const r = (width - stroke) / 2;
  const h = r + stroke;
  const len = Math.PI * r;
  const d = `M ${stroke / 2} ${h - stroke / 2} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${h - stroke / 2}`;
  return (
    <div className="relative shrink-0" style={{ width, height: h }}>
      <svg width={width} height={h} aria-hidden>
        <path d={d} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(pct / 100) * len} ${len}`} />
      </svg>
      {children && <div className="absolute inset-x-0 bottom-0 flex justify-center">{children}</div>}
    </div>
  );
}

/** Exactly `count` repeated glyphs (capped by caller), for whole-number counts. */
export function Pictogram({ count, size, color, dim, total, render }: { count: number; size: number; color: string; dim?: string; total?: number; render: (c: string, s: number) => ReactNode }) {
  const t = Math.max(total ?? count, count);
  return (
    <div aria-hidden className="flex flex-wrap" style={{ gap: Math.round(size * 0.3) }}>
      {Array.from({ length: t }).map((_, i) => (
        <span key={i} className="inline-flex">{render(i < count ? color : dim ?? color, size)}</span>
      ))}
    </div>
  );
}

/** Concentric radial bars (activity-ring style). Each arc fills exactly to its pct over `sweep` degrees. */
export function RadialBars({
  rings,
  size,
  stroke,
  gap,
  track,
  sweep = 270,
  children,
}: {
  rings: { pct: number; color: string }[];
  size: number;
  stroke: number;
  gap: number;
  track: string;
  sweep?: number;
  children?: ReactNode;
}) {
  const cx = size / 2;
  const start = -90 - (sweep - 180) / 2 - 90 + 90; // arc starts at the left of the gap
  const pt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cx + r * Math.sin(a)];
  };
  const arc = (r: number, deg: number) => {
    const s0 = 90 + (360 - sweep) / 2; // gap centred at the bottom
    const [x0, y0] = pt(r, s0);
    const [x1, y1] = pt(r, s0 + deg);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  void start;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        {rings.map((g, i) => {
          const r = cx - stroke / 2 - i * (stroke + gap);
          return (
            <g key={i}>
              <path d={arc(r, sweep)} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
              <path d={arc(r, Math.max(0.5, (g.pct / 100) * sweep))} fill="none" stroke={g.color} strokeWidth={stroke} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

/** Log-scale horizontal lollipop for counts of very different magnitude. */
export function LogLollipop({
  rows,
  ink,
  muted,
  hairline,
  px,
}: {
  rows: { value: string; unit?: string; label: string; n: number; color: string; icon?: ReactNode }[];
  ink: string;
  muted: string;
  hairline: string;
  px: (n: number) => number | string;
}) {
  const maxExp = Math.ceil(Math.log10(Math.max(10, ...rows.map((r) => r.n))));
  const ticks = Array.from({ length: maxExp + 1 }, (_, i) => Math.pow(10, i));
  const pos = (n: number) => (Math.log10(Math.max(1, n)) / maxExp) * 100;
  const fmt = (v: number) => (v >= 1000 ? `${v / 1000}K` : String(v));
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid items-center gap-4" style={{ gridTemplateColumns: "44px 150px 1fr" }}>
          <span className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px]" style={{ background: r.color, color: "#03002C" }}>{r.icon}</span>
          <div className="min-w-0">
            <div className="tabular-nums" style={{ fontSize: px(34), fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: ink, whiteSpace: "nowrap" }}>
              {r.value}
              {r.unit && <span style={{ fontSize: "0.65em" }}>{r.unit}</span>}
            </div>
            <div style={{ fontSize: px(14), color: muted, lineHeight: 1.2, marginTop: 4 }}>{r.label}</div>
          </div>
          <div className="relative h-[34px]">
            {ticks.map((t) => (
              <span key={t} aria-hidden className="absolute inset-y-0 w-px" style={{ left: `${pos(t)}%`, background: hairline }} />
            ))}
            <span aria-hidden className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full" style={{ left: 0, width: `${pos(r.n)}%`, background: r.color }} />
            <span aria-hidden className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos(r.n)}%`, background: r.color, boxShadow: `0 0 0 6px ${hairline}` }} />
          </div>
        </div>
      ))}
      <div className="grid gap-4" style={{ gridTemplateColumns: "44px 150px 1fr" }}>
        <span />
        <span style={{ fontSize: px(12), color: muted }}>Log scale</span>
        <div className="relative h-[16px]">
          {ticks.map((t, i) => (
            <span key={t} className="absolute tabular-nums" style={{ left: `${pos(t)}%`, transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)", fontSize: px(12), color: muted }}>{fmt(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
